import test from "node:test";
import assert from "node:assert/strict";
import {newGame,joinGame,act,playerView,status,CHECKMATE_RESCUE_MS} from "../games/illegal-chess/game.mjs";
import {idx,inCheck} from "../games/illegal-chess/engine.mjs";

function room(){
 const g=newGame("ABCDEF","white-token-hash");
 joinGame(g,"black-token-hash");
 g.hands.w=[
  {id:"bishop-sniper",used:false},
  {id:"pawn-strike",used:false},
  {id:"parking-ticket",used:false}
 ];
 g.hands.b=[
  {id:"friendly-fire",used:false},
  {id:"pawn-sidestep",used:false},
  {id:"the-analyst",used:false}
 ];
 return g;
}
const move=(g,color,from,to)=>act(g,color,{type:"move",from,to});
function northeastMate(g){
 move(g,"w","e2","e4");
 move(g,"b","d7","d5");
 move(g,"w","g1","f3");
 move(g,"b","d5","e4");
 move(g,"w","f1","b5");
 move(g,"b","c8","d7");
 act(g,"w",{type:"card",card:"bishop-sniper",from:"b5",direction:"NE"});
}
test("Sniper's Gambit mate starts an identical 30-second rescue for both players",()=>{
 const g=room(),start=Date.now();
 northeastMate(g);
 assert.ok(inCheck(g.s,-1,g.snipers));
 assert.equal(g.rescue.color,"b");
 assert.ok(g.rescue.deadline>=start+CHECKMATE_RESCUE_MS);
 assert.ok(g.rescue.deadline<=Date.now()+CHECKMATE_RESCUE_MS);
 const now=status(g);
 assert.equal(now.done,false);
 assert.equal(now.winner,null);
 assert.ok(now.rescue.remainingMs>0);
 assert.equal(now.rescue.paused,false);
 const white=playerView(g,"w"),black=playerView(g,"b");
 assert.ok(white.status.rescue&&black.status.rescue);
 assert.equal(white.legal.length,0);
 assert.equal(black.legal.length,0);
 assert.equal(black.turn,"b");
});
test("Friendly Fire king self-capture escapes Sniper's Gambit and cancels the clock",()=>{
 const g=room();
 northeastMate(g);
 act(g,"b",{type:"card",card:"friendly-fire",from:"e8",to:"f7"});
 assert.equal(g.s.b[idx("f7")],"k");
 assert.equal(g.s.b[idx("e8")],".");
 assert.equal(g.rescue,null);
 assert.equal(inCheck(g.s,-1,g.snipers),false);
 assert.equal(status(g).done,false);
 assert.equal(g.s.t,1);
});
test("Remaining unusable cards still earn the full window, not an immediate loss",()=>{
 const g=room();
 g.hands.b=[{id:"the-analyst",used:false},{id:"objection",used:false},{id:"pawn-strike",used:false}];
 northeastMate(g);
 const deadline=g.rescue.deadline;
 assert.equal(status(g).done,false);
 // Playing a bonus card does not remove the king from check or reset the timer.
 act(g,"b",{type:"card",card:"pawn-strike"});
 assert.equal(g.rescue.deadline,deadline);
 assert.equal(status(g).done,false);
 assert.ok(inCheck(g.s,-1,g.snipers));
});
test("At 30 seconds server returns checkmate and refuses any further card",()=>{
 const g=room();northeastMate(g);
 assert.equal(status(g,g.rescue.deadline-1).done,false);
 const ended=status(g,g.rescue.deadline);
 assert.equal(ended.done,true);
 assert.equal(ended.winner,"w");
 assert.match(ended.text,/checkmate/i);
 g.rescue.deadline=Date.now()-1;
 assert.throws(()=>act(g,"b",{type:"card",card:"friendly-fire",from:"e8",to:"f7"}),/Game is over/);
 assert.equal(playerView(g,"w").status.done,true);
 assert.equal(playerView(g,"b").status.done,true);
});
test("Without any unused cards the same trap is immediate checkmate",()=>{
 const g=room();for(const card of g.hands.b)card.used=true;
 northeastMate(g);
 assert.equal(g.rescue,null);
 assert.equal(status(g).done,true);
 assert.equal(status(g).winner,"w");
});
test("An unrelated illegal self-capture cannot masquerade as a rescue",()=>{
 const g=room();northeastMate(g);
 const before=g.rescue.deadline;
 assert.throws(()=>act(g,"b",{type:"card",card:"friendly-fire",from:"a8",to:"b8"}),/king would be in check/);
 assert.equal(g.rescue.deadline,before);
 assert.equal(g.hands.b[0].used,false);
});
test("Objection! pauses the rescue clock while the opponent decides",()=>{
 const g=room();
 g.hands.w[1]={id:"objection",used:false};
 northeastMate(g);
 const originalDeadline=g.rescue.deadline;
 act(g,"b",{type:"card",card:"friendly-fire",from:"e8",to:"f7"});
 assert.equal(g.pendingReaction.defender,"w");
 assert.ok(g.rescue.pausedAt);
 assert.equal(status(g,g.rescue.deadline+100000).done,false,"A pending reaction cannot consume rescue time");
 // Simulate an objection response taking five seconds.
 g.rescue.pausedAt-=5000;
 act(g,"w",{type:"reaction",decision:"object"});
 assert.equal(g.pendingReaction,null);
 assert.ok(g.rescue.deadline>=originalDeadline+5000);
 assert.equal(g.rescue.pausedAt,undefined);
 assert.equal(status(g).done,false);
 assert.equal(g.cardBlocked.color,"b");
 assert.throws(()=>act(g,"b",{type:"card",card:"friendly-fire",from:"e8",to:"f7"}),/Objection! requires/);
});
test("Allowed Objection! response commits the defended position",()=>{
 const g=room();
 g.hands.w[1]={id:"objection",used:false};
 northeastMate(g);
 act(g,"b",{type:"card",card:"friendly-fire",from:"e8",to:"f7"});
 act(g,"w",{type:"reaction",decision:"allow"});
 assert.equal(g.pendingReaction,null);
 assert.equal(g.rescue,null);
 assert.equal(g.s.b[idx("f7")],"k");
 assert.equal(status(g).done,false);
});
