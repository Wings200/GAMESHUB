// BLACKOUT V7.1 tactical series and bounded anti-spawn-peek protection.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
const dir=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=path=>readFileSync(join(dir,path),"utf8");
const code=read("src/match-flow.js").replace(/^export /gm,"");
const {TacticalSeries,attackInsertionProtected,ENTRY_GRACE_MS,ENTRY_RADIUS}=
  new Function(code+";return {TacticalSeries,attackInsertionProtected,ENTRY_GRACE_MS,ENTRY_RADIUS}")();
test("V7.1 match counts real rounds, no duplication and halftime reverses roles",()=>{
 const series=new TacticalSeries("attacker");
 assert.equal(series.round,1);
 for(let i=1;i<=3;i++){
   assert.equal(series.nextRole,"attacker");
   assert.equal(series.record(i,i!==2,"attacker","RESULT "+i),true);
   assert.equal(series.record(i,true,"attacker"),false,"can't double-score a round");
 }
 assert.equal(series.round,4);
 assert.equal(series.nextRole,"defender","halftime must automatically change role");
 assert.equal(series.yourWins,2);
 assert.equal(series.theirWins,1);
 assert.equal(series.record(4,true,"attacker"),false,"old side must not score halftime");
 assert.equal(series.record(4,false,"defender"),true);
 assert.equal(series.round,5);
 assert.equal(series.record(5,true,"defender"),true);
 assert.equal(series.record(6,true,"defender"),true);
 assert.equal(series.finished,true);
 assert.equal(series.winner,"YOUR SQUAD");
 assert.equal(series.yourWins,4);
 assert.equal(series.theirWins,2);
 assert.equal(series.record(7,true,"attacker"),false,"no scoring after match completed");
 assert.match(series.resultLine,/MATCH WON/);
 assert.equal(series.history.length,6);
 assert.equal(series.snapshot.history[3].role,"defender");
});
test("V7.1 side rotation and seventh-round tie breaker for 3-3",()=>{
 const series=new TacticalSeries("defender");
 for(let i=1;i<=6;i++){
   assert.equal(series.nextRole,i<=3?"defender":"attacker");
   assert.equal(series.record(i,i%2===1,series.nextRole),true);
 }
 assert.equal(series.finished,false);
 assert.equal(series.yourWins,3);assert.equal(series.theirWins,3);
 assert.equal(series.round,7);
 assert.equal(series.nextRole,"defender");
 assert.equal(series.record(7,false,"defender"),true);
 assert.equal(series.winner,"OPPONENTS");
 assert.match(series.resultLine,/MATCH LOST/);
 series.reset("attacker");
 assert.deepEqual(series.snapshot.history,[]);
 assert.equal(series.finished,false);
 assert.equal(series.round,1);
 assert.equal(series.nextRole,"attacker");
});
test("V7.1 insertion safety is only attackers, only action, at most 2.3s",()=>{
 const spawn={x:3,y:0,z:5};
 const props={now:10001,actionStartedAt:10000,phase:"attack",
  team:"attacker",position:{x:4,y:0,z:5},insertion:spawn,firedAt:0};
 assert.equal(attackInsertionProtected(props),true);
 assert.equal(attackInsertionProtected({...props,phase:"prep"}),false);
 assert.equal(attackInsertionProtected({...props,team:"defender"}),false);
 assert.equal(attackInsertionProtected({...props,now:12300}),false);
 assert.equal(attackInsertionProtected({...props,now:12500}),false);
 assert.equal(attackInsertionProtected({...props,position:{x:9,y:0,z:5}}),false);
 assert.equal(attackInsertionProtected({...props,position:{x:4,y:4,z:5}}),false);
 assert.equal(attackInsertionProtected({...props,firedAt:10001}),false);
 assert.equal(attackInsertionProtected({...props,phase:"guard"}),true);
 assert.equal(attackInsertionProtected({...props,actionStartedAt:0}),false);
 assert.equal(attackInsertionProtected({...props,now:9999}),false);
 assert.equal(ENTRY_GRACE_MS,2300);assert.equal(ENTRY_RADIUS,3);
});
test("V7.1 actual gameplay wires score, automatic side changes, AI + player gun shield and end-of-match screen",()=>{
 const main=read("main.js"),obj=read("src/objective.js"),
   ai=read("src/squad-ai.js"),html=read("index.html"),css=read("competitive-ui.css");
 for(const text of ["matchSeries.record(","matchSeries.nextRole!==role",
   "launchNextSeriesRound()","matchSeries.finished",
   "restartSeries(role)","matchSeries.yourWins","matchSeries.theirWins",
   "attackInsertionProtected({","objectiveRound.playerFiredAt=now",
   "intermissionRounds.appendChild(pip)"])
   assert.ok(main.includes(text),"main missing "+text);
 assert.match(main,/objectiveRound\.roundNumber=matchSeries\.round/);
 assert.match(obj,/bot\.insertion=\{x:bot\.x,y:bot\.y\|\|0,z:bot\.z\}/);
 assert.match(obj,/this\.playerFiredAt=0;this\.actionStartedAt=0/);
 assert.match(ai,/attackInsertionProtected\(\{/);
 assert.match(ai,/if\(protectedEntry\)return/);
 for(const id of ["matchIntermission","matchIntermissionTitle",
   "matchIntermissionScore","matchIntermissionGuide","matchIntermissionRounds"])
   assert.ok(html.includes('id="'+id+'"'),"missing visual scoreboard "+id);
 assert.match(css,/\.bo-match-intermission/);
 assert.match(html,/blackout-v710-round-match/);
 assert.doesNotThrow(()=>new Function(code));
 assert.doesNotThrow(()=>new Function(obj.replace(/^import .*$/gm,"").replace(/^export /gm,"")));
 const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
 assert.doesNotThrow(()=>new AsyncFunction(main.replace(/^import .*$/gm,"")));
});
