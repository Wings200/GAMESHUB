// BLACKOUT reboot · isolated footstep events and lightweight procedural audio.
// No samples, network requests, game physics changes, or external audio dependencies.
export const STEP_LENGTH=Object.freeze({walk:1.2,sprint:1.48,crouch:1.04,prone:.64});
export function newFootstepTracker(){
 return {meters:0,active:false,wasGrounded:true,foot:0};
}
export function advanceFootsteps(previous, before, after){
 const tracker={...previous},events=[];
 if(!after.grounded){
  tracker.meters=0;tracker.active=false;tracker.wasGrounded=false;
  return {tracker,events};
 }
 if(!tracker.wasGrounded){
  const impact=Math.min(1,Math.max(.25,Math.abs(before.vy||0)/7));
  events.push({type:"land",intensity:impact});
  tracker.wasGrounded=true;tracker.meters=0;tracker.active=false;
  return {tracker,events};
 }
 const traveled=Math.hypot(after.x-before.x,after.z-before.z);
 if(!Number.isFinite(traveled)||traveled<.002){
  tracker.meters=0;tracker.active=false;
  return {tracker,events};
 }
 const gait=after.prone?"prone":after.crouched?"crouch":after.sprinting?"sprint":"walk";
 const emit=()=>{
  events.push({type:"step",gait,foot:tracker.foot%2});
  tracker.foot++;
 };
 if(!tracker.active){
  tracker.active=true;tracker.meters=0;
  emit(); // First foot plants when the player starts moving.
 }else{
  tracker.meters+=traveled;
  let count=0;
  while(tracker.meters>=STEP_LENGTH[gait]&&count++<3){
   tracker.meters-=STEP_LENGTH[gait];
   emit();
  }
 }
 return {tracker,events};
}

const SOUND={
 walk:{level:.50,low:150,high:1100,duration:.095},
 sprint:{level:.74,low:175,high:1560,duration:.113},
 crouch:{level:.22,low:115,high:720,duration:.075},
 prone:{level:.12,low:85,high:480,duration:.16},
 land:{level:.92,low:110,high:930,duration:.17}
};
export class FootstepAudio{
 constructor(){
  this.context=null;
  this.noise=null;
  this.master=null;
  this.muted=false;
 }
 // Call from the user-initiated ENTER TEST RANGE button to respect autoplay rules.
 unlock(){
  const Ctor=globalThis.AudioContext||globalThis.webkitAudioContext;
  if(!Ctor)return Promise.resolve(false);
  try{
   if(!this.context){
    this.context=new Ctor();
    const context=this.context;
    this.master=context.createGain();
    this.master.gain.value=.68;
    this.master.connect(context.destination);
    const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*.5),context.sampleRate);
    const samples=buffer.getChannelData(0);
    let seed=0x142c73a1;
    for(let i=0;i<samples.length;i++){
     seed=(Math.imul(seed,1664525)+1013904223)>>>0;
     samples[i]=(seed/2147483648)-1;
    }
    this.noise=buffer;
   }
   if(this.context.state==="suspended")return this.context.resume().then(()=>true).catch(()=>false);
   return Promise.resolve(this.context.state==="running");
  }catch{return Promise.resolve(false);}
 }
 toggleMute(){
  this.muted=!this.muted;
  return this.muted;
 }
 play(events){
  if(this.muted||!this.context||this.context.state!=="running")return;
  for(const event of events){
   if(event.type==="step")this.playOne(event.gait,event.foot,.85+Math.random()*.3);
   else if(event.type==="land")this.playOne("land",0,event.intensity);
  }
 }
 playOne(kind,foot,variation){
  const ctx=this.context,settings=SOUND[kind],now=ctx.currentTime;
  if(!settings||!this.noise||!this.master)return;
  const level=settings.level*variation;
  const duration=settings.duration;
  const pan=typeof ctx.createStereoPanner==="function"?ctx.createStereoPanner():null;
  if(pan){
   pan.pan.setValueAtTime(kind==="land"?0:foot===0?-.13:.13,now);
   pan.connect(this.master);
  }
  const output=pan||this.master;
  // Soft sole-impact thud.
  const thud=ctx.createOscillator(),thudEnvelope=ctx.createGain();
  thud.type="sine";
  thud.frequency.setValueAtTime(settings.low*(.93+Math.random()*.14),now);
  thud.frequency.exponentialRampToValueAtTime(Math.max(35,settings.low*.53),now+duration*.85);
  thudEnvelope.gain.setValueAtTime(Math.max(.0001,level*.29),now);
  thudEnvelope.gain.exponentialRampToValueAtTime(.0001,now+duration);
  thud.connect(thudEnvelope);thudEnvelope.connect(output);
  thud.start(now);thud.stop(now+duration+.003);
  // Short, filtered shuffle/crunch for a dry concrete test floor (soft dragging while prone).
  const noise=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),envelope=ctx.createGain();
  noise.buffer=this.noise;
  filter.type="bandpass";filter.frequency.value=settings.high*(.85+Math.random()*.3);
  filter.Q.value=.64;
  envelope.gain.setValueAtTime(.0001,now);
  envelope.gain.linearRampToValueAtTime(Math.max(.0002,level*.8),now+.004);
  envelope.gain.exponentialRampToValueAtTime(.0001,now+duration);
  noise.connect(filter);filter.connect(envelope);envelope.connect(output);
  noise.start(now,Math.random()*.15,duration+.01);
 }
}
