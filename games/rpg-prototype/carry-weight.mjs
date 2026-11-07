// W20.95: Normal-mode Fallout-style carrying and overload penalties.
// Rules are pure so every panel and the movement controller use one result.
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export const BASE_CARRY_WEIGHT=200;
export const CARRY_PER_STRENGTH=10;
export const POWER_FRAME_STRENGTH=11;
export const FIELD_BACKPACK_BONUS=25;

export function carryCapacity({strength=3,powerArmor=false,fieldBackpack=false}={}){
  const points=Number.isFinite(strength)?clamp(Math.floor(strength),1,10):3;
  const effective=powerArmor?POWER_FRAME_STRENGTH:points;
  return BASE_CARRY_WEIGHT+CARRY_PER_STRENGTH*effective+
    (fieldBackpack?FIELD_BACKPACK_BONUS:0);
}

export function encumbranceEffects(weight,capacity){
  const carried=Number.isFinite(weight)?Math.max(0,weight):0;
  const limit=Number.isFinite(capacity)?Math.max(1,capacity):1;
  const excess=Math.max(0,carried-limit);
  const overloaded=excess>1e-6;
  const ratio=excess/limit;
  return {overloaded,excess:Math.round(excess*10)/10,
    speedMultiplier:overloaded?clamp(.55-ratio*.16,.32,.55):1,
    canSprint:!overloaded,
    // Drains the same stamina/AP pool used by sprinting and V.A.T.S.
    movingApDrain:overloaded?2.6+Math.min(2.4,ratio*4):0};
}

export function formatCarryWeight(weight){
  return (Number.isFinite(weight)?Math.max(0,weight):0).toFixed(1)+' LB';
}
