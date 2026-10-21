// BLACKOUT V0.15 · first PHYSICAL defender secondary: barbed wire.
// Deterministic placement, ammo, radius slowdown, firearm damage. This is a
// sandbox gadget, no 5v5 network replication, AI, melee, or live damage yet.
export const WIRE=Object.freeze({
 charges:2,radius:1.18,slowingMultiplier:.48,placeDistance:1.65,
 footprint:.74,maxBuildHeight:.2,hp:3,worldLimit:29.2,
 enemyDamage:10,damageInterval:.5,maxHealth:125
});
export function newWireState(){
 return {charges:WIRE.charges,nextId:1,devices:[]};
}
export function wirePlacePosition(player){
 if(!player||![player.x,player.z,player.yaw].every(Number.isFinite))return null;
 return {x:player.x-Math.sin(player.yaw)*WIRE.placeDistance,
  z:player.z-Math.cos(player.yaw)*WIRE.placeDistance,
  yaw:player.yaw};
}
export function canPlaceWire(state,player,obstacles=[]){
 if(!state||state.charges<=0)return {ok:false,reason:"NO BARBED WIRE REMAINING"};
 if(!player||!player.grounded||player.y>.15)
  return {ok:false,reason:"STAND ON THE GROUND TO PLACE BARBED WIRE"};
 const pos=wirePlacePosition(player);
 if(!pos)return {ok:false,reason:"INVALID PLACEMENT POSITION"};
 if(Math.abs(pos.x)>WIRE.worldLimit||Math.abs(pos.z)>WIRE.worldLimit)
  return {ok:false,reason:"BARBED WIRE OUTSIDE TEST RANGE"};
 for(const o of obstacles){
  if(o.bottom!==undefined&&o.bottom>WIRE.maxBuildHeight)continue;
  if(o.height!==undefined&&o.height<=0)continue;
  const dx=Math.abs(pos.x-o.x),dz=Math.abs(pos.z-o.z);
  if(dx<(o.width||0)/2+WIRE.footprint&&
     dz<(o.depth||0)/2+WIRE.footprint)
   return {ok:false,reason:"PLACEMENT BLOCKED · MOVE AWAY FROM WALL"};
 }
 if(state.devices.some(d=>d.hp>0&&Math.hypot(d.x-pos.x,d.z-pos.z)<WIRE.radius*1.7))
  return {ok:false,reason:"TOO CLOSE TO EXISTING BARBED WIRE"};
 return {ok:true,position:pos};
}
export function placeWire(state,player,obstacles=[]){
 const check=canPlaceWire(state,player,obstacles);
 if(!check.ok)return {state,device:null,reason:check.reason};
 const device={id:state.nextId,x:check.position.x,z:check.position.z,
  yaw:check.position.yaw,hp:WIRE.hp};
 return {state:{...state,charges:state.charges-1,nextId:state.nextId+1,
  devices:[...state.devices,device]},device,reason:"BARBED WIRE DEPLOYED"};
}
// MELEE ONLY. Never call this from gunfire or projectile hit paths.
export function damageWire(state,id,damage=1){
 const device=state.devices.find(d=>d.id===id&&d.hp>0);
 if(!device||!Number.isFinite(damage)||damage<=0)
  return {state,handled:false,destroyed:false};
 const hp=Math.max(0,device.hp-Math.floor(damage));
 if(hp===device.hp)return {state,handled:false,destroyed:false};
 const devices=state.devices.map(d=>d.id===id?{...d,hp}:d);
 return {state:{...state,devices},handled:true,destroyed:hp===0,
  remainingHP:hp};
}
export function wireSlowsPlayer(state,player){
 if(!player||![player.x,player.y,player.z].every(Number.isFinite))return false;
 if(player.y>.36)return false; // Jumping clear of ground coils
 return state.devices.some(d=>d.hp>0&&
  Math.hypot(d.x-player.x,d.z-player.z)<WIRE.radius);
}
// Only attackers are enemies of defender Sentry's placed barbed wire.
// In this solo Testing Range, team switching lets one tester verify both sides.
export function enemyInWire(state,player,side){
 return side==="attack"&&wireSlowsPlayer(state,player);
}
export function wireTerrainMultiplier(state,player,side){
 return enemyInWire(state,player,side)?WIRE.slowingMultiplier:1;
}
export function newWireHealth(){
 return {hp:WIRE.maxHealth,elapsed:0};
}
// Exact periodic injury, not once per animation frame or per 0.05s
// physics substep. Leaving contact or switching to defense clears timer.
export function tickWireHealth(current,state,player,side,dt){
 if(!current||!Number.isFinite(current.hp))return newWireHealth();
 const hp=Math.max(0,Math.min(WIRE.maxHealth,current.hp));
 if(!enemyInWire(state,player,side)||hp===0)
  return {hp,elapsed:0,damage:0};
 const step=Number.isFinite(dt)?Math.max(0,dt):0;
 const total=Math.max(0,(Number(current.elapsed)||0))+step;
 const ticks=Math.floor((total+1e-9)/WIRE.damageInterval);
 const nextHP=Math.max(0,hp-ticks*WIRE.enemyDamage);
 return {hp:nextHP,
  elapsed:nextHP===0?0:Math.max(0,total-ticks*WIRE.damageInterval),
  damage:hp-nextHP};
}
