import test from "node:test";
import assert from "node:assert/strict";
import {onlineBombView,onlineInteractPrompt,onlineObjectiveInteraction} from "./network-objectives.js";
import {defuserVisible} from "./bomb-round-view.js";
import {BOMB_RULES} from "./bomb-round.js";
import {HOUSE_ONLINE_MAP} from "../src/house-online-map.js";
import {createOnlineWorld,nearBombSite} from "../online-world.js";
const now=1_700_000_000_000;
function snap(phase="action",bomb={}){
 return {mode:"active",phase,phaseEndsAt:now+150000,round:2,id:"a1",
   self:{id:"a1",side:"attacker"},world:{
    bomb:{phase:"carried",carrierId:"a1",site:null,position:null,
      expiresAt:0,...bomb},
    interactions:{}
   }};
}
test("online objective adapter requires actual server room state",()=>{
 assert.equal(onlineBombView(null,now),null);
 assert.equal(onlineBombView({mode:"lobby",world:snap().world},now),null);
 assert.equal(onlineBombView({mode:"active",world:null},now),null);
});
test("attacker preparation shares clock but does not expose defuser prop",()=>{
 const state=onlineBombView(snap("prep"),now);
 assert.equal(state.phase,"prep");
 assert.equal(state.time,150);
 assert.equal(state.localCarrier,true);
 assert.equal(defuserVisible(state),false);
});
test("dropped defuser is physical and teammate cannot claim local ownership",()=>{
 const input=snap("action",{phase:"dropped",carrierId:null,
  position:{x:4,y:0,z:-13}});
 const state=onlineBombView(input,now);
 assert.equal(state.defuser.status,"ground");
 assert.equal(state.defuser.x,4);
 assert.equal(state.localCarrier,false);
 assert.equal(defuserVisible(state),true);
 input.world.bomb={...input.world.bomb,phase:"carried",carrierId:"other",position:null};
 assert.equal(onlineInteractPrompt(onlineBombView(input,now),"attack",{}),
  "TEAMMATE CARRYING DEFUSER · COVER THEM");
});
test("server-only plant/disable deadlines animate original defuser interactions",()=>{
 const plant=snap("action");
 plant.world.interactions.a1={kind:"plant",endsAt:now+3250};
 const planting=onlineBombView(plant,now);
 assert.equal(onlineObjectiveInteraction(plant),"plant");
 assert.ok(planting.plantProgress>0);
 assert.ok(planting.plantProgress<BOMB_RULES.plantSeconds);
 const planted=snap("action",{phase:"planted",carrierId:null,site:"A",
  position:{x:-6,y:0,z:-15},expiresAt:now+45000});
 planted.self={id:"a1",side:"defender"};
 planted.world.interactions.a1={kind:"disable",endsAt:now+3000};
 const disabling=onlineBombView(planted,now);
 assert.equal(disabling.phase,"postplant");
 assert.equal(disabling.time,45);
 assert.equal(disabling.defuser.status,"planted");
 assert.equal(onlineObjectiveInteraction(planted),"disable");
 assert.ok(disabling.disableProgress>0);
 assert.equal(onlineObjectiveInteraction({...planted,world:{
   ...planted.world,interactions:{}}}),null);
});
test("original house rejects plant positions outside the real room/floor",()=>{
 const world=createOnlineWorld(HOUSE_ONLINE_MAP,[{id:"a1",side:"attacker"}]);
 for(const site of BOMB_RULES.sites){
  assert.equal(nearBombSite(HOUSE_ONLINE_MAP,world,{x:site.x,y:0,z:site.z}),site.id);
  assert.equal(nearBombSite(HOUSE_ONLINE_MAP,world,{x:site.x,y:1.35,z:site.z}),null);
  assert.equal(nearBombSite(HOUSE_ONLINE_MAP,world,{x:site.x,y:3.2,z:site.z}),null);
 }
});
