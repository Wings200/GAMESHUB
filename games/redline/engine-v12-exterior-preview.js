/*
 * REDLINE V12 — Opt-in exterior engine preview, NOT the default game mixer.
 *
 * Uses a CC BY-SA 3.0 outdoor recording by Edvvc (Ed Pond), from Wikimedia
 * Commons. It is streamed through a narrow same-origin Pages audio route.
 * This is a listening test, not a final game-ready RPM bank. We select an
 * approximately steady 2.5-second section at runtime and play it with a
 * constrained 0.85x–1.45x rate, never the extreme V11 3.5x speed.
 *
 * If remote media loading/decoding fails or the selected take has no
 * plausible steady section, the original V11.2 audio remains active.
 * Racing physics, music, accounts, multiplayer, settings are unaffected.
 */
const clamp=(x,lo=0,hi=1)=>Math.min(hi,Math.max(lo,Number.isFinite(x)?x:lo));
const profiles={
 gt:1.00,vortex:1.045,apex:.995,bayside:1.035,aurora:.95,
 ironclad:.90,cirrus:1.00,obsidian:1.08,phantom:1.095
};
const SAMPLE_URL="/api/redline/engine-audio?sample=v8";
function set(gain,to,ctx,t=.08){
 const now=ctx.currentTime;
 gain.cancelScheduledValues(now);
 gain.setTargetAtTime(to,now,t);
}
function locateLoop(decoded){
 const sampleRate=decoded.sampleRate;
 const data=decoded.getChannelData(0);
 const total=decoded.duration||data.length/sampleRate;
 const length=2.5;
 if(total<length+1.2||sampleRate<8000)throw new Error("Recording too short or invalid");
 const ceiling=Math.min(38,total-length-.35);
 const starts=[];
 const step=Math.max(1,Math.floor(sampleRate/200));
 for(let at=.65;at<=ceiling;at+=.38){
   const from=Math.floor(at*sampleRate);
   const count=Math.floor(length*sampleRate);
   const slice=Math.max(1,Math.floor(count/4/step));
   const rms=[];
   let peak=0;
   for(let q=0;q<4;q++){
     let sum=0,samples=0;
     for(let i=from+Math.floor(q*count/4);i<from+Math.floor((q+1)*count/4);i+=step){
       const v=data[i]||0;peak=Math.max(peak,Math.abs(v));sum+=v*v;samples++;
     }
     rms.push(Math.sqrt(sum/Math.max(1,samples)));
   }
   const avg=rms.reduce((a,b)=>a+b,0)/4;
   if(avg<.014||peak>.995)continue;
   const uneven=Math.sqrt(rms.reduce((x,y)=>x+(y-avg)**2,0)/4)/Math.max(.001,avg);
   // Look for a present but steady engine section rather than a loud
   // pass-by with dramatic fade-in/out or mic overload.
   const score=avg*.40-uneven*.14-Math.max(0,avg-.33)*.3;
   starts.push({at,score,rms:avg,uneven});
 }
 starts.sort((a,b)=>b.score-a.score);
 const selected=starts[0];
 if(!selected)throw new Error("No stable exterior loop detected");
 // Favor near-zero waveform endpoints to minimize cyclic discontinuities.
 const nearestZero=(time,window=.008)=>{
   const mid=Math.floor(time*sampleRate);
   const radius=Math.floor(window*sampleRate);
   let ix=mid,best=Infinity;
   for(let i=Math.max(1,mid-radius);i<Math.min(data.length-1,mid+radius);i++){
     const d=Math.abs(data[i])+
       Math.abs(data[i]-data[i-1])*.55+
       Math.abs(i-mid)/Math.max(1,radius)*.0005;
     if(d<best){best=d;ix=i}
   }
   return ix/sampleRate;
 };
 const start=nearestZero(selected.at);
 const end=nearestZero(selected.at+length);
 if(end-start<1.5)throw new Error("Exterior loop cut too short");
 return {start,end,score:selected.score,averageRms:selected.rms};
}
export function createV12ExteriorPreview({
 context,engineBus,sfxBus,buffers,fallbackFactory
}){
 if(!context||!engineBus||!sfxBus||!fallbackFactory)
   throw new Error("V12 preview requires an audio context, buses and V11.2 fallback");
 const legacyBus=context.createGain();legacyBus.gain.value=1;legacyBus.connect(engineBus);
 const sampleBus=context.createGain();sampleBus.gain.value=0;sampleBus.connect(engineBus);
 const mellow=context.createBiquadFilter();
 mellow.type="lowpass";mellow.frequency.value=4600;mellow.Q.value=.45;
 mellow.connect(sampleBus);
 const fallback=fallbackFactory({context,engineBus:legacyBus,sfxBus,buffers});
 let soundBuffer=null,pending=null,cut=null,source=null;
 let active=false,session=0,status="waiting",latest=null;
 function ensureLoaded(){
   if(soundBuffer)return Promise.resolve(soundBuffer);
   if(pending)return pending;
   pending=(async()=>{
     const response=await fetch(SAMPLE_URL,{cache:"force-cache"});
     if(!response.ok)throw new Error("V12 exterior recording HTTP "+response.status);
     const ab=await response.arrayBuffer();
     if(ab.byteLength<20000||ab.byteLength>5_000_000)
       throw new Error("V12 exterior recording size invalid");
     const decoded=await context.decodeAudioData(ab);
     cut=locateLoop(decoded);
     soundBuffer=decoded;
     return decoded;
   })().catch(e=>{
     status="fallback: "+(e?.message||"recording unavailable");
     return null;
   }).finally(()=>{pending=null});
   return pending;
 }
 function attachSample(gen){
   if(!active||session!==gen||source||!soundBuffer||!cut)return;
   const src=context.createBufferSource();
   src.buffer=soundBuffer;
   src.loop=true;src.loopStart=cut.start;src.loopEnd=cut.end;
   src.playbackRate.value=.9;
   src.connect(mellow);
   src.start(context.currentTime,cut.start);
   source=src;
   status="V12 exterior V8 preview";
   const now=context.currentTime;
   sampleBus.gain.cancelScheduledValues(now);
   sampleBus.gain.setTargetAtTime(.52,now,.28);
   legacyBus.gain.cancelScheduledValues(now);
   legacyBus.gain.setTargetAtTime(.001,now,.28);
 }
 function start(){
   if(active)return;
   active=true;status="loading exterior recording";
   const gen=++session;
   const now=context.currentTime;
   set(legacyBus.gain,1,context,.035);
   set(sampleBus.gain,0,context,.035);
   fallback.start();
   if(soundBuffer){attachSample(gen);return}
   ensureLoaded().then(buffer=>{if(buffer)attachSample(gen)});
 }
 function update(telemetry,dt){
   if(!active)return;
   // Preserve the original SFX/shift/impact bus and smooth fallback
   // until we have a decoded external recording.
   fallback.update(telemetry,dt);
   latest=telemetry||{};
   if(!source)return;
   const rpm=clamp(Number(latest.rpm)||900,900,7600);
   const model=typeof latest.car==="string"?latest.car:"gt";
   const mult=profiles[model]||1;
   const rpmNormalized=(rpm-900)/6700;
   const desired=clamp((.88+rpmNormalized*.47)*mult,.80,1.48);
   const now=context.currentTime;
   source.playbackRate.cancelScheduledValues(now);
   source.playbackRate.setTargetAtTime(desired,now,.085);
   const throttle=latest.throttle?1:0;
   const level=.42+.13*throttle;
   sampleBus.gain.cancelScheduledValues(now);
   sampleBus.gain.setTargetAtTime(level,now,.10);
 }
 function stop(){
   if(!active)return;
   active=false;session++;status="stopped";
   set(sampleBus.gain,0,context,.025);
   set(legacyBus.gain,0,context,.025);
   const prev=source;source=null;
   if(prev){
     prev.onended=()=>{try{prev.disconnect()}catch{}};
     try{prev.stop(context.currentTime+.14)}catch{try{prev.disconnect()}catch{}}
   }
   fallback.stop();
 }
 return {
   start,update,stop,
   get active(){return active},
   get debug(){return {
     active,mode:"V12 exterior V8 preview",status,
     sourceReady:!!soundBuffer,loopStart:cut?.start??null,
     loopEnd:cut?.end??null,usingFallback:!source,
     sampleRpm:latest?.rpm??null
   }}
 };
}
