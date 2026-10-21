import test from "node:test";
import assert from "node:assert/strict";
import {STRUCTURAL_BLASTS,canDamageStructures,resolveStructuralBlast} from "./blast-policy.js";
import {FRAG} from "./frag.js";
import {IMPACT} from "./impact.js";
import {NITRO,nitroBlastDamage,nitroBlastIsLethal} from "./nitro.js";

test("only impact and C4 are structural explosions; frag never breaks walls",()=>{
 assert.deepEqual(STRUCTURAL_BLASTS,["IMPACT","C4"]);
 for(const id of ["FRAG","FLASH","SMOKE","invalid",null,undefined]){
  assert.equal(canDamageStructures(id),false);
 }
 assert.equal(canDamageStructures("IMPACT"),true);
 assert.equal(canDamageStructures("C4"),true);
});
test("frag structure callbacks are never invoked, even when directly beside wood and gypsum",()=>{
 let wooden=0,soft=0;
 const actions={woodBlast:()=>{wooden++;return 5;},
  gypsumBlast:()=>{soft++;return 24;}};
 for(let i=0;i<3;i++){
  assert.deepEqual(resolveStructuralBlast("FRAG",actions),{wood:0,gypsum:0});
 }
 assert.equal(wooden,0);
 assert.equal(soft,0);
});
test("impact still breaks both wood and unreinforced gypsum",()=>{
 let wooden=0,soft=0;
 const result=resolveStructuralBlast("IMPACT",{
  woodBlast:()=>{wooden++;return 3;},
  gypsumBlast:()=>{soft++;return 8;}
 });
 assert.deepEqual(result,{wood:3,gypsum:8});
 assert.equal(wooden,1);
 assert.equal(soft,1);
});
test("impact and C4 cannot breach reinforced gypsum and still damage unprotected wood",()=>{
 for(const label of ["IMPACT","C4"]){
  let soft=0;
  assert.deepEqual(resolveStructuralBlast(label,{
   woodBlast:()=>6,
   gypsumBlast:()=>{soft++;return 24;},
   reinforced:true
  }),{wood:6,gypsum:0});
  assert.equal(soft,0);
 }
});
test("frag retains lethal player damage and falloff after structural nerf",()=>{
 const frag={x:0,y:1,z:0,radius:FRAG.radius,
  damage:FRAG.blastDamage,fullDamageRadius:FRAG.fullDamageRadius,
  lethalRadius:FRAG.lethalRadius};
 assert.equal(nitroBlastIsLethal(frag,{x:.5,y:1,z:0}),true);
 assert.equal(nitroBlastDamage(frag,{x:.5,y:1,z:0}),FRAG.blastDamage);
 assert.ok(nitroBlastDamage(frag,{x:FRAG.radius-.4,y:1,z:0})>0);
 assert.equal(nitroBlastDamage(frag,{x:FRAG.radius,y:1,z:0}),0);
});
test("impact retains the same 2m radius, 60 HP peak and target damage",()=>{
 const impact={x:0,y:1,z:0,radius:IMPACT.radius,
  damage:IMPACT.blastDamage,fullDamageRadius:IMPACT.fullDamageRadius};
 assert.equal(IMPACT.radius,2);
 assert.equal(nitroBlastDamage(impact,{x:.3,y:1,z:0}),60);
 assert.equal(nitroBlastIsLethal(impact,{x:.3,y:1,z:0}),false);
 assert.equal(nitroBlastDamage(impact,{x:2.1,y:1,z:0}),0);
 assert.ok(NITRO.radius>IMPACT.radius);
});
