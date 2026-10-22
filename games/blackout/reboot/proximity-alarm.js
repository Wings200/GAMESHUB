// BLACKOUT V0.23.0 · defender Proximity Alarms.
// Real floor/wall surfaces, enemy-only range, blocked line of sight,
// repeating beep-beep-BEEP! when enemies remain nearby, F recovery.
import {isLineOfSightClear} from "./range-layout.js?v=reboot-010";
export const PROXIMITY=Object.freeze({
 charges:2,range:4.35,placeRange:3.0,placeForward:1.45,
 pickupRange:2.6,worldLimit:29.15,hp:2,repeatSeconds:3.25,
 minWallY:.40,maxWallY:2.7,wallStandOff:.19,groundRadius:.34
});
export function newProximityState(){return {charges:PROXIMITY.charges,nextId:1,devices:[]};}
function direction(player){
 const cos=Math.cos(player.pitch||0);
 return {x:-Math.sin(player.yaw)*cos,
  y:Math.sin(player.pitch||0),z:-Math.cos(player.yaw)*cos};
}
// First solid ray/AABB face in the actual physics obstacle list.
// Reject floor, roof and inside-wall origins: wall gadgets must attach
// to vertical, visible faces rather than teleport through cover.
export function wallAlarmAim(player,obstacles=[]){
 if(!player||![player.x,player.y,player.z,player.yaw,player.pitch].every(Number.isFinite))return null;
 const eye={x:player.x,y:player.y+(player.prone?.44:player.crouched?1.08:1.65),z:player.z};
 const d=direction(player);let best=null;
 for(const o of obstacles){
  if(![o.x,o.z,o.width,o.depth,o.height].every(Number.isFinite))continue;
  const box=[[o.x-o.width/2,o.x+o.width/2],[o.bottom??0,o.height],
   [o.z-o.depth/2,o.z+o.depth/2]];
  const origins=[eye.x,eye.y,eye.z],dirs=[d.x,d.y,d.z];
  let near=0,far=PROXIMITY.placeRange,axis=-1,sign=0;
  for(let k=0;k<3;k++){
   if(Math.abs(dirs[k])<1e-9){
    if(origins[k]<box[k][0]||origins[k]>box[k][1]){near=Infinity;break;}
    continue;
   }
   const a=(box[k][0]-origins[k])/dirs[k],b=(box[k][1]-origins[k])/dirs[k];
   const entry=Math.min(a,b),leave=Math.max(a,b);
   if(entry>near){near=entry;axis=k;sign=dirs[k]>0?-1:1;}
   far=Math.min(far,leave);
   if(near>far)break;
  }
  if(near<=far&&near>.1&&axis!==-1&&(!best||near<best.distance)){
   // IMPORTANT: the nearest solid hit owns the ray even if it is
   // the floor/roof of a crate; do not attach through nearer props.
   best={distance:near,axis,normalSign:sign,
    x:eye.x+d.x*near,y:eye.y+d.y*near,z:eye.z+d.z*near,
    object:o};
  }
 }
 if(!best||![0,2].includes(best.axis)||
  best.y<PROXIMITY.minWallY||best.y>PROXIMITY.maxWallY)return null;
 const nx=best.axis===0?best.normalSign:0;
 const nz=best.axis===2?best.normalSign:0;
 return {x:best.x+nx*PROXIMITY.wallStandOff,y:best.y,
  z:best.z+nz*PROXIMITY.wallStandOff,
  nx,nz,normalYaw:Math.atan2(-nx,-nz),mount:"wall",surface:best.object.id};
}
function floorPosition(player){
 const dx=-Math.sin(player.yaw)*PROXIMITY.placeForward;
 const dz=-Math.cos(player.yaw)*PROXIMITY.placeForward;
 return {x:player.x+dx,y:.12,z:player.z+dz,
  mount:"floor",normalYaw:player.yaw,nx:0,nz:0,surface:"ground"};
}
function baseClips(position,obstacles){
 return obstacles.some(o=>{
  if((o.bottom??0)>.5||o.height<.12)return false;
  return Math.abs(position.x-o.x)<o.width/2+PROXIMITY.groundRadius&&
   Math.abs(position.z-o.z)<o.depth/2+PROXIMITY.groundRadius;
 });
}
export function canPlaceProximity(state,player,obstacles=[]){
 if(!state||state.charges<=0)return {ok:false,reason:"NO PROXIMITY ALARMS LEFT"};
 if(!player||![player.x,player.y,player.z,player.yaw,player.pitch].every(Number.isFinite))
  return {ok:false,reason:"INVALID AIM"};
 if(!player.grounded||player.y>.12)
  return {ok:false,reason:"GET ON THE GROUND TO DEPLOY ALARM"};
 const wall=wallAlarmAim(player,obstacles);
 const point=wall||floorPosition(player);
 if(Math.abs(point.x)>PROXIMITY.worldLimit||Math.abs(point.z)>PROXIMITY.worldLimit)
  return {ok:false,reason:"OUTSIDE THE TESTING RANGE"};
 if(point.mount==="floor"&&baseClips(point,obstacles))
  return {ok:false,reason:"ALARM FLOOR SPOT BLOCKED · AIM AT A WALL"};
 if(state.devices.some(d=>d.hp>0&&Math.hypot(d.x-point.x,d.y-point.y,d.z-point.z)<.85))
  return {ok:false,reason:"TOO CLOSE TO ANOTHER PROXIMITY ALARM"};
 return {ok:true,position:point};
}
export function placeProximity(state,player,obstacles=[]){
 const result=canPlaceProximity(state,player,obstacles);
 if(!result.ok)return {state,device:null,reason:result.reason};
 const device={...result.position,id:state.nextId,hp:PROXIMITY.hp,
  cooldown:0,triggered:false};
 return {state:{...state,charges:state.charges-1,
  nextId:state.nextId+1,devices:[...state.devices,device]},
  device,reason:device.mount==="wall"?
   "PROXIMITY ALARM MOUNTED TO WALL · "+PROXIMITY.range+"M RANGE":
   "PROXIMITY ALARM PLACED ON FLOOR · "+PROXIMITY.range+"M RANGE"};
}
export function pickupProximity(state,id,player){
 const d=state?.devices?.find(d=>d.id===id&&d.hp>0);
 if(!d)return {state,device:null,reason:"NO LIVE PROXIMITY ALARM"};
 if(!player||![player.x,player.y,player.z].every(Number.isFinite))
  return {state,device:null,reason:"INVALID PICKUP"};
 const eye=player.y+(player.prone?.44:player.crouched?1.08:1.65);
 if(Math.hypot(player.x-d.x,eye-d.y,player.z-d.z)>PROXIMITY.pickupRange)
  return {state,device:null,reason:"GET CLOSER TO YOUR ALARM"};
 return {state:{...state,charges:Math.min(PROXIMITY.charges,state.charges+1),
  devices:state.devices.filter(p=>p.id!==id)},device,
  reason:"PROXIMITY ALARM RECOVERED · +1"};
}
export function damageProximity(state,id,damage=1){
 const d=state?.devices?.find(d=>d.id===id&&d.hp>0);
 if(!d||!Number.isFinite(damage)||damage<=0)
  return {state,handled:false,destroyed:false};
 const hp=Math.max(0,d.hp-Math.floor(damage));
 if(hp===d.hp)return {state,handled:false,destroyed:false};
 return {state:{...state,devices:state.devices.map(p=>p.id===id?{...p,hp}:p)},
  handled:true,destroyed:hp===0,hp};
}
export function liveProximity(state){return state?.devices?.filter(d=>d.hp>0)||[];}
export function alarmDetectsEnemy(device,enemy,obstacles=[]){
 if(!device||device.hp<=0||!enemy||enemy.side!=="attack"||enemy.alive===false||
  ![enemy.x,enemy.y??0,enemy.z].every(Number.isFinite))return false;
 const px=enemy.x,py=(enemy.y||0)+.88,pz=enemy.z;
 if(Math.hypot(device.x-px,device.y-py,device.z-pz)>PROXIMITY.range)return false;
 // Ground-mounted devices see from above ground. Wall-mounted hardware is
 // moved .19m outside its own wall so the origin is not inside its support.
 return isLineOfSightClear(
  {x:device.x,y:device.y+.07,z:device.z},
  {x:px,y:py,z:pz},obstacles);
}
export function tickProximity(state,dt,enemies=[],obstacles=[]){
 if(!state)return {state,alerts:[]};
 const delta=Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0));
 if(!delta)return {state,alerts:[]};
 const alerts=[];
 const devices=state.devices.map(d=>{
  if(d.hp<=0)return d;
  const seen=enemies.find(e=>alarmDetectsEnemy(d,e,obstacles));
  if(!seen)return {...d,cooldown:0,triggered:false};
  const cooldown=Math.max(0,(d.cooldown||0)-delta);
  if(d.triggered&&cooldown>0)return {...d,cooldown};
  alerts.push({id:d.id,x:d.x,y:d.y,z:d.z,
   enemyId:seen.id||"attacker",sound:"proximity"});
  return {...d,triggered:true,cooldown:PROXIMITY.repeatSeconds};
 });
 return {state:{...state,devices},alerts};
}
