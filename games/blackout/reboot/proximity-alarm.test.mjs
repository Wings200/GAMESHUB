import test from "node:test";
import assert from "node:assert/strict";
import {TEST_OBSTACLES} from "./physics.js";
import {PROXIMITY,newProximityState,wallAlarmAim,canPlaceProximity,
 placeProximity,pickupProximity,damageProximity,liveProximity,
 alarmDetectsEnemy,tickProximity} from "./proximity-alarm.js";
const defender={x:0,y:0,z:8,yaw:0,pitch:0,grounded:true};
const striker={x:0,y:0,z:5,side:"attack",alive:true,id:"striker"};
const sentry={...striker,side:"defend"};
const place=(player=defender,obstacles=[])=>placeProximity(newProximityState(),player,obstacles);
function tickFor(state,duration,enemies=[],obstacles=[]){
 let cur=state,events=[];
 for(let i=0;i<Math.ceil(duration/.05);i++){
  const r=tickProximity(cur,.05,enemies,obstacles);
  cur=r.state;events.push(...r.alerts);
 }
 return {state:cur,events};
}
test("2 charges: two alarms can be deployed and stay independently recoverable",()=>{
 const p=place();
 assert.ok(p.device,p.reason);
 assert.equal(p.device.mount,"floor");
 assert.equal(p.state.charges,1);
 const other=placeProximity(p.state,{...defender,x:2},[]);
 assert.ok(other.device,other.reason);
 assert.equal(other.state.charges,0);
 assert.equal(liveProximity(other.state).length,2);
 assert.notEqual(other.device.id,p.device.id);
 assert.equal(placeProximity(other.state,{...defender,x:4},[]).device,null);
});
test("wall placement aims at actual solid vertical face, preserving outward offset",()=>{
 const player={...defender,x:-18,z:-5.1};
 const aim=wallAlarmAim(player,TEST_OBSTACLES);
 assert.ok(aim,"must ray-hit nearer wall-one front face");
 assert.equal(aim.mount,"wall");
 assert.equal(aim.surface,"wall-one");
 assert.ok(Math.abs(aim.y-1.65)<1e-9);
 assert.ok(aim.nz>.9,"facing the player from wall front");
 assert.ok(aim.z>-7.8);
 const p=place(player,TEST_OBSTACLES);
 assert.equal(p.device.mount,"wall");
 assert.equal(p.device.x,aim.x);
 assert.equal(p.device.z,aim.z);
 assert.ok(Math.abs(Math.abs(p.device.normalYaw)-Math.PI)<1e-9);
});
test("wall detection respects yaw and the nearest physical face, never places through cover",()=>{
 const p={...defender,x:15.7,z:-9,yaw:-Math.PI/2,pitch:0};
 const a=wallAlarmAim(p,TEST_OBSTACLES);
 assert.ok(a);
 assert.equal(a.mount,"wall");
 assert.equal(a.surface,"wall-two");
 assert.ok(a.nx<0);
 const blocked={...defender,x:-18,z:-5.1,pitch:1.42};
 assert.equal(wallAlarmAim(blocked,TEST_OBSTACLES),null);
});
test("floor placement blocked when floor occupied or outside bounds and player airborne",()=>{
 const s=newProximityState();
 const p={...defender,z:0};
 const target={x:0,z:-1.45,width:1,depth:1,height:2};
 assert.equal(canPlaceProximity(s,p,[target]).ok,false);
 for(const bad of [null,{...defender,grounded:false},{...defender,y:1},
  {...defender,x:NaN},{...defender,z:-29}]){
  const out=placeProximity(s,bad,[]);
  assert.equal(out.device,null);
  assert.equal(out.state,s);
 }
 const first=place().state;
 assert.equal(placeProximity(first,defender,[]).device,null);
});
test("attacker in 4.35m radius triggers; defender never triggers; enemies behind walls hidden",()=>{
 const d=place().device;
 assert.equal(alarmDetectsEnemy(d,striker,[]),true);
 assert.equal(alarmDetectsEnemy(d,sentry,[]),false);
 assert.equal(alarmDetectsEnemy(d,{...striker,alive:false},[]),false);
 assert.equal(alarmDetectsEnemy(d,{...striker,z:-10},[]),false);
 const barrier={id:"test-cover",x:0,z:5.8,width:4,depth:.4,height:2.7};
 assert.equal(alarmDetectsEnemy(d,striker,[barrier]),false);
 assert.equal(alarmDetectsEnemy(d,striker,[]),true);
});
test("wall-mounted device detects enemies on its outside face, not through its supporting wall",()=>{
 const mounted=place({...defender,x:-18,z:-5.1},TEST_OBSTACLES);
 const d=mounted.device;
 assert.equal(alarmDetectsEnemy(d,{...striker,x:-18,z:-5.8},TEST_OBSTACLES),true);
 assert.equal(alarmDetectsEnemy(d,{...striker,x:-18,z:-8.7},TEST_OBSTACLES),false);
});
test("beep beep BEEP! one alert on entry and recurring after cooldown; can rearm on exit",()=>{
 const p=place();
 let r=tickProximity(p.state,.05,[sentry],[]);
 assert.equal(r.alerts.length,0);
 r=tickProximity(r.state,.05,[striker],[]);
 assert.equal(r.alerts.length,1);
 assert.equal(r.alerts[0].sound,"proximity");
 assert.equal(r.alerts[0].enemyId,"striker");
 const silent=tickFor(r.state,1,[striker]);
 assert.equal(silent.events.length,0);
 const repeat=tickFor(silent.state,2.35,[striker]);
 assert.equal(repeat.events.length,1);
 const left=tickProximity(repeat.state,.05,[],[]);
 assert.equal(left.state.devices[0].triggered,false);
 assert.equal(left.state.devices[0].cooldown,0);
 const newEntry=tickProximity(left.state,.05,[striker],[]);
 assert.equal(newEntry.alerts.length,1);
});
test("two nearby alarms trigger individually, preserving spatial positions",()=>{
 const first=place();
 const pair=placeProximity(first.state,{...defender,x:2},[]);
 const result=tickProximity(pair.state,.05,[{...striker,x:1}],[]);
 assert.equal(result.alerts.length,2);
 assert.notEqual(result.alerts[0].id,result.alerts[1].id);
 assert.equal(result.alerts[0].z,first.device.z);
});
test("F returns one charge from any live unit, never refunds destroyed gadgets",()=>{
 const a=place();
 const recovered=pickupProximity(a.state,a.device.id,defender);
 assert.ok(recovered.device,recovered.reason);
 assert.equal(recovered.state.charges,2);
 assert.equal(recovered.state.devices.length,0);
 const again=placeProximity(recovered.state,defender,[]);
 assert.ok(again.device);
 assert.notEqual(again.device.id,a.device.id);
 assert.equal(pickupProximity(again.state,a.device.id,defender).device,null);
 const broken=damageProximity(a.state,a.device.id,2);
 assert.equal(broken.destroyed,true);
 assert.equal(pickupProximity(broken.state,a.device.id,defender).device,null);
});
test("pickup rejects walls? distance/invalid data; 2 bullets or 1 V melee destroy",()=>{
 const p=place();
 for(const location of [null,{...defender,x:20},{...defender,z:-10},{...defender,y:NaN}]){
  const r=pickupProximity(p.state,p.device.id,location);
  assert.equal(r.device,null);
  assert.equal(r.state,p.state);
 }
 const hit=damageProximity(p.state,p.device.id,1);
 assert.equal(hit.handled,true);assert.equal(hit.destroyed,false);
 assert.equal(hit.hp,1);
 const gone=damageProximity(hit.state,p.device.id,1);
 assert.equal(gone.destroyed,true);
 assert.equal(liveProximity(gone.state).length,0);
 assert.equal(damageProximity(gone.state,p.device.id,1).handled,false);
 assert.equal(damageProximity(p.state,p.device.id,2).destroyed,true);
 for(const invalid of [0,-1,NaN,Infinity])
  assert.equal(damageProximity(p.state,p.device.id,invalid).handled,false);
});
test("no ghost sounds when no time elapses, device dies or data malformed",()=>{
 const state=place().state;
 assert.equal(tickProximity(state,0,[striker],[]).alerts.length,0);
 assert.equal(tickProximity(state,NaN,[striker],[]).alerts.length,0);
 const gone=damageProximity(state,1,2).state;
 assert.equal(tickProximity(gone,.05,[striker],[]).alerts.length,0);
 assert.equal(tickProximity(state,.05,[{x:NaN,y:0,z:5,side:"attack"}],[]).alerts.length,0);
});
