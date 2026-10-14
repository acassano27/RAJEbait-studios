# Dragonquest

Standalone browser edition of the Arcade adventure. The original Python game remains available as `dragonquest.py`.

## Run locally

From the repository root, start a static web server:

```bash
python -m http.server 8000
```

Open <http://localhost:8000/dragonquest/>.

Use the arrow keys or WASD to move. On touch screens, use the direction pad. Each room has explicit left and right door connections; move through a door to travel to its linked room, collect all four chalice shards, and find the magic tunnel in Goblin Grotto. While carrying it, you can pass through one wall tile when the tile beyond it is open. Find the sword in Crystal Cavern to defend yourself from dragons.

## Add a room

1. Add `rooms/room-<name>.js`, registering one room with a unique ID that matches its filename (for example, `room-ice-cave.js` registers as `ICE_CAVE`). Copy an existing room module as a starting point. Room grids are 15 rows by 20 columns; use tile `2` for each side door.
2. Declare each door in `exits` with its side, row, destination room ID, and spawn `[row, column]`. Add the matching opposite-side exit to the destination room so travel works in both directions.
3. Add `<script src="rooms/room-<name>.js"></script>` to `index.html`, after `room-registry.js` and before `game.js`.
4. From the repository root, run `python dragonquest/test_room_graph.py` and `python dragonquest/verify_addons.py`.