import test from "node:test";
import assert from "node:assert/strict";
import {SOFT_WALL,newSoftWall,softWallBreachWindow,softWallBlockers} from "./soft-wall.js";
import {newReinforcement,stepReinforcement,hardBreachReinforcement,
 hardBreachWindow,reinforcementBlockers} from "./reinforcement.js";
import {initialPlayer,canOccupy,stepPlayer,STAND_HEIGHT,CROUCH_HEIGHT,
 TEST_OBSTACLES} from "./physics.js";
import {BREACH_VAULT,beginBreachVault,stepBreachVault} from "./breach-vault.js";
const wallZ=SOFT_WALL.z;
function range(){
 let state=newReinforcement();
 const engineer={x:SOFT_WALL.x,z:wallZ+1.1};
 for(let i=0;i<60;i++)
  state=stepReinforcement(state,{player:engineer,holding:true,dt:.05}).state;
 const blast={x:SOFT_WALL.x,y:1.4,z:wallZ};
 const steel=hardBreachReinforcement(state,blast);
 assert.equal(steel.opened,true);
 const opening=hardBreachWindow(blast);
 const gypsum=softWallBreachWindow(newSoftWall(),opening);
 const blockers=[...TEST_OBSTACLES,...reinforcementBlockers(steel.state),...softWallBlockers(gypsum.state)];
 return {opening,blockers,steel:steel.state,gypsum:gypsum.state};
}
function character(x=SOFT_WALL.x,z=wallZ+.9){
 return {...initialPlayer(),x,z,yaw:0,pitch:0,grounded:true};
}
test("vault does not start through intact steel or gypsum despite matching on-screen geometry",()=>{
 const {opening,blockers}=range();
 const intact=[...TEST_OBSTACLES,...reinforcementBlockers({...newReinforcement(),installed:true}),
  ...softWallBlockers(newSoftWall())];
 assert.equal(beginBreachVault(character(),opening,intact).vault,null);
 assert.equal(beginBreachVault(character(),opening,blockers).reason,"VAULTING THROUGH HARD BREACH");
});
test("Space vault safely lifts over sill, crosses the wall, lands and never clips steel or gypsum",()=>{
 const {opening,blockers}=range();
 let player=character();
 const start=beginBreachVault(player,opening,blockers);
 assert.ok(start.vault,start.reason);
 let state=start.vault,highest=0,atPlane=false,finished=false;
 for(let i=0;i<30;i++){
  const r=stepBreachVault(player,state,.05,blockers);
  player=r.player;state=r.vault;
  highest=Math.max(highest,player.y);
  if(Math.abs(player.z-wallZ)<.15)atPlane=true;
  if(r.event==="vaulting")
   assert.equal(canOccupy(player.x,player.y,player.z,CROUCH_HEIGHT,blockers),true,
    "interpolated vault state must be physically unblocked");
  if(r.event==="landed"){finished=true;break;}
  assert.notEqual(r.event,"blocked", "clear vault should not fail mid-crossing");
 }
 assert.equal(finished,true);
 assert.equal(atPlane,true);
 assert.ok(highest>=BREACH_VAULT.lift-.001);
 assert.ok(player.z<wallZ-.8);
 assert.equal(player.y,0);
 assert.equal(player.grounded,true);
 assert.equal(player.vaulting,false);
 assert.equal(canOccupy(player.x,0,player.z,STAND_HEIGHT,blockers),true);
});
test("ordinary movement / jumping do not walk straight through the raised hard breach",()=>{
 const {blockers}=range();
 let player=character();
 for(let i=0;i<60;i++)
  player=stepPlayer(player,{forward:1},.05,blockers);
 assert.ok(player.z>wallZ+.27,"solid sill remains a wall at ground level");
 assert.equal(canOccupy(SOFT_WALL.x,0,wallZ,STAND_HEIGHT,blockers),false);
});
test("vault starts only within its center, facing the hole, standing on a safe landing side",()=>{
 const {opening,blockers}=range();
 for(const p of [
  character(SOFT_WALL.x+1.25),
  {...character(),yaw:Math.PI},
  {...character(),z:wallZ+2},
  {...character(),grounded:false,y:.3},
  {...character(),prone:true},
  {...character(),x:NaN}
 ]){
  const result=beginBreachVault(p,opening,blockers);
  assert.equal(result.vault,null);
 }
 const back={...character(SOFT_WALL.x,wallZ-.9),yaw:Math.PI};
 assert.ok(beginBreachVault(back,opening,blockers).vault,
  "breach should be vaultable from either side");
});
test("a reset gypsum wall or reinstalling intact reinforcement blocks a stale vault opening",()=>{
 const {opening,blockers,steel}=range();
 const steelReset=[...TEST_OBSTACLES,...reinforcementBlockers({...steel,breach:null}),
  ...softWallBlockers(newSoftWall())];
 const plasterReset=[...TEST_OBSTACLES,...reinforcementBlockers(steel),
  ...softWallBlockers(newSoftWall())];
 assert.equal(beginBreachVault(character(),opening,steelReset).vault,null);
 assert.equal(beginBreachVault(character(),opening,plasterReset).vault,null);
 assert.ok(beginBreachVault(character(),opening,blockers).vault);
});
test("vault cancels if a new solid obstruction blocks its path mid-animation",()=>{
 const {opening,blockers}=range();
 let player=character();
 let vault=beginBreachVault(player,opening,blockers).vault;
 let result={player,vault};
 for(let i=0;i<6;i++){
  result=stepBreachVault(result.player,result.vault,.05,blockers);
  assert.notEqual(result.event,"blocked");
 }
 const obstruction={id:"blocked-window",x:SOFT_WALL.x,z:wallZ,width:2,depth:.2,bottom:0,height:2.2};
 let stopped=false;
 for(let i=0;i<12;i++){
  result=stepBreachVault(result.player,result.vault,.05,[...blockers,obstruction]);
  if(result.event==="blocked"){stopped=true;break;}
 }
 assert.equal(stopped,true);
 assert.equal(result.vault,null);
 assert.ok(result.player.z>wallZ);
 assert.equal(result.player.y,0);
});
test("zero/non-finite dt never accelerates the vault",()=>{
 const {opening,blockers}=range();
 const player=character(),vault=beginBreachVault(player,opening,blockers).vault;
 const initial=stepBreachVault(player,vault,NaN,blockers);
 assert.equal(initial.vault.elapsed,0);
 assert.equal(stepBreachVault(player,vault,0,blockers).vault.elapsed,0);
 assert.equal(stepBreachVault(player,null,.05,blockers).event,"none");
});

test("both distinct hard breach holes remain independently vaultable after two detonations",()=>{
 let state=newReinforcement();
 for(let i=0;i<60;i++)state=stepReinforcement(state,{
  player:{x:SOFT_WALL.x,z:wallZ+1.1},holding:true,dt:.05}).state;
 let gypsum=newSoftWall();
 const windows=[];
 for(const x of [SOFT_WALL.x-1,SOFT_WALL.x+1]){
  const blast={x,y:1.4,z:wallZ};
  const result=hardBreachReinforcement(state,blast);
  assert.equal(result.opened,true);
  state=result.state;
  const window=hardBreachWindow(blast);windows.push(window);
  gypsum=softWallBreachWindow(gypsum,window).state;
 }
 const obstacles=[...TEST_OBSTACLES,...reinforcementBlockers(state),...softWallBlockers(gypsum)];
 for(let i=0;i<windows.length;i++){
  const x=(windows[i].left+windows[i].right)/2;
  const who=character(x);
  const begin=beginBreachVault(who,windows[i],obstacles);
  assert.ok(begin.vault,"hole "+(i+1)+" must support vaulting");
  assert.equal(beginBreachVault(who,windows[1-i],obstacles).vault,null,
   "other breach must not steal the vault control");
 }
});
