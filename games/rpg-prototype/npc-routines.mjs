// W21.03 — Deterministic physical noncombatant behavior for existing characters.
// Pure movement and save rules; world meshes, weapon fire and quests stay in main.js.
export const NPC_ROUTINE_VERSION=1;
export const NPC_ROUTINE_CYCLE=48; // Compressed testing shift; not a simulated day/night cycle.
export const NPC_BODY_RADIUS=.38;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const finite=(v,defaultValue=0)=>Number.isFinite(v)?v:defaultValue;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const wrapped=(t,period)=>((t%period)+period)%period;
const signedAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
const stableOffset=id=>[...id].reduce((n,c)=>(n*31+c.charCodeAt(0))%997,7)%11;

export function npcShift(phase){
  const t=wrapped(finite(phase),NPC_ROUTINE_CYCLE);
  return t<17?'working':t<31?'patrolling':'resting';
}

export function createNpcRoutine(id,anchor,raw=null){
  const safe={id:String(id),x:anchor.x,z:anchor.z,yaw:signedAngle(finite(anchor.yaw)),
    phase:stableOffset(String(id)),alarm:0,lastThreatId:0};
  if(!raw||typeof raw!=='object')return safe;
  const x=finite(raw.x,anchor.x),z=finite(raw.z,anchor.z);
  // Saved routines cannot spawn a contact in another part of the field.
  if(Math.hypot(x-anchor.x,z-anchor.z)<=2.8){safe.x=x;safe.z=z;}
  safe.yaw=signedAngle(finite(raw.yaw));
  safe.phase=wrapped(finite(raw.phase,safe.phase),NPC_ROUTINE_CYCLE);
  safe.alarm=clamp(finite(raw.alarm),0,6);
  safe.lastThreatId=0; // Transient gunshots never replay on reload.
  return safe;
}

export function npcRoutineSnapshot(routines){
  return {version:NPC_ROUTINE_VERSION,actors:Object.fromEntries(
    [...routines].map(([id,r])=>[id,{x:r.x,z:r.z,yaw:r.yaw,
      phase:r.phase,alarm:r.alarm}]))};
}

export function safeNpcRoutineSnapshot(raw,anchors){
  const result=new Map();
  const records=raw?.version===NPC_ROUTINE_VERSION&&
    raw.actors&&typeof raw.actors==='object'&&!Array.isArray(raw.actors)?raw.actors:{};
  for(const [id,anchor] of anchors)
    result.set(id,createNpcRoutine(id,anchor,
      Object.hasOwn(records,id)?records[id]:null));
  return result;
}

export function npcBodyBounds(actor,radius=NPC_BODY_RADIUS){
  return {minX:actor.x-radius,maxX:actor.x+radius,
    minZ:actor.z-radius,maxZ:actor.z+radius,bottom:0,top:1.85};
}

export function npcCanStand(x,z,{obstacles=[],neighbors=[],player=null,radius=NPC_BODY_RADIUS}={}){
  if(!Number.isFinite(x)||!Number.isFinite(z))return false;
  if(x< -59.5||x>59.5||z< -50.5||z>50.5)return false;
  for(const b of obstacles){
    if((b.bottom??0)>1.3||(b.top??b.height??2)<.3)continue;
    if(x>b.minX-radius&&x<b.maxX+radius&&
       z>b.minZ-radius&&z<b.maxZ+radius)return false;
  }
  for(const person of neighbors){
    if(Math.hypot(x-person.x,z-person.z)<radius+(person.radius??NPC_BODY_RADIUS))
      return false;
  }
  if(player&&Math.hypot(x-player.x,z-player.z)<radius+.42)return false;
  return true;
}

export function stepNpcRoutine(previous,dt,context){
  const seconds=clamp(finite(dt),0,.06);
  const next={...previous};
  const {home,player=null,dialogue=false,stationary=false,
    obstacles=[],neighbors=[],threat=null}=context;
  next.phase=wrapped(previous.phase+seconds,NPC_ROUTINE_CYCLE);
  next.alarm=Math.max(0,previous.alarm-seconds);
  if(threat&&threat.id!==previous.lastThreatId&&
     finite(threat.age,999)<.65&&distance(threat,previous)<10.5){
    next.lastThreatId=threat.id;
    next.alarm=5.5;
  }
  let mode=dialogue?'talking':next.alarm>0?'alarmed':npcShift(next.phase);
  let destination;
  if(mode==='working')destination={x:home.x+.25,z:home.z-.55};
  else if(mode==='patrolling')destination={x:home.x+1.25,z:home.z+.65};
  else if(mode==='resting')destination={x:home.x-.65,z:home.z+.65};
  else if(mode==='alarmed'){
    const source=threat&&finite(threat.age,999)<1.1?threat:player||home;
    const dx=previous.x-source.x,dz=previous.z-source.z;
    const length=Math.max(.001,Math.hypot(dx,dz));
    destination={x:clamp(previous.x+dx/length*1.2,home.x-2.3,home.x+2.3),
      z:clamp(previous.z+dz/length*1.2,home.z-2.3,home.z+2.3)};
  }else destination={x:previous.x,z:previous.z};
  if(stationary)destination={x:previous.x,z:previous.z};
  // Skip blocked waypoints instead of phasing through houses and terminals.
  if(!stationary&&mode!=='talking'&&
    !npcCanStand(destination.x,destination.z,{obstacles,neighbors,player})&&
    mode!=='alarmed'){
    const alternatives=[{x:home.x-.95,z:home.z-.7},
      {x:home.x+.2,z:home.z+1.05},home];
    destination=alternatives.find(p=>npcCanStand(p.x,p.z,
      {obstacles,neighbors,player}))||{x:previous.x,z:previous.z};
  }
  let moved=0;
  if(mode!=='talking'&&!stationary){
    const dx=destination.x-previous.x,dz=destination.z-previous.z;
    const length=Math.hypot(dx,dz);
    if(length>.11){
      const speed=mode==='alarmed'?2.05:mode==='patrolling'?1.05:.78;
      const step=Math.min(speed*seconds,length);
      const x=previous.x+dx/length*step,z=previous.z+dz/length*step;
      const can=(nx,nz)=>Math.hypot(nx-home.x,nz-home.z)<2.8&&
        npcCanStand(nx,nz,{obstacles,neighbors,player});
      if(can(x,z)){next.x=x;next.z=z;moved=step;}
      else if(can(x,previous.z)){next.x=x;moved=Math.abs(x-previous.x);}
      else if(can(previous.x,z)){next.z=z;moved=Math.abs(z-previous.z);}
    }
  }
  const lookAt=mode==='talking'||(player&&distance(previous,player)<3.2)?
    player:mode==='alarmed'&&threat?threat:destination;
  if(lookAt&&Math.hypot(lookAt.x-next.x,lookAt.z-next.z)>.09){
    // The character rig faces -Z at yaw zero; track the actual 3D target.
    const facing=Math.atan2(-(lookAt.x-next.x),-(lookAt.z-next.z));
    const delta=signedAngle(facing-previous.yaw);
    next.yaw=signedAngle(previous.yaw+clamp(delta,-seconds*3.2,seconds*3.2));
  }
  return {state:next,mode,speed:seconds?moved/seconds:0,
    crouched:mode==='alarmed'&&moved<.05};
}
