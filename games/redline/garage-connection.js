/* REDLINE Garage connectivity panel. A blank wallet is not a zero balance. */
(() => {
  const panel=document.getElementById("redlineServiceStatus");
  const label=document.getElementById("redlineServiceMessage");
  const retry=document.getElementById("redlineRetryConnection");
  if(!panel||!label||!retry)return;
  let working=false;
  function display(message,state="checking"){
    panel.dataset.state=state;
    label.textContent=message;
    retry.disabled=working;
  }
  async function check(){
    if(working)return;
    working=true;
    display("Connecting to your saved garage…");
    retry.disabled=true;
    try{
      const stats=await window.REDLINE_MP?.getAccountStats?.(true);
      if(!stats||typeof stats.cashBalance!=="number")
        throw new Error("The multiplayer server did not return your account balance.");
      if(!stats.carUpgrades||typeof stats.carUpgrades!=="object")
        throw new Error("Worker update missing: deploy the new multiplayer Worker before buying upgrades.");
      display("CONNECTED · Your saved cars, cash and individual upgrades are available.","online");
      // All three widgets share REDLINE_MP.getAccountStats' request/cache.
      await Promise.allSettled([
        window.REDLINE_CASH?.refresh?.(),
        window.REDLINE_DEALERSHIP?.refresh?.(),
        window.REDLINE_UPGRADE_SHOP?.refresh?.()
      ]);
    }catch(error){
      display("GARAGE OFFLINE · "+(error?.message||"Connection failed")+
        " · Your cash hasn't been reset. Stock starter cars can still race.","offline");
    }finally{
      working=false;retry.disabled=false;
    }
  }
  retry.addEventListener("click",check);
  window.addEventListener("redline:account-api",event=>{
    if(working)return;
    if(event.detail?.ok && panel.dataset.state!=="online")
      display("SERVER REACHED · Checking your garage version…");
    if(event.detail?.ok===false)
      display("GARAGE CONNECTION ERROR · "+event.detail.error+
        " · Press RETRY CONNECTION.","offline");
  });
  window.addEventListener("redline:connected",()=>{
    if(!document.getElementById("redlineGarageOverlay")?.classList.contains("hidden"))
      check();
  });
  window.REDLINE_GARAGE_CONNECTION={check};
})();
