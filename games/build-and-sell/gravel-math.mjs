
import {tileAt,tileBounds} from "./terrain.mjs";
export const SPREAD_REACH=4.5;
export function readGravel(w,rect,dug){const valid=new Set(dug);return {gravel:Array.isArray(w?.gravel)?[...new Set(w.gravel.filter(id=>valid.has(id)&&tileBounds(rect,id)))]:[],gravelRevision:Number.isSafeInteger(w?.gravelRevision)&&w.gravelRevision>=0?w.gravelRevision:0,lastGravel:w?.lastGravel&&typeof w.lastGravel.actor==="string"?{actor:w.lastGravel.actor,tile:w.lastGravel.tile}:null};}
export function gravelPatch(rect,id,dug,covered,position){
 const center=tileBounds(rect,id);if(!center||!position||!Number.isFinite(position.x)||!Number.isFinite(position.z)||!dug.has(id))return [];
 const x=(center.x1+center.x2)/2,z=(center.z1+center.z2)/2;if(Math.hypot(position.x-x,position.z-z)>SPREAD_REACH)return [];
 const col=id%48,row=Math.floor(id/48),out=[];
 for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const c=col+i,r=row+j;if(c<0||c>=48||r<0||r>=48)continue;const n=c+r*48;if(tileBounds(rect,n)&&dug.has(n)&&!covered.has(n))out.push(n);}
 return out;
}
export function gravelTarget(rect,point,dug,covered,position){if(!point)return null;const id=tileAt(rect,point.x,point.z),bounds=tileBounds(rect,id),ids=gravelPatch(rect,id,dug,covered,position);return bounds&&ids.length?{id,ids,x:(bounds.x1+bounds.x2)/2,z:(bounds.z1+bounds.z2)/2}:null;}
