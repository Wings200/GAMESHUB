// BLACKOUT multiplayer v0.1 — shared server/client protocol primitives.
// No scripted bots, fake room population, local-only matchmaking or client
// authority over health/damage. The Worker decides session membership.
export const MAX_PLAYERS=10,TEAM_LIMIT=5;
export const OPERATOR_SIDES=Object.freeze({
  sledge:"attacker",thatcher:"attacker",ash:"attacker",thermite:"attacker",twitch:"attacker",
  smoke:"defender",mute:"defender",castle:"defender",pulse:"defender",doc:"defender"
});
export const SPAWN_POINTS=Object.freeze({
  attacker:[[-42,0,-24],[-43,0,5],[0,0,28],[41,0,-6],[9,0,-33]],
  defender:[[8,0,8],[24,0,8],[8,4,-8],[24,4,-8],[-8,4,-8]]
});
export function cleanName(name){
  return String(name||"Operator").replace(/[^a-zA-Z0-9 _-]/g,"").trim().slice(0,22)||"Operator";
}
export function validCode(code){return /^[A-HJ-NP-Z2-9]{6}$/.test(String(code).toUpperCase())}
export function chooseSpawn(side,ordinal){
  const list=SPAWN_POINTS[side==="defender"?"defender":"attacker"];
  return list[Math.abs(ordinal)%list.length];
}
export function validLoadout(side,operator){
  return OPERATOR_SIDES[operator]===side;
}
export function acceptMovement(before,attempt,dt,parts=[]){
  if(!attempt||!["x","y","z","yaw","pitch"].every(k=>Number.isFinite(attempt[k])))return null;
  const time=Math.max(.015,Math.min(.5,dt));
  const travel=Math.hypot(attempt.x-before.x,attempt.z-before.z);
  // A 7.1m/s bound permits short speed bursts plus packet jitter but no
  // teleporting between two windows in one frame.
  const max=7.1*time+.42;
  if(travel>max)return null;
  if(attempt.x< -86||attempt.x>86||attempt.z< -86||attempt.z>86||
    attempt.y<-.2||attempt.y>9)return null;
  if(Math.abs(attempt.y-before.y)>Math.max(.42,7*time))return null;
  // Solid structural collision / LOS are enforced by the server against
  // hard/soft/reinforced walls and cover. Windows/door openings stay open.
  const solid=parts.some(p=>{
    if(!["hardWall","softWall","reinforcedWall","cover","railing"].includes(p.type))return false;
    const a=p.rotationY*Math.PI/180,turn=Math.abs(Math.sin(a))>.7;
    const w=turn?p.size.z:p.size.x,d=turn?p.size.x:p.size.z;
    return attempt.x>p.position.x-w/2-.30&&attempt.x<p.position.x+w/2+.30&&
      attempt.z>p.position.z-d/2-.30&&attempt.z<p.position.z+d/2+.30&&
      attempt.y+1.6>p.position.y&&attempt.y<p.position.y+p.size.y;
  });
  if(solid)return null;
  return {x:attempt.x,y:attempt.y,z:attempt.z,
    yaw:((attempt.yaw+Math.PI*2)%(Math.PI*2)),pitch:Math.max(-1.46,Math.min(1.46,attempt.pitch))};
}
export function lineBlocked(from,to,parts=[]){
  for(let i=1;i<=Math.ceil(Math.hypot(from.x-to.x,from.z-to.z)/.22);i++){
    const t=i/Math.ceil(Math.hypot(from.x-to.x,from.z-to.z)/.22);
    const p={x:from.x+(to.x-from.x)*t,z:from.z+(to.z-from.z)*t,
      y:from.y+(to.y-from.y)*t};
    if(parts.some(w=>{
      if(!["hardWall","softWall","reinforcedWall","cover"].includes(w.type))return false;
      const a=w.rotationY*Math.PI/180,rot=Math.abs(Math.sin(a))>.7;
      const width=rot?w.size.z:w.size.x,depth=rot?w.size.x:w.size.z;
      return p.x>=w.position.x-width/2&&p.x<=w.position.x+width/2&&
        p.z>=w.position.z-depth/2&&p.z<=w.position.z+depth/2&&
        p.y>=w.position.y&&p.y<=w.position.y+w.size.y;
    }))return true;
  }
  return false;
}
export function validShot(shooter,target,parts=[]){
  if(!shooter?.alive||!target?.alive||shooter.side===target.side)return false;
  const dx=target.x-shooter.x,dz=target.z-shooter.z;
  const distance=Math.hypot(dx,dz);
  if(distance>.2&&distance<38){
    // FPS forward vector = (-sin(yaw),-cos(yaw)); sign matters.
    const yaw=-Math.atan2(dx,-dz);
    const wrapped=Math.atan2(Math.sin(yaw-shooter.yaw),Math.cos(yaw-shooter.yaw));
    if(Math.abs(wrapped)>.16)return false;
    const eye={x:shooter.x,y:shooter.y+1.55,z:shooter.z};
    const hit={x:target.x,y:target.y+1.2,z:target.z};
    if(lineBlocked(eye,hit,parts))return false;
    return true;
  }
  return false;
}
