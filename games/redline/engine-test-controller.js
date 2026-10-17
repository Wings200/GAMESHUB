/*
 * REDLINE ENGINE TEST LAB — local-only owner-unlocked sandbox.
 * This controller intentionally has NO Worker URL, WebSocket, account tokens,
 * wallet calls, purchases, saved garage, rewards, or storage mutation.
 */
import {REDLINE_CAR_CATALOG,REDLINE_CAR_IDS} from "./car-catalog.js";
const $=id=>document.getElementById(id);
const rooms=["homeScreen","joinScreen","createScreen","lobbyScreen","carSelectScreen"];
const names=REDLINE_CAR_IDS;
const tracks={neon:"NEON DISTRICT",arctic:"ARCTIC"};
const ownPlayer={id:"local-engine-lab",username:"TEST DRIVER",car:"gt",ready:false,host:true,upgrades:null};
const room={code:"LABONLY",phase:"car_select",map:"neon",players:[ownPlayer]};
let startAt=Date.now()+3600000,chosen="gt",started=false;
function show(screen) {
  for(const id of rooms){
    const el=$(id);if(!el)continue;
    const visible=id===screen;
    el.classList.toggle("hidden",!visible);
    el.classList.toggle("active-screen",visible);
  }
  $("menu")?.classList.remove("hidden");
}
function syncRoom(){
  window.dispatchEvent(new CustomEvent("redline:room-state",{detail:room}));
  window.dispatchEvent(new CustomEvent("redline:garage-car-changed"));
}
function setCar(id){
  if(!Object.hasOwn(REDLINE_CAR_CATALOG,id))return;
  chosen=id;ownPlayer.car=id;ownPlayer.ready=false;
  $("raceSelectedCarName").textContent=REDLINE_CAR_CATALOG[id].name;
  $("selectedCarName").textContent=REDLINE_CAR_CATALOG[id].name;
  $("lockStatus").textContent="ALL CARS UNLOCKED · TEST ONLY";
  $("carSelectStatus").textContent=REDLINE_CAR_CATALOG[id].name+
    " ready · no REDLINE cash or ownership will be changed";
  $("lockInBtn").textContent="TEST DRIVE "+REDLINE_CAR_CATALOG[id].name;
  document.querySelectorAll("[data-lab-car]").forEach(b=>{
    b.classList.toggle("selected",b.dataset.labCar===id);
    b.setAttribute("aria-pressed",String(b.dataset.labCar===id));
  });
  if($("labQuickCar"))$("labQuickCar").value=id;
  if($("labAudioDescription"))$("labAudioDescription").textContent=
    id==="gt"?"V15 · recorded inline-six engine":
    id==="ironclad"?
      (window.REDLINE_LAB_V8_STATUS?.().ready?
        "V16 · recorded Mercury V8 ready":
        "V16 bank not available yet · V11.2 fallback active"):
    "V11.2 fallback · awaiting a licensed "+engineType(id)+" engine bank";
  syncRoom();
}
function engineType(id){
  return ({
    vortex:"V10/V12",apex:"four-cylinder",bayside:"turbo four-cylinder",
    aurora:"rally four-cylinder",ironclad:"V8",cirrus:"grand-touring",
    obsidian:"high-revving supercar",phantom:"hypercar"
  })[id]||"recorded";
}
function setMap(id){
  if(!Object.hasOwn(tracks,id))return;
  room.map=id;
  if($("trackSelect"))$("trackSelect").value=id;
  if($("labMap"))$("labMap").value=id;
  if($("labQuickMap"))$("labQuickMap").value=id;
  syncRoom();
}
function testDrive(){
  // Restart recorded engine loops and startup on car switching in the lab.
  if(started)window.REDLINE_LAB_RESTART_AUDIO?.();
  started=true;
  startAt=Date.now()+1800;
  ownPlayer.ready=true;
  window.dispatchEvent(new CustomEvent("redline:countdown",{detail:{startAt}}));
  window.dispatchEvent(new CustomEvent("redline:race-started",{detail:{startAt}}));
  $("carReadyCount").textContent="1 / 1 READY";
  $("totalRacers").textContent="1";
  $("startBtn").click(); // existing 3D gameplay and audio modules
  $("labQuickControls").hidden=false;
  $("labReturnButton").hidden=false;
  $("labFinishMessage").hidden=true;
}
const statsStub=()=>({cashBalance:0,lastCashAward:0,
  carGarage:{owned:[...names],selected:chosen},carUpgrades:{},garage:{}});
window.REDLINE_ENGINE_LAB=true;
window.REDLINE_MP=Object.freeze({
  get connected(){return false},
  get serverNow(){return Date.now()},
  get raceStartAt(){return startAt},
  get clockOffset(){return 0},
  get playerId(){return ownPlayer.id},
  get roomCode(){return room.code},
  get room(){return room},
  get players(){return room.players},
  get myPlayer(){return ownPlayer},
  getAccountStats:async()=>statsStub(),
  purchaseCar:async()=>({ok:false,error:"Test-only session: no purchases"}),
  purchaseUpgrade:async()=>({ok:false,error:"Test-only session: no purchases"}),
  equipUpgrade:async()=>({ok:false,error:"Test-only session: no purchases"}),
  send:()=>false,sendRaceState:()=>false,
  sendFinish:()=>{
    $("labFinishMessage").hidden=false;
    return false; // deliberately no payout and no persistence
  },
  leaveRoom:()=>false,stop:()=>false
});
const labPicker=document.createElement("section");
labPicker.className="lab-picker";
labPicker.setAttribute("aria-label","All unlocked test cars");
const head=document.createElement("div");
head.className="lab-picker-heading";
head.innerHTML="<h2>ENGINE TEST GARAGE</h2><p>All nine cars unlocked in this tab only. No real garage access, purchases, stats, or race rewards.</p>";
labPicker.append(head);
const mapField=document.createElement("label");
mapField.className="lab-map-field";
mapField.textContent="TEST TRACK ";
const mapSelect=document.createElement("select");mapSelect.id="labMap";
for(const [id,title] of Object.entries(tracks)){
  const opt=document.createElement("option");opt.value=id;opt.textContent=title;mapSelect.append(opt);
}
mapSelect.addEventListener("change",()=>setMap(mapSelect.value));
mapField.append(mapSelect);labPicker.append(mapField);
const grid=document.createElement("div");grid.className="lab-car-grid";
for(const id of names){
  const spec=REDLINE_CAR_CATALOG[id];
  const btn=document.createElement("button");
  btn.type="button";btn.className="car-card lab-car-card";
  btn.dataset.labCar=id;
  btn.innerHTML='<div class="lab-car-icon" aria-hidden="true">🏎️</div>';
  const title=document.createElement("strong");title.textContent=spec.name;
  const meta=document.createElement("span");meta.textContent=
    spec.style+" · $0 IN LAB";
  const sound=document.createElement("small");sound.textContent=
    id==="gt"?"REAL i6 AUDIO":
    id==="ironclad"?"REAL V8 AUDIO · V16":"ENGINE SAMPLE PENDING";
  btn.append(title,meta,sound);
  btn.addEventListener("click",()=>setCar(id));
  grid.append(btn);
}
labPicker.append(grid);
const audioDescription=document.createElement("div");
audioDescription.id="labAudioDescription";audioDescription.className="lab-audio-description";
labPicker.append(audioDescription);
const credit=document.createElement("p");
credit.className="lab-audio-description";
credit.style.cssText="font-size:11px;font-weight:400;line-height:1.6;max-width:900px;";
credit.innerHTML='IRONCLAD V8 audio adapted from <a href="https://freesound.org/people/lonemonk/sounds/62564/" target="_blank" rel="noopener noreferrer">1951 Mercury Warm Start and Idle</a> and <a href="https://freesound.org/people/lonemonk/sounds/62567/" target="_blank" rel="noopener noreferrer">Idle and Throttle 2</a> by <strong>lonemonk</strong>, licensed under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>. Edited and looped for this prototype.';
labPicker.append(credit);
$("carSelectScreen").insertBefore(labPicker,$("carSelectScreen").querySelector(".car-select-footer"));
const toolbar=document.createElement("aside");
toolbar.id="labQuickControls";
toolbar.hidden=true;
toolbar.className="lab-driving-toolbar";
toolbar.innerHTML=`<strong>ENGINE LAB · NO SAVES</strong>
  <label>CAR <select id="labQuickCar"></select></label>
  <label>TRACK <select id="labQuickMap"></select></label>
  <button id="labSwapCar" type="button">RESTART TEST DRIVE</button>
  <button id="labReturnButton" type="button">TEST GARAGE</button>`;
for(const id of names){
  const opt=document.createElement("option");
  opt.value=id;opt.textContent=REDLINE_CAR_CATALOG[id].name;
  $("labQuickCar")?.append(opt);
  toolbar.querySelector("#labQuickCar").append(opt);
}
for(const [id,title] of Object.entries(tracks)){
  const opt=document.createElement("option");opt.value=id;opt.textContent=title;
  toolbar.querySelector("#labQuickMap").append(opt);
}
toolbar.querySelector("#labSwapCar").addEventListener("click",()=>{
  setCar($("labQuickCar").value);
  setMap($("labQuickMap").value);
  testDrive();
});
toolbar.querySelector("#labReturnButton").addEventListener("click",()=>{
  // Return to the non-networked car selector, not the account garage.
  // The running simulation remains local and can be restarted at any time.
  $("labQuickControls").hidden=true;
  $("hud").classList.add("hidden");
  show("carSelectScreen");
  ownPlayer.ready=false;syncRoom();
});
document.body.append(toolbar);
const finish=document.createElement("div");
finish.id="labFinishMessage";finish.className="lab-finish-message";
finish.hidden=true;finish.textContent="TEST COMPLETE · NO CASH OR STATS SAVED · USE RESTART TEST DRIVE";
document.body.append(finish);
// In-game diagnostic distinguishes downloaded file from real decoded audio.
// A previous V16 build showed "ready" for the bank even if the soundscape
// was still using V11.2. This diagnostic reports actual engine activation.
const diag=document.createElement("aside");
diag.id="labV8DiagnosticPanel";
diag.style.cssText="position:fixed;bottom:12px;left:12px;z-index:1100;"+
  "min-width:265px;max-width:370px;background:#0a1c25ef;"+
  "border:1px solid #508990;border-radius:12px;"+
  "padding:12px;color:#ecf6f5;"+
  "font:12px/1.45 system-ui,sans-serif;box-shadow:0 8px 25px #0009;";
const diagHeader=document.createElement("strong");
diagHeader.style.cssText="display:block;color:#91ded6;font-size:13px;";
diagHeader.textContent="IRONCLAD V16 · AUDIO STATUS";
const diagStatus=document.createElement("div");
diagStatus.id="labV8LiveStatus";
diagStatus.style.cssText="margin:7px 0;overflow-wrap:anywhere;";
diagStatus.setAttribute("role","status");
diagStatus.textContent="Checking V8 recording…";
const diagInfo=document.createElement("div");
diagInfo.style.cssText="font-size:11px;color:#b3cbd1;max-width:330px;";
const diagBtns=document.createElement("div");
diagBtns.style.cssText="display:flex;flex-wrap:wrap;gap:7px;margin-top:9px;";
function diagButton(text){
  const button=document.createElement("button");button.type="button";
  button.textContent=text;
  button.style.cssText="border:1px solid #659fa6;border-radius:6px;"+
    "background:#18404e;color:#ecf8fa;padding:7px 10px;cursor:pointer;";
  diagBtns.append(button);
  return button;
}
const retryButton=diagButton("RETRY V8 AUDIO");
const testSampleButton=diagButton("HEAR RAW V8");
const copyButton=diagButton("COPY STATUS");
retryButton.addEventListener("click",async()=>{
  retryButton.disabled=true;diagStatus.textContent="Retrying V8 bank download…";
  try{
    await window.REDLINE_LAB_V8_RETRY?.();
  }catch(e){diagStatus.textContent="Retry failed: "+e.message}
  finally{retryButton.disabled=false;renderV8Diagnostics()}
});
testSampleButton.addEventListener("click",async()=>{
  testSampleButton.disabled=true;
  try{
    const result=await window.REDLINE_LAB_V8_AUDITION?.();
    if(!result?.ok)throw Error("V8 preview not ready");
    diagStatus.textContent="Playing authentic V8 excerpt directly · "+
      result.seconds.toFixed(1)+" seconds";
  }catch(e){diagStatus.textContent="Raw V8 test failed: "+(e?.message||e)}
  finally{testSampleButton.disabled=false}
});
copyButton.addEventListener("click",()=>{
  const status=window.REDLINE_LAB_V8_DIAGNOSTICS?.();
  const formatted=JSON.stringify(status||{error:"audio module not ready"},null,2);
  if(navigator.clipboard?.writeText){
    navigator.clipboard.writeText(formatted).then(()=>{
      diagStatus.textContent="Audio diagnostic copied; paste it into ChatGPT";
    }).catch(()=>{
      diagStatus.textContent="Clipboard blocked. Status: "+formatted;
    });
  }else diagStatus.textContent="Status: "+formatted;
});
diag.append(diagHeader,diagStatus,diagInfo,diagBtns);
document.body.append(diag);
function renderV8Diagnostics(){
  const d=window.REDLINE_LAB_V8_DIAGNOSTICS?.();
  if(!d){
    diagStatus.textContent="Starting engine diagnostics…";
    return;
  }
  const selected=d.selectedCar||chosen;
  const v=d.v8;
  const bank=d.bank;
  let label,color;
  if(selected!=="ironclad"){
    label="IRONCLAD V16 is idle · "+REDLINE_CAR_CATALOG[selected]?.name+" selected";
    color="#b6cbce";
  }else if(!bank?.ready){
    label="V11.2 FALLBACK · V8 bank unavailable";
    color="#ffad98";
  }else if(!d.raceEnabled){
    label="V8 BANK READY · Start an IRONCLAD test drive";
    color="#f5d99b";
  }else if(d.starting||v?.loading){
    label="Preparing and decoding V8 recordings…";
    color="#f5d99b";
  }else if(v?.v8Audible&&v?.layerCount===8){
    label="V16 ACTIVE · REAL V8 PLAYING · 8 layers";
    color="#88edb5";
  }else if(v?.error){
    label="V11.2 FALLBACK · decode error: "+v.error;
    color="#ffad98";
  }else{
    label="V11.2 FALLBACK · Recorded V8 not active";
    color="#ffad98";
  }
  if(!testSampleButton.disabled)diagStatus.textContent=label;
  diagStatus.style.color=color;
  const detail=[
    "V8 bank: "+(bank?.status||"not loaded"),
    "Race: "+(d.raceEnabled?"ON":"OFF")+" · Selected: "+selected,
    "V8 mixer: "+(v?.active?"running":"not started")+
      " · Decoded: "+(v?.decoded?"YES":"NO")+
      " · Layers: "+(v?.layerCount||0),
    d.telemetryAgeMs!==null?"Telemetry: "+d.telemetryAgeMs+" ms old":"Telemetry: no samples yet"
  ];
  diagInfo.textContent=detail.join(" | ");
}
window.setInterval(renderV8Diagnostics,550);
window.addEventListener("redline:v8-bank-status",renderV8Diagnostics);

const nav=document.createElement("div");
nav.className="lab-brand";nav.innerHTML=
  '<strong>REDLINE · PRIVATE ENGINE LAB</strong><span>ALL CARS UNLOCKED · NO SERVER CONNECTIONS</span>';
document.body.append(nav);
$("usernameDisplay").textContent="TEST DRIVER";
$("usernameStatus").textContent="Offline test identity · not signed in to your live garage";
$("joinRoomBtn").textContent="OPEN ENGINE TEST GARAGE";
$("joinRoomBtn").addEventListener("click",()=>show("carSelectScreen"));
$("createRoomBtn").textContent="OPEN ENGINE TEST GARAGE";
$("createRoomBtn").addEventListener("click",()=>show("carSelectScreen"));
$("openCarSelectBtn")?.addEventListener("click",()=>show("carSelectScreen"));
$("lockInBtn").addEventListener("click",testDrive);
$("labMap").value="neon";
$("carReadyCount").textContent="1 TEST DRIVER";
$("totalRacers").textContent="1";
$("labReturnButton").hidden=true;
setCar("gt");
setMap("neon");
show("carSelectScreen");
window.addEventListener("redline:v8-bank-status",()=>{
  if(chosen==="ironclad")setCar("ironclad");
});
