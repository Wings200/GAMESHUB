// BLACKOUT V0.34 · shared training combat, recon, breach and bomb objectives.
// Isolated canvas: the offline Training simulation is never replaced.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import {createWeaponView} from "./reboot/weapon-view.js?v=reboot-012";
import {toggleLean,smoothLean,leanCameraPose} from "./reboot/lean.js?v=reboot-005";
import {GameAudio} from "./reboot/legacy-audio.js?v=reboot-064";
import {createDroneView} from "./reboot/drone-view.js?v=reboot-012";
import {wallParts} from "./online-world.js?v=034";
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
 '<div class="bo-top"><span class="bo-eyebrow">BLACKOUT · V0.34 TACTICAL MATCHES</span>',
 '<button type="button" class="bo-quiet" id="bo-back">← TRAINING MENU</button></div>',
 '<h2>PRIVATE CUSTOM GAMES</h2>',
 '<p>Create a solo game to explore Ironvale, or invite real players for up to 5v5. Hosts choose the player cap, starting requirements and round rules.</p>',
 '<div class="bo-fields">',
 '<label>YOUR CALLSIGN<input id="bo-name" maxlength="22" autocomplete="nickname" placeholder="Operator"></label>',
 '<label>TEAM<select id="bo-side"><option value="attacker">ATTACKER</option><option value="defender">DEFENDER</option></select></label><label>OPERATOR<select id="bo-operator"></select></label>',
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
 '<p class="bo-footnote">Custom games can start with just the host. Standard rooms require both sides. No AI teammates are generated. The Worker synchronizes drone reconnaissance, barricades, breach charges, site objectives and combat.</p>',
 '</section></section>',
 '<section class="bo-playing" id="bo-playing" hidden>',
 '<div class="bo-hud-left">IRONVALE · OPERATIONS<br><span id="bo-life">100 HP</span><br><span id="bo-side-hud"></span></div>',
 '<div class="bo-hud-top"><span id="bo-score">PRIVATE MATCH</span> · <span id="bo-phase">PREP</span> · <span id="bo-timer">0:45</span> · <span id="bo-online-count">0 CONNECTED</span></div>',
 '<div class="bo-hud-right"><div id="bo-weapon">BX-7 MK II · 30 / 30</div>',
 '<small id="bo-stance">STANDING · HIPFIRE · LEAN CENTER</small><br><small id="bo-objective">SECURE SITE</small><br><small id="bo-action">F INTERACT</small></div>',
 '<div class="bo-reticle" id="bo-reticle"></div><div class="bo-controls">WASD MOVE · SHIFT SPRINT/DRONE BOOST · SPACE DRONE JUMP · 5 DRONE · F HOLD INTERACT · V MELEE · G BREACH · MIDDLE DETONATE · X DROP · ADS RIGHT CLICK · FIRE LEFT CLICK · ESC CURSOR</div>',
 '<div class="bo-match-actions"><button type="button" class="bo-quiet" id="bo-end-round" hidden>END CUSTOM ROUND</button>',
 '<button type="button" class="bo-quiet" id="bo-exit">LEAVE MATCH</button></div>',
 '<div class="bo-match-notice" id="bo-notice" hidden></div>',
 '<div class="bo-enter" id="bo-enter"><h3>IRONVALE · OPERATIONS</h3>',
 '<p>TRAINING SYSTEMS · 45S DRONE PREP · BARRICADES · BREACHES · A/B PLANT · SERVER COMBAT.</p>',
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
const operatorChoices={attacker:["sledge","thatcher","ash","thermite","twitch"],
 defender:["smoke","mute","castle","pulse","doc"]};
function refreshOperators(chosen){
 const options=operatorChoices[$("side").value]||operatorChoices.attacker;
 $("operator").replaceChildren();
 for(const id of options){const o=document.createElement("option");o.value=id;
  o.textContent=id.toUpperCase()+(id==="thermite"?" · HARD BREACH":"");$("operator").append(o);}
 $("operator").value=options.includes(chosen)?chosen:(options[0]||"");
}
$("side").addEventListener("change",()=>refreshOperators());
refreshOperators("sledge");
let player=null,ammo=30,lastShot=0,pointerActive=false;
let phase="lobby",phaseEndsAt=0,world=null,mapData=null,collisionParts=[];
let droneLook={yaw:0,pitch:0},wasDroning=false,jumpQueued=false,boostQueued=false;
let mapMeshes=new Map(),worldLayer=null,bombModel=null,droneModels=new Map();
let visualFingerprint="",worldVisualUpdate=0;
let aimHeld=false,aimMix=0,firing=false,leanTarget=0,leanAmount=0,gunKick=0;
let reloadPending=false,reloadingUntil=0,weaponView=null,lastFootstep=0;
const sound=new GameAudio(),remoteFlashAt=new Map();
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
 if(own&&roomCode){
  if($("side").value!==own.side){$("side").value=own.side;refreshOperators(own.operator);}
  $("operator").value=own.operator;
 }
 $("operator").disabled=mode==="active";
 $("online-count").textContent=roster.length+" CONNECTED";
 updateSettingsPanel();
}
function hideMatch(){
 $("playing").hidden=true;$("panel").hidden=false;$("backdrop").hidden=false;
 if(document.pointerLockElement===canvas)document.exitPointerLock();
 pressed.clear();pointerActive=false;firing=false;aimHeld=false;wasDroning=false;
}
function disconnect(quiet=false){
 ++session;
 const old=socket;socket=null;
  aimHeld=false;firing=false;leanTarget=0;leanAmount=0;aimMix=0;
  reloadPending=false;reloadingUntil=0;if(weaponView)weaponView.root.visible=false;
 if(old){old.onclose=null;old.onmessage=null;old.onerror=null;old.close()}
 roomCode=null;selfId=null;hostId=null;mode="lobby";round=0;roster=[];player=null;
  phase="lobby";phaseEndsAt=0;world=null;visualFingerprint="";
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
  const ws=new WebSocket(roomSocketUrl(code,{side,name,operator:$("operator").value}));
  roomCode=code;socket=ws;
  ws.onopen=()=>{if(socket===ws)message("CONNECTED · WAITING FOR SERVER STATE")};
  ws.onmessage=event=>{
   if(socket!==ws)return;
   let data;try{data=JSON.parse(event.data)}catch{return}
   if(data.type==="welcome"){
    selfId=String(data.id);mode=data.mode||"lobby";round=data.round||0;
     phase=data.phase||"lobby";phaseEndsAt=data.phaseEndsAt||0;world=data.world||null;
    roster=Array.isArray(data.players)?data.players:[];
    if(data.host)hostId=selfId;
    if(data.settings)applySettingsFromServer(data.settings);
    renderRoster();
   }else if(data.type==="state"){
    roster=Array.isArray(data.players)?data.players:[];
    hostId=data.hostId==null?null:String(data.hostId);
    mode=data.mode||"lobby";round=data.round||0;
    phase=data.phase||"lobby";phaseEndsAt=data.phaseEndsAt||0;world=data.world||null;
    if(data.settings)applySettingsFromServer(data.settings);
    renderRoster();
    if(data.event==="shot"&&data.from!==selfId){
     remoteFlashAt.set(String(data.from),performance.now()+90);
     const shooter=roster.find(p=>p.id===String(data.from));
     if(shooter&&player)sound.playAt("enemy-fire",
      shooter.x,shooter.z,player.x,player.z,player.yaw);
    }
    if(data.event==="drone-destroyed"&&data.to===selfId)notice("DRONE DESTROYED",1800);
    if(data.event==="planted")notice("DEFUSER PLANTED · PROTECT IT",2400);
    if(data.event==="hit"){
     if(data.to===selfId)notice("YOU WERE HIT",1100);
     if(data.from===selfId)notice("HIT CONFIRMED",1100);
    }
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
   }else if(data.type==="shot-ok"){
    ammo=Number.isInteger(data.shots)?data.shots:ammo;
    updateWeaponHud();
   }else if(data.type==="reload-start"){
    reloadPending=false;reloadingUntil=performance.now()+(data.durationMs||1700);
    weaponView?.beginReload(performance.now(),data.durationMs||1700);
    sound.play("reload");updateWeaponHud();
   }else if(data.type==="reload-denied"){
    reloadPending=false;if(Number.isInteger(data.shots))ammo=data.shots;
    updateWeaponHud();
   }else if(data.type==="reload-ok"){
    ammo=Number.isInteger(data.shots)?data.shots:30;
    reloadPending=false;reloadingUntil=0;updateWeaponHud();
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
$("operator").addEventListener("change",()=>{
 if(roomCode&&mode!=="active")send({type:"operator",operator:$("operator").value});
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
$("enter-button").addEventListener("click",()=>{
 sound.unlock();canvas.requestPointerLock?.();
});
canvas.addEventListener("click",()=>{
 if(mode==="active"&&!pointerActive){sound.unlock();canvas.requestPointerLock?.();}
});
document.addEventListener("pointerlockchange",()=>{
 pointerActive=document.pointerLockElement===canvas;
 $("enter").hidden=pointerActive||$("playing").hidden;
 if(!pointerActive){pressed.clear();firing=false;aimHeld=false;
  if(mode==="active")send({type:"world",action:"stop"});
 }
});
document.addEventListener("keydown",event=>{
 if(shell.hidden||$("playing").hidden||!pointerActive)return;
 if(["KeyW","KeyA","KeyS","KeyD","KeyC","KeyR","KeyQ","KeyE",
  "KeyF","KeyG","KeyV","KeyX","Digit5","Digit1","Digit2","Space",
  "ShiftLeft","ShiftRight","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(event.code))
  event.preventDefault();
 const own=roster.find(p=>p.id===selfId),droning=Boolean(own?.droneActive);
 if(event.code==="KeyF"&&!event.repeat){send({type:"world",action:"interact"});return;}
 if(!droning&&event.code==="KeyV"&&!event.repeat){send({type:"world",action:"melee"});sound.play("melee");return;}
 if(!droning&&event.code==="KeyG"&&!event.repeat){send({type:"world",action:"charge"});return;}
 if(!droning&&event.code==="KeyX"&&!event.repeat){send({type:"world",action:"drop"});return;}
 if(event.code==="Digit5"&&!event.repeat&&own?.side==="attacker"&&phase!=="prep"){
  send({type:"drone-control",mode:droning?"leave":"enter",index:own.droneIndex||0});return;
 }
 if(droning&&(event.code==="Digit1"||event.code==="Digit2")&&!event.repeat){
  send({type:"drone-control",mode:"enter",index:event.code==="Digit1"?0:1});return;
 }
 if(droning&&event.code==="Space"&&!event.repeat){jumpQueued=true;return;}
 if(droning&&event.code.startsWith("Shift")&&!event.repeat)boostQueued=true;
 if(!droning&&(event.code==="KeyQ"||event.code==="KeyE")&&!event.repeat){
  leanTarget=toggleLean(leanTarget,event.code==="KeyQ"?-1:1);
  sound.play("equip");return;
 }
 pressed.add(event.code);
 if(event.code==="KeyR"&&!event.repeat&&!droning)requestReload();
});
document.addEventListener("keyup",event=>{
 pressed.delete(event.code);
 if(event.code==="KeyF"&&mode==="active")send({type:"world",action:"stop"});
});
document.addEventListener("mousemove",event=>{
 if(!pointerActive||mode!=="active"||!player)return;
 const own=roster.find(p=>p.id===selfId);
 if(own?.droneActive){
  droneLook.yaw=((droneLook.yaw-event.movementX*.0027)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
  droneLook.pitch=Math.max(-.8,Math.min(.8,droneLook.pitch-event.movementY*.0027));
 }else{
  player.yaw=((player.yaw-event.movementX*.0023)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
  player.pitch=Math.max(-1.4,Math.min(1.4,player.pitch-event.movementY*.0023));
 }
});
document.addEventListener("contextmenu",event=>{
 if(!shell.hidden&&!$("playing").hidden)event.preventDefault();
});
document.addEventListener("mousedown",event=>{
 if(shell.hidden||!pointerActive||mode!=="active"||!player?.alive)return;
 if(event.button===1){send({type:"world",action:"detonate"});event.preventDefault();return;}
 if(roster.find(p=>p.id===selfId)?.droneActive)return;
 if(event.button===2){aimHeld=true;sound.play("aim");event.preventDefault();}
 if(event.button===0){firing=true;attemptShot();event.preventDefault();}
});
document.addEventListener("mouseup",event=>{
 if(event.button===2)aimHeld=false;
 if(event.button===0)firing=false;
});
window.addEventListener("blur",()=>{
 firing=false;aimHeld=false;pressed.clear();
 if(mode==="active")send({type:"world",action:"stop"});
});
setInterval(()=>{if(socket?.readyState===WebSocket.OPEN&&mode==="active")
 send({type:"ping"});},650);
function updateWeaponHud(){
 const reload=reloadPending||reloadingUntil>performance.now();
 $("weapon").textContent="BX-7 MK II · "+ammo+" / 30"+(reload?" · RELOADING":"");
}
function requestReload(){
 if(mode!=="active"||phase!=="action"||!player?.alive||ammo>=30||
    reloadPending||reloadingUntil>performance.now())return;
 reloadPending=true;send({type:"reload"});updateWeaponHud();
}
function selectDroneShotTarget(shooter,roster){
 if(roster.find(p=>p.id===selfId)?.side!=="defender")return null;
 let chosen=null,best=99;
 for(const p of roster){
  if(p.side!=="attacker")continue;
  for(const d of p.drones||[]){
   if(!d.deployed)continue;
   const dx=d.x-shooter.x,dz=d.z-shooter.z,range=Math.hypot(dx,dz);
   if(range<.2||range>35)continue;
   const yaw=-Math.atan2(dx,-dz),angle=Math.abs(Math.atan2(
    Math.sin(yaw-shooter.yaw),Math.cos(yaw-shooter.yaw)));
   const pitch=-Math.atan2(d.y+.14-shooter.y-(pressed.has("KeyC")?1.05:1.58),range);
   if(angle<.135&&Math.abs(pitch-shooter.pitch)<.155&&range<best){
    best=range;chosen=p.id;
   }
  }
 }
 return chosen;
}
function attemptShot(){
 const now=performance.now();
 if(!player?.alive||mode!=="active"||!pointerActive||
    (phase!=="action"&&!(phase==="prep"&&roster.find(p=>p.id===selfId)?.side==="defender"))||
    reloadPending||reloadingUntil>now||now-lastShot<145)return;
 if(ammo<=0){if(firing)requestReload();return;}
 if(pressed.has("ShiftLeft")&&!aimHeld&&!pressed.has("KeyC"))return;
 lastShot=now;ammo--;
 player.pitch=Math.max(-1.4,Math.min(1.4,player.pitch+.006+Math.random()*.008));
 gunKick=Math.min(1,gunKick+.75);
 const side=roster.find(p=>p.id===selfId)?.side||"attacker";
 send({type:"shot",targetId:phase==="action"?selectShotTarget({...player,side,
    crouched:pressed.has("KeyC")},roster.filter(p=>p.id!==selfId)):null,
    targetDrone:selectDroneShotTarget(player,roster)});
 weaponView?.flash();weaponView?.eject();
 sound.play("fire");updateWeaponHud();
}
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
 scene.add(mesh);mapMeshes.set(part.id,mesh);
}
function createSites(map){
 const pair=map.sitePairs?.[0];if(!pair)return;
 for(const site of ["A","B"]){
  const p=pair[site],group=new THREE.Group();
  const mat=new THREE.MeshStandardMaterial({color:site==="A"?0xefb04f:0x6dcbf0,
   emissive:site==="A"?0x4b2509:0x07324f,emissiveIntensity:.7,roughness:.5});
  const ring=new THREE.Mesh(new THREE.TorusGeometry(2.4,.12,7,48),mat);
  ring.rotation.x=-Math.PI/2;ring.position.y=.07;group.add(ring);
  const beacon=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,1.3,10),mat);
  beacon.position.y=.68;group.add(beacon);
  const crown=new THREE.Mesh(new THREE.SphereGeometry(.25,12,8),mat);
  crown.position.y=1.44;group.add(crown);
  group.position.set(p.x,p.y,p.z);scene.add(group);
 }
}
function renderWorldGeometry(){
 if(!sceneReady||!world||!mapData)return;
 const fingerprint=JSON.stringify([world.walls,world.barricades,world.charges,
   world.bomb?.phase,world.bomb?.position]);
 if(fingerprint===visualFingerprint)return;
 visualFingerprint=fingerprint;
 collisionParts=wallParts(mapData,world);
 for(const part of parts){
  if(part.type!=="softWall")continue;
  const mesh=mapMeshes.get(part.id);if(!mesh)continue;
  mesh.visible=world.walls[part.id]!=="open";
  mesh.material=material(world.walls[part.id]==="reinforced"?"reinforcedWall":"softWall");
 }
 for(const node of [...worldLayer.children]){
  worldLayer.remove(node);
  node.traverse(child=>{if(child.isMesh)child.geometry.dispose();});
 }
 const wood=new THREE.MeshStandardMaterial({color:0x795440,roughness:.88}),
  strip=new THREE.MeshStandardMaterial({color:0x5c3b2b,roughness:.93}),
  tech=new THREE.MeshStandardMaterial({color:0x253644,metalness:.6,roughness:.36}),
  orange=new THREE.MeshStandardMaterial({color:0xe89137,emissive:0x5d2600,emissiveIntensity:.35});
 for(const [id,hp] of Object.entries(world.barricades||{})){
  if(hp<1)continue;
  const door=mapData.elements.find(x=>x.id===id);if(!door)continue;
  const group=new THREE.Group();
  group.position.set(door.position.x,door.position.y,door.position.z);
  group.rotation.y=(door.rotationY||0)*Math.PI/180;
  const h=Math.min(door.size.y-.35,2.8),wide=door.size.x-.05;
  const backing=new THREE.Mesh(new THREE.BoxGeometry(wide,h,.18),strip);
  backing.position.y=.35+h/2;group.add(backing);
  const n=Math.ceil(h/.36);
  for(let i=0;i<n;i++){
   const plank=new THREE.Mesh(new THREE.BoxGeometry(wide,.34,.21),wood);
   plank.position.set(0,.35+Math.min(h-.17,(i+.5)*h/n),.015);
   group.add(plank);
  }
  for(const side of [-1,1]){
   const brace=new THREE.Mesh(new THREE.BoxGeometry(.09,h,.24),strip);
   brace.position.set(side*(wide/2-.18),.35+h/2,.035);group.add(brace);
  }
  worldLayer.add(group);
 }
 for(const charge of world.charges||[]){
  if(charge.detonated)continue;
  const part=mapData.elements.find(x=>x.id===charge.target);
  if(!part)continue;
  const group=new THREE.Group();
  group.position.set(part.position.x,part.position.y+1.2,part.position.z);
  group.rotation.y=(part.rotationY||0)*Math.PI/180;
  const box=new THREE.Mesh(new THREE.BoxGeometry(.44,.33,.30),tech);
  box.position.z=.12;group.add(box);
  const light=new THREE.Mesh(new THREE.BoxGeometry(.26,.05,.08),orange);
  light.position.set(0,.13,.30);group.add(light);
  worldLayer.add(group);
 }
 if(world.bomb?.position&&["dropped","planted"].includes(world.bomb.phase)){
  const b=world.bomb.position;
  const group=new THREE.Group();
  const base=new THREE.Mesh(new THREE.BoxGeometry(.50,.16,.36),tech);
  base.position.y=.11;group.add(base);
  const screen=new THREE.Mesh(new THREE.BoxGeometry(.38,.02,.24),orange);
  screen.position.set(0,.205,0);group.add(screen);
  const antenna=new THREE.Mesh(new THREE.CylinderGeometry(.015,.02,.23,8),tech);
  antenna.position.set(.21,.33,-.12);group.add(antenna);
  group.position.set(b.x,b.y,b.z);
  worldLayer.add(group);
 }
}
function updateReconModels(dt,own){
 if(!sceneReady)return;
 const used=new Set();
 for(const p of roster){
  for(let i=0;i<(p.drones||[]).length;i++){
   const d=p.drones[i],key=p.id+":"+i;
   if(!d?.deployed)continue;
   used.add(key);
   let view=droneModels.get(key);
   if(!view){view=createDroneView(THREE,scene);droneModels.set(key,view);}
   view.update(d,dt);
   if(p.id===selfId&&own?.droneActive&&(own.droneIndex||0)===i)
    view.root.visible=false;
  }
 }
 for(const [key,view] of droneModels){
  if(!used.has(key)){view.dispose();droneModels.delete(key);}
 }
}
function formatRoundClock(milliseconds){
 const seconds=Math.max(0,Math.ceil(milliseconds/1000));
 return Math.floor(seconds/60)+":"+String(seconds%60).padStart(2,"0");
}
async function loadMap(){
 if(sceneReady)return;
 const response=await fetch("./maps/ironvale-operations.blackout-map.json");
 if(!response.ok)throw new Error("Ironvale multiplayer map could not be loaded");
 const map=await response.json();
 if(!Array.isArray(map.elements)||map.elements.length<100)
  throw new Error("Ironvale map geometry missing");
 parts=map.elements;mapData=map;collisionParts=parts;
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
 worldLayer=new THREE.Group();worldLayer.name="Synced BLACKOUT match objects";scene.add(worldLayer);
 createSites(map);
 camera=new THREE.PerspectiveCamera(76,1,.06,250);camera.rotation.order="YXZ";
 weaponView=createWeaponView(THREE,camera,scene);
 weaponView.root.visible=false;
 sceneReady=true;
}
function makeAvatar(p){
 const group=new THREE.Group(),rig=new THREE.Group(),gun=new THREE.Group();
 group.add(rig);
 const armor=new THREE.MeshStandardMaterial({
  color:p.side==="attacker"?0x2f9dc0:0xbd7e51,roughness:.77});
 const dark=new THREE.MeshStandardMaterial({color:0x243039,metalness:.42,roughness:.5});
 const steel=new THREE.MeshStandardMaterial({color:0x657982,metalness:.7,roughness:.32});
 const torso=new THREE.Mesh(new THREE.CylinderGeometry(.28,.34,1.06,10),armor);
 torso.position.y=1.05;rig.add(torso);
 const helmet=new THREE.Mesh(new THREE.SphereGeometry(.26,14,10),dark);
 helmet.position.y=1.72;rig.add(helmet);
 const visor=new THREE.Mesh(new THREE.BoxGeometry(.38,.11,.09),steel);
 visor.position.set(0,1.7,-.235);rig.add(visor);
 for(const x of [-.36,.36]){
  const arm=new THREE.Mesh(new THREE.CylinderGeometry(.10,.13,.77,8),armor);
  arm.position.set(x,1.23,-.13);arm.rotation.x=Math.PI/4;rig.add(arm);
 }
 const legs=new THREE.Mesh(new THREE.CylinderGeometry(.29,.26,.79,10),dark);
 legs.position.y=.39;rig.add(legs);
 const box=(w,h,d,x,y,z,mat)=>{
  const part=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  part.position.set(x,y,z);gun.add(part);return part;
 };
 box(.18,.16,.56,0,0,-.10,dark); // receiver
 box(.10,.08,.65,0,.07,-.53,steel); // top rail / barrel cover
 box(.08,.08,.38,0,.0,-.92,dark); // barrel
 box(.13,.28,.16,0,-.19,-.10,dark); // magazine
 box(.18,.10,.19,0,.22,-.18,steel); // holo sight
 const flash=new THREE.Mesh(new THREE.SphereGeometry(.11,8,6),
  new THREE.MeshBasicMaterial({color:0xffe6a1,transparent:true,opacity:.88}));
 flash.position.set(0,0,-1.12);flash.visible=false;gun.add(flash);
 gun.position.set(.26,1.22,-.25);rig.add(gun);
 scene.add(group);
 return {group,rig,gun,flash,x:p.x,y:p.y,z:p.z};
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
 const alive=Boolean(authoritative?.alive);
 const droning=Boolean(authoritative?.droneActive&&
  authoritative.drones?.[authoritative.droneIndex||0]?.deployed);
 const drone=authoritative?.drones?.[authoritative.droneIndex||0];
 if(droning&&!wasDroning&&drone)droneLook={yaw:drone.yaw,pitch:drone.pitch};
 if(droning){firing=false;aimHeld=false;leanTarget=0;}
 wasDroning=droning;
 const crouched=pressed.has("KeyC"),moving=
  ["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown",
   "ArrowLeft","ArrowRight"].some(k=>pressed.has(k));
 const sprinting=!aimHeld&&!crouched&&
  (pressed.has("ShiftLeft")||pressed.has("ShiftRight"));
 if(authoritative){
  $("life").textContent=authoritative.health+" HP";
  $("online-count").textContent=roster.length+" CONNECTED";
 }
 $("phase").textContent=phase==="prep"?"PREPARATION":phase==="action"?"ACTION":"ROUND";
 const clock=world?.bomb?.phase==="planted"?world.bomb.expiresAt:phaseEndsAt;
 $("timer").textContent=formatRoundClock((clock||Date.now())-Date.now());
 $("score").textContent="ROUND "+round+" · "+(world?.sitePair||"IRONVALE").toUpperCase();
 const job=world?.interactions?.[selfId];
 $("action").textContent=job?job.kind.toUpperCase().replace(/-/g," ")+" · "+
  Math.max(0,(job.endsAt-Date.now())/1000).toFixed(1)+"S":
  "F INTERACT · G BREACH · V MELEE · MIDDLE DETONATE";
 const bomb=world?.bomb;
 $("objective").textContent=bomb?.phase==="planted"?
  "DEFUSER ACTIVE · SITE "+bomb.site+" · "+$("timer").textContent:
  bomb?.phase==="dropped"?"DEFUSER DROPPED · PICK UP WITH F":
  bomb?.carrierId===selfId?"YOU HAVE DEFUSER · HOLD F AT A/B":
  "BOMB SITES A/B · "+(bomb?.phase||"WAITING").toUpperCase();
 renderWorldGeometry();
 if(pointerActive&&mode==="active"&&alive){
  if(droning){
   if(now-lastSend>=65){
    lastSend=now;
    send({type:"drone-step",yaw:droneLook.yaw,pitch:droneLook.pitch,
     forward:(pressed.has("KeyW")||pressed.has("ArrowUp")?1:0)-
      (pressed.has("KeyS")||pressed.has("ArrowDown")?1:0),
     right:(pressed.has("KeyD")||pressed.has("ArrowRight")?1:0)-
      (pressed.has("KeyA")||pressed.has("ArrowLeft")?1:0),
     jump:jumpQueued,boost:boostQueued});
    jumpQueued=false;boostQueued=false;
   }
  }else if(phase==="action"||authoritative?.side==="defender"){
   const next=moveOnlinePlayer(player,pressed,dt,collisionParts,{aiming:aimHeld});
   if(!solidAt(collisionParts,next.x,next.z,next.y))player=next;
   if(firing)attemptShot();
   const footstepMs=sprinting?275:crouched?660:430;
   if(moving&&now-lastFootstep>footstepMs){
    lastFootstep=now;sound.play(sprinting?"run-step":"step");
   }
   if(now-lastSend>=75){
    lastSend=now;send({type:"move",x:player.x,y:player.y,z:player.z,
     yaw:player.yaw,pitch:player.pitch,aiming:aimHeld,
     crouched,sprinting,lean:leanTarget});
   }
  }
 }
 if(!alive){pressed.clear();firing=false;aimHeld=false;}
 const seen=new Set();
 for(const p of roster){
  if(p.id===selfId||!p.alive||(phase==="prep"&&p.side==="attacker"))continue;
  seen.add(p.id);
  let v=remote.get(p.id);
  if(!v){v=makeAvatar(p);remote.set(p.id,v)}
  Object.assign(v,blendPosition(v,p,Math.min(1,dt*11)));
  v.group.position.set(v.x,v.y,v.z);
  v.group.rotation.y=p.yaw;
  v.rig.scale.y=p.crouched ? .73 : 1;
  v.rig.rotation.z=-(p.lean||0)*.13;
  v.gun.position.y=p.aiming?1.32:1.22;
  v.flash.visible=(remoteFlashAt.get(p.id)||0)>now;
 }
 for(const [id,v] of remote){
  if(!seen.has(id)){scene.remove(v.group);remote.delete(id);remoteFlashAt.delete(id)}
 }
 updateReconModels(dt,authoritative);
 const w=canvas.clientWidth||innerWidth,h=canvas.clientHeight||innerHeight;
 if(canvas.width!==Math.round(w*renderer.getPixelRatio())||
    canvas.height!==Math.round(h*renderer.getPixelRatio())){
  renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
 }
 if(droning&&drone){
  // The lens belongs to the persistent, server-controlled recon drone.
  camera.position.set(drone.x,drone.y+.28,drone.z);
  camera.rotation.set(droneLook.pitch,droneLook.yaw,0,"YXZ");
  camera.fov=90;camera.updateProjectionMatrix();
  weaponView.root.visible=false;$("reticle").hidden=false;
  $("stance").textContent="R-1 RECON DRONE "+((authoritative.droneIndex||0)+1)+
   " · "+drone.charges+" BOOSTS · "+(drone.grounded?"GROUNDED":"AIRBORNE");
 }else{
  const adsTarget=aimHeld&&alive&&phase==="action"?1:0;
  aimMix+=(adsTarget-aimMix)*Math.min(1,dt*20);
  if(Math.abs(adsTarget-aimMix)<.005)aimMix=adsTarget;
  leanAmount=smoothLean(leanAmount,leanTarget,dt);
  const pose=leanCameraPose(player.yaw,leanAmount);
  const safe=solidAt(collisionParts,player.x+pose.dx,player.z+pose.dz,player.y)?
   leanCameraPose(player.yaw,0):pose;
  camera.position.set(player.x+safe.dx,player.y+(crouched?1.08:1.62),
   player.z+safe.dz);
  camera.rotation.set(player.pitch,player.yaw,safe.roll,"YXZ");
  const targetFov=76-13*aimMix;
  if(Math.abs(camera.fov-targetFov)>.01){
   camera.fov=targetFov;camera.updateProjectionMatrix();
  }
  gunKick=Math.max(0,gunKick-dt*6.5);
  weaponView.root.visible=alive&&(phase==="action"||authoritative?.side==="defender");
  weaponView.update(dt,aimMix,gunKick,moving&&alive,now,aimHeld);
  $("reticle").hidden=aimHeld||aimMix>.65||!weaponView.root.visible;
  $("stance").textContent=phase==="prep"&&authoritative?.side==="attacker"?
   "WAITING FOR ACTION · DRONE LOST":
   (crouched?"CROUCHED":sprinting?"SPRINTING":"STANDING")+
   " · "+(aimHeld?"ADS":"HIPFIRE")+" · "+
   (leanTarget<0?"LEFT LEAN":leanTarget>0?"RIGHT LEAN":"CENTERED");
 }
 renderer.render(scene,camera);
 if(!$("notice").hidden&&now>noticeUntil)$("notice").hidden=true;
}
requestAnimationFrame(animate);
console.info("BLACKOUT V0.33 · BX-7 Mk II and synchronized ADS, lean, crouch, sprint and reload.");
