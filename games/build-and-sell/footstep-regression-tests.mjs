import assert from "node:assert/strict";
import {footSurface} from "./footstep-math.mjs";
const site={"layout":{"x1":0,"z1":0,"x2":4,"z2":4},"poured":[0,1,2],"gravel":[0,3],"flooring":[{"tile":1,"kind":"hardwood"},{"tile":2,"kind":"carpet"}],"storyPlan":{"x1":0,"z1":0,"x2":4,"z2":4,"height":3,"hole":{"x1":0,"z1":1,"x2":1,"z2":2}},"upperFlooring":[{"tile":1,"kind":"carpet"}]};
const landscape=[{"x":5.5,"z":0.5,"kind":"grass"},{"x":6.5,"z":0.5,"kind":"drive"}];
for(const [x,z,levelY,expected] of [[0.5,0.5,0,"concrete"],[1.5,0.5,0,"wood"],[2.5,0.5,0,"carpet"],[3.5,0.5,0,"gravel"],[0.5,2.5,0,"dirt"],[5.5,0.5,0,"grass"],[6.5,0.5,0,"concrete"],[1.5,0.5,3,"carpet"],[0.5,1.5,1.5,"wood"]])assert.equal(footSurface({x,z,levelY},[site],landscape),expected);
console.log("Nine surface classification tests passed");
