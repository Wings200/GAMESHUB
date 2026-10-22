// BLACKOUT V0.25.3 · physical objective obstacles, planting/disable stance,
// and predictable timed device sounds.
import {BOMB_RULES,roundSiteAt} from "./bomb-round.js?v=reboot-057";
export const BOMB_HARDWARE=Object.freeze({width:1.82,depth:1.52,height:.97});
export function bombSiteBlockers(state){
 if(state?.mode!=="bomb")return [];
 return BOMB_RULES.sites.map(site=>({
  id:"bomb-site-"+site.id.toLowerCase(),x:site.x,z:site.z,
  width:BOMB_HARDWARE.width,depth:BOMB_HARDWARE.depth,
  bottom:0,height:BOMB_HARDWARE.height
 }));
}
export function liveBombInteraction(state,side,player,holdingF=false,alive=true){
 if(!state||state.mode!=="bomb"||!holdingF||!alive||!player||
    !Number.isFinite(player.x)||!Number.isFinite(player.z))return null;
 if(side==="attack"&&state.phase==="action"&&
   state.defuser.status==="carried"&&roundSiteAt(player))return "plant";
 if(side==="defend"&&state.phase==="postplant"&&
   Math.hypot(player.x-state.defuser.x,player.z-state.defuser.z)<=BOMB_RULES.disableRadius)
  return "disable";
 return null;
}
export function defuserBeepInterval(timeLeft){
 if(!Number.isFinite(timeLeft))return .95;
 return timeLeft<=5?.19:timeLeft<=10?.30:timeLeft<=20?.48:timeLeft<=30?.70:.94;
}
export function newBombSoundClock(){return {phase:null,seconds:0,keys:0,interaction:null};}
export function tickBombSoundClock(clock,state,dt,interaction=null){
 const safe=clock||newBombSoundClock();
 if(!state||state.mode!=="bomb"||state.phase==="ended")
  return {clock:newBombSoundClock(),events:[]};
 const delta=Math.min(.05,Math.max(0,Number.isFinite(dt)?dt:0));
 if(!delta)return {clock:safe,events:[]};
 const phase=state.phase;
 let secs=safe.phase===phase?safe.seconds:0;
 let keys=safe.interaction===interaction?safe.keys:0;
 const events=[];
 if(phase==="postplant"){
  secs+=delta;
  const interval=defuserBeepInterval(state.time);
  if(secs+1e-8>=interval){secs=0;events.push("defuser-tick");}
 }else secs=0;
 if(interaction==="plant"||interaction==="disable"){
  keys+=delta;
  const interval=interaction==="plant"?.135:.185;
  if(keys+1e-8>=interval){keys=0;events.push(interaction==="plant"?"plant-key":"defuse-key");}
 }else keys=0;
 return {clock:{phase,seconds:secs,keys,interaction},events};
}
