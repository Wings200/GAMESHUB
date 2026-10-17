import {UPGRADE_CATALOG, UPGRADE_KEYS, sanitizeGarage, upgradePrice}
  from "./upgrade-parts.js";

/* Present server-owned tiers; never stores cash or ownership locally. */
const root=document.getElementById("redlineUpgradeShop");
const grid=document.getElementById("redlineUpgradeGrid");
const message=document.getElementById("redlineUpgradeMessage");
if(root&&grid&&message){
  const format=n=>"$"+n.toLocaleString();
  const tierNames=["STOCK","STREET","SPORT","RACE"];
  let snapshot=null,pending=false,refreshing=null,lastRefresh=0;

  const locked=()=>window.REDLINE_MP?.room?.phase!=="car_select" ||
    Boolean(window.REDLINE_MP?.myPlayer?.ready);

  function render(){
    grid.replaceChildren();
    const garage=sanitizeGarage(snapshot?.garage);
    const balance=Number(snapshot?.cashBalance)||0;
    for(const key of UPGRADE_KEYS){
      const item=UPGRADE_CATALOG[key];
      const owned=garage.owned[key],equipped=garage.equipped[key];
      const section=document.createElement("section");
      section.className="upgrade-part";
      const header=document.createElement("div");
      header.className="upgrade-part-top";
      const title=document.createElement("strong");
      title.textContent=item.label;
      const tier=document.createElement("span");
      tier.className="upgrade-current-tier";
      tier.textContent="EQUIPPED "+tierNames[equipped];
      header.append(title,tier);
      const desc=document.createElement("p");
      desc.textContent=item.description;
      const levels=document.createElement("div");
      levels.className="upgrade-level-buttons";
      for(let t=0;t<=3;t++){
        const button=document.createElement("button");
        button.type="button";
        button.dataset.part=key;
        button.dataset.tier=String(t);
        button.className="upgrade-tier-button"+
          (equipped===t?" equipped":"")+
          (t<=owned?" owned":"");
        const cost=upgradePrice(key,t);
        const isAvailable=(t<=owned || t===owned+1);
        const canAfford=cost===null||balance>=cost;
        button.disabled=pending||locked()||!isAvailable||
          (t>owned&&!canAfford);
        button.textContent=t===equipped
          ?tierNames[t]+" ✓"
          :t<=owned?tierNames[t]+" · EQUIP"
          :t===owned+1?tierNames[t]+" · "+format(cost)
          :tierNames[t]+" · LOCKED";
        button.title=t>owned&&t===owned+1&&!canAfford
          ?"Earn "+format(cost-balance)+" more cash":item.description;
        levels.append(button);
      }
      section.append(header,desc,levels);
      grid.append(section);
    }
    if(snapshot && !pending){
      message.textContent="CASH "+format(balance)+" · Changes saved permanently · "+
        (locked()?"Garage locked for this race":"Choose a tier to buy or equip");
      message.classList.remove("upgrade-error");
    }
  }
  async function refresh(force=false){
    if(refreshing)return refreshing;
    if(!force&&snapshot&&Date.now()-lastRefresh<10000)return snapshot;
    const api=window.REDLINE_MP?.getAccountStats;
    if(typeof api!=="function"){message.textContent="Waiting for account connection…";return null}
    refreshing=(async()=>{
      try{
        const stats=await api.call(window.REDLINE_MP);
        snapshot={...stats,garage:sanitizeGarage(stats.garage)};
        lastRefresh=Date.now();
        render();
        return snapshot;
      }catch(e){
        message.classList.add("upgrade-error");
        message.textContent="Could not load upgrades: "+(e?.message||"Connection error");
        return null;
      }finally{refreshing=null}
    })();
    return refreshing;
  }
  grid.addEventListener("click",async ev=>{
    const button=ev.target.closest("button[data-part]");
    if(!button||pending||locked()||!snapshot)return;
    const key=button.dataset.part,tier=Number(button.dataset.tier);
    if(!Object.hasOwn(UPGRADE_CATALOG,key)||!Number.isInteger(tier))return;
    const profile=sanitizeGarage(snapshot.garage);
    const buy=tier>profile.owned[key];
    if(buy&&tier!==profile.owned[key]+1)return;
    const api=window.REDLINE_MP;
    const price=upgradePrice(key,tier);
    if(buy&&(!Number.isInteger(price)||price>snapshot.cashBalance))return;
    pending=true;
    message.textContent=buy?"Purchasing part securely…":"Equipping part…";
    render();
    try{
      const response=buy?await api.purchaseUpgrade(key):
        await api.equipUpgrade(key,tier);
      if(!response?.ok)throw new Error(response?.error||"Purchase failed");
      snapshot={...snapshot,garage:sanitizeGarage(response.garage),
        cashBalance:response.cashBalance};
      lastRefresh=Date.now();
      message.classList.remove("upgrade-error");
      message.textContent=(buy?"PURCHASED ":"EQUIPPED ")+
        UPGRADE_CATALOG[key].label+" "+tierNames[tier];
      window.REDLINE_CASH?.refresh?.();
      window.dispatchEvent(new CustomEvent("redline:upgrades-updated",{
        detail:{equipped:snapshot.garage.equipped,cashBalance:response.cashBalance}
      }));
    }catch(error){
      message.classList.add("upgrade-error");
      message.textContent="Upgrade not applied: "+(error?.message||"Server error");
      // Never fabricate ownership or subtract local currency on failure.
      await refresh(true);
    }finally{pending=false;render()}
  });
  window.addEventListener("redline:room-state",event=>{
    const room=event.detail?.room||event.detail?.state||event.detail;
    if(room?.phase==="car_select"){
      refresh();
    }
    if(snapshot)render();
  });
  window.addEventListener("redline:race-complete",()=>refresh(true));
  document.getElementById("openCarSelectBtn")?.addEventListener(
    "click",()=>refresh(true));
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
