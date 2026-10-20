// BLACKOUT V0.6 — bridge the original BLACKOUT V8 shooting rules to the clean range.
// Keeps old 710-RPM cycle / deterministic recoil / 30+1 mechanics while ADS remains
// zeroed through the new real holographic sight at full alignment.
export function legacyShotCone(shot,{aligned=false,prone=false,crouched=false,moving=false}={},random=Math.random){
  const stance=prone?.55:crouched?.78:1;
  const motion=moving?1.35:1;
  const spread=aligned?0:shot.spread*stance*motion;
  if(spread===0)return {x:0,y:0,spread:0};
  const angle=random()*Math.PI*2;
  const radius=Math.sqrt(random())*spread;
  return {x:Math.cos(angle)*radius,y:Math.sin(angle)*radius,spread};
}
export function cycleLegacyFire(weapons,now,{held,adsAligned,canFire=true,maxCatchup=3}={},onShot=()=>{}){
 if(!held||!canFire)return 0;
 const gun=weapons.current;
 let fired=0;
 while(fired<maxCatchup && gun.ammo>0 && !gun.reloadingUntil && now+.001>=gun.nextShotAt){
  const shot=weapons.tryFire(now,adsAligned,canFire);
  if(!shot.ok)break;
  onShot(shot);
  fired++;
 }
 return fired;
}
