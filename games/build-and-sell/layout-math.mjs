
import {groundHeight,LOT,tileBounds} from "./terrain.mjs";
const LIMIT=LOT-.5, valid=n=>typeof n==="number"&&Number.isFinite(n)&&Math.abs(n)<=LIMIT, round=n=>Math.round(n*10000)/10000;
export function snapPoint(p,snap,units){if(!p||!valid(p.x)||!valid(p.z))return null;const grid=units==="metric"?.5:.3048;const f=n=>round(Math.max(-LIMIT,Math.min(LIMIT,snap?Math.round(n/grid)*grid:n)));return {x:f(p.x),z:f(p.z)};}
export function rectFrom(a,b){if(!a||!b||![a.x,a.z,b.x,b.z].every(valid))return null;return {x1:round(Math.min(a.x,b.x)),z1:round(Math.min(a.z,b.z)),x2:round(Math.max(a.x,b.x)),z2:round(Math.max(a.z,b.z))};}
export function sanitizeLayout(r){if(!r)return null;const q=rectFrom({x:r.x1,z:r.z1},{x:r.x2,z:r.z2});return q&&q.x2-q.x1>=1.99999&&q.z2-q.z1>=1.99999?q:null;}
export function dimensions(r){if(!r)return null;const width=r.x2-r.x1,depth=r.z2-r.z1;return {width,depth,area:width*depth};}
export function readLayout(w){return {layout:sanitizeLayout(w?.layout),revision:Number.isSafeInteger(w?.layoutRevision)&&w.layoutRevision>=0?w.layoutRevision:0};}
export function layoutAim(o,d,reach=42){if(!o||!d||!Number.isFinite(o.x+o.y+o.z+d.x+d.y+d.z)||d.y>=-.015)return null;const f=t=>o.y+d.y*t-groundHeight(o.x+d.x*t,o.z+d.z*t);if(f(0)<=0)return null;let lo=0;for(let hi=.25;hi<=reach;hi+=.25){if(f(hi)>0){lo=hi;continue;}let a=lo,b=hi;for(let j=0;j<15;j++){const m=(a+b)/2;if(f(m)>0)a=m;else b=m;}const x=o.x+d.x*b,z=o.z+d.z*b;return valid(x)&&valid(z)?{x,z}:null;}return null;}

export function extendLayout(old,requested){
 if(!old||!requested)return null;
 const down=(a,b)=>a+Math.floor(Math.min(0,b-a)+1e-7),up=(a,b)=>a+Math.ceil(b-a-1e-7);
 const q={x1:down(old.x1,requested.x1),z1:down(old.z1,requested.z1),x2:requested.x2>old.x2?up(old.x1,requested.x2):old.x2,z2:requested.z2>old.z2?up(old.z1,requested.z2):old.z2};
 return sanitizeLayout(q);
}
export function remapFoundationTiles(old,next,ids){
 const dx=Math.round(old.x1-next.x1),dz=Math.round(old.z1-next.z1);
 return [...new Set((Array.isArray(ids)?ids:[]).filter(id=>tileBounds(old,id)).map(id=>(id%48+dx)+(Math.floor(id/48)+dz)*48).filter(id=>tileBounds(next,id)))];
}
