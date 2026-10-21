import test from "node:test";
import assert from "node:assert/strict";
import {IMPACT,newImpactState,throwImpact,tickImpact} from "./impact.js";
import {nitroBlastDamage} from "./nitro.js";
const p={x:0,y:0,z:8,yaw:0,pitch:0,grounded:true};
test("two physical impact grenades consume charges, third throw impossible",()=>{
 let s=newImpactState();
 assert.equal(s.charges,2);
 const a=throwImpact(s,p);s=a.state;
 assert.ok(a.device.armed);assert.ok(a.device.vz<0);assert.equal(s.charges,1);
 const b=throwImpact(s,p);s=b.state;
 assert.equal(b.device.id,2);assert.equal(s.charges,0);
 assert.equal(throwImpact(s,p).device,null);
});
test("impact grenade detonates upon actual contact, not a fixed timer or second key",()=>{
 let s=throwImpact(newImpactState(),p).state,exploded=false;
 for(let i=0;i<100;i++){
  const r=tickImpact(s,.04,[]);
  s=r.state;
  if(r.blasts.length){
   assert.equal(r.blasts.length,1);
   assert.equal(r.blasts[0].radius,IMPACT.radius);
   assert.equal(r.blasts[0].damage,IMPACT.blastDamage);
   assert.ok(nitroBlastDamage(r.blasts[0],r.blasts[0])>0);
   exploded=true;break;
  }
 }
 assert.ok(exploded,"projectile must touch ground within a bounded time");
 assert.equal(s.devices[0].armed,false);
 assert.deepEqual(tickImpact(s,.05).blasts,[]);
});
test("impact against a real wall explodes before passing through",()=>{
 let s=throwImpact(newImpactState(),p).state;
 const wall=[{x:0,z:6,width:3,depth:.2,height:4}];
 let blast=null;
 for(let i=0;i<40;i++){
  const r=tickImpact(s,.025,wall);s=r.state;
  if(r.blasts.length){blast=r.blasts[0];break;}
 }
 assert.ok(blast);assert.ok(blast.z>=5.5);
});
test("invalid timing and depleted charge do not create phantom explosions",()=>{
 const s=throwImpact(newImpactState(),p).state;
 assert.equal(tickImpact(s,NaN).state,s);
 assert.deepEqual(tickImpact(s,0).blasts,[]);
 assert.equal(throwImpact(newImpactState(),{...p,pitch:NaN}).device,null);
});
