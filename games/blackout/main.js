import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import {buildRange} from "./src/world.js?v=flat-lab-02";
import {FirstPersonController} from "./src/player.js?v=flat-lab-02";
import {Weapons} from "./src/weapons.js?v=flat-lab-02";
import {Gadgets} from "./src/gadgets.js?v=flat-lab-02";

// BLACKOUT V0.2 - offline mechanics lab. No network/REDLINE dependencies.
const $=id=>document.getElementById(id);
const canvas=$("view"),menu=$("menu"),hud=$("gameHUD"),start=$("start"),reset=$("reset");
const status=$("status"),zoneLabel=$("zoneLabel"),objective=$("objective");
const stateReadout=$("stateReadout"),fpsReadout=$("fpsReadout"),debugPanel=$("debugPanel");
const positionReadout=$("positionReadout"),toast=$("toast"),hitmark=$("hitmark");
const weaponName=$("weaponName"),ammoCount=$("ammoCount"),reserveCount=$("reserveCount");
const combatStats=$("combatStats"),gadgetPrimary=$("gadgetPrimary"),gadgetSecondary=$("gadgetSecondary");
const gadgetInteract=$("gadgetInteract"),hudRole=$("hudRole"),selectedMode=$("selectedMode");
const rangeInfo=$("rangeInfo"),walkSlider=$("walkSlider"),sprintSlider=$("sprintSlider");
const mouseSlider=$("mouseSlider"),walkValue=$("walkValue"),sprintValue=$("sprintValue"),mouseValue=$("mouseValue");
const attackButton=$("attackRole"),defendButton=$("defendRole"),guide=$("guide");
let role="attacker";
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
const raycaster=new THREE.Raycaster(),keys=new Set(),effects=[];
const debugRoot=new THREE.Group();scene.add(debugRoot);
let last=performance.now(),frames=0,elapsed=0,fps=0;
let locked=false,started=false,debug=false,fireHeld=false,ads=false,hitUntil=0,toastUntil=0;
let menuGuide=false,lastEmptyClick=0,aimBlend=0,muzzleUntil=0;
let audioContext=null,noiseBuffer=null;
const clock=()=>performance.now();

function resize(){
  renderer.setSize(window.innerWidth,window.innerHeight,false);
  camera.aspect=window.innerWidth/Math.max(1,window.innerHeight);camera.updateProjectionMatrix();
}
window.addEventListener("resize",resize);resize();

const gunModel=new THREE.Group();camera.add(gunModel);
const mat=(c,metalness=.3)=>new THREE.MeshStandardMaterial({color:c,metalness,roughness:.55});
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
}
const muzzle=new THREE.PointLight(0xffb666,0,4,2);muzzle.position.set(0,-.02,-.95);
gunModel.add(muzzle);
const muzzleSprite=new THREE.Mesh(new THREE.SphereGeometry(.075,8,6),
  new THREE.MeshBasicMaterial({color:0xffdf8a,transparent:true,opacity:.9}));
muzzleSprite.position.copy(muzzle.position);gunModel.add(muzzleSprite);muzzleSprite.visible=false;
gunModel.position.set(.42,-.36,-.77);

function audioReady(){
  try {
    if(!audioContext){
      const C=window.AudioContext||window.webkitAudioContext;
      if(!C)return;
      audioContext=new C();
      const frames=Math.floor(audioContext.sampleRate*.14);
      noiseBuffer=audioContext.createBuffer(1,frames,audioContext.sampleRate);
      const buf=noiseBuffer.getChannelData(0);
      for(let i=0;i<frames;i++)buf[i]=(Math.random()*2-1)*Math.exp(-i/frames*6);
    }
    if(audioContext.state==="suspended")audioContext.resume().catch(()=>{});
  }catch{}
}
function sound(type="fire"){
  if(!audioContext||!noiseBuffer||audioContext.state!=="running")return;
  const t=audioContext.currentTime;
  const gain=audioContext.createGain(),filter=audioContext.createBiquadFilter();
  gain.gain.setValueAtTime(type==="fire"?.16:.07,t);
  gain.gain.exponentialRampToValueAtTime(.0001,t+(type==="fire"?.115:.085));
  filter.type="lowpass";filter.frequency.value=type==="fire"?1800:1100;
  const source=audioContext.createBufferSource();source.buffer=noiseBuffer;
  source.connect(filter);filter.connect(gain);gain.connect(audioContext.destination);
  source.start(t);source.stop(t+(type==="fire"?.13:.08));
  if(type==="fire"){
    const osc=audioContext.createOscillator(),bass=audioContext.createGain();
    osc.type="triangle";osc.frequency.setValueAtTime(128,t);
    osc.frequency.exponentialRampToValueAtTime(52,t+.09);
    bass.gain.setValueAtTime(.10,t);bass.gain.exponentialRampToValueAtTime(.0001,t+.095);
    osc.connect(bass);bass.connect(audioContext.destination);osc.start(t);osc.stop(t+.10);
  }
}
function popup(message,seconds=2.6){
  toast.textContent=message;toast.classList.add("shown");toastUntil=clock()+seconds*1000;
}
function showMenu(){
  locked=false;keys.clear();fireHeld=false;ads=false;
  document.body.classList.remove("playing");hud.classList.add("hidden");
  menu.classList.remove("hidden");
  if(started){start.textContent="RESUME TESTING";status.textContent="Training paused · select a role or resume.";}
}
function showGame(){
  locked=true;started=true;menu.classList.add("hidden");hud.classList.remove("hidden");
  document.body.classList.add("playing");
  popup("FLAT LAB ONLINE · MOVEMENT + WEAPONS + GADGETS",3.6);
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
  world.reset();gadgets.reset(role);weapons.reset();player.reset();keys.clear();
  hitUntil=0;popup("SIMULATION RESET");
  updateHud({sprinting:false,crouched:false,prone:false,lean:0,speed:0});
}
function setRole(r){
  role=r==="defender"?"defender":"attacker";
  attackButton.classList.toggle("active",role==="attacker");
  defendButton.classList.toggle("active",role==="defender");
  selectedMode.textContent=(role==="attacker"?"ATTACKER":"DEFENDER")+" MECHANICS";
  resetSimulation();
  status.textContent=(role==="attacker"?"Attacker: plant breach charges (G) and pulse scan (X).":
    "Defender: place shields (G), sensors (X), reinforce panels (F).");
}
attackButton.addEventListener("click",()=>setRole("attacker"));
defendButton.addEventListener("click",()=>setRole("defender"));
reset.addEventListener("click",()=>{resetSimulation();status.textContent="All targets and ammo reset.";});
for(const [el,target,key] of [[walkSlider,walkValue,"walk"],[sprintSlider,sprintValue,"sprint"]]){
  el.addEventListener("input",()=>{
    player.speeds[key]=Number(el.value);
    target.textContent=Number(el.value).toFixed(1)+" m/s";
  });
}
mouseSlider.addEventListener("input",()=>{mouseValue.textContent=Number(mouseSlider.value).toFixed(1)+"×";});
$("guideToggle").addEventListener("click",()=>{menuGuide=!menuGuide;guide.classList.toggle("hidden",!menuGuide);});

document.addEventListener("keydown",e=>{
  if(e.code==="F3"){e.preventDefault();debug=!debug;debugPanel.classList.toggle("hidden",!debug);return;}
  if(!locked)return;
  if(["KeyW","KeyA","KeyS","KeyD","ShiftLeft","ShiftRight","ControlLeft","ControlRight",
      "KeyC","KeyQ","KeyE","KeyR","KeyF","KeyG","KeyX","KeyZ","Digit1","Digit2","Space"].includes(e.code))
    e.preventDefault();
  keys.add(e.code);
  if(e.repeat)return;
  if(e.code==="Digit1"||e.code==="Digit2"){
    weapons.equip(e.code==="Digit1"?"primary":"secondary");popup(weapons.current.name);
  }else if(e.code==="KeyR"){
    popup(weapons.reload(clock())?"RELOADING "+weapons.current.name:"CANNOT RELOAD",1.2);
  }else if(e.code==="KeyZ"){
    player.toggleProne();
  }else if(e.code==="KeyG"){
    const r=gadgets.main(camera,player,clock());popup(r.message);if(r.ok)sound("click");
  }else if(e.code==="KeyX"){
    const r=gadgets.secondary(camera,player,clock());popup(r.message);if(r.ok)sound("click");
  }else if(e.code==="KeyF"){
    const r=gadgets.interact(camera);popup(r.message);if(r.ok)sound("click");
  }
});
document.addEventListener("keyup",e=>keys.delete(e.code));
document.addEventListener("mousemove",e=>{
  if(locked)player.look(e.movementX||0,e.movementY||0,.0022*Number(mouseSlider.value)*(ads?.65:1));
});
canvas.addEventListener("mousedown",e=>{
  if(!locked)return;
  audioReady();
  if(e.button===0){fireHeld=true;fireOnce(clock());}
  if(e.button===2)ads=true;
});
window.addEventListener("mouseup",e=>{if(e.button===0)fireHeld=false;if(e.button===2)ads=false;});
canvas.addEventListener("contextmenu",e=>e.preventDefault());

function impact(point,color=0xffc16c,size=.08){
  const obj=new THREE.Mesh(new THREE.SphereGeometry(size,6,5),
    new THREE.MeshBasicMaterial({color,transparent:true,opacity:1}));
  obj.position.copy(point);scene.add(obj);effects.push({obj,until:clock()+300});
}
function fireOnce(now){
  const shot=weapons.tryFire(now,ads,!player.sprinting);
  if(!shot.ok){
    if(shot.why==="empty"&&now-lastEmptyClick>600){sound("click");lastEmptyClick=now;popup("MAGAZINE EMPTY · R TO RELOAD",1);}
    return;
  }
  sound("fire");muzzleUntil=now+48;
  // Spread offsets the center ray, not the player's movement direction.
  const spread=shot.spread,aim={x:(Math.random()-.5)*spread*2,y:(Math.random()-.5)*spread*2};
  raycaster.setFromCamera(aim,camera);raycaster.far=shot.range;
  // Dead targets and breached panels should not continue intercepting shots.
  const hits=raycaster.intersectObjects(world.shootables.filter(o=>{
    const info=o.userData;if(info.kind==="panel")return !info.panel.destroyed;
    if(info.kind==="target")return info.target.alive;
    if(info.kind==="shield")return info.shield.group.parent!==null;
    return true;
  }),false);
  if(hits.length){
    const h=hits[0],info=h.object.userData;
    if(info.kind==="target"){
      const head=info.hitZone==="head";
      const kill=info.target.damage(head?shot.headDamage:shot.damage);
      weapons.registerHit(kill);
      hitUntil=now+170;
      popup(head?(kill?"HEADSHOT · TARGET DOWN":"HEADSHOT"):(kill?"TARGET DOWN":"TARGET HIT"),.7);
      impact(h.point,head?0xf8e3a0:0x6dffe1,.11);
    }else if(info.kind==="panel"){
      const destroyed=info.panel.damage(shot.damage);
      popup(info.panel.reinforced?"REINFORCED · NO PENETRATION":
        destroyed?"PANEL DESTROYED":"SOFT PANEL HIT",.65);
      impact(h.point,0xffa16a);
    }else{
      impact(h.point,info.kind==="shield"?0x8bf8ff:0xa4b6b7);
      if(info.kind==="shield")popup("SHIELD BLOCKED SHOT",.65);
    }
  }
  // Camera's positive pitch looks UP in Three.js; recoil is positive.
  player.pitch=Math.min(1.37,player.pitch+shot.recoil*(ads?.7:1.25));
  player.applyCamera();
}
function updateHud(report){
  zoneLabel.textContent="FLAT MECHANICS LAB";
  objective.textContent=weapons.stats.kills+" / "+world.targets.length+" TARGETS";
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
  gadgetInteract.textContent=role==="defender"?`F · REINFORCE [${gadgets.counts.reinforce}]`:"F · INSPECT (DEFEND ONLY)";
  hudRole.textContent=role.toUpperCase();
  rangeInfo.textContent=report.speed.toFixed(1)+" m/s";
  if(debug){
    positionReadout.style.whiteSpace="pre-line";
    positionReadout.textContent=`POS ${player.x.toFixed(2)}, ${player.y.toFixed(2)}, ${player.z.toFixed(2)}
YAW ${player.yaw.toFixed(2)} / PITCH ${player.pitch.toFixed(2)}
SPEED ${report.speed.toFixed(2)}m/s / ${stateReadout.textContent}
DYNAMIC COLLIDERS ${world.colliders.length} / TARGETS ${world.targets.filter(t=>t.alive).length}`;
  }
}
function frame(now){
  const actualDt=Math.max(0,(now-last)/1000),dt=Math.min(actualDt,.043);last=now;
  frames++;elapsed+=actualDt;
  if(elapsed>=.6){fps=Math.round(frames/elapsed);frames=0;elapsed=0;}
  weapons.tick(now);
  if(locked){
    // ADS reduces the move speed by removing sprint; it does NOT
    // toggle mouse-lock or turn the gun into a third-person camera.
    const activeKeys=ads?new Set([...keys].filter(k=>k!=="ShiftLeft"&&k!=="ShiftRight")):keys;
    const report=player.update(dt,activeKeys);
    if(Math.abs(player.x)>117||Math.abs(player.z)>117){player.reset();popup("RANGE LIMIT · RETURNED TO START");}
    if(fireHeld&&(weapons.slot==="primary"))fireOnce(now);
    gadgets.tick(now,player,popup);
    updateHud(report);
  }
  if(toastUntil&&now>toastUntil){toastUntil=0;toast.classList.remove("shown");}
  hitmark.classList.toggle("shown",now<hitUntil);
  muzzle.intensity=now<muzzleUntil?2.5:0;muzzleSprite.visible=now<muzzleUntil;
  aimBlend+=(Number(locked&&ads)-aimBlend)*Math.min(1,dt*13);
  camera.fov=80-aimBlend*25;camera.updateProjectionMatrix();
  gunModel.position.x+=( (aimBlend?.02:.42)-gunModel.position.x)*Math.min(1,dt*13);
  gunModel.position.y+=((- .36+aimBlend*.16)-gunModel.position.y)*Math.min(1,dt*13);
  gunModel.position.z+=((- .77+aimBlend*.16)-gunModel.position.z)*Math.min(1,dt*13);
  gunModel.scale.setScalar(weapons.slot==="secondary"?.78:1);
  for(let i=effects.length-1;i>=0;i--){
    const e=effects[i];if(now>=e.until){scene.remove(e.obj);e.obj.geometry.dispose();e.obj.material.dispose();effects.splice(i,1);}
  }
  renderer.render(scene,camera);requestAnimationFrame(frame);
}
setRole("attacker");
hud.classList.add("hidden");noticeReady();requestAnimationFrame(frame);
function noticeReady(){status.textContent="Choose a role, adjust speeds, then enter the flat test range.";}
window.BLACKOUT_DEV={
  get build(){return "0.2.0-flat-lab"},
  get role(){return role},get position(){return [player.x,player.y,player.z]},
  get fps(){return fps},get weapon(){return {...weapons.current}},
  get scores(){return weapons.stats},get panels(){return world.panels.map(p=>({hp:p.hp,reinforced:p.reinforced,destroyed:p.destroyed}))},
  get targets(){return world.targets.map(t=>({hp:t.health,alive:t.alive}))},
  get dynamicColliders(){return world.colliders.length}
};
