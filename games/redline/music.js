(() => {

  /* =========================================================
     REDLINE MUSIC SYSTEM
     HTML AUDIO VERSION
  ========================================================= */

  const TRACKS = {

    lobby: {
      id: "slapbass",
      name: "I LUV SLAP BASS",
      file: "./assets/audio/iluvslapbass.mp3"
    },

    neon: {
      id: "fugent",
      name: "FUGENT — LUPUS NOCTE",
      file: "./assets/audio/fugent.mp3"
    },

    ice: {
      id: "ice-slowed",
      name: "ICE — SLOWED",
      file: "./assets/audio/ice-slowed.mp3"
    }

  };


  /* =========================================================
     SETTINGS
  ========================================================= */

  const DEFAULT_SETTINGS = {
    enabled: true,
    masterVolume: 1,
    lobbyVolume: 0.52,
    raceVolume: 0.40,
    resultsVolume: 0.34,
    fadeDuration: 1500
  };


  function clamp(
    value,
    min = 0,
    max = 1
  ) {

    const number =
      Number(value);

    return Math.max(
      min,
      Math.min(
        max,
        Number.isFinite(number)
          ? number
          : min
      )
    );

  }


  function loadSettings() {

    try {

      const saved =
        JSON.parse(
          localStorage.getItem(
            "redline_music_settings"
          )
        );

      let fade =
        Number(
          saved?.fadeDuration
          ??
          DEFAULT_SETTINGS.fadeDuration
        );


      /*
        If an older script saved 1.5 seconds,
        convert it back to milliseconds.
      */

      if (
        fade > 0 &&
        fade < 20
      ) {

        fade *= 1000;

      }


      return {

        ...DEFAULT_SETTINGS,
        ...(saved || {}),

        enabled:
          saved?.enabled
          ??
          DEFAULT_SETTINGS.enabled,

        masterVolume:
          clamp(
            saved?.masterVolume
            ??
            DEFAULT_SETTINGS.masterVolume
          ),

        lobbyVolume:
          clamp(
            saved?.lobbyVolume
            ??
            DEFAULT_SETTINGS.lobbyVolume
          ),

        raceVolume:
          clamp(
            saved?.raceVolume
            ??
            DEFAULT_SETTINGS.raceVolume
          ),

        resultsVolume:
          clamp(
            saved?.resultsVolume
            ??
            DEFAULT_SETTINGS.resultsVolume
          ),

        fadeDuration:
          Math.max(
            100,
            Math.min(
              10000,
              fade || 1500
            )
          )

      };

    }

    catch {

      return {
        ...DEFAULT_SETTINGS
      };

    }

  }


  let settings =
    loadSettings();


  function saveSettings() {

    try {

      localStorage.setItem(
        "redline_music_settings",
        JSON.stringify(
          settings
        )
      );

    }

    catch {}

  }


  /* =========================================================
     AUDIO PLAYERS
  ========================================================= */

  const lobbyAudio =
    new Audio(
      TRACKS.lobby.file
    );


  const neonAudio =
    new Audio(
      TRACKS.neon.file
    );


  lobbyAudio.loop =
    true;

  neonAudio.loop =
    true;


  lobbyAudio.preload =
    "auto";

  neonAudio.preload =
    "auto";


  lobbyAudio.volume =
    0;

  neonAudio.volume =
    0;


  /*
    Force both files to begin loading immediately.
  */

  lobbyAudio.load();

  neonAudio.load();


  const players = {
    lobby:
      lobbyAudio,

    neon:
      neonAudio
  };


  /* =========================================================
     STATE
  ========================================================= */

  let unlocked =
    false;

  let currentTrack =
    null;

  let currentMode =
    "lobby";

  let currentMap =
    "neon";

  let fadeFrame =
    null;

  let fadeGeneration =
    0;


  /* =========================================================
     HELPERS
  ========================================================= */

  function getRoom() {

    return (
      window.REDLINE_MP?.room
      ??
      null
    );

  }


  function normalizeRoom(
    detail
  ) {

    return (
      detail?.room
      ??
      detail?.state
      ??
      detail
      ??
      null
    );

  }


  function volumeForMode(
    mode
  ) {

    if (
      !settings.enabled
    ) {

      return 0;

    }


    let volume =
      settings.lobbyVolume;


    if (
      mode === "race"
    ) {

      volume =
        settings.raceVolume;

    }


    else if (
      mode === "results"
    ) {

      volume =
        settings.resultsVolume;

    }


    return clamp(
      volume *
      settings.masterVolume
    );

  }


  function getCurrentMap() {

    return (
      getRoom()?.map
      ??
      currentMap
      ??
      "neon"
    );

  }


  /* =========================================================
     ENSURE AUDIO IS ACTUALLY RUNNING
  ========================================================= */

  async function ensurePlaying(
    key
  ) {

    const audio =
      players[key];


    if (!audio) {

      return false;

    }


    if (
      !audio.paused
    ) {

      return true;

    }


    try {

      await audio.play();

      return true;

    }

    catch (
      error
    ) {

      console.warn(
        `REDLINE could not start ${key} music:`,
        error
      );

      return false;

    }

  }


  /* =========================================================
     CROSSFADE
  ========================================================= */

  function stopFade() {

    fadeGeneration++;


    if (
      fadeFrame !== null
    ) {

      cancelAnimationFrame(
        fadeFrame
      );

      fadeFrame =
        null;

    }

  }


  function crossfade(
    targetLobby,
    targetNeon,
    duration =
      settings.fadeDuration
  ) {

    stopFade();


    const generation =
      fadeGeneration;


    const startLobby =
      lobbyAudio.volume;


    const startNeon =
      neonAudio.volume;


    const startTime =
      performance.now();


    function frame(
      now
    ) {

      if (
        generation !==
        fadeGeneration
      ) {

        return;

      }


      const progress =
        clamp(
          (
            now -
            startTime
          )
          /
          Math.max(
            1,
            duration
          )
        );


      /*
        Smoothstep crossfade.
      */

      const smooth =
        progress *
        progress *
        (
          3 -
          2 *
          progress
        );


      lobbyAudio.volume =
        startLobby +
        (
          targetLobby -
          startLobby
        ) *
        smooth;


      neonAudio.volume =
        startNeon +
        (
          targetNeon -
          startNeon
        ) *
        smooth;


      if (
        progress < 1
      ) {

        fadeFrame =
          requestAnimationFrame(
            frame
          );

        return;

      }


      fadeFrame =
        null;


      lobbyAudio.volume =
        targetLobby;

      neonAudio.volume =
        targetNeon;

    }


    fadeFrame =
      requestAnimationFrame(
        frame
      );

  }


  /* =========================================================
     SWITCH TRACK
  ========================================================= */

  async function switchTo(
    key,
    mode
  ) {

    currentMode =
      mode;


    if (
      !unlocked
    ) {

      currentTrack =
        key;

      return;

    }


    if (
      !settings.enabled
    ) {

      crossfade(
        0,
        0
      );

      return;

    }


    /*
      No music assigned to map.
    */

    if (
      !key ||
      !players[key]
    ) {

      currentTrack =
        null;

      crossfade(
        0,
        0
      );

      return;

    }


    /*
      If we're entering Neon for a NEW race,
      start Fugent from 0:00.
    */

    if (
      key === "neon" &&
      currentTrack !== "neon"
    ) {

      try {

        neonAudio.currentTime =
          0;

      }

      catch {}

    }


    /*
      CRITICAL:
      Fugent MUST actually start before we fade
      Slap Bass away.
    */

    const started =
      await ensurePlaying(
        key
      );


    if (
      !started
    ) {

      console.warn(
        `REDLINE refused to fade because ${key} did not start.`
      );

      return;

    }


    currentTrack =
      key;


    const volume =
      volumeForMode(
        mode
      );


    crossfade(

      key === "lobby"
        ? volume
        : 0,

      key === "neon"
        ? volume
        : 0

    );

  }


  /* =========================================================
     DETERMINE MUSIC
  ========================================================= */

  function syncMusic(
    room =
      getRoom()
  ) {

    if (!room) {

      switchTo(
        "lobby",
        "lobby"
      );

      return;

    }


    currentMap =
      room.map
      ??
      currentMap;


    if (
      room.phase === "countdown"
      ||
      room.phase === "racing"
    ) {

      switchTo(

        currentMap === "neon"
          ? "neon"
          : null,

        "race"

      );

      return;

    }


    if (
      room.phase === "results"
      ||
      room.raceComplete
    ) {

      switchTo(

        currentMap === "neon"
          ? "neon"
          : null,

        "results"

      );

      return;

    }


    switchTo(
      "lobby",
      "lobby"
    );

  }


  /* =========================================================
     AUDIO UNLOCK

     Both actual MP3 players are started from the
     SAME user interaction and then kept alive.

     No decodeAudioData anywhere.
  ========================================================= */

  async function unlockMusic() {

    if (
      unlocked
    ) {

      syncMusic();

      return;

    }


    /*
      Keep them at volume 0 during unlock.
    */

    lobbyAudio.volume =
      0;

    neonAudio.volume =
      0;


    const results =
      await Promise.allSettled([
        lobbyAudio.play(),
        neonAudio.play()
      ]);


    const lobbyOK =
      results[0]?.status ===
      "fulfilled";


    const neonOK =
      results[1]?.status ===
      "fulfilled";


    console.log(
      "REDLINE music unlock:",
      {
        lobby:
          lobbyOK,

        neon:
          neonOK
      }
    );


    if (
      !lobbyOK &&
      !neonOK
    ) {

      console.warn(
        "REDLINE browser blocked both music tracks."
      );

      return;

    }


    unlocked =
      true;


    currentTrack =
      null;


    syncMusic();

  }


  /*
    Every normal click retries a failed track too.
  */

  async function interaction() {

    if (
      !unlocked
    ) {

      await unlockMusic();

      return;

    }


    /*
      Make sure BOTH players stay alive.
    */

    if (
      lobbyAudio.paused
    ) {

      ensurePlaying(
        "lobby"
      );

    }


    if (
      neonAudio.paused
    ) {

      ensurePlaying(
        "neon"
      );

    }

  }


  window.addEventListener(
    "pointerdown",
    interaction,
    {
      passive:
        true
    }
  );


  window.addEventListener(
    "touchstart",
    interaction,
    {
      passive:
        true
    }
  );


  window.addEventListener(
    "keydown",
    interaction
  );


  /* =========================================================
     MULTIPLAYER EVENTS
  ========================================================= */

  window.addEventListener(
    "redline:room-state",
    event => {

      const room =
        normalizeRoom(
          event.detail
        );


      if (
        room?.map
      ) {

        currentMap =
          room.map;

      }


      syncMusic(
        room
      );

    }
  );


  window.addEventListener(
    "redline:countdown",
    event => {

      const room =
        event.detail?.room
        ??
        getRoom();


      if (
        room?.map
      ) {

        currentMap =
          room.map;

      }


      switchTo(

        currentMap === "neon"
          ? "neon"
          : null,

        "race"

      );

    }
  );


  window.addEventListener(
    "redline:race-started",
    event => {

      const room =
        event.detail?.room
        ??
        getRoom();


      if (
        room?.map
      ) {

        currentMap =
          room.map;

      }


      /*
        Don't restart Fugent if countdown
        already switched to it.
      */

      if (
        currentTrack !== "neon"
      ) {

        switchTo(

          currentMap === "neon"
            ? "neon"
            : null,

          "race"

        );

      }

    }
  );


  window.addEventListener(
    "redline:race-complete",
    () => {

      switchTo(

        currentMap === "neon"
          ? "neon"
          : null,

        "results"

      );

    }
  );


  window.addEventListener(
    "redline:results-shown",
    event => {

      switchTo(

        currentMap === "neon"
          ? "neon"
          : null,

        event.detail?.waiting
          ? "race"
          : "results"

      );

    }
  );


  /* =========================================================
     SETTINGS API
  ========================================================= */

  window.REDLINE_MUSIC = {

    get tracks() {

      return TRACKS;

    },


    get currentTrack() {

      return (
        currentTrack
          ? TRACKS[currentTrack]
            ?? null
          : null
      );

    },


    get settings() {

      return {
        ...settings
      };

    },


    get debug() {

      return {

        unlocked,

        currentTrack,

        currentMode,

        currentMap,

        lobby: {

          src:
            lobbyAudio.currentSrc,

          paused:
            lobbyAudio.paused,

          readyState:
            lobbyAudio.readyState,

          volume:
            lobbyAudio.volume,

          currentTime:
            lobbyAudio.currentTime,

          error:
            lobbyAudio.error
              ? {
                  code:
                    lobbyAudio.error.code,

                  message:
                    lobbyAudio.error.message
                }
              : null

        },

        neon: {

          src:
            neonAudio.currentSrc,

          paused:
            neonAudio.paused,

          readyState:
            neonAudio.readyState,

          volume:
            neonAudio.volume,

          currentTime:
            neonAudio.currentTime,

          error:
            neonAudio.error
              ? {
                  code:
                    neonAudio.error.code,

                  message:
                    neonAudio.error.message
                }
              : null

        }

      };

    },


    start() {

      return unlockMusic();

    },


    sync() {

      syncMusic();

    },


    setNormal() {

      switchTo(
        "lobby",
        "lobby"
      );

    },


    setRace() {

      switchTo(

        getCurrentMap() === "neon"
          ? "neon"
          : null,

        "race"

      );

    },


    setEnabled(
      enabled
    ) {

      settings.enabled =
        Boolean(
          enabled
        );


      saveSettings();


      if (
        settings.enabled
      ) {

        syncMusic();

      }

      else {

        crossfade(
          0,
          0
        );

      }

    },


    setMasterVolume(
      value
    ) {

      settings.masterVolume =
        clamp(
          value
        );


      saveSettings();


      syncMusic();

    },


    setLobbyVolume(
      value
    ) {

      settings.lobbyVolume =
        clamp(
          value
        );


      saveSettings();


      if (
        currentMode ===
        "lobby"
      ) {

        syncMusic();

      }

    },


    setRaceVolume(
      value
    ) {

      settings.raceVolume =
        clamp(
          value
        );


      saveSettings();


      if (
        currentMode ===
        "race"
      ) {

        syncMusic();

      }

    },


    setResultsVolume(
      value
    ) {

      settings.resultsVolume =
        clamp(
          value
        );


      saveSettings();


      if (
        currentMode ===
        "results"
      ) {

        syncMusic();

      }

    },


    setFadeDuration(
      milliseconds
    ) {

      settings.fadeDuration =
        Math.max(
          100,
          Math.min(
            10000,
            Number(
              milliseconds
            )
            ||
            1500
          )
        );


      saveSettings();

    }

  };

})();
