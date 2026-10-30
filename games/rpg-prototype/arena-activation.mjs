// Combat-lab activation rules. Models are always rendered, and any live enemy
// can take a hit, independently of the most recently selected test station.
export const ARENA_BOUNDS=Object.freeze({
  minX:28,maxX:60,minZ:30,maxZ:51
});
export function isPhysicallyInArena(player,area=ARENA_BOUNDS){
  return !!player&&Number.isFinite(player.x)&&Number.isFinite(player.z)&&
    player.x>=area.minX&&player.x<=area.maxX&&
    player.z>=area.minZ&&player.z<=area.maxZ;
}
export function isArenaActive(stationIndex,player){
  // Keep the original "press 9" session active even if the player steps
  // outside the arena; also support entering the arena on foot from station 7.
  return stationIndex===8||isPhysicallyInArena(player);
}
export function shouldRaycastEnemy(enemy){
  return !!enemy?.state?.alive&&enemy?.root?.visible!==false;
}
export function combatRuntimeStatus({active,locked,aiEnabled,playerAlive,aliveCount}){
  if(!active)return 'ENTER STATION 9 OR WALK INTO THE ENEMY ARENA';
  if(!locked)return 'AI PAUSED · CLICK PLAY TO RESUME';
  if(!aiEnabled)return 'AI FROZEN · PRESS K';
  if(!playerAlive)return 'PLAYER DOWN · PRESS H';
  if(aliveCount<=0)return 'ALL RAIDERS DOWN · PRESS J TO RESET';
  return 'AI ACTIVE · RAIDERS CAN MOVE AND TAKE DAMAGE';
}
