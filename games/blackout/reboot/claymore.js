// BLACKOUT V0.21.0 · attacker claymores: physical ground placement,
// three directionally oriented red trip lasers, detection, occlusion, pickup.
// Pure deterministic sandbox state; no multiplayer or live services.
export const CLAYMORE=Object.freeze({
 charges:2,placeDistance:1.65,footprint:.35,worldLimit:29.0,
 pickupRange:2.5,armSeconds:.7,beamRange:3.1,
 beamAngles:Object.freeze([-.37,0,.37]),tripWidth:.34,
 blastRadius:4.1,blastDamage:175,lethalRadius:1.35,
 blastHalfAngle:1.15
});
export function newClaymoreState(){return {charges:CLAYMORE.charges,nextId:1,devices:[]};}
export function claymoreDirection(yaw){
 return {x:-Math.sin(yaw),z:-Math.cos(yaw)};
}
export function claymorePosition(player){
 if(!player||![player.x,player.y,player.z,player.yaw].every(Number.isFinite))return null;
 const forward=claymoreDirection(player.yaw);
 return {x:player.x+forward.x*CLAYMORE.placeDistance,
  y:0,z:player.z+forward.z*CLAYMORE.placeDistance,yaw:player.yaw};
}
function insideBlock(x,z,o,pad=0){
 return Math.abs(x-o.x)<(o.width||0)/2+pad&&
  Math.abs(z-o.z)<(o.depth||0)/2+pad&&(o.bottom??0)<.26&&
  (o.height??0)>.12;
}
export function canPlaceClaymore(state,player,obstacles=[]){
 if(!state||state.charges<=0)return {ok:false,reason:"NO CLAYMORES REMAINING"};
 if(!player?.grounded||player.y>.12)
  return {ok:false,reason:"STAND ON THE GROUND TO PLACE CLAYMORE"};
 const p=claymorePosition(player);
 if(!p)return {ok:false,reason:"INVALID CLAYMORE PLACEMENT"};
 if(Math.abs(p.x)>CLAYMORE.worldLimit||Math.abs(p.z)>CLAYMORE.worldLimit)
  return {ok:false,reason:"CLAYMORE OUTSIDE TEST RANGE"};
 if(obstacles.some(o=>insideBlock(p.x,p.z,o,CLAYMORE.footprint)))
  return {ok:false,reason:"CLAYMORE PLACEMENT BLOCKED · CLEAR THE FLOOR"};
 if(state.devices.some(d=>d.armed&&Math.hypot(d.x-p.x,d.z-p.z)<.8))
  return {ok:false,reason:"TOO CLOSE TO ANOTHER CLAYMORE"};
 return {ok:true,position:p};
}
export function placeClaymore(state,player,obstacles=[]){
 const check=canPlaceClaymore(state,player,obstacles);
 if(!check.ok)return {state,device:null,reason:check.reason};
 const device={...check.position,id:state.nextId,armed:true,armAge:0};
 return {state:{...state,charges:state.charges-1,nextId:state.nextId+1,
  devices:[...state.devices,device]},device,reason:"CLAYMORE PLANTED · LASERS ARM IN 0.7S"};
}
export function pickupClaymore(state,id,player){
 const device=state?.devices?.find(d=>d.id===id&&d.armed);
 if(!device)return {state,device:null,reason:"NO ACTIVE CLAYMORE TO PICK UP"};
 if(!player||![player.x,player.y,player.z].every(Number.isFinite))
  return {state,device:null,reason:"INVALID CLAYMORE PICKUP"};
 if(Math.hypot(device.x-player.x,device.z-player.z)>CLAYMORE.pickupRange||
  Math.abs(player.y-device.y)>1.0)
  return {state,device:null,reason:"MOVE CLOSER TO YOUR CLAYMORE"};
 return {state:{...state,charges:Math.min(CLAYMORE.charges,state.charges+1),
  devices:state.devices.filter(d=>d.id!==id)},device,
  reason:"CLAYMORE RECOVERED · +1 CHARGE"};
}
// Center, left, and right lasers use the same mathematical rays for world
// rendering and enemy contact checks; props and walls clip the laser path.
function rayObstacleDistance(x,z,dx,dz,obstacles,maxDistance){
 let distance=maxDistance;
 for(const o of obstacles){
  if((o.bottom??0)>.32||(o.height??0)<.12)continue;
  const minX=o.x-o.width/2,maxX=o.x+o.width/2;
  const minZ=o.z-o.depth/2,maxZ=o.z+o.depth/2;
  let enter=0,leave=distance;
  for(const [origin,dir,min,max] of [[x,dx,minX,maxX],[z,dz,minZ,maxZ]]){
   if(Math.abs(dir)<1e-8){if(origin<min||origin>max){enter=Infinity;break;}continue;}
   const a=(min-origin)/dir,b=(max-origin)/dir;
   enter=Math.max(enter,Math.min(a,b));leave=Math.min(leave,Math.max(a,b));
   if(enter>leave)break;
  }
  if(enter<=leave&&enter>=0)distance=Math.min(distance,enter);
 }
 return Math.max(0,distance);
}
export function claymoreLaserEndpoints(device,obstacles=[]){
 if(!device)return [];
 return CLAYMORE.beamAngles.map(offset=>{
  const dir=claymoreDirection(device.yaw+offset);
  const length=rayObstacleDistance(device.x,device.z,dir.x,dir.z,
   obstacles,CLAYMORE.beamRange);
  return {x:device.x+dir.x*length,y:.18,
   z:device.z+dir.z*length,length,angle:device.yaw+offset};
 });
}
export function claymoreSeesEnemy(device,enemy,obstacles=[]){
 if(!device?.armed||device.armAge<CLAYMORE.armSeconds||
  !enemy||enemy.side!=="defend"||enemy.alive===false)return false;
 if(![enemy.x,enemy.z,enemy.y??0].every(Number.isFinite))return false;
 if((enemy.y??0)>.75)return false; // trip beams are at shin height
 const vx=enemy.x-device.x,vz=enemy.z-device.z;
 const distance=Math.hypot(vx,vz);
 if(distance<.18||distance>CLAYMORE.beamRange+.15)return false;
 return claymoreLaserEndpoints(device,obstacles).some(beam=>{
  const dir=claymoreDirection(beam.angle);
  const forward=vx*dir.x+vz*dir.z;
  const side=Math.abs(vx*dir.z-vz*dir.x);
  return forward>.15&&forward<=beam.length+.03&&side<CLAYMORE.tripWidth;
 });
}
export function tickClaymores(state,dt,enemies=[],obstacles=[]){
 if(!state)return {state,blasts:[]};
 const step=Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0));
 if(!step)return {state,blasts:[]};
 const blasts=[];
 const devices=state.devices.flatMap(d=>{
  if(!d.armed)return [];
  const next={...d,armAge:Math.min(CLAYMORE.armSeconds,d.armAge+step)};
  const trigger=enemies.find(e=>claymoreSeesEnemy(next,e,obstacles));
  if(!trigger)return [next];
  blasts.push({id:d.id,x:d.x,y:.22,z:d.z,yaw:d.yaw,
   radius:CLAYMORE.blastRadius,damage:CLAYMORE.blastDamage,
   lethalRadius:CLAYMORE.lethalRadius,fullDamageRadius:.6,
   trigger:trigger.id??"enemy"});
  return [];
 });
 return {state:{...state,devices},blasts};
}
// A claymore blast fans FORWARD; unlike C4 its back side is not lethal.
export function claymoreBlastDamage(blast,point,obstacles=[]){
 if(!blast||!point||![blast.x,blast.z,blast.yaw,point.x,point.z].every(Number.isFinite))
  return 0;
 const vx=point.x-blast.x,vz=point.z-blast.z;
 const range=Math.hypot(vx,vz);
 const forward=claymoreDirection(blast.yaw);
 const projection=vx*forward.x+vz*forward.z;
 if(range>.02&&rayObstacleDistance(blast.x,blast.z,vx/range,vz/range,obstacles,range)<range-.04)return 0;
 if(projection<.02||range>=blast.radius||
  Math.acos(Math.min(1,Math.max(-1,projection/(range||1))))>CLAYMORE.blastHalfAngle)
  return 0;
 const scale=range<=blast.fullDamageRadius?1:
  (blast.radius-range)/(blast.radius-blast.fullDamageRadius);
 return Math.max(1,Math.ceil(blast.damage*scale));
}
export function claymoreBlastIsLethal(blast,point,obstacles=[]){
 return claymoreBlastDamage(blast,point,obstacles)>0&&
  Math.hypot(point.x-blast.x,point.z-blast.z)<=blast.lethalRadius;
}
