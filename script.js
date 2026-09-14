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

document.addEventListener('DOMContentLoaded', () => {
  const signInButton = document.getElementById('signInButton');
  const playNowButton = document.getElementById('playNowButton');
  const restoreBalanceButton = document.getElementById('restoreBalanceButton');
  const closeModal = document.getElementById('closeModal');
  const authForm = document.getElementById('authForm');
  const authMessage = document.getElementById('authMessage');
  const browseCategoriesBtn = document.getElementById('browseCategoriesBtn');
  const categoryCards = document.querySelectorAll('[data-category]');
  const featureCards = document.querySelectorAll('[data-game]');

  initializeGuestBalance();
  renderBalance();
  updateAccountSummary();

  signInButton?.addEventListener('click', openAuthModal);
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

    if (!username || !password) {
      authMessage.textContent = 'Please enter both a username and password.';
      return;
    }

    const result = signInUser(username, password);
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
