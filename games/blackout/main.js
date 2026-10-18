import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { buildAnnex } from "./src/world.js?v=blackout-v01-annex-1";
import { FirstPersonController } from "./src/player.js?v=blackout-v01-annex-1";

// Stage 1 intentionally has no weapon or multiplayer. REDLINE stays isolated.
const $=id=>document.getElementById(id);
const canvas=$("view"),menu=$("menu"),hud=$("gameHUD"),start=$("start"),reset=$("reset");
const status=$("status"),zoneLabel=$("zoneLabel"),objective=$("objective");
const stateReadout=$("stateReadout"),fpsReadout=$("fpsReadout"),debugPanel=$("debugPanel");
const positionReadout=$("positionReadout"),toast=$("toast");
const minimap=$("minimap"),ctx=minimap.getContext("2d");
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.24;
renderer.setClearColor(0x080e17,1);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(79,1,.055,120);
const world=buildAnnex(THREE,scene);
const player=new FirstPersonController(THREE,world,camera);
const keys=new Set(),zones=new Set();
const debugRoot=new THREE.Group();scene.add(debugRoot);
let debug=false,frames=0,frameTime=0,reportedFPS=0,last=performance.now(),time=0;
let completed=false,toastUntil=0,hadStarted=false;
let pointerLocked=false;

function resize(){
  const w=window.innerWidth,h=window.innerHeight;
  renderer.setSize(w,h,false);
  camera.aspect=w/Math.max(1,h);
  camera.updateProjectionMatrix();
}
window.addEventListener("resize",resize);resize();

function notice(message){status.textContent=message;}
function showToast(message,seconds=3){
  toast.textContent=message;
  toast.classList.add("shown");
  toastUntil=performance.now()+seconds*1000;
}
function showMenu(){
  pointerLocked=false;keys.clear();document.body.classList.remove("playing");
  hud.classList.add("hidden");
  menu.classList.remove("hidden");
  if(hadStarted){start.innerHTML="RESUME TRAINING <span>→</span>";notice("Simulation paused · click RESUME TRAINING to continue.");}
}
function showGame(){
  pointerLocked=true;hadStarted=true;
  menu.classList.add("hidden");
  hud.classList.remove("hidden");
  document.body.classList.add("playing");
  showToast("TRAINING ACTIVE · EXPLORE ALL 4 ZONES");
}
async function lockMouse(){
  try {
    await canvas.requestPointerLock();
    if(document.pointerLockElement!==canvas)notice("Pointer lock was not granted. Click ENTER TRAINING again.");
  }catch(err){notice("Mouse lock unavailable: "+String(err?.message||err));}
}
start.addEventListener("click",lockMouse);
reset.addEventListener("click",()=>{
  player.reset();zones.clear();completed=false;
  notice("Position and training progress reset.");
});
document.addEventListener("pointerlockchange",()=>{
  if(document.pointerLockElement===canvas)showGame();
  else showMenu();
});
document.addEventListener("pointerlockerror",()=>{
  notice("Browser blocked pointer lock. Allow mouse access for this tab.");
});
window.addEventListener("blur",()=>{keys.clear();if(document.pointerLockElement===canvas)document.exitPointerLock();});
document.addEventListener("keydown",event=>{
  if(event.code==="F3"){
    event.preventDefault();
    debug=!debug;
    debugPanel.classList.toggle("hidden",!debug);
    debugRoot.visible=debug;
    return;
  }
  if(!pointerLocked)return;
  if(["KeyW","KeyA","KeyS","KeyD","ShiftLeft","ShiftRight","ControlLeft",
      "ControlRight","KeyC","KeyQ","KeyE","Space"].includes(event.code))
    event.preventDefault();
  keys.add(event.code);
});
document.addEventListener("keyup",event=>keys.delete(event.code));
document.addEventListener("mousemove",event=>{
  if(pointerLocked)player.look(event.movementX||0,event.movementY||0);
});
canvas.addEventListener("mousedown",event=>{
  if(pointerLocked&&event.button===2)event.preventDefault();
});
canvas.addEventListener("contextmenu",event=>event.preventDefault());

for(const c of world.colliders) {
  if(c.tag==="floor-base")continue;
  const w=c.maxX-c.minX,h=c.maxY-c.minY,d=c.maxZ-c.minZ;
  const mesh=new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(w,h,d)),
    new THREE.LineBasicMaterial({color:c.tag==="wall"?0x75eae5:0xffbd66,transparent:true,opacity:.48,depthTest:false})
  );
  mesh.position.set((c.minX+c.maxX)/2,(c.minY+c.maxY)/2,(c.minZ+c.maxZ)/2);
  debugRoot.add(mesh);
}
debugRoot.visible=false;

function drawMap(){
  const w=minimap.width,h=minimap.height,pad=11;
  const sx=(w-pad*2)/48,sz=(h-pad*2)/36;
  const px=x=>pad+(x+24)*sx,pz=z=>pad+(z+18)*sz;
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle="#0b1a24";ctx.fillRect(0,0,w,h);
  ctx.strokeStyle="#2b4c59";ctx.lineWidth=1;
  ctx.strokeRect(pad,pad,48*sx,36*sz);
  ctx.fillStyle="#36596b";
  for(const c of world.colliders) {
    if(c.tag!=="wall"&&c.tag!=="range-backstop"&&c.tag!=="reinforced-glass")continue;
    ctx.fillRect(px(c.minX),pz(c.minZ),Math.max(1,(c.maxX-c.minX)*sx),
      Math.max(1,(c.maxZ-c.minZ)*sz));
  }
  ctx.fillStyle="#638b9a";
  for(const c of world.colliders){
    if(["supply-cover","equipment-table","locker","junction-cabinet"].includes(c.tag))
      ctx.fillRect(px(c.minX),pz(c.minZ),(c.maxX-c.minX)*sx,(c.maxZ-c.minZ)*sz);
  }
  for(const [x,z] of [[-16,-8],[-16,9],[-.5,0],[15,0]]){
    ctx.fillStyle="#43636d";
    ctx.fillRect(px(x)-1,pz(z)-1,3,3);
  }
  const x=px(player.x),y=pz(player.z);
  const dirX=Math.sin(player.yaw),dirZ=-Math.cos(player.yaw);
  ctx.fillStyle="#67f7ee";ctx.strokeStyle="#cdfcf7";ctx.lineWidth=1.6;
  ctx.beginPath();ctx.moveTo(x+dirX*8,y+dirZ*8);
  ctx.lineTo(x-dirZ*4-dirX*3,y+dirX*4-dirZ*3);
  ctx.lineTo(x+dirZ*4-dirX*3,y-dirX*4-dirZ*3);
  ctx.closePath();ctx.fill();ctx.stroke();
}

function updateHUD(report){
  zoneLabel.textContent=report.room;
  zones.add(report.room);
  objective.textContent=String(zones.size).padStart(2,"0")+" / 04 ZONES";
  stateReadout.textContent=report.crouched?"CROUCHED":report.sprinting?"SPRINTING":
    Math.abs(report.lean)>.1?"LEANING":"STANDING";
  fpsReadout.textContent=reportedFPS+" FPS";
  if(debug){
    positionReadout.textContent=
      `X ${player.x.toFixed(2)}  Y ${player.y.toFixed(2)}  Z ${player.z.toFixed(2)}`+
      `\nYaw ${player.yaw.toFixed(2)}  Colliders ${world.colliders.length}`+
      `\nRoom: ${report.room}  Physics: local AABB capsule approximation`;
    positionReadout.style.whiteSpace="pre-line";
  }
  if(!completed&&zones.size===4){
    completed=true;
    showToast("TRAINING PASS · ALL FOUR AREAS EXPLORED",5);
  }
}
function frame(now){
  const realDt=Math.max(0,(now-last)/1000);
  const dt=Math.min(realDt,.043);last=now;
  // Physics is clamped after a stall; FPS still measures actual wall time.
  frames++;frameTime+=realDt;
  if(frameTime>=.55){
    reportedFPS=Math.round(frames/frameTime);
    frames=0;frameTime=0;
  }
  if(pointerLocked){
    const report=player.update(dt,keys);
    updateHUD(report);
  }
  if(toastUntil&&now>toastUntil){
    toast.classList.remove("shown");toastUntil=0;
  }
  drawMap();
  renderer.render(scene,camera);
  requestAnimationFrame(frame);
}
hud.classList.add("hidden");
notice("Ready. Click ENTER TRAINING to test movement, collisions and leaning.");
requestAnimationFrame(frame);
// Diagnostics are deliberately read-only; never connected to user accounts.
window.BLACKOUT_DEV={get position(){return [player.x,player.y,player.z]},
  get currentRoom(){return world.zoneAt(player.x,player.z)},
  get collisionCount(){return world.colliders.length},
  get fps(){return reportedFPS},
  get visibleZones(){return [...zones]},
  get build(){return "0.1.0-first-contact"}
};
