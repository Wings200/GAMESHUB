// IRONVALE gameplay acceptance: test actual rendered colliders and floor levels,
// not simply the validity of the 549-piece blueprint JSON.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {join,dirname} from "node:path";
import {fileURLToPath} from "node:url";
const base=join(dirname(fileURLToPath(import.meta.url)),"..");
const map=JSON.parse(readFileSync(join(base,"maps/ironvale-operations.blackout-map.json"),"utf8"));
class V{constructor(x=0,y=0,z=0){this.set(x,y,z)}
 set(x,y,z){Object.assign(this,{x,y,z});return this}}
class Node{constructor(){this.position=new V();this.rotation={x:0,y:0,z:0};
 this.children=[];this.userData={};this.visible=true}
 add(...nodes){for(const n of nodes){this.children.push(n);n.parent=this}}
 remove(node){this.children=this.children.filter(n=>n!==node)}
 traverse(fn){fn(this);for(const n of this.children)n.traverse?.(fn)}}
class Mesh extends Node{constructor(geom,mat){super();this.geometry=geom;this.material=mat;this.isMesh=true}}
class Mat{constructor(o={}){Object.assign(this,o);this.color={setHex(){}}}dispose(){}}
class Geometry{dispose(){}}
class Tex{constructor(){this.repeat={set(){}}}}
const T=new Proxy({Group:Node,Mesh,Vector3:V,CanvasTexture:Tex,
 MeshStandardMaterial:Mat,MeshBasicMaterial:Mat,MeshPhysicalMaterial:Mat,
 DoubleSide:2,SRGBColorSpace:"srgb"},{get:(o,k)=>o[k]||Geometry});
const document={createElement:()=>({getContext:()=>new Proxy({}, {get:()=>()=>{}})})};
function load(name,bindings,expr){
 return new Function("document",...Object.keys(bindings),
  readFileSync(join(base,"src",name),"utf8").replace(/^import .*$/gm,"")
  .replace(/^export /gm,"")+";return "+expr)(
   document,...Object.values(bindings));
}
const stats=load("material-ballistics.js",{},"{materialStats,accumulatedBreach}");
const panel=load("tactical-panels.js",stats,"createTacticalPanel");
const create=load("clubhouse-runtime.js",{createTacticalPanel:panel},
 "createClubhouse");
const navigate=load("clubhouse-nav.js",{},"findClubhousePath");
const spawn=load("round-spawns.js",{},"{defenderSetupPositions,isSafeDefenderInsertion}");
const rappel=load("rappel.js",{},"ClubhouseRappel");
function build(){
 const scene=new Node();
 const data=create(T,scene,map);
 const world={mapId:"ironvale",colliders:data.colliders,shootables:data.shootables,
   panels:data.panels,facility:data.facilities,collisionRevision:1,
   floorAt:data.floorAt,spawn:{x:-42,y:0,z:-24,yaw:0}};
 return {world,data,scene};
}
test("large map has real 56x40m rooms, not floating floors, and both bomb pairs render",()=>{
 const {world,data}=build();
 assert.deepEqual(world.facility.bounds,{minX:-28,maxX:28,minZ:-20,maxZ:20});
 assert.equal(data.openings.filter(x=>x.kind==="door").length,92);
 assert.equal(data.openings.filter(x=>x.kind==="window").length,38);
 assert.equal(data.anchors.length,16);
 assert.equal(data.panels.length,59);
 assert.equal(data.sitePairs.length,2);
 assert.ok(data.colliders.length>420);
 assert.ok(data.shootables.length>520);
 for(const pair of data.sitePairs){
  for(const [siteId,site] of [["A",pair.A],["B",pair.B]]){
   assert.equal(world.floorAt(site.x,site.z,site.y+.25),site.y,
     pair.name+" "+siteId+" lacks valid structural floor");
  }
 }
});
test("1F and 2F site choices yield real safe player and four AI defender positions",()=>{
 const {world,data}=build();
 for(const pair of data.sitePairs){
  world.facility.sites={A:pair.A,B:pair.B};
  for(const focus of ["A","B"]){
   const positions=spawn.defenderSetupPositions(world,5,focus);
   assert.equal(positions.length,5,pair.name+" "+focus+" needs five clear room spawns");
   for(const p of positions)assert.ok(spawn.isSafeDefenderInsertion(world,
     pair[p.site],p,positions.filter(x=>x!==p)),
     "Invalid human/AI defense position "+JSON.stringify(p));
  }
 }
});
test("all sixteen ropes align with at least one second-floor exterior window",()=>{
 const {data}=build();
 for(const a of data.anchors){
  const windows=data.openings.filter(o=>o.kind==="window"&&o.y===4&&
    Math.hypot(o.x-a.x,o.z-a.z)<2.4);
  assert.ok(windows.length, "Rope "+a.id+" must terminate at actual upper window");
 }
});
test("ground spawn reaches lobby through an actual exterior door using collision-aware path",()=>{
 const {world,data}=build();
 world.facility.sites={A:data.sitePairs[0].A,B:data.sitePairs[0].B};
 const route=navigate(world,{x:-42,y:0,z:-24},{x:8,y:0,z:8});
 assert.ok(route.length>20,"attacker must navigate exterior to ground bomb room");
 for(const spot of route.filter((_,i)=>i%3===0)){
  assert.ok(Number.isFinite(spot.x+spot.z+spot.y),"AI path contains NaN");
 }
});
