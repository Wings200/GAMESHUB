// BLACKOUT V0.18.0 · real attacker smoke grenade projectile and lingering vision cover.
// Sandbox-only logic. Smoke obstructs sight, but is not a solid collision or HP effect.
import {nitroThrowPosition} from "./nitro.js?v=reboot-036";
export const SMOKE=Object.freeze({
 charges:2,fuse:1.8,gravity:18,size:.12,restSpeed:.72,
 radius:3.4,expandSeconds:1.8,holdSeconds:10.5,fadeSeconds:3.7
});
export const SMOKE_LIFE=SMOKE.expandSeconds+SMOKE.holdSeconds+SMOKE.fadeSeconds;
export function newSmokeState(){return {charges:SMOKE.charges,nextId:1,devices:[],clouds:[]};}
export function throwSmoke(state,player){
 if(!state||state.charges<=0)return {state,device:null,reason:"NO SMOKE GRENADES REMAIN"};
 const base=nitroThrowPosition(player);
 if(!base)return {state,device:null,reason:"INVALID SMOKE THROW POSITION"};
 const d={...base,id:state.nextId,armed:true,time:0,resting:false,
  vx:base.vx*1.1,vz:base.vz*1.1,vy:base.vy+1.1};
 return {state:{...state,charges:state.charges-1,nextId:state.nextId+1,
  devices:[...state.devices,d]},device:d,reason:"SMOKE THROWN · 1.8S DEPLOY"};
}
function touchesCover(p,obstacles){
 return obstacles.some(o=>o&&
  [o.x,o.z,o.width,o.depth,o.height].every(Number.isFinite)&&
  p.y>=(o.bottom??0)-SMOKE.size&&p.y<=(o.height??0)+SMOKE.size&&
  Math.abs(p.x-o.x)<o.width/2+SMOKE.size&&
  Math.abs(p.z-o.z)<o.depth/2+SMOKE.size);
}
const clamp01=n=>Math.min(1,Math.max(0,n));
export function cloudAtAge(cloud,age){
 const time=Math.max(0,Number.isFinite(age)?age:0);
 const growth=clamp01(time/SMOKE.expandSeconds);
 const collapse=clamp01((SMOKE_LIFE-time)/SMOKE.fadeSeconds);
 const radius=SMOKE.radius*(.08+.92*(1-Math.pow(1-growth,2)));
 const density=clamp01(growth*2)*collapse;
 return {...cloud,age:time,radius,density};
}
export function tickSmoke(state,dt,obstacles=[]){
 const step=Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0));
 if(!state||!step)return {state,spawned:[]};
 const spawned=[];
 const devices=state.devices.map(d=>{
  if(!d.armed)return d;
  const time=d.time+step;let next={...d,time};
  if(!d.resting){
   const p={x:d.x+d.vx*step,y:d.y+d.vy*step,z:d.z+d.vz*step};
   if(touchesCover(p,obstacles)){
    next={...next,vx:-d.vx*.32,vz:-d.vz*.32,vy:Math.max(.5,Math.abs(d.vy)*.19)};
   }else if(p.y<=SMOKE.size){
    const vy=Math.abs(d.vy)*.25;
    next={...next,x:p.x,y:SMOKE.size,z:p.z,
     vx:d.vx*.62,vz:d.vz*.62,vy,resting:vy<SMOKE.restSpeed};
   }else next={...next,...p,vy:d.vy-SMOKE.gravity*step};
   if(Math.abs(next.x)>=29.5||Math.abs(next.z)>=29.5)
    next={...next,x:Math.max(-29.5,Math.min(29.5,next.x)),
     z:Math.max(-29.5,Math.min(29.5,next.z)),vx:0,vz:0,resting:true};
  }
  if(time+1e-8>=SMOKE.fuse){
   spawned.push(cloudAtAge({id:d.id,x:next.x,
    y:Math.min(2.4,Math.max(1.45,next.y+1.25)),z:next.z},0));
   return {...next,armed:false};
  }
  return next;
 });
 // Spent projectiles are removed; world cloud lifetime is independent.
 const clouds=[...state.clouds.map(c=>cloudAtAge(c,c.age+step)).filter(c=>c.age<SMOKE_LIFE),
  ...spawned];
 return {state:{...state,devices:devices.filter(d=>d.armed),clouds},spawned};
}
export function smokeCameraDensity(clouds,eye){
 if(!eye||![eye.x,eye.y,eye.z].every(Number.isFinite))return 0;
 let visibility=1;
 for(const cloud of clouds||[]){
  if(!(cloud.radius>0&&cloud.density>0))continue;
  const dx=(eye.x-cloud.x)/cloud.radius,dz=(eye.z-cloud.z)/cloud.radius;
  const dy=(eye.y-cloud.y)/(cloud.radius*.7);
  const dist=Math.hypot(dx,dy,dz);
  if(dist>=1)continue;
  const edge=clamp01((1-dist)/.35);
  // Inside thick smoke, geometry cannot be viewed beyond the player's hands.
  const opacity=clamp01(cloud.density*.985*edge);
  visibility*=1-opacity;
 }
 return 1-visibility;
}
