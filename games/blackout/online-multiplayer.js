// BLACKOUT V0.31 · private WebSocket rooms and synchronized operator movement.
// Isolated canvas: the offline Training simulation is never replaced.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import {cleanName,solidAt,normalizeBlackoutGameSettings,
 canStartBlackoutRound} from "./src/multiplayer-protocol.js";
import {BLACKOUT_WORKER,normalizeRoomCode,roomSocketUrl,moveOnlinePlayer,
 blendPosition,selectShotTarget} from "./online-state.js";

const launch=document.getElementById("online-choice");
const customLaunch=document.getElementById("custom-choice");
if(!launch||!customLaunch)throw new Error("BLACKOUT online/custom buttons missing");
const shell=document.createElement("section");
shell.id="bo-online";shell.hidden=true;shell.setAttribute("aria-label","BLACKOUT online multiplayer");
shell.innerHTML=[
 '<canvas id="bo-canvas" tabindex="0" aria-label="Live multiplayer Ironvale map"></canvas>',
 '<div class="bo-backdrop" id="bo-backdrop"></div>',
 '<section class="bo-panel" id="bo-panel">',
 '<div class="bo-top"><span class="bo-eyebrow">BLACKOUT · V0.32 CUSTOM GAME MAKER</span>',
 '<button type="button" class="bo-quiet" id="bo-back">← TRAINING MENU</button></div>',
 '<h2>PRIVATE CUSTOM GAMES</h2>',
 '<p>Create a solo game to explore Ironvale, or invite real players for up to 5v5. Hosts choose the player cap, starting requirements and round rules.</p>',
 '<div class="bo-fields">',
 '<label>YOUR CALLSIGN<input id="bo-name" maxlength="22" autocomplete="nickname" placeholder="Operator"></label>',
 '<label>TEAM<select id="bo-side"><option value="attacker">ATTACKER</option><option value="defender">DEFENDER</option></select></label>',
 '<label>ROOM CODE<input id="bo-code" maxlength="8" spellcheck="false" placeholder="6 CHARACTERS"></label>',
 '</div><section class="bo-config" id="bo-config-wrap" aria-label="Custom game settings">',
 '<div class="bo-eyebrow">CUSTOM GAME MAKER · HOST SETTINGS</div>',
 '<div class="bo-setting-grid">',
 '<label>ROOM TYPE<select id="bo-kind"><option value="custom">CUSTOM GAME · SOLO ALLOWED</option><option value="standard">STANDARD PRIVATE 5V5</option></select></label>',
 '<label>ROOM NAME<input id="bo-room-name" maxlength="24" placeholder="CUSTOM OPERATIONS" value="CUSTOM OPERATIONS"></label>',
 '<label>PLAYER CAP<select id="bo-max"><option value="1">1 PLAYER</option><option value="2">2 PLAYERS</option><option value="4">4 PLAYERS</option><option value="6">6 PLAYERS</option><option value="8">8 PLAYERS</option><option value="10" selected>10 PLAYERS</option></select></label>',
 '<label>START RULE<select id="bo-start-rule"><option value="any">HOST CAN START SOLO</option><option value="opposing">ATTACKER + DEFENDER REQUIRED</option></select></label>',
 '<label>ROUND ENDING<select id="bo-end-rule"><option value="freeplay">FREE ROAM · HOST ENDS ROUND</option><option value="elimination">ELIMINATION (IF BOTH SIDES PRESENT)</option></select></label>',
 '</div><div class="bo-settings-meta" id="bo-settings-meta">CUSTOM · IRONVALE · HOST CAN START ALONE</div>',
 '<button type="button" id="bo-save-settings" class="bo-quiet" hidden>SAVE LOBBY SETTINGS</button>',
 '</section><div class="bo-actions" id="bo-pre-room">',
 '<button type="button" class="bo-primary" id="bo-create">CREATE PRIVATE ROOM</button>',
 '<button type="button" id="bo-join">JOIN WITH CODE</button></div>',
 '<div id="bo-status" class="bo-message" role="status">Ready · Cloudflare Worker connection required.</div>',
 '<section class="bo-room" id="bo-room" hidden>',
 '<span class="bo-eyebrow">INVITE A FRIEND · ROOM CODE</span><div class="bo-room-code" id="bo-room-code"></div>',
 '<div class="bo-players">',
 '<div class="bo-team"><h4>ATTACKERS <span id="bo-attack-count">0 / 5</span></h4><ul id="bo-attack-list"></ul></div>',
 '<div class="bo-team defender"><h4>DEFENDERS <span id="bo-defend-count">0 / 5</span></h4><ul id="bo-defend-list"></ul></div>',
 '</div><div class="bo-actions">',
 '<button type="button" class="bo-primary" id="bo-start" hidden>START CUSTOM GAME</button>',
 '<button type="button" id="bo-switch">SWITCH TEAM</button>',
 '<button type="button" id="bo-copy">COPY ROOM CODE</button>',
 '<button type="button" id="bo-leave">LEAVE ROOM</button></div>',
 '<p class="bo-footnote">Custom games can start with just the host. Standard rooms require both sides. No AI teammates are generated. The Worker validates room rules, teams, health and shots. Full bomb rounds are still in development.</p>',
 '</section></section>',
 '<section class="bo-playing" id="bo-playing" hidden>',
 '<div class="bo-hud-left">IRONVALE · OPERATIONS<br><span id="bo-life">100 HP</span><br><span id="bo-side-hud"></span></div>',
 '<div class="bo-hud-top"><span id="bo-score">PRIVATE MATCH</span> · <span id="bo-online-count">0 CONNECTED</span></div>',
 '<div class="bo-hud-right" id="bo-weapon">BX-7 TEST RIFLE · 30 / 30</div>',
 '<div class="bo-reticle"></div><div class="bo-controls">WASD MOVE · MOUSE LOOK · SHIFT SPRINT · C CROUCH · CLICK FIRE · R RELOAD · ESC RELEASE MOUSE</div>',
 '<div class="bo-match-actions"><button type="button" class="bo-quiet" id="bo-end-round" hidden>END CUSTOM ROUND</button>',
 '<button type="button" class="bo-quiet" id="bo-exit">LEAVE MATCH</button></div>',
 '<div class="bo-match-notice" id="bo-notice" hidden></div>',
 '<div class="bo-enter" id="bo-enter"><h3>IRONVALE · OPERATIONS</h3>',
 '<p>Server-verified multiplayer movement test.</p>',
 '<button type="button" class="bo-primary" id="bo-enter-button">CLICK TO CONTROL</button></div>',
 '</section>'
].join("");
document.body.append(shell);
const $=id=>document.getElementById("bo-"+id);
const canvas=$("canvas"),nameKey="blackout-online-callsign";
$("name").value=sessionStorage.getItem(nameKey)||
 "Operator"+String(Math.floor(Math.random()*900)+100);
let socket=null,roomCode=null,selfId=null,hostId=null,mode="lobby",round=0,roster=[];
let roomSettings=normalizeBlackoutGameSettings({kind:"custom",winCondition:"freeplay"});
let appliedSettings="";
let player=null,ammo=30,lastShot=0,pointerActive=false;
let renderer=null,scene=null,camera=null,parts=[],sceneReady=false;
let remote=new Map(),pressed=new Set(),lastFrame=performance.now(),lastSend=0;
let session=0,noticeUntil=0,enteringRound=false;
function message(text,error=false){
 $("status").textContent=text;$("status").classList.toggle("error",error);
}
function send(obj){
 if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify(obj));
}
function collectSettings(){
 return normalizeBlackoutGameSettings({
  kind:$("kind").value,roomName:$("room-name").value,
  maxPlayers:Number($("max").value),startRule:$("start-rule").value,
  winCondition:$("end-rule").value
 });
}
function applySettingsFromServer(raw){
 roomSettings=normalizeBlackoutGameSettings(raw);
 const fingerprint=JSON.stringify(roomSettings);
 if(fingerprint!==appliedSettings){
  appliedSettings=fingerprint;
  $("kind").value=roomSettings.kind;
  $("room-name").value=roomSettings.roomName;
  $("max").value=String(roomSettings.maxPlayers);
  $("start-rule").value=roomSettings.startRule;
  $("end-rule").value=roomSettings.winCondition;
 }
 updateSettingsPanel();
}
function updateSettingsPanel(){
 const inRoom=Boolean(roomCode),host=inRoom&&selfId===hostId;
 const kind=$("kind").value;
 const locked=inRoom&&(!host||mode==="active");
 $("kind").disabled=locked;
 $("room-name").disabled=locked;
 for(const id of ["max","start-rule","end-rule"])
  $(id).disabled=locked||kind==="standard";
 $("save-settings").hidden=!host;
 $("save-settings").disabled=mode==="active";
 const d=inRoom?roomSettings:collectSettings();
 $("settings-meta").textContent=
  d.kind.toUpperCase()+" · IRONVALE · MAX "+d.maxPlayers+" REAL PLAYERS · "+
  (d.startRule==="any"?"SOLO START":"OPPOSING TEAMS")+" · "+
  (d.winCondition==="freeplay"?"HOST-CONTROLLED END":"ELIMINATION");
}
for(const id of ["kind","room-name","max","start-rule","end-rule"]){
 $(id).addEventListener("change",updateSettingsPanel);
}
updateSettingsPanel();
function renderRoster(){
 const attack=roster.filter(p=>p.side==="attacker");
 const defend=roster.filter(p=>p.side==="defender");
 $("attack-count").textContent=attack.length+" / 5";
 $("defend-count").textContent=defend.length+" / 5";
 for(const [id,team] of [["attack-list",attack],["defend-list",defend]]){
  const list=$(id);list.replaceChildren();
  if(!team.length){const li=document.createElement("li");li.textContent="WAITING FOR PLAYERS";list.append(li)}
  for(const p of team){
   const li=document.createElement("li");li.classList.toggle("self",p.id===selfId);
   li.textContent=p.name+(p.id===selfId?" · YOU":"")+(p.id===hostId?" · HOST":"");
   list.append(li);
  }
 }
 $("room-code").textContent=roomCode||"";
 $("room").hidden=!roomCode;$("pre-room").hidden=!!roomCode;
 for(const id of ["name","side","code"])$(id).disabled=!!roomCode;
 $("start").hidden=hostId!==selfId||!selfId;
 $("start").disabled=!canStartBlackoutRound(roomSettings,roster)||mode==="active";
 $("start").textContent=mode==="intermission"?"START NEXT ROUND":
  roomSettings.kind==="custom"?"START CUSTOM GAME":"START STANDARD ROUND";
 $("switch").disabled=!roomCode||mode==="active";
 $("switch").hidden=!roomCode;
 $("end-round").hidden=hostId!==selfId||roomSettings.kind!=="custom"||mode!=="active";
 const own=roster.find(p=>p.id===selfId);
 if(own&&roomCode)$("side").value=own.side;
 $("online-count").textContent=roster.length+" CONNECTED";
 updateSettingsPanel();
}
function hideMatch(){
 $("playing").hidden=true;$("panel").hidden=false;$("backdrop").hidden=false;
 if(document.pointerLockElement===canvas)document.exitPointerLock();
 pressed.clear();pointerActive=false;
}
function disconnect(quiet=false){
 ++session;
 const old=socket;socket=null;
 if(old){old.onclose=null;old.onmessage=null;old.onerror=null;old.close()}
 roomCode=null;selfId=null;hostId=null;mode="lobby";round=0;roster=[];player=null;
 appliedSettings="";roomSettings=normalizeBlackoutGameSettings({kind:"custom",winCondition:"freeplay"});
 for(const o of remote.values())scene?.remove(o.group);
 remote.clear();hideMatch();renderRoster();
 if(!quiet)message("Disconnected · You can rejoin a private room.");
}
function exitOnline(){disconnect(true);shell.hidden=true}
function openRoomMaker(kind){
 disconnect(true);
 $("kind").value=kind;
 $("room-name").value=kind==="custom"?"CUSTOM OPERATIONS":"STANDARD PRIVATE";
 $("max").value="10";
 $("start-rule").value=kind==="custom"?"any":"opposing";
 $("end-rule").value=kind==="custom"?"freeplay":"elimination";
 updateSettingsPanel();
 shell.hidden=false;
 message(kind==="custom"?"CUSTOM GAME · SOLO START AVAILABLE":
  "STANDARD PRIVATE · AT LEAST ONE PLAYER ON EACH TEAM REQUIRED");
}
launch.addEventListener("click",()=>openRoomMaker("standard"));
customLaunch.addEventListener("click",()=>openRoomMaker("custom"));
$("back").addEventListener("click",exitOnline);
$("exit").addEventListener("click",exitOnline);
$("leave").addEventListener("click",()=>disconnect());
$("copy").addEventListener("click",()=>{
 if(roomCode)navigator.clipboard?.writeText(roomCode).then(
  ()=>message("Copied room code "+roomCode),
  ()=>message("Copy the code shown above to invite a friend."));
});
async function connect(code){
 if(socket||roomCode)return;
 const name=cleanName($("name").value),side=$("side").value;
 sessionStorage.setItem(nameKey,name);
 $("create").disabled=true;$("join").disabled=true;
 message("CONTACTING CLOUDFLARE MULTIPLAYER SERVER…");
 try{
  if(!code){
   const settings=collectSettings();
   const response=await fetch(BLACKOUT_WORKER+"/api/blackout/rooms",
    {method:"POST",cache:"no-store",headers:{"Content-Type":"application/json"},
     body:JSON.stringify({settings})});
   const result=await response.json();
   if(!response.ok||!result.ok)throw new Error(result.error||"Could not create room");
   code=normalizeRoomCode(result.code);
  }
  if(!code)throw new Error("Invalid six-character room code");
  const token=++session;
  const ws=new WebSocket(roomSocketUrl(code,{side,name}));
  roomCode=code;socket=ws;
  ws.onopen=()=>{if(socket===ws)message("CONNECTED · WAITING FOR SERVER STATE")};
  ws.onmessage=event=>{
   if(socket!==ws)return;
   let data;try{data=JSON.parse(event.data)}catch{return}
   if(data.type==="welcome"){
    selfId=String(data.id);mode=data.mode||"lobby";round=data.round||0;
    roster=Array.isArray(data.players)?data.players:[];
    if(data.host)hostId=selfId;
    if(data.settings)applySettingsFromServer(data.settings);
    renderRoster();
   }else if(data.type==="state"){
    roster=Array.isArray(data.players)?data.players:[];
    hostId=data.hostId==null?null:String(data.hostId);
    mode=data.mode||"lobby";round=data.round||0;
    if(data.settings)applySettingsFromServer(data.settings);
    renderRoster();
    if(mode==="active"){
     if($("playing").hidden&&!enteringRound)enterRound(token);
     else if(!roster.some(p=>p.id===selfId)){
      disconnect(true);message("Server ended your session",true);
     }
    }else if(!$("playing").hidden){
     hideMatch();message(data.message||
      ("ROUND COMPLETE · "+(data.winner||"NO WINNER").toUpperCase()));
    }else message("CONNECTED · "+roster.length+"/"+roomSettings.maxPlayers+
      " REAL PLAYERS · WAITING FOR HOST");
   }else if(data.type==="correction"){
    if(player)Object.assign(player,{x:data.x,y:data.y,z:data.z});
   }else if(data.type==="reload-ok"){
    ammo=30;$("weapon").textContent="BX-7 TEST RIFLE · "+ammo+" / 30";
   }else if(data.type==="notice"){
    message(data.message||"Server notice");
    notice(data.message||"SERVER NOTICE");
   }else if(data.type==="hit")notice(data.to===selfId?"YOU WERE HIT":"HIT CONFIRMED",900);
  };
  ws.onerror=()=>{if(socket===ws)message(
   "SERVER UNAVAILABLE · The BLACKOUT Worker and BLACKOUT_ROOMS binding may need deployment.",true)};
  ws.onclose=()=>{
   if(socket!==ws)return;
   disconnect(true);
   message("ROOM DISCONNECTED · Verify the BLACKOUT Worker is deployed.",true);
  };
 }catch(error){
  roomCode=null;socket=null;
  message(String(error?.message||"Unable to connect to Worker"),true);
 }finally{$("create").disabled=false;$("join").disabled=false}
}
$("create").addEventListener("click",()=>connect(null));
$("join").addEventListener("click",()=>{
 const code=normalizeRoomCode($("code").value);
 if(!code){message("ENTER A VALID SIX-CHARACTER ROOM CODE",true);return}
 connect(code);
});
$("start").addEventListener("click",()=>{
 if(selfId!==hostId||mode==="active")return;
 if(!canStartBlackoutRound(roomSettings,roster)){
  message("ROOM START CONDITIONS NOT MET",true);return;
 }
 send({type:"start"});message("START REQUESTED · WAITING FOR SERVER");
});
$("save-settings").addEventListener("click",()=>{
 if(selfId!==hostId||mode==="active")return;
 send({type:"settings",settings:collectSettings()});
 message("UPDATING CUSTOM GAME SETTINGS…");
});
$("switch").addEventListener("click",()=>{
 if(mode==="active"||!roomCode)return;
 const own=roster.find(p=>p.id===selfId);
 send({type:"side",side:own?.side==="attacker"?"defender":"attacker"});
});
$("end-round").addEventListener("click",()=>{
 if(selfId===hostId&&roomSettings.kind==="custom"&&mode==="active")
  send({type:"end"});
});
function notice(text,duration=2200){
 $("notice").textContent=text;$("notice").hidden=false;noticeUntil=performance.now()+duration;
}
$("enter-button").addEventListener("click",()=>canvas.requestPointerLock?.());
canvas.addEventListener("click",()=>{
 if(mode==="active"&&!pointerActive)canvas.requestPointerLock?.();
});
document.addEventListener("pointerlockchange",()=>{
 pointerActive=document.pointerLockElement===canvas;
 $("enter").hidden=pointerActive||$("playing").hidden;
 if(!pointerActive)pressed.clear();
});
document.addEventListener("keydown",event=>{
 if(shell.hidden||$("playing").hidden||!pointerActive)return;
 if(["KeyW","KeyA","KeyS","KeyD","KeyC","KeyR","ShiftLeft","ShiftRight",
   "ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(event.code))
   event.preventDefault();
 pressed.add(event.code);
 if(event.code==="KeyR")send({type:"reload"});
});
document.addEventListener("keyup",event=>pressed.delete(event.code));
document.addEventListener("mousemove",event=>{
 if(!pointerActive||mode!=="active"||!player)return;
 player.yaw=((player.yaw-event.movementX*.0023)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
 player.pitch=Math.max(-1.4,Math.min(1.4,player.pitch-event.movementY*.0023));
});
document.addEventListener("mousedown",event=>{
 if(shell.hidden||!pointerActive||mode!=="active"||event.button!==0||!player?.alive)return;
 if(performance.now()-lastShot<150||ammo<1)return;
 lastShot=performance.now();ammo--;
 const side=roster.find(p=>p.id===selfId)?.side||"attacker";
 send({type:"shot",targetId:selectShotTarget({...player,side},
    roster.filter(p=>p.id!==selfId))});
 $("weapon").textContent="BX-7 TEST RIFLE · "+ammo+" / 30";
});
const palette={floor:0x3b515e,hardWall:0x6f7e86,softWall:0xbdb09b,
 reinforcedWall:0x586d7e,cover:0x41545e,railing:0x82959c,
 door:0x4e6775,stairs:0x6e7d87,rappelAnchor:0xd8ba75};
const materials=new Map();
function material(kind){
 if(!materials.has(kind))materials.set(kind,new THREE.MeshStandardMaterial({
  color:palette[kind]||0x657b89,roughness:kind==="reinforcedWall"?.33:.83,
  metalness:kind==="reinforcedWall"?.7:.05
 }));
 return materials.get(kind);
}
function addMapItem(part){
 const {position:p,size:s}=part,kind=part.type;
 if(["attackerSpawn","defenderSpawn","window"].includes(kind))return;
 if(kind==="door")return; // These are valid traversable door openings.
 if(kind==="stairs"){
  for(let i=0;i<12;i++){
   const h=s.y*(i+1)/12;
   const step=new THREE.Mesh(new THREE.BoxGeometry(s.x,h,s.z/12),material(kind));
   step.position.set(p.x,p.y+h/2,p.z-s.z/2+s.z*(i+.5)/12);
   step.rotation.y=(part.rotationY||0)*Math.PI/180;scene.add(step);
  }
  return;
 }
 const h=kind==="floor"?Math.max(.16,s.y):Math.max(.13,s.y);
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(
  Math.max(.12,s.x),h,Math.max(.12,s.z)),material(kind));
 mesh.position.set(p.x,kind==="floor"?p.y-h/2:p.y+h/2,p.z);
 mesh.rotation.y=(part.rotationY||0)*Math.PI/180;
 scene.add(mesh);
}
async function loadMap(){
 if(sceneReady)return;
 const response=await fetch("./maps/ironvale-operations.blackout-map.json");
 if(!response.ok)throw new Error("Ironvale multiplayer map could not be loaded");
 const map=await response.json();
 if(!Array.isArray(map.elements)||map.elements.length<100)
  throw new Error("Ironvale map geometry missing");
 parts=map.elements;
 renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:"high-performance"});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 scene=new THREE.Scene();scene.background=new THREE.Color(0x10202f);
 scene.fog=new THREE.FogExp2(0x12293b,.009);
 scene.add(new THREE.HemisphereLight(0xb6e3f1,0x233b48,2.2));
 const sun=new THREE.DirectionalLight(0xe9e4d7,2.8);
 sun.position.set(-22,36,16);scene.add(sun);
 const outside=new THREE.Mesh(new THREE.PlaneGeometry(250,250),
  new THREE.MeshStandardMaterial({color:0x2e3d49,roughness:1}));
 outside.rotation.x=-Math.PI/2;outside.position.y=-.25;scene.add(outside);
 for(const part of parts)addMapItem(part);
 camera=new THREE.PerspectiveCamera(76,1,.06,250);camera.rotation.order="YXZ";
 sceneReady=true;
}
function makeAvatar(p){
 const group=new THREE.Group();
 const armor=new THREE.MeshStandardMaterial({
  color:p.side==="attacker"?0x2f9dc0:0xbd7e51,roughness:.77});
 const torso=new THREE.Mesh(new THREE.CylinderGeometry(.28,.34,1.1,8),armor);
 torso.position.y=1;group.add(torso);
 const helmet=new THREE.Mesh(new THREE.SphereGeometry(.26,10,8),
  new THREE.MeshStandardMaterial({color:0xb5c6cd,roughness:.8}));
 helmet.position.y=1.68;group.add(helmet);
 const rifle=new THREE.Mesh(new THREE.BoxGeometry(.13,.14,.8),material("cover"));
 rifle.position.set(.28,1.24,-.28);group.add(rifle);
 scene.add(group);
 return {group,x:p.x,y:p.y,z:p.z};
}
async function enterRound(token){
 enteringRound=true;
 try{
  await loadMap();
  if(token!==session||mode!=="active"||!selfId)return;
  const own=roster.find(p=>p.id===selfId);
  if(!own)throw new Error("Server did not assign a spawn");
  player={...own};ammo=30;
  for(const r of remote.values())scene.remove(r.group);
  remote.clear();
  $("panel").hidden=true;$("backdrop").hidden=true;
  $("playing").hidden=false;$("enter").hidden=false;
  $("score").textContent="ROUND "+round+" · SERVER VERIFIED";
  $("side-hud").textContent=own.side.toUpperCase();
  $("weapon").textContent="BX-7 TEST RIFLE · 30 / 30";
 }catch(e){message("ONLINE MAP ERROR · "+String(e?.message||e),true)}
 finally{enteringRound=false}
}
function animate(now){
 requestAnimationFrame(animate);
 const dt=Math.min(.05,Math.max(0,(now-lastFrame)/1000));lastFrame=now;
 if(shell.hidden||$("playing").hidden||!sceneReady||!player)return;
 const authoritative=roster.find(p=>p.id===selfId);
 if(authoritative){
  $("life").textContent=authoritative.health+" HP";
  $("online-count").textContent=roster.length+" CONNECTED";
 }
 if(pointerActive&&mode==="active"&&authoritative?.alive){
  const next=moveOnlinePlayer(player,pressed,dt,parts);
  if(!solidAt(parts,next.x,next.z,next.y))player=next;
  if(now-lastSend>=75){
   lastSend=now;send({type:"move",x:player.x,y:player.y,z:player.z,
    yaw:player.yaw,pitch:player.pitch});
  }
 }
 if(authoritative&&!authoritative.alive)pressed.clear();
 const seen=new Set();
 for(const p of roster){
  if(p.id===selfId||!p.alive)continue;
  seen.add(p.id);
  let v=remote.get(p.id);
  if(!v){v=makeAvatar(p);remote.set(p.id,v)}
  Object.assign(v,blendPosition(v,p,Math.min(1,dt*11)));
  v.group.position.set(v.x,v.y,v.z);
  v.group.rotation.y=p.yaw;
 }
 for(const [id,v] of remote){
  if(!seen.has(id)){scene.remove(v.group);remote.delete(id)}
 }
 const w=canvas.clientWidth||innerWidth,h=canvas.clientHeight||innerHeight;
 if(canvas.width!==Math.round(w*renderer.getPixelRatio())||
    canvas.height!==Math.round(h*renderer.getPixelRatio())){
  renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
 }
 camera.position.set(player.x,player.y+(pressed.has("KeyC")?1.08:1.62),player.z);
 camera.rotation.set(player.pitch,player.yaw,0,"YXZ");
 renderer.render(scene,camera);
 if(!$("notice").hidden&&now>noticeUntil)$("notice").hidden=true;
}
requestAnimationFrame(animate);
console.info("BLACKOUT V0.32 custom private rooms; solo start and adjustable host settings.");
