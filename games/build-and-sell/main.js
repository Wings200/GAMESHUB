
import {THREE,GameEngine} from "../../engine/core.js";
import {loadCharacterAsset} from "../../engine/character-assets.js";
import {createBuilder,animateBuilder} from "./builder-rig.js?v=3";
import {EMPTY_TAPE,sanitizeTape,groundTarget,formatDistance} from "./tape-math.mjs?v=5";
import {makeTapeVisual} from "./tape-visual.js?v=5";
import {groundHeight,aimGround} from "./terrain.mjs";
import {emptySurvey,sanitizeSurvey,cleanStation} from "./survey-math.mjs";
import {makeSurveyVisual} from "./survey-visual.js?v=5";
import {snapPoint,rectFrom,sanitizeLayout,dimensions,layoutAim} from "./layout-math.mjs";
import {makeLayoutVisual} from "./layout-visual.js?v=6";
import {playerState,step,snapshot,sanitizePose,angleMix,clamp,STAND} from "./movement.mjs";
const $=id=>document.getElementById(id),canvas=$("world"),keys=new Set(),peers=new Map();
let engine,asset=null,session=null,playing=false,p=playerState(0,5),lastSync=0,inFlight=false,failures=0,generation=0,lastStatus=0,localBody,saveMeta=null,saveReady=false,menuBusy=false,leaving=false,noticeUntil=0,localTape=null,tape=EMPTY_TAPE(),measurement=null,tapeNotice="",tapeNoticeUntil=0,survey=emptySurvey(),localSurvey=null,surveyResult=null,layoutVisual=null,layout=null,layoutRevision=0,layoutMode=false,layoutFirst=null,layoutPending=false,layoutSnap=true;
try{if(localStorage.getItem("build-tape-units")==="metric")tape.units="metric";}catch{}
const mat=(color,roughness=.8)=>new THREE.MeshStandardMaterial({color,roughness});
const dirt=mat("#b39d7d"),grass=mat("#799258"),wood=mat("#a58b63"),road=mat("#777f80");
function box(parent,w,h,d,x,y,z,m){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function site(){
 const s=engine.scene;s.background=new THREE.Color("#b8d0df");s.fog=new THREE.Fog("#b8d0df",55,120);
 s.add(new THREE.HemisphereLight("#edf7ff","#a89b74",2));const sun=new THREE.DirectionalLight("#fff2d7",3);sun.position.set(-20,30,16);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-28,right:28,top:28,bottom:-28,near:1,far:80});sun.shadow.bias=-.0003;s.add(sun);
 box(s,150,.10,150,0,-.40,0,grass);const lotGeo=new THREE.PlaneGeometry(48,48,96,96);lotGeo.rotateX(-Math.PI/2);const pos=lotGeo.getAttribute("position");for(let i=0;i<pos.count;i++)pos.setY(i,groundHeight(pos.getX(i),pos.getZ(i)));lotGeo.computeVertexNormals();const lot=new THREE.Mesh(lotGeo,dirt);lot.receiveShadow=true;s.add(lot);const surround=new THREE.Shape();surround.moveTo(-75,-75);surround.lineTo(75,-75);surround.lineTo(75,75);surround.lineTo(-75,75);surround.closePath();const hole=new THREE.Path();hole.moveTo(-24,-24);hole.lineTo(-24,24);hole.lineTo(24,24);hole.lineTo(24,-24);hole.closePath();surround.holes.push(hole);const g=new THREE.ShapeGeometry(surround);g.rotateX(-Math.PI/2);const surroundMesh=new THREE.Mesh(g,grass);surroundMesh.position.y=-.005;surroundMesh.receiveShadow=true;s.add(surroundMesh);box(s,120,.05,6,0,-.023,30,road);
 for(const x of [-24,24])for(let z=-24;z<=24;z+=8)box(s,.1,.6,.1,x,.3,z,wood);
 for(const z of [-24,24])for(let x=-16;x<=16;x+=8)box(s,.1,.6,.1,x,.3,z,wood);
 const lines=new THREE.BufferGeometry().setFromPoints([[-24,-24],[24,-24],[24,24],[-24,24],[-24,-24]].map(([x,z])=>new THREE.Vector3(x,.03,z)));s.add(new THREE.Line(lines,new THREE.LineBasicMaterial({color:"#e5d3a2"})));
 for(let i=0;i<10;i++){const x=-43+i*9,z=-34;box(s,.3,2.8,.3,x,1.4,z,wood);for(let j=0;j<3;j++){const l=new THREE.Mesh(new THREE.IcosahedronGeometry(1.7-j*.24,2),grass);l.position.set(x+(j-1)*.5,2.7+j*.5,z);l.castShadow=true;s.add(l)}}
}
function makePeer(id,n){
 if(!asset)return null;const builder=createBuilder(asset,engine.scene),model=builder.model;
 const c=document.createElement("canvas");c.width=256;c.height=64;const ctx=c.getContext("2d");ctx.fillStyle="#172724";ctx.fillRect(0,0,256,64);ctx.font="bold 26px sans-serif";ctx.fillStyle="white";ctx.textAlign="center";ctx.fillText(n,128,42,230);const tex=new THREE.CanvasTexture(c);const tag=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:true}));tag.position.y=2.08;tag.scale.set(.8,.20,1);model.root.add(tag);
 return {...builder,tag,target:null,shown:null,name:n,tape:makeTapeVisual(engine.scene,builder),tool:EMPTY_TAPE(),survey:makeSurveyVisual(engine.scene,builder),surveyState:emptySurvey()};
}
function removePeer(id){const a=peers.get(id);if(!a)return;a.tag.material.map.dispose();a.tag.material.dispose();a.tape.dispose();a.survey.dispose();a.dispose();peers.delete(id)}
function updatePeers(list){const ids=new Set();for(const item of list){if(item.id===session?.id)continue;const pose=sanitizePose(item.pose);if(!pose)continue;ids.add(item.id);let a=peers.get(item.id);if(!a){a=makePeer(item.id,item.name);if(!a)continue;peers.set(item.id,a);a.shown={...pose};}a.target=pose;a.tool=sanitizeTape(item.pose.tape);a.surveyState=sanitizeSurvey(item.pose.survey);}for(const id of peers.keys())if(!ids.has(id))removePeer(id);$("roster").textContent=list.length+" / 8 builders";}
function stations(){return [survey.station,...Array.from(peers.values(),a=>a.surveyState.station)].filter(Boolean);}
function drawPeers(dt,elapsed){for(const a of peers.values()){if(!a.target)continue;const t=a.target,s=a.shown,f=1-Math.exp(-13*dt);for(const k of ["x","y","z","pitch","speed"])s[k]+=(t[k]-s[k])*f;s.yaw=angleMix(s.yaw,t.yaw,f);s.mode=t.mode;s.crouch=t.crouch;a.tape.restore();a.survey.restore();const world={...s,y:s.y+groundHeight(s.x,s.z)};animateBuilder(a,world,dt);a.tape.update(a.tool,world);a.survey.update(a.surveyState,world,elapsed,stations());}}
async function post(payload){const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),7000);try{const response=await fetch("/api/build-and-sell/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),signal:ac.signal});const data=await response.json();if(!response.ok||!data.ok){const e=new Error(data.error||"Session request failed");e.status=response.status;throw e;}return data;}finally{clearTimeout(timer)}}
async function sync(){if(!session||inFlight||!playing)return;const s=session,g=generation;inFlight=true;
 try{const d=await post({action:"sync",...s,pose:networkPose()});if(g!==generation)return;failures=0;acceptLayout(d);updatePeers(d.players);if(performance.now()>noticeUntil)$("net").textContent=session.host?"Connected · autosave active":"Connected · guest";}
 catch(e){if(g!==generation)return;failures++;$("net").textContent=e.status===410?"Session expired · leave and rejoin":"Connection interrupted · retrying";if(e.status===410){returnToMenu("Session ended. Load your world or ask for a fresh code.");}}
 finally{if(g===generation)inFlight=false;}
}

function networkPose(){return {...snapshot(p),tape:sanitizeTape(tape),survey:sanitizeSurvey(survey)};}
function toolNotice(message){tapeNotice=message;tapeNoticeUntil=performance.now()+2500;}
function toggleTape(){if(!playing)return;layoutMode=false;layoutFirst=null;tape.equipped=!tape.equipped;if(tape.equipped)survey.mode="none";tape.anchor=null;measurement=null;toolNotice(tape.equipped?"Tape measure equipped":"Tape measure stowed");}
function toggleUnits(){tape.units=tape.units==="metric"?"imperial":"metric";try{localStorage.setItem("build-tape-units",tape.units)}catch{}toolNotice(tape.units==="metric"?"Metric units":"Feet and inches");}
function selectSurvey(mode){if(!playing)return;layoutMode=false;layoutFirst=null;survey.mode=survey.mode===mode?"none":mode;if(survey.mode!=="none"){tape.equipped=false;tape.anchor=null;measurement=null;}toolNotice(survey.mode==="laser"?"Aim at the ground to set up the laser":survey.mode==="rod"?"Walk with the rod to read elevation":"Survey tool stowed");}
function surveyInput(e){if(!playing||document.pointerLockElement!==canvas||survey.mode!=="laser")return false;if(e.button===2){e.preventDefault();if(survey.station&&Math.hypot(p.x-survey.station.x,p.z-survey.station.z)<=4){survey.station=null;toolNotice("Laser retrieved");}else toolNotice("Approach your laser to retrieve it");return true;}if(e.button!==0)return false;e.preventDefault();if(survey.station){toolNotice("Retrieve your laser before moving it");return true;}const d=new THREE.Vector3();engine.camera.getWorldDirection(d);const spot=cleanStation(aimGround(engine.camera.position,d));if(!spot){toolNotice("Aim at nearby ground inside the lot");return true;}survey.station=spot;survey.mode="rod";toolNotice("Laser self-leveled · rod equipped");return true;}
function tapeInput(e){if(layoutInput(e)||surveyInput(e))return;if(!playing||document.pointerLockElement!==canvas||!tape.equipped)return;if(e.button===2){e.preventDefault();tape.anchor=null;toolNotice("Tape retracted");return;}if(e.button!==0)return;e.preventDefault();if(tape.anchor){toolNotice("Right-click to retract");return;}const d=new THREE.Vector3();engine.camera.getWorldDirection(d);const a=groundTarget(engine.camera.position,d);if(!a){toolNotice("Aim at the ground within 4 m");return;}tape.anchor=a;toolNotice("Anchor set · walk to extend");}
function updateTapeHud(){const panel=$("tapePanel");panel.classList.toggle("hidden",!tape.equipped);$("beltTape").classList.toggle("selected",tape.equipped);$("units").textContent=tape.units==="metric"?"METRIC":"FT / IN";if(!tape.equipped)return;const d=measurement?.dist;$("tapeLength").textContent=d?formatDistance(d.length,tape.units):"—";$("tapeHorizontal").textContent=d?formatDistance(d.horizontal,tape.units):"—";$("tapeHint").textContent=performance.now()<tapeNoticeUntil?tapeNotice:tape.anchor?"Walk to extend · RMB retract":measurement?.candidate?"LMB anchor here":"Aim at nearby ground";}
function updateSurveyHud(){const active=survey.mode!=="none";$("surveyPanel").classList.toggle("hidden",!active);$("beltLaser").classList.toggle("selected",survey.mode==="laser");$("beltRod").classList.toggle("selected",survey.mode==="rod");if(!active)return;$("surveyUnits").textContent=tape.units==="metric"?"METRIC":"FT / IN";$("surveyTitle").textContent=survey.mode==="laser"?"ROTARY LASER":"GRADE ROD";const r=surveyResult?.reading;$("surveyReading").textContent=r?formatDistance(r.rod,tape.units):"—";$("surveyElevation").textContent=r?(Math.abs(r.elevation)<.005?"LEVEL":(r.elevation>0?"+":"−")+formatDistance(Math.abs(r.elevation),tape.units)):"—";$("surveyHint").textContent=performance.now()<tapeNoticeUntil?tapeNotice:survey.mode==="laser"?(survey.station?"RMB near your tripod to retrieve":"LMB to place and self-level"):(r?"Walk to compare ground heights":"Place a laser or approach a friend’s");}
function acceptLayout(d){if(!Number.isSafeInteger(d?.revision)||d.revision<layoutRevision)return;layoutRevision=d.revision;layout=sanitizeLayout(d.layout);}
function toggleLayout(){if(!playing)return;layoutMode=!layoutMode;layoutFirst=null;if(layoutMode){tape.equipped=false;tape.anchor=null;measurement=null;survey.mode="none";toolNotice("Click the first corner");}}
function toggleSnap(){if(!layoutMode)return;layoutSnap=!layoutSnap;toolNotice(layoutSnap?"Grid snap enabled":"Free placement");}
function pickLayout(){const d=new THREE.Vector3();engine.camera.getWorldDirection(d);return snapPoint(layoutAim(engine.camera.position,d),layoutSnap,tape.units);}
async function commitLayout(rect){if(layoutPending||!session||leaving)return;const g=generation,s=session;layoutPending=true;try{const d=await post({action:"layout",...s,layout:rect,revision:layoutRevision});if(g!==generation)return;acceptLayout(d);layoutFirst=null;toolNotice(rect?"Foundation marked · saved":"Foundation layout removed");}catch(e){if(g!==generation)return;toolNotice(e.status===409?"Layout changed by another builder. Try again.":e.message);if(e.status===409)sync();}finally{if(g===generation)layoutPending=false;}}
function layoutInput(e){if(!playing||document.pointerLockElement!==canvas||!layoutMode)return false;if(e.button!==0&&e.button!==2)return false;e.preventDefault();if(layoutPending)return true;if(e.button===2){layoutFirst=null;toolNotice("Placement canceled");return true;}const point=pickLayout();if(!point){toolNotice("Aim at the ground inside your lot");return true;}if(!layoutFirst){layoutFirst=point;toolNotice("Click the opposite corner");return true;}const rect=sanitizeLayout(rectFrom(layoutFirst,point));if(!rect){toolNotice("Foundation must be at least 2 m wide and long");return true;}commitLayout(rect);return true;}
function updateLayout(){const point=layoutMode?pickLayout():null,draft=layoutFirst&&point?rectFrom(layoutFirst,point):null;layoutVisual.update(layout,draft,!!sanitizeLayout(draft),point,layoutFirst,layoutMode);$("beltLayout").classList.toggle("selected",layoutMode);$("layoutPanel").classList.toggle("hidden",!layoutMode);if(!layoutMode)return;const d=dimensions(draft||layout),u=tape.units;$("layoutUnits").textContent=u==="metric"?"METRIC":"FT / IN";$("layoutSnap").textContent=layoutSnap?(u==="metric"?"SNAP 0.5 M":"SNAP 1 FT"):"SNAP OFF";$("layoutDims").textContent=d?formatDistance(d.width,u)+" × "+formatDistance(d.depth,u):"—";$("layoutArea").textContent=d?(u==="metric"?Math.round(d.area)+" m²":Math.round(d.area/.09290304).toLocaleString()+" ft²"):"—";$("layoutHint").textContent=layoutPending?"Saving layout…":performance.now()<tapeNoticeUntil?tapeNotice:layoutFirst?"Click opposite corner · RMB cancel":layout?"Click to redraw · Delete to clear (host)":"Click first corner · G toggle snap";}
function notice(message){noticeUntil=performance.now()+4000;$("net").textContent=message;}
async function refreshSaves(){
 saveReady=false;$("host").disabled=true;$("host").textContent="Checking saves…";
 try{const d=await post({action:"list"});saveMeta=d.save;saveReady=true;$("host").textContent=saveMeta?"Load & Host":"NEW";$("saveInfo").textContent=saveMeta?"Saved "+new Date(saveMeta.updated).toLocaleString():"No saved world. NEW creates your first world.";if(d.username)$("name").value=d.username;}
 catch(e){$("host").textContent="Check saves";$("saveInfo").textContent=e.message;saveMeta=null;}
 finally{$("host").disabled=menuBusy;}
}
function begin(s){
 if(!s?.code||!s.id||!s.token)throw Error("Missing session credentials.");
 session={code:s.code,id:s.id,token:s.token,host:!!s.host};generation++;inFlight=false;failures=0;lastSync=0;playing=true;
 const spawn=s.host&&sanitizePose(s.pose);p=spawn?playerState(spawn.x,spawn.z):playerState((Math.random()-.5)*3,4+Math.random()*1.2);
 if(spawn){p.yaw=spawn.yaw;p.pitch=spawn.pitch;}
 keys.clear();layout=null;layoutRevision=0;layoutMode=false;layoutFirst=null;layoutPending=false;acceptLayout(s);survey=emptySurvey();surveyResult=null;tape={...EMPTY_TAPE(),units:tape.units};measurement=null;$("menu").classList.add("hidden");$("toolbelt").classList.remove("hidden");for(const id of ["hud","cross","help","pause"])$(id).classList.remove("hidden");
 $("session").textContent="SESSION "+s.code;$("copy").classList.remove("hidden");$("save").classList.toggle("hidden",!s.host);$("leave").textContent=s.host?"Save & Exit":"Leave session";
 $("net").textContent="Connecting…";$("roster").textContent="1 / 8 builders";localBody.model.root.visible=true;sync();
}
function returnToMenu(message=""){
 generation++;playing=false;layout=null;layoutRevision=0;layoutMode=false;layoutFirst=null;layoutPending=false;layoutVisual.update(null,null,false,null,null,false);$("layoutPanel").classList.add("hidden");session=null;keys.clear();inFlight=false;document.exitPointerLock?.();for(const id of peers.keys())removePeer(id);if(localBody)localBody.model.root.visible=false;if(localTape){localTape.restore();tape={...EMPTY_TAPE(),units:tape.units};localTape.update(tape,p);}measurement=null;if(localSurvey){localSurvey.restore();survey=emptySurvey();localSurvey.update(survey,p,0,[]);}surveyResult=null;$("surveyPanel").classList.add("hidden");$("toolbelt").classList.add("hidden");$("tapePanel").classList.add("hidden");
 for(const id of ["hud","cross","help","pause"])$(id).classList.add("hidden");$("menu").classList.remove("hidden");$("error").textContent=message;refreshSaves();
}
async function saveNow(){
 if(!session?.host||leaving)return;const s=session,g=generation;$("save").disabled=true;
 try{const d=await post({action:"save",...s,pose:networkPose()});if(g===generation)notice(d.saved?"World saved.":"Save could not be confirmed.");}
 catch(e){if(g===generation)notice("Save failed: "+e.message);}
 finally{$("save").disabled=false;}
}
async function leave(){
 if(!session||leaving||layoutPending)return;const s=session;leaving=true;$("leave").disabled=true;keys.clear();document.exitPointerLock?.();
 try{const d=await post({action:"leave",...s,pose:networkPose()});returnToMenu(s.host&&d.saved?"World saved. Previous code is closed.":"Session left.");}
 catch(e){if(e.status===410)returnToMenu("Session already closed. Last autosave retained.");else notice("Could not exit safely. Try Save & Exit again.");}
 finally{leaving=false;$("leave").disabled=false;}
}
async function online(action){
 if(playing||menuBusy)return;if(action==="host"&&!saveReady){await refreshSaves();return;}
 const buttons=[$("host"),$("join")];menuBusy=true;buttons.forEach(b=>b.disabled=true);$("error").textContent="Connecting…";
 try{if(!asset||!localBody)throw Error("Character asset must load before multiplayer.");const s=await post({action:action==="host"?(saveMeta?"load":"new"):"join",name:$("name").value,code:$("code").value.trim().toUpperCase()});$("error").textContent="";begin(s);}
 catch(e){$("error").textContent=e.message||"Could not connect.";if(action==="host"&&e.status===409)await refreshSaves();}
 finally{menuBusy=false;buttons.forEach(b=>b.disabled=false);}
}
function boot(){engine=new GameEngine(canvas,{fov:76});site();layoutVisual=makeLayoutVisual(engine.scene);engine.scene.add(engine.camera);
 engine.camera.rotation.order="YXZ";engine.camera.position.set(0,STAND,5);
 canvas.addEventListener("mousedown",tapeInput);canvas.addEventListener("contextmenu",e=>{if(playing)e.preventDefault();});
 canvas.addEventListener("click",()=>{if(playing&&document.pointerLockElement!==canvas){try{canvas.requestPointerLock()?.catch?.(()=>{})}catch{}}});
 document.addEventListener("pointerlockchange",()=>{keys.clear();$("pause").classList.toggle("hidden",!playing||document.pointerLockElement===canvas)});
 document.addEventListener("mousemove",e=>{if(playing&&document.pointerLockElement===canvas){p.yaw-=e.movementX*.0021;p.pitch=clamp(p.pitch-e.movementY*.0021,-1.44,1.44);}});
 document.addEventListener("keydown",e=>{if(playing&&document.pointerLockElement===canvas&&!e.repeat&&(e.code==="Digit1"||e.code==="Digit2"||e.code==="Digit3"||e.code==="Digit4"||e.code==="KeyG"||e.code==="Delete"||e.code==="KeyU")){e.preventDefault();if(e.code==="Digit1")toggleTape();else if(e.code==="Digit2")selectSurvey("laser");else if(e.code==="Digit3")selectSurvey("rod");else if(e.code==="Digit4")toggleLayout();else if(e.code==="KeyG")toggleSnap();else if(e.code==="Delete"){if(layoutMode&&session?.host&&layout&&!layoutFirst)commitLayout(null);}else toggleUnits();return;}if(playing&&document.pointerLockElement===canvas&&/^(Key[WASDC]|ShiftLeft|ShiftRight|ControlLeft|ControlRight|Space)$/.test(e.code)){e.preventDefault();keys.add(e.code);}});document.addEventListener("keyup",e=>keys.delete(e.code));window.addEventListener("blur",()=>keys.clear());
 $("beltLayout").onclick=toggleLayout;$("layoutSnap").onclick=toggleSnap;$("layoutUnits").onclick=toggleUnits;$("beltTape").onclick=toggleTape;$("beltLaser").onclick=()=>selectSurvey("laser");$("beltRod").onclick=()=>selectSurvey("rod");$("units").onclick=toggleUnits;$("surveyUnits").onclick=toggleUnits;$("host").onclick=()=>online("host");$("save").onclick=saveNow;$("join").onclick=()=>online("join");$("leave").onclick=leave;$("copy").onclick=async()=>{if(session){try{await navigator.clipboard.writeText(session.code);notice("Session code copied.")}catch{notice("Share code "+session.code)}}};
 window.addEventListener("pagehide",()=>{if(session)navigator.sendBeacon("/api/build-and-sell/session",new Blob([JSON.stringify({action:"leave",...session,pose:networkPose()})],{type:"application/json"}))});
 engine.onFrame((dt,elapsed)=>{if(!playing)return;try{
 if(document.pointerLockElement!==canvas)keys.clear();step(p,keys,dt);
 // Eye position is slightly forward of the torso, not attached to a bobbing mesh.
 // The head is hidden only for this client; arms, hands and legs are the actual rig.
 const world={...p,y:p.y+groundHeight(p.x,p.z)};engine.camera.position.set(p.x-Math.sin(p.yaw)*.085,world.y+p.eye,p.z-Math.cos(p.yaw)*.085);engine.camera.rotation.set(p.pitch,p.yaw,0,"YXZ");
 localTape.restore();localSurvey.restore();animateBuilder(localBody,world,dt);
 measurement=localTape.update(tape,world,engine.camera);if(measurement?.over){tape.anchor=null;toolNotice("30 m limit reached · tape retracted");measurement=null;}updateTapeHud();surveyResult=localSurvey.update(survey,world,elapsed,stations(),engine.camera);updateSurveyHud();updateLayout();
 drawPeers(dt,elapsed);const now=performance.now();if(session&&!leaving&&!inFlight&&now-lastSync>(failures?1500:250)){lastSync=now;sync()}if(now-lastStatus>250){lastStatus=now;$("motion").textContent=p.mode.toUpperCase();$("fps").textContent=engine.fps+" FPS";}
 }catch(e){console.error("Movement frame",e);keys.clear();$("net").textContent="Frame error; controls cleared.";}});engine.start();refreshSaves();
 loadCharacterAsset(engine.assets,"./assets/quaternius-animated-human.glb",{splitJump:true}).then(a=>{const body=createBuilder(a,engine.scene,{local:true});body.model.root.visible=false;localTape=makeTapeVisual(engine.scene,body,{local:true});localSurvey=makeSurveyVisual(engine.scene,body,{local:true});localBody=body;asset=a;$("assetStatus").textContent="Character asset ready."}).catch(e=>{$("assetStatus").textContent="Character model failed to load. Refresh to retry.";console.error(e)});
}
try{boot()}catch(e){console.error(e);$("error").textContent="3D startup failed: "+e.message;[$("host"),$("join")].forEach(b=>b.disabled=true);}
