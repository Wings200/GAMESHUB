import test from "node:test";
import assert from "node:assert/strict";
import {BARRICADE_BLASTS,SOFT_WALL_BLASTS,canDamageBarricades,
 canDamageSoftWalls,resolveStructuralBlast} from "./blast-policy.js";
import {FRAG} from "./frag.js";
import {IMPACT} from "./impact.js";
import {NITRO,nitroBlastDamage,nitroBlastIsLethal} from "./nitro.js";

test("frag destroys barricades but not soft walls; impact/C4 destroy both",()=>{
 assert.deepEqual(BARRICADE_BLASTS,["FRAG","IMPACT","C4","SOFT BREACH"]);
 assert.deepEqual(SOFT_WALL_BLASTS,["IMPACT","C4","SOFT BREACH","HARD BREACH"]);
 for(const label of ["FRAG","IMPACT","C4","SOFT BREACH"])assert.equal(canDamageBarricades(label),true);
 assert.equal(canDamageSoftWalls("FRAG"),false);
 assert.equal(canDamageSoftWalls("IMPACT"),true);
 assert.equal(canDamageSoftWalls("C4"),true);
 for(const label of ["FLASH","SMOKE","invalid",null,undefined]){
  assert.equal(canDamageBarricades(label),false);
  assert.equal(canDamageSoftWalls(label),false);
 }
});
test("frag calls barricade destruction on every blast but never gypsum destruction",()=>{
 let wooden=0,soft=0;
 const actions={woodBlast:()=>{wooden++;return 5;},
  gypsumBlast:()=>{soft++;return 24;}};
 for(let i=0;i<3;i++){
  assert.deepEqual(resolveStructuralBlast("FRAG",actions),{wood:5,gypsum:0});
 }
 assert.equal(wooden,3);
 assert.equal(soft,0);
});
test("impact grenade still damages wood and unreinforced soft walls",()=>{
 let wooden=0,soft=0;
 assert.deepEqual(resolveStructuralBlast("IMPACT",{
  woodBlast:()=>{wooden++;return 3;},
  gypsumBlast:()=>{soft++;return 8;}
 }),{wood:3,gypsum:8});
 assert.equal(wooden,1);
 assert.equal(soft,1);
});
test("reinforcement blocks gypsum destruction without preventing wooden barricade splintering",()=>{
 for(const label of ["FRAG","IMPACT","C4","SOFT BREACH"]){
  let soft=0;
  assert.deepEqual(resolveStructuralBlast(label,{
   woodBlast:()=>6,
   gypsumBlast:()=>{soft++;return 24;},
   reinforced:true
  }),{wood:6,gypsum:0});
  assert.equal(soft,0);
 }
});
test("flash/smoke never call destruction functions even when next to destructibles",()=>{
 for(const label of ["FLASH","SMOKE"]){
  assert.deepEqual(resolveStructuralBlast(label,{
   woodBlast:()=>{throw new Error("no barricade blast allowed");},
   gypsumBlast:()=>{throw new Error("no soft wall blast allowed");}
  }),{wood:0,gypsum:0});
 }
});
test("frag still causes lethal player damage and radial falloff independently of wall policy",()=>{
 const blast={x:0,y:1,z:0,radius:FRAG.radius,
  damage:FRAG.blastDamage,fullDamageRadius:FRAG.fullDamageRadius,
  lethalRadius:FRAG.lethalRadius};
 assert.equal(nitroBlastIsLethal(blast,{x:.5,y:1,z:0}),true);
 assert.equal(nitroBlastDamage(blast,{x:.5,y:1,z:0}),FRAG.blastDamage);
 assert.ok(nitroBlastDamage(blast,{x:FRAG.radius-.4,y:1,z:0})>0);
 assert.equal(nitroBlastDamage(blast,{x:FRAG.radius,y:1,z:0}),0);
});
test("impact stays 2m radius, 60 HP max and C4 keeps its own stronger blast",()=>{
 const impact={x:0,y:1,z:0,radius:IMPACT.radius,
  damage:IMPACT.blastDamage,fullDamageRadius:IMPACT.fullDamageRadius};
 assert.equal(IMPACT.radius,2);
 assert.equal(nitroBlastDamage(impact,{x:.3,y:1,z:0}),60);
 assert.equal(nitroBlastIsLethal(impact,{x:.3,y:1,z:0}),false);
 assert.equal(nitroBlastDamage(impact,{x:2.1,y:1,z:0}),0);
 assert.ok(NITRO.radius>IMPACT.radius);
});

test("soft breach charges intentionally destroy both barricades and unreinforced gypsum",()=>{
 let wood=0,gypsum=0;
 assert.equal(canDamageBarricades("SOFT BREACH"),true);
 assert.equal(canDamageSoftWalls("SOFT BREACH"),true);
 assert.deepEqual(resolveStructuralBlast("SOFT BREACH",{
  woodBlast:()=>{wood++;return 6;},
  gypsumBlast:()=>{gypsum++;return 217;}
 }),{wood:6,gypsum:217});
 assert.equal(wood,1);
 assert.equal(gypsum,1);
 assert.deepEqual(resolveStructuralBlast("SOFT BREACH",{
  woodBlast:()=>4,
  gypsumBlast:()=>{throw Error("reinforced steel cannot be damaged");},
  reinforced:true
 }),{wood:4,gypsum:0});
});

test("Hard Breach destroys gypsum but not barricades; steel cutting is a separate guarded action",()=>{
 assert.equal(canDamageBarricades("HARD BREACH"),false);
 assert.equal(canDamageSoftWalls("HARD BREACH"),true);
 let wood=0,gypsum=0;
 assert.deepEqual(resolveStructuralBlast("HARD BREACH",{
  woodBlast:()=>{wood++;return 6;},
  gypsumBlast:()=>{gypsum++;return 280;}
 }),{wood:0,gypsum:280});
 assert.equal(wood,0);assert.equal(gypsum,1);
 assert.deepEqual(resolveStructuralBlast("HARD BREACH",{
  gypsumBlast:()=>{throw Error("steel should protect uncut gypsum");},
  reinforced:true
 }),{wood:0,gypsum:0});
});
