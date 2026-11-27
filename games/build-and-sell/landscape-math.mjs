
import {LOT} from "./terrain.mjs";
export const LAND_TYPES=[
 {id:"grass",name:"Grass sod",stock:"landgrass",layer:"ground"},
 {id:"drive",name:"Concrete driveway",stock:"landdrive",layer:"ground"},
 {id:"paver",name:"Brick walkway",stock:"landpaver",layer:"ground"},
 {id:"fence",name:"Timber fence",stock:"landfence",layer:"object"},
 {id:"shrub",name:"Garden shrub",stock:"landshrub",layer:"object"}
];
export const landSpec=id=>LAND_TYPES.find(v=>v.id===id);
export const LAND_LIMIT=1200;
export function landCandidate(kind,point,rotation=0){
 if(!point||!landSpec(kind)||!Number.isFinite(point.x)||!Number.isFinite(point.z)||!Number.isInteger(rotation)||rotation<0||rotation>3)return null;
 const x=Math.floor(point.x)+.5,z=Math.floor(point.z)+.5;
 if(Math.abs(x)>LOT-.5||z>LOT-.5||z< -19.5)return null;
 return {kind,x,z,rotation:kind==="fence"?rotation%2:0};
}
export const landBounds=f=>({x1:f.x-.5,x2:f.x+.5,z1:f.z-.5,z2:f.z+.5});
export const landOverlaps=(a,b)=>!!a&&!!b&&a.x1<b.x2-.001&&a.x2>b.x1+.001&&a.z1<b.z2-.001&&a.z2>b.z1+.001;
export function readLandscape(w){
 const landscape=[],seen=new Set();
 for(const f of Array.isArray(w?.landscape)?w.landscape.slice(0,LAND_LIMIT):[]){
  const q=landCandidate(f?.kind,f,f?.rotation),key=q&&q.x+":"+q.z+":"+landSpec(q.kind).layer;
  if(!q||q.x!==f.x||q.z!==f.z||seen.has(key))continue;
  seen.add(key);landscape.push(q);
 }
 return {landscape,landscapeRevision:Number.isSafeInteger(w?.landscapeRevision)&&w.landscapeRevision>=0?w.landscapeRevision:0};
}
export function checkLandscape(rows,foundations,f,p){
 if(!f||!p||!Number.isFinite(p.x)||!Number.isFinite(p.z)||Math.hypot(p.x-f.x,p.z-f.z)>6)return "Aim at nearby usable lot ground";
 if(foundations.some(r=>landOverlaps(r,landBounds(f))))return "Keep landscaping outside foundation outlines";
 if(rows.length>=LAND_LIMIT)return "Landscaping limit reached";
 if(rows.some(q=>q.x===f.x&&q.z===f.z&&landSpec(q.kind).layer===landSpec(f.kind).layer))return "Remove the existing surface or object first";
 if(landSpec(f.kind).layer==="object"&&Math.hypot(p.x-f.x,p.z-f.z)<.85)return "Step clear of the object";
 return null;
}
export function changeLandscape(w,foundations,change,p){
 const rows=readLandscape(w).landscape;
 const f=landCandidate(change.kind,change,change.rotation);
 if(!f||f.x!==change.x||f.z!==change.z||!p||Math.hypot(p.x-f.x,p.z-f.z)>6)return {error:"Approach a valid lot square"};
 if(change.operation==="remove"){
  const old=rows.find(v=>v.x===f.x&&v.z===f.z&&v.kind===f.kind);
  return old?{landscape:rows.filter(v=>v!==old),returned:landSpec(old.kind).stock}:{error:"No selected landscape item here"};
 }
 if(change.operation!=="add")return {error:"Invalid landscaping operation"};
 const error=checkLandscape(rows,foundations,f,p);
 return error?{error}:{landscape:[...rows,f]};
}
export function landscapeCollision(p,rows){
 for(const f of rows){if(f.kind!=="fence"&&f.kind!=="shrub")continue;if(p.y>(f.kind==="fence"?1.15:.65))continue;
  const hw=f.kind==="shrub"?.35:f.rotation?.085:.5,hd=f.kind==="shrub"?.35:f.rotation?.5:.085;
  const x=p.x-f.x,z=p.z-f.z,a=hw+.23,b=hd+.23;
  if(Math.abs(x)>=a||Math.abs(z)>=b)continue;
  if(a-Math.abs(x)<b-Math.abs(z)){p.x=f.x+(x<0?-a:a);p.vx=0;}else{p.z=f.z+(z<0?-b:b);p.vz=0;}
 }
}
