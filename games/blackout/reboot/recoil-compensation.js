// User mouse movement and scripted recoil recovery operate on the same pitch.
// A downward correction must consume pending camera recovery once, never twice.
export function recordRecoilKick(pending,beforePitch,afterPitch){
 return Math.max(0,pending)+Math.max(0,afterPitch-beforePitch);
}
export function consumeManualRecoil(pending,beforePitch,afterPitch){
 return Math.max(0,pending-Math.max(0,beforePitch-afterPitch));
}
