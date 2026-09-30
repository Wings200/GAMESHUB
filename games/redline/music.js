(() => {

  /* =========================================================
     REDLINE MUSIC SYSTEM
     MAP-AWARE HTML AUDIO VERSION
  ========================================================= */

  const TRACKS = {

    lobby: {
      id:
        "slapbass",

      name:
        "I LUV SLAP BASS",

      file:
        "./assets/audio/iluvslapbass.mp3"
    },


    neon: {
      id:
        "fugent",

      name:
        "FUGENT — LUPUS NOCTE",

      file:
        "./assets/audio/fugent.mp3"
    },


    ice: {
      id:
        "ice-slowed",

      name:
        "ICE — SLOWED",

      /*
        The real asset in the repo is named:
        "ice - slowed.mp3"
      */

      file:
        "./assets/audio/ice%20-%20slowed.mp3"
    }

  };


  const DEFAULT_SETTINGS = {
    enabled:
      true,

    masterVolume:
      1,

    lobbyVolume:
      0.52,

    raceVolume:
      0.40,

    resultsVolume:
      0.34,

    fadeDuration:
      1500
  };


  function clamp(
    value,
    min = 0,
    max = 1
  ) {

    const number =
      Number(
        value
      );


    return Math.max(
      min,
      Math.min(
        max,
        Number.isFinite(
          number
        )
          ?
          number
          :
          min
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


      if (
        fade > 0
        &&
        fade < 20
      ) {

        fade *=
          1000;

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
              fade
              ||
              1500
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
     PLAYERS
  ========================================================= */

  const players = {};


  for (
    const [
      key,
      track
    ]
    of Object.entries(
      TRACKS
    )
  ) {

    const audio =
      new Audio(
        track.file
      );


    audio.loop =
      true;


    audio.preload =
      "auto";


    audio.volume =
      0;


    audio.load();


    players[
      key
    ] =
      audio;

  }


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


  function raceTrackForMap(
    map
  ) {

    if (
      map ===
      "neon"
    ) {

      return "neon";

    }


    if (
      map ===
      "arctic"
    ) {

      return "ice";

    }


    return null;

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
      volume
      *
      settings.masterVolume
    );

  }


  async function ensurePlaying(
    key
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


  function crossfadeTo(
    targetKey,
    mode,
    duration =
      settings.fadeDuration
  ) {

    stopFade();


    const generation =
      fadeGeneration;


    const volume =
      targetKey
        ?
        volumeForMode(
          mode
        )
        :
        0;


    const starts = {};


    const targets = {};


    for (
      const key
      of Object.keys(
        players
      )
    ) {

      starts[
        key
      ] =
        players[
          key
        ].volume;


      targets[
        key
      ] =
        key ===
        targetKey
          ?
          volume
          :
          0;

    }


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


      const smooth =
        progress
        *
        progress
        *
        (
          3
          -
          2
          *
          progress
        );


      for (
        const key
        of Object.keys(
          players
        )
      ) {

        players[
          key
        ].volume =
          starts[
            key
          ]
          +
          (
            targets[
              key
            ]
            -
            starts[
              key
            ]
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


      for (
        const key
        of Object.keys(
          players
        )
      ) {

        players[
          key
        ].volume =
          targets[
            key
          ];

      }

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

      currentTrack =
        null;


      crossfadeTo(
        null,
        mode
      );


      return;

    }


    if (
      !key
      ||
      !players[
        key
      ]
    ) {

      currentTrack =
        null;


      crossfadeTo(
        null,
        mode
      );


      return;

    }


    const changingTrack =
      currentTrack !==
      key;


    /*
      Every new race-map soundtrack starts from the beginning.
      Results continue the same song instead of restarting it.
    */

    if (
      changingTrack
      &&
      mode ===
      "race"
      &&
      key !==
      "lobby"
    ) {

      try {

        players[
          key
        ].currentTime =
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

      console.warn(
        `REDLINE refused to fade because ${key} did not start.`
      );


      return;

    }


    currentTrack =
      key;


    crossfadeTo(
      key,
      mode
    );

  }


  /* =========================================================
     MUSIC ROUTING
  ========================================================= */

  function syncMusic(
    room =
      getRoom()
  ) {

    if (
      !room
    ) {

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


    const raceTrack =
      raceTrackForMap(
        currentMap
      );


    if (
      room.phase ===
      "countdown"
      ||
      room.phase ===
      "racing"
    ) {

      switchTo(
        raceTrack,
        "race"
      );


      return;

    }


    if (
      room.phase ===
      "results"
      ||
      room.raceComplete
    ) {

      switchTo(
        raceTrack,
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
  ========================================================= */

  async function unlockMusic() {

    if (
      unlocked
    ) {

      syncMusic();


      return;

    }


    for (
      const audio
      of Object.values(
        players
      )
    ) {

      audio.volume =
        0;

    }


    const entries =
      Object.entries(
        players
      );


    const results =
      await Promise.allSettled(
        entries.map(
          (
            [
              ,
              audio
            ]
          ) =>
            audio.play()
        )
      );


    const status = {};


    entries.forEach(
      (
        [
          key
        ],
        index
      ) => {

        status[
          key
        ] =
          results[
            index
          ]?.status ===
          "fulfilled";

      }
    );


    console.log(
      "REDLINE music unlock:",
      status
    );


    if (
      !Object
        .values(
          status
        )
        .some(
          Boolean
        )
    ) {

      console.warn(
        "REDLINE browser blocked all music tracks."
      );


      return;

    }


    unlocked =
      true;


    currentTrack =
      null;


    syncMusic();

  }


  async function interaction() {

    if (
      !unlocked
    ) {

      await unlockMusic();


      return;

    }


    /*
      Keep all tracks alive at volume 0 so map switches can
      crossfade immediately without a second autoplay gesture.
    */

    for (
      const [
        key,
        audio
      ]
      of Object.entries(
        players
      )
    ) {

      if (
        audio.paused
      ) {

        ensurePlaying(
          key
        );

      }

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
        raceTrackForMap(
          currentMap
        ),
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


      const key =
        raceTrackForMap(
          currentMap
        );


      if (
        currentTrack !==
        key
      ) {

        switchTo(
          key,
          "race"
        );

      }

    }
  );


  window.addEventListener(
    "redline:race-complete",
    () => {

      switchTo(
        raceTrackForMap(
          currentMap
        ),
        "results"
      );

    }
  );


  window.addEventListener(
    "redline:results-shown",
    event => {

      switchTo(
        raceTrackForMap(
          currentMap
        ),
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

      return TRACKS;

    },


    get currentTrack() {

      return (
        currentTrack
          ?
          TRACKS[
            currentTrack
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


    get debug() {

      const debugPlayers = {};


      for (
        const [
          key,
          audio
        ]
        of Object.entries(
          players
        )
      ) {

        debugPlayers[
          key
        ] = {
          src:
            audio.currentSrc,

          paused:
            audio.paused,

          readyState:
            audio.readyState,

          volume:
            audio.volume,

          currentTime:
            audio.currentTime,

          error:
            audio.error
              ?
              {
                code:
                  audio.error.code,

                message:
                  audio.error.message
              }
              :
              null
        };

      }


      return {
        unlocked,

        currentTrack,

        currentMode,

        currentMap,

        ...debugPlayers
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
        raceTrackForMap(
          getCurrentMap()
        ),
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

        currentTrack =
          null;


        crossfadeTo(
          null,
          currentMode
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
