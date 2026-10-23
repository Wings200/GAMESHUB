import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
import {newBombRound,stepBombRound} from "./bomb-round.js";
import {newDroneRoster,registerDrone,selectedDrone,throwRequest,cameraRequest} from "./drone-roster.js";
import {newDrone} from "./drone-physics.js";

test("attacker prep begins with one persistent floor drone and an action spare",()=>{
 let roster=newDroneRoster("match");
 assert.equal(throwRequest(roster,"prep").kind,"initial");
 const camera=newDrone(0,7.35);
 roster=registerDrone(roster,camera,"initial");
 assert.equal(roster.drones.length,1);
 assert.equal(selectedDrone(roster),camera);
 assert.equal(cameraRequest(roster).action,"open");
 assert.equal(throwRequest(roster,"prep").action,"none");
 assert.equal(throwRequest(roster,"action").kind,"spare");
 assert.equal(throwRequest(roster,"postplant").kind,"spare");
});

test("preparation advances without an attacker body or defuser drop",()=>{
 let round=newBombRound({choice:"carry",map:"house"});
 for(let frame=0;frame<900;frame++)
  round=stepBombRound(round,.05,{side:"attack",position:null,
   holdingF:false,holdingX:false,alive:false}).state;
 assert.equal(round.phase,"action");
 assert.equal(round.time,180);
 assert.equal(round.defuser.status,"carried");
});

test("main runtime gates player existence until action and retains drone on phase change",()=>{
 const main=readFileSync(join(dirname(fileURLToPath(import.meta.url)),"main.js"),"utf8");
 assert.match(main,/function deployAutomaticPrepDrone\(\)/);
 assert.match(main,/registerPhysicalDrone\(newDrone\(location\.x,location\.z,spawn\.yaw\),"initial"\)/);
 assert.match(main,/isAttackerPreparation\(\)\|\|\(gameMode==="online"/);
 assert.match(main,/nextMode==="player"\)nextMode="drone"/);
 assert.match(main,/position:operatorDeployed\?player:null/);
 assert.match(main,/if\(wasAttackerPrep\&\&result\.events\.includes\("action"\)\)/);
 assert.match(main,/operatorDeployed=true;player=roundSpawn\(\);cameraEye=1\.65/);
 assert.match(main,/const request=throwRequest\(droneRoster,/);
 assert.match(main,/gameMode==="bomb"\?bombState\?\.phase:"range"/);
 assert.match(main,/resetRoundDrones\(\)/);
});
