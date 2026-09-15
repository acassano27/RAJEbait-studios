const USERS_KEY = 'rajebait_users_v1';
const CURRENT_USER_KEY = 'rajebait_current_user_v1';
const GUEST_BALANCE_KEY = 'rajebait_guest_balance_v1';
const GUEST_BALANCE = 1000;
const RESTORE_AMOUNT = 100;

function getGuestBalance() {
  const saved = localStorage.getItem(GUEST_BALANCE_KEY);
  const parsed = Number(saved);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : GUEST_BALANCE;
}

function setGuestBalance(amount) {
  localStorage.setItem(GUEST_BALANCE_KEY, String(Math.max(0, Number(amount) || 0)));
}

function initializeGuestBalance() {
  const currentUser = getCurrentUser();
  const saved = localStorage.getItem(GUEST_BALANCE_KEY);

  if (!currentUser && (!saved || !Number.isFinite(Number(saved)) || Number(saved) < 0)) {
    setGuestBalance(GUEST_BALANCE);
  }
}

function loadUsers() {
  const saved = localStorage.getItem(USERS_KEY);
  return saved ? JSON.parse(saved) : [];
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getCurrentUser() {
  const username = localStorage.getItem(CURRENT_USER_KEY);
  if (!username) return null;

  const users = loadUsers();
  return users.find((user) => user.username === username) || null;
}

function setCurrentUser(username) {
  localStorage.setItem(CURRENT_USER_KEY, username);
}

function getBalanceForUser(user) {
  if (!user) return getGuestBalance();
  return Number(user.balance ?? 0);
}

function setBalanceForUser(user, amount) {
  if (!user) {
    setGuestBalance(amount);
    return;
  }

  const users = loadUsers();
  const index = users.findIndex((entry) => entry.username === user.username);
  if (index === -1) return;

  users[index].balance = amount;
  saveUsers(users);
}

function renderBalance() {
  const balanceNode = document.querySelector('.balance-pill span');
  if (!balanceNode) return;

  const user = getCurrentUser();
  const balance = getBalanceForUser(user);
  balanceNode.textContent = balance.toLocaleString();
}

function applyGameResult(delta, gameName = '', category = '') {
  return adjustBalanceBy(delta, gameName, category);
}

function adjustBalanceBy(delta, gameName = '', category = '') {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    const nextGuestBalance = getGuestBalance() + Number(delta || 0);
    setGuestBalance(nextGuestBalance);
    renderBalance();
    updateAccountSummary();
    return nextGuestBalance;
  }

  const users = loadUsers();
  const index = users.findIndex((entry) => entry.username === currentUser.username);
  if (index === -1) return getBalanceForUser(currentUser);

  const nextBalance = (Number(users[index].balance ?? 0) + Number(delta || 0));
  users[index].balance = nextBalance;
  saveUsers(users);

  if (gameName) {
    saveHistory(gameName, category);
  }

  renderBalance();
  updateAccountSummary();
  return nextBalance;
}

function updateAccountSummary() {
  const summary = document.getElementById('accountSummary');
  const restoreButton = document.getElementById('restoreBalanceButton');
  if (!summary) return;

  const user = getCurrentUser();
  const guestBalance = getGuestBalance();

  if (restoreButton) {
    restoreButton.disabled = !user;
    restoreButton.title = user ? 'Add 100 RAJE\'s' : 'Sign in to restore currency';
  }

  if (!user) {
    summary.innerHTML = `
      <strong>Guest</strong><br />
      <div>Free balance: ${guestBalance.toLocaleString()} RAJE's</div>
    `;
    renderBalance();
    return;
  }

  const recent = user.history && user.history.length ? user.history.slice(0, 3) : [];
  const historyMarkup = recent.length
    ? recent.map((item) => `<div>${item.game} · ${item.category}</div>`).join('')
    : '<div>No games played yet</div>';

  summary.innerHTML = `
    <strong>${user.username}</strong><br />
    <div>Balance: ${getBalanceForUser(user).toLocaleString()} RAJE's</div>
    ${historyMarkup}
  `;
  renderBalance();
}

function saveHistory(gameName, category) {
  const user = getCurrentUser();
  if (!user) return;

  const users = loadUsers();
  const index = users.findIndex((entry) => entry.username === user.username);

  if (index === -1) return;

  const gameEntry = {
    game: gameName,
    category,
    timestamp: new Date().toISOString(),
  };

  users[index].history = [gameEntry, ...(users[index].history || [])].slice(0, 6);
  saveUsers(users);
  updateAccountSummary();
}

function openAuthModal() {
  const modal = document.getElementById('authModal');
  if (!modal) return;
  setAuthMode('sign-in');
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  setTimeout(() => document.getElementById('usernameInput')?.focus(), 50);
}

function closeAuthModal() {
  const modal = document.getElementById('authModal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  document.getElementById('authForm')?.reset();
  const message = document.getElementById('authMessage');
  if (message) message.textContent = '';
}

let authMode = 'sign-in';

function setAuthMode(mode) {
  authMode = mode;

  const title = document.getElementById('authTitle');
  const submit = document.getElementById('authSubmitButton');
  const switchButton = document.getElementById('authSwitchButton');
  const usernameLabel = document.getElementById('usernameLabel');
  const usernameInput = document.getElementById('usernameInput');
  const passwordLabel = document.getElementById('passwordLabel');
  const passwordInput = document.getElementById('passwordInput');
  const confirmPasswordField = document.getElementById('confirmPasswordField');
  const confirmPasswordInput = document.getElementById('confirmPasswordInput');

  const creatingAccount = mode === 'create';
  if (title) title.textContent = creatingAccount ? 'Create account' : 'Sign in';
  if (submit) submit.textContent = creatingAccount ? 'Create account' : 'Sign in';
  if (switchButton) switchButton.textContent = creatingAccount ? 'Back to sign in' : 'Make account';
  if (usernameLabel) usernameLabel.textContent = creatingAccount ? 'Make a username' : 'Username';
  if (usernameInput) usernameInput.placeholder = creatingAccount ? 'Make a username' : 'Enter username';
  if (passwordLabel) passwordLabel.textContent = creatingAccount ? 'Make a password' : 'Password';
  if (passwordInput) passwordInput.placeholder = creatingAccount ? 'Make a password' : 'Enter password';
  if (confirmPasswordField) {
    confirmPasswordField.hidden = !creatingAccount;
    confirmPasswordField.classList.toggle('hidden', !creatingAccount);
    confirmPasswordField.classList.toggle('is-visible', creatingAccount);
    confirmPasswordField.style.display = creatingAccount ? 'grid' : 'none';
  }
  if (confirmPasswordInput) {
    confirmPasswordInput.required = creatingAccount;
  }
}

function handleAction(gameName, category) {
  const currentUser = getCurrentUser();

  if (currentUser && gameName) {
    saveHistory(gameName, category);
  }

  window.location.href = 'games.html';
}

function restoreBalance() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    const guestBalance = GUEST_BALANCE;
    const balanceNode = document.querySelector('.balance-pill span');
    if (balanceNode) balanceNode.textContent = guestBalance.toLocaleString();
    return;
  }

  adjustBalanceBy(RESTORE_AMOUNT, 'Restore', 'Account');
}

const TTT_WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];
const COMPUTER_MISTAKE_CHANCE = 0.05;

let ticTacToeBoard = Array(9).fill('');
let ticTacToeCurrentPlayer = 'X';
let ticTacToeGameOver = false;
let ticTacToeVsComputer = true;

function cloneTicTacToeBoard(board) {
  return board.map((cell) => cell);
}

function getTicTacToeWinner(board) {
  for (const [a, b, c] of TTT_WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  return null;
}

function isTicTacToeBoardFull(board) {
  return board.every((cell) => cell !== '');
}

function getAvailableTicTacToeMoves(board) {
  const moves = [];
  board.forEach((cell, index) => {
    if (!cell) moves.push(index);
  });
  return moves;
}

function makeTicTacToeMove(board, moveIndex, player) {
  if (board[moveIndex] !== '') return false;
  board[moveIndex] = player;
  return true;
}

function minimaxTicTacToe(board, currentPlayer) {
  const winner = getTicTacToeWinner(board);

  if (winner === 'O') return 1;
  if (winner === 'X') return -1;
  if (isTicTacToeBoardFull(board)) return 0;

  if (currentPlayer === 'O') {
    let bestScore = -10;
    for (const move of getAvailableTicTacToeMoves(board)) {
      const nextBoard = cloneTicTacToeBoard(board);
      makeTicTacToeMove(nextBoard, move, 'O');
      const score = minimaxTicTacToe(nextBoard, 'X');
      bestScore = Math.max(bestScore, score);
    }
    return bestScore;
  }

  let bestScore = 10;
  for (const move of getAvailableTicTacToeMoves(board)) {
    const nextBoard = cloneTicTacToeBoard(board);
    makeTicTacToeMove(nextBoard, move, 'X');
    const score = minimaxTicTacToe(nextBoard, 'O');
    bestScore = Math.min(bestScore, score);
  }
  return bestScore;
}

function chooseBestTicTacToeMove(board) {
  const scoredMoves = [];

  for (const move of getAvailableTicTacToeMoves(board)) {
    const nextBoard = cloneTicTacToeBoard(board);
    makeTicTacToeMove(nextBoard, move, 'O');
    const score = minimaxTicTacToe(nextBoard, 'X');
    scoredMoves.push({ move, score });
  }

  if (!scoredMoves.length) return null;

  const bestScore = Math.max(...scoredMoves.map((item) => item.score));
  const bestMoves = scoredMoves.filter((item) => item.score === bestScore).map((item) => item.move);

  if (Math.random() < COMPUTER_MISTAKE_CHANCE) {
    const nonBestMoves = scoredMoves.filter((item) => item.score !== bestScore).map((item) => item.move);
    if (nonBestMoves.length) {
      return nonBestMoves[Math.floor(Math.random() * nonBestMoves.length)];
    }
  }

  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

function resetTicTacToeBoard() {
  ticTacToeBoard = Array(9).fill('');
  ticTacToeCurrentPlayer = 'X';
  ticTacToeGameOver = false;

  const cells = document.querySelectorAll('.ttt-cell');
  cells.forEach((cell) => {
    cell.textContent = '';
    cell.classList.remove('x', 'o');
    cell.disabled = false;
  });

  const status = document.getElementById('tttStatus');
  if (status) {
    status.textContent = ticTacToeVsComputer ? 'Player X starts vs computer' : 'Player X starts';
  }
}

function finishTicTacToeRound(resultText, payout) {
  ticTacToeGameOver = true;
  const status = document.getElementById('tttStatus');
  if (status) status.textContent = resultText;
  if (payout !== 0) applyGameResult(payout, 'Tic Tac Toe', 'Games');
}

function afterHumanMove() {
  const winner = getTicTacToeWinner(ticTacToeBoard);
  const status = document.getElementById('tttStatus');

  if (winner === 'X') {
    finishTicTacToeRound('You win! +50 RAJE\'s', 50);
    return;
  }

  if (isTicTacToeBoardFull(ticTacToeBoard)) {
    finishTicTacToeRound('Draw! No wallet change.', 0);
    return;
  }

  if (ticTacToeVsComputer) {
    ticTacToeCurrentPlayer = 'O';
    if (status) status.textContent = 'Computer thinking...';
    setTimeout(() => {
      if (ticTacToeGameOver) return;
      const move = chooseBestTicTacToeMove(ticTacToeBoard);
      if (move === null) return;

      const cell = document.querySelector(`.ttt-cell[data-index="${move}"]`);
      if (!cell) return;

      ticTacToeBoard[move] = 'O';
      cell.textContent = 'O';
      cell.classList.add('o');
      cell.disabled = true;

      const computerWinner = getTicTacToeWinner(ticTacToeBoard);
      if (computerWinner === 'O') {
        finishTicTacToeRound('Computer wins! -25 RAJE\'s', -25);
        return;
      }

      if (isTicTacToeBoardFull(ticTacToeBoard)) {
        finishTicTacToeRound('Draw! No wallet change.', 0);
        return;
      }

      ticTacToeCurrentPlayer = 'X';
      if (status) status.textContent = 'Your turn';
    }, 300);
    return;
  }

  ticTacToeCurrentPlayer = 'O';
  if (status) status.textContent = 'Player O turn';
}

function handleTicTacToeMove(index) {
  if (ticTacToeGameOver || ticTacToeBoard[index]) {
    return;
  }

  const cell = document.querySelector(`.ttt-cell[data-index="${index}"]`);
  if (!cell) return;

  ticTacToeBoard[index] = ticTacToeCurrentPlayer;
  cell.textContent = ticTacToeCurrentPlayer;
  cell.classList.add(ticTacToeCurrentPlayer.toLowerCase());
  cell.disabled = true;

  if (ticTacToeCurrentPlayer === 'X') {
    afterHumanMove();
    return;
  }

  const winner = getTicTacToeWinner(ticTacToeBoard);
  const status = document.getElementById('tttStatus');

  if (winner === 'O') {
    finishTicTacToeRound('Player O wins! -25 RAJE\'s', -25);
    return;
  }

  if (isTicTacToeBoardFull(ticTacToeBoard)) {
    finishTicTacToeRound('Draw! No wallet change.', 0);
    return;
  }

  ticTacToeCurrentPlayer = 'X';
  if (status) status.textContent = 'Player X turn';
}

function signInUser(username, password) {
  const users = loadUsers();
  const existingUser = users.find((user) => user.username === username);

  if (existingUser) {
    if (existingUser.password !== password) {
      return { ok: false, message: 'Incorrect password.' };
    }
    setCurrentUser(username);
    updateAccountSummary();
    return { ok: true, message: 'Signed in successfully.' };
  }

  const newUser = {
    username,
    password,
    balance: 0,
    history: [],
  };

  users.push(newUser);
  saveUsers(users);
  setCurrentUser(username);
  updateAccountSummary();
  return { ok: true, message: 'Welcome to RAJEbait Studios.' };
}

function createAccount(username, password) {
  const users = loadUsers();
  const existingUser = users.find((user) => user.username === username);

  if (existingUser) {
    return { ok: false, message: 'That username is already in use.' };
  }

  users.push({
    username,
    password,
    balance: 0,
    history: [],
  });
  saveUsers(users);
  setCurrentUser(username);
  updateAccountSummary();
  return { ok: true, message: 'Account created successfully.' };
}

document.addEventListener('DOMContentLoaded', () => {
  const signInButton = document.getElementById('signInButton');
  const playNowButton = document.getElementById('playNowButton');
  const restoreBalanceButton = document.getElementById('restoreBalanceButton');
  const closeModal = document.getElementById('closeModal');
  const authForm = document.getElementById('authForm');
  const authMessage = document.getElementById('authMessage');
  const authSwitchButton = document.getElementById('authSwitchButton');
  const browseCategoriesBtn = document.getElementById('browseCategoriesBtn');
  const tttResetButton = document.getElementById('tttReset');
  const tttPlayAgainButton = document.getElementById('tttPlayAgain');
  const tttComputerModeButton = document.getElementById('tttModeComputer');
  const tttTwoPlayerModeButton = document.getElementById('tttModeTwoPlayer');
  const categoryCards = document.querySelectorAll('[data-category]');
  const featureCards = document.querySelectorAll('[data-game]');
  const tttCells = document.querySelectorAll('.ttt-cell');

  initializeGuestBalance();
  renderBalance();
  updateAccountSummary();

  if (tttCells.length) {
    resetTicTacToeBoard();
    tttCells.forEach((cell) => {
      cell.addEventListener('click', () => {
        if (ticTacToeVsComputer && ticTacToeCurrentPlayer === 'O') return;
        handleTicTacToeMove(Number(cell.dataset.index));
      });
    });
  }

  tttResetButton?.addEventListener('click', resetTicTacToeBoard);
  tttPlayAgainButton?.addEventListener('click', resetTicTacToeBoard);

  tttComputerModeButton?.addEventListener('click', () => {
    ticTacToeVsComputer = true;
    tttComputerModeButton.classList.add('active');
    tttTwoPlayerModeButton?.classList.remove('active');
    resetTicTacToeBoard();
  });

  tttTwoPlayerModeButton?.addEventListener('click', () => {
    ticTacToeVsComputer = false;
    tttTwoPlayerModeButton.classList.add('active');
    tttComputerModeButton?.classList.remove('active');
    resetTicTacToeBoard();
  });

  signInButton?.addEventListener('click', openAuthModal);
  authSwitchButton?.addEventListener('click', (event) => {
    event.preventDefault();
    setAuthMode(authMode === 'create' ? 'sign-in' : 'create');
    if (authMessage) authMessage.textContent = '';
    document.getElementById('authForm')?.reset();
    document.getElementById('usernameInput')?.focus();
  });
  closeModal?.addEventListener('click', closeAuthModal);
  restoreBalanceButton?.addEventListener('click', restoreBalance);
  browseCategoriesBtn?.addEventListener('click', () => window.location.href = 'index.html#categories');
  playNowButton?.addEventListener('click', () => handleAction(null, 'Play now'));

  categoryCards.forEach((card) => {
    card.addEventListener('click', () => {
      const category = card.dataset.category;
      handleAction(`${category} collection`, category);
    });
  });

  featureCards.forEach((card) => {
    card.addEventListener('click', () => {
      const gameName = card.dataset.game;
      const category = card.dataset.category;
      handleAction(gameName, category);
    });
  });

  authForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const username = document.getElementById('usernameInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();
    const confirmPassword = document.getElementById('confirmPasswordInput')?.value.trim() || '';

    if (!username || !password) {
      authMessage.textContent = 'Please enter both a username and password.';
      return;
    }

    if (authMode === 'create' && password !== confirmPassword) {
      authMessage.textContent = 'Passwords do not match.';
      return;
    }

    const result = authMode === 'create'
      ? createAccount(username, password)
      : signInUser(username, password);
    authMessage.textContent = result.message;

    if (result.ok) {
      setTimeout(() => closeAuthModal(), 600);
    }
  });

  document.addEventListener('click', (event) => {
    const modal = document.getElementById('authModal');
    if (event.target === modal) {
      closeAuthModal();
    }
  });
});
