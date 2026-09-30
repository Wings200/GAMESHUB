(() => {

  /* =========================================================
     REDLINE MUSIC SYSTEM V4
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

    masterVolume: 1.0,

    lobbyVolume: 0.52,

    raceVolume: 0.40,

    resultsVolume: 0.34,

    /*
      1.5 second crossfade so it's actually noticeable.
    */

    fadeDuration: 1500

  };


  function clamp(
    value,
    min = 0,
    max = 1
  ) {

    const number =
      Number(value);


    if (
      !Number.isFinite(number)
    ) {

      return min;

    }


    return Math.max(
      min,
      Math.min(
        max,
        number
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

        /*
          Force the new proper fade time for now.
          Later the Settings menu can control this.
        */

        fadeDuration: 1500

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


  const audioPlayers = {

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


  let currentTrackKey =
    null;


  let desiredTrackKey =
    "lobby";


  let currentMode =
    "lobby";


  let currentMap =
    "neon";


  let fadeFrame =
    null;


  let fadeGeneration =
    0;


  /* =========================================================
     ROOM HELPERS
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
     VOLUME
  ========================================================= */

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
      mode ===
      "race"
    ) {

      volume =
        settings.raceVolume;

    }


    else if (
      mode ===
      "results"
    ) {

      volume =
        settings.resultsVolume;

    }


    return clamp(
      volume *
      settings.masterVolume
    );

  }


  /* =========================================================
     DETERMINE WHAT SHOULD PLAY
  ========================================================= */

  function determineMusic(
    room = getRoom()
  ) {

    if (
      !room
    ) {

      return {
        key: "lobby",
        mode: "lobby"
      };

    }


    currentMap =
      room.map
      ??
      currentMap;


    if (
      room.phase ===
      "countdown"
      ||
      room.phase ===
      "racing"
    ) {

      return {

        key:
          currentMap === "neon"
            ? "neon"
            : null,

        mode:
          "race"

      };

    }


    if (
      room.phase ===
      "results"
      ||
      room.raceComplete
    ) {

      return {

        key:
          currentMap === "neon"
            ? "neon"
            : null,

        mode:
          "results"

      };

    }


    return {
      key: "lobby",
      mode: "lobby"
    };

  }


  /* =========================================================
     CROSSFADE
  ========================================================= */

  function stopCurrentFade() {

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


  function crossfadeTo(
    key,
    mode,
    force = false
  ) {

    desiredTrackKey =
      key;


    /*
      Duplicate events are common:

      room_state(countdown)
      countdown
      race_started

      If they're all asking for Fugent,
      DON'T restart the fade every time.
    */

    if (
      !force
      &&
      key === currentTrackKey
      &&
      mode === currentMode
    ) {

      return;

    }


    const previousKey =
      currentTrackKey;


    currentMode =
      mode;


    /*
      When Neon starts, start Fugent from 0:00.
    */

    if (
      key === "neon"
      &&
      previousKey !== "neon"
    ) {

      try {

        neonAudio.currentTime =
          0;

      }

      catch {}

    }


    currentTrackKey =
      key;


    if (
      !unlocked
    ) {

      return;

    }


    stopCurrentFade();


    const generation =
      fadeGeneration;


    const startLobbyVolume =
      lobbyAudio.volume;


    const startNeonVolume =
      neonAudio.volume;


    const targetVolume =
      volumeForMode(
        mode
      );


    const targetLobby =
      key === "lobby"
        ? targetVolume
        : 0;


    const targetNeon =
      key === "neon"
        ? targetVolume
        : 0;


    const startedAt =
      performance.now();


    const duration =
      Math.max(
        1,
        settings.fadeDuration
      );


    function animate(
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
            startedAt
          )
          /
          duration
        );


      /*
        Smoothstep.

        Gives a much nicer music crossfade than
        a straight linear fade.
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
        startLobbyVolume
        +
        (
          targetLobby -
          startLobbyVolume
        )
        *
        smooth;


      neonAudio.volume =
        startNeonVolume
        +
        (
          targetNeon -
          startNeonVolume
        )
        *
        smooth;


      if (
        progress <
        1
      ) {

        fadeFrame =
          requestAnimationFrame(
            animate
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
        animate
      );

  }


  /* =========================================================
     SYNC
  ========================================================= */

  function syncMusic(
    room = getRoom()
  ) {

    const choice =
      determineMusic(
        room
      );


    crossfadeTo(
      choice.key,
      choice.mode
    );

  }


  /* =========================================================
     AUTOPLAY UNLOCK

     Both songs start on the first user interaction.

     They KEEP PLAYING afterward.
     The inactive song just sits at volume 0.

     That means switching songs later cannot be blocked
     by browser autoplay rules.
  ========================================================= */

  async function unlockMusic() {

    if (
      unlocked
    ) {

      syncMusic();

      return;

    }


    /*
      Start both simultaneously from the user's click.
    */

    lobbyAudio.muted =
      true;


    neonAudio.muted =
      true;


    const results =
      await Promise.allSettled([
        lobbyAudio.play(),
        neonAudio.play()
      ]);


    const lobbyStarted =
      results[0]?.status ===
      "fulfilled";


    const neonStarted =
      results[1]?.status ===
      "fulfilled";


    lobbyAudio.muted =
      false;


    neonAudio.muted =
      false;


    lobbyAudio.volume =
      0;


    neonAudio.volume =
      0;


    if (
      !lobbyStarted
      &&
      !neonStarted
    ) {

      console.warn(
        "REDLINE: browser blocked music playback."
      );


      return;

    }


    unlocked =
      true;


    /*
      Keep both playing silently.

      Lobby keeps progressing while racing.

      Fugent will be reset to 0:00 when a Neon race starts.
    */


    currentTrackKey =
      null;


    const choice =
      determineMusic();


    crossfadeTo(
      choice.key,
      choice.mode,
      true
    );

  }


  window.addEventListener(
    "pointerdown",
    unlockMusic,
    {
      passive: true
    }
  );


  window.addEventListener(
    "touchstart",
    unlockMusic,
    {
      passive: true
    }
  );


  window.addEventListener(
    "keydown",
    unlockMusic
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


      /*
        This is the actual transition from
        lobby music -> race music.
      */

      crossfadeTo(
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
        Usually ignored because countdown already
        started Fugent.

        This is just a safety fallback.
      */

      if (
        currentTrackKey !== "neon"
      ) {

        crossfadeTo(
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

      /*
        Don't switch songs.

        Fugent keeps playing on results.
        We only change its volume.
      */

      crossfadeTo(
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

      if (
        event.detail?.waiting
      ) {

        crossfadeTo(
          currentMap === "neon"
            ? "neon"
            : null,

          "race"
        );

      }

      else {

        crossfadeTo(
          currentMap === "neon"
            ? "neon"
            : null,

          "results"
        );

      }

    }
  );


  /* =========================================================
     SETTINGS API
  ========================================================= */

  window.REDLINE_MUSIC = {

    get tracks() {

      return {
        ...TRACKS
      };

    },


    get currentTrack() {

      if (
        !currentTrackKey
      ) {

        return null;

      }


      return (
        TRACKS[
          currentTrackKey
        ]
        ??
        null
      );

    },


    get settings() {

      return {
        ...settings
      };

    },


    start() {

      return unlockMusic();

    },


    sync() {

      syncMusic();

    },


    setNormal() {

      crossfadeTo(
        "lobby",
        "lobby"
      );

    },


    setRace() {

      crossfadeTo(
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
        !settings.enabled
      ) {

        crossfadeTo(
          null,
          currentMode,
          true
        );

      }

      else {

        syncMusic();

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


      crossfadeTo(
        currentTrackKey,
        currentMode,
        true
      );

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
        currentMode === "lobby"
      ) {

        crossfadeTo(
          currentTrackKey,
          currentMode,
          true
        );

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
        currentMode === "race"
      ) {

        crossfadeTo(
          currentTrackKey,
          currentMode,
          true
        );

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
        currentMode === "results"
      ) {

        crossfadeTo(
          currentTrackKey,
          currentMode,
          true
        );

      }

    }

  };

})();
