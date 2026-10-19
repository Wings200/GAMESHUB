// BLACKOUT V4.1: physical drone and mobile defender behavior regressions.
// node --test games/blackout/tests/*.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
const root=join(dirname(fileURLToPath(import.meta.url)),"..","src");
const load=(name,deps,expr)=>{
  const source=readFileSync(join(root,name),"utf8")
    .replace(/^import .*$/gm,"").replace(/^export /gm,"");
  return new Function(...Object.keys(deps),source+";return "+expr+";")(...Object.values(deps));
};
class Vector3{
  constructor(x=0,y=0,z=0){this.set(x,y,z)}
  set(x,y,z){Object.assign(this,{x,y,z});return this}
  copy(p){return this.set(p.x,p.y,p.z)}
  sub(p){return this.set(this.x-p.x,this.y-p.y,this.z-p.z)}
  length(){return Math.hypot(this.x,this.y,this.z)}
  normalize(){const len=this.length()||1;return this.set(this.x/len,this.y/len,this.z/len)}
}
class Node{
  constructor(){this.position=new Vector3();this.rotation={x:0,y:0,z:0,set(x,y,z){Object.assign(this,{x,y,z})}};
    this.children=[];this.visible=true;this.scale={set(){}}}
  add(...children){for(const child of children){this.children.push(child);child.parent=this}}
  remove(obj){this.children=this.children.filter(x=>x!==obj)}
}
class Geometry{dispose(){}}
class Material{constructor(properties={}){Object.assign(this,properties)}dispose(){}}
class Mesh extends Node{constructor(geometry,material){super();this.geometry=geometry;this.material=material;this.userData={}}}
const T=new Proxy({Group:Node,Mesh,MeshStandardMaterial:Material,MeshBasicMaterial:Material,
  Vector3,Raycaster:class {set(){}intersectObjects(){return []}}},
 {get:(obj,key)=>obj[key]??Geometry});
function makeDrone(){
  const world={colliders:[],shootables:[]};
  const camera=new Node(),scene=new Node();
  const create=load("drone.js",{},"createReconDrone");
  return {world,camera,scene,drone:create(T,scene,world,camera)};
}
test("physical drone stays in scene for enemy targeting but never obscures its camera",()=>{
  const {world,drone}=makeDrone();
  assert.equal(drone.begin(1000),true);
  assert.equal(drone.active,true);
  assert.equal(drone.body.visible,true);
  assert.ok(world.shootables.length>=6);
  assert.ok(world.shootables.every(mesh=>mesh.userData.drone.active));
  const restore=drone.concealForOwnCamera();
  assert.equal(drone.body.visible,false);
  restore();
  assert.equal(drone.body.visible,true);
  assert.equal(drone.health,35);
});
test("shots really destroy drone, consume limited inventory, reset restores both devices",()=>{
  const {drone}=makeDrone();
  drone.begin(1000);
  assert.equal(drone.remaining,1);
  assert.equal(drone.begin(1100),false,"cannot deploy a second drone while one is active");
  assert.equal(drone.damage(18,1200),false);
  assert.equal(drone.health,17);
  assert.equal(drone.damage(18,1300),true);
  assert.equal(drone.active,false);
  assert.equal(drone.destroyed,true);
  assert.equal(drone.body.visible,false);
  assert.equal(drone.begin(2000),true);
  assert.equal(drone.remaining,0);
  drone.end();
  assert.equal(drone.begin(2500),false,"cannot create infinite drones");
  drone.reset();
  assert.equal(drone.remaining,2);
  assert.equal(drone.destroyed,false);
});
test("defending AI detects visible hostile drone and damages it using actual line of sight",()=>{
  const {world,drone}=makeDrone();drone.begin(1000);
  const ray={set(){},intersectObjects:()=>[]};
  const advance=()=>0;
  const deterministicMath=Object.create(Math);
  deterministicMath.random=()=>0;
  const {engageEnemyDrone}=load("squad-ai.js",
    {advanceTacticalBot:advance,Math:deterministicMath},"{engageEnemyDrone}");
  const bot={id:2,team:"enemy",alive:true,x:0,z:-11,group:new Node(),nextShot:0,lastShotAt:0};
  const round={role:"attacker",THREE:T,ray,world};
  const events=[];
  assert.equal(engageEnemyDrone(round,bot,1000,(msg,sound)=>events.push({msg,sound})),true);
  assert.equal(drone.health,17);
  assert.equal(engageEnemyDrone(round,bot,1050),true,"shot cadence prevents instant machinegun damage");
  assert.equal(drone.health,17);
  assert.equal(engageEnemyDrone(round,bot,2000,(msg,sound)=>events.push({msg,sound})),true);
  assert.equal(drone.destroyed,true);
  assert.ok(events.some(e=>/DESTROYED/.test(e.msg||"")));
  assert.equal(engageEnemyDrone(round,bot,3000),false);
  ray.intersectObjects=()=>[{distance:1}];
  drone.reset();drone.begin(3200);
  assert.equal(engageEnemyDrone(round,bot,3800),false,"solid cover blocks detection");
  assert.equal(drone.health,35);
});
test("defenders patrol after completing their setup instead of freezing for 45 seconds",()=>{
  const movements=[];
  const advance=(bot,goal,world,dt,now)=>{
    bot.x+=(goal.x-bot.x)*Math.min(1,dt*2);
    bot.z+=(goal.z-bot.z)*Math.min(1,dt*2);
    movements.push({x:bot.x,z:bot.z});
    return 2;
  };
  const {updateDefenderPrep}=load("squad-ai.js",{advanceTacticalBot:advance},"{updateDefenderPrep}");
  const bot={id:5,alive:true,team:"enemy",operatorSpec:{id:"smoke",name:"SMOKE"},
    x:-6,z:-44,anchor:{x:-6,z:-44},assignedSite:{id:"A",x:-6,z:-44},
    setupTask:{kind:"sensor",placed:true,progress:1700},group:new Node(),animate(){}};
  const round={role:"attacker",phase:"prep",bots:[bot],allies:[],
    world:{colliders:[],panels:[],gadgets:{},barricades:{openings:[]}},
    sites:{A:bot.assignedSite}};
  const start={x:bot.x,z:bot.z};
  for(let i=0;i<22;i++)updateDefenderPrep(round,4000+i*100,0.1);
  assert.ok(movements.length>=12,"AI should continuously take patrol decisions");
  assert.ok(Math.hypot(bot.x-start.x,bot.z-start.z)>.7,"defender should visibly leave starting point");
});
