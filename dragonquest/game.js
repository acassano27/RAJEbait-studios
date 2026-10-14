const TILE = { FLOOR: 0, WALL: 1, DOOR: 2 };
const CELL_SIZE = 48;
const ROOM_WIDTH = 20;
const ROOM_HEIGHT = 15;
const DRAGON_INTERVAL = 650;
const PLAYER_REPEAT_INTERVAL = 96;
const TUNNEL_FLASH_DURATION = 480;
const DIRECTIONS = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};

const ROOMS = window.RoomAddons.getAll();
const TOTAL_SHARDS = 4;



for (const [roomId, room] of Object.entries(ROOMS)) {
  for (const exit of room.exits) {
    if (!ROOMS[exit.to]) throw new Error(`${roomId} points to unknown room ${exit.to}`);
    if (!["left", "right"].includes(exit.side)) throw new Error(`${roomId} has invalid side ${exit.side}`);
    if (!Array.isArray(exit.spawn) || exit.spawn.length !== 2) {
      throw new Error(`${roomId} exit to ${exit.to} has an invalid spawn`);
    }
  }
}

const canvas = document.querySelector("#gameCanvas");
const context = canvas.getContext("2d");
const roomLabel = document.querySelector("#roomLabel");
const roomName = document.querySelector("#roomName");
const positionLabel = document.querySelector("#positionLabel");
const shardCount = document.querySelector("#shardCount");
const shardTotal = document.querySelector("#shardTotal");
const swordStatus = document.querySelector("#swordStatus");
const tunnelStatus = document.querySelector("#tunnelStatus");
const statusMessage = document.querySelector("#statusMessage");
const winOverlay = document.querySelector("#winOverlay");
const shardMarks = [...document.querySelectorAll(".shard-mark")];

let game = createGame();
let previousFrame = 0;
let dragonClock = 0;
let lastPlayerMoveAt = 0;
let tunnelFlash = null;

function createGame() {
  return {
    roomId: "HUB",
    player: { row: ROOMS.HUB.spawn[0], col: ROOMS.HUB.spawn[1] },
    hasSword: false,
    hasTunnel: false,
    shards: 0,
    dragons: Object.fromEntries(
      Object.entries(ROOMS).map(([roomId, room]) => [
        roomId,
        room.dragons.map((dragon) => ({ ...dragon })),
      ]),
    ),
    items: Object.fromEntries(
      Object.entries(ROOMS).map(([roomId, room]) => [
        roomId,
        room.items.map((item) => ({ ...item })),
      ]),
    ),
    won: false,
  };
}

function currentRoom() {
  return ROOMS[game.roomId];
}

function findExit(room, side, row) {
  return room.exits.find((exit) => exit.side === side && exit.row === row);
}

function enterRoom(roomId, message, spawn) {
  const destination = ROOMS[roomId];
  if (!destination) throw new Error(`Unknown room connection: ${roomId}`);
  game.roomId = roomId;
  game.player = { row: spawn[0], col: spawn[1] };
  dragonClock = 0;
  setMessage(message);
  syncStatus();
}

function transitionThroughExit(side) {
  const room = currentRoom();
  const exit = findExit(room, side, game.player.row);
  if (!exit) return false;

  const destination = ROOMS[exit.to];
  if (!destination) throw new Error(`Unknown room connection: ${exit.to}`);
  enterRoom(
    exit.to,
    `${destination.name} lies beyond the door.`,
    exit.spawn,
  );
  return true;
}

function isWalkable(room, row, col) {
  return row >= 0 && row < ROOM_HEIGHT && col >= 0 && col < ROOM_WIDTH && room.grid[row][col] !== TILE.WALL;
}

function setMessage(message) {
  statusMessage.textContent = message;
}

function syncStatus() {
  const room = currentRoom();
  roomLabel.textContent = room.name;
  roomName.textContent = room.name;
  positionLabel.textContent = `${String(game.player.row).padStart(2, "0")} : ${String(game.player.col).padStart(2, "0")}`;
  shardCount.textContent = String(game.shards);
  shardTotal.textContent = String(TOTAL_SHARDS);
  swordStatus.textContent = game.hasSword ? "Recovered" : "Not found";
  swordStatus.classList.toggle("found", game.hasSword);
  tunnelStatus.textContent = game.hasTunnel ? "Recovered" : "Not found";
  tunnelStatus.classList.toggle("found", game.hasTunnel);
  shardMarks.forEach((mark, index) => mark.classList.toggle("collected", index < game.shards));
  winOverlay.hidden = !game.won;
}

function movePlayer(direction) {
  if (game.won) return;
  const [rowDelta, colDelta] = DIRECTIONS[direction];
  let nextRow = game.player.row + rowDelta;
  let nextCol = game.player.col + colDelta;

  if (nextCol < 0) {
    transitionThroughExit("left");
    return;
  }

  if (nextCol >= ROOM_WIDTH) {
    transitionThroughExit("right");
    return;
  }

  const room = currentRoom();
  let crossedWall = null;
  if (!isWalkable(room, nextRow, nextCol)) {
    if (!game.hasTunnel || !isWalkable(room, nextRow + rowDelta, nextCol + colDelta)) return;
    crossedWall = { row: nextRow, col: nextCol };
    nextRow += rowDelta;
    nextCol += colDelta;
  }

  game.player = { row: nextRow, col: nextCol };
  if (crossedWall) {
    tunnelFlash = {
      roomId: game.roomId,
      ...crossedWall,
      startedAt: performance.now(),
    };
  }
  collectItems();
  checkDragonCollision();
  checkWin();
  syncStatus();
}

function collectItems() {
  const roomItems = game.items[game.roomId];
  for (let index = roomItems.length - 1; index >= 0; index -= 1) {
    const item = roomItems[index];
    if (item.row !== game.player.row || item.col !== game.player.col) continue;
    roomItems.splice(index, 1);
    if (item.kind === "sword") {
      game.hasSword = true;
      setMessage("You found the dragon sword. Now you can face them blade to blade.");
    } else if (item.kind === "tunnel") {
      game.hasTunnel = true;
      setMessage("You found the magic tunnel. It lets you pass through a wall when the far side is clear.");
    } else {
      game.shards += 1;
      setMessage(`Chalice shard recovered. ${game.shards} of ${TOTAL_SHARDS} found.`);
    }
  }
}

function checkDragonCollision() {
  const roomDragons = game.dragons[game.roomId];
  const dragonIndex = roomDragons.findIndex(
    (dragon) => dragon.row === game.player.row && dragon.col === game.player.col,
  );
  if (dragonIndex < 0) return;

  if (game.hasSword) {
    roomDragons.splice(dragonIndex, 1);
    setMessage("The dragon is defeated. The path is clear.");
    return;
  }

  game = createGame();
  dragonClock = 0;
  setMessage("A dragon caught you. Your expedition has reset to the hall.");
}

function checkWin() {
  if (game.shards >= TOTAL_SHARDS) {
    game.won = true;
    setMessage("All four chalice shards are restored.");
  }
}

function findNextStep(room, start, target) {
  if (start.row === target.row && start.col === target.col) return start;

  const key = (row, col) => `${row},${col}`;
  const startKey = key(start.row, start.col);
  const targetKey = key(target.row, target.col);
  const cameFrom = new Map([[startKey, null]]);
  const frontier = [{ ...start }];

  while (frontier.length > 0 && !cameFrom.has(targetKey)) {
    const current = frontier.shift();
    for (const [rowDelta, colDelta] of Object.values(DIRECTIONS)) {
      const row = current.row + rowDelta;
      const col = current.col + colDelta;
      const neighborKey = key(row, col);
      if (!cameFrom.has(neighborKey) && isWalkable(room, row, col)) {
        cameFrom.set(neighborKey, key(current.row, current.col));
        frontier.push({ row, col });
      }
    }
  }

  if (!cameFrom.has(targetKey)) return start;
  let nextKey = targetKey;
  while (cameFrom.get(nextKey) !== startKey) nextKey = cameFrom.get(nextKey);
  const [row, col] = nextKey.split(",").map(Number);
  return { row, col };
}

function moveDragons() {
  const room = currentRoom();
  for (const dragon of game.dragons[game.roomId]) {
    const next = findNextStep(room, dragon, game.player);
    dragon.row = next.row;
    dragon.col = next.col;
  }
  collectItems();
  checkDragonCollision();
  checkWin();
  syncStatus();
}

function restartGame() {
  game = createGame();
  dragonClock = 0;
  setMessage("A new expedition begins. Find the four chalice shards.");
  syncStatus();
}

function drawRoom(timestamp) {
  const room = currentRoom();
  const palette = room.palette;
  context.clearRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < ROOM_HEIGHT; row += 1) {
    for (let col = 0; col < ROOM_WIDTH; col += 1) {
      const x = col * CELL_SIZE;
      const y = row * CELL_SIZE;
      const tile = room.grid[row][col];
      context.fillStyle = tile === TILE.WALL ? palette.wall : palette.floor;
      context.fillRect(x, y, CELL_SIZE, CELL_SIZE);

      if (tile === TILE.WALL) {
        drawWall(x, y, palette);
        if (tunnelFlash?.roomId === game.roomId && tunnelFlash.row === row && tunnelFlash.col === col) {
          const progress = Math.max(0, 1 - (timestamp - tunnelFlash.startedAt) / TUNNEL_FLASH_DURATION);
          if (progress > 0) {
            context.fillStyle = `rgba(111, 234, 210, ${0.55 * progress})`;
            context.fillRect(x, y, CELL_SIZE, CELL_SIZE);
            context.strokeStyle = `rgba(229, 255, 220, ${0.9 * progress})`;
            context.lineWidth = 3;
            context.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
          } else {
            tunnelFlash = null;
          }
        }
      } else {
        context.strokeStyle = `${palette.line}70`;
        context.lineWidth = 1;
        context.strokeRect(x + 0.5, y + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
        if (tile === TILE.DOOR) drawDoor(x, y, palette);
        else drawFloorMark(x, y, row, col, palette);
      }
    }
  }

  for (const item of game.items[game.roomId]) {
    if (item.kind === "sword") drawSword(item.row, item.col);
    else if (item.kind === "tunnel") drawTunnel(item.row, item.col, timestamp);
    else drawShard(item.row, item.col, timestamp);
  }

  game.dragons[game.roomId].forEach((dragon, index) => drawDragon(dragon, timestamp, index));
  drawPlayer(game.player);
  drawCanvasHud(room);
}

function drawWall(x, y, palette) {
  context.fillStyle = "rgba(10, 24, 19, 0.18)";
  context.fillRect(x + 3, y + 4, CELL_SIZE - 6, CELL_SIZE - 7);
  context.strokeStyle = `${palette.line}b0`;
  context.lineWidth = 1;
  context.strokeRect(x + 3.5, y + 3.5, CELL_SIZE - 7, CELL_SIZE - 7);
  context.beginPath();
  context.moveTo(x + 5, y + 24);
  context.lineTo(x + 43, y + 24);
  context.moveTo(x + 24, y + 5);
  context.lineTo(x + 24, y + 22);
  context.moveTo(x + 13, y + 26);
  context.lineTo(x + 13, y + 43);
  context.stroke();
}

function drawFloorMark(x, y, row, col, palette) {
  if ((row * 7 + col * 11) % 5 !== 0) return;
  context.fillStyle = `${palette.line}36`;
  context.fillRect(x + 9 + ((row + col) % 3) * 6, y + 11 + ((row * col) % 3) * 5, 3, 3);
}

function drawDoor(x, y, palette) {
  context.fillStyle = palette.door;
  context.fillRect(x + 5, y + 5, CELL_SIZE - 10, CELL_SIZE - 10);
  context.fillStyle = "rgba(28, 44, 35, 0.7)";
  context.beginPath();
  context.roundRect(x + 13, y + 9, 22, 30, [11, 11, 2, 2]);
  context.fill();
  context.fillStyle = "#f1d889";
  context.beginPath();
  context.arc(x + 30, y + 26, 2, 0, Math.PI * 2);
  context.fill();
}

function cellCenter(row, col) {
  return { x: col * CELL_SIZE + CELL_SIZE / 2, y: row * CELL_SIZE + CELL_SIZE / 2 };
}

function drawShard(row, col, timestamp) {
  const { x, y } = cellCenter(row, col);
  const bob = Math.sin(timestamp / 280 + row) * 2;
  context.save();
  context.translate(x, y + bob);
  context.shadowColor = "rgba(255, 245, 195, 0.8)";
  context.shadowBlur = 12;
  context.fillStyle = "#f4e3a4";
  context.strokeStyle = "#a64e49";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, -17);
  context.lineTo(13, -5);
  context.lineTo(8, 14);
  context.lineTo(-8, 14);
  context.lineTo(-13, -5);
  context.closePath();
  context.fill();
  context.stroke();
  context.shadowBlur = 0;
  context.strokeStyle = "rgba(166, 78, 73, 0.55)";
  context.beginPath();
  context.moveTo(0, -16);
  context.lineTo(0, 12);
  context.moveTo(-12, -5);
  context.lineTo(0, 1);
  context.lineTo(12, -5);
  context.stroke();
  context.restore();
}

function drawSword(row, col) {
  const { x, y } = cellCenter(row, col);
  context.save();
  context.translate(x, y);
  context.rotate(-Math.PI / 4);
  context.shadowColor = "rgba(31, 45, 38, 0.35)";
  context.shadowBlur = 5;
  context.fillStyle = "#fff1bd";
  context.strokeStyle = "#876021";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, -18);
  context.lineTo(6, 4);
  context.lineTo(0, 8);
  context.lineTo(-6, 4);
  context.closePath();
  context.fill();
  context.stroke();
  context.fillStyle = "#c98e35";
  context.fillRect(-10, 5, 20, 4);
  context.fillRect(-2, 8, 4, 11);
  context.fillStyle = "#523c2c";
  context.fillRect(-3, 17, 6, 5);
  context.restore();
}

function drawTunnel(row, col, timestamp) {
  const { x, y } = cellCenter(row, col);
  const bob = Math.sin(timestamp / 280 + row) * 2;
  context.save();
  context.translate(x, y + bob);
  context.shadowColor = "rgba(119, 220, 207, 0.8)";
  context.shadowBlur = 12;
  context.fillStyle = "#78d4c5";
  context.strokeStyle = "#286c66";
  context.lineWidth = 2;
  context.beginPath();
  context.roundRect(-15, -7, 30, 14, 3);
  context.fill();
  context.stroke();
  context.shadowBlur = 0;
  context.strokeStyle = "#e5f2ca";
  context.beginPath();
  context.moveTo(-8, -3);
  context.lineTo(8, -3);
  context.moveTo(-8, 3);
  context.lineTo(8, 3);
  context.stroke();
  context.restore();
}

function drawDragon(dragon, timestamp, index) {
  const { x, y } = cellCenter(dragon.row, dragon.col);
  const bob = Math.sin(timestamp / 180 + index) * 1.8;
  context.save();
  context.translate(x, y + bob);

  context.fillStyle = "rgba(25, 37, 29, 0.22)";
  context.beginPath();
  context.ellipse(0, 17, 17, 5, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#445f42";
  context.beginPath();
  context.moveTo(-9, 2);
  context.lineTo(-21, -7);
  context.lineTo(-17, 10);
  context.lineTo(-8, 11);
  context.closePath();
  context.fill();
  context.beginPath();
  context.moveTo(8, 2);
  context.lineTo(21, -7);
  context.lineTo(17, 10);
  context.lineTo(8, 11);
  context.closePath();
  context.fill();

  context.strokeStyle = "#49603d";
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(13, 8);
  context.quadraticCurveTo(23, 16, 18, 20);
  context.stroke();

  context.fillStyle = "#77924d";
  context.beginPath();
  context.ellipse(0, 5, 15, 13, 0, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.ellipse(0, -6, 14, 12, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#8ba85a";
  context.beginPath();
  context.moveTo(-8, -15);
  context.lineTo(-10, -23);
  context.lineTo(-2, -16);
  context.moveTo(8, -15);
  context.lineTo(11, -22);
  context.lineTo(3, -16);
  context.fill();

  context.fillStyle = "#f1d179";
  context.beginPath();
  context.ellipse(-5, -7, 2.6, 4, 0, 0, Math.PI * 2);
  context.ellipse(5, -7, 2.6, 4, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#222d24";
  context.beginPath();
  context.arc(-5, -7, 1, 0, Math.PI * 2);
  context.arc(5, -7, 1, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "#3b4836";
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(-4, 1);
  context.quadraticCurveTo(0, 3, 4, 1);
  context.stroke();
  context.restore();
}

function drawPlayer(player) {
  const { x, y } = cellCenter(player.row, player.col);
  context.save();
  context.fillStyle = "rgba(25, 37, 29, 0.24)";
  context.beginPath();
  context.ellipse(x, y + 15, 14, 5, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#344e40";
  context.beginPath();
  context.moveTo(x - 13, y + 13);
  context.lineTo(x - 10, y - 3);
  context.lineTo(x, y - 11);
  context.lineTo(x + 10, y - 3);
  context.lineTo(x + 13, y + 13);
  context.closePath();
  context.fill();

  context.fillStyle = "#edc75f";
  context.beginPath();
  context.arc(x, y - 4, 9, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#354338";
  context.beginPath();
  context.arc(x, y - 8, 9, Math.PI, Math.PI * 2);
  context.lineTo(x + 11, y - 6);
  context.lineTo(x - 10, y - 6);
  context.fill();
  context.fillStyle = "#222c25";
  context.beginPath();
  context.arc(x - 3, y - 3, 1.2, 0, Math.PI * 2);
  context.arc(x + 3, y - 3, 1.2, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawCanvasHud(room) {
  context.fillStyle = "rgba(24, 39, 32, 0.84)";
  context.fillRect(0, 0, canvas.width, 43);
  context.fillStyle = "#f2eee0";
  context.font = "500 13px 'DM Mono', monospace";
  context.textBaseline = "middle";
  context.fillText(room.shortName, 16, 22);
  context.textAlign = "right";
  context.fillStyle = game.hasSword ? "#efcb69" : "#d6dfcf";
  context.fillText(game.hasSword ? "SWORD  FOUND" : "SWORD  LOST", canvas.width - 16, 22);
  context.textAlign = "left";
  context.fillStyle = "#f0d17c";
  context.fillText(`SHARDS  ${game.shards} / ${TOTAL_SHARDS}`, canvas.width - 220, 22);
}

function frame(timestamp) {
  if (previousFrame === 0) previousFrame = timestamp;
  const delta = Math.min(timestamp - previousFrame, 100);
  previousFrame = timestamp;
  if (!game.won) {
    dragonClock += delta;
    if (dragonClock >= DRAGON_INTERVAL) {
      dragonClock %= DRAGON_INTERVAL;
      moveDragons();
    }
  }
  drawRoom(timestamp);
  requestAnimationFrame(frame);
}

const keyDirections = {
  ArrowUp: "up",
  w: "up",
  W: "up",
  ArrowDown: "down",
  s: "down",
  S: "down",
  ArrowLeft: "left",
  a: "left",
  A: "left",
  ArrowRight: "right",
  d: "right",
  D: "right",
};

document.addEventListener("keydown", (event) => {
  const direction = keyDirections[event.key];
  if (!direction) return;
  event.preventDefault();
  const now = performance.now();
  if (event.repeat && now - lastPlayerMoveAt < PLAYER_REPEAT_INTERVAL) return;
  lastPlayerMoveAt = now;
  movePlayer(direction);
});

document.querySelectorAll("[data-move]").forEach((button) => {
  button.addEventListener("click", () => movePlayer(button.dataset.move));
});

document.querySelector("#restartButton").addEventListener("click", restartGame);
document.querySelector("#playAgainButton").addEventListener("click", restartGame);

syncStatus();
requestAnimationFrame(frame);