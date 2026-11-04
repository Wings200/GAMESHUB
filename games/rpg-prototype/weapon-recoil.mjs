// W20.38: deliberate high-impact recoil for nine rebuilt GAMESHUB firearms.
// Shoot the projectile along the current sight before calling applyWeaponRecoil.
// All angles supplied to and returned from this module are radians.
const DEG=Math.PI/180;
const PITCH_LIMIT=Math.PI/2-.035;
const MAX_PITCH_DEBT=.58; // sustained automatic fire can climb ~33 degrees
const MAX_YAW_DEBT=.16;
const BASE_CAMERA_KICK=2.0;
const MODEL_PUNCH=1.65;
const RECOVERY_SLOWDOWN=.74;
const limit=(v,low,high)=>Math.max(low,Math.min(high,v));
const finite=(v,fallback=0)=>Number.isFinite(v)?v:fallback;

const profiles={
  '10mm-pistol':       {pitch:.88,yaw:.17,pattern:[.2,-.4,.7,-.5,1],recover:5.6,hold:.09,model:.060,travel:.012},
  'pipe-pistol':       {pitch:1.08,yaw:.29,pattern:[-.6,-1,.35,-.8,.75],recover:4.6,hold:.11,model:.076,travel:.016},
  'pipe-rifle':        {pitch:1.02,yaw:.24,pattern:[-.25,-.6,-.8,.1,-.5],recover:4.1,hold:.12,model:.085,travel:.022},
  'laser-musket':      {pitch:.64,yaw:.075,pattern:[.25,-.25,.15],recover:5.3,hold:.10,model:.110,travel:.033},
  'double-barrel-shotgun':{pitch:1.18,yaw:.24,pattern:[-.5,.45],recover:3.45,hold:.17,model:.19,travel:.067},
  'pump-action-shotgun':{pitch:1.09,yaw:.18,pattern:[.1,-.4,.4],recover:3.9,hold:.15,model:.175,travel:.058},
  'bolt-hunting-rifle':{pitch:1.12,yaw:.14,pattern:[-.28,.4],recover:4.05,hold:.15,model:.15,travel:.050},
  'iron-revolver':     {pitch:1.14,yaw:.31,pattern:[.45,-.6,.3,-.5],recover:4.3,hold:.14,model:.115,travel:.034},
  'pipe-smg':          {pitch:.91,yaw:.33,pattern:[.15,-.5,-.8,.3,.9,.7,-.2,1],recover:3.4,hold:.12,model:.039,travel:.008},
  'scrap-pistol':      {pitch:.90,yaw:.13,pattern:[.1,-.3,.3],recover:5.3,hold:.09,model:.054,travel:.012},
  'service-carbine':   {pitch:.84,yaw:.17,pattern:[.1,-.45,.6,-.35],recover:4.6,hold:.08,model:.054,travel:.011},
  'scrap-shotgun':     {pitch:1.14,yaw:.2,pattern:[-.3,.5],recover:3.75,hold:.15,model:.17,travel:.050},
  'hunting-rifle':     {pitch:1.07,yaw:.13,pattern:[-.25,.35],recover:4.15,hold:.14,model:.14,travel:.045}
};
export const WEAPON_RECOIL_PROFILES=Object.freeze(Object.fromEntries(
  Object.entries(profiles).map(([id,p])=>[id,Object.freeze({...p,pattern:Object.freeze(p.pattern)})])
));
const fallbackProfile=WEAPON_RECOIL_PROFILES['10mm-pistol'];
export function weaponRecoilProfile(specOrId){
  const id=typeof specOrId==='string'?specOrId:specOrId?.id;
  return WEAPON_RECOIL_PROFILES[id]||fallbackProfile;
}
export function createWeaponRecoilState(){
  return {pitchDebt:0,yawDebt:0,modelPitch:0,modelBack:0,
    burstShots:0,sinceShot:Infinity};
}
export function resetWeaponRecoil(state){
  state.pitchDebt=0;state.yawDebt=0;state.modelPitch=0;
  state.modelBack=0;state.burstShots=0;state.sinceShot=Infinity;
  return state;
}
// Positive camera pitch raises the sights in Three.js YXZ space.
// Horizontal kick is deliberately small, repeatable, and weapon-specific.
// The first bullet never receives a recoil offset from its own shot.
export function applyWeaponRecoil(state,pitch,yaw,spec,options={}){
  const profile=weaponRecoilProfile(spec);
  if(state.sinceShot>.44)state.burstShots=0;
  const shotIndex=state.burstShots++;
  state.sinceShot=0;
  const degrees=limit(finite(spec?.recoilDegrees,1.5),0,15);
  const multiplier=limit(finite(options.multiplier,1),0,4);
  const stance=(options.aiming?.92:1)*(options.crouched?.90:1);
  const requested=degrees*profile.pitch*BASE_CAMERA_KICK*multiplier*stance*DEG;
  const pitchAllowance=Math.min(requested,Math.max(0,MAX_PITCH_DEBT-state.pitchDebt),
    Math.max(0,PITCH_LIMIT-finite(pitch)));
  const nextPitch=limit(finite(pitch)+pitchAllowance,-PITCH_LIMIT,PITCH_LIMIT);
  state.pitchDebt=limit(state.pitchDebt+nextPitch-finite(pitch),0,MAX_PITCH_DEBT);
  const pattern=profile.pattern[shotIndex%profile.pattern.length];
  const requestedYaw=profile.yaw*pattern*1.65*multiplier*stance*DEG;
  const nextYawDebt=limit(state.yawDebt+requestedYaw,-MAX_YAW_DEBT,MAX_YAW_DEBT);
  const appliedYaw=nextYawDebt-state.yawDebt;
  state.yawDebt=nextYawDebt;
  state.modelPitch=limit(state.modelPitch+profile.model*MODEL_PUNCH*multiplier*(options.aiming?.92:1),0,.38);
  state.modelBack=limit(state.modelBack+profile.travel*1.6*multiplier,0,.16);
  return {pitch:nextPitch,yaw:finite(yaw)+appliedYaw,
    pitchKick:nextPitch-finite(pitch),yawKick:appliedYaw,
    shotInBurst:shotIndex+1};
}
// Pointer-lock mouse input can naturally counter the remaining recoil.
// Without this, dragging down to control a burst causes auto-recovery to
// drag the player's sight below the point they were trying to hold.
export function countersteerWeaponRecoil(state,movementX,movementY,pointerSensitivity=.002){
  const sx=finite(movementX)*pointerSensitivity;
  const sy=finite(movementY)*pointerSensitivity;
  if(sy>0)state.pitchDebt=Math.max(0,state.pitchDebt-sy);
  if(state.yawDebt>0&&sx>0)
    state.yawDebt=Math.max(0,state.yawDebt-sx);
  else if(state.yawDebt<0&&sx<0)
    state.yawDebt=Math.min(0,state.yawDebt-sx);
}
// Call once per animation frame after normal mouse look has been applied.
export function stepWeaponRecoil(state,pitch,yaw,dt,spec){
  dt=limit(finite(dt),0,.1);
  const profile=weaponRecoilProfile(spec);
  state.sinceShot=Math.min(99,state.sinceShot+dt);
  const modelDecay=Math.exp(-(profile.recover+4)*dt);
  state.modelPitch*=modelDecay;
  state.modelBack*=Math.exp(-(profile.recover+5)*dt);
  if(state.modelPitch<.00001)state.modelPitch=0;
  if(state.modelBack<.00001)state.modelBack=0;
  // Brief recoil impulse followed by a smooth, non-snapping return.
  if(state.sinceShot<profile.hold+.035)
    return {pitch:finite(pitch),yaw:finite(yaw)};
  const recoveryFraction=1-Math.exp(-profile.recover*RECOVERY_SLOWDOWN*dt);
  const verticalReturn=Math.min(state.pitchDebt,state.pitchDebt*recoveryFraction);
  const nextPitch=limit(finite(pitch)-verticalReturn,-PITCH_LIMIT,PITCH_LIMIT);
  state.pitchDebt=Math.max(0,state.pitchDebt-Math.max(0,finite(pitch)-nextPitch));
  const horizontalReturn=state.yawDebt*recoveryFraction;
  state.yawDebt-=horizontalReturn;
  if(state.pitchDebt<.00001)state.pitchDebt=0;
  if(Math.abs(state.yawDebt)<.00001)state.yawDebt=0;
  return {pitch:nextPitch,yaw:finite(yaw)-horizontalReturn};
}
