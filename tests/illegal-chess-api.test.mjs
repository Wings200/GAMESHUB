import test from "node:test";
import assert from "node:assert/strict";
import {onRequest,serveStockfishAsset} from "../functions/api/illegal-chess/[[path]].js";
import {parseFen} from "../games/illegal-chess/engine.mjs";

class FakeD1 {
 constructor(){this.rooms=new Map();this.publicRooms=new Map();}
 prepare(sql){
  const db=this;let args=[];
  return {
   bind(...values){args=values;return this;},
   async first(){
    if(sql.includes("SELECT code,version,state")){const room=db.rooms.get(args[0]);return room?{...room}:null;}
    throw Error("Unexpected first SQL: "+sql);
   },
   async all(){
    if(sql.includes("FROM illegal_chess_public_rooms p JOIN illegal_chess_rooms r")){
     const cutoff=args[0];
     const records=[...db.publicRooms.entries()].filter(([code,created_at])=>created_at>cutoff&&db.rooms.has(code))
      .sort((a,b)=>a[1]-b[1]).slice(0,60)
      .map(([code,created_at])=>({code,created_at,version:db.rooms.get(code).version,state:db.rooms.get(code).state}));
     return {results:records};
    }
    throw Error("Unexpected all SQL: "+sql);
   },
   async run(){
    if(sql.includes("CREATE TABLE"))return {meta:{changes:0}};
    if(sql.includes("INSERT INTO illegal_chess_public_rooms")){
     const [code,created_at]=args;
     if(db.publicRooms.has(code))throw Error("UNIQUE constraint failed");
     db.publicRooms.set(code,created_at);return {meta:{changes:1}};
    }
    if(sql.includes("DELETE FROM illegal_chess_public_rooms")){
     const changed=db.publicRooms.delete(args[0]);
     return {meta:{changes:changed?1:0}};
    }
    if(sql.includes("INSERT INTO illegal_chess_rooms")){
     const [code,state,created_at,updated_at]=args;
     if(db.rooms.has(code))throw Error("UNIQUE constraint failed");
     db.rooms.set(code,{code,version:0,state,created_at,updated_at});
     return {meta:{changes:1}};
    }
    if(sql.includes("UPDATE illegal_chess_rooms")){
     const [state,updated_at,code,version]=args,room=db.rooms.get(code);
     if(!room||room.version!==version)return {meta:{changes:0}};
     Object.assign(room,{state,updated_at,version:version+1});
     return {meta:{changes:1}};
    }
    throw Error("Unexpected run SQL: "+sql);
   }
  };
 }
}
async function post(db,path,data){
 const request=new Request("https://gameshub.example/api/illegal-chess/"+path,{
  method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
 const response=await onRequest({request,env:{DB:db}});
 return {status:response.status,data:await response.json()};
}
test("two GAMESHUB browsers can create, join, and alternate turns",async()=>{
 const db=new FakeD1(),host=await post(db,"create",{});
 assert.equal(host.status,200);assert.match(host.data.room,/^[A-HJ-NP-Z2-9]{6}$/);
 assert.match(host.data.token,/^[a-f0-9]{64}$/);assert.equal(host.data.player,"w");
 const a=await post(db,"state",host.data);
 assert.equal(a.data.ready,false);assert.equal(a.data.hand.length,3);
 const join=await post(db,"join",{room:host.data.room});
 assert.equal(join.status,200);assert.equal(join.data.player,"b");
 assert.notEqual(join.data.token,host.data.token);
 const blackFirst=await post(db,"action",{...join.data,action:{type:"move",from:"e7",to:"e5"}});
 assert.equal(blackFirst.status,400);assert.match(blackFirst.data.error,/Not your turn/);
 const white=await post(db,"action",{...host.data,action:{type:"move",from:"e2",to:"e4"}});
 assert.equal(white.status,200);assert.equal(white.data.view.turn,"b");
 const blackState=await post(db,"state",join.data);
 assert.equal(blackState.data.turn,"b");assert.equal(blackState.data.legal.length,20);
 const black=await post(db,"action",{...join.data,action:{type:"move",from:"e7",to:"e5"}});
 assert.equal(black.status,200);assert.equal(black.data.view.turn,"w");
 const invalid=await post(db,"state",{room:host.data.room,token:"a".repeat(64)});
 assert.equal(invalid.status,403);
 const full=await post(db,"join",{room:host.data.room});assert.equal(full.status,409);
 const persisted=JSON.parse(db.rooms.get(host.data.room).state);
 assert.equal(persisted.log.length,2);
 // Server never sends secret hashes/tokens in player views.
 assert.equal(Object.hasOwn(black.data.view,"players"),false);
 assert.equal(Object.hasOwn(black.data.view,"history"),false);
});

test("API supports opt-in Sniper test rooms without leaking the hidden diagonal",async()=>{
 const db=new FakeD1();
 const white=await post(db,"create",{mode:"sniper-test"});
 const black=await post(db,"join",{room:white.data.room});
 // Prevent this sniper-only test from being paused by a randomly drawn Objection!.
 const saved=db.rooms.get(white.data.room),setup=JSON.parse(saved.state);
 for(const card of setup.hands.b)if(card.id==="objection")card.id=["pawn-sidestep","pawn-ram","voluntary-eviction"].find(id=>!setup.hands.b.some(c=>c.id===id));
 saved.state=JSON.stringify(setup);
 const w=await post(db,"state",white.data);
 const b=await post(db,"state",black.data);
 assert.equal(w.data.testMode,true);assert.equal(b.data.testMode,true);
 assert.equal(w.data.hand[0].id,"bishop-sniper");
 assert.equal(b.data.hand[0].id,"bishop-sniper");
 const move=await post(db,"action",{...white.data,action:{type:"card",card:"bishop-sniper",from:"c1",direction:"NE"}});
 assert.equal(move.status,200);
 const opponent=await post(db,"state",black.data);
 assert.equal(opponent.data.sniper.opponentActive,true);
 assert.equal(opponent.data.sniper.own,null);
 assert.equal(JSON.stringify(opponent.data).includes('"direction":"NE"'),false);
});

test("Multiplayer session tokens follow their players when colors swap",async()=>{
 const db=new FakeD1(),host=await post(db,"create",{});
 const guest=await post(db,"join",{room:host.data.room});
 const row=db.rooms.get(host.data.room);
 const saved=JSON.parse(row.state);
 // Fast-forward the turn counter to exercise the swap boundary over the API.
 saved.moveCount=19;row.state=JSON.stringify(saved);
 const triggering=await post(db,"action",{...host.data,action:{type:"move",from:"e2",to:"e4"}});
 assert.equal(triggering.status,200);
 assert.equal(triggering.data.view.swaps,1);
 assert.equal(triggering.data.view.player,"b","Original white token now owns black");
 const guestView=await post(db,"state",guest.data);
 assert.equal(guestView.data.player,"w","Original black token now owns white");
 assert.equal(guestView.data.turn,"b","Swapping control does not change board turn order");
 const next=await post(db,"action",{...host.data,action:{type:"move",from:"e7",to:"e5"}});
 assert.equal(next.status,200,"Original white browser can now move black pieces");
 assert.equal(next.data.view.player,"b");
});

test("Live API keeps Objection target payload private and real promoted identity secret",async()=>{
 const db=new FakeD1(),white=await post(db,"create",{}),black=await post(db,"join",{room:white.data.room});
 const row=db.rooms.get(white.data.room),g=JSON.parse(row.state);
 g.s=parseFen("7k/P7/8/8/8/8/8/7K w - - 0 1");g.history=[g.s];
 g.hands.w=[{id:"classified-promotion",used:false},{id:"voluntary-eviction",used:false}];
 g.hands.b=[{id:"objection",used:false}];
 row.state=JSON.stringify(g);
 const attempt=await post(db,"action",{...white.data,action:{type:"card",card:"voluntary-eviction",from:"h1"}});
 assert.equal(attempt.status,400,"Invalid king eviction must be rejected before objection");
 const queued=await post(db,"action",{...white.data,action:{type:"card",card:"classified-promotion"}});
 assert.equal(queued.status,200);
 assert.equal(queued.data.view.pendingReaction.canReact,false);
 const b=await post(db,"state",black.data);
 assert.equal(b.data.pendingReaction.canReact,true);
 assert.equal(Object.hasOwn(b.data.pendingReaction,"action"),false);
 assert.equal(Object.hasOwn(b.data.pendingReaction,"options"),false);
 const reply=await post(db,"action",{...black.data,action:{type:"reaction",decision:"allow"}});
 assert.equal(reply.status,200);
 assert.equal(reply.data.view.player,"b");
 const promotion=await post(db,"action",{...white.data,action:{type:"move",from:"a7",to:"a8",promotion:"n"}});
 assert.equal(promotion.status,200);
 const v=(await post(db,"state",black.data)).data;
 assert.ok(v.fen.startsWith("P6k"),"Enemy API must see pawn disguise not real knight");
 assert.equal(v.last.piece,"P");
 assert.equal(Object.hasOwn(v,"classified"),false,"No hidden piece registry in player view");
 const stored=JSON.parse(db.rooms.get(white.data.room).state);
 assert.equal(stored.s.b[0],"N","D1 stores the real knight at a8");
});

test("Two live browser sessions see passive Analyst grades after each real move",async()=>{
 const db=new FakeD1(),host=await post(db,"create",{mode:"analyst-test"}),guest=await post(db,"join",{room:host.data.room});
 assert.equal(host.status,200);
 assert.equal(guest.status,200);
 const w=await post(db,"state",host.data),b=await post(db,"state",guest.data);
 assert.equal(w.data.analystTest,true);
 assert.equal(b.data.analystTest,true);
 assert.equal(w.data.hand[0].id,"the-analyst");
 assert.equal(b.data.hand[0].id,"the-analyst");
 const start=await post(db,"action",{...host.data,action:{type:"move",from:"e2",to:"e4"}});
 assert.equal(start.status,200);
 assert.equal(start.data.view.analyst.entries.length,1);
 const next=await post(db,"action",{...guest.data,action:{type:"move",from:"e7",to:"e5"}});
 assert.equal(next.status,200);
 assert.equal(next.data.view.analyst.entries.length,2);
 const hostView=(await post(db,"state",host.data)).data;
 assert.deepEqual(hostView.analyst.entries,next.data.view.analyst.entries,"Both browsers see identical graded history");
 assert.equal(hostView.hand[0].used,false,"Passive card is never spent");
 assert.equal(Object.hasOwn(hostView,"players"),false,"No authentication secrets leak through analysis");
 const stored=JSON.parse(db.rooms.get(host.data.room).state);
 assert.equal(stored.analystLog.length,2,"Move analysis persists in the multiplayer database");
});

test("GAMESHUB only proxies pinned Stockfish JS and WASM assets, with proper MIME",async()=>{
 const visits=[];
 const fetcher=async(url,options)=>{
  visits.push({url,options});
  return new Response(new Uint8Array([0,97,115,109]),{status:200});
 };
 const js=await serveStockfishAsset("stockfish-19-lite-single.js",fetcher);
 assert.equal(js.status,200);
 assert.match(js.headers.get("Content-Type"),/text\/javascript/);
 const wasm=await serveStockfishAsset("stockfish-19-lite-single.wasm",fetcher);
 assert.equal(wasm.status,200);
 assert.equal(wasm.headers.get("Content-Type"),"application/wasm");
 assert.equal((await wasm.arrayBuffer()).byteLength,4);
 assert.equal(visits.length,2);
 assert.ok(visits.every(x=>x.url.startsWith("https://cdn.jsdelivr.net/npm/stockfish@19.0.1/bin/")));
 const bad=await serveStockfishAsset("../secret",fetcher);
 assert.equal(bad.status,404);
 assert.equal(visits.length,2,"Never fetch arbitrary user-supplied paths");
 const offline=await serveStockfishAsset("stockfish-19-lite-single.js",async()=>new Response("",{status:404}));
 assert.equal(offline.status,503,"Never substitute fake engine results if the download fails");
});

test("Stockfish asset proxy retries pinned unpkg when jsDelivr is down",async()=>{
 const urls=[];
 const fallback=await serveStockfishAsset("stockfish-19-lite-single.wasm",async url=>{
  urls.push(url);
  if(url.includes("jsdelivr"))return new Response("CDN unavailable",{status:503});
  return new Response(new Uint8Array([0,97,115,109]),{status:200});
 });
 assert.equal(fallback.status,200);
 assert.equal(fallback.headers.get("Content-Type"),"application/wasm");
 assert.equal(fallback.headers.get("X-Stockfish-CDN"),"unpkg");
 assert.equal(urls.length,2);
 assert.ok(urls.every(x=>x.includes("stockfish@19.0.1/bin/stockfish-19-lite-single.wasm")));
});

test("The CDN proxy streams the official pinned full NNUE Stockfish 19 assets",async()=>{
 const visited=[];
 const fetcher=async(url,options)=>{
  visited.push({url,headers:options.headers});
  return new Response(new Uint8Array([0,97,115,109]),{status:200});
 };
 for(const [name,mime] of [
  ["stockfish-19-single.js","text/javascript; charset=utf-8"],
  ["stockfish-19-single.wasm","application/wasm"]
 ]){
  const result=await serveStockfishAsset(name,fetcher);
  assert.equal(result.status,200);
  assert.equal(result.headers.get("Content-Type"),mime);
  assert.equal((await result.arrayBuffer()).byteLength,4);
 }
 assert.equal(visited.length,2);
 assert.ok(visited.every(v=>v.url.startsWith("https://cdn.jsdelivr.net/npm/stockfish@19.0.1/bin/stockfish-19-single.")));
 const nonexistent=await serveStockfishAsset("stockfish-20-single.wasm",fetcher);
 assert.equal(nonexistent.status,404);
 assert.equal(visited.length,2,"The route must not proxy arbitrary files");
});

test("Only one stronger device analyzes: both multiplayer screens receive the SAME saved Stockfish grade",async()=>{
 const db=new FakeD1();
 const host=await post(db,"create",{mode:"analyst-test"});
 const guest=await post(db,"join",{room:host.data.room});
 const lightId="11111111-1111-4111-8111-111111111111";
 const strongId="22222222-2222-4222-8222-222222222222";
 const lightweight=await post(db,"analyst",{...host.data,intent:"register",clientId:lightId,score:1});
 assert.equal(lightweight.status,200);
 assert.equal(lightweight.data.view.analyst.worker.role,"leader");
 assert.equal(lightweight.data.view.analyst.worker.quality,"lite");
 const stronger=await post(db,"analyst",{...guest.data,intent:"register",clientId:strongId,score:105});
 assert.equal(stronger.status,200);
 assert.equal(stronger.data.view.analyst.worker.role,"leader");
 assert.equal(stronger.data.view.analyst.worker.quality,"full");
 const hostView=(await post(db,"state",host.data)).data;
 assert.equal(hostView.analyst.worker.role,"viewer","Chromebook is no longer elected");
 const move=await post(db,"action",{...host.data,action:{type:"move",from:"e2",to:"e4"}});
 assert.equal(move.status,200);
 assert.equal(move.data.view.analyst.entries[0].status,"pending");
 const best={score:{kind:"cp",value:30,depth:19},bestmove:"e2e4"};
 const played={score:{kind:"cp",value:25,depth:19},bestmove:"e2e4"};
 const forbidden=await post(db,"analyst",{...host.data,intent:"submit",clientId:lightId,turn:1,best,played,quality:"lite"});
 assert.equal(forbidden.status,400,"Only the elected analyzer can submit a result");
 const approved=await post(db,"analyst",{...guest.data,intent:"submit",clientId:strongId,turn:1,best,played,quality:"full"});
 assert.equal(approved.status,200);
 assert.equal(approved.data.view.analyst.entries[0].grade,"Book");
 const white=(await post(db,"state",host.data)).data;
 const black=(await post(db,"state",guest.data)).data;
 assert.deepEqual(white.analyst.entries,black.analyst.entries,"Both screens must receive identical saved grades");
 assert.equal(white.analyst.entries[0].engine,"Stockfish 19 · Full NNUE");
 assert.equal(white.analyst.entries[0].status,"done");
 const duplicate=await post(db,"analyst",{...guest.data,intent:"submit",clientId:strongId,turn:1,best,played,quality:"full"});
 assert.equal(duplicate.status,400,"A turn cannot be graded twice");
 assert.equal(JSON.parse(db.rooms.get(host.data.room).state).analystLog[0].grade,"Book");
});

test("Shared Analyst lease survives a color swap, expires on disconnect, and can be retried",async()=>{
 const db=new FakeD1(),host=await post(db,"create",{mode:"analyst-test"});
 const guest=await post(db,"join",{room:host.data.room});
 const fastId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
 const slowId="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
 let elected=await post(db,"analyst",{...host.data,intent:"register",clientId:fastId,score:115});
 assert.equal(elected.status,200);
 const row=db.rooms.get(host.data.room),g=JSON.parse(row.state);
 g.moveCount=19;row.state=JSON.stringify(g);
 const move=await post(db,"action",{...host.data,action:{type:"move",from:"e2",to:"e4"}});
 assert.equal(move.status,200);
 assert.equal(move.data.view.player,"b","The authenticated session swaps board colors");
 assert.equal(move.data.view.analyst.worker.role,"leader","Analyzer follows the human, not the board color");
 let state=JSON.parse(row.state);
 state.analystLease.expires=0;row.state=JSON.stringify(state);
 const takeover=await post(db,"analyst",{...guest.data,intent:"register",clientId:slowId,score:1});
 assert.equal(takeover.status,200);
 assert.equal(takeover.data.view.analyst.worker.role,"leader");
 assert.equal(takeover.data.view.analyst.worker.quality,"lite");
 const old=(await post(db,"state",host.data)).data;
 assert.equal(old.analyst.worker.role,"viewer");
 const failure=await post(db,"analyst",{...guest.data,intent:"failure",clientId:slowId,turn:20,message:"WASM worker timeout"});
 assert.equal(failure.status,200);
 assert.equal(failure.data.view.analyst.entries[0].status,"unavailable");
 const retry=await post(db,"analyst",{...host.data,intent:"retry",clientId:fastId});
 assert.equal(retry.status,200);
 assert.equal(retry.data.view.analyst.entries[0].status,"pending");
 assert.equal(retry.data.view.analyst.worker,null,"Retry opens a new election");
});

test("Analyzer cannot forge a grade directly or send another move's evaluation",async()=>{
 const db=new FakeD1(),host=await post(db,"create",{mode:"analyst-test"});
 const guest=await post(db,"join",{room:host.data.room});
 const id="abababab-abab-4aba-8aba-abababababab";
 await post(db,"analyst",{...host.data,intent:"register",clientId:id,score:100});
 await post(db,"action",{...host.data,action:{type:"move",from:"e2",to:"e4"}});
 const best={score:{kind:"cp",value:20,depth:15},bestmove:"d2d4"};
 const wrongPlayed={score:{kind:"cp",value:15,depth:15},bestmove:"e1e2"};
 const forged=await post(db,"analyst",{...host.data,intent:"submit",clientId:id,turn:1,best,played:wrongPlayed,quality:"full",grade:"Brilliant"});
 assert.equal(forged.status,400);
 const result=(await post(db,"state",guest.data)).data.analyst.entries[0];
 assert.equal(result.status,"pending");
 assert.equal(result.grade,"Analyzing");
 assert.equal(Object.hasOwn((await post(db,"state",guest.data)).data.analyst.worker,"hash"),false,"Never leak player authentication hashes");
});

test("Both live multiplayer API clients receive the same Bishop Sniper cinematic sequence",async()=>{
 const db=new FakeD1(),host=await post(db,"create",{mode:"sniper-test"});
 const guest=await post(db,"join",{room:host.data.room});
 const row=db.rooms.get(host.data.room),g=JSON.parse(row.state);
 g.s=parseFen("4k3/6p1/5q2/8/8/2B5/8/4K3 w - - 0 1");
 g.history=[g.s];g.hands.w=[{id:"bishop-sniper",used:false}];
 g.hands.b=[{id:"pawn-sidestep",used:false}];
 row.state=JSON.stringify(g);
 let hostResponse=await post(db,"action",{...host.data,action:{type:"card",card:"bishop-sniper",from:"c3",direction:"NE"}});
 assert.equal(hostResponse.status,200);
 const secret=(await post(db,"state",guest.data)).data;
 assert.equal(secret.cinematics.length,0,"Secret pre-shot diagonal cannot be exposed by the cinematic");
 assert.equal(secret.sniper.opponentRevealed,null);
 await post(db,"action",{...guest.data,action:{type:"move",from:"e8",to:"d8"}});
 hostResponse=await post(db,"action",{...host.data,action:{type:"sniper-shot",to:"g7"}});
 assert.equal(hostResponse.status,200);
 const guestFirst=(await post(db,"state",guest.data)).data;
 assert.equal(guestFirst.cinematics.length,1);
 assert.deepEqual(hostResponse.data.view.cinematics,guestFirst.cinematics,
  "First shot cinematic must be identical on both devices");
 assert.equal(guestFirst.cinematics[0].kind,"sniper-first-shot");
 await post(db,"action",{...guest.data,action:{type:"move",from:"d8",to:"e8"}});
 const second=await post(db,"action",{...host.data,action:{type:"sniper-shot",to:"f6"}});
 assert.equal(second.status,200);
 const guestSecond=(await post(db,"state",guest.data)).data;
 assert.equal(guestSecond.cinematics[1].kind,"sniper-teleport");
 assert.deepEqual(second.data.view.cinematics,guestSecond.cinematics);
 assert.equal(guestSecond.fen.split(" ")[0].includes("5B2"),true);
});

test("Only the Analyst owner sees scores and can register, retry, or publish engine results",async()=>{
 const db=new FakeD1(),host=await post(db,"create",{});
 const guest=await post(db,"join",{room:host.data.room});
 const row=db.rooms.get(host.data.room),g=JSON.parse(row.state);
 g.hands.w=[{id:"the-analyst",used:false},{id:"pawn-sidestep",used:false}];
 g.hands.b=[{id:"pawn-sidestep",used:false},{id:"parking-ticket",used:false}];
 row.state=JSON.stringify(g);
 const lightId="11111111-1111-4111-8111-111111111111";
 const ownerId="22222222-2222-4222-8222-222222222222";
 const nonowner=(await post(db,"state",guest.data)).data;
 assert.deepEqual(nonowner.analyst,{active:false,entries:[],worker:null});
 const forbiddenRegister=await post(db,"analyst",{...guest.data,intent:"register",score:120,clientId:lightId});
 assert.equal(forbiddenRegister.status,400);
 assert.match(forbiddenRegister.data.error,/Only a player holding The Analyst/);
 const forbiddenRetry=await post(db,"analyst",{...guest.data,intent:"retry",clientId:lightId});
 assert.equal(forbiddenRetry.status,400);
 const allowed=await post(db,"analyst",{...host.data,intent:"register",clientId:ownerId,score:95});
 assert.equal(allowed.status,200);
 assert.equal(allowed.data.view.analyst.worker.role,"leader");
 const first=await post(db,"action",{...host.data,action:{type:"move",from:"e2",to:"e4"}});
 assert.equal(first.status,200);
 const ownerFirst=(await post(db,"state",host.data)).data;
 const blockedFirst=(await post(db,"state",guest.data)).data;
 assert.equal(ownerFirst.analyst.entries[0].status,"pending");
 assert.deepEqual(blockedFirst.analyst,{active:false,entries:[],worker:null});
 const best={score:{kind:"cp",value:30,depth:19},bestmove:"e2e4"};
 const played={score:{kind:"cp",value:25,depth:19},bestmove:"e2e4"};
 const forbiddenSubmit=await post(db,"analyst",{...guest.data,intent:"submit",clientId:lightId,
  turn:1,best,played,quality:"full"});
 assert.equal(forbiddenSubmit.status,400);
 const forbiddenFailure=await post(db,"analyst",{...guest.data,intent:"failure",
  clientId:lightId,turn:1,message:"simulated"});
 assert.equal(forbiddenFailure.status,400);
 const saved=await post(db,"analyst",{...host.data,intent:"submit",clientId:ownerId,
  turn:1,best,played,quality:"full"});
 assert.equal(saved.status,200);
 assert.equal(saved.data.view.analyst.entries[0].grade,"Book");
 const blockedAfter=(await post(db,"state",guest.data)).data;
 assert.deepEqual(blockedAfter.analyst,{active:false,entries:[],worker:null});
 const response=JSON.stringify(blockedAfter);
 assert.equal(response.includes('"beforeFen"'),false);
 assert.equal(response.includes('"uci"'),false);
 assert.equal(response.includes('"grade":"Book"'),false);
 assert.equal(response.includes(ownerId),false);
 assert.equal(JSON.parse(row.state).analystLog[0].grade,"Book",
  "One canonical grade remains saved for the owner's view");
});
test("If only Black owns Analyst, White never receives grades, including after a 20-turn color swap",async()=>{
 const db=new FakeD1(),host=await post(db,"create",{});
 const guest=await post(db,"join",{room:host.data.room});
 const row=db.rooms.get(host.data.room),g=JSON.parse(row.state);
 g.hands.w=[{id:"pawn-sidestep",used:false}];
 g.hands.b=[{id:"the-analyst",used:false}];
 row.state=JSON.stringify(g);
 assert.equal((await post(db,"state",host.data)).data.analyst.active,false);
 assert.equal((await post(db,"state",guest.data)).data.analyst.active,true);
 const id="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
 const whiteDenied=await post(db,"analyst",{...host.data,intent:"register",clientId:id,score:200});
 assert.equal(whiteDenied.status,400);
 const blackAllowed=await post(db,"analyst",{...guest.data,intent:"register",clientId:id,score:95});
 assert.equal(blackAllowed.status,200);
 let mutated=JSON.parse(row.state);mutated.moveCount=19;row.state=JSON.stringify(mutated);
 const swapped=await post(db,"action",{...host.data,action:{type:"move",from:"e2",to:"e4"}});
 assert.equal(swapped.status,200);
 assert.equal(swapped.data.view.player,"b","Old White is now controlling Black");
 assert.deepEqual(swapped.data.view.analyst,{active:false,entries:[],worker:null});
 const blackOwner=(await post(db,"state",guest.data)).data;
 assert.equal(blackOwner.player,"w","Old Black now controls White");
 assert.equal(blackOwner.analyst.active,true);
 assert.equal(blackOwner.analyst.entries.length,1);
 assert.equal(blackOwner.analyst.worker.role,"leader",
  "Lease remains attached to the authenticated owner across the color swap");
});


test("public rooms are discoverable without exposing private sessions, pieces or cards",async()=>{
 const db=new FakeD1(),privateRoom=await post(db,"create",{}),
       publicRoom=await post(db,"create",{visibility:"public"});
 assert.equal(privateRoom.status,200);assert.equal(privateRoom.data.publicRoom,false);
 assert.equal(publicRoom.status,200);assert.equal(publicRoom.data.publicRoom,true);
 const list=await post(db,"public-list",{});
 assert.equal(list.status,200);
 assert.equal(list.data.rooms.length,1);
 assert.deepEqual(Object.keys(list.data.rooms[0]).sort(),["capacity","code","createdAt","players"]);
 assert.equal(list.data.rooms[0].code,publicRoom.data.room);
 assert.ok(!JSON.stringify(list.data).includes(privateRoom.data.room));
 assert.ok(!JSON.stringify(list.data).includes(publicRoom.data.token));
 assert.ok(!JSON.stringify(list.data).includes("hands"));
 assert.ok(!JSON.stringify(list.data).includes("players\":{\"w"));
 assert.equal((await post(db,"state",publicRoom.data)).data.publicRoom,true);
 assert.equal((await post(db,"state",privateRoom.data)).data.publicRoom,false);
});
test("Quick Play creates public room when none exists, and next opponent joins automatically",async()=>{
 const db=new FakeD1();
 const first=await post(db,"quick-join",{});
 assert.equal(first.status,200);
 assert.equal(first.data.player,"w");
 assert.equal(first.data.publicRoom,true);
 assert.equal((await post(db,"public-list",{})).data.rooms.length,1);
 const second=await post(db,"quick-join",{});
 assert.equal(second.status,200);
 assert.equal(second.data.player,"b");
 assert.equal(second.data.room,first.data.room);
 assert.notEqual(second.data.token,first.data.token);
 assert.equal((await post(db,"public-list",{})).data.rooms.length,0);
 assert.equal((await post(db,"state",first.data)).data.ready,true);
 const third=await post(db,"quick-join",{});
 assert.equal(third.data.player,"w");
 assert.notEqual(third.data.room,first.data.room);
});
test("Public room joins close listing and only one guest can win a last-seat race",async()=>{
 const db=new FakeD1();
 const host=await post(db,"create",{visibility:"public"});
 const [a,b]=await Promise.all([
  post(db,"join",{room:host.data.room}),
  post(db,"join",{room:host.data.room})
 ]);
 assert.deepEqual([a.status,b.status].sort(),[200,409]);
 assert.equal((await post(db,"public-list",{})).data.rooms.length,0);
 const saved=JSON.parse(db.rooms.get(host.data.room).state);
 assert.ok(saved.players.b);
});
test("Public host can unlist a waiting room, not an opponent or unauthorized token",async()=>{
 const db=new FakeD1();
 const host=await post(db,"create",{visibility:"public"});
 assert.equal((await post(db,"unlist",{room:host.data.room,token:"0".repeat(64)})).status,403);
 const unlisted=await post(db,"unlist",host.data);
 assert.equal(unlisted.status,200);
 assert.equal((await post(db,"public-list",{})).data.rooms.length,0);
 // Removing from discovery does not invalidate the private room code for reconnect.
 const joined=await post(db,"join",{room:host.data.room});
 assert.equal(joined.status,200);
 assert.equal((await post(db,"unlist",joined.data)).status,403);
 assert.equal((await post(db,"unlist",host.data)).status,403);
});
test("Stale public rooms expire from discovery without deleting active game sessions",async()=>{
 const db=new FakeD1();
 const host=await post(db,"create",{visibility:"public"});
 db.publicRooms.set(host.data.room,Date.now()-61*60*1000);
 assert.equal((await post(db,"public-list",{})).data.rooms.length,0);
 assert.equal((await post(db,"state",host.data)).status,200);
 assert.equal((await post(db,"quick-join",{})).data.player,"w");
});
