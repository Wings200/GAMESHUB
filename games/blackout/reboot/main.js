// BLACKOUT REBOOT V0.16.1 — playable C4 and contact-exploding impact grenades
// from every BLACKOUT V1–V8 module, asset, operator and online service.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import {FOUNDATION_VERSION,TEST_OBSTACLES,initialPlayer,stepPlayer} from "./physics.js?v=reboot-028";
import {newFootstepTracker,advanceFootsteps,FootstepAudio} from "./footsteps.js?v=reboot-003";
import {Weapons} from "./legacy-weapons.js?v=reboot-006";
import {GameAudio} from "./legacy-audio.js?v=reboot-031";
import {cycleLegacyFire,legacyShotCone} from "./legacy-shooting.js?v=reboot-006";
import {createWeaponView,createTargetRange,createShotEffects} from "./weapon-view.js?v=reboot-012";
import {toggleLean,smoothLean,leanCameraPose} from "./lean.js?v=reboot-005";
import {aimState,firstHitType} from "./aim-resolver.js?v=reboot-007";
import {shotScreenPoint,describeAim,describeShot} from "./shot-ray.js?v=reboot-009";
import {combatIntersections} from "./combat-raycast.js?v=reboot-012";
import {DRILL_LENGTH_SECONDS,drillClock,compassHeading,areaName,drawTrainingMap} from "./tactical-hud.js?v=reboot-016";
import {BARRICADE} from "./barricade.js?v=reboot-015";
import {createBarricadeStation} from "./barricade-view.js?v=reboot-032";
import {SOFT_WALL} from "./soft-wall.js?v=reboot-016";
import {createSoftWallStation} from "./soft-wall-view.js?v=reboot-032";
import {REINFORCEMENT} from "./reinforcement.js?v=reboot-017";
import {createReinforcementStation} from "./reinforcement-view.js?v=reboot-017";
import {DRONE,throwDrone,tickDrone,canDroneOccupy,droneBoostLabel,droneJumpLabel} from "./drone-physics.js?v=reboot-019";
import {createDroneView,setDroneCameraVisibility} from "./drone-view.js?v=reboot-020";
import {newDroneRoster,cameraRequest,throwRequest,registerDrone,
 updateDrone,selectDrone,selectedDrone,droneEquipmentStatus} from "./drone-roster.js?v=reboot-020";
import {operatorById,operatorLoadout,canUseReinforcement,canUseReconDrones} from "./operators.js?v=reboot-025";
import {createOperatorPicker} from "./operator-select.js?v=reboot-033";
import {utilityHudRows,utilityKeyPreview} from "./secondary-loadout.js?v=reboot-033";
import {WIRE,newWireState,placeWire,damageWire,wireTerrainMultiplier,newWireHealth,tickWireHealth} from "./barbed-wire.js?v=reboot-030";
import {createWireView} from "./barbed-wire-view.js?v=reboot-029";
import {newWireSoundTracker,stepWireSounds,wirePunchSound} from "./wire-sound.js?v=reboot-031";
import {MELEE,canPunch,selectedMeleeTarget} from "./melee.js?v=reboot-029";
import {createMeleeView} from "./melee-view.js?v=reboot-029";
import {NITRO,newNitroState,throwNitro,tickNitro,detonateNitro,nitroBlastDamage} from "./nitro.js?v=reboot-032";
import {createNitroView,createNitroBlast} from "./nitro-view.js?v=reboot-032";
import {IMPACT,newImpactState,throwImpact,tickImpact} from "./impact.js?v=reboot-033";
import {createImpactView} from "./impact-view.js?v=reboot-033";

const $=id=>document.getElementById(id);
const canvas=$("game"),menu=$("menu"),hud=$("hud");
const play=$("play"),message=$("message"),error=$("error");
const positionText=$("position"),speedText=$("speed"),groundText=$("ground");
const modeText=$("mode"),motionText=$("motion"),hint=$("hint");
const crosshair=$("crosshair");
const ammoText=$("ammo"),weaponStatus=$("weapon-status"),hitsText=$("target-hits"),shotNotice=$("shot-notice"),leanText=$("lean-status"),ballisticsDebug=$("ballistics-debug");
const reserveCount=$("reserve-count"),roundClock=$("round-clock"),areaLabel=$("area-name");
const headingLabel=$("heading"),compassArrow=$("compass-arrow"),fpsLabel=$("fps"),missionCheck=$("mission-check");
const tacticalMap=$("tactical-map"),tacticalMapCtx=tacticalMap.getContext("2d");
const droneHud=$("drone-hud"),droneMap=$("drone-range-map");
const droneMapCtx=droneMap.getContext("2d");
const droneBoostStatus=$("drone-boost"),droneJumpStatus=$("drone-jump"),
 droneSpeedStatus=$("drone-speed");
const droneChargeMarkers=[$("drone-charge-1"),$("drone-charge-2"),$("drone-charge-3")];
const droneCameraCount=$("camera-drone-count"),droneSpareCount=$("spare-drone-count");
const droneEquipmentBar=$("drone-equipment-bar"),droneKeyTip=$("drone-key-tip"),defenderKeyTip=$("defender-key-tip");
const droneActiveNumber=$("active-drone-number"),droneTotalNumber=$("total-drone-number");
const droneSwitchLeft=$("drone-switch-left"),droneSwitchRight=$("drone-switch-right");
const operatorHudName=$("operator-hud-name"),operatorHudSide=$("operator-hud-side");
const healthNumber=$("health-current"),healthCaption=$("health-caption");
const healthSegments=[...document.querySelectorAll(".siege-health-bars span")];
const utilityHud=$("utility-hud"),utilityHudNote=$("utility-hud-note");
const utilityName=[$("utility-name-special"),$("utility-name-normal")];
const utilityStatus=[$("utility-status-special"),$("utility-status-normal")];
const utilitySlots=[$("utility-slot-special"),$("utility-slot-normal")];
const softWallReadout=$("soft-wall-readout"),softWallStatusText=$("soft-wall-status"),
 softWallRemoved=$("soft-wall-removed");
const reinforcePrompt=$("reinforce-prompt"),reinforceFill=$("reinforce-progress"),
 reinforceStatus=$("reinforce-status"),reinforceAction=$("reinforce-action");
const barricadePrompt=$("barricade-prompt"),barricadeProgress=$("barricade-progress"),
 barricadeStatusText=$("barricade-status"),barricadeCount=$("barricade-count");
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
const barricade=createBarricadeStation(THREE,scene);
const softWall=createSoftWallStation(THREE,scene);
const reinforcement=createReinforcementStation(THREE,scene);
const droneViews=[]; // physical model for each deployed drone
const wireViews=new Map(); // deployed physical barbed-wire models
let wireState=newWireState();
let wireHealth=newWireHealth();
let wireSoundTracker=newWireSoundTracker();
let nitroState=newNitroState();
const nitroViews=new Map(),blastViews=[];
let impactState=newImpactState();
const impactViews=new Map();
const weaponView=createWeaponView(THREE,camera,scene);
const meleeView=createMeleeView(THREE,camera);
const meleeRaycaster=new THREE.Raycaster();
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
const completedTargets=new Set();
let drillElapsedSeconds=0,fpsSmoothed=60;
let shotNoticeLeft=0;
let leanTarget=0,leanAmount=0;
let debugShots=false,barricadeBuildTime=0,lastMeleeAt=-Infinity;
let controlMode="player",drone=null,droneRoster=newDroneRoster("range"),droneBoostPressed=false,droneJumpPressed=false;
let activeOperator=operatorById("striker");
const opticWorld=new THREE.Vector3(),opticNdc=new THREE.Vector3();
const previewWorld=new THREE.Vector3(),previewNdc=new THREE.Vector3();
let lastShotReadout="NO SHOTS YET",liveAimReadout="—",lastAimProbe=-Infinity;
// Operator selection stays available from the first menu and on ESC pause.
const operatorPicker=createOperatorPicker($("operator-selection"),{
 onSelect(operator){
  activeOperator=operator;
  // This fresh testing role starts at full health. Deployed defender wire
  // persists across team changes so Striker can verify enemy-only damage.
  wireHealth=newWireHealth();
  wireSoundTracker=newWireSoundTracker();
  // Any pending construction must end when operator/team changes.
  // Never carry a defender reinforcement interaction into attack.
  reinforcement.step({player,holding:false,dt:0});
  operatorHudName.textContent=operator.name;
  operatorHudSide.textContent=operator.side==="attack"?"ATTACKER":"DEFENDER";
  refreshDroneEquipment(); // Hide attack-only quickslots immediately on defense.
  refreshUtilityHud(); // Always reflect THIS operator's special/normal gadget plan.
  // Side changes are a training-range selection only. Do not invent teams or
  // a real match phase; exit a paused drone feed before spawning a new role.
  if(controlMode==="drone"&&!locked)setControlMode("player");
 },
 onPlanChange(){
  // Changing either select while paused updates the next live player HUD.
  refreshUtilityHud();
 }
});
function refreshUtilityHud(){
 const rows=utilityHudRows(operatorPicker.plans,activeOperator);
 utilityHud.setAttribute("aria-label",activeOperator.name+" special middle-click and normal G, design previews");
 rows.forEach((row,i)=>{
  utilityName[i].textContent=row.name.toUpperCase();
  utilityStatus[i].textContent=row.gadgetId==="barbed-wire"?
    "LIVE · "+wireState.charges+"/"+WIRE.charges+" LEFT":
   row.gadgetId==="c4"?
    (nitroState.devices.some(d=>d.armed)?"ARMED · PRESS "+row.key+" TO DETONATE":
      "LIVE · "+nitroState.charges+"/"+NITRO.charges+" LEFT"):
   row.gadgetId==="impact"?
      "LIVE · "+impactState.charges+"/"+IMPACT.charges+" LEFT":row.status;
  utilitySlots[i].classList.toggle("planned",Boolean(row.gadgetId));
  utilitySlots[i].setAttribute("aria-label",
   activeOperator.name+" "+row.role.toLowerCase()+" gadget ("+row.key+"): "+row.name+"; "+row.status);
 });
 utilityHudNote.textContent=rows.some(row=>row.gadgetId==="impact")?
  activeOperator.name+" · IMPACT CONTACT DETONATION · LIVE":
  rows.some(row=>row.gadgetId==="c4")?
  activeOperator.name+" · C4 THROW / REMOTE DETONATE · LIVE":
  rows.some(row=>row.gadgetId==="barbed-wire")?
  activeOperator.name+" · WIRE LIVE · OTHER GADGETS PREVIEW":
  activeOperator.name+" · SPECIAL MMB / NORMAL G · PREVIEW ONLY";
}
refreshUtilityHud();
function resize(){
 const width=Math.max(1,window.innerWidth),height=Math.max(1,window.innerHeight);
 renderer.setSize(width,height,false);
 camera.aspect=width/height;camera.updateProjectionMatrix();
}
resize();
window.addEventListener("resize",resize);
function activeDroneObstacles(){
 return [...TEST_OBSTACLES,...barricade.blockers(),...softWall.blockers(),...reinforcement.blockers()];
}
function applyGadgetBlast(blast,label="C4"){
 blastViews.push(createNitroBlast(THREE,scene,blast));
 shotAudio.playAt("gadget-blast",blast.x,blast.z,player.x,player.z,player.yaw);
 // Both gadgets cut real gypsum and boards, but never reinforced steel.
 const wood=barricade.blastAt(blast);
 const gypsum=reinforcement.installed?0:softWall.blastAt(blast);
 const self=nitroBlastDamage(blast,{x:player.x,y:player.y+1,z:player.z});
 if(self>0&&wireHealth.hp>0){
  wireHealth={...wireHealth,hp:Math.max(0,wireHealth.hp-self),damage:self,elapsed:0};
  if(wireHealth.hp===0){firing=false;aimHeld=false;keys.clear();}
 }
 let hits=0;
 for(const target of targets){
  if(target.downTime>0)continue;
  const dmg=nitroBlastDamage(blast,{x:target.group.position.x,y:1.25,
   z:target.group.position.z});
  if(dmg>=20){
   target.downTime=1.6;target.group.visible=false;target.hits++;
   targetHits++;completedTargets.add(target.id);weapons.registerHit();
   hits++;
  }
 }
 return label+" DETONATED · "+hits+" TARGETS · "+wood+" BOARDS · "+
  gypsum+" GYPSUM CELLS"+(self?" · SELF -"+self+" HP":"");
}
function detonateCurrentNitro(){
 const result=detonateNitro(nitroState);
 if(!result.blast)return result.reason;
 nitroState=result.state;
 const device=nitroState.devices.find(d=>!d.armed);
 nitroViews.get(device.id)?.sync(device);
 const feedback=applyGadgetBlast(result.blast,"C4");
 refreshUtilityHud();
 return feedback;
}
function usePlannedGadget(code){
 const row=utilityHudRows(operatorPicker.plans,activeOperator).find(item=>item.code===code);
 if(!row)return;
 if(row.gadgetId==="c4"&&activeOperator.side==="defend"){
  if(nitroState.devices.some(d=>d.armed)){
   shotNotice.textContent=detonateCurrentNitro();
  }else{
   const result=throwNitro(nitroState,player);
   if(result.device){
    nitroState=result.state;
    nitroViews.set(result.device.id,createNitroView(THREE,scene,result.device));
    shotAudio.play("gadget-throw");
    refreshUtilityHud();
   }
   shotNotice.textContent=result.reason;
  }
  shotNoticeLeft=2.1;
  return;
 }
 if(row.gadgetId==="impact"&&activeOperator.side==="defend"){
  const result=throwImpact(impactState,player);
  if(result.device){
   impactState=result.state;
   impactViews.set(result.device.id,createImpactView(THREE,scene,result.device));
   shotAudio.play("gadget-throw");
   refreshUtilityHud();
  }
  shotNotice.textContent=result.reason;
  shotNoticeLeft=1.7;
  return;
 }
 if(row.gadgetId==="barbed-wire"&&activeOperator.side==="defend"){
  const obstacles=[...TEST_OBSTACLES,...barricade.blockers(),
   ...softWall.blockers(),...reinforcement.blockers()];
  const placement=placeWire(wireState,player,obstacles);
  if(placement.device){
   wireState=placement.state;
   wireViews.set(placement.device.id,createWireView(THREE,scene,placement.device));
   refreshUtilityHud();
  }
  shotNotice.textContent=placement.reason+
   (placement.device?" · "+wireState.charges+" REMAIN":"");
  shotNoticeLeft=1.7;
  return;
 }
 shotNotice.textContent=utilityKeyPreview(operatorPicker.plans,activeOperator,code);
 shotNoticeLeft=1.6;
}
function shootableWire(){
 return wireState.devices.filter(d=>d.hp>0)
  .flatMap(d=>wireViews.get(d.id)?.shootables||[]);
}
function strikeMelee(now){
 if(!canPunch(now,lastMeleeAt)||!meleeView.trigger())return;
 lastMeleeAt=now;
 firing=false;
 camera.updateMatrixWorld(true);
 meleeRaycaster.setFromCamera({x:0,y:0},camera);
 meleeRaycaster.far=MELEE.range;
 const solids=[...shootableSolids,...barricade.shootables(),
  ...softWall.shootables(),...reinforcement.shootables(),...shootableWire()];
 const hits=combatIntersections(meleeRaycaster,solids,[]);
 const selected=selectedMeleeTarget(hits);
 let description="MELEE MISSED · GET CLOSER AND AIM AT TARGET";
 if(selected.kind==="wire"){
  // TWO melee strikes remove wire. Gunfire has no destruction effect.
  const result=damageWire(wireState,selected.id,2);
  if(result.handled){
   const source=wireState.devices.find(d=>d.id===selected.id);
   wireState=result.state;
   wireViews.get(selected.id)?.sync(wireState.devices.find(d=>d.id===selected.id));
   const cue=wirePunchSound(result.destroyed,source);
   if(cue)shotAudio.playAt(cue.type,cue.x,cue.z,player.x,player.z,player.yaw);
   if(result.destroyed)wireSoundTracker=newWireSoundTracker();
   description=result.destroyed?"BARBED WIRE CUT · REMOVED":
    "BARBED WIRE STRUCK · HIT AGAIN TO DESTROY";
  }
 }else if(selected.kind==="barricade"){
  const result=barricade.meleeHit(hits[0]);
  if(result.handled){
   description=result.broken?"BARRICADE KICKED OPEN · ALL BOARDS DESTROYED":
    "BARRICADE MELEE "+result.hits+"/3 · "+result.remaining+" HITS LEFT";
   shotAudio.play("impact");
  }
 }else if(selected.kind==="blocked"){
  description="MELEE BLOCKED · HARD SURFACE";
 }
 shotNotice.textContent=description;
 shotNoticeLeft=1.05;
}
function setControlMode(nextMode){
 // Never enter a recon feed as a defender, including after switching teams
 // while the camera was open and the Testing Range was paused.
 if(nextMode==="drone"&&!canUseReconDrones(activeOperator))nextMode="player";
 controlMode=nextMode;
 const active=locked;
 hud.classList.toggle("hidden",!active||controlMode!=="player");
 droneHud.classList.toggle("hidden",!active||controlMode!=="drone");
 document.body.dataset.hudProfile=active?controlMode:"menu";
 weaponView.root.visible=controlMode==="player";
 crosshair.classList.toggle("hidden",!active||controlMode!=="player");
 firing=false;aimHeld=false;reloadPressed=false;keys.clear();
 droneBoostPressed=false;droneJumpPressed=false;
 // Never leave a first-person fist floating over the drone camera.
 meleeView.cancel();
 wireSoundTracker=newWireSoundTracker();
 // Changing devices must never complete a partially held F reinforcement.
 barricadeBuildTime=0;
 reinforcement.step({player,holding:false,dt:0});
}
function refreshDroneEquipment(){
 const hasRecon=canUseReconDrones(activeOperator);
 droneEquipmentBar.classList.toggle("hidden",!hasRecon);
 droneKeyTip.classList.toggle("hidden",!hasRecon);
 defenderKeyTip.classList.toggle("hidden",hasRecon);
 const info=droneEquipmentStatus(droneRoster);
 droneCameraCount.textContent=String(info.cameras);
 droneSpareCount.textContent=String(info.throwables);
}
function throwPhysicalDrone(kind){
 if(!canUseReconDrones(activeOperator))return false;
 // 6 deploys either carried test-range drone. Future matches gate the
 // prep drone and action-phase spare separately. 5 creates no devices.
 const distance=.42;
 const x=player.x-Math.sin(player.yaw)*distance;
 const z=player.z-Math.cos(player.yaw)*distance;
 const obstacles=activeDroneObstacles();
 const clear=canDroneOccupy(x,.58,z,obstacles)?{x,z}:
   canDroneOccupy(player.x,.58,player.z,obstacles)?{x:player.x,z:player.z}:null;
 if(!clear){
  shotNotice.textContent="DRONE THROW BLOCKED · MOVE AWAY FROM WALL";
  shotNoticeLeft=1.5;return false;
 }
 const fresh=throwDrone(clear.x,clear.z,player.yaw);
 const next=registerDrone(droneRoster,fresh,kind);
 if(next===droneRoster)return false;
 droneRoster=next;
 const view=createDroneView(THREE,scene);
 view.place(fresh);
 droneViews.push(view);
 drone=selectedDrone(droneRoster);
 shotNotice.textContent="DRONE THROWN · "+droneRoster.drones.length+
   " DEPLOYED · PRESS 5 FOR CAMERAS";
 shotNoticeLeft=1.4;
 refreshDroneEquipment();
 return true;
}
function openDroneCameras(){
 if(!canUseReconDrones(activeOperator))return;
 if(controlMode==="drone"){setControlMode("player");return;}
 const request=cameraRequest(droneRoster);
 if(request.action==="open"){
  drone=selectedDrone(droneRoster);
  setControlMode("drone");
 }else{
  shotNotice.textContent=request.reason||"NO CAMERAS AVAILABLE";
  shotNoticeLeft=1.2;
 }
}
function throwCarriedDrone(){
 if(controlMode!=="player"||!canUseReconDrones(activeOperator))return;
 const request=throwRequest(droneRoster,"range");
 if(request.action==="throw-only")throwPhysicalDrone(request.kind);
 else{
  shotNotice.textContent=request.reason||"NO DRONES REMAINING";
  shotNoticeLeft=1.3;
 }
}
function switchDroneCamera(direction){
 if(!canUseReconDrones(activeOperator)||droneRoster.drones.length<2)return false;
 droneRoster=selectDrone(droneRoster,direction);
 drone=selectedDrone(droneRoster);
 droneBoostPressed=false;droneJumpPressed=false;
 return true;
}
function droneHudFrame(){
 if(!drone)return;
 droneBoostStatus.textContent=droneBoostLabel(drone);
 droneJumpStatus.textContent=droneJumpLabel(drone);
 droneSpeedStatus.textContent=Math.hypot(drone.speedX,drone.speedZ).toFixed(1);
 droneActiveNumber.textContent=String(droneRoster.selected+1).padStart(2,"0");
 droneTotalNumber.textContent=String(droneRoster.drones.length).padStart(2,"0");
 const cameraSwitch=droneRoster.drones.length>1?"CAMERA":"TURN";
 droneSwitchLeft.textContent=cameraSwitch;
 droneSwitchRight.textContent=cameraSwitch;
 for(let i=0;i<droneChargeMarkers.length;i++)
  droneChargeMarkers[i].classList.toggle("active",i<drone.charges);
 drawTrainingMap(droneMapCtx,drone,TEST_OBSTACLES,targets,BARRICADE,SOFT_WALL);
}
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
 document.body.classList.toggle("range-active",locked);
 setControlMode(controlMode);
 if(!locked){keys.clear();footstepTracker=newFootstepTracker();proneToggle=false;firing=false;aimHeld=false;reloadPressed=false;leanTarget=0;leanAmount=0;barricadeBuildTime=0;droneJumpPressed=false;droneBoostPressed=false;reinforcement.step({player,holding:false,dt:0});unlockMessage();}
 lastTime=performance.now();
});
document.addEventListener("pointerlockerror",()=>{
 message.textContent="POINTER LOCK FAILED · CLICK ENTER TEST RANGE AGAIN";
});
document.addEventListener("mousemove",event=>{
 if(!locked)return;
 if(controlMode==="drone"&&drone){
  drone.yaw-=event.movementX*.003;
  drone.pitch=Math.max(-.75,Math.min(.75,drone.pitch-event.movementY*.0026));
 }else{
  player.yaw-=event.movementX*.00215;
  player.pitch=Math.max(-1.48,Math.min(1.48,player.pitch-event.movementY*.00215));
 }
});
document.addEventListener("keydown",event=>{
 if(locked&&(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","KeyC","KeyQ","KeyE","ControlLeft","ControlRight"].includes(event.code)||event.ctrlKey))
   event.preventDefault();
 if(!locked)return;
 // Elimination freezes all attacks, drones and gadgets; P is the only
 // player input allowed to restore the testing life.
 if(wireHealth.hp===0&&event.code!=="KeyP")return;
 if(event.code==="Digit5"&&!event.repeat){openDroneCameras();return;}
 if(event.code==="Digit6"&&!event.repeat){throwCarriedDrone();return;}
 if(controlMode==="drone"){
  if(event.code==="KeyX"&&!event.repeat){setControlMode("player");return;}
  if((event.code==="KeyQ"||event.code==="KeyE")&&!event.repeat&&
     droneRoster.drones.length>1){
   switchDroneCamera(event.code==="KeyQ"?-1:1);return;
  }
  if(event.code==="Space"&&!event.repeat)droneJumpPressed=true;
  if((event.code==="ShiftLeft"||event.code==="ShiftRight")&&!event.repeat)
   droneBoostPressed=true;
  keys.add(event.code);
  return; // No player guns, wall rebuilding or crouching during drone control.
 }
 if(event.code==="KeyV"&&!event.repeat){
  strikeMelee(performance.now());return;
 }
 if(event.code==="KeyG"&&!event.repeat){
  // Reserved normal gadget G: no fake activation until gadget is built.
  usePlannedGadget("KeyG");
  return;
 }
 if(event.code==="KeyP"&&!event.repeat){
   player=initialPlayer();wireHealth=newWireHealth();wireSoundTracker=newWireSoundTracker();cameraEye=1.65;proneToggle=false;leanTarget=0;leanAmount=0;footstepTracker=newFootstepTracker();hint.textContent="POSITION / HEALTH RESET · DEPLOYED WIRE REMAINS.";
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
 if(event.code==="KeyY"&&!event.repeat&&canUseReinforcement(activeOperator)){
   const result=reinforcement.remove(player);
   shotNotice.textContent=result.reason;
   shotNoticeLeft=1.4;
 }
 if(event.code==="KeyT"&&!event.repeat){
   const result=softWall.reset(player);
   shotNotice.textContent=result.reason;
   shotNoticeLeft=1.45;
 }
 if(event.code==="KeyH"&&!event.repeat){
   shotEffects.clear();
   hint.textContent="BULLET HOLES CLEARED · PRESS H AGAIN TO CLEAR";
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
 if(event.button===1){
  // Middle-click must never fire, throw attacker drones or open browser
  // autoscroll. Camera control uses its own mode, not operator gadgets.
  event.preventDefault();
  if(controlMode==="player"&&wireHealth.hp>0){
   usePlannedGadget("MouseMiddle");
  }
  return;
 }
 if(controlMode!=="player"||wireHealth.hp===0)return;
 if(event.button===0)firing=true;
 if(event.button===2)aimHeld=true;
 if(event.button===0||event.button===2)event.preventDefault();
});
document.addEventListener("mouseup",event=>{
 if(event.button===0)firing=false;
 if(event.button===2)aimHeld=false;
});
canvas.addEventListener("contextmenu",event=>event.preventDefault());
canvas.addEventListener("auxclick",event=>{
 // Middle-click inside the locked game must not start autoscroll/new tabs.
 if(locked&&event.button===1)event.preventDefault();
});
window.addEventListener("blur",()=>{keys.clear();firing=false;aimHeld=false;reloadPressed=false;barricadeBuildTime=0;droneJumpPressed=false;droneBoostPressed=false;reinforcement.step({player,holding:false,dt:0});footstepTracker=newFootstepTracker();});
function hudFrame(){
 if(controlMode==="drone"){droneHudFrame();return;}
 // Siege-like HUD visuals use the live game state. No invented multiplayer data.
 positionText.textContent=player.x.toFixed(1)+" / "+player.z.toFixed(1);
 speedText.textContent=player.speed.toFixed(1)+" M/S";
 groundText.textContent=player.grounded?"STABLE":"AIRBORNE";
 modeText.textContent=player.prone?"PRONE":player.crouched?"CROUCH":player.sprinting?"SPRINT":"STAND";
 motionText.textContent=player.grounded?(player.moving?"MOVING":"IDLE"):"JUMP";
 healthNumber.textContent=String(wireHealth.hp);
 healthCaption.textContent=wireHealth.hp===0?"ELIMINATED · P TO RESPAWN":
  activeOperator.side==="defend"?"DEFENDER · FRIENDLY WIRE IMMUNITY":
  "ATTACKER · ENEMY WIRE 10 HP / 0.5 S";
 healthSegments.forEach((bar,i)=>{
  bar.style.opacity=wireHealth.hp>i*WIRE.maxHealth/healthSegments.length?"1":".15";
 });
 ammoText.textContent=String(weapons.current.ammo);
 reserveCount.textContent=String(weapons.current.remaining);
 weaponStatus.textContent=weapons.reloading?"RELOADING":aimMix>.8?"ADS":firing?"FIRING":"AUTO";
 hitsText.textContent=String(completedTargets.size);
 missionCheck.classList.toggle("complete",completedTargets.size===targets.length);
 leanText.textContent=leanTarget<0?"LEAN LEFT":leanTarget>0?"LEAN RIGHT":"CENTER";
 roundClock.textContent=drillClock(DRILL_LENGTH_SECONDS-drillElapsedSeconds);
 areaLabel.textContent=areaName(player.x,player.z);
 const heading=compassHeading(player.yaw);
 headingLabel.textContent=String(heading).padStart(3,"0")+"°";
 compassArrow.style.transform="translate(-50%,-82%) rotate("+heading+"deg)";
 fpsLabel.textContent=String(Math.max(0,Math.round(fpsSmoothed)));
 drawTrainingMap(tacticalMapCtx,player,TEST_OBSTACLES,targets,BARRICADE,SOFT_WALL);
 softWallReadout.classList.toggle("hidden",!softWall.near(player));
 softWallStatusText.textContent=softWall.status;
 softWallRemoved.textContent=String(softWall.removed);
 const reinfNearby=canUseReinforcement(activeOperator)&&reinforcement.near(player);
 reinforcePrompt.classList.toggle("hidden",!reinfNearby);
 reinforceStatus.textContent=reinforcement.status;
 reinforceAction.textContent=reinforcement.installed?
  "PRESS Y TO REMOVE METAL (TEST MODE)": "HOLD F FOR 3.0 S · STAND STILL";
 reinforceFill.style.width=(reinforcement.progress*100).toFixed(1)+"%";
 softWallReadout.dataset.reinforced=reinforcement.installed?"true":"false";
 barricadeStatusText.textContent=barricade.status;
 barricadeCount.textContent=barricade.remaining+" / "+BARRICADE.boardCount;
 const near=barricade.near(player);
 barricadePrompt.classList.toggle("hidden",!near);
 if(near){
  const damaged=barricade.status!=="INTACT";
  barricadePrompt.dataset.rebuild=damaged?"available":"intact";
  barricadeProgress.style.width=String(Math.min(100,barricadeBuildTime/BARRICADE.installSeconds*100))+"%";
 }
}
// Aim probe reads exactly the same visible dot and collision meshes as shooting.
// It does NOT consume ammunition, move targets or alter the player's recoil.
function updateAimProbe(now){
 if(!locked||controlMode!=="player"||!debugShots||now-lastAimProbe<90)return;
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
  [...shootableSolids,...barricade.shootables(),...softWall.shootables(),...reinforcement.shootables()],active.map(t=>t.group));
 const outcome=firstHitType(intersections,active);
 liveAimReadout=describeAim(outcome,outcome.hit?.object?.userData?.hitZone||
   (outcome.kind==="target"?"body":""));
 ballisticsDebug.textContent="LIVE SIGHT: "+liveAimReadout+
  "\nLAST SHOT: "+lastShotReadout;
}
function markDebugShot(outcome,screen){
 const distance=outcome.hit?outcome.hit.distance:raycaster.far;
 const zone=outcome.hit?.object?.userData?.hitZone||"";
 const wood=outcome.hit?.object?.userData?.barricadeIndex;
 if(outcome.hit?.object?.userData?.reinforcementShield){
  lastShotReadout="REINFORCED STEEL · BULLET BLOCKED · GYPSUM UNCHANGED";
  return;
 }
 if(Number.isInteger(wood)){
  lastShotReadout="WOOD BOARD "+(wood+1)+" · "+barricade.status+
    " · "+(barricade.remaining)+" PLANKS LEFT";
  return;
 }
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
  [...shootableSolids,...barricade.shootables(),...softWall.shootables(),...reinforcement.shootables()],activeTargets.map(t=>t.group));
 const outcome=firstHitType(intersections,activeTargets);
 // Plank marks are child meshes; global wall decals would float after breakage.
 // Firearms never invoke wire damage; the wire is a melee-only device.
 const woodHit=outcome.hit?barricade.hitBoard(outcome.hit):{handled:false};
 const metalHit=outcome.hit?reinforcement.steelImpact(outcome.hit):false;
 const plasterHit=outcome.hit&&!metalHit?softWall.onHit(outcome.hit):{handled:false};
 if(outcome.hit&&!woodHit.handled&&!plasterHit.handled&&!metalHit)
   shotEffects.mark(outcome.hit,outcome.kind==="target");
 markDebugShot(outcome,screen);
 if(woodHit.handled){
  shotNotice.textContent="BOARD "+String(woodHit.index).padStart(2,"0")+
    (woodHit.broken?" DESTROYED · "+woodHit.remaining+" LEFT":" HIT · FIRE AGAIN");
  shotNoticeLeft=.95;
  shotAudio.play("impact");
 }else if(metalHit){
  shotNotice.textContent="REINFORCEMENT STOPPED BULLET · STEEL INTACT";
  shotNoticeLeft=.72;
  shotAudio.play("impact");
 }else if(plasterHit.handled){
  shotNotice.textContent="GYPSUM PUNCTURED · "+plasterHit.removed+
    " OPEN CELLS · BULLETS CAN PASS";
  shotNoticeLeft=.75;
  lastShotReadout="SOFT WALL · REMOVED CELL "+plasterHit.index+
    " · "+plasterHit.remaining+" SOLID TILES";
  shotAudio.play("impact");
 }else if(outcome.kind==="target"){
  const target=outcome.target;
  target.downTime=1.6;target.group.visible=false;target.hits++;
  targetHits++;completedTargets.add(target.id);weapons.registerHit();
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
 const realDt=Math.max(0,(now-lastTime)/1000);
 const dt=Math.min(.05,realDt);
 lastTime=now;
 if(locked){
   drillElapsedSeconds=Math.min(DRILL_LENGTH_SECONDS,drillElapsedSeconds+Math.min(realDt,1));
   if(realDt>0)fpsSmoothed=fpsSmoothed*.91+(1/realDt)*.09;
 }
 if(locked&&controlMode==="drone"&&drone){
   const input={
    forward:Number(keys.has("KeyW")||keys.has("ArrowUp"))-
      Number(keys.has("KeyS")||keys.has("ArrowDown")),
    right:Number(keys.has("KeyD")||keys.has("ArrowRight"))-
      Number(keys.has("KeyA")||keys.has("ArrowLeft")),
    jumpPressed:droneJumpPressed,boostPressed:droneBoostPressed
   };
   droneJumpPressed=false;droneBoostPressed=false;
   if(droneRoster.drones.length===1){
    if(keys.has("KeyQ"))drone.yaw+=dt*2.3;
    if(keys.has("KeyE"))drone.yaw-=dt*2.3;
   }
   drone=tickDrone(drone,input,dt,activeDroneObstacles());
   droneRoster=updateDrone(droneRoster,droneRoster.selected,drone);
 }
 if(locked&&controlMode==="player"){
   // Actual thrown remote charges remain as movable THREE objects in range.
   nitroState=tickNitro(nitroState,dt,activeDroneObstacles());
   for(const device of nitroState.devices){
    if(device.armed)nitroViews.get(device.id)?.sync(device);
   }
   // Impact grenades advance through the actual Testing Range and detonate
   // immediately upon colliding with floor or physical cover.
   const impactTick=tickImpact(impactState,dt,activeDroneObstacles());
   impactState=impactTick.state;
   for(const device of impactState.devices){
    const view=impactViews.get(device.id);
    if(view){
     view.sync(device);
     if(!device.armed)impactViews.delete(device.id); // dispose exactly once
    }
   }
   for(const blast of impactTick.blasts){
    shotNotice.textContent=applyGadgetBlast(blast,"IMPACT");
    shotNoticeLeft=1.5;
   }
   // Disconnected reconnaissance drones are still physical world objects.
   // Their battery charges, jump timer, boost timer and landing progress persist.
   if(droneRoster.drones.length){
    for(let i=0;i<droneRoster.drones.length;i++){
     const parked=tickDrone(droneRoster.drones[i],{},dt,activeDroneObstacles());
     droneRoster=updateDrone(droneRoster,i,parked);
    }
    drone=selectedDrone(droneRoster);
   }
   const input={
     forward:Number(keys.has("KeyW")||keys.has("ArrowUp"))-
       Number(keys.has("KeyS")||keys.has("ArrowDown")),
     right:Number(keys.has("KeyD")||keys.has("ArrowRight"))-
       Number(keys.has("KeyA")||keys.has("ArrowLeft")),
     sprint:(keys.has("ShiftLeft")||keys.has("ShiftRight"))&&!aimHeld,
     crouch:keys.has("KeyC"),
     prone:proneToggle,
     jump:keys.has("Space"),
     speedMultiplier:operatorLoadout(activeOperator).speedMultiplier,
     terrainMultiplier:wireTerrainMultiplier(wireState,player,activeOperator.side)
   };
   const before=player;
   // A defeated attacker remains stationary until they press P to respawn.
   if(wireHealth.hp>0)player=stepPlayer(player,input,dt,
     [...TEST_OBSTACLES,...barricade.blockers(),...softWall.blockers(),...reinforcement.blockers()]);
   const nextHealth=tickWireHealth(wireHealth,wireState,player,activeOperator.side,dt);
   if(nextHealth.damage>0){
    shotNotice.textContent=nextHealth.hp===0?
     "ELIMINATED BY ENEMY BARBED WIRE · PRESS P TO RESPAWN":
     "ENEMY BARBED WIRE · -"+nextHealth.damage+" HP";
    shotNoticeLeft=nextHealth.hp===0?5:1;
    if(nextHealth.hp===0){firing=false;aimHeld=false;keys.clear();}
   }
   wireHealth=nextHealth;
   const wireCue=stepWireSounds(wireSoundTracker,wireState,before,player,
    activeOperator.side,dt);
   wireSoundTracker=wireHealth.hp>0?wireCue.tracker:newWireSoundTracker();
   if(wireHealth.hp>0&&wireCue.event)
    shotAudio.playAt(wireCue.event.type,wireCue.event.x,wireCue.event.z,
     player.x,player.z,player.yaw);
   const next=advanceFootsteps(footstepTracker,before,player);
   footstepTracker=next.tracker;
   footstepAudio.play(next.events);
   // Hold F to rebuild only while damaged and near the frame.
   if(wireHealth.hp>0&&keys.has("KeyF")&&barricade.near(player)&&
      barricade.status!=="INTACT"&&!player.sprinting){
     barricadeBuildTime=Math.min(BARRICADE.installSeconds,barricadeBuildTime+dt);
     if(barricadeBuildTime>=BARRICADE.installSeconds){
      if(barricade.rebuild()){
       shotNotice.textContent="WOOD BARRICADE INSTALLED · SIX BOARDS";
       shotNoticeLeft=1.5;
      }
      barricadeBuildTime=0;
     }
   }else barricadeBuildTime=0;
   // A different F action, gated by proximity: while stationary at the
   // gypsum station, construct a real metal shield bottom-up for 3 seconds.
   const reinforceStep=reinforcement.step({
    player,holding:wireHealth.hp>0&&canUseReinforcement(activeOperator)&&keys.has("KeyF"),dt,
    moving:player.moving,sprinting:player.sprinting
   });
   if(reinforceStep.event==="installed"){
    shotNotice.textContent="REINFORCEMENT COMPLETE · STEEL BULLETPROOF";
    shotNoticeLeft=1.75;
   }
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
 if(controlMode==="drone"&&drone){
  camera.position.set(drone.x,drone.y+DRONE.eye,drone.z);
  camera.rotation.set(drone.pitch,drone.yaw,0,"YXZ");
  if(camera.fov!==87){camera.fov=87;camera.updateProjectionMatrix();}
 }else{
  const eyeTarget=player.prone?.44:player.crouched?1.08:1.65;
  cameraEye=eyeTarget<cameraEye?eyeTarget:cameraEye+(eyeTarget-cameraEye)*Math.min(1,dt*12);
  const leanPose=leanCameraPose(player.yaw,leanAmount);
  camera.position.set(player.x+leanPose.dx,player.y+cameraEye,player.z+leanPose.dz);
  camera.rotation.set(player.pitch,player.yaw,leanPose.roll,"YXZ");
 }
 camera.updateMatrixWorld(true);
 if(locked&&controlMode==="player"){
  meleeView.update(dt);
  weaponView.root.visible=!meleeView.active;
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
   held:firing&&!meleeView.active&&wireHealth.hp>0,adsAligned:aligned,canFire:!player.sprinting&&!meleeView.active&&wireHealth.hp>0
  },shot=>fireShot(shot,aligned,now));
  if(wireHealth.hp>0&&firing&&!fired&&weapons.current.ammo<=0&&
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
 for(let i=0;i<droneViews.length;i++)
  droneViews[i].update(droneRoster.drones[i],dt);
 // Camera sees the world, never its own housing or wheels. The other
 // drone remains visible; operator view restores both physical models.
 setDroneCameraVisibility(droneViews,droneRoster.selected,
    locked&&controlMode==="drone");
 shotEffects.tick(dt);
 for(let i=blastViews.length-1;i>=0;i--)
  if(!blastViews[i].tick(dt))blastViews.splice(i,1);
 barricade.tick(dt);
 softWall.tick(dt);
 reinforcement.tick(dt);
 updateAimProbe(now);
 shotNoticeLeft=Math.max(0,shotNoticeLeft-dt);
 shotNotice.classList.toggle("hidden",shotNoticeLeft<=0);
 crosshair.classList.toggle("hidden",!locked||controlMode!=="player"||!aimState(aimHeld,aimMix).hipCrosshairVisible);
 renderer.render(scene,camera);
 if(locked&&now-lastHud>110){hudFrame();lastHud=now;}
}
requestAnimationFrame(animate);
console.info("BLACKOUT V0.16.1 C4 remote and impact contact grenades with physical blast/HP/soft walls",FOUNDATION_VERSION,
  "offline weapon testing; old game runtime not loaded");
