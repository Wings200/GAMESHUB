// Lightweight geometric attenuation / obstruction for the code-first sound
// engine. This is ray-vs-axis-aligned bounding boxes, not acoustic simulation.
const finite=v=>typeof v==='number'&&Number.isFinite(v);
export function normalizeAudioPosition(p,label='position'){
  if(!p||!['x','y','z'].every(k=>finite(p[k])))
    throw new TypeError(label+' must have finite x/y/z');
  return {x:p.x,y:p.y,z:p.z};
}
export function segmentIntersectsAABB(from,to,box){
  from=normalizeAudioPosition(from,'listener');
  to=normalizeAudioPosition(to,'source');
  if(!box||!['minX','maxX','minY','maxY','minZ','maxZ'].every(k=>finite(box[k])))
    throw new TypeError('Audio occlusion requires a 3D AABB');
  let start=0,end=1;
  for(const axis of ['X','Y','Z']){
    const key=axis.toLowerCase(),min=box['min'+axis],max=box['max'+axis];
    if(min>max)throw new TypeError('Invalid audio-occluder bounds');
    const delta=to[key]-from[key];
    if(Math.abs(delta)<1e-10){
      if(from[key]<min||from[key]>max)return false;
      continue;
    }
    let a=(min-from[key])/delta,b=(max-from[key])/delta;
    if(a>b)[a,b]=[b,a];
    start=Math.max(start,a);
    end=Math.min(end,b);
    if(start>end)return false;
  }
  // Only intersections between points matter; touching the listener/source
  // at an endpoint shouldn't classify as travelling through a wall.
  return end>1e-5 && start<1-1e-5 && end-start>1e-5;
}
export function estimateOcclusion(from,to,colliders=[],maxOcclusion=.82){
  const cap=Math.max(0,Math.min(1,maxOcclusion));
  if(!Array.isArray(colliders))throw new TypeError('Colliders must be an array');
  let hits=0;
  for(const box of colliders)if(segmentIntersectsAABB(from,to,box))hits++;
  return Math.min(cap,1-Math.pow(.52,hits));
}
