(() => {

  /* =========================================================
     REDLINE MUSIC SYSTEM V3
  ========================================================= */

  const MUSIC = {

    lobby: {
      id: "slapbass",
      name: "I LUV SLAP BASS",
      file: "./assets/audio/iluvslapbass.mp3"
    },

    maps: {

      neon: {
        id: "fugent",
        name: "FUGENT — LUPUS NOCTE",
        file: "./assets/audio/fugent.mp3"
      },

      canyon: null,

      arctic: null

    },

    unassigned: {
      ice: {
        id: "ice-slowed",
        name: "ICE — SLOWED",
        file: "./assets/audio/ice-slowed.mp3"
      }
    }

  };


  /* =========================================================
     SETTINGS
  ========================================================= */

  const DEFAULT_SETTINGS = {
    enabled: true,

    masterVolume: 1.00,

    lobbyVolume: 0.52,

    raceVolume: 0.38,

    resultsVolume: 0.32,

    fadeDuration: 700
  };


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
        ...(saved || {})
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
     AUDIO
  ========================================================= */

  const audio =
    new Audio();


  audio.loop =
    true;


  audio.preload =
    "auto";


  audio.volume =
    0;


  let unlocked =
    false;


  let currentTrack =
    null;


  let currentMode =
    "lobby";


  let currentMap =
    "neon";


  let transitionId =
    0;


  let fadeFrame =
    null;


  /* =========================================================
     HELPERS
  ========================================================= */

  function clamp(
    value,
    min = 0,
    max = 1
  ) {

    return Math.max(
      min,
      Math.min(
        max,
        Number(value) || 0
      )
    );

  }


  function getRoom() {

    return (
      window.REDLINE_MP?.room
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


  function cancelFade() {

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


  function fadeTo(
    target,
    duration = settings.fadeDuration
  ) {

    cancelFade();


    target =
      clamp(
        target
      );


    const from =
      audio.volume;


    const startedAt =
      performance.now();


    const id =
      transitionId;


    return new Promise(
      resolve => {

        function frame(
          now
        ) {

          if (
            id !==
            transitionId
          ) {

            resolve();

            return;

          }


          const progress =
            clamp(
              (
                now -
                startedAt
              )
              /
              Math.max(
                1,
                duration
              )
            );


          const smooth =
            progress *
            progress *
            (
              3 -
              2 *
              progress
            );


          audio.volume =
            from +
            (
              target -
              from
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


            audio.volume =
              target;


            resolve();

          }

        }


        fadeFrame =
          requestAnimationFrame(
            frame
          );

      }
    );

  }


  /* =========================================================
     CHOOSE MUSIC
  ========================================================= */

  function getMapTrack(
    map
  ) {

    return (
      MUSIC.maps[
        map
      ]
      ??
      null
    );

  }


  function determineMusic() {

    const room =
      getRoom();


    if (
      !room
    ) {

      return {
        track:
          MUSIC.lobby,

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
      "racing"
      ||
      room.phase ===
      "countdown"
    ) {

      return {
        track:
          getMapTrack(
            currentMap
          ),

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
        track:
          getMapTrack(
            currentMap
          ),

        mode:
          "results"
      };

    }


    return {
      track:
        MUSIC.lobby,

      mode:
        "lobby"
    };

  }


  /* =========================================================
     PLAY TRACK
  ========================================================= */

  async function playTrack(
    track,
    mode
  ) {

    currentMode =
      mode;


    const targetVolume =
      volumeForMode(
        mode
      );


    if (
      !settings.enabled
    ) {

      transitionId++;


      await fadeTo(
        0
      );


      audio.pause();


      return;

    }


    if (
      !track
    ) {

      transitionId++;


      await fadeTo(
        0
      );


      audio.pause();


      currentTrack =
        null;


      return;

    }


    /*
      If the correct track is already playing,
      DO NOT restart it.

      Just change its volume.
    */

    if (
      currentTrack?.id ===
      track.id
      &&
      audio.src
    ) {

      if (
        unlocked
        &&
        audio.paused
      ) {

        try {

          await audio.play();

        }

        catch (
          error
        ) {

          console.warn(
            "REDLINE music playback blocked:",
            error
          );


          unlocked =
            false;


          return;

        }

      }


      if (
        unlocked
      ) {

        transitionId++;


        await fadeTo(
          targetVolume
        );

      }


      return;

    }


    /*
      Remember which song we WANT even before
      browser audio has been unlocked.
    */

    if (
      !unlocked
    ) {

      currentTrack =
        track;


      return;

    }


    const myTransition =
      ++transitionId;


    /*
      Fade current song out.
    */

    if (
      !audio.paused
    ) {

      await fadeTo(
        0
      );

    }


    if (
      myTransition !==
      transitionId
    ) {

      return;

    }


    audio.pause();


    audio.src =
      track.file;


    audio.currentTime =
      0;


    audio.loop =
      true;


    audio.volume =
      0;


    currentTrack =
      track;


    try {

      await audio.play();

    }

    catch (
      error
    ) {

      console.error(
        `REDLINE could not play ${track.file}`,
        error
      );


      unlocked =
        false;


      return;

    }


    if (
      myTransition !==
      transitionId
    ) {

      return;

    }


    await fadeTo(
      targetVolume
    );

  }


  /* =========================================================
     SYNC WITH GAME
  ========================================================= */

  async function syncMusic() {

    const choice =
      determineMusic();


    await playTrack(
      choice.track,
      choice.mode
    );

  }


  /* =========================================================
     BROWSER AUTOPLAY UNLOCK
  ========================================================= */

  async function unlockMusic() {

    if (
      unlocked
    ) {

      return;

    }


    /*
      IMPORTANT FIX:

      We mark audio as unlocked while we're still
      inside the user's click/key interaction.

      syncMusic() then assigns the REAL song before
      calling audio.play().
    */

    unlocked =
      true;


    const choice =
      determineMusic();


    /*
      Force the initial song to load because before
      the first interaction currentTrack may already
      have been remembered without assigning audio.src.
    */

    currentTrack =
      null;


    try {

      await playTrack(
        choice.track,
        choice.mode
      );

    }

    catch (
      error
    ) {

      unlocked =
        false;


      console.warn(
        "REDLINE music unlock failed:",
        error
      );

    }

  }


  window.addEventListener(
    "pointerdown",
    unlockMusic,
    {
      passive: true
    }
  );


  window.addEventListener(
    "keydown",
    unlockMusic
  );


  window.addEventListener(
    "touchstart",
    unlockMusic,
    {
      passive: true
    }
  );


  /* =========================================================
     MULTIPLAYER EVENTS
  ========================================================= */

  window.addEventListener(
    "redline:room-state",
    event => {

      const room =
        event.detail?.room
        ??
        event.detail?.state
        ??
        event.detail;


      if (
        room?.map
      ) {

        currentMap =
          room.map;

      }


      syncMusic();

    }
  );


  window.addEventListener(
    "redline:countdown",
    event => {

      currentMap =
        event.detail?.room?.map
        ??
        getCurrentMap();


      playTrack(
        getMapTrack(
          currentMap
        ),
        "race"
      );

    }
  );


  window.addEventListener(
    "redline:race-started",
    event => {

      currentMap =
        event.detail?.room?.map
        ??
        getCurrentMap();


      playTrack(
        getMapTrack(
          currentMap
        ),
        "race"
      );

    }
  );


  window.addEventListener(
    "redline:race-complete",
    () => {

      playTrack(
        getMapTrack(
          getCurrentMap()
        ),
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

        playTrack(
          getMapTrack(
            getCurrentMap()
          ),
          "race"
        );

      }

      else {

        playTrack(
          getMapTrack(
            getCurrentMap()
          ),
          "results"
        );

      }

    }
  );


  /* =========================================================
     PUBLIC SETTINGS API
  ========================================================= */

  window.REDLINE_MUSIC = {

    get tracks() {

      return MUSIC;

    },


    get currentTrack() {

      return (
        currentTrack
        ?
        {
          ...currentTrack
        }
        :
        null
      );

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

      await playTrack(
        MUSIC.lobby,
        "lobby"
      );

    },


    async setRace() {

      await playTrack(
        getMapTrack(
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


      syncMusic();

    },


    setMasterVolume(
      value
    ) {

      settings.masterVolume =
        clamp(
          value
        );


      saveSettings();


      if (
        unlocked
      ) {

        transitionId++;


        fadeTo(
          volumeForMode(
            currentMode
          )
        );

      }

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

        transitionId++;


        fadeTo(
          volumeForMode(
            "lobby"
          )
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

        transitionId++;


        fadeTo(
          volumeForMode(
            "race"
          )
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

        transitionId++;


        fadeTo(
          volumeForMode(
            "results"
          )
        );

      }

    }

  };


  /* =========================================================
     INITIAL STATE

     This chooses the desired song but DOES NOT try
     to autoplay before the user interacts.
  ========================================================= */

  const initial =
    determineMusic();


  currentTrack =
    initial.track;


  currentMode =
    initial.mode;

})();
