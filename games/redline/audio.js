/* =========================================================
   REDLINE V10 AUDIO
   Single-voice RPM engine system

   IMPORTANT:
   - No granular engine
   - No six-layer engine stack
   - Only ONE steady engine loop is audible at a time
   - Idle uses a real steady idle recording
   - 1000 RPM and 2000 RPM use real steady loop recordings
   - Above 2000 RPM, the 2000 RPM loop is pitch-shifted smoothly
   - Loop changes use a short fade-out -> swap -> fade-in
     instead of overlapping two engine loops
========================================================= */

const startBtn = document.getElementById("startBtn");
const menu = document.getElementById("menu");
const rpmBar = document.getElementById("rpmBar");
const gearEl = document.getElementById("gear");

const FILES = {
  idle: "./assets/audio/engine-idle.wav",
  rpm1000: "./assets/audio/engine-1000.wav",
  rpm2000: "./assets/audio/engine-2000.wav",
  startup: "./assets/audio/engine-start.wav"
};

const BASE_RPM = {
  idle: 900,
  rpm1000: 1000,
  rpm2000: 2000
};

let audioContext = null;
let masterGain = null;
let engineGain = null;
let startupGain = null;

let buffers = {};
let source = null;
let currentBand = null;
let pendingBand = null;
let swapTimer = null;

let audioReady = false;
let raceEnabled = false;
let starting = false;

let smoothedRPM = 900;
let lastGear = "1";
let shiftDrop = 0;

const prefetched = {};
for (const [key, url] of Object.entries(FILES)) {
  prefetched[key] = fetch(url)
    .then(r => {
      if (!r.ok) throw new Error(`Failed to load ${url}: ${r.status}`);
      return r.arrayBuffer();
    })
    .catch(err => {
      console.error(err);
      return null;
    });
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function getGameRPM() {
  const raw = rpmBar?.style?.width || "";
  if (raw.includes("%")) {
    const pct = parseFloat(raw);
    if (Number.isFinite(pct)) {
      return clamp((pct / 100) * 7600, 900, 7600);
    }
  }
  return 900;
}

function getGear() {
  return gearEl?.textContent?.trim() || "1";
}

function chooseBand(rpm) {
  if (rpm < 1150) return "idle";
  if (rpm < 1850) return "rpm1000";
  return "rpm2000";
}

function bandPlaybackRate(band, rpm) {
  const base = BASE_RPM[band] || 1000;

  // Keep pitch variation reasonable for the lower bands.
  // The 2000 RPM recording carries the upper range.
  if (band === "idle") {
    return clamp(rpm / base, 0.90, 1.18);
  }

  if (band === "rpm1000") {
    return clamp(rpm / base, 0.92, 1.55);
  }

  return clamp(rpm / base, 0.92, 3.35);
}

async function initAudio() {
  if (audioReady) {
    if (audioContext?.state === "suspended") {
      await audioContext.resume();
    }
    return true;
  }

  audioContext = new (window.AudioContext || window.webkitAudioContext)();

  masterGain = audioContext.createGain();
  masterGain.gain.value = 0.82;
  masterGain.connect(audioContext.destination);

  engineGain = audioContext.createGain();
  engineGain.gain.value = 0;
  engineGain.connect(masterGain);

  startupGain = audioContext.createGain();
  startupGain.gain.value = 0.72;
  startupGain.connect(masterGain);

  for (const key of Object.keys(FILES)) {
    const data = await prefetched[key];
    if (!data) continue;
    buffers[key] = await audioContext.decodeAudioData(data.slice(0));
  }

  if (!buffers.idle || !buffers.rpm1000 || !buffers.rpm2000) {
    console.error("REDLINE audio: one or more engine loops failed to load.");
    return false;
  }

  audioReady = true;
  return true;
}

function stopCurrentSource() {
  if (!source) return;

  try {
    source.stop();
  } catch {}

  try {
    source.disconnect();
  } catch {}

  source = null;
}

function startBandImmediately(band, rpm) {
  stopCurrentSource();

  const buffer = buffers[band];
  if (!buffer || !audioContext) return;

  const node = audioContext.createBufferSource();
  node.buffer = buffer;
  node.loop = true;
  node.playbackRate.value = bandPlaybackRate(band, rpm);
  node.connect(engineGain);

  // Start slightly into the loop so we're not relying on a possibly
  // noisy first sample. The file itself still loops using its intended seam.
  const offset = Math.min(0.08, Math.max(0, buffer.duration - 0.02));
  node.start(0, offset);

  source = node;
  currentBand = band;
}

function swapBand(band, rpm) {
  if (!audioReady || !raceEnabled || !engineGain) return;
  if (band === currentBand || band === pendingBand) return;

  pendingBand = band;

  if (swapTimer) {
    clearTimeout(swapTimer);
    swapTimer = null;
  }

  const now = audioContext.currentTime;

  // No engine overlap:
  // fade the current loop fully to zero first.
  engineGain.gain.cancelScheduledValues(now);
  engineGain.gain.setValueAtTime(engineGain.gain.value, now);
  engineGain.gain.linearRampToValueAtTime(0.0001, now + 0.055);

  swapTimer = setTimeout(() => {
    if (!raceEnabled) {
      pendingBand = null;
      return;
    }

    startBandImmediately(band, rpm);

    const t = audioContext.currentTime;
    engineGain.gain.cancelScheduledValues(t);
    engineGain.gain.setValueAtTime(0.0001, t);
    engineGain.gain.linearRampToValueAtTime(0.50, t + 0.070);

    pendingBand = null;
    swapTimer = null;
  }, 62);
}

function playStartup() {
  if (!buffers.startup || !audioContext) return;

  const node = audioContext.createBufferSource();
  node.buffer = buffers.startup;
  node.connect(startupGain);
  node.start();
}

async function startRaceAudio() {
  const ok = await initAudio();
  if (!ok) return;

  raceEnabled = true;
  starting = true;
  smoothedRPM = 900;
  lastGear = getGear();
  shiftDrop = 0;

  playStartup();

  // Keep the engine quiet for the first part of the startup recording,
  // then bring in the actual steady idle loop.
  engineGain.gain.cancelScheduledValues(audioContext.currentTime);
  engineGain.gain.setValueAtTime(0.0001, audioContext.currentTime);

  setTimeout(() => {
    if (!raceEnabled) return;

    startBandImmediately("idle", 900);

    const now = audioContext.currentTime;
    engineGain.gain.cancelScheduledValues(now);
    engineGain.gain.setValueAtTime(0.0001, now);
    engineGain.gain.linearRampToValueAtTime(0.42, now + 0.20);

    starting = false;
  }, 650);
}

function stopRaceAudio() {
  raceEnabled = false;

  if (!audioReady || !engineGain || !audioContext) return;

  const now = audioContext.currentTime;
  engineGain.gain.cancelScheduledValues(now);
  engineGain.gain.setValueAtTime(engineGain.gain.value, now);
  engineGain.gain.linearRampToValueAtTime(0.0001, now + 0.12);

  setTimeout(() => {
    stopCurrentSource();
    currentBand = null;
    pendingBand = null;
  }, 150);
}

startBtn?.addEventListener("click", () => {
  startRaceAudio().catch(console.error);
});

document.addEventListener("visibilitychange", () => {
  if (!audioContext) return;

  if (document.hidden) {
    audioContext.suspend().catch(() => {});
  } else if (raceEnabled) {
    audioContext.resume().catch(() => {});
  }
});

let previousTime = performance.now();

function audioLoop(nowMs) {
  requestAnimationFrame(audioLoop);

  const dt = Math.min((nowMs - previousTime) / 1000, 0.05);
  previousTime = nowMs;

  if (!audioReady) return;

  const menuVisible = !menu?.classList.contains("hidden");

  if (menuVisible && raceEnabled) {
    stopRaceAudio();
    return;
  }

  if (!raceEnabled || starting || !source) return;

  const gear = getGear();

  if (gear !== lastGear && gear !== "R") {
    // Give every upshift a brief RPM fall instead of lowering engine volume.
    shiftDrop = 1050;
  }

  lastGear = gear;

  shiftDrop = Math.max(0, shiftDrop - 4300 * dt);

  const rawRPM = getGameRPM();

  const targetRPM = Math.max(
    900,
    rawRPM - shiftDrop
  );

  // Smooth the RPM itself so playbackRate doesn't chatter frame-to-frame.
  const smoothing = 1 - Math.exp(-7.5 * dt);
  smoothedRPM += (targetRPM - smoothedRPM) * smoothing;

  const wantedBand = chooseBand(smoothedRPM);

  if (wantedBand !== currentBand && !pendingBand) {
    swapBand(wantedBand, smoothedRPM);
    return;
  }

  if (source && currentBand) {
    const rate = bandPlaybackRate(currentBand, smoothedRPM);

    // Web Audio automation gives us smooth continuous revs.
    const t = audioContext.currentTime;
    source.playbackRate.cancelScheduledValues(t);
    source.playbackRate.setTargetAtTime(rate, t, 0.035);
  }
}

requestAnimationFrame(audioLoop);
