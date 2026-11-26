
import {pointKey,projection} from "./plumbing-math.mjs";
import {serviceFed} from "./utility-math.mjs";
import {status as heaterStatus,advance,CAPACITY} from "./heater-math.mjs";
import {fixturePosition,SPECS,refPoint} from "./fixture-math.mjs";
import {calculatePower} from "./power-math.mjs";
const key=p=>[p.x,p.y,p.z].map(n=>Math.round(n*1000)).join(","),dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),round=n=>Math.round(n*100)/100;
function graph(ctx,k){const adj=new Map(),pts=new Map(),degree=new Map(),edges=new Map();const add=(id,p)=>{if(!adj.has(id)){adj.set(id,new Set());degree.set(id,0);pts.set(id,p);}return id;};function join(a,b,directed=false){if(a===b)return;adj.get(a).add(b);if(!directed)adj.get(b).add(a);degree.set(a,degree.get(a)+1);degree.set(b,degree.get(b)+1);}
const list=k==="drain"?ctx.pipes:ctx.supply[k]||[],risers=ctx.risers[k]||[],ground=p=>add("ground:"+pointKey(p),{...p,y:-.3}),node=p=>add("top:"+key(p),p);
for(const e of list){const a=ground(e.a),b=ground(e.b);join(a,b,k==="drain");for(const r of risers)if(dist(r.point,projection(r.point,e.a,e.b))<.001){const top=node({...r.point,y:r.height});if(k==="drain")join(top,b,true);else{join(top,a);join(top,b);}}}
for(const e of ctx.lines.filter(e=>e.kind===k)){const a=node(e.points[0]),b=node(e.points.at(-1));join(a,b,k==="drain");edges.set(e.id,[a,b]);}
const ref=r=>{if(r?.source==="riser"){const v=risers.find(v=>v.id===r.id);return v?"top:"+key({...v.point,y:v.height}):null;}return edges.get(r?.id)?.[r.end||0]||null;};
function reach(seeds,reverse=false){const seen=new Set(seeds.filter(k=>adj.has(k))),q=[...seen];let a=adj;if(reverse){a=new Map([...adj.keys()].map(k=>[k,new Set()]));for(const [k,s] of adj)for(const v of s)a.get(v).add(k);}for(let i=0;i<q.length;i++)for(const v of a.get(q[i])||[])if(!seen.has(v)){seen.add(v);q.push(v);}return seen;}
return {adj,pts,degree,ref,reach,edges};}
export function waterState(ctx,now=Date.now()){
 const cold=graph(ctx,"cold"),hot=graph(ctx,"hot"),drain=graph(ctx,"drain"),u=ctx.utility||{},live=!!u.water&&u.meter&&u.valve,cf=cold.reach(live?["ground:"+u.water]:[]),df=drain.reach(u.sewer?["ground:"+u.sewer]:[],true),power=ctx.power||calculatePower(ctx.devices,ctx.cables,ctx.outlets,ctx.panels),heaters={},hf=new Set(),hotOwners=new Map(),used={cold:new Set(),hot:new Set(),drain:new Set()};
 for(const h of ctx.heaters){const inlet=cold.ref(h.cold),outlet=hot.ref(h.hot);if(inlet)used.cold.add(inlet);if(outlet)used.hot.add(outlet);const s=heaterStatus(h,{...ctx,waterService:live,power}),water=live&&h.valve&&cf.has(inlet),ready=water&&s.electric&&!!outlet;heaters[h.id]={water,electric:s.electric,ready,reason:!water?s.reason:!s.electric?"No dedicated electrical power":!outlet?"Connect hot outlet":"Ready",litres:h.litres,temp:h.temp};if(water&&h.litres>=CAPACITY&&outlet)for(const n of hot.reach([outlet])){hf.add(n);if(!hotOwners.has(n))hotOwners.set(n,h.id);}}
 for(const f of ctx.fixtures)for(const k of SPECS[f.kind].ports){const id=({cold,hot,drain})[k].ref(f[k]);if(id)used[k].add(id);}
 const leaks=[];for(const [kind,g,fed] of [["cold",cold,cf],["hot",hot,hf]]){for(const id of fed){if(id==="ground:"+u.water||used[kind].has(id)||g.degree.get(id)!==1)continue;leaks.push({id:kind+":"+id,kind,point:g.pts.get(id),rate:8});}}
 const fixtures={};let demand=leaks.length*8;
 for(const f of ctx.fixtures){const c=cold.ref(f.cold),h=hot.ref(f.hot),d=drain.ref(f.drain),coldOn=cf.has(c),hotOn=hf.has(h),drains=df.has(d),owner=hotOwners.get(h),active=f.kind==="toilet"?Number(f.flushUntil)>now:f.open===true,rate=f.kind==="toilet"?12:f.kind==="shower"?9:6,flow=active&&(coldOn||hotOn)?rate:0;demand+=flow;fixtures[f.id]={cold:coldOn,hot:hotOn,drain:drains,active,flow,heaterId:owner||null,temp:hotOn?(coldOn?(15+heaters[owner].temp)/2:heaters[owner].temp):15,overflow:flow>0&&!drains};}
 const pressure=live?Math.max(5,Math.min(60,60-demand*.85)):0,scale=pressure/60;for(const s of Object.values(fixtures))s.flow=round(s.flow*scale);for(const l of leaks)l.rate=round(l.rate*scale);return {pressure:round(pressure),leaks,fixtures,heaters,demand:round(demand*scale)};
}
export function waterTick(ctx,now,seconds){const s=waterState(ctx,now),hs=ctx.heaters.map(h=>{const status=s.heaters[h.id],draw=Object.values(s.fixtures).filter(f=>f.heaterId===h.id).reduce((n,f)=>n+f.flow*(f.cold?.5:1),0)*seconds/60,next=advance(h,status,seconds);if(draw>0)next.temp=round(Math.max(15,next.temp-(next.temp-15)*Math.min(1,draw/CAPACITY)));return next;});return hs;}
