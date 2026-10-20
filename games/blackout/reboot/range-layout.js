// Offline movement-test target placement. Keep this separate from Three.js so
// open shot lanes can be checked before changing the sandbox map.
export const TARGET_POSITIONS=Object.freeze([
 Object.freeze([-11,-18]),
 Object.freeze([-2,-22]),
 Object.freeze([7,-17]),
 Object.freeze([7,-25]) // Former [13,-23] was obstructed by wall-two from test lane.
]);
export function isLineOfSightClear(eye,point,obstacles){
 for(const o of obstacles){
  const min=[o.x-o.width/2,o.bottom??0,o.z-o.depth/2];
  const max=[o.x+o.width/2,o.height,o.z+o.depth/2];
  const start=[eye.x,eye.y,eye.z],end=[point.x,point.y,point.z];
  let near=0,far=1;
  for(let axis=0;axis<3;axis++){
   const d=end[axis]-start[axis];
   if(Math.abs(d)<1e-9){
    if(start[axis]<min[axis]||start[axis]>max[axis]){near=2;break;}
    continue;
   }
   const a=(min[axis]-start[axis])/d,b=(max[axis]-start[axis])/d;
   near=Math.max(near,Math.min(a,b));
   far=Math.min(far,Math.max(a,b));
  }
  if(near<=far&&near>=0&&near<1)return false;
 }
 return true;
}
