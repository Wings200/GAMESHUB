import test from "node:test";
import assert from "node:assert/strict";
import {THROW_PREVIEW_IDS,canPreviewThrow,traceThrownGadget} from "./throw-preview.js";
import {newFragState,throwFrag,tickFrag} from "./frag.js";
import {newFlashState,throwFlash,tickFlash} from "./flash.js";
import {newSmokeState,throwSmoke,tickSmoke} from "./smoke.js";
import {newImpactState,throwImpact,tickImpact} from "./impact.js";
import {newNitroState,throwNitro,tickNitro} from "./nitro.js";
const p={x:0,y:0,z:4,yaw:0,pitch:0,grounded:true};
const entries=[
 ["frag",newFragState,throwFrag,tickFrag],
 ["flash",newFlashState,throwFlash,tickFlash],
 ["smoke",newSmokeState,throwSmoke,tickSmoke],
 ["impact",newImpactState,throwImpact,tickImpact],
 ["c4",newNitroState,throwNitro,tickNitro]
];
test("only five real throwables permit a held aim path when inventory is available",()=>{
 assert.deepEqual(THROW_PREVIEW_IDS,["frag","flash","smoke","impact","c4"]);
 for(const id of THROW_PREVIEW_IDS){
  assert.equal(canPreviewThrow(id,1),true);
  assert.equal(canPreviewThrow(id,0),false);
  assert.equal(canPreviewThrow(id,NaN),false);
 }
 assert.equal(canPreviewThrow("barbed-wire",2),false);
 assert.equal(canPreviewThrow("claymore",2),false);
 assert.equal(canPreviewThrow("c4",1,true),false);
});
test("preview is pure: matching launch point, no consumption of actual inventory",()=>{
 for(const [id,makeState,thrower,stepper] of entries){
  const actual=makeState(),amount=actual.charges;
  const traced=traceThrownGadget({makeState,thrower,stepper,player:p});
  assert.ok(traced?.points?.length>=2,id+" must predict a real path");
  const thrown=thrower(actual,p).device;
  assert.deepEqual(traced.points[0],{x:thrown.x,y:thrown.y,z:thrown.z});
  assert.equal(actual.charges,amount);
  assert.ok(["detonate","land"].includes(traced.endKind),id+" must end at impact, fuse, or landing");
 }
});
test("preview terminal position matches running gameplay step-by-step",()=>{
 for(const [id,makeState,thrower,stepper] of entries){
  const sim=traceThrownGadget({makeState,thrower,stepper,player:p});
  let state=thrower(makeState(),p).state;
  let terminal=null,kind="limit";
  for(let i=0;i<90;i++){
   const r=stepper(state,.05,[]);
   state=r?.state||r;
   const item=state.devices?.find(d=>d.id===1);
   const event=(r?.blasts||r?.bursts||r?.spawned||[]).find(x=>x.id===1);
   if(event){terminal=event;kind="detonate";break;}
   if(item?.stuck){terminal=item;kind="land";break;}
  }
  assert.ok(terminal,id);
  assert.equal(sim.endKind,kind,id);
  const expected=[terminal.x,terminal.projectileY??terminal.y,terminal.z];
  [sim.end.x,sim.end.y,sim.end.z].forEach((x,i)=>
   assert.ok(Math.abs(x-expected[i])<1e-6,id+" predicted endpoint axis "+i));
 }
});
test("wall changes the predicted route using the same physics as live projectile",()=>{
 const wall=[{x:0,z:1.6,width:4,depth:.35,bottom:0,height:3}];
 for(const [id,makeState,thrower,stepper] of entries){
  const clear=traceThrownGadget({makeState,thrower,stepper,player:p});
  const blocked=traceThrownGadget({makeState,thrower,stepper,player:p,obstacles:wall});
  assert.ok(blocked&&clear,id);
  assert.ok(Math.abs(clear.end.z-blocked.end.z)>.05,id+" must react to cover");
 }
});
test("mouse yaw and pitch change the preview; invalid player gives no path",()=>{
 const [id,makeState,thrower,stepper]=entries[0];
 const original=traceThrownGadget({makeState,thrower,stepper,player:p});
 const spun=traceThrownGadget({makeState,thrower,stepper,player:{...p,yaw:Math.PI/2}});
 const high=traceThrownGadget({makeState,thrower,stepper,player:{...p,pitch:-.55}});
 assert.ok(Math.abs(original.end.x-spun.end.x)>1);
 assert.ok(Math.abs(original.end.z-high.end.z)>.01);
 assert.equal(traceThrownGadget({makeState,thrower,stepper,player:{...p,pitch:NaN}}),null);
 assert.equal(traceThrownGadget({player:p}),null);
});
