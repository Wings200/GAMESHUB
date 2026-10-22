import test from "node:test";
import assert from "node:assert/strict";
import {TEST_OBSTACLES} from "./physics.js";
import {OBS_BLOCKER,newObservationBlockerState,blockerPosition,projectorCurtain,
 canPlaceObservationBlocker,placeObservationBlocker,pickupObservationBlocker,
 damageObservationBlocker,blockerScreenVisible,activeObservationBlockers}
 from "./observation-blocker.js";
const defender={x:0,y:0,z:8,yaw:0,grounded:true};
const first=()=>placeObservationBlocker(newObservationBlockerState(),defender,[]);
test("two ground projector charges, correct orientation and independent IDs",()=>{
 let s=newObservationBlockerState();
 assert.equal(s.charges,2);
 const a=placeObservationBlocker(s,defender,TEST_OBSTACLES);
 assert.ok(a.device,a.reason);
 assert.equal(a.state.charges,1);
 assert.equal(a.device.hp,2);
 assert.ok(Math.abs(a.device.z-(defender.z-OBS_BLOCKER.placeDistance))<1e-9);
 const b=placeObservationBlocker(a.state,{...defender,x:3},TEST_OBSTACLES);
 assert.ok(b.device,b.reason);
 assert.notEqual(a.device.id,b.device.id);
 assert.equal(b.state.charges,0);
 assert.equal(activeObservationBlockers(b.state).length,2);
 assert.equal(placeObservationBlocker(b.state,{...defender,x:6},[]).device,null);
});
test("must stand on clear ground, cannot place through a wall or beyond map edge",()=>{
 const state=newObservationBlockerState();
 for(const p of [null,{...defender,grounded:false},
  {...defender,y:1.2},{...defender,z:-29},{...defender,x:NaN}]){
  const result=placeObservationBlocker(state,p,[]);
  assert.equal(result.device,null);
  assert.equal(result.state,state);
 }
 const position=blockerPosition(defender);
 const wall={id:"wall",x:position.x,z:position.z-.3,
  width:3,depth:.35,bottom:0,height:2};
 assert.equal(canPlaceObservationBlocker(state,defender,[wall]).ok,false);
 const a=first();
 assert.equal(placeObservationBlocker(a.state,defender,[]).device,null);
});
test("projected screen has correct real-world width, height and yaw; can move around",()=>{
 const d=first().device;
 const screen=projectorCurtain(d);
 assert.equal(screen.width,OBS_BLOCKER.screenWidth);
 assert.equal(screen.top-screen.bottom,OBS_BLOCKER.screenHeight);
 assert.ok(screen.z<d.z);
 assert.equal(screen.yaw,d.yaw);
 const rotated=blockerPosition({...defender,yaw:Math.PI/2});
 const other=projectorCurtain(rotated);
 assert.ok(other.x<rotated.x);
 assert.ok(Math.abs(other.z-rotated.z)<1e-9);
});
test("only attacker drone cameras see an opaque observation-blocking field",()=>{
 const d=first().device;
 assert.equal(blockerScreenVisible(d,"drone"),true);
 for(const mode of ["player","menu","spectator",null]){
  assert.equal(blockerScreenVisible(d,mode),false);
 }
 assert.equal(blockerScreenVisible({...d,hp:0},"drone"),false);
 assert.equal(blockerScreenVisible(null,"drone"),false);
});
test("F recovery refunds one unit, removes its live field and permits redeployment",()=>{
 const p=first();
 const picked=pickupObservationBlocker(p.state,p.device.id,defender);
 assert.ok(picked.device);
 assert.equal(picked.state.charges,2);
 assert.equal(picked.state.devices.length,0);
 assert.equal(activeObservationBlockers(picked.state).length,0);
 const again=placeObservationBlocker(picked.state,defender,[]);
 assert.ok(again.device);
 assert.notEqual(again.device.id,p.device.id);
 assert.equal(again.state.charges,1);
 assert.equal(pickupObservationBlocker(again.state,p.device.id,defender).device,null);
});
test("F recovery fails if distant, malformed position, or gadget destroyed",()=>{
 const p=first();
 for(const player of [null,{...defender,x:12},
  {...defender,y:NaN},{...defender,z:12}]){
  const res=pickupObservationBlocker(p.state,p.device.id,player);
  assert.equal(res.device,null);
  assert.equal(res.state,p.state);
 }
 const destroyed=damageObservationBlocker(p.state,p.device.id,2).state;
 assert.equal(pickupObservationBlocker(destroyed,p.device.id,defender).device,null);
});
test("projector hardware takes two shots or one melee to disable camera curtain",()=>{
 const p=first();
 const once=damageObservationBlocker(p.state,p.device.id,1);
 assert.equal(once.handled,true);
 assert.equal(once.destroyed,false);
 assert.equal(once.remainingHP,1);
 assert.equal(blockerScreenVisible(once.state.devices[0],"drone"),true);
 const twice=damageObservationBlocker(once.state,p.device.id,1);
 assert.equal(twice.handled,true);
 assert.equal(twice.destroyed,true);
 assert.equal(twice.state.charges,1,"shooting must not refund inventory");
 assert.equal(activeObservationBlockers(twice.state).length,0);
 assert.equal(blockerScreenVisible(twice.state.devices[0],"drone"),false);
 assert.equal(damageObservationBlocker(twice.state,p.device.id,1).handled,false);
 const melee=damageObservationBlocker(p.state,p.device.id,2);
 assert.equal(melee.destroyed,true);
});
test("damage and placement reject invalid or nonpositive hits",()=>{
 const s=first().state;
 for(const x of [0,-1,NaN,Infinity]){
  const result=damageObservationBlocker(s,1,x);
  assert.equal(result.state,s);
  assert.equal(result.handled,false);
 }
 assert.equal(damageObservationBlocker(s,999,1).handled,false);
});
