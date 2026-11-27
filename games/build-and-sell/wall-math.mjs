
export const WALL_THICKNESS=.14,STUD=.038,PLATE=.038,MAX_WALLS=160,WALL_REACH=8;
const round=n=>Math.round(n*10000)/10000;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const wallLength=w=>Math.hypot(w.b.x-w.a.x,w.b.z-w.a.z);
export const wallPoint=(w,t)=>({x:w.a.x+(w.b.x-w.a.x)*t/wallLength(w),z:w.a.z+(w.b.z-w.a.z)*t/wallLength(w)});
export function cleanWallPoint(r,p){if(!r||!p||!["x","z"].every(k=>typeof p[k]==="number"&&Number.isFinite(p[k]))||p.x<r.x1-.001||p.x>r.x2+.001||p.z<r.z1-.001||p.z>r.z2+.001)return null;return {x:round(clamp(p.x,r.x1+.07,r.x2-.07)),z:round(clamp(p.z,r.z1+.07,r.z2-.07))};}
export function projectWall(w,p){const l=wallLength(w),dx=(w.b.x-w.a.x)/l,dz=(w.b.z-w.a.z)/l,t=clamp((p.x-w.a.x)*dx+(p.z-w.a.z)*dz,0,l),q=wallPoint(w,t);return {t,d:Math.hypot(q.x-p.x,q.z-p.z),point:q};}
export function snapWall(r,p,walls,grid=true,first=null){if(!r||!p)return null;const q=cleanWallPoint(r,{x:clamp(p.x,r.x1,r.x2),z:clamp(p.z,r.z1,r.z2)});if(!q||Math.hypot(q.x-p.x,q.z-p.z)>.45)return null;let best=.23,hit=null;for(const w of walls){for(const e of [w.a,w.b]){const d=Math.hypot(e.x-q.x,e.z-q.z);if(d<best){best=d;hit=e;}}}if(hit)return {...hit};for(const w of walls){const v=projectWall(w,q);if(v.d<best){best=v.d;hit=v.point;}}if(hit)return cleanWallPoint(r,hit);if(grid){q.x=round(r.x1+.07+Math.round((q.x-r.x1-.07)/.25)*.25);q.z=round(r.z1+.07+Math.round((q.z-r.z1-.07)/.25)*.25);}for(const [k,lo,hi] of [["x",r.x1+.07,r.x2-.07],["z",r.z1+.07,r.z2-.07]]){if(Math.abs(p[k]-lo)<.22)q[k]=lo;else if(Math.abs(p[k]-hi)<.22)q[k]=hi;q[k]=clamp(q[k],lo,hi);}if(first&&grid){if(Math.abs(q.x-first.x)<.24)q.x=first.x;if(Math.abs(q.z-first.z)<.24)q.z=first.z;}return cleanWallPoint(r,q);}
export function validOpening(w,o){const l=wallLength(w);return o&&["door","window"].includes(o.kind)&&Number.isFinite(o.start)&&Number.isFinite(o.width)&&o.width>=.6&&o.width<=2.4&&o.start>=.12&&o.start+o.width<=l-.12&&w.height>=(o.kind==="door"?2.12:2.05);}
export function readWalls(w,r){const walls=[];if(r&&Array.isArray(w?.walls))for(const x of w.walls.slice(0,MAX_WALLS)){const a=cleanWallPoint(r,x?.a),b=cleanWallPoint(r,x?.b);if(!a||!b||typeof x.id!=="string"||x.id.length>80||walls.some(y=>y.id===x.id)||!Number.isFinite(x.height)||x.height<2.1||x.height>4)continue;const v={id:x.id,a,b,height:x.height,openings:[]};if(wallLength(v)<.45||wallLength(v)>24)continue;for(const o of Array.isArray(x.openings)?x.openings.slice(0,40):[])if(validOpening(v,o)&&!v.openings.some(q=>o.start<q.start+q.width+.08&&o.start+o.width>q.start-.08))v.openings.push({kind:o.kind,start:o.start,width:o.width});v.sheathing=cleanSheathing(v,x.sheathing);v.wrap=cleanSheathing(v,x.wrap).filter(k=>v.sheathing.includes(k));v.insulation=cleanInsulation(v,x.insulation);v.drywall=cleanDrywall(v,x.drywall);walls.push(v);}return {walls,wallRevision:Number.isSafeInteger(w?.wallRevision)&&w.wallRevision>=0?w.wallRevision:0,lastWall:w?.lastWall&&typeof w.lastWall.actor==="string"?w.lastWall:null};}
const cross=(a,b,c)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
function overlap(w,a,b){const dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz),s=cross(a,b,w.a)/l,t=cross(a,b,w.b)/l;if(Math.abs(s)>.035||Math.abs(t)>.035)return false;const f=p=>((p.x-a.x)*dx+(p.z-a.z)*dz)/l;return Math.min(l,Math.max(f(w.a),f(w.b)))-Math.max(0,Math.min(f(w.a),f(w.b)))>.04;}
export function addWall(r,walls,a0,b0,height,p,id="preview"){const a=cleanWallPoint(r,a0),b=cleanWallPoint(r,b0);if(!a||!b||!Number.isFinite(height)||height<2.1||height>4||!p||!Number.isFinite(p.x)||!Number.isFinite(p.z))return {error:"Choose valid slab points and height"};const w={id,a,b,height:round(height),openings:[]},l=wallLength(w);if(l<.45||l>24)return {error:"Wall length must be 0.45–24 m"};if(Math.hypot(b.x-p.x,b.z-p.z)>WALL_REACH||Math.hypot(a.x-p.x,a.z-p.z)>25)return {error:"Move closer to the endpoint"};if(projectWall(w,p).d<.27)return {error:"Step away from the wall line"};if(walls.length>=MAX_WALLS||walls.some(q=>overlap(q,a,b)))return {error:"Wall overlaps an existing wall or limit reached"};return {walls:[...walls,w],wall:w};}
export function rayWall(origin,dir,walls,reach=WALL_REACH){let hit=null,best=reach;for(const w of walls){const dx=w.b.x-w.a.x,dz=w.b.z-w.a.z,den=dir.x*dz-dir.z*dx;if(Math.abs(den)<.000001)continue;const x=w.a.x-origin.x,z=w.a.z-origin.z,t=(x*dz-z*dx)/den,u=(x*dir.z-z*dir.x)/den;if(t<0||t>best||u<0||u>1)continue;const y=origin.y+dir.y*t-.02;if(y<-.06||y>w.height+.06)continue;best=t;hit={wall:w,t:u*wallLength(w),point:wallPoint(w,u*wallLength(w)),y};}return hit;}
export function openingAt(w,t,kind,width,snap=true){const start=round(snap?Math.round((t-width/2)/.05)*.05:t-width/2);return {kind,start,width:round(width)};}
export function changeOpening(walls,id,opening,p,remove=false){const w=walls.find(x=>x.id===id);if(!w||!p||projectWall(w,p).d>WALL_REACH)return {error:"Approach a wall"};if(w.sheathing?.length||w.insulation?.length||w.drywall?.length)return {error:"Remove wall covering and insulation before editing openings"};if(remove){const i=w.openings.findIndex(o=>Math.abs(o.start-opening?.start)<.001);if(i<0)return {error:"No opening here"};return {walls:walls.map(x=>x===w?{...w,openings:w.openings.filter((_,j)=>i!==j)}:x)};}if(!validOpening(w,opening)||w.openings.some(o=>opening.start<o.start+o.width+.08&&opening.start+opening.width>o.start-.08))return {error:"Opening must fit between corners and other openings"};return {walls:walls.map(x=>x===w?{...w,openings:[...w.openings,{kind:opening.kind,start:round(opening.start),width:round(opening.width)}]}:x)};}
export function removeWall(walls,id,p){const w=walls.find(x=>x.id===id);return w&&p&&!w.sheathing?.length&&!w.insulation?.length&&!w.drywall?.length&&projectWall(w,p).d<=WALL_REACH?walls.filter(x=>x!==w):null;}
export function solidRuns(w){const doors=w.openings.filter(o=>o.kind==="door").sort((a,b)=>a.start-b.start),out=[];let t=0;for(const o of doors){if(o.start>t)out.push([t,o.start]);t=o.start+o.width;}if(t<wallLength(w))out.push([t,wallLength(w)]);return out;}
export function wallCollision(p,previous,walls){const radius=.23+WALL_THICKNESS/2;if(!walls.length)return;const target={x:p.x,z:p.z};p.x=previous.x;p.z=previous.z;const n=Math.max(1,Math.ceil(Math.hypot(target.x-p.x,target.z-p.z)/.08)),dx=(target.x-p.x)/n,dz=(target.z-p.z)/n;for(let k=0;k<n;k++){p.x+=dx;p.z+=dz;for(let pass=0;pass<2;pass++)for(const w of walls){if(p.y>w.height)continue;const l=wallLength(w),ux=(w.b.x-w.a.x)/l,uz=(w.b.z-w.a.z)/l;for(const [a,b] of solidRuns(w)){const t=clamp((p.x-w.a.x)*ux+(p.z-w.a.z)*uz,a,b),x=w.a.x+ux*t,z=w.a.z+uz*t;let nx=p.x-x,nz=p.z-z,d=Math.hypot(nx,nz);if(d>=radius)continue;if(d<.00001){const side=(previous.x-x)*(-uz)+(previous.z-z)*ux>=0?1:-1;nx=-uz*side;nz=ux*side;d=1;p.x=x+nx*radius;p.z=z+nz*radius;}else{p.x=x+nx/d*radius;p.z=z+nz/d*radius;}const ux2=nx/d,uz2=nz/d,dot=p.vx*ux2+p.vz*uz2;if(dot<0){p.vx-=dot*ux2;p.vz-=dot*uz2;}}}}p.speed=Math.hypot(p.vx,p.vz);}

export const SHEATH_WIDTH=1.2;
export function sheathingRects(w,i){
 const a=i*SHEATH_WIDTH,b=Math.min(wallLength(w),a+SHEATH_WIDTH);if(!Number.isInteger(i)||i<0||b-a<.001)return [];
 let rects=[[a,b,0,w.height]];
 for(const o of w.openings||[]){const x=o.start,X=x+o.width,y=o.kind==="door"?0:.918,Y=o.kind==="door"?2.04:2;const next=[];
 for(const [l,r,d,t] of rects){const L=Math.max(l,x),R=Math.min(r,X),D=Math.max(d,y),T=Math.min(t,Y);if(L>=R||D>=T){next.push([l,r,d,t]);continue;}next.push([l,L,d,t],[R,r,d,t],[L,R,d,D],[L,R,T,t]);}rects=next.filter(([l,r,d,t])=>r-l>.001&&t-d>.001);}
 return rects;
}
export function cleanSheathing(w,raw){const set=new Set();for(const k of Array.isArray(raw)?raw.slice(0,80):[]){if(typeof k!=="string"||!/^[-+]\d+$/.test(k))continue;const i=Number(k.slice(1));if(sheathingRects(w,i).length)set.add(k);}return [...set].sort();}
export function sheathingSide(w,p){return (p.x-w.a.x)*-(w.b.z-w.a.z)+(p.z-w.a.z)*(w.b.x-w.a.x)>=0?"+":"-";}
export function sheathingPick(hit,p){if(!hit||!p)return null;const w=hit.wall,i=Math.min(Math.ceil(wallLength(w)/SHEATH_WIDTH)-1,Math.max(0,Math.floor(hit.t/SHEATH_WIDTH)));if(!sheathingRects(w,i).some(([a,b,d,t])=>hit.t>=a-.001&&hit.t<=b+.001&&hit.y>=d-.001&&hit.y<=t+.001))return null;return {wallId:w.id,key:sheathingSide(w,p)+i};}
export function changeSheathing(walls,id,key,p,remove=false){const w=walls.find(x=>x.id===id);if(!w||!p||typeof key!=="string"||!/^[-+]\d+$/.test(key)||key[0]!==sheathingSide(w,p)||!sheathingRects(w,Number(key.slice(1))).length)return {error:"Aim at a valid wall panel on your side"};const a=Number(key.slice(1))*SHEATH_WIDTH,b=Math.min(a+SHEATH_WIDTH,wallLength(w)),q=wallPoint(w,(a+b)/2);if(Math.hypot(q.x-p.x,q.z-p.z)>WALL_REACH)return {error:"Move closer to this panel"};const set=new Set(w.sheathing||[]);if(!remove&&drywallRecord(w,key))return {error:"Remove drywall from this section first"};if(remove&&(w.wrap||[]).includes(key))return {error:"Remove house wrap from this panel first"};if(remove?!set.has(key):set.has(key))return {error:remove?"No panel installed here":"Panel already installed"};if(remove)set.delete(key);else set.add(key);return {walls:walls.map(x=>x===w?{...w,sheathing:[...set].sort()}:x)};}

export function changeWrap(walls,id,key,p,remove=false){
 const w=walls.find(x=>x.id===id);if(!w||!p||typeof key!=="string"||!/^[-+]\d+$/.test(key)||key[0]!==sheathingSide(w,p)||!sheathingRects(w,Number(key.slice(1))).length)return {error:"Aim at a valid panel on your side"};
 const a=Number(key.slice(1))*SHEATH_WIDTH,b=Math.min(a+SHEATH_WIDTH,wallLength(w)),q=wallPoint(w,(a+b)/2);
 if(Math.hypot(q.x-p.x,q.z-p.z)>WALL_REACH)return {error:"Move closer to this panel"};
 if(!(w.sheathing||[]).includes(key))return {error:"Install OSB sheathing on this face first"};
 const set=new Set(w.wrap||[]);if(remove?!set.has(key):set.has(key))return {error:remove?"No house wrap here":"House wrap already installed"};
 if(remove)set.delete(key);else set.add(key);return {walls:walls.map(x=>x===w?{...w,wrap:[...set].sort()}:x)};
}

export function insulationBays(w){
 const l=wallLength(w),h=w.height,os=w.openings||[],members=[];
 const member=(a,b,d,t)=>{a=Math.max(0,a);b=Math.min(l,b);d=Math.max(PLATE,d);t=Math.min(h-2*PLATE,t);if(b-a>.001&&t-d>.001)members.push([a,b,d,t]);};
 const full=x=>member(x-STUD/2,x+STUD/2,PLATE,h-2*PLATE);
 const studs=[STUD/2,l-STUD/2];for(let x=.4064;x<l-STUD;x+=.4064)studs.push(x);
 for(const x of studs){const o=os.find(o=>x>o.start-STUD&&x<o.start+o.width+STUD);if(!o)full(x);else{const top=o.kind==="door"?2.04:2;member(x-STUD/2,x+STUD/2,top+.105,h-2*PLATE);if(o.kind==="window")member(x-STUD/2,x+STUD/2,PLATE,.88);}}
 for(const o of os){const a=o.start,b=a+o.width,top=o.kind==="door"?2.04:2;full(a-1.5*STUD);full(b+1.5*STUD);member(a-STUD,a,PLATE,top);member(b,b+STUD,PLATE,top);member(a-STUD,b+STUD,top,top+.105);member(a,b,o.kind==="door"?0:.88,top);if(o.kind==="window")member(a,b,.88,.918);}
 const ys=[...new Set([PLATE,h-2*PLATE,...members.flatMap(m=>[m[2],m[3]])])].sort((a,b)=>a-b),out=[];
 for(let j=0;j<ys.length-1;j++){const d=ys[j],t=ys[j+1];if(t-d<.001)continue;const mid=(d+t)/2,blocks=members.filter(m=>m[2]<mid&&m[3]>mid).sort((a,b)=>a[0]-b[0]);let x=0;const spans=[];for(const m of blocks){if(m[0]-x>.001)spans.push([x,m[0]]);x=Math.max(x,m[1]);}if(l-x>.001)spans.push([x,l]);for(const [a,b] of spans){const prev=out.find(q=>Math.abs(q[0]-a)<.00001&&Math.abs(q[1]-b)<.00001&&Math.abs(q[3]-d)<.00001);if(prev)prev[3]=t;else out.push([a,b,d,t]);}}
 return out.filter(([a,b,d,t])=>b-a>.025&&t-d>.025).sort((a,b)=>a[0]-b[0]||a[2]-b[2]||a[1]-b[1]);
}
export function cleanInsulation(w,raw){const n=insulationBays(w).length;return [...new Set((Array.isArray(raw)?raw.slice(0,4096):[]).filter(i=>Number.isInteger(i)&&i>=0&&i<n))].sort((a,b)=>a-b);}
export function insulationBlocked(w,i,p){const q=insulationBays(w)[i];if(!q)return true;const side=sheathingSide(w,p);return [...(w.sheathing||[]),...(w.drywall||[]).filter(s=>s.stage===4).map(s=>s.key)].some(key=>key[0]===side&&sheathingRects(w,Number(key.slice(1))).some(([a,b,d,t])=>Math.min(b,q[1])-Math.max(a,q[0])>.001&&Math.min(t,q[3])-Math.max(d,q[2])>.001));}
export function insulationPick(hit,p){if(!hit||!p)return null;const w=hit.wall,i=insulationBays(w).findIndex(([a,b,d,t])=>hit.t>=a&&hit.t<=b&&hit.y>=d&&hit.y<=t);return i<0?null:{wallId:w.id,key:i,side:sheathingSide(w,p),blocked:insulationBlocked(w,i,p)};}
export function changeInsulation(walls,id,key,p,remove=false){const w=walls.find(x=>x.id===id),q=w&&Number.isInteger(key)?insulationBays(w)[key]:null;if(!q||!p)return {error:"Aim between the studs"};const point=wallPoint(w,(q[0]+q[1])/2);if(Math.hypot(point.x-p.x,point.z-p.z)>WALL_REACH)return {error:"Move closer to the cavity"};if(insulationBlocked(w,key,p))return {error:"Access the uncovered wall face first"};const set=new Set(w.insulation||[]);if(remove?!set.has(key):set.has(key))return {error:remove?"No insulation in this cavity":"Cavity already insulated"};if(remove)set.delete(key);else set.add(key);return {walls:walls.map(x=>x===w?{...w,insulation:[...set].sort((a,b)=>a-b)}:x)};}

export function drywallTargets(w,key){
 const rects=sheathingRects(w,Number(key.slice(1))),out=[];
 for(const [a,b,d,t] of rects){if(b-a<.045||t-d<.045)continue;const x=a+(b-a)*.18,X=b-(b-a)*.18,y=d+(t-d)*.18,Y=t-(t-d)*.18;for(const [u,v] of [[x,y],[X,y],[x,Y],[X,Y]])if(!out.some(q=>Math.hypot(q.t-u,q.y-v)<.04))out.push({t:u,y:v});}
 if(!out.length&&rects.length){const [a,b,d,t]=rects[0];out.push({t:(a+b)/2,y:(d+t)/2});}return out.slice(0,24);
}
export function drywallRecord(w,key){return (w.drywall||[]).find(s=>s.key===key)||null;}
export function cleanDrywall(w,raw){const out=[];for(const s of Array.isArray(raw)?raw.slice(0,80):[]){const k=s?.key;if(typeof k!=="string"||!/^[-+]\d+$/.test(k)||!sheathingRects(w,Number(k.slice(1))).length||(w.sheathing||[]).includes(k)||out.some(q=>q.key===k)||!Number.isInteger(s.stage)||s.stage<1||s.stage>4)continue;const n=drywallTargets(w,k).length,screws=s.stage===4?[...new Set((Array.isArray(s.screws)?s.screws:[]).filter(i=>Number.isInteger(i)&&i>=0&&i<n))].sort((a,b)=>a-b):[];out.push({key:k,stage:s.stage,screws,finish:s.stage===4&&screws.length===n&&Number.isInteger(s.finish)?clamp(s.finish,0,4):0});}return out;}
export function drywallComplete(w,s){return !!s&&s.stage===4&&s.screws.length===drywallTargets(w,s.key).length;}
export function changeDrywall(walls,id,key,operation,p,screw){
 const w=walls.find(x=>x.id===id);if(!w||!p||typeof key!=="string"||!/^[-+]\d+$/.test(key)||key[0]!==sheathingSide(w,p)||!sheathingRects(w,Number(key.slice(1))).length)return {error:"Choose a valid drywall section on your side"};
 const a=Number(key.slice(1))*SHEATH_WIDTH,b=Math.min(a+SHEATH_WIDTH,wallLength(w)),q=wallPoint(w,(a+b)/2);if(Math.hypot(q.x-p.x,q.z-p.z)>WALL_REACH)return {error:"Move closer to the sheet"};
 const rows=w.drywall||[],s=drywallRecord(w,key);if(operation==="dryRemove"){if(!s)return {error:"No drywall job here"};return {walls:walls.map(x=>x===w?{...w,drywall:rows.filter(v=>v.key!==key)}:x)};}
 if((w.sheathing||[]).includes(key))return {error:"Use an exposed interior wall face"};
 const stage=({dryMeasure:1,dryMark:2,dryCut:3,dryPosition:4})[operation];let next;
 if(stage){if(stage!==(s?.stage||0)+1)return {error:"Complete the previous drywall step first"};next={key,stage,screws:[]};}
 else if(operation==="dryFasten"){const n=drywallTargets(w,key).length;if(s?.stage!==4||!Number.isInteger(screw)||screw<0||screw>=n||s.screws.includes(screw))return {error:"Choose an unfinished fastening target"};next={...s,screws:[...s.screws,screw].sort((a,b)=>a-b)};}
 else return {error:"Invalid drywall operation"};
 return {walls:walls.map(x=>x===w?{...w,drywall:[...rows.filter(v=>v.key!==key),next]}:x)};
}

export function finishDrywall(walls,id,key,operation,p){
 const w=walls.find(x=>x.id===id),s=w&&drywallRecord(w,key);
 if(!w||!p||!drywallComplete(w,s)||key[0]!==sheathingSide(w,p))return {error:"Choose a fully secured sheet on your side"};
 const a=Number(key.slice(1))*SHEATH_WIDTH,b=Math.min(a+SHEATH_WIDTH,wallLength(w)),q=wallPoint(w,(a+b)/2);
 if(Math.hypot(q.x-p.x,q.z-p.z)>WALL_REACH)return {error:"Move closer to the sheet"};
 const step=({finishTape:1,finishCoat:2,finishSmooth:3,finishFinal:4})[operation];
 if(!step||step!==(s.finish||0)+1)return {error:"Complete the previous finishing stage first"};
 return {walls:walls.map(x=>x===w?{...w,drywall:w.drywall.map(v=>v.key===key?{...v,finish:step}:v)}:x)};
}
