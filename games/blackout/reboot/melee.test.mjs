import test from "node:test";
import assert from "node:assert/strict";
import {MELEE,canPunch,meleeTarget,selectedMeleeTarget} from "./melee.js";
test("V punches have bounded reach and deliberate repeat cooldown",()=>{
 assert.equal(MELEE.range,2.25);
 assert.equal(canPunch(1000),true);
 assert.equal(canPunch(1100,1000),false);
 assert.equal(canPunch(1550,1000),false);
 assert.equal(canPunch(1570,1000),true);
 assert.equal(canPunch(NaN),false);
});
test("V chooses only closest accessible destructible, cannot hit beyond a solid wall",()=>{
 const wood={distance:1.6,object:{userData:{barricadeIndex:1}}};
 const wire={distance:1.4,object:{userData:{wireId:2}}};
 const wall={distance:1,object:{userData:{physicsObstacleId:"wall-one"}}};
 assert.deepEqual(meleeTarget(wood),{kind:"barricade",index:1});
 assert.deepEqual(meleeTarget(wire),{kind:"wire",id:2});
 assert.deepEqual(selectedMeleeTarget([wood,wire]),{kind:"wire",id:2});
 assert.deepEqual(selectedMeleeTarget([wire,wall]),{kind:"blocked"});
 assert.deepEqual(selectedMeleeTarget([{...wire,distance:4}]),{kind:"miss"});
 assert.deepEqual(selectedMeleeTarget([]),{kind:"miss"});
});
