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
    raceVolume: 0.40,
    resultsVolume: 0.34,
    fadeDuration: 1.5
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


      const savedFade =
        Number(
          saved?.fadeDuration
          ??
          DEFAULT_SETTINGS.fadeDuration
        );


      /*
        Older versions stored 1500 milliseconds.
        Web Audio uses seconds.

        So:
        1500 -> 1.5
        1.5  -> 1.5
      */

      const normalizedFade =
        savedFade > 20
          ? savedFade / 1000
          : savedFade;


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
            0.05,
            Math.min(
              10,
              normalizedFade
              ||
              DEFAULT_SETTINGS.fadeDuration
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
     WEB AUDIO
  ========================================================= */

  const AudioContextClass =
    window.AudioContext
    ||
    window.webkitAudioContext;


  let context =
    null;


  let unlocked =
    false;


  let currentMap =
    "neon";


  let currentMode =
    "lobby";


  let desiredKey =
    "lobby";


  let active =
    null;


  let requestSerial =
    0;


  const buffers =
    new Map();


  const loading =
    new Map();


  function ensureContext() {

    if (
      !context
      &&
      AudioContextClass
    ) {

      context =
        new AudioContextClass();

    }


    return context;

  }


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


    if (
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


  /* =========================================================
     LOAD + DECODE MP3
  ========================================================= */

  async function loadTrack(
    key
  ) {

    if (
      !key
      ||
      !TRACKS[key]
    ) {

      return null;

    }


    if (
      buffers.has(
        key
      )
    ) {

      return buffers.get(
        key
      );

    }


    if (
      loading.has(
        key
      )
    ) {

      return loading.get(
        key
      );

    }


    const ctx =
      ensureContext();


    if (
      !ctx
    ) {

      throw new Error(
        "Web Audio API is unavailable."
      );

    }


    const promise =
      (async () => {

        const response =
          await fetch(
            TRACKS[key].file,
            {
              cache:
                "force-cache"
            }
          );


        if (
          !response.ok
        ) {

          throw new Error(
            `${TRACKS[key].file} returned HTTP ${response.status}`
          );

        }


        const bytes =
          await response.arrayBuffer();


        const buffer =
          await ctx.decodeAudioData(
            bytes.slice(0)
          );


        buffers.set(
          key,
          buffer
        );


        return buffer;

      })();


    loading.set(
      key,
      promise
    );


    try {

      return await promise;

    }

    finally {

      loading.delete(
        key
      );

    }

  }


  function primeTracks() {

    for (
      const key
      of [
        "lobby",
        "neon"
      ]
    ) {

      loadTrack(
        key
      )
        .catch(
          error => {

            console.warn(
              `REDLINE failed to preload ${key} music:`,
              error
            );

          }
        );

    }

  }


  /* =========================================================
     GAIN FADES
  ========================================================= */

  function holdAndRamp(
    param,
    target,
    durationSeconds
  ) {

    const ctx =
      ensureContext();


    if (
      !ctx
    ) {

      return;

    }


    const now =
      ctx.currentTime;


    const duration =
      Math.max(
        0.01,
        durationSeconds
      );


    if (
      typeof param.cancelAndHoldAtTime ===
      "function"
    ) {

      param.cancelAndHoldAtTime(
        now
      );

    }

    else {

      const current =
        param.value;


      param.cancelScheduledValues(
        now
      );


      param.setValueAtTime(
        current,
        now
      );

    }


    param.linearRampToValueAtTime(
      clamp(
        target
      ),
      now + duration
    );

  }


  function fadeOutActive(
    duration =
      settings.fadeDuration
  ) {

    if (
      !active
      ||
      !context
    ) {

      return;

    }


    const old =
      active;


    active =
      null;


    holdAndRamp(
      old.gain.gain,
      0,
      duration
    );


    try {

      old.source.stop(
        context.currentTime
        +
        Math.max(
          0.05,
          duration
        )
        +
        0.05
      );

    }

    catch {}

  }


  /* =========================================================
     SWITCH MUSIC
  ========================================================= */

  async function switchTo(
    key,
    mode
  ) {

    desiredKey =
      key;


    currentMode =
      mode;


    const serial =
      ++requestSerial;


    if (
      !unlocked
    ) {

      return;

    }


    if (
      !settings.enabled
      ||
      !key
      ||
      !TRACKS[key]
    ) {

      fadeOutActive();


      return;

    }


    /*
      Same song already active.

      Don't restart it.
      Just adjust volume.
    */

    if (
      active?.key ===
      key
    ) {

      holdAndRamp(
        active.gain.gain,
        volumeForMode(
          mode
        ),
        settings.fadeDuration
      );


      return;

    }


    let buffer;


    try {

      buffer =
        await loadTrack(
          key
        );

    }

    catch (
      error
    ) {

      console.error(
        `REDLINE could not load ${key} music:`,
        error
      );


      return;

    }


    /*
      A newer phase change happened while
      this MP3 was loading.

      Ignore this stale request.
    */

    if (
      serial !==
      requestSerial
      ||
      !unlocked
      ||
      !settings.enabled
    ) {

      return;

    }


    const ctx =
      ensureContext();


    if (
      !ctx
    ) {

      return;

    }


    const source =
      ctx.createBufferSource();


    const gain =
      ctx.createGain();


    source.buffer =
      buffer;


    source.loop =
      true;


    gain.gain.setValueAtTime(
      0,
      ctx.currentTime
    );


    source.connect(
      gain
    );


    gain.connect(
      ctx.destination
    );


    const old =
      active;


    active = {
      key,
      source,
      gain
    };


    /*
      New track starts from beginning.
    */

    source.start(
      0
    );


    const duration =
      settings.fadeDuration;


    /*
      Fade new song IN.
    */

    holdAndRamp(
      gain.gain,
      volumeForMode(
        mode
      ),
      duration
    );


    /*
      Fade previous song OUT.
    */

    if (
      old
    ) {

      holdAndRamp(
        old.gain.gain,
        0,
        duration
      );


      try {

        old.source.stop(
          ctx.currentTime
          +
          Math.max(
            0.05,
            duration
          )
          +
          0.05
        );

      }

      catch {}

    }

  }


  /* =========================================================
     WHICH SONG SHOULD BE PLAYING?
  ========================================================= */

  function determineMusic(
    room =
      getRoom()
  ) {

    /*
      No room / home menu.
    */

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


    /*
      Race / countdown music.
    */

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


    /*
      Keep map music during results.
    */

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


    /*
      Lobby + car select.
    */

    return {

      key:
        "lobby",

      mode:
        "lobby"

    };

  }


  function syncMusic(
    room =
      getRoom()
  ) {

    const choice =
      determineMusic(
        room
      );


    switchTo(
      choice.key,
      choice.mode
    );

  }


  /* =========================================================
     FIRST USER INTERACTION

     Resume AudioContext once.

     After that, Web Audio sources can start later
     without browser autoplay blocking Fugent.
  ========================================================= */

  async function unlockMusic() {

    const ctx =
      ensureContext();


    if (
      !ctx
    ) {

      console.warn(
        "REDLINE: Web Audio API is not available."
      );


      return false;

    }


    try {

      if (
        ctx.state !==
        "running"
      ) {

        await ctx.resume();

      }


      unlocked =
        ctx.state ===
        "running";


      if (
        !unlocked
      ) {

        console.warn(
          `REDLINE: AudioContext is ${ctx.state}.`
        );


        return false;

      }


      syncMusic();


      return true;

    }

    catch (
      error
    ) {

      console.warn(
        "REDLINE music unlock failed:",
        error
      );


      return false;

    }

  }


  function userInteraction() {

    unlockMusic();

  }


  window.addEventListener(
    "pointerdown",
    userInteraction,
    {
      passive:
        true
    }
  );


  window.addEventListener(
    "touchstart",
    userInteraction,
    {
      passive:
        true
    }
  );


  window.addEventListener(
    "keydown",
    userInteraction
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


      switchTo(

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

      switchTo(

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

      switchTo(

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

      return TRACKS;

    },


    get currentTrack() {

      return (
        active?.key
        ?
        TRACKS[
          active.key
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

      return {

        unlocked,

        contextState:
          context?.state
          ??
          "not-created",

        currentTrack:
          active?.key
          ??
          null,

        desiredTrack:
          desiredKey,

        currentMode,

        currentMap,

        loadedTracks:
          [
            ...buffers.keys()
          ]

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

        fadeOutActive();

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


      if (
        active
      ) {

        holdAndRamp(
          active.gain.gain,
          volumeForMode(
            currentMode
          ),
          settings.fadeDuration
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
        &&
        active
      ) {

        holdAndRamp(
          active.gain.gain,
          volumeForMode(
            "lobby"
          ),
          settings.fadeDuration
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
        &&
        active
      ) {

        holdAndRamp(
          active.gain.gain,
          volumeForMode(
            "race"
          ),
          settings.fadeDuration
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
        &&
        active
      ) {

        holdAndRamp(
          active.gain.gain,
          volumeForMode(
            "results"
          ),
          settings.fadeDuration
        );

      }

    },


    setFadeDuration(
      seconds
    ) {

      settings.fadeDuration =
        Math.max(
          0.05,
          Math.min(
            10,
            Number(
              seconds
            )
            ||
            1.5
          )
        );


      saveSettings();

    }

  };


  /*
    Start downloading/decoding both songs
    immediately.

    They will not make sound until the
    AudioContext is unlocked by a click/key press.
  */

  primeTracks();

})();
