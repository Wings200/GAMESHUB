
import {sanitizePose} from "../../../games/build-and-sell/movement.mjs";
const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",TTL=30000,ROOM_TTL=1800000;
const code=()=>Array.from(crypto.getRandomValues(new Uint8Array(6)),n=>chars[n%chars.length]).join("");
const name=s=>String(s||"Builder").replace(/[<>]/g,"").trim().slice(0,20)||"Builder";
const token=()=>crypto.randomUUID()+crypto.randomUUID();
async function schema(db){await db.batch([
 db.prepare("CREATE TABLE IF NOT EXISTS build_sessions (code TEXT PRIMARY KEY, updated INTEGER NOT NULL)"),
 db.prepare("CREATE TABLE IF NOT EXISTS build_players (id TEXT PRIMARY KEY, room TEXT NOT NULL, token TEXT NOT NULL, name TEXT NOT NULL, pose TEXT NOT NULL, updated INTEGER NOT NULL)"),
 db.prepare("CREATE INDEX IF NOT EXISTS build_players_room ON build_players(room,updated)")
]);}
async function join(db,room,username,now){
 const id=crypto.randomUUID(),secret=token(),pose=JSON.stringify({x:0,y:0,z:4,yaw:0,pitch:0,crouch:false,mode:"idle",speed:0});
 const result=await db.prepare("INSERT INTO build_players(id,room,token,name,pose,updated) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM build_sessions WHERE code=? AND updated>?) AND (SELECT COUNT(*) FROM build_players WHERE room=? AND updated>?)<8").bind(id,room,secret,username,pose,now,room,now-ROOM_TTL,room,now-TTL).run();
 return result.meta?.changes?{code:room,id,token:secret}:null;
}
export async function onRequestPost(ctx){
 const db=ctx.env.DB;if(!db)return json({ok:false,error:"Session database unavailable."},503);
 try{
 if(Number(ctx.request.headers.get("content-length")||0)>8192)return json({ok:false,error:"Request too large."},413);
 const raw=await ctx.request.text();if(raw.length>8192)return json({ok:false,error:"Request too large."},413);
 let b;try{b=JSON.parse(raw)}catch{return json({ok:false,error:"Invalid request."},400)}
 if(!b||typeof b!=="object")return json({ok:false,error:"Invalid request."},400);
 const now=Date.now(),room=String(b.code||"").toUpperCase();
 if(b.action==="create"||b.action==="join"){
 await schema(db);await db.batch([db.prepare("DELETE FROM build_players WHERE updated<?").bind(now-ROOM_TTL),db.prepare("DELETE FROM build_sessions WHERE updated<?").bind(now-ROOM_TTL)]);
 if(b.action==="create"){
 for(let i=0;i<8;i++){const c=code();const r=await db.prepare("INSERT OR IGNORE INTO build_sessions(code,updated) VALUES (?,?)").bind(c,now).run();if(r.meta?.changes){const j=await join(db,c,name(b.name),now);if(j)return json({ok:true,...j});}}
 return json({ok:false,error:"Unable to allocate a session."},503);}
 if(!/^[A-Z0-9]{6}$/.test(room))return json({ok:false,error:"Enter a six-character session code."},400);
 const j=await join(db,room,name(b.name),now);return j?json({ok:true,...j}):json({ok:false,error:"Session not found or full."},409);}
 if(!/^[A-Z0-9]{6}$/.test(room)||typeof b.id!=="string"||typeof b.token!=="string")return json({ok:false,error:"Invalid session credentials."},400);
 if(b.action==="leave"){await db.prepare("DELETE FROM build_players WHERE id=? AND room=? AND token=?").bind(b.id,room,b.token).run();return json({ok:true});}
 if(b.action!=="sync")return json({ok:false,error:"Unknown operation."},400);
 const p=sanitizePose(b.pose);if(!p)return json({ok:false,error:"Invalid movement state."},400);
 const u=await db.prepare("UPDATE build_players SET pose=?,updated=? WHERE id=? AND room=? AND token=? AND updated>?").bind(JSON.stringify(p),now,b.id,room,b.token,now-TTL).run();
 if(!u.meta?.changes)return json({ok:false,error:"Session expired. Rejoin with the code."},410);
 const results=await db.batch([db.prepare("UPDATE build_sessions SET updated=? WHERE code=? AND updated<?").bind(now,room,now-10000),db.prepare("SELECT id,name,pose FROM build_players WHERE room=? AND updated>? ORDER BY id LIMIT 8").bind(room,now-TTL)]);
 return json({ok:true,players:(results[1].results||[]).map(r=>({id:r.id,name:r.name,pose:JSON.parse(r.pose)}))});
 }catch(e){console.error("Build & Sell session",e);return json({ok:false,error:"Multiplayer service temporarily unavailable."},503)}
}
