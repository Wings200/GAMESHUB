import test from "node:test";
import assert from "node:assert/strict";
import {SMOKE,SMOKE_LIFE,newSmokeState,throwSmoke,tickSmoke,cloudAtAge,smokeCameraDensity}
 from "./smoke.js";
const player={x:0,y:0,z:8,yaw:0,pitch:0,grounded:true};
test("smoke grenades spend real attack inventory, move and reject invalid throws",()=>{
 const a=throwSmoke(newSmokeState(),player);
 assert.equal(a.state.charges,1);assert.equal(a.device.armed,true);
 assert.ok(a.device.vz<0);
 const b=throwSmoke(a.state,player);
 assert.equal(b.state.charges,0);assert.equal(b.device.id,2);
 assert.equal(throwSmoke(b.state,player).device,null);
 assert.equal(throwSmoke(newSmokeState(),{...player,pitch:NaN}).device,null);
 assert.ok(tickSmoke(a.state,.05).state.devices[0].z<a.device.z);
});
test("a smoke canister deploys a single cloud after its fuse, without a blast",()=>{
 let state=throwSmoke(newSmokeState(),player).state;
 for(let i=0;i<35;i++){const next=tickSmoke(state,.05,[]);state=next.state;assert.equal(next.spawned.length,0);}
 const blast=tickSmoke(state,.05,[]);
 assert.equal(blast.spawned.length,1);
 assert.equal(blast.state.devices.length,0);
 assert.equal(blast.state.clouds.length,1);
 assert.equal(blast.state.clouds[0].id,1);
 assert.equal(blast.state.charges,1);
 assert.equal(tickSmoke(blast.state,.05).spawned.length,0);
});
test("physical cover bounces a smoke canister rather than teleporting through a wall",()=>{
 let state=throwSmoke(newSmokeState(),player).state;
 const wall=[{x:0,z:6.5,width:4,depth:.3,height:3}];
 for(let i=0;i<10;i++)state=tickSmoke(state,.05,wall).state;
 assert.ok(state.devices[0].z>6.3,"projectile should remain on the near side");
});
test("smoke expands to a broad opaque center, holds, then genuinely clears",()=>{
 const base={id:1,x:0,y:1.45,z:0};
 const initial=cloudAtAge(base,0),early=cloudAtAge(base,.4);
 const grown=cloudAtAge(base,SMOKE.expandSeconds);
 const mid=cloudAtAge(base,SMOKE.expandSeconds+SMOKE.holdSeconds*.5);
 const late=cloudAtAge(base,SMOKE_LIFE-1);
 const gone=cloudAtAge(base,SMOKE_LIFE);
 assert.ok(initial.radius<early.radius&&early.radius<grown.radius);
 assert.ok(early.density>0&&early.density<grown.density);
 assert.equal(grown.radius,SMOKE.radius);
 assert.equal(grown.density,1);assert.equal(mid.density,1);
 assert.ok(late.density>0&&late.density<1);
 assert.equal(gone.density,0);
 assert.ok(smokeCameraDensity([grown],{x:0,y:1.45,z:0})>.98);
 assert.equal(smokeCameraDensity([gone],{x:0,y:1.45,z:0}),0);
});
test("smoke has no damage payload or collisions and overlapping clouds increase occlusion",()=>{
 const first=cloudAtAge({id:1,x:0,y:1.5,z:0},4);
 const second=cloudAtAge({id:2,x:0,y:1.5,z:0},4);
 const eye={x:0,y:1.5,z:0};
 const one=smokeCameraDensity([first],eye),both=smokeCameraDensity([first,second],eye);
 assert.ok(one>0&&both>=one&&both<=1);
 assert.equal(smokeCameraDensity([first],{x:20,y:1.5,z:20}),0);
 assert.equal(smokeCameraDensity([first],{x:NaN,y:1.5,z:0}),0);
 assert.equal(smokeCameraDensity([],eye),0);
 assert.equal("damage" in first,false);
});
test("smoke state keeps old clouds while a second charge throws and prunes expired clouds",()=>{
 let state=throwSmoke(newSmokeState(),player).state;
 for(let i=0;i<36;i++)state=tickSmoke(state,.05).state;
 state=throwSmoke(state,player).state;
 assert.equal(state.devices.length,1);
 assert.equal(state.clouds.length,1);
 for(let i=0;i<36;i++)state=tickSmoke(state,.05).state;
 assert.equal(state.clouds.length,2);
 for(let i=0;i<400;i++)state=tickSmoke(state,.05).state;
 assert.equal(state.clouds.length,0);
 assert.equal(state.devices.length,0);
 assert.equal(state.charges,0);
});
test("smoke freezes on invalid dt without generating extra clouds",()=>{
 const state=throwSmoke(newSmokeState(),player).state;
 assert.equal(tickSmoke(state,0).state,state);
 assert.equal(tickSmoke(state,NaN).state,state);
});
