import test from "node:test";
import assert from "node:assert/strict";
import {HOUSE,HOUSE_BLOCKERS,houseFloorAt,houseRoomAt} from "./house-layout.js";
import {initialPlayer,stepPlayer,canOccupy,STAND_HEIGHT} from "./physics.js";
import {BOMB_RULES,newBombRound,roundSiteAt,stepBombRound} from "./bomb-round.js";
import {liveBombInteraction} from "./bomb-presentation.js";

test("house is an actual collidable two-level building with doors and windows",()=>{
 assert.ok(HOUSE_BLOCKERS.length>75);
 assert.ok(HOUSE_BLOCKERS.some(b=>b.bottom>=HOUSE.floorHeight&&b.kind==="wall"));
 assert.ok(HOUSE_BLOCKERS.some(b=>b.kind==="slab"));
 assert.ok(HOUSE_BLOCKERS.some(b=>b.kind==="window-sill"));
 assert.ok(HOUSE_BLOCKERS.some(b=>b.kind==="door-lintel"));
 assert.equal(canOccupy(0,0,-2,STAND_HEIGHT,HOUSE_BLOCKERS),true,
  "front door connects the front yard to the central hall");
 assert.equal(canOccupy(4,0,-2,STAND_HEIGHT,HOUSE_BLOCKERS),false,
  "front solid wall stops walk-through");
 assert.equal(canOccupy(-2,0,-16,STAND_HEIGHT,HOUSE_BLOCKERS),true,
  "bomb A room has an accessible corridor door");
 assert.equal(canOccupy(2,0,-16,STAND_HEIGHT,HOUSE_BLOCKERS),true,
  "bomb B room has an accessible corridor door");
 assert.equal(canOccupy(-10,0,-16,STAND_HEIGHT,HOUSE_BLOCKERS),true,
  "exterior west side has a real service entry");
});

test("stair grade connects ground and upper floor without teleporting",()=>{
 assert.equal(houseFloorAt(1,-5,0),0);
 assert.equal(houseFloorAt(1,-12,0),HOUSE.floorHeight);
 assert.equal(houseFloorAt(1,-8.5,0),HOUSE.floorHeight/2);
 assert.equal(houseFloorAt(-6,-16,0),0);
 assert.equal(houseFloorAt(-6,-16,HOUSE.floorHeight),HOUSE.floorHeight);
 assert.equal(houseFloorAt(2.5,-8,1.75),0,
  "crossing a staircase rail midway must not teleport to upstairs");
 let p={...initialPlayer(),x:1,z:-4.75,yaw:0};
 for(let i=0;i<160;i++)p=stepPlayer(p,{forward:1},.016,
  HOUSE_BLOCKERS,houseFloorAt);
 assert.ok(p.z<-12.1,`player got stuck on stairs at z=${p.z}`);
 assert.ok(Math.abs(p.y-HOUSE.floorHeight)<.015,
  `player should reach upstairs, instead y=${p.y}`);
 assert.ok(canOccupy(p.x,p.y,p.z,STAND_HEIGHT,HOUSE_BLOCKERS));
 p={...p,yaw:Math.PI};
 for(let i=0;i<160;i++)p=stepPlayer(p,{forward:1},.016,
  HOUSE_BLOCKERS,houseFloorAt);
 assert.ok(p.z>-4.9,`player got stuck descending at z=${p.z}`);
 assert.ok(Math.abs(p.y)<.015,`player should descend to ground, y=${p.y}`);
});

test("attacker spawn can reach the site A doorway by walking real corridors",()=>{
 let p={...initialPlayer(),...HOUSE.attackerSpawn};
 for(let i=0;i<357;i++)p=stepPlayer(p,{forward:1},.016,
  HOUSE_BLOCKERS,houseFloorAt);
 assert.ok(p.z<-15,`front entrance or hall unexpectedly blocked at z=${p.z}`);
 p={...p,yaw:Math.PI/2};
 for(let i=0;i<68;i++)p=stepPlayer(p,{forward:1},.016,
  HOUSE_BLOCKERS,houseFloorAt);
 assert.ok(p.x<-3.5,`the site A corridor door is not actually passable: x=${p.x}`);
 assert.equal(p.y,0);
 assert.ok(canOccupy(p.x,p.y,p.z,STAND_HEIGHT,HOUSE_BLOCKERS));
});

test("bomb zones belong to their actual rooms, never through walls/floors",()=>{
 assert.deepEqual(BOMB_RULES.sites.map(s=>s.id),["A","B"]);
 assert.equal(roundSiteAt({x:-6,z:-13,y:0},"house")?.id,"A");
 assert.equal(roundSiteAt({x:6,z:-13,y:0},"house")?.id,"B");
 assert.equal(roundSiteAt({x:-6,z:-13,y:HOUSE.floorHeight},"house"),null);
 assert.equal(roundSiteAt({x:-6,z:-9.85,y:0},"house"),null);
 assert.equal(roundSiteAt({x:-1.5,z:-13,y:0},"house"),null);
 assert.equal(roundSiteAt({x:-6,z:-9.85,y:0})?.id,"A",
  "original flat bomb testing retains its legacy plant circles");
 let state=newBombRound({map:"house",choice:"carry"});
 state={...state,phase:"action",time:120};
 const upstairs={x:-6,z:-13,y:HOUSE.floorHeight,yaw:0};
 for(let i=0;i<180;i++)state=stepBombRound(state,.05,{side:"attack",
  position:upstairs,holdingF:true}).state;
 assert.equal(state.phase,"action","upstairs cannot plant through floor");
 const planted={...state,phase:"postplant",defuser:{status:"planted",x:-6,z:-13}};
 assert.equal(liveBombInteraction(planted,"defend",upstairs,true,true),null,
  "upstairs cannot disable through concrete");
});

test("location labels identify ground rooms, staircase and upstairs",()=>{
 assert.match(houseRoomAt({x:-6,z:-13,y:0}),/BOMB ROOM/);
 assert.match(houseRoomAt({x:1,z:-8.5,y:1.6}),/STAIRCASE/);
 assert.match(houseRoomAt({x:6,z:-16,y:3.2}),/BEDROOM/);
 assert.match(houseRoomAt({x:0,z:8,y:0}),/OUTSIDE/);
});
