import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {join,dirname} from "node:path";
import {fileURLToPath} from "node:url";
const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>readFileSync(join(root,p),"utf8");
const file=read("src/multiplayer-protocol.js");
const p=new Function(file.replace(/^export /gm,"")+
 ";return {MAX_PLAYERS,TEAM_LIMIT,cleanName,validCode,chooseSpawn,validLoadout,acceptMovement,validShot,lineBlocked}")();
const map=JSON.parse(read("maps/ironvale-operations.blackout-map.json"));
test("IRONVALE contains an original large two-level room-based layout and not only flat walls",()=>{
 assert.equal(map.format,"blackout-editor-v1");
 assert.equal(map.elements.length,549);
 assert.equal(map.sitePairs.length,2);
 assert.equal(map.elements.filter(e=>e.type==="floor").length,68);
 assert.equal(map.elements.filter(e=>e.type==="door").length,92);
 assert.equal(map.elements.filter(e=>e.type==="window").length,38);
 assert.equal(map.elements.filter(e=>e.type==="stairs").length,2);
 assert.equal(map.elements.filter(e=>e.type==="rappelAnchor").length,16);
 assert.equal(map.elements.filter(e=>e.type==="attackerSpawn").length,7);
 const floors=map.elements.filter(e=>e.type==="floor");
 const x=Math.max(...floors.map(e=>e.position.x+e.size.x/2))-
   Math.min(...floors.map(e=>e.position.x-e.size.x/2));
 const z=Math.max(...floors.map(e=>e.position.z+e.size.z/2))-
   Math.min(...floors.map(e=>e.position.z-e.size.z/2));
 assert.deepEqual({x,z},{x:56,z:40});
 for(const pair of map.sitePairs)for(const site of [pair.A,pair.B]){
   assert.ok(floors.some(f=>f.position.y===site.y&&
      Math.abs(f.position.x-site.x)<f.size.x/2 &&
      Math.abs(f.position.z-site.z)<f.size.z/2),
     pair.name+" bomb must not be in solid wall/stair gap");
   assert.equal(site.plantZones.length,1);
   assert.deepEqual([site.plantZones[0].x,site.plantZones[0].z],
      [site.x,site.z]);
 }
 const explicit=new Set(map.elements.map(e=>e.name.split(" / ")[0]));
 assert.ok(explicit.size>80,"building should have named real rooms, not repeated wall station names");
});
test("live protocol enforces real human 5v5 roster, invite code and operator sides",()=>{
 assert.equal(p.MAX_PLAYERS,10);assert.equal(p.TEAM_LIMIT,5);
 assert.equal(p.validCode("ABC234"),true);
 assert.equal(p.validCode("IOO111"),false);
 assert.equal(p.validLoadout("attacker","twitch"),true);
 assert.equal(p.validLoadout("defender","twitch"),false);
 assert.equal(p.validLoadout("defender","pulse"),true);
 assert.equal(p.validLoadout("attacker","mickey"),false);
 assert.equal(p.cleanName("<script>alert(1)</script>"),"scriptalert1script");
 assert.deepEqual(p.chooseSpawn("attacker",0),[-42,0,-24]);
 assert.equal(p.chooseSpawn("defender",3)[1],4);
});
test("authoritative movement rejects teleports, out-of-map coordinates, wall phasing and floor jumping",()=>{
 const base={x:-45,y:0,z:-24,yaw:0,pitch:0};
 assert.ok(p.acceptMovement(base,{...base,x:-44.6},.10,map.elements));
 assert.equal(p.acceptMovement(base,{...base,x:5},.10,map.elements),null);
 assert.equal(p.acceptMovement(base,{...base,y:4},.10,map.elements),null);
 assert.equal(p.acceptMovement(base,{...base,x:300},.10,map.elements),null);
 const wall=map.elements.find(e=>e.type==="hardWall"&&e.position.y===0);
 const inside={...base,x:wall.position.x,y:0,z:wall.position.z};
 assert.equal(p.acceptMovement({...inside,x:inside.x+.15},inside,.1,map.elements),null);
 assert.equal(p.acceptMovement(base,{...base,x:Infinity},.1,map.elements),null);
});
test("authoritative hit cone matches real FPS yaw and blocks through solid walls",()=>{
 const a={id:"a",side:"attacker",x:0,y:0,z:0,yaw:0,alive:true};
 const b={id:"b",side:"defender",x:0,y:0,z:-5,alive:true};
 assert.equal(p.validShot(a,b,[]),true,"facing -Z at yaw zero");
 assert.equal(p.validShot({...a,yaw:Math.PI},b,[]),false);
 assert.equal(p.validShot({...a,yaw:-Math.PI/2}, {...b,x:5,z:0},[]),true,
   "negative yaw must face +X exactly like player controller");
 assert.equal(p.validShot({...a,side:"defender"},b,[]),false,"no friendly fire in beta");
 assert.equal(p.validShot(a,{...b,z:-50},[]),false,"no shots past max range");
 const wall=[{type:"hardWall",position:{x:0,y:0,z:-2.5},
   size:{x:8,y:3.75,z:.25},rotationY:0}];
 assert.equal(p.validShot(a,b,wall),false);
 assert.equal(p.lineBlocked({x:0,y:1.55,z:0},{x:0,y:1.2,z:-5},wall),true);
});
test("real Worker Durable Object is isolated from REDLINE and browser UI shows genuine roster",()=>{
 const worker=read("../../worker.js");
 const backend=read("multiplayer-room.js");
 const wrangler=JSON.parse(read("../../wrangler.json"));
 const frontend=read("src/network-client.js"),main=read("main.js"),
   html=read("index.html"),world=read("src/world.js");
 assert.match(worker,/import \{BlackoutRoom\} from/);
 assert.match(worker,/api\\\/blackout\\\/rooms/);
 assert.match(worker,/export \{BlackoutRoom\}/);
 assert.match(worker,/export class RedlineRoom/);
 assert.ok(wrangler.durable_objects.bindings.some(x=>
   x.name==="BLACKOUT_ROOMS"&&x.class_name==="BlackoutRoom"));
 assert.ok(wrangler.durable_objects.bindings.some(x=>x.name==="ROOMS"&&
   x.class_name==="RedlineRoom"));
 assert.match(backend,/new WebSocketPair\(\)/);
 assert.match(backend,/ctx\.acceptWebSocket/);
 assert.match(backend,/this\.players\.size>=MAX_PLAYERS/);
 assert.match(backend,/TEAM_LIMIT/);
 assert.match(backend,/validShot\(p,target,ironvale\.elements\)/);
 assert.match(frontend,/new WebSocket\(/);
 assert.match(frontend,/this\.avatars\.set/);
 assert.match(frontend,/this\.players=message\.players/);
 assert.match(frontend,/this\.scene\.add\(root\)/);
 assert.match(main,/const network=new BlackoutNetworkClient/);
 assert.match(main,/if\(!network\.active\)objectiveRound\.update/);
 assert.match(main,/network\.sendPosition\(player,now\)/);
 assert.match(main,/network\.shoot\(targetId\)/);
 for(const id of ["boCreateRoom","boJoinRoom","boLeaveRoom","boStartRoom",
   "boOnlineCode","boOnlineName","boOnlineStatus","boOnlineRoster"])
   assert.ok(html.includes('id="'+id+'"'),"missing "+id);
 assert.match(world,/id==="ironvale"/);
 assert.doesNotThrow(()=>new Function(frontend.replace(/^export /gm,"")));
});
test("operator selection no longer resets to first operator on map change",()=>{
 const main=read("main.js");
 assert.match(main,/const previousOperator=operator\?\.id/);
 assert.match(main,/const preserved=previousOperator&&OPERATORS\[previousOperator\]\?\.side===role/);
 assert.match(main,/chooseOperator\(preserved\)/);
 const roster=read("src/operators.js");
 const get=new Function(roster.replace(/^export /gm,"")+";return {OPERATORS,defaultOperator}")();
 for(const side of ["attacker","defender"]){
   for(const selected of Object.values(get.OPERATORS).filter(o=>o.side===side)){
     const previousOperator=selected.id;
     const preserved=previousOperator&&get.OPERATORS[previousOperator]?.side===side?
       previousOperator:get.defaultOperator(side).id;
     assert.equal(preserved,selected.id,selected.name+" choice must survive map switch");
   }
 }
});
