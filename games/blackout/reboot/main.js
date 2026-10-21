// BLACKOUT REBOOT V0.7.4 — ignore decorative outlines in bullet raycast
// from every BLACKOUT V1–V8 module, asset, operator and online service.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import {FOUNDATION_VERSION,TEST_OBSTACLES,initialPlayer,stepPlayer} from "./physics.js?v=reboot-008";
import {newFootstepTracker,advanceFootsteps,FootstepAudio} from "./footsteps.js?v=reboot-003";
import {Weapons} from "./legacy-weapons.js?v=reboot-006";
import {GameAudio} from "./legacy-audio.js?v=reboot-006";
import {cycleLegacyFire,legacyShotCone} from "./legacy-shooting.js?v=reboot-006";
import {createWeaponView,createTargetRange,createShotEffects} from "./weapon-view.js?v=reboot-012";
import {toggleLean,smoothLean,leanCameraPose} from "./lean.js?v=reboot-005";
import {aimState,firstHitType} from "./aim-resolver.js?v=reboot-007";
import {shotScreenPoint,describeAim,describeShot} from "./shot-ray.js?v=reboot-009";
import {combatIntersections} from "./combat-raycast.js?v=reboot-012";

const $=id=>document.getElementById(id);
const canvas=$("game"),menu=$("menu"),hud=$("hud");
const play=$("play"),message=$("message"),error=$("error");
const positionText=$("position"),speedText=$("speed"),groundText=$("ground");
const modeText=$("mode"),motionText=$("motion"),hint=$("hint");
const crosshair=$("crosshair");
const ammoText=$("ammo"),weaponStatus=$("weapon-status"),hitsText=$("target-hits"),shotNotice=$("shot-notice"),leanText=$("lean-status"),ballisticsDebug=$("ballistics-debug");
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
const shotAudio=new GameAudio();
const raycaster=new THREE.Raycaster();
const aimRaycaster=new THREE.Raycaster();
const keys=new Set();
const footstepAudio=new FootstepAudio();
let footstepTracker=newFootstepTracker();
let player=initialPlayer(),lastTime=performance.now(),lastHud=0;
let cameraEye=1.65;
let locked=false,started=false;
let proneToggle=false;
let weapons=new Weapons();
let gunKick=0,recoilRecovery=0,lastShotAt=-Infinity,lastEmptyClick=-Infinity;
let firing=false,aimHeld=false,reloadPressed=false,aimMix=0,targetHits=0;
let shotNoticeLeft=0;
let leanTarget=0,leanAmount=0;
let debugShots=false;
const opticWorld=new THREE.Vector3(),opticNdc=new THREE.Vector3();
const previewWorld=new THREE.Vector3(),previewNdc=new THREE.Vector3();
let lastShotReadout="NO SHOTS YET",liveAimReadout="—",lastAimProbe=-Infinity;
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
   "OFFLINE WEAPON RANGE · NO AI OR MULTIPLAYER";
}
function enterRange(){
 started=true;
 // User gesture unlocks Web Audio before browser pointer lock takes over.
 void footstepAudio.unlock();
 void shotAudio.unlock(); // Original V8 multi-layer gun mixer; unlock only on user click.
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
 if(!locked){keys.clear();footstepTracker=newFootstepTracker();proneToggle=false;firing=false;aimHeld=false;reloadPressed=false;leanTarget=0;leanAmount=0;unlockMessage();}
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
 if(locked&&(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","KeyC","KeyQ","KeyE","ControlLeft","ControlRight"].includes(event.code)||event.ctrlKey))
   event.preventDefault();
 if(!locked)return;
 if(event.code==="KeyP"&&!event.repeat){
   player=initialPlayer();cameraEye=1.65;proneToggle=false;leanTarget=0;leanAmount=0;footstepTracker=newFootstepTracker();hint.textContent="POSITION RESET · TRY THE OBSTACLES AGAIN.";
 }
 if((event.code==="ControlLeft"||event.code==="ControlRight"||event.code==="KeyZ")&&!event.repeat){
   proneToggle=!proneToggle;
   hint.textContent=proneToggle?
    "PRONE ON · RELEASE CTRL THEN MOVE · TAP CTRL OR Z TO STAND.":
    "PRONE OFF · HOLD C TO CROUCH.";
 }
 if((event.code==="KeyQ"||event.code==="KeyE")&&!event.repeat){
   leanTarget=toggleLean(leanTarget,event.code==="KeyQ"?-1:1);
   hint.textContent=leanTarget===-1?"LEAN LEFT · Q TO RETURN CENTER":
     leanTarget===1?"LEAN RIGHT · E TO RETURN CENTER":"LEAN CENTERED";
 }
 if(event.code==="KeyB"&&!event.repeat){
   debugShots=!debugShots;
   ballisticsDebug.classList.toggle("hidden",!debugShots);
   if(debugShots)ballisticsDebug.textContent="LIVE AIM: SCANNING · LAST SHOT: "+lastShotReadout;
   hint.textContent=debugShots?"B TO HIDE AIM / LAST SHOT DIAGNOSTICS":
    "BALLISTICS DEBUG OFF · B TO ENABLE";
 }
 if(event.code==="KeyV"&&!event.repeat){
   shotEffects.clear();
   hint.textContent="BULLET HOLES CLEARED · NEW IMPACTS WILL PERSIST";
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
 ammoText.textContent=weapons.current.ammo+" / "+weapons.current.remaining;
 weaponStatus.textContent=weapons.reloading?"RELOADING":aimMix>.8?"ADS":firing?"FIRING":"READY";
 hitsText.textContent=String(targetHits);
 leanText.textContent=leanTarget<0?"LEFT":leanTarget>0?"RIGHT":"CENTER";
}
// Aim probe reads exactly the same visible dot and collision meshes as shooting.
// It does NOT consume ammunition, move targets or alter the player's recoil.
function updateAimProbe(now){
 if(!locked||!debugShots||now-lastAimProbe<90)return;
 lastAimProbe=now;
 camera.updateMatrixWorld(true);
 const reticleVisible=aimHeld&&weaponView.reticle.visible;
 if(reticleVisible){
  weaponView.reticle.getWorldPosition(previewWorld);
  previewNdc.copy(previewWorld).project(camera);
 }
 const screen=shotScreenPoint({
  aiming:aimHeld,reticleVisible,
  reticleProjection:reticleVisible?previewNdc:null
 });
 aimRaycaster.setFromCamera({x:screen.x,y:screen.y},camera);
 aimRaycaster.far=weapons.current.range;
 const active=targets.filter(t=>t.downTime<=0);
 const intersections=combatIntersections(aimRaycaster,
  shootableSolids,active.map(t=>t.group));
 const outcome=firstHitType(intersections,active);
 liveAimReadout=describeAim(outcome,outcome.hit?.object?.userData?.hitZone||
   (outcome.kind==="target"?"body":""));
 ballisticsDebug.textContent="LIVE SIGHT: "+liveAimReadout+
  "\nLAST SHOT: "+lastShotReadout;
}
function markDebugShot(outcome,screen){
 const distance=outcome.hit?outcome.hit.distance:raycaster.far;
 const zone=outcome.hit?.object?.userData?.hitZone||"";
 lastShotReadout=describeShot(outcome,screen,distance,zone)+
  (outcome.hit&&outcome.kind!=="target"?
    " · SURFACE "+shotEffects.lastFace+
    " · "+shotEffects.lastObjectId.toUpperCase()+
    " · HOLES "+shotEffects.getBoxCount(shotEffects.lastObjectId)+
    " · Y "+outcome.hit.point.y.toFixed(2):"")+
  " · NDC "+screen.x.toFixed(3)+","+screen.y.toFixed(3);
 // No long-lived 3D lines: the video showed old world-space tracers
 // streaking across the scope while the camera moved. The normal bullet-hole
 // decal remains at the true impact, and these readouts track the real ray.
}
function fireShot(shot,sightAligned,now){
 // Restored from BLACKOUT V8: high/low layered firing sound, true rate of fire,
 // shot-pattern recoil, broad hip cone with stance and movement modifiers.
 weaponView.flash();weaponView.eject();
 shotAudio.play("fire");
 lastShotAt=now;
 const cone=legacyShotCone(shot,{
  aligned:sightAligned,prone:player.prone,crouched:player.crouched,moving:player.moving
 });
 // Use the dot THAT IS ACTUALLY ON SCREEN, not assumed NDC(0,0).
 // The gun view has already been updated this frame before this method runs.
 camera.updateMatrixWorld(true);
 const reticleVisible=sightAligned&&weaponView.reticle.visible;
 if(reticleVisible){
  weaponView.reticle.getWorldPosition(opticWorld);
  opticNdc.copy(opticWorld).project(camera);
 }
 const screen=shotScreenPoint({
  aiming:sightAligned,reticleVisible,
  reticleProjection:reticleVisible?opticNdc:null
 });
 raycaster.setFromCamera({x:screen.x+cone.x,y:screen.y+cone.y},camera);
 raycaster.far=shot.range;
 const activeTargets=targets.filter(t=>t.downTime<=0);
 const intersections=combatIntersections(raycaster,
  shootableSolids,activeTargets.map(t=>t.group));
 const outcome=firstHitType(intersections,activeTargets);
 if(outcome.hit)shotEffects.mark(outcome.hit,outcome.kind==="target");
 markDebugShot(outcome,screen);
 if(outcome.kind==="target"){
  const target=outcome.target;
  target.downTime=1.6;target.group.visible=false;target.hits++;
  targetHits++;weapons.registerHit();
  shotNotice.textContent=outcome.hit.object.userData?.hitZone==="head"?
    "HEADSHOT · "+target.id.toUpperCase():
    "TARGET HIT · "+target.id.toUpperCase();
  shotNoticeLeft=1.2;
  shotAudio.play("impact");
 }else if(sightAligned&&outcome.kind==="blocked"){
  // Tell the player when the nearest geometry actually stops the bullet.
  // Don't misrepresent wall impacts as bullets missing the holographic optic.
  shotNotice.textContent="SHOT BLOCKED · "+outcome.obstacle.toUpperCase();
  shotNoticeLeft=.55;
 }else if(sightAligned&&outcome.kind==="miss"){
  shotNotice.textContent="SHOT MISSED · CLEAR LINE";
  shotNoticeLeft=.4;
 }
 // The historical predictable pattern physically shifts the player's view.
 // Apply AFTER the raycast so this round follows its pre-kick optic alignment.
 player.pitch=Math.min(1.48,Math.max(-1.48,player.pitch+shot.kick.vertical));
 player.yaw+=shot.kick.horizontal;
 recoilRecovery+=shot.kick.vertical;
 gunKick=Math.min(.25,gunKick+.085);
 camera.rotation.set(player.pitch,player.yaw,camera.rotation.z,"YXZ");
 camera.updateMatrixWorld(true);
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
     sprint:(keys.has("ShiftLeft")||keys.has("ShiftRight"))&&!aimHeld,
     crouch:keys.has("KeyC"),
     prone:proneToggle,
     jump:keys.has("Space")
   };
   const before=player;
   player=stepPlayer(player,input,dt);
   const next=advanceFootsteps(footstepTracker,before,player);
   footstepTracker=next.tracker;
   footstepAudio.play(next.events);
   weapons.tick(now);
   if(reloadPressed){
    if(weapons.reload(now)){
     shotAudio.play("reload");
     weaponView.beginReload(now,weapons.current.reloadDurationMs,weapons.current.reloadType);
     shotNotice.textContent=weapons.current.reloadType.toUpperCase()+
       " RELOAD · "+(weapons.current.reloadDurationMs/1000).toFixed(2)+"S";
     shotNoticeLeft=1.2;
    }
    reloadPressed=false;
   }
   const adsTarget=aimHeld?1:0;
   aimMix+=(adsTarget-aimMix)*Math.min(1,dt*20);
   if(Math.abs(adsTarget-aimMix)<.005)aimMix=adsTarget;
   leanAmount=smoothLean(leanAmount,leanTarget,dt);
   camera.fov=77-14*aimMix;
   camera.updateProjectionMatrix();
   gunKick=Math.max(0,gunKick-dt*2.5);
   if(now-lastShotAt>140&&recoilRecovery>0){
    const recover=Math.min(recoilRecovery,dt*.072);
    player.pitch=Math.max(-1.48,player.pitch-recover);
    recoilRecovery-=recover;
   }
 }
 // Drop the camera immediately for low cover; smoothly raise when clearance allows.
 const eyeTarget=player.prone?.44:player.crouched?1.08:1.65;
 cameraEye=eyeTarget<cameraEye?eyeTarget:cameraEye+(eyeTarget-cameraEye)*Math.min(1,dt*12);
 const leanPose=leanCameraPose(player.yaw,leanAmount);
 camera.position.set(player.x+leanPose.dx,player.y+cameraEye,player.z+leanPose.dz);
 camera.rotation.set(player.pitch,player.yaw,leanPose.roll,"YXZ");
 camera.updateMatrixWorld(true);
 if(locked){
  // The gun-mounted optic pose MUST update before ballistics. This prevents
  // shooting with a previous-frame sight transform (including while leaning).
  weaponView.update(dt,aimMix,gunKick,player.moving&&player.grounded,now,aimHeld);
  camera.updateMatrixWorld(true);
  // Catch up at most three shots after a slow frame, as in original BLACKOUT.
  // No shot is allowed during reload or when sprinting.
  // A held ADS button must never use the giant 0.18 hipfire cone, even
  // during the first ~150 ms while the physical gun settles onto its optic.
  const aligned=aimState(aimHeld,aimMix).accurate;
  const fired=cycleLegacyFire(weapons,now,{
   held:firing,adsAligned:aligned,canFire:!player.sprinting
  },shot=>fireShot(shot,aligned,now));
  if(firing&&!fired&&weapons.current.ammo<=0&&
      !weapons.reloading&&now-lastEmptyClick>600){
   shotAudio.play("click");
   shotNotice.textContent="MAGAZINE EMPTY · R TO RELOAD";
   shotNoticeLeft=1;
   lastEmptyClick=now;
  }
 }
 for(const t of targets){
  if(t.downTime>0){t.downTime=Math.max(0,t.downTime-dt);if(t.downTime===0)t.group.visible=true;}
 }
 shotEffects.tick(dt);
 updateAimProbe(now);
 shotNoticeLeft=Math.max(0,shotNoticeLeft-dt);
 shotNotice.classList.toggle("hidden",shotNoticeLeft<=0);
 crosshair.classList.toggle("hidden",!locked||!aimState(aimHeld,aimMix).hipCrosshairVisible);
 renderer.render(scene,camera);
 if(locked&&now-lastHud>110){hudFrame();lastHud=now;}
}
requestAnimationFrame(animate);
console.info("BLACKOUT reboot V0.7.4 combat raycast with box-face impacts",FOUNDATION_VERSION,
  "offline weapon testing; old game runtime not loaded");
