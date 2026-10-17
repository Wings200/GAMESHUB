/*
 * REDLINE ENGINE LAB V17: longer *real* Mercury V8 driving takes, not a
 * synthesized engine or the former 1.3-second perpetually looping slices.
 * New V17 binary bank is lab-only: no production audio/account changes.
 * Source recordings by lonemonk, Freesound, CC BY 4.0:
 * https://freesound.org/people/lonemonk/sounds/62564/
 * https://freesound.org/people/lonemonk/sounds/62567/
 */
const REQUIRED=[
  "idleA","idleB","pullA","pullB","pullC",
  "liftA","liftB","blipA","blipB","startup"
];
const PULLS=["pullA","pullB","pullC"];
const id=(x,a=0,b=1)=>Math.min(b,Math.max(a,Number.isFinite(x)?x:a));
let bank=null,revision=0,status="V17 long-take audio not installed",loadingPromise=null;
function parseBank(source){
  const raw=new Uint8Array(source),dv=new DataView(source);
  if(raw.length<16||new TextDecoder().decode(raw.subarray(0,8))!=="RDL17V8!"||
    dv.getUint32(8,true)!==1||dv.getUint32(12,true)!==REQUIRED.length)
    throw Error("Unrecognized V17 audio-bank header");
  let p=16;const sounds={};
  for(let i=0;i<REQUIRED.length;i++){
    if(p>=raw.length)throw Error("V17 bank has missing recordings");
    const nameLen=raw[p++];
    if(nameLen<3||nameLen>20||p+nameLen+4>raw.length)
      throw Error("Invalid V17 audio entry");
    const name=new TextDecoder().decode(raw.subarray(p,p+nameLen));p+=nameLen;
    const size=dv.getUint32(p,true);p+=4;
    if(!REQUIRED.includes(name)||Object.hasOwn(sounds,name)||size<1000||
      size>200000||p+size>raw.length)
      throw Error("Corrupted V17 clip "+name);
    const bytes=raw.slice(p,p+size);
    if(new TextDecoder().decode(bytes.subarray(0,4))!=="OggS")
      throw Error("Invalid V17 Ogg encoding: "+name);
    sounds[name]=bytes.buffer;p+=size;
  }
  if(p!==raw.length)throw Error("V17 bank contains trailing data");
  return sounds;
}
export function getV17Status(){
  return{ready:!!bank,revision,status};
}
export function preloadV17Bank(force=false){
  if(loadingPromise)return loadingPromise;
  if(bank&&!force)return Promise.resolve(true);
  status="Fetching longer Mercury recordings…";
  loadingPromise=(async()=>{
    const url=new URL("./assets/audio/redline-ironclad-v17-audio.bank",import.meta.url);
    url.searchParams.set("rev","v17-1");
    const locations=[
      ["REDLINE website",url.href],
      ["GitHub repository","https://raw.githubusercontent.com/Wings200/GAMESHUB/main/games/redline/assets/audio/redline-ironclad-v17-audio.bank"]
    ];
    const errors=[];
    try{
      for(const [label,link] of locations){
        try{
          const response=await fetch(link,{cache:"no-store"});
          if(!response.ok)throw Error("HTTP "+response.status);
          const bytes=await response.arrayBuffer();
          if(bytes.byteLength>1600000)throw Error("Bank size exceeded");
          const clips=parseBank(bytes);
          bank=clips;revision++;
          status="10 longer V8 recordings loaded · "+label;
          return true;
        }catch(error){errors.push(label+": "+(error?.message||error))}
      }
      status=errors.join(" · ");revision++;
      return !!bank;
    }finally{loadingPromise=null}
  })();
  return loadingPromise;
}
function ramp(ctx,param,value,seconds=.09){
  const t=ctx.currentTime;
  param.cancelScheduledValues(t);
  param.setTargetAtTime(value,t,seconds);
}
export function createV17LongTakeEngine({
  context,engineBus,sfxBus,buffers,fallbackFactory
}={}){
  if(!context||!engineBus||typeof fallbackFactory!=="function")
    throw Error("V17 recorded engine needs an audio context");
  const baseBus=context.createGain();baseBus.gain.value=1;baseBus.connect(engineBus);
  const previous=fallbackFactory({context,engineBus:baseBus,sfxBus,buffers});
  const recordedBus=context.createGain();recordedBus.gain.value=0;
  recordedBus.connect(engineBus);
  const idleBus=context.createGain();idleBus.gain.value=0;idleBus.connect(recordedBus);
  const pullBus=context.createGain();pullBus.gain.value=0;pullBus.connect(recordedBus);
  const liftBus=context.createGain();liftBus.gain.value=0;liftBus.connect(recordedBus);
  const blipBus=context.createGain();blipBus.gain.value=0;blipBus.connect(recordedBus);
  let playing=false,decoded=false,isDecoding=false,serial=0,loadedRevision=-1;
  let activeCar="gt",selectedMode="auto",engineRPM=900,gas=0;
  let currentGear=1,lastThrottle=false,pullStep=0,liftStep=0,blipStep=0;
  let idleStep=0,currentIdle=null,currentPull=null,voices=new Set(),clips={};
  let lastIdleSwitch=0,lastTake="",activeV17=false,error="";
  const fadeSeconds=.70;
  function createVoice(name,bus,{gain=.65,fade=.14,offset=0,rate=1}={}){
    const buffer=clips[name];
    if(!buffer)return null;
    const now=context.currentTime;
    const src=context.createBufferSource();
    src.buffer=buffer;src.loop=false;
    src.playbackRate.value=rate;
    const amp=context.createGain();amp.gain.value=0;
    src.connect(amp);amp.connect(bus);
    amp.gain.setValueAtTime(0,now);
    amp.gain.linearRampToValueAtTime(gain,now+Math.max(.01,fade));
    const obj={name,src,amp,buffer,ended:false,
      endAt:now+(buffer.duration-offset)/rate};
    src.onended=()=>{
      obj.ended=true;voices.delete(obj);
      try{src.disconnect();amp.disconnect()}catch{}
    };
    voices.add(obj);
    src.start(now,offset);
    return obj;
  }
  function retire(voice,seconds=.23){
    if(!voice||voice.ended)return;
    const now=context.currentTime;
    voice.amp.gain.cancelScheduledValues(now);
    voice.amp.gain.setTargetAtTime(0,now,Math.max(.015,seconds/4));
    try{voice.src.stop(now+seconds)}catch{}
  }
  function clearVoices(){
    for(const v of voices){
      try{v.src.stop()}catch{}
      try{v.src.disconnect();v.amp.disconnect()}catch{}
    }
    voices.clear();currentIdle=null;currentPull=null;
  }
  function newIdle(){
    const name=idleStep++%2===0?"idleA":"idleB";
    const old=currentIdle;
    currentIdle=createVoice(name,idleBus,{gain:.70,fade:old?.85:.17});
    lastIdleSwitch=context.currentTime;
    retire(old,1.1);
  }
  function beginPull({crossfade=true}={}){
    const old=currentPull;
    const name=PULLS[pullStep++%PULLS.length];
    // Slightly varying start position avoids identical retrigger at each
    // shift; every take is still a genuine continuous several-second rev.
    const buf=clips[name];
    const maxOffset=Math.min(.32,Math.max(0,buf.duration-2.2));
    const offset=(pullStep%3)*maxOffset/3;
    const newRate=id(.84+(engineRPM/7500)*.31,.84,1.17);
    currentPull=createVoice(name,pullBus,{
      gain:.79,fade:old&&crossfade?fadeSeconds:.10,offset,rate:newRate
    });
    lastTake=name;
    retire(old,old&&crossfade?fadeSeconds:.15);
  }
  function playEvent(name,bus,level=.53,fade=.05){
    const voice=createVoice(name,bus,{gain:level,fade});
    if(!voice)return;
    const fadeAt=Math.max(context.currentTime+.15,voice.endAt-.35);
    voice.amp.gain.setTargetAtTime(0,fadeAt,.085);
  }
  async function decode(token){
    if(!playing||!bank)return;
    isDecoding=true;decoded=false;
    const selected=bank;
    try{
      const array=await Promise.all(REQUIRED.map(async name=>[
        name,await context.decodeAudioData(selected[name].slice(0))
      ]));
      if(!playing||token!==serial)return;
      clearVoices();
      clips=Object.fromEntries(array);
      decoded=true;isDecoding=false;error="";
      lastIdleSwitch=0;newIdle();
    }catch(e){
      if(!playing||token!==serial)return;
      error=String(e?.message||e);isDecoding=false;decoded=false;
      console.warn("V17 long-take decode failed:",e);
    }
  }
  function start(){
    if(playing)return;
    playing=true;serial++;decoded=false;isDecoding=false;
    currentGear=1;lastThrottle=false;engineRPM=900;gas=0;
    pullStep=0;liftStep=0;blipStep=0;idleStep=0;lastTake="";error="";
    loadedRevision=revision;previous.start();
    ramp(context,recordedBus.gain,0,.02);
    ramp(context,baseBus.gain,1,.02);
    if(bank)decode(serial);
  }
  function update(data={},dt=.016){
    if(!playing)return;
    previous.update(data,dt);
    if(loadedRevision!==revision){
      loadedRevision=revision;serial++;clearVoices();decoded=false;isDecoding=false;
      if(bank)decode(serial);
    }
    activeCar=typeof data.car==="string"?data.car:"gt";
    const dtSafe=id(Number(dt)||.016,.001,.08);
    engineRPM+=(id(Number(data.rpm)||900,900,7600)-engineRPM)*
      (1-Math.exp(-dtSafe*11));
    const on=!!data.throttle;
    gas+=((on?1:0)-gas)*(1-Math.exp(-dtSafe*12));
    const modeV17=activeCar==="ironclad"&&decoded&&selectedMode==="auto";
    activeV17=modeV17;
    ramp(context,recordedBus.gain,modeV17?.85:0,.08);
    ramp(context,baseBus.gain,modeV17?0:1,.08);
    // The previously accepted V16 is the safe fallback for missing V17.
    // The original V11.2 is only heard when explicitly chosen for A/B.
    previous.selectOriginalMode?.(selectedMode==="v11");
    if(!decoded||!modeV17){lastThrottle=on;return}
    const now=context.currentTime;
    if(!currentIdle||currentIdle.ended||now-lastIdleSwitch>7.0)
      newIdle();
    const idleLevel=id(.80-engineRPM/14000,.25,.78);
    ramp(context,idleBus.gain,idleLevel,.14);
    ramp(context,pullBus.gain,on?.87:.003,on?.12:.065);
    ramp(context,liftBus.gain,on?.03:.74,.13);
    ramp(context,blipBus.gain,on?.42:.08,.15);
    // Event-aware take changes: throttle onset, at end of a long take,
    // or a real gear shift. Never restart on every telemetry frame.
    const gear=Number(data.gear)||1;
    if(on&&!lastThrottle){
      beginPull();
      if(engineRPM<3100)playEvent(
        blipStep++%2===0?"blipA":"blipB",blipBus,.39);
    }else if(on&&(!currentPull||currentPull.ended||
      currentPull.endAt-now<fadeSeconds+.16||
      (gear!==currentGear&&gear>1))){
      beginPull();
    }
    if(!on&&lastThrottle&&engineRPM>1450){
      playEvent(liftStep++%2===0?"liftA":"liftB",liftBus,.62);
      retire(currentPull,.20);currentPull=null;
    }
    lastThrottle=on;currentGear=gear;
    if(currentPull&&!currentPull.ended){
      // Mild, controlled speed correction; the bulk of RPM movement is
      // the *recorded* 4–6s acceleration run, not a pitched single note.
      ramp(context,currentPull.src.playbackRate,
        id(.84+(engineRPM/7500)*.31,.84,1.17),.19);
    }
  }
  function stop(){
    if(!playing)return;
    playing=false;serial++;decoded=false;isDecoding=false;activeV17=false;
    ramp(context,recordedBus.gain,0,.015);
    ramp(context,baseBus.gain,0,.015);
    clearVoices();previous.stop();
  }
  function selectOriginalMode(enabled){
    selectedMode=enabled?"v11":"auto";
    previous.selectOriginalMode?.(!!enabled);
    return selectedMode;
  }
  function selectV16Mode(enabled){
    selectedMode=enabled?"v16":"auto";
    previous.selectOriginalMode?.(false);
    return selectedMode;
  }
  function playStartupSample(destination){
    if(!bank||!destination)return previous.playStartupSample?.(destination)||false;
    // Recorded 1951 Mercury warm start, separate from loop system.
    context.decodeAudioData(bank.startup.slice(0)).then(buffer=>{
      const src=context.createBufferSource();
      src.buffer=buffer;src.connect(destination);
      src.onended=()=>{try{src.disconnect()}catch{}};
      src.start();
    }).catch(e=>console.warn("V17 startup unavailable",e));
    return true;
  }
  return{
    start,update,stop,playStartupSample,selectOriginalMode,selectV16Mode,
    get active(){return playing},
    get debug(){return{
      active:playing,car:activeCar,v17Audible:activeV17,
      selectedMode,bankReady:!!bank,decoded,loading:isDecoding,error,
      status,rpm:Math.round(engineRPM),voiceCount:voices.size,
      currentTake:currentPull?.name||"",idleTake:currentIdle?.name||"",
      v16Fallback:previous.debug?.v8Audible||false
    }}
  };
}
