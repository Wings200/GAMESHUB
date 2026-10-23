import test from "node:test";
import assert from "node:assert/strict";
import {recordRecoilKick,consumeManualRecoil} from "./recoil-compensation.js";

test("pulling down by the recoil amount cancels automatic downward recovery",()=>{
 const pending=recordRecoilKick(0,0,.06);
 assert.equal(consumeManualRecoil(pending,.06,0),0);
});

test("only the portion the player has not compensated may recover",()=>{
 const pending=recordRecoilKick(0,0,.08);
 assert.ok(Math.abs(consumeManualRecoil(pending,.08,.05)-.05)<1e-9);
});

test("looking upward does not consume recovery and pitch-clamped kicks do not add any",()=>{
 assert.equal(consumeManualRecoil(.06,.2,.3),.06);
 assert.equal(recordRecoilKick(.06,1.48,1.48),.06);
});
