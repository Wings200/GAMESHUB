// W09.14: balanced incoming ballistic damage for player characters.
import {powerArmorProtection} from './power-armor.mjs';
export const PLAYER_BALLISTIC_TUNING=Object.freeze({
  armorDivisor:80,maximumRegularReduction:.62
});
export function regularBallisticReduction(points){
  const p=Math.max(0,Number.isFinite(points)?points:0);
  return Math.min(PLAYER_BALLISTIC_TUNING.maximumRegularReduction,
    p/(p+PLAYER_BALLISTIC_TUNING.armorDivisor));
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
