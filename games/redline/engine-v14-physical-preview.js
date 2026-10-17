/*
 * REDLINE V14 — physical combustion/exhaust engine simulation audition.
 * Loads a pinned MIT-labelled engine-sound WebAssembly package ONLY in
 * ?engine=v14. Existing cars, physics, V11.2 default and V13 unaffected.
 * Source: pbonnard/engine-sound (port of AngeTheGreat's engine-sim).
 * https://github.com/pbonnard/engine-sound
 *
 * No crowds, field recordings or pitch-shifted loops. Simulation integrates
 * cylinder pressure, valves and exhaust dynamics. Remote module/WASM
 * delivery must work; failed/unsupported loads fall back to V11.2.
 */
const SIM_COMMIT="3bb78e6477c992aee8baabee16a890a7a2f92a6e";
const BASE="https://cdn.jsdelivr.net/gh/pbonnard/engine-sound@"+SIM_COMMIT+"/js/src/";
const MODULE_URL=BASE+"engine-sound.js";
const WASM_URL=BASE+"engine_sound.wasm";
const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,Number.isFinite(v)?v:min));
const CARS=Object.freeze({
  gt:      {name:"Straight-six",preset:"inline6",edge:.011,jitter:.16,volume:.90},
  vortex:  {name:"Flat-plane V8",preset:"v8_flatplane",edge:.018,jitter:.16,volume:.88},
  apex:    {name:"Lightweight inline-four",preset:"inline4",edge:.019,jitter:.17,volume:.87},
  bayside: {name:"Street-tuned inline-four",preset:"inline4",edge:.024,jitter:.24,volume:.88,
            params:{bore:.086,crankThrow:.042}},
  aurora:  {name:"Rally flat-four",preset:"flat4",edge:.019,jitter:.25,volume:.91},
  ironclad:{name:"Crossplane muscle V8",preset:"v8_crossplane",edge:.010,jitter:.36,volume:1},
  cirrus:  {name:"Touring crossplane V8",preset:"v8_crossplane",edge:.009,jitter:.20,volume:.82},
  obsidian:{name:"Track flat-plane V8",preset:"v8_flatplane",edge:.027,jitter:.16,volume:.95},
  phantom: {name:"High-rev V10",preset:"v10",edge:.029,jitter:.14,volume:.89}
});
let engineModulePromise=null;
function loadModule(){
  if(!engineModulePromise){
    engineModulePromise=import(MODULE_URL).catch(error=>{
      engineModulePromise=null;
      throw error;
    });
  }
  return engineModulePromise;
}
function smooth(ctx,param,value,seconds=.055){
  const now=ctx.currentTime;
  param.cancelScheduledValues(now);
  param.setTargetAtTime(value,now,seconds);
}
export function createV14PhysicalEnginePreview({
  context,engineBus,sfxBus,buffers,fallbackFactory
}={}){
  if(!context||!engineBus||!sfxBus||typeof fallbackFactory!=="function")
    throw new Error("V14 needs shared audio context and V11.2 fallback");
  const legacyBus=context.createGain();
  legacyBus.gain.value=1;
  legacyBus.connect(engineBus);
  const backup=fallbackFactory({
    context,engineBus:legacyBus,sfxBus,buffers
  });
  const wet=context.createGain();
  wet.gain.value=0;wet.connect(engineBus);
  let active=false,ready=false,starting=false,token=0;
  let sim=null,status="Waiting for race",err="",model="gt";
  let rpm=900,throttle=0,gear=1,speed=0,latest={};
  let lastFrame=0,hasTelemetry=false;
  function fallBack(reason){
    if(!active)return;
    err=String(reason?.message||reason||"unknown engine error").slice(0,150);
    ready=false;starting=false;
    status="Physical engine unavailable: "+err;
    smooth(context,wet.gain,0,.035);
    smooth(context,legacyBus.gain,1,.04);
    if(sim){try{sim.dispose()}catch{}sim=null}
  }
  async function activate(serial){
    try{
      const {createEngineSound}=await loadModule();
      if(!active||serial!==token)return;
      if(!context.audioWorklet||typeof AudioWorkletNode==="undefined")
        throw new Error("AudioWorklet unsupported in this browser");
      const config=CARS[model]||CARS.gt;
      const created=await createEngineSound({
        context,destination:wet,
        preset:config.preset,params:config.params,
        audio:{
          volume:config.volume,
          highFrequencyGain:config.edge,
          jitter:config.jitter,noise:.82,convolution:.95
        },
        wasmUrl:WASM_URL
      });
      if(!active||serial!==token){created.dispose();return}
      sim=created;
      created.node.addEventListener("processorerror",()=>{
        if(active&&serial===token)fallBack("engine audio processor stopped");
      });
      // Game physics owns gear and RPM. Neutral prevents the simulator's
      // separate drivetrain from fighting the car physics.
      sim.setIgnition(true);
      sim.setGear(0);
      sim.setStarter(true);
      sim.setThrottle(throttle>.01?throttle:.09);
      sim.setRpm(rpm);
      ready=true;starting=false;
      status="Physical exhaust simulation active";
      smooth(context,wet.gain,.76,.18);
      smooth(context,legacyBus.gain,.0001,.22);
    }catch(error){
      if(active&&serial===token)fallBack(error);
    }
  }
  function start(){
    if(active)return;
    active=true;ready=false;starting=true;err="";
    status="Loading engine physics audio";
    model="gt";rpm=900;gear=1;throttle=0;speed=0;
    hasTelemetry=false;latest={};
    token++;
    smooth(context,wet.gain,0,.012);
    smooth(context,legacyBus.gain,1,.018);
    backup.start();
    activate(token);
  }
  function update(data={},dt=.016){
    if(!active)return;
    backup.update(data,dt);
    latest=data||{};
    const spec=Object.hasOwn(CARS,latest.car)?latest.car:"gt";
    const delta=clamp(Number(dt)||.016,.001,.085);
    const rawRpm=clamp(Number(latest.rpm)||900,850,7600);
    // Speed and RPM are already determined in game.js; this smoothing
    // only removes audio frame jitter without changing the transmission.
    rpm+=(rawRpm-rpm)*(1-Math.exp(-delta*14));
    throttle+=((latest.throttle?1:0)-throttle)*
      (1-Math.exp(-delta*12));
    gear=clamp(Math.round(Number(latest.gear)||1),1,6);
    speed=clamp(Number(latest.speed)||0,0,150);
    const oldModel=model;
    model=spec;
    hasTelemetry=true;
    if(!sim||!ready)return;
    if(model!==oldModel){
      const cfg=CARS[model];
      try{
        sim.setEngine({preset:cfg.preset,params:cfg.params});
        sim.setAudioParams({
          volume:cfg.volume,
          jitter:cfg.jitter,
          highFrequencyGain:cfg.edge
        });
      }catch(error){fallBack(error);return}
    }
    try{
      sim.setRpm(rpm);
      sim.setThrottle(Math.max(.055,throttle));
    }catch(error){fallBack(error)}
  }
  function stop(){
    if(!active)return;
    active=false;ready=false;starting=false;
    token++;
    status="Stopped";
    smooth(context,wet.gain,0,.025);
    smooth(context,legacyBus.gain,0,.035);
    if(sim){try{sim.dispose()}catch{}sim=null}
    backup.stop();
  }
  return{
    start,update,stop,
    get active(){return active},
    get debug(){return {
      active,mode:"V14 physically simulated combustion and exhaust",
      usingFallback:!ready,loading:starting,status,
      car:model,engine:(CARS[model]||CARS.gt).name,
      rpm:Math.round(rpm),gear,throttle:Number(throttle.toFixed(2)),
      engineModel:"pressure/valves/exhaust via WASM",
      externalRecording:false,error:err
    }}
  };
}
