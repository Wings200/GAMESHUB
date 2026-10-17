import {
  UPGRADE_CATALOG,UPGRADE_KEYS,sanitizeGarage,upgradePrice,
  upgradeComparison,stockUpgrades
} from "./upgrade-parts.js";

/* Never accept client-supplied ownership or wallet balances. The Worker
   owns those; previews use the same formulas as actual vehicle physics. */
const root=document.getElementById("redlineUpgradeShop");
const grid=document.getElementById("redlineUpgradeGrid");
const message=document.getElementById("redlineUpgradeMessage");
if(root&&grid&&message){
  const labels=["STOCK","STREET","SPORT","RACE"];
  const formatCash=n=>"$"+Math.max(0,Number(n)||0).toLocaleString();
  const shownTier={};
  let snapshot=null,pending=false,refreshing=null,lastRefresh=0;
  let feedback=null,feedbackError=false;
  const locked=()=>window.REDLINE_MP?.room?.phase!=="car_select" ||
    Boolean(window.REDLINE_MP?.myPlayer?.ready);
  const spec=()=>window.REDLINE_GARAGE_PREVIEW?.baseSpec||null;

  function el(tag,className,text){
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(text!==undefined)node.textContent=text;
    return node;
  }
  function metricText(value,unit){
    if(unit==="mph")return (value*2.45).toFixed(0)+" MPH CAP";
    if(unit==="drag")return value.toFixed(3);
    return value.toFixed(2);
  }
  function formatChange(amount){
    if(Math.abs(amount)<.05)return "NO CHANGE";
    const rounded=Math.round(Math.abs(amount)*10)/10;
    return (amount>0?"+":"−")+rounded.toFixed(1)+"%";
  }
  function renderComparison(section,key,targetTier) {
    const preview=section.querySelector(".upgrade-preview");
    if(!preview)return;
    preview.replaceChildren();
    const base=spec();
    if(!base){
      preview.append(el("p","upgrade-await","Vehicle stats loading…"));
      return;
    }
    const equipped=sanitizeGarage(snapshot?.garage).equipped;
    const result=upgradeComparison(base,equipped,key,targetTier);
    if(!result)return;
    const activeTier=result.currentTier;
    const heading=el("div","upgrade-compare-heading");
    heading.append(el("span","",labels[activeTier]+" EQUIPPED"),
      el("span","",labels[targetTier]+" PREVIEW"));
    preview.append(heading);
    for(const metric of result.metrics){
      const row=el("div","upgrade-metric-row");
      row.append(el("div","upgrade-metric-title",metric.label));
      const nums=el("div","upgrade-metric-values");
      nums.append(el("strong","",metricText(metric.current,metric.unit)),
        el("span","upgrade-metric-arrow","→"),
        el("strong","upgrade-metric-target",metricText(metric.target,metric.unit)),
        el("b","upgrade-metric-gain",formatChange(metric.changePercent)));
      const max=upgradeComparison(base,stockUpgrades(),key,3);
      const cap=Math.max(.001,Math.abs(max.metrics.find(m=>m.key===metric.key)
        ?.improvementPercent||0));
      // Bars represent improvement over the STOCK value, not raw speed.
      const currentBonus=upgradeComparison(base,stockUpgrades(),
        key,activeTier).metrics.find(m=>m.key===metric.key).improvementPercent;
      const toCap=n=>Math.min(100,Math.max(0,n/cap*100));
      const bars=el("div","upgrade-progress-track");
      const equippedBar=el("div","upgrade-progress-installed");
      equippedBar.style.width=toCap(currentBonus)+"%";
      const targetBar=el("div","upgrade-progress-target");
      targetBar.style.width=toCap(metric.improvementPercent)+"%";
      bars.append(targetBar,equippedBar);
      row.append(nums,bars);
      preview.append(row);
    }
    if(activeTier!==targetTier){
      preview.append(el("div","upgrade-preview-notice",
        "Projected difference from your equipped "+labels[activeTier]+
        " parts. Stock values depend on your selected car."));
    } else {
      preview.append(el("div","upgrade-preview-notice",
        "Current equipped performance — select another tier to compare."));
    }
  }
  function showFeedback(text,isError=false){
    feedback=text;feedbackError=isError;
    message.classList.toggle("upgrade-error",isError);
    message.textContent=text;
  }
  function render(){
    grid.replaceChildren();
    const garage=sanitizeGarage(snapshot?.garage);
    const balance=Number(snapshot?.cashBalance)||0;
    for(const key of UPGRADE_KEYS){
      const item=UPGRADE_CATALOG[key],owned=garage.owned[key],
        equipped=garage.equipped[key];
      const section=el("section","upgrade-part");
      section.dataset.category=key;
      const head=el("div","upgrade-part-top");
      head.append(el("strong","",item.label),
        el("span","upgrade-current-tier","EQUIPPED "+labels[equipped]));
      section.append(head,el("p","",item.description));
      const levels=el("div","upgrade-level-buttons");
      for(let t=0;t<=3;t++){
        const button=el("button","upgrade-tier-button");
        button.type="button";
        button.dataset.part=key;
        button.dataset.tier=String(t);
        if(equipped===t)button.classList.add("equipped");
        if(t<=owned)button.classList.add("owned");
        const cost=upgradePrice(key,t);
        button.disabled=pending||locked()||!snapshot;
        if(t===equipped)button.textContent=labels[t]+" ✓";
        else if(t<=owned)button.textContent=labels[t]+" · EQUIP";
        else if(t===owned+1)button.textContent=labels[t]+" · "+formatCash(cost);
        else button.textContent=labels[t]+" · LOCKED";
        button.title=t>owned+1?"Buy the previous level first":
          t>owned&&balance<cost
          ?"Earn "+formatCash(cost-balance)+" more cash to buy":"Preview stats";
        levels.append(button);
      }
      section.append(levels);
      const preview=el("div","upgrade-preview");
      section.append(preview);
      grid.append(section);
      // Initially compare the next available purchase against equipped gear.
      const toShow=shownTier[key]??(owned<3?owned+1:equipped);
      renderComparison(section,key,Math.max(0,Math.min(3,toShow)));
    }
    if(!pending&&snapshot&&!feedback){
      message.classList.remove("upgrade-error");
      message.textContent="CASH "+formatCash(balance)+" · "+
        (locked()?"Parts locked while racing":
        "Point to a level to compare performance before buying.");
    }
  }
  function previewTier(key,tier){
    const section=[...grid.children].find(x=>x.dataset.category===key);
    if(!section||!Number.isInteger(tier)||tier<0||tier>3)return;
    shownTier[key]=tier;
    renderComparison(section,key,tier);
  }
  // Preview even unaffordable tiers without trying to purchase them.
  grid.addEventListener("pointerover",event=>{
    const button=event.target.closest("button[data-part]");
    if(button)previewTier(button.dataset.part,Number(button.dataset.tier));
  });
  grid.addEventListener("focusin",event=>{
    const button=event.target.closest("button[data-part]");
    if(button)previewTier(button.dataset.part,Number(button.dataset.tier));
  });
  grid.addEventListener("click",async ev=>{
    const button=ev.target.closest("button[data-part]");
    if(!button||pending||locked()||!snapshot)return;
    const key=button.dataset.part,tier=Number(button.dataset.tier);
    if(!Object.hasOwn(UPGRADE_CATALOG,key)||
       !Number.isInteger(tier)||tier<0||tier>3)return;
    previewTier(key,tier);
    const profile=sanitizeGarage(snapshot.garage);
    const buy=tier>profile.owned[key];
    if(tier===profile.equipped[key]){
      showFeedback(labels[tier]+" "+UPGRADE_CATALOG[key].label+" is already equipped.");
      return;
    }
    if(buy&&tier!==profile.owned[key]+1){
      showFeedback("Buy "+labels[profile.owned[key]+1]+" before "+labels[tier]+".",true);
      return;
    }
    const price=upgradePrice(key,tier);
    if(buy&&price>snapshot.cashBalance){
      showFeedback("Need "+formatCash(price-snapshot.cashBalance)+
        " more to unlock "+labels[tier]+" "+UPGRADE_CATALOG[key].label+".",true);
      return;
    }
    const api=window.REDLINE_MP;
    pending=true;feedback=null;
    showFeedback(buy?"Purchasing securely…":"Equipping your part…");
    render();
    try{
      const response=buy?await api.purchaseUpgrade(key):
        await api.equipUpgrade(key,tier);
      if(!response?.ok)throw new Error(response?.error||"Request failed");
      snapshot={...snapshot,garage:sanitizeGarage(response.garage),
        cashBalance:response.cashBalance};
      lastRefresh=Date.now();
      shownTier[key]=tier;
      showFeedback((buy?"PURCHASED ":"EQUIPPED ")+
        UPGRADE_CATALOG[key].label+" "+labels[tier]+
        " · SAVED · BALANCE "+formatCash(response.cashBalance));
      window.REDLINE_CASH?.refresh?.();
      window.dispatchEvent(new CustomEvent("redline:upgrades-updated",{
        detail:{equipped:snapshot.garage.equipped,cashBalance:response.cashBalance}
      }));
    }catch(err){
      showFeedback("Upgrade not applied: "+(err?.message||"Server error"),true);
      await refresh(true);
    }finally{
      pending=false;
      render();
    }
  });
  async function refresh(force=false){
    if(refreshing)return refreshing;
    if(!force&&snapshot&&Date.now()-lastRefresh<10000)return snapshot;
    const api=window.REDLINE_MP?.getAccountStats;
    if(typeof api!=="function"){
      showFeedback("Waiting for account connection…");
      return null;
    }
    refreshing=(async()=>{
      try{
        const stats=await api.call(window.REDLINE_MP);
        snapshot={...stats,garage:sanitizeGarage(stats.garage)};
        lastRefresh=Date.now();
        feedback=null;
        render();
        return snapshot;
      }catch(err){
        showFeedback("Could not load upgrades: "+(err?.message||"Connection error"),true);
        return null;
      }finally{refreshing=null}
    })();
    return refreshing;
  }
  window.addEventListener("redline:garage-car-changed",()=>render());
  window.addEventListener("redline:room-state",event=>{
    const room=event.detail?.room||event.detail?.state||event.detail;
    if(room?.phase==="car_select")refresh();
    if(snapshot)render();
  });
  window.addEventListener("redline:race-complete",()=>refresh(true));
  document.getElementById("openCarSelectBtn")
    ?.addEventListener("click",()=>refresh(true));
  window.addEventListener("focus",()=>{
    if(!document.getElementById("carSelectScreen")?.classList.contains("hidden"))
      refresh();
  });
  window.REDLINE_UPGRADE_SHOP={
    refresh:()=>refresh(true),
    get equipped(){return sanitizeGarage(snapshot?.garage).equipped;},
    get cashBalance(){return snapshot?.cashBalance??null;}
  };
  render();
  if(window.REDLINE_MP?.room?.phase==="car_select")refresh();
}
