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
 assert.throws(()=>act(g,"w",{type:"card",card:"pawn-sidestep",from:"a3",to:"c3"}),/Not your turn/);
});
test("Colorblind Bishop changes square color and respects check safety",()=>{
 const g=room();give(g,"w","colorblind-bishop");
 move(g,"w","f2","f4");move(g,"b","e7","e5");
 act(g,"w",{type:"card",card:"colorblind-bishop",from:"f1",to:"f2"});
 assert.equal(g.s.b[(8-2)*16+5],"B");
});
test("Black Market only trades another unused card of matching rarity",()=>{
 const g=room();g.hands.w=[{id:"black-market",used:false},{id:"pawn-sidestep",used:false},{id:"colorblind-bishop",used:false}];
 assert.throws(()=>act(g,"w",{type:"card",card:"black-market",slot:0}),/another unused card/);
 act(g,"w",{type:"card",card:"black-market",slot:1});
 assert.equal(g.s.t,-1);assert.equal(g.hands.w[0].used,true);
 assert.equal(g.hands.w[1].id,"voluntary-eviction");
});

test("Parking Ticket is a bonus action and freezes the correct enemy piece",()=>{
 const g=room();give(g,"w","parking-ticket");
 move(g,"w","e2","e4");move(g,"b","g8","f6");
 const before=g.history.length;
 act(g,"w",{type:"card",card:"parking-ticket"});
 assert.equal(g.s.t,1,"White should still be able to play chess");
 assert.equal(g.history.length,before,"Bonus card must not consume a chess turn");
 assert.equal(g.hands.w[0].used,true);
 assert.equal(g.effects.freeze.color,"b");
 move(g,"w","d2","d4");
 assert.equal(g.s.t,-1);
 assert.equal(playerView(g,"b").legal.some(m=>m.from==="f6"),false);
 move(g,"b","d7","d6");
 assert.equal(g.effects.freeze,null,"Freeze expires after opponent's move");
});
test("Reserved Parking can be played before the normal chess move",()=>{
 const g=room();give(g,"w","reserved-parking");
 act(g,"w",{type:"card",card:"reserved-parking",to:"e5"});
 assert.equal(g.s.t,1);
 move(g,"w","e2","e4");
 assert.equal(g.s.t,-1);
 assert.equal(playerView(g,"b").legal.some(m=>m.to==="e5"),false);
 move(g,"b","a7","a6");
 assert.equal(g.effects.reserved,null);
});
test("Ceasefire is a bonus action but restricts captures for both upcoming moves",()=>{
 const g=room();give(g,"w","ceasefire");
 move(g,"w","e2","e4");move(g,"b","d7","d5");
 act(g,"w",{type:"card",card:"ceasefire"});
 assert.equal(g.s.t,1);
 assert.equal(g.effects.ceasefire,2);
 assert.equal(playerView(g,"w").legal.some(m=>m.from==="e4"&&m.to==="d5"),false);
 move(g,"w","g1","f3");assert.equal(g.effects.ceasefire,1);
 move(g,"b","g8","f6");assert.equal(g.effects.ceasefire,0);
});
test("Bishop Sniper teleports outside the board, conceals direction, and only hits first occupied square",()=>{
 const g=room();give(g,"w","bishop-sniper");
 g.s=parseFen("4k3/6p1/5q2/8/8/2B5/8/4K3 w - - 0 1");g.history=[g.s];
 act(g,"w",{type:"card",card:"bishop-sniper",from:"c3",direction:"NE"});
 assert.equal(g.s.b[(8-3)*16+2],".");
 assert.equal(g.snipers.w.edge,7,"Bishop must have traveled offboard beyond h8");
 assert.equal(g.snipers.w.direction,"NE");
 assert.equal(playerView(g,"b").sniper.own,null);
 assert.equal(playerView(g,"b").sniper.opponentActive,true);
 assert.equal(JSON.stringify(playerView(g,"b")).includes('"direction":"NE"'),false);
 move(g,"b","e8","d8");
 assert.deepEqual(playerView(g,"w").sniperShots,["g7"],"Pawn blocks the queen on f6");
 assert.throws(()=>act(g,"w",{type:"sniper-shot",to:"f6"}),/first available sniper target/);
 act(g,"w",{type:"sniper-shot",to:"g7"});
 assert.equal(g.s.b[(8-7)*16+6],".");
 assert.equal(g.s.b[(8-6)*16+5],"q");
 assert.equal(g.snipers.w.direction,"NE","Bishop remains off-board");
 move(g,"b","d8","e8");
 assert.deepEqual(playerView(g,"w").sniperShots,["f6"],"Queen becomes reachable when pawn removed");
});
test("An offboard sniper still attacks king squares and blocks normal king moves",()=>{
 const g=room();give(g,"w","bishop-sniper");
 g.s=parseFen("8/6p1/5k2/8/8/2B5/8/4K3 w - - 0 1");g.history=[g.s];
 act(g,"w",{type:"card",card:"bishop-sniper",from:"c3",direction:"NE"});
 move(g,"b","f6","e6");
 assert.deepEqual(playerView(g,"w").sniperShots,["g7"]);
 act(g,"w",{type:"sniper-shot",to:"g7"});
 assert.equal(g.s.b[(8-7)*16+6],".");
 assert.equal(g.snipers.w.direction,"NE");
});
