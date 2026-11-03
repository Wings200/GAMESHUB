// Deterministic two-joint sagittal-plane IK for the original survivor rig.
// Positive hip rotation steps forward (mesh faces -Z). Knee flexes backward.
// Inputs are ankle offsets from the hip, not arbitrary animated percentages.
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function solveBoardingLeg(targetY,targetZ,
  upperLength=.42,lowerLength=.25){
  const up=clamp(Number.isFinite(upperLength)?upperLength:.42,.1,2);
  const lo=clamp(Number.isFinite(lowerLength)?lowerLength:.25,.1,2);
  const y=Number.isFinite(targetY)?targetY:-up-lo;
  const z=Number.isFinite(targetZ)?targetZ:0;
  const radius=Math.hypot(y,z);
  const safeRadius=clamp(radius,Math.abs(up-lo)+.002,up+lo-.002);
  const scale=radius>1e-8?safeRadius/radius:1;
  const desiredY=y*scale,desiredZ=z*scale;
  const cosKnee=clamp((safeRadius**2-up**2-lo**2)/(2*up*lo),-1,1);
  const knee=-Math.acos(cosKnee);
  const hip=Math.atan2(-desiredZ,-desiredY)-
    Math.atan2(lo*Math.sin(knee),up+lo*Math.cos(knee));
  const ankle=-hip-knee;
  const resultingY=-up*Math.cos(hip)-lo*Math.cos(hip+knee);
  const resultingZ=-up*Math.sin(hip)-lo*Math.sin(hip+knee);
  return {hip,knee,ankle,targetY:desiredY,targetZ:desiredZ,
    resultingY,resultingZ,unreachable:Math.abs(radius-safeRadius)>.002,
    error:Math.hypot(y-resultingY,z-resultingZ)};
}
