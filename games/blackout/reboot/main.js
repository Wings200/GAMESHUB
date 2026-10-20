// BLACKOUT REBOOT V0.4 — first playable weapon and target range, still offline
// from every BLACKOUT V1–V8 module, asset, operator and online service.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import {FOUNDATION_VERSION,TEST_OBSTACLES,initialPlayer,stepPlayer} from "./physics.js?v=reboot-003";
import {newFootstepTracker,advanceFootsteps,FootstepAudio} from "./footsteps.js?v=reboot-003";
import {WEAPON_SPEC,newWeaponState,stepWeapon} from "./weapon.js?v=reboot-004";
import {createWeaponView,createTargetRange,createShotEffects,WeaponAudio} from "./weapon-view.js?v=reboot-004";
const $=id=>document.getElementById(id);
const canvas=$("game"),menu=$("menu"),hud=$("hud");
const play=$("play"),message=$("message"),error=$("error");
const positionText=$("position"),speedText=$("speed"),groundText=$("ground");
const modeText=$("mode"),motionText=$("motion"),hint=$("hint");
const crosshair=$("crosshair");
const ammoText=$("ammo"),weaponStatus=$("weapon-status"),hitsText=$("target-hits"),shotNotice=$("shot-notice");
let renderer;
try{
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:"high-performance"});
}catch(err){
  error.classList.remove("hidden");
  error.textContent="BLACKOUT requires WebGL graphics support. "+String(err?.message||err);
  throw err;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.35;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x101e2c);
scene.fog=new THREE.FogExp2(0x101e2c,.017);
const camera=new THREE.PerspectiveCamera(77,1,.04,180);
camera.rotation.order="YXZ";
scene.add(new THREE.HemisphereLight(0xc4e5fa,0x172735,2.15));
const sun=new THREE.DirectionalLight(0xedf5ff,2.8);
sun.position.set(-14,30,19);
sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left=-37;
sun.shadow.camera.right=37;
sun.shadow.camera.top=37;
sun.shadow.camera.bottom=-37;
sun.shadow.camera.near=.5;
sun.shadow.camera.far=90;
sun.shadow.bias=-.00012;
scene.add(sun);
// Empty floor first. The four objects are movement/collision probes,
// never a promised multiplayer or tactical map.
const floor=new THREE.Mesh(new THREE.PlaneGeometry(60,60),
  new THREE.MeshStandardMaterial({color:0x3c5060,roughness:.91,metalness:.035}));
floor.rotation.x=-Math.PI/2;
floor.position.y=-.035;
floor.receiveShadow=true;
scene.add(floor);
const grid=new THREE.GridHelper(60,60,0x6fa9b9,0x577484);
grid.position.y=.005;
grid.material.transparent=true;
grid.material.opacity=.21;
scene.add(grid);
const edgeMat=new THREE.MeshBasicMaterial({color:0x75d2c7,transparent:true,opacity:.68});
const blockMat=new THREE.MeshStandardMaterial({color:0x798e9d,metalness:.22,roughness:.6});
const wallMat=new THREE.MeshStandardMaterial({color:0x5b7383,metalness:.12,roughness:.85});
const shootableSolids=[floor];
for(const obstacle of TEST_OBSTACLES){
  const geometry=new THREE.BoxGeometry(obstacle.width,obstacle.height,obstacle.depth);
  const mesh=new THREE.Mesh(geometry,obstacle.id.startsWith("wall")?wallMat:blockMat);
  mesh.position.set(obstacle.x,obstacle.height/2,obstacle.z);
  mesh.castShadow=true;mesh.receiveShadow=true;
  mesh.userData.physicsObstacleId=obstacle.id;
  scene.add(mesh);shootableSolids.push(mesh);
  const lines=new THREE.LineSegments(new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({color:0x9fced5,transparent:true,opacity:.48}));
  mesh.add(lines);
}
// Physical visible boundary edges. Actual movement limit is tested in physics.js.
const boundaryMat=new THREE.MeshStandardMaterial({color:0x123746,roughness:.9});
for(const [x,z,w,d] of [[0,-30,60,.17],[0,30,60,.17],[-30,0,.17,60],[30,0,.17,60]]){
 const piece=new THREE.Mesh(new THREE.BoxGeometry(w,.17,d),boundaryMat);
 piece.position.set(x,.04,z);scene.add(piece);
}
const floorBeacons=new THREE.MeshStandardMaterial({color:0x3fe5bb,emissive:0x0d745f,
 emissiveIntensity:.4,roughness:.3});
for(const [x,z] of [[0,0],[-10,-11],[11,-11],[-10,10],[10,10]]){
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.5,.065,6,32),floorBeacons);
 ring.rotation.x=-Math.PI/2;ring.position.set(x,.035,z);scene.add(ring);
}
const weaponView=createWeaponView(THREE,camera,scene);
const targets=createTargetRange(THREE,scene);
const shotEffects=createShotEffects(THREE,scene);
const shotAudio=new WeaponAudio();
const raycaster=new THREE.Raycaster();
const keys=new Set();
const footstepAudio=new FootstepAudio();
let footstepTracker=newFootstepTracker();
let player=initialPlayer(),lastTime=performance.now(),lastHud=0;
let cameraEye=1.65;
let locked=false,started=false;
let proneToggle=false;
let weaponState=newWeaponState();
let firing=false,aimHeld=false,reloadPressed=false,aimMix=0,targetHits=0;
let shotNoticeLeft=0,pendingShots=0;
function resize(){
 const width=Math.max(1,window.innerWidth),height=Math.max(1,window.innerHeight);
 renderer.setSize(width,height,false);
 camera.aspect=width/height;camera.updateProjectionMatrix();
}
resize();
window.addEventListener("resize",resize);
function unlockMessage(){
 message.textContent=started?
   "PAUSED · PRESS ENTER TEST RANGE TO RESUME. YOUR POSITION IS PRESERVED.":
   "OFFLINE SYSTEM · NO OPERATORS / NO GUNS / NO AI / NO MULTIPLAYER";
}
function enterRange(){
 started=true;
 // User gesture unlocks Web Audio before browser pointer lock takes over.
 void footstepAudio.unlock().then(()=>shotAudio.connect(footstepAudio.context));
 if(!canvas.requestPointerLock){
   error.textContent="This browser does not support pointer lock. Use a desktop browser.";
   error.classList.remove("hidden");return;
 }
 try{
   const request=canvas.requestPointerLock();
   if(request?.catch)request.catch(()=>{
     message.textContent="MOUSE LOCK WAS BLOCKED. CLICK ENTER TEST RANGE AGAIN.";
   });
 }catch{
   message.textContent="MOUSE LOCK WAS BLOCKED. CLICK ENTER TEST RANGE AGAIN.";
 }
}
play.addEventListener("click",enterRange);
document.addEventListener("pointerlockchange",()=>{
 locked=document.pointerLockElement===canvas;
 menu.classList.toggle("hidden",locked);
 hud.classList.toggle("hidden",!locked);
 crosshair.classList.toggle("hidden",!locked);
 if(!locked){keys.clear();footstepTracker=newFootstepTracker();proneToggle=false;firing=false;aimHeld=false;reloadPressed=false;unlockMessage();}
 lastTime=performance.now();
});
document.addEventListener("pointerlockerror",()=>{
 message.textContent="POINTER LOCK FAILED · CLICK ENTER TEST RANGE AGAIN";
});
document.addEventListener("mousemove",event=>{
 if(!locked)return;
 player.yaw-=event.movementX*.00215;
 player.pitch=Math.max(-1.48,Math.min(1.48,player.pitch-event.movementY*.00215));
});
document.addEventListener("keydown",event=>{
 if(locked&&(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","KeyC","ControlLeft","ControlRight"].includes(event.code)||event.ctrlKey))
   event.preventDefault();
 if(!locked)return;
 if(event.code==="KeyP"&&!event.repeat){
   player=initialPlayer();cameraEye=1.65;proneToggle=false;footstepTracker=newFootstepTracker();hint.textContent="POSITION RESET · TRY THE OBSTACLES AGAIN.";
 }
 if((event.code==="ControlLeft"||event.code==="ControlRight"||event.code==="KeyZ")&&!event.repeat){
   proneToggle=!proneToggle;
   hint.textContent=proneToggle?
    "PRONE ON · RELEASE CTRL THEN MOVE · TAP CTRL OR Z TO STAND.":
    "PRONE OFF · HOLD C TO CROUCH.";
 }
 if(event.code==="KeyR"&&!event.repeat)reloadPressed=true;
 if(event.code==="KeyM"&&!event.repeat){
   const muted=footstepAudio.toggleMute();
   hint.textContent=muted?"FOOTSTEPS MUTED · PRESS M TO UNMUTE.":"FOOTSTEPS ENABLED · WALK, SPRINT AND CROUCH TO COMPARE.";
 }
 keys.add(event.code);
});
document.addEventListener("keyup",event=>keys.delete(event.code));
document.addEventListener("mousedown",event=>{
 if(!locked)return;
 if(event.button===0)firing=true;
 if(event.button===2)aimHeld=true;
 if(event.button===0||event.button===2)event.preventDefault();
});
document.addEventListener("mouseup",event=>{
 if(event.button===0)firing=false;
 if(event.button===2)aimHeld=false;
});
canvas.addEventListener("contextmenu",event=>event.preventDefault());
window.addEventListener("blur",()=>{keys.clear();firing=false;aimHeld=false;reloadPressed=false;footstepTracker=newFootstepTracker();});
function hudFrame(){
 positionText.textContent=player.x.toFixed(1)+" / "+player.z.toFixed(1);
 speedText.innerHTML=player.speed.toFixed(1)+" <span>M/S</span>";
 groundText.textContent=player.grounded?"STABLE":"AIRBORNE";
 modeText.textContent=player.prone?"PRONE":player.crouched?"CROUCHED":player.sprinting?"SPRINTING":"STANDING";
 motionText.textContent=player.grounded?(player.moving?"MOVING":"IDLE"):"JUMP";
 ammoText.textContent=weaponState.ammo+" / "+weaponState.reserve;
 weaponStatus.textContent=weaponState.reloading>0?"RELOADING":aimMix>.8?"ADS":firing?"FIRING":"READY";
 hitsText.textContent=String(targetHits);
}
function fireShot(){
 weaponView.flash();shotAudio.fire();
 // Aim from the eye, not from a fabricated 2D crosshair or the muzzle model.
 camera.updateMatrixWorld(true);
 const spread=aimMix>.78?.0005:.023;
 const direction=new THREE.Vector3((Math.random()*2-1)*spread,
   (Math.random()*2-1)*spread,-1).normalize().applyQuaternion(camera.quaternion);
 raycaster.set(camera.position,direction);raycaster.far=150;
 const activeTargets=targets.filter(t=>t.downTime<=0);
 const collision=[...shootableSolids,...activeTargets.map(t=>t.group)];
 const intersections=raycaster.intersectObjects(collision,true);
 if(!intersections.length)return;
 const hit=intersections[0];
 let node=hit.object;
 while(node&&!node.userData.targetId)node=node.parent;
 const id=node?.userData?.targetId;
 const target=id?activeTargets.find(t=>t.id===id):null;
 shotEffects.mark(hit,Boolean(target));
 if(target){
  target.downTime=1.6;target.group.visible=false;target.hits++;
  targetHits++;
  shotNotice.textContent="TARGET HIT · "+target.id.toUpperCase();
  shotNoticeLeft=1.2;
 }
}
function animate(now){
 requestAnimationFrame(animate);
 const dt=Math.min(.05,Math.max(0,(now-lastTime)/1000));
 lastTime=now;
 if(locked){
   const input={
     forward:Number(keys.has("KeyW")||keys.has("ArrowUp"))-
       Number(keys.has("KeyS")||keys.has("ArrowDown")),
     right:Number(keys.has("KeyD")||keys.has("ArrowRight"))-
       Number(keys.has("KeyA")||keys.has("ArrowLeft")),
     sprint:keys.has("ShiftLeft")||keys.has("ShiftRight"),
     crouch:keys.has("KeyC"),
     prone:proneToggle,
     jump:keys.has("Space")
   };
   const before=player;
   player=stepPlayer(player,input,dt);
   const next=advanceFootsteps(footstepTracker,before,player);
   footstepTracker=next.tracker;
   footstepAudio.play(next.events);
   const result=stepWeapon(weaponState,{fire:firing,ads:aimHeld,reload:reloadPressed},dt);
   weaponState=result.state;
   reloadPressed=false;
   aimMix+=((aimHeld?1:0)-aimMix)*Math.min(1,dt*13);
   camera.fov=77-14*aimMix;
   camera.updateProjectionMatrix();
   camera.updateMatrixWorld(true);
   // Shots execute after the updated camera pose is applied below.
   pendingShots=result.events.shots;
   if(result.events.reloadStarted){
    shotNotice.textContent="RELOADING · "+WEAPON_SPEC.reloadSeconds.toFixed(1)+"S";
    shotNoticeLeft=.9;
   }
 }
 // Drop the camera immediately for low cover; smoothly raise when clearance allows.
 const eyeTarget=player.prone?.44:player.crouched?1.08:1.65;
 cameraEye=eyeTarget<cameraEye?eyeTarget:cameraEye+(eyeTarget-cameraEye)*Math.min(1,dt*12);
 camera.position.set(player.x,player.y+cameraEye,player.z);
 camera.rotation.set(player.pitch,player.yaw,0,"YXZ");
 camera.updateMatrixWorld(true);
 if(locked&&pendingShots>0){
  for(let i=0;i<pendingShots;i++)fireShot();
  pendingShots=0;
 }
 for(const t of targets){
  if(t.downTime>0){t.downTime=Math.max(0,t.downTime-dt);if(t.downTime===0)t.group.visible=true;}
 }
 shotEffects.tick(dt);
 shotNoticeLeft=Math.max(0,shotNoticeLeft-dt);
 shotNotice.classList.toggle("hidden",shotNoticeLeft<=0);
 weaponView.update(dt,aimMix,weaponState.recoil,player.moving&&player.grounded);
 crosshair.classList.toggle("hidden",!locked||aimMix>.78);
 renderer.render(scene,camera);
 if(locked&&now-lastHud>110){hudFrame();lastHud=now;}
}
requestAnimationFrame(animate);
console.info("BLACKOUT clean reboot",FOUNDATION_VERSION,
  "standalone movement/collision; old game runtime not loaded");
