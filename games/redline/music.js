(() => {

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


  const DEFAULT_SETTINGS = {
    enabled: true,
    masterVolume: 1.0,
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
          : 0
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

        fadeDuration:
          Math.max(
            0,
            Number(
              saved?.fadeDuration
              ??
              DEFAULT_SETTINGS.fadeDuration
            )
            ||
            DEFAULT_SETTINGS.fadeDuration
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


  const players = {

    lobby:
      lobbyAudio,

    neon:
      neonAudio

  };


  for (
    const audio
    of Object.values(
      players
    )
  ) {

    audio.loop =
      true;

    audio.preload =
      "auto";

    audio.volume =
      0;

    audio.muted =
      true;

    audio.load();

  }


  const running = {

    lobby:
      false,

    neon:
      false

  };


  /* =========================================================
     STATE
  ========================================================= */

  let unlocked =
    false;


  let currentTrackKey =
    null;


  let currentMode =
    "lobby";


  let currentMap =
    "neon";


  let fadeFrame =
    null;


  let fadeGeneration =
    0;


  let switchGeneration =
    0;


  /* =========================================================
     ROOM
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
     MUSIC CHOICE
  ========================================================= */

  function determineMusic(
    room = getRoom()
  ) {

    if (
      !room
    ) {

      return {
        key:
          "lobby",

        mode:
          "lobby"
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
          currentMap ===
          "neon"
            ?
            "neon"
            :
            null,

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
          currentMap ===
          "neon"
            ?
            "neon"
            :
            null,

        mode:
          "results"

      };

    }


    return {

      key:
        "lobby",

      mode:
        "lobby"

    };

  }


  /* =========================================================
     MAKE SURE A SONG IS ACTUALLY PLAYING
  ========================================================= */

  async function ensureRunning(
    key,
    quiet = false
  ) {

    const audio =
      players[
        key
      ];


    if (
      !audio
    ) {

      return false;

    }


    if (
      !audio.paused
      &&
      !audio.ended
    ) {

      running[
        key
      ] =
        true;


      return true;

    }


    try {

      await audio.play();


      running[
        key
      ] =
        true;


      return true;

    }

    catch (
      error
    ) {

      running[
        key
      ] =
        false;


      if (
        !quiet
      ) {

        console.warn(
          `REDLINE could not start ${key} music:`,
          error
        );

      }


      return false;

    }

  }


  /* =========================================================
     MUTED PRELOAD

     Browsers usually allow muted playback before interaction.
  ========================================================= */

  async function primeMutedPlayers() {

    lobbyAudio.muted =
      true;


    neonAudio.muted =
      true;


    await Promise.allSettled([
      ensureRunning(
        "lobby",
        true
      ),

      ensureRunning(
        "neon",
        true
      )
    ]);


    if (
      unlocked
    ) {

      lobbyAudio.muted =
        false;


      neonAudio.muted =
        false;

    }

  }


  /* =========================================================
     CROSSFADE
  ========================================================= */

  function stopFade() {

    fadeGeneration++;


    if (
      fadeFrame !==
      null
    ) {

      cancelAnimationFrame(
        fadeFrame
      );


      fadeFrame =
        null;

    }

  }


  function crossfadeVolumes(
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


    const startedAt =
      performance.now();


    const safeDuration =
      Math.max(
        1,
        duration
      );


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
            startedAt
          )
          /
          safeDuration
        );


      const smooth =
        progress *
        progress *
        (
          3 -
          2 *
          progress
        );


      lobbyAudio.volume =
        startLobby
        +
        (
          targetLobby -
          startLobby
        )
        *
        smooth;


      neonAudio.volume =
        startNeon
        +
        (
          targetNeon -
          startNeon
        )
        *
        smooth;


      if (
        progress <
        1
      ) {

        fadeFrame =
          requestAnimationFrame(
            frame
          );

      }

      else {

        fadeFrame =
          null;


        lobbyAudio.volume =
          targetLobby;


        neonAudio.volume =
          targetNeon;

      }

    }


    fadeFrame =
      requestAnimationFrame(
        frame
      );

  }


  /* =========================================================
     SWITCH SONGS
  ========================================================= */

  async function switchMusic(
    key,
    mode,
    force = false
  ) {

    const requestId =
      ++switchGeneration;


    currentMode =
      mode;


    if (
      !unlocked
    ) {

      currentTrackKey =
        key;


      return;

    }


    if (
      !settings.enabled
      ||
      !key
      ||
      !players[
        key
      ]
    ) {

      currentTrackKey =
        key;


      crossfadeVolumes(
        0,
        0
      );


      return;

    }


    const sameTrack =
      key ===
      currentTrackKey;


    /*
      New Neon race:
      restart Fugent from the beginning.
    */

    if (
      !sameTrack
      &&
      key ===
      "neon"
    ) {

      try {

        neonAudio.currentTime =
          0;

      }

      catch {}

    }


    /*
      CRITICAL FIX:

      Don't fade Slap Bass away unless Fugent
      has ACTUALLY started playing.
    */

    const targetStarted =
      await ensureRunning(
        key
      );


    if (
      requestId !==
      switchGeneration
    ) {

      return;

    }


    if (
      !targetStarted
    ) {

      console.warn(
        `REDLINE kept current music because ${key} could not start.`
      );


      return;

    }


    lobbyAudio.muted =
      false;


    neonAudio.muted =
      false;


    currentTrackKey =
      key;


    const target =
      volumeForMode(
        mode
      );


    const targetLobby =
      key ===
      "lobby"
        ?
        target
        :
        0;


    const targetNeon =
      key ===
      "neon"
        ?
        target
        :
        0;


    if (
      force
      ||
      !sameTrack
      ||
      Math.abs(
        lobbyAudio.volume -
        targetLobby
      ) >
      0.001
      ||
      Math.abs(
        neonAudio.volume -
        targetNeon
      ) >
      0.001
    ) {

      crossfadeVolumes(
        targetLobby,
        targetNeon
      );

    }

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


    switchMusic(
      choice.key,
      choice.mode
    );

  }


  /* =========================================================
     FIRST USER INTERACTION
  ========================================================= */

  async function unlockMusic() {

    unlocked =
      true;


    /*
      Both calls happen immediately from the
      user's click/key press.
    */

    const lobbyPromise =
      ensureRunning(
        "lobby",
        true
      );


    const neonPromise =
      ensureRunning(
        "neon",
        true
      );


    const [
      lobbyStarted,
      neonStarted
    ] =
      await Promise.all([
        lobbyPromise,
        neonPromise
      ]);


    lobbyAudio.muted =
      false;


    neonAudio.muted =
      false;


    if (
      !lobbyStarted
    ) {

      console.warn(
        "REDLINE lobby music did not unlock."
      );

    }


    if (
      !neonStarted
    ) {

      console.warn(
        "REDLINE Fugent did not unlock yet. It will retry."
      );

    }


    currentTrackKey =
      null;


    syncMusic();

  }


  /*
    Keep retrying Fugent on later clicks.

    You'll click CREATE ROOM, START RACE,
    LOCK IN, etc., so Fugent gets multiple
    chances to successfully start before race.
  */

  function retryMusicOnInteraction() {

    if (
      !unlocked
    ) {

      unlockMusic();


      return;

    }


    if (
      !running.lobby
      ||
      lobbyAudio.paused
    ) {

      ensureRunning(
        "lobby",
        true
      );

    }


    if (
      !running.neon
      ||
      neonAudio.paused
    ) {

      ensureRunning(
        "neon",
        true
      );

    }

  }


  window.addEventListener(
    "pointerdown",
    retryMusicOnInteraction,
    {
      passive:
        true
    }
  );


  window.addEventListener(
    "touchstart",
    retryMusicOnInteraction,
    {
      passive:
        true
    }
  );


  window.addEventListener(
    "keydown",
    retryMusicOnInteraction
  );


  /*
    Try both tracks silently as soon as the page loads.
  */

  primeMutedPlayers();


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


      switchMusic(

        currentMap ===
        "neon"
          ?
          "neon"
          :
          null,

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


      switchMusic(

        currentMap ===
        "neon"
          ?
          "neon"
          :
          null,

        "race"

      );

    }
  );


  window.addEventListener(
    "redline:race-complete",
    () => {

      switchMusic(

        currentMap ===
        "neon"
          ?
          "neon"
          :
          null,

        "results"

      );

    }
  );


  window.addEventListener(
    "redline:results-shown",
    event => {

      switchMusic(

        currentMap ===
        "neon"
          ?
          "neon"
          :
          null,

        event.detail?.waiting
          ?
          "race"
          :
          "results"

      );

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

      return (
        currentTrackKey
          ?
          TRACKS[
            currentTrackKey
          ]
          ??
          null
          :
          null
      );

    },


    get settings() {

      return {
        ...settings
      };

    },


    /*
      Helpful if something breaks again.

      Typing this in DevTools:

      REDLINE_MUSIC.debug

      will show whether Fugent is paused.
    */

    get debug() {

      return {

        unlocked,

        currentTrackKey,

        currentMode,

        currentMap,

        lobby: {

          paused:
            lobbyAudio.paused,

          muted:
            lobbyAudio.muted,

          volume:
            lobbyAudio.volume,

          currentTime:
            lobbyAudio.currentTime,

          readyState:
            lobbyAudio.readyState,

          running:
            running.lobby

        },

        neon: {

          paused:
            neonAudio.paused,

          muted:
            neonAudio.muted,

          volume:
            neonAudio.volume,

          currentTime:
            neonAudio.currentTime,

          readyState:
            neonAudio.readyState,

          running:
            running.neon

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

      switchMusic(
        "lobby",
        "lobby"
      );

    },


    setRace() {

      switchMusic(

        getCurrentMap() ===
        "neon"
          ?
          "neon"
          :
          null,

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

        crossfadeVolumes(
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


      switchMusic(
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
        currentMode ===
        "lobby"
      ) {

        switchMusic(
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
        currentMode ===
        "race"
      ) {

        switchMusic(
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
        currentMode ===
        "results"
      ) {

        switchMusic(
          currentTrackKey,
          currentMode,
          true
        );

      }

    }

  };

})();
