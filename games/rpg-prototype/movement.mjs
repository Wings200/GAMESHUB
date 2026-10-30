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

export function requestJump(player) {
  if (player.vertical !== 0 || (player.jump > 0 && !player.supported)) return false;
  player.supported = false;
  player.vertical = MOVE_TUNING.jumpVelocity;
  return true;
}

export function stepMovement(player, keys, look, dt, environment) {
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
  const sprint=keys.has('ShiftLeft')||keys.has('ShiftRight');
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
  return {
    speed:actual,requestedSpeed:speed,sprinting:sprint&&len>0,
    moving:actual>.1,airborne:player.jump>0&&!player.supported,
    ground:environment.groundHeight(player.x,player.z)
  };
}
