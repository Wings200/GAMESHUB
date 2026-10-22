// BLACKOUT V0.22.0 · defender observation blockers.
// A physical floor projector casts an electronic curtain seen by *recon
// cameras only*. Operators still see normally through the projection.
// Placement, combat damage, recovery and side gating stay deterministic.
export const OBS_BLOCKER=Object.freeze({
 charges:2,placeDistance:1.52,pickupRange:2.45,
 footprint:.30,worldLimit:29.1,health:2,
 screenWidth:2.8,screenHeight:2.25,
 screenOffset:.45,screenBottom:.07
});
export function newObservationBlockerState(){
 return {charges:OBS_BLOCKER.charges,nextId:1,devices:[]};
}
export function blockerPosition(player){
 if(!player||![player.x,player.y,player.z,player.yaw].every(Number.isFinite))return null;
 return {x:player.x-Math.sin(player.yaw)*OBS_BLOCKER.placeDistance,
  y:0,z:player.z-Math.cos(player.yaw)*OBS_BLOCKER.placeDistance,
  yaw:player.yaw,hp:OBS_BLOCKER.health};
}
export function projectorCurtain(device){
 if(!device||!Number.isFinite(device.yaw))return null;
 return {x:device.x-Math.sin(device.yaw)*OBS_BLOCKER.screenOffset,
  z:device.z-Math.cos(device.yaw)*OBS_BLOCKER.screenOffset,
  bottom:OBS_BLOCKER.screenBottom,top:OBS_BLOCKER.screenBottom+OBS_BLOCKER.screenHeight,
  width:OBS_BLOCKER.screenWidth,yaw:device.yaw};
}
function overlap(p,o,pad=0){
 if((o.bottom??0)>.35||(o.height??0)<=.05)return false;
 return Math.abs(p.x-o.x)<(o.width||0)/2+pad&&
  Math.abs(p.z-o.z)<(o.depth||0)/2+pad;
}
export function canPlaceObservationBlocker(state,player,obstacles=[]){
 if(!state||state.charges<=0)return {ok:false,reason:"NO OBSERVATION BLOCKERS LEFT"};
 if(!player?.grounded||player.y>.13)return {ok:false,reason:"STAND ON THE FLOOR TO PLACE BLOCKER"};
 const p=blockerPosition(player);
 if(!p)return {ok:false,reason:"INVALID OBSERVATION BLOCKER AIM"};
 if(Math.abs(p.x)>OBS_BLOCKER.worldLimit||Math.abs(p.z)>OBS_BLOCKER.worldLimit)
  return {ok:false,reason:"OUTSIDE THE TRAINING RANGE"};
 const screen=projectorCurtain(p);
 // Prevent placing the base through a wall or projecting the field inside
 // a full solid panel; the field never becomes a player collision barrier.
 if(obstacles.some(o=>overlap(p,o,OBS_BLOCKER.footprint)||
  overlap({x:screen.x,z:screen.z},o,OBS_BLOCKER.footprint)))
  return {ok:false,reason:"BLOCKER PROJECTOR OBSTRUCTED · MOVE AWAY FROM WALL"};
 if(state.devices.some(d=>d.hp>0&&Math.hypot(d.x-p.x,d.z-p.z)<1.25))
  return {ok:false,reason:"TOO CLOSE TO ANOTHER OBSERVATION BLOCKER"};
 return {ok:true,position:p};
}
export function placeObservationBlocker(state,player,obstacles=[]){
 const result=canPlaceObservationBlocker(state,player,obstacles);
 if(!result.ok)return {state,device:null,reason:result.reason};
 const device={...result.position,id:state.nextId};
 return {state:{...state,charges:state.charges-1,nextId:state.nextId+1,
  devices:[...state.devices,device]},device,
  reason:"OBSERVATION BLOCKER DEPLOYED · DRONE VISION DENIED"};
}
export function pickupObservationBlocker(state,id,player){
 const device=state?.devices?.find(d=>d.id===id&&d.hp>0);
 if(!device)return {state,device:null,reason:"NO ACTIVE OBSERVATION BLOCKER"};
 if(!player||![player.x,player.y,player.z].every(Number.isFinite))
  return {state,device:null,reason:"INVALID PICKUP POSITION"};
 if(Math.hypot(device.x-player.x,device.z-player.z)>OBS_BLOCKER.pickupRange||
  Math.abs(player.y-device.y)>1.05)
  return {state,device:null,reason:"GET CLOSER TO OBSERVATION BLOCKER"};
 return {state:{...state,charges:Math.min(OBS_BLOCKER.charges,state.charges+1),
  devices:state.devices.filter(d=>d.id!==id)},
  device,reason:"OBSERVATION BLOCKER RECOVERED · +1 CHARGE"};
}
export function damageObservationBlocker(state,id,hits=1){
 const device=state?.devices?.find(d=>d.id===id&&d.hp>0);
 if(!device||!Number.isFinite(hits)||hits<=0)return {state,handled:false,destroyed:false};
 const hp=Math.max(0,device.hp-Math.floor(hits));
 if(hp===device.hp)return {state,handled:false,destroyed:false};
 const next=state.devices.map(d=>d.id===id?{...d,hp}:d);
 return {state:{...state,devices:next},handled:true,destroyed:hp===0,remainingHP:hp};
}
export function blockerScreenVisible(device,viewMode){
 return Boolean(device?.hp>0&&viewMode==="drone");
}
export function activeObservationBlockers(state){
 return state?.devices?.filter(d=>d.hp>0)||[];
}
