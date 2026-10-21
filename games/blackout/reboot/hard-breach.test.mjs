import test from "node:test";
import assert from "node:assert/strict";
import {SOFT_WALL,newSoftWall,softWallBreachWindow,softWallBlockers} from "./soft-wall.js";
import {REINFORCEMENT,HARD_BREACH_WINDOW,hardBreachWindow,
 newReinforcement,stepReinforcement,hardBreachReinforcement,
 reinforcementBreaches,mergedBreachWindows,reinforcementWindowAddsHole,
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
test("reinforced metal gets a small raised window and four solid perimeter pieces",()=>{
 const original=installMetal();
 const blast={x:SOFT_WALL.x,y:1.3,z:SOFT_WALL.z};
 const result=hardBreachReinforcement(original,blast);
 assert.equal(result.opened,true);
 assert.equal(result.state.installed,true);
 assert.equal(reinforcementStatus(result.state),"BREACHED");
 const strips=reinforcementBlockers(result.state);
 assert.equal(strips.length,4);
 for(const name of ["left","right","sill","lintel"])
  assert.ok(strips.some(p=>p.id.endsWith("-"+name)));
 assert.ok(strips.every(p=>p.height-p.bottom>0&&p.width>0));
 assert.equal(result.state.breach.bottom,HARD_BREACH_WINDOW.bottom);
 assert.equal(result.state.breach.top,HARD_BREACH_WINDOW.top);
 assert.ok(Math.abs((result.state.breach.right-result.state.breach.left)-HARD_BREACH_WINDOW.width)<1e-9);
 assert.equal(canOccupy(SOFT_WALL.x,0,SOFT_WALL.z,1.78,
  [...TEST_OBSTACLES,...strips]),false,"walking must collide with the sill");
 assert.equal(canOccupy(SOFT_WALL.x,.74,SOFT_WALL.z,1.16,
  [...TEST_OBSTACLES,...strips]),true,"vault pose must fit");
 assert.equal(canOccupy(SOFT_WALL.x,.74,SOFT_WALL.z,1.78,
  [...TEST_OBSTACLES,...strips]),false,"standing body cannot fit");
 assert.equal(canOccupy(SOFT_WALL.x+1.6,.74,SOFT_WALL.z,1.16,
  [...TEST_OBSTACLES,...strips]),false,"surrounding steel remains solid");
 assert.equal(hardBreachReinforcement(result.state,blast).opened,false);
});
test("hard breach clears ONLY the gypsum inside the raised window, leaving the bottom and top intact",()=>{
 const planted=plant(),installed=stepFor(planted.state,1.45).state;
 const {blasts}=stepFor(armHardBreach(installed).state,1.1);
 const blast=blasts[0];assert.ok(blast);
 const steel=hardBreachReinforcement(installMetal(),blast);
 assert.equal(steel.opened,true);
 const window=hardBreachWindow(blast);
 const result=softWallBreachWindow(newSoftWall(),window);
 assert.ok(result.removed>100&&result.removed<260,"compact aperture, not huge doorway");
 const obstacles=[...TEST_OBSTACLES,...softWallBlockers(result.state),
  ...reinforcementBlockers(steel.state)];
 assert.equal(canOccupy(SOFT_WALL.x,0,SOFT_WALL.z,1.78,obstacles),false,
  "hard breach still has a solid sill");
 assert.equal(canOccupy(SOFT_WALL.x,.74,SOFT_WALL.z,1.16,obstacles),true,
  "crouched vault pose clears steel and gypsum");
 assert.equal(canOccupy(SOFT_WALL.x,.74,SOFT_WALL.z,1.78,obstacles),false,
  "standing cannot pass through this smaller window");
 const lowerIndex=2*SOFT_WALL.columns+16;
 const centerIndex=11*SOFT_WALL.columns+16;
 const upperIndex=19*SOFT_WALL.columns+16;
 assert.equal(result.state.solid[lowerIndex],1,"gypsum beneath hole remains");
 assert.equal(result.state.solid[centerIndex],0,"true opening in center");
 assert.equal(result.state.solid[upperIndex],1,"gypsum above hole remains");
});
test("installed reinforcement state remains intact until a hard breach, and electric shield cannot be breached",()=>{
 const steel=installMetal();
 assert.equal(reinforcementBlockers(steel).length,1);
 assert.equal(hardBreachReinforcement({...steel,electrified:true},
  {x:SOFT_WALL.x,y:1.2,z:SOFT_WALL.z}).opened,false);
 assert.equal(hardBreachReinforcement(steel,{x:100,y:1.2,z:SOFT_WALL.z}).opened,false);
 assert.equal(tickHardBreach(plant().state,0).state.devices[0].progress,0);
});

test("two actual charges on separate reinforced-wall panels leave BOTH vault holes and solid steel between",()=>{
 const left={...player,x:SOFT_WALL.x-1.0};
 const right={...player,x:SOFT_WALL.x+1.0};
 const initial=installMetal();
 let chargeState=newHardBreachState();
 let armor=initial,plaster=newSoftWall();
 const saved=[];
 for(const thrower of [left,right]){
  const placement=placeHardBreach(chargeState,thrower,context(armor));
  assert.ok(placement.device,placement.reason);
  chargeState=stepFor(placement.state,HARD_BREACH.installSeconds).state;
  const active=armHardBreach(chargeState);
  assert.ok(active.ok,active.reason);
  const {state,blasts}=stepFor(active.state,HARD_BREACH.detonationDelay);
  chargeState=state;
  assert.equal(blasts.length,1);
  const steel=hardBreachReinforcement(armor,blasts[0]);
  assert.ok(steel.opened,steel.reason);
  armor=steel.state;
  const window=hardBreachWindow(blasts[0]);
  plaster=softWallBreachWindow(plaster,window).state;
  saved.push({window,armor,plaster});
 }
 assert.equal(chargeState.charges,0);
 assert.equal(reinforcementBreaches(armor).length,2);
 assert.equal(mergedBreachWindows(armor).length,2);
 const blockers=[...TEST_OBSTACLES,...reinforcementBlockers(armor),...softWallBlockers(plaster)];
 const middle=(saved[0].window.right+saved[1].window.left)/2;
 assert.ok(saved[0].window.right<saved[1].window.left,"holes are separated by steel");
 assert.equal(reinforcementBlockers(armor).length,7,"left/right/central wall + 2 sills + 2 lintels");
 for(const {window} of saved){
  const x=(window.left+window.right)/2;
  assert.equal(canOccupy(x,.74,SOFT_WALL.z,1.16,blockers),true,
   "both first and second opening must remain a working vault");
  assert.equal(canOccupy(x,0,SOFT_WALL.z,1.78,blockers),false,
   "both sills must remain solid");
 }
 assert.equal(canOccupy(middle,.74,SOFT_WALL.z,1.16,blockers),false,
  "the remaining center steel must still block crossing");
 const before=reinforcementBlockers(saved[0].armor);
 assert.equal(before.length,4,"first opening stays intact and never narrows");
 assert.equal(reinforcementWindowAddsHole(armor,saved[0].window),false,
  "placing another charge on an already open area must not consume it");
});
test("partly overlapping second hard breach expands the first, never rebuilds or shrinks it",()=>{
 const first=hardBreachReinforcement(installMetal(),{
  x:SOFT_WALL.x-.5,y:1.4,z:SOFT_WALL.z});
 assert.equal(first.opened,true);
 const firstWindow=first.state.breach;
 const second=hardBreachReinforcement(first.state,{
  x:SOFT_WALL.x+.5,y:1.4,z:SOFT_WALL.z});
 assert.equal(second.opened,true);
 const union=mergedBreachWindows(second.state);
 assert.equal(union.length,1);
 assert.ok(union[0].left<=firstWindow.left);
 assert.ok(union[0].right>firstWindow.right);
 assert.equal(reinforcementBlockers(second.state).length,4);
 assert.equal(hardBreachReinforcement(second.state,{
  x:SOFT_WALL.x+.5,y:1.4,z:SOFT_WALL.z}).opened,false);
 assert.equal(reinforcementBreaches(second.state).length,2);
});
test("duplicate hard breach target is refused without losing the remaining charge",()=>{
 const installed=installMetal();
 const previous=hardBreachReinforcement(installed,{
  x:SOFT_WALL.x,y:1.45,z:SOFT_WALL.z});
 const fresh=newHardBreachState();
 const same=placeHardBreach(fresh,{...player,pitch:.28},context(previous.state));
 assert.equal(same.device,null);
 assert.equal(same.state.charges,HARD_BREACH.charges);
 assert.match(same.reason,/ALREADY/);
});
