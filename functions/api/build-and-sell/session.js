
import {readPlate,readCompaction,plateFromPlayer,compactPatch} from "../../../games/build-and-sell/compactor-math.mjs";
import {readPipes,addPipe,removePipe,readSupply,addSupply,cleanKind,readRisers,setRiser,readElevated,addElevated,removeElevated,pruneElevated} from "../../../games/build-and-sell/plumbing-math.mjs";
import {readForms,changeForm} from "../../../games/build-and-sell/formwork-math.mjs";
import {readGravel,gravelPatch} from "../../../games/build-and-sell/gravel-math.mjs";
import {cleanMachineVisual} from "../../../games/build-and-sell/machine-playback.mjs";
import {readMachine,readDig,cleanDrive,targetTile} from "../../../games/build-and-sell/excavator-math.mjs";
import {tileBounds} from "../../../games/build-and-sell/terrain.mjs";
import {sanitizeLayout,readLayout} from "../../../games/build-and-sell/layout-math.mjs";
import {sanitizePose} from "../../../games/build-and-sell/movement.mjs";
import {sanitizeSurvey} from "../../../games/build-and-sell/survey-math.mjs";
import {sanitizeTape} from "../../../games/build-and-sell/tape-math.mjs";
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
const worldData=(w,room)=>{const l=readLayout(w),d=readDig(w,l.layout),g=readGravel(w,l.layout,d.dug);return {...l,machine:readMachine(w,room),...d,...g,plate:readPlate(w,room),...readCompaction(w,l.layout,g.gravel),...readForms(w,l.layout),...readPipes(w,l.layout),...readSupply(w,l.layout),risers:readRisers(w,l.layout,{drain:readPipes(w,l.layout).pipes,...readSupply(w,l.layout).supply}),elevated:readElevated(w,l.layout)};};
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
 return json({ok:true,code:c,id,token:secret,host:true,pose,...worldData(worldState,c),saveUpdated:w.updated});
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
 if(!["sync","save","leave","layout","vehicle","dig","gravel","plate","compact","form","pipe"].includes(b.action))return json({ok:false,error:"Unknown operation."},400);
 const auth=await db.prepare("SELECT s.world,s.host,s.closed,s.updated FROM build_players_v2 p JOIN build_sessions_v2 s ON s.code=p.room WHERE p.id=? AND p.room=? AND p.token=? AND p.updated>? AND s.closed=0 AND s.updated>?").bind(b.id,room,b.token,cutoff,cutoff).first();
 if(!auth)return json({ok:false,error:"Session closed or expired. Load the world or get a new code."},410);
 const host=auth.host===b.id;
 const guard="EXISTS(SELECT 1 FROM build_sessions_v2 s JOIN build_players_v2 p ON p.room=s.code WHERE s.code=? AND s.world=build_worlds_v2.id AND s.closed=0 AND s.updated>? AND p.id=? AND p.token=? AND p.updated>?)";
 const guardArgs=[room,cutoff,b.id,b.token,cutoff];
 const worldRow=async()=>JSON.parse((await db.prepare("SELECT state FROM build_worlds_v2 WHERE id=?").bind(auth.world).first())?.state||"{}");
 if(b.action==="pipe"){
 const w=await worldRow(),l=readLayout(w),f=readForms(w,l.layout),s=readPipes(w,l.layout),supply=readSupply(w,l.layout).supply,kind=cleanKind(b.kind),lists={drain:s.pipes,...supply},list=lists[kind],risers=readRisers(w,l.layout,lists),elevated=readElevated(w,l.layout),pose=sanitizePose(b.pose);
 if(!pose||b.pose?.pipeMode!==true||readMachine(w,room).driver===b.id||readPlate(w,room).driver===b.id||b.revision!==l.revision||b.pipeRevision!==s.pipeRevision)return json({ok:false,error:"Pipe state changed. Try again."},409);
 let next=list,point;if(b.elevated){if(f.forms.length!==4)return json({ok:false,error:"Finish formwork first."},400);const result=addElevated(l.layout,elevated[kind],risers[kind],b.elevated.a,b.elevated.b,b.elevated.height,pose);if(result.error)return json({ok:false,error:result.error},400);elevated[kind]=result.lines;point=b.elevated.b;}else if(typeof b.removeElevated==="string"){const hit=elevated[kind].find(e=>e.id===b.removeElevated),result=removeElevated(elevated[kind],b.removeElevated,pose);if(!result)return json({ok:false,error:"Approach the elevated pipe."},400);elevated[kind]=result;point=hit.b;}else if(b.riser){if(f.forms.length!==4&&b.height!==0)return json({ok:false,error:"Finish formwork first."},400);const result=setRiser(l.layout,list,risers[kind],b.riser,b.height,pose);if(result.error)return json({ok:false,error:result.error},400);risers[kind]=result.risers;point=b.riser;}else if(typeof b.remove==="string"){const hit=list.find(e=>e.id===b.remove);next=removePipe(list,b.remove,pose);point=hit?.b;if(!next)return json({ok:false,error:"Approach a pipe to remove it."},400);}else{if(f.forms.length!==4)return json({ok:false,error:"Finish formwork first."},400);const result=(kind==="drain"?addPipe:addSupply)(l.layout,list,b.a,b.b,pose);if(result.error)return json({ok:false,error:result.error},400);next=result.pipes;point=next.at(-1).b;}
 const last={actor:b.id,point,kind};lists[kind]=next;const clean=readRisers({risers},l.layout,lists);for(const k of Object.keys(elevated))elevated[k]=pruneElevated(elevated[k],clean[k]);const patch={pipes:lists.drain,supply:{cold:lists.cold,hot:lists.hot,conduit:lists.conduit},risers:clean,elevated};
 const u=await db.prepare("UPDATE build_worlds_v2 SET state=json_set(json_patch(state,json(?)),'$.pipeRevision',?,'$.lastPipe',json(?)),updated=? WHERE id=? AND COALESCE(json_extract(state,'$.pipeRevision'),0)=? AND COALESCE(json_extract(state,'$.layoutRevision'),0)=? AND "+guard).bind(JSON.stringify(patch),s.pipeRevision+1,JSON.stringify(last),now,auth.world,s.pipeRevision,l.revision,...guardArgs).run();
 if(!u.meta?.changes)return json({ok:false,error:"Pipe network changed. Try again."},409);return json({ok:true,...worldData(await worldRow(),room)});
 }
 if(b.action==="form"){
 const w=await worldRow(),l=readLayout(w),d=readDig(w,l.layout),g=readGravel(w,l.layout,d.dug),c=readCompaction(w,l.layout,g.gravel),f=readForms(w,l.layout),pose=sanitizePose(b.pose);
 if(!pose||b.pose?.formMode!==true||readMachine(w,room).driver===b.id||readPlate(w,room).driver===b.id||b.revision!==l.revision||b.formRevision!==f.formRevision)return json({ok:false,error:"Formwork state changed. Try again."},409);
 const next=changeForm(l.layout,f.forms,b.side,b.install,pose,new Set(c.compacted));if(!next)return json({ok:false,error:"Finish compaction and approach a valid foundation edge."},400);
 const last={actor:b.id,side:b.side,install:b.install};
 const u=await db.prepare("UPDATE build_worlds_v2 SET state=json_set(state,'$.forms',json(?),'$.formRevision',?,'$.lastForm',json(?)),updated=? WHERE id=? AND COALESCE(json_extract(state,'$.formRevision'),0)=? AND COALESCE(json_extract(state,'$.layoutRevision'),0)=? AND "+guard).bind(JSON.stringify(next),f.formRevision+1,JSON.stringify(last),now,auth.world,f.formRevision,l.revision,...guardArgs).run();
 if(!u.meta?.changes)return json({ok:false,error:"Formwork changed by another builder. Try again."},409);return json({ok:true,...worldData(await worldRow(),room)});
 }
 if(b.action==="plate"||b.action==="compact"){
 const w=await worldRow(),plate=readPlate(w,room),pose=sanitizePose(b.pose),l=readLayout(w),d=readDig(w,l.layout),g=readGravel(w,l.layout,d.dug),c=readCompaction(w,l.layout,g.gravel);
 if(!pose)return json({ok:false,error:"Invalid player position."},400);
 if(b.action==="plate"){
 const enter=b.enter===true;if(enter){if(readMachine(w,room).driver===b.id||Math.hypot(pose.x-plate.x,pose.z-plate.z)>2.8)return json({ok:false,error:"Approach the plate compactor on foot."},400);if(plate.driver&&plate.driver!==b.id){const other=await db.prepare("SELECT id FROM build_players_v2 WHERE id=? AND room=? AND updated>?").bind(plate.driver,room,cutoff).first();if(other)return json({ok:false,error:"Compactor occupied."},409);}}else if(plate.driver!==b.id)return json({ok:false,error:"Not operating the compactor."},409);
 const next={...(enter?plate:plateFromPlayer(pose)),driver:enter?b.id:null,room,rev:plate.rev+1};
 const u=await db.prepare("UPDATE build_worlds_v2 SET state=json_set(state,'$.plate',json(?)),updated=? WHERE id=? AND COALESCE(json_extract(state,'$.plate.rev'),0)=? AND "+guard).bind(JSON.stringify(next),now,auth.world,plate.rev,...guardArgs).run();if(!u.meta?.changes)return json({ok:false,error:"Compactor changed. Try again."},409);return json({ok:true,...worldData(await worldRow(),room)});
 }
 if(plate.driver!==b.id||b.pose?.plateOperating!==true||b.revision!==l.revision)return json({ok:false,error:"Operate the compactor first."},403);
 const position=plateFromPlayer(pose);if(Math.hypot(position.x-plate.x,position.z-plate.z)>4)return json({ok:false,error:"Compactor position out of range."},409);
 const ids=compactPatch(l.layout,position,new Set(g.gravel),new Set(c.compacted));if(!ids.length)return json({ok:false,error:"No loose gravel here."},409);
 const u=await db.prepare("UPDATE build_worlds_v2 SET state=json_set(state,'$.compacted',json(?),'$.compactRevision',?,'$.plate.x',?,'$.plate.z',?,'$.plate.yaw',?),updated=? WHERE id=? AND COALESCE(json_extract(state,'$.compactRevision'),0)=? AND COALESCE(json_extract(state,'$.layoutRevision'),0)=? AND json_extract(state,'$.plate.driver')=? AND json_extract(state,'$.plate.room')=? AND "+guard).bind(JSON.stringify([...c.compacted,...ids]),c.compactRevision+1,position.x,position.z,position.yaw,now,auth.world,c.compactRevision,l.revision,b.id,room,...guardArgs).run();if(!u.meta?.changes)return json({ok:false,error:"Compaction changed. Try again."},409);return json({ok:true,...worldData(await worldRow(),room)});
 }
 if(b.action==="gravel"){
 const w=await worldRow(),l=readLayout(w),d=readDig(w,l.layout),g=readGravel(w,l.layout,d.dug),pose=sanitizePose(b.pose);
 if(!pose||b.pose?.driving||readPlate(w,room).driver===b.id||b.pose?.gravelMode!==true||readMachine(w,room).driver===b.id||b.revision!==l.revision)return json({ok:false,error:"Equip gravel tool near the excavation."},400);
 const ids=gravelPatch(l.layout,b.tile,new Set(d.dug),new Set(g.gravel),pose);
 if(!ids.length)return json({ok:false,error:"No uncovered excavated ground in reach."},409);
 const last={actor:b.id,tile:b.tile};
 const u=await db.prepare("UPDATE build_worlds_v2 SET state=json_set(state,'$.gravel',json(?),'$.gravelRevision',?,'$.lastGravel',json(?)),updated=? WHERE id=? AND COALESCE(json_extract(state,'$.gravelRevision'),0)=? AND COALESCE(json_extract(state,'$.layoutRevision'),0)=? AND "+guard).bind(JSON.stringify([...g.gravel,...ids]),g.gravelRevision+1,JSON.stringify(last),now,auth.world,g.gravelRevision,l.revision,...guardArgs).run();
 if(!u.meta?.changes)return json({ok:false,error:"Gravel updated by another builder. Try again."},409);return json({ok:true,...worldData(await worldRow(),room)});
 }
 if(b.action==="vehicle"||b.action==="dig"){
 const w=await worldRow(),m=readMachine(w,room),l=readLayout(w),d=readDig(w,l.layout),pose=sanitizePose(b.pose);
 if(b.action==="vehicle"){if(b.enter===true&&readPlate(w,room).driver===b.id)return json({ok:false,error:"Park the compactor first."},409);
 const enter=b.enter===true;if(enter){if(!pose||Math.hypot(pose.x-m.x,pose.z-m.z)>3.5)return json({ok:false,error:"Approach the excavator first."},400);if(m.driver&&m.driver!==b.id){const owner=await db.prepare("SELECT id FROM build_players_v2 WHERE id=? AND room=? AND updated>?").bind(m.driver,room,cutoff).first();if(owner)return json({ok:false,error:"Excavator occupied."},409);}}else if(m.driver!==b.id)return json({ok:false,error:"You are not driving."},409);
 const v=!enter?(cleanDrive(b.pose?.drive)||m):m;const next={x:v.x,z:v.z,yaw:v.yaw,driver:enter?b.id:null,room,rev:m.rev+1};
 const u=await db.prepare("UPDATE build_worlds_v2 SET state=json_set(state,'$.machine',json(?)),updated=? WHERE id=? AND COALESCE(json_extract(state,'$.machine.rev'),0)=? AND "+guard).bind(JSON.stringify(next),now,auth.world,m.rev,...guardArgs).run();if(!u.meta?.changes)return json({ok:false,error:"Excavator changed. Try again."},409);return json({ok:true,...worldData(await worldRow(),room)});
 }
 if(m.driver!==b.id)return json({ok:false,error:"Enter the excavator first."},403);
 const tile=tileBounds(l.layout,b.tile),drive=cleanDrive(b.pose?.drive);if(!tile||!drive||b.revision!==l.revision||Math.hypot(drive.x-m.x,drive.z-m.z)>5)return json({ok:false,error:"Invalid dig target."},400);
 const target=targetTile(l.layout,{x:(tile.x1+tile.x2)/2,z:(tile.z1+tile.z2)/2},drive,new Set(d.dug));if(!target)return json({ok:false,error:"Square already dug or outside reach."},409);
 const u=await db.prepare("UPDATE build_worlds_v2 SET state=json_set(state,'$.dug',json(?),'$.digRevision',?,'$.lastDig',?),updated=? WHERE id=? AND COALESCE(json_extract(state,'$.digRevision'),0)=? AND COALESCE(json_extract(state,'$.layoutRevision'),0)=? AND json_extract(state,'$.machine.driver')=? AND json_extract(state,'$.machine.room')=? AND "+guard).bind(JSON.stringify([...d.dug,target.id]),d.digRevision+1,target.id,now,auth.world,d.digRevision,l.revision,b.id,room,...guardArgs).run();if(!u.meta?.changes)return json({ok:false,error:"Dig changed. Try again."},409);return json({ok:true,...worldData(await worldRow(),room)});
 }
 if(b.action==="layout"){
 const rect=sanitizeLayout(b.layout),revision=b.revision;if((b.layout!==null&&!rect)||!Number.isSafeInteger(revision)||revision<0)return json({ok:false,error:"Invalid foundation layout."},400);
 if(b.layout===null&&!host)return json({ok:false,error:"Only the host can clear the layout."},403);
 const change=await db.prepare("UPDATE build_worlds_v2 SET state=json_set(state,'$.layout',json(?),'$.layoutRevision',?),updated=? WHERE id=? AND COALESCE(json_extract(state,'$.layoutRevision'),0)=? AND COALESCE(json_array_length(json_extract(state,'$.dug')),0)=0 AND EXISTS(SELECT 1 FROM build_sessions_v2 s JOIN build_players_v2 p ON p.room=s.code WHERE s.code=? AND s.world=build_worlds_v2.id AND s.closed=0 AND s.updated>? AND p.id=? AND p.token=? AND p.updated>?)").bind(JSON.stringify(rect),revision+1,now,auth.world,revision,room,cutoff,b.id,b.token,cutoff).run();
 if(!change.meta?.changes)return json({ok:false,error:"Layout changed or session closed."},409);
 return json({ok:true,layout:rect,revision:revision+1});
 }
 if(b.action==="save"&&!host)return json({ok:false,error:"Only the host can save."},403);
 const p=sanitizePose(b.pose),save=savedPose(b.pose);
 if(p){p.driving=b.pose?.driving===true;p.pipeMode=!p.driving&&!b.pose?.plateOperating&&b.pose?.pipeMode===true;p.pipeKind=cleanKind(b.pose?.pipeKind);p.formMode=!p.driving&&!p.pipeMode&&!b.pose?.plateOperating&&b.pose?.formMode===true;p.gravelMode=!p.driving&&!p.pipeMode&&!p.formMode&&b.pose?.gravelMode===true;p.machineVisual=p.driving?cleanMachineVisual(b.pose?.machineVisual):null;p.tape=sanitizeTape(b.pose?.tape);p.survey=sanitizeSurvey(b.pose?.survey);if(p.survey.mode!=="none"&&p.tape.equipped)p.tape=sanitizeTape(null);if(p.gravelMode||p.formMode||p.pipeMode){p.tape=sanitizeTape(null);p.survey.mode="none";}}
 if(b.action!=="leave"&&!p)return json({ok:false,error:"Invalid movement state."},400);
 const saveState=save?JSON.stringify(save):null;
 const saveSql="UPDATE build_worlds_v2 SET state=json_set(state,'$.hostPose',json(?)),updated=? WHERE id=? AND EXISTS(SELECT 1 FROM build_sessions_v2 WHERE code=? AND world=build_worlds_v2.id AND host=? AND closed=0 AND updated>?)";
 if(b.action==="leave"){
 const statements=[];
 if(p&&b.pose?.plateOperating){const q=plateFromPlayer(p);statements.push(db.prepare("UPDATE build_worlds_v2 SET state=json_set(state,'$.plate.x',?,'$.plate.z',?,'$.plate.yaw',?,'$.plate.driver',NULL,'$.plate.rev',COALESCE(json_extract(state,'$.plate.rev'),0)+1) WHERE id=? AND json_extract(state,'$.plate.driver')=? AND json_extract(state,'$.plate.room')=? AND "+guard).bind(q.x,q.z,q.yaw,auth.world,b.id,room,...guardArgs));}
 const v=cleanDrive(b.pose?.drive);if(v)statements.push(db.prepare("UPDATE build_worlds_v2 SET state=json_set(state,'$.machine.x',?,'$.machine.z',?,'$.machine.yaw',?,'$.machine.driver',NULL,'$.machine.rev',COALESCE(json_extract(state,'$.machine.rev'),0)+1) WHERE id=? AND json_extract(state,'$.machine.driver')=? AND json_extract(state,'$.machine.room')=? AND "+guard).bind(v.x,v.z,v.yaw,auth.world,b.id,room,...guardArgs));
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
 if(p&&b.pose?.plateOperating){const q=plateFromPlayer(p);statements.push(db.prepare("UPDATE build_worlds_v2 SET state=json_set(state,'$.plate.x',?,'$.plate.z',?,'$.plate.yaw',?) WHERE id=? AND json_extract(state,'$.plate.driver')=? AND json_extract(state,'$.plate.room')=? AND "+guard).bind(q.x,q.z,q.yaw,auth.world,b.id,room,...guardArgs));}
 const v=cleanDrive(b.pose?.drive);if(p.driving&&v)statements.push(db.prepare("UPDATE build_worlds_v2 SET state=json_set(state,'$.machine.x',?,'$.machine.z',?,'$.machine.yaw',?) WHERE id=? AND json_extract(state,'$.machine.driver')=? AND json_extract(state,'$.machine.room')=? AND "+guard).bind(v.x,v.z,v.yaw,auth.world,b.id,room,...guardArgs));
 statements.push(db.prepare("SELECT p.id,p.name,p.pose FROM build_players_v2 p JOIN build_sessions_v2 s ON s.code=p.room WHERE p.room=? AND p.updated>? AND s.closed=0 AND s.updated>? ORDER BY p.id LIMIT 8").bind(room,cutoff,cutoff));
 statements.push(db.prepare("SELECT state FROM build_worlds_v2 WHERE id=?").bind(auth.world));
 const result=await db.batch(statements),rows=result.at(-2).results||[],worldState=JSON.parse(result.at(-1).results?.[0]?.state||"{}");
 if(!rows.some(r=>r.id===b.id))return json({ok:false,error:"Session closed or expired."},410);
 return json({ok:true,saved:host&&b.action==="save"&&!!result[1]?.meta?.changes,...worldData(worldState,room),players:rows.map(r=>({id:r.id,name:r.name,pose:JSON.parse(r.pose)}))});
 }catch(e){console.error("Build & Sell session",e);return json({ok:false,error:"Multiplayer or save service temporarily unavailable."},503)}
}
