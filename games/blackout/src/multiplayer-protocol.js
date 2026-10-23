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
// Same floor rules as the playable editor map, but checked independently
// inside the online Worker so a modified browser can't fly upstairs.
export function supportedFloor(parts,x,z,height){
  let best=0;
  for(const p of parts){
    if(p.type!=="floor")continue;
    if(p.position.y>height+.32)continue;
    if(Math.abs(p.position.x-x)<p.size.x/2&&
       Math.abs(p.position.z-z)<p.size.z/2)
      best=Math.max(best,p.position.y);
  }
  for(const p of parts){
    if(p.type!=="stairs")continue;
    const rot=(p.rotationY||0)*Math.PI/180,dx=x-p.position.x,dz=z-p.position.z;
    const localX=Math.cos(rot)*dx-Math.sin(rot)*dz;
    const localZ=Math.sin(rot)*dx+Math.cos(rot)*dz;
    if(Math.abs(localX)>p.size.x/2+.2||
       Math.abs(localZ)>p.size.z/2+.2)continue;
    const ratio=Math.max(0,Math.min(1,(localZ+p.size.z/2)/p.size.z));
    const step=p.position.y+p.size.y*ratio;
    if(step<=height+.45)best=Math.max(best,step);
  }
  return best;
}
export function solidAt(parts,x,z,y){
  return parts.some(p=>{
    if(!["hardWall","softWall","reinforcedWall","cover","railing"].includes(p.type))return false;
    const angle=(p.rotationY||0)*Math.PI/180,rot=Math.abs(Math.sin(angle))>.7;
    const w=rot?p.size.z:p.size.x,d=rot?p.size.x:p.size.z;
    return x>p.position.x-w/2-.25&&x<p.position.x+w/2+.25&&
      z>p.position.z-d/2-.25&&z<p.position.z+d/2+.25&&
      y+1.45>p.position.y&&y<p.position.y+p.size.y;
  });
}
export function acceptMovement(before,attempt,dt,parts=[]){
  if(!attempt||!["x","y","z","yaw","pitch"].every(k=>Number.isFinite(attempt[k])))return null;
  const time=Math.max(.01,Math.min(.5,dt));
  const travel=Math.hypot(attempt.x-before.x,attempt.z-before.z);
  const max=7.4*time+.14;
  if(travel>max)return null;
  if(attempt.x< -86||attempt.x>86||attempt.z< -86||attempt.z>86||
    attempt.y<-.2||attempt.y>9)return null;
  if(Math.abs(attempt.y-before.y)>Math.max(.21,7*time))return null;
  // Sample the ENTIRE path. Checking just the destination let a client
  // walk through thin structural walls between two 70ms packets.
  const steps=Math.max(1,Math.ceil(Math.max(travel,
    Math.abs(attempt.y-before.y))/.11));
  const anchors=parts.filter(p=>p.type==="rappelAnchor");
  for(let i=1;i<=steps;i++){
    const t=i/steps;
    const x=before.x+(attempt.x-before.x)*t;
    const y=before.y+(attempt.y-before.y)*t;
    const z=before.z+(attempt.z-before.z)*t;
    if(solidAt(parts,x,z,y))return null;
    const anchored=anchors.some(p=>Math.hypot(p.position.x-x,p.position.z-z)<1.0&&
      y<=p.position.y+.2&&y>=p.position.y-p.size.y-.2);
    if(!anchored&&y-supportedFloor(parts,x,z,y)>.82)return null;
  }
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

/* Custom rooms remain real multiplayer rooms, but can be explored solo.
   These settings are normalized again inside the Durable Object. */
export function normalizeBlackoutGameSettings(input={}) {
  const custom=input?.kind==="custom";
  const rawName=String(input?.roomName||"").replace(/[^a-zA-Z0-9 _-]/g,"").trim();
  const roomName=(rawName|| (custom?"CUSTOM OPERATIONS":"STANDARD PRIVATE")).slice(0,24);
  const requested=Math.floor(Number(input?.maxPlayers));
  const maxPlayers=custom&&Number.isFinite(requested)?
    Math.max(1,Math.min(MAX_PLAYERS,requested)):MAX_PLAYERS;
  return {
    kind:custom?"custom":"standard",
    roomName,
    maxPlayers,
    startRule:custom&&input?.startRule!=="opposing"?"any":"opposing",
    winCondition:custom&&input?.winCondition==="freeplay"?"freeplay":"elimination",
    map:"ironvale"
  };
}
export function canStartBlackoutRound(config,players) {
  if(!Array.isArray(players)||players.length===0)return false;
  if(config?.kind==="custom"&&config?.startRule==="any")return true;
  return players.some(p=>p.side==="attacker")&&
    players.some(p=>p.side==="defender");
}
