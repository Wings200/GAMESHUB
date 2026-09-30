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
    masterVolume: 1,
    lobbyVolume: 0.52,
    raceVolume: 0.38,
    resultsVolume: 0.32,
    fadeDuration: 700
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
          saved?.enabled ??
          DEFAULT_SETTINGS.enabled,

        masterVolume:
          clamp(
            saved?.masterVolume ??
            DEFAULT_SETTINGS.masterVolume
          ),

        lobbyVolume:
          clamp(
            saved?.lobbyVolume ??
            DEFAULT_SETTINGS.lobbyVolume
          ),

        raceVolume:
          clamp(
            saved?.raceVolume ??
            DEFAULT_SETTINGS.raceVolume
          ),

        resultsVolume:
          clamp(
            saved?.resultsVolume ??
            DEFAULT_SETTINGS.resultsVolume
          ),

        fadeDuration:
          Math.max(
            0,
            Number(
              saved?.fadeDuration ??
              DEFAULT_SETTINGS.fadeDuration
            ) ||
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


  const audioByKey = {
    lobby:
      lobbyAudio,

    neon:
      neonAudio
  };


  for (
    const audio
    of Object.values(
      audioByKey
    )
  ) {
    audio.loop =
      true;

    audio.preload =
      "auto";

    audio.volume =
      0;
  }


  let unlocked =
    false;


  let currentKey =
    null;


  let currentMode =
    "lobby";


  let currentMap =
    "neon";


  let fadeToken =
    0;


  let fadeFrame =
    null;


  /* =========================================================
     ROOM / MUSIC STATE
  ========================================================= */

  function getRoom() {
    return (
      window.REDLINE_MP
        ?.room
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
      mode ===
      "race"
    ) {
      volume =
        settings.raceVolume;
    }


    if (
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


  function musicChoice(
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
      currentMap
      ??
      "neon";


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
          currentMap ===
          "neon"
            ? "neon"
            : null,

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
     FADE SYSTEM
  ========================================================= */

  function cancelFade() {
    fadeToken++;


    if (
      fadeFrame
    ) {
      cancelAnimationFrame(
        fadeFrame
      );


      fadeFrame =
        null;
    }
  }


  function fadeVolumes(
    targets,
    duration =
      settings.fadeDuration,
    onDone =
      null
  ) {
    cancelFade();


    const token =
      fadeToken;


    const startedAt =
      performance.now();


    const from =
      new Map();


    for (
      const [
        key,
        audio
      ]
      of Object.entries(
        audioByKey
      )
    ) {
      from.set(
        key,
        audio.volume
      );
    }


    function frame(
      now
    ) {
      if (
        token !==
        fadeToken
      ) {
        return;
      }


      const progress =
        duration <=
        0
          ? 1
          : clamp(
              (
                now -
                startedAt
              )
              /
              duration
            );


      const smooth =
        progress *
        progress *
        (
          3 -
          2 *
          progress
        );


      for (
        const [
          key,
          audio
        ]
        of Object.entries(
          audioByKey
        )
      ) {
        const start =
          from.get(
            key
          )
          ??
          0;


        const target =
          clamp(
            targets[key]
            ??
            0
          );


        audio.volume =
          start +
          (
            target -
            start
          )
          *
          smooth;
      }


      if (
        progress <
        1
      ) {
        fadeFrame =
          requestAnimationFrame(
            frame
          );

        return;
      }


      fadeFrame =
        null;


      onDone?.();
    }


    fadeFrame =
      requestAnimationFrame(
        frame
      );
  }


  function pauseSilentTracks(
    exceptKey =
      null
  ) {
    for (
      const [
        key,
        audio
      ]
      of Object.entries(
        audioByKey
      )
    ) {
      if (
        key ===
        exceptKey
      ) {
        continue;
      }


      if (
        audio.volume <=
        0.001
      ) {
        audio.pause();
      }
    }
  }


  /* =========================================================
     PLAYBACK
  ========================================================= */

  async function ensurePlaying(
    key
  ) {
    const audio =
      audioByKey[key];


    if (
      !audio
      ||
      !settings.enabled
    ) {
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
        `REDLINE could not play ${key} music:`,
        error
      );

      return false;
    }
  }


  async function switchMusic(
    key,
    mode
  ) {
    currentMode =
      mode;


    if (
      !unlocked
    ) {
      currentKey =
        key;

      return;
    }


    if (
      !settings.enabled
      ||
      !key
      ||
      !audioByKey[key]
    ) {
      currentKey =
        key;


      fadeVolumes(
        {
          lobby:
            0,

          neon:
            0
        },

        settings.fadeDuration,

        () => {
          pauseSilentTracks();
        }
      );


      return;
    }


    const previousKey =
      currentKey;


    const nextAudio =
      audioByKey[key];


    /*
      Every new Neon race starts Fugent
      from the beginning.
    */

    if (
      previousKey !==
      key
      &&
      key ===
      "neon"
    ) {
      try {
        nextAudio.currentTime =
          0;
      }

      catch {}
    }


    const started =
      await ensurePlaying(
        key
      );


    if (
      !started
    ) {
      return;
    }


    currentKey =
      key;


    const targetVolume =
      volumeForMode(
        mode
      );


    const targets = {
      lobby:
        key ===
        "lobby"
          ? targetVolume
          : 0,

      neon:
        key ===
        "neon"
          ? targetVolume
          : 0
    };


    fadeVolumes(
      targets,

      settings.fadeDuration,

      () => {
        pauseSilentTracks(
          key
        );


        /*
          Reset Fugent after returning
          to the lobby.
        */

        if (
          key ===
          "lobby"
        ) {
          try {
            neonAudio.currentTime =
              0;
          }

          catch {}
        }
      }
    );
  }


  function syncMusic(
    room = getRoom()
  ) {
    const choice =
      musicChoice(
        room
      );


    return switchMusic(
      choice.key,
      choice.mode
    );
  }


  /* =========================================================
     AUTOPLAY UNLOCK

     IMPORTANT:
     BOTH lobby music and Fugent are unlocked
     during the first user interaction.
  ========================================================= */

  async function unlockMusic() {
    if (
      unlocked
    ) {
      await syncMusic();

      return;
    }


    lobbyAudio.muted =
      true;


    neonAudio.muted =
      true;


    /*
      Call BOTH play() functions immediately
      while we're still inside the click/key event.
    */

    const lobbyPlay =
      lobbyAudio.play();


    const neonPlay =
      neonAudio.play();


    const results =
      await Promise.allSettled(
        [
          Promise.resolve(
            lobbyPlay
          ),

          Promise.resolve(
            neonPlay
          )
        ]
      );


    const anyStarted =
      results.some(
        result =>
          result.status ===
          "fulfilled"
      );


    lobbyAudio.pause();


    neonAudio.pause();


    lobbyAudio.muted =
      false;


    neonAudio.muted =
      false;


    lobbyAudio.volume =
      0;


    neonAudio.volume =
      0;


    try {
      lobbyAudio.currentTime =
        0;
    }

    catch {}


    try {
      neonAudio.currentTime =
        0;
    }

    catch {}


    if (
      !anyStarted
    ) {
      console.warn(
        "REDLINE music could not be unlocked by this browser interaction."
      );

      return;
    }


    unlocked =
      true;


    currentKey =
      null;


    await syncMusic();
  }


  function onFirstInteraction() {
    unlockMusic();
  }


  window.addEventListener(
    "pointerdown",
    onFirstInteraction,
    {
      passive:
        true
    }
  );


  window.addEventListener(
    "keydown",
    onFirstInteraction
  );


  window.addEventListener(
    "touchstart",
    onFirstInteraction,
    {
      passive:
        true
    }
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


      switchMusic(
        currentMap ===
        "neon"
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


      switchMusic(
        currentMap ===
        "neon"
          ? "neon"
          : null,

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
        switchMusic(
          currentMap ===
          "neon"
            ? "neon"
            : null,

          "race"
        );
      }

      else {
        switchMusic(
          currentMap ===
          "neon"
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
      return TRACKS;
    },


    get currentTrack() {
      if (
        !currentKey
      ) {
        return null;
      }


      return {
        ...TRACKS[
          currentKey
        ]
      };
    },


    get settings() {
      return {
        ...settings
      };
    },


    async start() {
      await unlockMusic();
    },


    async sync() {
      await syncMusic();
    },


    async setNormal() {
      await switchMusic(
        "lobby",
        "lobby"
      );
    },


    async setRace() {
      await switchMusic(
        currentMap ===
        "neon"
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
        fadeVolumes(
          {
            lobby:
              0,

            neon:
              0
          },

          settings.fadeDuration,

          () => {
            lobbyAudio.pause();
            neonAudio.pause();
          }
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
    }

  };

})();
