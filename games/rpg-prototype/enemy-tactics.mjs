// W04.2 - enemy cover selection, evasive repositioning, magazine/reload and
// fallible shooting. No renderer dependency; deterministic with injected RNG.
import {AI_TUNING,lineIntersectsBox} from './enemy-ai.mjs';

export const ENEMY_PROFILES=Object.freeze({
  scout:Object.freeze({magazine:9,reserve:45,reloadSeconds:1.45,shotInterval:.85,
    accuracy:.48,falloff:.20,moveSpeed:3.25,repositionSeconds:1.7,coverSeconds:2.4}),
  raider:Object.freeze({magazine:12,reserve:48,reloadSeconds:1.95,shotInterval:1.05,
    accuracy:.63,falloff:.16,moveSpeed:2.5,repositionSeconds:2.2,coverSeconds:3.0}),
  enforcer:Object.freeze({magazine:18,reserve:54,reloadSeconds:2.65,shotInterval:1.20,
    accuracy:.76,falloff:.12,moveSpeed:1.85,repositionSeconds:2.9,coverSeconds:3.5})
});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const inside=(p,b,r)=>p.x>b.minX-r&&p.x<b.maxX+r&&p.z>b.minZ-r&&p.z<b.maxZ+r;
export function makeEnemyTactics(kind){
  const profile=ENEMY_PROFILES[kind];
  if(!profile)throw Error('Unknown enemy profile: '+kind);
  return {
    kind,magazine:profile.magazine,reserve:profile.reserve,
    reloadRemaining:0,cooldown:1.2,shots:0,hits:0,misses:0,
    phase:'patrol',threat:0,coverPoint:null,coverIndex:-1,
    moveTime:0,strafeSign:kind==='raider'?-1:1,
    goal:null
  };
}
export function resetEnemyTactics(tactics){
  Object.assign(tactics,makeEnemyTactics(tactics.kind));
  return tactics;
}
export function beginReload(tactics){
  const spec=ENEMY_PROFILES[tactics.kind];
  if(tactics.reloadRemaining>0||tactics.magazine>=spec.magazine||tactics.reserve<=0)
    return false;
  tactics.reloadRemaining=spec.reloadSeconds;
  tactics.phase='reload';
  return true;
}
export function markEnemyThreat(tactics){
  tactics.threat=ENEMY_PROFILES[tactics.kind].coverSeconds;
  tactics.coverPoint=null;
  tactics.moveTime=0;
}
export function pickCoverPoint(enemy,player,obstacles,area=AI_TUNING.area){
  // Sample the four far faces of each obstacle. A candidate only counts as
  // cover if the obstacle blocks the segment from the player to that position.
  // Reject points within any crate or outside the arena.
  const clearance=AI_TUNING.collisionRadius+.55;
  const candidates=[];
  for(let i=0;i<obstacles.length;i++){
    const b=obstacles[i],cx=(b.minX+b.maxX)/2,cz=(b.minZ+b.maxZ)/2;
    const points=[
      {x:b.minX-clearance,z:cz},
      {x:b.maxX+clearance,z:cz},
      {x:cx,z:b.minZ-clearance},
      {x:cx,z:b.maxZ+clearance}
    ];
    for(const p of points){
      if(p.x<area.minX+.3||p.x>area.maxX-.3||
        p.z<area.minZ+.3||p.z>area.maxZ-.3)continue;
      if(obstacles.some(box=>inside(p,box,AI_TUNING.collisionRadius+.07)))continue;
      if(!lineIntersectsBox(player,p,b,.015))continue;
      const walk=distance(enemy,p),enemyPlayer=distance(enemy,player);
      if(walk>15||distance(p,player)<3||enemyPlayer<.5)continue;
      candidates.push({point:p,index:i,score:walk+distance(p,player)*.045});
    }
  }
  candidates.sort((a,b)=>a.score-b.score);
  return candidates[0]||null;
}
// Deterministic, small-scale detour for rectangular crates. Walk to a corner
// first when a straight segment crosses an obstacle.
export function routeAroundCrates(from,goal,obstacles){
  if(!goal)return null;
  const radius=AI_TUNING.collisionRadius+.18;
  const obstruction=obstacles.find(box=>lineIntersectsBox(from,goal,box,radius));
  if(!obstruction)return goal;
  const b=obstruction;
  const corners=[
    {x:b.minX-radius,z:b.minZ-radius},
    {x:b.minX-radius,z:b.maxZ+radius},
    {x:b.maxX+radius,z:b.minZ-radius},
    {x:b.maxX+radius,z:b.maxZ+radius}
  ];
  const candidates=corners.filter(c=>
    !obstacles.some(box=>inside(c,box,AI_TUNING.collisionRadius))&&
    !obstacles.some(box=>lineIntersectsBox(from,c,box,AI_TUNING.collisionRadius*.8))
  );
  if(!candidates.length)return goal; // collision system remains authoritative
  candidates.sort((a,b)=>distance(from,a)+distance(a,goal)-
    (distance(from,b)+distance(b,goal)));
  return candidates[0];
}
export function tickEnemyTactics(tactics,brain,player,dt,obstacles=[],options={}){
  const enabled=options.enabled!==false&&brain.active;
  const step=clamp(Number.isFinite(dt)?dt:0,0,AI_TUNING.maxDelta);
  if(!enabled||step<=0)return tactics;
  const spec=ENEMY_PROFILES[tactics.kind];
  tactics.cooldown=Math.max(0,tactics.cooldown-step);
  const memory=brain.mode==='chase'||brain.mode==='investigate'||brain.memory>0;
  if(tactics.reloadRemaining>0){
    tactics.reloadRemaining=Math.max(0,tactics.reloadRemaining-step);
    if(tactics.reloadRemaining===0){
      const amount=Math.min(spec.magazine-tactics.magazine,tactics.reserve);
      tactics.magazine+=amount;tactics.reserve-=amount;
    }
  }else if(tactics.magazine===0&&tactics.reserve>0)beginReload(tactics);
  tactics.threat=Math.max(0,tactics.threat-step);
  tactics.goal=null;
  if(!memory){tactics.phase='patrol';tactics.coverPoint=null;return tactics;}
  const defensive=tactics.threat>0||tactics.reloadRemaining>0||
    (brain.mode==='chase'&&options.lowHealth===true);
  if(defensive){
    if(!tactics.coverPoint){
      const cover=pickCoverPoint(brain,player,obstacles);
      tactics.coverPoint=cover?.point||null;
      tactics.coverIndex=cover?.index??-1;
    }
    if(tactics.coverPoint){
      const d=distance(brain,tactics.coverPoint);
      tactics.goal=d>.72?routeAroundCrates(brain,tactics.coverPoint,obstacles):null;
      tactics.phase=d>.72?(tactics.reloadRemaining>0?'reload':'cover'):'hold';
      return tactics;
    }
  }else tactics.coverPoint=null;
  // When a shot is available, strafe in alternating directions rather than
  // running directly at the player. This remains collision bounded.
  if(brain.mode==='chase'){
    tactics.moveTime-=step;
    if(tactics.moveTime<=0){
      tactics.strafeSign*=-1;
      tactics.moveTime=spec.repositionSeconds;
    }
    const d=distance(brain,player);
    const dx=(brain.x-player.x)/Math.max(d,.001);
    const dz=(brain.z-player.z)/Math.max(d,.001);
    if(d<15&&d>2.4){
      const offset=2.7*tactics.strafeSign;
      const desired={x:brain.x+dz*offset,z:brain.z-dx*offset};
      desired.x=clamp(desired.x,AI_TUNING.area.minX+.4,AI_TUNING.area.maxX-.4);
      desired.z=clamp(desired.z,AI_TUNING.area.minZ+.4,AI_TUNING.area.maxZ-.4);
      tactics.goal=routeAroundCrates(brain,desired,obstacles);
      tactics.phase='strafe';
      return tactics;
    }
  }
  tactics.phase='pursue';
  return tactics;
}
export function attemptEnemyShot(tactics,distanceMeters,moving,rng=Math.random){
  const spec=ENEMY_PROFILES[tactics.kind];
  if(tactics.reloadRemaining>0)return {fired:false,reason:'reloading'};
  if(tactics.magazine<=0){
    beginReload(tactics);
    return {fired:false,reason:'empty'};
  }
  if(tactics.cooldown>0)return {fired:false,reason:'cooldown'};
  tactics.magazine--;
  tactics.cooldown=spec.shotInterval;
  const d=clamp(Number.isFinite(distanceMeters)?distanceMeters:30,0,40);
  const accuracy=clamp(spec.accuracy-spec.falloff*d/16-(moving?.13:0),.08,.90);
  const sampled=rng();
  const roll=clamp(Number.isFinite(sampled)?sampled:1,0,1);
  const hit=roll<accuracy;
  tactics.shots++;
  if(hit)tactics.hits++;else tactics.misses++;
  if(tactics.magazine===0)beginReload(tactics);
  return {fired:true,hit,accuracy,ammo:tactics.magazine};
}
