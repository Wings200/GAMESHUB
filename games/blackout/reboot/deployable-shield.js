// BLACKOUT V0.24.0 · portable bulletproof defender cover, collision,
// preview validation, explosive destruction, and pickup.
export const DEPLOYABLE_SHIELD=Object.freeze({
 charges:2,placeDistance:1.5,pickupRange:2.5,
 width:1.65,height:1.28,depth:.21,worldLimit:28.9,
 explosionLabels:Object.freeze(["IMPACT","C4","FRAG","SOFT BREACH","HARD BREACH"])
});
export function newShieldState(){return {charges:DEPLOYABLE_SHIELD.charges,nextId:1,devices:[]};}
export function shieldCandidate(player){
 if(!player||![player.x,player.y,player.z,player.yaw].every(Number.isFinite))return null;
 // Cardinal orientation is deliberate: BLACKOUT's physical walls/physics
 // use AABBs, and our real mesh aligns with exactly the same obstacle.
 const quarter=Math.round(player.yaw/(Math.PI/2));
 const yaw=quarter*Math.PI/2;
 return {x:player.x-Math.sin(player.yaw)*DEPLOYABLE_SHIELD.placeDistance,
  y:0,z:player.z-Math.cos(player.yaw)*DEPLOYABLE_SHIELD.placeDistance,
  yaw};
}
export function shieldCollider(device){
 const xFacing=Math.abs(Math.sin(device.yaw))>.5;
 return {id:"deployable-shield-"+device.id,x:device.x,z:device.z,
  width:xFacing?DEPLOYABLE_SHIELD.depth:DEPLOYABLE_SHIELD.width,
  depth:xFacing?DEPLOYABLE_SHIELD.width:DEPLOYABLE_SHIELD.depth,
  height:DEPLOYABLE_SHIELD.height,bottom:0};
}
export function liveShields(state){return state?.devices?.filter(d=>d.intact)||[];}
export function shieldBlockers(state){return liveShields(state).map(shieldCollider);}
export function canPlaceShield(state,player,obstacles=[]){
 if(!state||state.charges<=0)return {ok:false,reason:"NO DEPLOYABLE SHIELDS LEFT"};
 if(!player?.grounded||player.y>.12||player.prone)
  return {ok:false,reason:"STAND OR CROUCH ON THE FLOOR TO PLACE SHIELD"};
 const point=shieldCandidate(player);
 if(!point)return {ok:false,reason:"INVALID SHIELD PLACEMENT"};
 const body=shieldCollider({...point,id:0});
 const halfW=body.width/2+.38,halfD=body.depth/2+.38;
 if(Math.abs(point.x)+halfW>=DEPLOYABLE_SHIELD.worldLimit||
  Math.abs(point.z)+halfD>=DEPLOYABLE_SHIELD.worldLimit)
  return {ok:false,reason:"SHIELD OUTSIDE PLAYABLE RANGE"};
 for(const o of obstacles){
  if((o.bottom??0)>=DEPLOYABLE_SHIELD.height||o.height<=0)continue;
  const ox=(o.width??0)/2,oz=(o.depth??0)/2;
  if(Math.abs(point.x-o.x)<body.width/2+ox+.14&&
     Math.abs(point.z-o.z)<body.depth/2+oz+.14)
   return {ok:false,reason:"SHIELD PLACEMENT BLOCKED BY SOLID OBJECT"};
 }
 // Multiple deployed shields never overlap, even if caller did not include
 // previously placed devices in its obstacle list.
 for(const d of liveShields(state)){
  const o=shieldCollider(d);
  if(Math.abs(point.x-d.x)<body.width/2+o.width/2+.15&&
     Math.abs(point.z-d.z)<body.depth/2+o.depth/2+.15)
   return {ok:false,reason:"SHIELD TOO CLOSE TO ANOTHER SHIELD"};
 }
 return {ok:true,point};
}
export function placeShield(state,player,obstacles=[]){
 const placement=canPlaceShield(state,player,obstacles);
 if(!placement.ok)return {state,device:null,reason:placement.reason};
 const d={...placement.point,id:state.nextId,intact:true};
 return {state:{...state,charges:state.charges-1,nextId:state.nextId+1,
  devices:[...state.devices,d]},device:d,
  reason:"BULLETPROOF SHIELD DEPLOYED · SPACE TO VAULT · F RECOVER"};
}
export function pickupShield(state,id,player){
 const d=liveShields(state).find(x=>x.id===id);
 if(!d)return {state,device:null,reason:"NO INTACT SHIELD TO RECOVER"};
 if(!player||![player.x,player.y,player.z].every(Number.isFinite))
  return {state,device:null,reason:"INVALID PICKUP POSITION"};
 const dist=Math.hypot(player.x-d.x,player.z-d.z);
 if(dist>DEPLOYABLE_SHIELD.pickupRange||Math.abs(player.y)>.5)
  return {state,device:null,reason:"MOVE CLOSER TO SHIELD TO PICK UP"};
 return {state:{...state,charges:Math.min(DEPLOYABLE_SHIELD.charges,state.charges+1),
  devices:state.devices.filter(x=>x.id!==id)},device:d,
  reason:"DEPLOYABLE SHIELD RECOVERED · +1 SHIELD"};
}
export function blastDestroysShield(blast,device,label){
 if(!DEPLOYABLE_SHIELD.explosionLabels.includes(label)||!blast||
  ![blast.x,blast.y,blast.z,blast.radius].every(Number.isFinite)||
  !device?.intact)return false;
 const collider=shieldCollider(device);
 const dx=Math.max(0,Math.abs(blast.x-collider.x)-collider.width/2);
 const dz=Math.max(0,Math.abs(blast.z-collider.z)-collider.depth/2);
 const dy=blast.y>collider.height?blast.y-collider.height:blast.y<0?-blast.y:0;
 return Math.hypot(dx,dy,dz)<=blast.radius;
}
export function blastShields(state,blast,label){
 if(!state||!DEPLOYABLE_SHIELD.explosionLabels.includes(label))
  return {state,destroyed:[]};
 const destroyed=liveShields(state).filter(d=>blastDestroysShield(blast,d,label)).map(d=>d.id);
 if(!destroyed.length)return {state,destroyed:[]};
 const ids=new Set(destroyed);
 return {state:{...state,devices:state.devices.map(d=>
   ids.has(d.id)?{...d,intact:false}:d)},destroyed};
}
