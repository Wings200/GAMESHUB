import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const entry=source("../index.html");
const runtime=source("./main.js");
const lobby=source("./network-lobby.js");
const peers=source("./remote-operators.js");
const server=source("../multiplayer-room.js");
const protocol=source("../src/multiplayer-protocol.js");

test("one BLACKOUT renderer owns both original solo testing and connected multiplayer",()=>{
 assert.match(entry,/reboot\/main\.js\?v=reboot-074/);
 assert.doesNotMatch(entry,/<script[^>]*online-multiplayer\.js/);
 assert.match(runtime,/createHouseView\(THREE,scene\)/);
 assert.match(runtime,/createBlackoutNetwork\(/);
 assert.match(runtime,/remoteOperators\.sync\(/);
 assert.match(runtime,/setMapMode\("house"\)/);
 assert.doesNotMatch(lobby,/<canvas/i,"room lobby must not render a replacement game");
 assert.doesNotMatch(lobby,/new THREE\./);
});
test("custom lobby, online lobby, and solo test remain separate controls",()=>{
 for(const id of ["custom-choice","online-choice","solo-choice"])
  assert.match(entry,new RegExp("id=\\\""+id+"\\\""));
 assert.match(runtime,/onlineSession\.open\("custom"\)/);
 assert.match(runtime,/onlineSession\.open\("standard"\)/);
 assert.match(runtime,/\$\("solo-choice"\)/);
});
test("connected physics and shooting originate from original game runtime",()=>{
 assert.match(runtime,/player=stepPlayer\(player,input,dt,obstacles/);
 assert.match(runtime,/onlineSession\.sendMovement\(player,now/);
 assert.match(runtime,/onlineSession\.send\(\{type:"shot",targetId,targetDrone\}\)/);
 assert.match(runtime,/remoteOperators\.shootables\(\)/);
 assert.match(runtime,/onlineSession\.sendDrone\(drone,input,now\)/);
 assert.match(runtime,/registerPhysicalDrone\(\{\.\.\.newDrone\(prepDrone\.x/);
 assert.match(peers,/onlinePlayerId/);
 assert.match(server,/validShot\(p,target,wallParts\(matchMap,this\.world\)\)/);
});
test("server accepts only original playable generalists, not old Ironvale operators",()=>{
 assert.match(protocol,/striker:"attacker",sentry:"defender"/);
 assert.doesNotMatch(protocol,/sledge:"attacker"/);
 assert.match(server,/side==="defender"\s*\?\s*"sentry":"striker"/);
});
test("network room creator checks existing developer access before connecting",()=>{
 assert.match(lobby,/fetch\("\/api\/blackout-access"/);
 assert.match(lobby,/BLACKOUT developer access required/);
 assert.match(lobby,/BLACKOUT_WORKER/);
});

test("remote attacker drones and objective interactions render in the original scene",()=>{
 assert.match(runtime,/remoteDrones\.sync\(snapshot\.players,snapshot\.id\)/);
 assert.match(runtime,/onlineSession\.send\(\{type:"drone-throw"\}\)/);
 assert.match(server,/if\(m\.type==="drone-throw"\)/);
 assert.match(runtime,/remoteDrones\.shootables\(\)/);
 assert.match(runtime,/onlineDroneOwnerId/);
 assert.match(runtime,/remoteObjectiveAudio\.sync\(snapshot,player\)/);
 assert.match(runtime,/remoteOperators\.sync\(snapshot\.players,snapshot\.id,snapshot\.phase,snapshot\.world\)/);
});
