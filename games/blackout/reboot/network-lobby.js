// Room maker and WebSocket bridge around reboot/main.js.
// The ORIGINAL player physics, camera, house, gun and HUD remain in main.js.
// This module creates NO alternate canvas, map, weapon or movement simulator.
import {BLACKOUT_WORKER,normalizeRoomCode,roomSocketUrl} from "../online-state.js";
import {normalizeBlackoutGameSettings,canStartBlackoutRound} from "../src/multiplayer-protocol.js";

export function createBlackoutNetwork(callbacks={}){
 const $=id=>document.getElementById(id);
 const root=document.createElement("section");
 root.id="blackout-network-lobby";root.hidden=true;
 root.setAttribute("aria-label","BLACKOUT custom multiplayer lobby");
 root.innerHTML=`
  <div class="bon-panel">
   <div class="bon-head"><strong>BLACKOUT / CONNECTED OPERATIONS</strong><button id="bon-close" type="button">CLOSE</button></div>
   <p id="bon-title">CUSTOM GAMES · ORIGINAL HOUSE</p>
   <p class="bon-note">One original BLACKOUT engine. Create a private lobby, invite a friend by room code, and deploy into the existing two-story house.</p>
   <div class="bon-grid" id="bon-setup">
    <label>CALLSIGN<input id="bon-name" maxlength="22" autocomplete="nickname" placeholder="Operator"></label>
    <label>TEAM<select id="bon-side"><option value="attacker">ATTACK</option><option value="defender">DEFENSE</option></select></label>
    <label>ROOM CODE<input id="bon-code" maxlength="6" autocomplete="off" placeholder="6 CHARACTERS"></label>
    <label>ROOM NAME<input id="bon-room-name" maxlength="24" value="CUSTOM OPERATIONS"></label>
    <label>MAX PLAYERS<select id="bon-max"><option value="2">2</option><option value="4">4</option><option value="6">6</option><option value="8">8</option><option value="10" selected>10</option></select></label>
    <label>START RULE<select id="bon-rule"><option value="any">HOST CAN START SOLO</option><option value="opposing">BOTH TEAMS REQUIRED</option></select></label>
   </div>
   <div class="bon-actions" id="bon-connection"><button id="bon-create" type="button">CREATE PRIVATE ROOM</button><button id="bon-join" type="button">JOIN BY CODE</button></div>
   <div id="bon-members" hidden><div class="bon-code" id="bon-room-code"></div><div id="bon-teams"></div>
    <div class="bon-actions"><button id="bon-start" type="button">START MATCH</button><button id="bon-switch" type="button">SWITCH TEAM</button><button id="bon-copy" type="button">COPY CODE</button><button id="bon-leave" type="button">LEAVE ROOM</button></div>
   </div>
   <div class="bon-actions" id="bon-deploy" hidden><button id="bon-enter" type="button">ENTER ORIGINAL BLACKOUT</button><button id="bon-end" type="button" hidden>END CUSTOM ROUND</button></div>
   <p id="bon-status" role="status">Private lobby · waiting for connection.</p>
  </div>`;
 const style=document.createElement("style");
 style.textContent=`
 #blackout-network-lobby{position:fixed;inset:0;z-index:800;background:#030c15ef;color:#e8f8f7;overflow:auto;display:grid;place-items:center;padding:25px;font-family:system-ui,Arial}
 #blackout-network-lobby[hidden]{display:none}
 .bon-panel{width:min(780px,100%);padding:26px 30px;border:1px solid #417884;background:linear-gradient(140deg,#142936,#081621);box-shadow:0 20px 65px #000b}
 .bon-head{display:flex;justify-content:space-between;gap:15px;align-items:center;letter-spacing:.14em;font-size:12px;color:#72e3c2}
 .bon-head button{background:transparent;color:#a6cbd6;border:1px solid #47606b;padding:8px 14px;cursor:pointer}
 #bon-title{font-size:26px;font-weight:900;letter-spacing:.075em;margin:21px 0 8px}
 .bon-note{font-size:13px;line-height:1.65;color:#a8c1cc;margin-bottom:19px}
 .bon-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
 .bon-grid label{display:flex;flex-direction:column;gap:5px;color:#96b5c0;font-size:11px;letter-spacing:.10em}
 .bon-grid input,.bon-grid select{width:100%;padding:11px;background:#0a1620;color:#e5f8f7;border:1px solid #43606d}
 .bon-actions{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0}
 .bon-actions button{background:#143e44;color:#d9fff6;padding:12px 14px;font-weight:800;letter-spacing:.04em;border:1px solid #4bb89e;cursor:pointer}
 .bon-actions button:disabled{opacity:.45;cursor:default}
 #bon-status{color:#9ac7d0;font-size:12px;min-height:22px}
 .bon-code{font-size:29px;font-weight:900;letter-spacing:.3em;color:#7de8c9;margin-top:20px}
 #bon-teams{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px 0;white-space:pre-line;font-size:13px;color:#bcd6e0}
 @media(max-width:540px){.bon-grid,#bon-teams{grid-template-columns:1fr}}
 `;
 document.head.append(style);document.body.append(root);
 const by=id=>root.querySelector("#bon-"+id);
 let socket=null,roomCode=null,selfId=null,hostId=null,players=[],mode="lobby";
 let settings=normalizeBlackoutGameSettings({kind:"custom",startRule:"any",winCondition:"freeplay"});
 let phase="lobby",phaseEndsAt=0,world=null,kind="custom",isActive=false;
 let lastSentAt=0,lastDroneSentAt=0;
 const state=()=>({code:roomCode,id:selfId,hostId,players,mode,phase,phaseEndsAt,world,settings,
   self:players.find(p=>String(p.id)===String(selfId))||null});
 const status=s=>{by("status").textContent=s};
 by("name").value=sessionStorage.getItem("blackout-online-callsign")||"Operator";
 function panel(show){root.hidden=!show}
 function update(){
   by("members").hidden=!roomCode;
   by("connection").hidden=!!roomCode;
   by("setup").hidden=!!roomCode;
   by("room-code").textContent=roomCode||"";
   by("deploy").hidden=!isActive;
   by("enter").textContent=phase==="prep"?"ENTER PREPARATION":"ENTER LIVE MATCH";
   by("start").hidden=selfId!==hostId||isActive;
   by("start").disabled=!canStartBlackoutRound(settings,players);
   by("switch").disabled=isActive;
   by("end").hidden=selfId!==hostId||settings.kind!=="custom"||!isActive;
   const team=(side)=>side.toUpperCase()+"\n"+(players.filter(p=>p.side===side).map(p=>
     p.name+(String(p.id)===String(selfId)?" · YOU":"")).join("\n")||"WAITING FOR PLAYERS");
   by("teams").replaceChildren();
   for(const side of ["attacker","defender"]){const el=document.createElement("div");el.textContent=team(side);by("teams").append(el)}
 }
 function disconnect(notify=true){
   const old=socket;socket=null;if(old){old.onclose=null;old.onmessage=null;old.close()}
   const wasActive=isActive;
   roomCode=null;selfId=null;hostId=null;players=[];mode="lobby";phase="lobby";
   phaseEndsAt=0;world=null;isActive=false;lastSentAt=0;lastDroneSentAt=0;
   update();if(wasActive)callbacks.onLeave?.();
   if(notify)status("Left multiplayer room");
 }
 const send=obj=>{if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify(obj))};
 const roomSettings=()=>normalizeBlackoutGameSettings({
   kind,roomName:by("room-name").value,maxPlayers:Number(by("max").value),
   startRule:kind==="custom"?by("rule").value:"opposing",
   winCondition:kind==="custom"?"freeplay":"elimination"});
 async function connect(join){
   if(socket)return;
   const name=by("name").value.trim().slice(0,22)||"Operator";
   sessionStorage.setItem("blackout-online-callsign",name);
   for(const id of ["create","join"])by(id).disabled=true;
   try{
     // The GAMESHUB page is developer-gated. Never bypass that gate.
     const access=await fetch("/api/blackout-access",{credentials:"same-origin",cache:"no-store"});
     const permission=access.ok?await access.json():null;
     if(!permission||(!permission.admin&&permission.role!=="tester"&&!permission.allowed))
       throw new Error("BLACKOUT developer access required");
     let code;
     if(join)code=normalizeRoomCode(by("code").value);
     else {
       const response=await fetch(BLACKOUT_WORKER+"/api/blackout/rooms",{
         method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({settings:roomSettings()})});
       const body=await response.json();
       if(!response.ok||!body.ok)throw new Error(body.error||"Room creation failed");
       code=normalizeRoomCode(body.code);
     }
     if(!code)throw new Error("Enter a valid six-character room code");
     const ws=new WebSocket(roomSocketUrl(code,{name,side:by("side").value,
       operator:by("side").value==="attacker"?"striker":"sentry"}));
     socket=ws;roomCode=code;status("Connecting to room "+code+"…");update();
     ws.onopen=()=>{if(socket===ws)status("Connected · waiting for players")};
     ws.onmessage=e=>{
       if(socket!==ws)return;
       let m;try{m=JSON.parse(e.data)}catch{return}
       if(m.type==="welcome")selfId=String(m.id);
       if(m.type==="welcome"||m.type==="state"){
         const started=isActive;
         players=Array.isArray(m.players)?m.players:[];
         mode=m.mode||"lobby";phase=m.phase||"lobby";
         phaseEndsAt=m.phaseEndsAt||0;world=m.world||null;
         if(m.hostId!=null)hostId=String(m.hostId);
         else if(m.host)hostId=selfId;
         if(m.settings)settings=normalizeBlackoutGameSettings(m.settings);
         isActive=mode==="active";
         const next=state();update();
         if(!started&&isActive){callbacks.onStart?.(next);panel(true)}
         if(started&&!isActive){callbacks.onEnd?.(next);panel(true)}
         if(isActive)callbacks.onState?.(next,m);
         if(!isActive)status("ROOM "+roomCode+" · "+players.length+" REAL PLAYERS · WAITING FOR HOST");
         if(m.event==="hit")callbacks.onHit?.(next,m);
         if(m.event==="shot")callbacks.onShot?.(next,m);
       }else if(m.type==="correction")callbacks.onCorrection?.(m);
       else if(m.type==="notice")status(m.message||"Server notice");
       else if(m.type==="shot-ok")callbacks.onAmmo?.(m.shots);
     };
     ws.onclose=()=>{if(socket!==ws)return;disconnect(false);panel(true);status("Room disconnected · check Worker deployment")};
     ws.onerror=()=>status("Could not reach BLACKOUT multiplayer Worker");
   }catch(e){disconnect(false);status(String(e?.message||e))}
   finally{for(const id of ["create","join"])by(id).disabled=false}
 }
 by("create").onclick=()=>connect(false);
 by("join").onclick=()=>connect(true);
 by("start").onclick=()=>send({type:"start"});
 by("switch").onclick=()=>send({type:"side",side:state().self?.side==="attacker"?"defender":"attacker"});
 by("end").onclick=()=>send({type:"end"});
 by("leave").onclick=()=>{disconnect();panel(true)};
 by("close").onclick=()=>{disconnect(false);panel(false)};
 by("copy").onclick=()=>{if(roomCode)navigator.clipboard?.writeText(roomCode)};
 by("enter").onclick=()=>{if(isActive){panel(false);callbacks.onEnter?.()}};
 function open(requested){
   if(socket)disconnect(false);
   kind=requested==="standard"?"standard":"custom";
   by("title").textContent=kind==="standard"?"ONLINE 5V5 · ORIGINAL BLACKOUT":"CUSTOM GAMES · ORIGINAL BLACKOUT";
   by("rule").value=kind==="standard"?"opposing":"any";
   panel(true);update();status("Ready to create or join a real-player room.");
 }
 function sendMovement(p,now,aiming,lean){
   if(!isActive||phase!=="action"||!p||now-lastSentAt<75)return;
   lastSentAt=now;
   send({type:"move",x:p.x,y:p.y,z:p.z,yaw:p.yaw,pitch:p.pitch,
     aiming:Boolean(aiming),crouched:Boolean(p.crouched),
     sprinting:Boolean(p.sprinting),lean:lean||0});
 }
 function sendDrone(d,inputs,now){
   if(!isActive||!d||now-lastDroneSentAt<65)return;
   lastDroneSentAt=now;
   send({type:"drone-step",yaw:d.yaw,pitch:d.pitch,
     forward:inputs.forward||0,right:inputs.right||0,
     jump:Boolean(inputs.jumpPressed),boost:Boolean(inputs.boostPressed)});
 }
 function timeLabel(){
   const sec=Math.max(0,Math.ceil((phaseEndsAt-Date.now())/1000));
   return String(Math.floor(sec/60)).padStart(2,"0")+":"+
     String(sec%60).padStart(2,"0");
 }
 return {open,state,disconnect,send,sendMovement,sendDrone,timeLabel,
   get active(){return isActive},get phase(){return phase},
   get connected(){return Boolean(socket&&socket.readyState===WebSocket.OPEN)},
   showPause(){if(isActive)panel(true)},
   hidePause(){if(isActive)panel(false)}
 };
}
