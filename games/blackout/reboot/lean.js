// BLACKOUT V0.5 — persistent stance-safe tactical lean.
// Pure math: input + camera geometry can be tested without WebGL.
export const LEAN_ROLL=0.19;   // ~11 degrees at full lean
export const LEAN_SHIFT=0.16;  // Head offset stays within player's 0.34m radius
export function toggleLean(current,side){
 const requested=side<0?-1:side>0?1:0;
 return requested===current?0:requested;
}
export function smoothLean(current,target,dt){
 const delta=Math.min(.05,Math.max(0,Number.isFinite(dt)?dt:0));
 const desired=Math.max(-1,Math.min(1,Number(target)||0));
 const factor=1-Math.exp(-14*delta);
 const amount=current+(desired-current)*factor;
 return Math.abs(desired-amount)<.0005?desired:amount;
}
export function leanCameraPose(yaw,lean){
 const t=Math.max(-1,Math.min(1,lean));
 // Camera-relative right = (cos(yaw),0,-sin(yaw)).
 // Leaning does not rotate the aiming direction: roll is around camera's
 // optical axis and the shot ray starts at this offset camera position.
 return {
   dx:Math.cos(yaw)*LEAN_SHIFT*t,
   dz:-Math.sin(yaw)*LEAN_SHIFT*t,
   roll:-t*LEAN_ROLL,
 };
}
