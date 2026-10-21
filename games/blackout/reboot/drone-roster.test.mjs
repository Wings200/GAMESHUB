import test from "node:test";
import assert from "node:assert/strict";
import {DRONE_ROSTER_LIMIT,newDroneRoster,cameraRequest,spareRequest,
 registerDrone,selectDrone,updateDrone,selectedDrone,droneEquipmentStatus}
 from "./drone-roster.js";
test("5 autothrows first camera drone only if zero are deployed",()=>{
 const roster=newDroneRoster();
 assert.equal(DRONE_ROSTER_LIMIT,2);
 assert.equal(cameraRequest(roster).action,"throw-first-and-open");
 const first={id:1,charges:2,x:12};
 const deployed=registerDrone(roster,first,"initial");
 assert.equal(cameraRequest(deployed).action,"open");
 assert.equal(cameraRequest(deployed).index,0);
 assert.equal(droneEquipmentStatus(deployed).spare,1);
 assert.equal(droneEquipmentStatus(deployed).cameras,1);
 assert.equal(roster.drones.length,0,"immutable resource tracking");
});
test("6 throws post-prep spare; cannot spend it twice",()=>{
 let roster=newDroneRoster();
 assert.equal(spareRequest(roster,"prep").action,"blocked");
 assert.equal(spareRequest(roster,"range").action,"throw-only");
 roster=registerDrone(roster,{id:"spare",charges:3},"spare");
 assert.equal(spareRequest(roster).action,"none");
 assert.equal(droneEquipmentStatus(roster).spare,0);
 assert.equal(cameraRequest(roster).action,"open");
 assert.equal(roster.initialUsed,false,"initial drone remains independently unspent");
});
test("Q/E camera selection cycles two persistent real drones",()=>{
 const first={id:"prep",x:5,charges:1};
 const second={id:"spare",x:17,charges:3};
 let roster=registerDrone(newDroneRoster(),first,"initial");
 roster=registerDrone(roster,second,"spare");
 assert.equal(selectedDrone(roster),second);
 roster=selectDrone(roster,-1);
 assert.equal(selectedDrone(roster),first);
 roster=selectDrone(roster,-1);
 assert.equal(selectedDrone(roster),second);
 roster=updateDrone(roster,0,{...first,charges:2});
 assert.equal(selectedDrone(selectDrone(roster,-1)).charges,2);
 assert.equal(roster.drones[1],second,"other camera/drone remains unchanged");
});
test("cannot create third drone or duplicate initial/spare",()=>{
 let roster=newDroneRoster();
 roster=registerDrone(roster,{id:"a"},"initial");
 assert.equal(registerDrone(roster,{id:"duplicate"},"initial"),roster);
 roster=registerDrone(roster,{id:"b"},"spare");
 assert.equal(registerDrone(roster,{id:"c"},"spare"),roster);
 assert.equal(roster.drones.length,2);
 assert.equal(droneEquipmentStatus(roster).spare,0);
});
