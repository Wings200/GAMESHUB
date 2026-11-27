
import {tileBounds} from "./terrain.mjs";
export const ROOF_STAGES=[{id:"joist",name:"Ceiling framing",stock:"ceilingjoist"},{id:"rafter",name:"Roof framing",stock:"roofrafter"},{id:"deck",name:"Roof decking",stock:"roofdeck"},{id:"shingle",name:"Roof shingles",stock:"roofshingle"},{id:"ceiling",name:"Ceiling panels",stock:"ceilingpanel"},{id:"insulate",name:"Roof insulation",stock:"insulation"},{id:"fascia",name:"Fascia",stock:"fascia"},{id:"soffit",name:"Soffits",stock:"soffit"},{id:"gutter",name:"Gutters",stock:"gutter"}];
export function roofPlan(r,walls){
 if(!r||!Array.isArray(walls)||walls.length<4)return null;
 const ps=walls.flatMap(w=>[w.a,w.b]),x1=Math.min(...ps.map(p=>p.x)),x2=Math.max(...ps.map(p=>p.x)),z1=Math.min(...ps.map(p=>p.z)),z2=Math.max(...ps.map(p=>p.z));if(x2-x1<1||z2-z1<1)return null;
 const edges=[["z",z1,x1,x2],["z",z2,x1,x2],["x",x1,z1,z2],["x",x2,z1,z2]],height=walls[0].height;
 for(const [axis,fixed,lo,hi] of edges){const along=axis==="x"?"z":"x",runs=walls.filter(w=>Math.abs(w.a[axis]-fixed)<.18&&Math.abs(w.b[axis]-fixed)<.18&&Math.abs(w.height-height)<.12).map(w=>[Math.min(w.a[along],w.b[along]),Math.max(w.a[along],w.b[along])]).sort((a,b)=>a[0]-b[0]);let end=lo;for(const [a,b] of runs){if(a>end+.15)break;end=Math.max(end,b);}if(end<hi-.15)return null;}
 return {x1,x2,z1,z2,height,axis:x2-x1>=z2-z1?"z":"x"};
}
export function roofTile(r,plan,id){const b=tileBounds(r,id);if(!b||!plan)return null;const t={x1:Math.max(b.x1,plan.x1),x2:Math.min(b.x2,plan.x2),z1:Math.max(b.z1,plan.z1),z2:Math.min(b.z2,plan.z2)};return t.x2-t.x1>.001&&t.z2-t.z1>.001?t:null;}
export function roofTiles(r,plan){if(!plan)return [];const a=[];for(let j=0;j<Math.ceil(r.z2-r.z1-1e-8);j++)for(let i=0;i<Math.ceil(r.x2-r.x1-1e-8);i++){const id=i+j*48;if(roofTile(r,plan,id))a.push(id);}return a;}
export function roofY(plan,x,z){const lo=plan.axis==="x"?plan.x1:plan.z1,hi=plan.axis==="x"?plan.x2:plan.z2,q=plan.axis==="x"?x:z;return .02+plan.height+.20+.35*Math.max(0,Math.min(q-lo,hi-q));}
export const ROOF_DETAIL=["fascia","soffit","gutter"];
export function roofEdges(b,p,kind="fascia"){
 if(!b||!p)return [];
 const e=.001,edges=[];
 if(Math.abs(b.x1-p.x1)<e)edges.push({axis:"x",side:-1,fixed:p.x1,lo:b.z1,hi:b.z2});
 if(Math.abs(b.x2-p.x2)<e)edges.push({axis:"x",side:1,fixed:p.x2,lo:b.z1,hi:b.z2});
 if(Math.abs(b.z1-p.z1)<e)edges.push({axis:"z",side:-1,fixed:p.z1,lo:b.x1,hi:b.x2});
 if(Math.abs(b.z2-p.z2)<e)edges.push({axis:"z",side:1,fixed:p.z2,lo:b.x1,hi:b.x2});
 return kind==="fascia"?edges:edges.filter(v=>v.axis===p.axis);
}
export function roofDetailReady(row,b,p,kind){
 if(!row||!ROOF_DETAIL.includes(kind)||!roofEdges(b,p,kind).length)return false;
 return kind==="fascia"?row.stage>=3:kind==="soffit"?row.stage>=3&&row.fascia===true:row.stage>=4&&row.fascia===true;
}
export function readRoof(w,r,walls){const plan=roofPlan(r,walls),allowed=new Set(roofTiles(r,plan)),seen=new Set(),roof=[];for(const f of Array.isArray(w?.roof)?w.roof:[]){if(!allowed.has(f?.tile)||seen.has(f.tile)||!Number.isInteger(f.stage)||f.stage<1||f.stage>5)continue;seen.add(f.tile);const b=roofTile(r,plan,f.tile),row={tile:f.tile,stage:f.stage,insulated:f.insulated===true};
 for(const k of ROOF_DETAIL)row[k]=f[k]===true&&roofDetailReady(row,b,plan,k);
 roof.push(row);}return {roof:roof.sort((a,b)=>a.tile-b.tile),roofRevision:Number.isSafeInteger(w?.roofRevision)&&w.roofRevision>=0?w.roofRevision:0,roofPlan:plan};}
export function changeRoof(w,r,walls,tile,kind,remove,p,now){const f=readRoof(w,r,walls),b=roofTile(r,f.roofPlan,tile),index=ROOF_STAGES.findIndex(x=>x.id===kind),old=f.roof.find(x=>x.tile===tile),stage=old?.stage||0;if(!f.roofPlan)return {error:"Complete a rectangular perimeter of equal-height walls first"};if(!b||!p||Math.hypot(p.x-(b.x1+b.x2)/2,p.z-(b.z1+b.z2)/2)>5)return {error:"Approach the overhead square"};if(!w.cureAt||now<w.cureAt)return {error:"Cured foundation required"};if(ROOF_DETAIL.includes(kind)){
 if(!roofEdges(b,f.roofPlan,kind).length)return {error:kind==="fascia"?"Aim at a perimeter roof section":"Aim at a low roof edge"};
 if(!old||!roofDetailReady(old,b,f.roofPlan,kind))return {error:kind==="fascia"?"Install roof decking first":kind==="soffit"?"Install fascia first":"Install shingles and fascia first"};
 if(!!old[kind]===!remove)return {error:remove?"No detail installed here":"Detail already installed"};
 if(remove&&kind==="fascia"&&(old.soffit||old.gutter))return {error:"Remove soffits and gutters first"};
 return {roof:f.roof.map(q=>q.tile===tile?{...q,[kind]:!remove}:q)};
 }if(kind==="insulate"){if(!old||stage<1)return {error:"Build overhead framing first"};if(!!old.insulated===!remove)return {error:remove?"No roof insulation here":"Roof already insulated"};return {roof:f.roof.map(q=>q.tile===tile?{...q,insulated:!remove}:q)};}if(remove&&stage===4&&old?.gutter)return {error:"Remove gutters before shingles"};
 if(remove&&stage===3&&old?.fascia)return {error:"Remove roof edge details first"};
 if(remove&&stage===1&&old?.insulated)return {error:"Remove roof insulation first"};if(index<0||(!remove&&index!==stage)||(remove&&index!==stage-1))return {error:"Complete stages in order, or remove the top stage first"};const next=stage+(remove?-1:1);return {roof:[...f.roof.filter(x=>x.tile!==tile),...(next?[{...old,tile,stage:next,insulated:old?.insulated===true}]:[])].sort((a,b)=>a.tile-b.tile)};}
