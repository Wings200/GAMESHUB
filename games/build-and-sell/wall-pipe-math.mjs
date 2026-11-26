
import {wallLength,wallPoint,projectWall,PLATE,STUD} from "./wall-math.mjs";
import {fullStuds} from "./electrical-math.mjs";
import {supplyNetwork,projection,pointKey} from "./plumbing-math.mjs";
const round=n=>Math.round(n*10000)/10000;
export const WALL_PIPE_KINDS=["cold","hot"],PIPE_RADIUS=.010;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const key=p=>[round(p.x),round(p.y),round(p.z)].join(",");
const same=(a,b)=>distance(a,b)<.002;
export function pipeWallPoint(w,t,y){const p=wallPoint(w,t);return {...p,y:round(y+.02)};}
function clean(w,p){if(!w||!p||p.wallId!==w.id||!Number.isFinite(p.t)||!Number.isFinite(p.y)||p.t<.055||p.t>wallLength(w)-.055||p.y<.12||p.y>w.height-.13)return null;return {wallId:w.id,t:round(p.t),y:round(p.y)};}
export function pickWallPipe(w,hit,origin,dir,grid,risers,lines,kind){if(!w||!hit)return null;const l=wallLength(w),dx=(w.b.x-w.a.x)/l,dz=(w.b.z-w.a.z)/l,den=dir.x*dz-dir.z*dx;if(Math.abs(den)<.000001)return null;const t=((w.a.x-origin.x)*dz-(w.a.z-origin.z)*dx)/den,y=origin.y+t*dir.y-.02,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));let p={wallId:w.id,t:clamp(grid?Math.round(hit.t/.05)*.05:hit.t,.055,l-.055),y:clamp(grid?Math.round(y/.05)*.05:y,.12,w.height-.13)},best=.18;
 for(const e of lines.filter(e=>e.kind===kind))for(const q of [e.a,e.b])if(q.wallId===w.id&&Math.hypot(q.t-hit.t,q.y-y)<best){best=Math.hypot(q.t-hit.t,q.y-y);p={...q};}
 for(const r of risers){const q=projectWall(w,r.point),d=Math.hypot(q.t-hit.t,r.height-.02-y);if(q.d<=.30&&d<best&&q.t>=.055&&q.t<=l-.055&&r.height-.02>=.12&&r.height-.02<=w.height-.13){best=d;p={wallId:w.id,t:q.t,y:r.height-.02};}}
 return clean(w,p);
}
function open(w,a,b,y1,y2){const lo=Math.min(a,b),hi=Math.max(a,b),bottom=Math.min(y1,y2),top=Math.max(y1,y2);return (w.openings||[]).some(o=>hi>=o.start-.07&&lo<=o.start+o.width+.07&&top>=(o.kind==="door"?0:.82)&&bottom<=2.19);}
export function routeWallPipe(walls,a0,b0,height,kind,risers=[]){if(!WALL_PIPE_KINDS.includes(kind))return {error:"Choose hot or cold supply kit"};const w=walls.find(w=>w.id===a0?.wallId),a=clean(w,a0),b=clean(w,b0);if(!a||!b)return {error:"Select two points on the same framed wall"};if(!Number.isFinite(height)||height<.12||height>w.height-.13||Math.hypot(a.t-b.t,a.y-b.y)<.12)return {error:"Choose a longer run and valid route height"};height=round(height);
 const vertical=Math.abs(a.t-b.t)<.005;if(vertical)height=a.y;
 if(open(w,a.t,a.t,a.y,height)||open(w,a.t,b.t,height,height)||open(w,b.t,b.t,height,b.y))return {error:"Route clear of doors and windows"};
 const studs=fullStuds(w);if([a,b].some(p=>Math.abs(p.y-height)>.02&&studs.some(t=>Math.abs(t-p.t)<STUD/2+PIPE_RADIUS+.006)))return {error:"Move the vertical pipe into a stud bay"};
 const pts=[pipeWallPoint(w,a.t,a.y),pipeWallPoint(w,a.t,height),pipeWallPoint(w,b.t,height),pipeWallPoint(w,b.t,b.y)].filter((p,i,arr)=>!i||!same(p,arr[i-1]));
 const tap=p=>risers.find(r=>Math.hypot(r.point.x-p.x,r.point.z-p.z)<=.30&&Math.abs(r.height-p.y)<.025);
 const ra=tap(pts[0]),rb=tap(pts.at(-1)),links=[];if(ra){links.push(ra.id);const q={...ra.point,y:ra.height};if(!same(q,pts[0]))pts.unshift(q);}if(rb){links.push(rb.id);const q={...rb.point,y:rb.height};if(!same(q,pts.at(-1)))pts.push(q);}
 const holes=vertical?[]:studs.filter(t=>t>=Math.min(a.t,b.t)-STUD/2&&t<=Math.max(a.t,b.t)+STUD/2).map(t=>({wallId:w.id,t,y:height,radius:.014}));
 const length=pts.slice(1).reduce((n,p,i)=>n+distance(p,pts[i]),0);
 return {pipe:{kind,a,b,height,points:pts,holes,links:[...new Set(links)],length:round(length)}};
}
function overlap(a,b){for(let i=1;i<a.points.length;i++)for(let j=1;j<b.points.length;j++){const p=a.points[i-1],q=a.points[i],r=b.points[j-1],s=b.points[j];if((same(p,r)&&same(q,s))||(same(p,s)&&same(q,r)))return true;const u={x:q.x-p.x,y:q.y-p.y,z:q.z-p.z},v={x:s.x-r.x,y:s.y-r.y,z:s.z-r.z},l=distance(p,q),ll=distance(r,s);if(l<.001||ll<.001)continue;const dot=(u.x*v.x+u.y*v.y+u.z*v.z)/(l*ll);if(Math.abs(dot)<.999)continue;const f=x=>((x.x-p.x)*u.x+(x.y-p.y)*u.y+(x.z-p.z)*u.z)/l,fr=f(r),fs=f(s),off=distance(r,{x:p.x+u.x*fr/l,y:p.y+u.y*fr/l,z:p.z+u.z*fr/l});if(off<.025&&Math.min(l,Math.max(fr,fs))-Math.max(0,Math.min(fr,fs))>.005)return true;}return false;}
export function addWallPipe(walls,lines,risers,cables,a,b,height,kind,p,id="preview"){const q=routeWallPipe(walls,a,b,height,kind,risers[kind]||[]);if(q.error)return q;const pipe={id,...q.pipe},end=pipe.points.at(-1);if(!p||Math.hypot(p.x-end.x,p.z-end.z)>3.5)return {error:"Move closer to the destination"};if(lines.length>=240||lines.some(e=>overlap(e,pipe)))return {error:"Pipe overlaps another run"};if(pipe.holes.some(h=>cables.some(c=>c.holes.some(x=>x.wallId===h.wallId&&Math.abs(x.t-h.t)<.02&&Math.abs(x.y-h.y)<.045))))return {error:"Choose a route height clear of electrical cable holes"};return {wallPipes:[...lines,pipe],pipe};}
export function readWallPipes(w,walls,risers){const wallPipes=[];for(const e of Array.isArray(w?.wallPipes)?w.wallPipes.slice(0,240):[]){if(typeof e?.id!=="string"||wallPipes.some(p=>p.id===e.id))continue;const q=routeWallPipe(walls,e.a,e.b,e.height,e.kind,risers[e.kind]||[]);if(!q.error)wallPipes.push({id:e.id,...q.pipe});}return {wallPipes,wallPipeRevision:Number.isSafeInteger(w?.wallPipeRevision)&&w.wallPipeRevision>=0?w.wallPipeRevision:0};}
export function removeWallPipe(lines,id,p){const e=lines.find(e=>e.id===id);if(!e||!p||!e.points.some(q=>Math.hypot(p.x-q.x,p.z-q.z)<=3.5))return null;return lines.filter(q=>q!==e);}
export function pickRun(lines,kind,o,d){let hit=null,best=.09;for(const e of lines.filter(e=>e.kind===kind))for(let i=1;i<e.points.length;i++){const a=e.points[i-1],b=e.points[i],n=Math.max(1,Math.ceil(distance(a,b)/.05));for(let j=0;j<=n;j++){const f=j/n,x=a.x+(b.x-a.x)*f-o.x,y=a.y+(b.y-a.y)*f-o.y,z=a.z+(b.z-a.z)*f-o.z,t=x*d.x+y*d.y+z*d.z;if(t<0||t>4)continue;const v=Math.hypot(x-t*d.x,y-t*d.y,z-t*d.z);if(v<best){best=v;hit=e;}}}return hit;}
export function connectedWallPipes(layout,supply,risers,lines,kind){const net=supplyNetwork(supply[kind]||[],layout),fed=new Set(),nodes=new Set();for(const r of risers[kind]||[]){if((supply[kind]||[]).some(e=>net.fed.has(pointKey(e.a))&&Math.hypot(projection(r.point,e.a,e.b).x-r.point.x,projection(r.point,e.a,e.b).z-r.point.z)<.001))nodes.add(key({...r.point,y:r.height}));}let change=true;while(change){change=false;for(const e of lines.filter(e=>e.kind===kind))if(!fed.has(e.id)&&[e.points[0],e.points.at(-1)].some(p=>nodes.has(key(p)))){fed.add(e.id);nodes.add(key(e.points[0]));nodes.add(key(e.points.at(-1)));change=true;}}return fed;}
