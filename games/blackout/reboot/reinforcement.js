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
 return {installed:false,progress:0,installs:0,removals:0,breach:null,electrified:false};
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
 if(progress+1e-8>=REINFORCEMENT.installSeconds){
  return {state:{...state,installed:true,progress:0,installs:state.installs+1,breach:null},
   event:"installed"};
 }
 return {state:{...state,progress},event:"building"};
}
export function removeReinforcement(state,player){
 if(!state.installed)return {state,removed:false,reason:"NO REINFORCEMENT INSTALLED"};
 if(!canWorkOnReinforcement(player))
  return {state,removed:false,reason:"MOVE CLOSE AND STAND CLEAR"};
 return {state:{...state,installed:false,progress:0,removals:state.removals+1,breach:null},
  removed:true,reason:"METAL REINFORCEMENT REMOVED"};
}
// Cut a rectangle that extends to the floor, so a full-height player
// capsule can pass. Other steel pieces remain solid, visible, and shootable.
// Do NOT remove the entire reinforcement or fake a doorway with a decal.
export function hardBreachReinforcement(state,blast){
 if(!state?.installed||state.electrified)return {state,opened:false,reason:
  state?.electrified?"ELECTRIFIED REINFORCEMENT · DISABLE ELECTRICITY FIRST":
   "NO REINFORCEMENT TO BREACH"};
 if(!blast||![blast.x,blast.y,blast.z].every(Number.isFinite)||
   Math.abs(blast.z-REINFORCEMENT.z)>.5||
   Math.abs(blast.x-REINFORCEMENT.x)>REINFORCEMENT.width/2-.5)
  return {state,opened:false,reason:"BREACH CHARGE NOT ON METAL"};
 const s=REINFORCEMENT;
 // Width leaves at least .4m of side support on either edge.
 const cx=Math.max(s.x-s.width/2+1.25,Math.min(s.x+s.width/2-1.25,blast.x));
 const opening={left:cx-1.19,right:cx+1.19,top:2.17};
 if(state.breach)return {state,opened:false,reason:"REINFORCEMENT ALREADY BREACHED"};
 return {state:{...state,breach:opening},opened:true,reason:"STEEL BREACH OPENED"};
}
export function reinforcementBlockers(state){
 if(!state.installed)return [];
 const s=REINFORCEMENT,edgeLeft=s.x-s.width/2,edgeRight=s.x+s.width/2;
 if(!state.breach)
  return [{id:s.id,x:s.x,z:s.z,width:s.width,depth:s.depth,
   bottom:0,height:s.height}];
 const b=state.breach,parts=[];
 const add=(id,left,right,bottom,top)=>{
  if(right-left<.005||top-bottom<.005)return;
  parts.push({id:s.id+"-"+id,x:(left+right)/2,z:s.z,
   width:right-left,depth:s.depth,bottom,height:top});
 };
 add("left",edgeLeft,b.left,0,s.height);
 add("right",b.right,edgeRight,0,s.height);
 add("lintel",b.left,b.right,b.top,s.height);
 return parts;
}
export function reinforcementStatus(state){
 return state.installed?(state.breach?"BREACHED":"REINFORCED"):
  state.progress>0?"INSTALLING":"UNREINFORCED";
}
