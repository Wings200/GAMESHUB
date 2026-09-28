/* =========================================================
   REDLINE V9.2 AUDIO
   Local seamless engine loops + Web Audio RPM system

   Put this file at:
   games/redline/audio.js

   Put the supplied .ogg files at:
   games/redline/assets/audio/
========================================================= */

const startBtn = document.getElementById("startBtn");
const menu = document.getElementById("menu");
const speedEl = document.getElementById("speed");
const gearEl = document.getElementById("gear");
const checkpointPopup = document.getElementById("checkpointPopup");

const ENGINE_FILES = [
  "./assets/audio/engine-idle.ogg",
  "./assets/audio/engine-low.ogg",
  "./assets/audio/engine-mid.ogg",
  "./assets/audio/engine-high.ogg"
];

const START_FILE = "./assets/audio/engine-start.ogg";

// Keep these existing effects for now.
const EFFECTS = {
  skid: "https://opengameart.org/sites/default/files/tires_squal_loop.wav",
  crash: "https://opengameart.org/sites/default/files/qubodup-crash.ogg",
  wind: "https://opengameart.org/sites/default/files/wind%20woosh%20loop.ogg"
};

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function expSmooth(current, target, speed, dt) {
  return current + (target - current) * (1 - Math.exp(-speed * dt));
}

function getSpeed() {
  const value = Number(speedEl?.textContent);
  return Number.isFinite(value) ? value : 0;
}

function getGear() {
  const raw = gearEl?.textContent?.trim() ?? "1";
  if (raw === "R") return -1;
  const value = Number(raw);
  return Number.isFinite(value) ? clamp(value, 1, 6) : 1;
}

/* =========================================================
   INPUT
========================================================= */

let throttleHeld = false;
let brakeHeld = false;
let handbrakeHeld = false;
let nitroHeld = false;

window.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();

  if (key === "w" || key === "arrowup") throttleHeld = true;
  if (key === "s" || key === "arrowdown") brakeHeld = true;
  if (key === " ") handbrakeHeld = true;
  if (key === "shift") nitroHeld = true;
});

window.addEventListener("keyup", event => {
  const key = event.key.toLowerCase();

  if (key === "w" || key === "arrowup") throttleHeld = false;
  if (key === "s" || key === "arrowdown") brakeHeld = false;
  if (key === " ") handbrakeHeld = false;
  if (key === "shift") nitroHeld = false;
});

window.addEventListener("blur", () => {
  throttleHeld = false;
  brakeHeld = false;
  handbrakeHeld = false;
  nitroHeld = false;
});

/* =========================================================
   WEB AUDIO ENGINE
========================================================= */

let context = null;
let engineMaster = null;
let engineBuffers = [];
let engineSources = [];
let engineGains = [];
let startBuffer = null;

let initialized = false;
let raceAudioEnabled = false;

let virtualRPM = 0.12;
let previousGear = 1;
let lastFrame = performance.now();

/*
  These are normalized RPM centers for the four supplied
  engine recordings.
*/
const RPM_CENTERS = [
  0.10,
  0.38,
  0.66,
  0.92
];

/*
  Approximate road-speed ranges for each gear.

  This intentionally does NOT use the old game.js RPM formula,
  because that formula never reaches a convincing redline.
*/
const GEAR_RANGES = {
  1: [0, 24],
  2: [17, 43],
  3: [33, 64],
  4: [52, 86],
  5: [72, 110],
  6: [94, 165]
};

async function loadBuffer(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Audio load failed: ${url}`);
  }

  const bytes = await response.arrayBuffer();
  return await context.decodeAudioData(bytes);
}

async function initializeAudio() {
  if (initialized) {
    await context?.resume();
    return;
  }

  initialized = true;

  context = new (window.AudioContext || window.webkitAudioContext)({
    latencyHint: "interactive"
  });

  await context.resume();

  engineMaster = context.createGain();
  engineMaster.gain.value = 0;
  engineMaster.connect(context.destination);

  try {
    const loaded = await Promise.all([
      ...ENGINE_FILES.map(loadBuffer),
      loadBuffer(START_FILE)
    ]);

    engineBuffers = loaded.slice(0, ENGINE_FILES.length);
    startBuffer = loaded[loaded.length - 1];

    const startAt = context.currentTime + 0.05;

    engineBuffers.forEach((buffer, index) => {
      const source = context.createBufferSource();
      const gain = context.createGain();

      source.buffer = buffer;
      source.loop = true;

      gain.gain.value = 0;

      source.connect(gain);
      gain.connect(engineMaster);

      /*
        All layers start once and remain running.
        RPM changes only move GainNodes and playbackRate.
        Nothing is repeatedly stopped/restarted.
      */
      source.start(startAt);

      engineSources[index] = source;
      engineGains[index] = gain;
    });
  }
  catch (error) {
    console.error("REDLINE engine audio failed to load:", error);
  }
}

function playStartup() {
  if (!context || !startBuffer) return;

  const source = context.createBufferSource();
  const gain = context.createGain();

  source.buffer = startBuffer;

  gain.gain.setValueAtTime(0, context.currentTime);
  gain.gain.linearRampToValueAtTime(0.28, context.currentTime + 0.05);
  gain.gain.setValueAtTime(0.28, context.currentTime + 2.7);
  gain.gain.linearRampToValueAtTime(0, context.currentTime + 4.0);

  source.connect(gain);
  gain.connect(context.destination);

  source.start();
}

function calculateTargetRPM(speed, gear) {
  if (gear < 0) {
    return clamp(0.20 + speed / 45 * 0.42, 0.18, 0.62);
  }

  if (speed < 1.5 && !throttleHeld) {
    return 0.11;
  }

  const [lowSpeed, highSpeed] = GEAR_RANGES[gear];

  const gearProgress = clamp(
    (speed - lowSpeed) / Math.max(1, highSpeed - lowSpeed),
    0,
    1
  );

  /*
    Each gear now audibly climbs from low RPM toward redline.
    When the game shifts up, the next gear starts lower and
    the RPM sound drops before climbing again.
  */
  let rpm = 0.28 + gearProgress * 0.68;

  if (speed < 4 && throttleHeld) {
    rpm = Math.max(rpm, 0.32);
  }

  if (nitroHeld && speed > 5) {
    rpm += 0.045;
  }

  return clamp(rpm, 0.10, 0.98);
}

function findRPMPair(rpm) {
  if (rpm <= RPM_CENTERS[0]) {
    return { lower: 0, upper: 0, blend: 0 };
  }

  for (let i = 0; i < RPM_CENTERS.length - 1; i++) {
    const a = RPM_CENTERS[i];
    const b = RPM_CENTERS[i + 1];

    if (rpm <= b) {
      return {
        lower: i,
        upper: i + 1,
        blend: clamp((rpm - a) / (b - a), 0, 1)
      };
    }
  }

  const last = RPM_CENTERS.length - 1;
  return { lower: last, upper: last, blend: 0 };
}

function updateEngine(dt) {
  if (!context || !engineMaster || !engineSources.length) return;

  const speed = getSpeed();
  const gear = getGear();

  const targetRPM = calculateTargetRPM(speed, gear);

  /*
    Make the shift drop immediately noticeable, while keeping
    the actual pitch movement smooth.
  */
  if (gear !== previousGear && gear > previousGear && previousGear > 0) {
    virtualRPM = Math.max(0.22, virtualRPM - 0.18);
  }

  previousGear = gear;

  virtualRPM = expSmooth(
    virtualRPM,
    targetRPM,
    throttleHeld ? 6.5 : 8.0,
    dt
  );

  const pair = findRPMPair(virtualRPM);

  /*
    Equal-power crossfade between only TWO neighboring loops.
  */
  const angle = pair.blend * Math.PI * 0.5;
  const lowerWeight = Math.cos(angle);
  const upperWeight = Math.sin(angle);

  const baseVolume = !raceAudioEnabled
    ? 0
    : speed < 2 && !throttleHeld
      ? 0.23
      : throttleHeld
        ? 0.43
        : 0.30;

  const now = context.currentTime;

  engineMaster.gain.setTargetAtTime(
    baseVolume,
    now,
    0.055
  );

  for (let i = 0; i < engineGains.length; i++) {
    let weight = 0;

    if (i === pair.lower) {
      weight = lowerWeight;
    }

    if (i === pair.upper) {
      weight = Math.max(weight, upperWeight);
    }

    /*
      GainNode smoothing avoids frame-step volume jumps.
    */
    engineGains[i].gain.setTargetAtTime(
      weight,
      now,
      0.045
    );

    /*
      Small continuous pitch movement INSIDE an RPM region.
      This produces real audible revving instead of waiting
      for a sample switch.
    */
    const center = RPM_CENTERS[i];
    const relative = clamp(
      (virtualRPM - center) / 0.28,
      -1,
      1
    );

    const targetRate = clamp(
      1 + relative * 0.13,
      0.86,
      1.15
    );

    engineSources[i].playbackRate.setTargetAtTime(
      targetRate,
      now,
      0.055
    );
  }
}

/* =========================================================
   EXISTING EFFECT AUDIO
========================================================= */

function createHTMLAudio(url, loop = false) {
  const audio = new Audio(url);
  audio.preload = "auto";
  audio.loop = loop;
  audio.volume = 0;
  audio.playsInline = true;
  return audio;
}

const skidSound = createHTMLAudio(EFFECTS.skid, true);
const windSound = createHTMLAudio(EFFECTS.wind, true);

let crashCooldown = 0;

async function startEffectLoops() {
  skidSound.volume = 0;
  windSound.volume = 0;

  skidSound.play().catch(() => {});
  windSound.play().catch(() => {});
}

function updateEffectAudio(dt) {
  const speed = getSpeed();

  const skidTarget =
    raceAudioEnabled &&
    handbrakeHeld &&
    speed > 18
      ? clamp((speed - 18) / 100, 0.07, 0.30)
      : 0;

  skidSound.volume = expSmooth(
    skidSound.volume,
    skidTarget,
    skidTarget > 0 ? 6 : 4,
    dt
  );

  skidSound.playbackRate = expSmooth(
    skidSound.playbackRate,
    0.88 + clamp(speed / 160, 0, 1) * 0.22,
    3,
    dt
  );

  let windTarget = clamp(
    (speed - 35) / 145,
    0,
    0.16
  );

  if (nitroHeld && speed > 20) {
    windTarget += 0.07;
  }

  if (!raceAudioEnabled) {
    windTarget = 0;
  }

  windSound.volume = expSmooth(
    windSound.volume,
    clamp(windTarget, 0, 0.23),
    3,
    dt
  );
}

function playCrash() {
  if (crashCooldown > 0) return;

  crashCooldown = 0.22;

  const sound = createHTMLAudio(EFFECTS.crash);

  sound.volume = 0.48;
  sound.playbackRate = 0.94 + Math.random() * 0.12;

  sound.play().catch(() => {});
}

if (checkpointPopup) {
  const observer = new MutationObserver(() => {
    const text = checkpointPopup.textContent.trim().toUpperCase();

    if (text === "CRASH" || text === "BARRIER HIT") {
      playCrash();
    }
  });

  observer.observe(checkpointPopup, {
    childList: true,
    characterData: true,
    subtree: true
  });
}

/* =========================================================
   RACE START
========================================================= */

startBtn?.addEventListener("click", async () => {
  await initializeAudio();
  await startEffectLoops();

  raceAudioEnabled = true;

  playStartup();
});

/* =========================================================
   VISIBILITY
========================================================= */

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    context?.resume();
    return;
  }

  if (engineMaster && context) {
    engineMaster.gain.setTargetAtTime(
      0,
      context.currentTime,
      0.02
    );
  }

  skidSound.volume = 0;
  windSound.volume = 0;
});

/* =========================================================
   LOOP
========================================================= */

function audioFrame(now) {
  requestAnimationFrame(audioFrame);

  const dt = Math.min(
    (now - lastFrame) / 1000,
    0.05
  );

  lastFrame = now;

  const racing =
    menu?.classList.contains("hidden") ?? false;

  if (!racing) {
    raceAudioEnabled = false;
  }

  crashCooldown = Math.max(
    0,
    crashCooldown - dt
  );

  updateEngine(dt);
  updateEffectAudio(dt);
}

requestAnimationFrame(audioFrame);
