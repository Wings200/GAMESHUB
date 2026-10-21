// BLACKOUT V0.12.1 · Attacker drone inventory and camera-menu rules.
// Range has no preparation phase yet. Preserve the one prep drone and one
// post-prep spare as distinct resources; match mode will unlock #6 after prep.
export const DRONE_ROSTER_LIMIT=2;
export function newDroneRoster(){
 return {drones:[],selected:-1,initialUsed:false,spareUsed:false};
}
export function cameraRequest(roster){
 if(roster.drones.length===0){
  return roster.initialUsed?{action:"none",reason:"NO DRONES DEPLOYED"}:
    {action:"throw-first-and-open",kind:"initial"};
 }
 return {action:"open",index:roster.selected>=0?roster.selected:0};
}
export function spareRequest(roster,phase="range"){
 if(phase==="prep")return {action:"blocked",reason:"SPARE DRONE UNAVAILABLE DURING PREP"};
 if(roster.spareUsed)return {action:"none",reason:"NO SPARE DRONES REMAINING"};
 return {action:"throw-only",kind:"spare"};
}
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
export function selectedDrone(roster){
 return roster.drones[roster.selected]||null;
}
export function droneEquipmentStatus(roster){
 return {cameras:roster.drones.length,spare:roster.spareUsed?0:1,
  initial:roster.initialUsed?0:1};
}
