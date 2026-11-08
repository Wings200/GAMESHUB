// Pure aperture/door collision model. No WebGL dependency, so we can unit
// test whether the light path and movement opening agree at any angle.
export const HINGE_X=-1.54, PORTAL_Z=17.47, LEAF_W=3.08;
export const MAX_ANGLE=Math.PI/2;
export const CHAMBER_DOOR_CENTER={x:0,z:17.5};
export function doorCollisionAt(openness) {
  const angle=-MAX_ANGLE*Math.max(0,Math.min(1,openness));
  const farX=HINGE_X+LEAF_W*Math.cos(angle);
  const farZ=PORTAL_Z-LEAF_W*Math.sin(angle);
  return {
    minX:Math.min(HINGE_X,farX)-.075,
    maxX:Math.max(HINGE_X,farX)+.075,
    minZ:Math.min(PORTAL_Z,farZ)-.085,
    maxZ:Math.max(PORTAL_Z,farZ)+.085
  };
}
export function doorDistance(x,z) {
  return Math.hypot(x-CHAMBER_DOOR_CENTER.x,z-CHAMBER_DOOR_CENTER.z);
}
export function lightAperture(value) {
  const x=Math.max(0,Math.min(1,Number(value)||0));
  return x*x*(3-2*x);
}
