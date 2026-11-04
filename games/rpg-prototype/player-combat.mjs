// W04.1 first player health and basic enemy attacks; no player armor yet.
// Standalone math enables deterministic testing apart from Three.js.
import { AI_TUNING, hasSight } from './enemy-ai.mjs';

export const PLAYER_MAX_HEALTH=100;
export const ENEMY_ATTACK=Object.freeze({
  scout:Object.freeze({damage:5,interval:2.5,range:70}),
  raider:Object.freeze({damage:7,interval:2.7,range:80}),
  enforcer:Object.freeze({damage:9,interval:3.1,range:90})
});
export function createPlayerHealth(maxHealth=PLAYER_MAX_HEALTH){
  const max=Number.isFinite(maxHealth)&&maxHealth>0?maxHealth:PLAYER_MAX_HEALTH;
  return {health:max,maxHealth:max,alive:true,hits:0};
}
export function hitPlayer(state,damage){
  if(!state.alive)return {applied:false,damage:0,health:state.health,killed:false};
  const amount=Math.max(0,Number.isFinite(damage)?damage:0);
  const dealt=Math.min(state.health,amount);
  state.health=Math.max(0,state.health-dealt);
  state.alive=state.health>0;
  if(dealt>0)state.hits++;
  return {applied:dealt>0,damage:dealt,health:state.health,killed:!state.alive};
}
export function resetPlayerHealth(state){
  state.health=state.maxHealth;state.alive=true;state.hits=0;
  return state;
}
// Awareness is intentionally wider than gun alignment. An NPC may see
// the player from the side but cannot fire until its visible body turns.
export function enemyAimErrorRadians(brain,player){
  const dx=player.x-brain.x,dz=player.z-brain.z;
  if(!Number.isFinite(dx)||!Number.isFinite(dz)||!Number.isFinite(brain.yaw))
    return Infinity;
  if(Math.hypot(dx,dz)<.0001)return 0;
  const desired=Math.atan2(dx,dz);
  return Math.abs(Math.atan2(Math.sin(desired-brain.yaw),
    Math.cos(desired-brain.yaw)));
}
export function isEnemyAimAligned(brain,player,toleranceDegrees=12){
  return enemyAimErrorRadians(brain,player)<=
    Math.max(0,Math.min(45,toleranceDegrees))*Math.PI/180;
}
export function canEnemyFire(enemyBrain,player,obstacles=[],range=AI_TUNING.sight){
  if(!enemyBrain.active||!(enemyBrain.mode==='chase'||
    (enemyBrain.mode==='investigate'&&enemyBrain.retaliationTime>0)))return false;
  const distanceToTarget=Math.hypot(enemyBrain.x-player.x,enemyBrain.z-player.z);
  if(distanceToTarget>range)return false;
  // Close-quarters fire has a wider torso-aligned cone; long-range precision
  // still requires the original 12-degree aim. Physical LOS is checked below.
  const tolerance=distanceToTarget<5?22:distanceToTarget<9?16:12;
  if(!isEnemyAimAligned(enemyBrain,player,tolerance))return false;
  // A hit alerts the NPC to the shooter beyond its normal 45 m patrol
  // detection radius. A return shot still requires facing and clear LOS.
  return hasSight(enemyBrain,player,obstacles,{...AI_TUNING,sight:range});
}


// W09.9: authoritative 3D obstruction for NPC bullets and tracers.
// Movement colliders describe the same solid walls/cover. A bullet stops at
// the first hit, even when the NPC remembers a player behind the obstacle.
export function firstSolidHit(from,to,obstacles=[],padding=.015){
  if(!from||!to)return null;
  const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z;
  if(![dx,dy,dz,from.x,from.y,from.z].every(Number.isFinite))return null;
  const pad=Math.max(0,Number.isFinite(padding)?padding:0);
  let nearest=null;
  for(const box of obstacles){
    if(!box)continue;
    const bottom=Number.isFinite(box.bottom)?box.bottom:0;
    const top=Number.isFinite(box.top)?box.top:
      Number.isFinite(box.height)?bottom+box.height:Infinity;
    if(!(box.minX<=box.maxX&&box.minZ<=box.maxZ&&top>bottom))continue;
    let enter=0,exit=1;
    const slabs=[
      [from.x,dx,box.minX-pad,box.maxX+pad],
      [from.y,dy,bottom,top],
      [from.z,dz,box.minZ-pad,box.maxZ+pad]
    ];
    for(const [start,delta,min,max] of slabs){
      if(Math.abs(delta)<1e-9){
        if(start<min||start>max){enter=2;break;}
        continue;
      }
      let a=(min-start)/delta,b=(max-start)/delta;
      if(a>b)[a,b]=[b,a];
      enter=Math.max(enter,a);exit=Math.min(exit,b);
      if(enter>exit)break;
    }
    if(enter<=exit&&enter>=0&&enter<=1&&
       (nearest===null||enter<nearest.t)){
      nearest={t:enter,point:{
        x:from.x+dx*enter,y:from.y+dy*enter,z:from.z+dz*enter
      }};
    }
  }
  return nearest;
}
