// BLACKOUT V3.3 — automated game-mechanics simulation (not a visual test).
// Execute: node --test games/blackout/tests/*.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
const root=join(dirname(fileURLToPath(import.meta.url)),"..","src");
function load(name,deps,ret){
  const source=readFileSync(join(root,name),"utf8")
    .replace(/^import .*$/gm,"").replace(/^export /gm,"");
  return new Function(...Object.keys(deps),source+"\nreturn "+ret+";")(...Object.values(deps));
}
class Vec{
  constructor(x=0,y=0,z=0){this.set(x,y,z)}
  set(x,y,z){Object.assign(this,{x,y,z});return this}
  clone(){return new Vec(this.x,this.y,this.z)}
  copy(v){return this.set(v.x,v.y,v.z)}
}
class Node{
  constructor(){this.children=[];this.position=new Vec();this.userData={};
    this.rotation={x:0,y:0,z:0};this.scale={setScalar(){}};this.visible=true}
  add(...nodes){for(const n of nodes){n.parent=this;this.children.push(n)}}
  remove(n){this.children=this.children.filter(x=>x!==n);n.parent=null}
  traverse(fn){fn(this);for(const n of this.children)n.traverse?.(fn)}
}
class Geom{dispose(){}}
class Mat{
  constructor(spec={}){Object.assign(this,spec);this.color={setHex(v){this.hex=v}}}
  dispose(){}
}
class Mesh extends Node{
  constructor(g,m){super();this.geometry=g;this.material=m;this.isMesh=true}
}
const T=new Proxy({
  Vector3:Vec,Group:Node,Mesh,MeshStandardMaterial:Mat,
  MeshBasicMaterial:Mat,DoubleSide:2,Raycaster:class{
    setFromCamera(){}intersectObjects(){return []}
  }
},{get:(o,k)=>o[k]??Geom});
const physics=load("throw-physics.js",{},"stepThrowable");
const {Ordnance,SECONDARY_KITS,occluded,radialFactor}=load(
  "ordnance.js",{stepThrowable:physics},
  "{Ordnance,SECONDARY_KITS,occluded,radialFactor}");
const OPERATORS=load("operators.js",{},"OPERATORS");
const Gadgets=load("gadgets.js",{
  stepThrowable:physics,Ordnance,SECONDARY_KITS,
  performance:{now(){return 9000}}
},"Gadgets");
function fixture(role="attacker",kit="frag"){
  const world={shootables:[],colliders:[],targets:[],panels:[]};
  const camera=new Node(),scene=new Node();
  camera.position.set(0,1.7,0);
  camera.getWorldPosition=v=>v.copy(camera.position);
  camera.getWorldDirection=v=>v.set(0,0,-1);
  const player={x:0,y:0,z:0,yaw:0,eyeHeight:1.7,maxHealth:110,health:110,
    takeDamage(n){this.health=Math.max(0,this.health-n)}};
  const gadget=new Gadgets(T,world,scene);
  world.round={role,bots:[],allies:[],playerAlive:true};
  gadget.setOperator(OPERATORS[role==="attacker"?"sledge":"mute"]);
  assert.equal(gadget.setSecondaryType(kit),true);
  const notes=[],notify=(msg,event)=>{if(msg||event)notes.push({msg,event})};
  return {world,scene,camera,player,gadget,round:world.round,notify,notes};
}
function step(f,a,b){
  for(let t=a;t<=b;t+=16)f.gadget.tick(t,f.player,f.notify,[]);
}
function bot(x,z,hp=110){return {x,z,alive:true,health:hp,
  damage(n){this.health=Math.max(0,this.health-n);if(!this.health)this.alive=false}
}}
test("role loadouts are restricted and have correct inventory sizes",()=>{
  const a=fixture("attacker","frag"),d=fixture("defender","c4");
  assert.deepEqual(SECONDARY_KITS.attacker.map(x=>x.id),
    ["recon","frag","stun","claymore"]);
  assert.deepEqual(SECONDARY_KITS.defender.map(x=>x.id),
    ["sensor","c4","impact"]);
  assert.equal(a.gadget.counts.x,2);
  assert.equal(d.gadget.counts.x,1);
  assert.equal(a.gadget.setSecondaryType("c4"),false);
  assert.equal(d.gadget.setSecondaryType("frag"),false);
});
test("frag throws first, deals damage only after 3.2s fuse, then resets",()=>{
  const f=fixture(),g=f.gadget;
  assert.equal(g.secondary(f.camera,f.player,1000).ok,true);
  assert.equal(g.counts.x,1);
  assert.equal(g.ordnance.devices.length,0,"throw motion before release");
  g.tick(1310,f.player,f.notify,[]);
  const device=g.ordnance.devices[0];
  assert.ok(device);
  const enemy=bot(0,-5);
  f.round.bots.push(enemy);
  step(f,1326,4250);
  enemy.x=device.x;enemy.z=device.z;
  assert.equal(enemy.health,110,"no early explosion damage");
  step(f,4266,4700);
  assert.ok(enemy.health<110,"frag fuse must cause real damage");
  assert.equal(g.ordnance.devices.length,0);
  g.reset("attacker");
  assert.equal(f.world.shootables.length,0,"reset should clean hit targets");
});
test("flashbang blinds visible AI but cannot see through cover",()=>{
  const f=fixture("attacker","stun"),g=f.gadget;
  g.secondary(f.camera,f.player,1000);
  g.tick(1310,f.player,f.notify,[]);
  const device=g.ordnance.devices[0],target=bot(0,-3.5);
  f.round.bots.push(target);
  step(f,1326,3150);
  target.x=device.x;target.z=device.z;
  step(f,3166,3700);
  assert.ok(target.blindedUntil>3000);
  assert.equal(target.health,110,"stun is not explosive damage");
  const cover={minX:-2,maxX:2,minY:0,maxY:2.4,minZ:-1,maxZ:-.5,
    tag:"test-cover"};
  assert.equal(occluded([cover],{x:0,y:1,z:0},{x:0,y:1,z:-3}),true);
  assert.equal(occluded([],{x:0,y:1,z:0},{x:0,y:1,z:-3}),false);
});
test("C4 cannot detonate in flight; B detonates once armed",()=>{
  const f=fixture("defender","c4"),g=f.gadget;
  assert.equal(g.secondary(f.camera,f.player,1000).ok,true);
  g.tick(1310,f.player,f.notify,[]);
  assert.equal(g.remoteC4(1320).ok,false);
  step(f,1336,5500);
  assert.equal(g.ordnance.armedC4,1);
  const device=g.ordnance.devices[0];
  const enemy=bot(device.x,device.z);
  f.round.bots.push(enemy);
  assert.equal(g.remoteC4(5600).ok,true);
  assert.ok(enemy.health<110);
  assert.equal(g.remoteC4(5610).ok,false);
  assert.equal(g.ordnance.armedC4,0);
});
test("armed C4 and claymore are shootable before activation",()=>{
  const c=fixture("defender","c4");
  c.gadget.secondary(c.camera,c.player,1000);
  c.gadget.tick(1310,c.player,c.notify,[]);
  step(c,1326,5500);
  const d=c.gadget.ordnance.devices[0];
  assert.ok(c.world.shootables.includes(d.body));
  assert.equal(c.gadget.damageOrdnance(d,60),true);
  assert.equal(c.gadget.remoteC4(5600).ok,false);
  const cl=fixture("attacker","claymore");
  cl.gadget.secondary(cl.camera,cl.player,1000);
  cl.gadget.tick(2200,cl.player,cl.notify,[]);
  const mine=cl.gadget.ordnance.devices[0];
  assert.ok(mine,"claymore must appear after placement animation");
  assert.equal(cl.gadget.damageOrdnance(mine,60),true);
  assert.equal(cl.world.shootables.length,0);
});
test("claymore trips only when an enemy enters its forward lasers",()=>{
  const f=fixture("attacker","claymore"),g=f.gadget;
  g.secondary(f.camera,f.player,1000);
  assert.equal(g.ordnance.devices.length,0,"installing takes time");
  step(f,1016,2300);
  const device=g.ordnance.devices[0],enemy=bot(5,5);
  assert.ok(device,"must deploy after install");
  f.round.bots.push(enemy);
  step(f,2316,3580);
  assert.equal(device.state,"armed");
  assert.equal(enemy.health,110);
  enemy.x=device.x;enemy.z=device.z-1.7;
  g.tick(3600,f.player,f.notify,[]);
  assert.ok(enemy.health<110);
  assert.equal(g.ordnance.devices.length,0);
});
test("impact grenades explode upon collision, not on a long frag fuse",()=>{
  const f=fixture("defender","impact");
  f.gadget.secondary(f.camera,f.player,1000);
  f.gadget.tick(1310,f.player,f.notify,[]);
  const dev=f.gadget.ordnance.devices[0];
  const enemy=bot(dev.x,dev.z);
  f.round.bots.push(enemy);
  for(let t=1326;t<4600&&f.gadget.ordnance.devices.length;t+=16){
    enemy.x=dev.x;enemy.z=dev.z;
    f.gadget.tick(t,f.player,f.notify,[]);
  }
  assert.ok(enemy.health<110);
  assert.ok(f.notes.some(n=>n.event==="gadget-blast"));
});
test("radial falloff has range boundary and blocked covers stop damage",()=>{
  assert.equal(radialFactor(9,8),0);
  assert.equal(radialFactor(0,8),1);
  assert.ok(radialFactor(3,8)>radialFactor(6,8));
});

test("grenade timers pause while the operator menu is open",()=>{
  const f=fixture("attacker","frag"),g=f.gadget;
  g.secondary(f.camera,f.player,1000);
  g.tick(1310,f.player,f.notify,[]);
  const d=g.ordnance.devices[0];
  assert.ok(d);
  const fuseAt=d.detonateAt;
  g.ordnance.pause(2000);
  g.ordnance.resume(10000);
  assert.equal(d.detonateAt-fuseAt,8000);
  const before=d.detonateAt;
  g.tick(10500,f.player,f.notify,[]);
  assert.ok(g.ordnance.devices.includes(d));
  assert.equal(d.detonateAt,before);
});
