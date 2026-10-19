import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import {buildRange} from "./src/world.js?v=blackout-v093-shield-ai-routing";
import {FirstPersonController} from "./src/player.js?v=blackout-v093-shield-ai-routing";
import {Weapons} from "./src/weapons.js?v=blackout-v093-shield-ai-routing";
import {Gadgets} from "./src/gadgets.js?v=blackout-v093-shield-ai-routing";
import {createWeaponOptics} from "./src/weapon-optics.js?v=blackout-v093-shield-ai-routing";
import {OPERATORS,operatorsForSide,defaultOperator} from "./src/operators.js?v=blackout-v093-shield-ai-routing";
import {ObjectiveDrill} from "./src/objective.js?v=blackout-v093-shield-ai-routing";
import {GameAudio} from "./src/audio.js?v=blackout-v093-shield-ai-routing";
import {createWeaponView} from "./src/weapon-view.js?v=blackout-v093-shield-ai-routing";
import {Barricades} from "./src/barricades.js?v=blackout-v093-shield-ai-routing";

// BLACKOUT V0.2 - offline mechanics lab. No network/REDLINE dependencies.
const $=id=>document.getElementById(id);
const canvas=$("view"),menu=$("menu"),hud=$("gameHUD"),start=$("start"),reset=$("reset");
const status=$("status"),zoneLabel=$("zoneLabel"),objective=$("objective");
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
const healthFill=$("healthFill"),matchCaption=$("matchCaption"),defuserInventory=$("defuserInventory");
const operatorHud=$("operatorHud"),healthHud=$("healthHud");
const objectiveHint=$("objectiveHint"),objectiveProgress=$("objectiveProgress");
const objectiveAction=$("objectiveAction"),objectiveFill=$("objectiveFill"),roundResult=$("roundResult");
const attackButton=$("attackRole"),defendButton=$("defendRole"),guide=$("guide");
const sightSelect=$("sightSelect"),reticle=$("reticle");
const reinforceBar=$("reinforceBar"),reinforceFill=$("reinforceFill");
const reinforceCountdown=$("reinforceCountdown"),reinforceTitle=$("reinforceTitle");
const SIGHTS=["holo-a","holo-b","red-dot","iron"];
const SIGHT_NAMES={"holo-a":"HOLO A","holo-b":"HOLO B","red-dot":"RED DOT","iron":"IRON"};
let sight="holo-a";
let role="attacker";
let operator=defaultOperator(role);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.23;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(80,1,.045,360);scene.add(camera);
const world=buildRange(THREE,scene);
const player=new FirstPersonController(THREE,world,camera);
const weapons=new Weapons();
const gadgets=new Gadgets(THREE,world,scene);
const barricades=new Barricades(THREE,world,scene,world.facility.openings);
world.barricades=barricades;
const objectiveRound=new ObjectiveDrill(THREE,world,scene);
const raycaster=new THREE.Raycaster(),keys=new Set(),effects=[];
const debugRoot=new THREE.Group();scene.add(debugRoot);
let last=performance.now(),frames=0,elapsed=0,fps=0;
let locked=false,started=false,debug=false,fireHeld=false,ads=false,hitUntil=0,toastUntil=0;
let menuGuide=false,lastEmptyClick=0,aimBlend=0,muzzleUntil=0;
let gunKick=0,gunKickSide=0,lastShotAt=0,recoilRecovery=0,lastStepMark=0;
let roundFrozen=false,lastEndFrame=0,lastHudAt=0,lastPhaseLabel="",phaseToastUntil=0;
let combatErrors=0,lastCombatError="",lastRuntimeReportAt=0;
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
  gadgets.cancelAction();barricades.cancel();
  document.body.classList.remove("playing","ads");hud.classList.add("hidden");
  menu.classList.remove("hidden");
  if(started){start.textContent="RESUME TESTING";status.textContent="Training paused · select a role or resume.";}
}
function showGame(){
  locked=true;started=true;menu.classList.add("hidden");hud.classList.remove("hidden");
  objectiveRound.resume(clock());
  if(objectiveRound.phase==="ready")objectiveRound.start(clock());
  lastPhaseLabel="";phaseToastUntil=clock()+1500;
  document.body.classList.add("playing");
  popup("SITE "+objectiveRound.siteId+" OBJECTIVE ROUND ONLINE · "+role.toUpperCase(),2.5);
  sound("round-start");
}
async function lockMouse(){
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
  objectiveRound.reset(role);world.reset();gadgets.reset(role);barricades.reset(role);weapons.reset();weaponView.reset();
  roundFrozen=false;lastHudAt=0;lastEndFrame=0;lastPhaseLabel="";phaseToastUntil=0;
  world.spawn.x=role==="defender"?objectiveRound.site.x:0;
  world.spawn.z=role==="defender"?objectiveRound.site.z+(objectiveRound.siteId==="A"?4:2):16;
  world.spawn.yaw=role==="defender"?Math.PI:0;
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
  operatorPreviewName.textContent=selected.name;
  operatorPreviewDescription.textContent=selected.description;
  operatorPreviewPerk.textContent=selected.specialty+" // "+selected.passive;
  operatorPreviewIcon.textContent=selected.sigil;
  operatorPreviewIcon.style.color=selected.accent;
  operatorSpeed.textContent="SPEED "+"●".repeat(selected.speed)+"○".repeat(3-selected.speed);
  operatorArmor.textContent="ARMOR "+"●".repeat(selected.armor)+"○".repeat(3-selected.armor);
  operatorKit.textContent=selected.side==="attacker"?
    selected.kit.breach+" BREACH · "+selected.kit.scan+" RECON":
    selected.kit.shield+" SHIELDS · "+selected.kit.sensor+" SENSORS";
  for(const card of operatorCards.querySelectorAll("button[data-operator]")){
    const active=card.dataset.operator===selected.id;
    card.classList.toggle("selected",active);
    card.setAttribute("aria-pressed",String(active));
  }
  resetSimulation();
  status.textContent=selected.name+" READY · FIXED OPERATOR SPEED AND HEALTH";
}
function setRole(r){
  role=r==="defender"?"defender":"attacker";
  attackButton.classList.toggle("active",role==="attacker");
  defendButton.classList.toggle("active",role==="defender");
  selectedMode.textContent=role==="attacker"?"ATTACKER · PLANT AT EITHER SITE":"DEFENDER · PROTECT BOTH SITES";
  operatorSelect.replaceChildren();
  for(const spec of operatorsForSide(role)){
    const option=document.createElement("option");option.value=spec.id;
    option.textContent=spec.name+" · "+spec.speed+" SPEED / "+spec.armor+" ARMOR · "+spec.health+" HP";
    operatorSelect.appendChild(option);
  }
  renderOperatorCards();
  chooseOperator(defaultOperator(role).id);
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
attackButton.addEventListener("click",()=>setRole("attacker"));
defendButton.addEventListener("click",()=>setRole("defender"));
reset.addEventListener("click",()=>{resetSimulation();status.textContent="All targets and ammo reset.";});
operatorSelect.addEventListener("change",()=>chooseOperator(operatorSelect.value));
siteSelect.addEventListener("change",()=>{
  objectiveRound.chooseSite(siteSelect.value);resetSimulation();
  selectedMode.textContent=role==="attacker"?"ATTACKER · PLANT AT EITHER SITE":"DEFENDER · PROTECT BOTH SITES";
  status.textContent="INSERTION FOCUS · SITE "+objectiveRound.siteId+" · BOTH SITES REMAIN LIVE";
});
mouseSlider.addEventListener("input",()=>{mouseValue.textContent=Number(mouseSlider.value).toFixed(1)+"×";});
$("guideToggle").addEventListener("click",()=>{menuGuide=!menuGuide;guide.classList.toggle("hidden",!menuGuide);});

document.addEventListener("keydown",e=>{
  if(e.code==="F3"){e.preventDefault();debug=!debug;debugPanel.classList.toggle("hidden",!debug);return;}
  if(!locked)return;
  if((objectiveRound.phase==="won"||objectiveRound.phase==="lost")){
    if(e.code==="Enter"){e.preventDefault();resetSimulation();objectiveRound.start(clock());popup("NEW ROUND · SITE "+objectiveRound.siteId);}
    return;
  }
  if(["KeyW","KeyA","KeyS","KeyD","ShiftLeft","ShiftRight","ControlLeft","ControlRight",
      "KeyC","KeyQ","KeyE","KeyR","KeyF","KeyG","KeyX","KeyZ","KeyV","Digit1","Digit2","Space","AltLeft","AltRight"].includes(e.code))
    e.preventDefault();
  keys.add(e.code);
  if(e.repeat)return;
  if(gadgets.busy||barricades.busy)return;
  if(e.code==="KeyV"){
    setSight(SIGHTS[(SIGHTS.indexOf(sight)+1)%SIGHTS.length]);
    popup("SIGHT SELECTED · "+SIGHT_NAMES[sight],1.1);
  }else if(e.code==="Digit1"||e.code==="Digit2"){
    weapons.equip(e.code==="Digit1"?"primary":"secondary");sound("equip");popup(weapons.current.name);
  }else if(e.code==="KeyR"){
    const reloading=weapons.reload(clock());
    if(reloading){sound("reload");weaponView.beginReload(clock(),weapons.slot,weapons.current.reload);}
    popup(reloading?"RELOADING "+weapons.current.name:"CANNOT RELOAD",1.2);
  }else if(e.code==="KeyZ"){
    player.toggleProne();
  }else if(e.code==="Space"){
    if(barricades.vault(player,clock())){sound("step");popup("WINDOW VAULT");}
  }else if(e.code==="KeyG"){
    const r=gadgets.main(camera,player,clock());popup(r.message);if(r.ok)sound("click");
  }else if(e.code==="KeyX"){
    const r=gadgets.secondary(camera,player,clock());popup(r.message);if(r.ok)sound("click");
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
  if(locked&&!gadgets.busy)player.look(e.movementX||0,e.movementY||0,.0022*Number(mouseSlider.value)*(ads?.65:1));
});
canvas.addEventListener("mousedown",e=>{
  if(!locked||gadgets.busy||barricades.busy||["won","lost"].includes(objectiveRound.phase))return;
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
function fireOnce(now){
  try{return fireOnceSafe(now);}catch(err){
    // Do not forcibly turn full-auto into semi-auto after a bad hit event.
    // A shot error is reported, but the trigger remains held until mouseup.
    reportCombatError("FIRE",err);
  }
}
function fireOnceSafe(now){
  if(objectiveRound.phase==="won"||objectiveRound.phase==="lost"||barricades.busy||
    objectiveRound.canInteract(player)&&keys.has("KeyF"))return;
  // Do not grant laser-accurate ADS while the actual sight is still moving
  // into position. Once aligned, the 3D reticle and the shot share the ray.
  const sightAligned=ads&&aimBlend>=.93;
  const shot=weapons.tryFire(now,sightAligned,!player.sprinting);
  if(!shot.ok){
    if(shot.why==="empty"&&now-lastEmptyClick>600){sound("click");lastEmptyClick=now;popup("MAGAZINE EMPTY · R TO RELOAD",1);}
    return;
  }
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
  // Trace all real ray intersections in order, so the actual wall hole
  // and the bullet's collision behavior share a world-space position.
  const hits=raycaster.intersectObjects(world.shootables.filter(o=>{
    const info=o.userData||{};
    if(info.kind==="panel")return !info.panel.destroyed;
    if(info.kind==="target")return info.target.alive;
    if(info.kind==="bot")return info.bot.alive;
    if(info.kind==="barricade")return !info.plank.broken;
    if(info.kind==="shield")return info.shield.group.parent!==null;
    return true;
  }),false);
  let penetration=1;
  for(const h of hits){
    const info=h.object.userData||{};
    if(info.kind==="panel"){
      if(info.panel.reinforced||!info.perforated){
        popup(info.panel.reinforced?"REINFORCED PANEL · BLOCKED":"FRAME · SHOT BLOCKED",.65);
        impact(h.point,0x9badb7);break;
      }
      // Creating a new hole lets this first round through too. Later
      // bullets follow existing apertures, with reduced downstream damage.
      if(info.panel.bulletHole(h.point)){
        penetration*=.68;
        popup("SOFT WALL · BULLET HOLE / PENETRATION",.65);
        continue;
      }
      impact(h.point,0xc58b56);break;
    }
    if(info.kind==="barricade"){
      const destroyed=barricades.hit(info.plank,shot.damage);
      sound("impact");
      if(destroyed)popup("BARRICADE PLANK DESTROYED",.65);
      impact(h.point,0xbd9160,.06);
      break;
    }
    if(info.kind==="bot"){
      const head=info.hitZone==="head",base=head?shot.headDamage:shot.damage;
      const kill=info.bot.damage(Math.max(1,Math.round(base*penetration)));
      weapons.registerHit(kill);hitUntil=now+170;
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
  const climb=shot.recoil*(ads?.79:1.03);
  player.pitch=Math.min(1.37,player.pitch+climb);
  player.yaw+=(Math.random()-.5)*shot.recoil*.27;
  recoilRecovery=Math.min(.085,recoilRecovery+climb*.48);
  lastShotAt=now;
  gunKick=Math.min(.075,gunKick+.028);
  gunKickSide=Math.max(-.026,Math.min(.026,gunKickSide+(Math.random()-.5)*.011));
  player.applyCamera();
}
// All match widgets are calculated from actual PvE round state (no fake 5v5 slots).
function drawTacticalHud(now){
  const round=objectiveRound;
  const phase=round.phase;
  const phaseName=phase==="prep"?"PREPARATION":phase==="planted"?"DEFUSER ACTIVE":
    phase==="attack"||phase==="guard"?"ACTION PHASE":
    phase==="won"?"ROUND WON":phase==="lost"?"ROUND LOST":"OPERATOR SELECT";
  const clockMs=round.clockEnd?Math.max(0,round.clockEnd-now):0;
  const seconds=Math.ceil(clockMs/1000);
  matchClock.textContent=String(Math.floor(seconds/60))+":"+String(seconds%60).padStart(2,"0");
  matchClock.classList.toggle("warning",seconds<=15&&seconds>0);
  phaseText.textContent=phaseName;
  matchScore.textContent=round.score.attacker+" — "+round.score.defender;
  // The offline build has one human and two or three simulated opponents.
  // Never show nonexistent live teammates.
  const enemy=round.bots;
  const playerAlive=player.health>0;
  const onePip='<span class="bo-player-pip'+(playerAlive?"":" down")+'" title="Your operator">◆</span>';
  const enemyPips=enemy.length?
    enemy.map(b=>'<span class="bo-player-pip'+(b.alive?"":" down")+'" title="Training hostile">'+(b.alive?"●":"×")+'</span>').join(""):
    '<span class="bo-player-pip" title="Opponents deploy after preparation">·</span>';
  if(role==="attacker"){friendlySlots.innerHTML=onePip;enemySlots.innerHTML=enemyPips;}
  else{enemySlots.innerHTML=onePip;friendlySlots.innerHTML=enemyPips;}
  // During attack, show the nearest of BOTH live bomb locations. Once
  // planted the compass locks to the actual planted defuser location.
  const options=Object.values(round.sites);
  const focusedSite=role==="attacker"&&phase!=="planted"?
    options.reduce((a,b)=>Math.hypot(b.x-player.x,b.z-player.z)<
      Math.hypot(a.x-player.x,a.z-player.z)?b:a):
    round.site;
  const dest=phase==="planted"&&round.plantPosition||focusedSite;
  const dx=dest.x-player.x,dz=dest.z-player.z;
  const distance=Math.round(Math.hypot(dx,dz));
  const angle=(Math.atan2(dx,-dz)+player.yaw)*180/Math.PI;
  bombArrow.style.transform="rotate("+angle.toFixed(1)+"deg)";
  bombRange.textContent=(phase==="planted"?"DEFUSER ":"BOMB ")+focusedSite.id+" · "+distance+"M";
  bombGuide.textContent=phase==="planted"?
    role==="attacker"?"PROTECT DEFUSER":"DISABLE DEFUSER":
    phase==="prep"?"SCOUT / FORTIFY":
    role==="attacker"?"LOCATE & PLANT":"PROTECT THE BOMBS";
  matchCaption.textContent="SITE "+round.siteId+" · "+round.site.name+" · "+phaseName;
  defuserInventory.textContent=role==="attacker"?
    phase==="planted"?"DEFUSER DEPLOYED":"DEFUSER CARRIED":
    "DEFEND BOMB STATION";
  healthFill.style.width=Math.max(0,player.health/player.maxHealth*100).toFixed(1)+"%";
  healthFill.classList.toggle("danger",player.health<=player.maxHealth*.35);
  if(phase!==lastPhaseLabel){
    lastPhaseLabel=phase;
    phaseToastUntil=now+(phase==="prep"?20000:phase==="attack"||phase==="guard"?3300:0);
  }
  const show=phase==="prep"||now<phaseToastUntil&&
    (phase==="attack"||phase==="guard");
  phaseAnnounce.classList.toggle("hidden",!show);
  if(show){
    phaseAnnounceEyebrow.textContent="ROUND "+round.roundNumber+" · "+
      (role==="attacker"?"ATTACKERS":"DEFENDERS");
    phaseAnnounceTitle.textContent=phase==="prep"?"PREPARATION PHASE":"ACTION PHASE";
    phaseAnnounceHelp.textContent=phase==="prep"?
      role==="defender"?"FORTIFY DOORWAYS AND PROTECT THE BOMB":
      "SCOUT THE BUILDING · PLAN YOUR ATTACK":
      role==="attacker"?"LOCATE THE BOMB · PLANT YOUR DEFUSER":
      "ELIMINATE ATTACKERS · DENY THE PLANT";
  }
}
function updateHud(report){
  drawTacticalHud(clock());
  zoneLabel.textContent=world.zoneAt(player.x,player.z).toUpperCase();
  objective.textContent=objectiveRound.summary(clock());
  roundScore.textContent=`ROUND ${objectiveRound.roundNumber} · ATK ${objectiveRound.score.attacker} : ${objectiveRound.score.defender} DEF`;
  objectiveHint.textContent=objectiveRound.hint;
  const progressing=objectiveRound.hold>0;
  objectiveProgress.classList.toggle("hidden",!progressing);
  objectiveAction.textContent=role==="attacker"?"PLANTING DEFUSER":"DISABLING DEFUSER";
  objectiveFill.style.width=objectiveRound.holdPercent.toFixed(1)+"%";
  const ended=objectiveRound.phase==="won"||objectiveRound.phase==="lost";
  roundResult.classList.toggle("hidden",!ended);
  roundResult.textContent=ended?(objectiveRound.phase==="won"?"VICTORY":"DEFEAT")+" · "+objectiveRound.result+" · ENTER: NEXT ROUND / ESC: MENU":"";
  roundResult.classList.toggle("lost",objectiveRound.phase==="lost");
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
  gadgetPrimary.textContent=`G · ${detail.g} [${gadgets.counts.g}]`;
  gadgetSecondary.textContent=`X · ${detail.x} [${gadgets.counts.x}]`;
  const nearbyOpening=barricades.nearest(player,2.7);
  gadgetInteract.textContent=objectiveRound.canInteract(player)?
    (role==="attacker"?"F · HOLD TO PLANT":"F · HOLD TO DISABLE"):
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
BOT ROUTES ${objectiveRound.bots.filter(b=>b.alive).map(b=>b.id+":"+(b.blockingBarricade?"BREACH "+b.blockingBarricade.id:b.state)+" ["+(b.path?.length||0)+"]").join(" / ")||"NO BOTS"}`;
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
  const ended=["won","lost"].includes(objectiveRound.phase);
  if(!ended)weapons.tick(now);
  if(locked&&!ended){
    // ADS reduces the move speed by removing sprint; it does NOT
    // toggle mouse-lock or turn the gun into a third-person camera.
    const activeKeys=gadgets.busy||barricades.busy?new Set():ads?
      new Set([...keys].filter(k=>k!=="ShiftLeft"&&k!=="ShiftRight")):keys;
    if(gadgets.busy||barricades.busy){player.velX=0;player.velZ=0;}
    const report=player.update(dt,activeKeys);
    const mark=Math.floor(player.stepClock/Math.PI);
    if(player.moving&&!player.isProne&&report.speed>.65&&mark!==lastStepMark){
      sound(player.sprinting?"run-step":"step");
      objectiveRound.onNoise(player.x,player.z,player.sprinting?9:report.slow?2.3:4.5,now);
    }
    lastStepMark=mark;
    if(now-lastShotAt>140&&recoilRecovery>0){
      const recover=Math.min(recoilRecovery,dt*.072);
      player.pitch=Math.max(-1.37,player.pitch-recover);
      recoilRecovery-=recover;player.applyCamera();
    }
    if(Math.abs(player.x)>117||Math.abs(player.z)>117){player.reset();popup("RANGE LIMIT · RETURNED TO START");}
    if(fireHeld&&!gadgets.busy&&!barricades.busy&&
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
    gadgets.tick(now,player,(message,event)=>{
      if(event==="proximity-beep")proximityAlarm();
      else if(message)popup(message);
    },objectiveRound.bots);
    barricades.tick(now,keys.has("KeyF"),player,(message,event)=>{
      if(message)popup(message);
      if(event)sound(event);
    });
    objectiveRound.update(now,dt,player,keys.has("KeyF")&&!gadgets.busy&&!barricades.busy,(message,event,origin)=>{
      if(message)popup(message);
      if(event&&origin&&audio.ready)audio.playAt(event,origin.x,origin.z,player.x,player.z,player.yaw);
      else if(event)sound(event);
    });
    const installing=gadgets.busy||barricades.busy;
    reinforceBar.classList.toggle("hidden",!installing);
    if(installing){
      const action=barricades.action||gadgets.action;
      const remaining=Math.max(0,(action.end-now)/1000);
      reinforceTitle.textContent=barricades.busy?
        (barricades.action.kind==="install"?"INSTALLING BARRICADE":"REMOVING BARRICADE"):
        "INSTALLING REINFORCEMENT";
      reinforceFill.style.width=((barricades.busy?barricades.progress:gadgets.actionProgress)*100).toFixed(1)+"%";
      reinforceCountdown.textContent=remaining.toFixed(1)+"S";
    }
    if(now-lastHudAt>90||["won","lost"].includes(objectiveRound.phase)){
      lastHudAt=now;updateHud(report);
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
  muzzle.position.z=weapons.slot==="secondary"?-.73:-1.15;
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
  gunOptics.mount.visible=weapons.slot==="primary"&&!interacting;
  if(!ended)weaponView.update({now,dt,slot:weapons.slot,aim:aimBlend,moving:player.moving,
    sprinting:player.sprinting,step:player.stepClock,lean:player.lean,
    interacting,interactionProgress:objectiveRound.holdPercent/100});
  gunKick*=Math.exp(-dt*14);
  gunKickSide*=Math.exp(-dt*14);
  for(let i=effects.length-1;i>=0;i--){
    const e=effects[i];if(now>=e.until){scene.remove(e.obj);e.obj.geometry.dispose();e.obj.material.dispose();effects.splice(i,1);}
  }
  // A dead or paused round is visually static: avoid burning a full render
  // every vsync while preserving responsive HTML menu and result controls.
  const renderInterval=ended?160:locked?0:160;
  if(!renderInterval||now-lastEndFrame>=renderInterval){
    renderer.render(scene,camera);lastEndFrame=now;
  }
}
setRole("attacker");
hud.classList.add("hidden");noticeReady();requestAnimationFrame(frame);
function noticeReady(){status.textContent="Choose a side and operator, then enter the Site A objective test.";}
window.BLACKOUT_DEV={
  get build(){return "0.9.3-shield-placement-ai-barricade-breaching"},
  get combatErrors(){return {count:combatErrors,last:lastCombatError}},
  get aiHealth(){return objectiveRound.bots.filter(b=>b.alive).map(b=>({id:b.id,hp:b.health,x:b.x,z:b.z}))},
  get aiNavigation(){return objectiveRound.bots.filter(b=>b.alive).map(b=>({id:b.id,x:b.x,z:b.z,state:b.state,routeNodes:b.path?.length||0,blockingDoor:b.blockingBarricade?.id||null,repathAt:b.repathAt}))},
  get role(){return role},get position(){return [player.x,player.y,player.z]},
  get fps(){return fps},get weapon(){return {...weapons.current}},
  get scores(){return weapons.stats},get panels(){return world.panels.map(p=>({hp:p.hp,reinforced:p.reinforced,destroyed:p.destroyed}))},
  get targets(){return world.targets.map(t=>({hp:t.health,alive:t.alive}))},
  get dynamicColliders(){return world.colliders.length},get collisionRevision(){return world.collisionRevision},
  get facility(){return {...world.facility.bounds,site:objectiveRound.siteId}},
  get sight(){return sight},
  get reinforcing(){return gadgets.busy},get barricading(){return barricades.busy},
  get barricades(){return barricades.info},get roundFrozen(){return roundFrozen},
  get bulletHoles(){return world.panels.map(p=>p.holes.length)},
  get ads(){return ads},get audioReady(){return audio.ready},
  get operator(){return {...operator}},get health(){return player.health},
  get round(){return {role,site:objectiveRound.siteId,phase:objectiveRound.phase,summary:objectiveRound.summary(clock()),bots:objectiveRound.bots.filter(b=>b.alive).length,prepUntil:objectiveRound.prepUntil,bombStations:Object.keys(objectiveRound.bombStations.items)}},
  get sightOrigin(){return gunOptics.aimPosition(weapons.slot==="secondary"?.78:1)}
};
