import {
  REDLINE_CAR_CATALOG,REDLINE_CAR_IDS,STARTER_CAR_IDS,
  garageCarOwnership
} from "./car-catalog.js";

/* Account-backed dealership: only the REDLINE Worker can charge cash or
   grant vehicle ownership. No price or wallet value is trusted from DOM. */
(() => {
 const root=document.getElementById("redlineDealership");
 const grid=document.getElementById("dealerGrid");
 const cash=document.getElementById("dealerCash");
 const feedback=document.getElementById("dealerFeedback");
 const selector=document.getElementById("carSelector");
 if(!root||!grid||!cash||!feedback||!selector)return;
 let stats=null,profile=garageCarOwnership(null);
 let fetching=null,lastFetch=0,pending=false,filter="all";
 let purchaseBalanceVersion=0;
 let restoredForThisCarSelect=false;
 // Clear on-card specialty labels: different vehicles reward different
 // driving styles, not merely a higher price tag.
 const vehicleIdentity={
   gt:["BALANCED COUPE","Easy to drive · versatile starter"],
   vortex:["FREE SPEEDSTER","Fast straights · lighter cornering grip"],
   apex:["FREE TRACK CAR","Sharp steering · tight corner specialist"],
   bayside:["STREET TUNER","Quick launch · drift-focused handling"],
   aurora:["RALLY AWD","High grip · strong braking · raised rally body"],
   ironclad:["V8 MUSCLE","Huge acceleration · heavier cornering"],
   cirrus:["GRAND TOURER","High-speed stability · long-wheelbase comfort"],
   obsidian:["TRACK SUPERCAR","Extreme acceleration · maximum cornering grip"],
   phantom:["HYPERCAR","Top-end speed · flagship aero and launch"]
 };
 // Until Worker V18 deploys, the old Worker still charges legacy prices.
 // Never show a price the authoritative server is not ready to charge.
 const legacyPrices=Object.freeze({
   gt:0,vortex:0,apex:0,bayside:65,aurora:85,
   ironclad:110,cirrus:160,obsidian:235,phantom:380
 });
 const priceFor=id=>{
   const serverPrice=Number(stats?.carPrices?.[id]);
   if(Number(stats?.economyVersion)>=18&&
      Number.isSafeInteger(serverPrice)&&serverPrice>=0)
     return serverPrice;
   return legacyPrices[id]??REDLINE_CAR_CATALOG[id].price;
 };
 const money=n=>"$"+Math.max(0,Number(n)||0).toLocaleString();
 const locked=()=>window.REDLINE_MP?.room?.phase!=="car_select" ||
    Boolean(window.REDLINE_MP?.myPlayer?.ready);
 const element=(tag,cls,text)=>{
    const e=document.createElement(tag);
    if(cls)e.className=cls;
    if(text!==undefined)e.textContent=text;
    return e;
 };
 function createOwnedSelectorCard(id){
   const car=REDLINE_CAR_CATALOG[id];
   const card=element("button","car-card dealer-owned-car");
   card.type="button";
   card.dataset.car=id;
   const preview=element("div","preview-stage");
   const model=element("div","preview-car preview-"+id);
   for(const [cls] of [["preview-roof"],["preview-body"],["preview-wing"],
     ["preview-wheel wheel-left"],["preview-wheel wheel-right"]])
      model.append(element("div",cls));
   preview.append(model);
   const info=element("div","car-card-info");
   info.append(element("strong","",car.name),
     element("span","",car.style));
   card.append(preview,info);
   return card;
 }
 function syncSelector(){
   for(const id of REDLINE_CAR_IDS){
     if(STARTER_CAR_IDS.includes(id))continue;
     const exists=[...selector.querySelectorAll(".car-card")].find(
       x=>x.dataset.car===id);
     const owned=profile.owned.includes(id);
     if(owned&&!exists)selector.append(createOwnedSelectorCard(id));
     if(!owned&&exists)exists.remove();
   }
 }
 function rowStats(car){
   const statsNode=element("div","dealer-stats");
   const metrics=[
     ["TOP SPEED","speed"],["ACCELERATION","accel"],
     ["GRIP","grip"],["DRIFT","drift"]
   ];
   for(const [title,key] of metrics){
     const stat=element("div","dealer-stat");
     const heading=element("div","dealer-stat-heading");
     heading.append(element("span","",title),
       element("strong","",String(car.spec.stats[key])));
     const track=element("div","dealer-stat-track");
     const fill=element("div","dealer-stat-fill");
     fill.style.width=Math.max(0,Math.min(100,car.spec.stats[key]))+"%";
     track.append(fill);stat.append(heading,track);statsNode.append(stat);
   }
   return statsNode;
 }
 function render(){
   syncSelector();
   grid.replaceChildren();
   cash.textContent="BALANCE "+(stats?money(stats.cashBalance):"—");
   document.querySelectorAll("[data-dealer-filter]").forEach(btn=>
     btn.classList.toggle("active",btn.dataset.dealerFilter===filter));
   for(const id of REDLINE_CAR_IDS){
     const car=REDLINE_CAR_CATALOG[id],owned=profile.owned.includes(id);
     if(filter==="owned"&&!owned)continue;
     const article=element("article","dealer-card");
     if(owned)article.classList.add("dealer-card-owned");
     article.dataset.carId=id;
     const header=element("div","dealer-card-header");
     const names=element("div","dealer-name");
     names.append(element("strong","",car.name),
       element("span","",car.style));
     header.append(names,element("span",
       "dealer-status "+(owned?"dealer-status-owned":""),
       owned?"OWNED":money(priceFor(id))));
     const preview=element("div","dealer-showroom");
     preview.dataset.car=id;
     const silhouette=element("div","dealer-silhouette dealer-"+id);
     silhouette.append(element("div","dealer-body"),
       element("div","dealer-glass"),element("div","dealer-spoiler"),
       element("div","dealer-wheel dealer-wheel-front"),
       element("div","dealer-wheel dealer-wheel-rear"));
     preview.append(silhouette);
     const role=vehicleIdentity[id]||[car.style,""];
     const trim=element("div","dealer-specialty");
     trim.append(
       element("strong","dealer-specialty-name",role[0]),
       element("span","dealer-specialty-claim",role[1])
     );
     const description=element("p","dealer-description",
       "FACTORY "+(car.spec.topSpeed*2.45).toFixed(0)+
       " MPH MAX · "+car.spec.acceleration.toFixed(1)+
       " ACCEL · "+car.spec.grip.toFixed(1)+" GRIP");
     const action=element("button","dealer-action");
     action.type="button";action.dataset.purchaseCar=id;
     action.disabled=pending||locked()||!stats;
     if(owned){
       action.dataset.purchaseCar="";
       const chosen=window.REDLINE_MP?.myPlayer?.car===id;
       action.textContent=chosen?"SELECTED FOR RACE":"SELECT THIS CAR";
       action.dataset.selectCar=id;
     }else{
       action.textContent="BUY FOR "+money(priceFor(id));
     }
     article.append(header,preview,trim,description,rowStats(car),action);
     grid.append(article);
   }
   // Owned selector cards and filtered dealership tiles can be recreated
   // after the thumbnail render; re-apply already cached real model photos.
   window.REDLINE_CAR_THUMBNAILS?.applyAll?.();
   if(stats&&!pending&&!feedback.dataset.error)
     feedback.textContent="OWNED "+profile.owned.length+"/"+REDLINE_CAR_IDS.length+
       (Number(stats.economyVersion)>=18?
         " · V18 prices confirmed by server":
         " · Waiting for V18 Worker deployment; current prices still apply")+
       " · Purchases and vehicle choices are saved to your REDLINE account.";
 }
 async function refresh(force=false){
   if(fetching)return fetching;
   if(!force&&stats&&Date.now()-lastFetch<12000){
     render();return stats;
   }
   const api=window.REDLINE_MP?.getAccountStats;
   if(typeof api!=="function"){
     feedback.textContent="Waiting for REDLINE account connection…";
     return null;
   }
   const versionAtStart=purchaseBalanceVersion;
   fetching=(async()=>{
     try{
       const saved=await api.call(window.REDLINE_MP);
       const balance=Number(saved?.cashBalance);
       if(!Number.isSafeInteger(balance)||balance<0)
         throw new Error("Could not verify account balance");
       if(versionAtStart!==purchaseBalanceVersion&&
          balance!==stats?.cashBalance)return stats;
       stats=saved;profile=garageCarOwnership(saved.carGarage);
       lastFetch=Date.now();delete feedback.dataset.error;render();
       // Re-select the last saved car once, so players keep their chosen
       // ride across sessions and return-to-lobby rounds.
       const me=window.REDLINE_MP?.myPlayer;
       if(!restoredForThisCarSelect &&
          window.REDLINE_MP?.room?.phase==="car_select" &&
          me && !me.car && !me.ready &&
          profile.owned.includes(profile.selected)){
         const sent=window.REDLINE_MP?.send?.({
           type:"select_car",car:profile.selected
         });
         if(sent!==false)restoredForThisCarSelect=true;
       }
       return stats;
     }catch(error){
       feedback.dataset.error="true";
       feedback.textContent="Garage unavailable: "+(error?.message||"Connection error");
       return null;
     }finally{fetching=null}
   })();
   return fetching;
 }
 grid.addEventListener("click",async event=>{
   const btn=event.target.closest("button[data-purchase-car],button[data-select-car]");
   if(!btn||pending||locked()||!stats)return;
   const carId=btn.dataset.selectCar||btn.dataset.purchaseCar;
   if(!Object.hasOwn(REDLINE_CAR_CATALOG,carId))return;
   if(profile.owned.includes(carId)){
     const ok=window.REDLINE_MP?.send?.({type:"select_car",car:carId});
     feedback.textContent=ok===false?"Connection unavailable":
       "Selecting "+REDLINE_CAR_CATALOG[carId].name+"…";
     return;
   }
   pending=true;delete feedback.dataset.error;
   feedback.textContent="Purchasing "+REDLINE_CAR_CATALOG[carId].name+" securely…";
   render();
   try{
     const response=await window.REDLINE_MP.purchaseCar(carId);
     if(!response?.ok)throw new Error(response?.error||"Purchase failed");
     profile=garageCarOwnership(response.carGarage);
     stats={...stats,cashBalance:response.cashBalance,carGarage:profile};
     lastFetch=Date.now();
     feedback.textContent="PURCHASED "+REDLINE_CAR_CATALOG[carId].name+
       " · PERMANENTLY UNLOCKED · "+money(response.cashBalance)+" LEFT";
     // A newly bought car isn't equipped in the room until a
     // trusted room_state arrives. Block premature LOCK IN.
     const lockIn=document.getElementById("lockInBtn");
     if(lockIn)lockIn.disabled=true;
     // Never claim the car was selected for this room until room_state.
     window.dispatchEvent(new CustomEvent("redline:car-purchased",{
       detail:{carId,balance:response.cashBalance}
     }));
     if(window.REDLINE_MP?.send?.({type:"select_car",car:carId})===false){
       feedback.dataset.error="true";
       feedback.textContent="Car purchased, but room disconnected. Reconnect to select it.";
     }
     window.REDLINE_CASH?.refresh?.();
     window.REDLINE_UPGRADE_SHOP?.refresh?.();
   }catch(err){
     feedback.dataset.error="true";
     feedback.textContent="Purchase not completed: "+(err?.message||"Server error");
     await refresh(true);
   }finally{pending=false;render()}
 });
 document.querySelectorAll("[data-dealer-filter]").forEach(btn=>
   btn.addEventListener("click",()=>{
     filter=btn.dataset.dealerFilter;render();
   }));
 // All successful purchases broadcast the exact new balance returned
 // by the Worker. Update this header even when an upgrade was bought.
 window.addEventListener("redline:cash-confirmed",event=>{
   const balance=Number(event.detail?.balance);
   if(!Number.isSafeInteger(balance)||balance<0)return;
   purchaseBalanceVersion++;
   lastFetch=Date.now();
   if(stats){
     stats={...stats,cashBalance:balance};
     render();
   }else{
     cash.textContent="BALANCE "+money(balance);
   }
 });
 window.addEventListener("redline:car-thumbnails-ready",()=>{
   window.REDLINE_CAR_THUMBNAILS?.applyAll?.();
 });
 window.addEventListener("redline:room-state",event=>{
   const room=event.detail?.room||event.detail?.state||event.detail;
   if(room?.phase!=="car_select")restoredForThisCarSelect=false;
   if(room?.phase==="car_select")refresh();
   if(stats)render();
 });
 window.addEventListener("redline:race-complete",()=>refresh(true));
 document.getElementById("openCarSelectBtn")
   ?.addEventListener("click",()=>refresh(true));
 window.addEventListener("focus",()=>{
   if(!document.getElementById("carSelectScreen")?.classList.contains("hidden"))
     refresh();
 });
 window.REDLINE_DEALERSHIP={
   refresh:()=>refresh(true),
   get owned(){return [...profile.owned]},
   get selected(){return profile.selected},
   get balance(){return stats?.cashBalance??null}
 };
 render();
 if(window.REDLINE_MP?.room?.phase==="car_select")refresh();
})();
