
export const LOT=24;
export function groundHeight(x,z){
 const d=Math.max(Math.abs(x),Math.abs(z));
 const a=Math.max(0,Math.min(1,(LOT-d)/5)),fade=a*a*(3-2*a);
 return fade*(.12*Math.sin(x*.22+z*.12)+.09*Math.cos(z*.26-x*.10)+.055*Math.sin(x*.31-z*.34));
}
export function aimGround(origin,dir,reach=4){
 if(!origin||!dir||!Number.isFinite(origin.x+origin.y+origin.z+dir.x+dir.y+dir.z)||dir.y>=-.025)return null;
 const f=t=>origin.y+dir.y*t-groundHeight(origin.x+dir.x*t,origin.z+dir.z*t);
 if(f(0)<=0||f(reach)>0)return null;
 let lo=0,hi=reach;
 for(let i=0;i<24;i++){const m=(lo+hi)/2;if(f(m)>0)lo=m;else hi=m;}
 const x=origin.x+dir.x*hi,z=origin.z+dir.z*hi;
 return Math.abs(x)<=LOT&&Math.abs(z)<=LOT?{x,z}:null;
}
