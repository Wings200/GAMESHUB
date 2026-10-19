// BLACKOUT Dev Map Studio — schema, geometry and developer-access regressions.
// Node-only tests validate data contract and wiring; live browser QA still needed.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
const base=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=relative=>readFileSync(join(base,relative),"utf8");
const formatSource=read("src/map-format.js");
const model=new Function(formatSource.replace(/^export /gm,"")+
  ";return {MAP_FORMAT,PART_TYPES,PART_KEYS,createBlankMap,normalizeMap,makePiece,mapAsJSON,siteBounds,canPlantAt,canDefuseAt,cutOpeningInWall}")();
test("editor JSON round-trips with every piece transform and paired bomb rules",()=>{
  const map=model.createBlankMap();
  const sample=[
    model.makePiece("hardWall",0,0,-10,"h1"),
    model.makePiece("softWall",5,4,-10,"s1"),
    model.makePiece("window",3,4,0,"win1"),
    model.makePiece("door",-2,0,0,"door1"),
    model.makePiece("stairs",10,0,-8,"stairs1"),
    model.makePiece("attackerSpawn",20,0,20,"attacker1"),
    model.makePiece("defenderSpawn",-5,4,-5,"defender1")
  ];
  sample[4].size={x:2.6,y:4,z:8};
  sample[4].rotationY=90;
  map.elements.push(...sample);
  map.sitePairs[0].A={x:-7.5,y:4,z:-12,plantRadius:6.25,defuseRange:1};
  map.sitePairs[0].B={x:8,y:8,z:3,plantRadius:3.5,defuseRange:5};
  map.sitePairs.push({
    id:"roof",name:"ROOF",
    A:{x:5,y:8,z:5,plantRadius:6,defuseRange:1.5},
    B:{x:9,y:8,z:9,plantRadius:8,defuseRange:2.75}
  });
  map.activeSitePair="roof";
  const encoded=model.mapAsJSON(map),decoded=model.normalizeMap(JSON.parse(encoded));
  assert.deepEqual(decoded,model.normalizeMap(map));
  assert.equal(decoded.elements.length,8);
  assert.equal(decoded.elements.find(e=>e.id==="stairs1").rotationY,90);
  assert.equal(decoded.elements.find(e=>e.id==="stairs1").size.y,4);
  assert.equal(decoded.sitePairs[0].A.y,4);
  assert.equal(decoded.sitePairs[0].A.plantRadius,6.25);
  assert.equal(decoded.sitePairs[0].A.defuseRange,1);
  assert.equal(decoded.sitePairs[0].B.defuseRange,5);
  assert.equal(decoded.activeSitePair,"roof");
});
test("plant radius and defuse interaction range are independent physical rules",()=>{
  const site={x:0,y:4,z:0,plantRadius:6,defuseRange:1};
  assert.equal(model.canPlantAt(site,{x:5,y:4,z:0}),true);
  assert.equal(model.canPlantAt(site,{x:6.01,y:4,z:0}),false);
  assert.equal(model.canPlantAt(site,{x:1,y:0,z:1}),false);
  const placed={x:3,y:4,z:2};
  assert.equal(model.canDefuseAt(site,placed,{x:3.5,y:4,z:2}),true);
  assert.equal(model.canDefuseAt(site,placed,{x:5,y:4,z:2}),false);
  assert.equal(model.canDefuseAt(site,placed,{x:3,y:0,z:2}),false);
  assert.deepEqual(model.siteBounds(site),{
    minX:-6,maxX:6,minZ:-6,maxZ:6,y:4
  });
});
test("reject malicious, malformed, oversized or ambiguous map submissions",()=>{
  assert.throws(()=>model.normalizeMap({}),/Unsupported map format/);
  const original=model.createBlankMap();
  for(const variant of [
    {...original,elements:[{id:"bad",type:"script",position:{x:0}}]},
    {...original,elements:[original.elements[0],original.elements[0]]},
    {...original,sitePairs:[]},
    {...original,sitePairs:[original.sitePairs[0],original.sitePairs[0]]},
    {...original,elements:Array(1201).fill(original.elements[0])}
  ])assert.throws(()=>model.normalizeMap(variant));
  const dirty=model.createBlankMap();
  dirty.name="<img src=x onerror=alert(1)> MAP";
  dirty.elements[0].position.x=Infinity;
  dirty.sitePairs[0].A.plantRadius=9999;
  dirty.sitePairs[0].A.defuseRange=-30;
  const clean=model.normalizeMap(dirty);
  assert.ok(!clean.name.includes("<"));
  assert.equal(clean.elements[0].position.x,0);
  assert.equal(clean.sitePairs[0].A.plantRadius,22);
  assert.equal(clean.sitePairs[0].A.defuseRange,.5);
});
test("dev page exposes working place, inspector, bomb and file controls",()=>{
  const page=read("dev-editor.html");
  const script=read("src/map-editor.js");
  const ids=[
    "mapName","editorCanvas","mapSelect","pairSelect","pairName",
    "zoneSelect","addZone","placeZone","removeZone","zoneX","zoneY","zoneZ","zoneWidth","zoneDepth","zoneHeight","defuseRange","bombX","bombY","bombZ","importFile",
    "exportMap","floorLevel","customLevel","gridStep",
    "selectTool","rotateLeft","rotateRight","newMap","undo","redo"
  ];
  for(const id of ids){
    if(id==="mapSelect")continue; // main gameplay map selector belongs to index.html
    assert.ok(page.includes('id="'+id+'"'),"missing editor control "+id);
  }
  for(const type of model.PART_KEYS.filter(type=>type!=="ceiling"))
    assert.ok(page.includes('data-piece="'+type+'"'),"missing placeable "+type);
  assert.ok(model.PART_KEYS.includes("ceiling"),
    "old imported ceiling pieces must remain supported in the V1 file format");
  for(const prop of ["new TransformControls(camera,canvas)","new Blob(","URL.createObjectURL",
    "localStorage.setItem","normalizeMap(","updateBombMarkers",
    "keydown","pointerdown","pointermove","orbit.theta","sitePairs"])
    assert.ok(script.includes(prop),"missing authoring behavior "+prop);
  const sanitized=script.replace(/^import[\s\S]*?from\s+"[^"]+";/gm,"");
  assert.doesNotThrow(()=>new Function(sanitized));
});
test("editor is protected by actual server-side account policy and linked in-game",()=>{
  const middleware=readFileSync(join(base,"..","..","functions","_middleware.js"),"utf8");
  const index=read("index.html");
  assert.match(middleware,/isBlackoutPath\(url\.pathname\)/);
  assert.match(middleware,/verifiedBlackoutOwner\(context\)/);
  assert.match(middleware,/SELECT u\.id, u\.username_key/);
  assert.match(middleware,/s\.expires_at > \?/);
  assert.match(middleware,/status: 403/);
  assert.match(index,/href="\.\/dev-editor\.html"/);
});

test("placing barricadable door or window actually cuts a real wall opening",()=>{
  const wall=model.makePiece("hardWall",0,0,0,"wall-1");
  wall.size.x=8;wall.rotationY=0;
  const door=model.makePiece("door",0,0,0,"door-1");
  door.size.x=2.5;
  const pieces=[wall];
  assert.equal(model.cutOpeningInWall(pieces,door),true);
  assert.equal(pieces.length,2,"wall splits into two real sections");
  assert.ok(pieces.every(x=>x.type==="hardWall"));
  assert.ok(pieces.every(x=>Math.abs(x.position.x)>1.25));
  assert.ok(pieces.every(x=>x.size.x>2));
  assert.equal(model.cutOpeningInWall(pieces,door),false,"does not recut already empty doorway");
  const rotatedWall=model.makePiece("softWall",0,4,-10,"upper");
  rotatedWall.rotationY=90;rotatedWall.size.x=8;
  const window=model.makePiece("window",0,4,-10,"window");
  window.rotationY=90;
  const upper=[rotatedWall];
  assert.equal(model.cutOpeningInWall(upper,window),true);
  assert.equal(upper.length,2);
  assert.ok(upper.every(x=>x.position.y===4));
  assert.ok(upper.every(x=>Math.abs(x.position.z+10)>1.1));
  assert.ok(upper.every(x=>x.type==="softWall"));
  assert.equal(model.cutOpeningInWall(upper,{...window,position:{x:0,y:0,z:-10}}),false,
    "ground-floor window cannot cut an upstairs wall");
});

test("V2 coordinate snap honors exact quarter metres, negative positions and FREE mode",()=>{
  const math=new Function(read("src/map-editor-math.js").replace(/^export /gm,"")+
    ";return {snapNumber,snapPoint,applyGizmoToPiece,floorUndersideY,magnetizeEdges}")();
  assert.equal(math.snapNumber(3.11,.25),3);
  assert.equal(math.snapNumber(3.14,.25),3.25);
  assert.equal(math.snapNumber(-3.14,.25),-3.25);
  assert.equal(math.snapNumber(8.625,0),8.625);
  assert.equal(math.snapNumber(-4.08,0),-4.08);
  assert.equal(math.snapNumber(4.8,1),5);
  assert.equal(math.snapNumber(4.8,.5),5);
  assert.deepEqual(math.snapPoint({x:1.12,y:4.23,z:-1.13},.25),
    {x:1,y:4.25,z:-1.25});
  const exportable=model.createBlankMap();
  exportable.grid=0;
  assert.equal(model.normalizeMap(exportable).grid,0,
    "OFF setting must not be silently changed to .25m on export/import");
});
test("V2 XYZ gizmo moves pieces through floors and scales slab footprint precisely",()=>{
  const math=new Function(read("src/map-editor-math.js").replace(/^export /gm,"")+
    ";return {snapNumber,snapPoint,applyGizmoToPiece,floorUndersideY,magnetizeEdges}")();
  const floor=model.makePiece("floor",0,0,0,"foundation");
  floor.size={x:30,y:.25,z:30};
  const moved=math.applyGizmoToPiece(floor,{
    position:{x:10.1,y:8.1,z:-12.1},scale:{x:1.5,y:1,z:.5},rotationY:0
  },{grid:.25,snap:true});
  assert.deepEqual(moved.position,{x:10,y:8,z:-12});
  assert.deepEqual(moved.size,{x:45,y:.25,z:15});
  assert.equal(math.floorUndersideY(moved),7.75,
    "slab bottom naturally becomes the ceiling of room underneath");
  assert.deepEqual(floor.position,{x:0,y:0,z:0},
    "source model is not silently mutated before undo snapshot");
  assert.equal(math.applyGizmoToPiece(floor,{
    position:{x:3.31,y:4.08,z:7.91},scale:{x:1.101,y:1,z:.88},rotationY:0
  },{grid:1,snap:false}).position.y,4.08,
  "Shift permits a truly free vertical translation");
  const selectedUpperFloor={...floor,position:{x:1.25,y:4.25,z:0},size:{x:30,y:.25,z:30}};
  const widthOnly=math.applyGizmoToPiece(selectedUpperFloor,{
    position:{x:1.25,y:4.25,z:0},scale:{x:1.2,y:1,z:.75},rotationY:0
  },{grid:1,snap:true,mode:"scale"});
  assert.deepEqual(widthOnly.position,{x:1.25,y:4.25,z:0},
    "scaling can't snap the upper floor onto a lower elevation");
  assert.equal(widthOnly.size.y,.25,
    "floor X/Z resize must preserve its precise ceiling slab thickness");
  assert.equal(widthOnly.size.x,36);
  assert.equal(widthOnly.size.z,23);
  const moveOnly=math.applyGizmoToPiece(selectedUpperFloor,{
    position:{x:5.08,y:8.12,z:-4.09},scale:{x:1,y:1,z:1},rotationY:0
  },{grid:1,snap:true,mode:"translate"});
  assert.deepEqual(moveOnly.size,{x:30,y:.25,z:30},
    "moving a floor must never resize any dimension");
});
test("V2 magnetic alignment joins unequal wall modules at exact ends",()=>{
  const math=new Function(read("src/map-editor-math.js").replace(/^export /gm,"")+
    ";return {magnetizeEdges}")();
  const existing=model.makePiece("hardWall",0,4,-8,"existing");
  existing.size.x=4;
  const incoming=model.makePiece("softWall",3.54,4,-8,"incoming");
  incoming.size.x=3.1;
  const snapped=math.magnetizeEdges(incoming,[existing]);
  assert.equal(snapped.position.x,3.55,"2m + 1.55m centers must align");
  assert.equal(snapped.position.z,-8);
  assert.equal(incoming.position.x,3.54,"snap must preserve unedited source");
  const unrelated=model.makePiece("softWall",20,8,20,"other");
  assert.equal(math.magnetizeEdges(unrelated,[existing]).position.x,20,
    "different floor must not magnetize");
});
test("V2 UI supports three-dimensional move, floor scale, and redundant ceiling removal",()=>{
  const html=read("dev-editor.html"),source=read("src/map-editor.js");
  for(const id of ["selectTool","scaleTool","edgeSnap","floorSizeTools",
    "floorExpand","floorShrink","removeLegacyCeilings"])
    assert.ok(html.includes('id="'+id+'"'),"missing V2 control "+id);
  assert.match(html,/<option value="0">OFF \/ FREE/);
  assert.ok(!html.includes('data-piece="ceiling"'),
    "ceilings should no longer be an unnecessary building piece");
  assert.ok(html.includes('type="importmap"'));
  assert.ok(html.includes('"three/addons/"'));
  assert.match(source,/new TransformControls\(camera,canvas\)/);
  assert.match(source,/scene\.add\(gizmo\.getHelper\(\)\)/);
  assert.match(source,/gizmo\.setMode\("translate"\)/);
  assert.match(source,/function redrawEdgeHandles\(\)/);
  assert.match(source,/gizmo\.addEventListener\("mouseUp"/);
  assert.match(source,/gizmo\.setTranslationSnap\(null\)/);
  assert.match(source,/root\.position\.x=aligned\.position\.x/);
  assert.match(source,/result=alignPieceToGrid\(result,map\.grid\)/);
  assert.match(source,/case "r":setTransformMode\("scale"\)/);
  assert.match(source,/case "w":case "v":setTransformMode\("translate"\)/);
  assert.match(source,/type==="floor"[\s\S]*mat\.floor,mat\.floor,mat\.floor,mat\.ceiling/);
  assert.match(source,/resizeFromEdge\(piece/);
  assert.match(source,/magnetizeEdges/);
  assert.match(source,/removeLegacyCeilings/);
  const asFunction=source.replace(/^import[\s\S]*?from\s+"[^"]+";/gm,"");
  assert.doesNotThrow(()=>new Function(asFunction));
});

test("V3 default module widths land exactly on grid boundaries and story height fills floor gap",()=>{
  for(const type of ["hardWall","softWall","reinforcedWall"]){
    assert.equal(model.PART_TYPES[type].size[0],4);
    assert.equal(model.PART_TYPES[type].size[1],3.75);
    assert.equal(model.PART_TYPES[type].size[2],.25);
  }
  assert.equal(model.PART_TYPES.door.size[0],2);
  const math=new Function(read("src/map-editor-math.js").replace(/^export /gm,"")+
    ";return {alignPieceToGrid,resizeFromEdge,alignStoryWalls}")();
  let wall=model.makePiece("softWall",2.4,0,-3.3,"soft");
  wall.size.x=3;
  let aligned=math.alignPieceToGrid(wall,1);
  assert.equal((aligned.position.x-aligned.size.x/2)%1,0,
    "physical west end must land on the grid");
  assert.equal((aligned.position.x+aligned.size.x/2)%1,0,
    "physical east end must land on the grid");
  const rotated={...wall,rotationY:90};
  aligned=math.alignPieceToGrid(rotated,1);
  assert.ok(Math.abs((aligned.position.z-aligned.size.x/2)%1)<1e-9,
    "90-degree rotated walls snap their physical Z ends");
  assert.ok(Math.abs((aligned.position.z+aligned.size.x/2)%1)<1e-9);
  const lowerWall=model.makePiece("hardWall",0,0,0,"lowerWall");
  const upperFloor=model.makePiece("floor",0,4,0,"upperFloor");
  const backup=model.createBlankMap();
  backup.elements.push(lowerWall,upperFloor);
  lowerWall.size.y=3.4;
  const result=math.alignStoryWalls(backup,1);
  const corrected=result.map.elements.find(x=>x.id==="lowerWall");
  assert.equal(corrected.size.y,3.75);
  assert.equal(corrected.position.y+corrected.size.y,
    upperFloor.position.y-upperFloor.size.y,
    "walls must physically meet the first-floor slab underside without a gap");
  assert.equal(backup.elements.find(x=>x.id==="lowerWall").size.y,3.4,
    "the repair must be undoable, not silently mutate the original");
});
test("V3 floor and wall edge resize anchors the OPPOSITE SIDE in XYZ",()=>{
  const math=new Function(read("src/map-editor-math.js").replace(/^export /gm,"")+
    ";return {alignPieceToGrid,resizeFromEdge,alignStoryWalls}")();
  const start=model.makePiece("floor",0,4,0,"floor");
  start.size={x:10,y:.25,z:10};
  const right=math.resizeFromEdge(start,{axis:"x",side:1,delta:4,grid:1,snap:true});
  assert.equal(right.size.x,14);
  assert.equal(right.position.x,2);
  assert.equal(right.position.x-right.size.x/2,-5,
    "resizing right edge keeps left edge physically stationary");
  const left=math.resizeFromEdge(start,{axis:"x",side:-1,delta:-4,grid:1,snap:true});
  assert.equal(left.size.x,14);
  assert.equal(left.position.x,-2);
  assert.equal(left.position.x+left.size.x/2,5,
    "resizing left edge keeps right edge stationary");
  const front=math.resizeFromEdge(start,{axis:"z",side:1,delta:3,grid:1,snap:true});
  assert.equal(front.size.z,13);
  assert.equal(front.position.z,1.5);
  assert.equal(front.position.z-front.size.z/2,-5);
  assert.equal(front.position.y,4);
  const thickness=math.resizeFromEdge(start,{axis:"y",side:-1,delta:-.25,grid:.25,snap:true});
  assert.equal(thickness.position.y,4,"the floor's walking surface stays fixed");
  assert.equal(thickness.size.y,.5,"dragging underside down thickens slab");
  const wall=model.makePiece("hardWall",0,0,0,"testWall");
  const tall=math.resizeFromEdge(wall,{axis:"y",side:1,delta:.5,grid:.25,snap:true});
  assert.equal(tall.position.y,0,"wall bottom stays rooted");
  assert.equal(tall.size.y,4.25);
  const rotated=model.makePiece("softWall",0,0,0,"rotated");
  rotated.rotationY=90;
  const rotatedWide=math.resizeFromEdge(rotated,{axis:"x",side:1,delta:2,grid:1,snap:true});
  assert.equal(rotatedWide.position.x,0);
  assert.equal(rotatedWide.position.z,-1,
    "rotated wall extends along Z without shifting its fixed endpoint");
  assert.equal(rotatedWide.size.x,6);
  assert.equal(start.size.x,10,"drag math is pure and undo safe");
});
test("V3 runtime has clickable physical-edge handles, preserves map repair and preview-alignment",()=>{
  const html=read("dev-editor.html"),source=read("src/map-editor.js");
  assert.match(html,/id="repairGrid"/);
  assert.match(source,/new T\.Group\(\);scene\.add\(edgeHandles\)/);
  assert.match(source,/function hitResizeHandle\(evt\)/);
  assert.match(source,/resizeFromEdge\(original/);
  assert.match(source,/resizeFromEdge\(piece/);
  assert.match(source,/alignPieceToGrid\(piece,step\)/);
  assert.match(source,/alignStoryWalls\(map,map.grid\|\|1\)/);
  assert.match(source,/opposite edge/i);
  assert.match(html,/blackout-editor-v4/);
  const stripped=source.replace(/^import[\s\S]*?from\s+"[^"]+";/gm,"");
  assert.doesNotThrow(()=>new Function(stripped));
});

test("V4 independently adjustable rectangular bomb zones are persisted, not circular",()=>{
 const model4=new Function(formatSource.replace(/^export /gm,"")+
   ";return {MAP_FORMAT,createBlankMap,normalizeMap,mapAsJSON,canPlantAt,zonePlacementError,zonesOverlap,newPlantZone,siteBounds}")();
 const map=model4.createBlankMap();
 const a=map.sitePairs[0].A,b=map.sitePairs[0].B;
 assert.equal(a.plantZones.length,1);
 assert.equal(b.plantZones.length,1);
 const extraBox=model4.newPlantZone("a-zone-2",-16,0,-5,3,2,2.5);
 assert.equal(model4.zonePlacementError(map.sitePairs[0],extraBox),null);
 a.plantZones.push(extraBox);
 assert.equal(model4.canPlantAt(a,{x:-16,y:1,z:-5}),true);
 assert.equal(model4.canPlantAt(a,{x:-12,y:1,z:-5}),false,
   "the gap between two boxes must not become a plantable circle");
 assert.equal(model4.canPlantAt(a,{x:-16,y:4,z:-5}),false,
   "box on ground floor cannot be used from upstairs");
 const saved=model4.normalizeMap(JSON.parse(model4.mapAsJSON(map)));
 assert.equal(saved.sitePairs[0].A.plantZones.length,2);
 assert.deepEqual(saved.sitePairs[0].A.plantZones[1],extraBox);
 assert.equal(saved.sitePairs[0].B.plantZones.length,1);
 assert.equal(saved.sitePairs[0].A.defuseRange,2.25);
 const bounds=model4.siteBounds(saved.sitePairs[0].A);
 assert.ok(bounds.minX<=-17.5);
 assert.ok(bounds.maxX>=-2.5);
});
test("V4 disallows touching and overlapping zone boxes across both bombs, but allows other floors",()=>{
 const m=new Function(formatSource.replace(/^export /gm,"")+
   ";return {createBlankMap,normalizeMap,zonePlacementError,zonesOverlap,newPlantZone}")();
 const pair=m.createBlankMap().sitePairs[0],a=pair.A.plantZones[0];
 const within=m.newPlantZone("other",-6,0,-5,2,2,2.5);
 assert.match(m.zonePlacementError(pair,within),/overlaps or touches/);
 const flush=m.newPlantZone("touching",-6+a.width/2+1,0,-5,2,2,2.5);
 assert.match(m.zonePlacementError(pair,flush),/touches/);
 const spaced={...flush,x:flush.x+.3};
 assert.equal(m.zonePlacementError(pair,spaced),null);
 const upstairs={...within,y:4};
 assert.equal(m.zonePlacementError(pair,upstairs),null);
 const acrossB={...pair.B.plantZones[0],id:"new-b"};
 assert.match(m.zonePlacementError(pair,acrossB),/overlaps/);
 assert.equal(m.zonesOverlap(a,spaced),false);
});
test("V4 imports legacy circle maps as editable rectangular boxes with preserved defuse range",()=>{
 const m=new Function(formatSource.replace(/^export /gm,"")+
   ";return {createBlankMap,normalizeMap,canPlantAt}")();
 const source=m.createBlankMap();
 source.sitePairs[0].A={x:-4,y:4,z:-4,plantRadius:3,defuseRange:1.5};
 const decoded=m.normalizeMap(source);
 const legacy=decoded.sitePairs[0].A.plantZones;
 assert.equal(legacy.length,1);
 assert.deepEqual([legacy[0].width,legacy[0].depth,legacy[0].y],[6,6,4]);
 assert.equal(decoded.sitePairs[0].A.defuseRange,1.5);
 assert.equal(m.canPlantAt(decoded.sitePairs[0].A,{x:-1.2,y:4,z:-2.5}),true);
});
test("V4 UI provides zone selection, free box dimensions, moving and no circle radius sliders",()=>{
 const html=read("dev-editor.html"),js=read("src/map-editor.js");
 for(const id of ["zoneSelect","zoneX","zoneY","zoneZ","zoneWidth","zoneDepth",
   "zoneHeight","addZone","placeZone","removeZone","zoneError"]){
   assert.ok(html.includes('id="'+id+'"'),id);
   assert.ok(js.includes('$("'+id+'")'),id+" runtime hook");
 }
 assert.ok(!html.includes('id="plantRadius"'));
 assert.ok(!js.includes("CircleGeometry(site.plantRadius"));
 assert.ok(!js.includes("RingGeometry(site.plantRadius"));
 assert.match(js,/function zoneBox\(key,zone,highlight\)/);
 assert.match(js,/function zonePlacementError|zonePlacementError\(/);
 assert.match(js,/function selectZone\(id\)/);
 assert.match(js,/resizeFromEdge\(original/);
 assert.match(js,/zoneOwner\(transformItem\)/);
 assert.doesNotThrow(()=>new Function(js.replace(/^import[\s\S]*?from\s+"[^"]+";/gm,"")));
});
