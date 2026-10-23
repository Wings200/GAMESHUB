import test from "node:test";
import assert from "node:assert/strict";
import {BARRICADE,createBarricadeState,barricadeDamage,barricadeBlockers,
 boardBounds,barricadeRebuild,canInteractWithBarricade,barricadeStatus,
 barricadeMeleeDamage,BARRICADE_MELEE_HITS} from "./barricade.js";
import {initialPlayer,canOccupy,stepPlayer,TEST_OBSTACLES} from "./physics.js";
test("six boards each require two independent bullet hits; no whole-door HP",()=>{
 let s=createBarricadeState();
 assert.equal(s.boards.length,6);
 assert.equal(barricadeStatus(s),"INTACT");
 let hit=barricadeDamage(s,2);
 assert.equal(hit.changed,true);assert.equal(hit.broken,false);
 assert.equal(hit.state.boards[2],1);assert.equal(s.boards[2],2);
 hit=barricadeDamage(hit.state,2);
 assert.equal(hit.broken,true);assert.equal(hit.state.boards[2],0);
 assert.equal(hit.state.broken,1);
 assert.equal(hit.state.boards[3],2);
 assert.equal(barricadeDamage(hit.state,2).changed,false);
});
test("each board has separate height-specific player collision",()=>{
 let state=createBarricadeState();
 let obstacles=[...TEST_OBSTACLES,...barricadeBlockers(state)];
 assert.equal(canOccupy(BARRICADE.x,0,BARRICADE.z,1.78,obstacles),false);
 assert.equal(barricadeBlockers(state).length,9);
 const first=boardBounds(0),last=boardBounds(5);
 assert.ok(first.bottom>0);
 assert.ok(last.top<=BARRICADE.postHeight);
 assert.ok(last.top-BARRICADE.openingHeight<.07,
   "top plank may shingle a little beneath the reinforced lintel");
 for(let i=0;i<4;i++)state=barricadeDamage(barricadeDamage(state,i).state,i).state;
 obstacles=[...TEST_OBSTACLES,...barricadeBlockers(state)];
 assert.equal(canOccupy(BARRICADE.x,0,BARRICADE.z,.62,obstacles),true,
  "prone fits beneath remaining upper planks");
 assert.equal(canOccupy(BARRICADE.x,0,BARRICADE.z,1.78,obstacles),false,
  "standing remains blocked until a tall enough opening exists");
 state=barricadeDamage(barricadeDamage(state,4).state,4).state;
 obstacles=[...TEST_OBSTACLES,...barricadeBlockers(state)];
 assert.equal(canOccupy(BARRICADE.x,0,BARRICADE.z,1.78,obstacles),true,
  "opening becomes passable when lower five planks are removed");
});
test("actual movement sweep stops at intact planks and passes after destruction",()=>{
 let state=createBarricadeState();
 let player={...initialPlayer(),x:BARRICADE.x,z:BARRICADE.z+2,yaw:0};
 const blocked=[...TEST_OBSTACLES,...barricadeBlockers(state)];
 for(let i=0;i<48;i++)player=stepPlayer(player,{forward:1},1/60,blocked);
 assert.ok(player.z>BARRICADE.z+.1,"wall blocks upright body");
 for(let i=0;i<5;i++)state=barricadeDamage(barricadeDamage(state,i).state,i).state;
 let through={...initialPlayer(),x:BARRICADE.x,z:BARRICADE.z+2,yaw:0};
 const open=[...TEST_OBSTACLES,...barricadeBlockers(state)];
 for(let i=0;i<60;i++)through=stepPlayer(through,{forward:1},1/60,open);
 assert.ok(through.z<BARRICADE.z-1,"player passes after lower planks break");
});
test("frame posts stay solid after destroying every plank",()=>{
 let state=createBarricadeState();
 for(let i=0;i<6;i++)state=barricadeDamage(state,i,2).state;
 assert.equal(barricadeStatus(state),"OPEN");
 const obs=[...TEST_OBSTACLES,...barricadeBlockers(state)];
 assert.equal(canOccupy(BARRICADE.x,0,BARRICADE.z,1.78,obs),true);
 assert.equal(canOccupy(BARRICADE.x+BARRICADE.openingWidth/2+
 BARRICADE.postWidth/2,0,BARRICADE.z,1.78,obs),false);
});
test("F rebuilds all boards, with proximity and no trapping in doorway",()=>{
 let state=barricadeDamage(createBarricadeState(),0,2).state;
 const front={x:BARRICADE.x,z:BARRICADE.z+1.6};
 assert.equal(canInteractWithBarricade(front),true);
 assert.equal(canInteractWithBarricade({x:BARRICADE.x,z:BARRICADE.z}),false);
 assert.equal(canInteractWithBarricade({x:0,z:8}),false);
 state=barricadeRebuild(state);
 assert.equal(barricadeStatus(state),"INTACT");
 assert.equal(state.rebuilds,1);
 assert.equal(barricadeRebuild(state),state,"intact door should not rebuild");
});

test("3 V melee hits break the FULL barricade, all six boards and collision",()=>{
 let state=createBarricadeState();
 assert.equal(BARRICADE_MELEE_HITS,3);
 for(let hits=1;hits<=3;hits++){
  const r=barricadeMeleeDamage(state);
  assert.equal(r.handled,true);
  assert.equal(r.hits,hits);
  assert.equal(r.broken,hits===3);
  state=r.state;
  if(hits<3){
   assert.equal(barricadeStatus(state),"INTACT");
   assert.equal(barricadeBlockers(state).length,9);
  }
 }
 assert.equal(state.boards.filter(v=>v===0).length,6);
 assert.equal(state.broken,6);
 assert.equal(barricadeStatus(state),"OPEN");
 assert.equal(barricadeBlockers(state).length,3);
 assert.equal(canOccupy(BARRICADE.x,0,BARRICADE.z,1.78,
  [...TEST_OBSTACLES,...barricadeBlockers(state)]),true);
 assert.equal(barricadeMeleeDamage(state).handled,false);
 state=barricadeRebuild(state);
 assert.equal(state.meleeHits,0);
 assert.equal(state.boards.every(hp=>hp===2),true);
 assert.equal(barricadeMeleeDamage(state).hits,1);
});
test("gun-damaged barricades still break in three melee hits, preserving rifle board HP",()=>{
 let state=barricadeDamage(createBarricadeState(),3).state;
 assert.equal(state.boards[3],1);
 for(let i=0;i<3;i++)state=barricadeMeleeDamage(state).state;
 assert.ok(state.boards.every(hp=>hp===0));
 assert.equal(barricadeStatus(state),"OPEN");
});
