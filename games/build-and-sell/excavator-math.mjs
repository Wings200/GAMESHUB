
import {tileBounds,tileAt,LOT} from "./terrain.mjs";
export const REACH=6.5, DEFAULT_MACHINE={x:5,z:18,yaw:0,driver:null,room:null,rev:0};
export function cleanDrive(v){if(!v||![v.x,v.z,v.yaw].every(n=>typeof n==="number"&&Number.isFinite(n)))return null;return {x:Math.max(-LOT+1.3,Math.min(LOT-1.3,v.x)),z:Math.max(-LOT+1.3,Math.min(LOT-1.3,v.z)),yaw:Math.atan2(Math.sin(v.yaw),Math.cos(v.yaw))};}
export function readMachine(w,room){const v=w?.machine||{},p=cleanDrive(v)||DEFAULT_MACHINE;return {x:p.x,z:p.z,yaw:p.yaw,driver:v.room===room&&typeof v.driver==="string"?v.driver:null,room:v.room===room?room:null,rev:Number.isSafeInteger(v.rev)&&v.rev>=0?v.rev:0};}
export function readDig(w,rect){return {dug:Array.isArray(w?.dug)?[...new Set(w.dug.filter(id=>tileBounds(rect,id)))]:[],digRevision:Number.isSafeInteger(w?.digRevision)?w.digRevision:0,lastDig:Number.isInteger(w?.lastDig)?w.lastDig:null};}
export function targetTile(rect,point,machine,dug){if(!rect||!point||!machine)return null;const id=tileAt(rect,point.x,point.z),b=tileBounds(rect,id);if(!b||dug.has(id))return null;const x=(b.x1+b.x2)/2,z=(b.z1+b.z2)/2,d=Math.hypot(x-machine.x,z-machine.z);return d>=1.25&&d<=REACH?{id,x,z,...b}:null;}
export function countTiles(r){return r?Math.ceil(r.x2-r.x1-1e-8)*Math.ceil(r.z2-r.z1-1e-8):0;}
export function driveStep(m,keys,yaw,dt){let f=Number(keys.has("KeyW"))-Number(keys.has("KeyS")),r=Number(keys.has("KeyD"))-Number(keys.has("KeyA"));const l=Math.hypot(f,r);if(!l)return m;const dx=(r*Math.cos(yaw)-f*Math.sin(yaw))/l,dz=(-r*Math.sin(yaw)-f*Math.cos(yaw))/l;const t=Math.atan2(-dx,-dz),a=Math.atan2(Math.sin(t-m.yaw),Math.cos(t-m.yaw));m.yaw+=a*(1-Math.exp(-8*dt));m.x=Math.max(-22.7,Math.min(22.7,m.x+dx*3.4*dt));m.z=Math.max(-22.7,Math.min(22.7,m.z+dz*3.4*dt));return m;}
