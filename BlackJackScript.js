const suits = ["♠", "♥", "♦", "♣"];
const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const rankValue = {
  A: 11,
  K: 10,
  Q: 10,
  J: 10,
  "10": 10,
  "9": 9,
  "8": 8,
  "7": 7,
  "6": 6,
  "5": 5,
  "4": 4,
  "3": 3,
  "2": 2,
};

const dom = {
  bankroll: document.getElementById("bankroll"),
  dealerScore: document.getElementById("dealerScore"),
  playerScore: document.getElementById("playerScore"),
  dealerHand: document.getElementById("dealerHand"),
  playerHand: document.getElementById("playerHand"),
  dealBtn: document.getElementById("dealBtn"),
  hitBtn: document.getElementById("hitBtn"),
  standBtn: document.getElementById("standBtn"),
  statusText: document.getElementById("statusText"),
  gameLog: document.getElementById("gameLog"),
  roundBadge: document.getElementById("roundBadge"),
  lockState: document.getElementById("lockState"),
  betInput: document.getElementById("betInput"),
  betDisplay: document.getElementById("betDisplay"),
  betStepInput: document.getElementById("betStepInput"),
  minusBtn: document.getElementById("minusBtn"),
  plusBtn: document.getElementById("plusBtn")
};

let deck = [];
let playerHand = [];
let dealerHand = [];
let bank = RAJEGameSystem.getBankroll();
let currentBet = Number(dom.betInput.value);
let round = 1;
let gameActive = false;
let roundComplete = false;
let betStep = Math.max(1, Number(dom.betStepInput.value) || 25);

function createDeck() {
  deck = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank, value: rankValue[rank] });
    }
  }
}

function shuffleDeck() {
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function drawCard() {
  return deck.pop();
}

function makeCardElement(card, hidden = false) {
  const cardElement = document.createElement("div");
  const isRed = card.suit === "♥" || card.suit === "♦";

  cardElement.className = "card";
  if (hidden) {
    cardElement.classList.add("back");
    cardElement.innerHTML = "♠";
    return cardElement;
  }

  if (isRed) {
    cardElement.classList.add("red");
  }

  const top = document.createElement("span");
  top.className = "card-top";
  top.textContent = `${card.rank}${card.suit}`;

  const main = document.createElement("span");
  main.className = "card-main";
  main.textContent = `${card.suit}`;

  const bot = document.createElement("span");
  bot.className = "card-bot";
  bot.textContent = `${card.rank}${card.suit}`;

  cardElement.appendChild(top);
  cardElement.appendChild(main);
  cardElement.appendChild(bot);
  return cardElement;
}

function getScore(hand) {
  let total = 0;
  let aces = 0;

  for (const card of hand) {
    total += card.value;
    if (card.rank === "A") {
      aces += 1;
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  return total;
}

function updateScoreLabels() {
  if (playerHand.length === 0) {
    dom.playerScore.textContent = "?";
  } else {
    const playerScore = getScore(playerHand);
    dom.playerScore.textContent = playerScore > 21 ? `${playerScore} bust` : `${playerScore}`;
  }

  if (dealerHand.length === 0) {
    dom.dealerScore.textContent = "?";
  } else {
    const dealerScore = getScore(dealerHand);
    dom.dealerScore.textContent = dealerScore > 21 ? `${dealerScore} bust` : `${dealerScore}`;
  }
}

function renderHands() {
  dom.playerHand.innerHTML = "";
  dom.dealerHand.innerHTML = "";

  for (const card of playerHand) {
    dom.playerHand.appendChild(makeCardElement(card));
  }

  for (let i = 0; i < dealerHand.length; i += 1) {
    const card = dealerHand[i];
    const hidden = i === 0 && !roundComplete;
    dom.dealerHand.appendChild(makeCardElement(card, hidden));
  }

  updateScoreLabels();
}

function updateBankroll() {
  bank = RAJEGameSystem.getBankroll();
  dom.bankroll.textContent = `$${bank}`;
}

function displayBet(value) {
  const amount = Math.max(25, Number(value) || 25);
  dom.betInput.value = amount;
  dom.betDisplay.textContent = `$${amount}`;
  currentBet = amount;
}

function setBetControlsLocked(locked) {
  dom.betInput.disabled = locked;
  dom.minusBtn.disabled = locked;
  dom.plusBtn.disabled = locked;
  dom.betStepInput.disabled = locked;

  if (locked) {
    dom.lockState.textContent = "Bet locked";
    dom.lockState.className = "lock-state locked";
    dom.betInput.style.display = "none";
    dom.minusBtn.style.display = "none";
    dom.plusBtn.style.display = "none";
    dom.betDisplay.style.display = "inline-block";
    dom.betDisplay.textContent = `$${currentBet}`;
  } else {
    dom.lockState.textContent = "Bet unlocked";
    dom.lockState.className = "lock-state unlocked";
    dom.betInput.style.display = "block";
    dom.minusBtn.style.display = "inline-flex";
    dom.plusBtn.style.display = "inline-flex";
    dom.betDisplay.style.display = "none";
  }
}

function logMessage(message) {
  const logItem = document.createElement("div");
  logItem.className = "log-item";
  logItem.textContent = message;
  dom.gameLog.prepend(logItem);
}

function normalizeBet(value) {
  const minimum = 25;
  const maximum = Math.min(250, bank);
  return Math.min(Math.max(Number(value) || minimum, minimum), maximum);
}

function startRound() {
  const enteredBet = normalizeBet(Number(dom.betInput.value) || 25);
  currentBet = enteredBet;
  dom.betInput.value = currentBet;

  if (bank < currentBet) {
    dom.statusText.textContent = "Not enough chips";
    logMessage("You need at least one bet to play.");
    return;
  }

  roundComplete = false;
  gameActive = true;
  playerHand = [];
  dealerHand = [];

  createDeck();
  shuffleDeck();

  playerHand.push(drawCard(), drawCard());
  dealerHand.push(drawCard(), drawCard());

  dom.hitBtn.disabled = false;
  dom.standBtn.disabled = false;
  dom.dealBtn.disabled = true;
  dom.dealBtn.textContent = "New Round";
  dom.statusText.textContent = "Your move";
  dom.betDisplay.textContent = `$${currentBet}`;
  setBetControlsLocked(true);

  if (getScore(playerHand) === 21) {
    dom.statusText.textContent = "Blackjack!";
    endRound("Blackjack!", "player");
    return;
  }

  renderHands();
}

function hit() {
  if (!gameActive || roundComplete) {
    return;
  }

  playerHand.push(drawCard());

  if (getScore(playerHand) > 21) {
    endRound("Player busts", "dealer");
    return;
  }

  if (getScore(playerHand) === 21) {
    stand();
    return;
  }

  renderHands();
}

function stand() {
  if (!gameActive || roundComplete) {
    return;
  }

  roundComplete = true;
  gameActive = false;

  while (getScore(dealerHand) < 17) {
    dealerHand.push(drawCard());
  }

  const playerScore = getScore(playerHand);
  const dealerScore = getScore(dealerHand);

  if (dealerScore > 21) {
    endRound("Dealer busts", "player");
  } else if (dealerScore > playerScore) {
    endRound("Dealer wins", "dealer");
  } else if (playerScore > dealerScore) {
    endRound("Player wins", "player");
  } else if (playerScore === dealerScore) {
    endRound("Push", "push");
  } else {
    endRound("Dealer wins", "dealer");
  }
}

function endRound(message, winner) {
  const playerScore = getScore(playerHand);
  const dealerScore = getScore(dealerHand);
  const dealerVisibleScore = getScore(dealerHand);

  roundComplete = true;
  gameActive = false;
  dom.hitBtn.disabled = true;
  dom.standBtn.disabled = true;
  dom.dealBtn.disabled = false;
  setBetControlsLocked(false);

  if (winner === "player") {
    const payout = currentBet;
    RAJEGameSystem.addBankroll(payout);
    bank = RAJEGameSystem.getBankroll();
    dom.statusText.textContent = `${message} +${payout}`;
    logMessage(`${message}. Player wins ${payout}.`);
  } else if (winner === "dealer") {
    RAJEGameSystem.setBankroll(Math.max(0, bank - currentBet));
    bank = RAJEGameSystem.getBankroll();
    dom.statusText.textContent = `${message} -${currentBet}`;
    logMessage(`${message}. Dealer wins ${currentBet}.`);
  } else if (winner === "push") {
    dom.statusText.textContent = "Push";
    logMessage("Push. No change.");
  }

  if (bank <= 0) {
    RAJEGameSystem.setBankroll(500);
    bank = RAJEGameSystem.getBankroll();
    dom.statusText.textContent = "Out of chips. Bank reset.";
    logMessage("Bank reset to $500.");
  }

  dom.betInput.value = Math.min(currentBet, bank);
  updateBankroll();

  if (dealerScore > 21) {
    dom.dealerScore.textContent = `${dealerVisibleScore} bust`;
  }

  if (playerScore > 21) {
    dom.playerScore.textContent = `${playerScore} bust`;
  }

  dom.dealBtn.textContent = "Deal";
  roundComplete = true;
  round += 1;
  dom.roundBadge.textContent = `Round ${round}`;

  renderHands();

  const endingStatus = `${message} Dealer ${dealerScore}, Player ${playerScore}.`;
  logMessage(endingStatus);
}


dom.dealBtn.addEventListener("click", startRound);
dom.hitBtn.addEventListener("click", hit);
dom.standBtn.addEventListener("click", stand);

dom.minusBtn.addEventListener("click", () => {
  const step = Math.max(1, Number(dom.betStepInput.value) || 25);
  const nextBet = normalizeBet(Number(dom.betInput.value) - step);
  displayBet(nextBet);
});

dom.plusBtn.addEventListener("click", () => {
  const step = Math.max(1, Number(dom.betStepInput.value) || 25);
  const nextBet = normalizeBet(Number(dom.betInput.value) + step);
  displayBet(nextBet);
});

dom.betInput.addEventListener("change", () => {
  const value = normalizeBet(Number(dom.betInput.value) || 25);
  displayBet(value);
});

dom.betStepInput.addEventListener("change", () => {
  const step = Math.max(1, Number(dom.betStepInput.value) || 25);
  dom.betStepInput.value = step;
  betStep = step;
});

setBetControlsLocked(false);
createDeck();
shuffleDeck();
updateBankroll();
renderHands();
