// BLACKOUT V0.16.2 · live attacker frag: physical toss, timed fuse, bounce.
// Sandbox game behavior only; explosive effects reuse established blast mechanics.
import {nitroThrowPosition} from "./nitro.js?v=reboot-032";
export const FRAG=Object.freeze({
 charges:2,fuse:3.2,gravity:18,radius:3.25,blastDamage:100,
 size:.12,restSpeed:.75
});
export function newFragState(){
 return {charges:FRAG.charges,nextId:1,devices:[]};
}
export function throwFrag(state,player){
 if(!state||state.charges<=0)return {state,device:null,reason:"NO FRAG GRENADES REMAIN"};
 const base=nitroThrowPosition(player);
 if(!base)return {state,device:null,reason:"INVALID GRENADE THROW POSITION"};
 const device={...base,id:state.nextId,armed:true,time:0,resting:false,
  vx:base.vx*1.08,vz:base.vz*1.08,vy:base.vy+1.2};
 return {state:{charges:state.charges-1,nextId:state.nextId+1,
  devices:[...state.devices,device]},device,reason:"FRAG THROWN · 3.2 SECOND FUSE"};
}
function obstruction(p,obstacles){
 return obstacles.some(o=>
  p.y>=(o.bottom??0)-FRAG.size&&p.y<=(o.height??0)+FRAG.size&&
  Math.abs(p.x-o.x)<o.width/2+FRAG.size&&
  Math.abs(p.z-o.z)<o.depth/2+FRAG.size);
}
export function tickFrag(state,dt,obstacles=[]){
 const step=Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0));
 if(step===0)return {state,blasts:[]};
 const blasts=[];
 const devices=state.devices.map(d=>{
  if(!d.armed)return d;
  const time=d.time+step;
  let next={...d,time};
  if(!d.resting){
   const point={x:d.x+d.vx*step,y:d.y+d.vy*step,z:d.z+d.vz*step};
   const wall=obstruction(point,obstacles);
   if(wall){
    // Reflect off the near obstacle, damp horizontal flight and arc.
    next={...next,vx:-d.vx*.3,vz:-d.vz*.3,vy:Math.max(.7,d.vy*.25)};
   }else if(point.y<=FRAG.size){
    const vy=Math.abs(d.vy)*.25;
    next={...next,x:point.x,y:FRAG.size,z:point.z,
     vx:d.vx*.64,vz:d.vz*.64,vy,
     resting:vy<FRAG.restSpeed};
   }else{
    next={...next,...point,vy:d.vy-FRAG.gravity*step};
   }
   if(Math.abs(next.x)>=29.5||Math.abs(next.z)>=29.5){
    next={...next,x:Math.max(-29.5,Math.min(29.5,next.x)),
     z:Math.max(-29.5,Math.min(29.5,next.z)),vx:0,vz:0,resting:true};
   }
  }
  if(time>=FRAG.fuse){
   blasts.push({x:next.x,y:Math.max(FRAG.size,next.y),z:next.z,
    radius:FRAG.radius,damage:FRAG.blastDamage,id:d.id});
   return {...next,armed:false};
  }
  return next;
 });
 return {state:{...state,devices},blasts};
}
