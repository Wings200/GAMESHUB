import test from "node:test";
import assert from "node:assert/strict";
import {SOFT_BREACH,newSoftBreachState,placeSoftBreach,tickSoftBreach,
 pickupSoftBreach,detonateSoftBreach} from "./soft-breach.js";
import {newSoftWall,SOFT_WALL,softWallWorld,softWallRemove,softWallBlockers} from "./soft-wall.js";
import {createBarricadeState,BARRICADE,boardBounds,barricadeDamage,barricadeBlockers} from "./barricade.js";
const softPlayer={x:SOFT_WALL.x,y:0,z:SOFT_WALL.z+2.1,yaw:0,pitch:0};
const woodPlayer={x:BARRICADE.x,y:0,z:BARRICADE.z+2.1,yaw:0,pitch:0};
const softContext={softState:newSoftWall(),barricadeState:createBarricadeState(),reinforced:false};
function placedSoft(){
 const result=placeSoftBreach(newSoftBreachState(),softPlayer,softContext);
 assert.ok(result.device,result.reason);return result;
}
function installed(state){
 for(let i=0;i<22;i++)state=tickSoftBreach(state,.05);
 return state;
}
test("Striker gets two physical soft breach charges; placement consumes exactly one",()=>{
 const result=placedSoft();
 assert.equal(result.state.charges,1);
 assert.equal(result.device.type,"soft");
 assert.equal(result.device.progress,0);
 assert.equal(result.device.installed,false);
 assert.ok(Math.abs(result.device.x-SOFT_WALL.x)<.1);
 assert.equal(result.device.side,1);
 assert.equal(result.state.devices.length,1);
 assert.equal(newSoftBreachState().charges,2);
});
test("must face an intact physical panel or barricade within reach",()=>{
 const fresh=newSoftBreachState();
 const back=placeSoftBreach(fresh,{...softPlayer,yaw:Math.PI},softContext);
 const distant=placeSoftBreach(fresh,{...softPlayer,z:10},softContext);
 const invalid=placeSoftBreach(fresh,{...softPlayer,pitch:NaN},softContext);
 const cleared=placeSoftBreach(fresh,softPlayer,{...softContext,softState:{
  ...newSoftWall(),solid:Array(SOFT_WALL.columns*SOFT_WALL.rows).fill(0)
 }});
 for(const result of [back,distant,invalid,cleared]){
  assert.equal(result.device,null);
  assert.equal(result.state,fresh);
 }
});
test("reinforced metal and depleted inventory disallow soft-wall placement",()=>{
 const fresh=newSoftBreachState();
 const steel=placeSoftBreach(fresh,softPlayer,{...softContext,reinforced:true});
 assert.equal(steel.device,null);
 assert.match(steel.reason,/REINFORCED/);
 assert.equal(placeSoftBreach({...fresh,charges:0},softPlayer,softContext).device,null);
});
test("wooden barricade is a real alternative surface for soft breaching",()=>{
 const placed=placeSoftBreach(newSoftBreachState(),woodPlayer,softContext);
 assert.ok(placed.device,placed.reason);
 assert.equal(placed.device.type,"wood");
 assert.ok(placed.device.index>=0&&placed.device.index<BARRICADE.boardCount);
 const none=placeSoftBreach(newSoftBreachState(),woodPlayer,{
  ...softContext,barricadeState:{...softContext.barricadeState,boards:Array(BARRICADE.boardCount).fill(0)}
 });
 assert.equal(none.device,null);
});
test("single live charge per operator; it plants over 0.9 seconds and is remotely armed",()=>{
 let current=placedSoft().state;
 assert.equal(placeSoftBreach(current,woodPlayer,softContext).device,null);
 assert.equal(detonateSoftBreach(current).blast,null);
 current=installed(current);
 assert.equal(current.devices[0].installed,true);
 assert.equal(current.devices[0].progress,SOFT_BREACH.installSeconds);
 assert.equal(tickSoftBreach(current,NaN),current);
 const blast=detonateSoftBreach(current);
 assert.ok(blast.blast);
 assert.equal(blast.blast.type,"soft");
 assert.equal(blast.blast.radius,SOFT_BREACH.radiusSoft);
 assert.equal(blast.state.devices.length,0);
 assert.equal(blast.state.charges,1);
 assert.equal(detonateSoftBreach(blast.state).blast,null);
 assert.equal(placeSoftBreach(blast.state,woodPlayer,softContext).state.charges,0);
});
test("F pickup restores the charge before explosion; reuse works and does not destroy walls",()=>{
 const one=placedSoft();
 const state=installed(one.state);
 const taken=pickupSoftBreach(state,one.device.id,softPlayer);
 assert.ok(taken.device);
 assert.equal(taken.state.charges,SOFT_BREACH.charges);
 assert.equal(taken.state.devices.length,0);
 assert.equal(softContext.softState.removed,0);
 const reused=placeSoftBreach(taken.state,softPlayer,softContext);
 assert.ok(reused.device);
 assert.notEqual(reused.device.id,one.device.id);
 assert.equal(reused.state.charges,1);
 assert.equal(pickupSoftBreach(reused.state,one.device.id,softPlayer).device,null);
});
test("cannot retrieve a breach from too far away or without a valid location",()=>{
 const one=placedSoft();
 const s=installed(one.state);
 for(const player of [{...softPlayer,z:15},{...softPlayer,y:NaN},null]){
  const res=pickupSoftBreach(s,one.device.id,player);
  assert.equal(res.device,null);
  assert.equal(res.state,s);
 }
});
test("blast creates a genuine player-passable opening across numerous gypsum cells",()=>{
 const one=placedSoft(),placed=installed(one.state);
 const det=detonateSoftBreach(placed).blast;
 let state=newSoftWall();
 for(let i=0;i<state.solid.length;i++){
  if(!state.solid[i])continue;
  const world=softWallWorld(i);
  if(Math.hypot(det.x-world.x,det.y-world.y,det.z-world.z)>det.radius)continue;
  state=softWallRemove(state,i).state;
 }
 assert.ok(state.removed>150,"breach is a large opening, not a bullet-size hole");
 assert.equal(state.solid[Math.floor(1.5/SOFT_WALL.cell)*SOFT_WALL.columns+16],0);
 const center=softWallBlockers(state);
 assert.ok(!center.some(o=>o.id.includes("-strip-")&&o.x===SOFT_WALL.x&&o.bottom<=1&&o.height>=2),
  "center lane is physically passable");
});
test("wooden charge destroys entire wooden opening",()=>{
 let state=installed(placeSoftBreach(newSoftBreachState(),woodPlayer,softContext).state);
 const det=detonateSoftBreach(state);
 assert.equal(det.blast.type,"wood");
 assert.equal(det.blast.radius,SOFT_BREACH.radiusWood);
 let wood=createBarricadeState();
 for(let i=0;i<BARRICADE.boardCount;i++){
  const y=boardBounds(i).center;
  if(Math.hypot(det.blast.x-BARRICADE.x,det.blast.y-y,det.blast.z-BARRICADE.z)>det.blast.radius)continue;
  wood=barricadeDamage(wood,i,BARRICADE.boardHP).state;
 }
 assert.deepEqual(wood.boards,[0,0,0,0,0,0]);
 assert.equal(barricadeBlockers(wood).some(o=>o.id.includes("-board-")),false);
});
