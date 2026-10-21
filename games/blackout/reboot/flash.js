// BLACKOUT V0.17.2 · full-strength opaque whiteout, then delayed smooth recovery.
import {nitroThrowPosition} from "./nitro.js?v=reboot-036";
export const FLASH=Object.freeze({
 charges:2,fuse:1.75,gravity:18,radius:9,fullRadius:1.4,
 holdSeconds:2.2,fadeSeconds:3.8,size:.115,restSpeed:.68
});
export function newFlashState(){return {charges:FLASH.charges,nextId:1,devices:[]};}
export function throwFlash(state,player){
 if(!state||state.charges<=0)return {state,device:null,reason:"NO FLASHBANGS REMAIN"};
 const p=nitroThrowPosition(player);
 if(!p)return {state,device:null,reason:"INVALID FLASHBANG THROW"};
 const d={...p,id:state.nextId,time:0,armed:true,resting:false,
  vx:p.vx*1.12,vz:p.vz*1.12,vy:p.vy+1};
 return {state:{...state,charges:state.charges-1,nextId:state.nextId+1,
  devices:[...state.devices,d]},device:d,reason:"FLASHBANG THROWN · 1.75S FUSE"};
}
function hitSolid(p,obstacles){
 return obstacles.some(o=>o&&Number.isFinite(o.x)&&Number.isFinite(o.z)&&
  p.y>=(o.bottom??0)-FLASH.size&&p.y<=(o.height??0)+FLASH.size&&
  Math.abs(p.x-o.x)<(o.width??0)/2+FLASH.size&&
  Math.abs(p.z-o.z)<(o.depth??0)/2+FLASH.size);
}
export function tickFlash(state,dt,obstacles=[]){
 const seconds=Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0));
 if(!seconds||!state)return {state,bursts:[]};
 const bursts=[];
 const devices=state.devices.map(d=>{
  if(!d.armed)return d;
  const time=d.time+seconds;
  let next={...d,time};
  if(!d.resting){
   const p={x:d.x+d.vx*seconds,y:d.y+d.vy*seconds,z:d.z+d.vz*seconds};
   if(hitSolid(p,obstacles)){
    next={...next,vx:-d.vx*.32,vz:-d.vz*.32,vy:Math.max(.55,Math.abs(d.vy)*.2)};
   }else if(p.y<=FLASH.size){
    const vy=Math.abs(d.vy)*.26;
    next={...next,x:p.x,y:FLASH.size,z:p.z,vx:d.vx*.62,vz:d.vz*.62,vy,
     resting:vy<FLASH.restSpeed};
   }else next={...next,...p,vy:d.vy-FLASH.gravity*seconds};
   if(Math.abs(next.x)>=29.5||Math.abs(next.z)>=29.5)
    next={...next,x:Math.max(-29.5,Math.min(29.5,next.x)),
     z:Math.max(-29.5,Math.min(29.5,next.z)),vx:0,vz:0,resting:true};
  }
  if(time+1e-8>=FLASH.fuse){
   bursts.push({x:next.x,y:Math.max(FLASH.size,next.y),z:next.z,
    radius:FLASH.radius,id:d.id});
   return {...next,armed:false};
  }
  return next;
 });
 return {state:{...state,devices},bursts};
}
function blocksSegment(from,to,obstacles=[]){
 // The wall AABBs used by physics also block sight to the flash.
 // Segment endpoints are excluded so a charge touching cover is not
 // treated as hidden by the cover surface it is sitting against.
 for(const o of obstacles){
  if(!o||![o.x,o.z,o.width,o.depth,o.height].every(Number.isFinite))continue;
  const lower=[o.x-o.width/2,o.bottom??0,o.z-o.depth/2];
  const upper=[o.x+o.width/2,o.height,o.z+o.depth/2];
  const origin=[from.x,from.y,from.z],delta=[to.x-from.x,to.y-from.y,to.z-from.z];
  let low=0,high=1,intersects=true;
  for(let axis=0;axis<3;axis++){
   if(Math.abs(delta[axis])<1e-8){
    if(origin[axis]<lower[axis]||origin[axis]>upper[axis]){intersects=false;break;}
   }else{
    let a=(lower[axis]-origin[axis])/delta[axis];
    let b=(upper[axis]-origin[axis])/delta[axis];
    if(a>b)[a,b]=[b,a];
    low=Math.max(low,a);high=Math.min(high,b);
    if(low>high){intersects=false;break;}
   }
  }
  if(intersects&&high>.025&&low<.98)return true;
 }
 return false;
}
export function flashExposure(burst,player,obstacles=[]){
 if(!burst||!player||
  ![burst.x,burst.y,burst.z,player.x,player.y,player.z,player.yaw,player.pitch].every(Number.isFinite))
  return {intensity:0,duration:0,occluded:false};
 const eye={x:player.x,y:player.y+(Number.isFinite(player.eyeHeight)?player.eyeHeight:1.6),
  z:player.z};
 const dx=burst.x-eye.x,dy=burst.y-eye.y,dz=burst.z-eye.z;
 const distance=Math.hypot(dx,dy,dz);
 const max=Number.isFinite(burst.radius)?burst.radius:FLASH.radius;
 if(distance>=max)return {intensity:0,duration:0,occluded:false};
 const cosPitch=Math.cos(player.pitch);
 const fx=-Math.sin(player.yaw)*cosPitch,fy=Math.sin(player.pitch),
  fz=-Math.cos(player.yaw)*cosPitch;
 const facing=distance<.001?1:(dx*fx+dy*fy+dz*fz)/distance;
 // Looking away means no whiteout. Peripheral vision yields less.
 if(facing<=.12)return {intensity:0,duration:0,occluded:false};
 if(blocksSegment(eye,burst,obstacles))
  return {intensity:0,duration:0,occluded:true};
 const near=Math.min(1,Math.max(0,(max-distance)/(max-FLASH.fullRadius)));
 const facingFactor=Math.min(1,Math.max(0,(facing-.12)/.88));
 const intensity=Math.min(1,Math.max(0,near*facingFactor));
 return {intensity,duration:intensity>0?FLASH.holdSeconds+FLASH.fadeSeconds:0,occluded:false};
}
export function newFlashEffect(){return {intensity:0,duration:0,remaining:0};}
export function applyFlashEffect(state,exposure){
 if(!exposure||exposure.intensity<=0)return state;
 // Exposure determines IF a player is flashed, not a transparency value.
 // Every valid flash hit must completely obscure the entire screen in white,
 // including glancing flashes. Looking away or solid cover still prevents it.
 // Consecutive flashes restart/extend the effect and never weaken it.
 const strength=1;
 const duration=Math.max(FLASH.holdSeconds+FLASH.fadeSeconds,exposure.duration);
 return {intensity:Math.max(strength,state?.intensity??0),
  duration:Math.max(duration,state?.duration??0),remaining:Math.max(duration,state?.remaining??0)};
}
export function stepFlashEffect(state,dt){
 if(!state||state.remaining<=0)return newFlashEffect();
 if(!Number.isFinite(dt)||dt<=0)return state;
 return {...state,remaining:Math.max(0,state.remaining-Math.min(.05,dt))};
}
export function flashOpacity(state){
 if(!state||state.remaining<=0||state.duration<=0)return 0;
 // A successful flash stays 100% opaque white for at least 2 seconds.
 // ONLY after the hold does the long, smooth recovery begin.
 const fade=Math.min(FLASH.fadeSeconds,state.duration);
 if(state.remaining>fade)return Math.max(0,Math.min(1,state.intensity));
 const progress=Math.max(0,Math.min(1,state.remaining/fade));
 return Math.max(0,Math.min(1,state.intensity*Math.pow(progress,.78)));
}
