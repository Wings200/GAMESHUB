import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {join,dirname} from "node:path";
import {fileURLToPath} from "node:url";
const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=x=>readFileSync(join(root,x),"utf8");
const blueprint=JSON.parse(read("maps/ironvale-operations.blackout-map.json"));
const shared=new Function(read("src/multiplayer-protocol.js").replace(/^export /gm,"")+
  ";return {MAX_PLAYERS,TEAM_LIMIT,OPERATOR_SIDES,cleanName,chooseSpawn,validLoadout,acceptMovement,validShot}")();
class Socket{
 constructor(){this.packets=[];this.attachment=null;}
 send(s){this.packets.push(JSON.parse(s))}
 serializeAttachment(data){this.attachment=data}
 deserializeAttachment(){return this.attachment}
}
class WebSocketPair{
 constructor(){this[0]=new Socket();this[1]=new Socket()}
}
class FakeDurableObject{
 constructor(ctx,env){this.ctx=ctx;this.env=env}
}
class FakeResponse{
 constructor(body,init={}){this.body=body;this.status=init.status||200;this.webSocket=init.webSocket||null}
 async json(){return JSON.parse(this.body)}
}
const src=read("multiplayer-room.js").replace(/^import[\s\S]*?;/gm,"")
  .replace(/^export /gm,"");
const BlackoutRoom=new Function("DurableObject","ironvale","WebSocketPair","Response",
 ...Object.keys(shared),src+";return BlackoutRoom")(
  FakeDurableObject,blueprint,WebSocketPair,FakeResponse,...Object.values(shared));
function room(){
 const stored=new Map(),accepted=[];
 const ctx={storage:{get:async k=>stored.get(k),put:async(k,v)=>stored.set(k,v)},
   blockConcurrencyWhile:fn=>fn(),getWebSockets:()=>[],
   acceptWebSocket:ws=>accepted.push(ws)};
 return {instance:new BlackoutRoom(ctx,{}),accepted,stored};
}
const URL="https://example.com/api/blackout/rooms/ABC234/";
const makeReq=(action,args={})=>new Request(URL+action+"?"+new URLSearchParams(args),{
 headers:{Upgrade:"websocket"}});
async function setup(){
 const {instance,accepted,stored}=room();
 const create=await instance.fetch(new Request(URL+"create",{
  method:"POST",headers:{"Content-Type":"application/json"},
  body:JSON.stringify({code:"ABC234"})}));
 assert.equal(create.status,200);
 return {instance,accepted,stored};
}
async function connect(our,params){
 const response=await our.instance.fetch(makeReq("ws",params));
 assert.equal(response.status,101,JSON.stringify(response.body||""));
 return our.accepted.at(-1);
}
test("real Cloudflare room only creates after an explicit request; invite code and player identity persist",async()=>{
 const our=room(),instance=our.instance;
 const invalid=await instance.fetch(makeReq("ws",{name:"Alice"}));
 assert.equal(invalid.status,404);
 await instance.fetch(new Request(URL+"create",{method:"POST",
  body:JSON.stringify({code:"ABC234"})}));
 const ws=await connect(our,{name:"<Alice>",side:"attacker",operator:"twitch"});
 assert.equal(instance.players.size,1);
 assert.equal(instance.players.values().next().value.name,"Alice");
 assert.equal(instance.players.values().next().value.operator,"twitch");
 assert.equal(ws.attachment.side,"attacker");
 assert.ok(ws.packets.some(m=>m.type==="welcome"&&m.players.length===1));
 const duplicate=await instance.fetch(new Request(URL+"create",{method:"POST",
  body:JSON.stringify({code:"ABC234"})}));
 assert.equal(duplicate.status,409);
});
test("maximum 5 players per side and 10 total are enforced server-side",async()=>{
 const our=await setup();
 for(let i=0;i<5;i++)await connect(our,{name:"A"+i,side:"attacker",operator:"ash"});
 const fullAttack=await our.instance.fetch(makeReq("ws",{side:"attacker"}));
 assert.equal(fullAttack.status,409);
 for(let i=0;i<5;i++)await connect(our,{name:"D"+i,side:"defender",operator:"pulse"});
 assert.equal(our.instance.players.size,10);
 const eleventh=await our.instance.fetch(makeReq("ws",{side:"defender"}));
 assert.equal(eleventh.status,409);
 assert.equal(our.instance.players.size,10);
 assert.equal(our.instance.snapshot().filter(p=>p.side==="defender").length,5);
});
test("only actual host can start round and physical positions are sent to connected browsers",async()=>{
 const our=await setup();
 const host=await connect(our,{name:"host",side:"attacker",operator:"twitch"});
 const guest=await connect(our,{name:"guest",side:"defender",operator:"pulse"});
 our.instance.webSocketMessage(guest,JSON.stringify({type:"start"}));
 assert.equal(our.instance.status,"lobby","guest cannot start match");
 our.instance.webSocketMessage(host,JSON.stringify({type:"start"}));
 assert.equal(our.instance.status,"active");
 assert.equal(our.instance.round,1);
 assert.ok(guest.packets.some(p=>p.event==="round-start"&&p.players.length===2));
 assert.ok(host.packets.some(p=>p.event==="round-start"));
 const h=our.instance.players.get("1"),before=h.x;
 h.lastMove=Date.now()-90;
 our.instance.webSocketMessage(host,JSON.stringify({type:"move",
  x:before+.28,y:h.y,z:h.z,yaw:0,pitch:0}));
 assert.equal(h.x,before+.28);
 const snapshots=guest.packets.filter(p=>p.type==="state");
 assert.equal(snapshots.at(-1).players.find(p=>p.id==="1").x,h.x);
 our.instance.close(host);
 assert.equal(our.instance.players.size,1);
 assert.ok(guest.packets.at(-1).hostId==="2","server transfers host to next real player");
});
test("server owns health; shots must be real enemy line-of-sight hits and obey cooldown",async()=>{
 const our=await setup();
 const attacker=await connect(our,{name:"Shooter",side:"attacker",operator:"twitch"});
 const defender=await connect(our,{name:"Target",side:"defender",operator:"mute"});
 our.instance.webSocketMessage(attacker,JSON.stringify({type:"start"}));
 const a=our.instance.players.get("1"),b=our.instance.players.get("2");
 Object.assign(a,{x:-41,z:-20,y:0,yaw:0,lastShot:0,shots:30});
 Object.assign(b,{x:-41,z:-25,y:0,health:100,alive:true});
 our.instance.webSocketMessage(attacker,JSON.stringify({type:"shot",targetId:b.id}));
 assert.equal(b.health,75,"health changes only in Worker on validated shot");
 assert.equal(a.shots,29,"server ammo is not delegated to browsers");
 our.instance.webSocketMessage(attacker,JSON.stringify({type:"shot",targetId:b.id}));
 assert.equal(b.health,75,"server enforces firearm cadence");
 a.lastShot=Date.now()-350;a.yaw=Math.PI;
 our.instance.webSocketMessage(attacker,JSON.stringify({type:"shot",targetId:b.id}));
 assert.equal(b.health,75,"server rejects shooting behind back");
 assert.ok(defender.packets.some(p=>p.event==="hit"&&p.to==="2"&&p.health===75));
});
test("successful join does not imply nine AI impostors or client-written damage",async()=>{
 const our=await setup();
 const a=await connect(our,{name:"Real Human",side:"attacker",operator:"sledge"});
 assert.equal(our.instance.players.size,1);
 assert.equal(our.instance.snapshot().length,1);
 const p=our.instance.players.get("1");
 our.instance.webSocketMessage(a,JSON.stringify({
  type:"damage",targetId:"1",damage:10000,health:0}));
 assert.equal(p.health,100);
 const unknown=await our.instance.fetch(makeReq("ws",{name:"fake",operator:"pulse",side:"attacker"}));
 assert.equal(unknown.status,101);
 assert.equal(our.instance.players.get("2").operator,"sledge",
  "illegal operator side must fall back to valid operator");
});
