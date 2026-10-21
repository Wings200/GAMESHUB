import test from "node:test";
import assert from "node:assert/strict";
import {SOFT_WALL,newSoftWall,softWallWorld,softWallRemove,softWallBlockers} from "./soft-wall.js";
import {REINFORCEMENT,newReinforcement,stepReinforcement,hardBreachReinforcement,
 reinforcementBlockers,reinforcementStatus} from "./reinforcement.js";
import {TEST_OBSTACLES,canOccupy} from "./physics.js";
import {HARD_BREACH,newHardBreachState,placeHardBreach,tickHardBreach,
 armHardBreach,pickupHardBreach} from "./hard-breach.js";

const player={x:SOFT_WALL.x,y:0,z:SOFT_WALL.z+2.2,yaw:0,pitch:0};
const installMetal=()=>{
 let state=newReinforcement();
 for(let i=0;i<60;i++)state=stepReinforcement(state,{player,holding:true,dt:.05}).state;
 assert.equal(state.installed,true);return state;
};
const context=(steel=installMetal())=>({reinforcementState:steel,softState:newSoftWall()});
const plant=(steel=installMetal())=>{
 const p=placeHardBreach(newHardBreachState(),player,context(steel));
 assert.ok(p.device,p.reason);return p;
};
const stepFor=(state,seconds)=>{let out={state,blasts:[]};for(let t=0;t<Math.round(seconds/.05);t++)out=tickHardBreach(out.state,.05);return out;};
test("hard breach has 2 units, mounts onto reinforced steel, but rejects bad aim/range",()=>{
 const p=plant();
 assert.equal(p.state.charges,1);
 assert.equal(p.device.onSteel,true);
 assert.equal(p.device.side,1);
 assert.equal(p.device.installed,false);
 const original=newHardBreachState();
 for(const bad of [{...player,z:9},{...player,yaw:Math.PI},{...player,pitch:NaN}]){
  const res=placeHardBreach(original,bad,context());
  assert.equal(res.device,null);
  assert.equal(res.state,original);
 }
 assert.equal(placeHardBreach({...original,charges:0},player,context()).device,null);
 assert.equal(placeHardBreach(p.state,player,context()).device,null,"can't plant second while one active");
});
test("electrified reinforcement refuses hard breach without wasting charges",()=>{
 const steel={...installMetal(),electrified:true};
 const state=newHardBreachState();
 const result=placeHardBreach(state,player,context(steel));
 assert.equal(result.device,null);
 assert.equal(result.state,state);
 assert.match(result.reason,/ELECTRIFIED/);
});
test("hard breach can also mount on intact unreinforced gypsum, never on empty tiles",()=>{
 const c=context(newReinforcement());
 const p=placeHardBreach(newHardBreachState(),player,c);
 assert.ok(p.device,p.reason);
 assert.equal(p.device.onSteel,false);
 assert.equal(placeHardBreach(newHardBreachState(),player,{
  ...c,softState:{...c.softState,solid:Array(c.softState.solid.length).fill(0)}
 }).device,null);
});
test("requires longer 1.45s install and 1.1s remote countdown; one explosion",()=>{
 let state=plant().state;
 assert.equal(armHardBreach(state).ok,false);
 state=stepFor(state,1.4).state;
 assert.equal(state.devices[0].installed,false);
 assert.equal(armHardBreach(state).ok,false);
 state=tickHardBreach(state,.05).state;
 assert.equal(state.devices[0].installed,true);
 const armed=armHardBreach(state);
 assert.equal(armed.ok,true);
 assert.equal(armHardBreach(armed.state).ok,false);
 const active=stepFor(armed.state,1.05);
 assert.equal(active.blasts.length,0);
 const done=tickHardBreach(active.state,.05);
 assert.equal(done.blasts.length,1);
 assert.equal(done.blasts[0].radius,HARD_BREACH.radius);
 assert.equal(done.blasts[0].onSteel,true);
 assert.equal(done.state.devices.length,0);
 assert.equal(tickHardBreach(done.state,.05).blasts.length,0);
});
test("F pickup refunds undetonated unit, removes mounted device, permits reuse",()=>{
 const one=plant(),placed=stepFor(one.state,1.45).state;
 const picked=pickupHardBreach(placed,one.device.id,player);
 assert.ok(picked.device);
 assert.equal(picked.state.charges,2);
 assert.equal(picked.state.devices.length,0);
 const again=placeHardBreach(picked.state,player,context());
 assert.ok(again.device);
 assert.notEqual(again.device.id,one.device.id);
 assert.equal(again.state.charges,1);
 assert.equal(pickupHardBreach(again.state,one.device.id,player).device,null);
});
test("pickup cannot occur at distance or through malformed player state; countdown remains refundable",()=>{
 const one=plant(),placed=stepFor(one.state,1.45).state;
 const arming=armHardBreach(placed).state;
 assert.equal(pickupHardBreach(arming,one.device.id,player).state.charges,2);
 for(const bad of [null,{...player,x:SOFT_WALL.x+10},{...player,y:NaN}]){
  const p=pickupHardBreach(placed,one.device.id,bad);
  assert.equal(p.device,null);
  assert.equal(p.state,placed);
 }
});
test("reinforced metal gets a true large opening with 3 remaining steel collision pieces",()=>{
 const original=installMetal();
 const blast={x:SOFT_WALL.x,y:1.3,z:SOFT_WALL.z};
 const result=hardBreachReinforcement(original,blast);
 assert.equal(result.opened,true);
 assert.equal(result.state.installed,true);
 assert.equal(reinforcementStatus(result.state),"BREACHED");
 const strips=reinforcementBlockers(result.state);
 assert.equal(strips.length,3);
 assert.ok(strips.some(p=>p.id.endsWith("-left")));
 assert.ok(strips.some(p=>p.id.endsWith("-right")));
 assert.ok(strips.some(p=>p.id.endsWith("-lintel")));
 assert.ok(strips.every(p=>p.height-p.bottom>0&&p.width>0));
 assert.equal(canOccupy(SOFT_WALL.x,0,SOFT_WALL.z,1.78,
  [...TEST_OBSTACLES,...strips]),true);
 assert.equal(canOccupy(SOFT_WALL.x+1.6,0,SOFT_WALL.z,1.78,
  [...TEST_OBSTACLES,...strips]),false);
 assert.equal(hardBreachReinforcement(result.state,blast).opened,false);
});
test("hard breach clears real gypsum behind steel all the way to a player-height passage",()=>{
 const planted=plant(),installed=stepFor(planted.state,1.45).state;
 const armed=armHardBreach(installed).state;
 const {blasts}=stepFor(armed,1.1);
 const blast=blasts[0];assert.ok(blast);
 const steel=hardBreachReinforcement(installMetal(),blast);
 assert.equal(steel.opened,true);
 let gypsum=newSoftWall();
 for(let i=0;i<gypsum.solid.length;i++){
  if(!gypsum.solid[i])continue;
  const w=softWallWorld(i);
  if(Math.hypot(w.x-blast.x,w.y-blast.y,w.z-blast.z)>blast.radius)continue;
  gypsum=softWallRemove(gypsum,i).state;
 }
 assert.ok(gypsum.removed>250);
 const obstacles=[...TEST_OBSTACLES,...softWallBlockers(gypsum),
  ...reinforcementBlockers(steel.state)];
 assert.equal(canOccupy(SOFT_WALL.x,0,SOFT_WALL.z,1.78,obstacles),true,
  "not a painted hole — entire player body can cross");
});
test("installed reinforcement state remains intact until a hard breach, and electric shield cannot be breached",()=>{
 const steel=installMetal();
 assert.equal(reinforcementBlockers(steel).length,1);
 assert.equal(hardBreachReinforcement({...steel,electrified:true},
  {x:SOFT_WALL.x,y:1.2,z:SOFT_WALL.z}).opened,false);
 assert.equal(hardBreachReinforcement(steel,{x:100,y:1.2,z:SOFT_WALL.z}).opened,false);
 assert.equal(tickHardBreach(plant().state,0).state.devices[0].progress,0);
});
