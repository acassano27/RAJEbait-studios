"""Tkinter Plinko game built on the reusable physics_engine module."""

import math
import random
import tkinter as tk
from typing import Dict, List

from physics_engine import Ball, PhysicsWorld, Segment, StaticCircle, Vector2


class PlinkoGame:
    SCALE = 70.0
    CANVAS_WIDTH = 800
    CANVAS_HEIGHT = 520
    WORLD_ORIGIN_X = 400.0
    WORLD_ORIGIN_Y = 450.0
    BOARD_LEFT = -5.4
    BOARD_RIGHT = 5.4
    CATCHER_TOP = -0.35
    CATCHER_BOTTOM = -1.0
    CATCHER_VALUES = [10, 5, 4, 3, 2, 1, 0.2, 0.2, 0.1, 0.2, 0.2, 1, 2, 3, 4, 5, 10]

    def __init__(self) -> None:
        self.root = tk.Tk()
        self.root.title("Rajes Plinko")
        self.root.resizable(False, False)
        self.rajes = 1000.0  # need to change this to a shared bank across the website, but I haven't done that yet
        self.bet_value = tk.DoubleVar(value=10.0)
        self.ball_count = tk.StringVar(value="Balls: 0")
        self.rajes_count = tk.StringVar(value="Rajes: 1,000.00")
        self.status = tk.StringVar(value="Ready")
        self.notifications: List[str] = []
        self.ball_bets: Dict[int, float] = {}
        self.catcher_counts: List[Dict[str, int]] = self._new_catcher_counts()
        self.spawn_min_x = -0.20
        self.spawn_max_x = 0.20
        self.spawn_min_y = 5.38
        self.spawn_max_y = 5.78
        self._build_world()
        self._build_widgets()
        self.root.bind("<space>", lambda _event: self.drop_random_ball())
        self.root.bind("r", lambda _event: self.reset())
        self.root.after(16, self._update)

    def _new_catcher_counts(self) -> List[Dict[str, int]]:
        return [{"left": 0, "right": 0, "total": 0} for _ in self.CATCHER_VALUES]

    def _build_world(self) -> None:
        self.world = PhysicsWorld(
            gravity=Vector2(0.0, -9.81),
            fixed_time_step=1.0 / 120.0,
            ball_collisions=False,
        )
        self.ball_bets.clear()
        self.catcher_counts = self._new_catcher_counts()

        # Invisible screen boundary walls keep balls inside the canvas.
        self.world.add_obstacle(Segment(Vector2(-5.55, -1.0), Vector2(-5.55, 5.9), friction=0.1))
        self.world.add_obstacle(Segment(Vector2(5.55, -1.0), Vector2(5.55, 5.9), friction=0.1))

        pin_spacing = (self.BOARD_RIGHT - self.BOARD_LEFT) / 17.5
        for row in range(16):
            y = 4.7 - row * 0.31
            pin_count = row + 3
            start_x = -(pin_count - 1) * pin_spacing / 2.0
            for column in range(pin_count):
                self.world.add_obstacle(
                    StaticCircle(
                        Vector2(start_x + column * pin_spacing, y),
                        0.055,
                        restitution=0.55,
                        friction=0.12,
                    )
                )

        bin_width = (self.BOARD_RIGHT - self.BOARD_LEFT) / len(self.CATCHER_VALUES)
        for index in range(len(self.CATCHER_VALUES)):
            x1 = self.BOARD_LEFT + index * bin_width
            x2 = x1 + bin_width
            self.world.add_obstacle(Segment(Vector2(x1, self.CATCHER_BOTTOM), Vector2(x2, self.CATCHER_BOTTOM), friction=0.35))
            self.world.add_obstacle(Segment(Vector2(x1, self.CATCHER_TOP), Vector2(x1, self.CATCHER_BOTTOM), friction=0.15))
            self.world.add_obstacle(Segment(Vector2(x2, self.CATCHER_TOP), Vector2(x2, self.CATCHER_BOTTOM), friction=0.15))

    def _build_widgets(self) -> None:
        self.canvas = tk.Canvas(self.root, width=self.CANVAS_WIDTH, height=self.CANVAS_HEIGHT, background="#17202b", highlightthickness=0)
        self.canvas.pack(side=tk.LEFT, padx=(10, 0), pady=10)
        self.canvas.bind("<Button-1>", lambda _event: self.drop_random_ball())
        controls = tk.Frame(self.root, padx=12, pady=10)
        controls.pack(side=tk.RIGHT, fill=tk.Y)
        tk.Label(controls, text="Rajes Plinko", font=("Segoe UI", 12, "bold")).pack(anchor="w")
        tk.Label(controls, text="Physics: physics_engine.py").pack(anchor="w", pady=(4, 12))
        tk.Label(controls, textvariable=self.rajes_count, font=("Segoe UI", 11, "bold")).pack(anchor="w")
        tk.Label(controls, text="Bet per drop (rajes)").pack(anchor="w", pady=(10, 0))
        tk.Spinbox(controls, from_=1, to=100000, increment=1, textvariable=self.bet_value, width=12).pack(anchor="w")
        tk.Button(controls, text="Reset Board", command=self.reset).pack(fill=tk.X, pady=4)
        tk.Button(controls, text="Clear Balls", command=self._clear_balls).pack(fill=tk.X, pady=4)
        tk.Label(controls, textvariable=self.ball_count).pack(anchor="w", pady=(12, 0))
        tk.Label(controls, textvariable=self.status, wraplength=180).pack(anchor="w")
        tk.Label(controls, text="Recent results").pack(anchor="w", pady=(12, 2))
        self.notification_list = tk.Listbox(controls, height=5, width=28, font=("Consolas", 8), exportselection=False)
        self.notification_list.pack(fill=tk.X)
        tk.Label(controls, text="Space: drop ball   R: reset", foreground="#555").pack(anchor="w", pady=(20, 0))
        tk.Button(controls, text="Drop Ball", command=self.drop_random_ball).pack(side=tk.BOTTOM, fill=tk.X, pady=(20, 0))

    def drop_random_ball(self) -> None:
        try:
            bet = float(self.bet_value.get())
        except (TypeError, ValueError):
            self.status.set("Enter a valid bet")
            return
        if bet <= 0.0 or bet > self.rajes:
            self.status.set("Bet must be positive and within your Rajes")
            return
        self.rajes -= bet
        if random.random() < 0.95:
            # Most drops begin close to the center of the symmetric top row.
            spawn_x = max(
                self.spawn_min_x,
                min(self.spawn_max_x, random.gauss(0.0, 0.06))
            )
            angle = math.radians(random.uniform(-5.0, 5.0))
        else:
            # A smaller branch still gives the ball a legitimate outer route.
            direction = random.choice((-1.0, 1.0))
            spawn_x = direction * random.uniform(0.10, self.spawn_max_x)
            angle = math.radians(direction * random.uniform(8.0, 15.0))
        position = Vector2(spawn_x, random.uniform(self.spawn_min_y, self.spawn_max_y))
        speed = random.uniform(0.10, 0.25)
        velocity = Vector2(speed * math.sin(angle), -speed * math.cos(angle))
        ball = self.world.add_ball(Ball(position=position, radius=0.07, velocity=velocity, restitution=0.35, friction=0.45))
        self.ball_bets[id(ball)] = bet
        self.status.set(f"Dropped {bet:.2f} Rajes")

    def _clear_balls(self) -> None:
        self.world.balls.clear()
        self.ball_bets.clear()

    def reset(self) -> None:
        self._build_world()
        self.notifications.clear()
        self._refresh_notifications()
        self.status.set("Ready")

    def _update(self) -> None:
        self.world.step(1.0 / 60.0)
        self._settle_balls()
        self._draw()
        self.root.after(16, self._update)

    def _settle_balls(self) -> None:
        bin_width = (self.BOARD_RIGHT - self.BOARD_LEFT) / len(self.CATCHER_VALUES)
        remaining = []
        for ball in self.world.balls:
            if ball.position.y > self.CATCHER_BOTTOM + ball.radius + 0.025:
                remaining.append(ball)
                continue
            index = max(0, min(len(self.CATCHER_VALUES) - 1, int((ball.position.x - self.BOARD_LEFT) / bin_width)))
            bin_left = self.BOARD_LEFT + index * bin_width
            side = "left" if ball.position.x < bin_left + bin_width / 2.0 else "right"
            self.catcher_counts[index][side] += 1
            self.catcher_counts[index]["total"] += 1
            bet = self.ball_bets.pop(id(ball), 0.0)
            payout = bet * self.CATCHER_VALUES[index]
            self.rajes += payout
            net = payout - bet
            result = f"x{self.CATCHER_VALUES[index]:g}: {net:+.2f} Rajes"
            self.notifications.insert(0, result)
            del self.notifications[5:]
            self._refresh_notifications()
            self.status.set(f"Won x{self.CATCHER_VALUES[index]:g}: {payout:.2f} Rajes")
        self.world.balls[:] = remaining

    def _refresh_notifications(self) -> None:
        self.notification_list.delete(0, tk.END)
        for notification in self.notifications:
            self.notification_list.insert(tk.END, notification)

    def _draw(self) -> None:
        self.canvas.delete("all")
        self._draw_catchers()
        for obstacle in self.world.obstacles:
            if isinstance(obstacle, Segment):
                self._draw_segment(obstacle)
            elif isinstance(obstacle, StaticCircle):
                x, y = self._to_screen(obstacle.center)
                radius = obstacle.radius * self.SCALE
                self.canvas.create_oval(x - radius, y - radius, x + radius, y + radius, fill="#d5a64a", outline="#ffe7a3")
        for ball in self.world.balls:
            x, y = self._to_screen(ball.position)
            radius = ball.radius * self.SCALE
            self.canvas.create_oval(x - radius, y - radius, x + radius, y + radius, fill="#ef4444", outline="#fecaca", width=2)
            end = Vector2(ball.position.x + math.cos(ball.rotation) * ball.radius, ball.position.y + math.sin(ball.rotation) * ball.radius)
            end_x, end_y = self._to_screen(end)
            self.canvas.create_line(x, y, end_x, end_y, fill="#7f1d1d", width=2)
        self.ball_count.set(f"Balls: {len(self.world.balls)}")
        self.rajes_count.set(f"Rajes: {self.rajes:,.2f}")

    def _draw_catchers(self) -> None:
        bin_width = (self.BOARD_RIGHT - self.BOARD_LEFT) / len(self.CATCHER_VALUES)
        for index, value in enumerate(self.CATCHER_VALUES):
            x1 = self.BOARD_LEFT + index * bin_width
            x2 = x1 + bin_width
            screen_x1, screen_top = self._to_screen(Vector2(x1, self.CATCHER_TOP))
            screen_x2, screen_bottom = self._to_screen(Vector2(x2, self.CATCHER_BOTTOM))
            self.canvas.create_rectangle(screen_x1 + 2, screen_top, screen_x2 - 2, screen_bottom, fill="#243447", outline="")
            self.canvas.create_line(screen_x1, screen_top, screen_x1, screen_bottom, fill="#8ea2b8", width=3)
            self.canvas.create_line(screen_x2, screen_top, screen_x2, screen_bottom, fill="#8ea2b8", width=3)
            self.canvas.create_line(screen_x1, screen_bottom, screen_x2, screen_bottom, fill="#8ea2b8", width=3)
            counts = self.catcher_counts[index]
            center_x = (screen_x1 + screen_x2) / 2
            self.canvas.create_text(center_x, screen_bottom - 31, text=f"x{value:g}", fill="#f7d47a", font=("Segoe UI", 7, "bold"))
            self.canvas.create_text(center_x, screen_bottom - 14, text=f"L{counts['left']} R{counts['right']} T{counts['total']}", fill="#d0d5dd", font=("Segoe UI", 5))

    def _draw_segment(self, segment: Segment) -> None:
        x1, y1 = self._to_screen(segment.start)
        x2, y2 = self._to_screen(segment.end)
        self.canvas.create_line(x1, y1, x2, y2, fill="#d0d5dd", width=4)

    def _to_screen(self, position: Vector2) -> tuple[float, float]:
        return self.WORLD_ORIGIN_X + position.x * self.SCALE, self.WORLD_ORIGIN_Y - position.y * self.SCALE

    def run(self) -> None:
        self.reset()
        self.root.mainloop()


if __name__ == "__main__":
    PlinkoGame().run()
