/*
 * REDLINE shared upgrade catalog.
 * Imported by Cloudflare Worker (authority), game.js (physics), and
 * upgrade-shop.js (presentation). No DOM, storage or network dependency.
 */
export const UPGRADE_CATALOG=Object.freeze({
  engine:{label:"ENGINE",description:"Horsepower and acceleration",prices:[0,25,60,130]},
  turbo:{label:"TURBOCHARGER",description:"Nitro and boost power",prices:[0,40,90,185]},
  transmission:{label:"TRANSMISSION",description:"Top speed and efficiency",prices:[0,30,70,150]},
  suspension:{label:"SUSPENSION",description:"Steering and high-speed stability",prices:[0,25,60,125]},
  brakes:{label:"BRAKES",description:"Shorter stopping distances",prices:[0,20,50,110]},
  tires:{label:"TIRES",description:"Road grip and drift control",prices:[0,20,55,120]}
});
export const MAX_UPGRADE_TIER=3;
export const UPGRADE_KEYS=Object.freeze(Object.keys(UPGRADE_CATALOG));
export function stockUpgrades(){
  return Object.fromEntries(UPGRADE_KEYS.map(k=>[k,0]));
}
export function sanitizeUpgrades(input){
  const out=stockUpgrades();
  for(const key of UPGRADE_KEYS){
    const n=input?.[key];
    if(Number.isInteger(n)&&n>=0&&n<=MAX_UPGRADE_TIER)out[key]=n;
  }
  return out;
}
export function sanitizeGarage(input){
  const owned=sanitizeUpgrades(input?.owned);
  const attempted=sanitizeUpgrades(input?.equipped);
  const equipped={};
  for(const key of UPGRADE_KEYS)equipped[key]=Math.min(owned[key],attempted[key]);
  return {owned,equipped};
}
export function upgradePrice(category,tier) {
  if(!Object.hasOwn(UPGRADE_CATALOG,category) ||
     !Number.isInteger(tier)||tier<=0||tier>MAX_UPGRADE_TIER)return null;
  return UPGRADE_CATALOG[category].prices[tier];
}
export function applyCarUpgrades(baseSpec,equipped) {
  const p=sanitizeUpgrades(equipped);
  const e=p.engine,t=p.turbo,tr=p.transmission,s=p.suspension,
    b=p.brakes,ti=p.tires;
  // Stock preserves the exact original spec. No free distributable points.
  const result={...baseSpec,
    acceleration:baseSpec.acceleration*(1+.075*e),
    reverseAcceleration:baseSpec.reverseAcceleration*(1+.035*e),
    nitroSpeed:baseSpec.nitroSpeed*(1+.045*t),
    boostSpeed:baseSpec.boostSpeed*(1+.06*t),
    nitroAcceleration:22*(1+.075*t),
    topSpeed:baseSpec.topSpeed*(1+.055*tr),
    drag:baseSpec.drag*(1-.03*tr),
    steer:baseSpec.steer*(1+.055*s),
    highSpeedSteer:baseSpec.highSpeedSteer*(1+.025*s),
    braking:baseSpec.braking*(1+.11*b),
    grip:baseSpec.grip*(1+.07*ti),
    driftGrip:baseSpec.driftGrip*(1+.02*ti),
    equippedUpgrades:p
  };
  result.stats={...baseSpec.stats,
    speed:Math.min(100,baseSpec.stats.speed+tr*5+t*3),
    accel:Math.min(100,baseSpec.stats.accel+e*7),
    grip:Math.min(100,baseSpec.stats.grip+ti*6+s*3),
    drift:Math.min(100,baseSpec.stats.drift+s*4+ti*2)
  };
  return result;
}
