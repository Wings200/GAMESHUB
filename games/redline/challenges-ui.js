/*
 * REDLINE V19 Challenge Board (read-only client).
 * The existing authenticated Worker owns challenge rules, progress, periods
 * and payouts. No challenge completion or cash amount is sent by the UI.
 */
(()=>{
  const board=document.getElementById("redlineChallengeBoard");
  const overlay=document.getElementById("redlineChallengesOverlay");
  const status=document.getElementById("redlineChallengeStatus");
  const resetText=document.getElementById("redlineChallengeReset");
  const closeButton=document.getElementById("closeChallengesBtn");
  const toast=document.getElementById("redlineChallengeToast");
  if(!board||!overlay||!status||!resetText||!closeButton||!toast)return;
  const buttons=[...document.querySelectorAll("[data-open-challenges]")];
  let lastData=null,inflight=null,focusReturn=null,lastAnnouncedRace=null;
  let toastTimer=null,lastReadAt=0;
  const cash=n=>"$"+Math.max(0,Number(n)||0).toLocaleString();
  const el=(tag,className,text)=>{
    const item=document.createElement(tag);
    if(className)item.className=className;
    if(text!==undefined)item.textContent=text;
    return item;
  };
  function timeRemaining(resetAt){
    const left=Math.max(0,Number(resetAt)-Date.now());
    if(!Number.isFinite(left)||left===0)return "Reset due";
    const h=Math.floor(left/3600000),m=Math.ceil(left%3600000/60000);
    return h>0?h+"h "+m+"m":m+"m";
  }
  function updateTime(){
    const periods=lastData?.periods;
    if(!periods){resetText.textContent="Challenges reset at midnight UTC and Monday 00:00 UTC";return;}
    resetText.textContent="DAILY RESET "+timeRemaining(periods.daily?.resetAt)+
      " · WEEKLY RESET "+timeRemaining(periods.weekly?.resetAt)+
      " · UTC";
    if((Number(periods.daily?.resetAt)<=Date.now()||
        Number(periods.weekly?.resetAt)<=Date.now())&&
       !overlay.classList.contains("hidden")&&!inflight)
      refresh(true);
  }
  function paint(snapshot){
    lastData=snapshot;
    board.replaceChildren();
    if(!snapshot||Number(snapshot.version)!==1){
      status.textContent="V19 challenges are awaiting the updated multiplayer Worker.";
      const p=el("p","redline-challenge-empty",
        "Your saved cash and garage are unaffected. The challenge board will unlock when the V19 race server is deployed.");
      board.append(p);
      updateTime();return;
    }
    status.textContent="Progress is saved to your REDLINE account · Rewards paid automatically";
    for(const periodName of ["daily","weekly"]){
      const period=snapshot.periods?.[periodName];
      if(!period||!Array.isArray(period.entries))continue;
      const group=el("section","redline-challenge-group");
      const heading=el("div","redline-challenge-group-title");
      const label=el("h3","",periodName==="daily"?"DAILY CHALLENGES":"WEEKLY CHALLENGES");
      const time=el("span","",timeRemaining(period.resetAt)+" LEFT");
      heading.append(label,time);group.append(heading);
      for(const ch of period.entries){
        const complete=!!ch.completed;
        const card=el("article","redline-challenge-card"+
          (complete?" redline-challenge-complete":""));
        const top=el("div","redline-challenge-row");
        const name=el("strong","",String(ch.title||"Challenge"));
        const prize=el("span","redline-challenge-reward",
          complete?"✓ CLAIMED": "+"+cash(ch.reward));
        top.append(name,prize);card.append(top);
        card.append(el("p","",String(ch.description||"")));
        const bar=el("div","redline-challenge-track");
        bar.setAttribute("role","progressbar");
        bar.setAttribute("aria-label",String(ch.title||"Challenge")+" progress");
        const max=Math.max(1,Number(ch.target)||1);
        const value=Math.max(0,Math.min(max,Number(ch.progress)||0));
        bar.setAttribute("aria-valuemin","0");
        bar.setAttribute("aria-valuemax",String(max));
        bar.setAttribute("aria-valuenow",String(value));
        const fill=el("div","redline-challenge-fill");
        fill.style.width=(100*value/max)+"%";
        bar.append(fill);card.append(bar);
        card.append(el("div","redline-challenge-count",
          complete?"COMPLETED · REWARD SAVED":value+" / "+max));
        group.append(card);
      }
      board.append(group);
    }
    updateTime();
  }
  async function refresh(force=false,{notify=false}={}){
    if(inflight){
      // A race may finish while the board is already loading. Read the
      // authoritative updated stats afterward rather than losing the
      // completion notification to an older in-flight response.
      return force?inflight.then(()=>refresh(true,{notify})):inflight;
    }
    const api=window.REDLINE_MP?.getAccountStats;
    if(typeof api!=="function"){
      status.textContent="Waiting for account connection…";return;
    }
    if(!force&&Date.now()-lastReadAt<5000&&lastData){paint(lastData);return;}
    status.textContent="Loading your saved challenges…";
    inflight=(async()=>{
      try{
        const stats=await api.call(window.REDLINE_MP,true);
        paint(stats?.challenges||null);
        lastReadAt=Date.now();
        if(notify&&Array.isArray(stats?.lastChallengeAwards)&&
           stats.lastChallengeAwards.length){
          const finishId=Number(stats.racesFinished);
          if(Number.isSafeInteger(finishId)&&finishId!==lastAnnouncedRace){
            lastAnnouncedRace=finishId;
            showToast(stats.lastChallengeAwards);
          }
        }
      }catch(error){
        status.textContent="Challenges unavailable · "+(error?.message||"Connection error");
      }finally{inflight=null}
    })();
    return inflight;
  }
  function showToast(awards){
    const earned=awards.reduce((sum,a)=>sum+(Number(a.reward)||0),0);
    if(!earned)return;
    toast.replaceChildren(el("strong","","CHALLENGE COMPLETED · +"+cash(earned)),
      el("span","",awards.map(a=>a.title).join(" · ")));
    toast.classList.remove("hidden");
    if(toastTimer)clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>toast.classList.add("hidden"),6500);
    window.REDLINE_CASH?.refresh?.();
    window.REDLINE_DEALERSHIP?.refresh?.();
  }
  function open(event){
    if(event?.currentTarget)focusReturn=event.currentTarget;
    overlay.classList.remove("hidden");
    document.body.classList.add("redline-challenge-open");
    closeButton.focus();
    refresh(true);
  }
  function close(){
    overlay.classList.add("hidden");
    document.body.classList.remove("redline-challenge-open");
    focusReturn?.focus?.();
  }
  for(const button of buttons)button.addEventListener("click",open);
  closeButton.addEventListener("click",close);
  overlay.addEventListener("click",event=>{if(event.target===overlay)close()});
  window.addEventListener("keydown",event=>{
    if(event.key==="Escape"&&!overlay.classList.contains("hidden")){
      event.preventDefault();event.stopPropagation();close();
    }
  },true);
  window.addEventListener("redline:race-complete",()=>refresh(true,{notify:true}));
  window.addEventListener("redline:results-shown",e=>{
    if(!e.detail?.waiting)refresh(true);
  });
  window.addEventListener("focus",()=>{
    if(!overlay.classList.contains("hidden"))refresh(true);
  });
  window.setInterval(updateTime,60000);
  window.REDLINE_CHALLENGES={refresh,open,close};
})();
