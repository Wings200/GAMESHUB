import test from "node:test";
import assert from "node:assert/strict";
import {DRONE_ROSTER_LIMIT,newDroneRoster,cameraRequest,throwRequest,spareRequest,
 registerDrone,selectDrone,updateDrone,selectedDrone,droneEquipmentStatus}
 from "./drone-roster.js";

test("5 only opens deployed cameras; no drones means no view and no throw",()=>{
 const initial=newDroneRoster("range");
 assert.equal(DRONE_ROSTER_LIMIT,2);
 assert.equal(cameraRequest(initial).action,"none");
 assert.match(cameraRequest(initial).reason,/PRESS 6 TO THROW/);
 assert.equal(droneEquipmentStatus(initial).throwables,2);
 assert.equal(droneEquipmentStatus(initial).cameras,0);
 assert.equal(initial.drones.length,0);
});
test("testing range 6 throws twice, but never a third; 5 never spends inventory",()=>{
 let roster=newDroneRoster("range");
 assert.deepEqual(throwRequest(roster),{action:"throw-only",kind:"initial"});
 const first={id:"first",charges:2,x:12};
 roster=registerDrone(roster,first,throwRequest(roster).kind);
 assert.deepEqual(cameraRequest(roster),{action:"open",index:0});
 assert.equal(droneEquipmentStatus(roster).throwables,1);
 assert.deepEqual(throwRequest(roster),{action:"throw-only",kind:"spare"});
 const second={id:"second",charges:3,x:17};
 roster=registerDrone(roster,second,throwRequest(roster).kind);
 assert.equal(roster.drones.length,2);
 assert.equal(droneEquipmentStatus(roster).throwables,0);
 assert.equal(droneEquipmentStatus(roster).cameras,2);
 assert.equal(throwRequest(roster).action,"none");
 assert.deepEqual(roster.drones,[first,second]);
 assert.equal(spareRequest(roster).action,"none");
});
test("future match: one prep drone available in prep, one spare available in action",()=>{
 let roster=newDroneRoster("match");
 assert.equal(throwRequest(roster,"prep").kind,"initial");
 assert.equal(throwRequest(roster,"action").kind,"spare");
 assert.equal(droneEquipmentStatus(roster,"prep").throwables,1);
 assert.equal(droneEquipmentStatus(roster,"action").throwables,1);
 assert.equal(throwRequest(roster,"range").action,"blocked");
 roster=registerDrone(roster,{id:"prep",charges:3},"initial");
 assert.equal(throwRequest(roster,"prep").action,"none");
 assert.equal(droneEquipmentStatus(roster,"action").throwables,1);
 assert.equal(cameraRequest(roster).action,"open");
 roster=registerDrone(roster,{id:"action",charges:3},"spare");
 assert.equal(throwRequest(roster,"action").action,"none");
 assert.equal(droneEquipmentStatus(roster,"action").throwables,0);
});
test("Q/E cycles between independent deployed drone cameras",()=>{
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
test("cannot duplicate used drones, invent a third, or silently reset boosts",()=>{
 let roster=newDroneRoster();
 roster=registerDrone(roster,{id:"a",charges:1},"initial");
 assert.equal(registerDrone(roster,{id:"duplicate"},"initial"),roster);
 roster=registerDrone(roster,{id:"b",charges:2},"spare");
 assert.equal(registerDrone(roster,{id:"third"},"spare"),roster);
 assert.equal(roster.drones.length,2);
 assert.deepEqual(roster.drones.map(d=>d.charges),[1,2]);
 assert.equal(droneEquipmentStatus(roster).throwables,0);
});
