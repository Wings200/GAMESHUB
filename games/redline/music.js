(() => {

  /* =========================================================
     REDLINE MUSIC SYSTEM V2

     Lobby:
       iluvslapbass

     Neon District:
       Fugent - Lupus Nocte

     Future:
       ice - slowed
  ========================================================= */


  const MUSIC = {

    lobby: [
      {
        id: "slapbass",
        name: "I LUV SLAP BASS",
        file:
          "./assets/audio/music/iluvslapbass.mp3"
      }
    ],


    maps: {

      neon: [
        {
          id: "fugent",
          name: "FUGENT — LUPUS NOCTE",
          file:
            "./assets/audio/music/fugent.mp3"
        }
      ],


      canyon: [
        /*
          Future Canyon music goes here.
        */
      ],


      arctic: [
        /*
          Future Arctic music goes here.
        */
      ]

    },


    /*
      Available for later.

      This does NOT currently play automatically.
    */

    unassigned: [
      {
        id: "ice-slowed",
        name: "ICE — SLOWED",
        file:
          "./assets/audio/music/ice-slowed.mp3"
      }
    ]

  };


  /* =========================================================
     DEFAULT SETTINGS
  ========================================================= */

  const DEFAULT_SETTINGS = {

    enabled: true,

    masterVolume: 1.00,

    lobbyVolume: 0.52,

    raceVolume: 0.38,

    resultsVolume: 0.32,

    fadeDuration: 900

  };


  /* =========================================================
     SAVED SETTINGS
  ========================================================= */

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
     AUDIO PLAYERS

     Two players allow smooth crossfades.
  ========================================================= */

  const audioA =
    new Audio();


  const audioB =
    new Audio();


  for (
    const audio
    of [
      audioA,
      audioB
    ]
  ) {

    audio.loop =
      true;


    audio.preload =
      "auto";


    audio.volume =
      0;

  }


  let activeAudio =
    audioA;


  let inactiveAudio =
    audioB;


  let currentTrack =
    null;


  let currentMode =
    null;


  let currentMap =
    "neon";


  let audioUnlocked =
    false;


  let fadeAnimation =
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
        value
      )
    );

  }


  function getEffectiveVolume(
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


  function getRoom() {

    return (
      window.REDLINE_MP
        ?.room
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


  function getLobbyTrack() {

    return (
      MUSIC.lobby[0]
      ??
      null
    );

  }


  function getMapTrack(
    map
  ) {

    const tracks =
      MUSIC.maps[
        map
      ]
      ??
      [];


    return (
      tracks[0]
      ??
      null
    );

  }


  /* =========================================================
     FADE SYSTEM
  ========================================================= */

  function cancelFade() {

    if (
      fadeAnimation
    ) {

      cancelAnimationFrame(
        fadeAnimation
      );


      fadeAnimation =
        null;

    }

  }


  function fadeAudio(
    audio,
    from,
    to,
    duration,
    onFinished = null
  ) {

    const start =
      performance.now();


    function frame(
      now
    ) {

      const progress =
        clamp(
          (
            now -
            start
          )
          /
          duration
        );


      /*
        Smooth cubic fade.
      */

      const eased =
        1 -
        Math.pow(
          1 -
          progress,
          3
        );


      audio.volume =
        clamp(
          from +
          (
            to -
            from
          )
          *
          eased
        );


      if (
        progress <
        1
      ) {

        fadeAnimation =
          requestAnimationFrame(
            frame
          );

      }

      else {

        fadeAnimation =
          null;


        audio.volume =
          clamp(
            to
          );


        onFinished?.();

      }

    }


    fadeAnimation =
      requestAnimationFrame(
        frame
      );

  }


  /* =========================================================
     START / AUTOPLAY UNLOCK
  ========================================================= */

  async function unlockAudio() {

    if (
      audioUnlocked
    ) {

      return true;

    }


    try {

      /*
        Browser autoplay rules require the first
        playback to happen after a user interaction.
      */

      activeAudio.muted =
        true;


      await activeAudio.play();


      activeAudio.pause();


      activeAudio.currentTime =
        0;


      activeAudio.muted =
        false;


      audioUnlocked =
        true;


      syncMusic();


      return true;

    }

    catch {

      return false;

    }

  }


  const unlockListener =
    () => {

      unlockAudio();

    };


  window.addEventListener(
    "pointerdown",
    unlockListener,
    {
      passive: true
    }
  );


  window.addEventListener(
    "keydown",
    unlockListener
  );


  window.addEventListener(
    "touchstart",
    unlockListener,
    {
      passive: true
    }
  );


  /* =========================================================
     TRACK CHANGE
  ========================================================= */

  async function playTrack(
    track,
    mode
  ) {

    if (
      !track
    ) {

      stopMusic();

      return;

    }


    const targetVolume =
      getEffectiveVolume(
        mode
      );


    /*
      Same song already playing.

      Don't restart it.
      Only change volume.
    */

    if (
      currentTrack?.id ===
      track.id
      &&
      !activeAudio.paused
    ) {

      currentMode =
        mode;


      fadeVolume(
        targetVolume
      );


      return;

    }


    currentTrack =
      track;


    currentMode =
      mode;


    if (
      !audioUnlocked
    ) {

      return;

    }


    cancelFade();


    inactiveAudio.pause();


    inactiveAudio.src =
      track.file;


    inactiveAudio.loop =
      true;


    inactiveAudio.currentTime =
      0;


    inactiveAudio.volume =
      0;


    try {

      await inactiveAudio.play();

    }

    catch (
      error
    ) {

      console.warn(
        "REDLINE music could not start:",
        error
      );


      return;

    }


    const oldAudio =
      activeAudio;


    const newAudio =
      inactiveAudio;


    const oldVolume =
      oldAudio.volume;


    /*
      Switch which player is considered active.
    */

    activeAudio =
      newAudio;


    inactiveAudio =
      oldAudio;


    /*
      Fade old music away.
    */

    const start =
      performance.now();


    const duration =
      settings.fadeDuration;


    function crossfade(
      now
    ) {

      const progress =
        clamp(
          (
            now -
            start
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


      newAudio.volume =
        clamp(
          targetVolume *
          smooth
        );


      oldAudio.volume =
        clamp(
          oldVolume *
          (
            1 -
            smooth
          )
        );


      if (
        progress <
        1
      ) {

        fadeAnimation =
          requestAnimationFrame(
            crossfade
          );

      }

      else {

        fadeAnimation =
          null;


        newAudio.volume =
          targetVolume;


        oldAudio.volume =
          0;


        oldAudio.pause();


        oldAudio.removeAttribute(
          "src"
        );


        oldAudio.load();

      }

    }


    fadeAnimation =
      requestAnimationFrame(
        crossfade
      );

  }


  /* =========================================================
     VOLUME CHANGE WITHOUT RESTARTING SONG
  ========================================================= */

  function fadeVolume(
    volume
  ) {

    if (
      !audioUnlocked
      ||
      activeAudio.paused
    ) {

      return;

    }


    cancelFade();


    fadeAudio(
      activeAudio,
      activeAudio.volume,
      getEffectiveVolume(
        currentMode
      ),
      settings.fadeDuration
    );

  }


  /* =========================================================
     STOP
  ========================================================= */

  function stopMusic() {

    cancelFade();


    const stop =
      audio => {

        const startingVolume =
          audio.volume;


        fadeAudio(
          audio,
          startingVolume,
          0,
          settings.fadeDuration,
          () => {

            audio.pause();

          }
        );

      };


    stop(
      activeAudio
    );


    currentTrack =
      null;


    currentMode =
      null;

  }


  /* =========================================================
     MUSIC MODES
  ========================================================= */

  function playLobbyMusic() {

    playTrack(
      getLobbyTrack(),
      "lobby"
    );

  }


  function playRaceMusic(
    map = getCurrentMap()
  ) {

    currentMap =
      map;


    const track =
      getMapTrack(
        map
      );


    /*
      If this map currently has no music,
      fade the lobby song out instead.
    */

    if (
      !track
    ) {

      stopMusic();


      return;

    }


    playTrack(
      track,
      "race"
    );

  }


  function playResultsMusic() {

    /*
      Keep the MAP song playing on the results
      screen, just slightly quieter.

      It will switch back to lobby music when
      the room actually returns to lobby.
    */

    const track =
      getMapTrack(
        getCurrentMap()
      );


    if (
      track
    ) {

      playTrack(
        track,
        "results"
      );

    }

  }


  /* =========================================================
     DETERMINE CURRENT GAME STATE
  ========================================================= */

  function syncMusic() {

    const room =
      getRoom();


    /*
      Before joining a room:
      use lobby/menu music.
    */

    if (
      !room
    ) {

      playLobbyMusic();


      return;

    }


    currentMap =
      room.map
      ??
      currentMap;


    switch (
      room.phase
    ) {


      case "racing":

        playRaceMusic(
          room.map
        );

        break;


      case "results":

        playResultsMusic();

        break;


      case "countdown":

        /*
          Begin the map song during countdown
          so it's already playing when GO appears.
        */

        playRaceMusic(
          room.map
        );

        break;


      case "lobby":

      case "car_select":

      default:

        playLobbyMusic();

        break;

    }

  }


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

      const map =
        event.detail?.room?.map
        ??
        getCurrentMap();


      currentMap =
        map;


      playRaceMusic(
        map
      );

    }
  );


  window.addEventListener(
    "redline:race-started",
    event => {

      const map =
        event.detail?.room?.map
        ??
        getCurrentMap();


      currentMap =
        map;


      playRaceMusic(
        map
      );

    }
  );


  window.addEventListener(
    "redline:race-complete",
    () => {

      playResultsMusic();

    }
  );


  window.addEventListener(
    "redline:results-shown",
    event => {

      if (
        event.detail?.waiting
      ) {

        /*
          Player finished but others are still racing.

          Keep race music at race volume.
        */

        playRaceMusic(
          getCurrentMap()
        );

      }

      else {

        playResultsMusic();

      }

    }
  );


  /* =========================================================
     SETTINGS API

     We'll connect this to the settings menu later.
  ========================================================= */

  window.REDLINE_MUSIC = {

    get tracks() {

      return MUSIC;

    },


    get settings() {

      return {
        ...settings
      };

    },


    start() {

      return unlockAudio();

    },


    sync() {

      syncMusic();

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

        stopMusic();

      }

    },


    setMasterVolume(
      value
    ) {

      settings.masterVolume =
        clamp(
          Number(value)
        );


      saveSettings();


      fadeVolume(
        getEffectiveVolume(
          currentMode
        )
      );

    },


    setLobbyVolume(
      value
    ) {

      settings.lobbyVolume =
        clamp(
          Number(value)
        );


      saveSettings();


      if (
        currentMode ===
        "lobby"
      ) {

        fadeVolume(
          getEffectiveVolume(
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
          Number(value)
        );


      saveSettings();


      if (
        currentMode ===
        "race"
      ) {

        fadeVolume(
          getEffectiveVolume(
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
          Number(value)
        );


      saveSettings();


      if (
        currentMode ===
        "results"
      ) {

        fadeVolume(
          getEffectiveVolume(
            "results"
          )
        );

      }

    },


    setNormal() {

      playLobbyMusic();

    },


    setRace() {

      playRaceMusic(
        getCurrentMap()
      );

    },


    next() {

      /*
        Playlist switching comes when we add
        multiple songs to each category.
      */

      syncMusic();

    },


    get currentTrack() {

      return (
        currentTrack
          ? {
              ...currentTrack
            }
          : null
      );

    }

  };


  /* =========================================================
     INITIAL MUSIC
  ========================================================= */

  setTimeout(
    () => {

      syncMusic();

    },
    250
  );

})();
