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
 return {installed:false,progress:0,installs:0,removals:0,breach:null,breaches:[],electrified:false};
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
  return {state:{...state,installed:true,progress:0,installs:state.installs+1,breach:null,breaches:[]},
   event:"installed"};
 }
 return {state:{...state,progress},event:"building"};
}
export function removeReinforcement(state,player){
 if(!state.installed)return {state,removed:false,reason:"NO REINFORCEMENT INSTALLED"};
 if(!canWorkOnReinforcement(player))
  return {state,removed:false,reason:"MOVE CLOSE AND STAND CLEAR"};
 return {state:{...state,installed:false,progress:0,removals:state.removals+1,breach:null,breaches:[]},
  removed:true,reason:"METAL REINFORCEMENT REMOVED"};
}
// Small, raised vault-sized rectangle. The sill remains physical: walking
// into the wall or ordinary jumping cannot turn it into a free doorway.
// Only the dedicated Space vault can safely clear the lower steel support.
export const HARD_BREACH_WINDOW=Object.freeze({
 width:1.62,bottom:.70,top:2.0
});
export function hardBreachWindow(blast){
 if(!blast||![blast.x,blast.y,blast.z].every(Number.isFinite)||
   Math.abs(blast.z-REINFORCEMENT.z)>.5||
   Math.abs(blast.x-REINFORCEMENT.x)>REINFORCEMENT.width/2-.3)return null;
 const s=REINFORCEMENT;
 // Keep a significant amount of steel on both sides.
 const half=HARD_BREACH_WINDOW.width/2;
 const maxOffset=s.width/2-half-.10;
 const cx=Math.max(s.x-maxOffset,Math.min(s.x+maxOffset,blast.x));
 return {left:cx-half,right:cx+half,
  bottom:HARD_BREACH_WINDOW.bottom,top:HARD_BREACH_WINDOW.top};
}
// Preserve all earlier holes on the same reinforcement. The original
// `breach` field remains as a backwards-compatible reference to the first
// opening; `breaches` is the authoritative list for multiple charges.
export function reinforcementBreaches(state){
 if(!state?.installed)return [];
 return state.breaches?.length?state.breaches:
  state.breach?[state.breach]:[];
}
// Merge overlapping horizontal openings ONLY for physical steel fragments.
// At no point can a later blast add material back to a previous opening.
export function mergedBreachWindows(state){
 const sorted=reinforcementBreaches(state).slice().sort((a,b)=>a.left-b.left);
 const merged=[];
 for(const b of sorted){
  const last=merged[merged.length-1];
  if(last&&b.left<=last.right+1e-8)
   merged[merged.length-1]={...last,right:Math.max(last.right,b.right)};
  else merged.push({...b});
 }
 return merged;
}
export function reinforcementWindowAddsHole(state,opening){
 if(!opening)return false;
 let cursor=opening.left;
 for(const b of mergedBreachWindows(state)){
  if(b.right<=cursor)continue;
  if(b.left>cursor+.05)return true; // meaningful previously-solid interval
  cursor=Math.max(cursor,b.right);
  if(cursor>=opening.right-.05)return false;
 }
 return cursor<opening.right-.05;
}
export function hardBreachReinforcement(state,blast){
 if(!state?.installed||state.electrified)return {state,opened:false,reason:
  state?.electrified?"ELECTRIFIED REINFORCEMENT · DISABLE ELECTRICITY FIRST":
   "NO REINFORCEMENT TO BREACH"};
 const opening=hardBreachWindow(blast);
 if(!opening)return {state,opened:false,reason:"BREACH CHARGE NOT ON METAL"};
 if(!reinforcementWindowAddsHole(state,opening))
  return {state,opened:false,reason:"THESE STEEL CELLS ARE ALREADY OPEN"};
 const prior=reinforcementBreaches(state);
 return {state:{...state,breach:state.breach||opening,
  breaches:[...prior,opening]},opened:true,reason:"STEEL BREACH OPENED"};
}
export function reinforcementBlockers(state){
 if(!state.installed)return [];
 const s=REINFORCEMENT,edgeLeft=s.x-s.width/2,edgeRight=s.x+s.width/2;
 const openings=mergedBreachWindows(state);
 if(!openings.length)
  return [{id:s.id,x:s.x,z:s.z,width:s.width,depth:s.depth,
   bottom:0,height:s.height}];
 const parts=[];
 const add=(id,left,right,bottom,top)=>{
  if(right-left<.005||top-bottom<.005)return;
  parts.push({id:s.id+"-"+id,x:(left+right)/2,z:s.z,
   width:right-left,depth:s.depth,bottom,height:top});
 };
 for(let i=0;i<openings.length;i++){
  const b=openings[i],previous=i?openings[i-1]:null;
  add(i?"middle-"+i:"left",previous?.right??edgeLeft,b.left,0,s.height);
  const suffix=openings.length===1?"":"-"+i;
  add("sill"+suffix,b.left,b.right,0,b.bottom);
  add("lintel"+suffix,b.left,b.right,b.top,s.height);
 }
 add("right",openings[openings.length-1].right,edgeRight,0,s.height);
 return parts;
}
export function reinforcementStatus(state){
 return state.installed?(reinforcementBreaches(state).length?"BREACHED":"REINFORCED"):
  state.progress>0?"INSTALLING":"UNREINFORCED";
}
