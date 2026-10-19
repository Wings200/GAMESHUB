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
  ";return {MAP_FORMAT,PART_TYPES,PART_KEYS,createBlankMap,normalizeMap,makePiece,mapAsJSON,siteBounds,canPlantAt,canDefuseAt}")();
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
    "plantRadius","defuseRange","bombX","bombY","bombZ","importFile",
    "exportMap","floorLevel","customLevel","gridStep",
    "selectTool","rotateLeft","rotateRight","newMap","undo","redo"
  ];
  for(const id of ids){
    if(id==="mapSelect")continue; // main gameplay map selector belongs to index.html
    assert.ok(page.includes('id="'+id+'"'),"missing editor control "+id);
  }
  for(const type of model.PART_KEYS)
    assert.ok(page.includes('data-piece="'+type+'"'),"missing placeable "+type);
  for(const prop of ["dragging.mode=\"piece\"","new Blob(","URL.createObjectURL",
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
