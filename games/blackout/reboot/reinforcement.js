// BLACKOUT V0.11 · pure deterministic metal reinforcement rules.
// Compatible with V0.10 soft-wall cells; does not mutate or heal gypsum.
// A completed reinforcement blocks bullet raycasts and player physics even
// if the original drywall was perforated. No explosives in this stage.
import {SOFT_WALL,canResetSoftWall} from "./soft-wall.js?v=reboot-016";

export const REINFORCEMENT=Object.freeze({
 id:"metal-reinforcement-01",x:SOFT_WALL.x,z:SOFT_WALL.z,
 width:SOFT_WALL.columns*SOFT_WALL.cell,
 height:SOFT_WALL.rows*SOFT_WALL.cell,
 depth:.30,interactRadius:2.65,installSeconds:3,
});
export function newReinforcement(){
 return {installed:false,progress:0,installs:0,removals:0};
}
export function canWorkOnReinforcement(player){
 if(!player||!Number.isFinite(player.x)||!Number.isFinite(player.z))
  return false;
 return Math.hypot(player.x-REINFORCEMENT.x,player.z-REINFORCEMENT.z)
   <=REINFORCEMENT.interactRadius &&
   canResetSoftWall(player);
}
export function stepReinforcement(state,{player,holding,dt,moving=false,sprinting=false}={}){
 if(state.installed)return {state,event:"none"};
 // Three seconds of stationary uninterrupted F hold. Release/stray cancels.
 if(!holding||!canWorkOnReinforcement(player)||moving||sprinting){
  if(state.progress===0)return {state,event:"none"};
  return {state:{...state,progress:0},event:"cancelled"};
 }
 const delta=Number.isFinite(dt)?Math.max(0,Math.min(.05,dt)):0;
 if(delta===0)return {state,event:"none"};
 const progress=Math.min(REINFORCEMENT.installSeconds,state.progress+delta);
 if(progress>=REINFORCEMENT.installSeconds){
  return {state:{...state,installed:true,progress:0,installs:state.installs+1},
   event:"installed"};
 }
 return {state:{...state,progress},event:"building"};
}
export function removeReinforcement(state,player){
 if(!state.installed)return {state,removed:false,reason:"NO REINFORCEMENT INSTALLED"};
 if(!canWorkOnReinforcement(player))
  return {state,removed:false,reason:"MOVE CLOSE AND STAND CLEAR"};
 return {state:{...state,installed:false,progress:0,removals:state.removals+1},
  removed:true,reason:"METAL REINFORCEMENT REMOVED"};
}
export function reinforcementBlockers(state){
 if(!state.installed)return [];
 const s=REINFORCEMENT;
 return [{id:s.id,x:s.x,z:s.z,width:s.width,depth:s.depth,
  bottom:0,height:s.height}];
}
export function reinforcementStatus(state){
 return state.installed?"REINFORCED":state.progress>0?"INSTALLING":"UNREINFORCED";
}
