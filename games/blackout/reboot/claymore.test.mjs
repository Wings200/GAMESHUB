import test from "node:test";
import assert from "node:assert/strict";
import {CLAYMORE,newClaymoreState,placeClaymore,canPlaceClaymore,
 claymorePosition,claymoreDirection,claymoreLaserEndpoints,
 claymoreSeesEnemy,tickClaymores,pickupClaymore,
 claymoreBlastDamage,claymoreBlastIsLethal} from "./claymore.js";
import {TEST_OBSTACLES} from "./physics.js";
const player={x:0,y:0,z:9,yaw:0,grounded:true};
const enemy={id:"sentry",x:0,y:0,z:5.25,side:"defend",alive:true};
const friend={...enemy,side:"attack"};
const planted=()=>placeClaymore(newClaymoreState(),player,[]);
const arm=state=>{
 let s=state;
 for(let i=0;i<15;i++)s=tickClaymores(s,.05,[],[]).state;
 return s;
};
test("claymores start with two charges and two visible armed devices can coexist",()=>{
 let state=newClaymoreState();
 assert.equal(state.charges,2);
 const first=placeClaymore(state,player,TEST_OBSTACLES);
 assert.ok(first.device,first.reason);
 assert.ok(Math.abs(first.device.z-(player.z-CLAYMORE.placeDistance))<1e-9);
 assert.equal(first.state.charges,1);
 const second=placeClaymore(first.state,{...player,x:2},TEST_OBSTACLES);
 assert.ok(second.device,second.reason);
 assert.equal(second.state.charges,0);
 assert.notEqual(first.device.id,second.device.id);
 assert.equal(second.state.devices.length,2);
 assert.equal(placeClaymore(second.state,{...player,x:4},[]).device,null);
});
test("ground and collision placement reject invalid, airborne, wall, double plant",()=>{
 const s=newClaymoreState();
 for(const p of [null,{...player,grounded:false},{...player,y:1},
  {...player,x:NaN},{...player,z:30},{...player,x:0,z:0}]){
  const result=placeClaymore(s,p,TEST_OBSTACLES);
  if(p?.z===0)continue;
  assert.equal(result.device,null);
  assert.equal(result.state,s);
 }
 const at=claymorePosition(player);
 const blocking={id:"block",x:at.x,z:at.z,width:.7,depth:.7,bottom:0,height:2};
 assert.equal(placeClaymore(s,player,[blocking]).device,null);
 assert.equal(canPlaceClaymore(s,player,[blocking]).ok,false);
 const one=planted();
 assert.equal(placeClaymore(one.state,player,[]).device,null);
});
test("three independent laser rays point forward, obstacle geometry shortens actual lasers",()=>{
 const d=planted().device;
 const endpoints=claymoreLaserEndpoints(d);
 assert.equal(endpoints.length,3);
 assert.ok(endpoints[1].z<d.z-3);
 assert.ok(endpoints[0].x>d.x);
 assert.ok(endpoints[2].x<d.x);
 const wall={x:d.x,z:d.z-1.0,width:6,depth:.25,bottom:0,height:2.7};
 const stopped=claymoreLaserEndpoints(d,[wall]);
 assert.ok(stopped.every((p,i)=>p.length<endpoints[i].length-.25));
 assert.ok(stopped.every(p=>p.length>=0));
});
test("attacker and unarmed lasers never trigger; Sentry and enemy dummy trigger when armed",()=>{
 const placed=planted();
 assert.equal(claymoreSeesEnemy(placed.device,enemy),false);
 assert.equal(tickClaymores(placed.state,.05,[enemy],[]).blasts.length,0);
 const armed=arm(placed.state);
 const active=armed.devices[0];
 assert.equal(claymoreSeesEnemy(active,friend),false);
 assert.equal(claymoreSeesEnemy(active,{...enemy,alive:false}),false);
 assert.equal(claymoreSeesEnemy(active,{...enemy,y:1.8}),false);
 assert.equal(claymoreSeesEnemy(active,enemy),true);
 const triggered=tickClaymores(armed,.05,[friend,enemy],[]);
 assert.equal(triggered.blasts.length,1);
 assert.equal(triggered.blasts[0].trigger,"sentry");
 assert.equal(triggered.state.devices.length,0);
 assert.equal(triggered.state.charges,1,"automatic detonation does not refund ammo");
 assert.equal(tickClaymores(triggered.state,.05,[enemy],[]).blasts.length,0);
});
test("defenders behind, outside range, or behind solid cover cannot trip lasers",()=>{
 const d=arm(planted().state).devices[0];
 for(const point of [
  {...enemy,z:d.z+1.0},
  {...enemy,z:d.z-4.0},
  {...enemy,x:d.x+4.0,z:d.z-1},
 ]){
  assert.equal(claymoreSeesEnemy(d,point),false);
 }
 const wall={id:"wall",x:d.x,z:d.z-1.0,width:6,depth:.4,bottom:0,height:2.7};
 assert.equal(claymoreSeesEnemy(d,enemy,[wall]),false);
 assert.equal(tickClaymores({charges:1,nextId:2,devices:[d]},.05,[enemy],[wall]).blasts.length,0);
});
test("enemy directly on side beams can trigger even if centerline is clear",()=>{
 const d=arm(planted().state).devices[0];
 const endpoint=claymoreLaserEndpoints(d)[0];
 const side={id:"defender-flank",x:d.x+(endpoint.x-d.x)*.6,
  y:0,z:d.z+(endpoint.z-d.z)*.6,side:"defend"};
 assert.equal(claymoreSeesEnemy(d,side),true);
});
test("directional blast hurts defenders and targets in front, never targets behind",()=>{
 const result=tickClaymores(arm(planted().state),.05,[enemy],[]);
 const blast=result.blasts[0];
 const ahead={x:blast.x,y:.6,z:blast.z-1.0};
 const behind={x:blast.x,y:.6,z:blast.z+1.0};
 const flank={x:blast.x+4.0,y:0,z:blast.z};
 assert.ok(claymoreBlastDamage(blast,ahead)>0);
 assert.equal(claymoreBlastDamage(blast,behind),0);
 assert.equal(claymoreBlastDamage(blast,flank),0);
 assert.equal(claymoreBlastIsLethal(blast,ahead),true);
 assert.equal(claymoreBlastIsLethal(blast,behind),false);
 const wall={x:blast.x,z:blast.z-.5,width:6,depth:.25,bottom:0,height:3};
 assert.equal(claymoreBlastDamage(blast,ahead,[wall]),0,"cover blocks a forward blast");
});
test("pickup with F restores inventory, removes correct mine, and works after rearming",()=>{
 const first=planted();
 const placed=arm(first.state);
 const picked=pickupClaymore(placed,first.device.id,player);
 assert.ok(picked.device);
 assert.equal(picked.state.devices.length,0);
 assert.equal(picked.state.charges,CLAYMORE.charges);
 const reused=placeClaymore(picked.state,player,[]);
 assert.ok(reused.device);
 assert.notEqual(reused.device.id,first.device.id);
 assert.equal(pickupClaymore(reused.state,first.device.id,player).device,null);
});
test("cannot pick up a mine from a distance, bad pose, or after detonation",()=>{
 const first=planted();
 for(const p of [null,{...player,x:10},{...player,z:0},{...player,y:NaN}]){
  const attempt=pickupClaymore(first.state,first.device.id,p);
  assert.equal(attempt.device,null);
  assert.equal(attempt.state,first.state);
 }
 const detonated=tickClaymores(arm(first.state),.05,[enemy],[]);
 assert.equal(pickupClaymore(detonated.state,first.device.id,player).device,null);
});
test("orientation follows player yaw, not a fixed global axis",()=>{
 const rotated=placeClaymore(newClaymoreState(),{...player,yaw:Math.PI/2},[]);
 assert.ok(rotated.device.x<player.x-1.5);
 const eastEnemy={id:"enemy",side:"defend",x:rotated.device.x-1,y:0,z:rotated.device.z};
 assert.equal(claymoreSeesEnemy(arm(rotated.state).devices[0],eastEnemy),true);
});
