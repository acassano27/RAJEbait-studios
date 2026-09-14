const RAJEGameSystem = (() => {
  const STORAGE_KEY = "RAJEbaitStudiosRAJESWallet";

  function getDefaultState() {
    return {
      bankroll: 500,
      currencyName: "RAJES",
      games: {
        blackjack: {
          name: "blackjack",
          cash: 500,
          createdAt: new Date().toISOString(),
          history: []
        }
      },
      lastUpdated: new Date().toISOString()
    };
  }

  function cloneDefaultState() {
    return JSON.parse(JSON.stringify(getDefaultState()));
  }

  function ensureGame(gameName) {
    if (!state.games[gameName]) {
      state.games[gameName] = {
        name: gameName,
        cash: 0,
        createdAt: new Date().toISOString(),
        history: []
      };
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return cloneDefaultState();
      }

      const parsed = JSON.parse(raw);
      const defaultState = cloneDefaultState();
      const merged = {
        ...defaultState,
        ...parsed,
        bankroll: Number(parsed.bankroll) || defaultState.bankroll,
        games: {
          ...defaultState.games,
          ...(parsed.games || {})
        }
      };

      for (const gameName of Object.keys(merged.games)) {
        merged.games[gameName] = {
          ...defaultState.games.blackjack,
          ...merged.games[gameName],
          history: Array.isArray(merged.games[gameName].history) ? merged.games[gameName].history : []
        };
      }

      return merged;
    } catch (error) {
      console.warn("Unable to load RAJEGameSystem state.", error);
      return cloneDefaultState();
    }
  }

  let state = loadState();

  function saveState() {
    state.lastUpdated = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getBankroll() {
    return Number(state.bankroll) || 0;
  }

  function setBankroll(amount) {
    state.bankroll = Math.max(0, Number(amount) || 0);
    state.currencyName = "RAJES";
    saveState();
  }

  function addBankroll(amount) {
    state.bankroll = Math.max(0, getBankroll() + Number(amount));
    state.currencyName = "RAJES";
    saveState();
  }

  function getGame(gameName) {
    ensureGame(gameName);
    saveState();
    return state.games[gameName];
  }

  function getGameCash(gameName) {
    ensureGame(gameName);
    return Number(state.games[gameName].cash) || 0;
  }

  function setGameCash(gameName, amount) {
    ensureGame(gameName);
    state.games[gameName].cash = Math.max(0, Number(amount) || 0);
    saveState();
  }

  function addGameCash(gameName, amount) {
    ensureGame(gameName);
    state.games[gameName].cash = Math.max(0, getGameCash(gameName) + Number(amount));
    saveState();
  }

  function transferCash(amount, fromGame = "shared", toGame = "blackjack") {
    const safeAmount = Math.max(0, Number(amount) || 0);

    if (safeAmount <= 0) {
      return { ok: false, reason: "zeroAmount" };
    }

    const sourceIsShared = fromGame === "shared";
    const targetIsShared = toGame === "shared";

    if (sourceIsShared && targetIsShared) {
      return { ok: false, reason: "invalidTransfer" };
    }

    if (sourceIsShared && !targetIsShared) {
      if (getBankroll() < safeAmount) {
        return { ok: false, reason: "notEnoughCash", bankroll: getBankroll() };
      }

      ensureGame(toGame);
      state.bankroll -= safeAmount;
      state.games[toGame].cash += safeAmount;
      state.games[toGame].history.push({
        type: "transfer",
        fromGame: "shared",
        toGame,
        amount: safeAmount,
        date: new Date().toISOString()
      });
      saveState();
      return { ok: true, bankroll: getBankroll(), gameCash: getGameCash(toGame) };
    }

    if (!sourceIsShared && targetIsShared) {
      ensureGame(fromGame);
      if (getGameCash(fromGame) < safeAmount) {
        return { ok: false, reason: "notEnoughGameCash", gameCash: getGameCash(fromGame) };
      }

      state.games[fromGame].cash -= safeAmount;
      state.bankroll += safeAmount;
      state.games[fromGame].history.push({
        type: "transfer",
        fromGame,
        toGame: "shared",
        amount: safeAmount,
        date: new Date().toISOString()
      });
      saveState();
      return { ok: true, bankroll: getBankroll(), gameCash: getGameCash(fromGame) };
    }

    ensureGame(fromGame);
    ensureGame(toGame);
    if (getGameCash(fromGame) < safeAmount) {
      return { ok: false, reason: "notEnoughGameCash", gameCash: getGameCash(fromGame) };
    }

    state.games[fromGame].cash -= safeAmount;
    state.games[toGame].cash += safeAmount;
    state.games[fromGame].history.push({
      type: "transfer",
      fromGame,
      toGame,
      amount: safeAmount,
      date: new Date().toISOString()
    });
    state.games[toGame].history.push({
      type: "transfer",
      fromGame,
      toGame,
      amount: safeAmount,
      date: new Date().toISOString()
    });
    saveState();

    return { ok: true, bankroll: getBankroll(), gameCash: getGameCash(toGame) };
  }

  function getState() {
    return state;
  }

  function clearAll() {
    state = cloneDefaultState();
    localStorage.removeItem(STORAGE_KEY);
    saveState();
  }

  return {
    loadState,
    saveState,
    getBankroll,
    setBankroll,
    addBankroll,
    getGame,
    getGameCash,
    setGameCash,
    addGameCash,
    transferCash,
    getState,
    clearAll
  };
})();
