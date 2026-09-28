/* =========================================================
   REDLINE V10.1 AUDIO
   Single-character engine system

   Fix:
   - Removes the obvious Idle -> 1000 RPM recording change.
   - Uses the SAME 1000 RPM recording for idle + low RPM.
   - The 1000 RPM sample is pitched slightly down at idle.
   - Only switches to the 2000 RPM recording higher in the rev range.
   - The high-RPM handoff is brief and pitch-matched.
========================================================= */

const startBtn = document.getElementById("startBtn");
const menu = document.getElementById("menu");
const rpmBar = document.getElementById("rpmBar");
const gearEl = document.getElementById("gear");

const FILES = {
  low: "./assets/audio/engine-1000.wav",
  high: "./assets/audio/engine-2000.wav",
  startup: "./assets/audio/engine-start.wav"
};

const BASE_RPM = {
  low: 1000,
  high: 2000
};

let ctx = null;
let masterGain = null;
let engineGain = null;
let startupGain = null;

let buffers = {};
let engineSource = null;

let currentBand = null;
let pendingBand = null;
let swapTimer = null;

let ready = false;
let raceEnabled = false;
let starting = false;

let smoothedRPM = 900;
let shiftDrop = 0;
let lastGear = "1";

const prefetched = {};

for (const [key, url] of Object.entries(FILES)) {
  prefetched[key] = fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load ${url}: ${response.status}`);
      }

      return response.arrayBuffer();
    })
    .catch(error => {
      console.error("REDLINE audio fetch error:", error);
      return null;
    });
}


/* =========================================================
   HELPERS
========================================================= */

function clamp(value, min, max) {
  return Math.max(
    min,
    Math.min(max, value)
  );
}


function getGameRPM() {
  const raw = rpmBar?.style?.width || "";

  if (raw.includes("%")) {
    const percent = parseFloat(raw);

    if (Number.isFinite(percent)) {
      return clamp(
        (percent / 100) * 7600,
        900,
        7600
      );
    }
  }

  return 900;
}


function getGear() {
  return gearEl?.textContent?.trim() || "1";
}


/* =========================================================
   ENGINE BANDS
========================================================= */

function chooseBand(rpm) {
  /*
    There is NO separate idle recording anymore.

    900 RPM idle:
      engine-1000.wav at about 0.90x speed

    Then it smoothly pitches upward.

    Only once we reach the higher RPM range do we
    switch to the 2000 RPM recording.
  */

  return rpm < 1900
    ? "low"
    : "high";
}


function getPlaybackRate(band, rpm) {
  if (band === "low") {
    /*
      900 RPM  = 0.90x
      1000 RPM = 1.00x
      1500 RPM = 1.50x
      1900 RPM = 1.90x
    */

    return clamp(
      rpm / BASE_RPM.low,
      0.88,
      1.90
    );
  }

  /*
    Around the crossover:

    1900 / 2000 = 0.95

    So the 2000 RPM recording comes in close to
    its natural pitch instead of sounding like
    a completely different engine.
  */

  return clamp(
    rpm / BASE_RPM.high,
    0.90,
    3.10
  );
}


/* =========================================================
   INITIALIZE AUDIO
========================================================= */

async function initAudio() {
  if (ready) {
    if (ctx?.state === "suspended") {
      await ctx.resume();
    }

    return true;
  }

  ctx = new (
    window.AudioContext ||
    window.webkitAudioContext
  )();


  masterGain = ctx.createGain();

  masterGain.gain.value = 0.82;

  masterGain.connect(
    ctx.destination
  );


  engineGain = ctx.createGain();

  engineGain.gain.value = 0;

  engineGain.connect(
    masterGain
  );


  startupGain = ctx.createGain();

  startupGain.gain.value = 0.68;

  startupGain.connect(
    masterGain
  );


  for (const key of Object.keys(FILES)) {
    const data = await prefetched[key];

    if (!data) {
      continue;
    }

    buffers[key] =
      await ctx.decodeAudioData(
        data.slice(0)
      );
  }


  if (
    !buffers.low ||
    !buffers.high
  ) {
    console.error(
      "REDLINE audio: required engine loops failed to load."
    );

    return false;
  }


  ready = true;

  return true;
}


/* =========================================================
   SOURCE CONTROL
========================================================= */

function stopEngineSource() {
  if (!engineSource) {
    return;
  }

  try {
    engineSource.stop();
  } catch {}

  try {
    engineSource.disconnect();
  } catch {}

  engineSource = null;
}


function startEngineSource(
  band,
  rpm,
  gain = 0.48
) {
  stopEngineSource();


  const buffer = buffers[band];

  if (
    !buffer ||
    !ctx
  ) {
    return;
  }


  const node =
    ctx.createBufferSource();


  node.buffer = buffer;

  node.loop = true;

  node.playbackRate.value =
    getPlaybackRate(
      band,
      rpm
    );


  node.connect(
    engineGain
  );


  /*
    Skip a tiny bit at the beginning so we don't
    rely on a potentially noisy first sample.
  */

  const offset =
    Math.min(
      0.06,
      Math.max(
        0,
        buffer.duration - 0.02
      )
    );


  node.start(
    0,
    offset
  );


  engineSource = node;

  currentBand = band;


  const now =
    ctx.currentTime;


  engineGain.gain.cancelScheduledValues(
    now
  );


  engineGain.gain.setValueAtTime(
    0.0001,
    now
  );


  engineGain.gain.linearRampToValueAtTime(
    gain,
    now + 0.10
  );
}


/* =========================================================
   BAND SWITCHING
========================================================= */

function swapEngineBand(
  newBand,
  rpm
) {
  if (
    !ready ||
    !raceEnabled ||
    !ctx ||
    !engineGain
  ) {
    return;
  }


  if (
    newBand === currentBand ||
    newBand === pendingBand
  ) {
    return;
  }


  pendingBand =
    newBand;


  if (swapTimer) {
    clearTimeout(
      swapTimer
    );

    swapTimer = null;
  }


  /*
    We intentionally do NOT keep two engine loops
    fully audible at once.

    Fade old engine almost completely out,
    switch samples,
    then fade the new engine in.

    Very short gap, but no ugly stacked-engine sound.
  */

  const now =
    ctx.currentTime;


  engineGain.gain.cancelScheduledValues(
    now
  );


  engineGain.gain.setValueAtTime(
    engineGain.gain.value,
    now
  );


  engineGain.gain.linearRampToValueAtTime(
    0.0001,
    now + 0.045
  );


  swapTimer =
    setTimeout(
      () => {
        if (!raceEnabled) {
          pendingBand = null;
          return;
        }


        startEngineSource(
          newBand,
          rpm,
          0.48
        );


        pendingBand = null;

        swapTimer = null;
      },

      50
    );
}


/* =========================================================
   STARTUP SOUND
========================================================= */

function playStartup() {
  if (
    !buffers.startup ||
    !ctx
  ) {
    return;
  }


  const source =
    ctx.createBufferSource();


  source.buffer =
    buffers.startup;


  source.connect(
    startupGain
  );


  source.start();
}


/* =========================================================
   START RACE AUDIO
========================================================= */

async function startRaceAudio() {
  const ok =
    await initAudio();


  if (!ok) {
    return;
  }


  raceEnabled = true;

  starting = true;


  smoothedRPM = 900;

  shiftDrop = 0;

  lastGear = getGear();


  playStartup();


  const now =
    ctx.currentTime;


  engineGain.gain.cancelScheduledValues(
    now
  );


  engineGain.gain.setValueAtTime(
    0.0001,
    now
  );


  /*
    Bring in the SAME low RPM recording used while driving.

    No separate idle sample anymore.
  */

  setTimeout(
    () => {
      if (!raceEnabled) {
        return;
      }


      startEngineSource(
        "low",
        900,
        0.42
      );


      starting = false;
    },

    620
  );
}


/* =========================================================
   STOP RACE AUDIO
========================================================= */

function stopRaceAudio() {
  raceEnabled = false;


  if (
    !ready ||
    !ctx ||
    !engineGain
  ) {
    return;
  }


  if (swapTimer) {
    clearTimeout(
      swapTimer
    );

    swapTimer = null;
  }


  pendingBand = null;


  const now =
    ctx.currentTime;


  engineGain.gain.cancelScheduledValues(
    now
  );


  engineGain.gain.setValueAtTime(
    engineGain.gain.value,
    now
  );


  engineGain.gain.linearRampToValueAtTime(
    0.0001,
    now + 0.12
  );


  setTimeout(
    () => {
      stopEngineSource();

      currentBand = null;
    },

    150
  );
}


/* =========================================================
   START BUTTON
========================================================= */

startBtn?.addEventListener(
  "click",
  () => {
    startRaceAudio()
      .catch(
        console.error
      );
  }
);


/* =========================================================
   VISIBILITY
========================================================= */

document.addEventListener(
  "visibilitychange",
  () => {
    if (!ctx) {
      return;
    }


    if (document.hidden) {
      ctx.suspend()
        .catch(() => {});
    }

    else if (raceEnabled) {
      ctx.resume()
        .catch(() => {});
    }
  }
);


/* =========================================================
   MAIN AUDIO LOOP
========================================================= */

let previousTime =
  performance.now();


function audioLoop(
  nowMs
) {
  requestAnimationFrame(
    audioLoop
  );


  const delta =
    Math.min(

      (
        nowMs -
        previousTime
      )
      /
      1000,

      0.05

    );


  previousTime =
    nowMs;


  if (!ready) {
    return;
  }


  const menuVisible =
    !menu?.classList.contains(
      "hidden"
    );


  if (
    menuVisible &&
    raceEnabled
  ) {
    stopRaceAudio();

    return;
  }


  if (
    !raceEnabled ||
    starting ||
    !engineSource
  ) {
    return;
  }


  /* =======================================================
     GEAR SHIFT
  ======================================================= */

  const gear =
    getGear();


  if (
    gear !== lastGear &&
    gear !== "R"
  ) {
    /*
      Simulate the RPM falling when the transmission shifts.

      No volume cut.
      The actual engine pitch falls.
    */

    shiftDrop = 900;
  }


  lastGear = gear;


  shiftDrop =
    Math.max(

      0,

      shiftDrop -
      3900 *
      delta

    );


  /* =======================================================
     RPM
  ======================================================= */

  const rawRPM =
    getGameRPM();


  const targetRPM =
    Math.max(

      900,

      rawRPM -
      shiftDrop

    );


  /*
    Smooth the RPM so pitch doesn't jitter frame-to-frame.
  */

  const smoothing =
    1
    -
    Math.exp(
      -7 *
      delta
    );


  smoothedRPM +=
    (
      targetRPM -
      smoothedRPM
    )
    *
    smoothing;


  /* =======================================================
     SELECT RECORDING
  ======================================================= */

  const wantedBand =
    chooseBand(
      smoothedRPM
    );


  if (
    wantedBand !== currentBand &&
    !pendingBand
  ) {
    swapEngineBand(
      wantedBand,
      smoothedRPM
    );

    return;
  }


  /* =======================================================
     REV ENGINE
  ======================================================= */

  if (
    engineSource &&
    currentBand
  ) {
    const targetRate =
      getPlaybackRate(
        currentBand,
        smoothedRPM
      );


    const now =
      ctx.currentTime;


    engineSource.playbackRate
      .cancelScheduledValues(
        now
      );


    /*
      This is the actual revving.

      Playback rate continuously rises and falls
      with the game's RPM.
    */

    engineSource.playbackRate
      .setTargetAtTime(

        targetRate,

        now,

        0.045

      );
  }
}


/* =========================================================
   START AUDIO LOOP
========================================================= */

requestAnimationFrame(
  audioLoop
);
