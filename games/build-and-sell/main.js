
import {THREE,GameEngine} from "../../engine/core.js";
import {loadCharacterAsset} from "../../engine/character-assets.js";
import {createBuilder,animateBuilder} from "./builder-rig.js?v=3";
import {playerState,step,snapshot,sanitizePose,angleMix,clamp,STAND} from "./movement.mjs";
const $=id=>document.getElementById(id),canvas=$("world"),keys=new Set(),peers=new Map();
let engine,asset=null,session=null,playing=false,p=playerState(0,5),lastSync=0,inFlight=false,failures=0,generation=0,lastStatus=0,localBody,saveMeta=null,saveReady=false,menuBusy=false,leaving=false,noticeUntil=0;
const mat=(color,roughness=.8)=>new THREE.MeshStandardMaterial({color,roughness});
const dirt=mat("#b39d7d"),grass=mat("#799258"),wood=mat("#a58b63"),road=mat("#777f80");
function box(parent,w,h,d,x,y,z,m){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function site(){
 const s=engine.scene;s.background=new THREE.Color("#b8d0df");s.fog=new THREE.Fog("#b8d0df",55,120);
 s.add(new THREE.HemisphereLight("#edf7ff","#a89b74",2));const sun=new THREE.DirectionalLight("#fff2d7",3);sun.position.set(-20,30,16);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-28,right:28,top:28,bottom:-28,near:1,far:80});sun.shadow.bias=-.0003;s.add(sun);
 box(s,150,.10,150,0,-.075,0,grass);box(s,48,.05,48,0,-.025,0,dirt);box(s,120,.05,6,0,-.023,30,road);
 for(const x of [-24,24])for(let z=-24;z<=24;z+=8)box(s,.1,.6,.1,x,.3,z,wood);
 for(const z of [-24,24])for(let x=-16;x<=16;x+=8)box(s,.1,.6,.1,x,.3,z,wood);
 const lines=new THREE.BufferGeometry().setFromPoints([[-24,-24],[24,-24],[24,24],[-24,24],[-24,-24]].map(([x,z])=>new THREE.Vector3(x,.03,z)));s.add(new THREE.Line(lines,new THREE.LineBasicMaterial({color:"#e5d3a2"})));
 for(let i=0;i<10;i++){const x=-43+i*9,z=-34;box(s,.3,2.8,.3,x,1.4,z,wood);for(let j=0;j<3;j++){const l=new THREE.Mesh(new THREE.IcosahedronGeometry(1.7-j*.24,2),grass);l.position.set(x+(j-1)*.5,2.7+j*.5,z);l.castShadow=true;s.add(l)}}
}
function makePeer(id,n){
 if(!asset)return null;const builder=createBuilder(asset,engine.scene),model=builder.model;
 const c=document.createElement("canvas");c.width=256;c.height=64;const ctx=c.getContext("2d");ctx.fillStyle="#172724";ctx.fillRect(0,0,256,64);ctx.font="bold 26px sans-serif";ctx.fillStyle="white";ctx.textAlign="center";ctx.fillText(n,128,42,230);const tex=new THREE.CanvasTexture(c);const tag=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:true}));tag.position.y=2.08;tag.scale.set(.8,.20,1);model.root.add(tag);
 return {...builder,tag,target:null,shown:null,name:n};
}
function removePeer(id){const a=peers.get(id);if(!a)return;a.tag.material.map.dispose();a.tag.material.dispose();a.dispose();peers.delete(id)}
function updatePeers(list){const ids=new Set();for(const item of list){if(item.id===session?.id)continue;const pose=sanitizePose(item.pose);if(!pose)continue;ids.add(item.id);let a=peers.get(item.id);if(!a){a=makePeer(item.id,item.name);if(!a)continue;peers.set(item.id,a);a.shown={...pose};}a.target=pose;}for(const id of peers.keys())if(!ids.has(id))removePeer(id);$("roster").textContent=list.length+" / 8 builders";}
function drawPeers(dt){for(const a of peers.values()){if(!a.target)continue;const t=a.target,s=a.shown,f=1-Math.exp(-13*dt);for(const k of ["x","y","z","pitch","speed"])s[k]+=(t[k]-s[k])*f;s.yaw=angleMix(s.yaw,t.yaw,f);s.mode=t.mode;s.crouch=t.crouch;animateBuilder(a,s,dt);}}
async function post(payload){const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),7000);try{const response=await fetch("/api/build-and-sell/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),signal:ac.signal});const data=await response.json();if(!response.ok||!data.ok){const e=new Error(data.error||"Session request failed");e.status=response.status;throw e;}return data;}finally{clearTimeout(timer)}}
async function sync(){if(!session||inFlight||!playing)return;const s=session,g=generation;inFlight=true;
 try{const d=await post({action:"sync",...s,pose:snapshot(p)});if(g!==generation)return;failures=0;updatePeers(d.players);if(performance.now()>noticeUntil)$("net").textContent=session.host?"Connected · autosave active":"Connected · guest";}
 catch(e){if(g!==generation)return;failures++;$("net").textContent=e.status===410?"Session expired · leave and rejoin":"Connection interrupted · retrying";if(e.status===410){returnToMenu("Session ended. Load your world or ask for a fresh code.");}}
 finally{if(g===generation)inFlight=false;}
}

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
 keys.clear();$("menu").classList.add("hidden");for(const id of ["hud","cross","help","pause"])$(id).classList.remove("hidden");
 $("session").textContent="SESSION "+s.code;$("copy").classList.remove("hidden");$("save").classList.toggle("hidden",!s.host);$("leave").textContent=s.host?"Save & Exit":"Leave session";
 $("net").textContent="Connecting…";$("roster").textContent="1 / 8 builders";localBody.model.root.visible=true;sync();
}
function returnToMenu(message=""){
 generation++;playing=false;session=null;keys.clear();inFlight=false;document.exitPointerLock?.();for(const id of peers.keys())removePeer(id);if(localBody)localBody.model.root.visible=false;
 for(const id of ["hud","cross","help","pause"])$(id).classList.add("hidden");$("menu").classList.remove("hidden");$("error").textContent=message;refreshSaves();
}
async function saveNow(){
 if(!session?.host||leaving)return;const s=session,g=generation;$("save").disabled=true;
 try{const d=await post({action:"save",...s,pose:snapshot(p)});if(g===generation)notice(d.saved?"World saved.":"Save could not be confirmed.");}
 catch(e){if(g===generation)notice("Save failed: "+e.message);}
 finally{$("save").disabled=false;}
}
async function leave(){
 if(!session||leaving)return;const s=session;leaving=true;$("leave").disabled=true;keys.clear();document.exitPointerLock?.();
 try{const d=await post({action:"leave",...s,pose:snapshot(p)});returnToMenu(s.host&&d.saved?"World saved. Previous code is closed.":"Session left.");}
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
function boot(){engine=new GameEngine(canvas,{fov:76});site();engine.scene.add(engine.camera);
 engine.camera.rotation.order="YXZ";engine.camera.position.set(0,STAND,5);
 canvas.addEventListener("click",()=>{if(playing&&document.pointerLockElement!==canvas){try{canvas.requestPointerLock()?.catch?.(()=>{})}catch{}}});
 document.addEventListener("pointerlockchange",()=>{keys.clear();$("pause").classList.toggle("hidden",!playing||document.pointerLockElement===canvas)});
 document.addEventListener("mousemove",e=>{if(playing&&document.pointerLockElement===canvas){p.yaw-=e.movementX*.0021;p.pitch=clamp(p.pitch-e.movementY*.0021,-1.44,1.44);}});
 document.addEventListener("keydown",e=>{if(playing&&document.pointerLockElement===canvas&&/^(Key[WASDC]|ShiftLeft|ShiftRight|ControlLeft|ControlRight|Space)$/.test(e.code)){e.preventDefault();keys.add(e.code);}});document.addEventListener("keyup",e=>keys.delete(e.code));window.addEventListener("blur",()=>keys.clear());
 $("host").onclick=()=>online("host");$("save").onclick=saveNow;$("join").onclick=()=>online("join");$("leave").onclick=leave;$("copy").onclick=async()=>{if(session){try{await navigator.clipboard.writeText(session.code);notice("Session code copied.")}catch{notice("Share code "+session.code)}}};
 window.addEventListener("pagehide",()=>{if(session)navigator.sendBeacon("/api/build-and-sell/session",new Blob([JSON.stringify({action:"leave",...session,pose:snapshot(p)})],{type:"application/json"}))});
 engine.onFrame((dt,elapsed)=>{if(!playing)return;try{
 if(document.pointerLockElement!==canvas)keys.clear();step(p,keys,dt);
 // Eye position is slightly forward of the torso, not attached to a bobbing mesh.
 // The head is hidden only for this client; arms, hands and legs are the actual rig.
 engine.camera.position.set(p.x-Math.sin(p.yaw)*.085,p.y+p.eye,p.z-Math.cos(p.yaw)*.085);engine.camera.rotation.set(p.pitch,p.yaw,0,"YXZ");
 animateBuilder(localBody,p,dt);
 drawPeers(dt);const now=performance.now();if(session&&!leaving&&!inFlight&&now-lastSync>(failures?1500:250)){lastSync=now;sync()}if(now-lastStatus>250){lastStatus=now;$("motion").textContent=p.mode.toUpperCase();$("fps").textContent=engine.fps+" FPS";}
 }catch(e){console.error("Movement frame",e);keys.clear();$("net").textContent="Frame error; controls cleared.";}});engine.start();refreshSaves();
 loadCharacterAsset(engine.assets,"./assets/quaternius-animated-human.glb",{splitJump:true}).then(a=>{const body=createBuilder(a,engine.scene,{local:true});body.model.root.visible=false;localBody=body;asset=a;$("assetStatus").textContent="Character asset ready."}).catch(e=>{$("assetStatus").textContent="Character model failed to load. Refresh to retry.";console.error(e)});
}
try{boot()}catch(e){console.error(e);$("error").textContent="3D startup failed: "+e.message;[$("host"),$("join")].forEach(b=>b.disabled=true);}
