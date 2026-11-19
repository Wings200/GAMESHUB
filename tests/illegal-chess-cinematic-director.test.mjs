import test from "node:test";
import assert from "node:assert/strict";
import {boardFromSnapshot,cinematicCues,DURATIONS} from "../games/illegal-chess/cinematic-director.mjs";
import {combatBlend,combatPosition} from "../games/illegal-chess/sniper-3d.mjs";

const initial="4k3/8/3p4/8/4N3/8/8/4K3 w - - 0 1";
const taken="4k3/8/3N4/8/8/8/8/4K3 b - - 0 1";
const e4=3*16+4,d6=5*16+3;
function view(overrides={}){
 return {room:"AB123",ready:true,moveCount:4,fen:initial,
  last:null,cinematics:[],status:{done:false,rescue:null,winner:null,text:"White to move"},
  ...overrides};
}
test("FEN parser rejects invalid rows and preserves ranks",()=>{
 assert.equal(boardFromSnapshot("8/8/8/8/8/8/8/8 w - - 0 1").length,64);
 assert.equal(boardFromSnapshot("9/8/8/8/8/8/8/8"),null);
 assert.equal(boardFromSnapshot("8/8/8/8/8/8/8/7x"),null);
 assert.equal(boardFromSnapshot("invalid"),null);
});
test("no replay on first join, refresh, or room switch",()=>{
 const before=view(),after=view({moveCount:5,fen:taken,last:{from:e4,to:d6}});
 assert.deepEqual(cinematicCues(null,after),[]);
 assert.deepEqual(cinematicCues(before,before),[]);
 assert.deepEqual(cinematicCues(before,{...after,room:"NEW"}),[]);
 assert.deepEqual(cinematicCues(view({ready:false}),after),[]);
});
test("confirmed knight capture followed by check yields two ordered events",()=>{
 const before=view(),after=view({moveCount:5,fen:taken,last:{from:e4,to:d6},
  status:{done:false,rescue:null,winner:null,text:"Black to move · CHECK"}});
 const cues=cinematicCues(before,after);
 assert.deepEqual(cues.map(x=>x.kind),["capture","check"]);
 assert.equal(cues[0].title,"KNIGHT CAPTURE");
 assert.equal(cues[0].victim,"p");
 assert.equal(cues[0].from,e4);
 assert.equal(cues[0].to,d6);
});
test("quiet move never invents capture",()=>{
 const before=view({fen:"4k3/8/8/8/8/8/4P3/4K3 w - - 0 1"});
 const after=view({moveCount:5,fen:"4k3/8/8/8/4P3/8/8/4K3 b - - 0 1",last:{from:20,to:52}});
 assert.deepEqual(cinematicCues(before,after),[]);
});
test("en passant recognizes pawn removed beside landing square",()=>{
 const before=view({fen:"4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1"});
 const after=view({moveCount:5,fen:"4k3/8/3P4/8/8/8/8/4K3 b - - 0 1",last:{from:68,to:83}});
 const cues=cinematicCues(before,after);
 assert.equal(cues.length,1);assert.equal(cues[0].detail,"EN PASSANT");
});
test("double KO shows both-piece elimination without fabricating a surviving attacker",()=>{
 const before=view(),after=view({moveCount:5,fen:"4k3/8/8/8/8/8/8/4K3 b - - 0 1",last:{from:e4,to:d6}});
 assert.equal(cinematicCues(before,after)[0].title,"DOUBLE KO");
});
test("existing sniper shot is not duplicated by the generic capture system",()=>{
 const before=view(),after=view({moveCount:5,fen:taken,last:{from:e4,to:d6},
  cinematics:[{id:5,kind:"sniper-first-shot"}]});
 assert.deepEqual(cinematicCues(before,after),[]);
});
test("rescue begins at confirmed checkmate threat, and escape is signaled after a move",()=>{
 const before=view(),rescue=view({moveCount:5,status:{done:false,rescue:{remainingMs:30000},winner:null,text:"Card rescue"}});
 assert.deepEqual(cinematicCues(before,rescue).map(x=>x.kind),["rescue"]);
 const escape=view({moveCount:6,status:{done:false,rescue:null,winner:null,text:"Black to move"}});
 assert.deepEqual(cinematicCues(rescue,escape).map(x=>x.kind),["escape"]);
});
test("rescue expiry produces a final cinematic even without a new move",()=>{
 const before=view({status:{done:false,rescue:{remainingMs:2},winner:null,text:"Card rescue"}});
 const after=view({status:{done:true,rescue:null,winner:"w",text:"White wins by checkmate"}});
 const cues=cinematicCues(before,after);
 assert.deepEqual(cues.map(x=>x.kind),["finish"]);
 assert.equal(cues[0].title,"CHECKMATE");
});
test("one missed snapshot cannot falsely create a guessed capture",()=>{
 const before=view(),after=view({moveCount:6,fen:taken,last:{from:e4,to:d6}});
 assert.deepEqual(cinematicCues(before,after),[]);
});


test("bishop moving into an empty square never fabricates a capture",()=>{
 const before=view({fen:"4k3/8/8/8/8/8/8/2B1K3 w - - 0 1"});
 const after=view({moveCount:5,fen:"4k3/8/8/8/8/8/3B4/4K3 b - - 1 1",
  last:{from:2,to:19}});
 assert.deepEqual(cinematicCues(before,after),[]);
});
test("a friendly destination cannot be advertised as an enemy capture",()=>{
 const before=view({fen:"4k3/8/8/8/8/8/3P4/2B1K3 w - - 0 1"});
 const after=view({moveCount:5,fen:"4k3/8/8/8/8/8/3B4/4K3 b - - 1 1",
  last:{from:2,to:19}});
 assert.deepEqual(cinematicCues(before,after),[]);
});
test("stale last move metadata cannot replay a capture after a card event",()=>{
 const before=view({last:{from:e4,to:d6}});
 const after=view({moveCount:5,fen:taken,last:{from:e4,to:d6}});
 assert.deepEqual(cinematicCues(before,after),[]);
});
test("check and finish cinematics target the correct sculpted king",()=>{
 const before=view();
 const checked=view({moveCount:5,fen:taken,last:{from:e4,to:d6},
  turn:"b",status:{done:false,rescue:null,winner:null,text:"Black to move · CHECK"}});
 assert.equal(cinematicCues(before,checked).at(-1).kingSquare,116);
 assert.equal(cinematicCues(before,checked).at(-1).kingPiece,"k");
 const mate=view({moveCount:5,turn:"b",status:{done:true,rescue:null,winner:"w",
  text:"White wins by checkmate"}});
 assert.equal(cinematicCues(before,mate).at(-1).kingPiece,"k");
});
test("real 3D combat uses valid board coordinates and longer cinematic durations",()=>{
 assert.deepEqual(combatPosition(0),[-3.5,0,3.5]);
 assert.deepEqual(combatPosition(119),[3.5,0,-3.5]);
 assert.equal(combatPosition(8),null);
 assert.equal(combatBlend(0,2300).charge,0);
 assert.ok(combatBlend(1200,2300).impact>0);
 assert.ok(DURATIONS.capture>=2000);
 assert.ok(DURATIONS.check>=2000);
 assert.ok(DURATIONS.finish>=3000);
});
