import test from "node:test";
import assert from "node:assert/strict";
import {normalizeRoomCode,roomSocketUrl,moveOnlinePlayer,blendPosition,
 selectShotTarget} from "./online-state.js";

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