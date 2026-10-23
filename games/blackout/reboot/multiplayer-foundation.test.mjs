import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
import {DRONE,canDroneOccupy} from "./drone-physics.js";
import {BARRICADE,createBarricadeState,barricadeBlockers} from "./barricade.js";
import {HOUSE_BLOCKERS} from "./house-layout.js";
import {newDroneRoster,registerDrone,removeDrone,selectedDrone,throwRequest,cameraRequest} from "./drone-roster.js";

test("intact wood barricade has genuine floor clearance for reconnaissance drones",()=>{
 const solids=barricadeBlockers(createBarricadeState());
 const first=solids.find(s=>s.id.endsWith("-board-0"));
 assert.ok(first.bottom>DRONE.height+.08);
 assert.equal(canDroneOccupy(BARRICADE.x,0,BARRICADE.z,solids),true);
 assert.equal(canDroneOccupy(BARRICADE.x,.36,BARRICADE.z,solids),false,
  "raised drone collides with the intact wood boards");
});

test("house has real traversable under-wall drone ports",()=>{
 const ports=HOUSE_BLOCKERS.filter(s=>s.kind==="drone-lintel"&&s.bottom<1);
 assert.ok(ports.length>=4,"ground floor exposes multiple drone routes");
 assert.equal(canDroneOccupy(-2,0,-12.6,HOUSE_BLOCKERS),true);
 assert.equal(canDroneOccupy(-10,0,-12.6,HOUSE_BLOCKERS),true);
});

test("destroyed drone disappears from all camera selection without refunding throws",()=>{
 let roster=newDroneRoster();
 roster=registerDrone(roster,{id:"a"},"initial");
 roster=registerDrone(roster,{id:"b"},"spare");
 roster=removeDrone(roster,0);
 assert.equal(roster.drones.length,1);
 assert.equal(selectedDrone(roster).id,"b");
 assert.equal(cameraRequest(roster).action,"open");
 assert.equal(throwRequest(roster,"range").action,"none");
 roster=removeDrone(roster,0);
 assert.equal(cameraRequest(roster).action,"none");
 assert.equal(roster.selected,-1);
});

test("main menu and firearm interaction expose honest feature state",()=>{
 const directory=dirname(fileURLToPath(import.meta.url));
 const html=readFileSync(join(directory,"../index.html"),"utf8");
 const main=readFileSync(join(directory,"main.js"),"utf8");
 assert.match(html,/TRAINING · DEPLOYMENT SETUP/);
 assert.match(html,/TACTICAL AI/);
 assert.match(html,/ONLINE 5v5/);
 assert.match(html,/Not connected yet/);
 assert.match(main,/shootableDrones\(\)/);
 assert.match(main,/destroyPhysicalDrone\(droneIndex\)/);
});
