import test from "node:test";
import assert from "node:assert/strict";
import {onRequest} from "../functions/api/illegal-chess/[[path]].js";
import {parseFen} from "../games/illegal-chess/engine.mjs";

class FakeD1 {
 constructor(){this.rooms=new Map();}
 prepare(sql){
  const db=this;let args=[];
  return {
   bind(...values){args=values;return this;},
   async first(){
    if(sql.includes("SELECT code,version,state")){const room=db.rooms.get(args[0]);return room?{...room}:null;}
    throw Error("Unexpected first SQL: "+sql);
   },
   async run(){
    if(sql.includes("CREATE TABLE"))return {meta:{changes:0}};
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
