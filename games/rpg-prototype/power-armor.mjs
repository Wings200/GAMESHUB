// W08.2 power armor: an independent powered chassis with six removable plates.
// The mechanical state is renderer-free; visuals and audio live in the lab.
import {ARMOR_SLOTS,damageReductionForPoints} from './combat.mjs';
export const POWER_ARMOR_SLOTS=ARMOR_SLOTS;
export const POWER_ARMOR_TRANSITION_SECONDS=4.5;
export const POWER_ARMOR_PLATES=Object.freeze({
  none:Object.freeze({id:'none',name:'Bare chassis',points:0,color:0x29383d,scale:0}),
  scrap:Object.freeze({id:'scrap',name:'Salvaged steel',points:26,color:0x867967,scale:.86}),
  ranger:Object.freeze({id:'ranger',name:'Ranger composite',points:47,color:0x667b73,scale:1}),
  citadel:Object.freeze({id:'citadel',name:'Citadel reinforced',points:72,color:0x475f7b,scale:1.13})
});
export const POWER_ARMOR_FRAME_AP=30;
// A powered chassis should not turn an ordinary first-person character into
// a 2.82m camera. Crouch and normal eye-height interpolation stay authoritative.
export function powerArmorEyeHeight(state,normalEyeHeight){
  const safe=Number.isFinite(normalEyeHeight)?normalEyeHeight:1.70;
  return safe+(state.occupied?.10:0);
}

export function createPowerArmorState(){
  return {occupied:false,phase:'idle',elapsed:0,
    plates:Object.fromEntries(POWER_ARMOR_SLOTS.map(slot=>
      [slot,['chest','leftArm','rightLeg'].includes(slot)?'scrap':'none']))};
}
export function getPowerPlate(slot,tier){
  if(!POWER_ARMOR_SLOTS.includes(slot))throw Error('Unknown powered armor slot: '+slot);
  return POWER_ARMOR_PLATES[tier]||POWER_ARMOR_PLATES.none;
}
export function setPowerPlate(state,slot,tier){
  if(!POWER_ARMOR_SLOTS.includes(slot)||!POWER_ARMOR_PLATES[tier])
    return {ok:false,reason:'unknown-plate'};
  state.plates[slot]=tier;
  return {ok:true,slot,tier,points:POWER_ARMOR_PLATES[tier].points};
}
export function beginPowerArmorTransition(state){
  if(state.phase!=='idle')return {ok:false,reason:'busy'};
  state.phase=state.occupied?'exiting':'entering';
  state.elapsed=0;
  return {ok:true,phase:state.phase};
}
export function stepPowerArmor(state,dt){
  if(state.phase==='idle')return {phase:'idle',progress:state.occupied?1:0,completed:false};
  state.elapsed=Math.min(POWER_ARMOR_TRANSITION_SECONDS,
    state.elapsed+Math.max(0,Number.isFinite(dt)?dt:0));
  const progress=state.elapsed/POWER_ARMOR_TRANSITION_SECONDS;
  const finished=progress>=1;
  const phase=state.phase;
  if(finished){
    state.occupied=phase==='entering';
    state.phase='idle';state.elapsed=0;
  }
  return {phase,progress,completed:finished,occupied:state.occupied};
}
export function powerArmorProtection(state,slot='chest',regularReduction=0){
  const regular=Math.max(0,Math.min(.85,Number.isFinite(regularReduction)?regularReduction:0));
  if(!state.occupied)return {slot,points:0,combinedReduction:regular,frameReduction:0};
  const points=POWER_ARMOR_FRAME_AP+getPowerPlate(slot,state.plates[slot]).points;
  const frameReduction=damageReductionForPoints(points);
  // Normal soft armor and a powered shell act as two sequential barriers.
  return {slot,points,frameReduction,
    combinedReduction:Math.min(.90,1-(1-regular)*(1-frameReduction))};
}
export function safePowerArmorSnapshot(raw){
  const state=createPowerArmorState();
  if(!raw||typeof raw!=='object')return state;
  for(const slot of POWER_ARMOR_SLOTS){
    const tier=raw.plates?.[slot];
    if(Object.hasOwn(POWER_ARMOR_PLATES,tier))state.plates[slot]=tier;
  }
  state.occupied=raw.occupied===true;
  return state; // interrupted animations never corrupt saved occupancy
}
