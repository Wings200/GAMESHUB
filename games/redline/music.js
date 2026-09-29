(() => {
  const MUSIC_SRC = "./assets/audio/iluvslapbass.mp3";

  const NORMAL_VOLUME = 0.52;
  const RACE_VOLUME = 0.15;
  const COUNTDOWN_VOLUME = 0.20;
  const FADE_MS = 700;

  const music = new Audio(MUSIC_SRC);

  music.loop = true;
  music.preload = "auto";
  music.volume = 0;

  let started = false;
  let targetVolume = NORMAL_VOLUME;
  let fadeFrame = null;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function fadeTo(volume, duration = FADE_MS) {
    targetVolume = clamp(volume, 0, 1);

    if (!started) {
      return;
    }

    if (fadeFrame) {
      cancelAnimationFrame(fadeFrame);
      fadeFrame = null;
    }

    const from = music.volume;
    const startedAt = performance.now();

    function step(now) {
      const t = clamp(
        (now - startedAt) / duration,
        0,
        1
      );

      const eased =
        1 - Math.pow(1 - t, 3);

      music.volume =
        from +
        (targetVolume - from) *
        eased;

      if (t < 1) {
        fadeFrame =
          requestAnimationFrame(step);
      } else {
        fadeFrame = null;
      }
    }

    fadeFrame =
      requestAnimationFrame(step);
  }

  async function ensureStarted() {
    if (started) {
      return true;
    }

    try {
      await music.play();

      started = true;

      fadeTo(
        targetVolume,
        900
      );

      return true;
    } catch {
      return false;
    }
  }

  function getPhase(detail) {
    const room =
      detail?.room ??
      detail?.state ??
      detail;

    return (
      room?.phase ??
      window.REDLINE_MP?.room?.phase ??
      null
    );
  }

  function syncToPhase(detail) {
    const phase =
      getPhase(detail);

    if (phase === "racing") {
      fadeTo(RACE_VOLUME);
    }

    else if (phase === "countdown") {
      fadeTo(COUNTDOWN_VOLUME);
    }

    else {
      fadeTo(NORMAL_VOLUME);
    }
  }

  const unlock = () => {
    ensureStarted();
  };

  window.addEventListener(
    "pointerdown",
    unlock,
    { passive: true }
  );

  window.addEventListener(
    "keydown",
    unlock
  );

  window.addEventListener(
    "touchstart",
    unlock,
    { passive: true }
  );

  window.addEventListener(
    "redline:room-state",
    event => {
      syncToPhase(event.detail);
    }
  );

  window.addEventListener(
    "redline:countdown",
    () => {
      targetVolume =
        COUNTDOWN_VOLUME;

      ensureStarted();
      fadeTo(COUNTDOWN_VOLUME);
    }
  );

  window.addEventListener(
    "redline:race-started",
    () => {
      targetVolume =
        RACE_VOLUME;

      ensureStarted();
      fadeTo(RACE_VOLUME);
    }
  );

  window.addEventListener(
    "redline:results-shown",
    () => {
      targetVolume =
        NORMAL_VOLUME;

      fadeTo(NORMAL_VOLUME);
    }
  );

  window.addEventListener(
    "redline:disconnected",
    () => {
      targetVolume =
        NORMAL_VOLUME;

      fadeTo(NORMAL_VOLUME);
    }
  );

  window.REDLINE_MUSIC = {
    element: music,

    start: ensureStarted,

    setNormal() {
      fadeTo(NORMAL_VOLUME);
    },

    setRace() {
      fadeTo(RACE_VOLUME);
    }
  };
})();
