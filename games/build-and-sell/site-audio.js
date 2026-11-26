
/* Recorded sound effects, with quiet, bounded playback. See AUDIO_CREDITS.md. */
const ROOT="../../games/engine-test/assets/audio/";
const remote={wind:"https://bigsoundbank.com/UPLOAD/mp3/0904.mp3",engine:"https://bigsoundbank.com/UPLOAD/mp3/2147.mp3",tracks:"https://bigsoundbank.com/UPLOAD/mp3/2149.mp3",place:"https://bigsoundbank.com/UPLOAD/mp3/1588.mp3",dig:"https://opengameart.org/sites/default/files/shovel_0.ogg"};
const foot=i=>ROOT+"footstep_concrete_"+String(i%5).padStart(3,"0")+".ogg";
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function media(url,loop=false){const a=new Audio();a.preload="auto";a.src=url;a.loop=loop;return a;}
export function createSiteAudio(){
 let enabled=false,active=false,volume=.65,stepDistance=0,wasGround=true,lastAnim=null,lastMachine=null,wind=null,engine=null,tracks=null,context=null,windNode=null,windGain=null;
 const steps=Array.from({length:5},(_,i)=>media(foot(i))),oneShots=new Map(),lastPeerSteps=new Map();
 try{volume=clamp(Number(localStorage.getItem("build-sfx-volume")??.65),0,1);}catch{}
 if(!Number.isFinite(volume))volume=.65;
 const pending=new WeakSet();function safePlay(a){if(!a||pending.has(a)||a.error)return;try{const p=a.play();if(p?.then){pending.add(a);p.then(()=>pending.delete(a),()=>pending.delete(a));}}catch{}}
 function loop(a,level,rate=1){if(!a)return;a.volume=clamp(level*volume,0,1);a.playbackRate=rate;if(active&&enabled&&level>.001){if(a.paused)safePlay(a);}else if(!a.paused)a.pause();}
 function one(name,level=.35,index=0,rate=1){
  if(!active||!enabled||volume===0)return;
  const key=name==="step"?"step"+index%5:name;
  let bank=oneShots.get(key);if(!bank){const url=name==="step"?foot(index):remote[name];if(!url)return;bank=Array.from({length:3},()=>media(url));if(name==="place"||name==="dig")for(const a of bank)a.addEventListener("error",()=>{if(!a.dataset.fallback){a.dataset.fallback="1";a.src=foot(name==="place"?0:3);}});oneShots.set(key,bank);}
  const a=bank.find(x=>x.paused||x.ended)||bank[0];try{a.currentTime=0;}catch{}a.volume=clamp(level*volume,0,1);a.playbackRate=rate;safePlay(a);
 }
 function unlock(){if(enabled)return;enabled=true;
  wind=media(remote.wind,true);engine=media(remote.engine,true);tracks=media(remote.tracks,true);
  // Existing local recording is a reliable fallback for the engine if the external host is blocked.
  engine.addEventListener("error",()=>{if(!engine.dataset.fallback){engine.dataset.fallback="1";engine.src="../../games/redline/assets/audio/engine-idle.ogg";}});
  wind.addEventListener("error",()=>{if(!context)return;try{const n=context.createBufferSource(),g=context.createGain(),b=context.createBuffer(1,context.sampleRate*4,context.sampleRate),a=b.getChannelData(0);let s=0;for(let i=0;i<a.length;i++){s=.985*s+.015*(Math.random()*2-1);a[i]=s*4*Math.sin(Math.PI*i/a.length)**2;}n.buffer=b;n.loop=true;n.connect(g).connect(context.destination);g.gain.value=0;n.start();windNode=n;windGain=g;}catch{}});
  try{const C=window.AudioContext||window.webkitAudioContext;if(C){context=new C();context.resume().catch(()=>{});}}catch{}
  // Prime playback inside the user's click; browsers otherwise block sound.
  for(const a of [wind,engine,tracks,...steps]){a.volume=0;safePlay(a);}
  loop(wind,active?.20:0);loop(engine,0);loop(tracks,0);
 }
 function start(){active=true;stepDistance=0;wasGround=true;lastMachine=null;lastAnim=null;}
 function stop(){active=false;loop(wind,0);loop(engine,0);loop(tracks,0);if(windGain)windGain.gain.value=0;for(const bank of oneShots.values())for(const a of bank)a.pause();for(const a of steps)a.pause();lastPeerSteps.clear();}
 function update(dt,{p,driving,machine,digAnim,peers,listener}){
  if(!active||!enabled)return;const dist=Math.hypot(listener.x-machine.x,listener.z-machine.z);
  const moving=lastMachine?Math.hypot(machine.x-lastMachine.x,machine.z-lastMachine.z)/Math.max(dt,.016):0;lastMachine={x:machine.x,z:machine.z};
  loop(wind,driving?.095:.22);if(windGain)windGain.gain.setTargetAtTime(volume*(driving?.045:.09),context.currentTime,.3);
  loop(engine,machine.driver?(driving?.48:.48/(1+dist*.17)):0,clamp(.89+moving*.035+(digAnim&&performance.now()-digAnim.start<800?.07:0),.85,1.15));
  loop(tracks,machine.driver&&moving>.2?(driving?.19:.19/(1+dist*.2)):0,1);
  if(!driving){if(p.grounded&&p.speed>.22){stepDistance+=p.speed*dt;const gap=p.crouch?.65:p.mode==="run"?1.05:.79;if(stepDistance>=gap){stepDistance%=gap;one("step",p.crouch?.19:.38,Math.floor(Math.random()*5),.92+Math.random()*.13);}}else stepDistance=0;if(p.grounded&&!wasGround)one("step",.52,2,.85);wasGround=p.grounded;}
  if(digAnim&&digAnim.start!==lastAnim&&performance.now()-digAnim.start<800){lastAnim=digAnim.start;one("dig",driving?.62:.65/(1+dist*.16),0,.85+Math.random()*.15);}
  const live=new Set();for(const [id,a] of peers){live.add(id);const s=a.shown;if(!s||a.driving||s.speed<.3||s.y>.15)continue;const d=Math.hypot(listener.x-s.x,listener.z-s.z);if(d>15)continue;let n=(lastPeerSteps.get(id)||0)+s.speed*dt;if(n>.85){n%=.85;one("step",.32/(1+d*.25),Math.floor(Math.random()*5),.94+Math.random()*.1);}lastPeerSteps.set(id,n);}for(const id of lastPeerSteps.keys())if(!live.has(id))lastPeerSteps.delete(id);
 }
 function setVolume(v){volume=clamp(v,0,1);try{localStorage.setItem("build-sfx-volume",String(volume));}catch{}}
 return {unlock,start,stop,update,one,setVolume,get volume(){return volume;}};
}
