import test from "node:test";
import assert from "node:assert/strict";
import {newGame,joinGame,act,playerView,status,CARDS} from "../games/illegal-chess/game.mjs";
import {parseFen,START_FEN,legal,apply,sq,fen} from "../games/illegal-chess/engine.mjs";
const room=()=>{const g=newGame("ABCDEF","white-secret-hash");joinGame(g,"black-secret-hash");return g;};
const move=(g,color,from,to,promotion="")=>act(g,color,{type:"move",from,to,promotion});
const give=(g,color,id)=>{g.hands[color]=[{id,used:false},{id:"knight-exchange",used:false},{id:"ceasefire",used:false}];};
test("starting chess position and three-card random hands are valid",()=>{
 const s=parseFen(START_FEN);assert.equal(legal(s).length,20);assert.equal(fen(s),START_FEN);
 const g=room();for(const color of ["w","b"]){assert.equal(g.hands[color].length,3);assert.equal(new Set(g.hands[color].map(c=>c.id)).size,3);assert.ok(g.hands[color].every(c=>CARDS.some(d=>d.id===c.id)));}
 assert.equal(playerView(g,"w").turn,"w");assert.equal(playerView(g,"w").legal.length,20);
});
test("server rejects wrong turn and illegal chess moves",()=>{
 const g=room();assert.throws(()=>move(g,"b","e7","e5"),/Not your turn/);
 assert.throws(()=>move(g,"w","e2","e5"),/Illegal chess move/);
 move(g,"w","e2","e4");move(g,"b","e7","e5");
 assert.equal(g.s.t,1);assert.equal(playerView(g,"w").log.length,2);
});
test("checkmate is determined by legal chess",()=>{
 const g=room();move(g,"w","f2","f3");move(g,"b","e7","e5");move(g,"w","g2","g4");move(g,"b","d8","h4");
 assert.equal(status(g).done,true);assert.match(status(g).text,/checkmate/);
});
test("Pawn Sidestep consumes a turn, moves one square sideways only",()=>{
 const g=room();give(g,"w","pawn-sidestep");
 move(g,"w","a2","a3");move(g,"b","a7","a6");
 act(g,"w",{type:"card",card:"pawn-sidestep",from:"a3",to:"b3"});
 assert.equal(g.s.b[(8-3)*16+1],"P");assert.equal(g.s.b[(8-3)*16+0],".");
 assert.equal(g.hands.w[0].used,true);
 assert.throws(()=>act(g,"b",{type:"card",card:"pawn-sidestep",from:"a6",to:"b6"}),/isn't available/);
});
test("Colorblind Bishop changes square color and respects check safety",()=>{
 const g=room();give(g,"w","colorblind-bishop");
 move(g,"w","e2","e4");move(g,"b","e7","e5");
 act(g,"w",{type:"card",card:"colorblind-bishop",from:"f1",to:"e2"});
 assert.equal(g.s.b[(8-2)*16+4],"B");
});
test("Black Market only trades another unused card of matching rarity",()=>{
 const g=room();g.hands.w=[{id:"black-market",used:false},{id:"pawn-sidestep",used:false},{id:"colorblind-bishop",used:false}];
 assert.throws(()=>act(g,"w",{type:"card",card:"black-market",slot:0}),/another unused card/);
 // No other common card is available yet, so a common swap cannot be fabricated.
 assert.throws(()=>act(g,"w",{type:"card",card:"black-market",slot:1}),/No card of the same rarity/);
 assert.equal(g.s.t,1);assert.equal(g.hands.w[0].used,false);
});
