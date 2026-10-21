// BLACKOUT V0.15.1 · melee target classification and cooldown.
// One shared hit resolver for V punches; first visible solid face blocks
// reach so a punch cannot pass through a wall or a reinforced panel.
export const MELEE=Object.freeze({range:2.25,cooldownSeconds:.57,animationSeconds:.32});
export function canPunch(now,lastPunch=-Infinity){
 return Number.isFinite(now)&&(now-lastPunch>=MELEE.cooldownSeconds*1000);
}
export function meleeTarget(hit){
 if(!hit||!Number.isFinite(hit.distance)||hit.distance>MELEE.range)
  return {kind:"miss"};
 const obj=hit.object;
 if(Number.isInteger(obj?.userData?.wireId))
  return {kind:"wire",id:obj.userData.wireId};
 if(Number.isInteger(obj?.userData?.barricadeIndex))
  return {kind:"barricade",index:obj.userData.barricadeIndex};
 return {kind:"blocked"};
}
export function selectedMeleeTarget(intersections){
 // combatIntersections already sorts nearest, but ignore a malicious
 // unordered input so the first physically encountered face always wins.
 const closest=intersections?.filter(hit=>Number.isFinite(hit.distance))
  .sort((a,b)=>a.distance-b.distance)[0];
 return meleeTarget(closest);
}
