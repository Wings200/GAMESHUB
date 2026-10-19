// BLACKOUT DEV MAP STUDIO V1 — browser-side 3D level authoring.
// Route /games/blackout/* is developer-account-only via Cloudflare Pages D1
// session verification in functions/_middleware.js. Never ship a client-only
// password and never confuse local autosave with server publishing.
import * as T from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import {MAP_FORMAT,PART_TYPES,PART_KEYS,createBlankMap,normalizeMap,makePiece,mapAsJSON,
  canPlantAt,canDefuseAt} from "./map-format.js?v=blackout-editor-v1";

const $=id=>document.getElementById(id);
const canvas=$("editorCanvas"),nameInput=$("mapName"),notice=$("notice");
const STORAGE="BLACKOUT_DEV_MAP_DRAFT_V1";
const cap=(v,a,b)=>Math.max(a,Math.min(b,v));
const n=(v,fallback=0)=>Number.isFinite(Number(v))?Number(v):fallback;
const round=(v,step)=>Math.round(v/step)*step;
const safeName=s=>String(s||"blackout-map").toLowerCase()
  .replace(/[^a-z0-9-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,55)||"blackout-map";
const clone=x=>JSON.parse(JSON.stringify(x));
let map;
try{const saved=localStorage.getItem(STORAGE);map=saved?normalizeMap(JSON.parse(saved)):createBlankMap();}
catch(error){console.warn("BLACKOUT editor draft reset",error);map=createBlankMap();}
let tool="select",siteEditing="A",selectedId=null,layer=0,placementRotation=0;
let dragging=null,mouseMoved=false,dragStart=null,lastPoint=null;
const undoStack=[],redoStack=[];
let noticeTimeout=0,dirty=false,continuousPreview=false;
const mat={
  floor:new T.MeshStandardMaterial({color:0x556979,roughness:.91}),
  ceiling:new T.MeshStandardMaterial({color:0x34495c,roughness:.87}),
  hardWall:new T.MeshStandardMaterial({color:0x697d89,roughness:.84}),
  softWall:new T.MeshStandardMaterial({color:0xc1a487,roughness:.92}),
  reinforcedWall:new T.MeshStandardMaterial({color:0x5e8da2,metalness:.72,roughness:.42}),
  door:new T.MeshStandardMaterial({color:0xdea75b,metalness:.42,roughness:.48}),
  window:new T.MeshStandardMaterial({color:0x82bddd,metalness:.65,roughness:.34}),
  glass:new T.MeshPhysicalMaterial({color:0x6eb9d2,transparent:true,opacity:.18,
    metalness:.06,roughness:.12,side:T.DoubleSide,depthWrite:false}),
  stairs:new T.MeshStandardMaterial({color:0xabb5ba,metalness:.18,roughness:.75}),
  cover:new T.MeshStandardMaterial({color:0xa18b72,roughness:.95}),
  railing:new T.MeshStandardMaterial({color:0xf0bf69,metalness:.55,roughness:.4}),
  attackerSpawn:new T.MeshBasicMaterial({color:0x56c6ff,transparent:true,opacity:.9}),
  defenderSpawn:new T.MeshBasicMaterial({color:0xfc925e,transparent:true,opacity:.9}),
  outline:new T.LineBasicMaterial({color:0x80e6ed}),
  ghost:new T.MeshBasicMaterial({color:0x8de9e8,transparent:true,opacity:.24,
    depthWrite:false,side:T.DoubleSide})
};
const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
renderer.setClearColor(0x0c1924);
renderer.outputColorSpace=T.SRGBColorSpace;
renderer.toneMapping=T.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.4;
const scene=new T.Scene();
scene.background=new T.Color(0x0d1924);
scene.fog=new T.Fog(0x0d1924,180,430);
scene.add(new T.HemisphereLight(0xe5f5ff,0x263441,2.4));
const direct=new T.DirectionalLight(0xffffff,2.2);
direct.position.set(-15,36,30);scene.add(direct);
const camera=new T.PerspectiveCamera(65,1,.06,900);
const orbit={theta:.76,phi:.95,distance:51,target:new T.Vector3(0,1,0)};
function setOrbit(){
  const o=orbit;
  camera.position.set(o.target.x+Math.sin(o.phi)*Math.sin(o.theta)*o.distance,
    o.target.y+Math.cos(o.phi)*o.distance,
    o.target.z+Math.sin(o.phi)*Math.cos(o.theta)*o.distance);
  camera.lookAt(o.target);
}
setOrbit();
const ground=new T.Mesh(new T.PlaneGeometry(650,650),
  new T.MeshStandardMaterial({color:0x152837,roughness:1,metalness:0}));
ground.rotation.x=-Math.PI/2;ground.position.y=-.30;scene.add(ground);
const grid=new T.GridHelper(300,300,0x446376,0x2c4657);
scene.add(grid);
const axis=new T.AxesHelper(4);
axis.position.set(0,.012,0);scene.add(axis);
const raycaster=new T.Raycaster(),pointer=new T.Vector2(),plane=new T.Plane(),hit=new T.Vector3();
const objects=new T.Group();scene.add(objects);
const objectives=new T.Group();scene.add(objectives);
const preview=new T.Group();scene.add(preview);
preview.visible=false;
const entityMeshes=new Map(),labels=[];
let outline=null;
function box(parent,w,h,d,x,y,z,material){
  const m=new T.Mesh(new T.BoxGeometry(w,h,d),material);
  m.position.set(x,y,z);parent.add(m);return m;
}
function cylinder(parent,rt,rb,h,x,y,z,material,segments=20){
  const mesh=new T.Mesh(new T.CylinderGeometry(rt,rb,h,segments),material);
  mesh.position.set(x,y,z);parent.add(mesh);return mesh;
}
function tag(item,id){
  item.traverse(node=>{node.userData.editorId=id;});
}
function textSprite(text,color=0xeaf7fe){
  const c=document.createElement("canvas");c.width=512;c.height=128;
  const ctx=c.getContext("2d");
  ctx.fillStyle="#041321df";ctx.fillRect(4,5,504,118);
  ctx.strokeStyle="#6091a4";ctx.lineWidth=4;ctx.strokeRect(4,5,504,118);
  ctx.fillStyle="#e3b96c";ctx.fillRect(7,7,498,9);
  ctx.fillStyle="#"+color.toString(16).padStart(6,"0");
  ctx.font="900 39px Segoe UI, Arial";ctx.textAlign="center";
  ctx.fillText(text,256,84,482);
  const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;
  const mat=new T.SpriteMaterial({map:tx,transparent:true,depthWrite:false});
  const sp=new T.Sprite(mat);sp.scale.set(2.5,.625,1);
  return sp;
}
function makeGeometry(piece,transparent=false){
  const group=new T.Group(),{type,size:d}=piece;
  const w=d.x,h=d.y,depth=d.z;
  const material=transparent?mat.ghost:mat[type]||mat.hardWall;
  if(type==="floor")box(group,w,h,depth,0,-h/2,0,material);
  else if(type==="ceiling")box(group,w,h,depth,0,h/2,0,material);
  else if(type==="hardWall"){
    box(group,w,h,depth,0,h/2,0,material);
    for(const x of [-w/2+.13,w/2-.13])
      box(group,.1,h,.015,x,h/2,depth/2+.012,transparent?material:mat.ceiling);
  }else if(type==="softWall"||type==="reinforcedWall"){
    box(group,w-.15,h-.16,Math.max(.12,depth),0,h/2,0,material);
    for(const x of [-w/2+.065,w/2-.065])
      box(group,.13,h,depth+.12,x,h/2,0,transparent?material:mat.ceiling);
    box(group,w,.13,depth+.12,0,h-.065,0,transparent?material:mat.ceiling);
    for(let i=1;i<4;i++)
      box(group,w-.25,.042,depth+.035,0,h*i/4,0,transparent?material:mat.ceiling);
    if(type==="reinforcedWall"&&!transparent)
      for(let i=0;i<3;i++)
        box(group,w-.24,h/3-.08,depth+.08,0,(i+.5)*h/3,.085,material);
  }else if(type==="door"){
    const post=Math.min(.2,w*.15),header=Math.min(.35,h*.15);
    for(const x of [-w/2+post/2,w/2-post/2])
      box(group,post,h,depth,x,h/2,0,material);
    box(group,w,header,depth,0,h-header/2,0,material);
    // The central void is intentional: no blocked solid door mesh.
    if(!transparent){
      const tagLabel=textSprite("BARRICADABLE",0xefc27e);
      tagLabel.position.set(0,h+.43,0);tagLabel.scale.set(1.7,.43,1);group.add(tagLabel);
    }
  }else if(type==="window"){
    const post=Math.min(.18,w*.13),header=.25,sill=Math.min(.85,h*.36);
    for(const x of [-w/2+post/2,w/2-post/2])
      box(group,post,h,depth,x,h/2,0,material);
    box(group,w,header,depth,0,h-header/2,0,material);
    box(group,w,sill,depth,0,sill/2,0,material);
    if(!transparent)
      box(group,w-post*2,h-header-sill,.018,0,sill+(h-header-sill)/2,0,mat.glass);
  }else if(type==="stairs"){
    const steps=Math.max(2,Math.ceil(h/.2));
    for(let i=0;i<steps;i++){
      const stepHeight=h*(i+1)/steps,stepDepth=depth/steps;
      box(group,w,stepHeight,stepDepth,0,stepHeight/2,
        -depth/2+stepDepth*(i+.5),material);
    }
    if(!transparent){
      for(const x of [-w/2+.11,w/2-.11])
        box(group,.11,h+.45,depth,x,(h+.45)/2,0,mat.railing);
    }
  }else if(type==="cover"){
    box(group,w,h,depth,0,h/2,0,material);
    if(!transparent)for(const yy of [.16,h-.16])
      box(group,w+.025,.07,depth+.025,0,yy,0,mat.ceiling);
  }else if(type==="railing"){
    const cap=.12;
    for(const x of [-w/2+.06,0,w/2-.06])
      box(group,cap,h,depth,x,h/2,0,material);
    box(group,w,cap,depth,0,h-.08,0,material);
  }else if(type==="attackerSpawn"||type==="defenderSpawn"){
    cylinder(group,Math.max(.35,w/2),Math.max(.35,w/2),.06,0,.04,0,material);
    const pin=new T.Mesh(new T.ConeGeometry(.32,.7,4),material);
    pin.position.y=.53;pin.rotation.y=Math.PI/4;group.add(pin);
  }
  group.position.set(piece.position.x,piece.position.y,piece.position.z);
  group.rotation.y=piece.rotationY*Math.PI/180;
  return group;
}
function disposeGroup(group){
  group.traverse(o=>{
    o.geometry?.dispose?.();
    if(o.isSprite){
      o.material?.map?.dispose?.();o.material?.dispose?.();
    }
  });
  group.clear();
}
function clearOutline(){
  if(outline){objects.remove(outline);outline.geometry?.dispose?.();outline.material?.dispose?.();outline=null}
}
function refreshOutline(){
  clearOutline();
  const root=entityMeshes.get(selectedId);
  if(!root)return;
  const bounds=new T.Box3().setFromObject(root);
  if(!bounds.isEmpty()){
    outline=new T.Box3Helper(bounds,new T.Color(0x9eeef3));
    objects.add(outline);
  }
}
function sitePair(){return map.sitePairs.find(p=>p.id===map.activeSitePair)||map.sitePairs[0]}
function bombMarker(key,site){
  const g=new T.Group();g.position.set(site.x,site.y,site.z);
  const blue=key==="A"?0x73cfff:0xf7ad76;
  const body=new T.MeshStandardMaterial({color:blue,metalness:.48,roughness:.3});
  const transparent=new T.MeshBasicMaterial({color:blue,transparent:true,opacity:.075,
    side:T.DoubleSide,depthWrite:false});
  cylinder(g,.48,.48,.52,0,.26,0,body,12);
  box(g,.56,.17,.55,0,.58,0,mat.ceiling);
  const disc=new T.Mesh(new T.CircleGeometry(site.plantRadius,64),transparent);
  disc.rotation.x=-Math.PI/2;disc.position.y=.018;g.add(disc);
  const ring=new T.Mesh(new T.RingGeometry(site.plantRadius-.055,site.plantRadius,72),
    new T.MeshBasicMaterial({color:blue,transparent:true,opacity:.85,side:T.DoubleSide,
      depthWrite:false}));
  ring.rotation.x=-Math.PI/2;ring.position.y=.035;g.add(ring);
  const defRing=new T.Mesh(new T.RingGeometry(
    Math.max(.1,site.defuseRange-.035),site.defuseRange,64),
    new T.MeshBasicMaterial({color:0xe9e4b7,transparent:true,opacity:.75,side:T.DoubleSide,
      depthWrite:false}));
  defRing.rotation.x=-Math.PI/2;defRing.position.y=.048;g.add(defRing);
  const label=textSprite("BOMB "+key+(key===siteEditing?" // EDITING":""),
    key==="A"?0xb1e7ff:0xffc3a6);
  label.position.y=1.5;g.add(label);
  return g;
}
function updateBombMarkers(){
  disposeGroup(objectives);
  const pair=sitePair();
  for(const key of ["A","B"])objectives.add(bombMarker(key,pair[key]));
}
function renderStructures(){
  clearOutline();disposeGroup(objects);entityMeshes.clear();
  for(const e of map.elements){
    const g=makeGeometry(e);tag(g,e.id);objects.add(g);entityMeshes.set(e.id,g);
  }
  updateBombMarkers();
  refreshOutline();
  $("objectCount").textContent=map.elements.length+" PIECES";
  updateValidation(false);
}
function saveDraft(){
  try{
    localStorage.setItem(STORAGE,mapAsJSON(map));
    $("saveState").textContent="SAVED LOCALLY ✓";
    $("saveState").style.color="#8ce5b4";
  }catch(error){
    $("saveState").textContent="EXPORT TO KEEP YOUR WORK!";
    $("saveState").style.color="#ffb5a0";
    console.warn("Draft autosave unavailable",error);
  }
}
function snapshot(){return JSON.stringify(map)}
function beginChange(){
  undoStack.push(snapshot());if(undoStack.length>90)undoStack.shift();
  redoStack.length=0;
}
function changed({render=true,inspector=true}={}){
  if(render)renderStructures();
  if(inspector){updateInspector();updateSiteFields()}
  saveDraft();
  $("undo").disabled=!undoStack.length;$("redo").disabled=!redoStack.length;
}
function undo(){
  if(!undoStack.length)return;
  redoStack.push(snapshot());
  map=normalizeMap(JSON.parse(undoStack.pop()));
  if(!map.elements.some(e=>e.id===selectedId))selectedId=null;
  updateGlobalFields();changed();
  toast("UNDID LAST CHANGE");
}
function redo(){
  if(!redoStack.length)return;
  undoStack.push(snapshot());
  map=normalizeMap(JSON.parse(redoStack.pop()));
  if(!map.elements.some(e=>e.id===selectedId))selectedId=null;
  updateGlobalFields();changed();
  toast("REDID CHANGE");
}
function toast(message,error=false){
  notice.textContent=message;notice.classList.toggle("error",error);
  notice.classList.remove("hidden");
  clearTimeout(noticeTimeout);
  noticeTimeout=setTimeout(()=>notice.classList.add("hidden"),3100);
}
function setTool(next){
  tool=next;preview.visible=false;
  for(const btn of document.querySelectorAll("[data-piece],[data-site]")){
    btn.classList.toggle("active",next===btn.dataset.piece||
      next==="bomb-"+btn.dataset.site);
  }
  $("selectTool").classList.toggle("active",next==="select");
  $("toolStatus").textContent=next==="select"?"SELECT / MOVE":
    next.startsWith("bomb-")?"PLACE SITE "+next.slice(5):
    (PART_TYPES[next]?.name||next).toUpperCase();
}
function selectPiece(id){
  selectedId=id;
  if(id)setTool("select");
  refreshOutline();
  updateInspector();
  $("selectedInfo").textContent=id?(
    map.elements.find(e=>e.id===id)?.type.toUpperCase()+" · "+id):"NO SELECTION";
}
function updateInspector(){
  const piece=map.elements.find(x=>x.id===selectedId);
  $("selectionDescription").textContent=piece?
    piece.type.toUpperCase()+" / "+piece.id:
    "Click a piece in the scene to edit or drag it. Choose an item on the left to start placing.";
  $("partName").disabled=!piece;
  $("partName").value=piece?.name||"";
  const v={px:piece?.position.x,py:piece?.position.y,pz:piece?.position.z,
    sx:piece?.size.x,sy:piece?.size.y,sz:piece?.size.z};
  for(const [key,value] of Object.entries(v)){
    const input=document.querySelector('[data-field="'+key+'"]');
    input.disabled=!piece;input.value=value??"";
  }
  $("partRotation").disabled=!piece;$("partRotation").value=piece?.rotationY??"";
  const tips={
    stairs:"Stair HEIGHT is rise, DEPTH is horizontal run. Stairs climb from local -Z to +Z. Rotate the entire flight with Q/E.",
    floor:"Floor Y represents its walking surface. Place upper floors at Y=4m, Y=8m, etc.",
    hardWall:"Solid structural wall. Not reinforceable or breachable during matches.",
    softWall:"Breachable drywall. Can receive bullet holes or a 3-second reinforcement by defenders.",
    reinforcedWall:"Starts with steel reinforcement. Only specialized hard-breach tools can open it.",
    door:"An actual passable door FRAME, ready for barricade boards. The opening is not a solid wall.",
    window:"Framed window opening with a sill; vaulting/barricade mechanics can be applied in the game.",
    attackerSpawn:"Attackers appear only after the drone preparation phase, not during setup.",
    defenderSpawn:"Defenders begin preparation at this location."
  };
  $("pieceTip").textContent=piece?(tips[piece.type]||
    "Edit position, size and rotation precisely, or drag the piece in the scene."):
    "Select a placed wall, floor, stair or other piece to inspect its properties.";
}
function updateGlobalFields(){
  nameInput.value=map.name;$("gridStep").value=String(map.grid);
  if(!$("gridStep").value)$("gridStep").value="1";
  $("pairSelect").replaceChildren();
  for(const pair of map.sitePairs){
    const op=document.createElement("option");op.value=pair.id;
    op.textContent=pair.name;$("pairSelect").appendChild(op);
  }
  $("pairSelect").value=map.activeSitePair;
  $("removePair").disabled=map.sitePairs.length<=1;
  $("addPair").disabled=map.sitePairs.length>=12;
  updateSiteFields();
}
function updateSiteFields(){
  const pair=sitePair(),site=pair[siteEditing];
  $("pairName").value=pair.name;
  for(const key of ["A","B"])
    $("editSite"+key).classList.toggle("active",siteEditing===key);
  for(const [id,value] of [["bombX",site.x],["bombY",site.y],["bombZ",site.z],
    ["plantRadius",site.plantRadius],["defuseRange",site.defuseRange]])
    $(id).value=String(value);
  $("plantRadiusValue").textContent=site.plantRadius.toFixed(2)+"m";
  $("defuseRangeValue").textContent=site.defuseRange.toFixed(2)+"m";
}
function readPoint(evt,atY=layer){
  const r=canvas.getBoundingClientRect();
  pointer.set((evt.clientX-r.left)/r.width*2-1,
    1-(evt.clientY-r.top)/r.height*2);
  raycaster.setFromCamera(pointer,camera);
  plane.setFromNormalAndCoplanarPoint(new T.Vector3(0,1,0),new T.Vector3(0,atY,0));
  return raycaster.ray.intersectPlane(plane,hit)?hit.clone():null;
}
function findUnderPointer(evt){
  const r=canvas.getBoundingClientRect();
  pointer.set((evt.clientX-r.left)/r.width*2-1,
    1-(evt.clientY-r.top)/r.height*2);
  raycaster.setFromCamera(pointer,camera);
  const hits=raycaster.intersectObjects([...entityMeshes.values()],true);
  for(const h of hits){
    let o=h.object;
    while(o){if(o.userData.editorId)return o.userData.editorId;o=o.parent}
  }
  return null;
}
function setLayer(val){
  layer=cap(n(val),-12,90);
  $("customLevel").value=String(layer);
  if(["0","4","8","12"].includes(String(layer)))$("floorLevel").value=String(layer);
  else $("floorLevel").selectedIndex=-1;
  grid.position.y=layer+.01;
  $("currentLayer").textContent="HEIGHT "+layer.toFixed(2)+"M";
}
function setBomb(key,point){
  beginChange();
  const site=sitePair()[key],step=map.grid;
  site.x=round(point.x,step);site.y=layer;site.z=round(point.z,step);
  siteEditing=key;changed({render:false});updateBombMarkers();updateSiteFields();
  toast("BOMB "+key+" POSITION SET · FLOOR "+layer.toFixed(2)+"M");
}
function placePart(point){
  beginChange();
  const step=map.grid;
  const piece=makePiece(tool,round(point.x,step),layer,round(point.z,step));
  piece.rotationY=placementRotation;
  map.elements.push(piece);
  selectedId=piece.id;changed({inspector:false});updateInspector();
  $("selectedInfo").textContent=piece.type.toUpperCase()+" · "+piece.id;
  toast(PART_TYPES[tool].name.toUpperCase()+" PLACED");
}
function rotatePiece(dir){
  if(selectedId){
    const item=map.elements.find(e=>e.id===selectedId);
    if(!item)return;
    beginChange();item.rotationY=(((item.rotationY+dir*90)%360)+360)%360;
    changed();toast("ROTATED "+(dir>0?"+90°":"-90°"));
  }else{
    placementRotation=((placementRotation+dir*90)%360+360)%360;
    toast("NEXT PIECE YAW "+placementRotation+"°");
  }
}
function removeSelected(){
  if(!selectedId)return;
  const i=map.elements.findIndex(e=>e.id===selectedId);
  if(i===-1)return;
  beginChange();map.elements.splice(i,1);selectedId=null;changed();
  toast("PIECE DELETED");
}
function duplicateSelected(){
  const item=map.elements.find(e=>e.id===selectedId);
  if(!item)return;
  beginChange();
  const duplicate=clone(item);
  duplicate.id=makePiece(item.type).id;
  duplicate.position.x=round(duplicate.position.x+map.grid,map.grid);
  duplicate.position.z=round(duplicate.position.z+map.grid,map.grid);
  duplicate.name=item.name+" COPY";
  map.elements.push(duplicate);selectedId=duplicate.id;changed();
  toast("DUPLICATED "+item.type.toUpperCase());
}
function focus(){
  const item=map.elements.find(e=>e.id===selectedId);
  const p=item?.position||sitePair()[siteEditing];
  orbit.target.set(p.x,p.y+(item?item.size.y/2:0),p.z);
  orbit.distance=cap(item?Math.max(...Object.values(item.size))*4:16,9,70);
  setOrbit();
}
function downloadMap(){
  try{
    const value=mapAsJSON(map);
    const blob=new Blob([value],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const anchor=document.createElement("a");
    anchor.href=url;
    anchor.download=safeName(map.name)+".blackout-map.json";
    document.body.appendChild(anchor);anchor.click();anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1200);
    saveDraft();toast("MAP BUILD DOWNLOADED — SEND THE JSON FILE BACK TO CHATGPT");
  }catch(error){toast("DOWNLOAD FAILED: "+error.message,true)}
}
async function importMap(file){
  if(!file)return;
  try{
    if(file.size>2_500_000)throw Error("Map exceeds 2.5MB.");
    const json=JSON.parse(await file.text());
    const parsed=normalizeMap(json);
    if(!window.confirm("Replace the current editor map with '"+parsed.name+"'?\nYour previous draft remains in undo history."))return;
    beginChange();map=parsed;selectedId=null;
    updateGlobalFields();changed();toast("IMPORTED "+parsed.elements.length+" PIECES · "+parsed.sitePairs.length+" SITE PAIRS");
  }catch(error){toast("INVALID IMPORT: "+error.message,true)}
}
function updateValidation(show=true){
  if(!show&&map.elements.length>1000)return;
  const messages=[],types=map.elements.map(e=>e.type);
  const floorParts=map.elements.filter(e=>e.type==="floor");
  const spawns=map.elements.filter(e=>/Spawn$/.test(e.type));
  if(!floorParts.length)messages.push("Add at least one FLOOR piece.");
  if(!spawns.some(e=>e.type==="attackerSpawn"))
    messages.push("Add an ATTACKER SPAWN outside direct defender sightlines.");
  if(!spawns.some(e=>e.type==="defenderSpawn"))
    messages.push("Add a DEFENDER SPAWN near the selected sites.");
  if(!types.includes("stairs"))messages.push("No STAIRS placed. Add stairs if your map has multiple levels.");
  if(!types.includes("softWall"))messages.push("No SOFT WALLS yet. Add reinforcement/breach options.");
  if(!types.includes("door"))messages.push("No DOOR openings yet. Add entry and barricade routes.");
  for(const pair of map.sitePairs)for(const key of ["A","B"]){
    const site=pair[key];
    if(!floorParts.some(p=>Math.abs(p.position.y-site.y)<=.4&&
      Math.abs(p.position.x-site.x)<=p.size.x/2&&
      Math.abs(p.position.z-site.z)<=p.size.z/2))
      messages.push(pair.name+" — BOMB "+key+" has no floor directly below it.");
  }
  const output=$("validationResults");output.replaceChildren();
  const p=document.createElement("p");p.className="ok";
  p.textContent=map.elements.length+" pieces · "+map.sitePairs.length+
    " bomb pairs · "+(messages.length?"needs review":"basic authoring checks passed");
  output.appendChild(p);
  for(const m of messages.slice(0,9)){
    const node=document.createElement("p");node.className="warn";
    node.textContent="⚠ "+m;output.appendChild(node);
  }
  if(show)toast(messages.length?messages.length+" MAP SUGGESTIONS — SEE INSPECTOR":
    "BASIC MAP CHECKS PASSED");
  // This is an authoring lint check; complete collision and AI validation
  // happens when the exported file is converted into a playable game map.
}

canvas.addEventListener("contextmenu",e=>e.preventDefault());
canvas.addEventListener("pointerdown",evt=>{
  if(![0,1,2].includes(evt.button))return;
  canvas.setPointerCapture(evt.pointerId);
  dragging={button:evt.button,lastX:evt.clientX,lastY:evt.clientY,
    startX:evt.clientX,startY:evt.clientY,mode:"camera"};
  mouseMoved=false;
  if(evt.button!==0)return;
  if(tool==="select"){
    const selected=findUnderPointer(evt);
    if(selected){
      selectPiece(selected);
      const part=map.elements.find(e=>e.id===selected);
      const point=readPoint(evt,part.position.y);
      if(point){
        dragging.mode="piece";dragging.id=selected;
        dragging.initial=clone(part.position);
        dragging.offset={x:part.position.x-point.x,z:part.position.z-point.z};
        dragStart=snapshot();
      }
    }else selectPiece(null);
  }else{
    const point=readPoint(evt,layer);
    if(!point)return;
    if(tool.startsWith("bomb-"))setBomb(tool.slice(5),point);
    else if(PART_KEYS.includes(tool))placePart(point);
  }
});
canvas.addEventListener("pointermove",evt=>{
  const cursor=readPoint(evt,layer);
  if(cursor) $("viewportCoords").textContent="X "+cursor.x.toFixed(1)+
    " · Y "+layer.toFixed(1)+" · Z "+cursor.z.toFixed(1);
  if(!dragging)return;
  const dx=evt.clientX-dragging.lastX,dy=evt.clientY-dragging.lastY;
  dragging.lastX=evt.clientX;dragging.lastY=evt.clientY;
  if(Math.abs(evt.clientX-dragging.startX)>2||
    Math.abs(evt.clientY-dragging.startY)>2)mouseMoved=true;
  if(dragging.button===2){
    orbit.theta-=dx*.006;
    orbit.phi=cap(orbit.phi+dy*.006,.065,1.53);
    setOrbit();
  }else if(dragging.button===1){
    const right=new T.Vector3().setFromMatrixColumn(camera.matrix,0);
    const up=new T.Vector3().setFromMatrixColumn(camera.matrix,1);
    const factor=orbit.distance/Math.max(170,canvas.clientHeight)*1.3;
    orbit.target.addScaledVector(right,-dx*factor);
    orbit.target.addScaledVector(up,dy*factor);
    setOrbit();
  }else if(dragging.mode==="piece"&&dragging.id){
    const item=map.elements.find(e=>e.id===dragging.id);
    if(!item)return;
    const point=readPoint(evt,item.position.y);
    if(!point)return;
    item.position.x=round(point.x+dragging.offset.x,map.grid);
    item.position.z=round(point.z+dragging.offset.z,map.grid);
    const group=entityMeshes.get(item.id);
    group?.position.set(item.position.x,item.position.y,item.position.z);
    refreshOutline();
    $("selectedInfo").textContent=item.type.toUpperCase()+" X "+item.position.x+
      " / Z "+item.position.z;
  }
});
function endDragging(){
  if(dragging?.mode==="piece"&&mouseMoved&&dragStart&&snapshot()!==dragStart){
    undoStack.push(dragStart);
    if(undoStack.length>90)undoStack.shift();
    redoStack.length=0;changed({render:false});refreshOutline();
  }
  dragging=null;dragStart=null;updateInspector();
}
canvas.addEventListener("pointerup",endDragging);
canvas.addEventListener("pointercancel",endDragging);
canvas.addEventListener("wheel",evt=>{
  evt.preventDefault();
  orbit.distance=cap(orbit.distance*Math.exp(evt.deltaY*.001),2.5,240);
  setOrbit();
},{passive:false});
window.addEventListener("resize",resize);
function resize(){
  const w=canvas.clientWidth,h=canvas.clientHeight;
  if(w<1||h<1)return;
  renderer.setSize(w,h,false);
  camera.aspect=w/h;camera.updateProjectionMatrix();
}
function loop(){
  requestAnimationFrame(loop);
  renderer.render(scene,camera);
}
function numberChange(id,handler){
  $(id).addEventListener("change",evt=>{
    const val=Number(evt.target.value);
    if(!Number.isFinite(val))return;
    beginChange();handler(val);changed();
  });
}
for(const btn of document.querySelectorAll("[data-piece]"))
  btn.addEventListener("click",()=>{selectedId=null;refreshOutline();updateInspector();setTool(btn.dataset.piece)});
for(const btn of document.querySelectorAll("[data-site]"))
  btn.addEventListener("click",()=>{
    siteEditing=btn.dataset.site;setTool("bomb-"+siteEditing);updateSiteFields();
  });
$("selectTool").addEventListener("click",()=>setTool("select"));
$("rotateLeft").addEventListener("click",()=>rotatePiece(-1));
$("rotateRight").addEventListener("click",()=>rotatePiece(1));
$("deleteSelected").addEventListener("click",removeSelected);
$("duplicate").addEventListener("click",duplicateSelected);
$("undo").addEventListener("click",undo);$("redo").addEventListener("click",redo);
$("topView").addEventListener("click",()=>{
  orbit.phi=.065;orbit.theta=0;setOrbit();
});
$("perspectiveView").addEventListener("click",()=>{
  orbit.phi=.92;orbit.theta=.75;setOrbit();
});
$("frameSelection").addEventListener("click",focus);
$("floorLevel").addEventListener("change",e=>setLayer(Number(e.target.value)));
$("customLevel").addEventListener("change",e=>setLayer(Number(e.target.value)));
$("gridStep").addEventListener("change",e=>{
  beginChange();map.grid=n(e.target.value,1);changed({render:false});
  toast("GRID SNAP "+map.grid+"M");
});
nameInput.addEventListener("change",()=>{
  beginChange();map.name=nameInput.value.trim()||"UNTITLED OPERATION";
  changed({render:false});
});
$("partName").addEventListener("change",e=>{
  const p=map.elements.find(p=>p.id===selectedId);if(!p)return;
  beginChange();p.name=e.target.value.slice(0,70);changed();
});
for(const field of document.querySelectorAll("[data-field]"))
  field.addEventListener("change",evt=>{
    const p=map.elements.find(p=>p.id===selectedId);if(!p)return;
    const value=Number(evt.target.value);if(!Number.isFinite(value))return;
    const key=field.dataset.field.slice(1),isPos=field.dataset.field[0]==="p";
    beginChange();
    if(isPos)p.position[key]=cap(value,key==="y"?-12:-300,key==="y"?90:300);
    else p.size[key]=cap(value,.15,key==="y"?28:110);
    changed();
  });
numberChange("partRotation",value=>{
  const item=map.elements.find(e=>e.id===selectedId);
  if(item)item.rotationY=value;
});
$("pairSelect").addEventListener("change",evt=>{
  map.activeSitePair=evt.target.value;
  updateGlobalFields();updateBombMarkers();saveDraft();
});
$("pairName").addEventListener("change",evt=>{
  beginChange();sitePair().name=evt.target.value.trim().slice(0,75)||"SITE PAIR";
  changed({render:false});updateGlobalFields();
});
for(const key of ["A","B"])
  $("editSite"+key).addEventListener("click",()=>{
    siteEditing=key;updateSiteFields();updateBombMarkers();
  });
for(const [control,key,min,max] of [
  ["bombX","x",-300,300],["bombY","y",-12,90],["bombZ","z",-300,300],
  ["plantRadius","plantRadius",1,22],["defuseRange","defuseRange",.5,12]
]){
  const input=$(control);
  const update=()=>{
    const value=Number(input.value);if(!Number.isFinite(value))return;
    beginChange();sitePair()[siteEditing][key]=cap(value,min,max);
    updateSiteFields();updateBombMarkers();saveDraft();
  };
  input.addEventListener(control.endsWith("Radius")||control==="defuseRange"?"change":"change",update);
  if(control==="plantRadius"||control==="defuseRange")
    input.addEventListener("input",()=>{
      const text=control==="plantRadius"?"plantRadiusValue":"defuseRangeValue";
      $(text).textContent=n(input.value).toFixed(2)+"m";
    });
}
$("placeBomb").addEventListener("click",()=>{setTool("bomb-"+siteEditing);toast("CLICK GRID TO PLACE BOMB "+siteEditing)});
$("addPair").addEventListener("click",()=>{
  if(map.sitePairs.length>=12){toast("MAXIMUM 12 BOMB PAIRS",true);return;}
  beginChange();
  const id="site-pair-"+Date.now().toString(36);
  map.sitePairs.push({id,name:"BOMB PAIR "+(map.sitePairs.length+1),
    A:{x:-5,y:layer,z:-5,plantRadius:4,defuseRange:2.25},
    B:{x:5,y:layer,z:5,plantRadius:4,defuseRange:2.25}});
  map.activeSitePair=id;changed({render:false});updateGlobalFields();updateBombMarkers();
  toast("NEW SITE PAIR CREATED");
});
$("removePair").addEventListener("click",()=>{
  if(map.sitePairs.length<=1)return;
  if(!window.confirm("Delete this bomb site pair?"))return;
  beginChange();map.sitePairs=map.sitePairs.filter(p=>p.id!==map.activeSitePair);
  map.activeSitePair=map.sitePairs[0].id;changed({render:false});
  updateGlobalFields();updateBombMarkers();
});
$("validateMap").addEventListener("click",()=>updateValidation(true));
$("exportMap").addEventListener("click",downloadMap);
$("importMap").addEventListener("click",()=>$("importFile").click());
$("importFile").addEventListener("change",async evt=>{
  await importMap(evt.target.files?.[0]);evt.target.value="";
});
$("newMap").addEventListener("click",()=>$("confirmNew").showModal());
$("cancelNew").addEventListener("click",()=>$("confirmNew").close());
$("confirmNewButton").addEventListener("click",()=>{
  beginChange();map=createBlankMap();selectedId=null;setTool("select");
  updateGlobalFields();changed();$("confirmNew").close();toast("BLANK MAP CREATED");
});
window.addEventListener("keydown",e=>{
  const editing=e.target instanceof HTMLInputElement||
    e.target instanceof HTMLTextAreaElement||e.target instanceof HTMLSelectElement;
  if(e.ctrlKey&&(e.key.toLowerCase()==="z"||e.key.toLowerCase()==="y"||
    e.key.toLowerCase()==="s"||e.key.toLowerCase()==="o"||e.key.toLowerCase()==="d")){
    if(editing&&e.key.toLowerCase()==="z")return;
    e.preventDefault();
    const k=e.key.toLowerCase();
    if(k==="z")undo();if(k==="y")redo();if(k==="s")downloadMap();
    if(k==="o")$("importFile").click();if(k==="d")duplicateSelected();
    return;
  }
  if(editing||e.altKey||e.metaKey)return;
  switch(e.key.toLowerCase()){
    case "delete":case "backspace":e.preventDefault();removeSelected();break;
    case "escape":setTool("select");selectPiece(null);break;
    case "q":rotatePiece(-1);break;case "e":rotatePiece(1);break;
    case "v":setTool("select");break;case "f":focus();break;
  }
});
setLayer(0);updateGlobalFields();renderStructures();updateInspector();
setTool("select");saveDraft();resize();requestAnimationFrame(loop);
