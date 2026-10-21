import test from "node:test";
import assert from "node:assert/strict";
import {NITRO,newNitroState,throwNitro,tickNitro,detonateNitro,nitroBlastDamage,nitroBlastIsLethal} from "./nitro.js";
const player={x:0,y:0,z:8,yaw:0,pitch:0,grounded:true};
test("Sentry C4 throws actual moving device and spends exactly one inventory charge",()=>{
 const start=newNitroState(),thrown=throwNitro(start,player);
 assert.equal(start.charges,1);assert.equal(thrown.state.charges,0);
 assert.equal(thrown.device.id,1);assert.equal(thrown.device.armed,true);
 assert.ok(thrown.device.vz<0);
 assert.equal(throwNitro(thrown.state,player).device,null);
 let flight=tickNitro(thrown.state,.05,[]);
 assert.ok(flight.devices[0].z<thrown.device.z,"charge must advance through real world");
 assert.ok(flight.devices[0].y>0);
 for(let i=0;i<80;i++)flight=tickNitro(flight,.05,[]);
 assert.equal(flight.devices[0].stuck,true,"charge settles and stops");
 assert.ok(flight.devices[0].y>=NITRO.boxSize/2);
 assert.equal(tickNitro(flight,1,[]),flight,"stuck charge remains static");
});
test("physical solid collision stops the flying C4 at an obstacle",()=>{
 const s=throwNitro(newNitroState(),player).state;
 const obstacle=[{id:"panel",x:0,z:6.5,width:4,depth:.25,height:3.2}];
 let next=s;
 for(let i=0;i<14;i++)next=tickNitro(next,.04,obstacle);
 assert.equal(next.devices[0].stuck,true);
 assert.ok(next.devices[0].z>=6.5-.25/2-.5);
});
test("pressing same utility key a second time detonates at C4's actual location",()=>{
 let s=throwNitro(newNitroState(),player).state;
 for(let i=0;i<12;i++)s=tickNitro(s,.05,[]);
 const result=detonateNitro(s);
 assert.ok(result.blast);
 assert.deepEqual([result.blast.x,result.blast.z],[s.devices[0].x,s.devices[0].z]);
 assert.equal(result.state.devices[0].armed,false);
 assert.equal(detonateNitro(result.state).blast,null);
 assert.equal(throwNitro(result.state,player).device,null,"charge inventory is not refunded");
});
test("blast damages nearby players and never damages beyond radial range",()=>{
 const b={x:0,y:1,z:0,radius:NITRO.radius,damage:NITRO.blastDamage};
 assert.equal(nitroBlastDamage(b,{x:0,y:1,z:0}),NITRO.blastDamage);
 const middle=nitroBlastDamage(b,{x:1.2,y:1,z:0});
 assert.ok(middle>0&&middle<NITRO.blastDamage);
 assert.equal(nitroBlastDamage(b,{x:10,y:1,z:0}),0);
 assert.equal(nitroBlastDamage(b,{x:NITRO.radius,y:1,z:0}),0);
 assert.equal(nitroBlastDamage(null,{x:0,y:0,z:0}),0);
});
test("C4 rejects malformed launch coordinates and invalid elapsed time",()=>{
 assert.equal(throwNitro(newNitroState(),{...player,yaw:NaN}).device,null);
 const s=throwNitro(newNitroState(),player).state;
 assert.equal(tickNitro(s,NaN),s);
 assert.equal(tickNitro(s,0),s);
});

test("C4 instantly eliminates at close range and falls off to zero at radius",()=>{
 const blast=detonateNitro(throwNitro(newNitroState(),player).state).blast;
 const adjacent={x:blast.x+NITRO.lethalRadius*.9,y:blast.y,z:blast.z};
 const far={x:blast.x+NITRO.radius-.3,y:blast.y,z:blast.z};
 assert.equal(nitroBlastIsLethal(blast,adjacent),true);
 assert.ok(nitroBlastDamage(blast,adjacent)>125);
 assert.equal(nitroBlastIsLethal(blast,far),false);
 assert.ok(nitroBlastDamage(blast,far)>0&&nitroBlastDamage(blast,far)<125);
 assert.equal(nitroBlastDamage(blast,{x:blast.x+NITRO.radius,y:blast.y,z:blast.z}),0);
});
test("C4 exposure is the same on either side, and rejects invalid coordinates",()=>{
 const blast=detonateNitro(throwNitro(newNitroState(),player).state).blast;
 for(const side of ["attack","defend"]){
  const target={x:blast.x,y:blast.y,z:blast.z,side};
  assert.ok(nitroBlastIsLethal(blast,target));
  assert.equal(nitroBlastDamage(blast,target),NITRO.blastDamage);
  assert.ok(Number.isFinite(nitroBlastDamage(blast,target)));
 }
 assert.equal(nitroBlastIsLethal({...blast,lethalRadius:0},blast),false);
 assert.equal(nitroBlastDamage(blast,{x:NaN,y:0,z:0}),0);
});
