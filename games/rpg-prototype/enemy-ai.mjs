// W04.0: deterministic, render-free test-lab enemy perception and locomotion.
// Basic patrol/spot/chase/search only. Shooting and cover tactics are later passes.
export const AI_TUNING=Object.freeze({
  sight:45, fieldOfViewDegrees:165,
  patrolSpeed:1.25, chaseSpeed:2.75,
  stopDistance:2.7, waypointRadius:.48,
  lastSeenSeconds:24, hitRetaliationSeconds:9, searchSeconds:21,
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
  // Tracking takes time. A bot cannot instantly spin to a newly exposed player.
  const maxTurn=3.1*dt;
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
export function hasSight(enemy,player,obstacles=[],tuning=AI_TUNING){
  const d=distance(enemy.x,enemy.z,player.x,player.z);
  if(d>tuning.sight||d<.0001)return d<.0001;
  const targetAngle=Math.atan2(player.x-enemy.x,player.z-enemy.z);
  if(Math.abs(angleDelta(targetAngle,enemy.yaw))>
    tuning.fieldOfViewDegrees*Math.PI/360)return false;
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
    spotted:false,moving:false,active:true,retaliationTime:0,
    distanceToPlayer:Infinity,aimLockSeconds:0,
    searchIndex:0,searchPause:0,detour:null
  };
}
export function alertEnemy(enemy,player){
  if(!enemy.active)return enemy;
  enemy.lastSeen=copy(player);enemy.memory=AI_TUNING.lastSeenSeconds;
  enemy.retaliationTime=AI_TUNING.hitRetaliationSeconds;
  enemy.mode='chase';enemy.searchLeft=0;enemy.spotted=true;
  enemy.aimLockSeconds=0;
  enemy.searchIndex=0;enemy.searchPause=0;enemy.detour=null;
  return enemy;
}
export function resetEnemyBrain(enemy){
  enemy.x=enemy.spawn.x;enemy.z=enemy.spawn.z;enemy.yaw=-Math.PI/2;
  enemy.patrolIndex=0;enemy.mode='patrol';enemy.lastSeen=null;
  enemy.memory=0;enemy.searchLeft=0;enemy.spotted=false;
  enemy.moving=false;enemy.active=true;enemy.distanceToPlayer=Infinity;
  enemy.retaliationTime=0;enemy.aimLockSeconds=0;
  enemy.searchIndex=0;enemy.searchPause=0;enemy.detour=null;
  return enemy;
}
function blockedAt(x,z,obstacles,radius){
  return obstacles.some(b=>insideBox(x,z,b,radius));
}
function moveToward(enemy,goal,speed,dt,obstacles,area,tuning){
  const dx=goal.x-enemy.x,dz=goal.z-enemy.z,dist=Math.hypot(dx,dz);
  if(dist<.0001){enemy.moving=false;return;}
  enemy.yaw=Math.atan2(dx,dz);
  const step=Math.min(dist,speed*dt);
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
function navigateAroundCover(enemy,goal,speed,dt,obstacles,area,tuning){
  let waypoint=null;
  if(enemy.detour&&distance(enemy.x,enemy.z,enemy.detour.x,enemy.detour.z)>.55)
    waypoint=enemy.detour;
  else enemy.detour=null;
  if(!waypoint){
    const clearance=tuning.collisionRadius+.28;
    const blocked=obstacles.find(box=>
      lineIntersectsBox(enemy,goal,box,tuning.collisionRadius*.65));
    if(blocked){
      const corners=[
        {x:blocked.minX-clearance,z:blocked.minZ-clearance},
        {x:blocked.minX-clearance,z:blocked.maxZ+clearance},
        {x:blocked.maxX+clearance,z:blocked.minZ-clearance},
        {x:blocked.maxX+clearance,z:blocked.maxZ+clearance}
      ].filter(p=>
        p.x>=area.minX+.2&&p.x<=area.maxX-.2&&
        p.z>=area.minZ+.2&&p.z<=area.maxZ-.2&&
        !blockedAt(p.x,p.z,obstacles,tuning.collisionRadius+.04)&&
        !obstacles.some(box=>lineIntersectsBox(enemy,p,box,tuning.collisionRadius*.6)));
      corners.sort((a,b)=>
        distance(enemy.x,enemy.z,a.x,a.z)+distance(a.x,a.z,goal.x,goal.z)-
        distance(enemy.x,enemy.z,b.x,b.z)-distance(b.x,b.z,goal.x,goal.z));
      if(corners.length)enemy.detour=waypoint=corners[0];
    }
  }
  moveToward(enemy,waypoint||goal,speed,dt,obstacles,area,tuning);
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
  if(!enabled){enemy.moving=false;return enemy;}
  const area=options.area||AI_TUNING.area;
  enemy.retaliationTime=Math.max(0,(enemy.retaliationTime||0)-step);
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
  }else if(enemy.memory>0){
    enemy.memory=Math.max(0,enemy.memory-step);
    enemy.mode='investigate';
  }else if(enemy.mode==='chase'||enemy.mode==='investigate'){
    enemy.mode='search';enemy.searchLeft=AI_TUNING.searchSeconds;
  }
  // When vision is broken, turn toward the last confirmed position.
  // Memory must never grant perfect knowledge of the moving player's location.
  const knownTarget=seen?player:(enemy.lastSeen||enemy.spawn);
  // Tactical holds and cover goals are ONLY valid with confirmed sight.
  // Otherwise the investigation/search path must take over locomotion.
  if(options.combatHold&&seen){
    enemy.moving=false;
    facePoint(enemy,knownTarget,step);
  }else if(options.combatGoal&&seen){
    // Tactical movement is opt-in so W04.0 patrol/search behavior stays stable.
    moveToward(enemy,options.combatGoal,
      Math.max(.1,options.combatSpeed||AI_TUNING.chaseSpeed),
      step,obstacles,area,AI_TUNING);
    if(options.combatFacePlayer){
      facePoint(enemy,knownTarget,step);
    }
  }else if(enemy.mode==='chase'&&seen){
    if(enemy.distanceToPlayer>AI_TUNING.stopDistance)
      moveToward(enemy,player,AI_TUNING.chaseSpeed,step,obstacles,area,AI_TUNING);
    else{enemy.moving=false;facePoint(enemy,player,step);}
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
    }
  }else {
    const dest=enemy.patrol[enemy.patrolIndex];
    if(distance(enemy.x,enemy.z,dest.x,dest.z)<AI_TUNING.waypointRadius)
      enemy.patrolIndex=(enemy.patrolIndex+1)%enemy.patrol.length;
    moveToward(enemy,enemy.patrol[enemy.patrolIndex],
      AI_TUNING.patrolSpeed,step,obstacles,area,AI_TUNING);
  }
  enemy.x=clamp(enemy.x,area.minX,area.maxX);
  enemy.z=clamp(enemy.z,area.minZ,area.maxZ);
  return enemy;
}
