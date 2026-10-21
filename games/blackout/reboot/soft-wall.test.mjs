import test from "node:test";
import assert from "node:assert/strict";
import {SOFT_WALL,SOFT_WALL_TOTAL,newSoftWall,softWallIndex,
 softWallCell,softWallWorld,softWallRemove,softWallReset,
 softWallBlockers,softWallFrame,canResetSoftWall,softWallStatus} from "./soft-wall.js";
import {initialPlayer,canOccupy,stepPlayer,TEST_OBSTACLES} from "./physics.js";

test("soft wall consists of 640 individually removable 12cm tiles, not a global hit counter",()=>{
 const state=newSoftWall();
 assert.equal(SOFT_WALL_TOTAL,640);
 assert.equal(state.solid.length,SOFT_WALL_TOTAL);
 assert.equal(softWallIndex(0,0),0);
 assert.equal(softWallIndex(31,19),639);
 assert.equal(softWallIndex(32,0),-1);
 assert.equal(softWallCell(33).row,1);
 assert.equal(softWallWorld(0).y,.06);
 assert.equal(softWallStatus(state),"INTACT");
});
test("one shot removes only the impacted tile and repeated shots at a hole do nothing",()=>{
 const initial=newSoftWall();
 const idx=softWallIndex(17,9);
 const first=softWallRemove(initial,idx);
 assert.equal(first.removed,true);
 assert.equal(first.state.removed,1);
 assert.equal(initial.solid[idx],1);
 assert.equal(first.state.solid[idx],0);
 assert.equal(first.state.solid[idx+1],1);
 assert.equal(softWallStatus(first.state),"PENETRATED");
 assert.equal(softWallRemove(first.state,idx).removed,false);
 assert.equal(softWallRemove(first.state,-1).removed,false);
});
test("solid geometry blocks players before removing material",()=>{
 const obstacles=[...TEST_OBSTACLES,...softWallBlockers(newSoftWall())];
 assert.equal(canOccupy(SOFT_WALL.x,0,SOFT_WALL.z,1.78,obstacles),false);
 assert.equal(softWallBlockers(newSoftWall()).length,SOFT_WALL.rows+3);
 const frame=softWallFrame();
 assert.equal(frame.length,3);
 assert.equal(canOccupy(SOFT_WALL.x+SOFT_WALL.columns*SOFT_WALL.cell/2+
  SOFT_WALL.postWidth/2,0,SOFT_WALL.z,1.78,obstacles),false);
});
test("shot-size holes pass bullets, but cannot be traversed by a player capsule",()=>{
 let state=newSoftWall();
 state=softWallRemove(state,softWallIndex(15,9)).state;
 const obstacles=[...TEST_OBSTACLES,...softWallBlockers(state)];
 assert.equal(canOccupy(SOFT_WALL.x,0,SOFT_WALL.z,1.78,obstacles),false);
 assert.ok(softWallBlockers(state).length>SOFT_WALL.rows+3);
});
test("carve a tall player-width opening: true collision passage without entire wall collapse",()=>{
 let state=newSoftWall();
 for(let row=0;row<16;row++){
  for(let col=12;col<=19;col++){
   state=softWallRemove(state,softWallIndex(col,row)).state;
  }
 }
 assert.ok(state.removed<SOFT_WALL_TOTAL/3);
 const obs=[...TEST_OBSTACLES,...softWallBlockers(state)];
 assert.equal(canOccupy(SOFT_WALL.x,0,SOFT_WALL.z,1.78,obs),true);
 assert.equal(canOccupy(SOFT_WALL.x+.9,0,SOFT_WALL.z,1.78,obs),false);
 let player={...initialPlayer(),x:SOFT_WALL.x,z:SOFT_WALL.z+2,yaw:0};
 for(let i=0;i<75;i++)player=stepPlayer(player,{forward:1},1/60,obs);
 assert.ok(player.z<SOFT_WALL.z-1,"actual walk-through must work");
});
test("reset reconstructs original material but cannot be performed while inside wall",()=>{
 const initial=newSoftWall();
 const damaged=softWallRemove(initial,softWallIndex(4,3)).state;
 assert.equal(canResetSoftWall({x:SOFT_WALL.x,z:SOFT_WALL.z}),false);
 assert.equal(canResetSoftWall({x:0,z:8}),true);
 assert.equal(softWallReset(damaged).removed,0);
 assert.equal(softWallReset(initial),initial);
});
