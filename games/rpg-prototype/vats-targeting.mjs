// W20.90: Tactical body-part targeting uses real AP, visibility, weapon range,
// player perception and limb injury; all calculations are renderer-independent.
export const VATS_ZONES=Object.freeze([
  'head','chest','leftArm','rightArm','leftLeg','rightLeg'
]);
export const VATS_ZONE_LABELS=Object.freeze({
  head:'HEAD',chest:'TORSO',leftArm:'L ARM',rightArm:'R ARM',
  leftLeg:'L LEG',rightLeg:'R LEG'
});
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function vatsApCost(weapon){
  if(!weapon||!Number.isFinite(weapon.fireInterval))return 100;
  const kind=String(weapon.kind||'').toLowerCase();
  const base=kind==='shotgun'?30:kind==='rifle'?28:kind==='sniper'?38:20;
  return clamp(Math.round(base+weapon.fireInterval*8),18,55);
}

export function vatsChance({distance,zone,visible=true,perception=5,
  accuracyPenalty=1,weaponRange=48}={}){
  if(!visible||!VATS_ZONES.includes(zone)||!Number.isFinite(distance)||
    distance<0||distance>weaponRange)return 0;
  const zonePenalty={head:25,chest:0,leftArm:13,rightArm:13,
    leftLeg:15,rightLeg:15}[zone];
  const senseBonus=(clamp(perception,1,10)-5)*2.6;
  const woundPenalty=(Math.max(1,accuracyPenalty)-1)*16;
  const distancePenalty=Math.max(0,distance-3)*1.45;
  return Math.round(clamp(92-zonePenalty+senseBonus-
    woundPenalty-distancePenalty,5,95));
}

export function vatsApAvailable(stamina,maxStamina){
  if(!Number.isFinite(stamina)||!Number.isFinite(maxStamina)||maxStamina<=0)return 0;
  return Math.floor(clamp(stamina/maxStamina,0,1)*100+1e-8);
}

export function vatsSpendAp(player,cost,maxStamina){
  if(!player||!Number.isFinite(cost)||cost<=0||
    vatsApAvailable(player.stamina,maxStamina)<cost)return false;
  player.stamina=clamp(player.stamina-cost/100*maxStamina,0,maxStamina);
  player.staminaCooldown=Math.max(player.staminaCooldown||0,.55);
  return true;
}

export function vatsCriticalGain(charge,amount=15){
  return clamp((Number.isFinite(charge)?charge:0)+Math.max(0,amount),0,100);
}
export function vatsCriticalReady(charge){return charge>=100;}

/** Remaining whole shots that can be reserved by a live AP/ammo queue. */
export function vatsQueueSlots({ap,cost,queuedCost=0,queuedShots=0,
  ammo=0,infiniteAmmo=false}={}){
  if(!Number.isFinite(ap)||!Number.isFinite(cost)||cost<=0||
    !Number.isFinite(queuedCost)||queuedCost<0||
    !Number.isFinite(queuedShots)||queuedShots<0)return 0;
  const apSlots=Math.max(0,Math.floor((ap-queuedCost+1e-8)/cost));
  if(infiniteAmmo)return apSlots;
  if(!Number.isFinite(ammo)||ammo<0)return 0;
  return Math.max(0,Math.min(apSlots,Math.floor(ammo-queuedShots)));
}
