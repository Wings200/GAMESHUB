// The first object struck by the camera's sight ray owns the crosshair.
// A wall, prop, training target or other solid surface must conceal NPCs.
export function characterUnderCrosshair(hits,maxDistance=48){
  const first=hits.find(hit=>Number.isFinite(hit.distance)&&hit.distance>=0);
  if(!first||first.distance>maxDistance)return null;
  const data=first.object?.userData||{};
  if(data.enemyId)return {kind:'hostile',id:data.enemyId};
  if(data.targetResidentId)return {kind:'friendly',id:data.targetResidentId};
  return null;
}

export function targetHealthFraction(health,maxHealth){
  if(!Number.isFinite(health)||!Number.isFinite(maxHealth)||maxHealth<=0)return 0;
  return Math.max(0,Math.min(1,health/maxHealth));
}
