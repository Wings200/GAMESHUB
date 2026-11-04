// W09.15: preserve the shared, per-piece percentage armor resistance.
// NPC weapon base damage is tuned separately from armor effectiveness.
import {damageReductionForPoints} from './combat.mjs';
import {powerArmorProtection} from './power-armor.mjs?v=W20.51';

export function regularBallisticReduction(points){
  return damageReductionForPoints(points);
}
export function calculateIncomingShot(rawDamage,armorPoints,powerState,zone='chest'){
  const raw=Math.max(0,Number.isFinite(rawDamage)?rawDamage:0);
  const regularReduction=regularBallisticReduction(armorPoints);
  const armor=powerArmorProtection(powerState,zone,regularReduction);
  const damage=raw*(1-armor.combinedReduction);
  return {rawDamage:raw,damage,blocked:raw-damage,
    regularReduction,combinedReduction:armor.combinedReduction,
    powered:powerState?.occupied===true};
}
