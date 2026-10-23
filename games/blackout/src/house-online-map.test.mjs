import test from "node:test";
import assert from "node:assert/strict";
import {HOUSE,houseFloorAt,HOUSE_BLOCKERS} from "../reboot/house-layout.js";
import {BOMB_RULES} from "../reboot/bomb-round.js";
import {HOUSE_ONLINE_MAP,houseOnlineSpawn} from "./house-online-map.js";
import {acceptMovement,solidAt,supportedFloor} from "./multiplayer-protocol.js";
import {createOnlineWorld,nearBombSite,droneObstacles} from "../online-world.js";

test("online house derives every original Solo Custom physical blocker",()=>{
 const map=HOUSE_ONLINE_MAP;
 assert.ok(map.elements.length>=HOUSE_BLOCKERS.length+2);
 for(const original of HOUSE_BLOCKERS){
  const online=map.elements.find(p=>p.id===original.id);
  assert.ok(online,"missing original blocker "+original.id);
  assert.equal(online.position.x,original.x);
  assert.equal(online.position.z,original.z);
  assert.equal(online.size.x,original.width);
  assert.equal(online.size.z,original.depth);
 }
 assert.equal(solidAt(map.elements,0,HOUSE.maxZ,0),false,
  "front ground-floor doorway must be traversable");
 assert.equal(solidAt(map.elements,HOUSE.maxX,-9,0),true,
  "exterior wall must stop players");
});

test("server stair gradient and landing match Solo Custom",()=>{
 for(const z of [-5,-6.75,-8.5,-10.25,-12]){
  const expected=houseFloorAt(1.05,z,3.2);
  const online=supportedFloor(HOUSE_ONLINE_MAP.elements,1.05,z,expected);
  assert.ok(Math.abs(expected-online)<.001,
   "stair mismatch at z="+z+": "+online+" vs "+expected);
 }
 assert.equal(supportedFloor(HOUSE_ONLINE_MAP.elements,-6,-13,3.2),3.2);
 assert.equal(supportedFloor(HOUSE_ONLINE_MAP.elements,-6,-13,0),0);
});

test("server objectives and team spawns use original house sites",()=>{
 const map=HOUSE_ONLINE_MAP;
 const world=createOnlineWorld(map,[]);
 for(const site of BOMB_RULES.sites){
  assert.equal(nearBombSite(map,world,{x:site.x,y:0,z:site.z}),site.id);
 }
 for(const side of ["attacker","defender"]){
  const unique=new Set();
  for(let i=0;i<5;i++){
   const p=houseOnlineSpawn(side,i);
   assert.equal(solidAt(map.elements,p.x,p.z,p.y),false,
    "spawn collides with house: "+side+" "+i);
   unique.add(p.x+":"+p.z);
  }
  assert.equal(unique.size,5);
 }
});

test("multiplayer server accepts the original front-door route and staircase ascent",()=>{
 const parts=HOUSE_ONLINE_MAP.elements;
 let p={...houseOnlineSpawn("attacker",2),pitch:0};
 for(let z=p.z-.2;z>=-4;z-=.2){
  const next={...p,z};
  const accepted=acceptMovement(p,next,.05,parts);
  assert.ok(accepted,"front entrance blocked by an invisible wall at "+z);
  p={...p,...accepted};
 }
 p={...houseOnlineSpawn("defender",2),pitch:0,x:1.05,z:-5,y:0};
 for(let z=-5.2;z>=-12;z-=.2){
  const y=houseFloorAt(1.05,z,p.y);
  const accepted=acceptMovement(p,{...p,z,y},.05,parts);
  assert.ok(accepted,"server rejected real stair ascent at "+z);
  p={...p,...accepted};
 }
 assert.ok(p.y>3.05,"server reaches 2F using the original grade");
 const obstacles=droneObstacles(HOUSE_ONLINE_MAP,createOnlineWorld(HOUSE_ONLINE_MAP,[]));
 assert.equal(obstacles.some(o=>o.x===1.05&&o.z===-8.5&&
  o.width===1.6&&o.depth===7&&o.height===3.2),false,
  "server must not turn the stair ramp into an unjumpable solid block");
});
