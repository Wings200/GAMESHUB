// GAMESHUB Pages Function: two-player Illegal Chess rooms backed by existing D1 DB.
// POST /api/illegal-chess/{create,join,state,action}; no unauthenticated spectator endpoints.
import {newGame,joinGame,act,playerView,cardUsageSnapshot,recordCardUsage,voteRematch} from "../../../games/illegal-chess/game.mjs";
import {classifyStockfish} from "../../../games/illegal-chess/stockfish-review.mjs";
import {analystActive} from "../../../games/illegal-chess/analyst.mjs";

const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
// Whitelisted, unmodified Stockfish.js GPL-3.0 engine assets. Proxied through
// our own origin so browser Web Workers resolve their matching WASM file next
// to the JS glue, with no changes to existing D1 gameplay/authentication.
// Upstream source and license: https://github.com/nmrugg/stockfish.js
const STOCKFISH_ORIGINS=["https://cdn.jsdelivr.net/npm/stockfish@19.0.1/bin/","https://unpkg.com/stockfish@19.0.1/bin/"];
const ENGINE_FILES={
 // Full NNUE is the strongest official Stockfish.js 19 browser build usable
 // without cross-origin isolation. It includes the official full neural net.
 "stockfish-19-single.js":"text/javascript; charset=utf-8",
 "stockfish-19-single.wasm":"application/wasm",
 // Keep smaller builds for browsers with limited bandwidth or memory.
 "stockfish-19-lite-single.js":"text/javascript; charset=utf-8",
 "stockfish-19-lite-single.wasm":"application/wasm"
};
export async function serveStockfishAsset(path,fetcher=fetch){
 const mime=ENGINE_FILES[path];
 if(!mime)return reply({error:"Unknown engine asset"},404);
 for(const origin of STOCKFISH_ORIGINS){
  try{
   const source=await fetcher(origin+path,{method:"GET",headers:{"Accept":mime.split(";")[0]}});
   if(!source.ok){console.warn("Stockfish CDN returned",source.status,origin);continue;}
   return new Response(source.body,{status:200,headers:{
    "Content-Type":mime,
    "Cache-Control":"public, max-age=86400, stale-while-revalidate=86400",
    "X-Content-Type-Options":"nosniff",
    "X-Stockfish-CDN":origin.includes("jsdelivr")?"jsdelivr":"unpkg"
   }});
  }catch(error){console.warn("Stockfish asset fetch failed",origin,error);}
 }
 return reply({error:"Both Stockfish CDNs are currently unavailable"},503);
}

const ANALYST_LEASE_MS=20000;
const analystIdValid=id=>typeof id==="string"&&/^[a-f0-9-]{20,64}$/.test(id);
const analystScoreValid=score=>Number.isInteger(score)&&score>=1&&score<=200;
const analystResultValid=(r,uci)=>{
 if(!r||typeof r!=="object"||!r.score||typeof r.score!=="object")return false;
 const {score,bestmove}=r;
 return /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(bestmove||"")&&
  (uci?bestmove===uci:true)&&["cp","mate"].includes(score.kind)&&
  Number.isInteger(score.value)&&Math.abs(score.value)<=40000&&
  Number.isInteger(score.depth)&&score.depth>=1&&score.depth<=80;
};
function analystRequest(g,hashed,data,now=Date.now()){
 const player=getIdentity(g,hashed);
 if(!g.players.b||!player||!analystActive(g,player))
  throw Error("Only a player holding The Analyst can request Stockfish reviews");
 if(!analystIdValid(data.clientId))throw Error("Invalid Analyst client identity");
 const lease=g.analystLease;
 const current=lease&&lease.expires>now;
 if(data.intent==="register"){
  if(!analystScoreValid(data.score))throw Error("Invalid Analyst device capability");
  // Prefer the stronger connected device, but automatically take over if it
  // disconnects. A Chromebook scores low and does not start a heavy worker
  // while a more capable desktop remains connected.
  const quality=data.score>=70?"full":"lite";
  const same=current&&lease.hash===hashed&&lease.id===data.clientId;
  if(!current||same||data.score>lease.score+1){
   g.analystLease={hash:hashed,id:data.clientId,score:data.score,quality,expires:now+ANALYST_LEASE_MS,readyAt:same?lease.readyAt:now+(data.score<=15?4500:1800)};
   return true;
  }
  return false;
 }
 if(data.intent==="retry"){
  let changed=false;
  for(const entry of g.analystLog||[])if(entry.status==="unavailable"){
   entry.status="pending";entry.grade="Analyzing";entry.reason="Waiting for shared Stockfish review.";
   entry.symbol=null;changed=true;
  }
  g.analystLease=null;
  return changed||!!lease;
 }
 if(!current||lease.hash!==hashed||lease.id!==data.clientId)throw Error("Analyst worker changed; your result is not the shared result");
 const entry=(g.analystLog||[]).find(e=>e.turn===data.turn);
 if(!entry||entry.status!=="pending")throw Error("Analyst turn was already graded or is no longer available");
 if(data.intent==="failure"){
  entry.status="unavailable";entry.grade="Unavailable";entry.symbol=null;
  entry.reason="Stockfish unavailable on the analyzing device: "+String(data.message||"worker failed").slice(0,180);
  return true;
 }
 if(data.intent!=="submit")throw Error("Unknown Analyst command");
 if(!["full","lite","asm"].includes(data.quality)||!entry.beforeFen||!entry.uci||!analystResultValid(data.best)||!analystResultValid(data.played,entry.uci))
  throw Error("Invalid Stockfish review payload");
 const rated=classifyStockfish(entry,data.best,data.played);
 Object.assign(entry,{
  status:"done",grade:rated.grade,symbol:rated.symbol,name:rated.name,
  estimated:false,loss:rated.loss,depth:rated.depth,reason:rated.reason,
  engine:data.quality==="full"&&lease.quality==="full"?"Stockfish 19 · Full NNUE":data.quality==="asm"?"Stockfish 19 · ASM.js":"Stockfish 19 · Lite NNUE",
  reviewedAt:now
 });
 return true;
}
// Public rooms are discoverable for one hour, and only while awaiting a guest.
// Public-list responses never include player session hashes, hands or board state.
const PUBLIC_PRESENCE_MS=45_000; // stale public hosts disappear unless they heartbeat
const codePattern=/^[A-HJ-NP-Z2-9]{6}$/;
const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode=()=>{const a=new Uint8Array(6);crypto.getRandomValues(a);return [...a].map(n=>alphabet[n%alphabet.length]).join("");};
const newToken=()=>crypto.randomUUID().replaceAll("-","")+crypto.randomUUID().replaceAll("-","");
async function hash(value){const data=new TextEncoder().encode(value);const bytes=new Uint8Array(await crypto.subtle.digest("SHA-256",data));return [...bytes].map(b=>b.toString(16).padStart(2,"0")).join("");}
async function json(request){const raw=await request.text();if(raw.length>8192)throw Error("Request too large");try{return JSON.parse(raw||"{}")}catch{throw Error("Malformed JSON")}}
function getIdentity(game,hashed){if(game.players.w===hashed)return "w";if(game.players.b===hashed)return "b";return null;}
async function init(db){
 await db.prepare("CREATE TABLE IF NOT EXISTS illegal_chess_rooms (code TEXT PRIMARY KEY, version INTEGER NOT NULL DEFAULT 0, state TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)").run();
 await db.prepare("CREATE TABLE IF NOT EXISTS illegal_chess_public_rooms (code TEXT PRIMARY KEY, created_at INTEGER NOT NULL, last_seen INTEGER NOT NULL)").run();
}
async function row(db,code){return db.prepare("SELECT code,version,state FROM illegal_chess_rooms WHERE code=? LIMIT 1").bind(code).first();}
async function openPublicRooms(db){
 const rows=await db.prepare("SELECT p.code,p.created_at,r.version,r.state FROM illegal_chess_public_rooms p JOIN illegal_chess_rooms r ON r.code=p.code WHERE p.last_seen>? ORDER BY p.created_at ASC LIMIT 60")
  .bind(Date.now()-PUBLIC_PRESENCE_MS).all();
 return (rows.results||[]).flatMap(r=>{
  let game;
  try{game=JSON.parse(r.state);}catch{return [];}
  if(!game.public||game.players.b)return [];
  return [{code:r.code,createdAt:r.created_at,version:r.version,game}];
 });
}
async function createRoom(db,{publicRoom=false}={}){
 const playerToken=newToken(),hashed=await hash(playerToken),now=Date.now();
 for(let tries=0;tries<8;tries++){
  const code=newCode(),game=newGame(code,hashed);
  game.public=publicRoom;
  try{
   await db.prepare("INSERT INTO illegal_chess_rooms(code,version,state,created_at,updated_at) VALUES(?,0,?,?,?)").bind(code,JSON.stringify(game),now,now).run();
   if(publicRoom)await db.prepare("INSERT INTO illegal_chess_public_rooms(code,created_at,last_seen) VALUES(?,?,?)").bind(code,now,now).run();
   return {room:code,player:"w",token:playerToken,publicRoom};
  }catch(e){if(/UNIQUE|constraint/i.test(String(e)))continue;throw e;}
 }
 throw Error("Could not allocate a room");
}
async function joinOpenRoom(db,record){
 const t=newToken(),hashed=await hash(t),g=record.game;
 joinGame(g,hashed);
 const saved=await db.prepare("UPDATE illegal_chess_rooms SET state=?,version=version+1,updated_at=? WHERE code=? AND version=?")
  .bind(JSON.stringify(g),Date.now(),record.code,record.version).run();
 if(saved.meta?.changes!==1)return null;
 await db.prepare("DELETE FROM illegal_chess_public_rooms WHERE code=?").bind(record.code).run();
 return {room:record.code,player:"b",token:t,publicRoom:true};
}
function roomCode(input){const code=String(input||"").trim().toUpperCase();if(!codePattern.test(code))throw Error("Room code must be six characters");return code;}
function tokenValue(input){const token=String(input||"");if(!/^[a-f0-9]{64}$/.test(token))throw Error("Invalid player session");return token;}
const safely=err=>["Room not found","Room is already full","Not your turn","Game is over","Wait for a second player","Your king would be in check","Finish the match before requesting a rematch","Choose whether you are ready for a rematch"].includes(err.message)||/^(Illegal|Choose|Select|Cannot|No |This card|Unknown|Invalid|Request|Malformed|Not implemented|The king|Hit and Run|That piece|You already|Objection!|Counterfeit|Waiting for the opponent|Classified Promotion)/.test(err.message)?err.message:"Action unavailable";
export async function onRequest(context){
 if(context.request.method==="GET"){
  const pathname=new URL(context.request.url).pathname;
  return serveStockfishAsset(pathname.split("/").pop());
 }
 if(context.request.method!=="POST")return reply({error:"Use POST"},405);
 if(!context.env.DB)return reply({error:"GAMESHUB D1 DB binding is unavailable"},503);
 try{
  const path=new URL(context.request.url).pathname.split("/").filter(Boolean).pop();
  if(!["create","join","state","action","analyst","public-list","quick-join","unlist","public-heartbeat","rematch"].includes(path))return reply({error:"Unknown endpoint"},404);
  const data=await json(context.request),db=context.env.DB;
  await init(db);
  if(path==="public-list"){
   const open=await openPublicRooms(db);
   return reply({rooms:open.slice(0,40).map(r=>({code:r.code,createdAt:r.createdAt,players:1,capacity:2}))});
  }
  if(path==="create"){
   if(Object.hasOwn(data,"mode"))return reply({error:"Guaranteed-card test rooms are no longer available"},400);
   try{return reply(await createRoom(db,{publicRoom:data.visibility==="public"}));}
   catch(e){if(e.message==="Could not allocate a room")return reply({error:e.message},503);throw e;}
  }
  if(path==="quick-join"){
   // Race-safe compare-and-swap: two guests cannot take the same second seat.
   for(const r of await openPublicRooms(db)){
    const joined=await joinOpenRoom(db,r);
    if(joined)return reply(joined);
   }
   return reply(await createRoom(db,{publicRoom:true}));
  }
  const code=roomCode(data.room),r=await row(db,code);
  if(!r)return reply({error:"Room not found"},404);
  const game=JSON.parse(r.state);
  if(path==="join"){
   if(game.players.b)return reply({error:"Room is already full"},409);
   const t=newToken(),hashed=await hash(t);joinGame(game,hashed);
   const result=await db.prepare("UPDATE illegal_chess_rooms SET state=?,version=version+1,updated_at=? WHERE code=? AND version=?").bind(JSON.stringify(game),Date.now(),code,r.version).run();
   if(result.meta?.changes!==1)return reply({error:"Room changed; try again"},409);
   if(game.public)await db.prepare("DELETE FROM illegal_chess_public_rooms WHERE code=?").bind(code).run();
   return reply({room:code,player:"b",token:t,publicRoom:!!game.public});
  }
  const hashed=await hash(tokenValue(data.token)),player=getIdentity(game,hashed);
  if(!player)return reply({error:"Invalid player session"},403);
  if(path==="state")return reply(playerView(game,player));
  if(path==="public-heartbeat"){
   if(player!=="w"||!game.public||game.players.b)return reply({error:"Only waiting public hosts can update presence"},403);
   await db.prepare("UPDATE illegal_chess_public_rooms SET last_seen=? WHERE code=?").bind(Date.now(),code).run();
   return reply({ok:true});
  }
  if(path==="unlist"){
   if(player!=="w"||game.players.b)return reply({error:"Only a waiting public host can close the listing"},403);
   await db.prepare("DELETE FROM illegal_chess_public_rooms WHERE code=?").bind(code).run();
   return reply({ok:true});
  }
  if(path==="analyst"){
   let mutated;
   try{mutated=analystRequest(game,hashed,data);}
   catch(e){return reply({error:e.message},400);}
   if(mutated){
    const saved=await db.prepare("UPDATE illegal_chess_rooms SET state=?,version=version+1,updated_at=? WHERE code=? AND version=?")
     .bind(JSON.stringify(game),Date.now(),code,r.version).run();
    if(saved.meta?.changes!==1)return reply({error:"Analyst state changed; retry"},409);
   }
   return reply({ok:true,view:playerView(game,getIdentity(game,hashed))});
  }
  if(path==="rematch"){
   if(!Number.isInteger(data.round)||data.round!==(game.round||1))return reply({error:"Rematch round changed; refresh the match"},409);
   let next;
   try{next=voteRematch(game,player,data.ready);}
   catch(e){return reply({error:safely(e)},400);}
   const saved=await db.prepare("UPDATE illegal_chess_rooms SET state=?,version=version+1,updated_at=? WHERE code=? AND version=?")
    .bind(JSON.stringify(next),Date.now(),code,r.version).run();
   if(saved.meta?.changes!==1)return reply({error:"Rematch changed; refresh and try again"},409);
   return reply({ok:true,view:playerView(next,getIdentity(next,hashed))});
  }
  const beforeCards=cardUsageSnapshot(game);
  try{act(game,player,data.action)}catch(e){return reply({error:safely(e)},400)}
  recordCardUsage(game,beforeCards);
  const result=await db.prepare("UPDATE illegal_chess_rooms SET state=?,version=version+1,updated_at=? WHERE code=? AND version=?").bind(JSON.stringify(game),Date.now(),code,r.version).run();
  if(result.meta?.changes!==1)return reply({error:"Move conflict; refresh and try again"},409);
  // Color ownership may change after this action: identify the player again before returning the private view.
  return reply({ok:true,view:playerView(game,getIdentity(game,hashed))});
 }catch(error){
  if(/^(Room code|Invalid player|Malformed JSON|Request too large)/.test(error.message))return reply({error:error.message},400);
  console.error("Illegal Chess server error",error);
  return reply({error:"Room service temporarily unavailable"},500);
 }
}
