/* REDLINE V11 — seamless sampled engine and car-specific driving SFX.
   Existing volume controls and startup sample remain compatible. */
import { createRedlineSoundscape } from "./audio-v11-soundscape.js?v=nitro-fix-v11-2";
import { createV13EnginePreview } from "./engine-v13-clean-preview.js?v=clean-rpm-v13";
const USE_V13_CLEAN_PREVIEW =
  new URLSearchParams(window.location.search).get("engine")==="v13";
// Retired V12 outdoor field audio. ?engine=v12 now uses safe V11.2
// rather than starting a recording with crowd voices.

const startBtn =
  document.getElementById(
    "startBtn"
  );

const menu =
  document.getElementById(
    "menu"
  );

const rpmBar =
  document.getElementById(
    "rpmBar"
  );

const gearEl =
  document.getElementById(
    "gear"
  );


/* =========================================================
   FILES
========================================================= */

const FILES = {

  low:
    "./assets/audio/engine-1000.wav",

  high:
    "./assets/audio/engine-2000.wav",

  startup:
    "./assets/audio/engine-start.wav"

};


const BASE_RPM = {

  low:
    1000,

  high:
    2000

};


/* =========================================================
   SAVED AUDIO SETTINGS
========================================================= */

const AUDIO_SETTINGS_KEY =
  "redline_audio_settings";


const DEFAULT_AUDIO_SETTINGS = {

  masterVolume:
    1,

  engineVolume:
    1,

  sfxVolume:
    1

};


function clamp(
  value,
  min,
  max
) {

  return Math.max(
    min,
    Math.min(
      max,
      Number(value) || 0
    )
  );

}


function loadAudioSettings() {

  try {

    const saved =
      JSON.parse(
        localStorage.getItem(
          AUDIO_SETTINGS_KEY
        )
      );


    return {

      ...DEFAULT_AUDIO_SETTINGS,

      ...(saved || {}),

      masterVolume:
        clamp(
          saved?.masterVolume ??
          1,
          0,
          1
        ),

      engineVolume:
        clamp(
          saved?.engineVolume ??
          1,
          0,
          1
        ),

      sfxVolume:
        clamp(
          saved?.sfxVolume ??
          1,
          0,
          1
        )

    };

  }

  catch {

    return {
      ...DEFAULT_AUDIO_SETTINGS
    };

  }

}


let audioSettings =
  loadAudioSettings();


function saveAudioSettings() {

  try {

    localStorage.setItem(
      AUDIO_SETTINGS_KEY,
      JSON.stringify(
        audioSettings
      )
    );

  }

  catch {}

}


/* =========================================================
   AUDIO STATE
========================================================= */

let ctx =
  null;

let masterGain =
  null;

let engineGain =
  null;

let startupGain =
  null;


let buffers =
  {};


let engineSource =
  null;


let currentBand =
  null;

let pendingBand =
  null;

let swapTimer =
  null;


let ready =
  false;

let raceEnabled =
  false;

let starting =
  false;


let smoothedRPM =
  900;

let shiftDrop =
  0;

let lastGear =
  "1";


let engineTargetGain =
  0.48;

// Actual driving telemetry is supplied by game.js; the HUD is fallback.
let telemetry=null,telemetryUpdatedAt=0,soundscape=null,audioSession=0;
let audioStartPending=false;


/* =========================================================
   PRELOAD
========================================================= */

const prefetched =
  {};


for (
  const [
    key,
    url
  ]
  of Object.entries(
    FILES
  )
) {

  prefetched[key] =
    fetch(
      url
    )

      .then(
        response => {

          if (
            !response.ok
          ) {

            throw new Error(
              `Failed to load ${url}: ${response.status}`
            );

          }


          return response.arrayBuffer();

        }
      )

      .catch(
        error => {

          console.error(
            "REDLINE audio fetch error:",
            error
          );


          return null;

        }
      );

}


/* =========================================================
   GAME DATA
========================================================= */

function getGameRPM() {
  if(telemetry && performance.now()-telemetryUpdatedAt<800 &&
     Number.isFinite(telemetry.rpm))return clamp(telemetry.rpm,900,7600);

  const raw =
    rpmBar?.style?.width ||
    "";


  if (
    raw.includes(
      "%"
    )
  ) {

    const percent =
      parseFloat(
        raw
      );


    if (
      Number.isFinite(
        percent
      )
    ) {

      return clamp(
        (
          percent /
          100
        )
        *
        7600,
        900,
        7600
      );

    }

  }


  return 900;

}


function getGear() {
  if(telemetry && performance.now()-telemetryUpdatedAt<800 &&
     Number.isFinite(Number(telemetry.gear)))return String(telemetry.gear);

  return (
    gearEl
      ?.textContent
      ?.trim()
    ||
    "1"
  );

}


/* =========================================================
   ENGINE BANDS
========================================================= */

function chooseBand(
  rpm
) {

  return (
    rpm <
    1900
  )
    ?
    "low"
    :
    "high";

}


function getPlaybackRate(
  band,
  rpm
) {

  if (
    band ===
    "low"
  ) {

    return clamp(

      rpm /
      BASE_RPM.low,

      0.88,
      1.90

    );

  }


  return clamp(

    rpm /
    BASE_RPM.high,

    0.90,
    3.10

  );

}


/* =========================================================
   VOLUME
========================================================= */

function effectiveEngineGain(
  baseGain
) {

  return (
    baseGain *
    audioSettings.engineVolume
  );

}


function applyMasterVolume() {

  if (
    !ctx ||
    !masterGain
  ) {

    return;

  }


  const now =
    ctx.currentTime;


  masterGain.gain
    .cancelScheduledValues(
      now
    );


  masterGain.gain
    .setTargetAtTime(

      0.82 *
      audioSettings.masterVolume,

      now,
      0.025

    );

}


function applySFXVolume() {

  if (
    !ctx ||
    !startupGain
  ) {

    return;

  }


  const now =
    ctx.currentTime;


  startupGain.gain
    .cancelScheduledValues(
      now
    );


  startupGain.gain
    .setTargetAtTime(

      0.68 *
      audioSettings.sfxVolume,

      now,
      0.025

    );

}


function applyEngineVolume() {

  if (
    !ctx ||
    !engineGain ||
    !raceEnabled ||
    (!engineSource && !soundscape?.active)
  ) {

    return;

  }


  const now =
    ctx.currentTime;


  engineGain.gain
    .cancelScheduledValues(
      now
    );


  engineGain.gain
    .setTargetAtTime(

      Math.max(
        0.0001,
        effectiveEngineGain(
          engineTargetGain
        )
      ),

      now,
      0.03

    );

}


/* =========================================================
   INITIALIZE AUDIO
========================================================= */

async function initAudio() {

  if (
    ready
  ) {

    if (
      ctx?.state ===
      "suspended"
    ) {

      await ctx.resume();

    }


    applyMasterVolume();
    applySFXVolume();


    return true;

  }


  ctx =
    new (
      window.AudioContext ||
      window.webkitAudioContext
    )();


  masterGain =
    ctx.createGain();


  masterGain.gain.value =
    0.82 *
    audioSettings.masterVolume;


  masterGain.connect(
    ctx.destination
  );


  engineGain =
    ctx.createGain();


  engineGain.gain.value =
    0;


  engineGain.connect(
    masterGain
  );


  startupGain =
    ctx.createGain();


  startupGain.gain.value =
    0.68 *
    audioSettings.sfxVolume;


  startupGain.connect(
    masterGain
  );


  for (
    const key
    of Object.keys(
      FILES
    )
  ) {

    const data =
      await prefetched[key];


    if (
      !data
    ) {

      continue;

    }


    buffers[key] =
      await ctx.decodeAudioData(
        data.slice(0)
      ).catch(error=>{
        console.warn("REDLINE audio decode skipped:",key,error);
        return null;
      });

  }


  if (!buffers.low || !buffers.high) {
    console.warn("REDLINE audio: missing engine sample; using generated fallback where needed.");
  }
  try {
    soundscape=USE_V13_CLEAN_PREVIEW
      ?createV13EnginePreview({
          context:ctx,engineBus:engineGain,sfxBus:startupGain,buffers,
          fallbackFactory:createRedlineSoundscape
        })
      :createRedlineSoundscape({
          context:ctx,engineBus:engineGain,sfxBus:startupGain,buffers
        });
  } catch(error){
    console.warn("REDLINE V11 soundscape unavailable; legacy engine enabled.",error);
    soundscape=null;
  }

  ready =
    true;


  return true;

}


/* =========================================================
   ENGINE SOURCE
========================================================= */

function stopEngineSource() {

  if (
    !engineSource
  ) {

    return;

  }


  try {

    engineSource.stop();

  }

  catch {}


  try {

    engineSource.disconnect();

  }

  catch {}


  engineSource =
    null;

}


function startEngineSource(
  band,
  rpm,
  gain = 0.48
) {

  stopEngineSource();


  const buffer =
    buffers[band];


  if (
    !buffer ||
    !ctx
  ) {

    return;

  }


  const node =
    ctx.createBufferSource();


  node.buffer =
    buffer;


  node.loop =
    true;


  node.playbackRate.value =
    getPlaybackRate(
      band,
      rpm
    );


  node.connect(
    engineGain
  );


  const offset =
    Math.min(

      0.06,

      Math.max(
        0,
        buffer.duration -
        0.02
      )

    );


  node.start(
    0,
    offset
  );


  engineSource =
    node;


  currentBand =
    band;


  engineTargetGain =
    gain;


  const now =
    ctx.currentTime;


  engineGain.gain
    .cancelScheduledValues(
      now
    );


  engineGain.gain
    .setValueAtTime(
      0.0001,
      now
    );


  engineGain.gain
    .linearRampToValueAtTime(

      Math.max(
        0.0001,
        effectiveEngineGain(
          gain
        )
      ),

      now +
      0.10

    );

}


/* =========================================================
   BAND SWAP
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
    newBand ===
    currentBand
    ||
    newBand ===
    pendingBand
  ) {

    return;

  }


  pendingBand =
    newBand;


  if (
    swapTimer
  ) {

    clearTimeout(
      swapTimer
    );


    swapTimer =
      null;

  }


  const now =
    ctx.currentTime;


  engineGain.gain
    .cancelScheduledValues(
      now
    );


  engineGain.gain
    .setValueAtTime(

      engineGain
        .gain
        .value,

      now

    );


  engineGain.gain
    .linearRampToValueAtTime(

      0.0001,

      now +
      0.045

    );


  swapTimer =
    setTimeout(

      () => {

        if (
          !raceEnabled
        ) {

          pendingBand =
            null;


          return;

        }


        startEngineSource(
          newBand,
          rpm,
          0.48
        );


        pendingBand =
          null;


        swapTimer =
          null;

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


  applySFXVolume();


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
  // Double-clicking START must not create two AudioContexts or overlap
  // two asynchronous engine-sample decodes before ready is set.
  if(raceEnabled||audioStartPending)return;
  audioStartPending=true;
  const session=++audioSession;
  let ok=false;
  try {ok=await initAudio();}
  finally {audioStartPending=false;}


  if (
    !ok
  ) {

    return;

  }


  if(session!==audioSession)return;
  raceEnabled =
    true;


  starting =
    true;


  smoothedRPM =
    900;


  shiftDrop =
    0;


  lastGear =
    getGear();


  applyMasterVolume();
  applySFXVolume();


  playStartup();


  const now =
    ctx.currentTime;


  engineGain.gain
    .cancelScheduledValues(
      now
    );


  engineGain.gain
    .setValueAtTime(
      0.0001,
      now
    );


  setTimeout(()=>{
    if(!raceEnabled||session!==audioSession)return;
    if(soundscape){
      soundscape.start();
      engineTargetGain=.60;
      applyEngineVolume();
    }else{
      startEngineSource("low",900,.42);
    }
    starting=false;
  },620);

}


/* =========================================================
   STOP RACE AUDIO
========================================================= */

function stopRaceAudio() {
  ++audioSession;
  soundscape?.stop();
  raceEnabled =
    false;


  if (
    !ready ||
    !ctx ||
    !engineGain
  ) {

    return;

  }


  if (
    swapTimer
  ) {

    clearTimeout(
      swapTimer
    );


    swapTimer =
      null;

  }


  pendingBand =
    null;


  const now =
    ctx.currentTime;


  engineGain.gain
    .cancelScheduledValues(
      now
    );


  engineGain.gain
    .setValueAtTime(

      engineGain
        .gain
        .value,

      now

    );


  engineGain.gain
    .linearRampToValueAtTime(

      0.0001,

      now +
      0.12

    );


  setTimeout(

    () => {

      stopEngineSource();


      currentBand =
        null;


      engineTargetGain =
        0.48;

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
    // V13 runs entirely inside the existing user-unlocked AudioContext.
    // No external media, download, or special browser gesture priming.
    startRaceAudio()
      .catch(
        console.error
      );

  }

);


/* =========================================================
   TAB VISIBILITY
========================================================= */

document.addEventListener(

  "visibilitychange",

  () => {

    if (
      !ctx
    ) {

      return;

    }


    if (
      document.hidden
    ) {

      ctx.suspend()
        .catch(
          () => {}
        );

    }

    else if (
      raceEnabled
    ) {

      ctx.resume()
        .catch(
          () => {}
        );

    }

  }

);


/* =========================================================
   AUDIO LOOP
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


  if (
    !ready
  ) {

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
    (!engineSource && !soundscape?.active)
  ) {

    return;

  }


  const gear =
    getGear();


  if (
    gear !==
    lastGear
    &&
    gear !==
    "R"
  ) {

    shiftDrop =
      900;

  }


  lastGear =
    gear;


  shiftDrop =
    Math.max(

      0,

      shiftDrop -
      3900 *
      delta

    );


  const rawRPM =
    getGameRPM();


  // V11.1 mixer applies its own brief shift envelope. Applying the
  // legacy 900-RPM drop on top made the engine wobble unnaturally.
  const targetRPM =
    Math.max(900,rawRPM-(soundscape?.active?0:shiftDrop));


  const smoothing =
    1 -
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


  if(soundscape?.active){
    const fresh=telemetry&&performance.now()-telemetryUpdatedAt<800;
    soundscape.update({
      ...(fresh?telemetry:{}),rpm:smoothedRPM,gear:Number(gear)||1
    },delta);
    return;
  }

  const wantedBand =
    chooseBand(
      smoothedRPM
    );


  if (
    wantedBand !==
    currentBand
    &&
    !pendingBand
  ) {

    swapEngineBand(
      wantedBand,
      smoothedRPM
    );


    return;

  }


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


    engineSource
      .playbackRate
      .cancelScheduledValues(
        now
      );


    engineSource
      .playbackRate
      .setTargetAtTime(

        targetRate,

        now,

        0.045

      );

  }

}


/* =========================================================
   PUBLIC AUDIO SETTINGS API
========================================================= */

window.REDLINE_AUDIO = {
  updateTelemetry(data) {
    if(!data||typeof data!=="object")return;
    telemetry={
      rpm:Number.isFinite(data.rpm)?data.rpm:900,
      gear:Number.isFinite(data.gear)?data.gear:1,
      speed:Number.isFinite(data.speed)?data.speed:0,
      slip:Number.isFinite(data.slip)?data.slip:0,
      impact:Number.isFinite(data.impact)?data.impact:0,
      throttle:!!data.throttle,brake:!!data.brake,
      handbrake:!!data.handbrake,nitro:!!data.nitro,
      airborne:!!data.airborne,surface:String(data.surface||""),
      car:String(data.car||"gt")
    };
    telemetryUpdatedAt=performance.now();
  },

  get soundscapeDebug(){return soundscape?.debug||{active:false};},

  get settings() {

    return {
      ...audioSettings
    };

  },


  setMasterVolume(
    value
  ) {

    audioSettings.masterVolume =
      clamp(
        value,
        0,
        1
      );


    saveAudioSettings();


    applyMasterVolume();

  },


  setEngineVolume(
    value
  ) {

    audioSettings.engineVolume =
      clamp(
        value,
        0,
        1
      );


    saveAudioSettings();


    applyEngineVolume();

  },


  setSFXVolume(
    value
  ) {

    audioSettings.sfxVolume =
      clamp(
        value,
        0,
        1
      );


    saveAudioSettings();


    applySFXVolume();

  },


  get debug() {

    return {

      ready,

      raceEnabled,

      masterVolume:
        audioSettings.masterVolume,

      engineVolume:
        audioSettings.engineVolume,

      sfxVolume:
        audioSettings.sfxVolume,

      currentBand,

      rpm:
        smoothedRPM

    };

  }

};


/* =========================================================
   START LOOP
========================================================= */

// The opt-in V13 test keeps its own visible status and never claims
// that an external engine recording was used or validated.
let v13PreviewLabel=null;
if(USE_V13_CLEAN_PREVIEW){
  const tag=document.createElement("div");
  tag.id="redlineV13PreviewStatus";
  tag.setAttribute("role","status");
  tag.style.cssText=
    "position:fixed;left:12px;bottom:12px;z-index:10000;pointer-events:none;"+
    "background:#0d1720ed;color:#8fe1d2;border:1px solid #376b71;"+
    "border-radius:10px;padding:7px 10px;font:12px/1.4 system-ui,sans-serif";
  v13PreviewLabel=document.createElement("div");
  v13PreviewLabel.textContent="V13 CLEAN ENGINE TEST · Waiting for race";
  tag.appendChild(v13PreviewLabel);
  document.body.appendChild(tag);
  const oldLoop=audioLoop;
  audioLoop=function(now){
    const info=soundscape?.debug;
    const state=info?.usingFallback
      ?("FALLBACK TO V11.2 · "+(info.status||"Initializing"))
      :("ENGINE ACTIVE · "+info.engine+" · "+info.rpm+" RPM");
    const next="V13 CLEAN ENGINE TEST · "+state;
    if(next!==v13PreviewLabel.textContent)v13PreviewLabel.textContent=next;
    oldLoop(now);
  };
}
requestAnimationFrame(
  audioLoop
);


/* =========================================================
   LOAD SETTINGS UI

   audio.js is already loaded as type="module",
   so this means index.html does NOT need editing.
========================================================= */

import("./settings.js")
  .catch(
    error => {

      console.error(
        "REDLINE settings failed to load:",
        error
      );

    }
  );
