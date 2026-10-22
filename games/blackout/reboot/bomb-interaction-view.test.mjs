import test from "node:test";
import assert from "node:assert/strict";
import {PLANT_MOTION,plantInteractionPhase,COUNTER_DEFUSE_MOTION,
 counterDefusePhase} from "./bomb-interaction-view.js";
import {BOMB_RULES} from "./bomb-round.js";

test("plant animation puts terminal down, opens it, then types",()=>{
 assert.equal(PLANT_MOTION.plantSeconds,BOMB_RULES.plantSeconds);
 assert.equal(plantInteractionPhase(0),"placing");
 assert.equal(plantInteractionPhase(.5/7.35),"placing");
 assert.equal(plantInteractionPhase(.75/7.35),"opening");
 assert.equal(plantInteractionPhase(1.25/7.35),"typing");
 assert.equal(plantInteractionPhase(1),"typing");
});
test("defender draws a separate tablet before its full seven-second override",()=>{
 assert.equal(COUNTER_DEFUSE_MOTION.disableSeconds,BOMB_RULES.disableSeconds);
 assert.equal(counterDefusePhase(0),"drawing");
 assert.equal(counterDefusePhase(.4/7),"drawing");
 assert.equal(counterDefusePhase(.5/7),"overriding");
 assert.equal(counterDefusePhase(1),"overriding");
});
