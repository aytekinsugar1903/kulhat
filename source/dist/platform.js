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
  // Language rule: Turkish for tr*, English for everything else.
  const toLang = (tag) => (/^tr\b/i.test(String(tag || "")) ? "tr" : "en");
  function setLang(tag) {
    platform.lang = toLang(tag);
    document.documentElement.lang = platform.lang;
    const note = document.querySelector("#loading small");
    if (note && platform.lang === "en") note.textContent = "The city is waking up…";
  }
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
    let saved = null;
    try { saved = localStorage.getItem("kulhat-lang"); } catch {}
    setLang(saved || /*BROWSER-LANG*/ (navigator.language || "tr") /*END*/);
    startGame();
    return;
  }
  // The loading screen (#loading) is already on screen.
  try { yt.game.firstFrameReady(); } catch {}
  // YouTube decides the language; never the browser locale inside Playables.
  const language = Promise.race([
    Promise.resolve().then(() => yt.system.getLanguage()),
    new Promise((r) => setTimeout(() => r("en"), 1500)),
  ])
    .catch(() => "en")
    .then(setLang);
  let booted = false;
  function boot() {
    if (booted) return;
    booted = true;
    startGame();
  }
  // A hung loadData used to leave the loading screen up forever.
  const loadTimer = setTimeout(() => {
    try { yt.health.logWarning(); } catch {}
    boot();
  }, 4000);
  language
    .then(() => yt.game.loadData())
    .then((data) => {
      // Ignore a late cloud payload once the player is already in the game,
      // so it cannot wipe a run that started after the timeout.
      if (booted) return;
      if (typeof data === "string" && data) memory.set(SAVE_KEY, data);
      loaded = true; // saving is only allowed after a successful loadData
      flush();
    })
    .catch(() => {
      try { yt.health.logWarning(); } catch {}
      // The cloud save failed; keep this session in memory and allow later saves.
      loaded = true;
    })
    .finally(() => {
      clearTimeout(loadTimer);
      boot();
    });
})();
