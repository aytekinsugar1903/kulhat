// KÜLHAT platform layer: YouTube Playables SDK when present, browser storage otherwise.
// Loaded as a classic script after the (optional) Playables SDK and before the game bundle.
(() => {
  "use strict";
  const SAVE_KEY = "kulhat-save-v2";
  const yt =
    typeof ytgame !== "undefined" && ytgame && ytgame.IN_PLAYABLES_ENV
      ? ytgame
      : null;
  const memory = new Map();
  let loaded = !yt, // outside YouTube there is nothing to await
    readyCalled = false,
    pending = null,
    saving = false;
  function flush() {
    if (!yt || !loaded || pending === null || saving) return;
    const data = pending;
    pending = null;
    saving = true;
    Promise.resolve()
      .then(() => yt.game.saveData(data))
      .catch(() => {
        try { yt.health.logWarning(); } catch {}
      })
      .finally(() => {
        saving = false;
        flush();
      });
  }
  const storage = yt
    ? {
        // Cloud save only: Playables must not use any other persistence.
        getItem: (key) => (memory.has(key) ? memory.get(key) : null),
        setItem: (key, value) => {
          value = String(value);
          if (typeof value.isWellFormed === "function" && !value.isWellFormed())
            throw Error("save not well-formed");
          if (value.length * 2 >= 3 * 1024 * 1024) throw Error("save too large");
          memory.set(key, value);
          if (key === SAVE_KEY) {
            pending = value;
            flush();
          }
        },
      }
    : {
        getItem: (key) => localStorage.getItem(key),
        setItem: (key, value) => localStorage.setItem(key, value),
      };
  const platform = {
    inPlayables: !!yt,
    storage,
    gameReady() {
      if (!yt || readyCalled) return;
      readyCalled = true;
      try { yt.game.gameReady(); } catch {}
    },
    isAudioEnabled() {
      try { return yt ? yt.system.isAudioEnabled() !== false : true; } catch { return true; }
    },
    onAudioEnabledChange(cb) {
      if (yt) try { yt.system.onAudioEnabledChange(cb); } catch {}
    },
    onPause(cb) {
      if (yt) try { yt.system.onPause(cb); } catch {}
    },
    onResume(cb) {
      if (yt) try { yt.system.onResume(cb); } catch {}
    },
    sendScore(value) {
      if (!yt || !Number.isSafeInteger(value) || value < 0) return;
      Promise.resolve()
        .then(() => yt.engagement.sendScore({ value }))
        .catch(() => {});
    },
    logError() {
      if (yt) try { yt.health.logError(); } catch {}
    },
  };
  window.KULHAT_PLATFORM = platform;
  function startGame() {
    const s = document.createElement("script");
    s.src = "./js/kulhat.bundle.js";
    s.onerror = () => {
      platform.logError();
      const el = document.querySelector("#loading");
      if (el) el.textContent = "Oyun yüklenemedi. Sayfayı yenile.";
    };
    document.body.append(s);
  }
  if (!yt) {
    startGame();
    return;
  }
  // The loading screen (#loading) is already on screen.
  try { yt.game.firstFrameReady(); } catch {}
  Promise.resolve()
    .then(() => yt.game.loadData())
    .then((data) => {
      if (typeof data === "string" && data) memory.set(SAVE_KEY, data);
      loaded = true; // saving is only allowed after a successful loadData
      flush();
    })
    .catch(() => {
      try { yt.health.logWarning(); } catch {}
    })
    .finally(startGame);
})();
