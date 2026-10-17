/*
 * REDLINE V12.1 — direct browser audio (fixes Cloudflare relay HTTP 502).
 *
 * This is still an OPTIONAL real outdoor Goodwood V8 audio experiment;
 * the normal game continues to use the stable V11.2 sample mixer.
 *
 * Source and author:
 *  Edvvc (Ed Pond), Trophy Truck and American V8s (Goodwood 2009).
 *  CC BY-SA 3.0 · https://commons.wikimedia.org/wiki/File:Trophy_Truck_and_American_V8s.ogg
 *  Adaptation: played in game with variable speed and volume.
 *
 * The old V12 used a Cloudflare Pages Function to download the Commons
 * file and decode it with Web Audio. The remote fetch returned HTTP 502.
 * Audio now streams DIRECTLY through HTMLAudioElement without fetch(),
 * crossOrigin, or a server relay. It is primed by the START click to
 * satisfy browser autoplay policies, before asynchronous game loading.
 */
const AUDIO_URL=
  "https://upload.wikimedia.org/wikipedia/commons/c/c6/Trophy_Truck_and_American_V8s.ogg";
const clamp=(x,low=0,high=1)=>
  Math.max(low,Math.min(high,Number.isFinite(x)?x:low));
const profiles=Object.freeze({
  gt:1.000,vortex:1.045,apex:.995,bayside:1.035,aurora:.950,
  ironclad:.900,cirrus:1.000,obsidian:1.080,phantom:1.095
});
let primedMedia=null;
let primingPromise=null;
let primingError=null;

/**
 * MUST be called synchronously in the actual START button click handler,
 * before any await, to unlock direct HTML media playback.
 * The recording starts silently until the Web Audio race mixer is ready.
 */
export function primeV12ExteriorAudio(){
  if(!primedMedia){
    primedMedia=document.createElement("audio");
    primedMedia.preload="auto";
    primedMedia.loop=true;
    primedMedia.volume=0;
    // Do not set crossOrigin: <audio> playback doesn't require CORS, but
    // reading an AudioBuffer from a remote domain would require it.
    primedMedia.src=AUDIO_URL;
    primedMedia.setAttribute("playsinline","");
    if("preservesPitch" in primedMedia)primedMedia.preservesPitch=false;
    if("mozPreservesPitch" in primedMedia)primedMedia.mozPreservesPitch=false;
  }
  const player=primedMedia;
  if(!player.paused)return player;
  primingError=null;
  try{
    primingPromise=Promise.resolve(player.play()).then(
      ()=>{primingError=null;return true},
      e=>{primingError=e?.message||"browser blocked playback";return false}
    );
  }catch(error){
    primingError=error?.message||"browser blocked playback";
    primingPromise=Promise.resolve(false);
  }
  return player;
}
function ramp(param,value,ctx,time=.055){
  const now=ctx.currentTime;
  param.cancelScheduledValues(now);
  param.setTargetAtTime(value,now,time);
}
function describeError(media){
  if(primingError)return "Playback blocked: "+primingError;
  const code=media?.error?.code;
  return code===2?"Network error loading Wikimedia recording":
         code===3?"Browser cannot decode this recording":
         code===4?"Browser does not support this recording":
         "Direct Wikimedia recording unavailable";
}

/** V11.2 remains the source of startup, tire, impact and shift SFX. */
export function createV12ExteriorPreview({
  context,engineBus,sfxBus,buffers,fallbackFactory,getMixSettings
}={}){
  if(!context||!engineBus||!sfxBus||typeof fallbackFactory!=="function")
    throw new Error("V12 preview requires one Web Audio context and a V11.2 fallback");
  const legacyBus=context.createGain();
  legacyBus.gain.value=1;
  legacyBus.connect(engineBus);
  const fallback=fallbackFactory({
    context,engineBus:legacyBus,sfxBus,buffers
  });
  let active=false,engaged=false,session=0;
  let status="Waiting for race",latest=null;
  let volume=0,sourceStarted=false,wasPausedForTab=false;
  const media=primedMedia;
  // If HTML media was not primed during user gesture, never call play
  // asynchronously in start(): that could be blocked by autoplay policy.
  function resumeIfAvailable(){
    if(!active||!media||media.error)return;
    if(primingError){
      status=describeError(media);
      return;
    }
    if(media.paused || media.readyState<2)return;
    engaged=true;
    sourceStarted=true;
    status="Direct exterior V8 recording active";
    ramp(legacyBus.gain,.0001,context,.17);
  }
  function onPlaying(){resumeIfAvailable()}
  function onCanPlay(){resumeIfAvailable()}
  function onError(){
    if(!active)return;
    engaged=false;
    status=describeError(media);
    if(media)media.volume=0;
    ramp(legacyBus.gain,1,context,.12);
  }
  function onPause(){
    if(!active||document.hidden)return;
    engaged=false;
    status=primingError?describeError(media):"Wikimedia playback paused; V11.2 fallback";
    ramp(legacyBus.gain,1,context,.12);
  }
  function onVisibility(){
    if(!active||!media)return;
    if(document.hidden){
      wasPausedForTab=true;
      media.pause();
      return;
    }
    if(wasPausedForTab){
      wasPausedForTab=false;
      Promise.resolve(media.play()).then(
        ()=>resumeIfAvailable(),
        e=>{primingError=e?.message||"resume blocked";onError()}
      );
    }
  }
  function start(){
    if(active)return;
    active=true;
    engaged=false;
    status="Waiting for direct exterior recording";
    session++;
    latest=null;volume=0;sourceStarted=false;
    ramp(legacyBus.gain,1,context,.03);
    fallback.start();
    if(!media){
      status="V12 playback not unlocked; using V11.2";
      return;
    }
    media.volume=0;
    media.addEventListener("playing",onPlaying);
    media.addEventListener("canplay",onCanPlay);
    media.addEventListener("error",onError);
    media.addEventListener("pause",onPause);
    document.addEventListener("visibilitychange",onVisibility);
    // A previously completed prime() can be ready already.
    resumeIfAvailable();
    if(primingPromise)primingPromise.then(ok=>{
      if(active){
        if(ok)resumeIfAvailable();
        else onError();
      }
    });
  }
  function update(telemetry,dt=.016){
    if(!active)return;
    fallback.update(telemetry,dt);
    latest=telemetry||{};
    if(!media)return;
    if(media.error){onError();return}
    if(!engaged){
      resumeIfAvailable();
      return;
    }
    if(!document.hidden && media.paused){
      onPause();
      return;
    }
    const rpm=clamp(Number(latest.rpm)||900,900,7600);
    const model=typeof latest.car==="string"?latest.car:"gt";
    const ratio=profiles[model]||1;
    const normalized=(rpm-900)/6700;
    const rate=clamp((.89+.42*normalized)*ratio,.82,1.44);
    // Edge and Chrome expose preservesPitch. Disabled so the recorded
    // engine note naturally follows the small playback-rate changes.
    media.playbackRate=rate;
    const settings=typeof getMixSettings==="function"
      ?getMixSettings():{};
    const master=clamp(Number(settings?.masterVolume??1));
    const engine=clamp(Number(settings?.engineVolume??1));
    const throttle=latest.throttle?1:0;
    const level=.68*(.67+.33*throttle)*master*engine;
    const alpha=1-Math.exp(-clamp(Number(dt)||.016,.001,.08)*9);
    volume+=(level-volume)*alpha;
    media.volume=clamp(volume);
    // Original longer outdoor field recording is played in full;
    // no imaginary 2.5-second 'clean' loop is asserted.
  }
  function stop(){
    if(!active)return;
    active=false;
    engaged=false;
    session++;
    status="Stopped";
    volume=0;
    if(media){
      media.volume=0;
      media.removeEventListener("playing",onPlaying);
      media.removeEventListener("canplay",onCanPlay);
      media.removeEventListener("error",onError);
      media.removeEventListener("pause",onPause);
      document.removeEventListener("visibilitychange",onVisibility);
      media.pause();
      try{media.currentTime=0}catch{}
    }
    ramp(legacyBus.gain,0,context,.025);
    fallback.stop();
  }
  return{
    start,update,stop,
    get active(){return active},
    get debug(){return{
      active,mode:"V12.1 direct exterior V8 playback",
      usingFallback:!engaged,status,
      sourceReady:!!media && (media.readyState>=2),
      directMedia:true,mediaPaused:media?.paused??true,
      mediaError:media?.error?.code??null,
      secondsPlayed:media?.currentTime??0,
      sampleRpm:latest?.rpm??null
    }}
  };
}
