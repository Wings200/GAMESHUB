// W20.77: aim and tracer geometry stay anchored to the *current* target.
// These pure helpers keep hitscan NPCs from inexplicably leading a player
// who has stopped, while maintaining visible, unbiased misses under fire.
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function enemyFacingError(brain,target){
  if(!Number.isFinite(brain?.x)||!Number.isFinite(brain?.z)||
    !Number.isFinite(brain?.yaw)||!Number.isFinite(target?.x)||
    !Number.isFinite(target?.z))return Infinity;
  const desired=Math.atan2(target.x-brain.x,target.z-brain.z);
  return Math.abs(Math.atan2(Math.sin(desired-brain.yaw),
    Math.cos(desired-brain.yaw)));
}

export function enemyFacingTarget(brain,target,maxDegrees=12){
  return enemyFacingError(brain,target)<=clamp(maxDegrees,1,90)*Math.PI/180;
}

// The game's bullets are hitscan. Leading the player would be a mistake.
// When a shot misses, draw it through a small randomized ring around the
// CURRENT silhouette, perpendicular to the muzzle-to-target ray. There is
// deliberately no persistent left/right error or guessed player velocity.
export function enemyShotTarget(muzzle,target,{hit=false,accuracy=.5,
  rng=Math.random}={}){
  const point={x:target.x,y:target.y,z:target.z};
  if(hit)return point;
  const dx=target.x-muzzle.x,dz=target.z-muzzle.z;
  const flat=Math.max(.001,Math.hypot(dx,dz));
  const sampled=Number(rng());
  const direction=(Number.isFinite(sampled)?clamp(sampled,0,1):.5)*Math.PI*2;
  const distance=Math.hypot(dx,Number(target.y||0)-Number(muzzle.y||0),dz);
  const spread=clamp(.55+(1-clamp(accuracy,0,1))*.52+distance*.014,.55,2.4);
  const side=Math.cos(direction)*spread;
  // Horizontal errors are perpendicular to the shot, never a constant
  // world-X lead; elevation errors make missed rounds sail high or low.
  point.x+=-dz/flat*side;
  point.z+=dx/flat*side;
  point.y+=Math.sin(direction)*spread*.72;
  return point;
}
