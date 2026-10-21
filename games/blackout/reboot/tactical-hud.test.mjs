import test from "node:test";
import assert from "node:assert/strict";
import {DRILL_LENGTH_SECONDS,drillClock,compassHeading,areaName,drawTrainingMap} from "./tactical-hud.js";

test("60-minute live-fire clock counts down and clamps at zero",()=>{
 assert.equal(DRILL_LENGTH_SECONDS,3600);
 assert.equal(drillClock(3600),"60:00");
 assert.equal(drillClock(3592),"59:52");
 assert.equal(drillClock(61),"01:01");
 assert.equal(drillClock(-4),"00:00");
});
test("compass headings follow real camera yaw without using decorative guessed headings",()=>{
 assert.equal(compassHeading(0),0);
 assert.equal(compassHeading(-Math.PI/2),90);
 assert.equal(compassHeading(-Math.PI),180);
 assert.equal(compassHeading(Math.PI/2),270);
 assert.equal(compassHeading(Math.PI*4),0);
});
test("labels are grounded in actual test-station positions",()=>{
 assert.equal(areaName(0,8),"EXT TEST RANGE");
 assert.equal(areaName(-12,-6),"EXT WEST COVER");
 assert.equal(areaName(12,-6),"EXT EAST COVER");
 assert.equal(areaName(0,-25),"EXT TARGET RANGE");
 assert.equal(areaName(0,16),"EXT SPAWN AREA");
});
test("minimap draws real walls, targets and player without modifying game objects",()=>{
 const instructions=[];
 const ctx={
  canvas:{width:200,height:200},
  clearRect(...a){instructions.push(["clearRect",...a])},
  fillRect(...a){instructions.push(["fillRect",...a])},
  beginPath(){instructions.push(["beginPath"])},
  moveTo(...a){instructions.push(["moveTo",...a])},
  lineTo(...a){instructions.push(["lineTo",...a])},
  stroke(){instructions.push(["stroke"])},
  arc(...a){instructions.push(["arc",...a])},
  fill(){instructions.push(["fill"])},
  save(){instructions.push(["save"])},
  restore(){instructions.push(["restore"])},
  translate(...a){instructions.push(["translate",...a])},
  rotate(...a){instructions.push(["rotate",...a])},
  closePath(){instructions.push(["closePath"])},
 };
 const player={x:0,z:8,yaw:Math.PI/2},obstacles=[{id:"box-one",x:-12,z:-6,width:2.3,depth:2.3}];
 const targets=[{group:{position:{x:7,z:-17}},downTime:0}];
 drawTrainingMap(ctx,player,obstacles,targets);
 assert.ok(instructions.filter(x=>x[0]==="fillRect").length>=2);
 assert.ok(instructions.some(x=>x[0]==="translate"&&x[1]===100&&x[2]>100));
 assert.ok(instructions.some(x=>x[0]==="arc"));
 assert.equal(player.yaw,Math.PI/2);
});
