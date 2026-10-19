// BLACKOUT V2 — interactive, persistent floor-plan training editor.
// Site markers reposition physical bomb carts; cover blocks both bullets and
// tactical navigation. Saved only in this browser, never sent to a server.
export function createSiteBuilder(world,round,root,notify=()=>{}){
  const storageKey="blackout.site-builder.v2";
  const baseSites={A:{x:-5,z:-44},B:{x:5,z:-29}};
  const state={tool:"cover",cover:[],walls:[],sites:{A:{...baseSites.A},B:{...baseSites.B}}};
  const ns="http://www.w3.org/2000/svg";
  const el=(tag,attrs={},parent)=>{
    const node=document.createElementNS(ns,tag);
    for(const [k,v] of Object.entries(attrs))node.setAttribute(k,String(v));
    if(parent)parent.appendChild(node);
    return node;
  };
  const svg=el("svg",{viewBox:"0 0 500 360",role:"img",
    "aria-label":"Editable overhead tactical site layout"});
  svg.style.cssText="width:100%;height:auto;display:block;touch-action:none;cursor:crosshair";
  root.appendChild(svg);
  const panel=document.createElement("div");
  panel.className="bo-builder-tools";root.appendChild(panel);
  for(const [id,label] of [["cover","ADD COVER"],["wall-x","WALL ↔"],["wall-z","WALL ↕"],["remove","ERASE"],
    ["A","MOVE A"],["B","MOVE B"]]){
    const button=document.createElement("button");
    button.type="button";button.textContent=label;button.dataset.tool=id;
    button.addEventListener("click",()=>{state.tool=id;render();});
    panel.appendChild(button);
  }
  const reset=document.createElement("button");
  reset.type="button";reset.textContent="RESET LAYOUT";reset.className="bo-builder-reset";
  reset.addEventListener("click",()=>clear(true));panel.appendChild(reset);
  const status=document.createElement("p");status.className="bo-builder-status";
  root.appendChild(status);
  const clamp=(x,low,high)=>Math.max(low,Math.min(high,x));
  const px=x=>250+x*11.1,py=z=>(z+54)*9.4+12;
  const toWorld=(sx,sy)=>({x:(sx-250)/11.1,z:(sy-12)/9.4-54});
  function canPlaceCover(x,z){
    if(x<-8.55||x>8.55||z<-51.8||z>-20.2)return false;
    if(Object.values(state.sites).some(s=>Math.hypot(x-s.x,z-s.z)<2.1))return false;
    return !world.colliders.some(c=>c.maxY>.5&&c.minY<1.25&&
      x>c.minX-.8&&x<c.maxX+.8&&z>c.minZ-.62&&z<c.maxZ+.62);
  }
  function moveStation(id,x,z){
    const site=round.sites[id],b=site.bounds;
    x=clamp(x,b.minX+1.0,b.maxX-1.0);
    z=clamp(z,b.minZ+1.0,b.maxZ-1.0);
    // Reject bomb placement through desks/solid world geometry.
    const device=round.bombStations.items[id];
    if(!device)return false;
    const offX=id==="A"?1.52:-1.36,offZ=id==="A"?1:-1;
    const nx=x+offX,nz=z+offZ;
    if(world.colliders.some(c=>c.tag!=="bomb-unit"&&c.maxY>.5&&c.minY<1.0&&
      nx>c.minX-.65&&nx<c.maxX+.65&&nz>c.minZ-.48&&nz<c.maxZ+.48))
      return false;
    const collider=device.collider;
    if(collider){
      collider.minX=nx-.57;collider.maxX=nx+.57;
      collider.minZ=nz-.39;collider.maxZ=nz+.39;
    }
    device.root.position.set(nx,0,nz);
    device.x=nx;device.z=nz;
    site.x=x;site.z=z;
    state.sites[id]={x,z};
    round.chooseSite(round.siteId);
    world.collisionRevision++;
    return true;
  }
  function addWall(x,z,axis){
    x=Math.round(x*2)/2;z=Math.round(z*2)/2;
    if(state.walls.length>=18||x<-8.1||x>8.1||z<-51.5||z>-20.5)
      return false;
    if(Object.values(state.sites).some(s=>Math.hypot(x-s.x,z-s.z)<2.2))
      return false;
    if([[0,-19],[-5,-40],[5,-27]].some(p=>Math.hypot(x-p[0],z-p[1])<2.0))
      return false;
    const halfX=axis==="x"?1.27:.2,halfZ=axis==="z"?1.27:.2;
    if(world.colliders.some(c=>c.maxY>.6&&c.minY<2&&
      x+halfX>c.minX&&x-halfX<c.maxX&&
      z+halfZ>c.minZ&&z-halfZ<c.maxZ))return false;
    const item=world.addTestWall(x,z,axis);
    state.walls.push(item);return true;
  }
  function addCover(x,z){
    x=Math.round(x*2)/2;z=Math.round(z*2)/2;
    if(state.cover.length>=24||!canPlaceCover(x,z))return false;
    const item=world.addTestCover(x,z);
    state.cover.push(item);return true;
  }
  function save(){
    try{localStorage.setItem(storageKey,JSON.stringify({
      sites:state.sites,cover:state.cover.map(c=>({x:c.x,z:c.z})),
      walls:state.walls.map(w=>({x:w.x,z:w.z,axis:w.axis}))
    }));}catch{}
  }
  function clear(saveNow=false){
    for(const c of [...state.cover])c.remove();
    for(const w of [...state.walls])w.remove();
    state.cover=[];state.walls=[];
    for(const id of ["A","B"])moveStation(id,baseSites[id].x,baseSites[id].z);
    if(saveNow){save();notify("TEST SITE LAYOUT RESET");}
    render();
  }
  function render(){
    svg.replaceChildren();
    const bg=el("rect",{x:0,y:0,width:500,height:360,fill:"#081520"},svg);
    for(let x=-20;x<=20;x+=2)el("line",{
      x1:px(x),y1:0,x2:px(x),y2:360,stroke:"#29404d","stroke-width":.6},svg);
    for(let z=-54;z<=-17;z+=2)el("line",{
      x1:0,y1:py(z),x2:500,y2:py(z),stroke:"#29404d","stroke-width":.6},svg);
    el("rect",{x:px(-9.5),y:py(-53),width:px(9.5)-px(-9.5),
      height:py(-19)-py(-53),fill:"#1f3340",stroke:"#7797a8","stroke-width":4},svg);
    const positions=[
      [-53,-9.5,9.5],[-19,-9.5,9.5],[-37,-9.5,-6.3],[-37,-3,3],[-37,6.3,9.5]
    ];
    for(const [z,min,max] of positions)el("line",{x1:px(min),x2:px(max),
      y1:py(z),y2:py(z),stroke:"#96adb8","stroke-width":3},svg);
    el("rect",{x:px(-9.1),y:py(-52.58),width:px(-.58)-px(-9.1),
      height:py(-37.38)-py(-52.58),fill:"#1e6164",opacity:.28,
      stroke:"#6af4e4","stroke-width":2},svg);
    el("rect",{x:px(.58),y:py(-36.62),width:px(9.12)-px(.58),
      height:py(-19.42)-py(-36.62),fill:"#98603b",opacity:.22,
      stroke:"#ffc47d","stroke-width":2},svg);
    for(const w of state.walls)el("rect",{
      x:px(w.x)-(w.axis==="x"?13.4:2.2),
      y:py(w.z)-(w.axis==="z"?12.3:2.2),
      width:w.axis==="x"?26.8:4.4,height:w.axis==="z"?24.6:4.4,
      fill:"#687b89",stroke:"#d3e6e7","stroke-width":.8},svg);
    for(const c of state.cover)el("rect",{
      x:px(c.x)-6.5,y:py(c.z)-4.3,width:13,height:8.6,
      rx:1,fill:"#8eabbb",stroke:"#d5e8ee","stroke-width":1.2},svg);
    for(const id of ["A","B"]){
      const site=state.sites[id],color=id==="A"?"#75f0dc":"#f7bb73";
      el("circle",{cx:px(site.x),cy:py(site.z),r:14,
        fill:"#081b25",stroke:color,"stroke-width":3},svg);
      const label=el("text",{x:px(site.x),y:py(site.z)+5,
        "font-size":15,"font-weight":900,"text-anchor":"middle",fill:color},svg);
      label.textContent=id;
    }
    for(const [x,z] of [[0,10],[-13,-40],[13,-27]]){
      el("path",{d:`M ${px(x)-6} ${py(z)+6} L ${px(x)} ${py(z)-6} L ${px(x)+6} ${py(z)+6} Z`,
        fill:"#7acbef",opacity:.9},svg);
    }
    for(const button of panel.querySelectorAll("[data-tool]"))
      button.classList.toggle("selected",button.dataset.tool===state.tool);
    status.textContent="MODE: "+({
      cover:"PLACE HARD COVER","wall-x":"PLACE EAST-WEST WALL",
      "wall-z":"PLACE NORTH-SOUTH WALL",remove:"ERASE PROP",
      A:"MOVE BOMB A",B:"MOVE BOMB B"}[state.tool])+
      " · "+state.cover.length+"/24 COVER · "+state.walls.length+
      "/18 WALLS · AUTO-SAVED";
  }
  svg.addEventListener("click",event=>{
    const rect=svg.getBoundingClientRect();
    const p=toWorld((event.clientX-rect.left)*500/rect.width,
      (event.clientY-rect.top)*360/rect.height);
    let ok=false;
    if(state.tool==="cover")ok=addCover(p.x,p.z);
    else if(state.tool==="wall-x"||state.tool==="wall-z")
      ok=addWall(p.x,p.z,state.tool==="wall-x"?"x":"z");
    else if(state.tool==="remove"){
      const ci=state.cover.findIndex(c=>Math.hypot(c.x-p.x,c.z-p.z)<1.1);
      const wi=state.walls.findIndex(w=>Math.abs(w.x-p.x)<
        (w.axis==="x"?1.3:.45)&&Math.abs(w.z-p.z)<
        (w.axis==="z"?1.3:.45));
      if(ci>=0){state.cover[ci].remove();state.cover.splice(ci,1);ok=true;}
      else if(wi>=0){state.walls[wi].remove();state.walls.splice(wi,1);ok=true;}
    }else ok=moveStation(state.tool,p.x,p.z);
    if(!ok)notify("BUILDER · BLOCKED OR OUTSIDE EDITABLE AREA");
    else{save();notify("SITE LAYOUT UPDATED · PLAY TEST TO VERIFY");}
    render();
  });
  try{
    const value=JSON.parse(localStorage.getItem(storageKey)||"null");
    if(value){
      for(const id of ["A","B"]){
        const pos=value.sites?.[id];
        if(Number.isFinite(pos?.x)&&Number.isFinite(pos?.z))
          moveStation(id,pos.x,pos.z);
      }
      for(const p of (value.cover||[]).slice(0,24)){
        if(Number.isFinite(p?.x)&&Number.isFinite(p?.z))addCover(p.x,p.z);
      }
      for(const p of (value.walls||[]).slice(0,18)){
        if(Number.isFinite(p?.x)&&Number.isFinite(p?.z)&&
          ["x","z"].includes(p.axis))addWall(p.x,p.z,p.axis);
      }
    }
  }catch{}
  render();
  return {render,clear,save,get layout(){return {cover:state.cover.length,walls:state.walls.length,sites:state.sites}}};
}
