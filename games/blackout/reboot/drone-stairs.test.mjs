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
