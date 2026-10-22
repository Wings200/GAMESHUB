import test from "node:test";
import assert from "node:assert/strict";
import {canOccupy,stepPlayer,STAND_HEIGHT,CROUCH_HEIGHT,TEST_OBSTACLES}
 from "./physics.js";
import {DEPLOYABLE_SHIELD,newShieldState,shieldCandidate,shieldCollider,
 shieldBlockers,liveShields,canPlaceShield,placeShield,pickupShield,
 blastDestroysShield,blastShields} from "./deployable-shield.js";
import {SHIELD_VAULT,beginShieldVault,stepShieldVault} from "./shield-vault.js";
const player={x:0,y:0,z:8,yaw:0,grounded:true};
const plant=()=>placeShield(newShieldState(),player,TEST_OBSTACLES);
const blockers=s=>[...TEST_OBSTACLES,...shieldBlockers(s)];
test("two defender shields can coexist; every unit has real collider and its own id",()=>{
 const p=plant();assert.ok(p.device,p.reason);assert.equal(p.state.charges,1);
 const collider=shieldCollider(p.device);
 assert.equal(collider.width,DEPLOYABLE_SHIELD.width);
 assert.equal(collider.depth,DEPLOYABLE_SHIELD.depth);
 assert.equal(collider.height,DEPLOYABLE_SHIELD.height);
 const second=placeShield(p.state,{...player,x:3.2},blockers(p.state));
 assert.ok(second.device,second.reason);
 assert.notEqual(second.device.id,p.device.id);
 assert.equal(second.state.charges,0);
 assert.equal(shieldBlockers(second.state).length,2);
 assert.equal(placeShield(second.state,{...player,x:6},blockers(second.state)).device,null);
});
test("cardinal rotation correctly matches physics width/depth and mesh yaw",()=>{
 for(const yaw of [0,Math.PI/2,-Math.PI/2,Math.PI,Math.PI*.7]){
  const p={...player,yaw};
  const point=shieldCandidate(p),s=shieldCollider({...point,id:1});
  const across=Math.abs(Math.sin(point.yaw))>.5;
  assert.equal(s.width,across?DEPLOYABLE_SHIELD.depth:DEPLOYABLE_SHIELD.width);
  assert.equal(s.depth,across?DEPLOYABLE_SHIELD.width:DEPLOYABLE_SHIELD.depth);
  assert.ok(Math.abs(point.x-(p.x-Math.sin(yaw)*DEPLOYABLE_SHIELD.placeDistance))<1e-9);
 }
});
test("floor and wall intersection blocks placement without consuming shields",()=>{
 const fresh=newShieldState();
 for(const bad of [null,{...player,y:1},{...player,grounded:false},
  {...player,prone:true},{...player,x:NaN},{...player,z:29}]){
  const r=placeShield(fresh,bad,TEST_OBSTACLES);
  assert.equal(r.device,null);assert.equal(r.state,fresh);
 }
 const p=shieldCandidate(player),wall={id:"wall",x:p.x,z:p.z,
  width:3,depth:.3,height:3,bottom:0};
 assert.equal(canPlaceShield(fresh,player,[wall]).ok,false);
 assert.equal(placeShield(fresh,player,[wall]).state.charges,2);
 const placed=plant();
 assert.equal(placeShield(placed.state,player,[]).device,null,
  "the built-in overlap test must prevent overlapping shields");
});
test("shield blocks walking, standing, drone obstacles and bullets as a single surface",()=>{
 const p=plant();const solid=shieldBlockers(p.state);
 assert.equal(canOccupy(p.device.x,0,p.device.z,STAND_HEIGHT,solid),false);
 assert.equal(canOccupy(p.device.x,SHIELD_VAULT.lift,p.device.z,CROUCH_HEIGHT,solid),true);
 let moving={...player,vy:0,pitch:0,prone:false,crouched:false};
 for(let i=0;i<50;i++)moving=stepPlayer(moving,{forward:1},.05,solid);
 assert.ok(moving.z>p.device.z+DEPLOYABLE_SHIELD.depth/2+.31);
 assert.equal(solid.length,1,"one world physics collider for the whole device");
});
test("F pickup refunds one charge and removes solid collider immediately",()=>{
 const p=plant();
 const result=pickupShield(p.state,p.device.id,player);
 assert.ok(result.device,result.reason);
 assert.equal(result.state.charges,2);
 assert.equal(result.state.devices.length,0);
 assert.equal(shieldBlockers(result.state).length,0);
 const again=placeShield(result.state,player,[]);
 assert.ok(again.device);
 assert.notEqual(again.device.id,p.device.id);
 assert.equal(pickupShield(again.state,p.device.id,player).device,null);
});
test("pickup rejects distance/malformed user, and never refunds destroyed shields",()=>{
 const p=plant();
 for(const bad of [null,{...player,z:0},{...player,x:50},
  {...player,y:NaN},{...player,y:1}]){
  const r=pickupShield(p.state,p.device.id,bad);
  assert.equal(r.device,null);assert.equal(r.state,p.state);
 }
 const broken=blastShields(p.state,{x:p.device.x,y:.5,z:p.device.z,radius:2},"IMPACT");
 assert.deepEqual(broken.destroyed,[p.device.id]);
 assert.equal(pickupShield(broken.state,p.device.id,player).device,null);
 assert.equal(liveShields(broken.state).length,0);
});
test("C4, impacts, frags, and breaches remove bullet cover but ordinary gunfire does not",()=>{
 const p=plant();
 for(const label of DEPLOYABLE_SHIELD.explosionLabels){
  const hit=blastShields(p.state,{x:p.device.x,y:.8,z:p.device.z+.5,radius:2},label);
  assert.deepEqual(hit.destroyed,[p.device.id],label);
  assert.equal(shieldBlockers(hit.state).length,0);
  const repeat=blastShields(hit.state,{x:p.device.x,y:.8,z:p.device.z,radius:2},label);
  assert.equal(repeat.destroyed.length,0);
 }
 for(const label of ["CLAYMORE","FLASH","SMOKE","BULLET","MELEE"]){
  assert.equal(blastShields(p.state,{x:p.device.x,y:.8,z:p.device.z,radius:5},label).destroyed.length,0);
 }
 assert.equal(blastDestroysShield({x:p.device.x+7,y:.8,z:p.device.z,radius:2},p.device,"C4"),false);
 assert.equal(blastDestroysShield({x:p.device.x,y:20,z:p.device.z,radius:2},p.device,"IMPACT"),false);
});
test("Space performs real vault over shield while normal jumping cannot",()=>{
 const placed=plant(),obstacles=blockers(placed.state);
 const ahead={...player,pitch:0,prone:false};
 const started=beginShieldVault(ahead,placed.state,obstacles);
 assert.ok(started.vault,started.reason);
 let actor=ahead,vault=started.vault,peak=0,landed=false;
 for(let i=0;i<30;i++){
  const r=stepShieldVault(actor,vault,.05,obstacles);
  actor=r.player;vault=r.vault;peak=Math.max(peak,actor.y);
  assert.notEqual(r.event,"blocked","shield's own solid must be vaulted above");
  if(r.event==="vaulting")
   assert.equal(canOccupy(actor.x,actor.y,actor.z,CROUCH_HEIGHT,obstacles),true);
  if(r.event==="landed"){landed=true;break;}
 }
 assert.ok(landed,"vault lands in bounded time");
 assert.equal(actor.grounded,true);
 assert.equal(actor.vaulting,false);
 assert.ok(actor.z<placed.device.z-0.6);
 assert.ok(peak>DEPLOYABLE_SHIELD.height);
 assert.equal(canOccupy(actor.x,0,actor.z,STAND_HEIGHT,obstacles),true);
});
test("shield vault is facing-dependent, cannot launch too far or through another blocker",()=>{
 const p=plant(),o=blockers(p.state);
 for(const bad of [{...player,yaw:Math.PI},{...player,x:3},
  {...player,z:9.9},{...player,prone:true},{...player,grounded:false}]){
  assert.equal(beginShieldVault(bad,p.state,o).vault,null);
 }
 const second={id:"landing-blocked",x:0,z:5.3,width:3,depth:1,height:3};
 assert.equal(beginShieldVault(player,p.state,[...o,second]).vault,null);
 const started=beginShieldVault(player,p.state,o).vault;
 let actor=player,vault=started;
 for(let i=0;i<7;i++){const r=stepShieldVault(actor,vault,.05,o);actor=r.player;vault=r.vault;}
 let blocked=false;
 for(let i=0;i<12;i++){
  const r=stepShieldVault(actor,vault,.05,[...o,second]);
  actor=r.player;vault=r.vault;
  if(r.event==="blocked"){blocked=true;break;}
 }
 assert.equal(blocked,true);
 assert.ok(actor.z>p.device.z);
 assert.equal(actor.y,0);
});
test("vault state does not advance for NaN/zero time",()=>{
 const p=plant(),o=blockers(p.state);
 const vault=beginShieldVault(player,p.state,o).vault;
 assert.equal(stepShieldVault(player,vault,NaN,o).vault.elapsed,0);
 assert.equal(stepShieldVault(player,vault,0,o).vault.elapsed,0);
 assert.equal(stepShieldVault(player,null,.05,o).event,"none");
});
