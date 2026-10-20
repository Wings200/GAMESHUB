// BLACKOUT V0.5 · reproducible alignment shared by visual model and shot system.
// Reticle is part of the actual 3D sight, not a 2D UI overlay.
// In full ADS: optic center + camera-relative root translation = (0,0,z),
// so the true camera-center shot passes precisely through the sight reticle.
export const OPTIC_CENTER=Object.freeze({x:0,y:.234,z:-.418});
export const HIP_POSE=Object.freeze({x:.255,y:-.282,z:-.43,pitch:-.034,roll:-.057});
export const ADS_POSE=Object.freeze({x:-OPTIC_CENTER.x,y:-OPTIC_CENTER.y,z:-.48,pitch:0,roll:0});
export function weaponPose(mix,recoil=0,bob=0){
 const t=Math.max(0,Math.min(1,Number(mix)||0)),hip=1-t;
 const kick=hip*Math.max(0,Number(recoil)||0);
 return {
  x:HIP_POSE.x*hip+ADS_POSE.x*t,
  y:HIP_POSE.y*hip+ADS_POSE.y*t+hip*Number(bob||0)-kick*.025,
  z:HIP_POSE.z*hip+ADS_POSE.z*t+kick*.12,
  pitch:HIP_POSE.pitch*hip+kick*.065,
  roll:t===1?0:HIP_POSE.roll*hip
 };
}
export function shotSpread(isAiming){
 // ADS is precisely camera-forward, hipfire retains tactical spread.
 return isAiming?0:.023;
}
