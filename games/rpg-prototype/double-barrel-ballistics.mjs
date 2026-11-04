// W20.28: double-barrel shotgun damage falls off with distance.
// Each pellet still uses the game's existing first-solid-hit raycast.
// Short-range reward without full-damage hits across the entire arena.
export const DOUBLE_BARREL_TUNING=Object.freeze({
  barrels:2,pellets:8,fullDamageMeters:5,
  taperEndMeters:24,minFactor:.20,
  oneShellReloadSeconds:1.95,twoShellReloadSeconds:2.65
});
export function doubleBarrelDamageFactor(distance){
  const d=Math.max(0,Number.isFinite(distance)?distance:0);
  const {fullDamageMeters,taperEndMeters,minFactor}=DOUBLE_BARREL_TUNING;
  if(d<=fullDamageMeters)return 1;
  if(d>=taperEndMeters)return minFactor;
  const t=(d-fullDamageMeters)/(taperEndMeters-fullDamageMeters);
  return 1-(1-minFactor)*t*t*(3-2*t);
}
export function doubleBarrelPelletDamage(base,distance){
  return Math.max(1,Math.round(Math.max(0,base)*doubleBarrelDamageFactor(distance)));
}
