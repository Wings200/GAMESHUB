import test from "node:test";
import assert from "node:assert/strict";
import {BOMB_RULES,newBombRound,newFollowingRound,roundSiteAt,nearbyDefuser,
 pickupRoundDefuser,dropRoundDefuser,endBombRound,stepBombRound,bombPrompt}
 from "./bomb-round.js";
const spawn={x:0,z:8};
const siteA={x:BOMB_RULES.sites[0].x,z:BOMB_RULES.sites[0].z};
const siteB={x:BOMB_RULES.sites[1].x,z:BOMB_RULES.sites[1].z};
function advance(state,seconds,input={}){
 let r={state,events:[]};
 const events=[];
 for(let i=0;i<Math.ceil(seconds/.05);i++){
  r=stepBombRound(r.state,.05,input);events.push(...r.events);
 }
 return {state:r.state,events};
}
const action=(choice="carry")=>advance(newBombRound({choice}),45).state;
test("first 45 sec are prep, attacker remains unplanted with a choice to CARRY defuser",()=>{
 const start=newBombRound();
 assert.equal(start.phase,"prep");
 assert.equal(start.time,45);
 assert.equal(start.defuser.status,"carried");
 assert.equal(start.defuser.carrier,"local");
 assert.equal(BOMB_RULES.sites.length,2);
 const preparatory=advance(start,35,{side:"attack",position:siteA,holdingF:true});
 assert.equal(preparatory.state.phase,"prep");
 assert.equal(preparatory.state.defuser.status,"carried","prep cannot plant with F");
 const started=advance(preparatory.state,10,{side:"attack",position:siteA,holdingF:true});
 assert.equal(started.state.phase,"action");
 assert.equal(started.state.time,180);
 assert.ok(started.events.includes("action"));
});
test("LEAVE defuser for team is a real floor object; no imaginary teammate carries it",()=>{
 const state=newBombRound({choice:"leave"});
 assert.equal(state.defuser.status,"ground");
 assert.equal(state.defuser.carrier,null);
 assert.deepEqual([state.defuser.x,state.defuser.z],[spawn.x,spawn.z]);
 assert.equal(nearbyDefuser(state,"attack",spawn),true);
 assert.equal(nearbyDefuser(state,"defend",spawn),false);
 assert.match(bombPrompt(action("leave"),"attack",siteA),/LEFT FOR TEAMMATE/);
 const after=advance(state,45).state;
 assert.equal(after.defuser.status,"ground");
 assert.equal(after.defuser.carrier,null,"no solo pretend teammate pickup");
});
test("attacker decides when to pick up a dropped/left defuser using explicit F",()=>{
 const left=action("leave");
 assert.equal(pickupRoundDefuser(left,"defend",spawn).ok,false);
 assert.equal(pickupRoundDefuser(left,"attack",siteA).ok,false);
 assert.equal(left.defuser.status,"ground","proximity alone does not pick up");
 const got=pickupRoundDefuser(left,"attack",{...spawn,x:.7});
 assert.equal(got.ok,true);
 assert.equal(got.state.defuser.status,"carried");
 assert.equal(got.state.defuser.carrier,"local");
 assert.equal(got.state.dropProgress,0);
 assert.equal(pickupRoundDefuser(got.state,"attack",spawn).ok,false);
});
test("HOLD X for 0.7 sec explicitly drops defuser at live position",()=>{
 let state=action("carry");
 const position={x:3.4,z:1.1};
 const early=advance(state,.65,{side:"attack",position,holdingX:true});
 assert.equal(early.state.defuser.status,"carried");
 assert.ok(early.state.dropProgress>.6);
 const end=stepBombRound(early.state,.05,{side:"attack",position,holdingX:true});
 assert.equal(end.state.defuser.status,"ground");
 assert.equal(end.state.defuser.carrier,null);
 assert.deepEqual([end.state.defuser.x,end.state.defuser.z],[3.4,1.1]);
 assert.deepEqual(end.events,["dropped"]);
 assert.equal(end.state.dropProgress,0);
 assert.equal(pickupRoundDefuser(end.state,"attack",position).ok,true);
});
test("releasing X early resets drop progress instead of accidentally dropping",()=>{
 const start=action();
 const a=advance(start,.5,{side:"attack",position:spawn,holdingX:true}).state;
 const released=stepBombRound(a,.05,{side:"attack",position:spawn,holdingX:false}).state;
 assert.equal(released.dropProgress,0);
 assert.equal(advance(released,.3,{side:"attack",position:spawn,holdingX:true}).state.defuser.status,"carried");
});
test("defuser can be manually dropped, left to teammate, recovered and dropped again",()=>{
 let state=action();
 state=dropRoundDefuser(state,{x:2,z:5}).state;
 assert.equal(pickupRoundDefuser(state,"attack",spawn).ok,false);
 state=pickupRoundDefuser(state,"attack",{x:2,z:5}).state;
 state=dropRoundDefuser(state,{x:-5,z:-4}).state;
 assert.deepEqual([state.defuser.x,state.defuser.z],[-5,-4]);
 assert.equal(state.defuser.status,"ground");
});
test("only carrier in bomb site A or B may plant over the 7.35-second typing cue",()=>{
 let state=action();
 assert.equal(roundSiteAt(siteA).id,"A");
 assert.equal(roundSiteAt(siteB).id,"B");
 assert.equal(roundSiteAt({x:0,z:8}),null);
 state=advance(state,3,{side:"attack",position:spawn,holdingF:true}).state;
 assert.equal(state.plantProgress,0);
 state=advance(state,3,{side:"defend",position:siteA,holdingF:true}).state;
 assert.equal(state.plantProgress,0);
 const progress=advance(state,7.30,{side:"attack",position:siteB,holdingF:true});
 assert.equal(progress.state.phase,"action");
 assert.ok(progress.state.plantProgress>7.2);
 const planted=stepBombRound(progress.state,.05,{side:"attack",position:siteB,holdingF:true});
 assert.equal(planted.state.phase,"postplant");
 assert.equal(planted.state.defuser.status,"planted");
 assert.equal(planted.state.defuser.site,"B");
 assert.equal(planted.state.time,45);
 assert.ok(planted.events.includes("planted"));
});
test("planting progress is cancelled by releasing F, leaving site or holding X",()=>{
 let state=action();
 state=advance(state,2,{side:"attack",position:siteA,holdingF:true}).state;
 assert.ok(state.plantProgress>1);
 state=stepBombRound(state,.05,{side:"attack",position:siteA,holdingF:false}).state;
 assert.equal(state.plantProgress,0);
 state=advance(state,1,{side:"attack",position:siteA,holdingF:true}).state;
 state=stepBombRound(state,.05,{side:"attack",position:spawn,holdingF:true}).state;
 assert.equal(state.plantProgress,0);
});
test("dropped defuser cannot be planted; after explicit F pickup it can",()=>{
 let state=action("leave");
 const failed=advance(state,5,{side:"attack",position:siteA,holdingF:true});
 assert.equal(failed.state.phase,"action");
 state=pickupRoundDefuser(failed.state,"attack",spawn).state;
 const planted=advance(state,7.45,{side:"attack",position:siteA,holdingF:true});
 assert.equal(planted.state.phase,"postplant");
});
test("only defenders can disable a planted defuser, requiring seven uninterrupted seconds",()=>{
 let state=advance(action(),7.45,{side:"attack",position:siteA,holdingF:true}).state;
 assert.equal(state.phase,"postplant");
 const attacker=advance(state,8,{side:"attack",position:siteA,holdingF:true});
 assert.equal(attacker.state.phase,"postplant");
 const far=advance(attacker.state,3,{side:"defend",position:spawn,holdingF:true});
 assert.equal(far.state.disableProgress,0);
 const near=advance(far.state,6.95,{side:"defend",position:siteA,holdingF:true});
 assert.equal(near.state.phase,"postplant");
 const disabled=stepBombRound(near.state,.05,{side:"defend",position:siteA,holdingF:true});
 assert.equal(disabled.state.phase,"ended");
 assert.equal(disabled.state.winner,"defend");
 assert.deepEqual(disabled.state.score,{attack:0,defend:1});
 assert.ok(disabled.events.includes("disabled"));
});
test("defuse stops and resets on interruption, can't succeed instantly",()=>{
 let planted=advance(action(),7.45,{side:"attack",position:siteB,holdingF:true}).state;
 const mid=advance(planted,3,{side:"defend",position:siteB,holdingF:true}).state;
 assert.ok(mid.disableProgress>2.9);
 const cancelled=stepBombRound(mid,.05,{side:"defend",position:siteB,holdingF:false}).state;
 assert.equal(cancelled.disableProgress,0);
 assert.equal(cancelled.phase,"postplant");
});
test("action clock expiry gives defenders win; planted clock expiry gives attackers win",()=>{
 const defense=advance(action(),181,{side:"attack",position:spawn});
 assert.equal(defense.state.phase,"ended");
 assert.equal(defense.state.winner,"defend");
 assert.deepEqual(defense.state.score,{attack:0,defend:1});
 const planted=advance(action(),7.45,{side:"attack",position:siteA,holdingF:true}).state;
 const attack=advance(planted,46,{side:"defend",position:spawn});
 assert.equal(attack.state.phase,"ended");
 assert.equal(attack.state.winner,"attack");
 assert.deepEqual(attack.state.score,{attack:1,defend:0});
});
test("eliminated attacker drops defuser; defender elimination never transfers it",()=>{
 let state=action();
 const killed=stepBombRound(state,.05,{side:"attack",position:{x:2,z:3},alive:false});
 assert.equal(killed.state.defuser.status,"ground");
 assert.equal(killed.state.defuser.x,2);
 assert.deepEqual(killed.events,["dropped"]);
 assert.equal(pickupRoundDefuser(killed.state,"defend",{x:2,z:3}).ok,false);
 const defense=stepBombRound(state,.05,{side:"defend",position:spawn,alive:false});
 assert.equal(defense.state.defuser.status,"carried");
});
test("new round preserves score but resets timers, phase and optional defuser choice",()=>{
 const old=endBombRound(action(),"attack","TEST WIN");
 const next=newFollowingRound(old,"leave");
 assert.equal(next.round,2);
 assert.deepEqual(next.score,{attack:1,defend:0});
 assert.equal(next.phase,"prep");
 assert.equal(next.time,45);
 assert.equal(next.defuser.status,"ground");
 assert.equal(next.winner,null);
});
test("pause/no delta never advances round, and time is clamped for slow frames",()=>{
 const fresh=newBombRound();
 assert.equal(stepBombRound(fresh,0).state,fresh);
 assert.equal(stepBombRound(fresh,NaN).state,fresh);
 assert.ok(stepBombRound(fresh,7).state.time>44.9);
 assert.equal(stepBombRound(fresh,-2).state,fresh);
});
test("objective prompts reflect role, site, defuser location and round outcome",()=>{
 assert.match(bombPrompt(newBombRound(),"attack",spawn),/PREPARATION/);
 assert.match(bombPrompt(action(),"attack",siteA),/HOLD F TO PLANT/);
 assert.match(bombPrompt(action("leave"),"attack",spawn),/PRESS F TO PICK UP/);
 const planted=advance(action(),7.45,{side:"attack",position:siteA,holdingF:true}).state;
 assert.match(bombPrompt(planted,"defend",siteA),/HOLD F TO DISABLE/);
 assert.match(bombPrompt(planted,"attack",siteA),/DEFUSER ACTIVE/);
 const ended=endBombRound(planted,"defend","DISABLED");
 assert.match(bombPrompt(ended,"defend",siteA),/DISABLED/);
});

test("holding X also drops defuser during 45s prep, at the attacker spawn",()=>{
 let prep=newBombRound({choice:"carry"});
 const before=advance(prep,.65,{side:"attack",position:spawn,holdingX:true});
 assert.equal(before.state.phase,"prep");
 assert.equal(before.state.defuser.status,"carried");
 const dropped=stepBombRound(before.state,.05,{
  side:"attack",position:spawn,holdingX:true});
 assert.equal(dropped.state.phase,"prep");
 assert.equal(dropped.state.defuser.status,"ground");
 assert.deepEqual([dropped.state.defuser.x,dropped.state.defuser.z],[0,8]);
 assert.ok(dropped.events.includes("dropped"));
 assert.equal(pickupRoundDefuser(dropped.state,"attack",spawn).ok,true);
});
