// BLACKOUT V0.28 · elevated-surface reconnaissance drone traversal.
// Real low-profile collision with walls, boxes, barricades, gypsum cutouts,
// and reinforced metal. Three regenerating Shift bursts and jump cooldown.
export const DRONE=Object.freeze({
 radius:.19,height:.25,eye:.28,accel:13,friction:11,maxSpeed:4.1,
 boostSpeed:8.5,boostDuration:.72,maxCharges:3,chargeRecharge:7,
 jumpSpeed:7.25,jumpCooldown:1.8,gravity:17.5,worldLimit:29.77
});
export function newDrone(x=0,z=6,yaw=0){
 return {x,y:0,z,yaw,pitch:0,speedX:0,speedZ:0,vy:0,grounded:true,
  deployed:true,charges:DRONE.maxCharges,chargeTimer:0,
  boostLeft:0,jumpLeft:0,jumps:0,boosts:0};
}
function finite(d){return ["x","y","z","yaw","pitch","speedX","speedZ","vy","charges"]
 .every(k=>Number.isFinite(d[k]));}
// Real brief airborne toss: not an instant ground spawn. The same drone
// physics and collision continue to run throughout the throw.
export function throwDrone(x,z,yaw){
 const drone=newDrone(x,z,yaw);
 return {...drone,y:.58,grounded:false,vy:2.15,
  speedX:-Math.sin(yaw)*6.4,speedZ:-Math.cos(yaw)*6.4,throwLeft:1.1};
}
export function canDroneOccupy(x,y,z,objects=[],limit=DRONE.worldLimit){
 if(!Number.isFinite(x+y+z)||Math.abs(x)>limit||
    Math.abs(z)>limit||y<-.0001)return false;
 return !objects.some(o=>{
  const bottom=o.bottom??0,top=o.height;
  if(y>=top||y+DRONE.height<=bottom)return false;
  const cx=Math.max(o.x-o.width/2,Math.min(x,o.x+o.width/2));
  const cz=Math.max(o.z-o.depth/2,Math.min(z,o.z+o.depth/2));
  return (x-cx)**2+(z-cz)**2 < DRONE.radius*DRONE.radius;
 });
}
// Circular footprint matches the actual swept horizontal body, so corner
// landings are consistent with collision against crates and deployable shields.
function overlapsFootprint(x,z,o){
 const cx=Math.max(o.x-o.width/2,Math.min(x,o.x+o.width/2));
 const cz=Math.max(o.z-o.depth/2,Math.min(z,o.z+o.depth/2));
 return (x-cx)**2+(z-cz)**2<DRONE.radius*DRONE.radius;
}
// A ramp is a walkable surface only when the drone can actually reach it
// from its current height. The same X/Z can also be the empty space UNDER
// the staircase; treating every ramp height as ground teleports drones up.
const MAX_RAMP_RISE=.12;
function reachableTerrain(x,z,y,floorAt){
 const top=typeof floorAt==="function"?floorAt(x,z,y):0;
 return top<=y+MAX_RAMP_RISE?top:0;
}
function hasSupport(x,y,z,objects,floorAt=null){
 const ramp=reachableTerrain(x,z,y,floorAt);
 return Math.abs(y-ramp)<=.025||objects.some(o=>
  Math.abs(o.height-y)<=1e-4&&overlapsFootprint(x,z,o));
}
function stepVertical(d,step,objects,floorAt=null){
 const previousY=d.y;
 d.vy-=DRONE.gravity*step;
 let nextY=previousY+d.vy*step;
 if(d.vy>0){
  // A real ceiling or upper-floor slab stops the drone's head.
  let headLimit=Infinity;
  if(typeof floorAt==="function"){
   const ramp=floorAt(d.x,d.z,previousY);
   // Rising from BELOW a sloped stair tread hits its underside, whereas a
   // drone already on the stairs is free to jump above the tread.
   if(ramp>previousY+DRONE.height+1e-6&&
      nextY+DRONE.height>=ramp)
    headLimit=Math.min(headLimit,ramp-DRONE.height);
  }
  for(const o of objects){
   const underside=o.bottom??0;
   if(underside>0&&overlapsFootprint(d.x,d.z,o)&&
      previousY+DRONE.height<=underside+1e-6&&
      nextY+DRONE.height>=underside)
    headLimit=Math.min(headLimit,underside-DRONE.height);
  }
  if(Number.isFinite(headLimit)){nextY=Math.min(nextY,headLimit);d.vy=0;}
 }else{
  // Snap to the highest solid top crossed *from above*. Landing is not
  // permitted from underneath a counter or shield.
  const terrain=reachableTerrain(d.x,d.z,previousY,floorAt);
  // Only land on a surface crossed from above. Never pull a drone through
  // the underside of stairs while it is falling underneath them.
  let support=previousY>=terrain-1e-5?terrain:0;
  for(const o of objects){
   if(overlapsFootprint(d.x,d.z,o)&&o.height>support&&
      previousY>=o.height-1e-5&&nextY<=o.height+1e-5)
    support=o.height;
  }
  if(nextY<=support){
   nextY=support;d.vy=0;d.grounded=true;d.throwLeft=0;
  }
 }
 d.y=Math.max(0,nextY);
 if(d.y===0){d.vy=0;d.grounded=true;d.throwLeft=0;}
}
export function tickDrone(previous,input={},dt=1/60,objects=[],limit=DRONE.worldLimit){
 if(!finite(previous))throw new Error("Invalid drone movement state");
 const d={...previous},step=Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0));
 if(step===0)return d;
 // Houses have an actual sloped staircase represented by their floor-height
 // resolver, not collision boxes. Grounded drones need the same terrain
 // support as the player or their body is blocked at the first stair riser.
 const floorAt=typeof input.floorAt==="function"?input.floorAt:null;
 d.jumpLeft=Math.max(0,d.jumpLeft-step);
 d.boostLeft=Math.max(0,d.boostLeft-step);
 if(d.charges<DRONE.maxCharges){
  d.chargeTimer+=step;
  if(d.chargeTimer+1e-8>=DRONE.chargeRecharge){
   d.charges++;d.chargeTimer=0;
  }
 }else d.chargeTimer=0;
 if((d.throwLeft||0)>0){
  // During deployment the drone travels through the world on a ballistic arc;
  // it is already a real persistent world object, not a temporary animation.
  d.throwLeft=Math.max(0,d.throwLeft-step);
  const dx=d.speedX*step,dz=d.speedZ*step;
  const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.055));
  for(let i=0;i<n;i++){
   const sx=dx/n,sz=dz/n;
   if(canDroneOccupy(d.x+sx,d.y,d.z+sz,objects,limit)){
    d.x+=sx;d.z+=sz;
   }else{
    d.speedX=0;d.speedZ=0;d.throwLeft=0;break;
   }
  }
  stepVertical(d,step,objects,floorAt);
  return d;
 }
  if(input.boostPressed&&d.charges>0&&d.boostLeft===0){
  d.charges--;d.boosts++;d.boostLeft=DRONE.boostDuration;
  d.chargeTimer=0; // each use restarts the recharge window
 }
 // Leaving a shelf or a removed shield starts a real fall.
 if(d.grounded&&!hasSupport(d.x,d.y,d.z,objects,floorAt)){d.grounded=false;d.vy=0;}
 if(input.jumpPressed&&d.grounded&&d.jumpLeft===0){
  d.vy=DRONE.jumpSpeed;d.grounded=false;
  d.jumpLeft=DRONE.jumpCooldown;d.jumps++;
 }
 const forward=Math.max(-1,Math.min(1,Number(input.forward)||0));
 const right=Math.max(-1,Math.min(1,Number(input.right)||0));
 const mag=Math.hypot(forward,right),norm=mag>1?1/mag:1;
 const speed=d.boostLeft>0?DRONE.boostSpeed:DRONE.maxSpeed;
 const targetVX=(-Math.sin(d.yaw)*forward+Math.cos(d.yaw)*right)*norm*speed;
 const targetVZ=(-Math.cos(d.yaw)*forward-Math.sin(d.yaw)*right)*norm*speed;
 const accelerate=Math.min(1,step*(mag>0?DRONE.accel:DRONE.friction));
 d.speedX+=(targetVX-d.speedX)*accelerate;
 d.speedZ+=(targetVZ-d.speedZ)*accelerate;
 // Ground collision uses small swept steps with sliding and drone-specific
 // body radius, not the player's larger human capsule.
 const dx=d.speedX*step,dz=d.speedZ*step;
 const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.055));
 function travel(x,z){
  const onTerrain=d.grounded&&floorAt&&
   Math.abs(d.y-reachableTerrain(d.x,d.z,d.y,floorAt))<.03;
  const nextY=onTerrain?reachableTerrain(x,z,d.y,floorAt):d.y;
  if(onTerrain&&floorAt){
   const stairAbove=floorAt(x,z,d.y);
   // Beneath a low tread there is not enough vertical room to drive
   // through; either climb continuously from the foot or stop at its edge.
   if(stairAbove>nextY+MAX_RAMP_RISE&&
      stairAbove<nextY+DRONE.height)return false;
  }
  if(!canDroneOccupy(x,nextY,z,objects,limit))return false;
  d.x=x;d.y=nextY;d.z=z;return true;
 }
 for(let i=0;i<count;i++){
  const sx=dx/count,sz=dz/count;
  if(travel(d.x+sx,d.z+sz)){
   // Terrain height was resolved together with the collision sweep.
  }else{
   if(travel(d.x+sx,d.z)){}
   else d.speedX=0;
   if(travel(d.x,d.z+sz)){}
   else d.speedZ=0;
  }
 }
 if(d.grounded&&!hasSupport(d.x,d.y,d.z,objects,floorAt)){d.grounded=false;d.vy=0;}
 if(!d.grounded)stepVertical(d,step,objects,floorAt);
 return d;
}
export function droneBoostLabel(state){
 return state.charges+"/"+DRONE.maxCharges+
   (state.charges<DRONE.maxCharges?" · "+Math.ceil(DRONE.chargeRecharge-state.chargeTimer)+"S":"");
}
export function droneJumpLabel(state){
 return state.grounded&&state.jumpLeft<=0?"READY":
  state.grounded?state.jumpLeft.toFixed(1)+"S":"AIRBORNE";
}
