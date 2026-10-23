import test from "node:test";
import assert from "node:assert/strict";
import {newDrone,tickDrone} from "./drone-physics.js";
import {HOUSE,houseFloorAt,HOUSE_BLOCKERS} from "./house-layout.js";

test("drone can drive up the real house staircase and land at second-floor height",()=>{
 let d=newDrone(1.05,-4.5,0);
 for(let i=0;i<250;i++){
  d=tickDrone(d,{forward:1,floorAt:houseFloorAt},1/60,HOUSE_BLOCKERS);
  if(d.z<-12.2)break;
 }
 assert.ok(d.z<-12.2,"drone should clear the stair exit");
 assert.ok(Math.abs(d.y-HOUSE.floorHeight)<.04,"drone should reach the 2F landing");
 assert.equal(d.grounded,true);
});

test("drone driving in beneath a mid-stair tread stays on the ground floor",()=>{
 let d=newDrone(-.45,-8,0);
 for(let i=0;i<44;i++)d=tickDrone(d,
  {right:1,floorAt:houseFloorAt},1/60,[]);
 assert.ok(d.x>HOUSE.stairs.minX+.15,"drone enters the space under the stairs");
 assert.equal(d.y,0,"crossing the stair footprint sideways must not raise the drone");
 assert.equal(d.grounded,true);
});

test("drone jumping underneath the staircase hits its underside and lands below",()=>{
 let d=newDrone(1.05,-8,0);
 let peak=0;
 for(let i=0;i<125;i++){
  d=tickDrone(d,{jumpPressed:i===0,floorAt:houseFloorAt},1/60,[]);
  peak=Math.max(peak,d.y);
 }
 const underside=houseFloorAt(1.05,-8,0);
 assert.ok(peak+0.25<=underside+.02,"jump must not phase through the stair underside");
 assert.equal(d.y,0,"falling under stairs must not snap drone onto ramp");
 assert.equal(d.grounded,true);
});
