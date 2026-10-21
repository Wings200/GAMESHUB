import test from "node:test";
import assert from "node:assert/strict";
import {FRAG,newFragState,throwFrag,tickFrag} from "./frag.js";
import {nitroBlastDamage,nitroBlastIsLethal} from "./nitro.js";
const p={x:0,y:0,z:8,yaw:0,pitch:0,grounded:true};
test("Striker gets 2 real timed frag throws; no false throw after empty",()=>{
 const fresh=newFragState();
 const a=throwFrag(fresh,p);
 assert.equal(a.state.charges,1);assert.ok(a.device.armed);
 const b=throwFrag(a.state,p);
 assert.equal(b.state.charges,0);assert.equal(throwFrag(b.state,p).device,null);
 assert.ok(a.device.vz<0);
});
test("frag survives collision, arms for multiple seconds then explodes once",()=>{
 let state=throwFrag(newFragState(),p).state,blasts=[];
 for(let i=0;i<63;i++){
  const r=tickFrag(state,.05,[]);state=r.state;blasts.push(...r.blasts);
 }
 assert.equal(blasts.length,0);
 const next=tickFrag(state,.05,[]);
 assert.equal(next.blasts.length,1);
 assert.equal(next.blasts[0].radius,FRAG.radius);
 assert.equal(nitroBlastDamage(next.blasts[0],next.blasts[0]),FRAG.blastDamage);
 assert.equal(next.state.devices[0].armed,false);
 assert.equal(tickFrag(next.state,1).blasts.length,0);
});
test("frag meets wall and bounces, rather than teleporting past a solid wall",()=>{
 let state=throwFrag(newFragState(),p).state;
 const wall=[{x:0,z:6.7,width:6,depth:.4,height:4}];
 let bounced=false;
 for(let i=0;i<20;i++){
  const prev=state.devices[0];
  const next=tickFrag(state,.025,wall).state;
  if(next.devices[0].vz>0&&prev.vz<0){bounced=true;break;}
  state=next;
 }
 assert.equal(bounced,true);
});
test("invalid time and malformed throw inputs remain harmless",()=>{
 const s=throwFrag(newFragState(),p).state;
 assert.equal(tickFrag(s,NaN).state,s);
 assert.equal(tickFrag(s,0).state,s);
 assert.equal(throwFrag(newFragState(),{...p,pitch:NaN}).device,null);
});

test("frag grenade guarantees close-range kills for either side with radial falloff",()=>{
 const blast={x:0,y:.12,z:0,radius:FRAG.radius,damage:FRAG.blastDamage,
  fullDamageRadius:FRAG.fullDamageRadius,lethalRadius:FRAG.lethalRadius};
 for(const side of ["attack","defend"]){
  const adjacent={x:.4,y:.6,z:0,side};
  assert.equal(nitroBlastIsLethal(blast,adjacent),true);
  assert.ok(nitroBlastDamage(blast,adjacent)>125);
 }
 const far={x:FRAG.radius-.4,y:.12,z:0};
 assert.equal(nitroBlastIsLethal(blast,far),false);
 assert.ok(nitroBlastDamage(blast,far)>0&&nitroBlastDamage(blast,far)<125);
 assert.equal(nitroBlastDamage(blast,{x:FRAG.radius,y:.12,z:0}),0);
});
