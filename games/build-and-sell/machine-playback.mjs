
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const angle=(n)=>Math.atan2(Math.sin(n),Math.cos(n));
const mixAngle=(a,b,t)=>a+angle(b-a)*t;
export function cleanMachineVisual(v){
 if(!v||!["yaw","reach","bucketY","bucketZ","curl"].every(k=>typeof v[k]==="number"&&Number.isFinite(v[k])))return null;
 return {yaw:angle(v.yaw),reach:clamp(v.reach,1.25,6.5),bucketY:clamp(v.bucketY,-1,4),bucketZ:clamp(v.bucketZ,-7,-.5),curl:clamp(v.curl,-1,2),load:v.load===true};
}
export function sampleMachine(machine,visual){
 const v=cleanMachineVisual(visual)||{yaw:machine.yaw,reach:3.2,bucketY:1.03,bucketZ:-3.2,curl:.12,load:false};
 return {...machine,visual:v};
}
export function blendMachine(a,b,t){
 t=clamp(t,0,1);const mix=(x,y)=>x+(y-x)*t;
 return {...b,x:mix(a.x,b.x),z:mix(a.z,b.z),yaw:mixAngle(a.yaw,b.yaw,t),visual:{yaw:mixAngle(a.visual.yaw,b.visual.yaw,t),reach:mix(a.visual.reach,b.visual.reach),bucketY:mix(a.visual.bucketY,b.visual.bucketY),bucketZ:mix(a.visual.bucketZ,b.visual.bucketZ),curl:mix(a.visual.curl,b.visual.curl),load:t<.5?a.visual.load:b.visual.load}};
}
// A short playback buffer absorbs ordinary HTTP polling jitter. Never
// extrapolate past the newest packet: a parked machine must stay parked.
export function createMachinePlayback(delay=330){
 let samples=[],driver=null,room=null,clock=null;
 function reset(){samples=[];driver=null;room=null;clock=null;}
 function push(machine,visual,now){
  const next=sampleMachine(machine,visual);
  if(room!==machine.room||driver!==machine.driver||!samples.length||Math.hypot(next.x-samples.at(-1).state.x,next.z-samples.at(-1).state.z)>12){samples=[{time:now,state:next}];driver=machine.driver;room=machine.room;clock=null;return;}
  const last=samples.at(-1);if(now<=last.time)return;
  samples.push({time:now,state:next});if(samples.length>20)samples.shift();
 }
 function read(now){
  if(!samples.length)return null;
  const desired=now-delay;
  if(clock===null)clock=desired;else clock=Math.max(clock,desired);
  while(samples.length>2&&samples[1].time<=clock)samples.shift();
  if(samples.length===1||clock<=samples[0].time)return samples[0].state;
  const a=samples[0],b=samples[1];return blendMachine(a.state,b.state,(clock-a.time)/(b.time-a.time));
 }
 return {push,read,reset};
}
