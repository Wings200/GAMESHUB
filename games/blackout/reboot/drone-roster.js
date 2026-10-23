// BLACKOUT V0.12.2 · honest drone inventory and camera-only controls.
// Testing Range: two throwable drones, zero automatically deployed.
// Actual match contract (future): one preparation drone + one action-phase spare.
// 5 NEVER creates a device. 6 throws available drones; range ignores phase.
export const DRONE_ROSTER_LIMIT=2;
export function newDroneRoster(mode="range"){
 if(!["range","match"].includes(mode))throw new RangeError("Invalid drone roster mode");
 return {mode,drones:[],selected:-1,initialUsed:false,spareUsed:false};
}
export function cameraRequest(roster){
 if(roster.drones.length===0)
  return {action:"none",reason:"NO DRONES DEPLOYED · PRESS 6 TO THROW"};
 return {action:"open",index:roster.selected>=0?roster.selected:0};
}
export function throwRequest(roster,phase="range"){
 if(roster.drones.length>=DRONE_ROSTER_LIMIT)
  return {action:"none",reason:"NO DRONES REMAINING"};
 if(roster.mode==="range"){
  if(!roster.initialUsed)return {action:"throw-only",kind:"initial"};
  if(!roster.spareUsed)return {action:"throw-only",kind:"spare"};
  return {action:"none",reason:"NO DRONES REMAINING"};
 }
 // Match inventory follows the actual preparation, action, and post-plant
 // round phases. The test range still carries two ordinary throwables.
 if(phase==="prep")
  return roster.initialUsed?
   {action:"none",reason:"PREP DRONE ALREADY DEPLOYED"}:
   {action:"throw-only",kind:"initial"};
 if(phase==="action"||phase==="postplant")
  return roster.spareUsed?
   {action:"none",reason:"NO POST-PREP SPARE REMAINING"}:
   {action:"throw-only",kind:"spare"};
 return {action:"blocked",reason:"DRONE PHASE NOT AVAILABLE"};
}
// Kept as a named alias for existing integrations; the single shared
// phase-aware selector now owns *all* 6-key throw permissions.
export const spareRequest=throwRequest;
export function registerDrone(roster,drone,kind){
 if(!drone||!["initial","spare"].includes(kind))return roster;
 if(roster.drones.length>=DRONE_ROSTER_LIMIT)return roster;
 if(kind==="initial"&&roster.initialUsed)return roster;
 if(kind==="spare"&&roster.spareUsed)return roster;
 return {...roster,drones:[...roster.drones,drone],
  initialUsed:roster.initialUsed||kind==="initial",
  spareUsed:roster.spareUsed||kind==="spare",
  selected:roster.drones.length};
}
export function updateDrone(roster,index,drone){
 if(!Number.isInteger(index)||index<0||index>=roster.drones.length)return roster;
 const drones=roster.drones.slice();drones[index]=drone;
 return {...roster,drones};
}
export function selectDrone(roster,delta){
 const length=roster.drones.length;
 if(!length)return roster;
 return {...roster,selected:((roster.selected+delta)%length+length)%length};
}
// Remove a destroyed camera without refunding its preparation/action throw.
export function removeDrone(roster,index){
 if(!Number.isInteger(index)||index<0||index>=roster.drones.length)return roster;
 const drones=roster.drones.filter((_,i)=>i!==index);
 const selected=drones.length===0?-1:
  roster.selected>index?roster.selected-1:
  roster.selected===index?Math.min(index,drones.length-1):roster.selected;
 return {...roster,drones,selected};
}
export function selectedDrone(roster){
 return roster.drones[roster.selected]||null;
}
export function droneEquipmentStatus(roster,phase="range"){
 const throwables=roster.mode==="range"?
  Number(!roster.initialUsed)+Number(!roster.spareUsed):
  phase==="prep"?Number(!roster.initialUsed):
  (phase==="action"||phase==="postplant")?Number(!roster.spareUsed):0;
 return {cameras:roster.drones.length,throwables,
  initial:roster.initialUsed?0:1,spare:roster.spareUsed?0:1};
}
