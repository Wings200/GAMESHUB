// W19.0 — near-miss geometry, independent of Three.js and UI.
// A bullet can suppress only an enemy it actually passes, before hitting
// world cover or another actor. No through-wall threat detection.
export function projectileNearMiss(origin,direction,target,{
  range=90,blockDistance=Infinity,radius=1.35,minDistance=1
}={}){
  if(!origin||!direction||!target)return false;
  const numbers=[origin.x,origin.y,origin.z,
    direction.x,direction.y,direction.z,target.x,target.y,target.z];
  if(!numbers.every(Number.isFinite))return false;
  if(!Number.isFinite(range)||range<=0||!Number.isFinite(radius)||radius<=0)return false;
  const norm=direction.x**2+direction.y**2+direction.z**2;
  if(norm<.000001)return false;
  const dx=target.x-origin.x,dy=target.y-origin.y,dz=target.z-origin.z;
  const t=(dx*direction.x+dy*direction.y+dz*direction.z)/norm;
  const limit=Math.min(range,Number.isFinite(blockDistance)?blockDistance:range);
  if(t<=minDistance||t>=limit)return false;
  const ex=dx-direction.x*t,ey=dy-direction.y*t,ez=dz-direction.z*t;
  return ex*ex+ey*ey+ez*ez<=radius*radius;
}
