
export const SERVICE_POLE={x:12,z:26,y:6.5};
export const METER_POINT={x:.31,y:.12,z:.065},SERVICE_POINT={x:.31,y:.30,z:.065};
export function serviceLive(p){return p?.meter===true&&p?.service===true&&p?.main===true;}
export function calculatePower(devices,cables,outlets,panels){
 const parents=new Map(),id=(d,c,k)=>d+"|"+c+"|"+k;
 function root(k){if(!parents.has(k))parents.set(k,k);let r=k;while(parents.get(r)!==r)r=parents.get(r);while(parents.get(k)!==k){let n=parents.get(k);parents.set(k,r);k=n;}return r;}
 function join(a,b){a=root(a);b=root(b);if(a!==b)parents.set(b,a);}
 const groups=new Map(),byCable=new Map(cables.map(c=>[c.id,c])),byDevice=new Map(devices.map(d=>[d.id,d]));
 for(const c of cables){for(const k of ["black","white","ground",...(c.type==="14/3"?["red"]:[])])join(id(c.a,c.id,k),id(c.b,c.id,k));for(const d of [c.a,c.b]){if(!groups.has(d))groups.set(d,[]);groups.get(d).push(c);}}
 function attach(d,ids,k){for(let i=1;i<ids.length;i++)join(id(d,ids[0],k),id(d,ids[i],k));}
 for(const o of outlets){const d=byDevice.get(o.deviceId),runs=(o.cableIds||[o.cableId]).filter(c=>byCable.has(c));if(!d||!runs.length)continue;attach(d.id,runs,"white");attach(d.id,runs,"ground");if(o.kind==="outlet")attach(d.id,runs,"black");else if(o.kind==="switch"&&o.variant==="three-way"){if(runs.includes(o.commonCableId)&&runs.includes(o.travelerCableId))join(id(d.id,o.commonCableId,"black"),id(d.id,o.travelerCableId,o.on?"red":"black"));}else if(o.kind==="switch"&&o.on)attach(d.id,runs,"black");}
 const sources=[],neutral=new Set(),hot=new Map(),faults={},powered=[],energized=[];
 for(const p of panels){if(!serviceLive(p))continue;for(const b of p.breakers){const c=byCable.get(b.cableId);if(!c||![c.a,c.b].includes(p.id))continue;neutral.add(root(id(p.id,c.id,"white")));if(!b.on||b.trip)continue;const r=root(id(p.id,c.id,"black")),s={panelId:p.id,slot:b.slot,amps:b.amps,root:r,key:p.id+":"+b.slot,watts:0};sources.push(s);if(!hot.has(r))hot.set(r,[]);hot.get(r).push(s);}}
 for(const [r,ss] of hot)if(ss.length>1)for(const s of ss)faults[s.key]="Multiple breaker feeds";
 for(const c of cables){if(!c.type.startsWith("14/"))continue;for(const k of ["black",...(c.type==="14/3"?["red"]:[])])for(const s of hot.get(root(id(c.a,c.id,k)))||[])if(s.amps>15)faults[s.key]="Undersized branch cable";}
 for(const o of outlets){const c=(o.cableIds||[o.cableId])[0];if(!byCable.has(c)||!["outlet","light"].includes(o.kind))continue;const ss=hot.get(root(id(o.deviceId,c,"black")))||[];if(!ss.length||!neutral.has(root(id(o.deviceId,c,"white"))))continue;if(o.kind==="light")for(const s of ss)s.watts+=60;powered.push({id:o.deviceId,sources:ss.map(s=>s.key)});}
 for(const s of sources)if(s.watts/120>s.amps)faults[s.key]="Simulated overload";
 for(const c of cables)if(["black",...(c.type==="14/3"?["red"]:[])].some(k=>(hot.get(root(id(c.a,c.id,k)))||[]).some(s=>!faults[s.key])))energized.push(c.id);
 const liveIds=powered.filter(o=>o.sources.some(k=>!faults[k])).map(o=>o.id),deviceStatus={};
 for(const d of devices){
  if(d.kind!=="light"&&d.kind!=="outlet"&&d.kind!=="switch")continue;
  const o=outlets.find(x=>x.deviceId===d.id),runs=(o?.cableIds||[o?.cableId]).filter(c=>byCable.has(c));
  if(!o){deviceStatus[d.id]="Installation incomplete";continue;}
  if(d.kind==="switch"){deviceStatus[d.id]=(o.on?"Switch ON":"Switch OFF")+(runs.some(c=>energized.includes(c))?" · live circuit":" · no live circuit");continue;}
  if(liveIds.includes(d.id)){deviceStatus[d.id]="Powered";continue;}
  if(!runs.length){deviceStatus[d.id]="No game connection";continue;}
  if(!panels.some(serviceLive)){deviceStatus[d.id]="Main power unavailable";continue;}
  const c=runs[0],ss=hot.get(root(id(d.id,c,"black")))||[];
  if(ss.length&&ss.every(s=>faults[s.key]))deviceStatus[d.id]="Circuit fault";
  else if(!ss.length)deviceStatus[d.id]="No active path · check game switch or circuit";
  else deviceStatus[d.id]="Incomplete game circuit";
 }
 return {powered:liveIds,energized,faults,deviceStatus,branches:sources.map(s=>({panelId:s.panelId,slot:s.slot,watts:s.watts,trip:faults[s.key]||null}))};
}
export function applyTrips(devices,cables,outlets,panels){let changed=false;const f=calculatePower(devices,cables,outlets,panels).faults;const next=panels.map(p=>({...p,breakers:p.breakers.map(b=>{const trip=f[p.id+":"+b.slot];if(!trip)return b;changed=true;return {...b,on:false,trip};})}));return {panels:changed?next:panels,changed};}
