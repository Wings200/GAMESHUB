// W05.4 tactical communications: shared LAST KNOWN position, not wallhacks.
// Autonomous bots require their own clear line of sight before firing.
import {AI_TUNING,alertEnemy,hasSight,lineIntersectsBox} from './enemy-ai.mjs';
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
      // Radio intel is not direct eyesight: the NPC must independently
      // confirm line-of-sight before it can aim or fire.
      b.spotted=false;
      notified++;
    }
  }
  return notified;
}
// A nearby ally going down is an observable event even when this guard has
// never been shot. It creates a casualty-area search, NOT knowledge of the
// unseen killer. Already sighted guards keep their confirmed engagement.
export function reactToAllyDown(team,fallen,obstacles=[],rng=Math.random){
  const point=fallen?.brain||fallen;
  if(!Number.isFinite(point?.x)||!Number.isFinite(point?.z))return 0;
  let responders=0;
  for(const member of team){
    if(!member?.state?.alive||!member.brain?.active||
       member===fallen||member.id===fallen?.id)continue;
    const brain=member.brain;
    const d=hypot(brain,point);
    if(d>24||brain.spotted)continue;
    const blocked=obstacles.some(box=>
      lineIntersectsBox(brain,point,box,.03));
    // Close teammates hear the impact even across a wall; distant ones
    // must have an unobstructed path to the incident.
    if(blocked&&d>12)continue;
    const value=Number(rng());
    const angle=(Number.isFinite(value)?Math.max(0,Math.min(1,value)):.5)*
      Math.PI*2;
    const uncertainty=blocked?2.4:1.0;
    brain.noiseTarget={x:point.x+Math.cos(angle)*uncertainty,
      z:point.z+Math.sin(angle)*uncertainty};
    brain.noiseTime=Math.max(brain.noiseTime,9);
    brain.memory=Math.max(brain.memory,9);
    brain.mode='investigate-noise';
    brain.aimLockSeconds=0;
    brain.routeGoal=null;brain.route=[];brain.routeFail=0;
    brain.searchPause=0;
    responders++;
  }
  return responders;
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
