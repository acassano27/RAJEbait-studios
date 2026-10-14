from collections import deque
from pathlib import Path
import re

ROOT = Path(__file__).parent
ROOM_HEIGHT = 15
ROOM_WIDTH = 20
ROOMS = {}

for module_path in sorted((ROOT / "rooms").glob("room-*.js")):
    source = module_path.read_text(encoding="utf-8")
    room_match = re.search(r'window\.RoomAddons\.register\("([A-Z0-9_]+)", \{', source)
    assert room_match, f"Missing room ID in {module_path}"
    room_id = room_match.group(1)
    assert room_id not in ROOMS, f"Duplicate room ID: {room_id}"

    grid_match = re.search(r'grid:\s*\[(.*?)\n\s*\],', source, re.DOTALL)
    assert grid_match, f"Missing grid in {room_id}"
    grid_rows = re.findall(r'^\s*\[([0-2,\s]+)\],?$', grid_match.group(1), re.MULTILINE)
    grid = [[int(value) for value in re.findall(r"\d+", row)] for row in grid_rows]
    assert len(grid) == ROOM_HEIGHT, f"{room_id}: expected {ROOM_HEIGHT} rows"
    assert all(len(row) == ROOM_WIDTH for row in grid), f"{room_id}: invalid grid width"

    exits_match = re.search(r'exits:\s*\[(.*?)\n\s*\],', source, re.DOTALL)
    assert exits_match, f"Missing exits in {room_id}"
    exit_pattern = re.compile(
        r'\{\s*side:\s*"(left|right)",\s*row:\s*(\d+),\s*'
        r'to:\s*"([A-Z0-9_]+)",\s*spawn:\s*\[(\d+),\s*(\d+)\]\s*\}'
    )
    raw_exits = re.findall(r'\{\s*side:', exits_match.group(1))
    parsed_exits = list(exit_pattern.finditer(exits_match.group(1)))
    assert len(parsed_exits) == len(raw_exits), f"Malformed exit in {room_id}"
    exits = [
        {
            "side": match.group(1),
            "row": int(match.group(2)),
            "to": match.group(3),
            "spawn": [int(match.group(4)), int(match.group(5))],
        }
        for match in parsed_exits
    ]
    ROOMS[room_id] = {"grid": grid, "exits": exits}

assert "HUB" in ROOMS, "Missing starting room HUB"

for room_id, room in ROOMS.items():
    exits = room["exits"]
    exit_positions = set()
    for exit in exits:
        position = (exit["side"], exit["row"])
        assert position not in exit_positions, f"{room_id}: duplicate exit at {position}"
        exit_positions.add(position)
        assert 0 <= exit["row"] < ROOM_HEIGHT, f"{room_id}: exit row out of bounds"
        assert exit["to"] in ROOMS, f"{room_id}: unknown destination {exit['to']}"

        door_col = 0 if exit["side"] == "left" else ROOM_WIDTH - 1
        assert room["grid"][exit["row"]][door_col] == 2, (
            f"{room_id}: {exit['side']} exit at row {exit['row']} has no door tile"
        )

        spawn_row, spawn_col = exit["spawn"]
        assert 0 <= spawn_row < ROOM_HEIGHT and 0 <= spawn_col < ROOM_WIDTH, (
            f"{room_id}: spawn for {exit['to']} is out of bounds"
        )
        destination = ROOMS[exit["to"]]
        assert destination["grid"][spawn_row][spawn_col] != 1, (
            f"{room_id}: spawn for {exit['to']} lands in a wall"
        )

        opposite = "right" if exit["side"] == "left" else "left"
        expected_return_spawn = [exit["row"], ROOM_WIDTH - 2 if exit["side"] == "right" else 1]
        reciprocal = any(
            candidate["side"] == opposite
            and candidate["row"] == spawn_row
            and candidate["to"] == room_id
            and candidate["spawn"] == expected_return_spawn
            for candidate in destination["exits"]
        )
        assert reciprocal, (
            f"{room_id} {exit['side']} door at row {exit['row']} has no matching return exit "
            f"in {exit['to']}"
        )

    for side, col in (("left", 0), ("right", ROOM_WIDTH - 1)):
        grid_doors = {row for row in range(ROOM_HEIGHT) if room["grid"][row][col] == 2}
        declared_doors = {exit["row"] for exit in exits if exit["side"] == side}
        assert grid_doors == declared_doors, (
            f"{room_id}: {side} grid doors {grid_doors} != declared exits {declared_doors}"
        )

reachable = set()
pending = deque(["HUB"])
while pending:
    room_id = pending.popleft()
    if room_id in reachable:
        continue
    reachable.add(room_id)
    pending.extend(exit["to"] for exit in ROOMS[room_id]["exits"])

assert reachable == set(ROOMS), f"Unreachable rooms: {set(ROOMS) - reachable}"
print(f"PASS: {len(ROOMS)} rooms form a connected, reciprocal door graph")
