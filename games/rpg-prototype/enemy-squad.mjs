// W05.4 tactical communications: shared LAST KNOWN position, not wallhacks.
// Autonomous bots require their own clear line of sight before firing.
import {AI_TUNING,alertEnemy,hasSight} from './enemy-ai.mjs';
const hypot=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const SQUAD_TUNING=Object.freeze({alertSeconds:4.4,hearingRange:24,spacing:1.35});
export function createSquadIntel(){
  return {lastKnown:null,source:null,remaining:0,alerts:0};
}
export function clearSquadIntel(intel){
  intel.lastKnown=null;intel.source=null;intel.remaining=0;intel.alerts=0;
  return intel;
}
export function reportSquadContact(intel,sourceId,position){
  if(!Number.isFinite(position?.x)||!Number.isFinite(position?.z))return false;
  intel.lastKnown={x:position.x,z:position.z};
  intel.source=sourceId;intel.remaining=SQUAD_TUNING.alertSeconds;
  intel.alerts++;
  return true;
}
export function stepSquadIntel(intel,dt,enabled=true){
  if(!enabled)return intel;
  const step=Math.max(0,Math.min(Number.isFinite(dt)?dt:0,AI_TUNING.maxDelta));
  intel.remaining=Math.max(0,intel.remaining-step);
  if(intel.remaining===0){intel.lastKnown=null;intel.source=null;}
  return intel;
}
export function shareSquadContact(intel,team,obstacles=[],player){
  if(!intel.lastKnown||intel.remaining<=0)return 0;
  let notified=0;
  for(const e of team){
    if(!e?.brain?.active||!e.state.alive||e.id===intel.source)continue;
    const b=e.brain;
    // Allied calls make bots investigate, not instantly acquire a player
    // through a wall. Only notify those nearby, and don't overwrite a
    // direct sighting with stale shared information.
    if(hypot(b,intel.lastKnown)>SQUAD_TUNING.hearingRange)continue;
    if(player&&hasSight(b,player,obstacles))continue;
    if(b.mode==='patrol'||b.mode==='search'){
      alertEnemy(b,intel.lastKnown);
      notified++;
    }
  }
  return notified;
}
export function squadSeparation(enemy,team,radius=SQUAD_TUNING.spacing){
  let separationX=0,separationZ=0;
  for(const e of team){
    if(!e?.brain?.active||!e.state.alive||e.brain===enemy)continue;
    const dx=enemy.x-e.brain.x,dz=enemy.z-e.brain.z;
    const d=Math.hypot(dx,dz);
    if(d>1e-4&&d<radius){
      const weight=(radius-d)/radius;
      separationX+=dx/d*weight;
      separationZ+=dz/d*weight;
    }
  }
  return {x:separationX,z:separationZ};
}
export function occupiedSquadCover(team,currentId){
  return team.filter(e=>e.state.alive&&e.id!==currentId&&e.tactics?.coverPoint)
    .map(e=>e.tactics.coverPoint);
}
