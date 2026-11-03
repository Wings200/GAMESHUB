// W10.0: modular power armor, persistent plate condition, and consumable cores.
// Renderer-independent rules. Regular six-slot armor never wears out.
import {ARMOR_SLOTS,damageReductionForPoints} from './combat.mjs';
export const POWER_ARMOR_SLOTS=ARMOR_SLOTS;
export const POWER_ARMOR_TRANSITION_SECONDS=4.5;
export const FUSION_CORE_CAPACITY=100;
export const FUSION_CORE_DRAIN=Object.freeze({idle:.04,walking:.16,sprinting:.38});
export const POWER_ARMOR_PLATES=Object.freeze({
  none:Object.freeze({id:'none',name:'Bare chassis',points:0,color:0x29383d,scale:0,maxDurability:0,model:'none'}),
  // Older saved rigs keep their original salvage tiers.
  scrap:Object.freeze({id:'scrap',name:'Salvaged Steel',points:26,color:0x867967,scale:.86,maxDurability:80,model:'scrap'}),
  ranger:Object.freeze({id:'ranger',name:'Ranger Composite',points:47,color:0x667b73,scale:1,maxDurability:110,model:'ranger'}),
  citadel:Object.freeze({id:'citadel',name:'Citadel Reinforced',points:72,color:0x475f7b,scale:1.13,maxDurability:145,model:'citadel'}),
  t45:Object.freeze({id:'t45',name:'T-45 Field Armor',points:34,color:0xb1a48b,scale:.94,maxDurability:100,model:'t45'}),
  t60:Object.freeze({id:'t60',name:'T-60 Heavy Armor',points:57,color:0x4f7585,scale:1.07,maxDurability:145,model:'t60'}),
  t01:Object.freeze({id:'t01',name:'T-01 Prototype',points:78,color:0x694781,scale:1.15,maxDurability:180,model:'t01'})
});
export const POWER_ARMOR_RECIPES=Object.freeze({
  t45:Object.freeze({salvage:10,glass:0}),
  t60:Object.freeze({salvage:18,glass:4}),
  t01:Object.freeze({salvage:32,glass:8})
});
export const POWER_ARMOR_FRAME_AP=30;
const clamp=(n,low,high)=>Math.max(low,Math.min(high,Number.isFinite(n)?n:low));
export function powerArmorEyeHeight(state,normalEyeHeight){
  const safe=Number.isFinite(normalEyeHeight)?normalEyeHeight:1.70;
  return safe+(state.occupied?.80:0);
}
export function getPowerPlate(slot,tier){
  if(!POWER_ARMOR_SLOTS.includes(slot))throw Error('Unknown powered armor slot: '+slot);
  return POWER_ARMOR_PLATES[tier]||POWER_ARMOR_PLATES.none;
}
export function createPowerArmorState(){
  // An incomplete, worn early T-45 rig: the missing right arm can be salvaged.
  const plates=Object.fromEntries(POWER_ARMOR_SLOTS.map(slot=>
    [slot,slot==='rightArm'?'none':'t45']));
  const plateDurability=Object.fromEntries(POWER_ARMOR_SLOTS.map(slot=>
    [slot,plates[slot]==='none'?0:70]));
  return {occupied:false,phase:'idle',elapsed:0,plates,plateDurability,
    coreCharge:null};
}
export function plateCondition(state,slot){
  const spec=getPowerPlate(slot,state.plates[slot]);
  return {slot,tier:spec.id,max:spec.maxDurability,
    current:clamp(state.plateDurability?.[slot],0,spec.maxDurability),
    broken:spec.points>0&&!(state.plateDurability?.[slot]>0)};
}
export function setPowerPlate(state,slot,tier,condition=null){
  if(!POWER_ARMOR_SLOTS.includes(slot)||!Object.hasOwn(POWER_ARMOR_PLATES,tier))
    return {ok:false,reason:'unknown-plate'};
  const spec=POWER_ARMOR_PLATES[tier];
  state.plates[slot]=tier;
  state.plateDurability??={};
  state.plateDurability[slot]=tier==='none'?0:
    condition===null?spec.maxDurability:clamp(condition,0,spec.maxDurability);
  return {ok:true,slot,tier,points:spec.points,
    durability:state.plateDurability[slot]};
}
export function removePowerPlate(state,slot){
  if(!POWER_ARMOR_SLOTS.includes(slot))return {ok:false,reason:'invalid-slot'};
  if(state.occupied||state.phase!=='idle')return {ok:false,reason:'in-use'};
  const current=plateCondition(state,slot);
  if(current.tier==='none')return {ok:false,reason:'empty'};
  state.plates[slot]='none';state.plateDurability[slot]=0;
  return {ok:true,...current};
}
export function repairPowerPlate(state,slot,availableSalvage,discount=0){
  if(!POWER_ARMOR_SLOTS.includes(slot))return {ok:false,reason:'invalid-slot'};
  if(state.occupied||state.phase!=='idle')return {ok:false,reason:'in-use'};
  const condition=plateCondition(state,slot);
  if(condition.tier==='none')return {ok:false,reason:'empty'};
  if(condition.current===condition.max)return {ok:false,reason:'full'};
  const discountFactor=1-Math.max(0,Math.min(.5,Number.isFinite(discount)?discount:0));
  const cost=Math.max(1,Math.ceil(Math.ceil((condition.max-condition.current)/25)*discountFactor));
  if(availableSalvage<cost)return {ok:false,reason:'materials',cost};
  state.plateDurability[slot]=condition.max;
  return {ok:true,cost,slot,durability:condition.max};
}
export function damagePowerPlate(state,slot,rawDamage){
  if(!state.occupied)return {worn:0,broken:false};
  const part=plateCondition(state,slot);
  if(part.tier==='none'||part.current<=0)return {worn:0,broken:false};
  const worn=Math.min(part.current,
    Math.max(0,Number.isFinite(rawDamage)?rawDamage:0)*.24);
  state.plateDurability[slot]=Math.max(0,part.current-worn);
  return {worn,broken:worn>0&&state.plateDurability[slot]===0,
    durability:state.plateDurability[slot],slot};
}
export function hasFusionPower(state){return Number.isFinite(state?.coreCharge)&&state.coreCharge>0;}
export function installFusionCore(state,charge=FUSION_CORE_CAPACITY){
  if(state.phase!=='idle'||state.occupied)return {ok:false,reason:'in-use'};
  if(state.coreCharge!==null)return {ok:false,reason:'occupied-slot'};
  const value=clamp(charge,0,FUSION_CORE_CAPACITY);
  if(value<=0)return {ok:false,reason:'spent-core'};
  state.coreCharge=value;
  return {ok:true,charge:value};
}
export function ejectFusionCore(state){
  if(state.phase!=='idle'||state.occupied)return {ok:false,reason:'in-use'};
  if(state.coreCharge===null)return {ok:false,reason:'empty'};
  const charge=state.coreCharge;state.coreCharge=null;
  return {ok:true,charge};
}
export function stepFusionCore(state,dt,{moving=false,sprinting=false}={}){
  if(!state.occupied||state.phase!=='idle'||!hasFusionPower(state))
    return {drained:0,depleted:state.occupied&&!hasFusionPower(state)};
  const rate=sprinting?FUSION_CORE_DRAIN.sprinting:
    moving?FUSION_CORE_DRAIN.walking:FUSION_CORE_DRAIN.idle;
  const drained=Math.min(state.coreCharge,Math.max(0,Number.isFinite(dt)?dt:0)*rate);
  state.coreCharge=Math.max(0,state.coreCharge-drained);
  return {drained,depleted:state.coreCharge===0,charge:state.coreCharge};
}
export function powerArmorMobility(state){
  const limping=state.occupied&&!hasFusionPower(state);
  return {factor:limping?.23:1,canSprint:!limping,canJump:!limping,
    canFastTravel:!limping};
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
  const finished=progress>=1,phase=state.phase;
  if(finished){
    state.occupied=phase==='entering';
    state.phase='idle';state.elapsed=0;
  }
  return {phase,progress,completed:finished,occupied:state.occupied};
}
export function powerArmorProtection(state,slot='chest',regularReduction=0){
  const regular=Math.max(0,Math.min(.85,Number.isFinite(regularReduction)?regularReduction:0));
  if(!state.occupied)return {slot,points:0,combinedReduction:regular,frameReduction:0};
  const equipped=getPowerPlate(slot,state.plates[slot]);
  const plateAP=plateCondition(state,slot).current>0?equipped.points:0;
  const points=POWER_ARMOR_FRAME_AP+plateAP;
  const frameReduction=damageReductionForPoints(points);
  return {slot,points,frameReduction,
    combinedReduction:Math.min(.90,1-(1-regular)*(1-frameReduction))};
}
export function safePowerArmorSnapshot(raw){
  const state=createPowerArmorState();
  if(!raw||typeof raw!=='object')return state;
  for(const slot of POWER_ARMOR_SLOTS){
    const tier=raw.plates?.[slot];
    if(Object.hasOwn(POWER_ARMOR_PLATES,tier)){
      state.plates[slot]=tier;
      const max=POWER_ARMOR_PLATES[tier].maxDurability;
      // Older W09 saves had no durability, so their pieces start fully repaired.
      state.plateDurability[slot]=Number.isFinite(raw.plateDurability?.[slot])?
        clamp(raw.plateDurability[slot],0,max):max;
    }
  }
  state.coreCharge=raw.coreCharge===null||raw.coreCharge===undefined?
    null:clamp(raw.coreCharge,0,FUSION_CORE_CAPACITY);
  state.occupied=raw.occupied===true;
  return state;
}
