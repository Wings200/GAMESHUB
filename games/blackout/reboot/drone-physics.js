// BLACKOUT V0.12 · independent player-controlled reconnaissance drone.
// Real low-profile collision with walls, boxes, barricades, gypsum cutouts,
// and reinforced metal. Three regenerating Shift bursts and jump cooldown.
export const DRONE=Object.freeze({
 radius:.19,height:.25,eye:.28,accel:13,friction:11,maxSpeed:4.1,
 boostSpeed:8.5,boostDuration:.72,maxCharges:3,chargeRecharge:7,
 jumpSpeed:3.7,jumpCooldown:1.8,gravity:17.5,worldLimit:29.77
});
export function newDrone(x=0,z=6,yaw=0){
 return {x,y:0,z,yaw,pitch:0,speedX:0,speedZ:0,vy:0,grounded:true,
  deployed:true,charges:DRONE.maxCharges,chargeTimer:0,
  boostLeft:0,jumpLeft:0,jumps:0,boosts:0};
}
function finite(d){return ["x","y","z","yaw","pitch","speedX","speedZ","vy","charges"]
 .every(k=>Number.isFinite(d[k]));}
export function canDroneOccupy(x,y,z,objects=[]){
 if(!Number.isFinite(x+y+z)||Math.abs(x)>DRONE.worldLimit||
    Math.abs(z)>DRONE.worldLimit||y<-.0001)return false;
 return !objects.some(o=>{
  const bottom=o.bottom??0,top=o.height;
  if(y>=top||y+DRONE.height<=bottom)return false;
  const cx=Math.max(o.x-o.width/2,Math.min(x,o.x+o.width/2));
  const cz=Math.max(o.z-o.depth/2,Math.min(z,o.z+o.depth/2));
  return (x-cx)**2+(z-cz)**2 < DRONE.radius*DRONE.radius;
 });
}
export function tickDrone(previous,input={},dt=1/60,objects=[]){
 if(!finite(previous))throw new Error("Invalid drone movement state");
 const d={...previous},step=Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0));
 if(step===0)return d;
 d.jumpLeft=Math.max(0,d.jumpLeft-step);
 d.boostLeft=Math.max(0,d.boostLeft-step);
 if(d.charges<DRONE.maxCharges){
  d.chargeTimer+=step;
  if(d.chargeTimer+1e-8>=DRONE.chargeRecharge){
   d.charges++;d.chargeTimer=0;
  }
 }else d.chargeTimer=0;
 if(input.boostPressed&&d.charges>0&&d.boostLeft===0){
  d.charges--;d.boosts++;d.boostLeft=DRONE.boostDuration;
  d.chargeTimer=0; // each use restarts the recharge window
 }
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
 for(let i=0;i<count;i++){
  const sx=dx/count,sz=dz/count;
  if(canDroneOccupy(d.x+sx,d.y,d.z+sz,objects)){
   d.x+=sx;d.z+=sz;
  }else{
   if(canDroneOccupy(d.x+sx,d.y,d.z,objects))d.x+=sx;
   else d.speedX=0;
   if(canDroneOccupy(d.x,d.y,d.z+sz,objects))d.z+=sz;
   else d.speedZ=0;
  }
 }
 if(!d.grounded){
  d.vy-=DRONE.gravity*step;
  d.y+=d.vy*step;
  if(d.y<=0){d.y=0;d.vy=0;d.grounded=true;}
 }
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
