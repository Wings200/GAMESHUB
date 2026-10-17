/* REDLINE V5.1 legacy compatibility stub.
 * Body / paint customization was permanently retired in Factory Cars V5.
 * Older cached HTML may still reference ./garage.js. Keep this file inert,
 * so the old URL cannot re-create a Customize panel on a fresh request.
 *
 * This does NOT initialize customization, change cars, override Ready,
 * touch storage, or call the multiplayer Worker.
 */
(() => {
  const cleanup=()=>{
    document.getElementById("redlineGarageV1")?.remove();
    document.getElementById("garageCosmeticsMount")?.remove();
  };
  cleanup();
  if(document.readyState==="loading")
    document.addEventListener("DOMContentLoaded",cleanup,{once:true});
})();
