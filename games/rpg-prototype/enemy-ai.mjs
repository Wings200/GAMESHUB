// W04.0: deterministic, render-free test-lab enemy perception and locomotion.
// Basic patrol/spot/chase/search only. Shooting and cover tactics are later passes.
import {planNavigationRoute} from './enemy-navigation.mjs';
export const AI_TUNING=Object.freeze({
  sight:45, fieldOfViewDegrees:165,
  patrolSpeed:1.25, chaseSpeed:2.75,
  stopDistance:2.7, waypointRadius:.48,
  lastSeenSeconds:24, hitRetaliationSeconds:9, searchSeconds:21,
  hearingRange:50,noiseMemorySeconds:10,
  collisionRadius:.34, maxDelta:.05,
  area:Object.freeze({minX:33.6,maxX:58.4,minZ:34.9,maxZ:49.3}),
  // Combat search may follow a last sighting beyond Station 9; normal patrol
  // waypoints still stay inside its original arena.
  navigationArea:Object.freeze({minX:-60.5,maxX:60.5,minZ:-51.5,maxZ:51.5})
});
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const distance=(ax,az,bx,bz)=>Math.hypot(ax-bx,az-bz);
const angleDelta=(target,heading)=>Math.atan2(Math.sin(target-heading),Math.cos(target-heading));
function facePoint(enemy,point,dt){
  const desired=Math.atan2(point.x-enemy.x,point.z-enemy.z);
  // Tight circling is not a free invulnerability exploit: an alerted guard
  // turns its torso faster in arm's reach, but still has finite reaction time.
  const d=distance(enemy.x,enemy.z,point.x,point.z);
  const maxTurn=(d<5?7.0:d<12?4.7:3.1)*dt;
  enemy.yaw+=clamp(angleDelta(desired,enemy.yaw),-maxTurn,maxTurn);
}
const copy=point=>({x:point.x,z:point.z});
function insideBox(x,z,b,padding=0){
  return x>=b.minX-padding&&x<=b.maxX+padding&&
    z>=b.minZ-padding&&z<=b.maxZ+padding;
}
// Slab segment versus axis-aligned rectangle. Touching an obstacle blocks
// sight even if the target is just behind a crate's edge.
export function lineIntersectsBox(a,b,box,padding=0){
  const minX=box.minX-padding,maxX=box.maxX+padding;
  const minZ=box.minZ-padding,maxZ=box.maxZ+padding;
  let entry=0,exit=1;
  for(const [start,end,min,max] of [[a.x,b.x,minX,maxX],[a.z,b.z,minZ,maxZ]]){
    const d=end-start;
    if(Math.abs(d)<1e-9){
      if(start<min||start>max)return false;
      continue;
    }
    let lo=(min-start)/d,hi=(max-start)/d;
    if(lo>hi)[lo,hi]=[hi,lo];
    entry=Math.max(entry,lo);exit=Math.min(exit,hi);
    if(entry>exit)return false;
  }
  return exit>=0&&entry<=1;
}
// Sight rays have height: a waist-high crate is not an invisible wall above
// its top. Movement still uses the original X/Z rectangle test.
export function lineIntersectsBox3D(a,b,box,padding=0){
  if(!Number.isFinite(a.y)||!Number.isFinite(b.y))return false;
  const bottom=Number.isFinite(box.bottom)?box.bottom:0;
  const top=Number.isFinite(box.top)?box.top:
    Number.isFinite(box.height)?bottom+box.height:Infinity;
  if(!(top>bottom))return false;
  let entry=0,exit=1;
  for(const [start,end,min,max] of [
    [a.x,b.x,box.minX-padding,box.maxX+padding],
    [a.y,b.y,bottom,top],
    [a.z,b.z,box.minZ-padding,box.maxZ+padding]
  ]){
    const delta=end-start;
    if(Math.abs(delta)<1e-9){
      if(start<min||start>max)return false;
      continue;
    }
    let lo=(min-start)/delta,hi=(max-start)/delta;
    if(lo>hi)[lo,hi]=[hi,lo];
    entry=Math.max(entry,lo);exit=Math.min(exit,hi);
    if(entry>exit)return false;
  }
  return exit>=0&&entry<=1;
}
// A standing guard tries the visible torso first, then the head if only the
// top of a tall player (or power armor) clears an obstruction. Null means
// both paths are physically blocked; no target position is inferred.
export function visibleTargetHeight(enemy,player,obstacles=[]){
  const heights=[player.aimY,player.headY].filter(Number.isFinite);
  if(!heights.length)return null;
  const origin={x:enemy.x,y:Number.isFinite(enemy.eyeY)?enemy.eyeY:1.55,z:enemy.z};
  for(const height of heights){
    const target={x:player.x,y:height,z:player.z};
    if(!obstacles.some(box=>lineIntersectsBox3D(origin,target,box,.035)))
      return height;
  }
  return null;
}
export function enemyAimPitch(from,target,muzzleY=1.43){
  if(!Number.isFinite(target?.y)||!Number.isFinite(muzzleY))return 0;
  const flat=Math.max(.2,distance(from.x,from.z,target.x,target.z));
  return Math.atan2(target.y-muzzleY,flat);
}
export function hasSight(enemy,player,obstacles=[],tuning=AI_TUNING){
  const d=distance(enemy.x,enemy.z,player.x,player.z);
  if(d>tuning.sight||d<.0001)return d<.0001;
  const targetAngle=Math.atan2(player.x-enemy.x,player.z-enemy.z);
  // Nearby footsteps remain trackable once combat is underway; this does
  // not grant wall vision, and the initial patrol cone remains unchanged.
  // Once a target is confirmed, an arm's-reach pursuer cannot defeat the NPC by
  // circling behind its body. The wall ray stays mandatory.
  const engaged=enemy.mode==='chase'&&enemy.memory>0&&d<=6;
  const cone=engaged?360:tuning.fieldOfViewDegrees;
  if(Math.abs(angleDelta(targetAngle,enemy.yaw))>
    cone*Math.PI/360)return false;
  if(Number.isFinite(player.aimY)||Number.isFinite(player.headY))
    return visibleTargetHeight(enemy,player,obstacles)!==null;
  // Historical two-dimensional callers still work (patrol test scaffolding).
  const origin={x:enemy.x,z:enemy.z};
  return !obstacles.some(rect=>lineIntersectsBox(origin,player,rect,.035));
}
export function createEnemyBrain(config){
  if(!config||!Number.isFinite(config.x)||!Number.isFinite(config.z))
    throw Error('Enemy spawn must have finite world coordinates');
  const patrol=Array.isArray(config.patrol)&&config.patrol.length?
    config.patrol.map(copy):[{x:config.x,z:config.z}];
  return {
    x:config.x,z:config.z,yaw:Number.isFinite(config.yaw)?config.yaw:-Math.PI/2,
    spawn:{x:config.x,z:config.z},patrol,patrolIndex:0,
    mode:'patrol',lastSeen:null,memory:0,searchLeft:0,
    spotted:false,moving:false,actualSpeed:0,currentSpeed:0,
    patrolPause:0,active:true,retaliationTime:0,
    distanceToPlayer:Infinity,aimLockSeconds:0,
    searchIndex:0,searchPause:0,detour:null,
    noiseTarget:null,noiseTime:0,
    routeGoal:null,route:[],routeFail:0
  };
}
// Sound provides an approximate INVESTIGATION lead, never a confirmed
// player sighting or aim lock. Dense walls attenuate it.
export function hearEnemyGunshot(enemy,origin,obstacles=[],rng=Math.random){
  if(!enemy.active||!origin||
    !Number.isFinite(origin.x)||!Number.isFinite(origin.z))return false;
  const distanceToSound=distance(enemy.x,enemy.z,origin.x,origin.z);
  const blocked=obstacles.some(box=>lineIntersectsBox(enemy,origin,box,.03));
  const hearing=AI_TUNING.hearingRange*(blocked?.55:1);
  // A confirmed visual target takes priority, but a stale last sighting
  // cannot make an NPC deaf to an entirely new gunshot elsewhere.
  if(distanceToSound>hearing||enemy.spotted)return false;
  const sample=()=>{const value=rng();return clamp(Number.isFinite(value)?value:.5,0,1);};
  enemy.noiseTarget={x:origin.x+(sample()-.5)*3.2,
    z:origin.z+(sample()-.5)*3.2};
  enemy.noiseTime=AI_TUNING.noiseMemorySeconds;
  enemy.mode='investigate-noise';enemy.searchPause=0;
  enemy.routeGoal=null;enemy.route=[];enemy.routeFail=0;
  return true;
}
export function alertEnemy(enemy,player){
  if(!enemy.active)return enemy;
  enemy.lastSeen=copy(player);enemy.memory=AI_TUNING.lastSeenSeconds;
  enemy.retaliationTime=AI_TUNING.hitRetaliationSeconds;
  enemy.mode='chase';enemy.searchLeft=0;enemy.spotted=true;
  enemy.aimLockSeconds=0;
  enemy.searchIndex=0;enemy.searchPause=0;enemy.detour=null;
  enemy.noiseTarget=null;enemy.noiseTime=0;
  enemy.routeGoal=null;enemy.route=[];enemy.routeFail=0;
  return enemy;
}
export function resetEnemyBrain(enemy){
  enemy.x=enemy.spawn.x;enemy.z=enemy.spawn.z;enemy.yaw=-Math.PI/2;
  enemy.patrolIndex=0;enemy.mode='patrol';enemy.lastSeen=null;
  enemy.memory=0;enemy.searchLeft=0;enemy.spotted=false;
  enemy.moving=false;enemy.actualSpeed=0;enemy.currentSpeed=0;
  enemy.patrolPause=0;enemy.active=true;enemy.distanceToPlayer=Infinity;
  enemy.retaliationTime=0;enemy.aimLockSeconds=0;
  enemy.searchIndex=0;enemy.searchPause=0;enemy.detour=null;
  enemy.noiseTarget=null;enemy.noiseTime=0;
  enemy.routeGoal=null;enemy.route=[];enemy.routeFail=0;
  return enemy;
}
function blockedAt(x,z,obstacles,radius){
  return obstacles.some(b=>insideBox(x,z,b,radius));
}
function moveToward(enemy,goal,speed,dt,obstacles,area,tuning,faceMovement=true){
  const dx=goal.x-enemy.x,dz=goal.z-enemy.z,dist=Math.hypot(dx,dz);
  if(dist<.0001){enemy.moving=false;enemy.currentSpeed=0;return;}
  if(faceMovement)facePoint(enemy,goal,dt);
  // Smooth acceleration prevents sprint-speed starts from a dead stop.
  enemy.currentSpeed=Math.min(Math.max(.15,speed),
    (enemy.currentSpeed||0)+6.8*dt);
  const step=Math.min(dist,enemy.currentSpeed*dt);
  const sx=dx/dist*step,sz=dz/dist*step;
  const x=clamp(enemy.x+sx,area.minX,area.maxX);
  const z=clamp(enemy.z+sz,area.minZ,area.maxZ);
  let moved=false;
  if(!blockedAt(x,enemy.z,obstacles,tuning.collisionRadius)){
    moved||=Math.abs(enemy.x-x)>.0001;enemy.x=x;
  }
  if(!blockedAt(enemy.x,z,obstacles,tuning.collisionRadius)){
    moved||=Math.abs(enemy.z-z)>.0001;enemy.z=z;
  }
  enemy.moving=moved;
}
// Searchers move around the last sighting, including adjacent corners.
// Their route is calculated from known positions only: no hidden-player input.
const SEARCH_OFFSETS=Object.freeze([
  [0,0],[3.6,0],[3.2,3.2],[0,3.6],[-3.2,3.2],
  [-3.6,0],[-3.2,-3.2],[0,-3.6],[3.2,-3.2]
]);
// Only nearby collision volumes participate in graph construction; world
// perimeter scenery should not make short arena routes expensive.
function routeBlockers(start,goal,obstacles,padding=6){
  const minX=Math.min(start.x,goal.x)-padding;
  const maxX=Math.max(start.x,goal.x)+padding;
  const minZ=Math.min(start.z,goal.z)-padding;
  const maxZ=Math.max(start.z,goal.z)+padding;
  return obstacles.filter(b=>b.maxX>=minX&&b.minX<=maxX&&
    b.maxZ>=minZ&&b.minZ<=maxZ);
}
function navigateAroundCover(enemy,goal,speed,dt,obstacles,area,tuning,faceMovement=true){
  // One stable route for the active tactical goal; choosing a new corner every
  // frame made cover seekers walk into crates or repeatedly reverse direction.
  const changed=!enemy.routeGoal||
    distance(enemy.routeGoal.x,enemy.routeGoal.z,goal.x,goal.z)>.55;
  if(changed||!Array.isArray(enemy.route)){
    enemy.routeGoal=copy(goal);
    enemy.route=planNavigationRoute(enemy,goal,routeBlockers(enemy,goal,obstacles),area,tuning.collisionRadius);
    enemy.routeFail=0;
  }
  while(enemy.route.length&&
    distance(enemy.x,enemy.z,enemy.route[0].x,enemy.route[0].z)<.37)
    enemy.route.shift();
  const point=enemy.route[0]||goal;
  moveToward(enemy,point,speed,dt,obstacles,area,tuning,faceMovement);
  if(!enemy.moving&&distance(enemy.x,enemy.z,point.x,point.z)>.48){
    enemy.routeFail+=dt;
    if(enemy.routeFail>.5){
      enemy.route=planNavigationRoute(enemy,goal,routeBlockers(enemy,goal,obstacles),area,tuning.collisionRadius);
      enemy.routeFail=0;
    }
  }else enemy.routeFail=0;
}
function searchLastSeen(enemy,step,obstacles,area,tuning){
  if(!enemy.lastSeen){enemy.moving=false;return;}
  if(enemy.searchPause>0){
    enemy.searchPause=Math.max(0,enemy.searchPause-step);
    enemy.moving=false;enemy.yaw+=step*1.35;
    return;
  }
  for(let trial=0;trial<SEARCH_OFFSETS.length;trial++){
    const [dx,dz]=SEARCH_OFFSETS[enemy.searchIndex%SEARCH_OFFSETS.length];
    const goal={
      x:clamp(enemy.lastSeen.x+dx,area.minX+.4,area.maxX-.4),
      z:clamp(enemy.lastSeen.z+dz,area.minZ+.4,area.maxZ-.4)
    };
    if(blockedAt(goal.x,goal.z,obstacles,tuning.collisionRadius+.12)){
      enemy.searchIndex++;enemy.detour=null;continue;
    }
    if(distance(enemy.x,enemy.z,goal.x,goal.z)<.7){
      enemy.searchIndex++;enemy.searchPause=.65;enemy.detour=null;
      enemy.moving=false;return;
    }
    navigateAroundCover(enemy,goal,tuning.chaseSpeed*.72,step,obstacles,area,tuning);
    return;
  }
  enemy.moving=false;enemy.yaw+=step*.85;
}
export function stepEnemyBrain(enemy,player,dt,obstacles=[],options={}){
  const step=clamp(Number.isFinite(dt)?dt:0,0,AI_TUNING.maxDelta);
  const enabled=options.enabled!==false&&enemy.active&&step>0;
  if(!enabled){enemy.moving=false;enemy.actualSpeed=0;return enemy;}
  const previousX=enemy.x,previousZ=enemy.z;
  const area=options.area||AI_TUNING.area;
  enemy.retaliationTime=Math.max(0,(enemy.retaliationTime||0)-step);
  enemy.noiseTime=Math.max(0,(enemy.noiseTime||0)-step);
  if(enemy.noiseTime===0)enemy.noiseTarget=null;
  const seen=options.playerInArena!==false&&
    (typeof options.targetVisible==='boolean'?options.targetVisible:
      hasSight(enemy,player,obstacles));
  enemy.spotted=seen;
  enemy.aimLockSeconds=seen?Math.min(3,(enemy.aimLockSeconds||0)+step):0;
  // Do not even retain the exact distance of a hidden, moving player.
  enemy.distanceToPlayer=seen?distance(enemy.x,enemy.z,player.x,player.z):
    (enemy.lastSeen?distance(enemy.x,enemy.z,enemy.lastSeen.x,enemy.lastSeen.z):Infinity);
  if(seen){
    enemy.lastSeen=copy(player);enemy.memory=AI_TUNING.lastSeenSeconds;
    enemy.searchLeft=0;enemy.mode='chase';
    enemy.searchIndex=0;enemy.searchPause=0;enemy.detour=null;
    enemy.noiseTarget=null;enemy.noiseTime=0;
  }else if(enemy.noiseTime>0&&enemy.noiseTarget){
    // Investigate approximate audible evidence ahead of older visual memory.
    // No exact player coordinates are used unless the NPC actually sees them.
    enemy.mode='investigate-noise';
    enemy.memory=Math.max(0,enemy.memory-step);
  }else if(enemy.memory>0){
    enemy.memory=Math.max(0,enemy.memory-step);
    enemy.mode='investigate';
  }else if(enemy.mode==='investigate-noise'){
    enemy.mode='patrol';enemy.noiseTarget=null;enemy.routeGoal=null;enemy.route=[];
  }else if(enemy.mode==='chase'||enemy.mode==='investigate'){
    enemy.mode='search';enemy.searchLeft=AI_TUNING.searchSeconds;
  }
  // When vision is broken, turn toward the last confirmed position.
  // Memory must never grant perfect knowledge of the moving player's location.
  const knownTarget=seen?player:(enemy.lastSeen||enemy.noiseTarget||enemy.spawn);
  // Tactical holds and cover goals are ONLY valid with confirmed sight.
  // Otherwise the investigation/search path must take over locomotion.
  // A route to real cover remains valid briefly after losing sight;
  // hidden-player coordinates are never used to generate this goal.
  const committed=!seen&&options.combatCoverCommitted&&!!enemy.lastSeen;
  if(options.combatHold&&(seen||committed)){
    enemy.moving=false;enemy.currentSpeed=0;
    facePoint(enemy,knownTarget,step);
  }else if(options.combatGoal&&(seen||committed)){
    // Tactical movement is opt-in so W04.0 patrol/search behavior stays stable.
    navigateAroundCover(enemy,options.combatGoal,
      Math.max(.1,options.combatSpeed||AI_TUNING.chaseSpeed),
      step,obstacles,area,AI_TUNING,!options.combatFacePlayer);
    if(options.combatFacePlayer){
      facePoint(enemy,knownTarget,step);
    }
  }else if(enemy.mode==='chase'&&seen){
    if(enemy.distanceToPlayer>AI_TUNING.stopDistance)
      moveToward(enemy,player,AI_TUNING.chaseSpeed,step,obstacles,area,AI_TUNING);
    else{enemy.moving=false;facePoint(enemy,player,step);}
  }else if(enemy.mode==='investigate-noise'&&enemy.noiseTarget){
    const approximate=enemy.noiseTarget;
    if(distance(enemy.x,enemy.z,approximate.x,approximate.z)>.85)
      navigateAroundCover(enemy,approximate,AI_TUNING.chaseSpeed*.74,
        step,obstacles,area,AI_TUNING);
    else{
      enemy.moving=false;
      enemy.yaw+=step*.85; // scan the origin, not the hidden player's position
    }
  }else if(!seen&&enemy.lastSeen&&options.lostContactOrder?.type==='watch'){
    // One squad member can briefly guard the last observed angle, but the
    // guard expires and does not know where the hidden target moved.
    enemy.moving=false;facePoint(enemy,options.lostContactOrder.contact||enemy.lastSeen,step);
  }else if(!seen&&enemy.lastSeen&&options.lostContactOrder?.goal&&
           distance(enemy.x,enemy.z,options.lostContactOrder.goal.x,
             options.lostContactOrder.goal.z)>.65){
    // Flank or support using confirmed intel, never the hidden player's position.
    navigateAroundCover(enemy,options.lostContactOrder.goal,
      AI_TUNING.chaseSpeed*(options.lostContactOrder.type==='flank'?1.1:.72),
      step,obstacles,area,AI_TUNING);
  }else if(enemy.mode==='investigate'){
    // Reach the last known location, then systematically check nearby
    // corners. The search begins before the alert timer expires.
    if(enemy.lastSeen&&enemy.searchIndex===0&&
       distance(enemy.x,enemy.z,enemy.lastSeen.x,enemy.lastSeen.z)>.7)
      navigateAroundCover(enemy,enemy.lastSeen,AI_TUNING.chaseSpeed*.83,
        step,obstacles,area,AI_TUNING);
    else{
      if(enemy.searchIndex===0)enemy.searchIndex=1;
      searchLastSeen(enemy,step,obstacles,area,AI_TUNING);
    }
  }else if(enemy.mode==='search'){
    enemy.searchLeft=Math.max(0,enemy.searchLeft-step);
    searchLastSeen(enemy,step,obstacles,area,AI_TUNING);
    if(enemy.searchLeft<=0){
      enemy.mode='patrol';enemy.lastSeen=null;
      enemy.searchIndex=0;enemy.searchPause=0;enemy.detour=null;
  enemy.routeGoal=null;enemy.route=[];enemy.routeFail=0;
    }
  }else {
    // Pause to face the next patrol leg instead of skating through turns.
    const dest=enemy.patrol[enemy.patrolIndex];
    if(distance(enemy.x,enemy.z,dest.x,dest.z)<AI_TUNING.waypointRadius&&
       enemy.patrolPause<=0){
      enemy.patrolIndex=(enemy.patrolIndex+1)%enemy.patrol.length;
      enemy.patrolPause=.40+(enemy.patrolIndex%3)*.13;
    }
    if(enemy.patrolPause>0){
      enemy.patrolPause=Math.max(0,enemy.patrolPause-step);
      enemy.moving=false;enemy.currentSpeed=0;
      facePoint(enemy,enemy.patrol[enemy.patrolIndex],step);
    }else moveToward(enemy,enemy.patrol[enemy.patrolIndex],
      AI_TUNING.patrolSpeed,step,obstacles,area,AI_TUNING);
  }
  // Real bodies keep a personal-space radius even while pursuing one goal.
  for(const neighbor of options.neighbors||[]){
    if(!neighbor||neighbor===enemy)continue;
    const dx=enemy.x-neighbor.x,dz=enemy.z-neighbor.z;
    const d=Math.hypot(dx,dz),gap=AI_TUNING.collisionRadius*2+.10;
    if(d>=gap)continue;
    const nx=d>.00001?dx/d:1,nz=d>.00001?dz/d:0;
    const push=Math.min((gap-d)*.52,1.6*step);
    const x=clamp(enemy.x+nx*push,area.minX,area.maxX);
    const z=clamp(enemy.z+nz*push,area.minZ,area.maxZ);
    if(!blockedAt(x,z,obstacles,AI_TUNING.collisionRadius)){
      enemy.x=x;enemy.z=z;
    }
  }
  enemy.x=clamp(enemy.x,area.minX,area.maxX);
  enemy.z=clamp(enemy.z,area.minZ,area.maxZ);
  enemy.actualSpeed=Math.hypot(enemy.x-previousX,enemy.z-previousZ)/step;
  enemy.moving=enemy.actualSpeed>.018;
  return enemy;
}
