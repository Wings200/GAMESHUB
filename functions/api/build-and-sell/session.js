
import {sanitizePose} from "../../../games/build-and-sell/movement.mjs";
import {onRequestGet as accountMe} from "../account/me.js";
const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",TTL=45000;
const code=()=>Array.from(crypto.getRandomValues(new Uint8Array(6)),n=>chars[n%chars.length]).join("");
const name=s=>String(s||"Builder").replace(/[<>]/g,"").trim().slice(0,20)||"Builder";
const token=()=>crypto.randomUUID()+crypto.randomUUID();
const spawn={x:0,y:0,z:4,yaw:0,pitch:0,crouch:false,mode:"idle",speed:0};
function savedPose(p){const q=sanitizePose(p);return q?{...q,y:0,crouch:false,mode:"idle",speed:0}:null}
async function identity(ctx){const response=await accountMe(ctx);if(!response.ok)throw Error("Account service unavailable");const d=await response.json();return d.signedIn&&d.user?.id?d.user:null}
async function schema(db){await db.batch([
 db.prepare("CREATE TABLE IF NOT EXISTS build_worlds_v2 (id TEXT PRIMARY KEY, owner TEXT NOT NULL UNIQUE, state TEXT NOT NULL, updated INTEGER NOT NULL)"),
 db.prepare("CREATE TABLE IF NOT EXISTS build_sessions_v2 (code TEXT PRIMARY KEY, world TEXT NOT NULL, host TEXT NOT NULL, updated INTEGER NOT NULL, closed INTEGER NOT NULL DEFAULT 0)"),
 db.prepare("CREATE INDEX IF NOT EXISTS build_sessions_v2_world ON build_sessions_v2(world,closed)"),
 db.prepare("CREATE TABLE IF NOT EXISTS build_players_v2 (id TEXT PRIMARY KEY, room TEXT NOT NULL, token TEXT NOT NULL, name TEXT NOT NULL, pose TEXT NOT NULL, updated INTEGER NOT NULL)"),
 db.prepare("CREATE INDEX IF NOT EXISTS build_players_v2_room ON build_players_v2(room,updated)")
]);}
const active="EXISTS (SELECT 1 FROM build_sessions_v2 s WHERE s.code=build_players_v2.room AND s.closed=0 AND s.updated>?)";
async function openWorld(db,user,action,username,now){
 let w=await db.prepare("SELECT id,state,updated FROM build_worlds_v2 WHERE owner=?").bind(user.id).first();
 if(!w&&action==="load")return json({ok:false,error:"No saved world. Choose NEW."},404);
 if(w&&action==="new")return json({ok:false,error:"A save already exists. Load your world."},409);
 if(!w){const id=crypto.randomUUID(),state=JSON.stringify({version:1,hostPose:spawn});
  await db.prepare("INSERT OR IGNORE INTO build_worlds_v2(id,owner,state,updated) VALUES (?,?,?,?)").bind(id,user.id,state,now).run();
  w=await db.prepare("SELECT id,state,updated FROM build_worlds_v2 WHERE owner=?").bind(user.id).first();
 }
 const worldState=JSON.parse(w.state),pose=savedPose(worldState.hostPose)||spawn;
 for(let i=0;i<12;i++){
 const c=code(),id=crypto.randomUUID(),secret=token();
 try{
 // The code is inserted first with a unique constraint. D1 batches are atomic:
 // a collision rolls back the other statements rather than closing a valid room.
 await db.batch([
 db.prepare("INSERT INTO build_sessions_v2(code,world,host,updated,closed) VALUES (?,?,?,?,0)").bind(c,w.id,id,now),
 db.prepare("UPDATE build_sessions_v2 SET closed=1 WHERE world=? AND code<>? AND closed=0").bind(w.id,c),
 db.prepare("INSERT INTO build_players_v2(id,room,token,name,pose,updated) VALUES (?,?,?,?,?,?)").bind(id,c,secret,username,JSON.stringify(pose),now)
 ]);
 return json({ok:true,code:c,id,token:secret,host:true,pose,saveUpdated:w.updated});
 }catch(e){if(!/unique|constraint/i.test(String(e)))throw e;}
 }
 return json({ok:false,error:"Unable to generate a fresh session code."},503);
}
export async function onRequestPost(ctx){
 const db=ctx.env.DB;if(!db)return json({ok:false,error:"Session database unavailable."},503);
 try{
 if(Number(ctx.request.headers.get("content-length")||0)>8192)return json({ok:false,error:"Request too large."},413);
 const raw=await ctx.request.text();if(raw.length>8192)return json({ok:false,error:"Request too large."},413);
 let b;try{b=JSON.parse(raw)}catch{return json({ok:false,error:"Invalid request."},400)}
 if(!b||typeof b!=="object")return json({ok:false,error:"Invalid request."},400);
 const now=Date.now(),room=String(b.code||"").toUpperCase(),cutoff=now-TTL;
 if(["list","new","load","join"].includes(b.action)){
 await schema(db);
 // Retain session codes as tombstones so a previous invite can never be recycled.
 await db.batch([
 db.prepare("UPDATE build_sessions_v2 SET closed=1 WHERE closed=0 AND updated<=?").bind(cutoff),
 db.prepare("DELETE FROM build_players_v2 WHERE updated<=? OR room IN (SELECT code FROM build_sessions_v2 WHERE closed=1)").bind(cutoff)
 ]);
 if(b.action!=="join"){
 const user=await identity(ctx);
 if(!user)return json({ok:false,error:"Sign into GAMESHUB (or use a guest account) to create and load saves."},401);
 if(b.action==="list"){const w=await db.prepare("SELECT id,updated FROM build_worlds_v2 WHERE owner=?").bind(user.id).first();return json({ok:true,save:w?{updated:w.updated}:null,username:user.username||"Builder"});}
 return openWorld(db,user,b.action,name(user.username||b.name),now);
 }
 if(!/^[A-Z0-9]{6}$/.test(room))return json({ok:false,error:"Enter a six-character session code."},400);
 const id=crypto.randomUUID(),secret=token();
 const j=await db.prepare("INSERT INTO build_players_v2(id,room,token,name,pose,updated) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM build_sessions_v2 WHERE code=? AND closed=0 AND updated>?) AND (SELECT COUNT(*) FROM build_players_v2 WHERE room=? AND updated>?)<8").bind(id,room,secret,name(b.name),JSON.stringify(spawn),now,room,cutoff,room,cutoff).run();
 return j.meta?.changes?json({ok:true,code:room,id,token:secret,host:false}):json({ok:false,error:"Session is closed, expired, or full."},409);
 }
 if(!/^[A-Z0-9]{6}$/.test(room)||typeof b.id!=="string"||typeof b.token!=="string")return json({ok:false,error:"Invalid session credentials."},400);
 if(!["sync","save","leave"].includes(b.action))return json({ok:false,error:"Unknown operation."},400);
 const auth=await db.prepare("SELECT s.world,s.host,s.closed,s.updated FROM build_players_v2 p JOIN build_sessions_v2 s ON s.code=p.room WHERE p.id=? AND p.room=? AND p.token=? AND p.updated>? AND s.closed=0 AND s.updated>?").bind(b.id,room,b.token,cutoff,cutoff).first();
 if(!auth)return json({ok:false,error:"Session closed or expired. Load the world or get a new code."},410);
 const host=auth.host===b.id;
 if(b.action==="save"&&!host)return json({ok:false,error:"Only the host can save."},403);
 const p=sanitizePose(b.pose),save=savedPose(b.pose);
 if(b.action!=="leave"&&!p)return json({ok:false,error:"Invalid movement state."},400);
 const saveState=save?JSON.stringify({version:1,hostPose:save}):null;
 const saveSql="UPDATE build_worlds_v2 SET state=?,updated=? WHERE id=? AND EXISTS(SELECT 1 FROM build_sessions_v2 WHERE code=? AND world=build_worlds_v2.id AND host=? AND closed=0 AND updated>?)";
 if(b.action==="leave"){
 const statements=[];
 if(host&&saveState)statements.push(db.prepare(saveSql).bind(saveState,now,auth.world,room,b.id,cutoff));
 if(host)statements.push(db.prepare("UPDATE build_sessions_v2 SET closed=1 WHERE code=? AND host=?").bind(room,b.id));
 statements.push(host?db.prepare("DELETE FROM build_players_v2 WHERE room=? AND EXISTS(SELECT 1 FROM build_sessions_v2 WHERE code=? AND host=? AND closed=1)").bind(room,room,b.id):db.prepare("DELETE FROM build_players_v2 WHERE id=? AND room=? AND token=?").bind(b.id,room,b.token));
 await db.batch(statements);return json({ok:true,saved:!!(host&&saveState)});
 }
 const u=await db.prepare("UPDATE build_players_v2 SET pose=?,updated=? WHERE id=? AND room=? AND token=? AND updated>? AND "+active).bind(JSON.stringify(p),now,b.id,room,b.token,cutoff,cutoff).run();
 if(!u.meta?.changes)return json({ok:false,error:"Session closed or expired."},410);
 const statements=[];
 if(host){
 statements.push(db.prepare("UPDATE build_sessions_v2 SET updated=? WHERE code=? AND host=? AND closed=0 AND updated>?").bind(now,room,b.id,cutoff));
 if(b.action==="save")statements.push(db.prepare(saveSql).bind(saveState,now,auth.world,room,b.id,cutoff));
 else statements.push(db.prepare(saveSql+" AND updated<?").bind(saveState,now,auth.world,room,b.id,cutoff,now-15000));
 }
 statements.push(db.prepare("SELECT p.id,p.name,p.pose FROM build_players_v2 p JOIN build_sessions_v2 s ON s.code=p.room WHERE p.room=? AND p.updated>? AND s.closed=0 AND s.updated>? ORDER BY p.id LIMIT 8").bind(room,cutoff,cutoff));
 const result=await db.batch(statements),rows=result.at(-1).results||[];
 if(!rows.some(r=>r.id===b.id))return json({ok:false,error:"Session closed or expired."},410);
 return json({ok:true,saved:host&&b.action==="save"&&!!result[1]?.meta?.changes,players:rows.map(r=>({id:r.id,name:r.name,pose:JSON.parse(r.pose)}))});
 }catch(e){console.error("Build & Sell session",e);return json({ok:false,error:"Multiplayer or save service temporarily unavailable."},503)}
}
