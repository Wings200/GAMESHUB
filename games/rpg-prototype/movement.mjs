// Shared movement physics for the Movement Lab and the final open-world scene.
// No renderer-specific logic: both environments call this exact controller.
import { movePoint } from './rules.mjs';

export const MOVE_TUNING = Object.freeze({
  walk: 4.5,
  sprint: 7.2,
  jumpVelocity: 6.4,
  gravity: 17,
  eyeHeight: 1.7,
  crouchEyeHeight: 1.03,
  standHeight: 1.85,
  crouchHeight: 1.16,
  crouchSpeed: 2.35,
  acceleration: 20,
  deceleration: 16,
  cameraBlend: 13
});

export const ENDURANCE_TUNING = Object.freeze({
  min: 1, max: 10, defaultPoints: 3,
  sprintSecondsBase: 3, secondsPerPoint: 1,
  recoveryDelay: .55, recoveryBase: .225, recoveryPerPoint: .225, resumeFraction: .3
});

function level(points) {
  const n = Number(points);
  return Number.isFinite(n) ? Math.max(1, Math.min(10, Math.round(n))) : ENDURANCE_TUNING.defaultPoints;
}

// One stamina unit is one second of sprint at full speed.
// E1 = 4 seconds; E3 = 6; E10 = 13. Tweak after player tests.
export function maximumStamina(points) {
  return ENDURANCE_TUNING.sprintSecondsBase + level(points) * ENDURANCE_TUNING.secondsPerPoint;
}

// Higher Endurance replenishes more stamina every second, and reaches full
// proportionally faster: E1 = 0.45/s, E3 = 0.9/s, E10 = 2.475/s.
export function staminaRecoveryRate(points) {
  return ENDURANCE_TUNING.recoveryBase + level(points) * ENDURANCE_TUNING.recoveryPerPoint;
}

// Lab debug control now, future earned SPECIAL-style skill allocation later.
export function setEndurance(player, points, refill = true) {
  const oldMax = maximumStamina(player.endurance);
  const old = Number.isFinite(player.stamina) ? player.stamina : oldMax;
  player.endurance = level(points);
  const nextMax = maximumStamina(player.endurance);
  player.stamina = refill ? nextMax : Math.max(0, Math.min(nextMax, old / oldMax * nextMax));
  player.staminaCooldown = 0;
  player.exhausted = false;
  return player.endurance;
}

function ensureStamina(player) {
  if(!Number.isFinite(player.stamina)) setEndurance(player, player.endurance ?? ENDURANCE_TUNING.defaultPoints);
  else {
    player.endurance=level(player.endurance);
    player.stamina=Math.max(0,Math.min(maximumStamina(player.endurance),player.stamina));
    if(!Number.isFinite(player.staminaCooldown))player.staminaCooldown=0;
    if(typeof player.exhausted!=='boolean')player.exhausted=false;
  }
}

// Low ceilings block a standing character but not one who is crouched.
function overheadBlocked(x,z,environment,height){
  const feet=environment.groundHeight(x,z);
  for(const c of environment.ceilings||[]){
    if(c.bottom<feet-.02 || c.bottom>=feet+height-.02)continue;
    const nearX=Math.max(c.minX,Math.min(x,c.maxX));
    const nearZ=Math.max(c.minZ,Math.min(z,c.maxZ));
    if((x-nearX)**2+(z-nearZ)**2<.5**2)return true;
  }
  return false;
}

export function toggleCrouch(player){
  player.crouchToggle=!player.crouchToggle;
  return player.crouchToggle;
}

export function resetMotion(player){
  player.velocityX=0;
  player.velocityZ=0;
  player.crouched=false;
  player.crouchToggle=false;
  player.eyeHeight=MOVE_TUNING.eyeHeight;
  player.cameraBob=0;
  player.bobPhase=0;
}

export function requestJump(player) {
  if(player.crouched || player.crouchToggle) return false;
  if (player.vertical !== 0 || (player.jump > 0 && !player.supported)) return false;
  player.supported = false;
  player.vertical = MOVE_TUNING.jumpVelocity;
  return true;
}

export function stepMovement(player, keys, look, dt, environment) {
  ensureStamina(player);
  if(!Number.isFinite(player.velocityX))player.velocityX=0;
  if(!Number.isFinite(player.velocityZ))player.velocityZ=0;
  if(!Number.isFinite(player.eyeHeight))player.eyeHeight=MOVE_TUNING.eyeHeight;
  if(!Number.isFinite(player.cameraBob))player.cameraBob=0;
  if(!Number.isFinite(player.bobPhase))player.bobPhase=0;

  const wantsCrouch=!!player.crouchToggle||keys.has('ControlLeft')||keys.has('ControlRight');
  // If the player releases crouch beneath a low roof, stay crouched
  // until there is enough physical space to stand.
  player.crouched=wantsCrouch ||
    (player.crouched && overheadBlocked(player.x,player.z,environment,MOVE_TUNING.standHeight));

  const forward = { x:look.x, z:look.z };
  const fl=Math.hypot(forward.x,forward.z);
  if(fl>1e-6){forward.x/=fl;forward.z/=fl;}
  else{forward.x=0;forward.z=-1;}
  const right={x:-forward.z,z:forward.x};
  const f=Number(keys.has('KeyW'))-Number(keys.has('KeyS'));
  const r=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
  let x=forward.x*f+right.x*r,z=forward.z*f+right.z*r;
  const len=Math.hypot(x,z);
  if(len>1){x/=len;z/=len;}
  const wantsSprint=keys.has('ShiftLeft')||keys.has('ShiftRight');
  const sprint=wantsSprint&&environment.allowSprint!==false&&len>0&&
    !player.crouched&&!player.exhausted&&player.stamina>0;
  // A depleted power-armor core makes the heavy chassis crawl. Normal
  // movement paths omit this option and keep their established speeds.
  const mobility=Math.max(.1,Math.min(1.5,
    Number.isFinite(environment.speedMultiplier)?environment.speedMultiplier:1));
  const speed=(player.crouched?MOVE_TUNING.crouchSpeed:
    (sprint?MOVE_TUNING.sprint:MOVE_TUNING.walk))*mobility;
  // Exponential acceleration/deceleration is frame-rate independent.
  const blend=1-Math.exp(-(len>0?MOVE_TUNING.acceleration:MOVE_TUNING.deceleration)*dt);
  player.velocityX+=(x*speed-player.velocityX)*blend;
  player.velocityZ+=(z*speed-player.velocityZ)*blend;
  if(Math.abs(player.velocityX)<.007)player.velocityX=0;
  if(Math.abs(player.velocityZ)<.007)player.velocityZ=0;
  const oldX=player.x,oldZ=player.z;
  const before=environment.groundHeight(player.x,player.z);
  const candidate=movePoint(player,player.velocityX*dt,player.velocityZ*dt,
    environment.boxes||[],environment.trees||[],before+player.jump);
  const bodyHeight=player.crouched?MOVE_TUNING.crouchHeight:MOVE_TUNING.standHeight;
  // Low roof collision is separate from wall/ledge collision. Move one axis at
  // a time to keep normal corner sliding, even when hitting a tunnel entrance.
  let next={x:candidate.x,z:candidate.z};
  if(overheadBlocked(next.x,next.z,environment,bodyHeight)){
    next={x:player.x,z:player.z};
    if(!overheadBlocked(candidate.x,player.z,environment,bodyHeight))next.x=candidate.x;
    if(!overheadBlocked(next.x,candidate.z,environment,bodyHeight))next.z=candidate.z;
  }
  if(Math.abs(next.x-oldX)<1e-7&&Math.abs(candidate.x-oldX)>1e-7)player.velocityX=0;
  if(Math.abs(next.z-oldZ)<1e-7&&Math.abs(candidate.z-oldZ)>1e-7)player.velocityZ=0;
  const after=environment.groundHeight(next.x,next.z);
  const rise=after-before;
  const climbLimit=Math.max(.35,speed*dt*.7);
  if(rise<=climbLimit||player.jump>.2){
    player.x=next.x;player.z=next.z;
  }
  // Treat short, jumpable boxes as platforms. A falling character can land
  // on their top instead of becoming embedded in the collision volume.
  const ground=environment.groundHeight(player.x,player.z);
  const oldFoot=ground+player.jump;
  player.vertical-=MOVE_TUNING.gravity*dt;
  const fallingJump=Math.max(0,player.jump+player.vertical*dt);
  let support=-Infinity;
  if(player.vertical<=0){
    for(const b of environment.boxes||[]){
      if(!Number.isFinite(b.top)||b.top<=ground)continue;
      const closestX=Math.max(b.minX,Math.min(player.x,b.maxX));
      const closestZ=Math.max(b.minZ,Math.min(player.z,b.maxZ));
      if((player.x-closestX)**2+(player.z-closestZ)**2>.5**2)continue;
      if(oldFoot>=b.top-.03&&ground+fallingJump<=b.top+.05){
        support=Math.max(support,b.top);
      }
    }
  }
  if(Number.isFinite(support)){
    player.jump=support-ground+.04;
    player.vertical=0;
    player.supported=true;
  }else{
    player.jump=fallingJump;
    if(player.jump===0)player.vertical=0;
    player.supported=false;
  }
  const actual=Math.hypot(player.x-oldX,player.z-oldZ)/Math.max(.001,dt);
  // Only motion actually achieved consumes stamina: holding Shift against
  // a wall or while stationary cannot drain the player.
  if(sprint && actual>.1){
    player.stamina=Math.max(0,player.stamina-dt);
    player.staminaCooldown=ENDURANCE_TUNING.recoveryDelay;
    if(player.stamina<=1e-6){player.stamina=0;player.exhausted=true;}
  }else{
    player.staminaCooldown=Math.max(0,player.staminaCooldown-dt);
    if(player.staminaCooldown===0){
      player.stamina=Math.min(maximumStamina(player.endurance),
        player.stamina+staminaRecoveryRate(player.endurance)*dt);
    }
    if(player.exhausted&&player.stamina>=maximumStamina(player.endurance)*ENDURANCE_TUNING.resumeFraction){
      player.exhausted=false;
    }
  }
  // Subtle first-person locomotion animation without introducing a second
  // movement controller. No head bob when idle or airborne.
  const eyeTarget=player.crouched?MOVE_TUNING.crouchEyeHeight:MOVE_TUNING.eyeHeight;
  player.eyeHeight+=(eyeTarget-player.eyeHeight)*(1-Math.exp(-MOVE_TUNING.cameraBlend*dt));
  if(actual>.1)player.bobPhase+=actual*dt*(player.crouched?2.45:2.8);
  const amplitude=player.crouched?.006:(sprint?.025:.014);
  const targetBob=(player.jump===0&&!player.supported&&actual>.12)?
    Math.sin(player.bobPhase)*amplitude*Math.min(1,actual/2):0;
  player.cameraBob+=(targetBob-player.cameraBob)*(1-Math.exp(-12*dt));
  const max=maximumStamina(player.endurance);
  return {
    speed:actual,requestedSpeed:speed,sprinting:sprint&&actual>.1,
    moving:actual>.1,airborne:player.jump>0&&!player.supported,
    ground:environment.groundHeight(player.x,player.z),
    crouched:player.crouched,eyeHeight:player.eyeHeight,cameraBob:player.cameraBob,
    endurance:player.endurance,stamina:player.stamina,staminaMax:max,
    staminaFraction:player.stamina/max,recoveryPerSecond:staminaRecoveryRate(player.endurance),exhausted:player.exhausted,
    recovering:!sprint&&player.staminaCooldown===0&&player.stamina<max
  };
}
