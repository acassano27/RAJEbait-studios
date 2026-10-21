# Dragonquest

Standalone browser edition of the Arcade adventure. The original Python game remains available as `dragonquest.py`.

## Run locally

From the repository root, start a static web server:

```bash
python -m http.server 8000
```

Open <http://localhost:8000/dragonquest/>.

Use the arrow keys or WASD to move. On touch screens, use the direction pad. Each room has explicit left, right, top, and bottom door connections; move through a door to travel to its linked room, collect all five chalice shards, and return the restored chalice to the tallest tower in Waystone Hall at row 4, column 4. Find the magic tunnel in Goblin Grotto to pass through one wall tile when the tile beyond it is open, and find the sword in Crystal Cavern to defend yourself from dragons.

## Add a room

1. Add `rooms/room-<name>.js`, registering one room with a unique ID that matches its filename (for example, `room-ice-cave.js` registers as `ICE_CAVE`). Copy an existing room module as a starting point. Room grids are 15 rows by 20 columns; use tile `2` for each door.
2. Declare each door in `exits` with its side, position (`row` for left/right, `col` for top/bottom), destination room ID, and spawn `[row, column]`. Add a return exit in the destination room so travel works in both directions.
3. Add `<script src="rooms/room-<name>.js"></script>` to `index.html`, after `room-registry.js` and before `game.js`.
4. From the repository root, run `python dragonquest/test_room_graph.py` and `python dragonquest/verify_addons.py`.