"""Reusable deterministic 2D physics engine for ball-based games."""

from __future__ import annotations

from dataclasses import dataclass, field
import math
from typing import List, Optional, Tuple, Union

EPSILON = 1e-9


@dataclass
class Vector2:
    x: float = 0.0
    y: float = 0.0

    def __add__(self, other: "Vector2") -> "Vector2":
        return Vector2(self.x + other.x, self.y + other.y)

    def __sub__(self, other: "Vector2") -> "Vector2":
        return Vector2(self.x - other.x, self.y - other.y)

    def __mul__(self, scalar: float) -> "Vector2":
        return Vector2(self.x * scalar, self.y * scalar)

    __rmul__ = __mul__

    def __truediv__(self, scalar: float) -> "Vector2":
        return Vector2(self.x / scalar, self.y / scalar)

    def __neg__(self) -> "Vector2":
        return Vector2(-self.x, -self.y)

    def dot(self, other: "Vector2") -> float:
        return self.x * other.x + self.y * other.y

    def length_squared(self) -> float:
        return self.dot(self)

    def length(self) -> float:
        return math.sqrt(self.length_squared())

    def normalized(self) -> "Vector2":
        length = self.length()
        return self / length if length > EPSILON else Vector2()


def cross_scalar_vector(scalar: float, vector: Vector2) -> Vector2:
    return Vector2(-scalar * vector.y, scalar * vector.x)


@dataclass
class Ball:
    position: Vector2
    radius: float = 0.05
    mass: float = 1.0
    velocity: Vector2 = field(default_factory=Vector2)
    restitution: float = 0.35
    friction: float = 0.35
    angular_velocity: float = 0.0
    rotation: float = 0.0
    angular_damping: float = 0.02

    def __post_init__(self) -> None:
        if self.radius <= 0.0 or self.mass <= 0.0:
            raise ValueError("radius and mass must be greater than 0")
        self.restitution = _clamp(self.restitution, 0.0, 1.0)
        self.friction = max(0.0, self.friction)
        self.angular_damping = max(0.0, self.angular_damping)

    @property
    def inverse_mass(self) -> float:
        return 1.0 / self.mass

    @property
    def moment_of_inertia(self) -> float:
        return 0.5 * self.mass * self.radius * self.radius

    @property
    def inverse_inertia(self) -> float:
        return 1.0 / self.moment_of_inertia


@dataclass(frozen=True)
class Segment:
    start: Vector2
    end: Vector2
    restitution: float = 0.35
    friction: float = 0.45


@dataclass(frozen=True)
class StaticCircle:
    center: Vector2
    radius: float
    restitution: float = 0.35
    friction: float = 0.35

    def __post_init__(self) -> None:
        if self.radius <= 0.0:
            raise ValueError("obstacle radius must be greater than 0")


@dataclass(frozen=True)
class StaticBox:
    minimum: Vector2
    maximum: Vector2
    restitution: float = 0.35
    friction: float = 0.45

    def __post_init__(self) -> None:
        if self.minimum.x >= self.maximum.x or self.minimum.y >= self.maximum.y:
            raise ValueError("box minimum must be below maximum")


Obstacle = Union[Segment, StaticCircle, StaticBox]


class PhysicsWorld:
    def __init__(
        self,
        gravity: Vector2 = Vector2(0.0, -9.81),
        fixed_time_step: float = 1.0 / 120.0,
        max_substeps: int = 8,
        collision_iterations: int = 3,
        ball_collisions: bool = True,
    ) -> None:
        if fixed_time_step <= 0.0:
            raise ValueError("fixed_time_step must be greater than 0")
        if max_substeps < 1 or collision_iterations < 1:
            raise ValueError("substeps and collision_iterations must be at least 1")
        self.gravity = gravity
        self.fixed_time_step = fixed_time_step
        self.max_substeps = max_substeps
        self.collision_iterations = collision_iterations
        self.ball_collisions = ball_collisions
        self.balls: List[Ball] = []
        self.obstacles: List[Obstacle] = []
        self._time_accumulator = 0.0

    def add_ball(self, ball: Ball) -> Ball:
        self.balls.append(ball)
        return ball

    def add_obstacle(self, obstacle: Obstacle) -> Obstacle:
        self.obstacles.append(obstacle)
        return obstacle

    def step(self, elapsed_seconds: float) -> int:
        if elapsed_seconds < 0.0:
            raise ValueError("elapsed_seconds cannot be negative")
        self._time_accumulator += min(elapsed_seconds, self.fixed_time_step * self.max_substeps)
        steps = 0
        while self._time_accumulator + EPSILON >= self.fixed_time_step and steps < self.max_substeps:
            self._integrate(self.fixed_time_step)
            self._time_accumulator -= self.fixed_time_step
            steps += 1
        return steps

    def _integrate(self, delta_time: float) -> None:
        for ball in self.balls:
            ball.velocity = ball.velocity + self.gravity * delta_time
            ball.position = ball.position + ball.velocity * delta_time
            ball.rotation += ball.angular_velocity * delta_time
            ball.angular_velocity *= math.exp(-ball.angular_damping * delta_time)

        for _ in range(self.collision_iterations):
            for ball in self.balls:
                for obstacle in self.obstacles:
                    contact = _obstacle_contact(ball, obstacle)
                    if contact is not None:
                        normal, penetration, restitution, friction = contact
                        _resolve_static(ball, normal, penetration, restitution, friction)
            if self.ball_collisions:
                for first in range(len(self.balls)):
                    for second in range(first + 1, len(self.balls)):
                        _resolve_ball_collision(self.balls[first], self.balls[second])


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(value, maximum))


def _obstacle_contact(ball: Ball, obstacle: Obstacle) -> Optional[Tuple[Vector2, float, float, float]]:
    if isinstance(obstacle, StaticCircle):
        delta = ball.position - obstacle.center
        distance = delta.length()
        combined_radius = ball.radius + obstacle.radius
        if distance >= combined_radius:
            return None
        normal = delta.normalized() if distance > EPSILON else Vector2(0.0, 1.0)
        return normal, combined_radius - distance, obstacle.restitution, obstacle.friction

    if isinstance(obstacle, StaticBox):
        closest = Vector2(
            _clamp(ball.position.x, obstacle.minimum.x, obstacle.maximum.x),
            _clamp(ball.position.y, obstacle.minimum.y, obstacle.maximum.y),
        )
        delta = ball.position - closest
        distance = delta.length()
        if distance > EPSILON:
            if distance >= ball.radius:
                return None
            return delta.normalized(), ball.radius - distance, obstacle.restitution, obstacle.friction
        left = ball.position.x - obstacle.minimum.x
        right = obstacle.maximum.x - ball.position.x
        bottom = ball.position.y - obstacle.minimum.y
        top = obstacle.maximum.y - ball.position.y
        penetration, normal = min(
            (left + ball.radius, Vector2(1.0, 0.0)),
            (right + ball.radius, Vector2(-1.0, 0.0)),
            (bottom + ball.radius, Vector2(0.0, 1.0)),
            (top + ball.radius, Vector2(0.0, -1.0)),
            key=lambda item: item[0],
        )
        return normal, penetration, obstacle.restitution, obstacle.friction

    segment = obstacle.end - obstacle.start
    length_squared = segment.length_squared()
    if length_squared <= EPSILON:
        return None
    t = _clamp((ball.position - obstacle.start).dot(segment) / length_squared, 0.0, 1.0)
    closest = obstacle.start + segment * t
    delta = ball.position - closest
    distance = delta.length()
    if distance >= ball.radius:
        return None
    normal = delta.normalized()
    if distance <= EPSILON:
        normal = Vector2(-segment.y, segment.x).normalized()
        if normal.dot(ball.position - obstacle.start) < 0.0:
            normal = -normal
    contact_friction = obstacle.friction if EPSILON < t < 1.0 - EPSILON else obstacle.friction * 0.1
    return normal, ball.radius - distance, obstacle.restitution, contact_friction


def _resolve_static(ball: Ball, normal: Vector2, penetration: float, restitution: float, friction: float) -> None:
    ball.position = ball.position + normal * (penetration + 1e-7)
    contact_offset = -normal * ball.radius
    contact_velocity = ball.velocity + cross_scalar_vector(ball.angular_velocity, contact_offset)
    normal_speed = contact_velocity.dot(normal)
    if normal_speed >= 0.0:
        return
    restitution = _clamp(min(ball.restitution, restitution), 0.0, 1.0)
    impulse_magnitude = -(1.0 + restitution) * normal_speed / ball.inverse_mass
    ball.velocity = ball.velocity + normal * (impulse_magnitude * ball.inverse_mass)
    tangent = contact_velocity - normal * normal_speed
    if tangent.length_squared() <= EPSILON:
        return
    tangent = tangent.normalized()
    friction_impulse = -contact_velocity.dot(tangent) / (
        ball.inverse_mass + (cross_scalar_vector(1.0, contact_offset).dot(tangent) ** 2) * ball.inverse_inertia
    )
    friction_impulse = _clamp(friction_impulse, -impulse_magnitude * friction, impulse_magnitude * friction)
    ball.velocity = ball.velocity + tangent * (friction_impulse * ball.inverse_mass)
    ball.angular_velocity += contact_offset.x * (friction_impulse * tangent.y) - contact_offset.y * (friction_impulse * tangent.x)


def _resolve_ball_collision(first: Ball, second: Ball) -> None:
    delta = second.position - first.position
    distance = delta.length()
    combined_radius = first.radius + second.radius
    if distance >= combined_radius:
        return
    normal = delta.normalized() if distance > EPSILON else Vector2(1.0, 0.0)
    penetration = combined_radius - distance
    total_inverse_mass = first.inverse_mass + second.inverse_mass
    first.position = first.position - normal * (penetration * first.inverse_mass / total_inverse_mass + 1e-7)
    second.position = second.position + normal * (penetration * second.inverse_mass / total_inverse_mass + 1e-7)
    relative_velocity = second.velocity - first.velocity
    normal_speed = relative_velocity.dot(normal)
    if normal_speed >= 0.0:
        return
    impulse_magnitude = -(1.0 + min(first.restitution, second.restitution)) * normal_speed / total_inverse_mass
    impulse = normal * impulse_magnitude
    first.velocity = first.velocity - impulse * first.inverse_mass
    second.velocity = second.velocity + impulse * second.inverse_mass
