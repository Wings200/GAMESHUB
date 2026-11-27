
import {wallLength,SHEATH_WIDTH,sheathingRects,drywallTargets,drywallRecord,drywallComplete} from "./wall-math.mjs?v=45";
import {specs} from "./electrical-math.mjs";
import {wallPipeRadius} from "./wall-pipe-math.mjs?v=31";
import {THREE} from "../../engine/core.js";
const near=(a,b,r=22)=>Math.hypot(a.x-b.x,a.y-b.y)<=r;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const stages=["Measure","Mark","Cut","Position","Fasten"];
export function benchGeometry(w,key,devices=[],lines=[]){
 const start=Number(key.slice(1))*SHEATH_WIDTH,end=Math.min(start+SHEATH_WIDTH,wallLength(w)),width=end-start,height=w.height,side=key[0]==="+"?1:-1;
 const scale=Math.min(300/width,380/height),left=360-width*scale/2,top=266-height*scale/2;
 const xy=(t,y)=>({x:left+(side===1?t-start:end-t)*scale,y:top+(height-y)*scale});
 const rect=(a,b,d,t)=>{const A=xy(a,t),B=xy(b,d);return {x:Math.min(A.x,B.x),y:A.y,w:Math.abs(B.x-A.x),h:B.y-A.y};};
 const clips=[],add=(a,b,d,t,label)=>{a=Math.max(start,a);b=Math.min(end,b);d=Math.max(0,d);t=Math.min(height,t);if(b-a<.006||t-d<.006)return;const r=rect(a,b,d,t);if(clips.some(q=>Math.abs(q.x-r.x)+Math.abs(q.y-r.y)+Math.abs(q.w-r.w)+Math.abs(q.h-r.h)<1))return;clips.push({...r,label});};
 for(const o of w.openings||[])add(o.start,o.start+o.width,o.kind==="door"?0:.918,o.kind==="door"?2.04:2,o.kind);
 for(const d of devices){if(d.wallId!==w.id||d.side!==side||!specs[d.kind])continue;const s=specs[d.kind];add(d.t-s.w/2-.008,d.t+s.w/2+.008,d.y-s.h/2-.008,d.y+s.h/2+.008,d.kind);}
 const len=wallLength(w),ux=(w.b.x-w.a.x)/len,uz=(w.b.z-w.a.z)/len;
 for(const e of lines){if(e.a?.wallId!==w.id||e.kind==="vent"||!e.points?.length)continue;for(const p of [e.points[0],e.points.at(-1)]){const x=p.x-w.a.x,z=p.z-w.a.z,t=x*ux+z*uz,y=p.y-.02,r=wallPipeRadius(e.kind)*1.5+.018;if(Math.abs(-x*uz+z*ux)<=.12)add(t-r,t+r,y-r,y+r,e.kind+" pipe");}}
 const bounds={x:left,y:top,w:width*scale,h:height*scale},corners=r=>[{x:r.x,y:r.y},{x:r.x+r.w,y:r.y},{x:r.x+r.w,y:r.y+r.h},{x:r.x,y:r.y+r.h}];
 const marks=[];for(const r of [bounds,...clips])for(const p of corners(r))if(!marks.some(q=>near(p,q,5)))marks.push(p);
 const cuts=[];for(const r of clips){const ps=corners(r);for(let i=0;i<4;i++)if(!near(ps[i],ps[(i+1)%4],3))cuts.push([ps[i],ps[(i+1)%4]]);}
 if(!cuts.length){const a=corners(bounds);cuts.push([a[0],a[1]]);}
 return {width,height,bounds,clips,marks,cuts,rects:sheathingRects(w,Number(key.slice(1))).map(q=>rect(...q)),targets:drywallTargets(w,key).map(q=>xy(q.t,q.y))};
}

const unit=.01,origin={x:360,y:266};
const v=(p,z=0)=>new THREE.Vector3((p.x-origin.x)*unit,(origin.y-p.y)*unit,z);
const material=(c,roughness=.8,metalness=0)=>new THREE.MeshStandardMaterial({color:c,roughness,metalness});
const wood=material(0xb58d5c),woodEnd=material(0x98754d),paper=material(0xd9d8cc,.93),edge=material(0xa9a394),steel=material(0x69757a,.3,.75),black=material(0x252b2c),blue=material(0x3476ad),pink=material(0xd99ca6),yellow=material(0xd7ad4b,.55),floorMat=material(0x777f79);
const gold=new THREE.MeshBasicMaterial({color:0xffca65}),green=new THREE.MeshBasicMaterial({color:0x82e6a7}),faint=new THREE.MeshBasicMaterial({color:0xb38a6c}),ghost=new THREE.MeshBasicMaterial({color:0x7bcba1,transparent:true,opacity:.17,depthWrite:false});
function box(g,w,h,d,x,y,z,m){if(Math.min(w,h,d)<.00001)return null;const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
function rectMesh(g,r,z,d,m){const p=v({x:r.x+r.w/2,y:r.y+r.h/2},z);return box(g,r.w*unit,r.h*unit,d,p.x,p.y,p.z,m);}
function beam(g,a,b,z,m,r=.012){const A=v(a,z),B=v(b,z),dir=B.clone().sub(A);if(dir.length()<.0001)return null;const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,dir.length(),8),m);o.position.copy(A).add(B).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());g.add(o);return o;}
function disc(g,p,z,r,m){const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,.012,20),m);o.rotation.x=Math.PI/2;o.position.copy(v(p,z));g.add(o);return o;}
function ring(g,p,z,r,m){const o=new THREE.Mesh(new THREE.TorusGeometry(r,.012,8,30),m);o.position.copy(v(p,z));g.add(o);return o;}
function outline(g,r,z,m){const a={x:r.x,y:r.y},b={x:r.x+r.w,y:r.y},c={x:r.x+r.w,y:r.y+r.h},d={x:r.x,y:r.y+r.h};for(const [p,q] of [[a,b],[b,c],[c,d],[d,a]])beam(g,p,q,z,m,.009);}
function subtract(r,c){const a=Math.max(r.x,c.x),b=Math.min(r.x+r.w,c.x+c.w),d=Math.max(r.y,c.y),t=Math.min(r.y+r.h,c.y+c.h);if(a>=b||d>=t)return [r];return [{x:r.x,y:r.y,w:a-r.x,h:r.h},{x:b,y:r.y,w:r.x+r.w-b,h:r.h},{x:a,y:r.y,w:b-a,h:d-r.y},{x:a,y:t,w:b-a,h:r.y+r.h-t}].filter(q=>q.w>.08&&q.h>.08);}
function sheet(g,b,clips,z=0){let rects=[b];for(const c of clips)rects=rects.flatMap(r=>subtract(r,c));for(const r of rects)rectMesh(g,r,z,.065,[edge,edge,edge,edge,paper,paper]);}
function dispose(g){for(const n of [...g.children]){n.removeFromParent();n.traverse(o=>o.geometry?.dispose());}}
function tool(g,stage){
 const t=new THREE.Group();g.add(t);t.visible=false;
 if(stage===0){box(t,.24,.22,.12,.07,-.06,.10,yellow);box(t,.19,.05,.13,.07,-.14,.1,black);box(t,.025,.055,.05,-.05,.025,.055,steel);}
 else if(stage===1){box(t,.045,.31,.045,.06,-.14,.14,yellow).rotation.z=.38;box(t,.032,.06,.032,.005,-.005,.03,black).rotation.z=.38;}
 else if(stage===2){box(t,.15,.33,.10,.08,-.14,.16,black);box(t,.08,.22,.11,.08,-.10,.17,yellow);box(t,.04,.10,.035,.005,-.025,.06,steel);}
 else if(stage===4){box(t,.26,.18,.20,.12,-.02,.22,yellow);box(t,.15,.18,.14,.18,-.15,.24,black);box(t,.17,.08,.16,.18,-.23,.24,yellow);const chuck=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.14,16),steel);chuck.rotation.x=Math.PI/2;chuck.position.set(0,0,.14);t.add(chuck);box(t,.025,.025,.12,0,0,.048,steel);}
 return t;
}
export function createDrywallBench({onClose,getState,onAction,format}){
 const root=document.getElementById("dryBench"),board=document.getElementById("dryBoard"),hint=document.getElementById("dryHint"),status=document.getElementById("dryStatus"),steps=document.getElementById("drySteps"),exit=document.getElementById("dryExit"),title=document.getElementById("dryTitle"),meter=document.getElementById("dryMeter");
 let job=null,busy=false,stage=-1,stamp="",progress=new Set(),drag=null,raf=0,geo=null,visual=null,message="",renderer=null,scene=null,camera=null,model=null,toolModel=null,resize=null;
 const ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,0,1),-.11),ndc=new THREE.Vector2(),hit=new THREE.Vector3();
 function init(){if(renderer)return;renderer=new THREE.WebGLRenderer({canvas:board,antialias:true,alpha:false});renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));renderer.setClearColor(0x27332f);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;camera=new THREE.PerspectiveCamera(39,1,.1,100);scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xe5eef9,0x756452,2.1));const lamp=new THREE.DirectionalLight(0xffe5bf,2.4);lamp.position.set(-3,6,5);lamp.castShadow=true;lamp.shadow.mapSize.set(1024,1024);lamp.shadow.camera.left=-5;lamp.shadow.camera.right=5;lamp.shadow.camera.top=5;lamp.shadow.camera.bottom=-5;scene.add(lamp);const fill=new THREE.DirectionalLight(0xcfe4ff,.85);fill.position.set(4,2,2);scene.add(fill);model=new THREE.Group();scene.add(model);box(scene,16,.2,12,0,-2.5,-2,floorMat);box(scene,12,7,.2,0,0,-2.8,material(0x52615b));resize=new ResizeObserver(()=>draw());resize.observe(board);}
 function draw(){if(!renderer||!job)return;const w=board.clientWidth,h=board.clientHeight;if(!w||!h)return;const aspect=w/h;if(renderer.domElement.width!==Math.round(w*renderer.getPixelRatio())||renderer.domElement.height!==Math.round(h*renderer.getPixelRatio()))renderer.setSize(w,h,false);camera.aspect=aspect;const dist=8.0*Math.max(1,.95/aspect);camera.position.set(dist*.17,dist*.10,dist);camera.lookAt(0,0,0);camera.updateProjectionMatrix();camera.updateMatrixWorld();renderer.render(scene,camera);}
 function point(e,z=.11){if(!camera)return {x:-999,y:-999};const r=board.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);ray.setFromCamera(ndc,camera);plane.constant=-z;if(!ray.ray.intersectPlane(plane,hit))return {x:-999,y:-999};return {x:hit.x/unit+origin.x,y:origin.y-hit.y/unit};}
 function read(){return job?getState(job):null;}
 function abortDrag(){if(raf)cancelAnimationFrame(raf);raf=0;drag=null;visual=null;}
 function close(resume=true){abortDrag();job=null;busy=false;stage=-1;stamp="";if(model)dispose(model);root.classList.add("hidden");onClose(resume);}
 function open(info){job={...info};busy=false;stage=-1;stamp="";progress.clear();message="";root.classList.remove("hidden");try{init();refresh(true);}catch(e){message="3D workstation failed: "+e.message;hint.textContent=message;console.error(e);}}
 async function act(operation,screw){if(!job||busy)return;const current=job;busy=true;message="Saving…";render();let ok=false;try{ok=await onAction({...job,operation,...(screw===undefined?{}:{screw})});}catch(e){message=e.message||"Could not save this step.";}if(job!==current)return;busy=false;if(!ok){if(message==="Saving…")message="Step not saved. Try again.";progress.clear();}else message="";refresh(true);}
 function measurements(g){const b=g.bounds;return [[{x:b.x,y:b.y-24},{x:b.x+b.w,y:b.y-24}],[{x:b.x-25,y:b.y},{x:b.x-25,y:b.y+b.h}]];}
 function targetList(s,g){if(s===0)return measurements(g);if(s===2)return g.cuts;return [];}
 function refresh(force=false){if(!job||!renderer)return;const d=read();if(!d||!d.wall){close(false);return;}const rec=drywallRecord(d.wall,job.key),s=rec?.stage||0,done=drywallComplete(d.wall,rec),g=benchGeometry(d.wall,job.key,d.devices,d.lines);const k=JSON.stringify([s,done,rec?.screws,g]);if(!force&&k===stamp)return;if(stage!==s){abortDrag();progress.clear();stage=s;}stamp=k;geo=g;render();}
 function frame(g,b,clips){rectMesh(g,{x:b.x-52,y:b.y-12,w:b.w+104,h:b.h+24},-.24,.1,pink);for(let i=0;i<=5;i++)rectMesh(g,{x:b.x+b.w*i/5-3,y:b.y,w:6,h:b.h},-.12,.17,wood);for(const y of [b.y,b.y+b.h-7])rectMesh(g,{x:b.x-30,y,w:b.w+60,h:7},-.12,.17,woodEnd);for(const c of clips){rectMesh(g,c,-.055,.06,c.label.includes("pipe")?steel:c.label==="door"||c.label==="window"?black:blue);}}
 function render(){if(!job||!geo||!renderer)return;const d=read();if(!d?.wall)return;const rec=drywallRecord(d.wall,job.key),done=drywallComplete(d.wall,rec),g=geo,b=g.bounds;dispose(model);visual=null;board.style.cursor=busy?"wait":stage===3?"grab":"crosshair";
 frame(model,b,g.clips);
 if(stage===0){for(const [i,m] of measurements(g).entries()){beam(model,...m,.11,progress.has(i)?green:gold);for(const p of m)ring(model,p,.11,.085,progress.has(i)?green:gold);}}
 if(stage===1||stage===2){sheet(model,b,[],.03);outline(model,b,.11,stage===1?faint:gold);for(const c of g.clips)outline(model,c,.11,faint);}
 if(stage===1)for(let i=0;i<g.marks.length;i++)ring(model,g.marks[i],.11,.065,progress.has(i)?green:gold);
 if(stage===2){for(let i=0;i<g.cuts.length;i++)beam(model,...g.cuts[i],.11,progress.has(i)?green:i===progress.size?gold:faint,i===progress.size?.019:.009);const a=g.cuts[progress.size];if(a)for(const p of a)ring(model,p,.11,.07,gold);}
 if(stage===3){rectMesh(model,b,.005,.02,ghost);outline(model,b,.11,green);visual=new THREE.Group();model.add(visual);sheet(visual,b,g.clips,.11);visual.position.set(.68,-.35,.14);}
 if(stage===4){sheet(model,b,g.clips,.03);for(let i=0;i<g.targets.length;i++){const p=g.targets[i],secured=rec?.screws.includes(i);disc(model,p,.08,secured?.024:.04,secured?steel:gold);if(!secured)ring(model,p,.11,.105,gold);else{const q=v(p,.093);box(model,.035,.007,.006,q.x,q.y,q.z,black);}}}
 toolModel=tool(model,stage);
 steps.replaceChildren();for(let i=0;i<5;i++){const n=document.createElement("span");n.textContent=(i+1)+" · "+stages[i];n.className=done||i<stage?"complete":i===stage?"current":"";steps.append(n);}
 title.textContent=done?"SHEET INSTALLED":"3D DRYWALL INSTALLATION";
 const total=stage===0?2:stage===1?g.marks.length:stage===2?g.cuts.length:stage===3?1:g.targets.length,count=stage===4?(rec?.screws.length||0):progress.size;
 status.textContent=done?"All fastening targets secured":count+" / "+total+" tasks · "+format(g.width)+" × "+format(g.height);
 meter.style.width=(done?100:Math.min(100,(stage+count/Math.max(1,total))*20))+"%";
 hint.textContent=message||(done?"Installation saved. Return to the site.":busy?"Saving…":["Drag between the ends of each highlighted measurement guide.","Click each highlighted marking point on the sheet.","Drag along each highlighted game cut guide.","Drag the 3D sheet into the green frame outline.","Hold the mouse on each highlighted fastening target."][stage]);exit.textContent=done?"Return to site":"Close · saved steps retained";exit.disabled=busy;draw();
 }
 function moveTool(p){if(!toolModel||stage===3)return;toolModel.visible=true;toolModel.position.copy(v(p,.14));}
 function pointerDown(e){if(!job||busy||e.button!==0||!geo)return;const d=read(),rec=d&&drywallRecord(d.wall,job.key);if(!d||drywallComplete(d.wall,rec))return;const p=point(e,stage===3?.25:.11);e.preventDefault();moveTool(p);
 if(stage===1){const i=geo.marks.findIndex((q,i)=>!progress.has(i)&&near(p,q,13));if(i<0)return;progress.add(i);if(progress.size===geo.marks.length)act("dryMark");else render();return;}
 if(stage===0||stage===2){const list=targetList(stage,geo);const i=stage===2?progress.size:list.findIndex((q,i)=>!progress.has(i)&&q.some(v=>near(p,v)));if(i<0||!list[i])return;const [a,b]=list[i];if(!near(p,a)&&!near(p,b))return;drag={i,start:near(p,a)?a:b,end:near(p,a)?b:a};visual=beam(model,drag.start,p,.13,green,.016);}
 else if(stage===3){const b=geo.bounds;if(p.x<b.x+68||p.x>b.x+b.w+68||p.y<b.y+35||p.y>b.y+b.h+35)return;drag={start:p,offset:{x:68,y:35}};}
 else if(stage===4){const i=geo.targets.findIndex((q,i)=>!rec?.screws.includes(i)&&near(p,q,19));if(i<0)return;drag={i,startTime:performance.now(),point:geo.targets[i]};const q=drag.point;visual=ring(model,q,.14,.16,green);const tick=now=>{if(!drag||!job)return;const t=clamp((now-drag.startTime)/650,0,1);if(visual)visual.scale.setScalar(1-.65*t);if(toolModel){toolModel.position.copy(v(q,.14-.07*t));toolModel.rotation.z=Math.sin(now*.1)*.04;}draw();if(t>=1){const i=drag.i;abortDrag();act("dryFasten",i);}else raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);}
 if(drag)try{board.setPointerCapture(e.pointerId);}catch{}draw();
 }
 function pointerMove(e){if(!job||busy||!geo)return;const p=point(e,stage===3?.25:.11);moveTool(p);if(drag){if(stage===0||stage===2){if(visual){visual.removeFromParent();visual.geometry.dispose();}visual=beam(model,drag.start,p,.13,green,.016);}else if(stage===3){drag.offset={x:68+p.x-drag.start.x,y:35+p.y-drag.start.y};visual?.position.set(drag.offset.x*unit,-drag.offset.y*unit,.14);}else if(stage===4&&!near(p,drag.point,22)){abortDrag();render();}}draw();}
 function pointerUp(e){if(!drag)return;const q=drag,p=point(e,stage===3?.25:.11);abortDrag();if(stage===0||stage===2){if(near(p,q.end,22)){progress.add(q.i);if(progress.size===targetList(stage,geo).length){act(stage===0?"dryMeasure":"dryCut");return;}}else message="Missed the end marker. Try that guide again.";}else if(stage===3){if(Math.hypot(q.offset.x,q.offset.y)<=20){act("dryPosition");return;}message="Align the sheet with the green outline.";}render();}
 board.addEventListener("pointerdown",pointerDown);board.addEventListener("pointermove",pointerMove);board.addEventListener("pointerup",pointerUp);board.addEventListener("pointercancel",()=>{abortDrag();if(job)render();});board.addEventListener("lostpointercapture",()=>{if(drag){abortDrag();if(job)render();}});exit.onclick=()=>{if(!busy)close(true);};
 return {open,close,refresh,get active(){return !!job;},get busy(){return busy;}};
}
