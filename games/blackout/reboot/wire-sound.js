// BLACKOUT V0.15.3 · deterministic footsteps-on-wire sound triggers.
// No WebAudio here: world positions and one audible event are generated from
// game state, so sounds cannot continue after exiting, pausing or destroying wire.
import {WIRE,enemyInWire} from "./barbed-wire.js?v=reboot-030";

export const WIRE_AUDIO=Object.freeze({
 rattleInterval:.34,maxAudibleDistance:22
});
export function newWireSoundTracker(){
 return {wireId:null,elapsed:0};
}
export function nearestEnemyWire(state,player,side){
 if(!enemyInWire(state,player,side))return null;
 let nearest=null,dist=Infinity;
 for(const device of state.devices){
  if(device.hp<=0)continue;
  const d=Math.hypot(device.x-player.x,device.z-player.z);
  if(d<WIRE.radius&&d<dist){nearest=device;dist=d;}
 }
 return nearest;
}
export function stepWireSounds(current,state,before,after,side,dt){
 const device=nearestEnemyWire(state,after,side);
 const moved=before&&after&&
  Number.isFinite(before.x)&&Number.isFinite(before.z)&&
  Number.isFinite(after.x)&&Number.isFinite(after.z)&&
  Math.hypot(after.x-before.x,after.z-before.z)>.002;
 if(!device||!moved)
  return {tracker:newWireSoundTracker(),event:null};
 const same=current?.wireId===device.id;
 const elapsed=same?Math.max(0,Number(current.elapsed)||0):0;
 const total=elapsed+(Number.isFinite(dt)?Math.max(0,dt):0);
 if(!same||total>=WIRE_AUDIO.rattleInterval){
  const remainder=same?total%WIRE_AUDIO.rattleInterval:0;
  return {tracker:{wireId:device.id,elapsed:remainder},
   event:{type:"wire-rattle",id:device.id,x:device.x,z:device.z}};
 }
 return {tracker:{wireId:device.id,elapsed:total},event:null};
}
export function wirePunchSound(destroyed,device){
 if(!device||!Number.isFinite(device.x)||!Number.isFinite(device.z))return null;
 return {type:destroyed?"wire-destroy":"wire-strike",
  id:device.id,x:device.x,z:device.z};
}
