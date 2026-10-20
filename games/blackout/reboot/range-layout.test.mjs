import test from "node:test";
import assert from "node:assert/strict";
import {TARGET_POSITIONS,isLineOfSightClear} from "./range-layout.js";
import {TEST_OBSTACLES} from "./physics.js";

test("four target positions are inside the 60m test range",()=>{
 assert.equal(TARGET_POSITIONS.length,4);
 assert.ok(TARGET_POSITIONS.every(([x,z])=>Math.abs(x)<30&&Math.abs(z)<30));
});
test("video user's eye line to former yellow target was physically obstructed",()=>{
 const eye={x:1.1,y:1.65,z:-3.2};
 assert.equal(isLineOfSightClear(eye,{x:13,y:1.99,z:-23},TEST_OBSTACLES),false);
});
test("yellow target head is now exposed from recorded firing position",()=>{
 const eye={x:1.1,y:1.65,z:-3.2},[x,z]=TARGET_POSITIONS[3];
 assert.equal(isLineOfSightClear(eye,{x,y:1.99,z},TEST_OBSTACLES),true);
});
test("occlusion test considers the height of near low crates",()=>{
 const eye={x:0,y:1.65,z:8};
 assert.equal(isLineOfSightClear(eye,{x:0,y:1.99,z:-20},[
  {x:0,z:-4,width:5,depth:1,height:1.35}
 ]),true);
 assert.equal(isLineOfSightClear(eye,{x:0,y:1.99,z:-20},[
  {x:0,z:-4,width:5,depth:1,height:3}
 ]),false);
});
