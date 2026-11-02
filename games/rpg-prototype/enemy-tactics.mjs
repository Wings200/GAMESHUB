// W04.2 - enemy cover selection, evasive repositioning, magazine/reload and
// fallible shooting. No renderer dependency; deterministic with injected RNG.
import {AI_TUNING,lineIntersectsBox} from './enemy-ai.mjs';

export const ENEMY_PROFILES=Object.freeze({
  scout:Object.freeze({magazine:9,reserve:45,reloadSeconds:1.45,shotInterval:.85,
    accuracy:.53,falloff:.15,moveSpeed:3.25,repositionSeconds:1.7,coverSeconds:2.4,role:'flanker',reactionSeconds:.28}),
  raider:Object.freeze({magazine:12,reserve:48,reloadSeconds:1.95,shotInterval:1.05,
    accuracy:.68,falloff:.12,moveSpeed:2.5,repositionSeconds:2.2,coverSeconds:3.0,role:'skirmisher',reactionSeconds:.40}),
  enforcer:Object.freeze({magazine:18,reserve:54,reloadSeconds:2.65,shotInterval:1.20,
    accuracy:.79,falloff:.10,moveSpeed:1.85,repositionSeconds:2.9,coverSeconds:3.5,role:'anchor',reactionSeconds:.52})
});
// Actual NPC weapon loadouts. These control firing AND the held 3D gun.
export const ENEMY_WEAPONS=Object.freeze({
  'compact-smg':Object.freeze({id:'compact-smg',name:'Compact SMG',kind:'scout',
    automatic:true,magazine:24,reserve:96,reloadSeconds:1.9,
    rpm:850,shotInterval:60/850,burstSize:8,burstPause:0.22,damage:2.8,range:45,
    accuracy:.49,falloff:.16,soundKind:'smg'}),
  'scout-carbine':Object.freeze({id:'scout-carbine',name:'Scout Carbine',kind:'scout',
    automatic:true,magazine:21,reserve:84,reloadSeconds:2.2,
    rpm:640,shotInterval:60/640,burstSize:4,burstPause:0.28,damage:4.2,range:65,
    accuracy:.59,falloff:.13,soundKind:'carbine'}),
  'pipe-rifle':Object.freeze({id:'pipe-rifle',name:'Pipe Rifle',kind:'raider',
    automatic:false,magazine:12,reserve:60,reloadSeconds:2.05,
    rpm:180,shotInterval:60/180,damage:7,range:76,
    accuracy:.67,falloff:.13,soundKind:'rifle'}),
  'raider-auto':Object.freeze({id:'raider-auto',name:'Scrap Assault Rifle',kind:'raider',
    automatic:true,magazine:30,reserve:90,reloadSeconds:2.45,
    rpm:720,shotInterval:60/720,burstSize:6,burstPause:0.32,damage:3.7,range:67,
    accuracy:.57,falloff:.13,soundKind:'carbine'}),
  'heavy-rifle':Object.freeze({id:'heavy-rifle',name:'Heavy Rifle',kind:'enforcer',
    automatic:true,magazine:30,reserve:120,reloadSeconds:2.65,
    rpm:500,shotInterval:60/500,burstSize:4,burstPause:0.4,damage:5.6,range:86,
    accuracy:.73,falloff:.10,soundKind:'rifle'}),
  'heavy-lmg':Object.freeze({id:'heavy-lmg',name:'Belt-Fed Machine Gun',kind:'enforcer',
    automatic:true,magazine:48,reserve:144,reloadSeconds:4.0,
    rpm:750,shotInterval:60/750,burstSize:12,burstPause:0.46,damage:3.5,range:78,
    accuracy:.52,falloff:.16,soundKind:'rifle'})
});
const enemyLoadouts=Object.freeze({
  scout:['compact-smg','scout-carbine'],
  raider:['pipe-rifle','raider-auto'],
  enforcer:['heavy-rifle','heavy-lmg']
});
export function chooseEnemyWeapon(role,round=0){
  const pool=enemyLoadouts[role];
  if(!pool)throw Error('Unknown enemy weapon role: '+role);
  const index=Math.abs(Math.trunc(Number.isFinite(round)?round:0))%pool.length;
  return ENEMY_WEAPONS[pool[index]];
}
export function getEnemyWeapon(id){return ENEMY_WEAPONS[id]||null;}
export function enemyFireRateRpm(tactics){return weaponForTactics(tactics).rpm||Math.round(60/weaponForTactics(tactics).shotInterval);}
export function weaponForTactics(tactics){
  return getEnemyWeapon(tactics.weaponId)||ENEMY_PROFILES[tactics.kind];
}
export function equipEnemyWeapon(tactics,id){
  const spec=getEnemyWeapon(id);
  if(!spec||spec.kind!==tactics.kind)throw Error('Incompatible NPC weapon: '+id);
  tactics.weaponId=id;tactics.magazine=spec.magazine;tactics.reserve=spec.reserve;
  tactics.reloadRemaining=0;tactics.burstCount=0;tactics.cooldown=.6;
  return tactics;
}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const inside=(p,b,r)=>p.x>b.minX-r&&p.x<b.maxX+r&&p.z>b.minZ-r&&p.z<b.maxZ+r;
export function makeEnemyTactics(kind){
  const profile=ENEMY_PROFILES[kind];
  if(!profile)throw Error('Unknown enemy profile: '+kind);
  return {
    kind,weaponId:null,burstCount:0,magazine:profile.magazine,reserve:profile.reserve,
    reloadRemaining:0,cooldown:1.2,shots:0,hits:0,misses:0,
    phase:'patrol',threat:0,coverPoint:null,coverIndex:-1,
    moveTime:0,strafeSign:kind==='raider'?-1:1,
    goal:null,crouching:false,coverHold:0,
    peekPoint:null,peekSeconds:0,peekCooldown:0,holdSeconds:0,
    stuckSeconds:0,stuckEvents:0,lastPosition:null,
    avoidCoverIndex:-1,avoidCoverSeconds:0,
    pace:1,plannedGoal:null,decisionReason:'patrol'
  };
}
export function resetEnemyTactics(tactics){
  Object.assign(tactics,makeEnemyTactics(tactics.kind));
  return tactics;
}
export function beginReload(tactics){
  const spec=weaponForTactics(tactics);
  if(tactics.reloadRemaining>0||tactics.magazine>=spec.magazine||tactics.reserve<=0)
    return false;
  tactics.reloadRemaining=spec.reloadSeconds;
  tactics.burstCount=0;
  tactics.phase='reload';
  return true;
}
export function markEnemyThreat(tactics){
  tactics.threat=ENEMY_PROFILES[tactics.kind].coverSeconds;
  tactics.coverPoint=null;
  tactics.coverIndex=-1;
  tactics.peekPoint=null;tactics.peekSeconds=0;tactics.holdSeconds=0;
  tactics.moveTime=0;tactics.plannedGoal=null;
}
// A cover position is valid only if a SOLID obstacle lies BETWEEN the
// player and the planned position, not simply near either combatant.
// Shrinking the rectangle prevents glancing hits on a crate corner from
// counting as protection.
export function isBehindCover(player,point,obstacle){
  if(!obstacle||!player||!point)return false;
  const cx=(obstacle.minX+obstacle.maxX)/2;
  const cz=(obstacle.minZ+obstacle.maxZ)/2;
  const dx=cx-player.x,dz=cz-player.z;
  const px=point.x-cx,pz=point.z-cz;
  if(dx*dx+dz*dz<.3*.3)return false;
  // Position must be beyond the obstacle's centre, away from the player.
  if(px*dx+pz*dz<=0)return false;
  return lineIntersectsBox(player,point,obstacle,-.10);
}
export function pickCoverPoint(enemy,player,obstacles,area=AI_TUNING.area,
  occupied=[],avoidIndex=-1){
  const clearance=AI_TUNING.collisionRadius+.46;
  const candidates=[];
  for(let i=0;i<obstacles.length;i++){
    if(i===avoidIndex&&obstacles.length>1)continue;
    const b=obstacles[i],cx=(b.minX+b.maxX)/2,cz=(b.minZ+b.maxZ)/2;
    // Cover must be at least tall enough to shield a crouching enemy.
    if(b.height!==undefined&&b.height<1.35)continue;
    const dx=cx-player.x,dz=cz-player.z;
    if(Math.hypot(dx,dz)<.35)continue;
    // Only sample the player's OPPOSITE sides. Do not offer the faces
    // on the player's side even if a ray grazes their corners.
    const points=[
      {x:dx>=0?b.maxX+clearance:b.minX-clearance,z:cz},
      {x:cx,z:dz>=0?b.maxZ+clearance:b.minZ-clearance}
    ];
    for(const p of points){
      if(p.x<area.minX+.3||p.x>area.maxX-.3||
        p.z<area.minZ+.3||p.z>area.maxZ-.3)continue;
      if(obstacles.some(box=>inside(p,box,AI_TUNING.collisionRadius+.07)))continue;
      if(!isBehindCover(player,p,b))continue;
      const walk=distance(enemy,p);
      if(walk>16||distance(p,player)<3)continue;
      // Avoid unnecessary long runs into the open when closer real
      // cover exists. Prefer crate centre-line shielded points.
      const crowding=occupied.reduce((sum,other)=>sum+
        (distance(p,other)<2.1?14:0),0);
      candidates.push({point:p,index:i,
        score:walk+distance(p,player)*.045+crowding});
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
// A peek is genuinely outside the obstacle silhouette as seen by the player.
// Enemies must leave crouch to shoot, then withdraw behind their crate.
export function pickPeekPoint(shelter,player,obstacles,coverIndex,
  area=AI_TUNING.area){
  const b=obstacles[coverIndex];if(!b||!shelter)return null;
  const clearance=AI_TUNING.collisionRadius+.42;
  const points=[
    {x:shelter.x,z:b.minZ-clearance},
    {x:shelter.x,z:b.maxZ+clearance},
    {x:b.minX-clearance,z:shelter.z},
    {x:b.maxX+clearance,z:shelter.z}
  ];
  const valid=points.filter(p=>
    p.x>area.minX+.35&&p.x<area.maxX-.35&&
    p.z>area.minZ+.35&&p.z<area.maxZ-.35&&
    !obstacles.some(o=>inside(p,o,AI_TUNING.collisionRadius+.06))&&
    !obstacles.some(o=>lineIntersectsBox(player,p,o,.035))&&
    distance(p,shelter)>1.0&&distance(p,shelter)<4.5);
  valid.sort((a,b)=>distance(shelter,a)-distance(shelter,b));
  return valid[0]||null;
}
function trackStuck(tactics,brain,step){
  if(!tactics.lastPosition){
    tactics.lastPosition={x:brain.x,z:brain.z};return;
  }
  const moved=distance(brain,tactics.lastPosition);
  tactics.lastPosition={x:brain.x,z:brain.z};
  if(tactics.goal&&distance(brain,tactics.goal)>.95&&moved<.004)
    tactics.stuckSeconds+=step;
  else tactics.stuckSeconds=0;
  if(tactics.stuckSeconds>1.3){
    tactics.stuckEvents++;
    tactics.avoidCoverIndex=tactics.coverIndex;
    tactics.avoidCoverSeconds=2.8;
    tactics.coverPoint=null;tactics.coverIndex=-1;
    tactics.peekPoint=null;tactics.peekSeconds=0;
    tactics.moveTime=0;tactics.plannedGoal=null;tactics.stuckSeconds=0;
  }
}
export function tickEnemyTactics(tactics,brain,player,dt,obstacles=[],options={}){
  const enabled=options.enabled!==false&&brain.active;
  const step=clamp(Number.isFinite(dt)?dt:0,0,AI_TUNING.maxDelta);
  if(!enabled||step<=0)return tactics;
  const spec=ENEMY_PROFILES[tactics.kind];
  trackStuck(tactics,brain,step);
  // Preserve sub-frame time debt so fast guns really fire at their own RPM.
  tactics.cooldown=Math.max(-.05,tactics.cooldown-step);
  tactics.peekCooldown=Math.max(0,tactics.peekCooldown-step);
  tactics.avoidCoverSeconds=Math.max(0,tactics.avoidCoverSeconds-step);
  if(tactics.avoidCoverSeconds===0)tactics.avoidCoverIndex=-1;
  const memory=brain.mode==='chase'||brain.mode==='investigate'||brain.memory>0;
  if(tactics.reloadRemaining>0){
    tactics.reloadRemaining=Math.max(0,tactics.reloadRemaining-step);
    if(tactics.reloadRemaining===0){
      const amount=Math.min(spec.magazine-tactics.magazine,tactics.reserve);
      tactics.magazine+=amount;tactics.reserve-=amount;
    }
  }else if(tactics.magazine===0&&tactics.reserve>0)beginReload(tactics);
  tactics.threat=Math.max(0,tactics.threat-step);
  tactics.goal=null;tactics.pace=1;tactics.decisionReason='observe';
  if(!memory){
    tactics.phase='patrol';tactics.coverPoint=null;tactics.coverIndex=-1;
    tactics.crouching=false;tactics.holdSeconds=0;tactics.peekPoint=null;
    tactics.plannedGoal=null;tactics.decisionReason='patrol';
    return tactics;
  }
  // Breaking line of sight cancels defensive holds, peek plans and flanks.
  // Let the navigation brain physically visit the last confirmed sighting.
  if(options.targetVisible===false){
    const order=options.lostContactOrder;
    tactics.phase=order?.type==='watch'?'guard-angle':
      order?.type==='flank'?'flank-search':
      order?.type==='support'?'support-search':
      brain.mode==='search'?'search':'investigate';
    tactics.crouching=false;tactics.coverPoint=null;tactics.coverIndex=-1;
    tactics.peekPoint=null;tactics.peekSeconds=0;tactics.holdSeconds=0;
    tactics.plannedGoal=null;tactics.moveTime=0;
    tactics.pace=order?.type==='flank'?1.1:
      order?.type==='watch'?0:order?.type==='support'?.7:
      brain.mode==='search'?.75:1.1;
    tactics.decisionReason=order?.type==='watch'?'guarding last confirmed angle':
      order?.type==='flank'?'checking a side approach from last contact':
      order?.type==='support'?'covering a separate approach':
      'checking last known location; target unconfirmed';
    return tactics;
  }
  const defensive=tactics.threat>0||tactics.reloadRemaining>0||
    (brain.mode==='chase'&&options.lowHealth===true);
  tactics.crouching=false;
  if(defensive){
    const selected=tactics.coverIndex>=0?obstacles[tactics.coverIndex]:null;
    if(tactics.coverPoint&&!isBehindCover(player,tactics.coverPoint,selected)){
      tactics.coverPoint=null;tactics.coverIndex=-1;
      tactics.peekPoint=null;tactics.peekSeconds=0;
      tactics.holdSeconds=0;
    }
    if(!tactics.coverPoint){
      const cover=pickCoverPoint(brain,player,obstacles,AI_TUNING.area,
        options.occupiedCover||[],tactics.avoidCoverIndex);
      tactics.coverPoint=cover?.point||null;
      tactics.coverIndex=cover?.index??-1;
    }
    if(tactics.coverPoint){
      const d=distance(brain,tactics.coverPoint);
      const sheltered=d<=.53&&isBehindCover(player,brain,
        obstacles[tactics.coverIndex]);
      if(sheltered&&!tactics.peekPoint)tactics.holdSeconds+=step;
      // Briefly step around the crate, take a shot if sight is clear, then
      // return and crouch. Never shoot while hidden behind solid cover.
      if(sheltered&&tactics.holdSeconds>=.95&&
        tactics.peekCooldown===0&&tactics.reloadRemaining===0){
        tactics.peekPoint=pickPeekPoint(tactics.coverPoint,player,
          obstacles,tactics.coverIndex);
        if(tactics.peekPoint){
          tactics.peekSeconds=.95;
          tactics.peekCooldown=2.65;
        }else tactics.peekCooldown=1.2;
        tactics.holdSeconds=0;
      }
      if(tactics.peekPoint){
        const peekDistance=distance(brain,tactics.peekPoint);
        const clearShot=!obstacles.some(box=>
          lineIntersectsBox(brain,player,box,.035));
        if(peekDistance<.55){
          tactics.peekSeconds=Math.max(0,tactics.peekSeconds-step);
          tactics.goal=null;tactics.pace=0;
          tactics.decisionReason='peek from cover';
          tactics.phase='peek';
          if(tactics.peekSeconds===0)tactics.peekPoint=null;
        }else{
          tactics.goal=routeAroundCrates(brain,tactics.peekPoint,obstacles);
          tactics.pace=.72;tactics.decisionReason='slow corner peek';
          tactics.phase='peek-move';
        }
        if(!clearShot&&tactics.phase==='peek')tactics.peekSeconds=0;
        return tactics;
      }
      // Crouch ONLY once actual opaque cover is between enemy and threat.
      // Never duck in the open just because a bullet recently hit.
      const shielded=sheltered&&
        obstacles.some(box=>(box.height??Infinity)>=1.35&&
          isBehindCover(player,brain,box));
      tactics.crouching=shielded;
      tactics.goal=shielded?null:routeAroundCrates(brain,tactics.coverPoint,obstacles);
      tactics.pace=shielded?0:1.25;
      tactics.decisionReason=shielded?'protected and holding':
        tactics.reloadRemaining>0?'retreat while reloading':'sprinting to real cover';
      tactics.phase=shielded?'hold':tactics.reloadRemaining>0?'reload':'cover';
      return tactics;
    }
  }else{
    tactics.coverPoint=null;tactics.coverIndex=-1;tactics.peekPoint=null;
    tactics.holdSeconds=0;
  }
  if(brain.mode==='chase'){
    tactics.moveTime=Math.max(0,tactics.moveTime-step);
    const d=distance(brain,player);
    // The heavy enforcer anchors a clear long sightline and suppresses
    // from range, while scouts and raiders close the gap to maneuver.
    if(spec.role==='anchor'&&d>=16&&d<=35&&
      !obstacles.some(box=>lineIntersectsBox(brain,player,box,.035))){
      tactics.phase='suppress-long';
      tactics.goal=null;tactics.pace=0;
      tactics.decisionReason='clear distant firing angle';
      return tactics;
    }
    const dx=(brain.x-player.x)/Math.max(d,.001);
    const dz=(brain.z-player.z)/Math.max(d,.001);
    if(d<16&&d>2.4){
      const role=spec.role;
      // Re-evaluate actual free angles only when the planned move finishes
      // or its commitment expires. Avoid three identical timed side-steps.
      if(tactics.moveTime<=0||!tactics.plannedGoal||
         distance(brain,tactics.plannedGoal)<.7){
        const lateral=role==='flanker'?4.7:role==='skirmisher'?2.5:1.15;
        const approach=role==='flanker'?-1.3:role==='anchor'?-0.8:0;
        const separation=options.separation||{x:0,z:0};
        const choices=[tactics.strafeSign,-tactics.strafeSign].map(side=>{
          const goal={
            x:clamp(brain.x+dz*lateral*side+dx*approach+separation.x*1.8,
              AI_TUNING.area.minX+.4,AI_TUNING.area.maxX-.4),
            z:clamp(brain.z-dx*lateral*side+dz*approach+separation.z*1.8,
              AI_TUNING.area.minZ+.4,AI_TUNING.area.maxZ-.4)
          };
          const blocked=obstacles.some(box=>inside(goal,box,AI_TUNING.collisionRadius+.1));
          const occludedRoute=obstacles.some(box=>
            lineIntersectsBox(brain,goal,box,AI_TUNING.collisionRadius*.7));
          const crowding=(options.occupiedCover||[]).reduce((sum,p)=>
            sum+(distance(goal,p)<2?5:0),0);
          const score=(blocked?100:0)+(occludedRoute?10:0)+crowding+
            distance(brain,goal)*.06+(side===tactics.strafeSign?0:.15);
          return {goal,side,score};
        });
        choices.sort((a,b)=>a.score-b.score);
        tactics.strafeSign=choices[0].side;
        tactics.plannedGoal=choices[0].goal;
        tactics.moveTime=spec.repositionSeconds*
          (role==='flanker'?.85:role==='anchor'?1.25:1);
      }
      tactics.goal=routeAroundCrates(brain,tactics.plannedGoal,obstacles);
      tactics.pace=role==='flanker'?1.2:role==='anchor'?.65:.88;
      tactics.decisionReason=role==='flanker'?'wide flank to open angle':
        role==='anchor'?'hold firing lane while shifting':'reposition to a clear lane';
      tactics.phase=role==='flanker'?'flank':
        role==='anchor'?'suppress':'strafe';
      return tactics;
    }
  }
  tactics.phase='pursue';tactics.pace=spec.role==='flanker'?1.18:.92;
  tactics.decisionReason='investigate last known contact';
  return tactics;
}

export function attemptEnemyShot(tactics,distanceMeters,moving,rng=Math.random){
  // W09.13: read the equipped firearm, NOT the NPC's outdated generic role.
  const spec=weaponForTactics(tactics);
  if(tactics.reloadRemaining>0)return {fired:false,reason:'reloading'};
  if(tactics.magazine<=0){
    beginReload(tactics);
    return {fired:false,reason:'empty'};
  }
  if(tactics.cooldown>0)return {fired:false,reason:'cooldown'};
  tactics.magazine--;
  if(spec.automatic){
    tactics.burstCount=(tactics.burstCount||0)+1;
    if(tactics.burstCount>=spec.burstSize){
      tactics.burstCount=0;
      tactics.cooldown=Math.max(-.05,tactics.cooldown)+spec.burstPause;
    }else tactics.cooldown=Math.max(-.05,tactics.cooldown)+spec.shotInterval;
  }else tactics.cooldown=Math.max(-.05,tactics.cooldown)+spec.shotInterval;
  const d=clamp(Number.isFinite(distanceMeters)?distanceMeters:30,0,90);
  const accuracy=clamp(spec.accuracy-spec.falloff*d/16-(moving?.13:0),.08,.90);
  const sampled=rng();
  const roll=clamp(Number.isFinite(sampled)?sampled:1,0,1);
  const hit=roll<accuracy;
  tactics.shots++;
  if(hit)tactics.hits++;else tactics.misses++;
  if(tactics.magazine===0)beginReload(tactics);
  return {fired:true,hit,accuracy,ammo:tactics.magazine};
}
