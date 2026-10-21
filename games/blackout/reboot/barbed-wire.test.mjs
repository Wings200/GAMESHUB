import test from "node:test";
import assert from "node:assert/strict";
import {WIRE,newWireState,wirePlacePosition,placeWire,damageWire,
 wireSlowsPlayer,wireTerrainMultiplier,newWireHealth,tickWireHealth,enemyInWire} from "./barbed-wire.js";
import {initialPlayer,TEST_OBSTACLES,stepPlayer} from "./physics.js";

const start=()=>({...initialPlayer(),x:0,z:8,yaw:0});
test("Sentry placement is physical, in front of player, finite, with exactly two charges",()=>{
 let s=newWireState();
 const p=start();
 assert.equal(s.charges,2);assert.deepEqual(wirePlacePosition(p),{x:0,z:6.35,yaw:0});
 const first=placeWire(s,p,TEST_OBSTACLES);
 assert.equal(first.reason,"BARBED WIRE DEPLOYED");
 assert.equal(first.device.id,1);assert.equal(first.state.charges,1);
 assert.equal(first.state.devices[0].hp,WIRE.hp);
 assert.deepEqual(s.devices,[],"pure state is immutable");
 s=first.state;
 assert.match(placeWire(s,p,TEST_OBSTACLES).reason,/TOO CLOSE/);
 const second=placeWire(s,{...p,x:4},TEST_OBSTACLES);
 assert.ok(second.device);assert.equal(second.state.charges,0);
 assert.equal(second.state.devices.length,2);
 assert.match(placeWire(second.state,{...p,x:8},TEST_OBSTACLES).reason,/NO BARBED WIRE/);
});
test("placement refuses walls, map boundary, airborne player and invalid coordinates without consuming",()=>{
 const s=newWireState(),p=start();
 const bad=[
  {...p,x:-12,z:-5,yaw:0}, // blocked near solid box-one
  {...p,z:-29.6,yaw:0},
  {...p,y:1,grounded:false},
  {...p,x:Infinity},
 ];
 for(const player of bad){
  const r=placeWire(s,player,TEST_OBSTACLES);
  assert.equal(r.device,null);
  assert.equal(r.state,s);
 }
});
test("physical wire slows grounded player and all stances, never player above coils",()=>{
 let s=newWireState();
 s=placeWire(s,start()).state;
 const at={...start(),z:6.35};
 assert.equal(wireSlowsPlayer(s,at),true);
 assert.equal(wireTerrainMultiplier(s,at,"attack"),WIRE.slowingMultiplier);
 assert.equal(wireTerrainMultiplier(s,{...at,y:.5},"attack"),1);
 assert.equal(wireTerrainMultiplier(s,{...at,z:10},"attack"),1);
 const fast=stepPlayer(at,{forward:1,speedMultiplier:1,terrainMultiplier:1},.05,[]);
 const slow=stepPlayer(at,{forward:1,speedMultiplier:1,terrainMultiplier:WIRE.slowingMultiplier},.05,[]);
 assert.ok(Math.abs(fast.z-at.z)>Math.abs(slow.z-at.z)*1.95);
 assert.ok(slow.speed<fast.speed);
});
test("pure melee damage reduces physical wire HP and clears the slowdown after destruction",()=>{
 const at=start(),before=placeWire(newWireState(),at,[]);
 const id=before.device.id;
 let s=before.state;
 for(let i=0;i<WIRE.hp;i++){
  const hit=damageWire(s,id);
  assert.equal(hit.handled,true);
  assert.equal(hit.destroyed,i===WIRE.hp-1);
  s=hit.state;
 }
 assert.equal(s.devices[0].hp,0);
 assert.equal(wireTerrainMultiplier(s,{...at,z:6.35},"attack"),1);
 assert.equal(damageWire(s,id).handled,false);
 assert.equal(damageWire(s,999).handled,false);
 assert.equal(s.charges,1,"destroying deployed wire cannot duplicate carried charges");
});
test("wire damage checks and placement are not available through misleading zero damage",()=>{
 const s=placeWire(newWireState(),start(),[]).state;
 for(const damage of [0,-1,NaN,Infinity]){
  assert.equal(damageWire(s,1,damage).handled,false);
 }
 assert.equal(damageWire(s,1,1).remainingHP,2);
});

test("V melee damage in exactly two hits removes enemy wire",()=>{
 const p=start(),placed=placeWire(newWireState(),p,[]);
 let s=placed.state;
 const a=damageWire(s,placed.device.id,2);
 assert.equal(a.handled,true);
 assert.equal(a.destroyed,false);
 assert.equal(a.remainingHP,1);
 assert.equal(wireTerrainMultiplier(a.state,{...p,z:6.35},"attack"),WIRE.slowingMultiplier);
 const b=damageWire(a.state,placed.device.id,2);
 assert.equal(b.handled,true);
 assert.equal(b.destroyed,true);
 assert.equal(b.remainingHP,0);
 assert.equal(wireTerrainMultiplier(b.state,{...p,z:6.35},"attack"),1);
 assert.equal(b.state.charges,1);
 assert.equal(damageWire(b.state,placed.device.id,2).handled,false);
 // Actual gunfire never invokes damageWire; the firearm path is locked
 // down separately by foundation source and integration regressions.
});

test("friendly Sentry cannot be slowed or damaged by own wire; Striker can",()=>{
 const p=start(),state=placeWire(newWireState(),p,[]).state;
 const contact={...p,z:6.35};
 assert.equal(enemyInWire(state,contact,"attack"),true);
 assert.equal(enemyInWire(state,contact,"defend"),false);
 assert.equal(wireTerrainMultiplier(state,contact,"attack"),WIRE.slowingMultiplier);
 assert.equal(wireTerrainMultiplier(state,contact,"defend"),1);
 assert.equal(wireTerrainMultiplier(state,{...contact,y:.5},"attack"),1);
 for(let i=0;i<100;i++){
  const r=tickWireHealth({hp:125,elapsed:0},state,contact,"defend",.05);
  assert.equal(r.hp,125);assert.equal(r.damage,0);assert.equal(r.elapsed,0);
 }
});
test("enemy wire damages 10 HP every COMPLETE half-second, not per frame",()=>{
 const p=start(),state=placeWire(newWireState(),p,[]).state;
 const contact={...p,z:6.35};
 let health=newWireHealth();
 assert.deepEqual(health,{hp:125,elapsed:0});
 for(let i=0;i<9;i++){
  health=tickWireHealth(health,state,contact,"attack",.05);
  assert.equal(health.hp,125);
 }
 health=tickWireHealth(health,state,contact,"attack",.05);
 assert.deepEqual(health,{hp:115,elapsed:0,damage:10});
 for(let i=0;i<10;i++)health=tickWireHealth(health,state,contact,"attack",.05);
 assert.equal(health.hp,105);
 assert.equal(health.damage,10);
 assert.deepEqual(tickWireHealth(health,state,contact,"defend",.5),
  {hp:105,elapsed:0,damage:0});
});
test("leaving wire resets contact timer and pausing/side switching cannot bank damage",()=>{
 const p=start(),state=placeWire(newWireState(),p,[]).state;
 const at={...p,z:6.35},away={...p,z:10};
 let h=tickWireHealth(newWireHealth(),state,at,"attack",.4);
 assert.equal(h.hp,125);assert.ok(h.elapsed>.39);
 h=tickWireHealth(h,state,away,"attack",.7);
 assert.deepEqual(h,{hp:125,elapsed:0,damage:0});
 h=tickWireHealth(h,state,at,"attack",.1);
 assert.equal(h.hp,125);
 h=tickWireHealth(h,state,at,"defend",.4);
 assert.equal(h.hp,125);assert.equal(h.elapsed,0);
 h=tickWireHealth(h,state,at,"attack",1.2);
 assert.equal(h.hp,105);assert.equal(h.damage,20);assert.ok(Math.abs(h.elapsed-.2)<1e-8);
});
test("damage clamps at 0, blocks additional damage, and destroyed wire stops hurting",()=>{
 const p=start(),placed=placeWire(newWireState(),p,[]);
 const at={...p,z:6.35};
 let h=tickWireHealth({hp:15,elapsed:0},placed.state,at,"attack",1);
 assert.equal(h.hp,0);assert.equal(h.damage,15);
 h=tickWireHealth(h,placed.state,at,"attack",1);
 assert.equal(h.hp,0);assert.equal(h.damage,0);
 const broken=damageWire(damageWire(placed.state,1,2).state,1,2).state;
 assert.equal(tickWireHealth(newWireHealth(),broken,at,"attack",2).hp,125);
 assert.equal(wireTerrainMultiplier(broken,at,"attack"),1);
});
