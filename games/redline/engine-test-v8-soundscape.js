/*
 * REDLINE ENGINE TEST LAB V16 — 1951 Mercury flathead V8 sample layers.
 *
 * Original WAVs (by lonemonk, Freesound, CC BY 4.0):
 *   https://freesound.org/people/lonemonk/sounds/62564/
 *   https://freesound.org/people/lonemonk/sounds/62567/
 * This lab-only module uses extracted, re-looped stereo recordings and does
 * not change production REDLINE's audio engine, purchases or multiplayer.
 */
const NAMES=Object.freeze([
  "idle","low_off","low_on","med_off","med_on",
  "high_off","high_on","maxRPM","startup"
]);
const LOOPS=NAMES.filter(n=>n!=="startup");
const BAND_RPM={idle:900,low_off:2200,low_on:2200,
  med_off:4100,med_on:4100,high_off:5900,high_on:5900,maxRPM:7400};
const POINTS=[900,2200,4100,5900,7400];
const clamp=(n,lo=0,hi=1)=>Math.min(hi,Math.max(lo,Number.isFinite(n)?n:lo));
let bank=null,bankRevision=0,bankStatus="Waiting for IRONCLAD V8 audio bank";
let loadPromise=null;
function parseBank(bytes){
  const raw=new Uint8Array(bytes),dv=new DataView(bytes);
  if(raw.length<16||new TextDecoder().decode(raw.subarray(0,8))!=="RDL16V8!"||
    dv.getUint32(8,true)!==1||dv.getUint32(12,true)!==NAMES.length)
      throw Error("Invalid IRONCLAD recorded V8 bank header");
  let p=16;
  const out={};
  for(let k=0;k<NAMES.length;k++){
    if(p>=raw.length)throw Error("Incomplete V8 audio bank");
    const length=raw[p++];
    if(length<2||length>30||p+length+4>raw.length)
      throw Error("Invalid V8 bank entry");
    const name=new TextDecoder().decode(raw.subarray(p,p+length));p+=length;
    const size=dv.getUint32(p,true);p+=4;
    if(!NAMES.includes(name)||Object.hasOwn(out,name)||size<1000||
      size>1e6||p+size>raw.length)
      throw Error("Invalid V8 audio sample "+name);
    const entry=raw.slice(p,p+size);
    if(new TextDecoder().decode(entry.subarray(0,4))!=="OggS")
      throw Error("Invalid Ogg encoding "+name);
    out[name]=entry.buffer;
    p+=size;
  }
  if(p!==raw.length)throw Error("Unexpected trailing V8 bank data");
  return out;
}
export function getIroncladV8BankStatus(){
  return{ready:!!bank,revision:bankRevision,status:bankStatus};
}
export function preloadIroncladV8Bank(force=false){
  // Failed loads must NOT remain cached forever. The user may have
  // uploaded the bank to Cloudflare after the page was initially opened.
  if(loadPromise&&!force)return loadPromise;
  if(loadPromise&&force)return loadPromise.then(()=>preloadIroncladV8Bank(true));
  bankStatus="Checking recorded V8 file…";
  loadPromise=(async()=>{
    try{
      const url=new URL("./assets/audio/redline-ironclad-v16-audio.bank",import.meta.url);
      // v16-2 is a distinct asset URL from the original test build;
      // no-store also bypasses negative 404 caches during new deployments.
      url.searchParams.set("v","v16-2");
      const response=await fetch(url,{cache:"no-store"});
      if(!response.ok)
        throw Error("V8 bank request HTTP "+response.status);
      const bytes=await response.arrayBuffer();
      if(bytes.byteLength>1500000)throw Error("Unexpectedly large V8 audio bank");
      const parsed=parseBank(bytes);
      bank=parsed;
      bankStatus="Recorded V8 bank downloaded · 9 samples";
      bankRevision++;
      return true;
    }catch(err){
      // Keep an already working bank alive if an explicit retry fails.
      bankStatus=String(err?.message||err);
      console.warn("IRONCLAD recorded engine bank unavailable:",bankStatus);
      bankRevision++;
      return !!bank;
    }finally{
      loadPromise=null;
    }
  })();
  return loadPromise;
}
function glide(ctx,parameter,value,speed=.065){
  const now=ctx.currentTime;
  parameter.cancelScheduledValues(now);
  parameter.setTargetAtTime(value,now,speed);
}
function blend(rpm,throttle){
  const r=clamp(rpm,POINTS[0],POINTS[4]);
  let i=0;
  while(i<3&&r>POINTS[i+1])i++;
  const d=Math.max(1,POINTS[i+1]-POINTS[i]);
  const t=clamp((r-POINTS[i])/d);
  const bands=[0,0,0,0,0];
  bands[i]=Math.cos(t*Math.PI/2);
  bands[i+1]=Math.sin(t*Math.PI/2);
  const on=Math.sin(clamp(throttle)*Math.PI/2);
  const off=Math.cos(clamp(throttle)*Math.PI/2);
  return {idle:bands[0],low_on:bands[1]*on,low_off:bands[1]*off,
    med_on:bands[2]*on,med_off:bands[2]*off,
    high_on:bands[3]*on,high_off:bands[3]*off,
    maxRPM:bands[4]};
}
export function createIroncladV8Preview({
  context,engineBus,sfxBus,buffers,fallbackFactory
}={}){
  if(!context||!engineBus||!sfxBus||typeof fallbackFactory!=="function")
    throw Error("IRONCLAD engine preview missing audio context");
  const v11Bus=context.createGain();v11Bus.gain.value=1;
  v11Bus.connect(engineBus);
  const v11=fallbackFactory({context,engineBus:v11Bus,sfxBus,buffers});
  const v8Bus=context.createGain();v8Bus.gain.value=0;
  v8Bus.connect(engineBus);
  let active=false,decoded=false,loading=false,revSeen=-1;
  let ticket=0,engineCar="gt",smoothedRPM=900,gas=0,error="";
  let v8Audible=false;
  let layers=[];
  function clear(){
    for(const v of layers){
      try{v.source.stop(context.currentTime+.05)}catch{}
      const g=v.gain;
      setTimeout(()=>{try{g.disconnect()}catch{}},180);
    }
    layers=[];
  }
  async function load(ticketId){
    if(!active||!bank)return;
    loading=true;decoded=false;
    const currentBank=bank;
    try{
      const content=await Promise.all(LOOPS.map(async name=>
        [name,await context.decodeAudioData(currentBank[name].slice(0))]));
      if(!active||ticketId!==ticket)return;
      clear();
      for(const [name,buffer] of content){
        const source=context.createBufferSource();
        source.buffer=buffer;source.loop=true;
        const gain=context.createGain();gain.gain.value=0;
        source.connect(gain);gain.connect(v8Bus);
        source.start(context.currentTime);
        layers.push({name,source,gain});
      }
      decoded=true;loading=false;error="";
      console.info("IRONCLAD V16: decoded 8 V8 loops successfully");
    }catch(e){
      if(!active||ticketId!==ticket)return;
      decoded=false;loading=false;error=String(e?.message||e);
      console.warn("IRONCLAD V8 audio failed, falling back to V11.2",e);
    }
  }
  function start(){
    if(active)return;
    active=true;decoded=false;loading=false;v8Audible=false;ticket++;
    smoothedRPM=900;gas=0;error="";
    revSeen=bankRevision;
    v11.start();
    glide(context,v8Bus.gain,0,.02);
    glide(context,v11Bus.gain,1,.02);
    if(bank)load(ticket);
  }
  function update(data={},dt=.016){
    if(!active)return;
    v11.update(data,dt);
    if(revSeen!==bankRevision){
      revSeen=bankRevision;ticket++;clear();decoded=false;loading=false;
      if(bank)load(ticket);
    }
    engineCar=typeof data.car==="string"?data.car:"gt";
    const useV8=engineCar==="ironclad"&&decoded;
    v8Audible=useV8;
    glide(context,v8Bus.gain,useV8?.87:0,.12);
    glide(context,v11Bus.gain,useV8?.0001:1,.12);
    if(!useV8)return;
    const dtSafe=clamp(Number(dt)||.016,.001,.08);
    smoothedRPM+=(clamp(Number(data.rpm)||900,900,7600)-smoothedRPM)*
      (1-Math.exp(-dtSafe*12));
    gas+=((data.throttle?1:0)-gas)*(1-Math.exp(-dtSafe*9));
    const amounts=blend(smoothedRPM,gas);
    for(const {name,source,gain} of layers){
      const weight=amounts[name]||0;
      glide(context,gain.gain,weight*(.73+.27*gas),.065);
      // Preserve classic V8 timbre: only +/- 7% playback speed
      const rate=clamp(smoothedRPM/BAND_RPM[name],.93,1.07);
      glide(context,source.playbackRate,rate,.12);
    }
  }
  function stop(){
    if(!active)return;
    active=false;decoded=false;loading=false;v8Audible=false;ticket++;
    glide(context,v8Bus.gain,0,.015);
    glide(context,v11Bus.gain,0,.015);
    clear();v11.stop();
  }
  function playStartupSample(destination){
    if(!bank||!destination)return false;
    context.decodeAudioData(bank.startup.slice(0)).then(buffer=>{
      // Unlooped, real crank/start sound; does not replace live car mechanics
      if(!active&&!destination)return;
      const sound=context.createBufferSource();
      sound.buffer=buffer;
      sound.connect(destination);
      sound.onended=()=>{try{sound.disconnect()}catch{}};
      sound.start();
    }).catch(err=>console.warn("V8 startup sample failed:",err));
    return true;
  }
  return {start,update,stop,playStartupSample,
    get active(){return active},
    get debug(){return {
      active,car:engineCar,usingFallback:!v8Audible,
      v8Audible,bankReady:!!bank,decoded,layerCount:layers.length,loading,
      rpm:Math.round(smoothedRPM),error,status:bankStatus
    }}
  };
}
