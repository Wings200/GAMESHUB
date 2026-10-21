import test from "node:test";
import assert from "node:assert/strict";
import {FLASH,newFlashState,throwFlash,tickFlash,flashExposure,
 newFlashEffect,applyFlashEffect,stepFlashEffect,flashOpacity} from "./flash.js";
const player={x:0,y:0,z:8,yaw:0,pitch:0,grounded:true};
test("two real attack-only flashbangs get unique IDs, launch and consume inventory",()=>{
 const a=throwFlash(newFlashState(),player);
 assert.equal(a.state.charges,1);assert.ok(a.device.armed);
 assert.ok(a.device.vz<0);
 const b=throwFlash(a.state,player);
 assert.equal(b.state.charges,0);assert.equal(b.device.id,2);
 assert.equal(throwFlash(b.state,player).device,null);
 assert.equal(throwFlash(newFlashState(),{...player,yaw:NaN}).device,null);
});
test("flash projectiles bounce, then detonate once after 1.75 seconds",()=>{
 let s=throwFlash(newFlashState(),player).state,bursts=[];
 for(let i=0;i<34;i++){
  const r=tickFlash(s,.05,[]);s=r.state;bursts.push(...r.bursts);
 }
 assert.equal(bursts.length,0);
 const r=tickFlash(s,.05,[]);s=r.state;bursts.push(...r.bursts);
 assert.equal(bursts.length,1);assert.equal(bursts[0].radius,FLASH.radius);
 assert.equal(s.devices[0].armed,false);
 assert.equal(tickFlash(s,.05).bursts.length,0);
 assert.equal(tickFlash(s,0).state,s);
 assert.equal(tickFlash(s,NaN).state,s);
});
test("facing a nearby flash is blinding; turning 180 degrees away protects the player",()=>{
 const burst={x:0,y:1.6,z:-2,radius:FLASH.radius};
 const front=flashExposure(burst,{...player,z:0},[]);
 const back=flashExposure(burst,{...player,z:0,yaw:Math.PI},[]);
 assert.ok(front.intensity>.6);
 assert.ok(front.duration>1);
 assert.equal(back.intensity,0);
});
test("distance falloff and beyond-range immunity are deterministic",()=>{
 const p={...player,z:0};
 const close=flashExposure({x:0,y:1.6,z:-1,radius:FLASH.radius},p);
 const middle=flashExposure({x:0,y:1.6,z:-6,radius:FLASH.radius},p);
 const far=flashExposure({x:0,y:1.6,z:-12,radius:FLASH.radius},p);
 assert.ok(close.intensity>middle.intensity&&middle.intensity>0);
 assert.equal(far.intensity,0);
});
test("solid collision wall between eyes and grenade prevents blindness",()=>{
 const p={...player,z:0};
 const burst={x:0,y:1.6,z:-4,radius:FLASH.radius};
 const wall=[{x:0,z:-2,width:5,depth:.4,bottom:0,height:3}];
 const blocked=flashExposure(burst,p,wall);
 assert.equal(blocked.intensity,0);assert.equal(blocked.occluded,true);
 const offAxis=[{x:10,z:-2,width:1,depth:1,bottom:0,height:3}];
 assert.ok(flashExposure(burst,p,offAxis).intensity>0);
});
test("flash effects are independent of team, apply zero HP damage and recover to clear",()=>{
 const burst={x:0,y:1.6,z:-1,radius:FLASH.radius};
 const a=flashExposure(burst,{...player,z:0,side:"attack"});
 const d=flashExposure(burst,{...player,z:0,side:"defend"});
 assert.deepEqual(a,d,"no friendly immunity to visual flash");
 let effect=applyFlashEffect(newFlashEffect(),a);
 assert.ok(flashOpacity(effect)>.6);
 const before=effect.remaining;
 effect=stepFlashEffect(effect,.05);
 assert.ok(effect.remaining<before);
 const weaker=applyFlashEffect(effect,{intensity:.1,duration:.5});
 assert.equal(weaker.intensity,effect.intensity);
 for(let i=0;i<100;i++)effect=stepFlashEffect(effect,.05);
 assert.equal(effect.remaining,0);
 assert.equal(flashOpacity(effect),0);
});
test("no blindness for invalid inputs or when flash is directly behind",()=>{
 assert.equal(flashExposure(null,player).intensity,0);
 assert.equal(flashExposure({x:NaN,y:0,z:0},player).intensity,0);
 assert.equal(flashExposure({x:0,y:1.6,z:4}, {...player,z:0},[]).intensity,0);
});
