
import {THREE,GameEngine} from "../../engine/core.js";
import {loadCharacterAsset} from "../../engine/character-assets.js";
import {AnimationController} from "../../engine/animation.js";
import {RoundedBoxGeometry} from "three/addons/geometries/RoundedBoxGeometry.js";
import {playerState,step,snapshot,sanitizePose,angleMix,clamp,STAND} from "./movement.mjs";
const $=id=>document.getElementById(id),canvas=$("world"),keys=new Set(),peers=new Map();
let engine,asset=null,session=null,playing=false,p=playerState(0,5),lastSync=0,inFlight=false,failures=0,generation=0,hands,stepPhase=0,lastStatus=0,localBody;
const mat=(color,roughness=.8)=>new THREE.MeshStandardMaterial({color,roughness});
const dirt=mat("#b39d7d"),grass=mat("#799258"),wood=mat("#a58b63"),dark=mat("#34414a"),glove=mat("#3c494c"),sleeve=mat("#5a6766"),road=mat("#777f80");
function box(parent,w,h,d,x,y,z,m,rounded=false){const o=new THREE.Mesh(rounded?new RoundedBoxGeometry(w,h,d,3,Math.min(w,h,d)*.20):new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function site(){
 const s=engine.scene;s.background=new THREE.Color("#b8d0df");s.fog=new THREE.Fog("#b8d0df",55,120);
 s.add(new THREE.HemisphereLight("#edf7ff","#a89b74",2));const sun=new THREE.DirectionalLight("#fff2d7",3);sun.position.set(-20,30,16);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-28,right:28,top:28,bottom:-28,near:1,far:80});sun.shadow.bias=-.0003;s.add(sun);
 box(s,150,.10,150,0,-.075,0,grass);box(s,48,.05,48,0,-.025,0,dirt);box(s,120,.05,6,0,-.023,30,road);
 for(const x of [-24,24])for(let z=-24;z<=24;z+=8)box(s,.1,.6,.1,x,.3,z,wood);
 for(const z of [-24,24])for(let x=-16;x<=16;x+=8)box(s,.1,.6,.1,x,.3,z,wood);
 const lines=new THREE.BufferGeometry().setFromPoints([[-24,-24],[24,-24],[24,24],[-24,24],[-24,-24]].map(([x,z])=>new THREE.Vector3(x,.03,z)));s.add(new THREE.Line(lines,new THREE.LineBasicMaterial({color:"#e5d3a2"})));
 for(let i=0;i<10;i++){const x=-43+i*9,z=-34;box(s,.3,2.8,.3,x,1.4,z,wood);for(let j=0;j<3;j++){const l=new THREE.Mesh(new THREE.IcosahedronGeometry(1.7-j*.24,2),grass);l.position.set(x+(j-1)*.5,2.7+j*.5,z);l.castShadow=true;s.add(l)}}
}
function makeHands(){const root=new THREE.Group();engine.camera.add(root);const arms=[];
 for(const side of [-1,1]){const g=new THREE.Group();g.position.set(side*.31,-.46,-.40);root.add(g);box(g,.115,.13,.34,0,0,-.12,sleeve,true);box(g,.11,.095,.135,0,0,-.34,glove,true);for(let i=0;i<4;i++)box(g,.021,.065,.075,-.041+i*.026,-.015,-.415,glove,true);box(g,.035,.078,.07,-side*.061,-.008,-.34,glove,true);arms.push({g,side});}
 root.visible=false;return {root,arms}}
function makeLegs(){const q=new THREE.Group();engine.scene.add(q);const limbs=[];for(const side of [-1,1]){const a=new THREE.Group();a.position.set(side*.105,.87,0);q.add(a);box(a,.16,.39,.18,0,-.18,0,dark,true);const knee=new THREE.Group();knee.position.y=-.38;a.add(knee);box(knee,.145,.37,.15,0,-.17,0,dark,true);box(knee,.16,.12,.27,0,-.44,-.045,glove,true);limbs.push({a,knee,side})}return {q,limbs}}
function makePeer(id,n){
 if(!asset)return null;const model=asset.createInstance({height:1.78,heading:Math.PI});engine.scene.add(model.root);
 const anim=new AnimationController(model.root,{clips:model.clips,fadeSeconds:.16});anim.playLoop("idle");
 let head=null;model.model.traverse(o=>{if(o.isBone&&/head/i.test(o.name)&&!head)head=o});
 const c=document.createElement("canvas");c.width=256;c.height=64;const ctx=c.getContext("2d");ctx.fillStyle="#172724";ctx.fillRect(0,0,256,64);ctx.font="bold 26px sans-serif";ctx.fillStyle="white";ctx.textAlign="center";ctx.fillText(n,128,42,230);const tex=new THREE.CanvasTexture(c);const tag=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:true}));tag.position.y=2.08;tag.scale.set(.8,.20,1);model.root.add(tag);
 return {model,anim,head,tag,target:null,shown:null,lastHeadOffset:0,name:n};
}
function removePeer(id){const a=peers.get(id);if(!a)return;a.anim.dispose();a.tag.material.map.dispose();a.tag.material.dispose();a.model.dispose();peers.delete(id)}
function updatePeers(list){const ids=new Set();for(const item of list){if(item.id===session?.id)continue;const pose=sanitizePose(item.pose);if(!pose)continue;ids.add(item.id);let a=peers.get(item.id);if(!a){a=makePeer(item.id,item.name);if(!a)continue;peers.set(item.id,a);a.shown={...pose};}a.target=pose;}for(const id of peers.keys())if(!ids.has(id))removePeer(id);$("roster").textContent=list.length+" / 8 builders";}
function drawPeers(dt){for(const a of peers.values()){if(!a.target)continue;const t=a.target,s=a.shown,f=1-Math.exp(-13*dt);for(const k of ["x","y","z","pitch","speed"])s[k]+=(t[k]-s[k])*f;s.yaw=angleMix(s.yaw,t.yaw,f);const r=a.model.root;r.position.set(s.x,s.y,s.z);r.rotation.y=s.yaw;const scale=t.crouch?.72:1;r.scale.y+=(scale-r.scale.y)*f;
 let mode=t.mode==="crouchWalk"?"walk":t.mode==="crouch"?"idle":t.mode;if(!a.anim.has(mode))mode="idle";
 if(a.head)a.head.rotateX(-a.lastHeadOffset);
 a.anim.playLoop(mode,{speed:mode==="walk"?(t.crouch?.55:clamp(s.speed/3.25,.6,1.4)):1});a.anim.update(dt);
 if(a.head){a.lastHeadOffset=clamp(s.pitch,-.9,.9)*.55;a.head.rotateX(a.lastHeadOffset);}
 }}
async function post(payload){const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),7000);try{const response=await fetch("/api/build-and-sell/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),signal:ac.signal});const data=await response.json();if(!response.ok||!data.ok){const e=new Error(data.error||"Session request failed");e.status=response.status;throw e;}return data;}finally{clearTimeout(timer)}}
async function sync(){if(!session||inFlight||!playing)return;const s=session,g=generation;inFlight=true;
 try{const d=await post({action:"sync",...s,pose:snapshot(p)});if(g!==generation)return;failures=0;updatePeers(d.players);$("net").textContent="Connected · state updates";}
 catch(e){if(g!==generation)return;failures++;$("net").textContent=e.status===410?"Session expired · leave and rejoin":"Connection interrupted · retrying";if(e.status===410){for(const id of peers.keys())removePeer(id);}}
 finally{if(g===generation)inFlight=false;}
}
function begin(s=null){session=s;generation++;inFlight=false;failures=0;lastSync=0;playing=true;p=playerState(s?(Math.random()-.5)*3:0,4+Math.random()*1.2);keys.clear();$("menu").classList.add("hidden");for(const id of ["hud","cross","help","pause"])$(id).classList.remove("hidden");$("session").textContent=s?"SESSION "+s.code:"SOLO";$("copy").classList.toggle("hidden",!s);$("net").textContent=s?"Connecting…":"Local movement test";$("roster").textContent=s?"1 / 8 builders":"1 builder";hands.root.visible=true;localBody.q.visible=true;if(s)sync();}
function leave(){const s=session;generation++;playing=false;session=null;keys.clear();inFlight=false;document.exitPointerLock?.();for(const id of peers.keys())removePeer(id);hands.root.visible=false;localBody.q.visible=false;for(const id of ["hud","cross","help","pause"])$(id).classList.add("hidden");$("menu").classList.remove("hidden");if(s)post({action:"leave",...s}).catch(()=>{});}
async function online(action){if(playing)return;const buttons=[$("solo"),$("host"),$("join")];buttons.forEach(b=>b.disabled=true);$("error").textContent="Connecting…";try{if(!asset)throw Error("Character asset must load before multiplayer.");const s=await post({action,name:$("name").value,code:$("code").value.trim().toUpperCase()});$("error").textContent="";begin({code:s.code,id:s.id,token:s.token});}catch(e){$("error").textContent=e.message||"Could not connect."}finally{buttons.forEach(b=>b.disabled=false)}}
function boot(){engine=new GameEngine(canvas,{fov:76});site();engine.scene.add(engine.camera);hands=makeHands();localBody=makeLegs();localBody.q.visible=false;
 engine.camera.rotation.order="YXZ";engine.camera.position.set(0,STAND,5);
 canvas.addEventListener("click",()=>{if(playing&&document.pointerLockElement!==canvas){try{canvas.requestPointerLock()?.catch?.(()=>{})}catch{}}});
 document.addEventListener("pointerlockchange",()=>{keys.clear();$("pause").classList.toggle("hidden",!playing||document.pointerLockElement===canvas)});
 document.addEventListener("mousemove",e=>{if(playing&&document.pointerLockElement===canvas){p.yaw-=e.movementX*.0021;p.pitch=clamp(p.pitch-e.movementY*.0021,-1.44,1.44);}});
 document.addEventListener("keydown",e=>{if(playing&&document.pointerLockElement===canvas&&/^(Key[WASDC]|ShiftLeft|ShiftRight|ControlLeft|ControlRight|Space)$/.test(e.code)){e.preventDefault();keys.add(e.code);}});document.addEventListener("keyup",e=>keys.delete(e.code));window.addEventListener("blur",()=>keys.clear());
 $("solo").onclick=()=>begin();$("host").onclick=()=>online("create");$("join").onclick=()=>online("join");$("leave").onclick=leave;$("copy").onclick=async()=>{if(session){try{await navigator.clipboard.writeText(session.code);$("net").textContent="Session code copied."}catch{$("net").textContent="Share code "+session.code}}};
 window.addEventListener("pagehide",()=>{if(session)navigator.sendBeacon("/api/build-and-sell/session",new Blob([JSON.stringify({action:"leave",...session})],{type:"application/json"}))});
 engine.onFrame((dt,elapsed)=>{if(!playing)return;try{
 if(document.pointerLockElement!==canvas)keys.clear();step(p,keys,dt);engine.camera.position.set(p.x,p.y+p.eye,p.z);engine.camera.rotation.set(p.pitch,p.yaw,0,"YXZ");
 stepPhase+=p.speed*dt*2.7;const swing=Math.min(1,p.speed/3.25);for(const a of hands.arms){a.g.rotation.x=Math.sin(stepPhase)*.14*swing*a.side;a.g.position.y=-.46+Math.cos(stepPhase)*.023*swing;}
 localBody.q.position.set(p.x,p.y,p.z);localBody.q.rotation.y=p.yaw;localBody.q.scale.y=p.crouch?.74:1;for(const l of localBody.limbs){l.a.rotation.x=Math.sin(stepPhase)*.45*swing*l.side;l.knee.rotation.x=Math.max(0,-l.a.rotation.x)*.9;}
 drawPeers(dt);const now=performance.now();if(session&&!inFlight&&now-lastSync>(failures?1500:250)){lastSync=now;sync()}if(now-lastStatus>250){lastStatus=now;$("motion").textContent=p.mode.toUpperCase();$("fps").textContent=engine.fps+" FPS";}
 }catch(e){console.error("Movement frame",e);keys.clear();$("net").textContent="Frame error; controls cleared.";}});engine.start();
 loadCharacterAsset(engine.assets,"./assets/quaternius-animated-human.glb",{splitJump:true}).then(a=>{asset=a;$("assetStatus").textContent="Character asset ready."}).catch(e=>{$("assetStatus").textContent="Character model failed to load; solo remains available.";console.error(e)});
}
try{boot()}catch(e){console.error(e);$("error").textContent="3D startup failed: "+e.message;[$("solo"),$("host"),$("join")].forEach(b=>b.disabled=true);}
