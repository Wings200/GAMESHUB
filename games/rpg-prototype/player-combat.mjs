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
export function canEnemyFire(enemyBrain,player,obstacles=[],range=AI_TUNING.sight){
  if(!enemyBrain.active||!(enemyBrain.mode==='chase'||
    (enemyBrain.mode==='investigate'&&enemyBrain.retaliationTime>0)))return false;
  if(Math.hypot(enemyBrain.x-player.x,enemyBrain.z-player.z)>range)return false;
  // A hit alerts the NPC to the shooter beyond its normal 45 m patrol
  // detection radius. A return shot still requires facing and clear LOS.
  return hasSight(enemyBrain,player,obstacles,{...AI_TUNING,sight:range});
}
