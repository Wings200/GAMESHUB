import test from "node:test";
import assert from "node:assert/strict";
import {WIRE,newWireState,wirePlacePosition,placeWire,damageWire,
 wireSlowsPlayer,wireTerrainMultiplier} from "./barbed-wire.js";
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
 assert.equal(wireTerrainMultiplier(s,at),WIRE.slowingMultiplier);
 assert.equal(wireTerrainMultiplier(s,{...at,y:.5}),1);
 assert.equal(wireTerrainMultiplier(s,{...at,z:10}),1);
 const fast=stepPlayer(at,{forward:1,speedMultiplier:1,terrainMultiplier:1},.05,[]);
 const slow=stepPlayer(at,{forward:1,speedMultiplier:1,terrainMultiplier:WIRE.slowingMultiplier},.05,[]);
 assert.ok(Math.abs(fast.z-at.z)>Math.abs(slow.z-at.z)*1.95);
 assert.ok(slow.speed<fast.speed);
});
test("3 actual rifle hits destroy physical wire, which immediately stops slowing",()=>{
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
 assert.equal(wireTerrainMultiplier(s,{...at,z:6.35}),1);
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
