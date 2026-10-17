/*
 * REDLINE V15 — real recorded inline-six RPM/load bank.
 * All 9 WAV recordings come from a ZIP the licensed user selects in the
 * browser. The ZIP is NEVER uploaded or committed to the public website.
 * A V11.2 backup stays active until the local WAV bank is decoded.
 *
 * Engine loops: Skril Studio "i6 German - Free Engine Sound Pack".
 * License belongs to the asset's publisher under Unity Asset Store terms.
 */
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:a));
const SAMPLE_NAMES=[
  "idle","low_off","low_on","med_off","med_on",
  "high_off","high_on","maxRPM","startup"
];
const LOOPS=SAMPLE_NAMES.filter(x=>x!=="startup");
const RMS=Object.freeze({
  idle:.271,low_off:.454,low_on:.421,med_off:.554,med_on:.412,
  high_off:.622,high_on:.472,maxRPM:.337
});
const ANCHORS=[1000,2100,4000,6100,7500];
const RATE_ANCHOR={
  idle:1000,low_off:2100,low_on:2100,med_off:4000,med_on:4000,
  high_off:6100,high_on:6100,maxRPM:7500
};
let localBank=null,localRevision=0,localStatus="Choose your local i6 ZIP",loadLock=0;
const uint16=(view,i)=>view.getUint16(i,true);
const uint32=(view,i)=>view.getUint32(i,true);
function validateWav(bytes,label){
  if(bytes.length<44||new TextDecoder().decode(bytes.subarray(0,4))!=="RIFF"||
     new TextDecoder().decode(bytes.subarray(8,12))!=="WAVE")
    throw new Error(label+" is not a valid WAV recording");
}
async function unzipRequiredWavs(file){
  if(!file||file.size>26*1024*1024)
    throw new Error("Choose the supplied i6 ZIP (max 26 MB)");
  const bytes=new Uint8Array(await file.arrayBuffer());
  const dv=new DataView(bytes.buffer);
  let eocd=-1;
  for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){
    if(uint32(dv,i)===0x06054b50){eocd=i;break}
  }
  if(eocd<0)throw new Error("Not a readable ZIP archive");
  const count=uint16(dv,eocd+10);
  const offset=uint32(dv,eocd+16);
  if(count>500||offset>=bytes.length)throw new Error("Unsupported ZIP directory");
  const desired=new Set(SAMPLE_NAMES.map(x=>x+".wav"));
  let cursor=offset;
  const found={};
  for(let i=0;i<count;i++){
    if(cursor+46>bytes.length||uint32(dv,cursor)!==0x02014b50)
      throw new Error("Damaged ZIP central directory");
    const method=uint16(dv,cursor+10);
    const compSize=uint32(dv,cursor+20);
    const rawSize=uint32(dv,cursor+24);
    const nameLen=uint16(dv,cursor+28);
    const extraLen=uint16(dv,cursor+30);
    const commentLen=uint16(dv,cursor+32);
    const localAt=uint32(dv,cursor+42);
    const end=cursor+46+nameLen+extraLen+commentLen;
    if(end>bytes.length)throw new Error("Truncated ZIP directory");
    const path=new TextDecoder().decode(bytes.subarray(cursor+46,cursor+46+nameLen));
    cursor=end;
    if(path.includes("/Interior/")||path.includes("\\Interior\\")||
       path.includes("/Interior\\")||path.startsWith("Interior/"))continue;
    const baseName=path.split(/[\\/]/).pop();
    if(!desired.has(baseName)||Object.hasOwn(found,baseName))continue;
    if(rawSize>3*1024*1024||compSize>3*1024*1024)
      throw new Error(baseName+" is unexpectedly large");
    if(localAt+30>bytes.length||uint32(dv,localAt)!==0x04034b50)
      throw new Error("Invalid file header for "+baseName);
    const localNameLen=uint16(dv,localAt+26);
    const localExtraLen=uint16(dv,localAt+28);
    const at=localAt+30+localNameLen+localExtraLen;
    if(at+compSize>bytes.length)throw new Error("Truncated "+baseName);
    const chunk=bytes.slice(at,at+compSize);
    let uncompressed;
    if(method===0)uncompressed=chunk;
    else if(method===8){
      if(typeof DecompressionStream==="undefined")
        throw new Error("Your browser cannot unpack ZIPs. Extract the WAVs first.");
      try{
        const stream=new Blob([chunk]).stream()
          .pipeThrough(new DecompressionStream("deflate-raw"));
        uncompressed=new Uint8Array(await new Response(stream).arrayBuffer());
      }catch{
        throw new Error("Could not decompress "+baseName+". Use an up-to-date Edge or Chrome.");
      }
    }else throw new Error("Unsupported ZIP compression: "+method);
    if(uncompressed.length!==rawSize)
      throw new Error("Invalid uncompressed size for "+baseName);
    validateWav(uncompressed,baseName);
    found[baseName]=uncompressed.buffer;
  }
  const missing=SAMPLE_NAMES.filter(x=>!found[x+".wav"]);
  if(missing.length)throw new Error("Missing exterior files: "+missing.join(", "));
  return Object.fromEntries(SAMPLE_NAMES.map(x=>[x,found[x+".wav"]]));
}
/**
 * Safe: reads the file only in the user's tab memory. No network upload.
 * The soundscape notices localRevision even when a race is already running.
 */
export async function loadV15LocalZip(file){
  const mine=++loadLock;
  localStatus="Unpacking engine recordings locally…";
  try{
    const bank=await unzipRequiredWavs(file);
    if(mine!==loadLock)return getV15LocalStatus();
    localBank=bank;localRevision++;
    localStatus="9 exterior recordings ready · ZIP stays on your PC";
  }catch(error){
    if(mine===loadLock){
      localBank=null;localRevision++;
      localStatus=error?.message||"Could not read this ZIP";
    }
  }
  return getV15LocalStatus();
}
export function getV15LocalStatus(){
  return {ready:!!localBank,revision:localRevision,status:localStatus};
}
/**
 * Production audio is embedded in a REDLINE-specific packed binary bank,
 * not shipped as nine standalone Unity WAV downloads. The user-provided
 * sample ZIP remains only for optional V15 testing and is never uploaded.
 */
function decodePublishedBank(raw){
  const bytes=new Uint8Array(raw);
  const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const head=new TextDecoder().decode(bytes.subarray(0,8));
  if(head!=="RDL15BNK"||dv.byteLength<16||dv.getUint32(8,true)!==1)
    throw new Error("Unsupported REDLINE audio-bank header");
  const count=dv.getUint32(12,true);
  if(count!==SAMPLE_NAMES.length)
    throw new Error("Incomplete embedded engine bank");
  const decoded={};
  let at=16;
  for(let i=0;i<count;i++){
    if(at+1>bytes.length)throw new Error("Truncated bank name");
    const length=bytes[at++];
    if(length<2||length>32||at+length+4>bytes.length)
      throw new Error("Invalid bank entry");
    const name=new TextDecoder().decode(bytes.subarray(at,at+length));
    at+=length;
    const size=dv.getUint32(at,true);at+=4;
    if(!SAMPLE_NAMES.includes(name)||Object.hasOwn(decoded,name)||
       size<500||size>3*1024*1024||at+size>bytes.length)
      throw new Error("Invalid compressed engine sample: "+name);
    const payload=bytes.slice(at,at+size);
    if(new TextDecoder().decode(payload.subarray(0,4))!=="OggS")
      throw new Error("Invalid compressed audio for "+name);
    decoded[name]=payload.buffer;
    at+=size;
  }
  if(at!==bytes.length)throw new Error("Trailing bank data");
  return decoded;
}
let publishedPromise=null;
export async function preloadV15PublishedEngine(){
  if(publishedPromise)return publishedPromise;
  publishedPromise=(async()=>{
    try{
      const url=new URL("./assets/audio/redline-gt-v15-audio.bank",import.meta.url);
      const response=await fetch(url,{cache:"force-cache"});
      if(!response.ok){
        if(!localBank)localStatus="Built-in V15 bank not installed yet; using V11.2";
        return false;
      }
      const data=await response.arrayBuffer();
      if(data.byteLength>5*1024*1024)throw new Error("Bank too large");
      const unpacked=decodePublishedBank(data);
      if(!localBank){
        localBank=unpacked;localRevision++;
        localStatus="Built-in recorded GT engine ready";
      }
      return true;
    }catch(error){
      console.warn("REDLINE built-in recorded engine unavailable:",error);
      if(!localBank)localStatus="Built-in recorded audio unavailable; using V11.2";
      return false;
    }
  })();
  return publishedPromise;
}
function set(ctx,param,value,seconds=.07){
  const now=ctx.currentTime;
  param.cancelScheduledValues(now);
  param.setTargetAtTime(value,now,seconds);
}
function weights(rpm,throttle){
  const p=clamp(rpm,ANCHORS[0],ANCHORS[4]);
  const levels=[0,0,0,0,0];
  let index=0;
  while(index<3&&p>ANCHORS[index+1])index++;
  const t=clamp((p-ANCHORS[index])/(ANCHORS[index+1]-ANCHORS[index]));
  levels[index]=Math.cos(t*Math.PI/2);
  levels[index+1]=Math.sin(t*Math.PI/2);
  const on=Math.sin(clamp(throttle)*Math.PI/2);
  const off=Math.cos(clamp(throttle)*Math.PI/2);
  return {
    idle:levels[0],
    low_on:levels[1]*on,low_off:levels[1]*off,
    med_on:levels[2]*on,med_off:levels[2]*off,
    high_on:levels[3]*on,high_off:levels[3]*off,
    maxRPM:levels[4]
  };
}
export function createV15RecordedEnginePreview({
  context,engineBus,sfxBus,buffers,fallbackFactory
}={}){
  if(!context||!engineBus||!sfxBus||typeof fallbackFactory!=="function")
    throw new Error("V15 needs a shared audio context and V11.2 fallback");
  const oldBus=context.createGain();
  oldBus.gain.value=1;oldBus.connect(engineBus);
  const backup=fallbackFactory({context,engineBus:oldBus,sfxBus,buffers});
  const bankBus=context.createGain();
  bankBus.gain.value=0;bankBus.connect(engineBus);
  let active=false,engaged=false,decoding=false,revision=-1,token=0;
  let sources=[],gains=[],current="gt",rpm=900,gas=0;
  let status="Waiting for recorded engine bank",error="";
  function clearSources(){
    const toStop=sources.slice(),toDisconnect=gains.slice();
    sources=[];gains=[];
    for(const s of toStop){
      try{s.stop(context.currentTime+.05)}catch{}
    }
    // Disconnect nodes only after a short fade so exit doesn't click.
    for(const g of toDisconnect){
      setTimeout(()=>{try{g.node.disconnect()}catch{}},160);
    }
  }
  async function activate(id){
    if(!active||!localBank)return;
    decoding=true;engaged=false;status="Decoding 8 RPM/load engine loops";
    set(context,bankBus.gain,0,.035);
    set(context,oldBus.gain,1,.055);
    const chosen=localBank;
    try{
      const decoded=await Promise.all(LOOPS.map(async name=>
        [name,await context.decodeAudioData(chosen[name].slice(0))]));
      if(!active||id!==token)return;
      clearSources();
      const next={};
      for(const [name,buffer] of decoded)next[name]=buffer;
      // All eight loops always run. The mixer crossfades recording
      // characteristics rather than suddenly swapping one pitch.
      for(const name of LOOPS){
        const source=context.createBufferSource();
        source.buffer=next[name];
        source.loop=true;
        const gain=context.createGain();
        gain.gain.value=0;
        source.connect(gain);gain.connect(bankBus);
        source.start();
        sources.push(source);
        gains.push({name,source,node:gain});
      }
      engaged=true;decoding=false;error="";
      status="Recorded i6 engine active";
      set(context,bankBus.gain,1,.22);
      set(context,oldBus.gain,.0001,.25);
    }catch(e){
      if(!active||id!==token)return;
      decoding=false;engaged=false;
      error=String(e?.message||e);
      status="Decode failed: "+error;
      set(context,bankBus.gain,0,.03);
      set(context,oldBus.gain,1,.04);
    }
  }
  function start(){
    if(active)return;
    active=true;token++;engaged=false;decoding=false;
    rpm=900;gas=0;current="gt";error="";revision=localRevision;
    backup.start();
    set(context,bankBus.gain,0,.025);
    set(context,oldBus.gain,1,.025);
    status=localBank?"Preparing recorded engine":"Recorded bank not installed; V11.2 active";
    if(localBank)activate(token);
  }
  function update(data={},dt=.016){
    if(!active)return;
    backup.update(data,dt);
    if(revision!==localRevision){
      revision=localRevision;token++;engaged=false;decoding=false;
      set(context,bankBus.gain,0,.035);
      set(context,oldBus.gain,1,.05);
      clearSources();
      status=localBank?"Loading recorded engine bank":"Recorded bank unavailable";
      if(localBank)activate(token);
    }
    const t=clamp(Number(dt)||.016,.001,.08);
    rpm+=(clamp(Number(data.rpm)||900,900,7600)-rpm)*
      (1-Math.exp(-t*13));
    gas+=((data.throttle?1:0)-gas)*(1-Math.exp(-t*8));
    current=typeof data.car==="string"?data.car:"gt";
    if(!engaged)return;
    // This purchased sample pack is ONE inline-six. It is not mislabeled
    // as an authentic V8/V10 when a different car is selected.
    const isGt=current==="gt";
    set(context,bankBus.gain,isGt?1:0,.14);
    set(context,oldBus.gain,isGt?.0001:1,.14);
    status=isGt?"Recorded inline-six engine active":
      "V15 is GT-only; using V11.2 for other cars";
    const mix=weights(rpm,gas);
    const loudness=.74+.26*gas;
    for(const {name,source,node} of gains){
      const base=clamp(.245/(RMS[name]||.4),.24,1.3);
      set(context,node.gain,base*mix[name]*loudness*.67,.07);
      // Each recording covers a true RPM band. Playback speed correction
      // is deliberately small to preserve the timbre of actual samples.
      const pitch=clamp(rpm/RATE_ANCHOR[name],.92,1.08);
      set(context,source.playbackRate,pitch,.11);
    }
  }
  function stop(){
    if(!active)return;
    active=false;token++;engaged=false;decoding=false;
    status="Stopped";
    set(context,bankBus.gain,0,.02);
    set(context,oldBus.gain,0,.03);
    clearSources();
    backup.stop();
  }
  function playStartupSample(destination){
    if(!localBank||!destination)return false;
    // The pack's real i6 startup replaces the old synthesized-game startup
    // only in V15, and only after the player has selected the local ZIP.
    const data=localBank.startup.slice(0);
    context.decodeAudioData(data).then(buffer=>{
      const sound=context.createBufferSource();
      sound.buffer=buffer;
      sound.connect(destination);
      sound.onended=()=>{try{sound.disconnect()}catch{}};
      sound.start();
    }).catch(e=>console.warn("V15 startup sample unavailable",e));
    return true;
  }
  return{
    start,update,stop,playStartupSample,
    get active(){return active},
    get debug(){return {
      active,mode:"V15 real i6 recorded engine",
      usingFallback:!engaged||current!=="gt",
      loading:decoding,status,car:current,
      rpm:Math.round(rpm),throttle:Number(gas.toFixed(2)),
      engineSamples:sources.length,bankReady:!!localBank,
      noUpload:true,error
    }}
  };
}
