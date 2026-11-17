// GAMESHUB Pages Function: two-player Illegal Chess rooms backed by existing D1 DB.
// POST /api/illegal-chess/{create,join,state,action}; no unauthenticated spectator endpoints.
import {newGame,joinGame,act,playerView} from "../../../games/illegal-chess/game.mjs";

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

const codePattern=/^[A-HJ-NP-Z2-9]{6}$/;
const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode=()=>{const a=new Uint8Array(6);crypto.getRandomValues(a);return [...a].map(n=>alphabet[n%alphabet.length]).join("");};
const newToken=()=>crypto.randomUUID().replaceAll("-","")+crypto.randomUUID().replaceAll("-","");
async function hash(value){const data=new TextEncoder().encode(value);const bytes=new Uint8Array(await crypto.subtle.digest("SHA-256",data));return [...bytes].map(b=>b.toString(16).padStart(2,"0")).join("");}
async function json(request){const raw=await request.text();if(raw.length>8192)throw Error("Request too large");try{return JSON.parse(raw||"{}")}catch{throw Error("Malformed JSON")}}
function getIdentity(game,hashed){if(game.players.w===hashed)return "w";if(game.players.b===hashed)return "b";return null;}
async function init(db){
 await db.prepare("CREATE TABLE IF NOT EXISTS illegal_chess_rooms (code TEXT PRIMARY KEY, version INTEGER NOT NULL DEFAULT 0, state TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)").run();
}
async function row(db,code){return db.prepare("SELECT code,version,state FROM illegal_chess_rooms WHERE code=? LIMIT 1").bind(code).first();}
function roomCode(input){const code=String(input||"").trim().toUpperCase();if(!codePattern.test(code))throw Error("Room code must be six characters");return code;}
function tokenValue(input){const token=String(input||"");if(!/^[a-f0-9]{64}$/.test(token))throw Error("Invalid player session");return token;}
const safely=err=>["Room not found","Room is already full","Not your turn","Game is over","Wait for a second player","Your king would be in check"].includes(err.message)||/^(Illegal|Choose|Select|Cannot|No |This card|Unknown|Invalid|Request|Malformed|Not implemented|The king|Hit and Run|That piece|You already|Objection!|Counterfeit|Waiting for the opponent|Classified Promotion)/.test(err.message)?err.message:"Action unavailable";
export async function onRequest(context){
 if(context.request.method==="GET"){
  const pathname=new URL(context.request.url).pathname;
  return serveStockfishAsset(pathname.split("/").pop());
 }
 if(context.request.method!=="POST")return reply({error:"Use POST"},405);
 if(!context.env.DB)return reply({error:"GAMESHUB D1 DB binding is unavailable"},503);
 try{
  const path=new URL(context.request.url).pathname.split("/").filter(Boolean).pop();
  if(!["create","join","state","action"].includes(path))return reply({error:"Unknown endpoint"},404);
  const data=await json(context.request),db=context.env.DB;
  await init(db);
  if(path==="create"){
   const playerToken=newToken(),hashed=await hash(playerToken),now=Date.now();
   for(let tries=0;tries<8;tries++){
    const code=newCode(),game=newGame(code,hashed,{sniperTest:data.mode==="sniper-test",analystTest:data.mode==="analyst-test"});
    try{
     await db.prepare("INSERT INTO illegal_chess_rooms(code,version,state,created_at,updated_at) VALUES(?,0,?,?,?)").bind(code,JSON.stringify(game),now,now).run();
     return reply({room:code,player:"w",token:playerToken});
    }catch(e){if(/UNIQUE|constraint/i.test(String(e)))continue;throw e;}
   }
   return reply({error:"Could not allocate a room"},503);
  }
  const code=roomCode(data.room),r=await row(db,code);
  if(!r)return reply({error:"Room not found"},404);
  const game=JSON.parse(r.state);
  if(path==="join"){
   if(game.players.b)return reply({error:"Room is already full"},409);
   const t=newToken(),hashed=await hash(t);joinGame(game,hashed);
   const result=await db.prepare("UPDATE illegal_chess_rooms SET state=?,version=version+1,updated_at=? WHERE code=? AND version=?").bind(JSON.stringify(game),Date.now(),code,r.version).run();
   if(result.meta?.changes!==1)return reply({error:"Room changed; try again"},409);
   return reply({room:code,player:"b",token:t});
  }
  const hashed=await hash(tokenValue(data.token)),player=getIdentity(game,hashed);
  if(!player)return reply({error:"Invalid player session"},403);
  if(path==="state")return reply(playerView(game,player));
  try{act(game,player,data.action)}catch(e){return reply({error:safely(e)},400)}
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
