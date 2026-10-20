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

test("clubhouse bot physically walks from ground via real stairs to upstairs bomb",()=>{
 const {world,map}=make();
 const botAI=load("bot-ai.js",{findClubhousePath:navigator},
   "{findTacticalPath,advanceTacticalBot}");
 const connector=world.facility.stairConnectors[1];
 const bot={id:7,x:connector.bottom.x,z:connector.bottom.z,y:0,
   group:new Node(),path:[],walkSpeed:3.0,allowBreach:false,
   lastGoal:null,repathAt:0,collisionRevision:-1};
 const goal={x:-25.5,z:-4.75,y:4};
 let peak=0,arrived=false,changes=0;
 for(let tick=0;tick<2400;tick++){
   botAI.advanceTacticalBot(bot,goal,world,.045,1000+tick*45);
   peak=Math.max(peak,bot.y);
   if(bot.y>3&&bot.y<4)changes++;
   if(Math.hypot(bot.x-goal.x,bot.z-goal.z)<1.8&&bot.y>3.6){
     arrived=true;break;
   }
 }
 assert.ok(peak>3.75,"bot must actually climb stairs, peak="+peak+
   " final="+JSON.stringify({x:bot.x,z:bot.z,y:bot.y}));
 assert.ok(changes>2,"ascent must have intermediate heights, not vertical teleport");
 assert.ok(arrived,"bot should reach upstairs Archives site; final="+
   JSON.stringify({x:bot.x,z:bot.z,y:bot.y,path:bot.path.slice(0,2)}));
});

test("V6.5 every approved exterior rappel anchor supports attaching and a real upstairs window entry",()=>{
 const {map,world}=make();
 for(const anchor of map.anchors){
   const player=new Player(T,world,new Node());
   player.x=anchor.x;player.y=0;player.z=anchor.z;
   player.applyCamera();
   const boards={openings:map.openings,hasBarricade:()=>false};
   const rappel=new Rappel(world,player,boards);
   const on=rappel.toggle();
   assert.equal(on.ok,true,anchor.id+": "+on.message);
   assert.equal(rappel.attached,true);
   assert.match(rappel.hint,/W CLIMB/);
   for(let i=0;i<150;i++)rappel.update(.043,new Set(["KeyW"]));
   assert.ok(player.y>4.0,anchor.id+" failed climb to second floor");
   const result=rappel.enterWindow();
   assert.equal(result.ok,true,anchor.id+" cannot enter window: "+result.message);
   assert.equal(rappel.attached,false,anchor.id+" remains attached after vault");
   assert.ok(player.vault,anchor.id+" player vault not started");
 }
});
test("V6.5 rappel gives useful out-of-range feedback and refuses wall-phasing",()=>{
 const {map,world}=make();
 const player=new Player(T,world,new Node());
 const anchor=map.anchors[0];
 player.x=anchor.x+7;player.y=0;player.z=anchor.z;
 const boards={openings:map.openings,hasBarricade:()=>false};
 const rappel=new Rappel(world,player,boards);
 const far=rappel.toggle();
 assert.equal(far.ok,false);
 assert.match(far.message,/M AWAY/);
 player.x=anchor.x+2.2;player.z=anchor.z;
 assert.ok(rappel.nearestAnchor(3));
 assert.match(rappel.hint,/RAPPEL/);
 // A narrow concrete bar directly between operator and attachment point
 // must reject what would otherwise be a teleport through a solid wall.
 const fake={minX:anchor.x+.9,maxX:anchor.x+1.1,
   minZ:anchor.z-.4,maxZ:anchor.z+.4,minY:0,maxY:2,tag:"hard-wall"};
 world.colliders.push(fake);
 const blocked=rappel.toggle();
 assert.equal(blocked.ok,false);
 assert.match(blocked.message,/BLOCKED BY WALL/);
 world.colliders.pop();
 const success=rappel.toggle();
 assert.equal(success.ok,true,success.message);
 const yBefore=player.y;
 for(let i=0;i<25;i++)rappel.update(.043,new Set(["KeyW"]));
 assert.ok(player.y>yBefore+.4,"W must actually ascend the rope");
 for(let i=0;i<15;i++)rappel.update(.043,new Set(["KeyS"]));
 assert.ok(player.y<yBefore+25*.043*2.65,"S must descend");
 assert.equal(rappel.toggle().ok,true);
 assert.equal(rappel.attached,false);
});
test("V6.5 rappel respects solid barricades and explicit window height",()=>{
 const {map,world}=make();
 const anchor=map.anchors.find(x=>/north-archive/.test(x.id));
 const player=new Player(T,world,new Node());
 player.x=anchor.x;player.y=0;player.z=anchor.z;
 let boarded=true;
 const boards={openings:map.openings,hasBarricade:()=>boarded};
 const rappel=new Rappel(world,player,boards);
 assert.equal(rappel.toggle().ok,true);
 assert.match(rappel.enterWindow().message,/CLIMB TO/);
 player.y=4.1;player.applyCamera();
 assert.match(rappel.enterWindow().message,/BARRICADED/);
 assert.equal(rappel.attached,true);
 boarded=false;
 assert.equal(rappel.enterWindow().ok,true);
});
