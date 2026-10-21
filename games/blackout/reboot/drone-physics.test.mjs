import test from "node:test";
import assert from "node:assert/strict";
import {DRONE,newDrone,throwDrone,tickDrone,canDroneOccupy,droneJumpLabel,droneBoostLabel} from "./drone-physics.js";
import {TEST_OBSTACLES} from "./physics.js";
import {SOFT_WALL,newSoftWall,softWallIndex,softWallRemove,softWallBlockers} from "./soft-wall.js";
import {REINFORCEMENT,newReinforcement,stepReinforcement,reinforcementBlockers} from "./reinforcement.js";
const frame=1/60;
const stepN=(d,n,input,obs=[])=>{for(let i=0;i<n;i++)d=tickDrone(d,input,frame,obs);return d};

test("standard drone spawns low and carries three independent Shift boost charges",()=>{
 const d=newDrone();
 assert.equal(d.y,0);assert.equal(d.charges,3);
 assert.equal(d.deployed,true);assert.equal(droneBoostLabel(d),"3/3");
 assert.equal(droneJumpLabel(d),"READY");
});
test("Shift is edge-triggered: hold cannot continuously drain charges",()=>{
 let d=newDrone();
 d=tickDrone(d,{forward:1,boostPressed:true},frame);
 assert.equal(d.charges,2);assert.equal(d.boosts,1);
 d=stepN(d,20,{forward:1});
 assert.equal(d.charges,2);assert.ok(d.z<6);
 d=tickDrone(d,{forward:1,boostPressed:true},frame);
 assert.equal(d.charges,2,"active burst does not consume another");
 d=stepN(d,48,{});
 d=tickDrone(d,{forward:1,boostPressed:true},frame);
 assert.equal(d.charges,1);
});
test("three speed boosts used up, then regenerate exactly one charge at a time",()=>{
 let d=newDrone();
 for(let n=0;n<3;n++){
  d=tickDrone(d,{forward:1,boostPressed:true},frame);
  d=stepN(d,46,{});
 }
 assert.equal(d.charges,0);
 assert.equal(d.boosts,3);
 d=stepN(d,300,{});
 assert.equal(d.charges,0);
 d=stepN(d,120,{});
 assert.equal(d.charges,1);
 assert.equal(droneBoostLabel(d),"1/3 · 7S");
 d=stepN(d,420,{});
 assert.equal(d.charges,2);
 d=stepN(d,420,{});
 assert.equal(d.charges,3);
});
test("Space jumps only when landed AND cooldown elapsed",()=>{
 let d=newDrone();
 d=tickDrone(d,{jumpPressed:true},frame);
 assert.equal(d.jumps,1);assert.equal(d.grounded,false);
 assert.ok(d.jumpLeft>1.7);
 d=stepN(d,24,{jumpPressed:true});
 assert.equal(d.jumps,1);
 d=stepN(d,55,{});
 assert.equal(d.grounded,true);
 assert.ok(d.jumpLeft>0);
 d=tickDrone(d,{jumpPressed:true},frame);
 assert.equal(d.jumps,1);
 d=stepN(d,40,{});
 d=tickDrone(d,{jumpPressed:true},frame);
 assert.equal(d.jumps,2);
});
test("drone stops at boxes, posts, walls, and map limits without phasing",()=>{
 const wall=[{id:"thin",x:0,z:0,width:5,depth:.13,bottom:0,height:2}];
 let d=newDrone(0,1,0);
 d=stepN(d,120,{forward:1},wall);
 assert.ok(d.z>DRONE.radius/2);
 assert.equal(canDroneOccupy(0,0,0,wall),false);
 let outer=newDrone(0,-29,0);
 outer=stepN(outer,180,{forward:1});
 assert.ok(outer.z>=-DRONE.worldLimit);
 const crates=TEST_OBSTACLES;
 assert.equal(canDroneOccupy(-12,0,-6,crates),false);
});
test("a true cut-through gypsum opening permits drone but reinforced metal seals it",()=>{
 let wall=newSoftWall();
 const idx=softWallIndex(16,0);wall=softWallRemove(wall,idx).state;
 const idx2=softWallIndex(17,0);wall=softWallRemove(wall,idx2).state;
 const clear=[...softWallBlockers(wall)];
 // Two 12cm cells are not enough for the 38cm wide physical drone.
 assert.equal(canDroneOccupy(SOFT_WALL.x,0,SOFT_WALL.z,clear),false);
 for(let row=0;row<3;row++)
  for(let col=12;col<=19;col++)
   wall=softWallRemove(wall,softWallIndex(col,row)).state;
 const cut=softWallBlockers(wall);
 assert.equal(canDroneOccupy(SOFT_WALL.x,0,SOFT_WALL.z,cut),true);
 let metal=newReinforcement();
 const player={x:SOFT_WALL.x,z:SOFT_WALL.z+1};
 for(let i=0;i<60;i++)
  metal=stepReinforcement(metal,{player,holding:true,dt:.05}).state;
 assert.equal(metal.installed,true);
 assert.equal(canDroneOccupy(SOFT_WALL.x,0,SOFT_WALL.z,
  [...cut,...reinforcementBlockers(metal)]),false);
});
test("drone physics never moves operator coordinates or modifies old game objects",()=>{
 const op={x:0,z:8,yaw:0};
 const obstacles=TEST_OBSTACLES;
 let d=newDrone(0,6);
 d=stepN(d,100,{forward:1,right:1},obstacles);
 assert.deepEqual(op,{x:0,z:8,yaw:0});
 assert.equal(obstacles,TEST_OBSTACLES);
 assert.ok(d.x!==0&&d.z!==6);
});

test("5 or 6 physical throws start airborne and travel forward before settling",()=>{
 const obstacles=TEST_OBSTACLES;
 let d=throwDrone(0,7,0);
 assert.ok(d.y>.5&&d.y<1);
 assert.equal(d.grounded,false);
 assert.ok(d.throwLeft>0);
 assert.equal(d.charges,3);
 d=stepN(d,8,{},obstacles);
 assert.ok(d.z<7-0.4,"real thrown drone flies forward");
 assert.ok(d.y>0,"it is still in the air early in the arc");
 d=stepN(d,90,{},obstacles);
 assert.equal(d.grounded,true);
 assert.equal(d.y,0);
 assert.equal(d.throwLeft,0);
 assert.equal(d.charges,3,"throwing should not consume a Shift boost");
});
test("throw arc stops at high solid walls rather than teleporting through them",()=>{
 const hardWall=[{id:"wall",x:0,z:5.7,width:6,depth:.35,
  bottom:0,height:3.2}];
 let d=throwDrone(0,7,0);
 d=stepN(d,80,{},hardWall);
 assert.ok(d.z>=5.7+.35/2+DRONE.radius-.08,
  "thrown recon body must not pass through physical wall");
});
