// BLACKOUT real online room, isolated from REDLINE's racing Durable Objects.
// The invited participants are actual browser WebSockets; NEVER replace absent
// humans with bot avatars or claim matchmaking that is not implemented.
import {DurableObject} from "cloudflare:workers";
import ironvale from "./maps/ironvale-operations.blackout-map.json" with {type:"json"};
import {MAX_PLAYERS,TEAM_LIMIT,OPERATOR_SIDES,cleanName,chooseSpawn,
 validLoadout,acceptMovement,validShot} from "./src/multiplayer-protocol.js";

const reply=(obj,status=200)=>new Response(JSON.stringify(obj),{
 status,headers:{"Content-Type":"application/json","Cache-Control":"no-store",
 "Access-Control-Allow-Origin":"*"}});
const point=([x,y,z])=>({x,y,z,yaw:0,pitch:0});
const freeze=(p)=>({id:p.id,name:p.name,side:p.side,operator:p.operator,
 x:p.x,y:p.y,z:p.z,yaw:p.yaw,pitch:p.pitch,health:p.health,alive:p.alive});
export class BlackoutRoom extends DurableObject {
 constructor(ctx,env){
  super(ctx,env);this.ctx=ctx;this.env=env;
  this.config=null;this.players=new Map();this.round=0;this.status="lobby";
  this.nextId=1;
  this.init=this.ctx.blockConcurrencyWhile(async()=>{
   this.config=await ctx.storage.get("room")||null;
   // After a Durable Object restart, connections are restored from
   // durable hibernating WebSockets; each stores its own identity.
   for(const ws of ctx.getWebSockets()){
    const entry=ws.deserializeAttachment();
    if(!entry?.id)continue;
    const p={...entry,id:entry.id,ws,connected:true,lastMove:Date.now(),
      lastShot:0,health:entry.health??100,alive:entry.alive??true,
      x:entry.x||0,y:entry.y||0,z:entry.z||0,yaw:entry.yaw||0,pitch:entry.pitch||0};
    this.players.set(p.id,p);
    this.nextId=Math.max(this.nextId,Number(p.id)+1);
   }
  });
 }
 async fetch(request){
  await this.init;
  const url=new URL(request.url);
  if(url.pathname.endsWith("/create")&&request.method==="POST"){
   if(this.config)return reply({ok:false,error:"Room code already occupied"},409);
   const config=await request.json().catch(()=>({}));
   this.config={code:String(config.code||""),created:Date.now(),map:"ironvale"};
   await this.ctx.storage.put("room",this.config);
   return reply({ok:true,code:this.config.code,map:"ironvale",maxPlayers:MAX_PLAYERS});
  }
  if(!this.config)return reply({ok:false,error:"Room not found"},404);
  if(url.pathname.endsWith("/status"))
   return reply({ok:true,code:this.config.code,map:"ironvale",
     mode:this.status,players:this.players.size,maxPlayers:MAX_PLAYERS});
  if(!url.pathname.endsWith("/ws")||
    request.headers.get("Upgrade")?.toLowerCase()!=="websocket")
    return reply({ok:false,error:"Expected WebSocket upgrade"},426);
  if(this.players.size>=MAX_PLAYERS)return reply({ok:false,error:"Room is full (10/10)"},409);
  const side=url.searchParams.get("side")==="defender"?"defender":"attacker";
  if([...this.players.values()].filter(p=>p.side===side).length>=TEAM_LIMIT)
    return reply({ok:false,error:side.toUpperCase()+" team is full (5/5)"},409);
  if(this.status==="active")return reply({ok:false,error:"Round in progress; join before host starts"},409);
  const id=String(this.nextId++),name=cleanName(url.searchParams.get("name"));
  const pick=url.searchParams.get("operator");
  const operator=validLoadout(side,pick)?pick:
    (side==="defender"?"mute":"sledge");
  const spawn=point(chooseSpawn(side,[...this.players.values()].filter(p=>p.side===side).length));
  const pair=new WebSocketPair();
  const [client,server]=Object.values(pair);
  this.ctx.acceptWebSocket(server);
  const player={...spawn,id,name,side,operator,ws:server,
    health:100,alive:true,connected:true,lastMove:Date.now(),lastShot:0,
    lastReload:0,shots:30};
  this.players.set(id,player);this.saveAttachment(player);
  this.send(player,{type:"welcome",id,code:this.config.code,host:this.players.size===1,
    map:"ironvale",round:this.round,mode:this.status,players:this.snapshot()});
  this.broadcast();
  return new Response(null,{status:101,webSocket:client});
 }
 saveAttachment(p){
  // The attachment contains a copy of player identity + position but
  // deliberately never stores raw request tokens or account secrets.
  try{p.ws.serializeAttachment({id:p.id,name:p.name,side:p.side,
   operator:p.operator,x:p.x,y:p.y,z:p.z,yaw:p.yaw,pitch:p.pitch,
   health:p.health,alive:p.alive});}catch{}
 }
 snapshot(){return [...this.players.values()].map(freeze)}
 send(p,event){try{p.ws.send(JSON.stringify(event))}catch{}}
 broadcast(extra){
  const state={type:"state",code:this.config?.code||"",mode:this.status,
   round:this.round,players:this.snapshot(),...extra};
  for(const p of this.players.values())this.send(p,state);
 }
 webSocketMessage(ws,message){
  const p=[...this.players.values()].find(p=>p.ws===ws);
  if(!p)return;
  let m;try{m=JSON.parse(String(message))}catch{return}
  if(!m||typeof m!=="object")return;
  const now=Date.now();
  if(m.type==="ping"){this.send(p,{type:"pong",time:now});return}
  if(m.type==="start"){
   const host=this.players.values().next().value;
   if(host?.id!==p.id){this.send(p,{type:"notice",message:"Only the room host starts rounds"});return}
   this.status="active";this.round++;
   const count={attacker:0,defender:0};
   for(const user of this.players.values()){
    Object.assign(user,point(chooseSpawn(user.side,count[user.side]++)));
    user.health=100;user.alive=true;user.lastMove=now;user.shots=30;
    user.lastShot=0;this.saveAttachment(user);
   }
   this.broadcast({event:"round-start"});return;
  }
  if(m.type==="operator"&&this.status==="lobby"){
   if(validLoadout(p.side,m.operator)){p.operator=m.operator;this.saveAttachment(p);this.broadcast()}
   return;
  }
  if(this.status!=="active"||!p.alive)return;
  if(m.type==="move"){
   const dt=Math.max(.016,Math.min(.5,(now-p.lastMove)/1000));
   const next=acceptMovement(p,m,dt,ironvale.elements);
   if(next){
    Object.assign(p,next);p.lastMove=now;this.saveAttachment(p);
    if(!this.lastBroadcast||now-this.lastBroadcast>65){
      this.lastBroadcast=now;this.broadcast();
    }
   }else this.send(p,{type:"correction",x:p.x,y:p.y,z:p.z});
  }else if(m.type==="reload"){
   if(now-(p.lastReload||0)<1750)return;
   p.lastReload=now;p.shots=30;this.send(p,{type:"reload-ok"});
  }else if(m.type==="shot"){
   if(now-p.lastShot<135||p.shots<1)return;
   p.lastShot=now;p.shots--;
   const target=this.players.get(String(m.targetId||""));
   if(target&&target!==p&&validShot(p,target,ironvale.elements)){
    // Victims are not damage-authoritative. Damage and KOs originate here.
    const protectedEntry=now-p.lastMove<2300;
    if(!protectedEntry){
      target.health=Math.max(0,target.health-25);
      target.alive=target.health>0;this.saveAttachment(target);
      this.broadcast({event:"hit",from:p.id,to:target.id,health:target.health});
    }
   }
   this.broadcast({event:"shot",from:p.id});
  }
 }
 close(ws){
  const player=[...this.players.values()].find(p=>p.ws===ws);
  if(!player)return;
  this.players.delete(player.id);
  this.broadcast({event:"leave",id:player.id});
  if(!this.players.size)this.status="lobby";
 }
 webSocketClose(ws){this.close(ws)}
 webSocketError(ws){this.close(ws)}
}
