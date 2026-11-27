
import {readPlate,readCompaction,plateFromPlayer,compactPatch} from "../../../games/build-and-sell/compactor-math.mjs";
import {readPipes,addPipe,removePipe,readSupply,addSupply,cleanKind,readRisers,setRiser,readElevated,addElevated,removeElevated,pruneElevated} from "../../../games/build-and-sell/plumbing-math.mjs";
import {readConcrete,applyConcrete,readHose,hoseDistance,PICKUP_REACH,concreteReady,slabTotal} from "../../../games/build-and-sell/concrete-math.mjs";
import {calculatePower,applyTrips,serviceLive} from "../../../games/build-and-sell/power-math.mjs";
import {readPanels,panelChange} from "../../../games/build-and-sell/panel-math.mjs";
import {readOutlets,finishOutlet,toggleInstalledSwitch} from "../../../games/build-and-sell/outlet-math.mjs";
import {readCables,addCable,CABLE_TYPES,routeCable} from "../../../games/build-and-sell/cable-math.mjs";
import {readElectrical,addDevice,deviceNear,validDevice,ELECTRIC_KINDS} from "../../../games/build-and-sell/electrical-math.mjs";
import {waterState,waterTick} from "../../../games/build-and-sell/water-math.mjs";
import {readUtility,utilityChange} from "../../../games/build-and-sell/utility-math.mjs";
import {readFixtures,fixtureChange,validFixture,fixturePosition,SPECS} from "../../../games/build-and-sell/fixture-math.mjs";
import {readHeaters,changeHeater,position as heaterPosition} from "../../../games/build-and-sell/heater-math.mjs";
import {readWallPipes,addWallPipe,removeWallPipe,routeWallPipe,pipeHoleConflict} from "../../../games/build-and-sell/wall-pipe-math.mjs";
import {readWalls,addWall,changeOpening,removeWall,changeSheathing,changeWrap,changeInsulation,changeDrywall} from "../../../games/build-and-sell/wall-math.mjs";
import {readPrep,applyPrep} from "../../../games/build-and-sell/prep-math.mjs";
import {readForms,changeForm} from "../../../games/build-and-sell/formwork-math.mjs";
import {readGravel,gravelPatch} from "../../../games/build-and-sell/gravel-math.mjs";
import {cleanMachineVisual} from "../../../games/build-and-sell/machine-playback.mjs";
import {readMachine,readDig,cleanDrive,targetTile} from "../../../games/build-and-sell/excavator-math.mjs";
import {tileBounds} from "../../../games/build-and-sell/terrain.mjs";
import {sanitizeLayout,readLayout,extendLayout,remapFoundationTiles} from "../../../games/build-and-sell/layout-math.mjs";
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
const worldData=(w,room)=>{const l=readLayout(w),d=readDig(w,l.layout),g=readGravel(w,l.layout,d.dug),comp=readCompaction(w,l.layout,g.gravel),prep=readPrep(w,l.layout,comp.compacted),pl=readPipes(w,l.layout),su=readSupply(w,l.layout),risers=readRisers(w,l.layout,{drain:pl.pipes,...su.supply}),s=readWalls(w,l.layout),wp=readWallPipes(w,s.walls,risers),e=readElectrical(w,s.walls),c=readCables(w,s.walls,e.devices),o=readOutlets(w,e.devices,c.cables),a=readPanels(w,e.devices,c.cables);return {...l,machine:readMachine(w,room),...d,...g,plate:readPlate(w,room),...comp,...readForms(w,l.layout),...pl,...su,risers,elevated:readElevated(w,l.layout),...prep,...readConcrete(w,l.layout,prep.rebar),...s,...wp,...e,...c,...o,...a,...readHeaters(w,l.layout,s.walls,e.devices,wp.wallPipes),...readFixtures(w,{layout:l.layout,walls:s.walls,lines:wp.wallPipes,risers}),...readUtility(w,l.layout,pl.pipes,su.supply),waterTickAt:Number.isFinite(w.waterTickAt)?w.waterTickAt:0,hose:readHose(w,room),serverNow:Date.now()};};
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
 if(!["sync","save","leave","layout","vehicle","dig","gravel","plate","compact","form","pipe","prep","concrete","hose","wall","electrical","cable","outlet","panel","wallPipe","heater","fixture","utility"].includes(b.action))return json({ok:false,error:"Unknown operation."},400);
 const auth=await db.prepare("SELECT s.world,s.host,s.closed,s.updated FROM build_players_v2 p JOIN build_sessions_v2 s ON s.code=p.room WHERE p.id=? AND p.room=? AND p.token=? AND p.updated>? AND s.closed=0 AND s.updated>?").bind(b.id,room,b.token,cutoff,cutoff).first();
 if(!auth)return json({ok:false,error:"Session closed or expired. Load the world or get a new code."},410);
 const host=auth.host===b.id;
 const guard="EXISTS(SELECT 1 FROM build_sessions_v2 s JOIN build_players_v2 p ON p.room=s.code WHERE s.code=? AND s.world=build_worlds_v2.id AND s.closed=0 AND s.updated>? AND p.id=? AND p.token=? AND p.updated>?)";
 const guardArgs=[room,cutoff,b.id,b.token,cutoff];
 const worldRow=async()=>JSON.parse((await db.prepare("SELECT state FROM build_worlds_v2 WHERE id=?").bind(auth.world).first())?.state||"{}");
 if(b.action==="panel"){
 const w=await worldRow(),l=readLayout(w),s=readWalls(w,l.layout),e=readElectrical(w,s.walls),c=readCables(w,s.walls,e.devices),a=readPanels(w,e.devices,c.cables),pose=sanitizePose(b.pose);
 if(!pose||b.pose?.panelMode!==true||readMachine(w,room).driver===b.id||readPlate(w,room).driver===b.id||b.revision!==l.revision||b.wallRevision!==s.wallRevision||b.electricRevision!==e.electricRevision||b.cableRevision!==c.cableRevision||b.panelRevision!==a.panelRevision)return json({ok:false,error:"Panel state changed. Try again."},409);
 const o=readOutlets(w,e.devices,c.cables),next=panelChange(s.walls,e.devices,c.cables,a.panels,b.deviceId,b,pose);if(next.error)return json({ok:false,error:next.error},400);next.panels=applyTrips(e.devices,c.cables,o.outlets,next.panels).panels;const last={actor:b.id,id:b.deviceId,operation:b.operation};const u=await db.prepare("UPDATE build_worlds_v2 SET state=json_set(state,'$.panels',json(?),'$.panelRevision',?,'$.lastPanel',json(?)),updated=? WHERE id=? AND COALESCE(json_extract(state,'$.panelRevision'),0)=? AND COALESCE(json_extract(state,'$.outletRevision'),0)=? AND COALESCE(json_extract(state,'$.cableRevision'),0)=? AND COALESCE(json_extract(state,'$.electricRevision'),0)=? AND COALESCE(json_extract(state,'$.wallRevision'),0)=? AND COALESCE(json_extract(state,'$.layoutRevision'),0)=? AND "+guard).bind(JSON.stringify(next.panels),a.panelRevision+1,JSON.stringify(last),now,auth.world,a.panelRevision,o.outletRevision,c.cableRevision,e.electricRevision,s.wallRevision,l.revision,...guardArgs).run();if(!u.meta?.changes)return json({ok:false,error:"Panel state changed. Try again."},409);return json({ok:true,...worldData(await worldRow(),room)});
 }
 if(b.action==="outlet"){
 const w=await worldRow(),l=readLayout(w),s=readWalls(w,l.layout),e=readElectrical(w,s.walls),c=readCables(w,s.walls,e.devices),o=readOutlets(w,e.devices,c.cables),pose=sanitizePose(b.pose);
 if(!pose||(b.operation!=="toggle"&&b.pose?.outletMode!==true)||readMachine(w,room).driver===b.id||readPlate(w,room).driver===b.id||b.revision!==l.revision||b.wallRevision!==s.wallRevision||b.electricRevision!==e.electricRevision||b.cableRevision!==c.cableRevision||b.outletRevision!==o.outletRevision)return json({ok:false,error:"Outlet state changed. Try again."},409);
 if(!["add","remove","toggle"].includes(b.operation))return json({ok:false,error:"Invalid outlet operation."},400);
 const he=readHeaters(w,l.layout,s.walls,e.devices,readWallPipes(w,s.walls,readRisers(w,l.layout,{drain:readPipes(w,l.layout).pipes,...readSupply(w,l.layout).supply})).wallPipes);if(b.operation==="remove"&&he.heaters.some(h=>h.electric===b.deviceId))return json({ok:false,error:"Unplug water heater first."},409);const a=readPanels(w,e.devices,c.cables);if(b.operation!=="toggle"&&a.panels.some(serviceLive))return json({ok:false,error:"Turn off connected main before wiring devices."},409);const next=b.operation==="toggle"?toggleInstalledSwitch(s.walls,e.devices,o.outlets,b.deviceId,pose):finishOutlet(s.walls,e.devices,c.cables,o.outlets,b.deviceId,b.work,pose,b.operation==="remove");if(next.error)return json({ok:false,error:next.error},400);
 const trips=applyTrips(e.devices,c.cables,next.outlets,a.panels),last={actor:b.id,id:b.deviceId,operation:b.operation};const u=await db.prepare("UPDATE build_worlds_v2 SET state=json_set(state,'$.outlets',json(?),'$.outletRevision',?,'$.lastOutlet',json(?),'$.panels',json(?),'$.panelRevision',?),updated=? WHERE id=? AND COALESCE(json_extract(state,'$.outletRevision'),0)=? AND COALESCE(json_extract(state,'$.heaterRevision'),0)=? AND COALESCE(json_extract(state,'$.panelRevision'),0)=? AND COALESCE(json_extract(state,'$.cableRevision'),0)=? AND COALESCE(json_extract(state,'$.electricRevision'),0)=? AND COALESCE(json_extract(state,'$.wallRevision'),0)=? AND COALESCE(json_extract(state,'$.layoutRevision'),0)=? AND "+guard).bind(JSON.stringify(next.outlets),o.outletRevision+1,JSON.stringify(last),JSON.stringify(trips.panels),a.panelRevision+(trips.changed?1:0),now,auth.world,o.outletRevision,he.heaterRevision,a.panelRevision,c.cableRevision,e.electricRevision,s.wallRevision,l.revision,...guardArgs).run();if(!u.meta?.changes)return json({ok:false,error:"Outlet state changed. Try again."},409);return json({ok:true,...worldData(await worldRow(),room)});
 }
 if(b.action==="cable"){
 const w=await worldRow(),l=readLayout(w),s=readWalls(w,l.layout),e=readElectrical(w,s.walls),c=readCables(w,s.walls,e.devices),pose=sanitizePose(b.pose);
 if(!pose||b.pose?.cableMode!==true||readMachine(w,room).driver===b.id||readPlate(w,room).driver===b.id||b.revision!==l.revision||b.wallRevision!==s.wallRevision||b.electricRevision!==e.electricRevision||b.cableRevision!==c.cableRevision)return json({ok:false,error:"Cable state changed. Try again."},409);
 const a=readPanels(w,e.devices,c.cables);if(a.panels.some(serviceLive))return json({ok:false,error:"Turn off connected main before changing cables."},409);if(b.operation==="remove"&&a.panels.some(p=>p.breakers.some(bk=>bk.cableId===b.cableId)))return json({ok:false,error:"Remove the connected breaker first."},409);const o=readOutlets(w,e.devices,c.cables);if(o.outlets.some(x=>b.operation==="add"?[b.a,b.b].includes(x.deviceId):(x.cableIds||[x.cableId]).includes(b.cableId)))return json({ok:false,error:"Remove the installed receptacle first."},409);
 const wp=readWallPipes(w,s.walls,readRisers(w,l.layout,{drain:readPipes(w,l.layout).pipes,...readSupply(w,l.layout).supply}));let next,id=b.cableId;if(b.operation==="add"){id=crypto.randomUUID();const result=addCable(s.walls,e.devices,c.cables,b.a,b.b,b.height,b.type,pose,id);if(result.error)return json({ok:false,error:result.error},400);if(result.cable.holes.some(h=>wp.wallPipes.some(e=>e.holes.some(q=>pipeHoleConflict(q,h)))))return json({ok:false,error:"Choose a cable route clear of wall pipe holes."},409);next=result.cables;}else if(b.operation==="remove"){const hit=c.cables.find(x=>x.id===id),d=e.devices.find(x=>x.id===b.boxId),wall=s.walls.find(x=>x.id===d?.wallId);if(!hit||!d||!wall||![hit.a,hit.b].includes(d.id)||!deviceNear(wall,d,pose))return json({ok:false,error:"Approach a connected box."},400);next=c.cables.filter(x=>x.id!==id);}else return json({ok:false,error:"Invalid cable operation."},400);
 const last={actor:b.id,id,operation:b.operation};const u=await db.prepare("UPDATE build_worlds_v2 SET state=json_set(state,'$.cables',json(?),'$.cableRevision',?,'$.lastCable',json(?)),updated=? WHERE id=? AND COALESCE(json_extract(state,'$.cableRevision'),0)=? AND COALESCE(json_extract(state,'$.wallPipeRevision'),0)=? AND COALESCE(json_extract(state,'$.panelRevision'),0)=? AND COALESCE(json_extract(state,'$.outletRevision'),0)=? AND COALESCE(json_extract(state,'$.electricRevision'),0)=? AND COALESCE(json_extract(state,'$.wallRevision'),0)=? AND COALESCE(json_extract(state,'$.layoutRevision'),0)=? AND "+guard).bind(JSON.stringify(next),c.cableRevision+1,JSON.stringify(last),now,auth.world,c.cableRevision,wp.wallPipeRevision,a.panelRevision,o.outletRevision,e.electricRevision,s.wallRevision,l.revision,...guardArgs).run();if(!u.meta?.changes)return json({ok:false,error:"Cable state changed. Try again."},409);return json({ok:true,...worldData(await worldRow(),room)});
 }
 if(b.action==="electrical"){
 const w=await worldRow(),l=readLayout(w),s=readWalls(w,l.layout),e=readElectrical(w,s.walls),pose=sanitizePose(b.pose);
 if(!pose||!ELECTRIC_KINDS.includes(b.pose?.electricMode)||readMachine(w,room).driver===b.id||readPlate(w,room).driver===b.id||b.revision!==l.revision||b.wallRevision!==s.wallRevision||b.electricRevision!==e.electricRevision)return json({ok:false,error:"Electrical state changed. Try again."},409);
 if(!Number.isFinite(w.cureAt)||w.cureAt<=0||now<w.cureAt)return json({ok:false,error:"Finish the slab first."},400);
 let next,id=b.deviceId;if(b.operation==="add"&&b.fastened===2&&b.device?.kind===b.pose.electricMode){id=crypto.randomUUID();const result=addDevice(s.walls,e.devices,b.device,pose,id);if(result.error)return json({ok:false,error:result.error},400);next=result.devices;}else if(b.operation==="remove"){const d=e.devices.find(x=>x.id===id),wall=s.walls.find(x=>x.id===d?.wallId);if(!d||!wall||!deviceNear(wall,d,pose))return json({ok:false,error:"Approach the box to remove it."},400);if(readCables(w,s.walls,e.devices).cables.some(c=>c.a===id||c.b===id))return json({ok:false,error:"Remove connected cables first."},409);next=e.devices.filter(x=>x.id!==id);}else return json({ok:false,error:"Complete both mounting fasteners."},400);
 const last={actor:b.id,id,operation:b.operation};const u=await db.prepare("UPDATE build_worlds_v2 SET state=json_set(state,'$.devices',json(?),'$.electricRevision',?,'$.lastElectric',json(?)),updated=? WHERE id=? AND COALESCE(json_extract(state,'$.electricRevision'),0)=? AND COALESCE(json_extract(state,'$.cableRevision'),0)=? AND COALESCE(json_extract(state,'$.wallRevision'),0)=? AND COALESCE(json_extract(state,'$.layoutRevision'),0)=? AND "+guard).bind(JSON.stringify(next),e.electricRevision+1,JSON.stringify(last),now,auth.world,e.electricRevision,readCables(w,s.walls,e.devices).cableRevision,s.wallRevision,l.revision,...guardArgs).run();if(!u.meta?.changes)return json({ok:false,error:"Electrical state changed. Try again."},409);return json({ok:true,...worldData(await worldRow(),room)});
 }
 if(b.action==="wall"){
 const w=await worldRow(),l=readLayout(w),s=readWalls(w,l.layout),pose=sanitizePose(b.pose);
 if(!pose||!["wall","door","window","sheathing","wrap","insulation","drywall"].includes(b.pose?.wallMode)||readMachine(w,room).driver===b.id||readPlate(w,room).driver===b.id||b.revision!==l.revision||b.wallRevision!==s.wallRevision)return json({ok:false,error:"Framing state changed. Try again."},409);
 if(!Number.isFinite(w.cureAt)||w.cureAt<=0||now<w.cureAt)return json({ok:false,error:"Wait for the slab to cure."},400);
 let next,id=b.wallId;if(b.operation==="add"&&b.pose.wallMode==="wall"){id=crypto.randomUUID();const result=addWall(l.layout,s.walls,b.a,b.b,b.height,pose,id);if(result.error)return json({ok:false,error:result.error},400);next=result.walls;}
 else if(b.operation==="remove"&&b.pose.wallMode==="wall"){next=removeWall(s.walls,id,pose);if(!next)return json({ok:false,error:"Approach the wall and remove any covering first."},400);}
 else if(["dryMeasure","dryMark","dryCut","dryPosition","dryFasten","dryRemove"].includes(b.operation)&&b.pose.wallMode==="drywall"){const result=changeDrywall(s.walls,id,b.key,b.operation,pose,b.screw);if(result.error)return json({ok:false,error:result.error},400);next=result.walls;}
 else if((b.operation==="insulate"||b.operation==="uninsulate")&&b.pose.wallMode==="insulation"){const result=changeInsulation(s.walls,id,b.key,pose,b.operation==="uninsulate");if(result.error)return json({ok:false,error:result.error},400);next=result.walls;}
 else if((b.operation==="wrapAdd"||b.operation==="wrapRemove")&&b.pose.wallMode==="wrap"){const result=changeWrap(s.walls,id,b.key,pose,b.operation==="wrapRemove");if(result.error)return json({ok:false,error:result.error},400);next=result.walls;}
 else if((b.operation==="sheetAdd"||b.operation==="sheetRemove")&&b.pose.wallMode==="sheathing"){const result=changeSheathing(s.walls,id,b.key,pose,b.operation==="sheetRemove");if(result.error)return json({ok:false,error:result.error},400);next=result.walls;}
 else if((b.operation==="opening"||b.operation==="removeOpening")&&["door","window"].includes(b.pose.wallMode)&&b.opening?.kind===b.pose.wallMode){const result=changeOpening(s.walls,id,b.opening,pose,b.operation==="removeOpening");if(result.error)return json({ok:false,error:result.error},400);next=result.walls;}
 else return json({ok:false,error:"Invalid framing operation."},400);
 const risers=readRisers(w,l.layout,{drain:readPipes(w,l.layout).pipes,...readSupply(w,l.layout).supply}),wp=readWallPipes(w,s.walls,risers);if(wp.wallPipes.some(e=>{const q=routeWallPipe(next,e.a,e.b,e.height,e.kind,risers[e.kind]);return q.error||JSON.stringify(q.pipe.points)!==JSON.stringify(e.points)||JSON.stringify(q.pipe.holes)!==JSON.stringify(e.holes);}))return json({ok:false,error:"Remove affected wall pipes first."},409);const f=readFixtures(w,{layout:l.layout,walls:s.walls,lines:wp.wallPipes,risers});if(f.fixtures.some(x=>!validFixture(l.layout,next.find(w=>w.id===x.wallId),x)))return json({ok:false,error:"Remove attached fixtures first."},409);const he=readHeaters(w,l.layout,s.walls,[],wp.wallPipes);if(he.heaters.some(h=>!readHeaters({heaters:[h]},l.layout,next,[],wp.wallPipes).heaters.length))return json({ok:false,error:"Remove water heater first."},409);const electrical=readElectrical(w,s.walls),cabling=readCables(w,s.walls,electrical.devices);if(cabling.cables.some(c=>{const q=routeCable(next,electrical.devices,c.a,c.b,c.height,c.type);return q.error||JSON.stringify(q.cable.path)!==JSON.stringify(c.path)||JSON.stringify(q.cable.holes)!==JSON.stringify(c.holes);}))return json({ok:false,error:"Remove affected cables first."},409);if(electrical.devices.some(d=>!validDevice(next.find(x=>x.id===d.wallId),d)))return json({ok:false,error:"Remove attached electrical boxes first."},409);
 const last={actor:b.id,id,operation:b.operation};const u=await db.prepare("UPDATE build_worlds_v2 SET state=json_set(state,'$.walls',json(?),'$.wallRevision',?,'$.lastWall',json(?)),updated=? WHERE id=? AND COALESCE(json_extract(state,'$.wallRevision'),0)=? AND COALESCE(json_extract(state,'$.fixtureRevision'),0)=? AND COALESCE(json_extract(state,'$.heaterRevision'),0)=? AND COALESCE(json_extract(state,'$.wallPipeRevision'),0)=? AND COALESCE(json_extract(state,'$.electricRevision'),0)=? AND COALESCE(json_extract(state,'$.cableRevision'),0)=? AND COALESCE(json_extract(state,'$.layoutRevision'),0)=? AND json_extract(state,'$.cureAt')>0 AND json_extract(state,'$.cureAt')<=? AND "+guard).bind(JSON.stringify(next),s.wallRevision+1,JSON.stringify(last),now,auth.world,s.wallRevision,f.fixtureRevision,he.heaterRevision,wp.wallPipeRevision,electrical.electricRevision,cabling.cableRevision,l.revision,now,...guardArgs).run();
 if(!u.meta?.changes)return json({ok:false,error:"Framing changed. Try again."},409);return json({ok:true,...worldData(await worldRow(),room)});
 }
 if(b.action==="hose"){
 const w=await worldRow(),l=readLayout(w),d=readDig(w,l.layout),g=readGravel(w,l.layout,d.dug),c=readCompaction(w,l.layout,g.gravel),f=readForms(w,l.layout),s=readPrep(w,l.layout,c.compacted),v=readConcrete(w,l.layout,s.rebar),h=readHose(w,room),pose=sanitizePose(b.pose);
 if(!pose||b.revision!==l.revision||b.hoseRevision!==h.rev||!["pickup","release","move"].includes(b.operation))return json({ok:false,error:"Hose state changed. Try again."},409);
 let owner=h.owner,side=h.side;
 if(b.operation==="release"){if(owner!==b.id)return json({ok:false,error:"Hose is not held by you."},409);owner=null;}
 else{if(readMachine(w,room).driver===b.id||readPlate(w,room).driver===b.id||!concreteReady(l.layout,new Set(f.forms),new Set(s.rebar))||v.poured.length===slabTotal(l.layout)||hoseDistance(l.layout,side,pose)>PICKUP_REACH)return json({ok:false,error:"Approach the mixer truck on foot."},400);
 if(owner&&owner!==b.id){const other=await db.prepare("SELECT id FROM build_players_v2 WHERE id=? AND room=? AND updated>?").bind(owner,room,cutoff).first();if(other)return json({ok:false,error:"Another builder has the hose."},409);owner=null;}
 if(b.operation==="pickup")owner=b.id;else{if(owner)return json({ok:false,error:"Put the hose away before moving the truck."},409);side=(side+1)%4;}}
 const next={side,owner,room,rev:h.rev+1};const u=await db.prepare("UPDATE build_worlds_v2 SET state=json_set(state,'$.hose',json(?)),updated=? WHERE id=? AND COALESCE(json_extract(state,'$.hose.rev'),0)=? AND COALESCE(json_extract(state,'$.layoutRevision'),0)=? AND "+guard).bind(JSON.stringify(next),now,auth.world,h.rev,l.revision,...guardArgs).run();if(!u.meta?.changes)return json({ok:false,error:"Hose changed. Try again."},409);return json({ok:true,...worldData(await worldRow(),room)});
 }
 if(b.action==="concrete"){
 const w=await worldRow(),l=readLayout(w),d=readDig(w,l.layout),g=readGravel(w,l.layout,d.dug),c=readCompaction(w,l.layout,g.gravel),f=readForms(w,l.layout),s=readPrep(w,l.layout,c.compacted),v=readConcrete(w,l.layout,s.rebar),pose=sanitizePose(b.pose);
 if(!pose||b.pose?.concreteMode!==b.kind||readMachine(w,room).driver===b.id||readPlate(w,room).driver===b.id||b.revision!==l.revision||b.concreteRevision!==v.concreteRevision)return json({ok:false,error:"Concrete state changed. Try again."},409);
 const h=readHose(w,room);if(b.kind==="pour"&&(h.owner!==b.id||b.hoseRevision!==h.rev))return json({ok:false,error:"Collect the hose from the mixer first."},409);
 const next=applyConcrete(l.layout,b.tile,b.kind,new Set(f.forms),new Set(s.rebar),new Set(v.poured),new Set(v.screeded),pose,now,h.side);if(!next)return json({ok:false,error:"Complete formwork and reinforcement, then pour before screeding."},400);
 const last={actor:b.id,kind:b.kind,tile:b.tile};const u=await db.prepare("UPDATE build_worlds_v2 SET state=json_set(state,'$.poured',json(?),'$.screeded',json(?),'$.cureAt',?,'$.concreteRevision',?,'$.lastConcrete',json(?)),updated=? WHERE id=? AND COALESCE(json_extract(state,'$.concreteRevision'),0)=? AND COALESCE(json_extract(state,'$.layoutRevision'),0)=? AND COALESCE(json_extract(state,'$.prepRevision'),0)=? AND COALESCE(json_extract(state,'$.formRevision'),0)=? AND (?='screed' OR (json_extract(state,'$.hose.owner')=? AND json_extract(state,'$.hose.room')=? AND COALESCE(json_extract(state,'$.hose.rev'),0)=?)) AND "+guard).bind(JSON.stringify(next.poured),JSON.stringify(next.screeded),next.cureAt,v.concreteRevision+1,JSON.stringify(last),now,auth.world,v.concreteRevision,l.revision,s.prepRevision,f.formRevision,b.kind,b.id,room,h.rev,...guardArgs).run();
 if(!u.meta?.changes)return json({ok:false,error:"Concrete changed. Try again."},409);return json({ok:true,...worldData(await worldRow(),room)});
 }
 if(b.action==="prep"){
 const w=await worldRow(),l=readLayout(w),d=readDig(w,l.layout),g=readGravel(w,l.layout,d.dug),c=readCompaction(w,l.layout,g.gravel),f=readForms(w,l.layout),s=readPrep(w,l.layout,c.compacted),pose=sanitizePose(b.pose);
 if(!pose||b.pose?.prepMode!==b.kind||readMachine(w,room).driver===b.id||readPlate(w,room).driver===b.id||b.revision!==l.revision||b.prepRevision!==s.prepRevision)return json({ok:false,error:"Material state changed. Try again."},409);
 if(b.install&&f.forms.length!==4)return json({ok:false,error:"Finish formwork first."},400);
 
 const next=applyPrep(l.layout,b.tile,b.kind,b.install,new Set(c.compacted),new Set(s.barrier),new Set(s.rebar),pose,new Set(w.poured||[]));if(!next)return json({ok:false,error:"No eligible unpoured material in this patch."},409);
 const last={actor:b.id,kind:b.kind,tile:b.tile,install:b.install};const u=await db.prepare("UPDATE build_worlds_v2 SET state=json_set(state,'$.barrier',json(?),'$.rebar',json(?),'$.prepRevision',?,'$.lastPrep',json(?)),updated=? WHERE id=? AND COALESCE(json_extract(state,'$.prepRevision'),0)=? AND COALESCE(json_extract(state,'$.layoutRevision'),0)=? AND COALESCE(json_extract(state,'$.concreteRevision'),0)=? AND "+guard).bind(JSON.stringify(next.barrier),JSON.stringify(next.rebar),s.prepRevision+1,JSON.stringify(last),now,auth.world,s.prepRevision,l.revision,w.concreteRevision||0,...guardArgs).run();
 if(!u.meta?.changes)return json({ok:false,error:"Material changed. Try again."},409);return json({ok:true,...worldData(await worldRow(),room)});
 }
 if(b.action==="utility"){
 const w=await worldRow(),l=readLayout(w),pl=readPipes(w,l.layout),su=readSupply(w,l.layout),u=readUtility(w,l.layout,pl.pipes,su.supply),p=sanitizePose(b.pose);
 if(!p||b.pose?.utilityMode!==true||readMachine(w,room).driver===b.id||readPlate(w,room).driver===b.id||b.revision!==l.revision||b.pipeRevision!==pl.pipeRevision||b.utilityRevision!==u.utilityRevision)return json({ok:false,error:"Utility state changed. Try again."},409);
 if(!Number.isFinite(w.cureAt)||w.cureAt<=0||now<w.cureAt)return json({ok:false,error:"Finish slab first."},400);
 const next=utilityChange({layout:l.layout,pipes:pl.pipes,supply:su.supply},u.utility,b,p);if(next.error)return json({ok:false,error:next.error},400);
 const waterService=!!next.utility.water&&next.utility.meter&&next.utility.valve;
 const q=await db.prepare("UPDATE build_worlds_v2 SET state=json_set(state,'$.utility',json(?),'$.utilityRevision',?,'$.waterService',json(?)),updated=? WHERE id=? AND COALESCE(json_extract(state,'$.utilityRevision'),0)=? AND COALESCE(json_extract(state,'$.pipeRevision'),0)=? AND COALESCE(json_extract(state,'$.layoutRevision'),0)=? AND "+guard).bind(JSON.stringify(next.utility),u.utilityRevision+1,JSON.stringify(waterService),now,auth.world,u.utilityRevision,pl.pipeRevision,l.revision,...guardArgs).run();if(!q.meta?.changes)return json({ok:false,error:"Utility state changed. Try again."},409);return json({ok:true,...worldData(await worldRow(),room)});
 }
 if(b.action==="fixture"){
 const w=await worldRow(),l=readLayout(w),s=readWalls(w,l.layout),pl=readPipes(w,l.layout),su=readSupply(w,l.layout),risers=readRisers(w,l.layout,{drain:pl.pipes,...su.supply}),wp=readWallPipes(w,s.walls,risers),e=readElectrical(w,s.walls),he=readHeaters(w,l.layout,s.walls,e.devices,wp.wallPipes),ctx={layout:l.layout,walls:s.walls,lines:wp.wallPipes,risers,heaters:he.heaters},f=readFixtures(w,ctx),p=sanitizePose(b.pose);
 if(!p||(b.operation!=="use"&&b.pose?.fixtureMode!==true)||readMachine(w,room).driver===b.id||readPlate(w,room).driver===b.id||b.revision!==l.revision||b.wallRevision!==s.wallRevision||b.wallPipeRevision!==wp.wallPipeRevision||b.pipeRevision!==pl.pipeRevision||b.heaterRevision!==he.heaterRevision||b.fixtureRevision!==f.fixtureRevision)return json({ok:false,error:"Fixture state changed. Try again."},409);
 if(!Number.isFinite(w.cureAt)||w.cureAt<=0||now<w.cureAt)return json({ok:false,error:"Finish slab and framing first."},400);
 const next=fixtureChange(ctx,f.fixtures,{...b,id:b.fixtureId,now},p,crypto.randomUUID());if(next.error)return json({ok:false,error:next.error},400);
 const u=await db.prepare("UPDATE build_worlds_v2 SET state=json_set(state,'$.fixtures',json(?),'$.fixtureRevision',?),updated=? WHERE id=? AND COALESCE(json_extract(state,'$.fixtureRevision'),0)=? AND COALESCE(json_extract(state,'$.heaterRevision'),0)=? AND COALESCE(json_extract(state,'$.wallRevision'),0)=? AND COALESCE(json_extract(state,'$.wallPipeRevision'),0)=? AND COALESCE(json_extract(state,'$.pipeRevision'),0)=? AND COALESCE(json_extract(state,'$.layoutRevision'),0)=? AND "+guard).bind(JSON.stringify(next.fixtures),f.fixtureRevision+1,now,auth.world,f.fixtureRevision,he.heaterRevision,s.wallRevision,wp.wallPipeRevision,pl.pipeRevision,l.revision,...guardArgs).run();if(!u.meta?.changes)return json({ok:false,error:"Fixture state changed. Try again."},409);return json({ok:true,...worldData(await worldRow(),room)});
 }
 if(b.action==="heater"){
 const w=await worldRow(),l=readLayout(w),s=readWalls(w,l.layout),pl=readPipes(w,l.layout),su=readSupply(w,l.layout),risers=readRisers(w,l.layout,{drain:pl.pipes,...su.supply}),wp=readWallPipes(w,s.walls,risers),e=readElectrical(w,s.walls),c=readCables(w,s.walls,e.devices),o=readOutlets(w,e.devices,c.cables),a=readPanels(w,e.devices,c.cables),he=readHeaters(w,l.layout,s.walls,e.devices,wp.wallPipes),p=sanitizePose(b.pose);
 if(!p||b.pose?.heaterMode!==true||readMachine(w,room).driver===b.id||readPlate(w,room).driver===b.id||b.revision!==l.revision||b.wallRevision!==s.wallRevision||b.wallPipeRevision!==wp.wallPipeRevision||b.electricRevision!==e.electricRevision||b.cableRevision!==c.cableRevision||b.outletRevision!==o.outletRevision||b.panelRevision!==a.panelRevision||b.heaterRevision!==he.heaterRevision)return json({ok:false,error:"Heater state changed. Try again."},409);
 if(!Number.isFinite(w.cureAt)||w.cureAt<=0||now<w.cureAt)return json({ok:false,error:"Finish slab and framing first."},400);
 const f=readFixtures(w,{layout:l.layout,walls:s.walls,lines:wp.wallPipes,risers});if(b.operation==="connect"&&["cold","hot"].includes(b.port)&&f.fixtures.some(x=>x[b.port]?.source==="wall"&&x[b.port]?.id===b.ref?.id&&x[b.port]?.end===b.ref?.end))return json({ok:false,error:"Endpoint already occupied by fixture."},409);const next=changeHeater({layout:l.layout,walls:s.walls,devices:e.devices,cables:c.cables,outlets:o.outlets,panels:a.panels,lines:wp.wallPipes,supply:su.supply,risers,waterService:he.waterService},he.heaters,{...b,id:b.heaterId},p,crypto.randomUUID());if(next.error)return json({ok:false,error:next.error},400);if(b.operation==="add"){const h=next.heaters.at(-1),q=heaterPosition(s.walls.find(w=>w.id===h.wallId),h);if(f.fixtures.some(x=>{const pos=fixturePosition(s.walls.find(w=>w.id===x.wallId),x);return Math.hypot(q.x-pos.x,q.z-pos.z)<.30+Math.max(SPECS[x.kind].w,SPECS[x.kind].d)/2;}))return json({ok:false,error:"Fixture space occupied."},409);}
 const u=await db.prepare("UPDATE build_worlds_v2 SET state=json_set(state,'$.heaters',json(?),'$.heaterRevision',?),updated=? WHERE id=? AND COALESCE(json_extract(state,'$.heaterRevision'),0)=? AND COALESCE(json_extract(state,'$.fixtureRevision'),0)=? AND COALESCE(json_extract(state,'$.layoutRevision'),0)=? AND COALESCE(json_extract(state,'$.wallRevision'),0)=? AND COALESCE(json_extract(state,'$.wallPipeRevision'),0)=? AND COALESCE(json_extract(state,'$.electricRevision'),0)=? AND COALESCE(json_extract(state,'$.cableRevision'),0)=? AND COALESCE(json_extract(state,'$.outletRevision'),0)=? AND COALESCE(json_extract(state,'$.panelRevision'),0)=? AND "+guard).bind(JSON.stringify(next.heaters),he.heaterRevision+1,now,auth.world,he.heaterRevision,f.fixtureRevision,l.revision,s.wallRevision,wp.wallPipeRevision,e.electricRevision,c.cableRevision,o.outletRevision,a.panelRevision,...guardArgs).run();if(!u.meta?.changes)return json({ok:false,error:"Heater state changed. Try again."},409);return json({ok:true,...worldData(await worldRow(),room)});
 }
 if(b.action==="wallPipe"){
 const w=await worldRow(),l=readLayout(w),s=readWalls(w,l.layout),e=readElectrical(w,s.walls),c=readCables(w,s.walls,e.devices),pl=readPipes(w,l.layout),risers=readRisers(w,l.layout,{drain:pl.pipes,...readSupply(w,l.layout).supply}),a=readWallPipes(w,s.walls,risers),pose=sanitizePose(b.pose);
 if(!pose||b.pose?.pipeMode!==true||b.pose?.pipeKind!==(b.kind==="vent"?"drain":b.kind)||!["cold","hot","drain","vent"].includes(b.kind)||readMachine(w,room).driver===b.id||readPlate(w,room).driver===b.id||b.revision!==l.revision||b.wallRevision!==s.wallRevision||b.wallPipeRevision!==a.wallPipeRevision||b.pipeRevision!==pl.pipeRevision||b.cableRevision!==c.cableRevision)return json({ok:false,error:"Wall pipe state changed. Try again."},409);
 if(!Number.isFinite(w.cureAt)||w.cureAt<=0||now<w.cureAt)return json({ok:false,error:"Finish slab and framing first."},400);
 const he=readHeaters(w,l.layout,s.walls,e.devices,a.wallPipes);const f=readFixtures(w,{layout:l.layout,walls:s.walls,lines:a.wallPipes,risers});let next;if(typeof b.remove==="string"){if(f.fixtures.some(x=>SPECS[x.kind].ports.some(k=>x[k]?.source==="wall"&&x[k]?.id===b.remove)))return json({ok:false,error:"Disconnect fixture first."},409);if(he.heaters.some(h=>h.cold?.id===b.remove||h.hot?.id===b.remove))return json({ok:false,error:"Disconnect heater port first."},409);if(!a.wallPipes.some(e=>e.id===b.remove&&e.kind===b.kind))return json({ok:false,error:"Select a matching pipe."},400);next=removeWallPipe(a.wallPipes,b.remove,pose);if(!next)return json({ok:false,error:"Approach the wall pipe."},400);}else{const q=addWallPipe(s.walls,a.wallPipes,risers,c.cables,b.a,b.b,b.height,b.kind,pose,crypto.randomUUID());if(q.error)return json({ok:false,error:q.error},400);next=q.wallPipes;}
 const u=await db.prepare("UPDATE build_worlds_v2 SET state=json_set(state,'$.wallPipes',json(?),'$.wallPipeRevision',?),updated=? WHERE id=? AND COALESCE(json_extract(state,'$.wallPipeRevision'),0)=? AND COALESCE(json_extract(state,'$.fixtureRevision'),0)=? AND COALESCE(json_extract(state,'$.heaterRevision'),0)=? AND COALESCE(json_extract(state,'$.wallRevision'),0)=? AND COALESCE(json_extract(state,'$.pipeRevision'),0)=? AND COALESCE(json_extract(state,'$.cableRevision'),0)=? AND COALESCE(json_extract(state,'$.layoutRevision'),0)=? AND "+guard).bind(JSON.stringify(next),a.wallPipeRevision+1,now,auth.world,a.wallPipeRevision,f.fixtureRevision,he.heaterRevision,s.wallRevision,pl.pipeRevision,c.cableRevision,l.revision,...guardArgs).run();if(!u.meta?.changes)return json({ok:false,error:"Wall pipe state changed. Try again."},409);return json({ok:true,...worldData(await worldRow(),room)});
 }
 if(b.action==="pipe"){
 const w=await worldRow(),l=readLayout(w),f=readForms(w,l.layout),s=readPipes(w,l.layout),supply=readSupply(w,l.layout).supply,kind=cleanKind(b.kind),lists={drain:s.pipes,...supply},list=lists[kind],risers=readRisers(w,l.layout,lists),elevated=readElevated(w,l.layout),pose=sanitizePose(b.pose);
 if(!pose||b.pose?.pipeMode!==true||readMachine(w,room).driver===b.id||readPlate(w,room).driver===b.id||b.revision!==l.revision||b.pipeRevision!==s.pipeRevision)return json({ok:false,error:"Pipe state changed. Try again."},409);
 if(Array.isArray(w.poured)&&w.poured.length)return json({ok:false,error:"Underground rough-in is locked after pouring."},409);
 let next=list,point;if(b.elevated){if(f.forms.length!==4)return json({ok:false,error:"Finish formwork first."},400);const result=addElevated(l.layout,elevated[kind],risers[kind],b.elevated.a,b.elevated.b,b.elevated.height,pose);if(result.error)return json({ok:false,error:result.error},400);elevated[kind]=result.lines;point=b.elevated.b;}else if(typeof b.removeElevated==="string"){const hit=elevated[kind].find(e=>e.id===b.removeElevated),result=removeElevated(elevated[kind],b.removeElevated,pose);if(!result)return json({ok:false,error:"Approach the elevated pipe."},400);elevated[kind]=result;point=hit.b;}else if(b.riser){if(f.forms.length!==4&&b.height!==0)return json({ok:false,error:"Finish formwork first."},400);const result=setRiser(l.layout,list,risers[kind],b.riser,b.height,pose);if(result.error)return json({ok:false,error:result.error},400);risers[kind]=result.risers;point=b.riser;}else if(typeof b.remove==="string"){const hit=list.find(e=>e.id===b.remove);next=removePipe(list,b.remove,pose);point=hit?.b;if(!next)return json({ok:false,error:"Approach a pipe to remove it."},400);}else{if(f.forms.length!==4)return json({ok:false,error:"Finish formwork first."},400);const result=(kind==="drain"?addPipe:addSupply)(l.layout,list,b.a,b.b,pose);if(result.error)return json({ok:false,error:result.error},400);next=result.pipes;point=next.at(-1).b;}
 const last={actor:b.id,point,kind};lists[kind]=next;const clean=readRisers({risers},l.layout,lists);for(const k of Object.keys(elevated))elevated[k]=pruneElevated(elevated[k],clean[k]);const patch={pipes:lists.drain,supply:{cold:lists.cold,hot:lists.hot,conduit:lists.conduit},risers:clean,elevated};
 const u=await db.prepare("UPDATE build_worlds_v2 SET state=json_set(json_patch(state,json(?)),'$.pipeRevision',?,'$.lastPipe',json(?)),updated=? WHERE id=? AND COALESCE(json_extract(state,'$.pipeRevision'),0)=? AND COALESCE(json_extract(state,'$.layoutRevision'),0)=? AND COALESCE(json_array_length(json_extract(state,'$.poured')),0)=0 AND "+guard).bind(JSON.stringify(patch),s.pipeRevision+1,JSON.stringify(last),now,auth.world,s.pipeRevision,l.revision,...guardArgs).run();
 if(!u.meta?.changes)return json({ok:false,error:"Pipe network changed. Try again."},409);return json({ok:true,...worldData(await worldRow(),room)});
 }
 if(b.action==="form"){
 const w=await worldRow(),l=readLayout(w),d=readDig(w,l.layout),g=readGravel(w,l.layout,d.dug),c=readCompaction(w,l.layout,g.gravel),f=readForms(w,l.layout),pose=sanitizePose(b.pose);
 if(!pose||b.pose?.formMode!==true||readMachine(w,room).driver===b.id||readPlate(w,room).driver===b.id||b.revision!==l.revision||b.formRevision!==f.formRevision)return json({ok:false,error:"Formwork state changed. Try again."},409);
 if(!b.install&&Array.isArray(w.poured)&&w.poured.length&&(!(w.cureAt>0)||now<w.cureAt))return json({ok:false,error:"Wait until concrete cures."},409);
 const next=changeForm(l.layout,f.forms,b.side,b.install,pose,new Set(c.compacted));if(!next)return json({ok:false,error:"Finish compaction and approach a valid foundation edge."},400);
 const last={actor:b.id,side:b.side,install:b.install};
 const u=await db.prepare("UPDATE build_worlds_v2 SET state=json_set(state,'$.forms',json(?),'$.formRevision',?,'$.lastForm',json(?)),updated=? WHERE id=? AND COALESCE(json_extract(state,'$.formRevision'),0)=? AND COALESCE(json_extract(state,'$.layoutRevision'),0)=? AND COALESCE(json_extract(state,'$.concreteRevision'),0)=? AND "+guard).bind(JSON.stringify(next),f.formRevision+1,JSON.stringify(last),now,auth.world,f.formRevision,l.revision,w.concreteRevision||0,...guardArgs).run();
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
 const w=await worldRow(),l=readLayout(w),requested=sanitizeLayout(b.layout),revision=b.revision;
 if((b.layout!==null&&!requested)||revision!==l.revision)return json({ok:false,error:"Invalid or changed foundation layout."},409);
 if(b.layout===null&&!host)return json({ok:false,error:"Only the host can clear the layout."},403);
 const existing=readDig(w,l.layout).dug.length>0;let rect=requested,patch={};
 if(existing){
 if(!requested)return json({ok:false,error:"Existing construction cannot be cleared. Draw an extension instead."},400);
 if(readHose(w,room).owner||readMachine(w,room).driver||readPlate(w,room).driver)return json({ok:false,error:"Park equipment and release the hose before extending."},400);
 rect=extendLayout(l.layout,requested);if(!rect||JSON.stringify(rect)===JSON.stringify(l.layout))return json({ok:false,error:"Choose an extension outside the existing foundation and inside the lot."},400);
 const before=worldData(w,room),afterUtility=readUtility(w,rect,before.pipes,before.supply).utility;
 if(before.utility.water!==afterUtility.water||before.utility.sewer!==afterUtility.sewer)return json({ok:false,error:"This extension would cover a connected municipal endpoint. Extend a different edge."},400);
 for(const [key,rev] of [["dug","digRevision"],["gravel","gravelRevision"],["compacted","compactRevision"],["barrier","prepRevision"],["rebar","prepRevision"],["poured","concreteRevision"],["screeded","concreteRevision"]]){patch[key]=remapFoundationTiles(l.layout,rect,before[key]);patch[rev]=(w[rev]||0)+1;}
 patch.forms=[];patch.formRevision=(w.formRevision||0)+1;patch.cureAt=0;patch.lastDig=null;patch.lastGravel=null;patch.lastPrep=null;patch.lastConcrete=null;patch.lastForm=null;
 }
 const revs=["layoutRevision","digRevision","gravelRevision","compactRevision","formRevision","prepRevision","concreteRevision","pipeRevision","wallRevision","utilityRevision"],where=revs.map(k=>"COALESCE(json_extract(state,'$."+k+"'),0)=?").join(" AND ");
 const updates={...patch,layout:rect,layoutRevision:revision+1},keys=Object.keys(updates),set=keys.map(k=>"'$."+k+"',json(?)").join(",");
 const change=await db.prepare("UPDATE build_worlds_v2 SET state=json_set(state,"+set+"),updated=? WHERE id=? AND "+where+" AND "+guard).bind(...keys.map(k=>JSON.stringify(updates[k])),now,auth.world,...revs.map(k=>w[k]||0),...guardArgs).run();
 if(!change.meta?.changes)return json({ok:false,error:"Layout changed or session closed."},409);
 return json({ok:true,...worldData(await worldRow(),room)});
 }
 if(b.action==="save"&&!host)return json({ok:false,error:"Only the host can save."},403);
 const p=sanitizePose(b.pose),save=savedPose(b.pose);
 if(p){p.driving=b.pose?.driving===true;p.panelMode=!p.driving&&!b.pose?.plateOperating&&b.pose?.panelMode===true;p.outletMode=!p.panelMode&&!p.driving&&!b.pose?.plateOperating&&b.pose?.outletMode===true;p.cableMode=!p.panelMode&&!p.outletMode&&!p.driving&&!b.pose?.plateOperating&&b.pose?.cableMode===true;p.cableType=CABLE_TYPES.includes(b.pose?.cableType)?b.pose.cableType:"12/2";p.electricMode=!p.panelMode&&!p.outletMode&&!p.cableMode&&!p.driving&&!b.pose?.plateOperating&&ELECTRIC_KINDS.includes(b.pose?.electricMode)?b.pose.electricMode:null;p.wallMode=!p.panelMode&&!p.outletMode&&!p.cableMode&&!p.electricMode&&!p.driving&&!b.pose?.plateOperating&&["wall","door","window","sheathing","wrap","insulation","drywall"].includes(b.pose?.wallMode)?b.pose.wallMode:null;p.concreteMode=!p.panelMode&&!p.outletMode&&!p.cableMode&&!p.electricMode&&!p.wallMode&&!p.driving&&!b.pose?.plateOperating&&["pour","screed"].includes(b.pose?.concreteMode)?b.pose.concreteMode:null;p.prepMode=!p.panelMode&&!p.outletMode&&!p.cableMode&&!p.electricMode&&!p.wallMode&&!p.concreteMode&&!p.driving&&!b.pose?.plateOperating&&["barrier","rebar"].includes(b.pose?.prepMode)?b.pose.prepMode:null;p.pipeMode=!p.panelMode&&!p.outletMode&&!p.cableMode&&!p.electricMode&&!p.wallMode&&!p.concreteMode&&!p.prepMode&&!p.driving&&!b.pose?.plateOperating&&b.pose?.pipeMode===true;p.pipeKind=cleanKind(b.pose?.pipeKind);p.formMode=!p.panelMode&&!p.outletMode&&!p.cableMode&&!p.electricMode&&!p.wallMode&&!p.concreteMode&&!p.prepMode&&!p.driving&&!p.pipeMode&&!b.pose?.plateOperating&&b.pose?.formMode===true;p.gravelMode=!p.panelMode&&!p.outletMode&&!p.cableMode&&!p.electricMode&&!p.wallMode&&!p.concreteMode&&!p.prepMode&&!p.driving&&!p.pipeMode&&!p.formMode&&b.pose?.gravelMode===true;p.machineVisual=p.driving?cleanMachineVisual(b.pose?.machineVisual):null;p.tape=sanitizeTape(b.pose?.tape);p.survey=sanitizeSurvey(b.pose?.survey);if(p.survey.mode!=="none"&&p.tape.equipped)p.tape=sanitizeTape(null);if(p.gravelMode||p.formMode||p.pipeMode||p.prepMode||p.concreteMode||p.wallMode||p.electricMode||p.cableMode||p.outletMode||p.panelMode){p.tape=sanitizeTape(null);p.survey.mode="none";}}
 if(b.action!=="leave"&&!p)return json({ok:false,error:"Invalid movement state."},400);
 const saveState=save?JSON.stringify(save):null;
 const saveSql="UPDATE build_worlds_v2 SET state=json_set(state,'$.hostPose',json(?)),updated=? WHERE id=? AND EXISTS(SELECT 1 FROM build_sessions_v2 WHERE code=? AND world=build_worlds_v2.id AND host=? AND closed=0 AND updated>?)";
 if(b.action==="leave"){
 const statements=[];
 statements.push(db.prepare("UPDATE build_worlds_v2 SET state=json_set(state,'$.hose.owner',NULL,'$.hose.rev',COALESCE(json_extract(state,'$.hose.rev'),0)+1) WHERE id=? AND json_extract(state,'$.hose.owner')=? AND json_extract(state,'$.hose.room')=? AND "+guard).bind(auth.world,b.id,room,...guardArgs));
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
 if(p.concreteMode!=="pour"&&Number.isSafeInteger(b.pose?.hoseRevision))statements.push(db.prepare("UPDATE build_worlds_v2 SET state=json_set(state,'$.hose.owner',NULL,'$.hose.rev',COALESCE(json_extract(state,'$.hose.rev'),0)+1) WHERE id=? AND json_extract(state,'$.hose.owner')=? AND json_extract(state,'$.hose.room')=? AND COALESCE(json_extract(state,'$.hose.rev'),0)=? AND "+guard).bind(auth.world,b.id,room,b.pose.hoseRevision,...guardArgs));
 if(p&&b.pose?.plateOperating){const q=plateFromPlayer(p);statements.push(db.prepare("UPDATE build_worlds_v2 SET state=json_set(state,'$.plate.x',?,'$.plate.z',?,'$.plate.yaw',?) WHERE id=? AND json_extract(state,'$.plate.driver')=? AND json_extract(state,'$.plate.room')=? AND "+guard).bind(q.x,q.z,q.yaw,auth.world,b.id,room,...guardArgs));}
 const v=cleanDrive(b.pose?.drive);if(p.driving&&v)statements.push(db.prepare("UPDATE build_worlds_v2 SET state=json_set(state,'$.machine.x',?,'$.machine.z',?,'$.machine.yaw',?) WHERE id=? AND json_extract(state,'$.machine.driver')=? AND json_extract(state,'$.machine.room')=? AND "+guard).bind(v.x,v.z,v.yaw,auth.world,b.id,room,...guardArgs));
 statements.push(db.prepare("SELECT p.id,p.name,p.pose FROM build_players_v2 p JOIN build_sessions_v2 s ON s.code=p.room WHERE p.room=? AND p.updated>? AND s.closed=0 AND s.updated>? ORDER BY p.id LIMIT 8").bind(room,cutoff,cutoff));
 statements.push(db.prepare("SELECT state FROM build_worlds_v2 WHERE id=?").bind(auth.world));
 const result=await db.batch(statements),rows=result.at(-2).results||[];let worldState=JSON.parse(result.at(-1).results?.[0]?.state||"{}");
 if(!rows.some(r=>r.id===b.id))return json({ok:false,error:"Session closed or expired."},410);
 if(host&&Array.isArray(worldState.heaters)&&worldState.heaters.length&&now-(worldState.waterTickAt||0)>=1000){const d=worldData(worldState,room),dt=Math.max(0,Math.min(2,(now-(worldState.waterTickAt||now))/1000)),ctx={...d,lines:d.wallPipes},hs=waterTick(ctx,now,dt);const revs=["layoutRevision","pipeRevision","wallRevision","wallPipeRevision","electricRevision","cableRevision","outletRevision","panelRevision","heaterRevision","fixtureRevision","utilityRevision","waterTickAt"],where=revs.map(k=>"COALESCE(json_extract(state, '$."+k+"'),0)=?").join(" AND ");const q=await db.prepare("UPDATE build_worlds_v2 SET state=json_set(state,'$.heaters',json(?),'$.waterTickAt',?) WHERE id=? AND "+where+" AND "+guard).bind(JSON.stringify(hs),now,auth.world,...revs.map(k=>worldState[k]||0),...guardArgs).run();if(q.meta?.changes)worldState={...worldState,heaters:hs,waterTickAt:now};else worldState=await worldRow();}return json({ok:true,saved:host&&b.action==="save"&&!!result[1]?.meta?.changes,...worldData(worldState,room),players:rows.map(r=>({id:r.id,name:r.name,pose:JSON.parse(r.pose)}))});
 }catch(e){console.error("Build & Sell session",e);return json({ok:false,error:"Multiplayer or save service temporarily unavailable."},503)}
}
