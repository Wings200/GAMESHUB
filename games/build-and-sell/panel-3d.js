
import {THREE} from "../../engine/core.js";
const V=(x,y,z=0)=>new THREE.Vector3(x,y,z);
const M=(c,m=0,r=.6)=>new THREE.MeshStandardMaterial({color:c,metalness:m,roughness:r});
const steel=M("#87969b",.55,.4),dark=M("#36454b",.35),black=M("#242c31"),silver=M("#cbd3d3",.8,.3),copper=M("#b58c5b",.55),cover=M("#b6c0c2",.45),wood=M("#a77e50"),paper=M("#e6e2d1"),red=M("#c95f4d"),yellow=M("#e9c05b"),white=M("#e7e7df"),ground=M("#73a482"),lead=M("#343e46"),blue=M("#587b9b"),rubber=M("#292f2d");
function mesh(p,g,m,x=0,y=0,z=0){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o}
function b(p,w,h,d,x,y,z,m){return mesh(p,new THREE.BoxGeometry(w,h,d),m,x,y,z)}
function g(p,x=0,y=0,z=0){const o=new THREE.Group();o.position.set(x,y,z);p.add(o);return o}
function cy(p,r,l,x,y,z,m){return mesh(p,new THREE.CylinderGeometry(r,r,l,16),m,x,y,z)}
function tube(p,pts,mat,r=.006){const curve=new THREE.CatmullRomCurve3(pts.map(q=>V(...q)),false,"centripetal");return mesh(p,new THREE.TubeGeometry(curve,Math.max(16,pts.length*12),r,8,false),mat)}
function screw(p){const o=g(p);const head=cy(o,.009,.006,0,0,0,silver);head.rotation.x=Math.PI/2;b(o,.012,.002,.001,0,0,.004,dark);b(o,.002,.012,.001,0,0,.004,dark);return o}
function cabinet(p){const o=g(p);b(o,.43,.62,.025,0,0,.012,steel);for(const x of [-.205,.205])b(o,.02,.62,.10,x,0,.06,steel);for(const y of [-.30,.30])b(o,.43,.02,.10,0,y,.06,steel);b(o,.055,.48,.018,-.065,0,.035,dark);b(o,.025,.46,.025,.145,0,.038,copper);b(o,.028,.46,.025,-.15,0,.038,silver);for(let i=0;i<9;i++){for(const x of [-.15,.145]){const q=screw(o);q.position.set(x,-.195+i*.047,.058)}}return o}
function breaker(p){const o=g(p);b(o,.112,.061,.055,0,0,0,black);b(o,.039,.03,.015,.012,0,.031,steel);b(o,.019,.024,.014,.012,.006,.042,dark);return o}
function fitting(p){const o=g(p);cy(o,.017,.025,0,0,0,silver);cy(o,.010,.028,0,0,0,dark);return o}
function panelCover(p){const o=g(p);b(o,.43,.62,.018,0,0,0,cover);b(o,.29,.43,.012,-.015,0,.011,dark);b(o,.277,.42,.014,-.015,0,.020,steel);b(o,.013,.048,.022,.104,0,.035,silver);return o}
function note(p,txt,x,y,z){const c=document.createElement("canvas");c.width=256;c.height=96;const ctx=c.getContext("2d");ctx.fillStyle="#e7e2d3";ctx.fillRect(0,0,256,96);ctx.font="bold 24px sans-serif";ctx.fillStyle="#303a3d";ctx.textAlign="center";ctx.fillText(txt,128,57);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.MeshBasicMaterial({map:t});m.userData.owned=true;const o=mesh(p,new THREE.PlaneGeometry(.092,.034),m,x,y,z);return o}
const mounts=[[-.18,.263,.035],[.18,.263,.035],[-.18,-.263,.035],[.18,-.263,.035]];
const entries=[[-.125,.30,.067],[0,.30,.067],[.125,.30,.067]];
const slots=[[-.065,.164,.071],[-.065,.060,.071],[-.065,-.044,.071]];
const coverPoints=mounts.map(([x,y])=>[x,y,.154]);
const circuits=["LIGHTING","OUTLETS","UTILITY"];
const jacketPaths=entries.map(([x,y,z])=>[[x,.45,z],[x,.34,z],[x,.30,z],[x,.235,z]]);
const paths=slots.flatMap(([x,y,z],i)=>{
 const ex=entries[i][0],ry=.225-i*.016;
 return [{name:circuits[i]+" · branch lead",mat:lead,pts:[[ex,ry,.073],[.055+i*.014,ry,.086],[.055+i*.014,y,.086],[-.004,y,.085]]},
 {name:circuits[i]+" · neutral lead",mat:white,pts:[[ex,ry-.009,.075],[-.125+i*.012,ry-.012,.099],[-.15,.18-i*.065,.067]]},
 {name:circuits[i]+" · protective lead",mat:ground,pts:[[ex,ry-.018,.075],[.13+i*.005,ry-.021,.104],[.145,.18-i*.065,.067]]}];
});
const connections=paths.map(p=>p.pts[p.pts.length-1]);
function installed(parent,closed=true){const o=cabinet(parent);for(let i=0;i<3;i++){const f=fitting(o);f.position.set(...entries[i]);const q=breaker(o);q.position.set(...slots[i]);tube(o,jacketPaths[i],black,.012);note(o,circuits[i],.085,slots[i][1],.11)}for(const p of paths)tube(o,p.pts,p.mat,.004);for(const p of mounts){const q=screw(o);q.position.set(...p)}if(closed){const f=panelCover(o);f.position.z=.128;for(const p of coverPoints){const q=screw(o);q.position.set(...p)}}return o}
export function finishedBreaker(parent,side=1){const o=g(parent,0,1.45,.10*side);if(side<0)o.rotation.y=Math.PI;return installed(o)}
const stages=[
 {title:"Isolate the training circuit",tool:"Lockout tag",mode:"hold",targets:[[-.31,.32,.09]],hint:"Attach the lockout tag to the isolated game supply."},
 {title:"Verify the isolated work area",tool:"Voltage tester",mode:"hold",targets:[[-.31,.21,.09]],hint:"Touch the simulated verification point. The game supply is not connected to live power."},
 {title:"Mark enclosure mounting holes",tool:"Pencil",mode:"click",targets:mounts.map(p=>[p[0],p[1],.002]),hint:"Mark the four locations on the backing."},
 {title:"Prepare the mounting holes",tool:"Drill",mode:"hold",targets:mounts.map(p=>[p[0],p[1],.002]),hint:"Drill at the marked mounting locations."},
 {title:"Position the empty cabinet",tool:"Cabinet",mode:"drag",targets:[[0,0,.006]],sources:[[-.39,-.04,.11]],hint:"Drag the empty cabinet from the tool tray onto the marked wall."},
 {title:"Fasten the enclosure",tool:"Driver",mode:"hold",targets:mounts,hint:"Drive each cabinet mounting fastener."},
 {title:"Prepare cable entries",tool:"Knockout tool",mode:"hold",targets:entries,hint:"Open the designated factory entry points in the simulated enclosure."},
 {title:"Install entry fittings",tool:"Cable fittings",mode:"drag",targets:entries,sources:[[-.37,.13,.14],[-.37,.06,.14],[-.37,-.01,.14]],hint:"Drag each fitting into an entry opening."},
 {title:"Bring in branch cables",tool:"Cable",mode:"route",paths:jacketPaths,targets:jacketPaths.map(p=>p[0]),hint:"Pull each cable through its fitting and follow its marked route."},
 {title:"Prepare the branch cable ends",tool:"Cable preparation tool",mode:"hold",targets:jacketPaths.map(p=>p[p.length-1]),hint:"Use the simulated preparation tool on each cable end. No real cutting dimensions are modeled."},
 {title:"Fit the branch breakers",tool:"Breaker modules",mode:"drag",targets:slots,sources:[[-.36,.16,.14],[-.36,.06,.14],[-.36,-.04,.14]],hint:"Move the three branch modules onto their assigned mounting positions."},
 {title:"Dress branch conductors",tool:"Conductors",mode:"route",paths:paths.map(p=>p.pts),targets:paths.map(p=>p.pts[0]),hint:"Route the indicated conductor to its game terminal. The diagram models an isolated branch-panel trainer, not a universal wiring plan."},
 {title:"Secure terminal connections",tool:"Torque driver",mode:"hold",targets:connections,hint:"Secure each simulated termination with the virtual driver; no real torque values are provided."},
 {title:"Attach circuit identification",tool:"Labels",mode:"drag",targets:slots.map(p=>[.085,p[1],.112]),sources:[[-.36,.16,.14],[-.36,.06,.14],[-.36,-.04,.14]],hint:"Attach the branch identification labels beside the corresponding modules."},
 {title:"Check the isolated assembly",tool:"Inspection tester",mode:"hold",targets:slots.map(p=>[-.004,p[1],.085]),hint:"Run a simulated check on each isolated branch. No live testing."},
 {title:"Fit the protective cover",tool:"Cover",mode:"drag",targets:[[0,0,.128]],sources:[[-.39,-.04,.17]],hint:"Lift the protective cover into place."},
 {title:"Secure the cover",tool:"Driver",mode:"hold",targets:coverPoints,hint:"Secure all four cover fasteners."}
];
export const panelStageCounts=stages.map(s=>s.targets.length);
export function createPanelState(){return {stage:0,done:[]}}
export function panelAction(s,i){const a=stages[s.stage];if(!a||!Number.isInteger(i)||i<0||i>=a.targets.length||s.done.includes(i))return false;s.done.push(i);return true}
export function panelAdvance(s){const a=stages[s.stage];if(!a||s.done.length!==a.targets.length)return false;s.stage++;s.done=[];return true}
export function startPanelWork({engine,canvas,origin,rotation,side=1,hud,onComplete,onCancel}){
 const root=g(engine.scene,origin.x,origin.y,origin.z);root.rotation.y=rotation+(side<0?Math.PI:0);
 const oldCamera=engine.camera.position.clone(),oldRotation=engine.camera.quaternion.clone();const state=createPanelState(),ray=new THREE.Raycaster(),plane=new THREE.Plane(),ndc=new THREE.Vector2();let live=true,stageRoot,markers=[],sources=[],active=null,hover=null,clock=0,raf=0;
 const hudText=hud.querySelector("[data-panel-text]"),progress=hud.querySelector("[data-panel-progress]"),tool=hud.querySelector("[data-panel-tool]"),bar=hud.querySelector("[data-panel-fill]"),cancel=hud.querySelector("[data-panel-cancel]");
 const glow=new THREE.MeshBasicMaterial({color:"#e9cf79",transparent:true,opacity:.8,depthTest:false});
 const doneGlow=new THREE.MeshBasicMaterial({color:"#9ee0a0",transparent:true,opacity:.7,depthTest:false});
 const guideMat=new THREE.LineDashedMaterial({color:"#e7d68a",dashSize:.013,gapSize:.009,depthTest:false,transparent:true,opacity:.8});
 const cursor=new THREE.Mesh(new THREE.RingGeometry(.013,.016,24),glow);root.add(cursor);cursor.visible=false;cursor.renderOrder=12;
 const toolModel=g(root);toolModel.visible=false;
 function disposeObj(o){o.traverse(v=>{if(v.geometry)v.geometry.dispose();if(v.material?.userData.owned){v.material.map?.dispose();v.material.dispose()}});o.removeFromParent()}
 function place(factory,parent,p){const q=factory(parent);q.position.set(...p);return q}
 function localFromPointer(e){
 const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,engine.camera);
 const n=V(0,0,1).applyQuaternion(root.quaternion);plane.setFromNormalAndCoplanarPoint(n,root.localToWorld(V(0,0,.15)));const p=ray.ray.intersectPlane(plane,V());return p?root.worldToLocal(p):null
 }
 const d2=(a,p)=>Math.hypot(a.x-p[0],a.y-p[1]);
 function nearest(a,pts,r,exclude=[]){let hit=-1,best=r;pts.forEach((p,i)=>{const d=d2(a,p);if(!exclude.includes(i)&&d<best){best=d;hit=i}});return hit}
 function ring(p,done=false,r=.015){const o=mesh(stageRoot,new THREE.RingGeometry(r*.66,r,28),done?doneGlow:glow,p[0],p[1],Math.max(p[2]+.018,.16));o.renderOrder=10;return o}
 function buildTool(name){for(const o of [...toolModel.children])disposeObj(o);if(/tester/i.test(name)){b(toolModel,.047,.083,.022,0,-.03,0,blue);b(toolModel,.033,.023,.004,0,-.013,.014,white);b(toolModel,.009,.055,.008,0,.031,0,silver)}
 else if(/drill|driver|knockout|preparation/i.test(name)){b(toolModel,.042,.105,.041,0,-.048,0,yellow);b(toolModel,.027,.045,.035,0,-.098,.02,black);const shaft=cy(toolModel,.005,.049,0,.023,0,silver);shaft.rotation.x=Math.PI/2;shaft.position.z=-.024;}
 else {b(toolModel,.015,.085,.015,0,-.044,0,wood);b(toolModel,.009,.019,.009,0,.008,0,black)}}
 function prior(n){return state.stage>n}
 function stageDone(n,i){return prior(n)||state.stage===n&&state.done.includes(i)}
 function draw(){
 if(stageRoot)disposeObj(stageRoot);stageRoot=g(root);markers=[];sources=[];
 const st=stages[state.stage];
 // Backing exists in the room, not in a detached workbench.
 b(stageRoot,.50,.69,.018,0,0,-.01,wood);
 if(stageDone(0,0)){const t=b(stageRoot,.064,.088,.013,-.31,.32,.03,red);note(stageRoot,"LOCKED",-.31,.32,.039);}
 if(stageDone(1,0))note(stageRoot,"ISOLATED",-.31,.21,.037);
 if(!prior(4)){for(let i=0;i<mounts.length;i++){const [x,y]=mounts[i];if(stageDone(2,i))b(stageRoot,.012,.003,.002,x,y,.003,black);if(stageDone(3,i))cy(stageRoot,.006,.004,x,y,.005,dark).rotation.x=Math.PI/2;}}
 if(stageDone(4,0)){
 cabinet(stageRoot);
 for(let i=0;i<mounts.length;i++)if(stageDone(5,i))place(screw,stageRoot,mounts[i]);
 for(let i=0;i<entries.length;i++){const [x,y,z]=entries[i];if(stageDone(6,i))cy(stageRoot,.013,.005,x,y+.012,z,black);if(stageDone(7,i))place(fitting,stageRoot,entries[i]);if(stageDone(8,i))tube(stageRoot,jacketPaths[i],black,.012);if(stageDone(9,i)){const q=jacketPaths[i].at(-1);for(let j=0;j<3;j++)tube(stageRoot,[q,[q[0]+(j-1)*.012,q[1]-.023,.082]],[lead,white,ground][j],.004);}}
 for(let i=0;i<slots.length;i++)if(stageDone(10,i))place(breaker,stageRoot,slots[i]);
 paths.forEach((p,i)=>{if(stageDone(11,i))tube(stageRoot,p.pts,p.mat,.004);if(stageDone(12,i)){const q=screw(stageRoot);q.position.set(...connections[i]);q.position.z+=.012;}});
 for(let i=0;i<slots.length;i++)if(stageDone(13,i))note(stageRoot,circuits[i],.085,slots[i][1],.112);
 if(stageDone(15,0)){const o=panelCover(stageRoot);o.position.z=.128;for(let i=0;i<4;i++)if(stageDone(16,i))place(screw,stageRoot,coverPoints[i]);}
 }
 if(st.mode==="drag"){
 st.sources.forEach((p,i)=>{if(state.done.includes(i))return;const fac=state.stage===4?cabinet:state.stage===7?fitting:state.stage===10?breaker:state.stage===13?(q=>note(q,circuits[i],0,0,0)):panelCover;const o=place(fac,stageRoot,p);if(state.stage===4||state.stage===15)o.scale.setScalar(.45);sources[i]=o;ring(p,false,.022)});
 }
 if(st.mode==="route") {
 // Work one conductor at a time; overlapping starts cannot steal a different route.
 const i=st.targets.findIndex((_,n)=>!state.done.includes(n));if(i>=0){
 const pts=st.paths[i];const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map(p=>V(p[0],p[1],.17))),guideMat);line.computeLineDistances();line.renderOrder=9;stageRoot.add(line);pts.forEach((p,n)=>ring(p,false,n===0?.018:.009));
 }
 } else st.targets.forEach((p,i)=>ring(p,state.done.includes(i),st.mode==="drag"?.022:.014));
 buildTool(st.tool);hudText.textContent=st.title+" — "+st.hint;tool.textContent=st.tool;progress.textContent=(state.stage+1)+" / "+stages.length+" · "+state.done.length+" / "+st.targets.length;bar.style.width=100*(state.stage+state.done.length/st.targets.length)/stages.length+"%";
 }
 function success(i){if(!panelAction(state,i))return;active=null;toolModel.visible=false;cursor.visible=false;if(panelAdvance(state)){if(state.stage===stages.length){cleanup();onComplete();return}}draw()}
 function stop(){active=null;cancelAnimationFrame(raf);raf=0;toolModel.visible=false;cursor.visible=false}
 function down(e){if(!live||e.button!==0)return;e.preventDefault();e.stopImmediatePropagation();const st=stages[state.stage],p=localFromPointer(e);if(!p)return;const i=st.mode==="drag"?nearest(p,st.sources,.075,state.done):st.mode==="route"?st.targets.findIndex((_,n)=>!state.done.includes(n)):nearest(p,st.targets,.033,state.done);if(i<0||st.mode==="route"&&d2(p,st.paths[i][0])>.038)return;
 canvas.setPointerCapture(e.pointerId);
 if(st.mode==="click"){success(i);return}
 active={i,pointer:e.pointerId,start:performance.now(),last:p.clone(),next:1};
 if(st.mode==="hold"){toolModel.visible=true;toolModel.position.set(st.targets[i][0],st.targets[i][1]-.02,.205);const loop=t=>{if(!live||!active)return;const f=Math.min(1,(t-active.start)/750);toolModel.rotation.z=Math.sin(f*30)*.15;if(f===1){success(i)}else raf=requestAnimationFrame(loop)};raf=requestAnimationFrame(loop)}
 else if(st.mode==="drag"){active.obj=sources[i];active.original=active.obj.position.clone()}
 }
 function move(e){if(!live)return;e.stopImmediatePropagation();const st=stages[state.stage],p=localFromPointer(e);if(!p)return;cursor.visible=true;cursor.position.set(p.x,p.y,.21);
 if(!active)return;if(st.mode==="drag"){active.obj.position.set(p.x,p.y,.20)}
 else if(st.mode==="hold"&&d2(p,st.targets[active.i])>.046)stop();
 else if(st.mode==="route"){const pts=st.paths[active.i],a=active.last;const len=a.distanceTo(p);for(let j=1,n=Math.max(1,Math.ceil(len/.008));j<=n;j++){const q=a.clone().lerp(p,j/n);if(active.next<pts.length&&d2(q,pts[active.next])<.024)active.next++}active.last=p.clone();if(active.next===pts.length){const i=active.i;success(i)}}
 }
 function up(e){if(!live)return;e.stopImmediatePropagation();if(!active)return;const st=stages[state.stage],a=active,p=localFromPointer(e);if(st.mode==="drag"){if(p&&d2(p,st.targets[a.i])<.055){success(a.i);return}a.obj.position.copy(a.original)}stop()}
 function wheel(e){if(live){e.preventDefault();e.stopImmediatePropagation()}}
 function key(e){if(live&&e.key==="Escape"){e.preventDefault();e.stopImmediatePropagation();cleanup();onCancel()}}
 function cleanup(){if(!live)return;live=false;stop();for(const [n,f] of [["pointerdown",down],["pointermove",move],["pointerup",up],["pointercancel",up],["wheel",wheel]])canvas.removeEventListener(n,f,true);window.removeEventListener("keydown",key,true);disposeObj(root);glow.dispose();doneGlow.dispose();guideMat.dispose();hud.classList.add("hidden");engine.camera.position.copy(oldCamera);engine.camera.quaternion.copy(oldRotation);}
 for(const [n,f] of [["pointerdown",down],["pointermove",move],["pointerup",up],["pointercancel",up],["wheel",wheel]])canvas.addEventListener(n,f,{capture:true,passive:false});window.addEventListener("keydown",key,true);
 cancel.onclick=()=>{cleanup();onCancel()};hud.classList.remove("hidden");draw();
 function frame(){if(!live)return;root.updateMatrixWorld(true);const target=root.localToWorld(V(-.06,.015,.05));const camera=root.localToWorld(V(-.06,.015,1.06));engine.camera.position.copy(camera);engine.camera.lookAt(target)}
 frame();return {frame,dispose:cleanup,state};
}
