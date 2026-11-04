// W20.29: single-slide pump cycle and tube-fed shell economy.
export const PUMP_ACTION_TUNING=Object.freeze({
  capacity:6,pellets:8,pelletDamage:9,
  cycleSeconds:.60,fullDamageMeters:7,taperEndMeters:30,
  minDamageFactor:.18,reloadBaseSeconds:.94,perShellSeconds:.55
});
const clamp01=n=>Math.max(0,Math.min(1,n));
const smooth=n=>{const p=clamp01(n);return p*p*(3-2*p);};
export function pumpCyclePose(remaining,duration=PUMP_ACTION_TUNING.cycleSeconds){
  const d=Math.max(.001,duration);
  if(!(remaining>0))return {active:false,progress:1,forendOffset:0,
    boltOffset:0,ejectNow:false};
  const p=clamp01(1-remaining/d);
  const back=smooth((p-.13)/.29);
  const forward=smooth((p-.51)/.31);
  const stroke=Math.max(0,back-forward);
  return {active:true,progress:p,forendOffset:stroke*.245,
    boltOffset:stroke*.151,ejectNow:p>=.40};
}
export function pumpReloadSeconds(rounds){
  const n=Math.max(1,Math.min(PUMP_ACTION_TUNING.capacity,
    Math.floor(Number.isFinite(rounds)?rounds:1)));
  return PUMP_ACTION_TUNING.reloadBaseSeconds+
    PUMP_ACTION_TUNING.perShellSeconds*n;
}
export function pumpPelletDamage(base,distance){
  const d=Math.max(0,Number.isFinite(distance)?distance:0);
  const {fullDamageMeters,taperEndMeters,minDamageFactor}=PUMP_ACTION_TUNING;
  if(d<=fullDamageMeters)return Math.max(1,Math.round(base));
  if(d>=taperEndMeters)return Math.max(1,Math.round(base*minDamageFactor));
  const p=(d-fullDamageMeters)/(taperEndMeters-fullDamageMeters);
  const factor=1-(1-minDamageFactor)*smooth(p);
  return Math.max(1,Math.round(Math.max(0,base)*factor));
}
