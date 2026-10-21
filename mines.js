const MINES_PRESETS = {
  easy: { mineCount: 3, diamondChance: 0.04, diamondMultiplier: 3, safeMultiplierBonus: 3 },
  medium: { mineCount: 5, diamondChance: 0.08, diamondMultiplier: 5, safeMultiplierBonus: 4 },
  hard: { mineCount: 7, diamondChance: 0.15, diamondMultiplier: 8, safeMultiplierBonus: 6 },
};

function initializeMines() {
  const board = document.getElementById('minesBoard');
  if (!board) return;

  const difficultyInput = document.getElementById('minesDifficulty');
  const stakeInput = document.getElementById('minesStake');
  const decreaseStakeButton = document.getElementById('minesDecreaseStake');
  const increaseStakeButton = document.getElementById('minesIncreaseStake');
  const startButton = document.getElementById('minesStart');
  const cashOutButton = document.getElementById('minesCashOut');
  const message = document.getElementById('minesMessage');
  const multiplierOutput = document.getElementById('minesMultiplier');
  const payoutOutput = document.getElementById('minesPayout');
  const safeCountOutput = document.getElementById('minesSafeCount');
  const tileCount = 25;
  let mines = new Set();
  let revealed = new Set();
  let diamondTile = null;
  let diamondFound = false;
  let stake = 0;
  let multiplier = 1;
  let active = false;
  let finished = false;

  const money = (amount) => `${Number(amount).toLocaleString()} RAJE's`;

  function renderBoard(hitMine = false) {
    board.replaceChildren();
    for (let tile = 0; tile < tileCount; tile += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mines-tile';
      button.dataset.tile = tile;
      button.setAttribute('aria-label', `Tile ${tile + 1}, hidden`);

      if (revealed.has(tile)) {
        button.classList.add('revealed');
        if (mines.has(tile)) {
          button.classList.add('mine');
          button.textContent = '✹';
          button.setAttribute('aria-label', `Tile ${tile + 1}, mine`);
        } else if (tile === diamondTile && (finished || diamondFound)) {
          button.classList.add('diamond');
          button.textContent = '◆';
          button.setAttribute('aria-label', `Tile ${tile + 1}, diamond`);
        } else {
          button.classList.add('safe');
          button.textContent = '✓';
          button.setAttribute('aria-label', `Tile ${tile + 1}, safe`);
        }
      } else if (hitMine && mines.has(tile)) {
        button.classList.add('revealed', 'mine', 'exposed');
        button.textContent = '✹';
        button.setAttribute('aria-label', `Tile ${tile + 1}, mine`);
      }

      button.disabled = !active || revealed.has(tile);
      board.append(button);
    }
  }

  function updateStats() {
    multiplierOutput.textContent = `${multiplier.toFixed(2)}×`;
    payoutOutput.textContent = money(stake * multiplier);
    safeCountOutput.textContent = String(revealed.size);
  }

  function finishRound(outcome) {
    active = false;
    finished = true;
    cashOutButton.disabled = true;
    startButton.disabled = false;
    difficultyInput.disabled = false;
    stakeInput.disabled = false;
    decreaseStakeButton.disabled = false;
    increaseStakeButton.disabled = false;

    if (outcome === 'mine') {
      message.textContent = 'Mine hit. Your stake is lost.';
      renderBoard(true);
      window.applyGameResult(0, 'Mines', 'Gambling');
      return;
    }

    const payout = Math.round(stake * multiplier * 100) / 100;
    window.applyGameResult(payout, 'Mines', 'Gambling');
    message.textContent = diamondFound
      ? `Cashed out ${money(payout)} with the diamond bonus.`
      : `Cashed out ${money(payout)}.`;
    renderBoard();
  }

  function beginRound() {
    const amount = Number(stakeInput.value);
    const balance = Number(document.querySelector('.balance-pill span')?.textContent.replaceAll(',', ''));
    if (!Number.isInteger(amount) || amount <= 0 || amount > balance) {
      message.textContent = 'Enter a whole-number stake within your current balance.';
      return;
    }

    const preset = MINES_PRESETS[difficultyInput.value];
    stake = amount;
    multiplier = 1;
    revealed = new Set();
    diamondFound = false;
    mines = new Set();
    while (mines.size < preset.mineCount) mines.add(Math.floor(Math.random() * tileCount));
    diamondTile = Math.random() < preset.diamondChance
      ? Array.from({ length: tileCount }, (_, index) => index).filter((tile) => !mines.has(tile))[Math.floor(Math.random() * (tileCount - preset.mineCount))]
      : null;

    window.adjustBalanceBy(-stake);
    active = true;
    finished = false;
    startButton.disabled = true;
    cashOutButton.disabled = false;
    difficultyInput.disabled = true;
    stakeInput.disabled = true;
    decreaseStakeButton.disabled = true;
    increaseStakeButton.disabled = true;
    message.textContent = `${difficultyInput.options[difficultyInput.selectedIndex].text.split(' · ')[0]} round started. Pick a tile or cash out.`;
    updateStats();
    renderBoard();
  }

  function revealTile(tile) {
    if (!active || revealed.has(tile)) return;

    revealed.add(tile);
    if (mines.has(tile)) {
      multiplier = 0;
      updateStats();
      finishRound('mine');
      return;
    }

    const preset = MINES_PRESETS[difficultyInput.value];
    const safeTileCount = tileCount - preset.mineCount;
    multiplier = Number((1 + (revealed.size / safeTileCount) * preset.safeMultiplierBonus).toFixed(4));
    if (tile === diamondTile) {
      diamondFound = true;
      multiplier = Number((multiplier * preset.diamondMultiplier).toFixed(4));
      message.textContent = `Diamond found. Your current multiplier is ${multiplier.toFixed(2)}×.`;
    } else {
      message.textContent = 'Safe tile. Continue or cash out.';
    }

    updateStats();
    renderBoard();
  }

  startButton.addEventListener('click', beginRound);
  decreaseStakeButton.addEventListener('click', () => {
    stakeInput.value = Math.max(1, (Number(stakeInput.value) || 1) - 1);
  });
  increaseStakeButton.addEventListener('click', () => {
    const balance = Number(document.querySelector('.balance-pill span')?.textContent.replaceAll(',', ''));
    stakeInput.value = Math.min(balance, (Number(stakeInput.value) || 0) + 1);
  });
  cashOutButton.addEventListener('click', () => {
    if (active) finishRound('cashout');
  });
  difficultyInput.addEventListener('change', () => {
    const preset = MINES_PRESETS[difficultyInput.value];
    message.textContent = `${preset.mineCount} mines hidden across 25 tiles.`;
  });
  board.addEventListener('click', (event) => {
    const tileButton = event.target.closest('[data-tile]');
    if (tileButton) revealTile(Number(tileButton.dataset.tile));
  });

  updateStats();
  renderBoard();
}

document.addEventListener('DOMContentLoaded', initializeMines);