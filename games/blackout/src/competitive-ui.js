// BLACKOUT V4.0: front-end flow is deliberately offline. This is NOT a network matchmaking client.
// All operator/loadout controls continue to use main.js's existing live game selectors.
export function initCompetitiveUI({menu,start,status,sightSelect,getOperator,getRole}){
  const screens=[...menu.querySelectorAll("[data-bo-screen]")];
  const navs=[...menu.querySelectorAll("[data-bo-nav]")];
  const queue=menu.querySelector("#boQueue");
  const queueStatus=menu.querySelector("#boQueueStatus");
  const find=menu.querySelector("#boFindMatch");
  const cancel=menu.querySelector("#boCancelQueue");
  const ready=menu.querySelector("#boReadyOperator");
  const lock=menu.querySelector("#boLockOperator");
  const optics=[...menu.querySelectorAll("[data-bo-optic]")];
  const roleButtons=[menu.querySelector("#attackRole"),menu.querySelector("#defendRole")];
  let page="home",queueTimeout=null,searching=false;
  function updateLoadout(){
    const operator=getOperator();
    if(ready&&operator)ready.textContent=operator.name;
    for(const button of optics){
      const selected=button.dataset.boOptic===sightSelect.value;
      button.classList.toggle("selected",selected);
      button.setAttribute("aria-pressed",String(selected));
    }
    const opRole=getRole();
    menu.dataset.boRole=opRole;
    for(const button of roleButtons)if(button)button.setAttribute("aria-pressed",String(button.classList.contains("active")));
  }
  function navigate(next){
    if(searching)return;
    if(!screens.some(screen=>screen.dataset.boScreen===next))return;
    page=next;menu.dataset.boPage=next;
    for(const screen of screens)screen.classList.toggle("is-active",screen.dataset.boScreen===next);
    for(const button of navs){
      const current=button.dataset.boNav===next;
      button.classList.toggle("active",current);
      if(button.closest(".bo-nav-links"))button.setAttribute("aria-current",current?"page":"false");
    }
    updateLoadout();
  }
  function stopQueue(){
    if(queueTimeout!==null){clearTimeout(queueTimeout);queueTimeout=null;}
    searching=false;queue.classList.add("hidden");
    if(find)find.disabled=false;
  }
  function findLocalMatch(){
    if(searching)return;
    searching=true;
    navigateWorkaround();
    queue.classList.remove("hidden");
    if(find)find.disabled=true;
    queueStatus.textContent="PREPARING LOCAL AI SQUADS...";
    status.textContent="CREATING LOCAL OFFLINE TRAINING SESSION";
    // This is only a short local UI transition. NO online service is contacted
    // and no other human player is implied to be connected.
    queueTimeout=setTimeout(()=>{
      queueTimeout=null;searching=false;queue.classList.add("hidden");
      if(find)find.disabled=false;
      navigate("operators");
      status.textContent="TRAINING SESSION READY · 1 PLAYER + 9 AI";
    },1250);
  }
  // Keep play navigation selected while the local training session is assembled.
  function navigateWorkaround(){page="play";}
  navs.forEach(button=>button.addEventListener("click",()=>navigate(button.dataset.boNav)));
  if(find)find.addEventListener("click",findLocalMatch);
  if(cancel)cancel.addEventListener("click",()=>{
    stopQueue();
    status.textContent="TRAINING SESSION CANCELLED";
    navigate("play");
  });
  if(lock)lock.addEventListener("click",()=>navigate("loadout"));
  if(sightSelect)sightSelect.addEventListener("change",updateLoadout);
  optics.forEach(button=>button.addEventListener("click",()=>{
    sightSelect.value=button.dataset.boOptic;
    sightSelect.dispatchEvent(new Event("change",{bubbles:true}));
    updateLoadout();
  }));
  roleButtons.forEach(button=>button?.addEventListener("click",()=>{
    // The main.js role handler is registered first and remains authoritative.
    updateLoadout();
  }));
  const cards=menu.querySelector("#operatorCards");
  cards?.addEventListener("click",()=>updateLoadout());
  const list=menu.querySelector("#operatorSelect");
  list?.addEventListener("change",updateLoadout);
  window.addEventListener("blackout:menuopen",event=>{
    stopQueue();
    navigate(event.detail?.started?"loadout":"home");
    if(event.detail?.started&&start)start.innerHTML="RESUME TRAINING <b>›</b>";
  });
  window.addEventListener("blackout:gamestart",()=>{
    stopQueue();
    if(start)start.innerHTML="DEPLOY OPERATOR <b>›</b>";
  });
  navigate("home");
  return {navigate,stopQueue,updateLoadout,get page(){return page;}};
}

let lastCue="";
export function playTacticalPhaseAnnouncement({phase,role,roundNumber,audio}){
  if(phase!=="prep"&&phase!=="attack"&&phase!=="guard")return;
  // Pausing and reopening the match must not repeatedly play the same announcement.
  const key=roundNumber+":"+phase+":"+role;
  if(lastCue===key)return;
  lastCue=key;
  audio.play("tactical-cue"); // five original synthesized beats; not a Ubisoft recording
  const spoken=phase==="prep"?
    role==="attacker"?"Use your drone to locate the bomb sites.":"Prepare your defenses and protect the bombs.":
    role==="attacker"?"Make your way to the bomb sites and plant the defuser.":"Defend the bombs. Stop the attackers.";
  // System text-to-speech is optional; the equivalent objective remains on-screen.
  if(typeof window==="undefined"||!window.speechSynthesis||!window.SpeechSynthesisUtterance)return;
  setTimeout(()=>{
    if(!document.body.classList.contains("playing"))return;
    try{
      const synth=window.speechSynthesis;
      synth.cancel();
      const utterance=new window.SpeechSynthesisUtterance(spoken);
      utterance.lang="en-US";utterance.rate=.99;utterance.pitch=.78;utterance.volume=.85;
      synth.speak(utterance);
    }catch(error){console.warn("BLACKOUT optional briefing voice unavailable",error);}
  },760);
}
