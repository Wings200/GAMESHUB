// W20.96: Item-backed nourishment, chems and radiation protection.
// Timers advance only during active gameplay; all bonuses are derived from
// persisted status rather than from independent HUD values.
import {getItem,removeItem} from './inventory.mjs';
import {applyRadiationExposure} from './radiation.mjs';

export const CONSUMABLE_EFFECTS=Object.freeze({
  'combat-stim':Object.freeze({label:'COMBAT STIM',seconds:60,
    description:'+20% firearm damage'}),
  'focus-tonic':Object.freeze({label:'FOCUS TONIC',seconds:75,
    description:'+12 V.A.T.S. hit chance'}),
  'rad-shield':Object.freeze({label:'RAD SHIELD',seconds:120,
    description:'35% radiation resistance'})
});
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

export function createConsumableStatus(){return {version:1,effects:{}};}
export function safeConsumableSnapshot(raw){
  const effects={};
  for(const [key,definition] of Object.entries(CONSUMABLE_EFFECTS)){
    const seconds=raw?.effects?.[key];
    if(Number.isFinite(seconds)&&seconds>0)
      effects[key]=clamp(seconds,0,definition.seconds);
  }
  return {version:1,effects};
}
export function consumableBonuses(status){
  const effects=status?.effects||{};
  return {
    gunDamageMultiplier:effects['combat-stim']>0?1.20:1,
    vatsChanceBonus:effects['focus-tonic']>0?12:0,
    radiationProtection:effects['rad-shield']>0?.35:0
  };
}
export function activeConsumableLabels(status){
  return Object.entries(CONSUMABLE_EFFECTS).filter(([key])=>
    status?.effects?.[key]>0).map(([key,spec])=>
    spec.label+' '+Math.ceil(status.effects[key])+'s');
}
export function tickConsumableEffects(status,seconds){
  if(!Number.isFinite(seconds)||seconds<=0)return false;
  let changed=false;
  for(const key of Object.keys(CONSUMABLE_EFFECTS)){
    const current=status.effects?.[key]||0;
    if(current<=0)continue;
    const next=Math.max(0,current-seconds);
    if(next>0)status.effects[key]=next;
    else delete status.effects[key];
    changed=true;
  }
  return changed;
}
export function consumeSurvivalItem(pack,uid,health,radiation,status){
  const entry=pack?.items?.find(item=>item.uid===uid);
  if(!entry)return {ok:false,reason:'missing'};
  const item=getItem(entry.itemId);
  if(!['supply:clean-water','supply:trail-stew','supply:dirty-water',
    'supply:combat-stim','supply:focus-tonic','supply:rad-shield'].includes(item.id))
    return {ok:false,reason:'not-consumable'};
  if(!health?.alive)return {ok:false,reason:'player-down'};
  const effect=item.effectKey?CONSUMABLE_EFFECTS[item.effectKey]:null;
  if(item.effectKey&&!effect)return {ok:false,reason:'invalid-effect'};
  if(effect&&status?.effects?.[item.effectKey]>0)
    return {ok:false,reason:'already-active'};
  if(!effect&&health.health>=health.maxHealth)
    return {ok:false,reason:'health-full'};
  if(!status||typeof status!=='object'||!status.effects||
    !radiation||!Number.isFinite(radiation.rads))
    return {ok:false,reason:'invalid-state'};
  // Removal and every effect are committed exactly once after validation.
  const removed=removeItem(pack,uid,1);
  if(removed.removed!==1)return {ok:false,reason:'missing'};
  const restored=Math.min(item.heal||0,Math.max(0,health.maxHealth-health.health));
  health.health+=restored;
  const dose=item.radDose>0?
    applyRadiationExposure(radiation,health,item.radDose,1,{protection:0}):null;
  if(effect)status.effects[item.effectKey]=effect.seconds;
  return {ok:true,itemId:item.id,restored,radsAdded:dose?.added||0,
    healthDamage:dose?.healthDamage||0,
    effectKey:item.effectKey||null,effectSeconds:effect?.seconds||0};
}
