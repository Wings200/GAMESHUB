
import {LIMIT} from "./movement.mjs";
export const MAX_TAPE=30,ANCHOR_REACH=4;
export const EMPTY_TAPE=()=>({equipped:false,anchor:null,units:"imperial"});
export function sanitizeTape(value){
 if(!value||value.equipped!==true)return EMPTY_TAPE();
 const units=value.units==="metric"?"metric":"imperial",a=value.anchor;
 const anchor=a&&typeof a.x==="number"&&typeof a.z==="number"&&Number.isFinite(a.x)&&Number.isFinite(a.z)&&Math.abs(a.x)<=LIMIT&&Math.abs(a.z)<=LIMIT?{x:a.x,z:a.z}:null;
 return {equipped:true,anchor,units};
}
export function groundTarget(origin,direction){
 if(direction.y>=-.025)return null;
 const t=-origin.y/direction.y;
 if(!Number.isFinite(t)||t<=0||t>ANCHOR_REACH)return null;
 const x=origin.x+direction.x*t,z=origin.z+direction.z*t;
 return Math.abs(x)<=LIMIT&&Math.abs(z)<=LIMIT?{x,z}:null;
}
export function tapeDistances(anchor,end){
 if(!anchor||!end)return null;
 const horizontal=Math.hypot(end.x-anchor.x,end.z-anchor.z);
 return {horizontal,length:Math.hypot(horizontal,end.y-.025)};
}
export function formatDistance(m,units){
 if(!Number.isFinite(m)||m<0)return "—";
 if(units==="metric"){const cm=Math.round(m*100);return (cm/100).toFixed(2)+" m";}
 const eighths=Math.round(m/0.0254*8),feet=Math.floor(eighths/96),inches=Math.floor(eighths%96/8),frac=eighths%8;
 const divisor=frac%4===0?4:frac%2===0?2:1;
 return feet+"' "+inches+(frac?" "+frac/divisor+"/"+8/divisor:"")+'"';
}
