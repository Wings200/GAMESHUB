import test from "node:test";
import assert from "node:assert/strict";
import {defuserVisible} from "./bomb-round-view.js";
import {newBombRound,stepBombRound} from "./bomb-round.js";

test("a staged package is invisible through preparation for either team",()=>{
 const prep=newBombRound({choice:"leave"});
 assert.equal(defuserVisible(prep),false);
});

test("a dropped package appears in the action phase; carried stays hidden",()=>{
 const queued=newBombRound({choice:"leave",map:"house"});
 const live=stepBombRound(queued,45,{side:"defend"}).state;
 // Simulation is frame-clamped, just as a real round is: force exact phase.
 assert.equal(defuserVisible({...live,phase:"action"}),true);
 assert.equal(defuserVisible({...live,phase:"action",defuser:{status:"carried"}}),false);
 assert.equal(defuserVisible({...live,phase:"postplant",defuser:{status:"planted"}}),true);
});
