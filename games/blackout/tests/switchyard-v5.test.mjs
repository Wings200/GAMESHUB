// SWITCHYARD V5: original map geometry, stairs, site pairs, and vertical AI.
// Source-level smoke tests, NOT a browser visual walkthrough.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const canvasContext=new Proxy({}, {get:(o,k)=>o[k]??(()=>{})});
const document={createElement:()=>({getContext:()=>canvasContext})};
class V{
  constructor(x=0,y=0,z=0){this.set(x,y,z)}
  set(x,y,z){Object.assign(this,{x,y,z});return this}
  clone(){return new V(this.x,this.y,this.z)}
  sub(p){return new V(this.x-p.x,this.y-p.y,this.z-p.z)}
  length(){return Math.hypot(this.x,this.y,this.z)}
  normalize(){const n=this.length()||1;this.x/=n;this.y/=n;this.z/=n;return this}
}
class Node{
  constructor(){this.position=new V();this.rotation={x:0,y:0,z:0,set(x,y,z){Object.assign(this,{x,y,z})}};
    this.children=[];this.visible=true;this.userData={};this.isMesh=false;this.scale={x:1,y:1,z:1}}
  add(...xs){for(const x of xs){this.children.push(x);x.parent=this}}
  remove(x){this.children=this.children.filter(c=>c!==x)}
  traverse(cb){cb(this);for(const c of this.children)c.traverse?.(cb)}
}
class Mesh extends Node{constructor(geo,mat){super();this.geometry=geo;this.material=mat;this.isMesh=true}}
class Geometry{dispose(){}}
class Mat{constructor(x={}){Object.assign(this,x);this.color={setHex(){}}}dispose(){}}
class Tex{constructor(){this.repeat={set(){}}}dispose(){}}
const T=new Proxy({Group:Node,Mesh,PointLight:Node,CanvasTexture:Tex,
  MeshBasicMaterial:Mat,MeshStandardMaterial:Mat,MeshPhysicalMaterial:Mat,
  Vector3:V,DoubleSide:2,RepeatWrapping:100,SRGBColorSpace:"srgb"},
  {get:(o,k)=>o[k]??Geometry});
function load(file,deps,expr){
 const src=readFileSync(join(root,"src",file),"utf8")
  .replace(/^import .*$/gm,"").replace(/^export /gm,"");
 return new Function("document",...Object.keys(deps),src+";return "+expr+";")(
   document,...Object.values(deps));
}
const ballistics=load("material-ballistics.js",{},
  "{materialStats,accumulatedBreach}");
const tacticalPanels=load("tactical-panels.js",ballistics,"createTacticalPanel");
const mapModule=load("switchyard.js",{createTacticalPanel:tacticalPanels},
  "{createSwitchyard,switchyardFloorAt,SWITCHYARD_SITE_PAIRS}");
const AI=load("bot-ai.js",{},"{findTacticalPath,advanceTacticalBot}");
const Player=load("player.js",{},"FirstPersonController");
function make(){
 const scene=new Node(),map=mapModule.createSwitchyard(T,scene);
 const world={colliders:map.colliders,shootables:map.shootables,
   collisionRevision:1,mapId:"switchyard",floorAt:map.floorAt,
   zoneAt:map.facilities.zoneAt,facility:map.facilities,
   spawn:{x:17.1,y:0,z:-49.9,yaw:Math.PI}};
 return {scene,map,world};
}
test("three architecturally separate playable floor heights with site pairs",()=>{
 const {map,world}=make();
 assert.equal(world.floorAt(-7,-41,0),0);
 assert.equal(world.floorAt(-7,-41,4),4);
 assert.equal(world.floorAt(-7,-41,8),8);
 assert.equal(map.sitePairs.length,3);
 assert.deepEqual(map.sitePairs.map(x=>x.floor),[0,4,8]);
 for(const pair of map.sitePairs)
   for(const site of [pair.A,pair.B]){
     assert.equal(site.y,pair.floor);
     assert.ok(site.bounds.minX<site.x&&site.x<site.bounds.maxX);
     assert.ok(site.bounds.minZ<site.z&&site.z<site.bounds.maxZ);
   }
 assert.ok(map.colliders.length>35);
 assert.ok(map.shootables.length>90);
 assert.equal(map.root.visible,false,"lab is initial active map");
});
test("stairs rise in small legal increments, but can't teleport from bottom to upper floor",()=>{
 const {world}=make();
 assert.equal(world.floorAt(-5,-41,0),0);
 let height=0;
 for(let i=0;i<=140;i++){
   const z=-50+i*.1;
   const n=world.floorAt(17.1,z,height);
   assert.ok(n>=height-.025,"stair cannot unexpectedly drop at "+z);
   assert.ok(n-height<=.235,"step cannot jump higher than player allowance");
   height=n;
 }
 assert.ok(height>=3.95,"first staircase physically reaches 4 metres");
 let second=4;
 for(let i=0;i<=140;i++){
   const z=-35+i*.1;
   const n=world.floorAt(17.1,z,second);
   assert.ok(n>=second-.025,"second stairs must not drop at "+z);
   assert.ok(n-second<=.235);
   second=n;
 }
 assert.ok(second>=7.95,"second staircase physically reaches roof");
});
test("player physics climbs first staircase without teleporting",()=>{
 const {world}=make();const cam=new Node(),p=new Player(T,world,cam);
 p.reset();p.y=0;p.x=17.1;p.z=-49.9;p.yaw=Math.PI;p.applyCamera();
 const samples=[];
 for(let i=0;i<230;i++){
   p.update(.032,new Set(["KeyW"]));
   samples.push({x:p.x,y:p.y,z:p.z});
 }
 assert.ok(p.z>-37.0,"operator progressed up external stairs");
 assert.ok(p.y>3.0,"feet moved from the main floor toward upper deck");
 assert.ok(samples.some(p=>p.y>3.9&&p.y<4.2),"operator genuinely crosses upper floor");
 assert.ok(samples.every((v,i)=>i===0||Math.abs(v.y-samples[i-1].y)<.23),
   "every visible frame climbs continuously without a vertical teleport");
});
test("multi-floor route uses exterior stairs rather than a ghost vertical jump",()=>{
 const {world}=make();
 const from={x:17.1,z:-49.9,y:0},
   target={x:-7,z:-41,y:4};
 const route=AI.findTacticalPath(world,from,target);
 assert.ok(route.length>25,"must have real waypoints for climbing stairs");
 const heights=route.map(p=>p.y||0);
 assert.ok(heights.some(y=>y>1&&y<3));
 assert.ok(heights.some(y=>y>=3.9));
 assert.ok(route.some(p=>p.x>15&&p.z>-50&&p.z<-36));
 assert.ok(heights.every((v,i)=>i===0||Math.abs(v-heights[i-1])<.5),
    "no instantaneous vertical teleports");
});
test("site selector and map source both wired to visible UI",()=>{
 const html=readFileSync(join(root,"index.html"),"utf8");
 const main=readFileSync(join(root,"main.js"),"utf8");
 assert.match(html,/id="mapSelect"/);
 assert.match(html,/id="sitePairSelect"/);
 assert.match(html,/SWITCHYARD/);
 assert.match(main,/applyMap\("switchyard"\)/);
 assert.match(main,/objectiveRound\.refreshMap\(\)/);
 assert.match(main,/world\.setSitePair\(/);
 assert.match(main,/world\.spawn\.y=role==="defender"/);
});

test("AI can route to a roof site and descend between floor pairs",()=>{
 const {world}=make();
 const floor0={x:17.1,z:-49.9,y:0},roof={x:7,z:-30,y:8};
 const climb=AI.findTacticalPath(world,floor0,roof);
 assert.ok(climb.length>50,"ground-to-roof requires both physical stair tiers");
 assert.ok(climb.some(p=>p.y>3.8&&p.y<4.2),"passes upper landing");
 assert.ok(climb.some(p=>p.y>6&&p.y<7),"uses second flight");
 assert.ok(climb.some(p=>p.y>=7.95),"arrives at roof elevation");
 const down=AI.findTacticalPath(world,roof,{x:-7,z:-41,y:0});
 assert.ok(down.length>50,"roof-to-ground must also use physical stairs");
 assert.ok(down.some(p=>p.y>0&&p.y<4),"routes down lower flight");
});

test("an attacking bot actually walks from exterior insertion onto the rooftop",()=>{
 const {world}=make();
 const bot={id:1,x:17.1,z:-49.9,y:0,walkSpeed:2.8,
   group:new Node(),allowBreach:false,path:[],lastGoal:null,
   repathAt:0,collisionRevision:-1};
 const goal={x:7,z:-28,y:8}; // Actual roof Site B center, not a prop footprint.
 let maxY=0,steps=0;
 for(let i=0;i<1650;i++){
   AI.advanceTacticalBot(bot,goal,world,.05,1000+i*50);
   if(bot.y>maxY)maxY=bot.y;
   if(Math.hypot(bot.x-goal.x,bot.z-goal.z)<1.5&&bot.y>7.7){steps=i;break}
 }
 assert.ok(maxY>7.7,"the actual bot movement must climb both stair flights; state="+JSON.stringify({x:bot.x,z:bot.z,y:bot.y,maxY,route:bot.path.length,first:bot.path[0],last:bot.lastGoal,repath:bot.repathAt,steps}));
 assert.ok(steps>0,"the bot must physically arrive at its upper bomb zone; state="+JSON.stringify({x:bot.x,z:bot.z,y:bot.y,maxY,route:bot.path.length,first:bot.path[0],last:bot.lastGoal,repath:bot.repathAt,steps}));
 assert.ok(bot.group.position.y>7.7,"visible character rig follows its physics floor");
});

test("SWITCHYARD contains 12 actual wall mechanics and 10 distinct barricade-ready frames",()=>{
 const {map}=make();
 assert.equal(map.panels.length,12);
 assert.equal(map.openings.length,10);
 assert.equal(map.openings.filter(o=>o.kind==="door").length,8);
 assert.equal(map.openings.filter(o=>o.kind==="window").length,2);
 for(const y of [0,4]){
   assert.equal(map.panels.filter(p=>p.y===y).length,6);
   assert.equal(map.openings.filter(o=>o.y===y).length,5);
   assert.ok(map.panels.some(p=>p.y===y&&p.axis==="z"));
   assert.ok(map.panels.some(p=>p.y===y&&p.axis==="x"));
 }
 for(const panel of map.panels){
   assert.ok(map.colliders.includes(panel.collider),panel.id+" is physically solid");
   assert.ok(map.shootables.includes(panel.mesh),panel.id+" can receive bullets");
   assert.equal(panel.collider.minY,panel.y,panel.id+" collision follows its floor");
 }
});
test("in-building soft panels create holes, reinforce with segmented steel, and truly breach",()=>{
 const {map}=make();
 const p=map.panels.find(p=>p.axis==="x"&&p.y===4);
 assert.ok(p);
 const shot={x:p.x,y:p.y+1.5,z:p.z};
 assert.equal(p.bulletHole(shot),true);
 assert.equal(p.holes.length,1);
 assert.equal(p.holeAt(shot),true);
 assert.equal(p.previewReinforcement(.55),undefined);
 assert.equal(p.overlay.visible,true,"installation animation starts before the final steel wall");
 assert.equal(p.reinforce(),true);
 assert.equal(p.reinforced,true);
 assert.equal(p.overlay.visible,true,"raised steel plates remain after installation");
 assert.equal(p.mesh.material.map,undefined,"armor physically replaces the drywall face");
 assert.equal(p.bulletHole(shot),false,"reinforced steel stops soft bullet holes");
 assert.equal(p.damage(500,true),false,"ordinary hard breach must not destroy steel");
 p.reinforced=false; // Thermite strips steel before using its charge.
 assert.equal(p.reinforced,false);
 assert.equal(p.overlay.visible,false);
 assert.equal(p.damage(500,true),true);
 assert.equal(p.destroyed,true);
 assert.equal(map.colliders.includes(p.collider),false,"breach removes the REAL wall collider");
 p.reset();
 assert.equal(p.destroyed,false);
 assert.equal(p.reinforced,false);
 assert.equal(p.holes.length,0);
 assert.equal(map.colliders.includes(p.collider),true);
});
test("real barricades install on matching floor and rebuild cleanly",()=>{
 const {map,scene,world}=make();
 const Bar=load("barricades.js",{},"Barricades");
 const boards=new Bar(T,world,scene,map.openings);
 assert.equal(boards.openings.length,10);
 const upper=boards.openings.find(o=>o.y===4&&o.kind==="door");
 const ground=boards.openings.find(o=>o.y===0&&o.kind==="door");
 assert.ok(upper&&ground);
 const player={
   x:upper.x,z:upper.z+1.2,y:4,yaw:0,
   blocked:()=>false
 };
 assert.equal(boards.nearest(player)?.id,upper.id,"floor height selects upper frame");
 player.y=0;
 assert.notEqual(boards.nearest(player)?.id,upper.id,"cannot interact upstairs from downstairs");
 const boardCount=world.shootables.length;
 assert.equal(boards.place(upper),true);
 assert.ok(upper.planks.some(p=>world.colliders.includes(p.collider)));
 assert.ok(upper.planks.every(p=>p.collider.minY>=3.95));
 boards.configure(map.openings.filter(o=>o.y===0));
 assert.equal(boards.openings.length,5);
 assert.ok(!world.colliders.some(c=>c.barricade?.id===upper.id));
 assert.ok(world.shootables.length<boardCount);
 const newGround=boards.openings.find(o=>o.id===ground.id);
 assert.equal(boards.place(newGround),true);
 boards.breakAll(newGround);
 assert.ok(newGround.planks.every(p=>!world.colliders.includes(p.collider)));
});
test("SWITCHYARD defender AI installs real reinforcement then barricades one of its frames",()=>{
 const {map,world,scene}=make();
 const Bar=load("barricades.js",{},"Barricades");
 world.panels=map.panels;
 world.barricades=new Bar(T,world,scene,map.openings);
 const {updateDefenderPrep}=load("squad-ai.js",{
   advanceTacticalBot:(bot,goal)=>{
     bot.x=goal.x;bot.z=goal.z;bot.y=goal.y||0;return 2;
   }
 },"{updateDefenderPrep}");
 const panel=map.panels.find(p=>p.id==="north-west-0");
 const bot={id:1,x:panel.x,z:panel.z+1.25,y:0,team:"ally",alive:true,
   state:"prep",assignedSite:map.sitePairs[0].A,
   operatorSpec:{id:"mute"},animate(){}};
 const events=[];
 const round={role:"defender",phase:"prep",bots:[],allies:[bot],
   world:{...world,mapId:"switchyard",panels:map.panels,barricades:world.barricades,
     drone:{active:false}}};
 for(let i=0;i<100;i++)
   updateDefenderPrep(round,1000+i*100,.1,(message)=>events.push(message));
 assert.ok(map.panels.some(p=>p.reinforced),"AI must reinforce a REAL wall, not pace around");
 assert.ok(world.barricades.openings.some(o=>world.barricades.hasBarricade(o)),
   "AI must physically install wood/armor boards in a real door opening");
 assert.ok(events.some(s=>/REINFORCED/.test(s||"")));
 assert.ok(events.some(s=>/BARRICADED/.test(s||"")));
});
