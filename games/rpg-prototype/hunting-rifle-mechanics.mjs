// W20.30: precise bolt handle lift, pull, eject, push and lock sequence.
export const HUNTING_RIFLE_TUNING=Object.freeze({
  capacity:5,cycleSeconds:.88,reloadBaseSeconds:1.03,
  reloadPerRoundSeconds:.48,boltPullDistance:.258,handleLiftRadians:1.08
});
const clamp01=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{const t=clamp01(x);return t*t*(3-2*t);};
export function huntingBoltCyclePose(remaining,duration=HUNTING_RIFLE_TUNING.cycleSeconds){
  if(!(remaining>0))return {active:false,progress:1,handleLift:0,
    boltOffset:0,ejectNow:false};
  const p=clamp01(1-remaining/Math.max(.001,duration));
  const rise=smooth((p-.08)/.18);
  const lower=smooth((p-.78)/.16);
  const retract=smooth((p-.25)/.24);
  const seat=smooth((p-.60)/.20);
  return {active:true,progress:p,
    handleLift:HUNTING_RIFLE_TUNING.handleLiftRadians*rise*(1-lower),
    boltOffset:HUNTING_RIFLE_TUNING.boltPullDistance*Math.max(0,retract-seat),
    ejectNow:p>=.48};
}
export function huntingRifleReloadSeconds(rounds){
  const count=Math.max(1,Math.min(5,Math.floor(Number.isFinite(rounds)?rounds:1)));
  return HUNTING_RIFLE_TUNING.reloadBaseSeconds+
    count*HUNTING_RIFLE_TUNING.reloadPerRoundSeconds;
}
