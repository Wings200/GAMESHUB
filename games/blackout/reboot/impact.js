// BLACKOUT V0.16.1 · impact grenades: real thrown projectile, contact detonation.
// Uses common blast representation as C4 but a smaller radius and lower damage.
import {nitroThrowPosition} from "./nitro.js?v=reboot-032";
export const IMPACT=Object.freeze({
 charges:2,speedScale:1.45,gravity:19,radius:2.35,blastDamage:55,size:.105
});
export function newImpactState(){
 return {charges:IMPACT.charges,nextId:1,devices:[]};
}
export function throwImpact(state,player){
 if(!state||state.charges<=0)return {state,device:null,reason:"NO IMPACT GRENADES REMAIN"};
 const base=nitroThrowPosition(player);
 if(!base)return {state,device:null,reason:"INVALID THROW POSITION"};
 const device={...base,id:state.nextId,armed:true,
  vx:base.vx*IMPACT.speedScale,vz:base.vz*IMPACT.speedScale,vy:base.vy+.4};
 return {state:{charges:state.charges-1,nextId:state.nextId+1,
  devices:[...state.devices,device]},device,reason:"IMPACT GRENADE THROWN"};
}
function hitObstacle(point,objects){
 return objects.some(o=>
  point.y>= (o.bottom??0)-IMPACT.size&&point.y<=(o.height??0)+IMPACT.size&&
  Math.abs(point.x-o.x)<=o.width/2+IMPACT.size&&
  Math.abs(point.z-o.z)<=o.depth/2+IMPACT.size);
}
export function tickImpact(state,dt,objects=[]){
 const seconds=Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0));
 if(!seconds)return {state,blasts:[]};
 const blasts=[];
 const devices=state.devices.map(d=>{
  if(!d.armed)return d;
  const position={x:d.x+d.vx*seconds,y:d.y+d.vy*seconds,z:d.z+d.vz*seconds};
  const contact=position.y<=IMPACT.size||hitObstacle(position,objects)||
   Math.abs(position.x)>=29.5||Math.abs(position.z)>=29.5;
  if(contact){
   blasts.push({x:Math.max(-29.5,Math.min(29.5,position.x)),
    y:Math.max(IMPACT.size,position.y),z:Math.max(-29.5,Math.min(29.5,position.z)),
    radius:IMPACT.radius,damage:IMPACT.blastDamage,id:d.id});
   return {...d,x:position.x,y:position.y,z:position.z,armed:false};
  }
  return {...d,...position,vy:d.vy-IMPACT.gravity*seconds};
 });
 return {state:{...state,devices},blasts};
}
