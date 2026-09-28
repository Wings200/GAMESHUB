/* =========================================================
   REDLINE V9.1 AUDIO

   Fixes:
   - Loud pops when changing engine samples
   - Only 2 neighboring RPM samples audible at once
   - Equal-power crossfading
   - Smooth gain changes
   - Uses actual RPM HUD instead of MPH for engine tone
   - Gear changes naturally drop RPM
   - Removes duplicate startup playback
========================================================= */


/* =========================================================
   DOM
========================================================= */

const startBtn =
  document.getElementById("startBtn");

const menu =
  document.getElementById("menu");

const speedEl =
  document.getElementById("speed");

const gearEl =
  document.getElementById("gear");

const rpmBar =
  document.getElementById("rpmBar");

const checkpointPopup =
  document.getElementById("checkpointPopup");


/* =========================================================
   AUDIO FILES
========================================================= */

const AUDIO = {

  engines: [

    "https://opengameart.org/sites/default/files/loop_0.wav",

    "https://opengameart.org/sites/default/files/loop_1_0.wav",

    "https://opengameart.org/sites/default/files/loop_2_0.wav",

    "https://opengameart.org/sites/default/files/loop_3_0.wav",

    "https://opengameart.org/sites/default/files/loop_4_0.wav",

    "https://opengameart.org/sites/default/files/loop_5_0.wav"

  ],


  startup:
    "https://opengameart.org/sites/default/files/engine_start_up_01.wav",


  skid:
    "https://opengameart.org/sites/default/files/tires_squal_loop.wav",


  crash:
    "https://opengameart.org/sites/default/files/qubodup-crash.ogg",


  wind:
    "https://opengameart.org/sites/default/files/wind%20woosh%20loop.ogg"

};


/* =========================================================
   SETTINGS
========================================================= */

const ENGINE_MASTER_VOLUME =
  0.38;

const ENGINE_IDLE_VOLUME =
  0.24;


/*
   Higher number = faster transition.

   We're intentionally keeping this relatively slow
   so the volume cannot suddenly jump and create a click.
*/

const ENGINE_FADE_SPEED =
  5.5;


/*
   Playback rate changes are deliberately small.

   The recordings already represent different RPM ranges.
*/

const MIN_PLAYBACK_RATE =
  0.94;

const MAX_PLAYBACK_RATE =
  1.07;


/* =========================================================
   STATE
========================================================= */

let audioStarted =
  false;

let raceAudioEnabled =
  false;

let crashCooldown =
  0;

let skidHeld =
  false;

let nitroHeld =
  false;

let previousGear =
  "1";

let previousTime =
  performance.now();


/* =========================================================
   HELPERS
========================================================= */

function clamp(
  value,
  min,
  max
) {

  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );
}


function expSmooth(
  current,
  target,
  speed,
  delta
) {

  const amount =
    1 -
    Math.exp(
      -speed *
      delta
    );


  return current
    +
    (
      target -
      current
    )
    *
    amount;
}


/* =========================================================
   AUDIO ELEMENT CREATOR
========================================================= */

function createAudio(
  url,
  loop = false
) {

  const audio =
    new Audio();


  audio.src =
    url;


  audio.preload =
    "auto";


  audio.loop =
    loop;


  audio.volume =
    0;


  audio.playsInline =
    true;


  return audio;
}


/* =========================================================
   ENGINE LAYERS
========================================================= */

const engineLayers =
  AUDIO.engines.map(

    (
      url,
      index
    ) => {

      const audio =
        createAudio(
          url,
          true
        );


      return {

        audio,

        index,

        currentGain:
          0,

        targetGain:
          0,

        targetRate:
          1

      };

    }

  );


/* =========================================================
   OTHER AUDIO
========================================================= */

const startupSound =
  createAudio(
    AUDIO.startup,
    false
  );


const skidSound =
  createAudio(
    AUDIO.skid,
    true
  );


const windSound =
  createAudio(
    AUDIO.wind,
    true
  );


startupSound.volume =
  0.46;


/* =========================================================
   GAME VALUES
========================================================= */

function getSpeed() {

  const speed =
    Number(
      speedEl?.textContent
    );


  if (
    Number.isFinite(
      speed
    )
  ) {

    return speed;
  }


  return 0;
}


function getRPMPercent() {

  if (
    !rpmBar
  ) {

    return 0.12;
  }


  /*
    game.js writes things like:

    rpmBar.style.width = "62%"

    So we can directly use the game's real RPM output.
  */

  const raw =
    rpmBar.style.width;


  if (
    raw &&
    raw.includes("%")
  ) {

    const value =
      parseFloat(
        raw
      );


    if (
      Number.isFinite(
        value
      )
    ) {

      return clamp(
        value /
        100,
        0,
        1
      );
    }
  }


  return 0.12;
}


/* =========================================================
   START AUDIO
========================================================= */

async function startAudioSystem() {

  if (
    audioStarted
  ) {

    return;
  }


  audioStarted =
    true;


  /*
    CRITICAL FIX:

    Every engine loop starts ONCE at volume 0.

    We never stop one sample and start another while driving.

    That means switching RPM ranges only changes gain,
    instead of beginning a new waveform halfway through
    and causing the giant POP.
  */


  const promises =
    [];


  for (
    const layer
    of engineLayers
  ) {

    layer.audio.volume =
      0;


    layer.currentGain =
      0;


    const playPromise =
      layer.audio.play();


    if (
      playPromise
    ) {

      promises.push(

        playPromise.catch(
          () => {}
        )

      );
    }
  }


  skidSound.volume =
    0;


  windSound.volume =
    0;


  promises.push(

    skidSound
      .play()
      .catch(
        () => {}
      )

  );


  promises.push(

    windSound
      .play()
      .catch(
        () => {}
      )

  );


  await Promise.all(
    promises
  );
}


/* =========================================================
   RACE START
========================================================= */

startBtn?.addEventListener(

  "click",

  async () => {

    await startAudioSystem();


    raceAudioEnabled =
      true;


    /*
      Startup now plays ONCE.

      The old version accidentally played it once inside
      startAudioSystem() and then AGAIN here.
    */


    startupSound.pause();


    startupSound.currentTime =
      0;


    startupSound.volume =
      0.46;


    startupSound
      .play()
      .catch(
        () => {}
      );

  }

);


/* =========================================================
   INPUT
========================================================= */

window.addEventListener(

  "keydown",

  event => {

    const key =
      event.key
        .toLowerCase();


    if (
      key ===
      " "
    ) {

      skidHeld =
        true;
    }


    if (
      key ===
      "shift"
    ) {

      nitroHeld =
        true;
    }

  }

);


window.addEventListener(

  "keyup",

  event => {

    const key =
      event.key
        .toLowerCase();


    if (
      key ===
      " "
    ) {

      skidHeld =
        false;
    }


    if (
      key ===
      "shift"
    ) {

      nitroHeld =
        false;
    }

  }

);


window.addEventListener(

  "blur",

  () => {

    skidHeld =
      false;


    nitroHeld =
      false;

  }

);


/* =========================================================
   EQUAL POWER CROSSFADE
========================================================= */

function equalPowerFade(
  value
) {

  /*
    value = 0:
      lower sample full volume

    value = 1:
      upper sample full volume

    In between:
      both overlap smoothly without a loud volume spike.
  */


  const lower =
    Math.cos(
      value *
      Math.PI /
      2
    );


  const upper =
    Math.sin(
      value *
      Math.PI /
      2
    );


  return {
    lower,
    upper
  };
}


/* =========================================================
   ENGINE TARGET MIX
========================================================= */

function calculateEngineTargets(
  rpmPercent,
  speed
) {

  const layerCount =
    engineLayers.length;


  /*
    RPM 0.0 -> layer 0
    RPM 1.0 -> layer 5

    Values between those positions are blended.
  */

  const enginePosition =
    clamp(
      rpmPercent,
      0,
      0.9999
    )
    *
    (
      layerCount -
      1
    );


  const lowerIndex =
    Math.floor(
      enginePosition
    );


  const upperIndex =
    Math.min(

      layerCount -
      1,

      lowerIndex +
      1

    );


  const blend =
    enginePosition -
    lowerIndex;


  const fade =
    equalPowerFade(
      blend
    );


  /*
    Reset every layer.

    Only the neighboring two will receive volume.
  */

  for (
    const layer
    of engineLayers
  ) {

    layer.targetGain =
      0;
  }


  const masterVolume =
    raceAudioEnabled
    ?
    (
      speed <
      3
      ?
      ENGINE_IDLE_VOLUME
      :
      ENGINE_MASTER_VOLUME
    )
    :
    0;


  engineLayers[
    lowerIndex
  ].targetGain =
    fade.lower *
    masterVolume;


  engineLayers[
    upperIndex
  ].targetGain =
    Math.max(

      engineLayers[
        upperIndex
      ].targetGain,

      fade.upper *
      masterVolume

    );


  /*
    Tiny pitch motion INSIDE each RPM band.

    Nothing like the huge pitch sweeps from the
    original bee engine.
  */

  const localRate =
    MIN_PLAYBACK_RATE
    +
    blend
    *
    (
      MAX_PLAYBACK_RATE -
      MIN_PLAYBACK_RATE
    );


  engineLayers[
    lowerIndex
  ].targetRate =
    localRate;


  engineLayers[
    upperIndex
  ].targetRate =
    localRate;
}


/* =========================================================
   APPLY ENGINE MIX
========================================================= */

function updateEngine(
  delta
) {

  const speed =
    getSpeed();


  const rpmPercent =
    getRPMPercent();


  calculateEngineTargets(
    rpmPercent,
    speed
  );


  for (
    const layer
    of engineLayers
  ) {

    /*
      Smooth volume ramp.

      NO sudden:

      volume = 0.4

      from one frame to the next.
    */


    layer.currentGain =
      expSmooth(

        layer.currentGain,

        layer.targetGain,

        ENGINE_FADE_SPEED,

        delta

      );


    /*
      Browser volume range must be 0-1.
    */

    layer.audio.volume =
      clamp(

        layer.currentGain,

        0,

        1

      );


    layer.audio.playbackRate =
      expSmooth(

        layer.audio.playbackRate,

        layer.targetRate,

        3.5,

        delta

      );

  }
}


/* =========================================================
   GEAR CHANGE
========================================================= */

function updateGear() {

  const gear =
    gearEl?.textContent
    ??
    "1";


  if (
    gear !==
    previousGear
  ) {

    /*
      We no longer lower the ENGINE VOLUME here.

      That old shiftDip was another thing capable of making
      audible abrupt transitions.

      The game's RPM bar already drops when the gear ratio
      changes, so the engine mixer will naturally move down
      the RPM samples and climb back up.
    */


    previousGear =
      gear;
  }
}


/* =========================================================
   SKID
========================================================= */

function updateSkid(
  delta
) {

  const speed =
    getSpeed();


  const active =
    raceAudioEnabled
    &&
    skidHeld
    &&
    speed >
    20;


  const targetVolume =
    active
    ?
    clamp(

      (
        speed -
        20
      )
      /
      100,

      0.08,

      0.35

    )
    :
    0;


  skidSound.volume =
    expSmooth(

      skidSound.volume,

      targetVolume,

      active
      ?
      6
      :
      4,

      delta

    );


  const targetRate =
    0.86
    +
    clamp(
      speed /
      160,
      0,
      1
    )
    *
    0.24;


  skidSound.playbackRate =
    expSmooth(

      skidSound.playbackRate,

      targetRate,

      3,

      delta

    );
}


/* =========================================================
   WIND
========================================================= */

function updateWind(
  delta
) {

  const speed =
    getSpeed();


  let targetVolume =
    clamp(

      (
        speed -
        35
      )
      /
      130,

      0,

      0.18

    );


  if (
    nitroHeld
    &&
    speed >
    20
  ) {

    targetVolume +=
      0.09;
  }


  if (
    !raceAudioEnabled
  ) {

    targetVolume =
      0;
  }


  windSound.volume =
    expSmooth(

      windSound.volume,

      clamp(
        targetVolume,
        0,
        0.28
      ),

      3.5,

      delta

    );


  const targetRate =
    0.92
    +
    clamp(
      speed /
      180,
      0,
      1
    )
    *
    0.24;


  windSound.playbackRate =
    expSmooth(

      windSound.playbackRate,

      targetRate,

      2.5,

      delta

    );
}


/* =========================================================
   CRASH
========================================================= */

function playCrash() {

  if (
    crashCooldown >
    0
  ) {

    return;
  }


  crashCooldown =
    0.22;


  const sound =
    createAudio(
      AUDIO.crash,
      false
    );


  sound.volume =
    0.48;


  sound.playbackRate =
    0.94
    +
    Math.random() *
    0.12;


  sound
    .play()
    .catch(
      () => {}
    );


  sound.addEventListener(

    "ended",

    () => {

      sound.src =
        "";

    },

    {
      once:
        true
    }

  );
}


/* =========================================================
   WATCH V8 CRASH POPUPS
========================================================= */

if (
  checkpointPopup
) {

  const observer =
    new MutationObserver(

      () => {

        const text =
          checkpointPopup
            .textContent
            .trim()
            .toUpperCase();


        if (
          text ===
          "CRASH"
          ||
          text ===
          "BARRIER HIT"
        ) {

          playCrash();
        }

      }

    );


  observer.observe(

    checkpointPopup,

    {
      childList:
        true,

      characterData:
        true,

      subtree:
        true
    }

  );
}


/* =========================================================
   MENU STATE
========================================================= */

function updateRaceState() {

  if (
    !menu
  ) {

    return;
  }


  const racing =
    menu.classList.contains(
      "hidden"
    );


  if (
    !racing
  ) {

    raceAudioEnabled =
      false;
  }
}


/* =========================================================
   PAGE VISIBILITY
========================================================= */

document.addEventListener(

  "visibilitychange",

  () => {

    if (
      document.hidden
    ) {

      for (
        const layer
        of engineLayers
      ) {

        layer.currentGain =
          0;


        layer.targetGain =
          0;


        layer.audio.volume =
          0;
      }


      skidSound.volume =
        0;


      windSound.volume =
        0;
    }

  }

);


/* =========================================================
   AUDIO LOOP
========================================================= */

function audioLoop(
  now
) {

  requestAnimationFrame(
    audioLoop
  );


  const delta =
    Math.min(

      (
        now -
        previousTime
      )
      /
      1000,

      0.05

    );


  previousTime =
    now;


  crashCooldown =
    Math.max(

      0,

      crashCooldown -
      delta

    );


  updateRaceState();

  updateGear();

  updateEngine(
    delta
  );

  updateSkid(
    delta
  );

  updateWind(
    delta
  );
}


requestAnimationFrame(
  audioLoop
);
