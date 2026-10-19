// BLACKOUT mechanics stage 2: Smoke remote gas + chambered ammunition.
// Run: node --test games/blackout/tests/*.test.mjs
// Behavioral simulations only, not a live browser/visual test.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
const dir=join(dirname(fileURLToPath(import.meta.url)),"..","src");
const load=(file,deps,expr)=>{
  const source=readFileSync(join(dir,file),"utf8")
    .replace(/^import .*$/gm,"").replace(/^export /gm,"");
  return new Function(...Object.keys(deps),source+";return "+expr+";")(...Object.values(deps));
};
class Vec{
  constructor(x=0,y=0,z=0){this.set(x,y,z)}
  set(x,y,z){Object.assign(this,{x,y,z});return this}
  clone(){return new Vec(this.x,this.y,this.z)}
  copy(v){return this.set(v.x,v.y,v.z)}
}
class Node{
  constructor(){this.children=[];this.position=new Vec();this.userData={};
    this.rotation={x:0,y:0,z:0};this.scale={setScalar(){}};this.visible=true}
  add(...items){for(const item of items){this.children.push(item);item.parent=this}}
  remove(item){this.children=this.children.filter(x=>x!==item);item.parent=null}
  traverse(fn){fn(this);for(const item of this.children)item.traverse?.(fn)}
}
class Geometry{dispose(){}}
class Material{
  constructor(options={}){Object.assign(this,options);
    this.color={setHex(v){this.hex=v}}}
  dispose(){}
}
class Mesh extends Node{constructor(g,m){super();this.geometry=g;this.material=m;this.isMesh=true}}
const T=new Proxy({
  Group:Node,Mesh,Vector3:Vec,MeshStandardMaterial:Material,
  MeshBasicMaterial:Material,
  Raycaster:class{setFromCamera(){}intersectObjects(){return []}},
  DoubleSide:2
},{get:(o,k)=>o[k]??Geometry});
const step=load("throw-physics.js",{},"stepThrowable");
const Ops=load("operators.js",{},"OPERATORS");
const Gadgets=load("gadgets.js",{stepThrowable:step,
  performance:{now(){return 9000}}},"Gadgets");
const Weapons=load("weapons.js",{},"Weapons");
function create(){
  const world={targets:[],colliders:[],panels:[],shootables:[]};
  const scene=new Node(),camera=new Node();
  camera.position.set(0,1.73,0);
  camera.getWorldPosition=out=>out.copy(camera.position);
  camera.getWorldDirection=out=>out.set(0,-.04,-1);
  const player={x:0,z:0,y:0,yaw:0,pitch:0,eyeHeight:1.73,
    maxHealth:110,health:110};
  const round={role:"defender",allies:[],bots:[],playerAlive:true};
  world.round=round;
  const gadget=new Gadgets(T,world,scene);
  gadget.setOperator(Ops.smoke);
  const messages=[],notice=(message,event)=>{
    if(message)messages.push({message,event});
  };
  return {world,scene,camera,player,round,gadget,notice,messages};
}
function simulate(gadget,player,notice,from,to){
  for(let time=from;time<=to;time+=16)
    gadget.tick(time,player,notice,[]);
}
test("throw animation releases a physical canister without early gas",()=>{
  const {camera,player,gadget,notice}=create();
  assert.equal(gadget.main(camera,player,1000).ok,true);
  assert.equal(gadget.specialCount,2);
  gadget.tick(1250,player,notice,[]);
  assert.equal(gadget.smokeCanisters.length,0);
  assert.equal(gadget.detonateSmoke(1270).ok,false);
  gadget.tick(1450,player,notice,[]);
  assert.equal(gadget.smokeStatus.flying,1);
  assert.equal(gadget.gasFields.length,0);
  assert.equal(gadget.specialFx.length,0,
    "Throw must not create an explosion at the player's hand");
  simulate(gadget,player,notice,1466,5500);
  assert.equal(gadget.smokeStatus.armed,1);
  assert.ok(gadget.smokeCanisters[0].resting);
  assert.ok(gadget.smokeCanisters[0].z<-2,
    "Canister must actually travel ahead of the operator");
  assert.equal(gadget.gasFields.length,0);
});
test("B detonates only landed devices and activates timed damage cloud",()=>{
  const {camera,player,round,gadget,notice}=create();
  gadget.main(camera,player,1000);
  gadget.tick(1450,player,notice,[]);
  simulate(gadget,player,notice,1466,5500);
  const d=gadget.smokeCanisters[0];
  const enemy={x:d.x,z:d.z,alive:true,health:100,
    damage(amount){this.health-=amount}};
  round.bots.push(enemy);
  assert.equal(gadget.detonateSmoke(5600).ok,true);
  assert.equal(gadget.gasFields.length,1);
  gadget.tick(6100,player,notice,[enemy]);
  assert.ok(enemy.health<100,"Gas should hurt attackers only after B");
  assert.equal(gadget.detonateSmoke(6150).ok,false,
    "Same armed canister must not detonate twice");
  gadget.tick(16050,player,notice,[enemy]);
  assert.equal(gadget.gasFields.length,0);
  assert.equal(gadget.smokeCanisters.length,0);
  assert.equal(gadget.world.shootables.length,0);
});
test("canisters can be destroyed before detonation and cleaned on reset",()=>{
  const {camera,player,gadget,notice,world}=create();
  gadget.main(camera,player,1000);
  gadget.tick(1450,player,notice,[]);
  simulate(gadget,player,notice,1466,5500);
  const d=gadget.smokeCanisters[0];
  assert.ok(world.shootables.includes(d.body));
  assert.equal(gadget.damageSmokeCanister(d,30),true);
  assert.equal(gadget.detonateSmoke(5700).ok,false);
  assert.ok(!world.shootables.includes(d.body));
  gadget.reset("defender");
  assert.equal(gadget.smokeCanisters.length,0);
  assert.equal(gadget.gasFields.length,0);
  assert.equal(gadget.specialCount,3);
});
test("projectiles collide with walls rather than passing through them",()=>{
  const p={x:0,y:1,z:0,vx:0,vy:0,vz:-18,bounces:0,resting:false};
  const wall=[{minX:-2,maxX:2,minZ:-2.2,maxZ:-2.0,minY:0,maxY:3,
    tag:"test-door-frame"}];
  for(let i=0;i<15;i++)step(p,wall,.025);
  assert.ok(p.z>=-1.88,
    "Projectile must stay on the near side of the frame: "+p.z);
  assert.ok(p.bounces>0);
});
test("tactical reload retains chamber, empty reload is slower",()=>{
  const gun=new Weapons(),primary=gun.current;
  assert.equal(primary.ammo,31);
  assert.equal(gun.tryFire(100,false).ok,true);
  assert.equal(primary.ammo,30);
  assert.equal(gun.reload(1000),true);
  assert.equal(primary.reloadType,"tactical");
  const tacticalTime=primary.reloadDurationMs;
  gun.tick(1000+tacticalTime+1);
  assert.equal(primary.ammo,31);
  assert.equal(primary.remaining,119);
  let when=4000;
  while(primary.ammo>0){gun.tryFire(when,false);when+=150;}
  assert.equal(primary.ammo,0);
  assert.equal(gun.reload(20000),true);
  assert.equal(primary.reloadType,"empty");
  assert.ok(primary.reloadDurationMs>tacticalTime);
  gun.tick(20000+primary.reloadDurationMs+1);
  assert.equal(primary.ammo,30);
  gun.equip("secondary");
  assert.equal(gun.current.ammo,16);
  gun.reset();
  assert.equal(gun.guns.primary.ammo,31);
});
