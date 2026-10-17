/*
 * REDLINE remote racer interpolation: no Three.js or DOM dependency.
 * Incoming state is already sanitized and timestamped by the Worker.
 * Buffer 110ms of history, interpolate within it, extrapolate only briefly,
 * and snap on genuine respawns instead of dragging ghosts across the map.
 */
export const REMOTE_INTERPOLATION_DELAY=115;
export const REMOTE_EXTRAPOLATION_LIMIT=100;
export const REMOTE_TELEPORT_DISTANCE=42;
const TAU=Math.PI*2;
const finite=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const lerp=(a,b,t)=>a+(b-a)*t;
export function lerpAngle(a,b,t) {
  const diff=Math.atan2(Math.sin(b-a),Math.cos(b-a));
  return a+diff*t;
}
function stateOf(packet,received){
  return {
    x:finite(packet.x),y:finite(packet.y),z:finite(packet.z),
    rotation:finite(packet.rotation),pitch:finite(packet.pitch),
    roll:finite(packet.roll),speed:Math.max(0,finite(packet.speed)),
    timestamp:finite(packet.timestamp,0),received
  };
}
function distance(a,b){
  return Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
}
function blend(a,b,t){
  return {
    x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t),z:lerp(a.z,b.z,t),
    rotation:lerpAngle(a.rotation,b.rotation,t),
    pitch:lerpAngle(a.pitch,b.pitch,t),
    roll:lerpAngle(a.roll,b.roll,t),speed:lerp(a.speed,b.speed,t)
  };
}
export function createRemoteMotion(){
  let frames=[],lastTimestamp=-Infinity,teleport=null;
  return {
    push(packet,now){
      const stamp=finite(packet?.timestamp,0);
      if(!packet||![packet.x,packet.y,packet.z].every(x=>Number.isFinite(Number(x))))
        return {accepted:false};
      // Authoritative Worker timestamps prevent late/out-of-order packets
      // from pulling cars backwards; equal timestamps are duplicates.
      if(stamp>0 && stamp<=lastTimestamp)return {accepted:false};
      const point=stateOf(packet,now);
      if(stamp>0)lastTimestamp=stamp;
      const prev=frames[frames.length-1];
      if(prev && distance(prev,point)>REMOTE_TELEPORT_DISTANCE){
        frames=[point];teleport=point;
        return {accepted:true,teleported:true};
      }
      frames.push(point);
      if(frames.length>7)frames.shift();
      if(!prev)teleport=point;
      return {accepted:true,teleported:!prev};
    },
    sample(now){
      if(!frames.length)return null;
      const target=now-REMOTE_INTERPOLATION_DELAY;
      const oldest=frames[0],latest=frames[frames.length-1];
      if(target<=oldest.received)return {...oldest};
      for(let i=1;i<frames.length;i++){
        const next=frames[i],previous=frames[i-1];
        if(next.received>=target) {
          const dt=next.received-previous.received;
          return blend(previous,next,dt>0?Math.max(0,Math.min(1,
            (target-previous.received)/dt)):1);
        }
      }
      if(frames.length===1)return {...latest};
      const prev=frames[frames.length-2];
      const dt=latest.received-prev.received;
      if(dt<1)return {...latest};
      const age=Math.max(0,now-latest.received);
      // Extrapolation is bounded by time and speed so lag spikes don't
      // send a car across the map. Beyond 100ms it freezes gracefully.
      const forecast=Math.min(REMOTE_EXTRAPOLATION_LIMIT,age);
      const a=Math.min(1,forecast/dt);
      const maxTravel=latest.speed*forecast/1000+1;
      const dx=latest.x-prev.x,dz=latest.z-prev.z,dy=latest.y-prev.y;
      const stride=Math.hypot(dx*a,dy*a,dz*a);
      const scale=stride>maxTravel?maxTravel/stride:1;
      return {
        ...latest,
        x:latest.x+dx*a*scale,
        y:latest.y+dy*a*scale,
        z:latest.z+dz*a*scale,
        rotation:lerpAngle(prev.rotation,latest.rotation,1+a*.7),
        pitch:lerpAngle(prev.pitch,latest.pitch,1+a*.7),
        roll:lerpAngle(prev.roll,latest.roll,1+a*.7)
      };
    },
    consumeTeleport(){const point=teleport;teleport=null;return point},
    reset(){frames=[];lastTimestamp=-Infinity;teleport=null},
    get size(){return frames.length}
  };
}
