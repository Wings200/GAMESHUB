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
// Tier bonuses are deliberately non-linear: first purchase is noticeable,
// later tiers have diminishing gains, preventing stacked upgrades from
// overwhelming stock cars. Values are consistent on every map and car.
export const UPGRADE_TUNING=Object.freeze({
  engine:      Object.freeze([0,.11,.20,.27]),
  turbo:       Object.freeze([0,.12,.21,.28]),
  transmission:Object.freeze([0,.07,.13,.18]),
  suspension:  Object.freeze([0,.09,.16,.22]),
  brakes:      Object.freeze([0,.12,.21,.29]),
  tires:       Object.freeze([0,.10,.18,.24])
});
export const UPGRADE_METRICS=Object.freeze({
  engine:[{key:"acceleration",label:"Acceleration",unit:"power"},
          {key:"reverseAcceleration",label:"Reverse power",unit:"power"}],
  turbo:[{key:"nitroAcceleration",label:"Nitro thrust",unit:"power"},
         {key:"nitroSpeed",label:"Nitro speed cap",unit:"mph"}],
  transmission:[{key:"topSpeed",label:"Top speed cap",unit:"mph"},
                {key:"drag",label:"Aerodynamic drag",unit:"drag",inverted:true}],
  suspension:[{key:"steer",label:"Turning response",unit:"handling"},
              {key:"highSpeedSteer",label:"High-speed control",unit:"handling"}],
  brakes:[{key:"braking",label:"Braking force",unit:"power"},
          {key:"reverseAcceleration",label:"Reverse control",unit:"power"}],
  tires:[{key:"grip",label:"Cornering grip",unit:"handling"},
         {key:"driftGrip",label:"Drift stability",unit:"handling"}]
});
export function applyCarUpgrades(baseSpec,equipped) {
  const p=sanitizeUpgrades(equipped);
  const bonus=key=>UPGRADE_TUNING[key][p[key]];
  const engine=bonus("engine");
  const turbo=bonus("turbo");
  const transmission=bonus("transmission");
  const suspension=bonus("suspension");
  const brakes=bonus("brakes");
  const tires=bonus("tires");
  // Stock retains original game values and dynamics; percentages are
  // relative to the selected CAR, so fast cars still differ from agile ones.
  const spec={...baseSpec,
    acceleration:baseSpec.acceleration*(1+engine),
    reverseAcceleration:baseSpec.reverseAcceleration*(1+engine*.40+brakes*.12),
    nitroSpeed:baseSpec.nitroSpeed*(1+turbo*.82),
    boostSpeed:baseSpec.boostSpeed*(1+turbo),
    nitroAcceleration:22*(1+turbo*1.18),
    topSpeed:baseSpec.topSpeed*(1+transmission),
    drag:baseSpec.drag*(1-transmission*.34),
    // Avoid the existing fixed high-speed road-drag threshold cancelling
    // transmission upgrades. Tier zero remains EXACTLY the old 42 threshold.
    softLimiterStart:42*(1+transmission),
    steer:baseSpec.steer*(1+suspension),
    highSpeedSteer:baseSpec.highSpeedSteer*(1+suspension*.72),
    braking:baseSpec.braking*(1+brakes),
    grip:baseSpec.grip*(1+tires),
    // Lower lateral drift damping gives smoother controllable slides;
    // this is subtle to avoid making high-tier tires feel like ice.
    driftGrip:baseSpec.driftGrip*(1+tires*.23),
    equippedUpgrades:p
  };
  // Keep existing HUD bars within 0-100 and meaningful for each car.
  spec.stats={...baseSpec.stats,
    speed:Math.min(100,Math.round(baseSpec.stats.speed+transmission*65+turbo*18)),
    accel:Math.min(100,Math.round(baseSpec.stats.accel+engine*66)),
    grip:Math.min(100,Math.round(baseSpec.stats.grip+tires*54+suspension*22)),
    drift:Math.min(100,Math.round(baseSpec.stats.drift+suspension*35+tires*18))
  };
  return spec;
}
// Server, HUD, and browser preview all read these same underlying values.
export function upgradeComparison(baseSpec,equipped,category,targetTier) {
  if(!Object.hasOwn(UPGRADE_METRICS,category) ||
     !Number.isInteger(targetTier)||targetTier<0||targetTier>MAX_UPGRADE_TIER)
    return null;
  const current=applyCarUpgrades(baseSpec,equipped);
  const selection=sanitizeUpgrades(equipped);
  selection[category]=targetTier;
  const target=applyCarUpgrades(baseSpec,selection);
  const stock=applyCarUpgrades(baseSpec,stockUpgrades());
  return {
    currentTier:sanitizeUpgrades(equipped)[category],
    targetTier,
    metrics:UPGRADE_METRICS[category].map(metric=>{
      const initial=stock[metric.key],a=current[metric.key],b=target[metric.key];
      const percent=initial>0
        ?100*((metric.inverted?initial/b:b/initial)-1)
        :0;
      const deltaPct=a>0?100*((metric.inverted?a/b:b/a)-1):0;
      return {...metric,initial,current:a,target:b,
        improvementPercent:percent,changePercent:deltaPct};
    })
  };
}
