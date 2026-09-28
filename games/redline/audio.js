/* =========================================================
   REDLINE V9 AUDIO

   Real sampled engine audio.
   No oscillators.
   No bee simulator.

   Audio sources:
   - OpenGameArt CC0 engine loops
   - OpenGameArt CC0 engine startup
   - OpenGameArt CC0 crash
   - OpenGameArt CC0 wind
   - OpenGameArt CC-BY tire skid
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

const checkpointPopup =
  document.getElementById("checkpointPopup");


/* =========================================================
   AUDIO URLS
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
   STATE
========================================================= */

let audioStarted =
  false;

let raceAudioEnabled =
  false;

let shiftDip =
  1;

let previousGear =
  "1";

let crashCooldown =
  0;

let skidHeld =
  false;

let nitroHeld =
  false;


/* =========================================================
   AUDIO CREATOR
========================================================= */

function createAudio(
  url,
  loop = false
) {

  const audio =
    new Audio(
      url
    );


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
    url => {

      const audio =
        createAudio(
          url,
          true
        );


      audio.playbackRate =
        1;


      return audio;

    }
  );


/* =========================================================
   OTHER SOUNDS
========================================================= */

const startupSound =
  createAudio(
    AUDIO.startup,
    false
  );


startupSound.volume =
  0.48;


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


/* =========================================================
   AUDIO HELPERS
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


function smooth(
  current,
  target,
  amount
) {

  return current
    +
    (
      target -
      current
    )
    *
    amount;
}


function getSpeed() {

  const value =
    Number(
      speedEl?.textContent
    );


  if (
    Number.isFinite(
      value
    )
  ) {

    return value;
  }


  return 0;
}


/* =========================================================
   START ALL LOOPING AUDIO
========================================================= */

async function startAudioSystem() {

  if (
    audioStarted
  ) {

    return;
  }


  audioStarted =
    true;


  const playPromises =
    [];


  for (
    const layer
    of engineLayers
  ) {

    layer.volume =
      0;


    const promise =
      layer.play();


    if (
      promise
    ) {

      playPromises.push(
        promise.catch(
          () => {}
        )
      );
    }

  }


  skidSound.volume =
    0;


  windSound.volume =
    0;


  playPromises.push(

    skidSound
      .play()
      .catch(
        () => {}
      )

  );


  playPromises.push(

    windSound
      .play()
      .catch(
        () => {}
      )

  );


  await Promise.all(
    playPromises
  );


  startupSound.currentTime =
    0;


  startupSound
    .play()
    .catch(
      () => {}
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
   INPUT TRACKING
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
   ENGINE MIXING
========================================================= */

const ENGINE_CENTERS = [

  0,

  22,

  48,

  75,

  108,

  145

];


function engineWeight(
  speed,
  center,
  width
) {

  return clamp(

    1
    -
    Math.abs(
      speed -
      center
    )
    /
    width,

    0,

    1

  );
}


function updateEngine(
  speed
) {

  /*
    The six recordings are already different pitches.

    Instead of stretching one sound from idle to redline,
    we crossfade through all six recordings.

    That is what keeps it from sounding like one
    pitch-shifted buzzing sample.
  */


  const throttle =
    speed >
    1;


  const totalVolume =
    raceAudioEnabled
    ?
    (
      throttle
      ?
      0.38
      :
      0.24
    )
    :
    0;


  const speedWidths = [

    30,

    34,

    36,

    40,

    44,

    52

  ];


  engineLayers.forEach(
    (
      layer,
      index
    ) => {

      let weight =
        engineWeight(

          speed,

          ENGINE_CENTERS[
            index
          ],

          speedWidths[
            index
          ]

        );


      /*
        Keep a little idle engine present.
      */

      if (
        index ===
        0
      ) {

        weight =
          Math.max(
            weight,
            speed <
            8
            ?
            0.75
            :
            0
          );
      }


      const targetVolume =
        weight
        *
        totalVolume
        *
        shiftDip;


      layer.volume =
        smooth(

          layer.volume,

          targetVolume,

          0.08

        );


      /*
        Very small playback-rate movement.

        We're NOT doing the old giant pitch sweep.
      */

      const localSpeed =
        clamp(

          (
            speed
            -
            ENGINE_CENTERS[
              index
            ]
            +
            25
          )
          /
          50,

          0,

          1

        );


      const targetRate =
        0.94
        +
        localSpeed *
        0.13;


      layer.playbackRate =
        smooth(

          layer.playbackRate,

          targetRate,

          0.05

        );

    }
  );
}


/* =========================================================
   GEAR SHIFT
========================================================= */

function updateGearShift() {

  const gear =
    gearEl?.textContent
    ??
    "1";


  if (
    gear !==
    previousGear
    &&
    gear !==
    "R"
  ) {

    shiftDip =
      0.40;


    setTimeout(
      () => {

        shiftDip =
          1;

      },
      105
    );
  }


  previousGear =
    gear;
}


/* =========================================================
   TIRE SQUEAL
========================================================= */

function updateSkid(
  speed
) {

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
      80,

      0.12,

      0.42

    )
    :
    0;


  skidSound.volume =
    smooth(

      skidSound.volume,

      targetVolume,

      active
      ?
      0.14
      :
      0.09

    );


  const targetRate =
    0.85
    +
    clamp(
      speed /
      150,
      0,
      1
    )
    *
    0.27;


  skidSound.playbackRate =
    smooth(

      skidSound.playbackRate,

      targetRate,

      0.08

    );
}


/* =========================================================
   WIND / SPEED
========================================================= */

function updateWind(
  speed
) {

  let target =
    clamp(

      (
        speed -
        35
      )
      /
      120,

      0,

      0.22

    );


  if (
    nitroHeld
    &&
    speed >
    20
  ) {

    target +=
      0.12;
  }


  if (
    !raceAudioEnabled
  ) {

    target =
      0;
  }


  windSound.volume =
    smooth(

      windSound.volume,

      target,

      0.06

    );


  windSound.playbackRate =
    0.92
    +
    clamp(
      speed /
      170,
      0,
      1
    )
    *
    0.28;
}


/* =========================================================
   CRASH AUDIO
========================================================= */

function playCrash() {

  if (
    crashCooldown >
    0
  ) {

    return;
  }


  crashCooldown =
    0.20;


  const sound =
    createAudio(
      AUDIO.crash,
      false
    );


  sound.volume =
    0.52;


  sound.playbackRate =
    0.91
    +
    Math.random() *
    0.16;


  sound
    .play()
    .catch(
      () => {}
    );


  sound.addEventListener(
    "ended",
    () => {

      sound.remove();

    }
  );
}


/* =========================================================
   WATCH EXISTING V8 COLLISION POPUP
========================================================= */

if (
  checkpointPopup
) {

  const observer =
    new MutationObserver(
      () => {

        const text =
          checkpointPopup.textContent
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
   MENU DETECTION
========================================================= */

function updateRaceState() {

  if (
    !menu
  ) {

    return;
  }


  /*
    Menu hidden = currently racing.
  */

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

      engineLayers.forEach(
        layer => {

          layer.volume =
            0;

        }
      );


      skidSound.volume =
        0;


      windSound.volume =
        0;
    }

  }
);


/* =========================================================
   MAIN AUDIO LOOP
========================================================= */

let previousTime =
  performance.now();


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

      0.1

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


  const speed =
    getSpeed();


  updateGearShift();

  updateEngine(
    speed
  );

  updateSkid(
    speed
  );

  updateWind(
    speed
  );
}


requestAnimationFrame(
  audioLoop
);
