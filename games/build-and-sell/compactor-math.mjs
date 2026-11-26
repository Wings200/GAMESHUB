
import {tileAt,tileBounds,LOT} from "./terrain.mjs";
export const DEFAULT_PLATE={x:-5,z:18,yaw:0,driver:null,room:null,rev:0};
const angle=n=>Math.atan2(Math.sin(n),Math.cos(n));
const clamp=n=>Math.max(-LOT+.6,Math.min(LOT-.6,n));
export function plateFromPlayer(p){return {x:clamp(p.x-Math.sin(p.yaw)*.95),z:clamp(p.z-Math.cos(p.yaw)*.95),yaw:angle(p.yaw)};}
export function readPlate(w,room){const v=w?.plate||{},valid=["x","z","yaw"].every(k=>typeof v[k]==="number"&&Number.isFinite(v[k]));return {...(valid?{x:clamp(v.x),z:clamp(v.z),yaw:angle(v.yaw)}:DEFAULT_PLATE),driver:v.room===room&&typeof v.driver==="string"?v.driver:null,room:v.room===room?room:null,rev:Number.isSafeInteger(v.rev)&&v.rev>=0?v.rev:0};}
export function readCompaction(w,rect,gravel){const allowed=new Set(gravel);return {compacted:Array.isArray(w?.compacted)?[...new Set(w.compacted.filter(id=>allowed.has(id)&&tileBounds(rect,id)))]:[],compactRevision:Number.isSafeInteger(w?.compactRevision)&&w.compactRevision>=0?w.compactRevision:0};}
export function compactPatch(rect,plate,gravel,done){
 if(!rect||!plate||!Number.isFinite(plate.x)||!Number.isFinite(plate.z))return [];
 const col=Math.floor(plate.x-rect.x1),row=Math.floor(plate.z-rect.z1),out=[];
 for(let j=-2;j<=2;j++)for(let i=-2;i<=2;i++){const c=col+i,r=row+j;if(c<0||c>=48||r<0||r>=48)continue;const id=c+48*r,b=tileBounds(rect,id);if(!b||!gravel.has(id)||done.has(id))continue;const dx=Math.max(b.x1-plate.x,0,plate.x-b.x2),dz=Math.max(b.z1-plate.z,0,plate.z-b.z2);if(Math.hypot(dx,dz)<=.58)out.push(id);}
 return out;
}
export function pushStep(p,keys,dt){dt=Math.max(0,Math.min(.05,dt));const f=Number(keys.has("KeyW"))-Number(keys.has("KeyS")),r=Number(keys.has("KeyD"))-Number(keys.has("KeyA")),len=Math.hypot(f,r)||1;const vx=(r*Math.cos(p.yaw)-f*Math.sin(p.yaw))/len*2.25,vz=(-r*Math.sin(p.yaw)-f*Math.cos(p.yaw))/len*2.25,k=1-Math.exp(-15*dt);p.vx+=(vx-p.vx)*k;p.vz+=(vz-p.vz)*k;p.x=Math.max(-22.5,Math.min(22.5,p.x+p.vx*dt));p.z=Math.max(-22.5,Math.min(22.5,p.z+p.vz*dt));p.speed=Math.hypot(p.vx,p.vz);p.y=0;p.vy=0;p.grounded=true;p.crouch=false;p.eye=1.68;p.mode=p.speed>.12?"walk":"idle";return p;}
