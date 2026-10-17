/* REDLINE Garage V3: a separate view without altering multiplayer flow. */
(() => {
  const overlay=document.getElementById("redlineGarageOverlay");
  const openBtn=document.getElementById("goToGarageBtn");
  const closeBtn=document.getElementById("closeGarageBtn");
  const raceName=document.getElementById("raceSelectedCarName");
  if(!overlay||!openBtn||!closeBtn||!raceName)return;
  let opened=false;
  const sync=()=>{
    const label=document.getElementById("selectedCarName")?.textContent?.trim();
    if(label)raceName.textContent=label;
  };
  function open(){
    if(window.REDLINE_MP?.room?.phase!=="car_select")return;
    overlay.classList.remove("hidden");
    opened=true;
    if(window.REDLINE_GARAGE_CONNECTION?.check)
      window.REDLINE_GARAGE_CONNECTION.check();
    else{
      window.REDLINE_DEALERSHIP?.refresh?.();
      window.REDLINE_UPGRADE_SHOP?.refresh?.();
    }
    closeBtn.focus();
  }
  function close(){
    if(!opened)return;
    opened=false;
    overlay.classList.add("hidden");
    sync();
    if(!openBtn.closest(".hidden"))openBtn.focus();
  }
  openBtn.addEventListener("click",open);
  closeBtn.addEventListener("click",close);
  window.addEventListener("keydown",event=>{
    if(event.key==="Escape"&&opened){event.preventDefault();close();}
  });
  const syncAfterGame=()=>queueMicrotask(sync);
  window.addEventListener("redline:garage-car-changed",syncAfterGame);
  window.addEventListener("redline:car-purchased",syncAfterGame);
  window.addEventListener("redline:room-state",event=>{
    const room=event.detail?.room||event.detail?.state||event.detail;
    if(room?.phase!=="car_select"||window.REDLINE_MP?.myPlayer?.ready)close();
    syncAfterGame();
  });
  window.addEventListener("redline:countdown",close);
  window.addEventListener("redline:race-started",close);
  window.addEventListener("redline:race-complete",close);
  sync();
  window.REDLINE_GARAGE_VIEW={open,close,get isOpen(){return opened}};
})();
