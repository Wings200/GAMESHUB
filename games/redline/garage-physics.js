/*
 * REDLINE legacy garage appearance compatibility.
 * The free 16-point performance allocator is intentionally RETIRED.
 * Paid performance is calculated by upgrade-parts.js using the
 * server-approved myPlayer.upgrades snapshot in game.js.
 */
(() => {
  const STORAGE_KEY="redline_garage_build_v1";
  const allowedBodies=new Set(["coupe","supercar","muscle","track"]);
  const bodyModel={coupe:"gt",supercar:"vortex",muscle:"muscle",track:"apex"};
  const hex=(value,fallback)=>typeof value==="string" &&
    /^#[0-9a-f]{6}$/i.test(value)?value:fallback;
  function getAppearance(){
    let a=window.REDLINE_GARAGE?.build?.appearance;
    if(!a){
      try{a=JSON.parse(localStorage.getItem(STORAGE_KEY))?.appearance}
      catch{a=null}
    }
    return {
      body:allowedBodies.has(a?.body)?a.body:"coupe",
      color:hex(a?.color,"#e9edf2"),
      accent:hex(a?.accent,"#315fbd")
    };
  }
  window.REDLINE_GARAGE_PHYSICS={
    get appearance(){return getAppearance()},
    get stats(){return null},
    getPhysicsSpec(baseSpec){
      const a=getAppearance();
      // Appearance only. No points, acceleration or speed changes.
      return {...baseSpec,
        model:bodyModel[a.body],
        body:parseInt(a.color.slice(1),16),
        accent:parseInt(a.accent.slice(1),16),
        garageAppearance:a};
    },
    debug(){return {retiredPointTuning:true,appearance:getAppearance()}}
  };
})();
