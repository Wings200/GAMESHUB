
import {upperReady} from "./upper-wall-math.mjs";
import {wallLength,wallPoint,projectWall} from "./wall-math.mjs";
export const SERVICE_TYPES=[
 {id:"light",name:"Lighting module",group:"upperpower",stock:"uplight",symbol:"★"},
 {id:"outlet",name:"Power module",group:"upperpower",stock:"uppower",symbol:"ϟ"},
 {id:"water",name:"Water module",group:"upperwater",stock:"upwater",symbol:"●"},
 {id:"drain",name:"Drain module",group:"upperwater",stock:"updrain",symbol:"▼"}
];
export const moduleSpec=id=>SERVICE_TYPES.find(v=>v.id===id);
export const modulePoint=(w,t)=>wallPoint(w,t);
export function moduleCandidate(w,t,kind){
 if(!w||!moduleSpec(kind)||!Number.isFinite(t))return null;
 const pos=Math.round(t*4)/4;
 if(pos<.25||pos>wallLength(w)-.25||(w.openings||[]).some(o=>pos>=o.start-.2&&pos<=o.start+o.width+.2))return null;
 return {wallId:w.id,t:pos,kind};
}
export function readUpperServices(w,deck,walls){
 const rows=[];
 if(deck)for(const r of Array.isArray(w?.upperServices)?w.upperServices.slice(0,160):[]){
  const c=moduleCandidate(walls.find(v=>v.id===r?.wallId),r?.t,r?.kind);
  if(!c||c.t!==r.t||![1,2,3].includes(r.stage)||rows.some(v=>v.wallId===c.wallId&&Math.abs(v.t-c.t)<.45))continue;
  rows.push({...c,stage:r.stage});
 }
 return {upperServices:rows};
}
export function changeUpperService(w,deck,walls,b,p){
 if(!upperReady(deck,p))return {error:"Stand on the active upper deck"};
 const rows=readUpperServices(w,deck,walls).upperServices,wall=walls.find(v=>v.id===b.wallId),c=moduleCandidate(wall,b.t,b.kind);
 if(!c||projectWall(wall,p).d>3.6)return {error:"Aim at an unobstructed upstairs wall"};
 const q=modulePoint(wall,c.t);
 if(Math.hypot(q.x-p.x,q.z-p.z)>3.6)return {error:"Approach the module"};
 const old=rows.find(v=>v.wallId===c.wallId&&v.t===c.t);
 if(b.operation==="remove"){if(!old||old.kind!==c.kind)return {error:"No matching module"};return {upperServices:rows.filter(v=>v!==old)};}
 if(b.operation!=="advance")return {error:"Unknown service action"};
 if(old&&old.kind!==c.kind||!old&&rows.some(v=>v.wallId===c.wallId&&Math.abs(v.t-c.t)<.45))return {error:"Module space occupied"};
 if(old?.stage===3)return {error:"Module test complete"};
 if(!old&&rows.length>=160)return {error:"Module limit reached"};
 const stage=(old?.stage||0)+1;
 return {upperServices:[...rows.filter(v=>v!==old),{...c,stage}],cost:stage===1?{[moduleSpec(c.kind).stock]:1}:stage===2?{uplink:1}:{}};
}
export function serviceProgress(rows){const tested=rows.filter(v=>v.stage===3);return {power:["light","outlet"].filter(k=>tested.some(v=>v.kind===k)).length,water:["water","drain"].filter(k=>tested.some(v=>v.kind===k)).length,complete:tested.length,total:rows.length};}
