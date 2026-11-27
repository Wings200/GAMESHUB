
import {THREE} from "../../engine/core.js";
import {specs} from "./electrical-math.mjs";
import {wallPipeRadius} from "./wall-pipe-math.mjs?v=31";
import {wallLength,STUD,PLATE,WALL_THICKNESS,sheathingRects,insulationBays,drywallTargets,drywallRecord,drywallComplete,paintRects,PAINT_COLORS,SIDING_TYPES,SIDING_COLORS,TRIM_TYPES,TRIM_COLORS,trimRects} from "./wall-math.mjs?v=85";
const slab=.02,wood=new THREE.MeshStandardMaterial({color:0xc9a473,roughness:.85}),endgrain=new THREE.MeshStandardMaterial({color:0xad8355,roughness:.87}),green=new THREE.MeshBasicMaterial({color:0x83efac,transparent:true,opacity:.40,depthWrite:false}),red=new THREE.MeshBasicMaterial({color:0xe97c6c,transparent:true,opacity:.42,depthWrite:false}),yellow=new THREE.MeshBasicMaterial({color:0xffc778,transparent:true,opacity:.32,depthWrite:false});
function grain(){const c=document.createElement("canvas");c.width=128;c.height=512;const x=c.getContext("2d");x.fillStyle="#dec49c";x.fillRect(0,0,128,512);let seed=831;const rnd=()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;for(let i=0;i<220;i++){const a=rnd()*128,b=rnd()*512;x.strokeStyle=i%3?"rgba(113,76,40,.17)":"rgba(255,240,205,.29)";x.lineWidth=.4+rnd()*1.4;x.beginPath();x.moveTo(a,b);x.bezierCurveTo(a+rnd()*3,b+40,a-rnd()*3,b+160,a,b+300);x.stroke();}const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;}
function osbTexture(){const c=document.createElement("canvas");c.width=256;c.height=512;const x=c.getContext("2d");x.fillStyle="#b89560";x.fillRect(0,0,256,512);let s=94;const rnd=()=>((s=Math.imul(s,1664525)+1013904223|0)>>>0)/4294967296;for(let i=0;i<2400;i++){x.save();x.translate(rnd()*256,rnd()*512);x.rotate(rnd()*Math.PI);x.fillStyle=["#d6b681","#987344","#c7a66d","#b28a53","#e0c093"][i%5];x.fillRect(-4,-1.4,4+rnd()*16,1+rnd()*4);x.restore();}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
const osb=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.92});
function wrapTexture(){const c=document.createElement("canvas");c.width=256;c.height=512;const x=c.getContext("2d");x.fillStyle="#edf0e9";x.fillRect(0,0,256,512);for(let y=0;y<512;y+=4){x.fillStyle=y%8?"#e6eae4":"#f6f7f3";x.fillRect(0,y,256,1);}x.strokeStyle="#8ca7ae";x.lineWidth=2;x.setLineDash([9,6]);for(let y=25;y<512;y+=90){x.beginPath();x.moveTo(0,y);x.lineTo(256,y);x.stroke();}x.setLineDash([]);x.fillStyle="#48758a";x.font="bold 15px sans-serif";x.textAlign="center";for(let y=70;y<512;y+=180){x.fillText("BUILD & SELL",128,y);x.font="11px sans-serif";x.fillText("WEATHER BARRIER",128,y+15);x.font="bold 15px sans-serif";}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
const wrapMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.93});

const sidingMaterials=new Map();
function sidingMaterial(kind,color){const key=kind+":"+color;if(sidingMaterials.has(key))return sidingMaterials.get(key);const c=document.createElement("canvas");c.width=256;c.height=256;const ctx=c.getContext("2d");const hex=SIDING_COLORS.find(x=>x.id===color)?.hex||0xe6dfcc;const base=new THREE.Color(hex);const shade=n=>"#"+base.clone().multiplyScalar(n).getHexString();ctx.fillStyle=shade(1);ctx.fillRect(0,0,256,256);let seed=315;const rnd=()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;
if(kind==="vinyl"){for(let y=0;y<256;y+=32){ctx.fillStyle=shade(.64);ctx.fillRect(0,y,256,3);ctx.fillStyle=shade(1.13);ctx.fillRect(0,y+3,256,2);}}
else if(kind==="wood"){for(let x=0;x<256;x+=32){ctx.fillStyle=shade(.7);ctx.fillRect(x,0,3,256);ctx.fillStyle=shade(1.1);ctx.fillRect(x+3,0,2,256);}for(let i=0;i<400;i++){ctx.strokeStyle=shade(.85+rnd()*.25);ctx.lineWidth=.5;const x=rnd()*256,y=rnd()*256;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+rnd()*2,y+20+rnd()*75);ctx.stroke();}}
else if(kind==="brick"){ctx.fillStyle="#b8b1a4";ctx.fillRect(0,0,256,256);for(let row=0;row<8;row++)for(let x=-64;x<256;x+=64){ctx.fillStyle=shade(.8+rnd()*.32);ctx.fillRect(x+(row%2)*32+2,row*32+2,60,28);}}
else {for(let i=0;i<3000;i++){ctx.fillStyle=shade(.9+rnd()*.2);ctx.fillRect(rnd()*256,rnd()*256,1+rnd()*2,1+rnd()*2);}}
const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;const m=new THREE.MeshStandardMaterial({map:tex,roughness:kind==="vinyl"?.55:.93});sidingMaterials.set(key,m);return m;}
// Extend only the outer face of a completed, square corner to its matching face.
function cornerRects(w,key,walls,layer,depth){
 const i=Number(key.slice(1)),side=key[0]==="+"?1:-1,L=wallLength(w),ux=(w.b.x-w.a.x)/L,uz=(w.b.z-w.a.z)/L,nx=-uz*side,nz=ux*side;
 const has=(other,k)=>layer==="drywall"?(other.drywall||[]).some(s=>s.key===k&&s.stage===4):layer==="siding"?(other.siding||[]).some(s=>s.key===k):(other[layer]||[]).includes(k);
 const extension=(end)=>{
  const p=end?w.b:w.a,ix=end?-ux:ux,iz=end?-uz:uz;
  for(const other of walls){if(other.id===w.id||Math.abs(other.height-w.height)>.002)continue;
   const atA=Math.hypot(other.a.x-p.x,other.a.z-p.z)<.002,atB=Math.hypot(other.b.x-p.x,other.b.z-p.z)<.002;if(!atA&&!atB)continue;
   const Q=wallLength(other),vx=(other.b.x-other.a.x)/Q,vz=(other.b.z-other.a.z)/Q,ox=atA?vx:-vx,oz=atA?vz:-vz;
   if(Math.abs(ix*ox+iz*oz)>.01||nx*ox+nz*oz>-.99)continue;
   const otherSide=(-vz)*ix+vx*iz<0?"+":"-",otherIndex=atA?0:Math.ceil(Q/1.2-1e-8)-1;
   if(has(other,otherSide+otherIndex))return depth;
  }return 0;
 };
 const lo=extension(false),hi=extension(true);
 return sheathingRects(w,i).map(([a,b,d,t])=>[a<.001?a-lo:a,b>L-.001?b+hi:b,d,t]);
}
function siding(g,w,row,walls=[]){const side=row.key[0]==="+"?1:-1,mat=sidingMaterial(row.kind,row.color),depth=row.kind==="brick"?.052:.021;for(const [a,b,d,t] of cornerRects(w,row.key,walls,"siding",WALL_THICKNESS/2+.024+depth))box(g,b-a,t-d,depth,(a+b)/2,(d+t)/2,side*(WALL_THICKNESS/2+.024+depth/2),mat);}

function membrane(g,w,key,m=wrapMat,walls=[]){const side=key[0]==="+"?1:-1;for(const [a,b,d,t] of cornerRects(w,key,walls,"wrap",WALL_THICKNESS/2+.022)){const gap=m===wrapMat?0:.002;box(g,b-a-gap,t-d-gap,.004,(a+b)/2,(d+t)/2,side*(WALL_THICKNESS/2+.020+(m===wrapMat?0:.006)),m);}}
function sheet(g,w,key,m=osb,walls=[]){const side=key[0]==="+"?1:-1;for(const [a,b,d,t] of cornerRects(w,key,walls,"sheathing",WALL_THICKNESS/2+.018)){const gap=m===osb?0:.006;box(g,b-a-gap,t-d-gap,.018,(a+b)/2,(d+t)/2,side*(WALL_THICKNESS/2+.009+(m===osb?0:.012)),m);if(m===osb){const mesh=g.children.at(-1);if(mesh){mesh.castShadow=true;mesh.receiveShadow=true;}}}}
function battTexture(){const c=document.createElement("canvas");c.width=128;c.height=512;const x=c.getContext("2d");x.fillStyle="#e7a3ad";x.fillRect(0,0,128,512);let s=841;const rnd=()=>((s=Math.imul(s,1664525)+1013904223|0)>>>0)/4294967296;for(let i=0;i<3500;i++){const a=rnd()*128,b=rnd()*512;x.strokeStyle=["#f5c4cd","#ce8193","#eeb3bf","#f5d0d5"][i%4];x.globalAlpha=.35+rnd()*.4;x.lineWidth=.4+rnd()*1.5;x.beginPath();x.moveTo(a,b);x.quadraticCurveTo(a+8*rnd()-4,b+5,a+12*rnd()-6,b+5+rnd()*12);x.stroke();}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
const battMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1});
function subtractVolume(a,b){
 const x=Math.max(a[0],b[0]),X=Math.min(a[1],b[1]),y=Math.max(a[2],b[2]),Y=Math.min(a[3],b[3]),z=Math.max(a[4],b[4]),Z=Math.min(a[5],b[5]);
 if(X<=x||Y<=y||Z<=z)return [a];
 return [[a[0],x,a[2],a[3],a[4],a[5]],[X,a[1],a[2],a[3],a[4],a[5]],[x,X,a[2],y,a[4],a[5]],[x,X,Y,a[3],a[4],a[5]],[x,X,y,Y,a[4],z],[x,X,y,Y,Z,a[5]]].filter(v=>v[1]-v[0]>.002&&v[3]-v[2]>.002&&v[5]-v[4]>.002);
}
function pipeClearance(w,lines){
 const len=Math.hypot(w.b.x-w.a.x,w.b.z-w.a.z);if(len<.001)return [];
 const ux=(w.b.x-w.a.x)/len,uz=(w.b.z-w.a.z)/len;
 const local=p=>{const x=p.x-w.a.x,z=p.z-w.a.z;return [x*ux+z*uz,p.y-.02,-x*uz+z*ux];};
 const out=[];
 for(const e of lines){if(e.a?.wallId!==w.id)continue;const r=Math.max(.014,wallPipeRadius(e.kind)*1.2)+.007;
 for(let i=1;i<e.points.length;i++){const a=local(e.points[i-1]),b=local(e.points[i]);const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2];
 const n=Math.abs(dx)>.002&&Math.abs(dy)>.002?Math.max(1,Math.ceil(Math.hypot(dx,dy)/.10)):1;
 for(let j=0;j<n;j++){const p=a.map((v,k)=>v+(b[k]-v)*j/n),q=a.map((v,k)=>v+(b[k]-v)*(j+1)/n);
 if(Math.min(p[2],q[2])-r>.0525||Math.max(p[2],q[2])+r<-.0525)continue;
 out.push([Math.min(p[0],q[0])-r,Math.max(p[0],q[0])+r,Math.min(p[1],q[1])-r,Math.max(p[1],q[1])+r,-.08,.08]);}}
 }
 return out;
}
function batt(g,w,i,m=battMat,side="+",bays=insulationBays(w),devices=[],pipeCuts=[]){
 const q=bays[i];if(!q)return;const [a,b,d,t]=q,preview=m!==battMat,z=preview?(side==="+"?1:-1)*.067:0,depth=preview?.006:.105;
 let pieces=[[a+.003,b-.003,d+.003,t-.003,z-depth/2,z+depth/2]];
 for(const dev of devices){const s=specs[dev.kind];if(!s)continue;const pad=.008,front=dev.side*WALL_THICKNESS/2,back=front-dev.side*s.d;
 const cut=[dev.t-s.w/2-pad,dev.t+s.w/2+pad,dev.y-s.h/2-pad,dev.y+s.h/2+pad,Math.min(front,back)-pad,Math.max(front,back)+pad];
 pieces=pieces.flatMap(v=>subtractVolume(v,cut));}
 for(const cut of pipeCuts){if(cut[1]<=a||cut[0]>=b||cut[3]<=d||cut[2]>=t)continue;pieces=pieces.flatMap(v=>subtractVolume(v,cut));}
 for(const [l,r,lo,hi,n,f] of pieces)box(g,r-l,hi-lo,f-n,(l+r)/2,(lo+hi)/2,(n+f)/2,m);
}
const gypsum=new THREE.MeshStandardMaterial({color:0xe8e5df,roughness:.94}),cutEdge=new THREE.MeshStandardMaterial({color:0xbeb9ae,roughness:.93}),screwMat=new THREE.MeshStandardMaterial({color:0x4d5355,roughness:.6}),taskMat=new THREE.MeshBasicMaterial({color:0xffcb62,depthTest:false}),activeTaskMat=new THREE.MeshBasicMaterial({color:0x91f6b0,depthTest:false});
const paintMats=new Map(PAINT_COLORS.map(c=>[c.id,new THREE.MeshStandardMaterial({color:c.hex,roughness:.82})]));
const finishTapeMat=new THREE.MeshStandardMaterial({color:0xc9c6b9,roughness:.95}),finishCoatMat=new THREE.MeshStandardMaterial({color:0xede8db,roughness:.92}),finishSmoothMat=new THREE.MeshStandardMaterial({color:0xe3e0d6,roughness:.86});
function drywallMesh(g,w,s,devices,lines,preview=false,active=-1,walls=[]){
 const key=s.key,side=key[0]==="+"?1:-1,z=side*(WALL_THICKNESS/2+.007),n=Math.min(z-.006,z+.006),f=Math.max(z-.006,z+.006);
 const gap=preview?.002:0;
 let pieces=cornerRects(w,key,preview?[]:walls,"drywall",WALL_THICKNESS/2+.013).map(([a,b,d,t])=>[a+gap,b-gap,d+gap,t-gap,n,f]);
 for(const d of devices){if(d.wallId!==w.id||d.side!==side)continue;const v=specs[d.kind];if(!v)continue;const pad=.008;const cut=[d.t-v.w/2-pad,d.t+v.w/2+pad,d.y-v.h/2-pad,d.y+v.h/2+pad,-.1,.1];pieces=pieces.flatMap(a=>subtractVolume(a,cut));}
 const len=wallLength(w),ux=(w.b.x-w.a.x)/len,uz=(w.b.z-w.a.z)/len;
 for(const e of lines){if(e.a?.wallId!==w.id||e.kind==="vent")continue;for(const q of [e.points[0],e.points.at(-1)]){const x=q.x-w.a.x,Z=q.z-w.a.z,t=x*ux+Z*uz,y=q.y-.02,offset=-x*uz+Z*ux,r=wallPipeRadius(e.kind)*1.5+.018;if(Math.abs(offset)>.12)continue;pieces=pieces.flatMap(a=>subtractVolume(a,[t-r,t+r,y-r,y+r,-.1,.1]));}}
 const mat=preview?(s.blocked?red:green):gypsum,off=preview?side*.018:0;
 for(const [a,b,d,t,l,r] of pieces){box(g,b-a,t-d,r-l,(a+b)/2,(d+t)/2,(l+r)/2+off,mat);if(!preview){const m=g.children.at(-1);if(m){m.castShadow=true;m.receiveShadow=true;}}}
 if(!preview&&s.finish>0&&s.finish<4){const width=s.finish===1?.035:s.finish===2?.09:.13,material=s.finish===1?finishTapeMat:s.finish===2?finishCoatMat:finishSmoothMat;const pos=side*(WALL_THICKNESS/2+.015);const start=Number(key.slice(1))*1.2,end=Math.min(start+1.2,wallLength(w));for(const [a,b,d,t] of pieces){for(const seam of [start,end]){const l=Math.max(a,seam-width),r=Math.min(b,seam+width);if(r-l>.002)box(g,r-l,t-d,.002,(l+r)/2,(t+d)/2,pos,material);}}if(s.finish>=2)for(const q of drywallTargets(w,key)){if(pieces.some(([a,b,d,t])=>q.t>=a+.015&&q.t<=b-.015&&q.y>=d+.015&&q.y<=t-.015)){const m=new THREE.Mesh(new THREE.CircleGeometry(s.finish===2?.036:.046,16),material);m.position.set(q.t,q.y,pos+side*.002);if(side<0)m.rotation.y=Math.PI;g.add(m);}}}
 if(!preview&&s.finish===4&&s.paint?.length){const rects=paintRects(w,key);for(let i=0;i<rects.length;i++){const mat=paintMats.get(s.paint[i]);if(!mat)continue;const [a,b,d,t]=rects[i];for(const [l,r,D,T] of pieces){const x=Math.max(a,l),X=Math.min(b,r),y=Math.max(d,D),Y=Math.min(t,T);if(X-x>.001&&Y-y>.001)box(g,X-x,Y-y,.003,(x+X)/2,(y+Y)/2,side*(WALL_THICKNESS/2+.020),mat);}}}
 if(preview&&s.stage!==4)return;
 const targets=drywallTargets(w,key),done=s.screws||[];
 for(let i=0;i<targets.length;i++){const q=targets[i];if(!preview&&(!done.includes(i)||s.finish>=2))continue;if(preview&&done.includes(i))continue;const m=preview?(i===active?activeTaskMat:taskMat):screwMat,rad=preview?.025:.0045,zz=side*(WALL_THICKNESS/2+.017+(preview?.008:0)),o=new THREE.Mesh(new THREE.CircleGeometry(rad,16),m);o.position.set(q.t,q.y,zz);if(side<0)o.rotation.y=Math.PI;g.add(o);if(preview){const ring=new THREE.Mesh(new THREE.RingGeometry(.031,.039,18),m);ring.position.copy(o.position);ring.rotation.copy(o.rotation);g.add(ring);}}
}
const jambMat=new THREE.MeshStandardMaterial({color:0xe7e2d5,roughness:.8}),doorMat=new THREE.MeshStandardMaterial({color:0xb58d63,roughness:.8}),glassMat=new THREE.MeshStandardMaterial({color:0xa9cddd,transparent:true,opacity:.42,roughness:.15,depthWrite:false}),hardwareMat=new THREE.MeshStandardMaterial({color:0x899399,metalness:.7,roughness:.35});
function openingAssembly(g,o){const a=o.start,b=a+o.width,low=o.kind==="door"?0:.918,high=o.kind==="door"?2.04:2.0,H=high-low,W=b-a,j=.045;if(!o.assembly)return;for(const x of [a+j/2,b-j/2])box(g,j,H,.14,x,low+H/2,0,jambMat);box(g,W,j,.14,(a+b)/2,high-j/2,0,jambMat);if(o.kind==="window")box(g,W,j,.14,(a+b)/2,low+j/2,0,jambMat);if(o.assembly>=2){if(o.kind==="door"){const pivot=new THREE.Group();pivot.position.set(a+j,low+.015,0);pivot.rotation.y=o.open?-Math.PI/2:0;g.add(pivot);const width=W-j*2,height=H-j-.025;box(pivot,width,height,.043,width/2,height/2,0,doorMat);for(const y of [height*.28,height*.73])box(pivot,width*.76,height*.36,.009,width/2,y,.024,jambMat);if(o.assembly===3){for(const side of [-1,1])box(pivot,.12,.034,.04,width-.12,1,side*.045,hardwareMat);}}else{const sash=new THREE.Group();sash.position.set(a+j,low+j,0);sash.rotation.y=o.open?-Math.PI*.38:0;g.add(sash);const width=W-2*j,height=H-2*j;box(sash,width,height,.015,width/2,height/2,0,glassMat);for(const x of [0,width])box(sash,.04,height,.045,x,height/2,0,jambMat);for(const y of [0,height])box(sash,width,.04,.045,width/2,y,0,jambMat);box(sash,.035,height,.035,width/2,height/2,0,jambMat);}}if(o.assembly===3){for(const side of [-1,1]){for(const x of [a-.026,b+.026])box(g,.055,H+.06,.018,x,low+H/2,side*.09,jambMat);box(g,W+.105,.055,.018,(a+b)/2,high+.024,side*.09,jambMat);}}}
const trimMaterials=new Map(TRIM_COLORS.map(c=>[c.id,new THREE.MeshStandardMaterial({color:c.hex,roughness:.65})]));
function trimMesh(g,w,row,preview=null){
 const type=TRIM_TYPES.find(t=>t.id===row.kind),m=preview||trimMaterials.get(row.color);if(!type||!m)return;
 const side=row.key[0]==="+"?1:-1,front=WALL_THICKNESS/2+.022+(preview?.004:0);
 for(const [a,b,d,t] of trimRects(w,row.key,row.kind)){
  const h=t-d,x=(a+b)/2,y=(d+t)/2,z=side*(front+type.depth/2);
  box(g,b-a,h,type.depth,x,y,z,m);
  if(row.kind==="base")box(g,b-a,Math.min(.018,h/3),type.depth+.008,x,t-Math.min(.018,h/3)/2,z,m);
  else{box(g,b-a,Math.min(.026,h/3),type.depth+.02,x,t-Math.min(.026,h/3)/2,z,m);box(g,b-a,Math.min(.015,h/3),type.depth+.006,x,d+Math.min(.015,h/3)/2,z,m);}
 }
}
function clear(g){for(const o of [...g.children]){o.removeFromParent();o.traverse(n=>n.geometry?.dispose());}}
function box(g,w,h,d,x,y,z,mat){if(w<.002||h<.002||d<.002)return;const a=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);a.position.set(x,y,z);a.castShadow=mat===wood||mat===endgrain;a.receiveShadow=true;g.add(a);}
function orient(g,w){g.position.set(w.a.x,slab,w.a.z);g.rotation.y=-Math.atan2(w.b.z-w.a.z,w.b.x-w.a.x);}
function frame(g,w,mat=wood,holes=[]){orient(g,w);const l=wallLength(w),h=w.height,t=WALL_THICKNESS,os=w.openings||[];const member=(a,b,y1,y2,m=mat)=>{const h=holes.filter(o=>o.t>=a-.002&&o.t<=b+.002&&o.y>y1+(o.radius||.013)+.008&&o.y<y2-(o.radius||.013)-.008);if(mat!==wood||b-a>STUD+.003||!h.length){box(g,b-a,y2-y1,t,(a+b)/2,(y1+y2)/2,0,m);return;}const shape=new THREE.Shape();shape.moveTo(-t/2,y1);shape.lineTo(t/2,y1);shape.lineTo(t/2,y2);shape.lineTo(-t/2,y2);shape.closePath();let last=-100,lastRadius=0;for(const o of h.sort((a,b)=>a.y-b.y)){if(o.y-last<lastRadius+(o.radius||.013)+.005)continue;last=o.y;lastRadius=o.radius||.013;const hole=new THREE.Path();hole.absarc(0,o.y,o.radius||.013,0,Math.PI*2,true);shape.holes.push(hole);}const geo=new THREE.ExtrudeGeometry(shape,{depth:b-a,bevelEnabled:false,curveSegments:10});geo.rotateY(Math.PI/2);geo.translate(a,0,0);const mesh=new THREE.Mesh(geo,m);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);};
 let end=0;for(const o of os.filter(o=>o.kind==="door").sort((a,b)=>a.start-b.start)){member(end,o.start,0,PLATE);end=o.start+o.width;}member(end,l,0,PLATE);
 member(0,l,h-2*PLATE,h-PLATE);member(0,l,h-PLATE,h);
 const full=x=>member(Math.max(0,x-STUD/2),Math.min(l,x+STUD/2),PLATE,h-2*PLATE);
 const studs=[STUD/2,l-STUD/2];for(let x=.4064;x<l-STUD;x+=.4064)studs.push(x);
 for(const x of studs){const o=os.find(o=>x>o.start-STUD&&x<o.start+o.width+STUD);if(!o)full(x);else{const top=o.kind==="door"?2.04:2.0;member(x-STUD/2,x+STUD/2,top+.105,h-2*PLATE);if(o.kind==="window")member(x-STUD/2,x+STUD/2,PLATE,.88);}}
 for(const o of os){const a=o.start,b=a+o.width,top=o.kind==="door"?2.04:2.0;full(a-1.5*STUD);full(b+1.5*STUD);member(a-STUD,a,PLATE,top);member(b,b+STUD,PLATE,top);member(a-STUD,b+STUD,top,top+.105);if(o.kind==="window")member(a,b,.88,.918);}
}
export function makeWallVisual(scene){if(!wood.map)wood.map=grain();if(!osb.map)osb.map=osbTexture();if(!wrapMat.map)wrapMat.map=wrapTexture();if(!battMat.map)battMat.map=battTexture();const root=new THREE.Group(),draft=new THREE.Group(),effect=new THREE.Group();scene.add(root,draft,effect);let key="",dk="",anim=null;return {update(walls,preview,valid,hit,opening,mode,first,now,holes=[],panel=null,devices=[],wallPipes=[]){devices=devices.filter(d=>d.surface!=="ceiling");const k=JSON.stringify([walls,holes,devices,wallPipes]);if(k!==key){key=k;clear(root);for(const w of walls){const g=new THREE.Group();root.add(g);frame(g,w,wood,holes.filter(o=>o.wallId===w.id));for(const key of w.sheathing||[])sheet(g,w,key,osb,walls);for(const key of w.wrap||[])membrane(g,w,key,wrapMat,walls);for(const row of w.siding||[])siding(g,w,row,walls);if(w.insulation?.length){const bays=insulationBays(w);const boxes=devices.filter(d=>d.wallId===w.id),pipeCuts=pipeClearance(w,wallPipes);for(const i of w.insulation)batt(g,w,i,battMat,"+",bays,boxes,pipeCuts);}for(const s of w.drywall||[])if(s.stage===4)drywallMesh(g,w,s,devices,wallPipes,false,-1,walls);for(const row of w.trim||[])trimMesh(g,w,row);for(const o of w.openings)openingAssembly(g,o);}}const d=JSON.stringify([preview,valid,hit?.wall.id,opening,mode,first,panel,hit?.wall.insulation,hit?.wall.sheathing,hit?.wall.wrap,hit?.wall.drywall,devices,wallPipes]);if(d!==dk){dk=d;clear(draft);if(preview&&wallLength(preview)>.04){const g=new THREE.Group();draft.add(g);frame(g,preview,valid?green:red);}else if(hit){const g=new THREE.Group();draft.add(g);orient(g,hit.wall);if(mode==="trim"&&panel){trimMesh(g,hit.wall,panel,panel.blocked?red:green);}else if(mode==="drywall"&&panel){const s=drywallRecord(hit.wall,panel.key)||{key:panel.key,stage:0,screws:[]};if(s.stage!==4||!drywallComplete(hit.wall,s))drywallMesh(g,hit.wall,{...s,blocked:panel.blocked},devices,wallPipes,true,panel.screw);}else if(mode==="insulation"&&panel){batt(g,hit.wall,panel.key,panel.blocked?red:(hit.wall.insulation||[]).includes(panel.key)?yellow:green,panel.side,insulationBays(hit.wall),devices.filter(d=>d.wallId===hit.wall.id),pipeClearance(hit.wall,wallPipes));}else if(mode==="wrap"&&panel){membrane(g,hit.wall,panel.key,(hit.wall.wrap||[]).includes(panel.key)?yellow:(hit.wall.sheathing||[]).includes(panel.key)?green:red);}else if(mode==="sheathing"&&panel){sheet(g,hit.wall,panel.key,(hit.wall.sheathing||[]).includes(panel.key)?yellow:green);}else if(opening){const low=opening.kind==="door"?0:.918,top=opening.kind==="door"?2.04:2.0;box(g,opening.width,top-low,.17,opening.start+opening.width/2,(low+top)/2,0,valid?green:red);}else box(g,wallLength(hit.wall),hit.wall.height,.17,wallLength(hit.wall)/2,hit.wall.height/2,0,yellow);}else if(first){box(draft,.12,.15,.12,first.x,slab+.075,first.z,green);}}if(anim){const t=(now-anim.start)/420;if(t>=1){clear(effect);anim=null;}else{effect.position.y=.35*(1-t)**2;}}},burst(w,now){if(!w)return;clear(effect);const g=new THREE.Group();effect.add(g);frame(g,w,green);effect.position.y=.35;anim={start:now};},reset(){clear(root);clear(draft);clear(effect);key="";dk="";anim=null;}};}
