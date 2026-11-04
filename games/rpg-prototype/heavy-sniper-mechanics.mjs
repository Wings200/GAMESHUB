// W20.40: heavier rifle's deliberate five-phase bolt cycle.
// A fired casing is released when the extraction stroke reaches the port.
export const HEAVY_SNIPER_TUNING=Object.freeze({
  cycleSeconds:1.42,
  boltTravel:.325,
  muzzleRecoil:8.5
});
const smooth=x=>{
  const t=Math.max(0,Math.min(1,x));
  return t*t*(3-2*t);
};
const ramp=(p,a,b)=>smooth((p-a)/(b-a));
export function heavySniperBoltCyclePose(remaining){
  const duration=HEAVY_SNIPER_TUNING.cycleSeconds;
  const active=Number.isFinite(remaining)&&remaining>0;
  const progress=active?Math.max(0,Math.min(1,1-remaining/duration)):1;
  if(!active)return {active:false,progress:1,handleLift:0,boltOffset:0,
    ejectNow:false};
  // Recoil settles, bolt lifts, bolt travels backward, then chambers and locks.
  const handleLift=1.06*ramp(progress,.09,.25)*
    (1-ramp(progress,.79,.96));
  const boltOffset=HEAVY_SNIPER_TUNING.boltTravel*
    ramp(progress,.28,.46)*(1-ramp(progress,.63,.82));
  return {active:true,progress,handleLift,boltOffset,
    ejectNow:progress>=.47&&progress<=.68};
}
