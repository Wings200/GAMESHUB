import test from "node:test";
import assert from "node:assert/strict";
import {normalizeRoomCode,roomSocketUrl,moveOnlinePlayer,blendPosition,
 selectShotTarget} from "./online-state.js";
import {acceptMovement,validShot} from "./src/multiplayer-protocol.js";

test("private room codes reject malformed or ambiguous characters",()=>{
 assert.equal(normalizeRoomCode(" ab-cd23 "),"ABCD23");
 assert.equal(normalizeRoomCode("OOOOOO"),null);
 assert.equal(normalizeRoomCode("123"),null);
 assert.equal(normalizeRoomCode("<script>"),null);
});
test("WebSocket setup escapes player names and identifies a real room",()=>{
 const u=new URL(roomSocketUrl("ABC234",
   {side:"defender",name:"Sarah <3",operator:"mute"}));
 assert.equal(u.protocol,"wss:");
 assert.equal(u.pathname,"/api/blackout/rooms/ABC234/ws");
 assert.equal(u.searchParams.get("side"),"defender");
 assert.equal(u.searchParams.get("name"),"Sarah 3");
});
test("WASD advances locally while respecting structural collisions",()=>{
 const p={x:0,y:0,z:0,yaw:0,pitch:0};
 const moved=moveOnlinePlayer(p,new Set(["KeyW"]),.05);
 assert.ok(moved.z<-.18&&moved.z>-.22);
 const wall=[{type:"hardWall",position:{x:0,y:0,z:-.45},
   size:{x:2,y:3,z:.24},rotationY:0}];
 const blocked=moveOnlinePlayer(p,new Set(["KeyW"]),.05,wall);
 assert.equal(blocked.z,0);
 assert.deepEqual(p,{x:0,y:0,z:0,yaw:0,pitch:0});
});
test("remote mesh interpolation is bounded",()=>{
 assert.deepEqual(blendPosition({x:0,y:0,z:0},{x:10,y:4,z:-4},.5),
   {x:5,y:2,z:-2});
});
test("shot target selection never chooses a teammate",()=>{
 const self={id:"1",side:"attacker",x:0,y:0,z:0,yaw:0,pitch:0};
 const all=[{id:"2",side:"attacker",x:0,y:0,z:-5,alive:true},
  {id:"3",side:"defender",x:0,y:0,z:-6,alive:true}];
 assert.equal(selectShotTarget(self,all),"3");
});
test("ADS, crouch and sprint use the matching Training stance speeds",()=>{
 const p={x:0,y:0,z:0,yaw:0,pitch:0};
 const f=new Set(["KeyW"]),sprint=new Set(["KeyW","ShiftLeft"]),crouch=new Set(["KeyW","KeyC"]);
 assert.ok(Math.abs(moveOnlinePlayer(p,f,.05).z+.20)<.001);
 assert.ok(Math.abs(moveOnlinePlayer(p,f,.05,[],{aiming:true}).z+.155)<.001);
 assert.ok(Math.abs(moveOnlinePlayer(p,crouch,.05).z+.1025)<.001);
 assert.ok(Math.abs(moveOnlinePlayer(p,sprint,.05).z+.305)<.001);
 assert.ok(Math.abs(moveOnlinePlayer(p,sprint,.05,[],{aiming:true}).z+.155)<.001);
});
test("Worker rejects crouch speed hacks and off-axis shots",()=>{
 const before={x:0,y:0,z:0,yaw:0,pitch:0};
 const attempt={...before,z:-.34,crouched:true};
 assert.equal(acceptMovement(before,attempt,.05),null);
 assert.ok(acceptMovement(before,{...attempt,crouched:false},.05));
 const target={x:0,y:0,z:-8,side:"defender",alive:true};
 const shooter={...before,side:"attacker",alive:true,aiming:true};
 assert.equal(validShot(shooter,target),true);
 assert.equal(validShot({...shooter,pitch:-1},target),false);
 assert.equal(validShot({...shooter,yaw:1},target),false);
 const wall=[{type:"hardWall",position:{x:0,y:0,z:-4},
   size:{x:3,y:3,z:.3}}];
 assert.equal(validShot(shooter,target,wall),false);
});
