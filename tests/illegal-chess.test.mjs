import test from "node:test";
import assert from "node:assert/strict";
import {newGame,joinGame,act,playerView,status,CARDS} from "../games/illegal-chess/game.mjs";
import {parseFen,START_FEN,legal,apply,sq,fen,idx} from "../games/illegal-chess/engine.mjs";
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
 assert.equal(status(g).done,true);assert.match(status(g).text,/checkmate/);assert.equal(status(g).winner,"b");
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
 const before=g.history.length,turnCount=g.moveCount;
 act(g,"w",{type:"card",card:"parking-ticket"});
 assert.equal(g.s.t,1,"White should still be able to play chess");
 assert.equal(g.history.length,before,"Bonus card must not consume a chess turn");
 assert.equal(g.moveCount,turnCount,"Bonus cards must not advance color-swap countdown");
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
 assert.equal(playerView(g,"b").sniper.opponentRevealed,null,"Enemy must not learn diagonal before shot one");
 assert.equal(JSON.stringify(playerView(g,"b")).includes('"direction":"NE"'),false);
 move(g,"b","e8","d8");
 assert.deepEqual(playerView(g,"w").sniperShots,["g7"],"Pawn blocks the queen on f6");
 assert.throws(()=>act(g,"w",{type:"sniper-shot",to:"f6"}),/first available sniper target/);
 act(g,"w",{type:"sniper-shot",to:"g7"});
 assert.equal(g.s.b[(8-7)*16+6],".");
 assert.equal(g.s.b[(8-6)*16+5],"q");
 assert.equal(g.snipers.w.direction,"NE","Bishop stays off-board after shot one");
 assert.equal(g.snipers.w.shots,1);
 assert.deepEqual(playerView(g,"b").sniper.opponentRevealed,{origin:"c3",direction:"NE"},"First shot reveals the diagonal");
 move(g,"b","d8","e8");
 assert.deepEqual(playerView(g,"w").sniperShots,["f6"],"Queen becomes reachable when pawn removed");
 act(g,"w",{type:"sniper-shot",to:"f6"});
 assert.equal(g.s.b[idx("f6")],"B","Second shot teleports the attacking bishop to the captured square");
 assert.equal(g.snipers.w,null,"Bishop leaves sniper mode after its second shot");
 assert.equal(playerView(g,"b").sniper.opponentActive,false);
 assert.equal(playerView(g,"b").sniper.opponentRevealed,null);
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

test("Hidden sniper attacks the king after a pawn blocking the firing line is removed",()=>{
 const g=room();give(g,"w","bishop-sniper");
 g.s=parseFen("8/6p1/4k3/8/8/2B5/8/4K3 w - - 0 1");g.history=[g.s];
 act(g,"w",{type:"card",card:"bishop-sniper",from:"c3",direction:"NE"});
 move(g,"b","e6","f6");
 assert.deepEqual(playerView(g,"w").sniperShots,["g7"],"Pawn is first occupant");
 act(g,"w",{type:"sniper-shot",to:"g7"});
 assert.match(status(g).text,/CHECK/,"The black king on f6 is now in sniper check");
 assert.equal(playerView(g,"b").legal.some(m=>m.from==="f6"&&m.to==="e5"),false,"King cannot move to another square on an attacked ray");
});
test("Optional Bishop Sniper test rooms guarantee the card for both players without changing ordinary draws",()=>{
 const g=newGame("SNIPER","a",{sniperTest:true});
 joinGame(g,"b");
 assert.equal(g.hands.w.length,3);assert.equal(g.hands.b.length,3);
 assert.equal(g.hands.w[0].id,"bishop-sniper");assert.equal(g.hands.b[0].id,"bishop-sniper");
 assert.equal(new Set(g.hands.w.map(c=>c.id)).size,3);
 assert.equal(new Set(g.hands.b.map(c=>c.id)).size,3);
 assert.equal(playerView(g,"b").testMode,true);
});

test("Every 20 turn-consuming actions swaps player control and their unused hands, not the board",()=>{
 const g=room(),whitePlayer=g.players.w,blackPlayer=g.players.b;
 g.hands.w=[{id:"pawn-sidestep",used:false}];
 g.hands.b=[{id:"black-market",used:false}];
 const moves=[
  ["a2","a3","a7","a6"],["b2","b3","b7","b6"],
  ["c2","c3","c7","c6"],["d2","d3","d7","d6"],
  ["e2","e3","e7","e6"],["f2","f3","f7","f6"],
  ["g2","g3","g7","g6"],["h2","h3","h7","h6"],
  ["a1","a2","a8","a7"],["h1","h2","h8","h7"]
 ];
 for(const [i,[wf,wt,bf,bt]] of moves.entries()){
  move(g,"w",wf,wt);
  assert.equal(g.swaps,0,"No swap before both players finish 10 moves");
  move(g,"b",bf,bt);
  if(i<9)assert.equal(g.swaps,0);
 }
 assert.equal(g.moveCount,20);
 assert.equal(g.swaps,1);
 assert.equal(g.players.w,blackPlayer);
 assert.equal(g.players.b,whitePlayer);
 assert.equal(g.hands.b[0].id,"pawn-sidestep","Cards stay with their original player");
 assert.equal(g.hands.w[0].id,"black-market");
 assert.equal(g.s.b[idx("a3")],"P","Board pieces do not change colors");
 assert.equal(g.s.b[idx("a6")],"p");
 assert.equal(g.s.t,1,"Normal white/black move order continues");
 assert.equal(playerView(g,"w").swaps,1);
 assert.equal(status(g).done,false);
});

test("Pawn Ram pushes an enemy pawn backward but leaves the attacking pawn in place",()=>{
 const g=room();give(g,"w","pawn-ram");
 g.s=parseFen("4k3/8/8/4p3/4P3/8/8/4K3 w - - 0 1");g.history=[g.s];
 act(g,"w",{type:"card",card:"pawn-ram",from:"e4",to:"e5"});
 assert.equal(g.s.b[idx("e4")],"P","Attacker stays on its square");
 assert.equal(g.s.b[idx("e5")],".","Enemy is pushed away");
 assert.equal(g.s.b[idx("e6")],"p","Enemy is pushed toward its home rank");
 assert.equal(g.hands.w[0].used,true);
 const fail=room();give(fail,"w","pawn-ram");
 fail.s=parseFen("4k3/8/4n3/4p3/4P3/8/8/4K3 w - - 0 1");fail.history=[fail.s];
 assert.throws(()=>act(fail,"w",{type:"card",card:"pawn-ram",from:"e4",to:"e5"}),/Pawn Ram needs/,"Pushing into an occupied square is forbidden");
});
test("Friendly Fire captures a friendly non-king with normal movement, not through blockers",()=>{
 const g=room();give(g,"w","friendly-fire");
 g.s=parseFen("4k3/8/8/8/8/B7/8/R3K3 w - - 0 1");g.history=[g.s];
 act(g,"w",{type:"card",card:"friendly-fire",from:"a1",to:"a3"});
 assert.equal(g.s.b[idx("a1")],".");
 assert.equal(g.s.b[idx("a3")],"R");
 assert.equal(g.hands.w[0].used,true);
 const fail=room();give(fail,"w","friendly-fire");
 fail.s=parseFen("4k3/8/8/8/8/B7/P7/R3K3 w - - 0 1");fail.history=[fail.s];
 assert.throws(()=>act(fail,"w",{type:"card",card:"friendly-fire",from:"a1",to:"a3"}),/normal capture path/);
 const king=room();give(king,"w","friendly-fire");
 king.s=parseFen("4k3/8/8/8/8/8/4R3/4K3 w - - 0 1");king.history=[king.s];
 assert.throws(()=>act(king,"w",{type:"card",card:"friendly-fire",from:"e2",to:"e1"}),/friendly non-king/);
});
test("Pawn Strike blocks both players' pawn advances for a full round, but not their captures",()=>{
 const g=room();give(g,"w","pawn-strike");
 const count=g.moveCount;
 act(g,"w",{type:"card",card:"pawn-strike"});
 assert.equal(g.moveCount,count,"Instant card is a bonus action");
 assert.equal(g.s.t,1,"Player still has an ordinary turn");
 assert.equal(playerView(g,"w").effects.pawnStrike,2);
 assert.equal(playerView(g,"w").legal.some(m=>m.from==="e2"&&m.to==="e4"),false);
 move(g,"w","g1","f3");
 assert.equal(g.effects.pawnStrike,1);
 assert.equal(playerView(g,"b").legal.some(m=>m.from==="e7"&&m.to==="e5"),false);
 move(g,"b","g8","f6");
 assert.equal(g.effects.pawnStrike,0);
 assert.equal(playerView(g,"w").legal.some(m=>m.from==="e2"&&m.to==="e4"),true);
 const capture=room();give(capture,"w","pawn-strike");
 capture.s=parseFen("4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1");capture.history=[capture.s];
 act(capture,"w",{type:"card",card:"pawn-strike"});
 assert.equal(playerView(capture,"w").legal.some(m=>m.from==="e4"&&m.to==="d5"),true,"Captures remain legal");
 assert.equal(playerView(capture,"w").legal.some(m=>m.from==="e4"&&m.to==="e5"),false);
});

test("Insurance Fraud protects a real piece for two enemy turns and freezes its capturer",()=>{
 const g=room();give(g,"w","insurance-fraud");
 g.s=parseFen("7k/7b/8/8/4R3/8/8/K7 w - - 0 1");g.history=[g.s];
 act(g,"w",{type:"card",card:"insurance-fraud",from:"e4"});
 assert.equal(g.effects.insurance.w.square,idx("e4"));
 assert.equal(g.effects.insurance.w.remaining,2);
 assert.equal(playerView(g,"b").effects.insurance.w.square,idx("e4"),"Opponent sees the insurance marker");
 move(g,"b","h7","e4");
 assert.equal(g.effects.insurance.w,null,"Insurance pays out on capture");
 assert.equal(g.effects.freeze.color,"b");
 assert.equal(g.effects.freeze.square,idx("e4"));
 move(g,"w","a1","a2");
 assert.equal(playerView(g,"b").legal.some(m=>m.from==="e4"),false,"The capturing bishop is frozen for one turn");
 move(g,"b","h8","g8");
 assert.equal(g.effects.freeze,null,"Freeze expires after the capturer's following turn");
});
test("Insurance Fraud follows an insured piece and expires after two enemy turns",()=>{
 const g=room();give(g,"w","insurance-fraud");
 g.s=parseFen("7k/8/8/8/8/8/4R3/K7 w - - 0 1");g.history=[g.s];
 act(g,"w",{type:"card",card:"insurance-fraud",from:"e2"});
 move(g,"b","h8","g8");
 assert.equal(g.effects.insurance.w.remaining,1);
 move(g,"w","e2","e4");
 assert.equal(g.effects.insurance.w.square,idx("e4"));
 move(g,"b","g8","h8");
 assert.equal(g.effects.insurance.w,null);
});
test("Prisoner Exchange restores both captured pawn colors once and is not available otherwise",()=>{
 const g=room();give(g,"w","prisoner-exchange");
 g.s=parseFen("7k/8/8/2pp4/1P2P3/8/8/K7 w - - 0 1");g.history=[g.s];
 assert.throws(()=>act(g,"w",{type:"card",card:"prisoner-exchange"}),/Both colors/);
 move(g,"w","b4","c5");
 move(g,"b","d5","e4");
 assert.equal(g.capturedPawns.w,1);
 assert.equal(g.capturedPawns.b,1);
 act(g,"w",{type:"card",card:"prisoner-exchange"});
 assert.equal(g.s.b[idx("a2")],"P");
 assert.equal(g.s.b[idx("a7")],"p");
 assert.equal(g.capturedPawns.w,0);
 assert.equal(g.capturedPawns.b,0);
 assert.equal(g.hands.w[0].used,true);
});
test("Promoting a pawn does not pretend it was captured for Prisoner Exchange",()=>{
 const g=room();
 g.s=parseFen("6k1/P7/8/8/8/8/8/7K w - - 0 1");g.history=[g.s];
 move(g,"w","a7","a8","q");
 assert.equal(g.capturedPawns.w,0);
});
test("Relocation Order lets the player pick an empty enemy home square without moving attacker or exposing king",()=>{
 const g=room();give(g,"w","relocation-order");
 g.s=parseFen("6k1/8/4r3/8/4R3/8/8/K7 w - - 0 1");g.history=[g.s];
 const choice=playerView(g,"w").relocationChoices.find(x=>x.from==="e4"&&x.to==="e6");
 assert.ok(choice,"A legal rook capture offers relocation");
 assert.ok(choice.homes.includes("h8"));
 assert.equal(choice.homes.includes("a8"),false,"Relocating a rook onto a8 would check White's king on a1");
 assert.throws(()=>act(g,"w",{type:"card",card:"relocation-order",from:"e4",to:"e6",dest:"a8"}),/legal capture target/);
 act(g,"w",{type:"card",card:"relocation-order",from:"e4",to:"e6",dest:"h8"});
 assert.equal(g.s.b[idx("e4")],"R");
 assert.equal(g.s.b[idx("e6")],".");
 assert.equal(g.s.b[idx("h8")],"r");
 assert.equal(g.hands.w[0].used,true);
});
