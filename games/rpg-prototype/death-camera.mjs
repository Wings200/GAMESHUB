// A first-person, deterministic death fall. The camera sinks onto its knees,
// pauses for a breath, then pitches into the ground before the death menu.
export const DEATH_KNEE_END=0.86;
export const DEATH_FALL_START=1.05;
export const DEATH_GROUND_IMPACT=1.82;
export const DEATH_SCREEN_TIME=2.62;

function smooth01(value){
  const x=Math.max(0,Math.min(1,value));
  return x*x*(3-2*x);
}

export function deathCameraPose(seconds,{startEye=1.68,startPitch=0,startYaw=0}={}){
  const time=Math.max(0,Number.isFinite(seconds)?seconds:0);
  const knee=smooth01((time-.12)/(DEATH_KNEE_END-.12));
  const fall=smooth01((time-DEATH_FALL_START)/
    (DEATH_GROUND_IMPACT-DEATH_FALL_START));
  const originalEye=Number.isFinite(startEye)?Math.max(.18,startEye):1.68;
  const kneelingEye=Math.min(.98,originalEye);
  const initialPitch=Number.isFinite(startPitch)?startPitch:0;
  const initialYaw=Number.isFinite(startYaw)?startYaw:0;
  const impactAge=Math.max(0,time-DEATH_GROUND_IMPACT);
  const rebound=time>=DEATH_GROUND_IMPACT?
    Math.sin(impactAge*31)*Math.exp(-impactAge*13)*.028:0;
  const headHeight=originalEye+(kneelingEye-originalEye)*knee+
    (.15-kneelingEye)*fall;
  const rollJolt=time>=DEATH_GROUND_IMPACT?
    Math.sin(impactAge*29)*Math.exp(-impactAge*12)*.07:0;
  return {
    eyeHeight:Math.max(.13,headHeight+rebound),
    yaw:initialYaw+fall*.055+Math.sin(Math.PI*knee)*.014,
    pitch:initialPitch+(-.16-initialPitch)*knee+(-1.46+.16)*fall,
    roll:Math.sin(Math.PI*knee)*.045+fall*.21+rollJolt,
    veilOpacity:Math.min(.96,.08*knee+.19*fall+
      .69*smooth01(impactAge/.78)),
    impacted:time>=DEATH_GROUND_IMPACT,
    showDeathScreen:time>=DEATH_SCREEN_TIME
  };
}
