/*
 * REDLINE V20 Time Trial — fully local solo starts and personal ghost.
 * Uses normal factory physics but never creates a multiplayer room or
 * sends a time-trial result to the REDLINE Worker.
 * Public leaderboard displayed here is existing official race leaderboard,
 * NOT a fabricated or unaudited Time Trial ranking.
 */
import {readPersonalGhost,savePersonalGhost,TRIAL_MAPS,trialTimeLabel}
 from "./time-trial-core.js?v=20-2";
import {REDLINE_CAR_CATALOG,STARTER_CAR_IDS,REDLINE_CAR_IDS}
 from "./car-catalog.js";
const $=id=>document.getElementById(id);
const overlay=$("redlineTimeTrialOverlay");
const result=$("redlineTimeTrialResult");
const mapPick=$("redlineTrialMap");
const carPick=$("redlineTrialCar");
const status=$("redlineTrialStatus");
const pbInfo=$("redlineTrialPB");
const leaderboard=$("redlineTrialLeaderboard");
const menu=$("menu"),hud=$("hud");
const mapNames={neon:"NEON DISTRICT",arctic:"ARCTIC",canyon:"NEVADA RUN"};
let memory;
try{memory=window.localStorage}
catch{
 // Private/restricted browsers may block localStorage entirely. Solo
 // racing remains playable; the result screen explains that saving failed.
 memory={getItem(){return null},setItem(){throw Error("Storage blocked")}};
}
const state={
  active:false,map:"neon",car:"gt",upgrades:null,
  ghostEnabled:true,previous:null,lastResult:null,
  accountConnected:false,accountId:"offline-local",ownCars:[...STARTER_CAR_IDS]
};
function currentGhost(){
 return readPersonalGhost(memory,state.map,state.car,state.accountId);
}
function setPB(){
 const old=currentGhost();
 pbInfo.textContent=old?
   "LOCAL PERSONAL BEST · "+trialTimeLabel(old.time)+
   " · "+REDLINE_CAR_CATALOG[state.car].name:
   "No ghost recorded for this car and track yet";
}
function populateCars(){
 const valid=state.ownCars.filter(id=>REDLINE_CAR_IDS.includes(id));
 const previous=carPick.value||state.car;
 carPick.replaceChildren();
 for(const id of valid){
  const option=document.createElement("option");
  option.value=id;option.textContent=REDLINE_CAR_CATALOG[id].name;
  carPick.append(option);
 }
 const chosen=valid.includes(previous)?previous:(valid[0]||"gt");
 carPick.value=chosen;state.car=chosen;
 setPB();
}
async function getGarage(){
 status.textContent="Checking your owned cars and upgrades…";
 const get=window.REDLINE_MP?.getAccountStats;
 if(typeof get!=="function"){
  state.accountConnected=false;
  state.accountId="offline-local";
  state.ownCars=[...STARTER_CAR_IDS];
  populateCars();
  status.textContent="Account unavailable · free starter cars only · local runs not ranked";
  return;
 }
 try{
  const stats=await get.call(window.REDLINE_MP,true);
  const confirmed=Array.isArray(stats?.carGarage?.owned)?
    stats.carGarage.owned.filter(id=>REDLINE_CAR_IDS.includes(id)):[];
  if(!confirmed.length)throw Error("No confirmed garage received");
  state.ownCars=confirmed;state.savedUpgrades=stats?.carUpgrades||{};
  state.accountId=String(stats.accountId||"offline-local");
  state.accountConnected=true;populateCars();
  status.textContent="SOLO TIME TRIAL · real owned cars · records saved in this browser";
 }catch(e){
  state.ownCars=[...STARTER_CAR_IDS];
  state.savedUpgrades={};state.accountConnected=false;
  state.accountId="offline-local";populateCars();
  status.textContent="Garage temporarily unavailable · starters only: "+(e?.message||"Connection error");
 }
}
async function refreshLeaderboard(){
 leaderboard.replaceChildren();
 const header=document.createElement("strong");
 header.textContent="OFFICIAL "+mapNames[state.map]+" RACE TOP 10";
 leaderboard.append(header);
 const note=document.createElement("p");
 note.textContent="Existing verified multiplayer race records. Local Time Trial runs do not change these rankings.";
 leaderboard.append(note);
 try{
  const path="/api/stats/leaderboard?map="+encodeURIComponent(state.map);
  let response=await fetch("/api/redline"+path,{cache:"no-store"});
  if(!response.ok)response=await fetch("https://redline-multiplayer.guestuseonly0173.workers.dev"+path,{cache:"no-store"});
  if(!response.ok)throw Error("Leaderboard offline");
  const data=await response.json();
  if(!data?.ok||!Array.isArray(data.leaderboard))throw Error("Invalid leaderboard response");
  const list=document.createElement("ol");
  for(const row of data.leaderboard.slice(0,10)){
   if(!Number.isFinite(Number(row.time)))continue;
   const item=document.createElement("li");
   const title=document.createElement("span");
   title.textContent=String(row.username||"Racer");
   const time=document.createElement("strong");
   time.textContent=trialTimeLabel(row.time);
   item.append(title,time);list.append(item);
  }
  if(!list.children.length)note.textContent+=" No records yet.";
  leaderboard.append(list);
 }catch(e){
  const label=document.createElement("p");
  label.textContent="Online rankings unavailable right now. You can still run a local Time Trial.";
  leaderboard.append(label);
 }
}
function open(){
 if(window.REDLINE_MP?.room||window.REDLINE_MP?.connected){
  // Never hijack a current multiplayer race or its account state.
  alert("Leave your multiplayer room before starting a solo Time Trial.");
  return;
 }
 overlay.classList.remove("hidden");
 result.classList.add("hidden");
 getGarage();
 refreshLeaderboard();
}
function close(){
 overlay.classList.add("hidden");
}
function enter(){
 if(!window.REDLINE_GAME_READY){
   status.textContent="3D race engine is still loading. Try START again once the game is ready.";
   return;
 }
 if(!TRIAL_MAPS.includes(mapPick.value))return;
 const id=carPick.value;
 if(!state.ownCars.includes(id)||!REDLINE_CAR_IDS.includes(id))return;
 if(window.REDLINE_MP?.room||window.REDLINE_MP?.connected){
  status.textContent="Leave your multiplayer room first";return;
 }
 state.map=mapPick.value;
 state.car=id;
 state.upgrades=state.savedUpgrades?.[id]?.equipped||null;
 state.previous=currentGhost();
 state.active=true;
 state.lastResult=null;
 state.ghostEnabled=$("redlineGhostBeforeStart")?.checked!==false;
 overlay.classList.add("hidden");result.classList.add("hidden");
 $("redlineTrialRaceHud").classList.remove("hidden");
 $("redlineTrialGhostVisible").checked=state.ghostEnabled;
 $("redlineTrialDelta").textContent=state.previous?"CHASE YOUR GHOST":"FIRST RUN · SET A RECORD";
 $("startBtn").click();
}
function saveFinish(time,frames){
 const current={version:1,map:state.map,car:state.car,time:Math.floor(time),
  frames,recordedAt:Date.now()};
 const saved=savePersonalGhost(memory,current,state.accountId);
 state.lastResult={time,frames,saved,previous:state.previous};
 state.active=false;
 $("redlineTrialRaceHud").classList.add("hidden");
 hud.classList.add("hidden");
 menu.classList.remove("hidden");
 for(const id of ["homeScreen","joinScreen","createScreen","lobbyScreen","carSelectScreen"]){
  const screen=$(id);
  if(!screen)continue;
  screen.classList.toggle("hidden",id!=="homeScreen");
  screen.classList.toggle("active-screen",id==="homeScreen");
 }
 const heading=$("redlineTrialResultTitle"),summary=$("redlineTrialResultSummary");
 heading.textContent=saved.personalBest?"NEW PERSONAL BEST!":"TIME TRIAL COMPLETE";
 summary.textContent=trialTimeLabel(time)+(saved.personalBest?" · GHOST SAVED LOCALLY":
  saved.ok?" · BEST "+trialTimeLabel(saved.best):
  " · Browser storage unavailable; this run was not saved");
 result.classList.remove("hidden");
 setPB();
}
function retry(){
 result.classList.add("hidden");
 state.active=true;
 state.previous=currentGhost();
 $("redlineTrialRaceHud").classList.remove("hidden");
 $("redlineTrialDelta").textContent=state.previous?"CHASE YOUR GHOST":"FIRST RUN · SET A RECORD";
 $("startBtn").click();
}
function returnHome(){
 // Clear the engine's solo raceStarted flag even after a FINISH. Otherwise
 // connecting to a future multiplayer lobby could send stale trial state.
 window.dispatchEvent(new CustomEvent("redline:time-trial-exit"));
 state.active=false;
 result.classList.add("hidden");
 overlay.classList.add("hidden");
 $("redlineTrialRaceHud").classList.add("hidden");
 hud.classList.add("hidden");
 menu.classList.remove("hidden");
 for(const id of ["homeScreen","joinScreen","createScreen","lobbyScreen","carSelectScreen"]){
  const screen=$(id);
  if(!screen)continue;
  screen.classList.toggle("hidden",id!=="homeScreen");
  screen.classList.toggle("active-screen",id==="homeScreen");
 }
}
for(const button of document.querySelectorAll("[data-open-time-trial]"))
 button.addEventListener("click",open);
$("redlineTrialStart").addEventListener("click",enter);
$("redlineTrialClose").addEventListener("click",close);
$("redlineTrialRetry").addEventListener("click",retry);
$("redlineTrialExit").addEventListener("click",returnHome);
$("redlineTrialResultHome").addEventListener("click",returnHome);
mapPick.addEventListener("change",()=>{
 state.map=mapPick.value;setPB();refreshLeaderboard();
});
carPick.addEventListener("change",()=>{
 state.car=carPick.value;setPB();
});
$("redlineTrialGhostVisible").addEventListener("change",e=>{
 state.ghostEnabled=e.target.checked;
});
document.addEventListener("keydown",e=>{
 if(e.key.toLowerCase()==="g"&&state.active&&menu.classList.contains("hidden")&&
   !e.repeat&&!e.target.closest("input,textarea,select")){
  state.ghostEnabled=!state.ghostEnabled;
  $("redlineTrialGhostVisible").checked=state.ghostEnabled;
 }
 if(e.key==="Escape"&&!overlay.classList.contains("hidden"))close();
});
window.REDLINE_TT={
 get active(){return state.active},
 get map(){return state.map},
 get car(){return state.car},
 get upgrades(){return state.upgrades},
 get ghost(){return state.previous},
 get ghostEnabled(){return state.ghostEnabled},
 onFinish:saveFinish,
 setDelta(message){$("redlineTrialDelta").textContent=message},
 get storageNote(){return "Personal ghost saves are browser-local, not server rankings"}
};
