import test from "node:test";
import assert from "node:assert/strict";
import {REINFORCEMENT,newReinforcement,canWorkOnReinforcement,
 stepReinforcement,removeReinforcement,reinforcementBlockers,
 reinforcementStatus} from "./reinforcement.js";
import {SOFT_WALL,newSoftWall,softWallIndex,softWallRemove,softWallBlockers} from "./soft-wall.js";
import {TEST_OBSTACLES,canOccupy,initialPlayer,stepPlayer} from "./physics.js";
const front=()=>({x:SOFT_WALL.x,z:SOFT_WALL.z+1.1,moving:false});

test("F only installs within 2.65m and outside the occupied wall opening",()=>{
 assert.equal(canWorkOnReinforcement(front()),true);
 assert.equal(canWorkOnReinforcement({x:0,z:8}),false);
 assert.equal(canWorkOnReinforcement({x:SOFT_WALL.x,z:SOFT_WALL.z}),false);
 assert.equal(canWorkOnReinforcement(null),false);
 assert.equal(reinforcementStatus(newReinforcement()),"UNREINFORCED");
});
test("exact three-second installation with interruption and frame-size independence",()=>{
 let state=newReinforcement();
 for(let i=0;i<90;i++)
  state=stepReinforcement(state,{player:front(),holding:true,dt:1/60}).state;
 assert.ok(state.progress>1.49&&state.progress<1.51);
 assert.equal(state.installed,false);
 const cancelled=stepReinforcement(state,{player:front(),holding:false,dt:.016});
 assert.equal(cancelled.event,"cancelled");
 assert.equal(cancelled.state.progress,0);
 for(let i=0;i<60;i++)
  state=stepReinforcement(state,{player:front(),holding:true,dt:.05}).state;
 assert.equal(state.installed,true);
 assert.equal(state.installs,1);
 assert.equal(state.progress,0);
 assert.equal(reinforcementStatus(state),"REINFORCED");
 assert.equal(stepReinforcement(state,{player:front(),holding:true,dt:.05}).event,"none");
});
test("installation stops if player starts moving/sprinting or enters wall opening",()=>{
 let state=stepReinforcement(newReinforcement(),{
  player:front(),holding:true,dt:.05}).state;
 assert.ok(state.progress>0);
 state=stepReinforcement(state,{player:front(),holding:true,dt:.05,moving:true}).state;
 assert.equal(state.progress,0);
 state=stepReinforcement(newReinforcement(),{
  player:front(),holding:true,dt:.05}).state;
 state=stepReinforcement(state,{player:{x:SOFT_WALL.x,z:SOFT_WALL.z},
  holding:true,dt:.05}).state;
 assert.equal(state.progress,0);
});
test("reinforcement closes pre-existing drywall cutouts without altering drywall state",()=>{
 let plaster=newSoftWall();
 for(let row=0;row<16;row++)
  for(let column=12;column<20;column++)
   plaster=softWallRemove(plaster,softWallIndex(column,row)).state;
 const oldSolid=plaster.solid.slice(),oldRemoved=plaster.removed;
 const gypsum=[...TEST_OBSTACLES,...softWallBlockers(plaster)];
 assert.equal(canOccupy(SOFT_WALL.x,0,SOFT_WALL.z,1.78,gypsum),true);
 let armor=newReinforcement();
 for(let i=0;i<60;i++)
  armor=stepReinforcement(armor,{player:front(),holding:true,dt:.05}).state;
 const barrier=reinforcementBlockers(armor);
 assert.equal(barrier.length,1);
 assert.equal(barrier[0].width,SOFT_WALL.columns*SOFT_WALL.cell);
 assert.equal(canOccupy(SOFT_WALL.x,0,SOFT_WALL.z,1.78,[...gypsum,...barrier]),false);
 let player={...initialPlayer(),x:SOFT_WALL.x,z:SOFT_WALL.z+2,yaw:0};
 for(let i=0;i<65;i++)player=stepPlayer(player,{forward:1},1/60,[...gypsum,...barrier]);
 assert.ok(player.z>SOFT_WALL.z+.12,"installed metal physically stops movement");
 assert.deepEqual(plaster.solid,oldSolid);
 assert.equal(plaster.removed,oldRemoved);
});
test("Y removes only metal for repeated penetration testing; proximity protects state",()=>{
 let armor=newReinforcement();
 for(let i=0;i<60;i++)
  armor=stepReinforcement(armor,{player:front(),holding:true,dt:.05}).state;
 let result=removeReinforcement(armor,{x:0,z:8});
 assert.equal(result.removed,false);
 assert.equal(result.state.installed,true);
 result=removeReinforcement(armor,front());
 assert.equal(result.removed,true);
 assert.equal(result.state.installed,false);
 assert.equal(result.state.removals,1);
 assert.deepEqual(reinforcementBlockers(result.state),[]);
 assert.equal(removeReinforcement(result.state,front()).removed,false);
});
