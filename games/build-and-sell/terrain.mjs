
export const LOT=24;
export function baseGroundHeight(x,z){
 const d=Math.max(Math.abs(x),Math.abs(z));
 const a=Math.max(0,Math.min(1,(LOT-d)/5)),fade=a*a*(3-2*a);
 return fade*(.12*Math.sin(x*.22+z*.12)+.09*Math.cos(z*.26-x*.10)+.055*Math.sin(x*.31-z*.34));
}
export const PIT_Y=-.45;
let excavation=null,dug=new Set();
export function tileAt(rect,x,z){if(!rect||x<rect.x1||z<rect.z1||x>=rect.x2||z>=rect.z2)return null;return Math.floor(x-rect.x1)+Math.floor(z-rect.z1)*48;}
export function tileBounds(rect,id){if(!rect||!Number.isInteger(id)||id<0||id>=2304)return null;const x1=rect.x1+id%48,z1=rect.z1+Math.floor(id/48);if(x1>=rect.x2-1e-8||z1>=rect.z2-1e-8)return null;return {x1,z1,x2:Math.min(rect.x2,x1+1),z2:Math.min(rect.z2,z1+1)};}
export function setExcavation(rect,ids){excavation=rect;dug=new Set(ids);}
export function groundHeight(x,z){return dug.has(tileAt(excavation,x,z))?PIT_Y:baseGroundHeight(x,z);}
export function aimGround(origin,dir,reach=4){
 if(!origin||!dir||!Number.isFinite(origin.x+origin.y+origin.z+dir.x+dir.y+dir.z)||dir.y>=-.025)return null;
 const f=t=>origin.y+dir.y*t-groundHeight(origin.x+dir.x*t,origin.z+dir.z*t);
 if(f(0)<=0||f(reach)>0)return null;
 let lo=0,hi=reach;
 for(let i=0;i<24;i++){const m=(lo+hi)/2;if(f(m)>0)lo=m;else hi=m;}
 const x=origin.x+dir.x*hi,z=origin.z+dir.z*hi;
 return Math.abs(x)<=LOT&&Math.abs(z)<=LOT?{x,z}:null;
}
