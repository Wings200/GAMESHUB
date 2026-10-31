// W04.0: deterministic, render-free test-lab enemy perception and locomotion.
// Basic patrol/spot/chase/search only. Shooting and cover tactics are later passes.
export const AI_TUNING=Object.freeze({
  sight:45, fieldOfViewDegrees:165,
  patrolSpeed:1.25, chaseSpeed:2.75,
  stopDistance:2.7, waypointRadius:.48,
  lastSeenSeconds:3.2, searchSeconds:3.0,
  collisionRadius:.34, maxDelta:.05,
  area:Object.freeze({minX:33.6,maxX:58.4,minZ:34.9,maxZ:49.3})
});
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const distance=(ax,az,bx,bz)=>Math.hypot(ax-bx,az-bz);
const angleDelta=(target,heading)=>Math.atan2(Math.sin(target-heading),Math.cos(target-heading));
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
    spotted:false,moving:false,active:true,
    distanceToPlayer:Infinity
  };
}
export function alertEnemy(enemy,player){
  if(!enemy.active)return enemy;
  enemy.lastSeen=copy(player);enemy.memory=AI_TUNING.lastSeenSeconds;
  enemy.mode='chase';enemy.searchLeft=0;enemy.spotted=true;
  return enemy;
}
export function resetEnemyBrain(enemy){
  enemy.x=enemy.spawn.x;enemy.z=enemy.spawn.z;enemy.yaw=-Math.PI/2;
  enemy.patrolIndex=0;enemy.mode='patrol';enemy.lastSeen=null;
  enemy.memory=0;enemy.searchLeft=0;enemy.spotted=false;
  enemy.moving=false;enemy.active=true;enemy.distanceToPlayer=Infinity;
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
export function stepEnemyBrain(enemy,player,dt,obstacles=[],options={}){
  const step=clamp(Number.isFinite(dt)?dt:0,0,AI_TUNING.maxDelta);
  const enabled=options.enabled!==false&&enemy.active&&step>0;
  if(!enabled){enemy.moving=false;return enemy;}
  const area=options.area||AI_TUNING.area;
  enemy.distanceToPlayer=distance(enemy.x,enemy.z,player.x,player.z);
  const seen=options.playerInArena!==false&&hasSight(enemy,player,obstacles);
  enemy.spotted=seen;
  if(seen){
    enemy.lastSeen=copy(player);enemy.memory=AI_TUNING.lastSeenSeconds;
    enemy.searchLeft=0;enemy.mode='chase';
  }else if(enemy.memory>0){
    enemy.memory=Math.max(0,enemy.memory-step);
    enemy.mode='investigate';
  }else if(enemy.mode==='chase'||enemy.mode==='investigate'){
    enemy.mode='search';enemy.searchLeft=AI_TUNING.searchSeconds;
  }
  if(options.combatHold&&(seen||enemy.memory>0)){
    enemy.moving=false;
    enemy.yaw=Math.atan2(player.x-enemy.x,player.z-enemy.z);
  }else if(options.combatGoal&&(seen||enemy.memory>0)){
    // Tactical movement is opt-in so W04.0 patrol/search behavior stays stable.
    moveToward(enemy,options.combatGoal,
      Math.max(.1,options.combatSpeed||AI_TUNING.chaseSpeed),
      step,obstacles,area,AI_TUNING);
    if(options.combatFacePlayer){
      enemy.yaw=Math.atan2(player.x-enemy.x,player.z-enemy.z);
    }
  }else if(enemy.mode==='chase'&&seen){
    if(enemy.distanceToPlayer>AI_TUNING.stopDistance)
      moveToward(enemy,player,AI_TUNING.chaseSpeed,step,obstacles,area,AI_TUNING);
    else{enemy.moving=false;enemy.yaw=Math.atan2(player.x-enemy.x,player.z-enemy.z);}
  }else if(enemy.mode==='investigate'){
    if(enemy.lastSeen&&distance(enemy.x,enemy.z,enemy.lastSeen.x,enemy.lastSeen.z)>.7)
      moveToward(enemy,enemy.lastSeen,AI_TUNING.chaseSpeed*.83,step,obstacles,area,AI_TUNING);
    else enemy.moving=false;
  }else if(enemy.mode==='search'){
    enemy.searchLeft=Math.max(0,enemy.searchLeft-step);
    enemy.moving=false;
    enemy.yaw+=step*.85;
    if(enemy.searchLeft<=0){enemy.mode='patrol';enemy.lastSeen=null;}
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
