// BLACKOUT V0.16 · physically thrown C4 / Nitro Cell for the defender.
// Gameplay-only state with genuine flight, collision, armed persistence, remote
// detonation and bounded blast strength; deliberately no real-world instructions.
export const NITRO=Object.freeze({
 charges:1,throwSpeed:8,upSpeed:3.3,gravity:18,radius:3.7,
 maxLife:60,blastDamage:280,fullDamageRadius:1.1,lethalRadius:1.8,
 boxSize:.32,pickupRange:2.2,pickupHeight:1.85
});
export function newNitroState(){
 return {charges:NITRO.charges,nextId:1,devices:[]};
}
export function nitroThrowPosition(player){
 if(!player||![player.x,player.y,player.z,player.yaw,player.pitch].every(Number.isFinite))return null;
 const fx=-Math.sin(player.yaw),fz=-Math.cos(player.yaw);
 return {x:player.x+fx*.65,y:player.y+(player.crouched?1.0:player.prone?.42:1.42),
  z:player.z+fz*.65,vx:fx*NITRO.throwSpeed,vz:fz*NITRO.throwSpeed,
  vy:NITRO.upSpeed+Math.sin(player.pitch)*-3.2};
}
export function throwNitro(state,player){
 if(!state||state.charges<=0)return {state,device:null,reason:"NO NITRO CELLS REMAINING"};
 if(state.devices.some(d=>d.armed))return {state,device:null,reason:"DETONATE DEPLOYED C4 FIRST"};
 const position=nitroThrowPosition(player);
 if(!position)return {state,device:null,reason:"INVALID THROW POSITION"};
 const device={...position,id:state.nextId,age:0,armed:true,stuck:false};
 return {state:{charges:state.charges-1,nextId:state.nextId+1,
  devices:[...state.devices,device]},device,reason:"C4 THROWN · PRESS SAME KEY TO DETONATE"};
}
// Retrieving a planted (settled) charge is an inventory action, not a
// detonation. Only the nearby defender can recover it; the main controller
// separately requires center-screen aim and a clear line of sight.
export function pickupNitro(state,deviceId,player){
 if(!state||!Array.isArray(state.devices))return {state,device:null,reason:"NO C4 TO PICK UP"};
 const device=state.devices.find(d=>d.id===deviceId&&d.armed);
 if(!device)return {state,device:null,reason:"NO ARMED C4 TO PICK UP"};
 if(!device.stuck)return {state,device:null,reason:"WAIT FOR C4 TO LAND"};
 if(!player||![player.x,player.y,player.z].every(Number.isFinite))
  return {state,device:null,reason:"INVALID PLAYER POSITION"};
 if(Math.hypot(player.x-device.x,player.z-device.z)>NITRO.pickupRange||
   Math.abs(player.y-device.y)>NITRO.pickupHeight)
  return {state,device:null,reason:"MOVE CLOSER TO C4"};
 // Remove rather than dearm the device. This keeps the current active charge
 // unambiguous after repeated pickup -> throw -> pickup cycles.
 return {state:{...state,charges:Math.min(NITRO.charges,state.charges+1),
   devices:state.devices.filter(d=>d.id!==deviceId)},
  device,reason:"C4 RETRIEVED · 1/1 READY"};
}
function contactsSolid(x,y,z,obstacles){
 return obstacles.some(o=>{
  const bottom=o.bottom??0,top=o.height??0;
  return y>=bottom-.15&&y<=top+.15&&
   Math.abs(x-o.x)<=o.width/2+NITRO.boxSize/2&&
   Math.abs(z-o.z)<=o.depth/2+NITRO.boxSize/2;
 });
}
export function tickNitro(state,dt,obstacles=[]){
 const step=Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0));
 if(step===0)return state;
 let changed=false;
 const devices=state.devices.map(d=>{
  if(!d.armed||d.stuck)return d;
  const vx=d.vx,vy=d.vy-NITRO.gravity*step,vz=d.vz;
  const x=d.x+vx*step,z=d.z+vz*step,y=d.y+vy*step;
  const stuck=y<=NITRO.boxSize/2||contactsSolid(x,y,z,obstacles)||
   Math.abs(x)>29.6||Math.abs(z)>29.6||d.age+step>=NITRO.maxLife;
  changed=true;
  return stuck?{...d,x:Math.max(-29.5,Math.min(29.5,stuck&&contactsSolid(x,y,z,obstacles)?d.x:x)),
     y:Math.max(NITRO.boxSize/2,stuck&&contactsSolid(x,y,z,obstacles)?d.y:y),
     z:Math.max(-29.5,Math.min(29.5,stuck&&contactsSolid(x,y,z,obstacles)?d.z:z)),
     vx:0,vy:0,vz:0,stuck:true,age:d.age+step}:
    {...d,x,y,z,vy,age:d.age+step};
 });
 return changed?{...state,devices}:state;
}
export function detonateNitro(state){
 const armed=state.devices.find(d=>d.armed);
 if(!armed)return {state,blast:null,reason:"THROW C4 BEFORE DETONATING"};
 return {state:{...state,devices:state.devices.map(d=>d.id===armed.id?{...d,armed:false}:d)},
  blast:{x:armed.x,y:armed.y,z:armed.z,radius:NITRO.radius,damage:NITRO.blastDamage,
   fullDamageRadius:NITRO.fullDamageRadius,lethalRadius:NITRO.lethalRadius},
  reason:"NITRO CELL DETONATED"};
}
// Blast exposure is independent of faction, including the thrower.
function blastDistance(blast,point){
 if(!blast||!point||![blast.x,blast.y,blast.z,point.x,point.z,point.y??0].every(Number.isFinite))
  return Infinity;
 return Math.hypot(point.x-blast.x,(point.y??0)-blast.y,point.z-blast.z);
}
export function nitroBlastDamage(blast,point){
 if(!blast||!Number.isFinite(blast.radius)||blast.radius<=0||
   !Number.isFinite(blast.damage)||blast.damage<=0)return 0;
 const distance=blastDistance(blast,point);
 if(distance>=blast.radius)return 0;
 const full=Math.min(blast.radius,Math.max(0,blast.fullDamageRadius??0));
 const proportion=distance<=full?1:(blast.radius-distance)/(blast.radius-full);
 return Math.max(1,Math.ceil(blast.damage*proportion));
}
export function nitroBlastIsLethal(blast,point){
 if(!blast||!Number.isFinite(blast.lethalRadius)||blast.lethalRadius<=0||
   !Number.isFinite(blast.radius)||blast.radius<=0)return false;
 return blastDistance(blast,point)<=Math.min(blast.lethalRadius,blast.radius);
}
