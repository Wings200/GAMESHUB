// BLACKOUT REBOOT V0.28.0 · automatic attacker prep drone and elevated drone traversal
// from every BLACKOUT V1–V8 module, asset, operator and online service.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import {FOUNDATION_VERSION,TEST_OBSTACLES,initialPlayer,stepPlayer} from "./physics.js?v=reboot-062";
import {HOUSE,houseFloorAt,houseRoomAt,drawHouseMinimap} from "./house-layout.js?v=reboot-069";
import {createHouseView} from "./house-view.js?v=reboot-066";
import {newFootstepTracker,advanceFootsteps,FootstepAudio} from "./footsteps.js?v=reboot-003";
import {Weapons} from "./legacy-weapons.js?v=reboot-006";
import {GameAudio} from "./legacy-audio.js?v=reboot-064";
import {cycleLegacyFire,legacyShotCone} from "./legacy-shooting.js?v=reboot-006";
import {recordRecoilKick,consumeManualRecoil} from "./recoil-compensation.js?v=reboot-070";
import {createWeaponView,createTargetRange,createShotEffects} from "./weapon-view.js?v=reboot-012";
import {toggleLean,smoothLean,leanCameraPose} from "./lean.js?v=reboot-005";
import {aimState,firstHitType} from "./aim-resolver.js?v=reboot-007";
import {shotScreenPoint,describeAim,describeShot} from "./shot-ray.js?v=reboot-009";
import {combatIntersections} from "./combat-raycast.js?v=reboot-012";
import {DRILL_LENGTH_SECONDS,drillClock,compassHeading,areaName,drawTrainingMap} from "./tactical-hud.js?v=reboot-016";
import {BARRICADE} from "./barricade.js?v=reboot-068";
import {createBarricadeStation} from "./barricade-view.js?v=reboot-068";
import {SOFT_WALL} from "./soft-wall.js?v=reboot-046";
import {createSoftWallStation} from "./soft-wall-view.js?v=reboot-046";
import {REINFORCEMENT,hardBreachWindow,reinforcementBreaches} from "./reinforcement.js?v=reboot-047";
import {createReinforcementStation} from "./reinforcement-view.js?v=reboot-047";
import {DRONE,newDrone,throwDrone,tickDrone,canDroneOccupy,droneBoostLabel,droneJumpLabel} from "./drone-physics.js?v=reboot-071";
import {createBlackoutNetwork} from "./network-lobby.js?v=reboot-072";
import {createRemoteOperators} from "./remote-operators.js?v=reboot-072";
import {createDroneView,setDroneCameraVisibility} from "./drone-view.js?v=reboot-066";
import {newDroneRoster,cameraRequest,throwRequest,registerDrone,
 updateDrone,removeDrone,selectDrone,selectedDrone,droneEquipmentStatus} from "./drone-roster.js?v=reboot-067";
import {operatorById,operatorLoadout,canUseReinforcement,canUseReconDrones} from "./operators.js?v=reboot-025";
import {createOperatorPicker} from "./operator-select.js?v=reboot-052";
import {utilityHudRows,utilityKeyPreview} from "./secondary-loadout.js?v=reboot-052";
import {WIRE,newWireState,placeWire,damageWire,wireTerrainMultiplier,newWireHealth,tickWireHealth} from "./barbed-wire.js?v=reboot-030";
import {createWireView} from "./barbed-wire-view.js?v=reboot-029";
import {newWireSoundTracker,stepWireSounds,wirePunchSound} from "./wire-sound.js?v=reboot-031";
import {MELEE,canPunch,selectedMeleeTarget} from "./melee.js?v=reboot-029";
import {createMeleeView} from "./melee-view.js?v=reboot-029";
import {NITRO,newNitroState,throwNitro,tickNitro,detonateNitro,pickupNitro,nitroBlastDamage,nitroBlastIsLethal} from "./nitro.js?v=reboot-036";
import {createNitroView,createNitroBlast} from "./nitro-view.js?v=reboot-036";
import {IMPACT,newImpactState,throwImpact,tickImpact} from "./impact.js?v=reboot-036";
import {createImpactView} from "./impact-view.js?v=reboot-033";
import {FRAG,newFragState,throwFrag,tickFrag} from "./frag.js?v=reboot-036";
import {createFragView} from "./frag-view.js?v=reboot-034";
import {FLASH,newFlashState,throwFlash,tickFlash,flashExposure,newFlashEffect,
 applyFlashEffect,stepFlashEffect,flashOpacity} from "./flash.js?v=reboot-039";
import {createFlashView,createFlashBurst} from "./flash-view.js?v=reboot-037";
import {SMOKE,newSmokeState,throwSmoke,tickSmoke,smokeCameraDensity}
 from "./smoke.js?v=reboot-040";
import {createSmokeView,createSmokeCloudView} from "./smoke-view.js?v=reboot-040";
import {THROW_PREVIEW_IDS,canPreviewThrow,traceThrownGadget}
 from "./throw-preview.js?v=reboot-041";
import {createThrowPreviewView} from "./throw-preview-view.js?v=reboot-041";
import {resolveStructuralBlast} from "./blast-policy.js?v=reboot-045";
import {SOFT_BREACH,newSoftBreachState,placeSoftBreach,tickSoftBreach,
 pickupSoftBreach,detonateSoftBreach} from "./soft-breach.js?v=reboot-044";
import {createSoftBreachView} from "./soft-breach-view.js?v=reboot-044";
import {HARD_BREACH,newHardBreachState,placeHardBreach,
 armHardBreach,tickHardBreach,pickupHardBreach} from "./hard-breach.js?v=reboot-047";
import {createHardBreachView} from "./hard-breach-view.js?v=reboot-045";
import {CLAYMORE,newClaymoreState,placeClaymore,pickupClaymore,
 tickClaymores,claymoreLaserEndpoints,claymoreBlastDamage,
 claymoreBlastIsLethal} from "./claymore.js?v=reboot-048";
import {createClaymoreView} from "./claymore-view.js?v=reboot-048";
import {OBS_BLOCKER,newObservationBlockerState,placeObservationBlocker,
 canPlaceObservationBlocker,blockerPosition,pickupObservationBlocker,
 damageObservationBlocker,activeObservationBlockers}
 from "./observation-blocker.js?v=reboot-050";
import {createObservationBlockerView,createObservationPlacementPreviewView}
 from "./observation-blocker-view.js?v=reboot-050";
import {PROXIMITY,newProximityState,placeProximity,pickupProximity,
 damageProximity,liveProximity,tickProximity}
 from "./proximity-alarm.js?v=reboot-051";
import {createProximityView} from "./proximity-alarm-view.js?v=reboot-051";
import {DEPLOYABLE_SHIELD,newShieldState,placeShield,pickupShield,
 shieldBlockers,liveShields,blastShields} from "./deployable-shield.js?v=reboot-052";
import {createShieldView,createShieldPlacementPreview}
 from "./deployable-shield-view.js?v=reboot-052";
import {beginShieldVault,stepShieldVault} from "./shield-vault.js?v=reboot-052";
import {beginBreachVault,stepBreachVault} from "./breach-vault.js?v=reboot-046";
import {BOMB_RULES,newBombRound,newFollowingRound,roundSiteAt,nearbyDefuser,
 pickupRoundDefuser,dropRoundDefuser,stepBombRound,bombPrompt,
 plantDefuserPosition} from "./bomb-round.js?v=reboot-067";
import {createBombRoundView,drawBombRoundMinimap} from "./bomb-round-view.js?v=reboot-070";
import {bombSiteBlockers,liveBombInteraction,newBombSoundClock,tickBombSoundClock,
 bombRoundOutcome} from "./bomb-presentation.js?v=reboot-065";
import {createBombInteractionView} from "./bomb-interaction-view.js?v=reboot-060";
import {createPlantRecording,createDefuseRecording,createDefuserCuePlayer,plantRecordingStage}
 from "./bomb-plant-audio.js?v=reboot-064";

const $=id=>document.getElementById(id);
const canvas=$("game"),menu=$("menu"),hud=$("hud");
const play=$("play"),message=$("message"),error=$("error");
const playMode=$("play-mode"),bombChoice=$("defuser-choice"),
 defuserChoiceWrap=$("defuser-choice-wrap"),deployModeName=$("deploy-mode-name"),
 bombObjectiveMini=$("bomb-objective-mini"),sandboxObjective=$("sandbox-objective");
const bombHud=$("bomb-round-hud"),bombTitle=$("bomb-round-title"),
 bombPhase=$("bomb-phase"),bombScore=$("bomb-score"),
 bombDefuser=$("bomb-defuser-status"),bombAction=$("bomb-action"),
 bombActionFill=$("bomb-action-fill");
const bombResult=$("bomb-round-result"),bombResultTitle=$("bomb-result-title"),
 bombResultReason=$("bomb-result-reason"),bombResultWinner=$("bomb-result-winner");
const positionText=$("position"),speedText=$("speed"),groundText=$("ground");
const modeText=$("mode"),motionText=$("motion"),hint=$("hint");
const crosshair=$("crosshair");
const ammoText=$("ammo"),weaponStatus=$("weapon-status"),hitsText=$("target-hits"),shotNotice=$("shot-notice"),leanText=$("lean-status"),ballisticsDebug=$("ballistics-debug");
const reserveCount=$("reserve-count"),roundClock=$("round-clock"),areaLabel=$("area-name");
const headingLabel=$("heading"),compassArrow=$("compass-arrow"),fpsLabel=$("fps"),missionCheck=$("mission-check");
const mapLabel=document.querySelector(".siege-map-label");
const tacticalMap=$("tactical-map"),tacticalMapCtx=tacticalMap.getContext("2d");
const droneHud=$("drone-hud"),droneMap=$("drone-range-map"),droneFeedState=$("drone-feed-state");
const droneRoundClock=$("drone-round-clock"),droneRoundPhase=$("drone-round-phase");
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
const flashOverlay=$("flash-whiteout"),smokeFog=$("smoke-fog");
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
const trainingObstacleMeshes=[];
for(const obstacle of TEST_OBSTACLES){
  const geometry=new THREE.BoxGeometry(obstacle.width,obstacle.height,obstacle.depth);
  const mesh=new THREE.Mesh(geometry,obstacle.id.startsWith("wall")?wallMat:blockMat);
  mesh.position.set(obstacle.x,obstacle.height/2,obstacle.z);
  mesh.castShadow=true;mesh.receiveShadow=true;
  mesh.userData.physicsObstacleId=obstacle.id;
  scene.add(mesh);shootableSolids.push(mesh);trainingObstacleMeshes.push(mesh);
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
const trainingBeaconMeshes=[];
for(const [x,z] of [[0,0],[-10,-11],[11,-11],[-10,10],[10,10]]){
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.5,.065,6,32),floorBeacons);
 ring.rotation.x=-Math.PI/2;ring.position.set(x,.035,z);scene.add(ring);
 trainingBeaconMeshes.push(ring);
}
const beforeStations=new Set(scene.children);
const barricade=createBarricadeStation(THREE,scene);
const softWall=createSoftWallStation(THREE,scene);
const reinforcement=createReinforcementStation(THREE,scene);
const trainingStations=scene.children.filter(node=>!beforeStations.has(node));
const droneViews=[]; // physical model for each deployed drone
const wireViews=new Map(); // deployed physical barbed-wire models
let wireState=newWireState();
let wireHealth=newWireHealth();
let wireSoundTracker=newWireSoundTracker();
let nitroState=newNitroState();
const nitroViews=new Map(),blastViews=[];
let impactState=newImpactState();
const impactViews=new Map();
let softBreachState=newSoftBreachState();
const softBreachViews=new Map();
let hardBreachState=newHardBreachState();
const hardBreachViews=new Map();
let claymoreState=newClaymoreState();
const claymoreViews=new Map();
let observationBlockerState=newObservationBlockerState();
const observationBlockerViews=new Map();
const observationPreviewView=createObservationPlacementPreviewView(THREE,scene);
let proximityState=newProximityState();
const proximityViews=new Map();
let shieldState=newShieldState();
const shieldViews=new Map();
const shieldPreviewView=createShieldPlacementPreview(THREE,scene);
let fragState=newFragState();
const fragViews=new Map();
let flashState=newFlashState(),flashEffect=newFlashEffect();
const flashViews=new Map();
const throwPreviewView=createThrowPreviewView(THREE,scene);
let heldThrowCode=null,lastThrowPreviewAt=-Infinity;
let smokeState=newSmokeState();
const smokeViews=new Map(),smokeCloudViews=new Map();
const weaponView=createWeaponView(THREE,camera,scene);
const meleeView=createMeleeView(THREE,camera);
const meleeRaycaster=new THREE.Raycaster();
const bombView=createBombRoundView(THREE,scene);
const bombInteractionView=createBombInteractionView(THREE,scene,camera);
const targets=createTargetRange(THREE,scene);
const houseView=createHouseView(THREE,scene);
const remoteOperators=createRemoteOperators(THREE,scene);
const trainingShootables=shootableSolids.slice();
const shotEffects=createShotEffects(THREE,scene);
const shotAudio=new GameAudio();
// All six original/CC0 defuser sounds are independent, timed recordings:
// unfold + real typing; two-stage arm; device tick; tablet taps; shutdown.
// The clock drives the ONE shared, map-wide beep, not an oscillator loop.
const plantAudio=createPlantRecording(
 new Audio(new URL("./audio/DefuserPlantV2.ogg",import.meta.url).href));
const defuseAudio=createDefuseRecording(
 new Audio(new URL("./audio/DefuserDisableV2.ogg",import.meta.url).href));
const defuserCues=createDefuserCuePlayer({
 arm:new Audio(new URL("./audio/DefuserArmV3.ogg",import.meta.url).href),
 tick:new Audio(new URL("./audio/DefuserTickV3.ogg",import.meta.url).href),
 urgent:new Audio(new URL("./audio/DefuserTickUrgentV3.ogg",import.meta.url).href),
 shutdown:new Audio(new URL("./audio/DefuserShutdownV3.ogg",import.meta.url).href)
});
const raycaster=new THREE.Raycaster();
const aimRaycaster=new THREE.Raycaster();
const keys=new Set();
let c4PickupKeyConsumed=false,softBreachPickupKeyConsumed=false,hardBreachPickupKeyConsumed=false,claymorePickupKeyConsumed=false,observationPickupKeyConsumed=false,proximityPickupKeyConsumed=false,shieldPickupKeyConsumed=false;
const footstepAudio=new FootstepAudio();
let footstepTracker=newFootstepTracker();
let player=initialPlayer(),lastTime=performance.now(),lastHud=0;
let gameMode="sandbox",bombState=null,mapMode="sandbox",operatorDeployed=true;
let onlineSession=null;
function isAttackerPreparation(){return gameMode==="bomb"&&bombState?.phase==="prep"&&activeOperator.side==="attack";}
function setMapMode(next){
 const house=next==="house";
 mapMode=house?"house":"sandbox";
 houseView.group.visible=house;
 grid.visible=!house;
 if(mapLabel)mapLabel.textContent=house?"HOUSE FLOORPLAN":"RANGE MAP";
 for(const item of [...trainingObstacleMeshes,...trainingBeaconMeshes,...trainingStations])
  item.visible=!house;
 for(const target of targets)target.group.visible=!house;
 shootableSolids.splice(0,shootableSolids.length,
  ...(house?[floor,...houseView.shootables]:trainingShootables));
}
function roundSpawn(){
 if(mapMode!=="house")return initialPlayer();
 const loc=activeOperator.side==="defend"?HOUSE.defenderSpawn:HOUSE.attackerSpawn;
 return {...initialPlayer(),...loc};
}
function visibleRangeTargets(){return mapMode==="house"?[]:targets.filter(t=>t.downTime<=0);}
let bombSoundClock=newBombSoundClock();
let bombCameraLock=null;
function interactionCameraLock(){
 if(!currentBombInteraction()){
  bombCameraLock=null;
  return null;
 }
 // Preserve the direction from the first F press until the player releases
 // it. Looking away cannot rotate the device through the ground mid-defuse.
 if(!bombCameraLock)bombCameraLock={yaw:player.yaw,pitch:-.77};
 return bombCameraLock;
}
function chosenDefuserChoice(){return bombChoice?.value==="leave"?"leave":"carry";}
function roundObjectiveInteract(){
 if(gameMode!=="bomb"||!bombState||controlMode!=="player"||wireHealth.hp<=0)return false;
 if(bombState.phase==="action"&&activeOperator.side==="attack"&&
    bombState.defuser.status==="carried"&&roundSiteAt(player,bombState.map))return true;
 if(bombState.phase==="postplant"&&activeOperator.side==="defend"&&
    (bombState.map!=="house"||player.y<1.25)&&
    Math.hypot(player.x-bombState.defuser.x,player.z-bombState.defuser.z)<=BOMB_RULES.disableRadius)
  return true;
 return false;
}
function updateDeployMenu(){
 const chosen=playMode.value!=="sandbox"?"bomb":"sandbox";
 deployModeName.textContent=playMode.value==="house"?"TWO-STORY HOUSE":
  chosen==="bomb"?"BOMB ROUND · TEST RANGE":"TEST RANGE";
 defuserChoiceWrap.classList.toggle("hidden",chosen!=="bomb"||activeOperator.side!=="attack");
 play.setAttribute("aria-label","Deploy "+activeOperator.name+" to "+
  (chosen==="bomb"?"Bomb Round":"Test Range"));
}
function syncRoundUI(){
 const active=gameMode==="bomb"&&bombState!==null;
 bombObjectiveMini.classList.toggle("hidden",!active);
 sandboxObjective.classList.toggle("hidden",active);
 missionCheck.classList.toggle("hidden",active);
 bombScore.classList.toggle("hidden",!active);
 document.body.dataset.matchMode=active?"bomb":"sandbox";
 if(!active){
  bombHud.classList.add("hidden");
  bombResult.classList.add("hidden");
  return;
 }
 const b=bombState;
 const outcome=bombRoundOutcome(b,activeOperator.side);
 bombResult.classList.toggle("hidden",!outcome||!locked);
 if(outcome){
  bombResult.dataset.won=String(outcome.won);
  bombResultTitle.textContent=outcome.title;
  bombResultReason.textContent=outcome.detail;
  bombResultWinner.textContent=outcome.winningSide+" VICTORY · BOMB ROUND "+b.round;
 }
 bombTitle.textContent="BOMB · ROUND "+b.round;
 bombPhase.textContent=b.phase==="prep"?"PREP":
  b.phase==="action"?"ACTION":b.phase==="postplant"?"POST-PLANT":"ROUND ENDED";
 bombScore.textContent="ATK "+b.score.attack+" — "+b.score.defend+" DEF";
 bombDefuser.textContent=b.phase==="ended"?b.reason:
  b.defuser.status==="carried"?
   (activeOperator.side==="attack"?
    "DEFUSER IN YOUR HANDS · HOLD X TO DROP":"ATTACKER HAS DEFUSER"):
  b.defuser.status==="ground"?
   (activeOperator.side==="attack"?"DEFUSER ON GROUND · F TO COLLECT":"DEFUSER DROPPED"):
  "DEFUSER PLANTED · SITE "+b.defuser.site;
 const prompt=bombPrompt(b,activeOperator.side,player);
 bombAction.textContent=prompt;
 const progress=b.phase==="action"?Math.max(b.plantProgress/BOMB_RULES.plantSeconds,
  b.dropProgress/BOMB_RULES.dropHoldSeconds):
  b.phase==="prep"?b.dropProgress/BOMB_RULES.dropHoldSeconds:
  b.phase==="postplant"?b.disableProgress/BOMB_RULES.disableSeconds:0;
 bombActionFill.style.width=Math.min(100,Math.max(0,progress*100)).toFixed(1)+"%";
 const actionable=progress>0||nearbyDefuser(b,activeOperator.side,player)||
  (b.phase==="action"&&activeOperator.side==="attack"&&
   b.defuser.status==="carried"&&Boolean(roundSiteAt(player,b.map)))||
  (b.phase==="postplant"&&activeOperator.side==="defend"&&
   Math.hypot(player.x-b.defuser.x,player.z-b.defuser.z)<=BOMB_RULES.disableRadius);
 bombHud.classList.toggle("hidden",!locked||controlMode!=="player"||!actionable);
 bombHud.dataset.phase=b.phase;
}

function currentBombInteraction(){
 return liveBombInteraction(bombState,activeOperator.side,player,
  controlMode==="player"&&keys.has("KeyF")&&locked,wireHealth.hp>0);
}
function bombRaycastColliders(){
 return gameMode==="bomb"?bombView.bombColliders:[];
}
function advanceBombMode(dt){
 if(gameMode!=="bomb"||!bombState){plantAudio.sync("off");defuseAudio.sync(false);defuserCues.stopBeep();return;}
 const wasAttackerPrep=isAttackerPreparation();
 const beforeInteraction=currentBombInteraction();
 const previousInteraction=bombSoundClock.interaction;
 const result=stepBombRound(bombState,dt,{side:activeOperator.side,
  position:operatorDeployed?player:null,
  holdingF:operatorDeployed&&controlMode==="player"&&keys.has("KeyF"),
  holdingX:operatorDeployed&&controlMode==="player"&&keys.has("KeyX"),
  alive:operatorDeployed&&wireHealth.hp>0});
 bombState=result.state;
 if(wasAttackerPrep&&result.events.includes("action")){
  // Spawn the attacker only at action start; retain their prep drone.
  operatorDeployed=true;player=roundSpawn();cameraEye=1.65;
  setControlMode("player");refreshDroneEquipment();
 }
 bombView.update(bombState,dt);
 const afterInteraction=currentBombInteraction();
 plantAudio.sync(plantRecordingStage(bombState,afterInteraction));
 defuseAudio.sync(afterInteraction==="disable");
 const sound=tickBombSoundClock(bombSoundClock,bombState,dt,afterInteraction);
 bombSoundClock=sound.clock;
 if(beforeInteraction&&!previousInteraction&&
    (beforeInteraction==="disable"||plantAudio.failed)){
  if(beforeInteraction==="disable")shotAudio.playAt("defuser-disabling",
   bombState.defuser.x,bombState.defuser.z,player.x,player.z,player.yaw);
  else shotAudio.play("defuser-case-open");
 }
 for(const name of sound.events){
  if(name==="defuser-tick"){
   // Rounded, physical beeps with the original clock rhythm, audible map-wide.
   const urgent=bombState.time<=10;
   if(!defuserCues.play(urgent?"urgent":"tick"))
    shotAudio.play(urgent?"defuser-tick-urgent":"defuser-tick");
  }else if(name==="defuse-key"){
   if(defuseAudio.failed)shotAudio.playAt("defuse-key",bombState.defuser.x,
    bombState.defuser.z,player.x,player.z,player.yaw);
  }else if(name!=="plant-key"||plantAudio.failed)shotAudio.play(name);
 }
 if(result.events.includes("planted")){
  // Let the full woo-woo arming confirmation finish; the first regular beep
  // arrives from the clock afterwards, never layered on the arming cue.
  if(!defuserCues.play("arm"))shotAudio.playAt("defuser-arming",
   bombState.defuser.x,bombState.defuser.z,player.x,player.z,player.yaw);
 }
 if(result.events.includes("disabled")){
  if(!defuserCues.play("shutdown"))shotAudio.playAt("defuse",
   bombState.defuser.x,bombState.defuser.z,player.x,player.z,player.yaw);
  // The device beep cuts immediately; only the shutdown and outcome remain.
  shotAudio.play(bombState.winner===activeOperator.side?"round-win":"round-loss");
 }
 if(result.events.includes("detonated")){
  defuserCues.stopBeep();
  shotAudio.playAt("gadget-blast",bombState.defuser.x,bombState.defuser.z,
   player.x,player.z,player.yaw);
 }
 if(result.events.includes("dropped")||result.events.includes("planted")||
    result.events.includes("disabled")||result.events.includes("detonated")||
    result.events.includes("ended")||result.events.includes("action")){
  shotNotice.textContent=result.events.includes("planted")?
   "DEFUSER PLANTED · DEFEND 45 SECONDS":
   result.events.includes("dropped")?"DEFUSER DROPPED · F TO RECOVER":
   result.events.includes("disabled")||result.events.includes("detonated")?
    bombRoundOutcome(bombState,activeOperator.side)?.title+" · "+bombState.reason:
   result.events.includes("action")?"ACTION PHASE LIVE · BOMB SITES A / B":
   bombState.reason;
  shotNoticeLeft=3;
 }
}

let breachVault=null,shieldVault=null,lastHardBreachOpenings=[];
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
  if(gameMode==="bomb"&&bombState&&activeOperator.side==="attack"&&
     operator.side!=="attack"&&bombState.defuser.status==="carried"){
   const dropped=dropRoundDefuser(bombState,player,"DEFUSER LEFT FOR ATTACKING TEAM");
   bombState=dropped.state;bombView.update(bombState);
  }
  const previousSide=activeOperator.side;
  activeOperator=operator;
  if(gameMode==="bomb"&&bombState?.phase==="prep"&&previousSide!==operator.side){
   // Switching teams in the paused solo testing lobby restarts prep for the
   // selected side; never expose the staged attacker as a defender body.
   bombState=newBombRound({choice:operator.side==="attack"?chosenDefuserChoice():"leave",
    map:mapMode,round:bombState.round,score:bombState.score});
   player=roundSpawn();
   resetRoundDrones();
   if(isAttackerPreparation())deployAutomaticPrepDrone();
   else setControlMode("player");
   bombView.update(bombState);
  }
  updateDeployMenu();syncRoundUI();
  // This fresh testing role starts at full health. Deployed defender wire
  // persists across team changes so Striker can verify enemy-only damage.
  wireHealth=newWireHealth();
  wireSoundTracker=newWireSoundTracker();
  flashEffect=newFlashEffect();
  cancelHeldThrow();
  syncObservationBlockerViews(); // Defender coverage visible only to Sentry.
  syncProximityViews(); // Proximity range overlays only on defense.
  shieldVault=null; // swapping operator cancels in-progress vault.
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
  // Prevent old visual placement previews after swapping utility slots.
  cancelHeldThrow();
  refreshUtilityHud();
 }
});
function refreshUtilityHud(){
 const rows=utilityHudRows(operatorPicker.plans,activeOperator);
 utilityHud.setAttribute("aria-label",activeOperator.name+" special middle-click and normal G, design previews");
 rows.forEach((row,i)=>{
  utilityName[i].textContent=row.name.toUpperCase();
  utilityStatus[i].textContent=row.gadgetId==="deployable-shield"?
   "LIVE · "+shieldState.charges+"/"+DEPLOYABLE_SHIELD.charges+
    " LEFT · "+liveShields(shieldState).length+" DEPLOYED":
   row.gadgetId==="proximity-alarm"?
   "LIVE · "+proximityState.charges+"/"+PROXIMITY.charges+
    " LEFT · "+liveProximity(proximityState).length+" DEPLOYED":
   row.gadgetId==="observation-blocker"?
   "LIVE · "+observationBlockerState.charges+"/"+OBS_BLOCKER.charges+
    " LEFT · "+activeObservationBlockers(observationBlockerState).length+" DEPLOYED":
   row.gadgetId==="claymore"?
   "LIVE · "+claymoreState.charges+"/"+CLAYMORE.charges+" LEFT · "+claymoreState.devices.length+" PLANTED":
   row.gadgetId==="barbed-wire"?
    "LIVE · "+wireState.charges+"/"+WIRE.charges+" LEFT":
   row.gadgetId==="c4"?
    (nitroState.devices.some(d=>d.armed)?"ARMED · "+row.key+" DETONATE / LOOK + F PICKUP":
      "LIVE · "+nitroState.charges+"/"+NITRO.charges+" LEFT"):
   row.gadgetId==="impact"?
      "LIVE · "+impactState.charges+"/"+IMPACT.charges+" LEFT":
   row.gadgetId==="frag"?
      "LIVE · "+fragState.charges+"/"+FRAG.charges+" LEFT":
   row.gadgetId==="flash"?
      "LIVE · "+flashState.charges+"/"+FLASH.charges+" LEFT":
   row.gadgetId==="hard-breach"?
      (hardBreachState.devices.some(d=>d.armed)?
       (hardBreachState.devices.find(d=>d.armed)?.countdown!==null?
        "DETONATING · CLEAR THE AREA":
        hardBreachState.devices.find(d=>d.armed)?.installed?
        "ARMED · "+row.key+" ACTIVATE / LOOK + F RECOVER":
        "PLANTING · 1.45S / LOOK + F RECOVER"):
       "LIVE · "+hardBreachState.charges+"/"+HARD_BREACH.charges+" LEFT"):
   row.gadgetId==="soft-breach"?
      (softBreachState.devices.some(d=>d.armed)?
       (softBreachState.devices.find(d=>d.armed)?.installed?
        "PLANTED · "+row.key+" DETONATE / LOOK + F RECOVER":
        "PLANTING · WAIT 0.9S / LOOK + F RECOVER"):
       "LIVE · "+softBreachState.charges+"/"+SOFT_BREACH.charges+" LEFT"):
   row.gadgetId==="smoke"?
      "LIVE · "+smokeState.charges+"/"+SMOKE.charges+" LEFT":row.status;
  utilitySlots[i].classList.toggle("planned",Boolean(row.gadgetId));
  utilitySlots[i].setAttribute("aria-label",
   activeOperator.name+" "+row.role.toLowerCase()+" gadget ("+row.key+"): "+row.name+"; "+row.status);
 });
 utilityHudNote.textContent=rows.some(row=>row.gadgetId==="deployable-shield")?
  activeOperator.name+" · HOLD G/MMB TO PREVIEW · SPACE VAULT · F PICK UP · EXPLOSIVES DESTROY":
  rows.some(row=>row.gadgetId==="proximity-alarm")?
  activeOperator.name+" · "+PROXIMITY.range+"M DETECTION · BEEP BEEP BEEP! · WALL/FLOOR · F PICKUP":
  rows.some(row=>row.gadgetId==="observation-blocker")?
  activeOperator.name+" · "+OBS_BLOCKER.screenWidth.toFixed(1)+"M WIDE × "+
   OBS_BLOCKER.screenOffset.toFixed(2)+"M FORWARD · HOLD G/MMB TO PREVIEW · F RECOVER":
  rows.some(row=>row.gadgetId==="claymore")?
  activeOperator.name+" · 3 RED TRIP LASERS · ENEMY-ONLY SENSOR · LOOK + F RECOVER":
  rows.some(row=>row.gadgetId==="hard-breach")?
  activeOperator.name+" · HARD BREACH STEEL / SOFT · F RECOVER · 1.1S DET":
  rows.some(row=>row.gadgetId==="soft-breach")?
  activeOperator.name+" · BREACH PLANT ON WALL/WOOD · F RECOVER":
  rows.some(row=>row.gadgetId==="smoke")?
  activeOperator.name+" · SMOKE 1.8S FUSE · VISUAL COVER ~16S":
  rows.some(row=>row.gadgetId==="flash")?
  activeOperator.name+" · FLASH 1.75S FUSE · FACE AWAY OR USE COVER":
  rows.some(row=>row.gadgetId==="frag")?
  activeOperator.name+" · FRAG FUSE 3.2S · LIVE":
  rows.some(row=>row.gadgetId==="impact")?
  activeOperator.name+" · IMPACT CONTACT DETONATION · LIVE":
  rows.some(row=>row.gadgetId==="c4")?
  activeOperator.name+" · C4 REMOTE DETONATE · LOOK + F TO PICK UP":
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
 if(mapMode==="house")return [...houseView.colliders,
  ...shieldBlockers(shieldState),...bombSiteBlockers(bombState)];
 return [...TEST_OBSTACLES,...barricade.blockers(),...softWall.blockers(),
  ...reinforcement.blockers(),...shieldBlockers(shieldState),...bombSiteBlockers(bombState)];
}
function applyGadgetBlast(blast,label="C4"){
 blastViews.push(createNitroBlast(THREE,scene,blast));
 // Shield armor stays bulletproof but selected blasts destroy it.
 const shieldResult=blastShields(shieldState,blast,label);
 shieldState=shieldResult.state;
 if(shieldResult.destroyed.length){syncShieldViews();refreshUtilityHud();}
 shotAudio.playAt("gadget-blast",blast.x,blast.z,player.x,player.z,player.yaw);
 // Explosions still damage BOTH sides and targets, including the thrower.
 // FRAG damages wood barricades but never gypsum soft walls. IMPACT
 // and C4 damage both wood and unreinforced gypsum; steel stays intact.
 const {wood,gypsum}=resolveStructuralBlast(label,{
  woodBlast:()=>barricade.blastAt(blast),
  // Hard breach alone cuts a small rectangular opening in gypsum.
  gypsumBlast:()=>label==="HARD BREACH"?
   softWall.breachWindow(hardBreachWindow(blast)):softWall.blastAt(blast),
  reinforced:reinforcement.installed&&label!=="HARD BREACH"
 });
 const self=label==="CLAYMORE"?
  claymoreBlastDamage(blast,{x:player.x,y:player.y+.6,z:player.z},activeDroneObstacles()):
  nitroBlastDamage(blast,{x:player.x,y:player.y+.6,z:player.z});
 const instantKill=label==="CLAYMORE"?
  claymoreBlastIsLethal(blast,{x:player.x,y:player.y+.6,z:player.z},activeDroneObstacles()):
  nitroBlastIsLethal(blast,{x:player.x,y:player.y+.6,z:player.z});
 let damageTaken=0,playerEliminated=false;
 if((self>0||instantKill)&&wireHealth.hp>0){
  damageTaken=instantKill?wireHealth.hp:Math.min(wireHealth.hp,self);
  wireHealth={...wireHealth,hp:Math.max(0,wireHealth.hp-damageTaken),
   damage:damageTaken,elapsed:0};
  playerEliminated=wireHealth.hp===0;
  if(playerEliminated){firing=false;aimHeld=false;keys.clear();}
 }
 let hits=0;
 for(const target of targets){
  if(target.downTime>0)continue;
  const point={x:target.group.position.x,y:1.25,z:target.group.position.z};
  const dmg=label==="CLAYMORE"?
   claymoreBlastDamage(blast,point,activeDroneObstacles()):
   nitroBlastDamage(blast,point);
  if(dmg>=20){
   target.downTime=1.6;target.group.visible=false;target.hits++;
   targetHits++;completedTargets.add(target.id);weapons.registerHit();
   hits++;
  }
 }
 return label+" DETONATED · "+hits+" TARGETS · "+
  (label==="FRAG"?wood+" BOARDS · SOFT WALL INTACT":
   wood+" BOARDS · "+gypsum+" GYPSUM CELLS")+
  (playerEliminated?" · YOU WERE ELIMINATED":
   damageTaken?" · SELF -"+damageTaken+" HP":"");
}
function detonateCurrentHardBreach(blast){
 // Remove the steel center BEFORE gypsum blast routing, because a hard
 // breach is the only gadget allowed to cut reinforced collision geometry.
 const opening=hardBreachWindow(blast);
 const steel=reinforcement.breachAt(blast);
 const message=applyGadgetBlast(blast,"HARD BREACH");
 if(opening)lastHardBreachOpenings.push(opening);
 return message+(steel.opened?" · VAULT-SIZED STEEL OPENING":
   " · VAULT-SIZED SOFT WALL OPENING")+" · SPACE NEAR HOLE TO VAULT";
}
function detonateCurrentSoftBreach(){
 const active=softBreachState.devices.find(d=>d.armed);
 const result=detonateSoftBreach(softBreachState);
 if(!result.blast)return result.reason;
 softBreachState=result.state;
 if(active){
  softBreachViews.get(active.id)?.dispose();
  softBreachViews.delete(active.id);
 }
 // Dedicated structural charges reuse the same THREE explosion and real
 // barricade/gypsum destructible functions as other working breach blasts.
 const message=applyGadgetBlast(result.blast,"SOFT BREACH");
 refreshUtilityHud();
 return message;
}
function detonateCurrentNitro(){
 // Always dispose of the CURRENT charge, not a previously recovered one.
 const active=nitroState.devices.find(d=>d.armed);
 const result=detonateNitro(nitroState);
 if(!result.blast)return result.reason;
 nitroState=result.state;
 if(active){
  nitroViews.get(active.id)?.sync(nitroState.devices.find(d=>d.id===active.id));
  nitroViews.delete(active.id);
 }
 const feedback=applyGadgetBlast(result.blast,"C4");
 refreshUtilityHud();
 return feedback;
}
function tryPickupCurrentNitro(){
 if(activeOperator.side!=="defend"||controlMode!=="player")return false;
 const active=nitroState.devices.find(d=>d.armed&&d.stuck);
 const view=active?nitroViews.get(active.id):null;
 if(!view?.pickupTarget)return false;
 // The transparent pickup collider is slightly larger than the visible C4.
 // We check the closest ray collision against real walls, wood and steel.
 // An obstructing wall beats the gadget, preventing through-wall recovery.
 camera.updateMatrixWorld(true);
 view.group.updateMatrixWorld(true);
 const pickupRay=new THREE.Raycaster();
 pickupRay.setFromCamera({x:0,y:0},camera);
 pickupRay.far=NITRO.pickupRange+1.4;
 const hits=pickupRay.intersectObjects([
  view.pickupTarget,...shootableSolids,...barricade.shootables(),
  ...softWall.shootables(),...reinforcement.shootables()
 ],false);
 if(hits[0]?.object!==view.pickupTarget)return false;
 const result=pickupNitro(nitroState,active.id,player);
 if(!result.device)return false;
 nitroState=result.state;
 view.sync(null);nitroViews.delete(active.id);
 // F was consumed for pickup. It must not simultaneously rebuild wood or
 // finish a held steel reinforcement installation.
 barricadeBuildTime=0;
 reinforcement.step({player,holding:false,dt:0});
 keys.delete("KeyF");
 shotNotice.textContent=result.reason;
 shotNoticeLeft=1.65;
 refreshUtilityHud();
 return true;
}
function syncObservationBlockerViews(){
 for(const [id,view] of observationBlockerViews){
  const device=observationBlockerState.devices.find(d=>d.id===id&&d.hp>0);
  if(device)view.setMode(controlMode,device,activeOperator.side);
  else{view.dispose();observationBlockerViews.delete(id);}
 }
}
function syncShieldViews(){
 for(const [id,view] of shieldViews){
  if(!liveShields(shieldState).some(d=>d.id===id)){
   view.dispose();shieldViews.delete(id);
  }
 }
}
function shootableShields(){
 return liveShields(shieldState).map(d=>shieldViews.get(d.id)?.ballistic).filter(Boolean);
}
function tryPickupCurrentShield(){
 if(activeOperator.side!=="defend"||controlMode!=="player")return false;
 camera.updateMatrixWorld(true);
 const ray=new THREE.Raycaster();
 ray.setFromCamera({x:0,y:0},camera);
 ray.far=DEPLOYABLE_SHIELD.pickupRange+1;
 for(const view of shieldViews.values())view.root.updateMatrixWorld(true);
 const targets=liveShields(shieldState)
  .map(d=>shieldViews.get(d.id)?.pickupTarget).filter(Boolean);
 if(!targets.length)return false;
 const hits=ray.intersectObjects([...targets,...shootableSolids,
  ...barricade.shootables(),...softWall.shootables(),
  ...reinforcement.shootables()],false);
 const id=hits[0]?.object?.userData?.deployableShieldPickupId;
 if(!Number.isInteger(id))return false;
 const result=pickupShield(shieldState,id,player);
 if(!result.device)return false;
 shieldState=result.state;syncShieldViews();refreshUtilityHud();
 keys.delete("KeyF");barricadeBuildTime=0;
 reinforcement.step({player,holding:false,dt:0});
 shotNotice.textContent=result.reason;shotNoticeLeft=1.65;
 return true;
}
function syncProximityViews(){
 for(const [id,view] of proximityViews){
  const d=proximityState.devices.find(device=>device.id===id&&device.hp>0);
  if(d)view.sync(d,controlMode,activeOperator.side);
  else{view.dispose();proximityViews.delete(id);}
 }
}
function shootableProximityAlarms(){
 return liveProximity(proximityState).flatMap(d=>proximityViews.get(d.id)?.hardware||[]);
}
function hitProximityAlarm(id,amount){
 const result=damageProximity(proximityState,id,amount);
 if(!result.handled)return {handled:false,destroyed:false};
 proximityState=result.state;
 syncProximityViews();refreshUtilityHud();
 shotAudio.play("impact");
 shotNotice.textContent=result.destroyed?
  "PROXIMITY ALARM DESTROYED · BEEP DISABLED":
  "PROXIMITY ALARM HIT · "+result.hp+" HP";
 shotNoticeLeft=1.3;return result;
}
function tryPickupCurrentProximity(){
 if(activeOperator.side!=="defend"||controlMode!=="player")return false;
 const live=liveProximity(proximityState);
 if(!live.length)return false;
 camera.updateMatrixWorld(true);
 for(const view of proximityViews.values())view.root.updateMatrixWorld(true);
 const ray=new THREE.Raycaster();
 ray.setFromCamera({x:0,y:0},camera);
 ray.far=PROXIMITY.pickupRange+.9;
 const hits=ray.intersectObjects([
  ...live.map(d=>proximityViews.get(d.id)?.pickupTarget).filter(Boolean),
  ...shootableSolids,...barricade.shootables(),...softWall.shootables(),
  ...reinforcement.shootables()
 ],false);
 const id=hits[0]?.object?.userData?.proximityPickupId;
 if(!Number.isInteger(id))return false;
 const result=pickupProximity(proximityState,id,player);
 if(!result.device)return false;
 proximityState=result.state;
 syncProximityViews();
 barricadeBuildTime=0;
 reinforcement.step({player,holding:false,dt:0});
 keys.delete("KeyF");
 shotNotice.textContent=result.reason;shotNoticeLeft=1.65;
 refreshUtilityHud();return true;
}
function tryPickupCurrentObservationBlocker(){
 if(activeOperator.side!=="defend"||controlMode!=="player")return false;
 camera.updateMatrixWorld(true);
 const pickupRay=new THREE.Raycaster();
 pickupRay.setFromCamera({x:0,y:0},camera);
 pickupRay.far=OBS_BLOCKER.pickupRange+1.0;
 const targets=activeObservationBlockers(observationBlockerState)
  .map(d=>observationBlockerViews.get(d.id)?.pickupTarget).filter(Boolean);
 if(!targets.length)return false;
 for(const view of observationBlockerViews.values())view.root.updateMatrixWorld(true);
 const hits=pickupRay.intersectObjects([
  ...targets,...shootableSolids,...barricade.shootables(),
  ...softWall.shootables(),...reinforcement.shootables()
 ],false);
 const id=hits[0]?.object?.userData?.observationBlockerPickupId;
 if(!Number.isInteger(id))return false;
 const result=pickupObservationBlocker(observationBlockerState,id,player);
 if(!result.device)return false;
 observationBlockerState=result.state;
 syncObservationBlockerViews();
 barricadeBuildTime=0;
 reinforcement.step({player,holding:false,dt:0});
 keys.delete("KeyF");
 shotNotice.textContent=result.reason;shotNoticeLeft=1.65;
 refreshUtilityHud();
 return true;
}
function shootableObservationBlockers(){
 return activeObservationBlockers(observationBlockerState)
  .flatMap(d=>observationBlockerViews.get(d.id)?.hardware||[]);
}
function hitObservationBlocker(id,damage){
 const result=damageObservationBlocker(observationBlockerState,id,damage);
 if(!result.handled)return {handled:false,destroyed:false};
 observationBlockerState=result.state;
 syncObservationBlockerViews();
 refreshUtilityHud();
 shotAudio.play("impact");
 shotNotice.textContent=result.destroyed?
  "OBSERVATION BLOCKER DESTROYED · DRONE VISION RESTORED":
  "OBSERVATION BLOCKER HARDWARE HIT · "+result.remainingHP+" HP";
 shotNoticeLeft=1.4;
 return result;
}
function tryPickupCurrentClaymore(){
 if(activeOperator.side!=="attack"||controlMode!=="player")return false;
 camera.updateMatrixWorld(true);
 const pickupRay=new THREE.Raycaster();
 pickupRay.setFromCamera({x:0,y:0},camera);
 pickupRay.far=CLAYMORE.pickupRange+.75;
 const mineTargets=claymoreState.devices.filter(d=>d.armed)
  .map(d=>claymoreViews.get(d.id)?.pickupTarget).filter(Boolean);
 if(!mineTargets.length)return false;
 for(const view of claymoreViews.values())view.root.updateMatrixWorld(true);
 const hits=pickupRay.intersectObjects([
  ...mineTargets,...shootableSolids,...barricade.shootables(),
  ...softWall.shootables(),...reinforcement.shootables()
 ],false);
 const id=hits[0]?.object?.userData?.claymorePickupId;
 if(!Number.isInteger(id))return false;
 const result=pickupClaymore(claymoreState,id,player);
 if(!result.device)return false;
 claymoreState=result.state;
 claymoreViews.get(id)?.dispose();claymoreViews.delete(id);
 barricadeBuildTime=0;
 reinforcement.step({player,holding:false,dt:0});
 keys.delete("KeyF");
 shotNotice.textContent=result.reason;shotNoticeLeft=1.65;
 refreshUtilityHud();
 return true;
}
function tryPickupCurrentHardBreach(){
 if(activeOperator.side!=="attack"||controlMode!=="player")return false;
 const active=hardBreachState.devices.find(d=>d.armed);
 const view=active?hardBreachViews.get(active.id):null;
 if(!view?.pickupTarget)return false;
 camera.updateMatrixWorld(true);view.root.updateMatrixWorld(true);
 const pickupRay=new THREE.Raycaster();
 pickupRay.setFromCamera({x:0,y:0},camera);
 pickupRay.far=HARD_BREACH.pickupRange+.25;
 const hits=pickupRay.intersectObjects([
  view.pickupTarget,...shootableSolids,...barricade.shootables(),
  ...softWall.shootables(),...reinforcement.shootables()
 ],false);
 if(hits[0]?.object!==view.pickupTarget)return false;
 const result=pickupHardBreach(hardBreachState,active.id,player);
 if(!result.device)return false;
 hardBreachState=result.state;
 view.dispose();hardBreachViews.delete(active.id);
 barricadeBuildTime=0;
 reinforcement.step({player,holding:false,dt:0});
 keys.delete("KeyF");
 shotNotice.textContent=result.reason;shotNoticeLeft=1.65;
 refreshUtilityHud();
 return true;
}
function tryPickupCurrentSoftBreach(){
 if(activeOperator.side!=="attack"||controlMode!=="player")return false;
 const active=softBreachState.devices.find(d=>d.armed);
 const view=active?softBreachViews.get(active.id):null;
 if(!view?.pickupTarget)return false;
 camera.updateMatrixWorld(true);
 view.root.updateMatrixWorld(true);
 const pickupRay=new THREE.Raycaster();
 pickupRay.setFromCamera({x:0,y:0},camera);
 pickupRay.far=SOFT_BREACH.pickupRange+.2;
 const hits=pickupRay.intersectObjects([
  view.pickupTarget,...shootableSolids,...barricade.shootables(),
  ...softWall.shootables(),...reinforcement.shootables()
 ],false);
 if(hits[0]?.object!==view.pickupTarget)return false;
 const result=pickupSoftBreach(softBreachState,active.id,player);
 if(!result.device)return false;
 softBreachState=result.state;
 view.dispose();softBreachViews.delete(active.id);
 // Consumed F must not additionally repair wood or install reinforcement.
 barricadeBuildTime=0;
 reinforcement.step({player,holding:false,dt:0});
 keys.delete("KeyF");
 shotNotice.textContent=result.reason;
 shotNoticeLeft=1.65;
 refreshUtilityHud();
 return true;
}
// Config shares the SAME projectile throw/tick functions used for live play.
// Preview never alters gadget inventory; actual use is committed on release.
const throwableConfigs={
 frag:{makeState:newFragState,thrower:throwFrag,stepper:tickFrag},
 flash:{makeState:newFlashState,thrower:throwFlash,stepper:tickFlash},
 smoke:{makeState:newSmokeState,thrower:throwSmoke,stepper:tickSmoke},
 impact:{makeState:newImpactState,thrower:throwImpact,stepper:tickImpact},
 c4:{makeState:newNitroState,thrower:throwNitro,stepper:tickNitro}
};
function cancelHeldThrow(){
 heldThrowCode=null;lastThrowPreviewAt=-Infinity;
 throwPreviewView.hide();observationPreviewView.hide();shieldPreviewView.hide();
}
function gadgetCharges(gadgetId){
 switch(gadgetId){
  case "frag":return fragState.charges;
  case "flash":return flashState.charges;
  case "smoke":return smokeState.charges;
  case "impact":return impactState.charges;
  case "c4":return nitroState.charges;
  default:return 0;
 }
}
function startGadgetInput(code){
 if(gameMode==="bomb"&&bombState?.phase==="prep"&&activeOperator.side==="attack"){
  shotNotice.textContent="PREPARATION · ATTACKER DRONES ONLY UNTIL ACTION PHASE";
  shotNoticeLeft=1.3;return;
 }
 if(gameMode==="bomb"&&bombState?.phase==="ended")return;
 const row=utilityHudRows(operatorPicker.plans,activeOperator).find(r=>r.code===code);
 if(!row)return;
 if(heldThrowCode)return; // No simultaneous conflicting G/MMB trajectory.
 const id=row.gadgetId;
 // Observation Blocker has a much larger projection and must show the
 // exact area BEFORE using ammo. Hold assigned G/MMB; release to plant.
 if(id==="deployable-shield"&&activeOperator.side==="defend"&&
    shieldState.charges>0){
  heldThrowCode=code;lastThrowPreviewAt=-Infinity;
  shotNotice.textContent="SHIELD PLACEMENT PREVIEW · RELEASE "+row.key+" TO SET BULLETPROOF COVER";
  shotNoticeLeft=1.5;updateHeldThrowPreview(performance.now());return;
 }
 if(id==="observation-blocker"&&activeOperator.side==="defend"&&
    observationBlockerState.charges>0){
  heldThrowCode=code;lastThrowPreviewAt=-Infinity;
  shotNotice.textContent="OBS COVERAGE "+OBS_BLOCKER.screenWidth.toFixed(1)+
   "M W × "+OBS_BLOCKER.screenOffset.toFixed(2)+
   "M REACH · RELEASE "+row.key+" TO PLACE";
  shotNoticeLeft=1.35;
  updateHeldThrowPreview(performance.now());
  return;
 }
 const armedNitro=nitroState.devices.some(d=>d.armed);
 if(THROW_PREVIEW_IDS.includes(id)&&canPreviewThrow(id,gadgetCharges(id),armedNitro)){
  heldThrowCode=code;lastThrowPreviewAt=-Infinity;
  shotNotice.textContent="AIM THROW · RELEASE "+row.key+" TO THROW";
  shotNoticeLeft=1.1;
  updateHeldThrowPreview(performance.now());
 }else{
  // C4's second press still detonates immediately; wire and planned
  // non-throwable gadgets preserve original press behavior.
  usePlannedGadget(code);
 }
}
function releaseGadgetInput(code){
 if(heldThrowCode!==code)return;
 cancelHeldThrow();
 if(locked&&controlMode==="player"&&wireHealth.hp>0&&!(gameMode==="bomb"&&bombState?.phase==="ended"))usePlannedGadget(code);
}
function updateHeldThrowPreview(now){
 if(!heldThrowCode||!locked||controlMode!=="player"||wireHealth.hp<=0){
  throwPreviewView.hide();return;
 }
 if(now-lastThrowPreviewAt<45)return; // keep preview inexpensive during aiming
 lastThrowPreviewAt=now;
 const row=utilityHudRows(operatorPicker.plans,activeOperator).find(r=>r.code===heldThrowCode);
 if(row?.gadgetId==="deployable-shield"&&activeOperator.side==="defend"){
  shieldPreviewView.update(player,shieldState,activeDroneObstacles());
  throwPreviewView.hide();observationPreviewView.hide();return;
 }
 shieldPreviewView.hide();
 if(row?.gadgetId==="observation-blocker"&&activeOperator.side==="defend"){
  const clearance=canPlaceObservationBlocker(observationBlockerState,player,activeDroneObstacles());
  observationPreviewView.update(clearance.position||blockerPosition(player),clearance.ok);
  throwPreviewView.hide();
  return;
 }
 observationPreviewView.hide();
 const conf=throwableConfigs[row?.gadgetId];
 if(!conf||!canPreviewThrow(row.gadgetId,gadgetCharges(row.gadgetId),
   nitroState.devices.some(d=>d.armed))){cancelHeldThrow();return;}
 const trajectory=traceThrownGadget({...conf,player,obstacles:activeDroneObstacles()});
 throwPreviewView.update(row.gadgetId,trajectory);
}
function usePlannedGadget(code){
 const row=utilityHudRows(operatorPicker.plans,activeOperator).find(item=>item.code===code);
 if(!row)return;
 if(row.gadgetId==="deployable-shield"&&activeOperator.side==="defend"){
  const result=placeShield(shieldState,player,activeDroneObstacles());
  if(result.device){
   shieldState=result.state;
   shieldViews.set(result.device.id,createShieldView(THREE,scene,result.device));
   shotAudio.play("gadget-throw");refreshUtilityHud();
  }
  shotNotice.textContent=result.reason;shotNoticeLeft=1.75;return;
 }
 if(row.gadgetId==="proximity-alarm"&&activeOperator.side==="defend"){
  const result=placeProximity(proximityState,player,activeDroneObstacles());
  if(result.device){
   proximityState=result.state;
   proximityViews.set(result.device.id,createProximityView(THREE,scene,result.device));
   syncProximityViews();shotAudio.play("gadget-throw");
   refreshUtilityHud();
  }
  shotNotice.textContent=result.reason;shotNoticeLeft=1.75;return;
 }
 if(row.gadgetId==="observation-blocker"&&activeOperator.side==="defend"){
  const result=placeObservationBlocker(observationBlockerState,player,activeDroneObstacles());
  if(result.device){
   observationBlockerState=result.state;
   const view=createObservationBlockerView(THREE,scene,result.device);
   observationBlockerViews.set(result.device.id,view);
   view.setMode(controlMode,result.device,activeOperator.side);
   shotAudio.play("gadget-throw");
   refreshUtilityHud();
  }
  shotNotice.textContent=result.reason;shotNoticeLeft=1.7;return;
 }
 if(row.gadgetId==="claymore"&&activeOperator.side==="attack"){
  const result=placeClaymore(claymoreState,player,activeDroneObstacles());
  if(result.device){
   claymoreState=result.state;
   claymoreViews.set(result.device.id,createClaymoreView(THREE,scene,result.device));
   shotAudio.play("gadget-throw");refreshUtilityHud();
  }
  shotNotice.textContent=result.reason;
  shotNoticeLeft=1.7;return;
 }
 if(row.gadgetId==="hard-breach"&&activeOperator.side==="attack"){
  if(hardBreachState.devices.some(d=>d.armed)){
   const triggered=armHardBreach(hardBreachState);
   if(triggered.ok){hardBreachState=triggered.state;refreshUtilityHud();}
   shotNotice.textContent=triggered.reason;
  }else{
   const result=placeHardBreach(hardBreachState,player,{
    softState:softWall.state,reinforcementState:reinforcement.state
   });
   if(result.device){
    hardBreachState=result.state;
    hardBreachViews.set(result.device.id,
     createHardBreachView(THREE,scene,result.device));
    shotAudio.play("gadget-throw");refreshUtilityHud();
   }
   shotNotice.textContent=result.reason;
  }
  shotNoticeLeft=1.9;return;
 }
 if(row.gadgetId==="soft-breach"&&activeOperator.side==="attack"){
  if(softBreachState.devices.some(d=>d.armed)){
   shotNotice.textContent=detonateCurrentSoftBreach();
  }else{
   const result=placeSoftBreach(softBreachState,player,{
    softState:softWall.state,barricadeState:barricade.state,
    reinforced:reinforcement.installed
   });
   if(result.device){
    softBreachState=result.state;
    softBreachViews.set(result.device.id,
     createSoftBreachView(THREE,scene,result.device));
    shotAudio.play("gadget-throw");
    refreshUtilityHud();
   }
   shotNotice.textContent=result.reason;
  }
  shotNoticeLeft=1.9;
  return;
 }
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
 if(row.gadgetId==="frag"&&activeOperator.side==="attack"){
  const result=throwFrag(fragState,player);
  if(result.device){
   fragState=result.state;
   fragViews.set(result.device.id,createFragView(THREE,scene,result.device));
   shotAudio.play("gadget-throw");
   refreshUtilityHud();
  }
  shotNotice.textContent=result.reason;
  shotNoticeLeft=1.7;
  return;
 }
 if(row.gadgetId==="flash"&&activeOperator.side==="attack"){
  const result=throwFlash(flashState,player);
  if(result.device){
   flashState=result.state;
   flashViews.set(result.device.id,createFlashView(THREE,scene,result.device));
   shotAudio.play("gadget-throw");
   refreshUtilityHud();
  }
  shotNotice.textContent=result.reason;
  shotNoticeLeft=1.7;
  return;
 }
 if(row.gadgetId==="smoke"&&activeOperator.side==="attack"){
  const result=throwSmoke(smokeState,player);
  if(result.device){
   smokeState=result.state;
   smokeViews.set(result.device.id,createSmokeView(THREE,scene,result.device));
   shotAudio.play("gadget-throw");
   refreshUtilityHud();
  }
  shotNotice.textContent=result.reason;
  shotNoticeLeft=1.7;
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
  ...softWall.shootables(),...reinforcement.shootables(),...shootableWire(),...shootableObservationBlockers(),...shootableProximityAlarms(),...shootableShields(),...shootableDrones()];
 const hits=combatIntersections(meleeRaycaster,solids,[]);
 const selected=selectedMeleeTarget(hits);
 let description="MELEE MISSED · GET CLOSER AND AIM AT TARGET";
 const shieldId=hits[0]?.object?.userData?.deployableShieldId;
 const proxId=hits[0]?.object?.userData?.proximityAlarmId;
 const observationId=hits[0]?.object?.userData?.observationBlockerId;
 const droneIndex=hits[0]?.object?.userData?.reconDroneIndex;
 if(Number.isInteger(droneIndex)&&destroyPhysicalDrone(droneIndex)){
  description="ATTACKER DRONE DESTROYED · CAMERA OFFLINE";
 }else if(Number.isInteger(shieldId)){
  description="BULLETPROOF SHIELD · MELEE CANNOT DESTROY IT";
  shotAudio.play("impact");
 }else if(Number.isInteger(proxId)){
  const result=hitProximityAlarm(proxId,PROXIMITY.hp);
  description=result.destroyed?"PROXIMITY ALARM PUNCHED · DESTROYED":
   "PROXIMITY ALARM STRUCK";
 }else if(Number.isInteger(observationId)){
  const result=hitObservationBlocker(observationId,OBS_BLOCKER.health);
  description=result.destroyed?"OBSERVATION BLOCKER SMASHED · FIELD OFF":
   "OBSERVATION BLOCKER HARDWARE STRUCK";
 }else if(selected.kind==="wire"){
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
 // No attacker body exists in prep, so X and 5 cannot exit the feed.
 if(isAttackerPreparation()&&nextMode==="player")nextMode="drone";
 // Never enter a recon feed as a defender, including after switching teams
 // while the camera was open and the Testing Range was paused.
 if(nextMode==="drone"&&!canUseReconDrones(activeOperator))nextMode="player";
 if(nextMode!=="player")shieldVault=null;
 controlMode=nextMode;
 syncProximityViews();
 syncObservationBlockerViews(); // projected screens only render in drone mode
 const active=locked;
 hud.classList.toggle("hidden",!active||controlMode!=="player");
 droneHud.classList.toggle("hidden",!active||controlMode!=="drone");
 document.body.dataset.hudProfile=active?controlMode:"menu";
 weaponView.root.visible=controlMode==="player";
 crosshair.classList.toggle("hidden",!active||controlMode!=="player");
 firing=false;aimHeld=false;reloadPressed=false;keys.clear();
 cancelHeldThrow();
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
 const info=droneEquipmentStatus(droneRoster,
  gameMode==="bomb"?bombState?.phase:"range");
 droneCameraCount.textContent=String(info.cameras);
 droneSpareCount.textContent=String(info.throwables);
 droneFeedState.textContent=controlMode==="drone"&&!drone?
  "SIGNAL LOST · CAMERA DESTROYED":
  isAttackerPreparation()?"SIGNAL ONLINE · PREPARATION":
  "SIGNAL ONLINE · LIVE CAMERA";
}
function registerPhysicalDrone(fresh,kind){
 const next=registerDrone(droneRoster,fresh,kind);
 if(next===droneRoster)return false;
 droneRoster=next;
 const view=createDroneView(THREE,scene);
 view.place(fresh);
 view.setIndex(droneViews.length);
 droneViews.push(view);
 drone=selectedDrone(droneRoster);
 refreshDroneEquipment();
 return true;
}
function throwPhysicalDrone(kind){
 if(!canUseReconDrones(activeOperator)||!operatorDeployed)return false;
 // Key 6 throws the action-phase spare or a regular testing-range drone.
 // Key 5 only reconnects to an existing camera.
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
 if(!registerPhysicalDrone(fresh,kind))return false;
 shotNotice.textContent="DRONE THROWN · "+droneRoster.drones.length+
   " DEPLOYED · PRESS 5 FOR CAMERAS";
 shotNoticeLeft=1.4;
 return true;
}
function resetRoundDrones(mode="match"){
 for(const view of droneViews)view.dispose();
 droneViews.length=0;
 droneRoster=newDroneRoster(mode);
 drone=null;
 operatorDeployed=true;
 controlMode="player";
 refreshDroneEquipment();
}
function deployAutomaticPrepDrone(){
 if(!isAttackerPreparation())return;
 operatorDeployed=false; // staged spawn is not a playable body
 if(!droneRoster.initialUsed){
  // Begin in a deployed floor drone; no invisible operator throws it.
  const spawn=roundSpawn();
  const x=spawn.x-Math.sin(spawn.yaw)*.65;
  const z=spawn.z-Math.cos(spawn.yaw)*.65;
  const location=canDroneOccupy(x,0,z,activeDroneObstacles())?
   {x,z}:{x:spawn.x,z:spawn.z};
  registerPhysicalDrone(newDrone(location.x,location.z,spawn.yaw),"initial");
 }
 drone=selectedDrone(droneRoster);
 setControlMode("drone");
 refreshDroneEquipment();
}
function shootableDrones(){
 return droneViews.flatMap(view=>view.root.visible?view.shootables:[]);
}
function destroyPhysicalDrone(index){
 if(!Number.isInteger(index)||index<0||index>=droneViews.length)return false;
 droneViews[index].dispose();
 droneViews.splice(index,1);
 droneRoster=removeDrone(droneRoster,index);
 droneViews.forEach((view,i)=>view.setIndex(i));
 drone=selectedDrone(droneRoster);
 if(controlMode==="drone"&&!drone){
  if(isAttackerPreparation()){
   shotNotice.textContent="DRONE DESTROYED · OPERATOR SPAWNS IN ACTION";
   shotNoticeLeft=3;
  }else setControlMode("player");
 }
 refreshDroneEquipment();
 shotAudio.play("impact");
 return true;
}
function openDroneCameras(){
 if(!canUseReconDrones(activeOperator))return;
 if(controlMode==="drone"){
  if(!isAttackerPreparation())setControlMode("player");
  return;
 }
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
 const request=throwRequest(droneRoster,
  gameMode==="bomb"?bombState?.phase:"range");
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
 droneRoundClock.textContent=gameMode==="bomb"&&bombState?
  drillClock(bombState.time):drillClock(DRILL_LENGTH_SECONDS-drillElapsedSeconds);
 droneRoundPhase.textContent=gameMode==="bomb"&&bombState?
  (bombState.phase==="prep"?"PREPARATION":bombState.phase==="action"?"ACTION":
   bombState.phase==="postplant"?"DEFUSER ACTIVE":"ROUND OVER"):"TEST RANGE";
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
 if(mapMode==="house")drawHouseMinimap(droneMapCtx,drone);
 else drawTrainingMap(droneMapCtx,drone,TEST_OBSTACLES,targets,BARRICADE,SOFT_WALL);
 if(gameMode==="bomb")drawBombRoundMinimap(droneMapCtx,bombState);
}
function unlockMessage(){
 message.textContent=gameMode==="bomb"&&bombState?
   "PAUSED TRAINING BOMB ROUND · PHASE "+bombState.phase.toUpperCase()+
    " · SELECT DEPLOY TO CONTINUE":
   started?"PAUSED TRAINING · PRESS DEPLOY TO RESUME.":
   "TRAINING OFFLINE · AI AND ONLINE 5V5 ARE IN DEVELOPMENT";
}
function beginBombRound(){
 plantAudio.sync("off");
 defuseAudio.sync(false);
 defuserCues.reset();
 setMapMode(playMode.value==="house"?"house":"sandbox");
 const choice=activeOperator.side==="defend"?"leave":chosenDefuserChoice();
 gameMode="bomb";bombState=newBombRound({choice,map:mapMode});bombSoundClock=newBombSoundClock();
 player=roundSpawn();wireHealth=newWireHealth();
 cameraEye=1.65;proneToggle=false;keys.clear();cancelHeldThrow();
 breachVault=null;shieldVault=null;
 resetRoundDrones();
 if(isAttackerPreparation())deployAutomaticPrepDrone();
 else setControlMode("player");
 bombView.update(bombState);syncRoundUI();
 message.textContent=isAttackerPreparation()?
  "ATTACKER PREP · DRONE AUTO-DEPLOYED · OPERATOR SPAWNS AT ACTION":
  "DEFENDER PREP · REINFORCE AND PREPARE THE SITES";
 enterRange();
}
function nextBombRound(){
 if(gameMode!=="bomb"||bombState?.phase!=="ended")return false;
 plantAudio.sync("off");
 defuseAudio.sync(false);
 defuserCues.reset();
 const choice=activeOperator.side==="defend"?"leave":chosenDefuserChoice();
 bombState=newFollowingRound(bombState,choice);bombSoundClock=newBombSoundClock();
 player=roundSpawn();wireHealth=newWireHealth();proneToggle=false;
 breachVault=null;shieldVault=null;keys.clear();
 resetRoundDrones();
 if(isAttackerPreparation())deployAutomaticPrepDrone();
 else setControlMode("player");
 bombView.update(bombState);syncRoundUI();
 shotNotice.textContent="NEW BOMB ROUND "+bombState.round+" · PREPARATION 45S";
 shotNoticeLeft=2.5;return true;
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
playMode.addEventListener("change",updateDeployMenu);
updateDeployMenu();
// One game engine: network sessions reuse the original house, camera and weapon.
onlineSession=createBlackoutNetwork({
 onStart(snapshot){
   const self=snapshot.self;if(!self)return;
   activeOperator=operatorById(self.side==="defender"?"sentry":"striker");
   gameMode="online";bombState=null;bombView.update(null);
   setMapMode("house");resetRoundDrones();
   player={...initialPlayer(),x:self.x,y:self.y,z:self.z,yaw:self.yaw,pitch:self.pitch};
   wireHealth=newWireHealth();weapons.reset();cameraEye=1.65;
   operatorHudName.textContent=activeOperator.name;
   operatorHudSide.textContent=self.side==="defender"?"DEFENDER":"ATTACKER";
   refreshUtilityHud();refreshDroneEquipment();syncRoundUI();
   remoteOperators.sync(snapshot.players,snapshot.id);
   shotNotice.textContent="CONNECTED · ORIGINAL BLACKOUT HOUSE";shotNoticeLeft=3;
 },
 onEnter(){enterRange()},
 onState(snapshot){
   if(!snapshot.self)return;
   remoteOperators.sync(snapshot.players,snapshot.id);
   if(gameMode==="online"){
     wireHealth={...wireHealth,hp:Math.min(wireHealth.hp,snapshot.self.health)};
     if(!snapshot.self.alive){firing=false;aimHeld=false}
   }
 },
 onEnd(){
   if(document.pointerLockElement===canvas)document.exitPointerLock();
   remoteOperators.clear();gameMode="sandbox";bombState=null;
   message.textContent="CONNECTED ROUND COMPLETE · HOST CAN START NEXT ROUND";
 },
 onLeave(){
   if(document.pointerLockElement===canvas)document.exitPointerLock();
   remoteOperators.clear();gameMode="sandbox";bombState=null;
   setMapMode("sandbox");syncRoundUI();
 },
 onCorrection(fix){
   if(gameMode==="online"&&[fix.x,fix.y,fix.z].every(Number.isFinite))
     Object.assign(player,{x:fix.x,y:fix.y,z:fix.z});
 },
 onHit(snapshot,event){
   if(String(event.to)===String(snapshot.id)){
     wireHealth={...wireHealth,hp:Math.max(0,Number(event.health)||0)};
     shotNotice.textContent=wireHealth.hp?"HIT · "+wireHealth.hp+" HP":"ELIMINATED · WAIT FOR NEXT ROUND";
     shotNoticeLeft=2;
   }
 },
 onAmmo(shots){if(gameMode==="online"&&Number.isInteger(shots))weapons.current.ammo=shots;},
 onShot(snapshot,event){
   if(String(event.from)===String(snapshot.id))return;
   const source=snapshot.players.find(p=>String(p.id)===String(event.from));
   if(source)shotAudio.playAt("enemy-fire",source.x,source.z,player.x,player.z,player.yaw);
 }
});
$("solo-choice")?.addEventListener("click",()=>{
 $("operator-selection")?.scrollIntoView({behavior:"smooth",block:"start"});
 message.textContent="SOLO TEST · ORIGINAL HOUSE, GADGETS AND DRONES";
});
$("custom-choice")?.addEventListener("click",()=>onlineSession.open("custom"));
$("online-choice")?.addEventListener("click",()=>onlineSession.open("standard"));
play.addEventListener("click",()=>{
 if(playMode.value==="sandbox"){
  plantAudio.sync("off");
  defuseAudio.sync(false);
  defuserCues.reset();
  setMapMode("sandbox");
  if(gameMode!=="sandbox"){
   gameMode="sandbox";bombState=null;bombSoundClock=newBombSoundClock();bombView.update(null);
   resetRoundDrones("range");player=initialPlayer();setControlMode("player");
  }
  syncRoundUI();enterRange();return;
 }
 if(gameMode==="bomb"&&bombState&&
   (mapMode==="house")===(playMode.value==="house")){
  if(bombState.phase==="ended")nextBombRound();
  if(isAttackerPreparation())deployAutomaticPrepDrone();
  syncRoundUI();enterRange();return;
 }
 beginBombRound();
});
document.addEventListener("pointerlockchange",()=>{
 locked=document.pointerLockElement===canvas;
 menu.classList.toggle("hidden",locked||Boolean(onlineSession?.active));
 if(onlineSession?.active){if(locked)onlineSession.hidePause();else onlineSession.showPause();}
 document.body.classList.toggle("range-active",locked);
 setControlMode(controlMode);
 if(!locked){if(plantAudio.stage==="typing")plantAudio.sync("off");else if(bombState?.phase!=="ended")plantAudio.pause();defuseAudio.sync(false);bombCameraLock=null;cancelHeldThrow();keys.clear();c4PickupKeyConsumed=false;softBreachPickupKeyConsumed=false;hardBreachPickupKeyConsumed=false;claymorePickupKeyConsumed=false;observationPickupKeyConsumed=false;proximityPickupKeyConsumed=false;shieldPickupKeyConsumed=false;footstepTracker=newFootstepTracker();proneToggle=false;firing=false;aimHeld=false;reloadPressed=false;leanTarget=0;leanAmount=0;barricadeBuildTime=0;droneJumpPressed=false;reinforcement.step({player,holding:false,dt:0});unlockMessage();}
 else {plantAudio.resume();defuseAudio.resume();}
 lastTime=performance.now();
});
document.addEventListener("pointerlockerror",()=>{
 message.textContent="POINTER LOCK FAILED · CLICK ENTER TEST RANGE AGAIN";
});
document.addEventListener("mousemove",event=>{
 if(!locked)return;
 if(currentBombInteraction())return; // Fixed viewpoint while planting/disabling.
 if(controlMode==="drone"){
  if(drone){
   drone.yaw-=event.movementX*.003;
   drone.pitch=Math.max(-.75,Math.min(.75,drone.pitch-event.movementY*.0026));
  }
 }else{
  player.yaw-=event.movementX*.00215;
   const nextPitch=Math.max(-1.48,Math.min(1.48,player.pitch-event.movementY*.00215));
   // Manual downward mouse compensation already brings the optic back.
   // Subtract that distance from the unrecovered recoil so stopping fire
   // never drags the crosshair down a second time.
   recoilRecovery=consumeManualRecoil(recoilRecovery,player.pitch,nextPitch);
   player.pitch=nextPitch;
 }
});
document.addEventListener("keydown",event=>{
 if(locked&&(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","KeyC","KeyQ","KeyE","ControlLeft","ControlRight"].includes(event.code)||event.ctrlKey))
   event.preventDefault();
 if(!locked)return;
 // Elimination freezes all attacks, drones and gadgets; P is the only
 // player input allowed to restore the testing life.
 if(gameMode==="bomb"&&event.code==="KeyN"&&!event.repeat){
  nextBombRound();return;
 }
 if(wireHealth.hp===0&&(gameMode==="bomb"||event.code!=="KeyP"))return;
 if(gameMode==="bomb"&&bombState?.phase==="ended")return;
 if(event.code==="Digit5"&&!event.repeat){openDroneCameras();return;}
 if(event.code==="Digit6"&&!event.repeat){throwCarriedDrone();return;}
 if(controlMode==="drone"){
  if(event.code==="KeyX"&&!event.repeat){
   if(!isAttackerPreparation())setControlMode("player");
   return;
  }
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
 // An explicit F press picks up unclaimed/dropped defusers. No proximity auto-pickup.
 if(currentBombInteraction()&&event.code!=="KeyF"&&event.code!=="KeyX"&&
    event.code!=="KeyN")return;
 if(event.code==="KeyF"&&gameMode==="bomb"&&bombState){
  if(!event.repeat&&nearbyDefuser(bombState,activeOperator.side,player)){
   const result=pickupRoundDefuser(bombState,activeOperator.side,player);
   if(result.ok){
    bombState=result.state;bombView.update(bombState);syncRoundUI();
    keys.delete("KeyF");
    shotNotice.textContent=result.reason;shotNoticeLeft=1.8;return;
   }
  }
  if(roundObjectiveInteract()){keys.add("KeyF");return;}
 }
 if(event.code==="KeyF"){
  if(c4PickupKeyConsumed||softBreachPickupKeyConsumed||hardBreachPickupKeyConsumed||claymorePickupKeyConsumed||observationPickupKeyConsumed||proximityPickupKeyConsumed||shieldPickupKeyConsumed)return;
  if(!event.repeat&&tryPickupCurrentShield()){
   shieldPickupKeyConsumed=true;return;
  }
  if(!event.repeat&&tryPickupCurrentProximity()){
   proximityPickupKeyConsumed=true;return;
  }
  if(!event.repeat&&tryPickupCurrentObservationBlocker()){
   observationPickupKeyConsumed=true;
   return;
  }
  if(!event.repeat&&tryPickupCurrentClaymore()){
   claymorePickupKeyConsumed=true;
   return;
  }
  if(!event.repeat&&tryPickupCurrentHardBreach()){
   hardBreachPickupKeyConsumed=true;
   return;
  }
  if(!event.repeat&&tryPickupCurrentSoftBreach()){
   softBreachPickupKeyConsumed=true;
   return;
  }
  if(!event.repeat&&tryPickupCurrentNitro()){
   c4PickupKeyConsumed=true;
   return;
  }
 }
 if(event.code==="Space"&&!event.repeat&&!breachVault&&!shieldVault){
  const result=beginShieldVault(player,shieldState,activeDroneObstacles());
  if(result.vault){
   shieldVault=result.vault;keys.delete("Space");
   shotNotice.textContent="DEPLOYABLE SHIELD VAULT · CROSSING COVER";
   shotNoticeLeft=1.4;return;
  }
 }
 if(event.code==="Space"&&!event.repeat&&!breachVault&&!shieldVault){
  // Select the nearest ACTUAL opening. First charge's hole must never
  // steal Space from a second one on the same reinforced wall.
  const openings=reinforcement.installed?
   reinforcementBreaches(reinforcement.state):lastHardBreachOpenings;
  const closest=openings.slice().sort((a,b)=>
   Math.abs((a.left+a.right)/2-player.x)-
   Math.abs((b.left+b.right)/2-player.x));
  let result={vault:null};
  for(const opening of closest){
   const candidate=beginBreachVault(player,opening,activeDroneObstacles());
   if(candidate.vault){result=candidate;break;}
  }
  if(result.vault){
   breachVault=result.vault;
   keys.delete("Space"); // Vault takes priority over ordinary jump.
   shotNotice.textContent="HARD BREACH VAULT · CROSSING THE OPENING";
   shotNoticeLeft=1.25;
   return;
  }
 }
 if(event.code==="KeyV"&&!event.repeat){
  strikeMelee(performance.now());return;
 }
 if(event.code==="KeyG"&&!event.repeat){
  // Hold for trajectory; release to throw. Nonthrowables activate on press.
  startGadgetInput("KeyG");
  return;
 }
 if(event.code==="KeyP"&&!event.repeat&&gameMode==="bomb"){
  shotNotice.textContent="BOMB ROUND · NO MID-ROUND RESPAWN · N AFTER ROUND ENDS";
  shotNoticeLeft=1.6;return;
 }
 if(event.code==="KeyP"&&!event.repeat){
   breachVault=null;shieldVault=null;player=gameMode==="bomb"?roundSpawn():initialPlayer();wireHealth=newWireHealth();wireSoundTracker=newWireSoundTracker();flashEffect=newFlashEffect();cameraEye=1.65;proneToggle=false;leanTarget=0;leanAmount=0;footstepTracker=newFootstepTracker();hint.textContent="POSITION / HEALTH RESET · DEPLOYED WIRE REMAINS.";
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
 if(event.code==="KeyY"&&!event.repeat&&mapMode!=="house"&&canUseReinforcement(activeOperator)){
   const result=reinforcement.remove(player);
   shotNotice.textContent=result.reason;
   shotNoticeLeft=1.4;
 }
 if(event.code==="KeyT"&&!event.repeat&&mapMode!=="house"){
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
document.addEventListener("keyup",event=>{
 keys.delete(event.code);
 if(event.code==="KeyF"){c4PickupKeyConsumed=false;softBreachPickupKeyConsumed=false;hardBreachPickupKeyConsumed=false;claymorePickupKeyConsumed=false;observationPickupKeyConsumed=false;proximityPickupKeyConsumed=false;shieldPickupKeyConsumed=false;}
 if(event.code==="KeyG")releaseGadgetInput("KeyG");
});
document.addEventListener("mousedown",event=>{
 if(!locked)return;
 if(event.button===1){
  // Middle-click must never fire, throw attacker drones or open browser
  // autoscroll. Camera control uses its own mode, not operator gadgets.
  event.preventDefault();
  if(controlMode==="player"&&wireHealth.hp>0){
   startGadgetInput("MouseMiddle");
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
 if(event.button===1){event.preventDefault();releaseGadgetInput("MouseMiddle");}
});
canvas.addEventListener("contextmenu",event=>event.preventDefault());
canvas.addEventListener("auxclick",event=>{
 // Middle-click inside the locked game must not start autoscroll/new tabs.
 if(locked&&event.button===1)event.preventDefault();
});
window.addEventListener("blur",()=>{cancelHeldThrow();keys.clear();c4PickupKeyConsumed=false;softBreachPickupKeyConsumed=false;hardBreachPickupKeyConsumed=false;claymorePickupKeyConsumed=false;observationPickupKeyConsumed=false;proximityPickupKeyConsumed=false;shieldPickupKeyConsumed=false;firing=false;aimHeld=false;reloadPressed=false;barricadeBuildTime=0;droneJumpPressed=false;droneBoostPressed=false;reinforcement.step({player,holding:false,dt:0});footstepTracker=newFootstepTracker();});
function hudFrame(){
 if(controlMode==="drone"){droneHudFrame();return;}
 // Siege-like HUD visuals use the live game state. No invented multiplayer data.
 positionText.textContent=player.x.toFixed(1)+" / "+player.z.toFixed(1);
 speedText.textContent=player.speed.toFixed(1)+" M/S";
 groundText.textContent=player.grounded?"STABLE":"AIRBORNE";
 modeText.textContent=player.vaulting?"VAULT":player.prone?"PRONE":player.crouched?"CROUCH":player.sprinting?"SPRINT":"STAND";
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
 roundClock.textContent=onlineSession?.active?onlineSession.timeLabel():
   gameMode==="bomb"&&bombState?drillClock(bombState.time):
   drillClock(DRILL_LENGTH_SECONDS-drillElapsedSeconds);
 if(onlineSession?.active)sandboxObjective.textContent="CONNECTED · "+onlineSession.phase.toUpperCase()+" · ORIGINAL HOUSE";
 syncRoundUI();
 areaLabel.textContent=mapMode==="house"?houseRoomAt(player):areaName(player.x,player.z);
 const heading=compassHeading(player.yaw);
 headingLabel.textContent=String(heading).padStart(3,"0")+"°";
 compassArrow.style.transform="translate(-50%,-82%) rotate("+heading+"deg)";
 fpsLabel.textContent=String(Math.max(0,Math.round(fpsSmoothed)));
 if(mapMode==="house")drawHouseMinimap(tacticalMapCtx,player);
 else drawTrainingMap(tacticalMapCtx,player,TEST_OBSTACLES,targets,BARRICADE,SOFT_WALL);
 if(gameMode==="bomb")drawBombRoundMinimap(tacticalMapCtx,bombState);
 softWallReadout.classList.toggle("hidden",mapMode==="house"||!softWall.near(player));
 softWallStatusText.textContent=softWall.status;
 softWallRemoved.textContent=String(softWall.removed);
 const reinfNearby=mapMode!=="house"&&canUseReinforcement(activeOperator)&&reinforcement.near(player);
 reinforcePrompt.classList.toggle("hidden",!reinfNearby);
 reinforceStatus.textContent=reinforcement.status;
 reinforceAction.textContent=reinforcement.installed?
  "PRESS Y TO REMOVE METAL (TEST MODE)": "HOLD F FOR 3.0 S · STAND STILL";
 reinforceFill.style.width=(reinforcement.progress*100).toFixed(1)+"%";
 softWallReadout.dataset.reinforced=reinforcement.installed?"true":"false";
 barricadeStatusText.textContent=barricade.status;
 barricadeCount.textContent=barricade.remaining+" / "+BARRICADE.boardCount;
 const near=mapMode!=="house"&&barricade.near(player);
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
 const active=visibleRangeTargets();
 const intersections=combatIntersections(aimRaycaster,
  [...shootableSolids,...barricade.shootables(),...softWall.shootables(),...reinforcement.shootables(),...shootableObservationBlockers(),...shootableProximityAlarms(),...shootableShields(),...bombRaycastColliders()],active.map(t=>t.group));
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
 if(outcome.hit?.object?.userData?.bombSiteId){
  lastShotReadout="BOMB "+outcome.hit.object.userData.bombSiteId+" · SOLID METAL HOUSING";return;
 }
 if(outcome.hit?.object?.userData?.deployableShieldBallistic){
  lastShotReadout="DEPLOYABLE SHIELD · BULLET BLOCKED INCLUDING VIEWING WINDOW";
  return;
 }
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
 const activeTargets=visibleRangeTargets();
 const intersections=combatIntersections(raycaster,
  [...shootableSolids,...barricade.shootables(),...softWall.shootables(),...reinforcement.shootables(),...shootableObservationBlockers(),...shootableProximityAlarms(),...shootableShields(),...shootableDrones(),...remoteOperators.shootables(),...bombRaycastColliders()],activeTargets.map(t=>t.group));
 const outcome=firstHitType(intersections,activeTargets);
 if(onlineSession?.active){
   const targetId=outcome.hit?.object?.userData?.onlinePlayerId||null;
   onlineSession.send({type:"shot",targetId});
 }
 // Plank marks are child meshes; global wall decals would float after breakage.
 // Firearms never invoke wire damage; the wire is a melee-only device.
 const droneIndex=outcome.hit?.object?.userData?.reconDroneIndex;
 const droneHit=Number.isInteger(droneIndex)&&destroyPhysicalDrone(droneIndex);
 const bombHit=Boolean(outcome.hit?.object?.userData?.bombSiteId);
 const shieldHit=Number.isInteger(outcome.hit?.object?.userData?.deployableShieldId);
 const proxId=outcome.hit?.object?.userData?.proximityAlarmId;
 const proxHit=Number.isInteger(proxId)?hitProximityAlarm(proxId,1):{handled:false};
 const obsId=outcome.hit?.object?.userData?.observationBlockerId;
  const obsHit=Number.isInteger(obsId)&&!proxHit.handled?hitObservationBlocker(obsId,1):{handled:false};
  const woodHit=outcome.hit&&!obsHit.handled&&!proxHit.handled?
   barricade.hitBoard(outcome.hit):{handled:false};
 const metalHit=outcome.hit&&!obsHit.handled&&!proxHit.handled?reinforcement.steelImpact(outcome.hit):false;
 const plasterHit=outcome.hit&&!metalHit&&!obsHit.handled&&!proxHit.handled?softWall.onHit(outcome.hit):{handled:false};
 if(outcome.hit&&!outcome.hit.object?.userData?.onlinePlayerId&&!droneHit&&!woodHit.handled&&!plasterHit.handled&&!metalHit&&!obsHit.handled&&!proxHit.handled&&!shieldHit&&!bombHit)
   shotEffects.mark(outcome.hit,outcome.kind==="target");
 markDebugShot(outcome,screen);
 if(droneHit){
  shotNotice.textContent="ATTACKER DRONE DESTROYED · CAMERA OFFLINE";
  shotNoticeLeft=1.5;
 }else if(bombHit){
  shotNotice.textContent="BOMB SITE DEVICE · SOLID METAL CASING BLOCKED SHOT";
  shotNoticeLeft=.9;shotAudio.play("impact");
 }else if(shieldHit){
   shotNotice.textContent="BULLETPROOF SHIELD BLOCKED ROUND · WINDOWS ARE BULLETPROOF";
   shotNoticeLeft=1.15;shotAudio.play("impact");
  }else if(proxHit.handled){
   shotNotice.textContent=proxHit.destroyed?
    "PROXIMITY ALARM DESTROYED · SILENCED":
    "PROXIMITY ALARM HIT · FIRE AGAIN";
   shotNoticeLeft=1.3;
  }else if(obsHit.handled){
   shotNotice.textContent=obsHit.destroyed?
    "OBSERVATION BLOCKER DESTROYED · PROJECTION ENDED":
    "OBSERVATION BLOCKER HIT · SHOOT AGAIN";
   shotNoticeLeft=1.2;
  }else if(woodHit.handled){
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
 const preKickPitch=player.pitch;
 player.pitch=Math.min(1.48,Math.max(-1.48,player.pitch+shot.kick.vertical));
 player.yaw+=shot.kick.horizontal;
 recoilRecovery=recordRecoilKick(recoilRecovery,preKickPitch,player.pitch);
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
   advanceBombMode(dt);
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
    drone=tickDrone(drone,{...input,floorAt:mapMode==="house"?houseFloorAt:null},
     dt,activeDroneObstacles());
   droneRoster=updateDrone(droneRoster,droneRoster.selected,drone);
 }
 if(locked&&controlMode==="player"){
   // Actual thrown remote charges remain as movable THREE objects in range.
   nitroState=tickNitro(nitroState,dt,activeDroneObstacles());
   for(const device of nitroState.devices){
    if(device.armed)nitroViews.get(device.id)?.sync(device);
   }
   // Timed attacker grenades use the same destructible blast API; they can
   // bounce off a wall or the floor before their fuse expires.
   const fragTick=tickFrag(fragState,dt,activeDroneObstacles());
   fragState=fragTick.state;
   for(const device of fragState.devices){
    const view=fragViews.get(device.id);
    if(view){
     view.sync(device);
     if(!device.armed)fragViews.delete(device.id);
    }
   }
   for(const blast of fragTick.blasts){
    shotNotice.textContent=applyGadgetBlast(blast,"FRAG");
    shotNoticeLeft=1.7;
   }
   // Persistent defender sensors listen only for ATTACKING intruders. The
   // attacker player can switch sides in solo testing; target dummies are
   // attack silhouettes only while defender mode is selected.
   const proxEnemies=[
    ...(activeOperator.side==="attack"&&wireHealth.hp>0?
     [{id:"striker-player",x:player.x,y:player.y,z:player.z,
       side:"attack",alive:true}]:[]),
    ...(activeOperator.side==="defend"?visibleRangeTargets().map(t=>({
     id:t.id,x:t.group.position.x,y:0,z:t.group.position.z,
     side:"attack",alive:true})):[])
   ];
   const proxTick=tickProximity(proximityState,dt,proxEnemies,activeDroneObstacles());
   proximityState=proxTick.state;
   for(const [id,view] of proximityViews){
    const d=proximityState.devices.find(item=>item.id===id&&item.hp>0);
    if(d)view.sync(d,controlMode,activeOperator.side);
    else{view.dispose();proximityViews.delete(id);}
   }
   for(const alarm of proxTick.alerts){
    shotAudio.playAt("proximity",alarm.x,alarm.z,player.x,player.z,player.yaw);
    shotNotice.textContent="PROXIMITY ALARM · INTRUDER DETECTED · "+alarm.enemyId.toUpperCase();
    shotNoticeLeft=1.5;
   }
   // Claymores stay in the range across side changes: live defender Sentry
   // movement and the practice dummy targets are valid ENEMY sensors.
   // Striker cannot trip their own claymore. Walls clip laser sensing.
   const claymoreEnemies=[
    ...(activeOperator.side==="defend"&&wireHealth.hp>0?
     [{id:"sentry-player",x:player.x,y:player.y,z:player.z,
       side:"defend",alive:true}]:[]),
    ...visibleRangeTargets().map(t=>({
     id:t.id,x:t.group.position.x,y:0,z:t.group.position.z,
     side:"defend",alive:true}))
   ];
   const clayTick=tickClaymores(claymoreState,dt,claymoreEnemies,activeDroneObstacles());
   claymoreState=clayTick.state;
   for(const [id,view] of claymoreViews){
    const d=claymoreState.devices.find(item=>item.id===id&&item.armed);
    if(d)view.sync(d,claymoreLaserEndpoints(d,activeDroneObstacles()));
    else{view.dispose();claymoreViews.delete(id);}
   }
   for(const blast of clayTick.blasts){
    shotNotice.textContent=applyGadgetBlast(blast,"CLAYMORE")+
     " · TRIPPED BY "+String(blast.trigger).toUpperCase();
    shotNoticeLeft=2;
    refreshUtilityHud();
   }
   // Hard breaches attach to reinforced steel or gypsum, then their armed
   // countdown detonates after 1.1s. Physics and shooter colliders update
   // with steel cutout fragments, not a whole-panel disappearance.
   const hardTick=tickHardBreach(hardBreachState,dt);
   hardBreachState=hardTick.state;
   for(const [id,view] of hardBreachViews){
    const d=hardBreachState.devices.find(x=>x.id===id&&x.armed);
    if(d)view.sync(d);
    else{view.dispose();hardBreachViews.delete(id);}
   }
   for(const blast of hardTick.blasts){
    shotNotice.textContent=detonateCurrentHardBreach(blast);
    shotNoticeLeft=2;
    refreshUtilityHud();
   }
   // Soft breaches are attached devices, not throwables. The 0.9-second
   // planting animation completes before the same gadget key can detonate.
   softBreachState=tickSoftBreach(softBreachState,dt);
   for(const [id,view] of softBreachViews){
    const d=softBreachState.devices.find(item=>item.id===id&&item.armed);
    if(d)view.sync(d);
    else{view.dispose();softBreachViews.delete(id);}
   }
   // Flash grenades are thrown physical objects: one non-damaging burst at
   // fuse expiry. The exposed camera depends on facing, range, and solid cover.
   const flashTick=tickFlash(flashState,dt,activeDroneObstacles());
   flashState=flashTick.state;
   for(const device of flashState.devices){
    const view=flashViews.get(device.id);
    if(view){
     view.sync(device);
     if(!device.armed)flashViews.delete(device.id);
    }
   }
   for(const burst of flashTick.bursts){
    blastViews.push(createFlashBurst(THREE,scene,burst));
    shotAudio.playAt("gadget-flash",burst.x,burst.z,player.x,player.z,player.yaw);
    const exposure=flashExposure(burst,{...player,eyeHeight:cameraEye},activeDroneObstacles());
    flashEffect=applyFlashEffect(flashEffect,exposure);
    shotNotice.textContent=exposure.intensity>.05?
     "FLASHED · TEMPORARY VISION IMPAIRMENT":
     "FLASH DETONATED · LOOK AWAY OR USE COVER";
    shotNoticeLeft=1.7;
   }
   // Non-damaging smoke canisters bounce with gravity, then bloom into
   // persistent cloud geometry. The dense core occludes objects behind it
   // while player movement, gunfire, and wall collisions remain unchanged.
   const smokeTick=tickSmoke(smokeState,dt,activeDroneObstacles());
   smokeState=smokeTick.state;
   const liveSmokeIds=new Set(smokeState.devices.map(d=>d.id));
   for(const [id,view] of smokeViews){
    const d=smokeState.devices.find(item=>item.id===id);
    view.sync(d||null);
    if(!liveSmokeIds.has(id))smokeViews.delete(id);
   }
   for(const cloud of smokeTick.spawned){
    smokeCloudViews.set(cloud.id,createSmokeCloudView(THREE,scene,cloud));
    shotAudio.playAt("smoke-trigger",cloud.x,cloud.z,player.x,player.z,player.yaw);
    shotNotice.textContent="SMOKE DEPLOYED · THICK VISION COVER";
    shotNoticeLeft=1.7;
   }
   const activeCloudIds=new Set(smokeState.clouds.map(c=>c.id));
   for(const cloud of smokeState.clouds)smokeCloudViews.get(cloud.id)?.sync(cloud,now/1000);
   for(const [id,view] of smokeCloudViews){
    if(!activeCloudIds.has(id)){view.dispose();smokeCloudViews.delete(id);}
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
      const parked=tickDrone(droneRoster.drones[i],
       {floorAt:mapMode==="house"?houseFloorAt:null},dt,activeDroneObstacles());
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
   const bombWorking=currentBombInteraction();
   // Vaulting is a special collision-checked crouched movement over the sill.
   if(wireHealth.hp>0){
    const obstacles=activeDroneObstacles();
    if(bombWorking){
     // Freeze horizontal movement through placement/opening/typing.
     // The case is world-anchored on the floor as the camera kneels.
     player={...player,moving:false,sprinting:false,prone:false,
      crouched:true,speed:0,vy:0,grounded:true};
    }else if(shieldVault){
     const next=stepShieldVault(player,shieldVault,dt,obstacles);
     player=next.player;shieldVault=next.vault;
     if(next.event==="landed"||next.event==="blocked"){
      shotNotice.textContent=next.event==="landed"?
       "SHIELD VAULT COMPLETE":"SHIELD VAULT BLOCKED · COLLISION";
      shotNoticeLeft=1.4;
     }
    }else if(breachVault){
     const next=stepBreachVault(player,breachVault,dt,obstacles);
     player=next.player;breachVault=next.vault;
     if(next.event==="landed"||next.event==="blocked"){
      shotNotice.textContent=next.event==="landed"?
       "HARD BREACH VAULT COMPLETE":"VAULT BLOCKED · COLLISION";
      shotNoticeLeft=1.4;
     }
    }else if(!(onlineSession?.active&&onlineSession.phase==="prep"&&activeOperator.side==="attack")&&!(gameMode==="bomb"&&bombState&&
    (bombState.phase==="ended"||
     (bombState.phase==="prep"&&activeOperator.side==="attack"))))
     player=stepPlayer(player,input,dt,obstacles,
      mapMode==="house"?houseFloorAt:null);
    if(onlineSession?.active)onlineSession.sendMovement(player,now,aimHeld,leanTarget);
   }
   const nextHealth=tickWireHealth(wireHealth,wireState,player,activeOperator.side,dt);
   if(nextHealth.damage>0){
    shotNotice.textContent=nextHealth.hp===0?
     "ELIMINATED BY ENEMY BARBED WIRE · PRESS P TO RESPAWN":
     "ENEMY BARBED WIRE · -"+nextHealth.damage+" HP";
    shotNoticeLeft=nextHealth.hp===0?5:1;
    if(nextHealth.hp===0){breachVault=null;shieldVault=null;firing=false;aimHeld=false;keys.clear();}
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
   if(wireHealth.hp>0&&mapMode!=="house"&&!roundObjectiveInteract()&&keys.has("KeyF")&&barricade.near(player)&&
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
    player,holding:wireHealth.hp>0&&mapMode!=="house"&&!roundObjectiveInteract()&&canUseReinforcement(activeOperator)&&keys.has("KeyF"),dt,
    moving:player.moving,sprinting:player.sprinting
   });
   if(reinforceStep.event==="installed"){
    shotNotice.textContent="REINFORCEMENT COMPLETE · STEEL BULLETPROOF";
    shotNoticeLeft=1.75;
   }
   weapons.tick(now);
   if(reloadPressed){
    if(weapons.reload(now)){
     if(onlineSession?.active)onlineSession.send({type:"reload"});
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
 if(!locked||controlMode!=="player")
  bombInteractionView.update(null,0,dt);
 // Drop the camera immediately for low cover; smoothly raise when clearance allows.
 if(controlMode==="drone"){
  // A destroyed prep camera cannot expose a playable attacker viewpoint.
  if(drone){
   camera.position.set(drone.x,drone.y+DRONE.eye,drone.z);
   camera.rotation.set(drone.pitch,drone.yaw,0,"YXZ");
  }else camera.position.set(0,-1000,0);
  if(camera.fov!==87){camera.fov=87;camera.updateProjectionMatrix();}
 }else{
   const bombPose=interactionCameraLock();
   const eyeTarget=bombPose?1.02:
   player.prone?.44:player.crouched?1.08:1.65;
  cameraEye+=(eyeTarget-cameraEye)*Math.min(1,dt*12);
   if(bombPose){
    camera.position.set(player.x,player.y+cameraEye,player.z);
    camera.rotation.set(bombPose.pitch,bombPose.yaw,0,"YXZ");
   }else{
    const leanPose=leanCameraPose(player.yaw,leanAmount);
    camera.position.set(player.x+leanPose.dx,player.y+cameraEye,player.z+leanPose.dz);
    camera.rotation.set(player.pitch,player.yaw,leanPose.roll,"YXZ");
   }
 }
 camera.updateMatrixWorld(true);
 if(locked&&controlMode==="player"){
  meleeView.update(dt);
  const bombTyping=currentBombInteraction();
  const bombProgress=bombTyping==="plant"?
   bombState.plantProgress/BOMB_RULES.plantSeconds:
   bombTyping==="disable"?bombState.disableProgress/BOMB_RULES.disableSeconds:0;
  const bombDevicePose=bombTyping==="plant"?plantDefuserPosition(player):
   bombTyping==="disable"?{x:bombState.defuser.x,z:bombState.defuser.z,
    yaw:player.yaw}:null;
  bombInteractionView.update(bombTyping,bombProgress,dt,bombDevicePose);
  // Defender's tablet is handheld; leave the original planted bomb on the
  // floor and let its one recording own the beeping throughout the override.
  weaponView.root.visible=!meleeView.active&&!bombTyping;
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
   held:firing&&!meleeView.active&&wireHealth.hp>0&&
    !(gameMode==="bomb"&&bombState?.phase==="ended"),adsAligned:aligned,
    canFire:!player.sprinting&&!meleeView.active&&!bombTyping&&wireHealth.hp>0&&
    !(gameMode==="bomb"&&bombState?.phase==="prep"&&activeOperator.side==="attack")&&
    !(gameMode==="bomb"&&bombState?.phase==="ended")
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
 remoteOperators.tick(dt);
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
 updateHeldThrowPreview(now);
 if(locked&&controlMode==="player")flashEffect=stepFlashEffect(flashEffect,dt);
 flashOverlay.style.opacity=String(locked&&controlMode==="player"?flashOpacity(flashEffect):0);
 smokeFog.style.opacity=String(locked&&controlMode==="player"?
  smokeCameraDensity(smokeState.clouds,{x:camera.position.x,y:camera.position.y,z:camera.position.z}):0);
 shotNoticeLeft=Math.max(0,shotNoticeLeft-dt);
 shotNotice.classList.toggle("hidden",shotNoticeLeft<=0);
 crosshair.classList.toggle("hidden",!locked||controlMode!=="player"||!aimState(aimHeld,aimMix).hipCrosshairVisible);
 renderer.render(scene,camera);
 if(locked&&now-lastHud>110){hudFrame();lastHud=now;}
}
requestAnimationFrame(animate);
console.info("BLACKOUT V0.28.0 auto prep drone, elevated drone landing, live-action operator spawn",FOUNDATION_VERSION,
  "offline weapon testing; old game runtime not loaded");
