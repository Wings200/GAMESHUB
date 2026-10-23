// BLACKOUT V0.33 · shared movement helpers for multiplayer stance.
// Keep online rooms isolated from the offline Training simulation.
import {cleanName,validCode,solidAt,supportedFloor} from "./src/multiplayer-protocol.js";

export const BLACKOUT_WORKER="https://redline-multiplayer.guestuseonly0173.workers.dev";
export const MAX_ROOM_PLAYERS=10;
export function normalizeRoomCode(value){
  const code=String(value||"").replace(/[\s-]/g,"").toUpperCase();
  return validCode(code)?code:null;
}
export function roomEndpoint(code,action,base=BLACKOUT_WORKER){
  const canonical=normalizeRoomCode(code);
  if(!canonical||!["ws","status"].includes(action))
    throw new Error("Invalid room request");
  const origin=new URL(base);
  if(origin.protocol!=="https:"&&origin.hostname!=="localhost")
    throw new Error("Secure multiplayer endpoint required");
  return origin.origin+"/api/blackout/rooms/"+canonical+"/"+action;
}
export function roomSocketUrl(code,{side,name,operator},base=BLACKOUT_WORKER){
  const url=new URL(roomEndpoint(code,"ws",base));
  url.protocol=url.protocol==="https:"?"wss:":"ws:";
  url.searchParams.set("side",side==="defender"?"defender":"attacker");
  url.searchParams.set("name",cleanName(name));
  if(operator)url.searchParams.set("operator",String(operator));
  return url.href;
}
export function moveOnlinePlayer(current,pressed,seconds,parts=[],stance={}){
  const dt=Math.max(0,Math.min(seconds,.05));
  const yaw=Number.isFinite(current.yaw)?current.yaw:0;
  let forward=Number(pressed.has("KeyW")||pressed.has("ArrowUp"))-
    Number(pressed.has("KeyS")||pressed.has("ArrowDown"));
  let right=Number(pressed.has("KeyD")||pressed.has("ArrowRight"))-
    Number(pressed.has("KeyA")||pressed.has("ArrowLeft"));
  const length=Math.hypot(forward,right)||1;
  forward/=length;right/=length;
  const crouched=pressed.has("KeyC");
  const aiming=stance.aiming===true;
  const sprinting=!crouched&&!aiming&&
    (pressed.has("ShiftLeft")||pressed.has("ShiftRight"));
  const speed=crouched?2.05:aiming?3.1:sprinting?6.1:4;
  const dx=(-Math.sin(yaw)*forward+Math.cos(yaw)*right)*speed*dt;
  const dz=(-Math.cos(yaw)*forward-Math.sin(yaw)*right)*speed*dt;
  let x=current.x,z=current.z,y=current.y||0;
  // Handle each axis independently so the operator slides along walls.
  if(!solidAt(parts,x+dx,z,y))x+=dx;
  if(!solidAt(parts,x,z+dz,y))z+=dz;
  const ground=supportedFloor(parts,x,z,y+.32);
  if(ground<=y+.42&&ground>=y-.46)y=ground;
  return {...current,x,y,z};
}
export function blendPosition(current,target,rate){
  const t=Math.max(0,Math.min(1,rate));
  return {
    x:current.x+(target.x-current.x)*t,
    y:current.y+(target.y-current.y)*t,
    z:current.z+(target.z-current.z)*t
  };
}
export function selectShotTarget(local,others){
  let best=null,bestAngle=.08;
  for(const p of others){
    if(!p.alive||p.side===local.side)continue;
    const dx=p.x-local.x,dy=(p.y+1.2)-(local.y+1.55),dz=p.z-local.z;
    const distance=Math.hypot(dx,dy,dz);
    if(distance>.2&&distance<38){
      const desiredYaw=-Math.atan2(dx,-dz);
      const yawError=Math.abs(Math.atan2(Math.sin(desiredYaw-local.yaw),
        Math.cos(desiredYaw-local.yaw)));
      const pitchError=Math.abs(Math.atan2(dy,Math.hypot(dx,dz))+(local.pitch||0));
      const score=Math.max(yawError,pitchError);
      if(score<bestAngle){best=p.id;bestAngle=score;}
    }
  }
  return best;
}