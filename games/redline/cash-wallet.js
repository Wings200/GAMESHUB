/* REDLINE garage wallet HUD: read-only server balance, never local cash. */
(() => {
  const panel=document.getElementById("redlineCashPanel");
  const number=document.getElementById("redlineCashBalance");
  const status=document.getElementById("redlineCashStatus");
  const carScreen=document.getElementById("carSelectScreen");
  if(!panel||!number||!status||!carScreen)return;

  // Read-only career milestone indicator; the Worker alone pays cash.
  const milestone=document.createElement("small");
  milestone.id="redlineCareerMilestone";
  milestone.style.cssText="display:block;margin-top:5px;color:#a5f3db;";
  milestone.textContent="Career milestones unlock after every 5 finishes";
  panel.querySelector(".cash-balance-block")?.append(milestone);
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
        const v18=Number(stats?.economyVersion)>=18;
        const primary=document.getElementById("redlinePrizePrimary");
        const secondary=document.getElementById("redlinePrizeSecondary");
        const bonus=document.getElementById("redlinePrizeBonus");
        if(primary)primary.textContent=v18?
          "Solo $35 · Multiplayer winner $20/player (max $160)":
          "Solo $5 · Multiplayer 1st $10/player (max $80)";
        if(secondary)secondary.textContent=v18?
          "2nd half · 3rd one-third · 4th–8th $12":
          "2nd half · 3rd one-third · 4th–8th $5";
        if(bonus)bonus.textContent=v18?
          "Every 5th finished race +$60 · New personal best +$15":
          "V18 rewards activate when the race server updates";
        const latest=Number(stats?.lastCashAward)||0;
        const last=stats?.lastCashBreakdown||{};
        const notes=[];
        if(Number(last.milestone)>0)notes.push("MILESTONE +$"+last.milestone);
        if(Number(last.personalBest)>0)notes.push("PERSONAL BEST +$"+last.personalBest);
        status.textContent=latest>0
          ? "Saved to account · Last finish +$"+latest+
            (notes.length?" · "+notes.join(" · "):"")
          : "Saved to your REDLINE account";
        const races=Number(stats?.racesFinished);
        if(!v18){
          milestone.textContent="V18 career milestones pending race server update";
        }else if(Number.isSafeInteger(races)&&races>=0){
          const progress=races%5;
          milestone.textContent="CAREER PROGRESS "+progress+"/5 FINISHES"+
            " · NEXT MILESTONE +$60 IN "+(5-progress)+
            (5-progress===1?" RACE":" RACES");
        }
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
