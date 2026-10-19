// BLACKOUT V6 — approved user-designed map physical and objectives tests.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
const base=join(dirname(fileURLToPath(import.meta.url)),"..");
const blueprint=JSON.parse(readFileSync(join(base,"maps/consolate-clubhouse.blackout-map.json"),"utf8"));
class V {
 constructor(x=0,y=0,z=0){this.set(x,y,z)}
 set(x,y,z){Object.assign(this,{x,y,z});return this}
 clone(){return new V(this.x,this.y,this.z)}
}
class Node {
 constructor(){
  this.position=new V();this.rotation={x:0,y:0,z:0,set(x,y,z){Object.assign(this,{x,y,z})}};
  this.children=[];this.visible=true;this.userData={};this.isMesh=false;
 }
 add(...items){for(const x of items){this.children.push(x);x.parent=this}}
 remove(x){this.children=this.children.filter(e=>e!==x)}
 traverse(fn){fn(this);for(const n of this.children)n.traverse?.(fn)}
}
class Mesh extends Node{constructor(geometry,material){super();this.geometry=geometry;this.material=material;this.isMesh=true}}
class Geometry{dispose(){}}
class Mat{constructor(o={}){Object.assign(this,o);this.color={setHex(){}}}dispose(){}}
class Tex{constructor(){this.repeat={set(){}}}dispose(){}}
const T=new Proxy({Group:Node,Mesh,CanvasTexture:Tex,Vector3:V,
 MeshStandardMaterial:Mat,MeshBasicMaterial:Mat,MeshPhysicalMaterial:Mat,
 DoubleSide:2,SRGBColorSpace:"srgb"},{get:(obj,key)=>obj[key]||Geometry});
const ctx=new Proxy({},{get:(o,k)=>o[k]||(()=>{})});
const document={createElement:()=>({getContext:()=>ctx})};
function load(file,deps,expr){
 const code=readFileSync(join(base,"src",file),"utf8")
   .replace(/^import .*$/gm,"").replace(/^export /gm,"");
 return new Function("document",...Object.keys(deps),code+";return "+expr)(
   document,...Object.values(deps));
}
const ballistics=load("material-ballistics.js",{},"{materialStats,accumulatedBreach}");
const panelFactory=load("tactical-panels.js",ballistics,"createTacticalPanel");
const module=load("clubhouse-runtime.js",{createTacticalPanel:panelFactory},
 "{createClubhouse,pieceFootprint,sampleClubhouseFloor,clubhouseSitePair,clubhouseStairEndpoints,clubhouseSpawnPoints}");
const navigator=load("clubhouse-nav.js",{},"findClubhousePath");
const Player=load("player.js",{},"FirstPersonController");
const Rappel=load("rappel.js",{},"ClubhouseRappel");
function make(){
 const scene=new Node();
 const map=module.createClubhouse(T,scene,blueprint);
 const world={colliders:map.colliders,shootables:map.shootables,panels:map.panels,
   facility:map.facilities,collisionRevision:1,mapId:"clubhouse",floorAt:map.floorAt,
   zoneAt:map.facilities.zoneAt,spawn:{x:-37.25,y:0,z:-22,yaw:0}};
 return {map,world,scene};
}
test("approved blueprint is authoritative and keeps all user-authored elements and pairs",()=>{
 assert.equal(blueprint.elements.length,178);
 assert.equal(blueprint.sitePairs.length,2);
 assert.equal(blueprint.elements.filter(p=>p.type==="rappelAnchor").length,9);
 assert.equal(blueprint.elements.filter(p=>p.type==="stairs").length,2);
 assert.equal(blueprint.elements.filter(p=>p.type==="attackerSpawn").length,5);
 assert.equal(blueprint.elements.filter(p=>p.type==="defenderSpawn").length,5);
 assert.ok(blueprint.sitePairs.some(p=>p.name==="1F A-B"));
 assert.ok(blueprint.sitePairs.some(p=>p.name==="2F ARCHIVES / OPERATIONS"));
});
test("3D solids, real wall hitboxes, window frames and exterior cables exist",()=>{
 const {map}=make();
 assert.equal(map.panels.length,27);
 assert.equal(map.openings.filter(p=>p.kind==="window").length,14);
 assert.equal(map.openings.filter(p=>p.kind==="door").length,23);
 assert.equal(map.anchors.length,9);
 assert.equal(map.attackerSpawns.length,5);
 assert.equal(map.defenderSpawns.length,5);
 assert.ok(map.colliders.length>150);
 assert.ok(map.shootables.length>240);
 for(const p of map.panels)assert.ok(map.colliders.includes(p.collider));
 for(const o of map.openings)assert.ok([0,4].includes(o.y));
});
test("ground and upper floors cannot teleport; both staircases rise continuously",()=>{
 const {map,world}=make();
 assert.equal(world.floorAt(-20,-7,0),0);
 assert.equal(world.floorAt(-20,-7,4),4);
 assert.equal(world.floorAt(-20,-7,0),0);
 for(const stair of blueprint.elements.filter(e=>e.type==="stairs")){
  const {bottom,top}=module.clubhouseStairEndpoints(stair);
  let y=0;
  for(let i=0;i<=140;i++){
   const t=i/140;
   const x=bottom.x+(top.x-bottom.x)*t;
   const z=bottom.z+(top.z-bottom.z)*t;
   const floor=world.floorAt(x,z,y);
   assert.ok(floor<=y+.23,stair.id+" must not jump a whole floor at step "+i);
   y=floor;
  }
  assert.ok(y>3.7,stair.id+" climbs to second storey, ended at "+y);
 }
});
test("both authored site pairs preserve each independent rectangular plant zone",()=>{
 const {map}=make();
 assert.equal(map.sitePairs.length,2);
 for(const [i,pair] of map.sitePairs.entries()){
  for(const key of ["A","B"]){
   const raw=blueprint.sitePairs[i][key],site=pair[key];
   assert.equal(site.plantZones.length,raw.plantZones.length);
   assert.equal(site.defuseRange,raw.defuseRange);
   assert.equal(site.y,raw.y);
   for(const zone of site.plantZones){
     const p={x:zone.x,y:zone.y+.3,z:zone.z};
     assert.ok(site.plantZones.some(z=>p.x>=z.x-z.width/2&&p.x<=z.x+z.width/2));
   }
  }
 }
});
test("author-approved stair connectors connect two levels without infinite path loops",()=>{
 const {world}=make();
 const top={x:-25.5,y:4,z:-4.75};
 const bottom={x:-37.25,y:0,z:-22};
 const climb=navigator(world,bottom,top);
 assert.ok(climb.length>30,"AI must have actual floor-to-floor path");
 assert.ok(climb.some(p=>p.y>1&&p.y<3),"AI must use stair height transitions");
 assert.ok(climb.some(p=>p.y>=3.9),"AI actually reaches upper level");
 const down=navigator(world,top,bottom);
 assert.ok(down.some(p=>p.y>1&&p.y<3),"downstairs traversal uses real steps");
});
test("operator rappel anchors connect to actual clear upper windows",()=>{
 const {world,map}=make();
 const anchor=map.anchors.find(x=>/north-archive/.test(x.id));
 assert.ok(anchor);
 const upper=map.openings.find(x=>x.y===4&&Math.hypot(x.x-anchor.x,x.z-anchor.z)<2);
 assert.ok(upper,"approved rooftop rope aligned with upper window");
 const player=new Player(T,world,new Node());
 player.x=anchor.x;player.y=0;player.z=anchor.z;
 const barricades={openings:map.openings,hasBarricade:()=>false};
 const rappel=new Rappel(world,player,barricades);
 assert.equal(rappel.toggle().ok,true);
 for(let i=0;i<145;i++)rappel.update(.043,new Set(["KeyW"]));
 assert.ok(player.y>3.5);
 player.y=4.3;player.applyCamera();
 const entry=rappel.enterWindow();
 assert.equal(entry.ok,true,entry.message);
 assert.equal(rappel.attached,false);
 assert.ok(player.vault);
});
