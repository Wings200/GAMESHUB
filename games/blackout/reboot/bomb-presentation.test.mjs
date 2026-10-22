import test from "node:test";
import assert from "node:assert/strict";
import {canOccupy,STAND_HEIGHT,PLAYER_RADIUS} from "./physics.js";
import {newDrone,canDroneOccupy,tickDrone,DRONE} from "./drone-physics.js";
import {BOMB_RULES,newBombRound,stepBombRound} from "./bomb-round.js";
import {BOMB_HARDWARE,bombSiteBlockers,liveBombInteraction,
 defuserBeepInterval,newBombSoundClock,tickBombSoundClock}
 from "./bomb-presentation.js";
const bomb=()=>newBombRound();
const action=()=>({...newBombRound(),phase:"action",time:180});
const siteA=BOMB_RULES.sites[0];
const actor={x:siteA.x+1.8,y:0,z:siteA.z};
test("exactly 2 physical bomb bodies only in Bomb Round, not Gadget Test Range",()=>{
 const solid=bombSiteBlockers(bomb());
 assert.equal(solid.length,2);
 assert.deepEqual(solid.map(o=>o.id),["bomb-site-a","bomb-site-b"]);
 for(const o of solid){
  assert.equal(o.bottom,0);
  assert.equal(o.height,BOMB_HARDWARE.height);
  assert.equal(o.width,BOMB_HARDWARE.width);
  assert.equal(o.depth,BOMB_HARDWARE.depth);
 }
 assert.deepEqual(bombSiteBlockers(null),[]);
 assert.deepEqual(bombSiteBlockers({mode:"sandbox"}),[]);
});
test("drones cannot hide inside bomb A or B; standing players also collide",()=>{
 const solid=bombSiteBlockers(bomb());
 for(const o of solid){
  assert.equal(canDroneOccupy(o.x,0,o.z,solid),false);
  assert.equal(canDroneOccupy(o.x+.4,0,o.z,solid),false);
  assert.equal(canOccupy(o.x,0,o.z,STAND_HEIGHT,solid),false);
  assert.equal(canDroneOccupy(o.x+o.width/2+DRONE.radius+.03,0,o.z,solid),true);
  assert.equal(canDroneOccupy(o.x,1.1,o.z,solid),true);
 }
});
test("real drone movement and boosted driving stop against bomb casing",()=>{
 const obstacles=bombSiteBlockers(bomb()),o=obstacles[0];
 let d=newDrone(o.x,o.z+3,0);
 for(let i=0;i<130;i++)d=tickDrone(d,{forward:1},.05,obstacles);
 assert.ok(d.z>o.z+o.depth/2+DRONE.radius-.025,"real drive must not enter body "+d.z);
 assert.equal(canDroneOccupy(d.x,d.y,d.z,obstacles),true);
 d=newDrone(o.x,o.z+3,0);
 for(let i=0;i<130;i++)d=tickDrone(d,{forward:1,boostPressed:i===0},.05,obstacles);
 assert.ok(d.z>o.z+o.depth/2+DRONE.radius-.025,"boost cannot phase through bomb");
});
test("planting and disabling only trigger while live, in range and holding F",()=>{
 const s=action();
 assert.equal(liveBombInteraction(s,"attack",actor,true,true),"plant");
 assert.equal(liveBombInteraction(s,"attack",actor,false,true),null);
 assert.equal(liveBombInteraction(s,"attack",actor,true,false),null);
 assert.equal(liveBombInteraction(s,"attack",{x:0,z:8},true,true),null);
 assert.equal(liveBombInteraction(s,"defend",actor,true,true),null);
 assert.equal(liveBombInteraction({...s,defuser:{...s.defuser,status:"ground"}},"attack",actor,true,true),null);
 const planted={...s,phase:"postplant",defuser:{status:"planted",x:actor.x,z:actor.z,site:"A"}};
 assert.equal(liveBombInteraction(planted,"defend",actor,true,true),"disable");
 assert.equal(liveBombInteraction(planted,"defend",{x:0,z:8},true,true),null);
 assert.equal(liveBombInteraction(planted,"attack",actor,true,true),null);
 assert.equal(liveBombInteraction({...planted,phase:"ended"},"defend",actor,true,true),null);
});
test("planted defuser ticks accelerate toward last seconds",()=>{
 const times=[45,29,19,9,4],periods=times.map(defuserBeepInterval);
 for(let i=1;i<periods.length;i++)assert.ok(periods[i]<periods[i-1]);
 assert.equal(defuserBeepInterval(NaN),.95);
 assert.ok(periods.at(-1)<=.20);
});
test("audio events occur throughout postplant, no ticks when unplanted or ended",()=>{
 const planted={...action(),phase:"postplant",time:45,
  defuser:{status:"planted",x:actor.x,z:actor.z,site:"A"}};
 let clock=newBombSoundClock();
 let count=0;
 for(let i=0;i<60;i++){
  const state={...planted,time:45-i*.05};
  const tick=tickBombSoundClock(clock,state,.05,null);
  clock=tick.clock;count+=tick.events.filter(e=>e==="defuser-tick").length;
 }
 assert.ok(count>=2&&count<=5,"regular postplant beeps");
 const silent=tickBombSoundClock(clock,action(),.05,null);
 assert.equal(silent.events.includes("defuser-tick"),false);
 const ended=tickBombSoundClock(clock,{...planted,phase:"ended"},.05,null);
 assert.deepEqual(ended.events,[]);
 assert.equal(ended.clock.phase,null);
});
test("faster defuser ticking as postplant timer reaches critical final seconds",()=>{
 const late={...action(),phase:"postplant",time:4,
  defuser:{status:"planted",x:actor.x,z:actor.z,site:"B"}};
 let state=newBombSoundClock(),heard=0;
 for(let i=0;i<20;i++){
  const r=tickBombSoundClock(state,late,.05,null);
  state=r.clock;heard+=r.events.length;
 }
 assert.ok(heard>=4,"urgent cue repeats often");
});
test("plant/disable key clicks repeat while holding F and cease on interruption",()=>{
 const working=action();let clock=newBombSoundClock(),events=[];
 for(let i=0;i<20;i++){
  const result=tickBombSoundClock(clock,working,.05,"plant");
  clock=result.clock;events.push(...result.events);
 }
 assert.ok(events.filter(e=>e==="plant-key").length>=5);
 const clear=tickBombSoundClock(clock,working,.05,null);
 assert.equal(clear.clock.keys,0);
 const planted={...working,phase:"postplant",time:45,
  defuser:{status:"planted",x:actor.x,z:actor.z,site:"A"}};
 let r=tickBombSoundClock(clear.clock,planted,.05,"disable");
 clock=r.clock;events=[];
 for(let i=0;i<20;i++){r=tickBombSoundClock(clock,planted,.05,"disable");
  clock=r.clock;events.push(...r.events);}
 assert.ok(events.filter(e=>e==="defuse-key").length>=4);
 assert.equal(tickBombSoundClock(clock,planted,0,"disable").clock,clock);
});
test("postplant completion removes interaction and sound accumulation",()=>{
 let s=action();
 for(let i=0;i<141;i++)s=stepBombRound(s,.05,{side:"attack",position:actor,holdingF:true}).state;
 assert.equal(s.phase,"postplant");
 assert.equal(liveBombInteraction(s,"attack",actor,true,true),null);
 for(let i=0;i<141;i++)s=stepBombRound(s,.05,{side:"defend",position:actor,holdingF:true}).state;
 assert.equal(s.phase,"ended");
 assert.equal(liveBombInteraction(s,"defend",actor,true,true),null);
 const r=tickBombSoundClock(newBombSoundClock(),s,.05,null);
 assert.equal(r.events.length,0);
});
