/* REDLINE garage wallet HUD: read-only server balance, never local cash. */
(() => {
  const panel=document.getElementById("redlineCashPanel");
  const number=document.getElementById("redlineCashBalance");
  const status=document.getElementById("redlineCashStatus");
  const carScreen=document.getElementById("carSelectScreen");
  if(!panel||!number||!status||!carScreen)return;

  let request=null;
  let lastFetch=0;
  let currentBalance=null;
  async function refresh(force=false) {
    if(request)return request;
    if(!force && currentBalance!==null &&
       Date.now()-lastFetch<15000)return;
    lastFetch=Date.now();
    const api=window.REDLINE_MP?.getAccountStats;
    if(typeof api!=="function"){
      status.textContent="Waiting for account connection…";
      return;
    }
    status.textContent="Checking your account…";
    request=(async()=>{
      try{
        const stats=await api.call(window.REDLINE_MP);
        const amount=Number(stats?.cashBalance);
        if(!Number.isSafeInteger(amount)||amount<0)
          throw new Error("Invalid balance");
        currentBalance=amount;
        number.textContent="$"+amount.toLocaleString();
        const latest=Number(stats?.lastCashAward)||0;
        status.textContent=latest>0
          ? "Saved to account · Last finish +$"+latest
          : "Saved to your REDLINE account";
        window.dispatchEvent(new CustomEvent("redline:cash-updated",{
          detail:{balance:amount,lastAward:latest}
        }));
      }catch(e){
        status.textContent="Balance unavailable. Reopen the garage to retry.";
      }finally{
        request=null;
      }
    })();
    return request;
  }
  // Reconnect and entering car selection are the main balance refreshes.
  window.addEventListener("redline:room-state",event=>{
    const room=event.detail?.room||event.detail?.state||event.detail;
    if(room?.phase==="car_select")refresh();
  });
  // Refresh after the server finishes awarding all placements.
  window.addEventListener("redline:race-complete",()=>refresh(true));
  window.addEventListener("redline:results-shown",event=>{
    if(!event.detail?.waiting)refresh(true);
  });
  window.addEventListener("focus",()=>{
    if(!carScreen.classList.contains("hidden"))refresh();
  });
  document.getElementById("openCarSelectBtn")
    ?.addEventListener("click",()=>refresh(true));
  window.REDLINE_CASH={
    refresh:()=>refresh(true),
    get balance(){return currentBalance;}
  };
  if(!carScreen.classList.contains("hidden"))refresh();
})();
