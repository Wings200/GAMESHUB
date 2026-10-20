import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import {buildRange} from "./src/world.js?v=blackout-v800-ironvale-online";
import {FirstPersonController} from "./src/player.js?v=blackout-v520-switchyard";
import {Weapons} from "./src/weapons.js?v=blackout-v401-competitive-ui";
import {Gadgets} from "./src/gadgets.js?v=blackout-v532-interactive-walls";
import {createWeaponOptics} from "./src/weapon-optics.js?v=blackout-v330-advanced-ordnance";
import {OPERATORS,operatorsForSide,defaultOperator} from "./src/operators.js?v=blackout-v330-advanced-ordnance";
import {ObjectiveDrill} from "./src/objective.js?v=blackout-v800-ironvale-online";
import {GameAudio} from "./src/audio.js?v=blackout-v401-competitive-ui";
import {initCompetitiveUI,playTacticalPhaseAnnouncement,stopTacticalNarration,resetTacticalCue} from "./src/competitive-ui.js?v=blackout-v402-competitive-ui";
import {createWeaponView} from "./src/weapon-view.js?v=blackout-v401-competitive-ui";
import {Barricades} from "./src/barricades.js?v=blackout-v603-approved-clubhouse";
import {createReconDrone} from "./src/drone.js?v=blackout-v520-switchyard";
import {attackSpawnFor} from "./src/spawn-rules.js?v=blackout-v420-ai-rotations";
import {ClubhouseRappel} from "./src/rappel.js?v=blackout-v800-ironvale-online";
import {playerDefenderInsertion,targetFloor} from "./src/round-spawns.js?v=blackout-v700-site-floors";
import {TacticalSeries,attackInsertionProtected} from "./src/match-flow.js?v=blackout-v710-round-match";
import {BlackoutNetworkClient} from "./src/network-client.js?v=blackout-v801-online-beta";

// BLACKOUT V0.2 - offline mechanics lab. No network/REDLINE dependencies.
const $=id=>document.getElementById(id);
const canvas=$("view"),menu=$("menu"),hud=$("gameHUD"),start=$("start"),reset=$("reset");
const status=$("status"),zoneLabel=$("zoneLabel"),objective=$("objective");
const squadStatus=$("squadStatus");
const stateReadout=$("stateReadout"),fpsReadout=$("fpsReadout"),debugPanel=$("debugPanel");
const positionReadout=$("positionReadout"),toast=$("toast"),hitmark=$("hitmark");
const weaponName=$("weaponName"),ammoCount=$("ammoCount"),reserveCount=$("reserveCount");
const combatStats=$("combatStats"),gadgetPrimary=$("gadgetPrimary"),gadgetSecondary=$("gadgetSecondary");
const gadgetInteract=$("gadgetInteract"),hudRole=$("hudRole"),selectedMode=$("selectedMode");
const rangeInfo=$("rangeInfo"),mouseSlider=$("mouseSlider"),mouseValue=$("mouseValue");
const operatorSelect=$("operatorSelect"),operatorDetails=$("operatorDetails");
const siteSelect=$("siteSelect"),roundScore=$("roundScore");
const operatorCards=$("operatorCards"),operatorPreviewName=$("operatorPreviewName");
const operatorPreviewDescription=$("operatorPreviewDescription"),operatorPreviewPerk=$("operatorPreviewPerk");
const operatorPreviewIcon=$("operatorPreviewIcon"),operatorSpeed=$("operatorSpeed");
const operatorArmor=$("operatorArmor"),operatorKit=$("operatorKit");
const matchClock=$("matchClock"),matchScore=$("matchScore"),phaseText=$("phaseText");
const friendlySlots=$("friendlySlots"),enemySlots=$("enemySlots");
const phaseAnnounce=$("phaseAnnounce"),phaseAnnounceTitle=$("phaseAnnounceTitle");
const phaseAnnounceHelp=$("phaseAnnounceHelp"),phaseAnnounceEyebrow=$("phaseAnnounceEyebrow");
const bombArrow=$("bombArrow"),bombRange=$("bombRange"),bombGuide=$("bombGuide");
const runoutAlert=$("runoutAlert"),runoutAlertTitle=$("runoutAlertTitle");
const runoutAlertInfo=$("runoutAlertInfo"),spectatorAlert=$("spectatorAlert");
const healthFill=$("healthFill"),matchCaption=$("matchCaption"),defuserInventory=$("defuserInventory");
const spawnSelect=$("spawnSelect"),droneOverlay=$("droneOverlay"),droneSignal=$("droneSignal");
const mapSelect=$("mapSelect"),sitePairSelect=$("sitePairSelect"),
  mapLabel=$("boSelectedMapLabel");
const teamPopulation=$("teamPopulation");
const attackAlive=$("attackAlive"),defendAlive=$("defendAlive");
const operatorHud=$("operatorHud"),healthHud=$("healthHud");
const objectiveHint=$("objectiveHint"),objectiveProgress=$("objectiveProgress");
const objectiveAction=$("objectiveAction"),objectiveFill=$("objectiveFill"),roundResult=$("roundResult");
const intermission=$("matchIntermission"),intermissionTitle=$("matchIntermissionTitle");
const intermissionScore=$("matchIntermissionScore"),intermissionGuide=$("matchIntermissionGuide");
const intermissionRounds=$("matchIntermissionRounds");
const attackButton=$("attackRole"),defendButton=$("defendRole"),guide=$("guide");
const sightSelect=$("sightSelect"),reticle=$("reticle");
const primaryWeaponSelect=$("primaryWeaponSelect"),secondaryWeaponSelect=$("secondaryWeaponSelect");
const secondarySelect=$("secondarySelect"),flashOverlay=$("flashOverlay");
const reinforceBar=$("reinforceBar"),reinforceFill=$("reinforceFill");
const reinforceCountdown=$("reinforceCountdown"),reinforceTitle=$("reinforceTitle");
const reinforceHint=$("reinforceHint");
const onlineName=$("boOnlineName"),onlineCode=$("boOnlineCode");
const onlineStatus=$("boOnlineStatus"),onlineRoster=$("boOnlineRoster");
const createRoom=$("boCreateRoom"),joinRoom=$("boJoinRoom");
const leaveRoom=$("boLeaveRoom"),startRoom=$("boStartRoom");
const SIGHTS=["holo-a","holo-b","red-dot","iron"];
const SIGHT_NAMES={"holo-a":"HOLO A","holo-b":"HOLO B","red-dot":"RED DOT","iron":"IRON"};
let sight="holo-a";
let role="attacker";
const matchSeries=new TacticalSeries("attacker");
let operator=defaultOperator(role);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.23;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(80,1,.045,360);scene.add(camera);
// Load the EXACT approved export committed under /maps; the existing
// offline lab remains usable even if the authored-map asset fails to load.
let clubhouseBlueprint=null;
try{
  const res=await fetch("./maps/consolate-clubhouse.blackout-map.json?v=approved-v6");
  if(!res.ok)throw Error("HTTP "+res.status);
  const data=await res.json();
  if(data.format!=="blackout-editor-v1"||data.elements?.length!==178)
    throw Error("Approved map signature mismatch");
  clubhouseBlueprint=data;
}catch(error){console.error("BLACKOUT CLUBHOUSE map unavailable",error);}
let ironvaleBlueprint=null;
try{
  const res=await fetch("./maps/ironvale-operations.blackout-map.json?v=ironvale-beta-1");
  if(!res.ok)throw Error("HTTP "+res.status);
  const map=await res.json();
  if(map.format!=="blackout-editor-v1"||map.elements?.length!==549)
    throw Error("IRONVALE map content signature mismatch");
  ironvaleBlueprint=map;
}catch(error){console.error("BLACKOUT IRONVALE map unavailable",error);}
const world=buildRange(THREE,scene,clubhouseBlueprint,ironvaleBlueprint);
const player=new FirstPersonController(THREE,world,camera);
const weapons=new Weapons();
const gadgets=new Gadgets(THREE,world,scene);
world.gadgets=gadgets; // AI prep and reactive abilities use the same deployed objects
const barricades=new Barricades(THREE,world,scene,world.facility.openings);
world.barricades=barricades;
const objectiveRound=new ObjectiveDrill(THREE,world,scene);
world.round=objectiveRound; // determines ownership when gadget AoE is simulated
const drone=createReconDrone(THREE,scene,world,camera);
const rappel=new ClubhouseRappel(world,player,barricades);
const network=new BlackoutNetworkClient(THREE,scene,
  message=>{onlineStatus.textContent=message;status.textContent=message},
  message=>{
    if(message.type==="disconnect"){
      onlineRefresh();return;
    }
    if(message.type==="welcome"){
      if(world.mapId!=="ironvale")applyMap("ironvale");
      if(role!==network.me?.side)setRole(network.me.side);
      onlineCode.value=network.code;
    }
    if(message.type==="state"&&message.event==="round-end"){
      const line=message.winner===role?"YOUR TEAM WON":"YOUR TEAM LOST";
      popup("ONLINE ROUND "+(message.round||network.round)+" · "+
        (message.winner==="draw"?"DRAW":line)+" · ESC FOR LOBBY",4);
      onlineStatus.textContent=(message.message||"ROUND ENDED")+
        " · HOST MAY START ANOTHER ROUND";
    }
    if(message.type==="state"&&message.event==="round-start"){
      // Server owns insertion, sides, HP and the presence of other people.
      if(role!==network.me?.side)setRole(network.me.side);
      objectiveRound.reset(role);objectiveRound.phase=role==="attacker"?"attack":"guard";
      objectiveRound.actionStartedAt=clock();
      world.spawn.x=network.me.x;world.spawn.y=network.me.y;
      world.spawn.z=network.me.z;world.spawn.yaw=network.me.yaw||0;
      player.setOperator(operator);player.reset();weapons.reset();roundFrozen=false;
      drone.reset();rappel.reset();keys.clear();
      popup("ONLINE ROUND LIVE · "+network.players.length+" REAL PLAYERS",3);
    }
    if(message.type==="correction"&&network.active){
      player.x=message.x;player.y=message.y;player.z=message.z;player.applyCamera();
    }
    if(message.type==="state"&&network.me){
      player.health=Math.min(player.maxHealth,network.me.health);
    }
    if(message.type==="state"&&message.event==="hit"){
      if(message.to===network.id)popup("YOU TOOK LIVE SERVER DAMAGE",1.3);
    }
    if(message.type==="state"&&message.event==="shot"&&message.from!==network.id)
      sound("enemy-fire");
    onlineRefresh();
  });
function onlineRefresh(){
  const connected=network.connected;
  leaveRoom.disabled=!connected;
  startRoom.disabled=!connected||!network.host||
    !["lobby","intermission"].includes(network.mode);
  createRoom.disabled=connected;joinRoom.disabled=connected;
  attackButton.disabled=connected;defendButton.disabled=connected;
  mapSelect.disabled=connected;
  // A host-led live room owns its map and round. Disable local-only resets.
  sitePairSelect.disabled=connected||world.mapId==="lab";
  siteSelect.disabled=connected;spawnSelect.disabled=connected;
  reset.disabled=connected;
  operatorSelect.disabled=connected&&network.mode!=="lobby";
  for(const card of operatorCards.querySelectorAll("button[data-operator]"))
    card.disabled=connected&&network.mode!=="lobby";
  if(connected){
    onlineStatus.textContent="ROOM "+network.code+" · "+
      (network.mode==="active"?"LIVE PVP":
       network.mode==="intermission"?
         "ROUND COMPLETE · "+(network.winner||"draw").toUpperCase()+" WON · HOST CAN START NEXT":
         "LOBBY / WAITING")+
      " · "+network.players.length+"/10 REAL PLAYERS"+
      (network.host?" · YOU ARE HOST":"");
  }
  onlineRoster.replaceChildren();
  for(const p of network.players){
    const line=document.createElement("div");
    line.className="bo-online-person "+p.side;
    line.textContent=(p.id===network.id?"YOU · ":"")+
      p.name+" · "+p.side.toUpperCase()+" · "+p.operator.toUpperCase()+
      (network.mode==="active"?" · "+p.health+" HP":"");
    onlineRoster.appendChild(line);
  }
}
world.drone=drone; // Defender AI can see, hit and destroy this physical device.
const raycaster=new THREE.Raycaster(),keys=new Set(),effects=[];
const debugRoot=new THREE.Group();scene.add(debugRoot);
let last=performance.now(),frames=0,elapsed=0,fps=0;
let locked=false,started=false,debug=false,fireHeld=false,ads=false,hitUntil=0,toastUntil=0;
let menuGuide=false,lastEmptyClick=0,aimBlend=0,muzzleUntil=0;
let gunKick=0,gunKickSide=0,lastShotAt=0,recoilRecovery=0,lastStepMark=0,lastWallToastAt=0;
let roundFrozen=false,lastEndFrame=0,lastHudAt=0,lastPhaseLabel="",phaseToastUntil=0;
let combatErrors=0,lastCombatError="",lastRuntimeReportAt=0;
let droneActionMode=false,localAttackerDeployed=true;
function restartSeries(startSide=role){
  matchSeries.reset(startSide);
  objectiveRound.roundNumber=1;
  objectiveRound.score={attacker:0,defender:0};
}
function recordRoundIfEnded(){
  if(objectiveRound.phase!=="won"&&objectiveRound.phase!=="lost")return;
  if(matchSeries.record(objectiveRound.roundNumber,objectiveRound.phase==="won",
    role,objectiveRound.result)){
    status.textContent=matchSeries.resultLine;
  }
}
function launchNextSeriesRound(){
  recordRoundIfEnded();
  if(matchSeries.finished){
    restartSeries(role);
    resetSimulation();
  }else if(matchSeries.nextRole!==role){
    // Halftime is automatic. Rebuild selection and loadout for the new side.
    const previous=role;
    setRole(matchSeries.nextRole);
    popup("HALFTIME · "+previous.toUpperCase()+" → "+role.toUpperCase(),3);
  }else resetSimulation();
  objectiveRound.start(clock());
  if(role==="attacker"){
    stageLocalAttacker();droneActionMode=false;drone.begin(clock());
  }
  roundFrozen=false;lastPhaseLabel="";phaseToastUntil=clock()+2300;
  popup("ROUND "+objectiveRound.roundNumber+" · "+
    (role==="attacker"?"DRONE RECON":"DEFENSE FORTIFICATION"),2.8);
}
function stageLocalAttacker(){
  if(role!=="attacker"||objectiveRound.phase!=="prep")return;
  // Player controller has no world-space avatar during drone preparation.
  // The camera belongs to the recon drone; don't expose an attacker's
  // location, gun, physics body or spawn to defender hit tests.
  localAttackerDeployed=false;
  player.x=500;player.z=500;player.y=0;
  player.velX=0;player.velZ=0;player.velY=0;
  fireHeld=false;ads=false;
}
function deployLocalAttacker(){
  if(role!=="attacker"||localAttackerDeployed)return;
  if(!["attack","planted"].includes(objectiveRound.phase))return;
  player.reset();localAttackerDeployed=true;
  if(!drone.active)player.applyCamera();
}
const audio=new GameAudio();
const audioStatus=$("audioStatus"),audioTest=$("audioTest");
const clock=()=>performance.now();

function resize(){
  renderer.setSize(window.innerWidth,window.innerHeight,false);
  camera.aspect=window.innerWidth/Math.max(1,window.innerHeight);camera.updateProjectionMatrix();
}
window.addEventListener("resize",resize);resize();

const gunModel=new THREE.Group();camera.add(gunModel);
const weaponView=createWeaponView(THREE,gunModel);
weaponView.setModelVariant(weapons.loadout.primary,weapons.loadout.secondary);
/* prior box-only placeholder weapon removed in V0.7 */
/*const mat=(c,metalness=.3)=>new THREE.MeshStandardMaterial({color:c,metalness,roughness:.55});
const parts=[
  [0,-.015,-.2,.16,.17,.65,0x303f4a],
  [0,-.08,-.43,.10,.10,.63,0x202c34],
  [0,-.13,-.04,.12,.25,.13,0x1a262c],
  [0,.085,-.26,.16,.07,.13,0x131f29],
  [0,.15,-.26,.042,.09,.07,0x75e6dd],
  [0,-.02,-.82,.062,.063,.29,0x697780],
  [0,-.11,.15,.21,.10,.33,0x323a48],
  [.125,.045,-.35,.045,.09,.37,0x667887]
];
for(const [x,y,z,w,h,d,color] of parts){
  const piece=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));
  piece.position.set(x,y,z);gunModel.add(piece);
}*/
const muzzle=new THREE.PointLight(0xffc377,0,5,2);muzzle.position.set(0,-.018,-1.15);
gunModel.add(muzzle);
const muzzleSprite=new THREE.Mesh(new THREE.SphereGeometry(.075,8,6),
  new THREE.MeshBasicMaterial({color:0xffdf8a,transparent:true,opacity:.9}));
muzzleSprite.position.copy(muzzle.position);gunModel.add(muzzleSprite);muzzleSprite.visible=false;
gunModel.position.set(.42,-.36,-.77);
// All four optically zeroed reticles are modeled in 3D ON the gun.
const gunOptics=createWeaponOptics(THREE,gunModel);
function setSight(value){
  sight=gunOptics.selectSight(value);
  sightSelect.value=sight;
  // No floating HTML ADS element: sight stays rigidly attached to firearm.
}
sightSelect.addEventListener("change",()=>setSight(sightSelect.value));
for(const [element,slot] of [[primaryWeaponSelect,"primary"],[secondaryWeaponSelect,"secondary"]]){
  element.addEventListener("change",()=>{
    if(!weapons.setLoadout(slot,element.value))return;
    weaponView.setModelVariant(weapons.loadout.primary,weapons.loadout.secondary);
    resetSimulation();
    status.textContent="EQUIPPED "+weapons.guns[slot].name+" · GAMEPLAY STATS UPDATED";
  });
}
setSight(sight);

function audioReady(){
  audio.unlock().then(ok=>{
    if(audioStatus)audioStatus.textContent=ok?"AUDIO ACTIVE · PROCEDURAL EFFECTS":"AUDIO BLOCKED · CHECK TAB MUTE / BROWSER";
  });
}
function sound(type="fire"){
  try{audio.play(type);}catch(err){reportCombatError("AUDIO",err);}
}
function proximityAlarm(){sound("proximity");}
function reportCombatError(source,err){
  combatErrors++;
  const message=String(err?.message||err).slice(0,180);
  lastCombatError=source+": "+message;
  if(combatErrors<=4)console.error("BLACKOUT "+source+" error:",err);
  const now=clock();
  if(now-lastRuntimeReportAt>4500){
    lastRuntimeReportAt=now;
    popup("COMBAT ERROR RECOVERED · F3 FOR DETAILS",4.5);
  }
}
audioTest.addEventListener("click",async()=>{
  const ok=await audio.unlock();
  audioStatus.textContent=ok?"AUDIO ACTIVE · TEST SHOT PLAYED":"AUDIO BLOCKED · CHECK TAB MUTE / BROWSER";
  if(ok){audio.play("fire");audio.play("beep");}
});
function popup(message,seconds=2.6){
  toast.textContent=message;toast.classList.add("shown");toastUntil=clock()+seconds*1000;
}
function showMenu(){
  locked=false;keys.clear();fireHeld=false;ads=false;
  objectiveRound.pause(clock());
  stopTacticalNarration();
  gadgets.ordnance.pause(clock());
  gadgets.cancelAction();barricades.cancel();
  document.body.classList.remove("playing","ads","spectating");hud.classList.add("hidden");
  menu.classList.remove("hidden");
  if(started){start.innerHTML="RESUME TRAINING <b>›</b>";status.textContent="Training paused · reconfigure or resume.";}
  window.dispatchEvent(new CustomEvent("blackout:menuopen",{detail:{started}}));
}
function showGame(){
  locked=true;started=true;menu.classList.add("hidden");hud.classList.remove("hidden");
  objectiveRound.resume(clock());
  gadgets.ordnance.resume(clock());
  if(objectiveRound.phase==="ready"&&!network.connected){
    objectiveRound.start(clock());
    stageLocalAttacker();
    // Enemy Mute places real jammer equipment during the 45s defender prep.
  }
  if(role==="attacker"&&objectiveRound.phase==="prep"&&!drone.active&&!network.connected){
    droneActionMode=false;
    if(drone.deployments===0)drone.begin(clock());
  }
  lastPhaseLabel="";phaseToastUntil=clock()+1500;
  document.body.classList.add("playing");
  popup(network.connected?"ONLINE · "+network.code+" · "+network.players.length+" CONNECTED":
    "BOMB TRAINING · "+role.toUpperCase()+" · OFFLINE AI",2.3);
  window.dispatchEvent(new Event("blackout:gamestart"));
}
async function lockMouse(){
  if(network.connected&&!network.active){
    onlineStatus.textContent="WAIT FOR HOST TO START YOUR REAL ONLINE ROUND";
    return;
  }
  audioReady();
  try {await canvas.requestPointerLock();}
  catch(error){status.textContent="Mouse lock unavailable: "+String(error?.message||error);}
}
start.addEventListener("click",lockMouse);
document.addEventListener("pointerlockchange",()=>{
  if(document.pointerLockElement===canvas)showGame();else showMenu();
});
document.addEventListener("pointerlockerror",()=>{status.textContent="Browser blocked pointer lock. Try clicking ENTER TEST RANGE again.";});
window.addEventListener("blur",()=>{fireHeld=false;ads=false;keys.clear();
  if(document.pointerLockElement===canvas)document.exitPointerLock();});

function resetSimulation(){
  resetTacticalCue();
  rappel.reset();drone.reset();droneActionMode=false;localAttackerDeployed=role!=="attacker";objectiveRound.reset(role);
  objectiveRound.roundNumber=matchSeries.round;world.reset();gadgets.reset(role);barricades.reset(role);weapons.reset();weaponView.reset();
  roundFrozen=false;lastHudAt=0;lastEndFrame=0;lastPhaseLabel="";phaseToastUntil=0;
  const spawn=spawnSelect?.value||"south";
  const attackers=world.facility.attackSpawns||[];
  // Defender insertions follow the selected BOMB SITE and selected FLOOR.
  // Old map markers were all ground-floor Y=0 and caused 2F defenders to
  // start downstairs. Both the player and AI use the same valid room solver.
  const defenderSpawn=(world.mapId==="clubhouse"||world.mapId==="ironvale")?
    playerDefenderInsertion(world,objectiveRound.siteId):null;
  const selectedAttacker=(world.mapId==="clubhouse"||world.mapId==="ironvale")?
    attackers.find(s=>s.id===spawn)||
      attackers[Math.max(0,Number(spawn)||0)]||attackers[0]:null;
  const fallback=attackSpawnFor(spawn);
  const insertion=role==="defender"?
    defenderSpawn||{x:objectiveRound.site.x,z:objectiveRound.site.z,
      y:targetFloor(objectiveRound.site),yaw:0}:
    selectedAttacker||fallback;
  Object.assign(world.spawn,{x:insertion.x,z:insertion.z,
    y:insertion.y??0,yaw:insertion.yaw??0});
  if(role==="defender"&&(world.mapId==="clubhouse"||world.mapId==="ironvale")&&
    Math.abs(world.floorAt(world.spawn.x,world.spawn.z,world.spawn.y+.29)-
      targetFloor(objectiveRound.site))>.35){
    status.textContent="DEFENDER SPAWN ERROR · SELECT ANOTHER SITE OR FIX MAP FLOOR";
    console.warn("BLACKOUT no supported defender spawn for selected site",objectiveRound.site);
  }
  objectiveRound.setOperator(operator);
  player.setOperator(operator);player.reset();keys.clear();
  aimBlend=0;gunKick=0;gunKickSide=0;recoilRecovery=0;lastStepMark=0;fireHeld=false;ads=false;
  hitUntil=0;popup("OBJECTIVE ROUND RESET · "+operator.name+" · SITE "+objectiveRound.siteId);
  updateHud({sprinting:false,crouched:false,prone:false,lean:0,speed:0});
}
function chooseOperator(id){
  const selected=OPERATORS[id];
  if(!selected||selected.side!==role)return;
  operator=selected;operatorSelect.value=id;
  player.setOperator(selected);
  operatorDetails.textContent=selected.speed+" SPEED · "+selected.armor+" ARMOR · "+selected.health+
    " HP · "+selected.walk.toFixed(2)+" m/s WALK · "+selected.sprint.toFixed(2)+" m/s SPRINT";
  gadgets.setOperator(selected);
  gadgets.setSecondaryType(secondarySelect.value);
  operatorPreviewName.textContent=selected.name;
  operatorPreviewDescription.textContent=selected.description;
  operatorPreviewPerk.textContent=selected.specialty+" // "+selected.passive;
  operatorPreviewIcon.textContent=selected.sigil;
  operatorPreviewIcon.style.color=selected.accent;
  operatorSpeed.textContent="SPEED "+"●".repeat(selected.speed)+"○".repeat(3-selected.speed);
  operatorArmor.textContent="ARMOR "+"●".repeat(selected.armor)+"○".repeat(3-selected.armor);
  operatorKit.textContent=selected.kit.special+" SPECIAL · "+
    (selected.side==="attacker"?"RECON DRONE":"DEFENSE KIT");
  for(const card of operatorCards.querySelectorAll("button[data-operator]")){
    const active=card.dataset.operator===selected.id;
    card.classList.toggle("selected",active);
    card.setAttribute("aria-pressed",String(active));
  }
  resetSimulation();
  network.operator(selected.id);onlineRefresh();
  status.textContent=selected.name+" READY · FIXED OPERATOR SPEED AND HEALTH";
}
function setRole(r){
  const previousOperator=operator?.id;
  role=r==="defender"?"defender":"attacker";
  secondarySelect.replaceChildren();
  const equipment=role==="attacker"?
    [["recon","RECON PULSE (2)"],["frag","FRAG GRENADE (2)"],
     ["stun","FLASHBANG (2)"],["claymore","CLAYMORE (1)"]]:
    [["sensor","PROXIMITY ALARM (2)"],["c4","REMOTE C4 (1)"],
     ["impact","IMPACT GRENADE (2)"]];
  for(const [id,label] of equipment){
    const option=document.createElement("option");
    option.value=id;option.textContent=label;secondarySelect.appendChild(option);
  }
  attackButton.classList.toggle("active",role==="attacker");
  defendButton.classList.toggle("active",role==="defender");
  selectedMode.textContent=role==="attacker"?"ATTACKER · PLANT AT EITHER SITE":"DEFENDER · PROTECT BOTH SITES";
  spawnSelect.replaceChildren();
  const choices=(world.mapId==="clubhouse"||world.mapId==="ironvale")&&role==="attacker"?
    world.facility.attackSpawns.map((p,i)=>[String(i),"EXTERIOR INSERTION "+(i+1)]):
    role==="attacker"?
    [["south","SOUTH ENTRY"],["west","WEST FLANK"],["east","EAST FLANK"]]:
    [["A","DEFEND SITE A · "+targetFloor(world.facility.sites.A)+"M"],
     ["B","DEFEND SITE B · "+targetFloor(world.facility.sites.B)+"M"]];
  for(const [id,label] of choices){
    const option=document.createElement("option");option.value=id;option.textContent=label;
    spawnSelect.appendChild(option);
  }
  if(role==="defender")spawnSelect.value=objectiveRound.siteId;
  operatorSelect.replaceChildren();
  for(const spec of operatorsForSide(role)){
    const option=document.createElement("option");option.value=spec.id;
    option.textContent=spec.name+" · "+spec.speed+" SPEED / "+spec.armor+" ARMOR · "+spec.health+" HP";
    operatorSelect.appendChild(option);
  }
  renderOperatorCards();
  // Changing map/site must not reset a player's selected specialist.
  // Only switching to the opposite team requires a different operator.
  const preserved=previousOperator&&OPERATORS[previousOperator]?.side===role?
    previousOperator:defaultOperator(role).id;
  chooseOperator(preserved);
  status.textContent=role==="attacker"?
    "ATTACK: locate bomb A or B, hold F while still to plant, then defend the defuser.":
    "DEFEND: protect both bomb units and disable any planted defuser.";
}
function renderOperatorCards(){
  operatorCards.replaceChildren();
  for(const spec of operatorsForSide(role)){
    const button=document.createElement("button");
    button.type="button";button.className="bo-operator-card";
    button.dataset.operator=spec.id;button.style.setProperty("--op-accent",spec.accent);
    button.setAttribute("aria-pressed",String(operator.id===spec.id));
    const icon=document.createElement("div");icon.className="bo-operator-icon";icon.textContent=spec.sigil;
    const title=document.createElement("strong");title.textContent=spec.name;
    const specialty=document.createElement("span");specialty.className="bo-role";specialty.textContent=spec.specialty;
    const speed=document.createElement("span");speed.className="bo-speed";
    speed.textContent=spec.speed+" SPD  /  "+spec.armor+" ARM";
    button.append(icon,title,specialty,speed);
    button.addEventListener("click",()=>chooseOperator(spec.id));
    operatorCards.appendChild(button);
  }
}
function syncSiteChoice(){
  const map=world.mapId;
  mapSelect.value=map;
  sitePairSelect.disabled=map==="lab";
  sitePairSelect.replaceChildren();
  for(const pair of world.sitePairs){
    const op=document.createElement("option");
    op.value=pair.id;op.textContent=pair.name.toUpperCase();
    sitePairSelect.appendChild(op);
  }
  if(map!=="lab")sitePairSelect.value=world.sitePairId;
  mapLabel.textContent=map==="ironvale"?"IRONVALE · 56 × 40M / TWO FLOORS":
    map==="clubhouse"?"CONSOLATE + CLUBHOUSE · 2 FLOORS":
    map==="switchyard"?"SWITCHYARD · 3 FLOORS":"MECHANICS LAB";
  const a=world.facility.sites.A,b=world.facility.sites.B;
  siteSelect.replaceChildren();
  for(const site of [a,b]){
    const opt=document.createElement("option");
    opt.value=site.id;opt.textContent="SITE "+site.id+" · "+site.name+
      (map!=="lab"?" / "+Math.round(site.y||0)+"M":"");
    siteSelect.appendChild(opt);
  }
  siteSelect.value=objectiveRound.siteId;
}
function applyMap(next){
  restartSeries(role);
  // Remove every old round actor BEFORE changing collision and raycast lists.
  objectiveRound.reset(role);
  rappel.reset();drone.reset();gadgets.reset(role);barricades.reset(role);world.reset();
  world.activateMap(next);
  // Physical door and window boards belong to the active facility only.
  // Rebuild the world-side board hitboxes; don't reuse lab boards in the map.
  barricades.configure(world.facility.openings);
  barricades.reset(role);
  world.reset();
  if(world.mapId!=="lab")world.setSitePair(world.sitePairId);
  objectiveRound.refreshMap();
  syncSiteChoice();
  setRole(role);
  status.textContent=(world.mapId==="ironvale"?
    "IRONVALE OPERATIONS · ROOM-BY-ROOM TACTICAL COMPLEX":world.mapId==="clubhouse"?
    "CONSOLATE + CLUBHOUSE · 2 FLOORS / RAPPEL ANCHORS":
    world.mapId==="switchyard"?
    "SWITCHYARD ACTIVE · 3 FLOORS / STAIRWELLS":"MECHANICS LAB ACTIVE")+
    " · LOCAL TRAINING";
}
mapSelect.addEventListener("change",()=>applyMap(mapSelect.value));
sitePairSelect.addEventListener("change",()=>{
  if(world.mapId==="lab")return;
  restartSeries(role);
  objectiveRound.reset(role);
  rappel.reset();drone.reset();gadgets.reset(role);barricades.reset(role);
  if(world.setSitePair(sitePairSelect.value)){
    objectiveRound.refreshMap();
    syncSiteChoice();
    resetSimulation();
    status.textContent="SITE PAIR LOCKED · "+sitePairSelect.selectedOptions[0]?.textContent;
  }
});
async function connectOnline(create){
  if(network.connected)return;
  onlineStatus.textContent="CONNECTING TO LIVE MULTIPLAYER SERVICE...";
  try{
    const options={name:onlineName.value,side:role,operator:operator.id,
      code:onlineCode.value.trim().toUpperCase()};
    if(world.mapId!=="ironvale")applyMap("ironvale");
    if(create)await network.create(options);
    else await network.join(options);
    onlineCode.value=network.code;
    onlineRefresh();popup("ROOM "+network.code+" CONNECTED · SHARE CODE",3.2);
  }catch(error){
    const message=String(error?.message||error);
    onlineStatus.textContent="ONLINE CONNECTION FAILED · "+message;
    status.textContent=message;
    console.warn("BLACKOUT room connection:",error);
  }
}
createRoom.addEventListener("click",()=>connectOnline(true));
joinRoom.addEventListener("click",()=>connectOnline(false));
leaveRoom.addEventListener("click",()=>{
  network.disconnect();onlineStatus.textContent="OFFLINE · ROOM DISCONNECTED";
  resetSimulation();onlineRefresh();
});
startRoom.addEventListener("click",()=>{
  if(network.host&&network.connected)network.start();
});
attackButton.addEventListener("click",()=>{restartSeries("attacker");setRole("attacker");});
defendButton.addEventListener("click",()=>{restartSeries("defender");setRole("defender");});
reset.addEventListener("click",()=>{
  restartSeries(role);resetSimulation();
  status.textContent="NEW OFFLINE MATCH · SCORE RESET · FIRST TO FOUR";
});
operatorSelect.addEventListener("change",()=>chooseOperator(operatorSelect.value));
secondarySelect.addEventListener("change",()=>{
  gadgets.setSecondaryType(secondarySelect.value);
  resetSimulation();
  status.textContent="SECONDARY KIT · "+secondarySelect.selectedOptions[0]?.textContent;
});
spawnSelect.addEventListener("change",()=>{
  if(role==="defender"){
    objectiveRound.chooseSite(spawnSelect.value);siteSelect.value=objectiveRound.siteId;
  }
  resetSimulation();
});
siteSelect.addEventListener("change",()=>{
  objectiveRound.chooseSite(siteSelect.value);
  if(role==="defender")spawnSelect.value=objectiveRound.siteId;
  resetSimulation();
  selectedMode.textContent=role==="attacker"?"ATTACKER · PLANT AT EITHER SITE":"DEFENDER · PROTECT BOTH SITES";
  status.textContent="INSERTION FOCUS · SITE "+objectiveRound.siteId+" · BOTH SITES REMAIN LIVE";
});
mouseSlider.addEventListener("input",()=>{mouseValue.textContent=Number(mouseSlider.value).toFixed(1)+"×";});
$("guideToggle").addEventListener("click",()=>{menuGuide=!menuGuide;guide.classList.toggle("hidden",!menuGuide);});

document.addEventListener("keydown",e=>{
  if(e.code==="F3"){e.preventDefault();debug=!debug;debugPanel.classList.toggle("hidden",!debug);return;}
  if(!locked)return;
  if(network.active&&e.code==="Enter"){e.preventDefault();return;}
  if((objectiveRound.phase==="won"||objectiveRound.phase==="lost")){
    if(e.code==="Enter"&&!e.repeat){
      e.preventDefault();launchNextSeriesRound();
    }
    return;
  }
  if(network.active&&["KeyG","KeyX","KeyF","KeyB","KeyV","Digit3"].includes(e.code)){
    e.preventDefault();popup("ONLINE BETA · GADGET/DEFUSER SYNC COMING LATER",1.7);return;
  }
  if(["KeyW","KeyA","KeyS","KeyD","ShiftLeft","ShiftRight","ControlLeft","ControlRight",
      "KeyC","KeyQ","KeyE","KeyR","KeyF","KeyG","KeyB","KeyX","KeyZ","KeyV","KeyT","Digit1","Digit2","Digit3","Space","AltLeft","AltRight"].includes(e.code))
    e.preventDefault();
  keys.add(e.code);
  if(e.repeat)return;
  if(!e.repeat&&(e.code==="KeyQ"||e.code==="KeyE")&&!drone.active&&
     player.health>0){
    const side=player.toggleLean(e.code==="KeyQ"?-1:1);
    popup(side===0?"LEAN RESET":side<0?"LEAN LOCKED LEFT":"LEAN LOCKED RIGHT",.85);
    return;
  }
  if(drone.active){
    if(e.code==="Digit3"&&objectiveRound.phase!=="prep"){
      drone.end();droneActionMode=false;player.applyCamera();
      popup("DRONE STOWED · BACK TO OPERATOR",1.4);return;
    }
    if(e.code==="KeyX"){
      const scan=drone.ping(clock(),objectiveRound.bots);
      if(scan.ok)for(const bot of scan.contacts){
        bot.lastSeen={x:bot.x,z:bot.z,time:clock()};
        bot.spottedUntil=clock()+9500;
      }
      popup(scan.message,1.4);if(scan.ok)sound("beep");
    }
    if(e.code==="KeyG"){
      const result=operator.id==="twitch"?
        drone.shock(clock(),gadgets):
        {ok:false,message:"DRONE MODE · G SHOCK AVAILABLE TO TWITCH"};
      popup(result.message,1.5);if(result.ok)sound("click");
    }
    return;
  }
  if(e.code==="Digit3"&&role==="attacker"&&
     ["prep","attack","planted"].includes(objectiveRound.phase)){
    if(!drone.begin(clock())){
      popup("NO RECON DRONES IN RESERVE",1.5);return;
    }
    droneActionMode=objectiveRound.phase!=="prep";
    popup("DRONE DEPLOYED · "+drone.remaining+" IN RESERVE · 3 TO RETURN",1.5);
    return;
  }
  if(role==="attacker"&&objectiveRound.phase==="prep"){
    // Destroyed recon feeds cannot fire, activate gadgets or fake a spawn.
    popup("PREPARATION · PRESS 3 TO DEPLOY A SPARE DRONE",1.5);
    return;
  }
  if(gadgets.busy||barricades.busy)return;
  if(e.code==="KeyT"){
    if(role!=="attacker"){
      popup("RAPPEL EQUIPMENT · ATTACKERS ONLY",1.7);
      return;
    }
    const r=rappel.toggle();
    popup(r.message,2.5);
    return;
  }
  if(e.code==="KeyV"){
    setSight(SIGHTS[(SIGHTS.indexOf(sight)+1)%SIGHTS.length]);
    popup("SIGHT SELECTED · "+SIGHT_NAMES[sight],1.1);
  }else if(e.code==="Digit1"||e.code==="Digit2"){
    weapons.equip(e.code==="Digit1"?"primary":"secondary");sound("equip");popup(weapons.current.name);
  }else if(e.code==="KeyR"){
    const reloading=weapons.reload(clock());
    if(reloading&&network.active)network.reload();
    if(reloading){sound("reload");weaponView.beginReload(clock(),weapons.slot,weapons.current.reloadDurationMs/1000,weapons.current.reloadType);}
    popup(reloading?"RELOADING "+weapons.current.name:"CANNOT RELOAD",1.2);
  }else if(e.code==="KeyZ"){
    player.toggleProne();
  }else if(e.code==="Space"){
    if(rappel.attached){
      const result=rappel.enterWindow(clock());
      popup(result.message,2.25);
      if(result.ok)sound("step");
    }else if(barricades.vault(player,clock())){
      sound("step");popup("WINDOW VAULT");
    }
  }else if(e.code==="KeyG"){
    const r=gadgets.main(camera,player,clock(),objectiveRound);
    popup(r.message);if(r.ok)sound(operator.id==="smoke"?"smoke-throw":"click");
  }else if(e.code==="KeyB"){
    if(operator.id==="smoke"||gadgets.secondaryType==="c4"){
      // Smoke and C4 deliberately share the remote button in the mechanics
      // lab. When Smoke selects C4 as secondary, B can trigger both kinds
      // of armed device; neither will detonate while still flying.
      const smoke=operator.id==="smoke"?gadgets.detonateSmoke(clock()):null;
      const c4=gadgets.secondaryType==="c4"?gadgets.remoteC4(clock()):null;
      const messages=[smoke,c4].filter(r=>r?.ok).map(r=>r.message);
      popup(messages.join(" · ")||(smoke?.message||c4?.message),2);
      if(c4?.ok)sound("gadget-blast");
      else if(smoke?.ok)sound("smoke-trigger");
    }
  }else if(e.code==="KeyX"){
    const r=gadgets.secondary(camera,player,clock());
    popup(r.message);if(r.ok)sound(r.event||"click");
  }else if(e.code==="KeyF"){
    if(objectiveRound.canInteract(player)){
      popup(role==="attacker"?"HOLD F TO PLANT DEFUSER":"HOLD F TO DISABLE DEFUSER",1.4);
    }else if(barricades.nearest(player)){
      const r=barricades.interact(player,clock());popup(r.message);
      if(r.ok){sound("click");fireHeld=false;ads=false;}
    }else{
      const r=gadgets.interact(camera,clock());popup(r.message);
      if(r.ok){sound("click");fireHeld=false;ads=false;}
    }
  }
});
document.addEventListener("keyup",e=>keys.delete(e.code));
document.addEventListener("mousemove",e=>{
  if(locked&&!gadgets.busy){
    if(drone.active)drone.look(e.movementX||0,e.movementY||0,
      .0022*Number(mouseSlider.value));
    else player.look(e.movementX||0,e.movementY||0,
      .0022*Number(mouseSlider.value)*(ads?.65:1));
  }
});
canvas.addEventListener("mousedown",e=>{
  if(!locked||drone.active||role==="attacker"&&objectiveRound.phase==="prep"||gadgets.busy||barricades.busy||["won","lost"].includes(objectiveRound.phase))return;
  audioReady();
  if(e.button===0){fireHeld=true;fireOnce(clock());}
  if(e.button===2){if(!ads)sound("aim");ads=true;}
});
window.addEventListener("mouseup",e=>{if(e.button===0)fireHeld=false;if(e.button===2)ads=false;});
canvas.addEventListener("contextmenu",e=>e.preventDefault());

function impact(point,color=0xffc16c,size=.08){
  const obj=new THREE.Mesh(new THREE.SphereGeometry(size,6,5),
    new THREE.MeshBasicMaterial({color,transparent:true,opacity:1}));
  obj.position.copy(point);scene.add(obj);effects.push({obj,until:clock()+300});
}
function breachDebris(point,color){
  // Short-lived fragments; cap the total to avoid performance regressions.
  for(let i=0;i<9&&effects.length<90;i++){
    const obj=new THREE.Mesh(new THREE.BoxGeometry(.05,.04,.045),
      new THREE.MeshBasicMaterial({color,transparent:true,opacity:1}));
    obj.position.copy(point);
    const angle=i*2.39996323;
    scene.add(obj);
    effects.push({obj,until:clock()+510,
      velocity:{x:Math.cos(angle)*(1+i*.12),y:1+(i%4)*.47,
        z:Math.sin(angle)*(1+i*.12)}});
  }
}
function fireOnce(now){
  try{return fireOnceSafe(now);}catch(err){
    // Do not forcibly turn full-auto into semi-auto after a bad hit event.
    // A shot error is reported, but the trigger remains held until mouseup.
    reportCombatError("FIRE",err);
  }
}
function fireOnceSafe(now){
  if(player.health<=0||role==="attacker"&&objectiveRound.phase==="prep"||
    objectiveRound.phase==="won"||objectiveRound.phase==="lost"||barricades.busy||
    objectiveRound.canInteract(player)&&keys.has("KeyF"))return;
  // Do not grant laser-accurate ADS while the actual sight is still moving
  // into position. Once aligned, the 3D reticle and the shot share the ray.
  const sightAligned=ads&&aimBlend>=.93;
  const shot=weapons.tryFire(now,sightAligned,!player.sprinting);
  if(!shot.ok){
    if(shot.why==="empty"&&now-lastEmptyClick>600){sound("click");lastEmptyClick=now;popup("MAGAZINE EMPTY · R TO RELOAD",1);}
    return;
  }
  objectiveRound.playerFiredAt=now;
  sound(shot.gun==="secondary"?"pistol":"fire");muzzleUntil=now+48;
  objectiveRound.onNoise(player.x,player.z,shot.gun==="primary"?27:17,now);
  weaponView.eject(shot.gun);
  // Spread offsets the center ray, not the player's movement direction.
  // Hipfire is a broad random cone. ADS is zeroed through the physical
  // gun-mounted optic, i.e. both sight center and bullet use camera (0,0).
  const stance=player.isProne?.55:player.isCrouched?.78:1;
  const motion=player.moving?1.35:1;
  const spread=sightAligned?0:shot.spread*stance*motion;
  const angle=Math.random()*Math.PI*2,radial=Math.sqrt(Math.random())*spread;
  const aim={x:Math.cos(angle)*radial,y:Math.sin(angle)*radial};
  camera.updateMatrixWorld(true);
  raycaster.setFromCamera(aim,camera);raycaster.far=shot.range;
  if(network.active){
    const targetId=network.findTarget(raycaster,aim,camera,world.shootables);
    network.shoot(targetId);
    player.pitch=Math.min(1.37,player.pitch+shot.kick.vertical);
    player.yaw+=shot.kick.horizontal;
    gunKick=Math.min(.075,gunKick+.028);
    player.applyCamera();return;
  }
  // Trace all real ray intersections in order, so the actual wall hole
  // and the bullet's collision behavior share a world-space position.
  const hits=raycaster.intersectObjects(world.shootables.filter(o=>{
    const info=o.userData||{};
    if(info.kind==="panel")return !info.panel.destroyed&&o.visible!==false;
    if(info.kind==="target")return info.target.alive;
    if(info.kind==="bot")return info.bot.alive&&info.bot.team!=="ally";
    if(info.kind==="drone")return info.drone.active;
    if(info.kind==="barricade")return !info.plank.broken;
    if(info.kind==="shield")return info.shield.group.parent!==null;
    return true;
  }),false);
  let penetration=1;
  for(const h of hits){
    const info=h.object.userData||{};
    if(info.kind==="panel"){
      if(info.panel.reinforced||!info.perforated){
        popup(info.panel.reinforced?"HARD REINFORCEMENT · BLOCKED":"STEEL FRAME · BLOCKED",.65);
        impact(h.point,0x9badb7);break;
      }
      const previousOpening=info.panel.openingWidth;
      const result=info.panel.hitBullet(h.point);
      if(result.passed){
        penetration*=result.attenuation;
        if(info.panel.openingWidth>0&&previousOpening===0){
          popup("SOFT BREACH OPEN · WALK THROUGH THE WALL",1.5);
          breachDebris(h.point,info.panel.materialProfile.impactColor);
        }else if(now-lastWallToastAt>550){
          lastWallToastAt=now;
          popup(info.panel.materialProfile.name+" · "+Math.round(result.attenuation*100)+"% PENETRATION",.7);
        }
        continue;
      }
      impact(h.point,info.panel.materialProfile.impactColor);break;
    }
    if(info.kind==="drone"){
      const destroyed=drone.damage(shot.damage*penetration,now);
      sound("impact");impact(h.point,0x65d8d3,.055);
      popup(destroyed?"RECON DRONE DESTROYED":"RECON DRONE DAMAGED",1);
      break;
    }
    if(info.kind==="ordnance"){
      const disabled=gadgets.damageOrdnance(info.device,shot.damage*penetration);
      sound("impact");impact(h.point,0xd4a384,.065);
      if(disabled)popup("DEPLOYED GADGET DESTROYED",1.0);
      break;
    }
    if(info.kind==="smoke-canister"){
      const removed=gadgets.damageSmokeCanister(info.device,shot.damage*penetration);
      sound("impact");impact(h.point,0xc7e28c,.06);
      if(removed)popup("GAS CANISTER DESTROYED · NO DETONATION",1.1);
      break;
    }
    if(info.kind==="barricade"){
      const destroyed=barricades.hit(info.plank,shot.damage);
      sound("impact");
      if(destroyed)popup("BARRICADE PLANK DESTROYED",.65);
      impact(h.point,0xbd9160,.06);
      break;
    }
    if(info.kind==="bot"){
      const protectedInsertion=role==="defender"&&
        attackInsertionProtected({
          now,actionStartedAt:objectiveRound.actionStartedAt,phase:objectiveRound.phase,
          team:"attacker",position:info.bot,insertion:info.bot.insertion,
          firedAt:info.bot.lastShotAt
        });
      if(protectedInsertion){
        popup("ATTACKER INSERTION PROTECTED · 2.3S MAX",.75);
        break;
      }
      const head=info.hitZone==="head",base=head?shot.headDamage:shot.damage;
      const kill=info.bot.damage(Math.max(1,Math.round(base*penetration)));
      weapons.registerHit(kill);hitUntil=now+170;
      info.bot.spottedUntil=now+9000;
      popup(kill?"HOSTILE ELIMINATED":(head?"HEADSHOT":"BODY HIT")+
        " · "+Math.ceil(info.bot.health)+" HP REMAINING",.75);
      impact(h.point,head?0xffd2a1:0xff7e67,.07);
      break;
    }
    if(info.kind==="target"){
      const head=info.hitZone==="head",base=head?shot.headDamage:shot.damage;
      const kill=info.target.damage(Math.max(1,Math.round(base*penetration)));
      weapons.registerHit(kill);hitUntil=now+170;
      popup(head?(kill?"HEADSHOT · TARGET DOWN":"HEADSHOT"):(kill?"TARGET DOWN":"TARGET HIT"),.7);
      impact(h.point,head?0xf8e3a0:0x6dffe1,.11);
      break;
    }
    impact(h.point,info.kind==="shield"?0x8bf8ff:0xa4b6b7);
    if(info.kind==="shield")popup("SHIELD BLOCKED SHOT",.65);
    break;
  }
  // Every shot pushes view upward AND introduces slight sideways climb.
  // Counteract recoil with mouse movement; model kick springs back separately.
  const climb=shot.kick.vertical;
  player.pitch=Math.min(1.37,player.pitch+climb);
  player.yaw+=shot.kick.horizontal;
  recoilRecovery=Math.min(.085,recoilRecovery+climb*.48);
  lastShotAt=now;
  gunKick=Math.min(.075,gunKick+.028);
  gunKickSide=Math.max(-.026,Math.min(.026,gunKickSide+shot.kick.horizontal*.8));
  player.applyCamera();
}
// All match widgets are calculated from actual PvE round state (no fake 5v5 slots).
function drawTacticalHud(now){
  const round=objectiveRound;
  const phase=round.phase;
  const phaseName=phase==="prep"?(role==="attacker"?"DRONE PHASE":"PREPARATION"):phase==="planted"?"DEFUSER ACTIVE":
    phase==="attack"||phase==="guard"?"ACTION PHASE":
    phase==="won"?"ROUND WON":phase==="lost"?"ROUND LOST":"OPERATOR SELECT";
  const clockMs=round.clockEnd?Math.max(0,round.clockEnd-now):0;
  const seconds=Math.ceil(clockMs/1000);
  matchClock.textContent=String(Math.floor(seconds/60))+":"+String(seconds%60).padStart(2,"0");
  matchClock.classList.toggle("warning",seconds<=15&&seconds>0);
  const staged=role==="attacker"&&phase==="prep"?round.stagedAttackers||[]:[];
  const friendCount=Number(player.health>0)+round.allies.filter(b=>b.alive).length+staged.length;
  const opposingCount=round.bots.length?round.bots.filter(b=>b.alive).length:5;
  const atkCount=role==="attacker"?friendCount:opposingCount;
  const defCount=role==="defender"?friendCount:opposingCount;
  attackAlive.textContent=atkCount+"/5";
  defendAlive.textContent=defCount+"/5";
  teamPopulation.textContent=atkCount+" ATTACKERS   VS   "+defCount+" DEFENDERS";
  const lostFeed=role==="attacker"&&phase==="prep"&&drone.destroyed;
  droneOverlay.classList.toggle("hidden",!drone.active&&!lostFeed);
  droneOverlay.classList.toggle("bo-feed-lost",lostFeed);
  droneSignal.textContent=lostFeed?"DRONE DESTROYED":
    drone.jammed?"SIGNAL JAMMED":"SIGNAL STABLE · "+drone.health+" HP · "+drone.remaining+" SPARE";
  phaseText.textContent=phaseName;
  matchScore.textContent=network.connected?
    "ONLINE "+network.players.filter(p=>p.side==="attacker").length+
    " : "+network.players.filter(p=>p.side==="defender").length:
    "YOU "+matchSeries.yourWins+" — "+matchSeries.theirWins+" AI";
  // All ten slots are real participants in this OFFLINE PvE simulation.
  const playerAlive=player.health>0;
  const onePip='<span class="bo-player-pip ally'+(playerAlive?"":" down")+
    '" title="YOUR OPERATOR · '+operator.name+'">'+operator.sigil+'</span>';
  const stagedPips=staged.map(b=>
    '<span class="bo-player-pip ally" title="AWAITING ACTION INSERTION · '+
    b.operatorSpec?.name+'">'+(b.operatorSpec?.sigil||"◆")+'</span>').join("");
  const friendly=onePip+stagedPips+round.allies.map(b=>
    '<span class="bo-player-pip ally'+(b.alive?"":" down")+
    '" title="ALLY · '+b.operatorSpec?.name+' · '+(b.alive?"ALIVE":"ELIMINATED")+'">'+
    (b.alive?b.operatorSpec?.sigil||"◆":"×")+'</span>').join("");
  const enemy=round.bots.length?
    round.bots.map(b=>'<span class="bo-player-pip hostile'+(b.alive?"":" down")+
      '" title="'+(b.alive&&now<b.spottedUntil?"SPOTTED · "+b.operatorSpec?.name:
        b.alive?"UNKNOWN HOSTILE":"HOSTILE ELIMINATED")+'">'+
      (b.alive?(now<b.spottedUntil?b.operatorSpec?.sigil||"●":"?"):"×")+
      '</span>').join(""):
    Array(5).fill('<span class="bo-player-pip hostile" title="Enemy undisclosed">?</span>').join("");
  if(role==="attacker"){friendlySlots.innerHTML=friendly;enemySlots.innerHTML=enemy;}
  else{enemySlots.innerHTML=friendly;friendlySlots.innerHTML=enemy;}
  const runout=round.runoutPlayer||
    round.runoutAlly?.alive&&now<round.runoutAlly.runoutUntil||
    round.runoutTarget?.alive&&now<round.runoutTarget.runoutUntil;
  runoutAlert.classList.toggle("hidden",!runout);
  if(runout){
    runoutAlertTitle.textContent=round.runoutPlayer?
      "YOU ARE DETECTED OUTSIDE":round.runoutAlly?
      "SQUADMATE SPOTTED OUTSIDE":"DEFENDER DETECTED OUTSIDE";
    runoutAlertInfo.textContent=role==="defender"?
      "ATTACKERS CAN TRACK THE DEFENDER":
      "RUNOUT PING · "+Math.round(Math.hypot(round.runoutTarget.x-player.x,
        round.runoutTarget.z-player.z))+"M";
  }
  spectatorAlert.classList.toggle("hidden",playerAlive);
  // During attack, show the nearest of BOTH live bomb locations. Once
  // planted the compass locks to the actual planted defuser location.
  const options=Object.values(round.sites);
  const viewPosition=drone.active?drone.position:player;
  const focusedSite=phase!=="planted"?
    options.reduce((a,b)=>Math.hypot(b.x-viewPosition.x,b.z-viewPosition.z)<
      Math.hypot(a.x-viewPosition.x,a.z-viewPosition.z)?b:a):
    round.site;
  const dest=phase==="planted"&&round.plantPosition||focusedSite;
  const dx=dest.x-viewPosition.x,dz=dest.z-viewPosition.z;
  const distance=Math.round(Math.hypot(dx,dz));
  const angle=(Math.atan2(dx,-dz)+(drone.active?drone.yaw:player.yaw))*180/Math.PI;
  bombArrow.style.transform="rotate("+angle.toFixed(1)+"deg)";
  bombRange.textContent=(phase==="planted"?"DEFUSER ":"BOMB ")+focusedSite.id+" · "+distance+"M";
  bombGuide.textContent=phase==="planted"?
    role==="attacker"?"PROTECT DEFUSER":"DISABLE DEFUSER":
    phase==="prep"?"SCOUT / FORTIFY":
    role==="attacker"?"LOCATE & PLANT":"PROTECT THE BOMBS";
  matchCaption.textContent=phase==="planted"?
    "DEFUSER SITE "+round.siteId+" · "+phaseName:
    "SITES A + B · "+phaseName+" · 5V5 AI";
  defuserInventory.textContent=role==="attacker"?
    phase==="planted"?"DEFUSER DEPLOYED":"DEFUSER CARRIED":
    "DEFEND BOMB STATION";
  healthFill.style.width=Math.max(0,player.health/player.maxHealth*100).toFixed(1)+"%";
  healthHud.closest(".bo-health-circle")?.style.setProperty("--bo-hp-angle",(Math.max(0,Math.min(1,player.health/player.maxHealth))*360).toFixed(1)+"deg");
  healthFill.classList.toggle("danger",player.health<=player.maxHealth*.35);
  if(phase!==lastPhaseLabel){
    lastPhaseLabel=phase;
    phaseToastUntil=now+(phase==="prep"?2800:phase==="attack"||phase==="guard"?3000:0);
    if(locked)playTacticalPhaseAnnouncement({phase,role,roundNumber:round.roundNumber,audio});
  }
  // Show a brief phase change announcement; NEVER cover the aiming area
  // throughout the full 45-second fortification phase.
  const show=now<phaseToastUntil&&
    (phase==="prep"||phase==="attack"||phase==="guard");
  phaseAnnounce.classList.toggle("hidden",!show);
  if(show){
    phaseAnnounceEyebrow.textContent="ROUND "+round.roundNumber+" · "+
      (role==="attacker"?"ATTACKERS":"DEFENDERS");
    phaseAnnounceTitle.textContent=phase==="prep"?(role==="attacker"?"PREPARATION PHASE":"PREPARATION PHASE"):"ACTION PHASE";
    phaseAnnounceHelp.textContent=phase==="prep"?
      role==="defender"?"PREPARE THE TWO BOMB LABS · TEST MECHANICS":
      "DRONE ACROSS TEST ZONES · X PING · SPAWN IN "+seconds+"S":
      role==="attacker"?"LOCATE THE BOMBS AND PLANT THE DEFUSER":
      "ELIMINATE ATTACKERS · DENY THE PLANT";
  }
}
function updateHud(report){
  drawTacticalHud(clock());
  zoneLabel.textContent=role==="attacker"&&objectiveRound.phase==="prep"?
    "ATTACK TEAM · AWAITING INSERTION":world.zoneAt(player.x,player.z,player.y).toUpperCase();
  const allies=objectiveRound.allies.filter(b=>b.alive);
  const attacking=role==="attacker";
  const stateCounts={};
  for(const b of allies)stateCounts[b.state]=(stateCounts[b.state]||0)+1;
  const squadLabel=objectiveRound.phase==="prep"?
    (attacking?"DRONE RECON · SQUAD AWAITING INSERTION":
      "FORTIFICATION · "+allies.filter(b=>b.setupTask?.placed).length+
      "/"+allies.length+" SETUP TASKS"):
    objectiveRound.phase==="planted"?
    (attacking?"SQUAD · PROTECT THE DEFUSER":"SQUAD · RETAKE AND DISABLE"):
    (stateCounts.planting?"DEFUSER CARRIER PLANTING":
     stateCounts.disarming?"SQUADMATE DISABLING DEFUSER":
     stateCounts.breaching?"ENTRY TEAM BREACHING":
     stateCounts["seek-cover"]?"SQUAD SEEKING COVER":
     stateCounts["team-flank"]?"SQUAD FLANKING LAST KNOWN POSITION":
     stateCounts["site-response"]?"DEFENDERS RESPONDING TO CONTACT":
     attacking?"SQUAD · CLEARING BOTH BOMB ROOMS":"SQUAD · HOLDING BOTH SITES");
  const squadText="AI SQUAD · "+squadLabel+" · "+(attacking&&objectiveRound.phase==="prep"?4:allies.length)+"/4 UP";
  if(squadStatus.textContent!==squadText)squadStatus.textContent=squadText;
  objective.textContent=objectiveRound.summary(clock());
  roundScore.textContent="ROUND "+objectiveRound.roundNumber+
    " · YOUR SQUAD "+matchSeries.yourWins+" : "+matchSeries.theirWins+
    " OPPONENTS · "+role.toUpperCase();
  objectiveHint.textContent=objectiveRound.hint;
  const progressing=objectiveRound.hold>0;
  objectiveProgress.classList.toggle("hidden",!progressing);
  objectiveAction.textContent=role==="attacker"?"PLANTING DEFUSER":"DISABLING DEFUSER";
  objectiveFill.style.width=objectiveRound.holdPercent.toFixed(1)+"%";
  const ended=objectiveRound.phase==="won"||objectiveRound.phase==="lost";
  if(ended)recordRoundIfEnded();
  roundResult.classList.add("hidden");
  intermission.classList.toggle("hidden",!ended);
  if(ended){
    intermissionTitle.textContent=matchSeries.finished?
      (matchSeries.winner==="YOUR SQUAD"?"MATCH VICTORY":"MATCH DEFEAT"):
      (objectiveRound.phase==="won"?"ROUND VICTORY":"ROUND DEFEAT");
    intermissionScore.textContent="YOUR SQUAD "+matchSeries.yourWins+
      " — "+matchSeries.theirWins+" OPPONENTS · FIRST TO FOUR";
    intermissionGuide.textContent=matchSeries.finished?
      "MATCH COMPLETE · ENTER: START NEW MATCH · ESC: MENU":
      "ENTER: ROUND "+matchSeries.round+" · NEXT SIDE "+
      matchSeries.nextRole.toUpperCase()+
      (matchSeries.history.length===3?" · HALFTIME SIDE SWITCH":"")+
      " · ESC: MENU";
    intermissionRounds.replaceChildren();
    for(const game of matchSeries.history){
      const pip=document.createElement("span");
      pip.className="bo-series-pip "+(game.won?"win":"loss");
      pip.textContent=game.number;
      pip.title="ROUND "+game.number+" · "+game.role.toUpperCase()+
        " · "+(game.won?"WON":"LOST")+" · "+game.reason;
      intermissionRounds.appendChild(pip);
    }
  }
  operatorHud.textContent=operator.name+" · "+operator.speed+" SPEED / "+operator.armor+" ARMOR";
  healthHud.textContent=player.health+" / "+player.maxHealth+" HP";
  healthHud.classList.toggle("low-health",player.health<=player.maxHealth*.35);
  stateReadout.textContent=report.prone?"PRONE":report.crouched?"CROUCHED":
    report.sprinting?"SPRINTING":Math.abs(report.lean)>.12?"LEANING":"STANDING";
  fpsReadout.textContent=fps+" FPS";
  weaponName.textContent=weapons.current.name;
  ammoCount.textContent=String(weapons.current.ammo).padStart(2,"0");
  reserveCount.textContent="/ "+weapons.current.remaining;
  combatStats.textContent=`${weapons.stats.hits} HITS · ${weapons.stats.accuracy}% ACC · ${weapons.stats.kills} DOWN`;
  const detail=gadgets.details;
  gadgetPrimary.textContent=operator.id==="smoke"?
    `G THROW [${gadgets.specialCount}] · B DETONATE [${gadgets.smokeStatus.armed} ARMED]`:
    `G · ${detail.g} [${gadgets.specialCount??0}]`;
  gadgetSecondary.textContent=drone.active?"X · DRONE PING · G SHOCK (TWITCH)":
    `X · ${detail.x} [${gadgets.counts.x}]`+
      (gadgets.secondaryType==="c4"?
        ` · B DETONATE [${gadgets.ordnance.armedC4} ARMED]`:"");
  const blind=gadgets.ordnance;
  const remain=Math.max(0,blind.flashUntil-clock());
  flashOverlay.style.opacity=remain>0?
    String(Math.min(.94,blind.flashIntensity*Math.min(1,remain/550))):"0";
  const nearbyOpening=barricades.nearest(player,2.7);
  gadgetInteract.textContent=rappel.attached?rappel.hint:
    objectiveRound.canInteract(player)?
    (role==="attacker"?"F · HOLD TO PLANT":"F · HOLD TO DISABLE"):
    role==="attacker"&&objectiveRound.phase==="prep"&&world.mapId==="clubhouse"?
      "RAPPEL AVAILABLE AFTER DRONE PREPARATION":
    role==="attacker"&&rappel.hint?rappel.hint:
    nearbyOpening?("F · "+(barricades.hasBarricade(nearbyOpening)?"REMOVE":"BARRICADE")+" "+
      nearbyOpening.kind.toUpperCase()):
    role==="defender"?`F · REINFORCE [${gadgets.counts.reinforce}]`:
      `F · PLANT AT SITE ${objectiveRound.siteId}`;
  hudRole.textContent=role.toUpperCase();
  rangeInfo.textContent=report.speed.toFixed(1)+" m/s";
  if(debug){
    positionReadout.style.whiteSpace="pre-line";
    positionReadout.textContent=`POS ${player.x.toFixed(2)}, ${player.y.toFixed(2)}, ${player.z.toFixed(2)}
YAW ${player.yaw.toFixed(2)} / PITCH ${player.pitch.toFixed(2)}
SPEED ${report.speed.toFixed(2)}m/s / ${stateReadout.textContent}
DYNAMIC COLLIDERS ${world.colliders.length} / TARGETS ${world.targets.filter(t=>t.alive).length}
COMBAT ERRORS ${combatErrors}
LAST ERROR ${lastCombatError||"NONE"}
AUDIO VOICES ${audio.activeVoices||0} / ${audio.voiceLimit||0}
ENEMY HP ${objectiveRound.bots.filter(b=>b.alive).map(b=>b.id+":"+Math.ceil(b.health)).join(" / ")||"ALL ELIMINATED"}
BOT ROUTES ${objectiveRound.bots.filter(b=>b.alive).map(b=>b.id+":"+(b.blockingBarricade?"BREACH "+b.blockingBarricade.id:b.state)+" ["+(b.path?.length||0)+"]").join(" / ")||"NO BOTS"}
ALLY ROUTES ${objectiveRound.allies.filter(b=>b.alive).map(b=>b.id+":"+(b.blockingBarricade?"BREACH "+b.blockingBarricade.id:b.state)+" ["+(b.path?.length||0)+"]").join(" / ")||"NO ALLIES"}
SQUAD INTEL ${Object.keys(objectiveRound.teamIntel||{}).map(team=>team+":"+Math.max(0,Math.round(((objectiveRound.teamIntel[team]?.until||0)-clock())/1000))+"s").join(" / ")}
AI DEFENSE ${[...objectiveRound.allies,...objectiveRound.bots].filter(b=>b.alive&&((b.team==="ally")===(role==="defender"))).map(b=>b.id+":"+b.operatorSpec?.name+":"+(b.setupTask?.placed?"SET":"WAIT")+(b.extraSetup?.placed?"+REINFORCED":"")).join(" / ")}
AI GADGETS ${gadgets.electronics.length} JAMMERS / ${gadgets.sensors.length} SENSORS / ${gadgets.gasFields.filter(g=>g.group.visible).length} GAS
GADGET ACTION ${gadgets.currentAction?.kind||"IDLE"}
FRIENDLIES ${objectiveRound.allies.filter(b=>b.alive).length}/4
RUNOUT ${objectiveRound.runoutPlayer?"PLAYER SPOTTED":objectiveRound.runoutTarget?"ENEMY SPOTTED":"NONE"}`;
  }
}
function frame(now){
  // Always schedule the next frame: combat exceptions used to kill RAF forever.
  try{updateFrame(now);}catch(err){
    reportCombatError("FRAME",err);
  }finally{requestAnimationFrame(frame);}
}
function updateFrame(now){
  const actualDt=Math.max(0,(now-last)/1000),dt=Math.min(actualDt,.043);last=now;
  frames++;elapsed+=actualDt;
  if(elapsed>=.6){fps=Math.round(frames/elapsed);frames=0;elapsed=0;}
  const ended=network.connected?network.mode!=="active":
    ["won","lost"].includes(objectiveRound.phase);
  if(!ended)weapons.tick(now);
  if(locked&&!ended){
    // ADS reduces the move speed by removing sprint; it does NOT
    // toggle mouse-lock or turn the gun into a third-person camera.
    const activeKeys=gadgets.busy||barricades.busy?new Set():ads?
      new Set([...keys].filter(k=>k!=="ShiftLeft"&&k!=="ShiftRight")):keys;
    if(gadgets.busy||barricades.busy){player.velX=0;player.velZ=0;}
    const alive=player.health>0;
    const beforeMove={x:player.x,z:player.z};
    const inDronePreparation=role==="attacker"&&objectiveRound.phase==="prep";
    const onRope=alive&&!drone.active&&!inDronePreparation&&rappel.attached;
    if(onRope)rappel.update(dt,activeKeys);
    const report=alive&&!drone.active&&!inDronePreparation&&!onRope?
      player.update(dt,activeKeys):
      {sprinting:false,prone:false,crouched:false,lean:player.lean,speed:0};
    if(!alive){
      rappel.reset();
      if(drone.active){drone.end();droneActionMode=false;}
      fireHeld=false;ads=false;keys.clear();
      const ally=objectiveRound.allies.find(bot=>bot.alive);
      if(ally){
        camera.position.set(ally.x,1.96,ally.z+1.05);
        camera.rotation.set(-.045,ally.group.rotation.y,0,"YXZ");
      }
    }
    if(drone.active)drone.update(dt,activeKeys,gadgets);
    if(!drone.active&&drone.destroyed&&droneActionMode&&
       objectiveRound.phase!=="prep"){
      droneActionMode=false;player.applyCamera();
    }
    // Attackers cannot move their physical operator during the drone phase;
    // their operator spawns only when preparation ends.
    if(alive&&role==="attacker"&&objectiveRound.phase==="prep"&&
       objectiveRound.isInside(player)){
      player.x=beforeMove.x;player.z=beforeMove.z;
      player.velX=0;player.velZ=0;
      player.applyCamera();
    }
    // Preparation lockdown applies to defenders, not a permanent invisible
    // map. Only enclosed competitive maps constrain defenders during prep.
    if(alive&&role==="defender"&&objectiveRound.phase==="prep"&&
      world.facility.mode!=="mechanics-sandbox"){
      const b=world.facility.bounds;
      const x=Math.max(b.minX+.46,Math.min(b.maxX-.46,player.x));
      const z=Math.max(b.minZ+.46,Math.min(b.maxZ-.46,player.z));
      if(x!==player.x||z!==player.z){
        player.x=x;player.z=z;player.velX=0;player.velZ=0;
        player.applyCamera();
      }
    }
    const mark=Math.floor(player.stepClock/Math.PI);
    if(player.moving&&!player.isProne&&report.speed>.65&&mark!==lastStepMark){
      sound(player.sprinting?"run-step":"step");
      objectiveRound.onNoise(player.x,player.z,player.sprinting?9:report.slow?2.3:4.5,now);
    }
    lastStepMark=mark;
    if(player.health>0&&now-lastShotAt>140&&recoilRecovery>0){
      const recover=Math.min(recoilRecovery,dt*.072);
      player.pitch=Math.max(-1.37,player.pitch-recover);
      recoilRecovery-=recover;player.applyCamera();
    }
    if(Math.abs(player.x)>117||Math.abs(player.z)>117){player.reset();popup("RANGE LIMIT · RETURNED TO START");}
    if(fireHeld&&!drone.active&&!gadgets.busy&&!barricades.busy&&
       weapons.slot==="primary"&&!player.sprinting){
      // Automatic fire is driven by the gun's RPM, not limited to 1 shot per
      // render frame. Catch up at most three shots after a slow frame.
      // This preserves trigger-down behavior when looking at enemy models.
      for(let emitted=0;emitted<3&&fireHeld;emitted++){
        const gun=weapons.current;
        if(gun.reloadingUntil||!gun.ammo||now+.001<gun.nextShotAt)break;
        const previousAmmo=gun.ammo;
        fireOnce(now);
        if(gun.ammo===previousAmmo)break;
      }
    }
    if(network.active)network.sendPosition(player,now);
    if(!network.connected)gadgets.tick(now,player,(message,event)=>{
      if(event==="proximity-beep")proximityAlarm();
      else if(event)sound(event);
      if(message)popup(message);
    },objectiveRound.bots);
    if(!network.connected)barricades.tick(now,keys.has("KeyF"),player,(message,event)=>{
      if(message)popup(message);
      if(event)sound(event);
    });
    const phaseBeforeSimulation=objectiveRound.phase;
    if(!network.connected)objectiveRound.update(now,dt,player,keys.has("KeyF")&&!drone.active&&!gadgets.busy&&!barricades.busy,(message,event,origin)=>{
      if(message)popup(message);
      if(event&&origin&&audio.ready)audio.playAt(event,origin.x,origin.z,player.x,player.z,player.yaw);
      else if(event)sound(event);
    });
    if(phaseBeforeSimulation==="prep"&&objectiveRound.phase!=="prep")
      deployLocalAttacker();
    if(!network.connected&&(objectiveRound.phase==="won"||objectiveRound.phase==="lost"))
      recordRoundIfEnded();
    if(drone.active&&objectiveRound.phase!=="prep"&&!droneActionMode){
      drone.end();player.applyCamera();
      sound("round-start");popup("INSERTION COMPLETE · OPERATOR SPAWNED",2.5);
    }
    const installing=gadgets.busy||barricades.busy;
    reinforceBar.classList.toggle("hidden",!installing);
    if(installing){
      const action=barricades.action||gadgets.currentAction;
      const remaining=Math.max(0,((action?.end||now)-now)/1000);
      reinforceTitle.textContent=barricades.busy?
        (barricades.action.kind==="install"?"INSTALLING BARRICADE":"REMOVING BARRICADE"):
        gadgets.ordnance.pending?
          (gadgets.ordnance.pending.kind==="claymore"?
            "PLACING CLAYMORE":"THROWING "+gadgets.ordnance.pending.kind.toUpperCase()):
        gadgets.specialAction?"ACTIVATING "+gadgets.specialAction.kind.toUpperCase():
        "INSTALLING REINFORCEMENT";
      reinforceHint.textContent=gadgets.ordnance.pending?
        "THROW / INSTALL ANIMATION · RELEASE WHEN COMPLETE":
        "KEEP HOLDING F · RELEASE TO CANCEL · ESC FOR MENU";
      reinforceFill.style.width=((barricades.busy?barricades.progress:gadgets.actionProgress)*100).toFixed(1)+"%";
      reinforceCountdown.textContent=remaining.toFixed(1)+"S";
    }
    if(now-lastHudAt>90||["won","lost"].includes(objectiveRound.phase)){
      lastHudAt=now;updateHud(report);
      if(network.connected){
        const atk=network.players.filter(p=>p.side==="attacker"),
          def=network.players.filter(p=>p.side==="defender");
        attackAlive.textContent=atk.filter(p=>p.alive).length+"/"+atk.length;
        defendAlive.textContent=def.filter(p=>p.alive).length+"/"+def.length;
        teamPopulation.textContent="REAL HUMAN PLAYERS · "+network.players.length+
          "/10 · ROOM "+network.code;
        phaseText.textContent=network.active?"ONLINE PvP ROUND":
          network.mode==="intermission"?"ROUND FINISHED":"ONLINE ROOM";
        matchClock.textContent=network.active?"LIVE":"WAIT";
        roundScore.textContent="IRONVALE · REAL ONLINE ROOM "+network.code+
          " · ROUND "+network.round;
        matchCaption.textContent="LIVE PVP BETA · REAL PLAYERS ONLY";
        objectiveHint.textContent=network.mode==="intermission"?
          "ONLINE "+(network.winner||"DRAW").toUpperCase()+" WIN · ESC FOR LOBBY":
          "ONLINE BETA · SERVER-VERIFIED HITS · NO DEFUSER YET";
        squadStatus.textContent="ONLINE "+role.toUpperCase()+" · "+
          network.players.filter(p=>p.side===role).length+" HUMAN TEAMMATES";
        for(const [node,list] of [[friendlySlots,atk],[enemySlots,def]]){
          node.replaceChildren();
          for(const p of list){
            const span=document.createElement("span");
            span.className="bo-player-pip "+(p.side==="attacker"?"ally":"hostile")+
              (p.alive?"":" down");
            span.textContent=p.alive?"●":"×";
            span.title=p.name+" · "+p.operator+" · "+p.health+" HP";
            node.appendChild(span);
          }
        }
        const dead=network.active&&network.me&&!network.me.alive;
        spectatorAlert.classList.toggle("hidden",!dead);
        if(dead)spectatorAlert.textContent=
          "ELIMINATED · WAIT FOR HOST TO START THE NEXT ROUND";
      }
    }
  }else if(locked&&!roundFrozen){
    // Freeze all simulation, movement, AI and weapon logic immediately at
    // victory/death. Do not continue per-frame work after the round is over.
    roundFrozen=true;keys.clear();fireHeld=false;ads=false;
    player.velX=0;player.velY=0;player.velZ=0;
    gadgets.cancelAction();barricades.cancel();
    reinforceBar.classList.add("hidden");
    if(effects.length){
      for(const e of effects){scene.remove(e.obj);e.obj.geometry.dispose();e.obj.material.dispose();}
      effects.length=0;
    }
    updateHud({prone:player.isProne,crouched:player.isCrouched,sprinting:false,
      lean:player.lean,speed:0});
  }
  if(toastUntil&&now>toastUntil){toastUntil=0;toast.classList.remove("shown");}
  hitmark.classList.toggle("shown",now<hitUntil);
  const showingAds=locked&&!ended&&ads&&!gadgets.busy&&!barricades.busy;
  document.body.classList.toggle("ads",showingAds);
  // Real 3D optic is always attached to the gun, so no HTML ADS indicator.
  const hipSpread=weapons.current.hipSpread*(player.moving?1.35:1);
  reticle.style.setProperty("--hip-size",(30+hipSpread*225).toFixed(1)+"px");
  const flash=!ended&&now<muzzleUntil;
  muzzle.position.z=weapons.slot==="secondary"?-.73:weapons.loadout.primary==="smg"?-.99:weapons.loadout.primary==="dmr"?-1.33:-1.15;
  muzzleSprite.position.copy(muzzle.position);
  muzzle.intensity=flash?3.8:0;muzzleSprite.visible=flash;
  aimBlend+=(Number(locked&&ads)-aimBlend)*Math.min(1,dt*13);
  camera.fov=80-aimBlend*25;camera.updateProjectionMatrix();
  const scale=weapons.slot==="secondary"?.78:1;
  gunModel.scale.setScalar(scale);
  // ADS slides the REAL sight's optic origin onto (0,0) in camera space.
  // The reticle's 3D meshes are part of the weapon group—not CSS art.
  const aligned=gunOptics.aimPosition(scale);
  const blend=Math.min(1,dt*14);
  gunModel.position.x+=(aligned.x*aimBlend+.42*(1-aimBlend)-gunModel.position.x)*blend;
  gunModel.position.y+=(aligned.y*aimBlend-.36*(1-aimBlend)-gunModel.position.y)*blend;
  gunModel.position.z+=(aligned.z*aimBlend-.77*(1-aimBlend)+gunKick*.28-gunModel.position.z)*blend;
  gunModel.rotation.x=-gunKick*.64;
  gunModel.rotation.z=gunKickSide;
  const interacting=!ended&&objectiveRound.hold>0&&keys.has("KeyF");
  document.body.classList.toggle("spectating",player.health<=0&&locked);
  gunModel.visible=player.health>0&&!drone.active&&localAttackerDeployed;
  gunOptics.mount.visible=player.health>0&&!drone.active&&localAttackerDeployed&&weapons.slot==="primary"&&!interacting;
  if(!ended)weaponView.update({now,dt,slot:weapons.slot,aim:aimBlend,moving:player.moving,
    sprinting:player.sprinting,step:player.stepClock,lean:player.lean,
    interacting,interactionProgress:objectiveRound.holdPercent/100});
  gunKick*=Math.exp(-dt*14);
  gunKickSide*=Math.exp(-dt*14);
  for(let i=effects.length-1;i>=0;i--){
    const e=effects[i];
    if(now>=e.until){
      scene.remove(e.obj);e.obj.geometry.dispose();e.obj.material.dispose();
      effects.splice(i,1);continue;
    }
    if(e.velocity){
      e.velocity.y-=dt*8;
      e.obj.position.x+=e.velocity.x*dt;
      e.obj.position.y+=e.velocity.y*dt;
      e.obj.position.z+=e.velocity.z*dt;
      e.obj.rotation.x+=dt*6;e.obj.rotation.z+=dt*5;
      e.obj.material.opacity=Math.max(0,(e.until-now)/510);
    }
  }
  // A dead or paused round is visually static: avoid burning a full render
  // every vsync while preserving responsive HTML menu and result controls.
  const renderInterval=ended?160:locked?0:160;
  if(!renderInterval||now-lastEndFrame>=renderInterval){
    const restoreDrone=drone.concealForOwnCamera();
    try{renderer.render(scene,camera);}finally{restoreDrone();}
    lastEndFrame=now;
  }
}
setRole("attacker");
const competitiveUI=initCompetitiveUI({menu,start,status,sightSelect,getOperator:()=>operator,getRole:()=>role,getGunName:slot=>weapons.guns[slot].name});
hud.classList.add("hidden");noticeReady();requestAnimationFrame(frame);
// Switch to the actual tactical map by default. Sandbox remains one click away.
applyMap("switchyard");
function noticeReady(){status.textContent="WELCOME TO BLACKOUT · CHOOSE PLAY TO FIND AN OFFLINE TRAINING MATCH";}
window.BLACKOUT_DEV={
  get build(){return "8.0.0-real-room-pvp-beta"},
  get multiplayer(){return {connected:network.connected,active:network.active,
    code:network.code,host:network.host,id:network.id,players:network.players,
    round:network.round,winner:network.winner}},
  get matchSeries(){return matchSeries.snapshot},
  get rappel(){return {attached:rappel.attached,anchorId:rappel.active?.id||null,
    hint:rappel.hint,nearest:rappel.nearestAnchor(100)?.distance??null}},
  get insertion(){return {deployed:localAttackerDeployed,phase:objectiveRound.phase,
    staged:objectiveRound.stagedAttackers.length,attackersDeployed:objectiveRound.prepAttackersDeployed,
    playerSpawn:{...world.spawn},
    defenderLevels:[...objectiveRound.allies,...objectiveRound.bots].filter(b=>b.stationary)
      .map(b=>({id:b.id,site:b.assignedSite?.id||null,y:b.y}))}},
  get drone(){return {active:drone.active,destroyed:drone.destroyed,
    health:drone.health,remaining:drone.remaining,actionMode:droneActionMode,
    position:drone.position,jammed:drone.jammed}},
  get combatErrors(){return {count:combatErrors,last:lastCombatError}},
  get aiHealth(){return objectiveRound.bots.filter(b=>b.alive).map(b=>({id:b.id,hp:b.health,x:b.x,z:b.z}))},
  get teams(){return {friendly:1+objectiveRound.allies.length+objectiveRound.stagedAttackers.length,
    enemy:objectiveRound.bots.length,alliesAlive:objectiveRound.allies.filter(b=>b.alive).length,
    enemiesAlive:objectiveRound.bots.filter(b=>b.alive).length}},
  get aiNavigation(){return objectiveRound.bots.filter(b=>b.alive).map(b=>({id:b.id,x:b.x,z:b.z,state:b.state,routeNodes:b.path?.length||0,blockingDoor:b.blockingBarricade?.id||null,repathAt:b.repathAt}))},
  get allyNavigation(){return objectiveRound.allies.filter(b=>b.alive).map(b=>({id:b.id,x:b.x,z:b.z,state:b.state,routeNodes:b.path?.length||0,blockingDoor:b.blockingBarricade?.id||null}))},
  get role(){return role},get position(){return [player.x,player.y,player.z]},
  get fps(){return fps},get weapon(){return {...weapons.current}},
  get scores(){return weapons.stats},get panels(){return world.panels.map(p=>({material:p.materialType,impacts:p.impacts,opening:p.openingWidth,reinforced:p.reinforced,destroyed:p.destroyed}))},
  get targets(){return world.targets.map(t=>({hp:t.health,alive:t.alive}))},
  get dynamicColliders(){return world.colliders.length},get collisionRevision(){return world.collisionRevision},
  get facility(){return {...world.facility.bounds,site:objectiveRound.siteId,
    map:world.mapId,sitePair:world.sitePairId,sites:world.facility.sites}},
  get sight(){return sight},
  get loadout(){return {...weapons.loadout}},
  get secondaryKit(){return gadgets.ordnanceStatus},
  get reinforcing(){return gadgets.busy},get barricading(){return barricades.busy},
  get barricades(){return barricades.info},get roundFrozen(){return roundFrozen},
  get bulletHoles(){return world.panels.map(p=>p.holes.length)},
  get ads(){return ads},get audioReady(){return audio.ready},
  get operator(){return {...operator}},get health(){return player.health},
  get round(){return {role,site:objectiveRound.siteId,phase:objectiveRound.phase,summary:objectiveRound.summary(clock()),bots:objectiveRound.bots.filter(b=>b.alive).length,prepUntil:objectiveRound.prepUntil,bombStations:Object.keys(objectiveRound.bombStations.items)}},
  get sightOrigin(){return gunOptics.aimPosition(weapons.slot==="secondary"?.78:1)}
};
