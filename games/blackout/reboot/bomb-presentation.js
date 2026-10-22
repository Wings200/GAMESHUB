// BLACKOUT V0.26.3 · physical objective obstacles, planting/disable stance,
// and reference-paced original device sounds.
import {BOMB_RULES,roundSiteAt} from "./bomb-round.js?v=reboot-062";
export const BOMB_HARDWARE=Object.freeze({width:1.82,depth:1.52,height:.97});
// Describe the outcome from the *selected player's* perspective. A disabled
// defuser is a defender win and an attacker loss, never a generic team banner.
export function bombRoundOutcome(state,playerSide){
 if(state?.phase!=="ended"||!["attack","defend"].includes(state.winner))
  return null;
 const won=playerSide===state.winner;
 return {won,title:won?"ROUND WON":"ROUND LOST",
  detail:state.reason,winningSide:state.winner==="attack"?"ATTACKERS":"DEFENDERS"};
}
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
   state.defuser.status==="carried"&&roundSiteAt(player,state.map))return "plant";
 if(side==="defend"&&state.phase==="postplant"&&
   (state.map!=="house"||(player.y??0)<1.25)&&
   Math.hypot(player.x-state.defuser.x,player.z-state.defuser.z)<=BOMB_RULES.disableRadius)
  return "disable";
 return null;
}
export function defuserBeepInterval(_timeLeft){
 // The supplied gameplay reference has a continuous 235 ms device cadence.
 // Use its *timing*, never its recorded copyrighted waveform; do not ramp
 // from one beep per second (which made the former device sound unrelated).
 return 0.235;
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
  // Preserve the fractional remainder. Resetting to zero quantized a 235 ms
  // beat to ~250 ms at 60fps, creating a perceptibly different rhythm.
  if(secs+1e-8>=interval){secs-=interval;events.push("defuser-tick");}
 }else secs=0;
 if(interaction==="plant"||interaction==="disable"){
  keys+=delta;
  const interval=interaction==="plant"?.135:.185;
  if(keys+1e-8>=interval){keys=0;events.push(interaction==="plant"?"plant-key":"defuse-key");}
 }else keys=0;
 return {clock:{phase,seconds:secs,keys,interaction},events};
}
