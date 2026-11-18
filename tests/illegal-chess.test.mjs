import test from "node:test";
import assert from "node:assert/strict";
import {newGame,joinGame,randomHand,act,playerView,status,CARDS} from "../games/illegal-chess/game.mjs";
import {parseFen,START_FEN,legal,apply,sq,fen,idx} from "../games/illegal-chess/engine.mjs";
import {ANALYST_GRADES,ANALYST_SYMBOLS,classifyAnalyst} from "../games/illegal-chess/analyst.mjs";
import {MOVE_COINS,parseUciInfo,classifyStockfish,createStockfishReviewer,engineSources} from "../games/illegal-chess/stockfish-review.mjs";
import {nextCinematic,cinematicCaption,CINEMATIC_DURATIONS,newCardCasts} from "../games/illegal-chess/cinematic.mjs";
import {SNIPER_3D_DURATION,SNIPER_3D_PHASES,shotPhase,sniperPath,cinematicCamera,square3D,sniperMotion} from "../games/illegal-chess/sniper-3d.mjs";
import {createSniperSoundtrack,SNIPER_SOUND_CUES,SNIPER_FALLBACK_CUES,SNIPER_TELEPORT_CUES} from "../games/illegal-chess/sniper-sound.mjs";
import {buildSculptMeshes,sculptAssetCatalog} from "../games/illegal-chess/sniper-sculpts.mjs";
const room=()=>{
 const g=newGame("ABCDEF","white-secret-hash");joinGame(g,"black-secret-hash");
 // General engine tests must never hang on a random Objection reaction.
 // Reaction-specific tests grant Objection explicitly with give().
 for(const color of ["w","b"])for(const item of g.hands[color])if(item.id==="objection"){
  item.id=CARDS.find(c=>c.id!=="objection"&&!g.hands[color].some(h=>h.id===c.id)).id;
 }
 return g;
};
const move=(g,color,from,to,promotion="")=>act(g,color,{type:"move",from,to,promotion});
const give=(g,color,id)=>{g.hands[color]=[{id,used:false},{id:"knight-exchange",used:false},{id:"ceasefire",used:false}];};
test("starting chess position and three-card random hands are valid",()=>{
 const s=parseFen(START_FEN);assert.equal(legal(s).length,20);assert.equal(fen(s),START_FEN);
 const g=room();for(const color of ["w","b"]){assert.equal(g.hands[color].length,3);assert.equal(new Set(g.hands[color].map(c=>c.id)).size,3);assert.ok(g.hands[color].every(c=>CARDS.some(d=>d.id===c.id)));}
 assert.equal(playerView(g,"w").turn,"w");assert.equal(playerView(g,"w").legal.length,20);
});
test("Matchmaking deals six distinct cards, without duplicate hands across the two players",()=>{
 for(let i=0;i<60;i++){
  const g=newGame("NO-REPEATS","white"+i);joinGame(g,"black"+i);
  assert.equal(new Set([...g.hands.w,...g.hands.b].map(c=>c.id)).size,6);
 }
});
test("Every card has the same base draw probability regardless of rarity",()=>{
 const trials=12000,counts=new Map(CARDS.map(c=>[c.id,0]));
 for(let i=0;i<trials;i++){
  const hand=randomHand();
  assert.equal(new Set(hand.map(c=>c.id)).size,3,"A hand is sampled without replacement");
  for(const item of hand)counts.set(item.id,counts.get(item.id)+1);
 }
 const expected=trials*3/CARDS.length;
 for(const card of CARDS){
  const actual=counts.get(card.id);
  assert.ok(Math.abs(actual-expected)<expected*.2,card.name+" should not be weighted by rarity");
 }
 // Requested exclusions matter only when another player already has a card.
 const excluded=CARDS.slice(0,3).map(c=>c.id);
 for(let i=0;i<50;i++)assert.ok(randomHand(excluded).every(c=>!excluded.includes(c.id)));
});
test("Expansion wave: ten new Common cards can be played and consume a turn",()=>{
 const cases=[
  ["pawn-moonwalk","4k3/8/8/8/4P3/8/8/4K2R w K - 0 1","e4","e3","e3","P"],
  ["jaywalking","4k3/8/8/8/4P3/8/8/4K2R w K - 0 1","e4","f5","f5","P"],
  ["knight-walks","4k3/8/8/8/4N3/8/8/4K2R w K - 0 1","e4","e5","e5","N"],
  ["rooks-shortcut","k7/8/8/8/4R3/8/8/4K3 w - - 0 1","e4","f5","f5","R"],
  ["bishop-vault","k7/8/8/8/2B5/3p4/8/4K3 w - - 0 1","c4","e2","e2","B"],
  ["triple-step","k7/8/8/8/8/8/4P3/4K2R w K - 0 1","e2","e5","e5","P"],
  ["pawn-headbutt","k7/8/8/4n3/4P3/8/8/4K2R w K - 0 1","e4","e5","e5","P"],
  ["pawn-parkour","k7/8/3p4/8/4P3/8/8/4K2R w K - 0 1","e4","e6","e6","P"],
  ["royal-uber","k7/8/8/8/8/8/8/4K2R w K - 0 1","e1","g1","g1","K"],
  ["knight-bishop-swap","k7/8/8/8/8/3B4/1N6/4K2R w K - 0 1","b2","d3","d3","N"]
 ];
 for(const [id,setup,from,to,target,piece] of cases){
  const g=room();g.s=parseFen(setup);g.history=[g.s];give(g,"w",id);
  assert.doesNotThrow(()=>act(g,"w",{type:"card",card:id,from,to}),id);
  assert.equal(g.s.b[idx(target)],piece,id+" destination");
  assert.equal(g.moveCount,1,id+" turn count");
  assert.equal(g.s.t,-1,id+" next player");
  assert.equal(g.hands.w[0].used,true,id+" card spent");
  if(id==="pawn-headbutt")assert.equal(g.capturedPieces.b.n,1,"Headbutt must count a captured piece");
  if(id==="knight-bishop-swap")assert.equal(g.s.b[idx("b2")],"B");
  if(id==="royal-uber")assert.equal(g.s.b[idx("h1")],"R","Royal Uber does not castle");
  if(id==="pawn-parkour"){
   assert.equal(g.s.ep,idx("e5"),"Parkour creates a normal one-turn en passant square");
   assert.ok(legal(g.s).some(m=>sq(m[0])==="d6"&&sq(m[1])==="e5"&&m[3]==="ep"));
  }
 }
});
test("New card abilities reject invalid moves and preserve king safety",()=>{
 const bad=[
  ["pawn-moonwalk","e4","d3"],
  ["jaywalking","e4","e5"],
  ["knight-walks","e4","f6"],
  ["rooks-shortcut","e4","e5"],
  ["bishop-vault","e4","f7"],
  ["triple-step","e4","e7"],
  ["pawn-headbutt","e4","e5"],
  ["pawn-parkour","e4","e7"],
  ["royal-uber","e1","h1"],
  ["knight-bishop-swap","e4","f5"]
 ];
 for(const [id,from,to] of bad){
  const g=room();give(g,"w",id);
  assert.throws(()=>act(g,"w",{type:"card",card:id,from,to}),/Choose|Pawn Strike|reserved|frozen/i,id);
  assert.equal(g.moveCount,0,id+" invalid attempt must not consume turn");
 }
 const g=room();give(g,"w","royal-uber");
 g.s=parseFen("k4r2/8/8/8/8/8/8/4K3 w - - 0 1");g.history=[g.s];
 assert.throws(()=>act(g,"w",{type:"card",card:"royal-uber",from:"e1",to:"g1"}),/check|safe/i,"King may not cross attacked f1");
});
test("server rejects wrong turn and illegal chess moves",()=>{
 const g=room();assert.throws(()=>move(g,"b","e7","e5"),/Not your turn/);
 assert.throws(()=>move(g,"w","e2","e5"),/Illegal chess move/);
 move(g,"w","e2","e4");move(g,"b","e7","e5");
 assert.equal(g.s.t,1);assert.equal(playerView(g,"w").log.length,2);
});
test("checkmate is determined by legal chess when the defender has no remaining cards",()=>{
 const g=room();g.hands.w.forEach(card=>card.used=true);
 move(g,"w","f2","f3");move(g,"b","e7","e5");move(g,"w","g2","g4");move(g,"b","d8","h4");
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
test("Black Market uniformly trades an unused card for any different card, regardless of rarity",()=>{
 const g=room();g.hands.w=[{id:"black-market",used:false},{id:"pawn-sidestep",used:false},{id:"colorblind-bishop",used:false}];
 assert.throws(()=>act(g,"w",{type:"card",card:"black-market",slot:0}),/another unused card/);
 act(g,"w",{type:"card",card:"black-market",slot:1});
 assert.equal(g.s.t,-1);assert.equal(g.hands.w[0].used,true);
 assert.ok(CARDS.some(c=>c.id===g.hands.w[1].id));
 assert.notEqual(g.hands.w[1].id,"pawn-sidestep");
 assert.notEqual(g.hands.w[1].id,"colorblind-bishop");
 let differentTier=false;
 for(let i=0;i<50;i++){
  const next=room();next.hands.w=[{id:"black-market",used:false},{id:"pawn-sidestep",used:false},{id:"colorblind-bishop",used:false}];
  act(next,"w",{type:"card",card:"black-market",slot:1});
  if(CARDS.find(c=>c.id===next.hands.w[1].id).rarity!=="Common")differentTier=true;
 }
 assert.ok(differentTier,"Replacement must be allowed from another rarity");
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
test("Normal rooms always draw three unique random cards without guaranteed test mode",()=>{
 const g=newGame("NORMAL","a");
 joinGame(g,"b");
 for(const color of ["w","b"]){
  assert.equal(g.hands[color].length,3);
  assert.equal(new Set(g.hands[color].map(c=>c.id)).size,3);
  assert.ok(g.hands[color].every(c=>CARDS.some(d=>d.id===c.id)));
 }
 assert.equal(Object.hasOwn(g,"sniperTest"),false);
 assert.equal(Object.hasOwn(g,"analystTest"),false);
 const view=playerView(g,"b");
 assert.equal(Object.hasOwn(view,"testMode"),false);
 assert.equal(Object.hasOwn(view,"analystTest"),false);
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
 g.s=parseFen("7k/7b/8/8/4R3/8/8/K4N2 w - - 0 1");g.history=[g.s];
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

test("Delayed En Passant gives one legal extra opportunity, not unlimited en passant",()=>{
 const g=room();give(g,"b","delayed-en-passant");
 g.s=parseFen("7k/8/8/8/3p4/8/4P3/K7 w - - 0 1");g.history=[g.s];
 move(g,"w","e2","e4");
 assert.equal(playerView(g,"b").legal.some(m=>m.from==="d4"&&m.to==="e3"),true,"Immediate en passant follows normal chess");
 move(g,"b","h8","g8");
 move(g,"w","a1","a2");
 assert.equal(playerView(g,"b").legal.some(m=>m.from==="d4"&&m.to==="e3"),false,"Expired normal en passant");
 assert.deepEqual(playerView(g,"b").delayedEpTargets,[{from:"d4",to:"e3"}]);
 const before=g.moveCount;
 act(g,"b",{type:"card",card:"delayed-en-passant"});
 assert.equal(g.moveCount,before,"Activation is a bonus action");
 assert.equal(playerView(g,"b").legal.some(m=>m.from==="d4"&&m.to==="e3"),true);
 move(g,"b","d4","e3");
 assert.equal(g.s.b[idx("e3")],"p");
 assert.equal(g.s.b[idx("e4")],".","Captures the passed pawn rather than teleporting onto it");
 assert.equal(g.effects.delayedEp,null,"Extra capture authorization expires after the turn");
 assert.equal(g.hands.b[0].used,true);
});
test("Delayed En Passant cannot fire after the victim leaves its square or on the wrong turn",()=>{
 const g=room();give(g,"b","delayed-en-passant");
 g.s=parseFen("7k/8/8/8/3p4/8/4P3/K7 w - - 0 1");g.history=[g.s];
 move(g,"w","e2","e4");
 assert.throws(()=>act(g,"b",{type:"card",card:"delayed-en-passant"}),/No delayed en passant/);
 move(g,"b","h8","g8");
 move(g,"w","e4","e5");
 assert.deepEqual(playerView(g,"b").delayedEpTargets,[]);
 assert.throws(()=>act(g,"b",{type:"card",card:"delayed-en-passant"}),/No delayed en passant/);
});
test("Promotion Recall uses a genuinely captured piece, substitutes for promotion, and consumes its record",()=>{
 const g=room();give(g,"w","promotion-recall");
 g.s=parseFen("1r2k3/P7/8/8/8/8/7K/1N6 b - - 0 1");g.history=[g.s];
 move(g,"b","b8","b1");
 assert.equal(g.capturedPieces.w.n,1);
 const choice=playerView(g,"w").recallChoices.find(c=>c.from==="a7"&&c.to==="a8");
 assert.ok(choice);
 assert.deepEqual(choice.options,[{into:"n",home:"g1"}],"Occupied b1 is not a revival target");
 assert.throws(()=>act(g,"w",{type:"card",card:"promotion-recall",from:"a7",to:"a8",into:"n",home:"b1"}),/Promotion Recall requires/);
 act(g,"w",{type:"card",card:"promotion-recall",from:"a7",to:"a8",into:"n",home:"g1"});
 assert.equal(g.s.b[idx("a7")],".");
 assert.equal(g.s.b[idx("a8")],".","No ordinary promoted piece is left on the last rank");
 assert.equal(g.s.b[idx("g1")],"N","Captured knight is revived on the home square");
 assert.equal(g.capturedPieces.w.n,0);
 assert.equal(g.capturedPawns.w,0,"Using the pawn for recall is not counted as a pawn capture");
 assert.equal(g.hands.w[0].used,true);
});
test("Time Capsule marks one piece, restricts the setup move and can return that same piece next turn",()=>{
 const g=room();give(g,"w","time-capsule");
 g.s=parseFen("7k/8/8/8/8/8/8/R6K w - - 0 1");g.history=[g.s];
 const count=g.moveCount;
 act(g,"w",{type:"card",card:"time-capsule",from:"a1"});
 assert.equal(g.moveCount,count);
 assert.equal(g.effects.timeCapsule.stage,"armed");
 assert.equal(playerView(g,"b").effects.timeCapsule.origin,"a1","Opponent sees the marked square");
 assert.equal(playerView(g,"w").legal.some(m=>m.from==="h1"),false,"Must move marked rook first");
 assert.throws(()=>move(g,"w","h1","g1"),/Illegal chess move/);
 move(g,"w","a1","a3");
 assert.equal(g.effects.timeCapsule.stage,"return");
 assert.equal(g.effects.timeCapsule.square,idx("a3"));
 move(g,"b","h8","g8");
 assert.deepEqual(playerView(g,"w").capsuleReturn,{from:"a3",to:"a1"});
 act(g,"w",{type:"time-capsule-return"});
 assert.equal(g.s.b[idx("a1")],"R");
 assert.equal(g.s.b[idx("a3")],".");
 assert.equal(g.effects.timeCapsule,null,"One return uses up the marker");
 assert.equal(g.hands.w[0].used,true);
});
test("Time Capsule does not overwrite a square occupied by the opponent",()=>{
 const g=room();give(g,"w","time-capsule");
 g.s=parseFen("7k/8/8/8/8/1n6/8/R6K w - - 0 1");g.history=[g.s];
 act(g,"w",{type:"card",card:"time-capsule",from:"a1"});
 move(g,"w","a1","a2");
 move(g,"b","b3","a1");
 assert.equal(playerView(g,"w").capsuleReturn,null);
 assert.throws(()=>act(g,"w",{type:"time-capsule-return"}),/no longer legal/);
 move(g,"w","a2","a3");
 assert.equal(g.effects.timeCapsule,null);
 assert.equal(g.s.b[idx("a1")],"n");
});

test("Identity Theft swaps ONLY opponent appearances for exactly their next completed turn",()=>{
 const g=room();give(g,"w","identity-theft");
 g.s=parseFen("4k3/8/8/8/8/8/2N1B3/4K3 w - - 0 1");g.history=[g.s];
 act(g,"w",{type:"card",card:"identity-theft",from:"c2",to:"e2"});
 assert.equal(g.s.b[idx("c2")],"N");assert.equal(g.s.b[idx("e2")],"B");
 assert.ok(playerView(g,"w").fen.startsWith("4k3/8/8/8/8/8/2N1B3/4K3"));
 assert.ok(playerView(g,"b").fen.startsWith("4k3/8/8/8/8/8/2B1N3/4K3"),"Opponent sees swapped images");
 assert.equal(Object.hasOwn(playerView(g,"b"),"identityTheft"),false,"Real identity mapping stays secret");
 move(g,"b","e8","d8");
 assert.equal(g.identityTheft,null,"Appearance expires at the end of the opponent's turn");
 assert.ok(playerView(g,"b").fen.includes("2N1B3"));
});
test("Classified Promotion hides the true piece from FEN and last-move metadata until it moves",()=>{
 const g=room();give(g,"w","classified-promotion");
 g.s=parseFen("7k/P7/8/8/8/8/5P2/7K w - - 0 1");g.history=[g.s];
 act(g,"w",{type:"card",card:"classified-promotion"});
 assert.equal(g.s.t,1,"Arming is a bonus action");
 assert.equal(playerView(g,"w").legal.some(m=>m.from==="h1"),false,"Must promote now");
 move(g,"w","a7","a8","n");
 assert.equal(g.s.b[idx("a8")],"N");
 assert.equal(g.classified.w?.piece,"N");
 assert.ok(playerView(g,"b").fen.startsWith("P6k"),"Enemy sees a pawn-shaped disguise");
 assert.equal(playerView(g,"b").last.piece,"P","Last move does not leak promoted type");
 assert.ok(!JSON.stringify(playerView(g,"b").log).includes("= N"));
 move(g,"b","h8","g8");
 move(g,"w","a8","b6");
 assert.equal(g.classified.w,null,"Piece moving reveals its type");
 assert.ok(playerView(g,"b").fen.includes("/1N6/"));
});
test("A secretly promoted piece reveals itself when it directly gives check",()=>{
 const g=room();give(g,"w","classified-promotion");
 g.s=parseFen("7k/P7/8/8/8/8/8/7K w - - 0 1");g.history=[g.s];
 act(g,"w",{type:"card",card:"classified-promotion"});
 move(g,"w","a7","a8","q");
 assert.equal(g.classified.w,null,"Queen immediately checks king across the eighth rank");
 assert.ok(playerView(g,"b").fen.startsWith("Q6k"));
 assert.match(playerView(g,"b").status.text,/CHECK/);
});
test("Objection! intercepts a card without consuming it and forces a normal move",()=>{
 const g=room();give(g,"w","voluntary-eviction");give(g,"b","objection");
 act(g,"w",{type:"card",card:"voluntary-eviction",from:"g1"});
 assert.ok(g.pendingReaction);
 assert.equal(g.s.b[idx("g1")],"N","Board not mutated while reaction is pending");
 assert.equal(g.hands.w[0].used,false);
 assert.equal(playerView(g,"b").pendingReaction.canReact,true);
 assert.equal(playerView(g,"w").legal.length,0);
 assert.equal(JSON.stringify(playerView(g,"b")).includes('"from":"g1"'),false,"Pending card parameters must not be exposed");
 assert.throws(()=>move(g,"w","e2","e4"),/Waiting for the opponent/);
 act(g,"b",{type:"reaction",decision:"object"});
 assert.equal(g.pendingReaction,null);
 assert.equal(g.hands.b[0].used,true);
 assert.equal(g.hands.w[0].used,false,"Opponent retains rejected card");
 assert.equal(g.moveCount,0);
 assert.throws(()=>act(g,"w",{type:"card",card:"voluntary-eviction",from:"g1"}),/requires a normal chess move/);
 move(g,"w","e2","e4");
 assert.equal(g.cardBlocked,null);
 assert.equal(g.s.b[idx("g1")],"N");
});
test("Declining Objection! authorizes the original card once without consuming the reaction card",()=>{
 const g=room();give(g,"w","voluntary-eviction");give(g,"b","objection");
 act(g,"w",{type:"card",card:"voluntary-eviction",from:"b1"});
 act(g,"b",{type:"reaction",decision:"allow"});
 assert.equal(g.s.b[idx("b1")],".");
 assert.equal(g.hands.w[0].used,true);
 assert.equal(g.hands.b[0].used,false);
 assert.equal(g.moveCount,1);
 assert.equal(g.pendingReaction,null);
});
test("Counterfeit copies the last opposing card on the following turn, using its own card and turn",()=>{
 const g=room();give(g,"w","voluntary-eviction");give(g,"b","counterfeit");
 act(g,"w",{type:"card",card:"voluntary-eviction",from:"g1"});
 assert.equal(playerView(g,"b").counterfeitOffer?.id,"voluntary-eviction");
 act(g,"b",{type:"card",card:"counterfeit",from:"g8"});
 assert.equal(g.s.b[idx("g8")],".");
 assert.equal(g.hands.b[0].used,true);
 assert.equal(g.moveCount,2);
 assert.equal(g.s.t,1,"Copy uses Black's entire chess turn");
 assert.equal(playerView(g,"b").counterfeitOffer,null,"Copy offer expires after acting");
});
test("Copying a bonus card via Counterfeit consumes the full turn and retains its duration",()=>{
 const g=room();give(g,"w","pawn-strike");give(g,"b","counterfeit");
 act(g,"w",{type:"card",card:"pawn-strike"});
 move(g,"w","g1","f3");
 assert.equal(playerView(g,"b").counterfeitOffer?.id,"pawn-strike");
 act(g,"b",{type:"card",card:"counterfeit"});
 assert.equal(g.s.t,1,"Black has spent its turn copying the bonus");
 assert.equal(g.effects.pawnStrike,2,"Copied card affects both forthcoming turns");
 assert.equal(playerView(g,"w").legal.some(m=>m.from==="e2"&&m.to==="e4"),false);
});

test("Enemy cannot identify disguised promotions using Relocation Order or public effect metadata",()=>{
 const g=room();give(g,"w","classified-promotion");give(g,"b","relocation-order");
 g.s=parseFen("7k/P7/r7/8/8/8/5P2/7K w - - 0 1");g.history=[g.s];
 act(g,"w",{type:"card",card:"classified-promotion"});
 assert.throws(()=>act(g,"w",{type:"card",card:"voluntary-eviction",from:"h1"}),/Classified Promotion requires/);
 move(g,"w","a7","a8","n");
 assert.equal(g.s.b[idx("a8")],"N");
 const view=playerView(g,"b");
 assert.ok(view.fen.startsWith("P6k"));
 assert.equal(view.relocationChoices.some(c=>c.to==="a8"),false,"No original knight home-squares leak through relocation choices");
 g.effects.insurance.w={color:"w",square:idx("a8"),piece:"N",remaining:2};
 const hidden=playerView(g,"b");
 assert.equal(Object.hasOwn(hidden.effects.insurance.w,"piece"),false,"Enemy only sees public insurance square and duration");
 assert.equal(playerView(g,"w").effects.insurance.w.piece,"N","The owner still sees their actual piece");
});

test("The Analyst remains passive across the original 26 and the ten-card Common expansion",()=>{
 assert.equal(CARDS.length,36);
 const card=CARDS.find(c=>c.id==="the-analyst");
 assert.deepEqual({rarity:card.rarity,mode:card.mode},{rarity:"Legendary",mode:"passive"});
 assert.deepEqual(ANALYST_GRADES,["Book","Best","Excellent","Good","Inaccuracy","Mistake","Blunder","Brilliant"]);
});
test("The Analyst grades both moves for the OWNER only, without consuming the passive",()=>{
 const g=room();give(g,"w","the-analyst");give(g,"b","pawn-sidestep");
 assert.equal(playerView(g,"w").analyst.active,true);
 assert.equal(playerView(g,"b").analyst.active,false,"Opponent must not inherit the owner's passive");
 assert.throws(()=>act(g,"w",{type:"card",card:"the-analyst"}),/passive/);
 move(g,"w","e2","e4");
 move(g,"b","e7","e5");
 const view=playerView(g,"w"),nonowner=playerView(g,"b");
 assert.equal(g.hands.w[0].used,false,"The card never consumes a turn or a use");
 assert.equal(g.moveCount,2);
 assert.equal(view.analyst.entries.length,2);
 assert.deepEqual(nonowner.analyst,{active:false,entries:[],worker:null},
  "Non-owner receives NO grades, FEN inputs, UCI moves or lease details");
 assert.deepEqual(view.analyst.entries.map(x=>x.side),["w","b"]);
 assert.equal(view.analyst.entries[0].turn,1);
 for(const entry of view.analyst.entries){
  assert.equal(entry.status,"pending","Server must never invent Stockfish grades");
  assert.equal(entry.grade,"Analyzing");
  assert.equal(entry.symbol,null);
  assert.equal(entry.estimated,false);
  assert.ok(entry.beforeFen?.includes(" w ")||entry.beforeFen?.includes(" b "));
  assert.match(entry.uci,/^[a-h][1-8][a-h][1-8][qrbn]?$/);
  assert.ok(typeof entry.reason==="string"&&entry.reason.length);
  assert.equal(Object.hasOwn(entry,"bestMove"),false,"Never leak inferred hidden possibilities or specific secrets");
 }
});
test("The Analyst still works when received through ordinary gameplay",()=>{
 const g=newGame("NORMAL","first");joinGame(g,"second");
 give(g,"w","the-analyst");
 give(g,"b","the-analyst");
 for(const color of ["w","b"])assert.equal(playerView(g,color).analyst.active,true);
 assert.equal(Object.hasOwn(playerView(g,"w"),"analystTest"),false);
});
test("Analyst grade categories map deterministic score gaps and tactical exceptions",()=>{
 const grade=(gap,more={})=>classifyAnalyst({gap,...more});
 assert.equal(grade(20,{book:true}),"Book");
 assert.equal(grade(5,{brilliant:true}),"Brilliant");
 assert.equal(grade(0),"Best");
 assert.equal(grade(25),"Excellent");
 assert.equal(grade(55),"Good");
 assert.equal(grade(120),"Inaccuracy");
 assert.equal(grade(200),"Mistake");
 assert.equal(grade(450),"Blunder");
 assert.equal(grade(0,{mate:true}),"Best");
});
test("Analyst skips pending/denied Objection and only grades a completed card action",()=>{
 const g=room();give(g,"w","the-analyst");
 g.hands.w[1]={id:"voluntary-eviction",used:false};
 give(g,"b","objection");
 act(g,"w",{type:"card",card:"voluntary-eviction",from:"g1"});
 assert.equal(g.analystLog.length,0,"A pending card is not a turn");
 act(g,"b",{type:"reaction",decision:"object"});
 assert.equal(g.analystLog.length,0,"Canceled cards are not graded");
 move(g,"w","e2","e4");
 assert.equal(g.analystLog.length,1,"Only the completed move is graded");
});
test("The Analyst keeps grading through 20-turn color swaps and does not expose hidden card IDs",()=>{
 const g=room();give(g,"w","the-analyst");give(g,"b","pawn-sidestep");
 g.moveCount=19;
 const originalWhite=g.players.w;
 move(g,"w","e2","e4");
 assert.equal(g.swaps,1);
 assert.equal(g.players.b,originalWhite);
 assert.equal(g.analystLog.length,1);
 assert.equal(g.analystLog[0].turn,20);
 assert.equal(playerView(g,"b").analyst.active,true,"Original holder retains the passive after swapping control");
 assert.deepEqual(playerView(g,"w").analyst,{active:false,entries:[],worker:null},
  "Opposite seat still cannot inspect review data after the color swap");
 const summary=JSON.stringify(playerView(g,"b").analyst);
 assert.ok(!summary.includes('"direction"')&&!summary.includes('"players"'));
});

test("Analyst never calls an unforced early King walk Best on White's third move",()=>{
 const g=room();give(g,"w","the-analyst");give(g,"b","pawn-sidestep");
 move(g,"w","e2","e4");
 move(g,"b","e7","e5");
 move(g,"w","g1","f3");
 move(g,"b","b8","c6");
 move(g,"w","e1","e2");
 const king=g.analystLog.at(-1);
 assert.equal(king.move,"e1 → e2");
 assert.equal(king.status,"pending");
 assert.equal(king.grade,"Analyzing","Stockfish, not the server heuristic, must grade Ke2");
 assert.equal(king.uci,"e1e2");
 assert.equal(king.square,"e2");
 assert.equal(king.symbol,null);
 assert.equal(king.beforeFen.split(" ")[1],"w");
});
test("Analyst emits one public destination-square symbol for normal moves and none for piece removal",()=>{
 const g=room();give(g,"w","the-analyst");give(g,"b","pawn-sidestep");
 move(g,"w","e2","e4");
 const first=g.analystLog.at(-1);
 assert.equal(first.square,"e4");
 assert.equal(first.status,"pending");
 assert.equal(first.symbol,null,"Only the real engine can assign symbols");
 move(g,"b","e7","e5");
 assert.equal(g.analystLog.at(-1).square,"e5");
 const removed=room();give(removed,"w","the-analyst");
 removed.hands.w[1]={id:"voluntary-eviction",used:false};
 act(removed,"w",{type:"card",card:"voluntary-eviction",from:"g1"});
 assert.equal(removed.analystLog.at(-1).square,null,"Removing a piece cannot put a badge over a nonexistent mover");
 assert.equal(removed.analystLog.at(-1).status,"custom");
 assert.equal(removed.analystLog.at(-1).beforeFen,undefined,"Card turns must not leak an analysis FEN");
});
test("Analyst only marks an unforced early king walk; escaping actual check is not mislabeled for that reason",()=>{
 const g=room();give(g,"w","the-analyst");give(g,"b","pawn-sidestep");
 g.s=parseFen("4r2k/8/8/8/8/8/8/4K3 w - - 0 1");g.history=[g.s];
 move(g,"w","e1","f1");
 assert.ok(!g.analystLog.at(-1).reason.includes("unthreatened king"),"Escape from check must not be called an unforced king walk");
});
test("Analyst maps every grade to a distinct short annotation",()=>{
 for(const grade of ANALYST_GRADES)assert.ok(Object.hasOwn(ANALYST_SYMBOLS,grade));
 assert.equal(ANALYST_SYMBOLS.Brilliant,"!!");
 assert.equal(ANALYST_SYMBOLS.Blunder,"??");
 assert.equal(ANALYST_SYMBOLS.Inaccuracy,"?!");
 assert.equal(ANALYST_SYMBOLS.Best,"★");
});

test("Stockfish score parser handles UCI centipawns, mates and depth",()=>{
 assert.deepEqual(parseUciInfo("info depth 13 seldepth 19 multipv 1 score cp -83 nodes 1024 pv e1e2 e8e7"),
  {kind:"cp",value:-83,depth:13,pv:"e1e2"});
 assert.deepEqual(parseUciInfo("info depth 16 score mate 3 nodes 8091 pv f7f8q"),
  {kind:"mate",value:3,depth:16,pv:"f7f8q"});
 assert.equal(parseUciInfo("bestmove e2e4"),null);
});
test("Stockfish grades 3.Ke2 poorly when its engine line loses two pawns' worth",()=>{
 const entry={turn:5,move:"e1 → e2",uci:"e1e2",status:"pending",side:"w",square:"e2"};
 const out=classifyStockfish(entry,
  {score:{kind:"cp",value:32,depth:13},bestmove:"f1c4"},
  {score:{kind:"cp",value:-195,depth:13},bestmove:"e1e2"});
 assert.equal(out.grade,"Mistake");
 assert.equal(out.name,"Mistake");
 assert.equal(out.symbol,"?");
 assert.equal(out.loss,227);
 assert.equal(out.estimated,false);
 assert.equal(out.engine,"Stockfish 19 · UCI review");
});
test("Stockfish-only feedback labels a missed forced mate and a sound book opening",()=>{
 const mate=classifyStockfish({turn:12,uci:"f3e5",side:"w"},{
  score:{kind:"mate",value:2,depth:12},bestmove:"h5f7"},{
  score:{kind:"cp",value:110,depth:12},bestmove:"f3e5"});
 assert.equal(mate.grade,"MissedWin");
 assert.equal(mate.symbol,"✕");
 const best=classifyStockfish({turn:1,uci:"e2e4",side:"w"},{
  score:{kind:"cp",value:30,depth:12},bestmove:"e2e4"},{
  score:{kind:"cp",value:25,depth:12},bestmove:"e2e4"});
 assert.equal(best.grade,"Book");
 for(const name of ["Brilliant","Great","Best","Excellent","Good","Book","Inaccuracy","Mistake","Blunder","MissedWin"]){
  assert.ok(MOVE_COINS[name].symbol);
  assert.ok(MOVE_COINS[name].tone);
 }
});
test("Stockfish reviewer sends real UCI position plus two bounded searches",async()=>{
 const commands=[];
 class FakeWorker{
  onmessage=null;onerror=null;searches=0;
  postMessage(command){
   commands.push(command);
   if(command==="uci")queueMicrotask(()=>this.onmessage({data:"uciok"}));
   if(command==="isready")queueMicrotask(()=>this.onmessage({data:"readyok"}));
   if(command.startsWith("go ")){
    this.searches++;
    const forced=this.searches===2;
    queueMicrotask(()=>{
     this.onmessage({data:"info depth 13 score cp "+(forced?-173:30)+" nodes 9021 pv "+(forced?"e1e2":"g1f3")});
     this.onmessage({data:"bestmove "+(forced?"e1e2":"g1f3")});
    });
   }
  }
  terminate(){}
 }
 const reviewer=createStockfishReviewer({workerFactory:()=>new FakeWorker(),url:"/stockfish/test.js"});
 const result=await reviewer.analyze({status:"pending",turn:5,side:"w",uci:"e1e2",
  beforeFen:"r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3"});
 assert.equal(result.grade,"Mistake");
 assert.ok(commands.some(s=>s.startsWith("position fen ")));
 assert.ok(commands.some(s=>s==="go depth 21 movetime 550"));
 assert.ok(commands.some(s=>s==="go depth 21 movetime 550 searchmoves e1e2"));
 reviewer.dispose();
});
test("Classified identities and off-board snipers never enter Stockfish inputs",()=>{
 const g=room();give(g,"w","the-analyst");give(g,"b","pawn-sidestep");
 g.snipers.w={edge:112,step:-15,shots:0,origin:"a1",direction:"NE"};
 move(g,"w","e2","e4");
 const review=g.analystLog.at(-1);
 assert.equal(review.status,"custom");
 assert.equal(review.beforeFen,undefined);
 assert.equal(review.uci,undefined);
});

test("Stockfish 19 defaults to full NNUE browser engine, then lite/ASM backups",()=>{
 const sources=engineSources();
 assert.equal(sources.length,7);
 assert.equal(sources[0].quality,"full","The strongest full neural network must be preferred");
 assert.ok(sources[0].url.includes("stockfish-cdn-worker.js?cdn=jsdelivr&engine=full#"));
 assert.equal(decodeURIComponent(sources[0].url.split("#")[1]),
  "https://cdn.jsdelivr.net/npm/stockfish@19.0.1/bin/stockfish-19-single.wasm");
 assert.equal(sources[1].url,"/api/illegal-chess/stockfish-19-single.js");
 assert.equal(sources[1].quality,"full");
 assert.match(sources[2].url,/cdn=unpkg&engine=full#/);
 assert.equal(sources[3].url,"/api/illegal-chess/stockfish-19-lite-single.js");
 assert.equal(sources[3].quality,"lite");
 assert.match(sources[4].url,/cdn=jsdelivr&engine=lite#/);
 assert.match(sources[5].url,/cdn=unpkg&engine=lite#/);
 assert.equal(sources[6].url,"/games/illegal-chess/stockfish-cdn-worker.js?cdn=asm&engine=asm");
 assert.equal(sources[6].quality,"asm");
 assert.ok(sources.slice(0,3).every(x=>x.quality==="full"),"Never silently choose the weaker model first");
});
test("Stockfish retries an immediately broken worker and analyzes using the next source",async()=>{
 const urls=[],commands=[];
 class BrokenWorker{
  onerror=null;
  postMessage(m){urls.push("message:"+m);queueMicrotask(()=>this.onerror({message:"Cloudflare asset returned HTTP 503"}));}
  terminate(){urls.push("terminate broken");}
 }
 class WorkingWorker{
  onmessage=null;searches=0;
  postMessage(m){
   commands.push(m);
   if(m==="uci")queueMicrotask(()=>this.onmessage({data:"uciok"}));
   if(m==="isready")queueMicrotask(()=>this.onmessage({data:"readyok"}));
   if(m.startsWith("go ")){
    this.searches++;
    const forced=this.searches===2;
    queueMicrotask(()=>{
     this.onmessage({data:"info depth 13 score cp "+(forced?-140:34)+" nodes 4218 pv "+(forced?"e1e2":"f1c4")});
     this.onmessage({data:"bestmove "+(forced?"e1e2":"f1c4")});
    });
   }
  }
  terminate(){urls.push("terminate working");}
 }
 const reviewer=createStockfishReviewer({
  sources:[{label:"broken proxy",url:"local.js",timeout:1000},{label:"healthy fallback",url:"cdn.js",timeout:1000}],
  workerFactory:url=>{urls.push(url);return url==="local.js"?new BrokenWorker():new WorkingWorker();}
 });
 const result=await reviewer.analyze({status:"pending",turn:5,side:"w",uci:"e1e2",
  beforeFen:"r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3"});
 assert.equal(result.status,"done");
 assert.equal(result.grade,"Mistake");
 assert.deepEqual(urls.slice(0,2),["local.js","message:uci"]);
 assert.ok(urls.includes("cdn.js"));
 assert.equal(reviewer.getStatus().source,"healthy fallback");
 assert.ok(commands.includes("go depth 21 movetime 550 searchmoves e1e2"));
 reviewer.dispose();
});
test("Stockfish reports useful failure causes when all worker sources are unavailable",async()=>{
 class Broken{
  onerror=null;
  postMessage(){queueMicrotask(()=>this.onerror({message:"404 Not Found"}));}
  terminate(){}
 }
 const reviewer=createStockfishReviewer({
  sources:[{label:"GAMESHUB proxy",url:"proxy",timeout:1000},{label:"unpkg backup",url:"backup",timeout:1000}],
  workerFactory:()=>new Broken()
 });
 await assert.rejects(reviewer.analyze({status:"pending",turn:1,side:"w",uci:"e2e4",
  beforeFen:"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"}),/GAMESHUB proxy.*404 Not Found.*unpkg backup.*404 Not Found/);
 reviewer.dispose();
});

test("Full NNUE runs at max strength with deeper 2.2-second root searches",async()=>{
 const commands=[];
 class FullWorker{
  onmessage=null;searches=0;
  postMessage(message){
   commands.push(message);
   if(message==="uci")queueMicrotask(()=>this.onmessage({data:"uciok"}));
   if(message==="isready")queueMicrotask(()=>this.onmessage({data:"readyok"}));
   if(message.startsWith("go ")){
    this.searches++;
    const forced=this.searches===2;
    queueMicrotask(()=>{
     this.onmessage({data:"info depth 19 score cp "+(forced?-130:30)+" nodes 300012 pv "+(forced?"e1e2":"f1c4")});
     this.onmessage({data:"bestmove "+(forced?"e1e2":"f1c4")});
    });
   }
  }
  terminate(){}
 }
 const reviewer=createStockfishReviewer({
  workerFactory:()=>new FullWorker(),
  sources:[{label:"Stockfish 19 Full NNUE",quality:"full",url:"full.js",timeout:1000}]
 });
 const entry={status:"pending",turn:5,side:"w",uci:"e1e2",
  beforeFen:"r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3"};
 const grade=await reviewer.analyze(entry);
 assert.equal(grade.status,"done");
 assert.equal(grade.engine,"Stockfish 19 · Full NNUE");
 assert.equal(reviewer.getStatus().quality,"full");
 assert.ok(commands.includes("setoption name Hash value 48"));
 assert.ok(commands.includes("setoption name UCI_LimitStrength value false"));
 assert.ok(commands.includes("setoption name Skill Level value 20"));
 assert.ok(commands.includes("go depth 24 movetime 1100"));
 assert.ok(commands.includes("go depth 24 movetime 1100 searchmoves e1e2"));
 assert.equal(commands.filter(x=>x.startsWith("go ")).length,2);
 reviewer.dispose();
});

test("The Analyst exposes one server-elected worker only, without session token hashes",()=>{
 const g=newGame("SHARED","host-secret");joinGame(g,"guest-secret");
 give(g,"w","the-analyst");give(g,"b","the-analyst");
 g.analystLease={hash:"host-secret",id:"cccccccc-cccc-4ccc-8ccc-cccccccccccc",score:110,quality:"full",readyAt:Date.now()-1,expires:Date.now()+10000};
 const host=playerView(g,"w").analyst,guest=playerView(g,"b").analyst;
 assert.equal(host.worker.role,"leader");
 assert.equal(guest.worker.role,"viewer");
 assert.equal(host.worker.clientId,guest.worker.clientId,"Both see the same lease");
 assert.equal(JSON.stringify(host).includes("host-secret"),false);
 assert.equal(JSON.stringify(guest).includes("guest-secret"),false);
});

test("Card activation flourish detects only newly spent cards in both authoritative player views",()=>{
 const g=room();give(g,"w","ceasefire");
 const beforeWhite=playerView(g,"w"),beforeBlack=playerView(g,"b");
 assert.deepEqual(newCardCasts(null,beforeWhite),[],"Joining an existing room never replays older cards");
 assert.deepEqual(newCardCasts(beforeWhite,beforeWhite),[],"Polling unchanged state is silent");
 act(g,"w",{type:"card",card:"ceasefire"});
 const afterWhite=playerView(g,"w"),afterBlack=playerView(g,"b");
 const cast={color:"w",id:"ceasefire",name:"Ceasefire",rarity:"Rare"};
 assert.deepEqual(newCardCasts(beforeWhite,afterWhite),[cast],"Actor sees own card animation after server approval");
 assert.deepEqual(newCardCasts(beforeBlack,afterBlack),[cast],"Opponent sees the same animation");
 assert.deepEqual(newCardCasts(afterWhite,afterWhite),[],"Re-render must not replay card");
 const swappedPerspective={...afterWhite,player:"b",hand:afterWhite.opponent,opponent:afterWhite.hand};
 assert.deepEqual(newCardCasts(afterWhite,swappedPerspective),[],
  "Twenty-turn color control swaps must not create phantom activations");
 assert.deepEqual(newCardCasts({...beforeWhite,room:"OLD"},afterWhite),[],"New rooms must not replay old casts");
});
test("Card cast detection ignores invalid public snapshots and other cards becoming visible",()=>{
 const g=room();give(g,"w","black-market");
 const before=playerView(g,"w");
 act(g,"w",{type:"card",card:"black-market",slot:1});
 const after=playerView(g,"w");
 assert.deepEqual(newCardCasts(before,after).map(c=>c.id),["black-market"],
  "The replacement received from Black Market must not look like a card activation");
 assert.deepEqual(newCardCasts({},after),[]);
 assert.deepEqual(newCardCasts(before,{...after,hand:null}),[]);
 const bad={...after,hand:after.hand.map(c=>c.id==="black-market"?{...c,rarity:"unsafe"}:c)};
 assert.deepEqual(newCardCasts(before,bad),[],"Unexpected rarity input must not reach the animation");
});
test("Bishop Sniper cinematic V1 has a shared first-shot bullet and second-shot teleport, never duplicates",()=>{
 const g=room();give(g,"w","bishop-sniper");
 g.s=parseFen("4k3/6p1/5q2/8/8/2B5/8/4K3 w - - 0 1");g.history=[g.s];
 assert.deepEqual(playerView(g,"w").cinematics,[]);
 assert.deepEqual(playerView(g,"b").cinematics,[]);
 act(g,"w",{type:"card",card:"bishop-sniper",from:"c3",direction:"NE"});
 assert.deepEqual(g.cinematics,[],"Preparing a hidden sniper must NOT reveal a cinematic or secret direction");
 move(g,"b","e8","d8");
 assert.throws(()=>act(g,"w",{type:"sniper-shot",to:"f6"}),/first available sniper target/);
 assert.equal(g.cinematics.length,0,"Illegal shots never generate effects");
 act(g,"w",{type:"sniper-shot",to:"g7"});
 const first=g.cinematics[0];
 assert.deepEqual(first,{
  id:3,kind:"sniper-first-shot",attacker:"w",origin:"c3",direction:"NE",target:"g7",victim:"p"
 });
 assert.equal(g.snipers.w.shots,1);
 assert.equal(g.s.b[idx("g7")],".");
 assert.deepEqual(playerView(g,"w").cinematics,playerView(g,"b").cinematics,
  "Both players receive the exact same server-recorded shot");
 assert.equal(cinematicCaption(first).fullScreen,true);
 assert.equal(cinematicCaption(first).duration,4900);
 assert.equal(cinematicCaption(first).detail,"C3 · NE · TARGET G7");
 move(g,"b","d8","e8");
 act(g,"w",{type:"sniper-shot",to:"f6"});
 const second=g.cinematics[1];
 assert.deepEqual(second,{
  id:5,kind:"sniper-teleport",attacker:"w",origin:"c3",direction:"NE",target:"f6",victim:"q"
 });
 assert.equal(g.s.b[idx("f6")],"B","Second shot actually lands on its captured target");
 assert.equal(g.snipers.w,null);
 assert.equal(cinematicCaption(second).fullScreen,false,"Second shot must NOT replay the bullet cinematic");
 assert.equal(cinematicCaption(second).duration,680);
 assert.deepEqual(playerView(g,"w").cinematics,playerView(g,"b").cinematics);
});
test("Cinematic event ordering skips archived actions and doesn't repeat on multiplayer polling",()=>{
 const events=[
  {id:9,kind:"sniper-first-shot",attacker:"b",origin:"f6",direction:"SW",target:"c3",victim:"N"},
  {id:11,kind:"sniper-teleport",attacker:"b",origin:"f6",direction:"SW",target:"b2",victim:"P"}
 ];
 const initial=nextCinematic(events,null);
 assert.deepEqual(initial,{seen:11,event:null},"Joining an old match doesn't replay past action");
 assert.deepEqual(nextCinematic(events,initial.seen),{seen:11,event:null},"Polling again should not replay the same scene");
 const newEvent={id:13,kind:"sniper-first-shot",attacker:"w",origin:"a1",direction:"NE",target:"d4",victim:"p"};
 assert.deepEqual(nextCinematic([...events,newEvent],11),{seen:13,event:newEvent});
 assert.deepEqual(nextCinematic([...events,newEvent],13),{seen:13,event:null});
 assert.equal(nextCinematic([],null).seen,0,"New rooms start with no seen actions");
 assert.deepEqual(Object.keys(CINEMATIC_DURATIONS),["sniper-first-shot","sniper-teleport"]);
});
test("Cinematic helper rejects unexpected messages and enforces trusted square/side fields",()=>{
 const good={id:2,kind:"sniper-first-shot",attacker:"w",origin:"a1",direction:"NE",target:"c3",victim:"q"};
 for(const bad of [
  {...good,id:-1},{...good,kind:"other"},{...good,attacker:"x"},
  {...good,direction:"secret"},{...good,target:"z9"},{...good,victim:"<script>"},
 ]){
  assert.equal(cinematicCaption(bad),null);
  assert.equal(nextCinematic([bad],0).event,null);
 }
 assert.equal(cinematicCaption(good).title,"BISHOP SNIPER");
});

test("Bishop Sniper V2 is genuine multi-stage 3D camera choreography, not a 1-second UI flash",()=>{
 assert.equal(SNIPER_3D_DURATION,4900);
 assert.deepEqual(SNIPER_3D_PHASES.map(x=>x.name),["closeup","fire","bullet","impact","return"]);
 assert.ok(SNIPER_3D_PHASES.every((x,i)=>x.end-x.start>=250),"Every camera segment must remain visible");
 assert.equal(shotPhase(0).name,"closeup");
 assert.equal(shotPhase(1450).name,"fire");
 assert.equal(shotPhase(2500).name,"bullet");
 assert.equal(shotPhase(3950).name,"impact");
 assert.equal(shotPhase(4700).name,"return");
 assert.equal(shotPhase(4999).name,"return");
 assert.equal(SNIPER_3D_PHASES.find(x=>x.name==="bullet").end-SNIPER_3D_PHASES.find(x=>x.name==="bullet").start,1920,
  "Give the bullet its own 1.92-second slow motion chase");
});
test("3D camera tracks a real moving bullet through chessboard world space to its actual victim square",()=>{
 const event={origin:"c3",target:"g7",direction:"NE",attacker:"w",victim:"p"};
 assert.deepEqual(square3D("c3"),[-1.5,0,1.5]);
 assert.deepEqual(square3D("g7"),[2.5,0,-2.5]);
 assert.equal(square3D("z9"),null);
 const path=sniperPath(event);
 assert.deepEqual(path.target,[2.5,0,-2.5]);
 assert.ok(path.shooter[0]<path.origin[0]&&path.shooter[2]>path.origin[2],
  "Off-board shooter starts BEHIND its original square");
 const close=cinematicCamera(event,400),fire=cinematicCamera(event,1400);
 const mid=cinematicCamera(event,2300),late=cinematicCamera(event,3200);
 const impact=cinematicCamera(event,3750);
 assert.equal(close.phase,"closeup");assert.equal(fire.phase,"fire");
 assert.equal(mid.phase,"bullet");assert.equal(late.phase,"bullet");
 assert.equal(impact.phase,"impact");
 assert.ok(mid.bullet&&late.bullet,"Bullet is a 3D model travelling through the scene, not a CSS line");
 assert.ok(mid.bullet[0]<late.bullet[0]&&mid.bullet[2]>late.bullet[2],"Bullet moves northeast along the actual diagonal");
 assert.ok(mid.eye[0]<late.eye[0]&&mid.eye[2]>late.eye[2],"Camera physically follows moving bullet");
 assert.notDeepEqual(mid.eye,late.eye,"Bullet and camera position change over time");
 assert.equal(impact.bullet,null,"After impact, the camera cuts to the target");
 assert.ok([...mid.eye,...mid.look,...mid.bullet,...late.eye].every(Number.isFinite));
});
test("3D replay resolves both bishop colors and all cardinal firing diagonals",()=>{
 for(const [origin,target,direction] of [
  ["a1","d4","NE"],["h1","e4","NW"],["a8","d5","SE"],["h8","e5","SW"]]){
  const ev={origin,target,direction,attacker:"b",victim:"N"};
  const path=sniperPath(ev);
  assert.ok(path&&Number.isFinite(path.yaw));
  for(const ms of [100,1550,1900,2750,3550,4750]){
   const camera=cinematicCamera(ev,ms);
   assert.ok(camera);
   assert.equal(camera.phase,shotPhase(ms).name);
   assert.ok([...camera.eye,...camera.look].every(Number.isFinite));
  }
 }
 assert.equal(sniperPath({origin:"a1",target:"a1"}),null);
 assert.equal(cinematicCamera({origin:"invalid",target:"g7"},100),null);
});

test("V3 Bishop Sniper has 13 actual sculpted 3D meshes, not a shared target block",()=>{
 const meshes=buildSculptMeshes();
 const expected=sculptAssetCatalog();
 assert.equal(expected.length,13);
 for(const type of expected){
  const mesh=meshes[type];
  assert.ok(mesh instanceof Float32Array,"Missing 3D geometry for "+type);
  assert.equal(mesh.length%18,0,"Triangles need 3 vertices with positions/normals for "+type);
  assert.ok(mesh.length>=400,"Model needs enough 3D detail: "+type);
  assert.ok([...mesh].every(Number.isFinite),"No NaN/Infinity vertices for "+type);
 }
 const categories=["Bishop","Pawn","Rook","Knight","Queen","King"];
 assert.ok(categories.every(x=>meshes["sculpt"+x]));
 assert.ok(new Set(categories.map(x=>meshes["sculpt"+x].length)).size>=5,
  "Each chess piece type must have its own distinct geometry, not reused primitive blocks");
 assert.ok(meshes.sculptBishop.length/18>6000,"High detail bishops need a curved mitre and collar");
 assert.ok(meshes.sculptPawn.length/18>4000,"Captured pawn needs an actual rounded head");
 assert.ok(meshes.sculptRook.length/18>4000,"Captured rook needs an actual crenellated turret");
 assert.ok(meshes.sculptKnight.length/18>2000,"Knight needs a carved horse head");
});
test("V3 models use real vertices and normals and have physically distinct silhouettes",()=>{
 const meshes=buildSculptMeshes(),bounds=mesh=>{
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<mesh.length;i+=6)for(let axis=0;axis<3;axis++){
   min[axis]=Math.min(min[axis],mesh[i+axis]);
   max[axis]=Math.max(max[axis],mesh[i+axis]);
  }
  return {width:max[0]-min[0],height:max[1]-min[1],depth:max[2]-min[2]};
 };
 const bishop=bounds(meshes.sculptBishop),pawn=bounds(meshes.sculptPawn),
  rook=bounds(meshes.sculptRook),knight=bounds(meshes.sculptKnight);
 assert.ok(bishop.height>pawn.height+0.5,"Bishop mitre must stand much higher than a pawn's head");
 assert.ok(knight.height>rook.height,"Sculpted horse-head knight must be recognizable");
 assert.ok(bishop.width>.8&&bishop.depth>.8&&bishop.height>1.75);
 const stock=bounds(meshes.sculptRifleStock),scope=bounds(meshes.sculptScope);
 assert.ok(stock.width>1.5,"Sniper rifle needs a properly shaped long stock");
 assert.ok(stock.height>.5,"Sniper rifle needs a meaningful three-dimensional silhouette");
 assert.ok(scope.height>.8,"Scope mesh must have objective bell and eyepiece");
});

test("Bishop Sniper V4 camera zooms through the scope and the rifle visibly recoils then settles",()=>{
 const ev={origin:"c3",target:"g7",direction:"NE",attacker:"w",victim:"p"};
 const normal=cinematicCamera(ev,250),zoom=cinematicCamera(ev,1100),fire=cinematicCamera(ev,1390);
 assert.ok(sniperMotion(850).scopeZoom>0);
 assert.ok(sniperMotion(1150).scopeZoom>.65,"Scope focus must occupy the latter part of the first shot");
 assert.ok(sniperMotion(1500).scopeZoom<.1);
 assert.ok(Math.abs(sniperMotion(1400).recoil)>.12,"The gun must have visibly measurable kickback");
 assert.equal(sniperMotion(2200).recoil,0,"No permanent moved rifle after firing");
 assert.notDeepEqual(normal.eye,zoom.eye);
 assert.notDeepEqual(fire.eye,zoom.eye);
 assert.equal(sniperMotion(1200).impact,0);
 assert.ok(sniperMotion(3760).shockwave>.1,"Impact creates an expanding shockwave");
 assert.ok(sniperMotion(2510).bulletBoost>.5,"Slow motion projectile has extra luminous streaks");
 assert.equal(sniperMotion(4800).shockwave,0,"No lingering expensive GPU impact debris");
});
test("V4 Web Audio cue blueprint is synced to its 4.9 second shared event and has a short 2D fallback",()=>{
 assert.deepEqual(SNIPER_SOUND_CUES.map(x=>x.name),
  ["scope","chamber","fire","bullet","impact","debris","outro"]);
 for(let i=1;i<SNIPER_SOUND_CUES.length;i++)
  assert.ok(SNIPER_SOUND_CUES[i].ms>SNIPER_SOUND_CUES[i-1].ms,"Audio clock cues must be ordered");
 assert.equal(SNIPER_SOUND_CUES.find(x=>x.name==="fire").ms,1320);
 assert.equal(SNIPER_SOUND_CUES.find(x=>x.name==="impact").ms,3500);
 assert.ok(SNIPER_SOUND_CUES.at(-1).ms<SNIPER_3D_DURATION);
 assert.ok(SNIPER_FALLBACK_CUES.at(-1).ms<1550,"2D fallback must not play off-screen sounds");
 assert.equal(SNIPER_TELEPORT_CUES.length,1);
 assert.equal(SNIPER_TELEPORT_CUES[0].name,"teleport");
});
test("V4 sound is gesture-unlocked, locally mutable, and creates real oscillator/noise voices",()=>{
 const events=[];
 class Param{
  value=0;
  setValueAtTime(value,t){this.value=value;events.push(["set",value,t]);}
  exponentialRampToValueAtTime(value,t){this.value=value;events.push(["ramp",value,t]);}
  cancelScheduledValues(t){events.push(["cancel",t]);}
 }
 class AudioNodeMock{
  onended=null;frequency=new Param();gain=new Param();Q=new Param();
  type="";buffer=null;
  connect(node){events.push(["connect"]);}
  start(t){events.push(["start",t]);}
  stop(t){events.push(["stop",t]);if(typeof this.onended==="function")this.onended();}
 }
 class Context{
  state="running";sampleRate=8000;currentTime=10;destination={};
  createGain(){return new AudioNodeMock();}
  createOscillator(){events.push(["oscillator"]);return new AudioNodeMock();}
  createBufferSource(){events.push(["noise"]);return new AudioNodeMock();}
  createBiquadFilter(){return new AudioNodeMock();}
  createBuffer(_channels,frames,_rate){
   return {getChannelData(){return new Float32Array(frames);}};
  }
  close(){this.state="closed";events.push(["closed"]);return Promise.resolve();}
  resume(){this.state="running";return Promise.resolve();}
 }
 const sfx=createSniperSoundtrack(Context);
 assert.equal(sfx.ready,false);
 assert.equal(sfx.playFirstShot(),false,"Audio must not silently auto-unlock outside a gesture");
 assert.equal(sfx.unlock(),true);
 assert.equal(sfx.ready,true);
 assert.equal(sfx.playFirstShot(),true);
 assert.ok(events.filter(x=>x[0]==="oscillator").length>=5,"Distinct tonal cues required");
 assert.ok(events.filter(x=>x[0]==="noise").length>=4,"Rifle, bullet and impact each use noise");
 const starts=events.filter(x=>x[0]==="start").map(x=>x[1]);
 assert.ok(starts.some(x=>x>=11.3&&x<=11.5),"Rifle sound must begin at ~1.32s on the audio clock");
 assert.ok(starts.some(x=>x>=13.5&&x<=13.7),"Impact sound must land at ~3.5s");
 sfx.setEnabled(false);
 assert.equal(sfx.playTeleport(),false,"Muted user receives no second-shot sound");
 sfx.setEnabled(true);
 assert.equal(sfx.playTeleport(),true,"Second-shot teleport has its own unique SFX");
 sfx.dispose();
 assert.ok(events.some(x=>x[0]==="closed"));
});
test("V4 audio degrades safely on restricted browsers and does not create a context without a gesture",()=>{
 const noAudio=createSniperSoundtrack(null);
 assert.equal(noAudio.unlock(),false);
 assert.equal(noAudio.playFirstShot(),false);
 assert.equal(noAudio.playFallbackShot(),false);
 noAudio.dispose();
 class Restricted{constructor(){throw Error("Audio not allowed");}}
 const blocked=createSniperSoundtrack(Restricted);
 assert.equal(blocked.unlock(),false);
 assert.equal(blocked.playTeleport(),false);
 blocked.setEnabled(false);
 blocked.dispose();
});

test("Analyst view is private when only Black owns the card, yet still grades both sides",()=>{
 const g=room();give(g,"b","the-analyst");give(g,"w","pawn-sidestep");
 move(g,"w","e2","e4");
 move(g,"b","e7","e5");
 const white=playerView(g,"w"),black=playerView(g,"b");
 assert.deepEqual(white.analyst,{active:false,entries:[],worker:null});
 assert.equal(black.analyst.active,true);
 assert.deepEqual(black.analyst.entries.map(x=>x.side),["w","b"]);
 assert.equal(g.analystLog.length,2,"The internal match has one canonical log");
});
test("When both players hold The Analyst, both receive the SAME canonical grades",()=>{
 const g=room();give(g,"w","the-analyst");give(g,"b","the-analyst");
 move(g,"w","e2","e4");
 const w=playerView(g,"w").analyst,b=playerView(g,"b").analyst;
 assert.equal(w.active,true);assert.equal(b.active,true);
 assert.deepEqual(w.entries,b.entries);
 assert.equal(g.analystLog.length,1,"No duplicated Stockfish analysis");
});
test("Non-owner view excludes even synthetic recorded scores and a current worker lease",()=>{
 const g=room();give(g,"w","the-analyst");give(g,"b","pawn-sidestep");
 move(g,"w","e2","e4");
 Object.assign(g.analystLog[0],{grade:"Excellent",status:"done",symbol:"★",engine:"Stockfish 19",reason:"Secret grade"});
 g.analystLease={hash:g.players.w,id:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  score:105,quality:"full",expires:Date.now()+100000,readyAt:Date.now()};
 const hidden=JSON.stringify(playerView(g,"b"));
 assert.ok(!hidden.includes("Secret grade"));
 assert.ok(!hidden.includes('"engine":"Stockfish 19"'));
 assert.ok(!hidden.includes('"grade":"Excellent"'));
 assert.ok(!hidden.includes("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"));
 assert.ok(!hidden.includes('"beforeFen"')&&!hidden.includes('"uci"'));
 assert.equal(playerView(g,"w").analyst.entries[0].grade,"Excellent");
 assert.equal(playerView(g,"w").analyst.worker.role,"leader");
});
