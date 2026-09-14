const domPlinko = {
  bankroll: document.getElementById("bankroll"),
  plinkoBetInput: document.getElementById("plinkoBetInput"),
  plinkoBetDisplay: document.getElementById("plinkoBetDisplay"),
  plinkoStepInput: document.getElementById("plinkoStepInput"),
  minusBtn: document.getElementById("minusBtn"),
  plusBtn: document.getElementById("plusBtn"),
  dropBtn: document.getElementById("dropBtn"),
  clearBtn: document.getElementById("clearBtn"),
  prize: document.getElementById("plinkoPrize"),
  dropBin: document.getElementById("plinkoDropBin"),
  statusText: document.getElementById("statusText"),
  log: document.getElementById("gameLog"),
  roundBadge: document.getElementById("roundBadge"),
  lockState: document.getElementById("lockState"),
  canvas: document.getElementById("plinkoCanvas")
};

const ctx = domPlinko.canvas.getContext("2d");
let bank = RAJEGameSystem.getBankroll();
let currentBet = Math.max(25, Number(domPlinko.plinkoBetInput.value) || 25);
let betStep = Math.max(1, Number(domPlinko.plinkoStepInput.value) || 25);
let lastPrize = 25;
let lastBin = 0;

function updateBankroll() {
  bank = RAJEGameSystem.getBankroll();
  domPlinko.bankroll.textContent = `${bank} RAJES`;
}

function normalizeBet(value) {
  const minimum = 25;
  const maximum = Math.min(250, bank);
  return Math.min(Math.max(Number(value) || minimum, minimum), maximum);
}

function displayBet(value) {
  const safeValue = normalizeBet(value);
  domPlinko.plinkoBetInput.value = safeValue;
  domPlinko.plinkoBetDisplay.textContent = `${safeValue} RAJES`;
  currentBet = safeValue;
}

function setBetControlsLocked(locked) {
  domPlinko.plinkoBetInput.disabled = locked;
  domPlinko.minusBtn.disabled = locked;
  domPlinko.plusBtn.disabled = locked;
  domPlinko.plinkoStepInput.disabled = locked;

  if (locked) {
    domPlinko.lockState.textContent = "Bet locked";
    domPlinko.lockState.className = "lock-state locked";
    domPlinko.plinkoBetInput.style.display = "none";
    domPlinko.minusBtn.style.display = "none";
    domPlinko.plusBtn.style.display = "none";
    domPlinko.plinkoBetDisplay.style.display = "inline-block";
  } else {
    domPlinko.lockState.textContent = "Wallet ready";
    domPlinko.lockState.className = "lock-state unlocked";
    domPlinko.plinkoBetInput.style.display = "block";
    domPlinko.minusBtn.style.display = "inline-flex";
    domPlinko.plusBtn.style.display = "inline-flex";
    domPlinko.plinkoBetDisplay.style.display = "none";
  }
}

function log(message) {
  const item = document.createElement("div");
  item.className = "log-item";
  item.textContent = message;
  domPlinko.log.prepend(item);
}

function drawBoard() {
  const width = domPlinko.canvas.width;
  const height = domPlinko.canvas.height;
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = "#102f1f";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#dfffe8";
  ctx.fillStyle = "#dfffe8";
  ctx.lineWidth = 2;

  const pegRows = 8;
  const spacingX = 90;
  const spacingY = 45;
  const startX = 110;
  const startY = 40;

  for (let row = 0; row < pegRows; row += 1) {
    const y = startY + row * spacingY;
    for (let column = 0; column < row + 1; column += 1) {
      const x = startX + column * spacingX + (row % 2 === 0 ? spacingX / 2 : 0);
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // bin columns
  ctx.fillStyle = "#ffd166";
  const binWidth = width / 11;
  for (let i = 0; i < 11; i += 1) {
    const x = 50 + i * binWidth;
    ctx.fillStyle = "#173b26";
    ctx.fillRect(x, 360, binWidth - 5, 80);
    ctx.strokeStyle = "#dfffe8";
    ctx.strokeRect(x, 360, binWidth - 5, 80);
  }

  ctx.strokeStyle = "#ffd166";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(40, 360);
  ctx.lineTo(width - 40, 360);
  ctx.stroke();
}

function launchBall() {
  if (bank < currentBet) {
    domPlinko.statusText.textContent = "Not enough RAJES";
    log("Not enough RAJES for this drop.");
    return;
  }

  if (gameActive) {
    return;
  }

  gameActive = true;
  setBetControlsLocked(true);

  const ballX = 450;
  const ballY = 20;
  const wallLimit = 100;
  const rows = 8;
  const xPositions = [];
  let x = ballX;

  for (let r = 0; r < rows; r += 1) {
    const direction = Math.random() > 0.5 ? 1 : -1;
    const speed = 8 + Math.random() * 12;
    x += direction * speed * (r % 2 + 1) * 8;
    xPositions.push(Math.max(100, Math.min(780, x)));
  }

  const finalX = xPositions[xPositions.length - 1];
  const binIndex = Math.min(10, Math.max(0, Math.round((finalX - 50) / 80)));
  const multipliers = [0.25, 0.5, 1, 2, 3, 4, 5, 8, 10, 12, 15];
  const prize = Math.round(currentBet * multipliers[binIndex]);

  animateDrop(ballX, ballY, xPositions, binIndex, prize);
}

let gameActive = false;

function animateDrop(startX, startY, xPositions, binIndex, prize) {
  const start = 0;
  const finalX = xPositions[xPositions.length - 1];
  const x = Math.min(780, Math.max(60, finalX));

  ctx.clearRect(0, 0, domPlinko.canvas.width, domPlinko.canvas.height);
  drawBoard();

  let ballX = startX;
  let ballY = startY;
  const rows = 8;
  const startYPositions = [];

  for (let row = 0; row < rows; row += 1) {
    startYPositions.push(40 + row * 45);
  }

  ctx.fillStyle = "#ffd166";
  ctx.beginPath();
  ctx.arc(ballX, ballY, 10, 0, Math.PI * 2);
  ctx.fill();

  const dropTrail = [];
  let r = 0;
  let t = 0;

  let direction = Math.random() > 0.5 ? 1 : -1;
  for (let row = 0; row < rows; row += 1) {
    const targetX = 110 + row * 82 + (row % 2 === 0 ? 40 : 0) + Math.round(Math.random() * 50) * direction;
    dropTrail.push({ x: targetX, y: 50 + row * 45 });
    direction *= -1;
  }

  let i = 0;
  const interval = setInterval(() => {
    if (i >= dropTrail.length) {
      clearInterval(interval);
      const finalBallX = 50 + binIndex * (domPlinko.canvas.width / 11) + 34;
      const finalY = 390;

      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.arc(finalBallX, finalY, 10, 0, Math.PI * 2);
      ctx.fill();

      lastPrize = prize;
      lastBin = binIndex;
      domPlinko.prize.textContent = prize;
      domPlinko.dropBin.textContent = String(binIndex + 1);

      const previousBank = bank;
      if (prize >= currentBet) {
        RAJEGameSystem.addBankroll(prize - currentBet);
      } else {
        RAJEGameSystem.setBankroll(Math.max(0, bank - currentBet + prize));
      }

      bank = RAJEGameSystem.getBankroll();
      domPlinko.bankroll.textContent = `${bank} RAJES`;

      domPlinko.statusText.textContent = `Prize ${prize} RAJES`;
      log(`Drop landed in bin ${binIndex + 1} for ${prize} RAJES.`);

      currentBet = normalizeBet(currentBet);
      displayBet(currentBet);
      gameActive = false;
      setBetControlsLocked(false);
      return;
    }

    const point = dropTrail[i];
    ctx.clearRect(0, 0, domPlinko.canvas.width, domPlinko.canvas.height);
    drawBoard();

    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
    ctx.fill();

    i += 1;
  }, 80);
}

domPlinko.dropBtn.addEventListener("click", launchBall);

domPlinko.minusBtn.addEventListener("click", () => {
  const step = Math.max(1, Number(domPlinko.plinkoStepInput.value) || 25);
  displayBet(Number(domPlinko.plinkoBetInput.value) - step);
});

domPlinko.plusBtn.addEventListener("click", () => {
  const step = Math.max(1, Number(domPlinko.plinkoStepInput.value) || 25);
  displayBet(Number(domPlinko.plinkoBetInput.value) + step);
});

domPlinko.plinkoStepInput.addEventListener("change", () => {
  const step = Math.max(1, Number(domPlinko.plinkoStepInput.value) || 25);
  domPlinko.plinkoStepInput.value = step;
  betStep = step;
});

domPlinko.plinkoBetInput.addEventListener("change", () => {
  displayBet(Number(domPlinko.plinkoBetInput.value));
});

domPlinko.clearBtn.addEventListener("click", () => {
  domPlinko.plinkoBetInput.value = 50;
  domPlinko.plinkoBetDisplay.textContent = "50 RAJES";
  currentBet = 50;
});

setBetControlsLocked(false);
drawBoard();
updateBankroll();
log("Plinko table ready.");
