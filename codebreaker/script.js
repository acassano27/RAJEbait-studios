const DIGIT_COUNT = 3;
const MAX_ATTEMPTS = 8;

const guessRow = document.getElementById('guessRow');
const guessPanel = document.querySelector('.guess-panel');
const gameShell = document.querySelector('.game-shell');
const attemptCount = document.getElementById('attemptCount');
const message = document.getElementById('message');
const historyList = document.getElementById('historyList');

const checkBtn = document.getElementById('checkBtn');
const newGameBtn = document.getElementById('newGameBtn');
const upBtn = document.getElementById('upBtn');
const downBtn = document.getElementById('downBtn');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const centerBtn = document.getElementById('centerBtn');

let targetCode = [];
let currentGuess = [];
let selectedIndex = 0;
let attemptsUsed = 0;
let gameOver = false;
let history = [];
let lastGuessStatus = Array(DIGIT_COUNT).fill('');
let previewStatus = Array(DIGIT_COUNT).fill('');

function applyPreviewStatus(guess) {
  previewStatus = calculateFeedback(guess).status;
}

function createRandomCode() {
  const availableDigits = Array.from({ length: 10 }, (_, index) => index);
  const code = [];

  const firstDigitPool = availableDigits.filter((digit) => digit !== 0);
  const firstDigit = firstDigitPool[Math.floor(Math.random() * firstDigitPool.length)];
  code.push(firstDigit);

  const remainingDigits = availableDigits.filter((digit) => digit !== firstDigit);
  for (let i = 1; i < DIGIT_COUNT; i += 1) {
    const index = Math.floor(Math.random() * remainingDigits.length);
    code.push(remainingDigits.splice(index, 1)[0]);
  }

  return code;
}

function buildStartingGuess() {
  const guess = createRandomCode();

  while (guess.join('') === targetCode.join('')) {
    const swapIndex = Math.floor(Math.random() * guess.length);
    const spareDigit = Array.from({ length: 10 }, (_, index) => index).find(
      (digit) => !guess.includes(digit) && digit !== 0,
    );

    if (spareDigit === undefined) {
      return guess;
    }

    guess[swapIndex] = spareDigit;
  }

  return guess;
}

function setMessage(text) {
  message.textContent = text;
}

function setWinState(isWin) {
  gameShell.classList.toggle('win-state', isWin);
  guessPanel.classList.toggle('win-state', isWin);
  guessRow.classList.toggle('win-state', isWin);
}

function renderGuess() {
  guessRow.innerHTML = '';

  currentGuess.forEach((digit, index) => {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'digit-cell';
    cell.textContent = digit;

    const status = previewStatus[index] || lastGuessStatus[index] || '';
    if (status) {
      cell.classList.add(status);
    }

    if (index === selectedIndex) {
      cell.classList.add('selected');
    }

    cell.addEventListener('click', () => {
      selectedIndex = index;
      renderGuess();
      updateSelectedDigit();
    });

    guessRow.appendChild(cell);
  });

  updateSelectedDigit();
}

function updateSelectedDigit() {
  // Selected digit is no longer shown in the header.
}

function updateAttempts() {
  attemptCount.textContent = `${attemptsUsed} / ${MAX_ATTEMPTS}`;
}

function calculateFeedback(guess) {
  const status = Array(DIGIT_COUNT).fill('miss');
  const targetCopy = [...targetCode];
  const guessCopy = [...guess];

  for (let i = 0; i < DIGIT_COUNT; i += 1) {
    if (guessCopy[i] === targetCopy[i]) {
      status[i] = 'exact';
      guessCopy[i] = null;
      targetCopy[i] = null;
    }
  }

  let partial = 0;

  for (let i = 0; i < DIGIT_COUNT; i += 1) {
    if (guessCopy[i] === null) continue;

    const matchIndex = targetCopy.indexOf(guessCopy[i]);
    if (matchIndex !== -1) {
      partial += 1;
      status[i] = 'partial';
      targetCopy[matchIndex] = null;
    }
  }

  return {
    exact: status.filter((value) => value === 'exact').length,
    partial,
    status,
  };
}

function renderHistory() {
  historyList.innerHTML = '';

  if (history.length === 0) {
    historyList.innerHTML = '<div class="history-item"><span>No guesses yet</span></div>';
    return;
  }

  history.forEach((entry) => {
    const row = document.createElement('div');
    row.className = 'history-item';

    const guessMarkup = entry.status
      .map((value, index) => `<span class="history-digit ${value}">${entry.guess[index]}</span>`)
      .join('');

    row.innerHTML = `<div class="history-guess">${guessMarkup}</div>`;
    historyList.appendChild(row);
  });
}

function submitGuess() {
  if (gameOver) {
    setMessage('This round is over. Start a new one to play again.');
    return;
  }

  previewStatus = Array(DIGIT_COUNT).fill('');

  if (new Set(currentGuess).size !== currentGuess.length) {
    setMessage('Each digit must be different in this round.');
    return;
  }

  const guessValue = Number(currentGuess.join(''));

  if (Number.isNaN(guessValue)) {
    setMessage('The code is incomplete.');
    return;
  }

  const feedback = calculateFeedback(currentGuess);
  lastGuessStatus = [...feedback.status];
  previewStatus = Array(DIGIT_COUNT).fill('');
  history.unshift({
    guess: currentGuess.join(''),
    exact: feedback.exact,
    partial: feedback.partial,
    status: feedback.status,
  });

  renderGuess();
  renderHistory();
  attemptsUsed += 1;
  updateAttempts();

  if (currentGuess.join('') === targetCode.join('')) {
    gameOver = true;
    setWinState(true);
    setMessage(`Solved! The hidden code was ${targetCode.join('')}.`);
    return;
  }

  if (attemptsUsed >= MAX_ATTEMPTS) {
    gameOver = true;
    setMessage(`No more attempts. The target was ${targetCode.join('')}.`);
    return;
  }

  setMessage(`Not quite. Try again. ${MAX_ATTEMPTS - attemptsUsed} guesses left.`);
}

function changeSelectedDigit(amount) {
  if (gameOver) {
    setMessage('Game over. Start a new round.');
    return;
  }

  previewStatus = Array(DIGIT_COUNT).fill('');

  let nextValue = currentGuess[selectedIndex] + amount;

  if (nextValue > 9) {
    nextValue = 0;
  }

  if (nextValue < 0) {
    nextValue = 9;
  }

  currentGuess[selectedIndex] = nextValue;
  renderGuess();
}

function moveSelection(direction) {
  previewStatus = Array(DIGIT_COUNT).fill('');
  selectedIndex = (selectedIndex + direction + DIGIT_COUNT) % DIGIT_COUNT;
  renderGuess();
}

function handleKeyboardInput(event) {
  if (event.target && ['INPUT', 'TEXTAREA'].includes(event.target.tagName)) {
    return;
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    moveSelection(-1);
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault();
    moveSelection(1);
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    changeSelectedDigit(1);
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    changeSelectedDigit(-1);
  }
}

function startNewGame() {
  targetCode = createRandomCode();
  currentGuess = buildStartingGuess();
  selectedIndex = 0;
  attemptsUsed = 0;
  gameOver = false;
  history = [];
  lastGuessStatus = Array(DIGIT_COUNT).fill('');
  setWinState(false);
  applyPreviewStatus(currentGuess);

  setMessage('Try to match the hidden code by adjusting one digit at a time.');
  updateAttempts();
  renderGuess();
  renderHistory();
}

upBtn.addEventListener('click', () => changeSelectedDigit(1));
downBtn.addEventListener('click', () => changeSelectedDigit(-1));
leftBtn.addEventListener('click', () => moveSelection(-1));
rightBtn.addEventListener('click', () => moveSelection(1));
centerBtn.addEventListener('click', () => {
  setMessage('Digit selected. Use the arrow controls to adjust it.');
});
checkBtn.addEventListener('click', submitGuess);
newGameBtn.addEventListener('click', startNewGame);
document.addEventListener('keydown', handleKeyboardInput);

startNewGame();
