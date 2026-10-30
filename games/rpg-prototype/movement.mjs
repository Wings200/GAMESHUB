// Shared movement physics for the Movement Lab and the final open-world scene.
// No renderer-specific logic: both environments call this exact controller.
import { movePoint } from './rules.mjs';

export const MOVE_TUNING = Object.freeze({
  walk: 4.5,
  sprint: 7.2,
  jumpVelocity: 6.4,
  gravity: 17,
  eyeHeight: 1.7
});

export const ENDURANCE_TUNING = Object.freeze({
  min: 1, max: 10, defaultPoints: 3,
  sprintSecondsBase: 6, secondsPerPoint: 2,
  recoveryDelay: 1.1, recoveryPerSecond: 1.8, resumeFraction: .3
});

function level(points) {
  const n = Number(points);
  return Number.isFinite(n) ? Math.max(1, Math.min(10, Math.round(n))) : ENDURANCE_TUNING.defaultPoints;
}

// One stamina unit is one second of sprint at full speed.
// E1 = 8 seconds; E3 = 12; E10 = 26. Tweak these values after player tests.
export function maximumStamina(points) {
  return ENDURANCE_TUNING.sprintSecondsBase + level(points) * ENDURANCE_TUNING.secondsPerPoint;
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

export function requestJump(player) {
  if (player.vertical !== 0 || (player.jump > 0 && !player.supported)) return false;
  player.supported = false;
  player.vertical = MOVE_TUNING.jumpVelocity;
  return true;
}

export function stepMovement(player, keys, look, dt, environment) {
  ensureStamina(player);
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
  const sprint=wantsSprint&&len>0&&!player.exhausted&&player.stamina>0;
  const speed=sprint?MOVE_TUNING.sprint:MOVE_TUNING.walk;
  const oldX=player.x,oldZ=player.z;
  const before=environment.groundHeight(player.x,player.z);
  const next=movePoint(player,x*speed*dt,z*speed*dt,
    environment.boxes||[],environment.trees||[],before+player.jump);
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
        player.stamina+ENDURANCE_TUNING.recoveryPerSecond*dt);
    }
    if(player.exhausted&&player.stamina>=maximumStamina(player.endurance)*ENDURANCE_TUNING.resumeFraction){
      player.exhausted=false;
    }
  }
  const max=maximumStamina(player.endurance);
  return {
    speed:actual,requestedSpeed:speed,sprinting:sprint&&actual>.1,
    moving:actual>.1,airborne:player.jump>0&&!player.supported,
    ground:environment.groundHeight(player.x,player.z),
    endurance:player.endurance,stamina:player.stamina,staminaMax:max,
    staminaFraction:player.stamina/max,exhausted:player.exhausted,
    recovering:!sprint&&player.staminaCooldown===0&&player.stamina<max
  };
}
