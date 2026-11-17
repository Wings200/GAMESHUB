// ILLEGAL CHESS · Bishop Sniper V4 original procedural SFX.
// Web Audio oscillators and filtered noise: NO files, audio streams, or CDN.
// Every browser plays its OWN opt-in audio only for a server-committed event.
export const SNIPER_SOUND_CUES=Object.freeze([
 {name:"scope",ms:230},
 {name:"chamber",ms:930},
 {name:"fire",ms:1320},
 {name:"bullet",ms:1590},
 {name:"impact",ms:3500},
 {name:"debris",ms:3670},
 {name:"outro",ms:4460}
]);
export const SNIPER_TELEPORT_CUES=Object.freeze([{name:"teleport",ms:0}]);
export const SNIPER_FALLBACK_CUES=Object.freeze([{name:"scope",ms:120},{name:"fire",ms:490},{name:"impact",ms:1030}]);
export function createSniperSoundtrack(AudioContextClass=
 typeof globalThis!=="undefined"?(globalThis.AudioContext||globalThis.webkitAudioContext):null){
 let context=null,master=null,noiseBuffer=null,enabled=true;
 const sources=new Set(),timers=[];
 const totalGain=.48;
 function unlock(){
  if(!enabled||!AudioContextClass)return false;
  try{
   if(!context){
    context=new AudioContextClass();
    master=context.createGain();master.gain.value=totalGain;
    master.connect(context.destination);
   }
   if(context.state==="suspended")void context.resume().catch(()=>{});
   return context.state==="running";
  }catch{return false;}
 }
 function setEnabled(on){
  enabled=!!on;
  if(master&&context){
   master.gain.cancelScheduledValues(context.currentTime);
   master.gain.setValueAtTime(enabled?totalGain:0,context.currentTime);
  }
  if(!enabled)stop();
 }
 function track(node){
  sources.add(node);
  node.onended=()=>sources.delete(node);
  return node;
 }
 function envelope(g,t,d,peak=.2,attack=.01){
  const end=t+Math.max(.02,d),on=Math.min(end-.005,t+attack);
  g.gain.setValueAtTime(.00001,t);
  g.gain.exponentialRampToValueAtTime(Math.max(.00002,peak),on);
  g.gain.exponentialRampToValueAtTime(.00001,end);
 }
 function oscillator(t,len,low,high,peak=.16,type="sine"){
  const o=track(context.createOscillator()),g=context.createGain();
  o.type=type;o.frequency.setValueAtTime(Math.max(20,low),t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20,high),t+len);
  envelope(g,t,len,peak);
  o.connect(g);g.connect(master);
  o.start(t);o.stop(t+len+.01);
 }
 function staticNoise(){
  if(noiseBuffer)return noiseBuffer;
  const frames=Math.ceil(context.sampleRate*2.4);
  const b=context.createBuffer(1,frames,context.sampleRate);
  const samples=b.getChannelData(0);
  let seed=0x71b6cc4d;
  for(let i=0;i<frames;i++){
   seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
   samples[i]=((seed>>>0)/2147483648)-1;
  }
  noiseBuffer=b;return b;
 }
 function noise(t,len,peak=0.18,freq=1000,to=180,filterKind="lowpass"){
  const s=track(context.createBufferSource()),filter=context.createBiquadFilter(),g=context.createGain();
  s.buffer=staticNoise();
  filter.type=filterKind;
  filter.Q.value=.65;
  filter.frequency.setValueAtTime(Math.max(30,freq),t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(30,to),t+len);
  envelope(g,t,len,peak,Math.min(.025,len*.24));
  s.connect(filter);filter.connect(g);g.connect(master);
  s.start(t);s.stop(t+len+.01);
 }
 function cue(name,t){
  switch(name){
   case "scope":
    oscillator(t,.095,1230,760,.035,"triangle");
    oscillator(t+.08,.07,530,370,.018,"sine");
    break;
   case "chamber":
    noise(t,.09,.17,3400,480,"highpass");
    oscillator(t+.045,.15,390,190,.055,"triangle");
    break;
   case "fire":
    noise(t,.48,.63,3400,190,"lowpass");
    noise(t,.17,.29,8000,1200,"highpass");
    oscillator(t,.44,115,38,.29,"sawtooth");
    oscillator(t+.08,.56,195,45,.12,"triangle");
    break;
   case "bullet":
    noise(t,1.9,.085,240,1650,"bandpass");
    oscillator(t,1.89,230,74,.025,"sine");
    break;
   case "impact":
    noise(t,.65,.43,7000,170,"lowpass");
    oscillator(t,.57,200,38,.26,"triangle");
    break;
   case "debris":
    noise(t,.56,.14,3600,650,"highpass");
    oscillator(t,.65,430,90,.055,"triangle");
    break;
   case "outro":
    oscillator(t,.24,225,95,.052,"sine");
    break;
   case "teleport":
    noise(t,.38,.15,350,4500,"bandpass");
    oscillator(t,.4,300,1210,.16,"sine");
    oscillator(t+.12,.38,1010,160,.06,"triangle");
    break;
  }
 }
 function stop(){
  while(timers.length)clearTimeout(timers.pop());
  for(const source of sources){try{source.stop();}catch{}}
  sources.clear();
 }
 function play(cues){
  if(!enabled||!context||context.state!=="running")return false;
  stop();
  // Build all cues against ONE audio clock to avoid setTimeout drift and
  // keep the shot and impact synchronized with their 3D camera phases.
  const start=context.currentTime+.025;
  try{
   for(const {name,ms} of cues)cue(name,start+ms/1000);
   return true;
  }catch(error){
   stop();return false;
  }
 }
 function playFirstShot(){return play(SNIPER_SOUND_CUES);}
 function playTeleport(){return play(SNIPER_TELEPORT_CUES);}
 function playFallbackShot(){return play(SNIPER_FALLBACK_CUES);}
 function dispose(){
  stop();
  if(context){const current=context;context=null;master=null;noiseBuffer=null;
   void current.close().catch(()=>{});}
 }
 return {unlock,setEnabled,playFirstShot,playFallbackShot,playTeleport,stop,dispose,
  get enabled(){return enabled;},get ready(){return !!context&&context.state==="running";}};
}
