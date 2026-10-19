// BLACKOUT V3.2 - pure material and recoil mechanics shared by test stations.
// Penetration damage multipliers are gameplay tuning, not actual ballistics.
export const MATERIALS=Object.freeze({
  drywall:Object.freeze({name:"DRYWALL",color:0xbba087,wear:1,
    through:.70,hole:.020,threshold:26,impactColor:0xcda67d}),
  plywood:Object.freeze({name:"PLYWOOD",color:0xa5784d,wear:.66,
    through:.48,hole:.017,threshold:36,impactColor:0xb78b5b}),
  glass:Object.freeze({name:"GLASS",color:0x9bc9cd,wear:1.6,
    through:.88,hole:.040,threshold:12,impactColor:0xc8f0f3}),
  steel:Object.freeze({name:"STEEL",color:0x526f82,wear:0,
    through:0,hole:0,threshold:Infinity,impactColor:0x9aabb8})
});
export function materialStats(type="drywall"){
  return MATERIALS[type]||MATERIALS.drywall;
}
// Repeated impact around one region grows local damage, but a single
// projectile cannot suddenly create a player-sized opening.
export function accumulatedBreach(cluster,type){
  const mat=materialStats(type);
  const score=cluster.wear/mat.threshold;
  if(score<1)return null;
  const p=Math.max(0,Math.min(1,(score-1)/.34));
  return {centerX:Math.max(-.78,Math.min(.78,cluster.x)),
    halfWidth:.39+.28*p,bottom:.02,top:1.55+.60*p,
    traversable:p>=.88};
}
export const RECOIL_PATTERNS=Object.freeze({
  primary:Object.freeze([0,.26,-.15,-.24,.36,.40,-.32,.19,-.22,.16,-.11,.15]),
  secondary:Object.freeze([0,-.44,.39,-.21,.26])
});
export function recoilFor(slot,shotIndex,ads){
  const pattern=RECOIL_PATTERNS[slot]||RECOIL_PATTERNS.primary;
  const i=Math.max(0,Math.floor(shotIndex)),p=pattern[i%pattern.length];
  // Vertical climb accumulates while the firing cycle is continuous.
  const rise=(slot==="secondary"?.022:.0135)*(ads?.80:1.0)*
    (1+Math.min(i,9)*.028);
  return {vertical:rise,horizontal:p*(slot==="secondary"?.012:.0068)*(ads?.8:1)};
}
