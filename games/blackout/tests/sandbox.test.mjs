// Repeatable BLACKOUT Stage-1 sandbox regressions.
// Run from repository root: node --test games/blackout/tests/sandbox.test.mjs
// No npm dependencies, browser, external game servers or rendering GPU needed.
// These mocks validate code-level behaviors, NOT live rendered browser quality.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const ctx=new Proxy({},{
  get:(obj,key)=>obj[key]??(()=>{}),
  set:(obj,key,value)=>(obj[key]=value,true)
});
const document={createElement:()=>({getContext:()=>ctx})};
class Vector3{
  constructor(x=0,y=0,z=0){this.set(x,y,z)}
  set(x,y,z){Object.assign(this,{x,y,z});return this}
  clone(){return new Vector3(this.x,this.y,this.z)}
  sub(b){return this.set(this.x-b.x,this.y-b.y,this.z-b.z)}
  length(){return Math.hypot(this.x,this.y,this.z)}
  normalize(){const n=this.length()||1;return this.set(this.x/n,this.y/n,this.z/n)}
}
class Node{
  constructor(){
    this.position=new Vector3();this.rotation={order:"YXZ",x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z}};
    this.scale={set(){},setScalar(){}};
    this.children=[];this.userData={};this.visible=true;
  }
  add(...nodes){for(const node of nodes){node.parent=this;this.children.push(node)}}
  remove(node){this.children=this.children.filter(n=>n!==node)}
  traverse(fn){fn(this);for(const node of this.children)node.traverse?.(fn)}
}
class Mesh extends Node{
  constructor(geometry,material){super();this.geometry=geometry;this.material=material;this.isMesh=true}
}
class Material{constructor(opts={}){Object.assign(this,opts);this.color={setHex(){}}}dispose(){}}
class Geometry{dispose(){}}
class Texture{constructor(){this.repeat={set(){}}}}
const THREE=new Proxy({
  Group:Node,Mesh,GridHelper:Mesh,MeshStandardMaterial:Material,
  MeshBasicMaterial:Material,CanvasTexture:Texture,Vector3,
  HemisphereLight:Node,DirectionalLight:Node,PointLight:Node,
  Color:class {},FogExp2:class {},DoubleSide:2,
  RepeatWrapping:100,SRGBColorSpace:"srgb"
},{get:(obj,key)=>obj[key]??Geometry});
const load=(name,deps,result)=>{
  const code=readFileSync(join(root,"src",name),"utf8")
    .replace(/^import .*$/gm,"").replace(/^export /gm,"");
  return new Function("document",...Object.keys(deps),code+
    ";return "+result+";")(document,...Object.values(deps));
};
const facility=load("facility.js",{},"buildFacility");
const ballistics=load("material-ballistics.js",{},"{materialStats,accumulatedBreach}");
const switchyard=load("switchyard.js",{},
  "{createSwitchyard,SWITCHYARD_SITE_PAIRS,switchyardFloorAt}");
const build=load("world.js",{buildFacility:facility,...ballistics,
  createSwitchyard:switchyard.createSwitchyard,
  SWITCHYARD_SITE_PAIRS:switchyard.SWITCHYARD_SITE_PAIRS},"buildRange");
const Bar=load("barricades.js",{},"Barricades");
const Player=load("player.js",{},"FirstPersonController");
const AI=load("bot-ai.js",{},"{findTacticalPath,advanceTacticalBot}");
function makeWorld(){
  const scene=new Node(),world=build(THREE,scene);
  world.barricades=new Bar(THREE,world,scene,world.facility.openings);
  return world;
}
test("sandbox is flat, roofless and has two complete bomb planting areas",()=>{
  const w=makeWorld();
  assert.equal(w.facility.mode,"mechanics-sandbox");
  assert.equal(w.specifications.facility,false);
  assert.equal(w.colliders.filter(c=>c.tag==="wall"||c.tag==="roof").length,0);
  assert.equal(Object.keys(w.facility.sites).length,2);
  for(const site of Object.values(w.facility.sites)){
    assert.ok(site.bounds.minX<site.x&&site.x<site.bounds.maxX);
    assert.ok(site.bounds.minZ<site.z&&site.z<site.bounds.maxZ);
  }
  assert.equal(w.panels.length,5);
  assert.equal(w.panels.filter(p=>p.reinforced).length,1);
  assert.equal(w.facility.openings.length,10);
  assert.equal(w.colliders.filter(c=>c.tag==="test-cover").length,8);
});
test("soft holes survive hits, destructive breach removes collision, round reset restores samples",()=>{
  const w=makeWorld(),soft=w.panels.find(p=>p.x===-12&&p.z===-29);
  const hard=w.panels.find(p=>p.x===12&&p.z===-29);
  assert.ok(soft.bulletHole({x:-12,y:1.3,z:-29}));
  assert.ok(soft.holeAt({x:-12,y:1.3,z:-29}));
  assert.equal(soft.destroyed,false);
  assert.equal(hard.reinforced,true);
  assert.equal(hard.damage(500,true),false);
  assert.equal(soft.damage(500,true),true);
  assert.equal(w.colliders.includes(soft.collider),false);
  w.reset();
  assert.equal(soft.destroyed,false);
  assert.equal(soft.holes.length,0);
  assert.equal(w.panels.filter(p=>p.reinforced).length,1);
});
test("barricade board colliders appear only when installed, then disappear",()=>{
  const w=makeWorld(),opening=w.barricades.openings.find(o=>o.id==="west-hall");
  assert.ok(opening);
  assert.equal(w.barricades.hasBarricade(opening),false);
  assert.equal(w.barricades.place(opening),true);
  assert.equal(w.barricades.hasBarricade(opening),true);
  assert.ok(opening.planks.some(p=>w.colliders.includes(p.collider)));
  w.barricades.breakAll(opening);
  assert.equal(w.barricades.hasBarricade(opening),false);
  assert.ok(opening.planks.every(p=>!w.colliders.includes(p.collider)));
});
test("attacking AI can navigate from all three approaches to both test bomb zones",()=>{
  const w=makeWorld();
  for(const spawn of [{x:0,z:12},{x:-13,z:-40},{x:13,z:-27}]){
    for(const site of Object.values(w.facility.sites)){
      const bot={id:1,x:spawn.x,z:spawn.z,walkSpeed:2.3,
        group:new Node(),allowBreach:true,path:[],lastGoal:null,
        repathAt:0,collisionRevision:-1};
      const path=AI.findTacticalPath(w,bot,site);
      assert.ok(path.length,JSON.stringify({spawn,site:site.id}));
      let arrived=false;
      for(let n=0;n<1400;n++){
        AI.advanceTacticalBot(bot,site,w,.05,1000+n*50);
        if(Math.hypot(bot.x-site.x,bot.z-site.z)<1.8){arrived=true;break}
      }
      assert.ok(arrived,JSON.stringify({spawn,site:site.id,x:bot.x,z:bot.z}));
    }
  }
});
test("west/east windows vault gradually without teleporting or clipping on landing",()=>{
  const w=makeWorld();
  for(const [index,initialX] of [-17,17].entries()){
    const camera=new Node(),p=new Player(THREE,w,camera);
    p.x=initialX;p.z=-45;p.y=0;p.applyCamera();
    const baseY=camera.position.y;
    assert.equal(w.barricades.vault(p,1000+index*2000),true);
    assert.equal(p.x,initialX);
    for(let i=0;i<11;i++)p.update(.03,new Set());
    assert.ok(p.vault);
    assert.ok(camera.position.y>baseY+.20);
    for(let i=0;i<20;i++)p.update(.03,new Set());
    assert.equal(p.vault,null);
    assert.ok(Math.abs(p.x-initialX)>1.0);
    assert.equal(p.blocked(p.x,p.z,0,p.height),false);
  }
});

test("locked Q/E lean remains selected but camera straightens during sprint",()=>{
  const w=makeWorld(),camera=new Node(),p=new Player(THREE,w,camera);
  p.toggleLean(-1);
  for(let i=0;i<30;i++)p.update(.016,new Set());
  assert.equal(p.leanSide,-1);
  assert.ok(p.lean<-.9);
  assert.ok(Math.abs(camera.rotation.z)<.195,
    "Lean camera should never bank beyond ~11 degrees");
  for(let i=0;i<45;i++)p.update(.016,new Set(["KeyW","ShiftLeft"]));
  assert.equal(p.leanSide,-1,
    "Sprint should not erase the persistent Q/E preference");
  assert.ok(Math.abs(camera.rotation.z)<.007,
    "Sprint should center camera roll even with Q/E lock");
  for(let i=0;i<35;i++)p.update(.016,new Set());
  assert.ok(p.lean<-.9,"Lean should resume after sprinting ends");
  p.toggleLean(1);
  for(let i=0;i<35;i++)p.update(.016,new Set());
  assert.ok(p.lean>.9,"Switching from Q to E must reverse the shoulder");
});
test("phase banner is short-lived and flat arena has no phantom prep building boundary",()=>{
  const source=readFileSync(join(root,"main.js"),"utf8");
  assert.ok(source.includes('phase==="prep"?2800'),
    "Phase intro should last less than 3 seconds");
  assert.ok(source.includes('const show=now<phaseToastUntil&&'),
    "Phase intro must not remain visible throughout prep");
  assert.ok(source.includes('world.facility.mode!=="mechanics-sandbox"'),
    "Flat lab should not enforce invisible old-building prep boundaries");
});
test("peripheral barricade training frames stay clear of both bomb zones",()=>{
  const w=makeWorld(),outward=w.facility.openings.filter(o=>
    ["west-entry","east-entry","server-door","control-door"].includes(o.id));
  assert.equal(outward.length,4);
  for(const frame of outward){
    assert.ok(Math.abs(frame.x)>=20,
      "Nonessential door frames must stay in the peripheral practice lanes");
  }
});

test("SWITCHYARD and mechanics lab use separate collision and raycast lists",()=>{
  const w=makeWorld();
  const labCount=w.colliders.length,labShoot=w.shootables.length;
  const labZones=Object.values(w.facility.sites).map(x=>({x:x.x,z:x.z}));
  assert.equal(w.activateMap("switchyard"),true);
  assert.equal(w.facility.mode,"switchyard");
  assert.equal(w.mapId,"switchyard");
  assert.equal(w.root.visible,false);
  assert.ok(w.colliders.length>35);
  assert.ok(w.shootables.length>90);
  assert.ok(w.floorAt(-7,-41,4)===4);
  assert.equal(w.setSitePair("rooftop"),true);
  assert.equal(w.facility.sites.A.y,8);
  assert.equal(w.facility.sites.B.y,8);
  const pairBounds=w.facility.sites.A.bounds;
  assert.ok(pairBounds.minX<w.facility.sites.A.x);
  assert.equal(w.activateMap("lab"),true);
  assert.equal(w.mapId,"lab");
  assert.equal(w.facility.mode,"mechanics-sandbox");
  assert.equal(w.root.visible,true);
  assert.equal(w.colliders.length,labCount);
  assert.equal(w.shootables.length,labShoot);
  assert.equal(w.floorAt(-7,-41,4),0);
  assert.deepEqual(Object.values(w.facility.sites).map(x=>({x:x.x,z:x.z})),labZones);
  assert.equal(w.facility.sites.A.y,0);
});
