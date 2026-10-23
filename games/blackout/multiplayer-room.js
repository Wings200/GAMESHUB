// BLACKOUT real online room, isolated from REDLINE's racing Durable Objects.
// The invited participants are actual browser WebSockets; NEVER replace absent
// humans with bot avatars or claim matchmaking that is not implemented.
import {DurableObject} from "cloudflare:workers";
import ironvale from "./maps/ironvale-operations.blackout-map.json" with {type:"json"};
import {MAX_PLAYERS,TEAM_LIMIT,OPERATOR_SIDES,cleanName,chooseSpawn,
 validLoadout,acceptMovement,validShot,lineBlocked,normalizeBlackoutGameSettings,
 canStartBlackoutRound} from "./src/multiplayer-protocol.js";
import {newDrone,tickDrone} from "./reboot/drone-physics.js";
import {PREP_SECONDS,ACTION_SECONDS,createOnlineWorld,wallParts,droneObstacles,
 interactStart,interactStop,resolveInteractions,meleeWorld,placeCharge,
 detonateCharge,dropDefuser} from "./online-world.js";

const reply=(obj,status=200)=>new Response(JSON.stringify(obj),{
 status,headers:{"Content-Type":"application/json","Cache-Control":"no-store",
 "Access-Control-Allow-Origin":"*"}});
const point=([x,y,z])=>({x,y,z,yaw:0,pitch:0});
const freeze=(p)=>({id:p.id,name:p.name,side:p.side,operator:p.operator,
 x:p.x,y:p.y,z:p.z,yaw:p.yaw,pitch:p.pitch,health:p.health,alive:p.alive,
 aiming:Boolean(p.aiming),crouched:Boolean(p.crouched),sprinting:Boolean(p.sprinting),
 lean:p.lean||0,shots:p.shots,reloading:Boolean(p.reloadingUntil>Date.now()),
  drones:(p.drones||[]).map(d=>({x:d.x,y:d.y,z:d.z,yaw:d.yaw,pitch:d.pitch,
   deployed:d.deployed,charges:d.charges,grounded:d.grounded,jumpLeft:d.jumpLeft})),
  droneActive:Boolean(p.droneActive),droneIndex:p.droneIndex||0});
export class BlackoutRoom extends DurableObject {
 constructor(ctx,env){
  super(ctx,env);this.ctx=ctx;this.env=env;
  this.config=null;this.players=new Map();this.round=0;this.status="lobby";
  this.winner=null;this.roundStartedAt=0;this.roundHadOpponents=false;
  this.nextId=1;this.phase="lobby";this.phaseEndsAt=0;this.world=null;
  this.init=this.ctx.blockConcurrencyWhile(async()=>{
   this.config=await ctx.storage.get("room")||null;
   const previous=await ctx.storage.get("match")||null;
   if(previous){
     this.round=previous.round||0;
     this.status=previous.status||"lobby";
     this.winner=previous.winner||null;
     this.roundStartedAt=previous.startedAt||0;
     this.roundHadOpponents=Boolean(previous.hadOpponents);
      this.phase=previous.phase||"lobby";this.phaseEndsAt=previous.phaseEndsAt||0;
      this.world=previous.world||null;
   }
   // After a Durable Object restart, connections are restored from
   // durable hibernating WebSockets; each stores its own identity.
   for(const ws of ctx.getWebSockets()){
    const entry=ws.deserializeAttachment();
    if(!entry?.id)continue;
    const p={...entry,id:entry.id,ws,connected:true,lastMove:Date.now(),
      lastShot:0,health:entry.health??100,alive:entry.alive??true,
      shots:entry.shots??30,reloadingUntil:entry.reloadingUntil||0,
      aiming:Boolean(entry.aiming),crouched:Boolean(entry.crouched),
      sprinting:Boolean(entry.sprinting),lean:entry.lean||0,
      insertX:entry.insertX??entry.x,
      insertZ:entry.insertZ??entry.z,
      spawnedAt:entry.spawnedAt||0,firedAt:entry.firedAt||0,
      x:entry.x||0,y:entry.y||0,z:entry.z||0,yaw:entry.yaw||0,pitch:entry.pitch||0,
       drones:entry.drones||[],droneActive:Boolean(entry.droneActive),
       droneIndex:entry.droneIndex||0,lastDroneMove:Date.now()};
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
   const body=await request.json().catch(()=>({}));
   const settings=normalizeBlackoutGameSettings(body.settings);
   this.config={code:String(body.code||""),created:Date.now(),...settings};
   await this.ctx.storage.put("room",this.config);
   return reply({ok:true,code:this.config.code,map:"ironvale",
     maxPlayers:settings.maxPlayers,settings});
  }
  if(!this.config)return reply({ok:false,error:"Room not found"},404);
  if(url.pathname.endsWith("/status"))
   return reply({ok:true,code:this.config.code,map:"ironvale",settings:this.roomSettings(),
     mode:this.status,winner:this.winner,round:this.round,players:this.players.size,
     maxPlayers:this.roomSettings().maxPlayers,hostId:this.players.values().next().value?.id||null});
  if(!url.pathname.endsWith("/ws")||
    request.headers.get("Upgrade")?.toLowerCase()!=="websocket")
    return reply({ok:false,error:"Expected WebSocket upgrade"},426);
  if(this.players.size>=this.roomSettings().maxPlayers)
    return reply({ok:false,error:"Room is full ("+this.roomSettings().maxPlayers+" players)"},409);
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
    lastReload:0,shots:30,reloadingUntil:0,
    aiming:false,crouched:false,sprinting:false,lean:0,
     drones:[],droneActive:false,droneIndex:0,lastDroneMove:Date.now()};
  this.players.set(id,player);this.saveAttachment(player);
  this.send(player,{type:"welcome",id,code:this.config.code,host:this.players.size===1,
    map:"ironvale",round:this.round,mode:this.status,phase:this.phase,
     phaseEndsAt:this.phaseEndsAt,world:this.world,
     settings:this.roomSettings(),players:this.snapshot()});
  this.broadcast();
  return new Response(null,{status:101,webSocket:client});
 }
 roomSettings(){return normalizeBlackoutGameSettings(this.config||{})}
 saveAttachment(p){
  // The attachment contains a copy of player identity + position but
  // deliberately never stores raw request tokens or account secrets.
  try{p.ws.serializeAttachment({id:p.id,name:p.name,side:p.side,
   operator:p.operator,x:p.x,y:p.y,z:p.z,yaw:p.yaw,pitch:p.pitch,
   health:p.health,alive:p.alive,shots:p.shots,reloadingUntil:p.reloadingUntil||0,
   aiming:Boolean(p.aiming),crouched:Boolean(p.crouched),
   sprinting:Boolean(p.sprinting),lean:p.lean||0,
   insertX:p.insertX,insertZ:p.insertZ,spawnedAt:p.spawnedAt,firedAt:p.firedAt,
    drones:p.drones||[],droneActive:Boolean(p.droneActive),droneIndex:p.droneIndex||0});}catch{}
 }
 snapshot(){return [...this.players.values()].map(freeze)}
 send(p,event){try{p.ws.send(JSON.stringify(event))}catch{}}
 broadcast(extra){
  const state={type:"state",code:this.config?.code||"",mode:this.status,
   round:this.round,winner:this.winner,phase:this.phase,
    phaseEndsAt:this.phaseEndsAt,world:this.world,settings:this.roomSettings(),
   players:this.snapshot(),hostId:this.players.values().next().value?.id||null,...extra};
  for(const p of this.players.values())this.send(p,state);
 }
 saveMatch(){
  this.ctx.storage.put("match",{round:this.round,status:this.status,
    winner:this.winner,startedAt:this.roundStartedAt,hadOpponents:this.roundHadOpponents,
    phase:this.phase,phaseEndsAt:this.phaseEndsAt,world:this.world});
 }
 finishIfEliminated(){
  if(this.status!=="active"||this.phase!=="action"||this.world?.bomb?.phase==="planted")return;
  const settings=this.roomSettings();
  if(settings.kind==="custom"&&
     (settings.winCondition==="freeplay"||!this.roundHadOpponents))return;
  const attack=[...this.players.values()].filter(p=>p.side==="attacker"&&p.alive).length;
  const defend=[...this.players.values()].filter(p=>p.side==="defender"&&p.alive).length;
  if(attack>0&&defend>0)return;
  this.winner=attack>0?"attacker":defend>0?"defender":"draw";
  this.status="intermission";this.phase="intermission";this.phaseEndsAt=0;this.saveMatch();
  this.broadcast({event:"round-end",winner:this.winner,
    message:this.winner==="draw"?"ROUND DRAW":
      this.winner.toUpperCase()+" WIN BY ELIMINATION"});
 }
 // Server clock: no client gets to announce a phase or complete a plant.
 scheduleAlarm(){
  if(this.status!=="active")return;
  const times=[this.phaseEndsAt,this.world?.bomb?.expiresAt||0,
   ...Object.values(this.world?.interactions||{}).map(i=>i.endsAt)]
   .filter(t=>t>Date.now());
  if(times.length)this.ctx.storage.setAlarm(Math.min(...times));
 }
 endRound(winner,message){
  this.status="intermission";this.phase="intermission";this.phaseEndsAt=0;
  this.winner=winner;this.saveMatch();
  this.broadcast({event:"round-end",winner,message});
 }
 advanceWorld(now=Date.now()){
  if(this.status!=="active"||!this.world)return;
  if(this.phase==="prep"&&now>=this.phaseEndsAt){
   this.phase="action";this.phaseEndsAt=now+ACTION_SECONDS*1000;
   for(const p of this.players.values()){
    p.droneActive=false;p.lastMove=now;p.spawnedAt=now;
    this.saveAttachment(p);
   }
   this.saveMatch();this.broadcast({event:"action-phase"});
  }
  const outcomes=resolveInteractions(ironvale,this.world,[...this.players.values()],now);
  for(const outcome of outcomes){
   if(outcome.winner){this.endRound(outcome.winner,"DEFUSER DISABLED · DEFENDERS WIN");return;}
   this.broadcast({event:outcome.kind,from:outcome.from});
  }
  if(this.world.bomb.phase==="planted"&&now>=this.world.bomb.expiresAt){
   this.endRound("attacker","DEFUSER DETONATED · ATTACKERS WIN");return;
  }
  if(this.phase==="action"&&this.world.bomb.phase!=="planted"&&now>=this.phaseEndsAt){
   if(this.roomSettings().winCondition!=="freeplay"){
    this.endRound("defender","TIME EXPIRED · DEFENDERS WIN");return;
   }
   this.phaseEndsAt=now+ACTION_SECONDS*1000;
  }
  if(outcomes.length)this.saveMatch();
  this.scheduleAlarm();
 }
 async alarm(){
  await this.init;
  this.advanceWorld(Date.now());
 }
 droneShot(shooter,target){
  if(shooter.side!=="defender"||!target||target.side!=="attacker")return false;
  let chosen=null;
  for(const d of target.drones||[]){
   if(!d.deployed)continue;
   const dx=d.x-shooter.x,dz=d.z-shooter.z;
   const range=Math.hypot(dx,dz);
   if(range<.2||range>35)continue;
   const a=-Math.atan2(dx,-dz);
   const yawDelta=Math.abs(Math.atan2(Math.sin(a-shooter.yaw),Math.cos(a-shooter.yaw)));
   const pitch=-Math.atan2(d.y+.14-(shooter.y+(shooter.crouched?1.05:1.58)),range);
   const pitchDelta=Math.abs(pitch-shooter.pitch);
   if(yawDelta>.135||pitchDelta>.155)continue;
   const from={x:shooter.x,y:shooter.y+(shooter.crouched?1.05:1.58),z:shooter.z};
   const to={x:d.x,y:d.y+.14,z:d.z};
   if(lineBlocked(from,to,wallParts(ironvale,this.world)))continue;
   if(!chosen||range<chosen.range)chosen={drone:d,range};
  }
  if(!chosen)return false;
  chosen.drone.deployed=false;
  if(target.drones[target.droneIndex||0]===chosen.drone)target.droneActive=false;
  this.saveAttachment(target);
  this.broadcast({event:"drone-destroyed",from:shooter.id,to:target.id});return true;
 }
 webSocketMessage(ws,message){
  const p=[...this.players.values()].find(p=>p.ws===ws);
  if(!p)return;
  let m;try{m=JSON.parse(String(message))}catch{return}
  if(!m||typeof m!=="object")return;
  const now=Date.now();
  if(this.status==="active")this.advanceWorld(now);
  if(p.reloadingUntil&&now>=p.reloadingUntil){
   p.reloadingUntil=0;p.shots=30;this.saveAttachment(p);
   this.send(p,{type:"reload-ok",shots:30});this.broadcast({event:"reload-complete",from:p.id});
  }
  if(m.type==="ping"){this.send(p,{type:"pong",time:now});return}
  if(m.type==="start"){
   const host=this.players.values().next().value;
   if(host?.id!==p.id){this.send(p,{type:"notice",message:"Only the room host starts rounds"});return}
   if(this.status==="active"){
     this.send(p,{type:"notice",message:"Finish the current live round first"});return;
   }
   const members=[...this.players.values()];
   if(!canStartBlackoutRound(this.roomSettings(),members)){
     this.send(p,{type:"notice",message:"THIS ROOM REQUIRES ONE ATTACKER AND ONE DEFENDER"});return;
   }
   this.roundHadOpponents=members.some(x=>x.side==="attacker")&&
     members.some(x=>x.side==="defender");
   this.status="active";this.phase="prep";this.phaseEndsAt=now+PREP_SECONDS*1000;
   this.round++;this.roundStartedAt=now;this.winner=null;
   const count={attacker:0,defender:0};
   for(const user of this.players.values()){
    Object.assign(user,point(chooseSpawn(user.side,count[user.side]++)));
    user.insertX=user.x;user.insertZ=user.z;
    user.health=100;user.alive=true;user.lastMove=now;user.spawnedAt=now;user.firedAt=0;user.shots=30;
    user.lastShot=0;user.reloadingUntil=0;user.aiming=false;user.crouched=false;
    user.sprinting=false;user.lean=0;
    user.drones=user.side==="attacker"?[
     newDrone(user.x+2,user.z,0),newDrone(user.x+2.35,user.z+.4,0)]:[];
    user.drones.forEach((d,i)=>{d.deployed=i===0});
    user.droneIndex=0;user.droneActive=user.side==="attacker";
    user.lastDroneMove=now;this.saveAttachment(user);
   }
   this.world=createOnlineWorld(ironvale,[...this.players.values()],now);
   this.saveMatch();this.scheduleAlarm();
   this.broadcast({event:"round-start"});return;
  }
  if(m.type==="settings") {
   const host=this.players.values().next().value;
   if(host?.id!==p.id){this.send(p,{type:"notice",message:"Only the host can edit custom settings"});return}
   if(this.status==="active"){this.send(p,{type:"notice",message:"End the round before changing settings"});return}
   const next=normalizeBlackoutGameSettings(m.settings);
   if(next.maxPlayers<this.players.size){
     this.send(p,{type:"notice",message:"Player cap cannot be below the number connected"});return;
   }
   this.config={...this.config,...next};
   this.ctx.storage.put("room",this.config);
   this.broadcast({event:"settings-updated"});return;
  }
  if(m.type==="side") {
   if(this.status==="active"){this.send(p,{type:"notice",message:"Change teams between rounds"});return}
   const side=m.side;
   if(!["attacker","defender"].includes(side)||side===p.side)return;
   if([...this.players.values()].filter(x=>x.side===side).length>=TEAM_LIMIT){
     this.send(p,{type:"notice",message:"Selected team is full"});return;
   }
   p.side=side;p.operator=side==="defender"?"mute":"sledge";
   Object.assign(p,point(chooseSpawn(side,[...this.players.values()].filter(x=>x.side===side).length-1)));
   this.saveAttachment(p);this.broadcast({event:"team-changed"});return;
  }
  if(m.type==="end") {
   const host=this.players.values().next().value;
   if(host?.id!==p.id||this.roomSettings().kind!=="custom"||this.status!=="active"){
     this.send(p,{type:"notice",message:"Only the custom game host can end the live round"});return;
   }
   this.status="intermission";this.phase="intermission";this.phaseEndsAt=0;
   this.winner=null;this.saveMatch();
   this.broadcast({event:"round-end",message:"CUSTOM ROUND ENDED BY HOST"});return;
  }
  if(m.type==="operator"&&this.status!=="active"){
   if(validLoadout(p.side,m.operator)){p.operator=m.operator;this.saveAttachment(p);this.broadcast()}
   return;
  }
  if(this.status!=="active"||!p.alive)return;
  if(m.type==="drone-control"){
   if(p.side!=="attacker")return;
   if(m.mode==="enter"){
    const index=Math.min(1,Math.max(0,m.index|0));
    if(!p.drones[index]?.deployed)return;
    p.droneActive=true;p.droneIndex=index;
   }else if(this.phase!=="prep")p.droneActive=false;
   this.saveAttachment(p);this.broadcast({event:"drone-control",from:p.id});return;
  }
  if(m.type==="drone-step"){
   if(p.side!=="attacker"||!p.droneActive||now-(p.lastDroneMove||0)<35)return;
   const index=p.droneIndex||0,drone=p.drones[index];
   if(!drone?.deployed)return;
   const dt=Math.max(.016,Math.min(.18,(now-(p.lastDroneMove||now-70))/1000));
   p.lastDroneMove=now;
   if(Number.isFinite(m.yaw))drone.yaw=((m.yaw%(2*Math.PI))+2*Math.PI)%(2*Math.PI);
   if(Number.isFinite(m.pitch))drone.pitch=Math.max(-.8,Math.min(.8,m.pitch));
   const input={forward:Math.max(-1,Math.min(1,Number(m.forward)||0)),
    right:Math.max(-1,Math.min(1,Number(m.right)||0)),
    jumpPressed:m.jump===true,boostPressed:m.boost===true};
   const obstacles=droneObstacles(ironvale,this.world);
   let result=drone;
   for(let remaining=dt;remaining>.00001;){
    const step=Math.min(.05,remaining);
    result=tickDrone(result,input,step,obstacles,90);
    input.jumpPressed=false;input.boostPressed=false;remaining-=step;
   }
   p.drones[index]=result;this.saveAttachment(p);
   this.broadcast({event:"drone-move",from:p.id});return;
  }
  if(m.type==="world"){
   if(this.phase==="prep"&&p.side==="attacker")return;
   const kind=String(m.action||"");
   let event=null;
   if(kind==="interact"){event=interactStart(ironvale,this.world,p,
     [...this.players.values()],now);}
   if(kind==="stop"){interactStop(this.world,p.id);event="INTERACTION CANCELLED";}
   if(kind==="melee"){
     if(now-(p.lastMelee||0)<450)return;
     p.lastMelee=now;
     const result=meleeWorld(ironvale,this.world,p);
     event=result?.kind||"NO BARRICADE IN RANGE";}
   if(kind==="charge"){const result=placeCharge(ironvale,this.world,p);
     event=result?"BREACH CHARGE PLACED":"NO COMPATIBLE WALL OR CHARGES LEFT";}
   if(kind==="detonate"){const result=detonateCharge(ironvale,this.world,p);
     event=result?"BREACH DETONATED":"NO CHARGE READY";}
   if(kind==="drop"){event=dropDefuser(this.world,p)?"DEFUSER DROPPED":"NO DEFUSER CARRIED";}
   if(event){this.saveMatch();this.scheduleAlarm();
     this.broadcast({event:"world-"+kind,from:p.id});
     this.send(p,{type:"notice",message:event});}
   return;
  }
  if(m.type==="move"){
   if(this.phase!=="action"&&p.side==="attacker")return;
   if(p.droneActive)return;
   if(now-p.lastMove<48)return;
   const dt=Math.max(.016,Math.min(.5,(now-p.lastMove)/1000));
   const next=acceptMovement(p,m,dt,wallParts(ironvale,this.world));
   if(next){
    Object.assign(p,next);
    p.aiming=m.aiming===true;p.crouched=m.crouched===true;
    p.sprinting=m.sprinting===true&&!p.aiming&&!p.crouched;
    p.lean=[-1,0,1].includes(m.lean)?m.lean:0;
    p.lastMove=now;this.saveAttachment(p);
    if(!this.lastBroadcast||now-this.lastBroadcast>65){
      this.lastBroadcast=now;this.broadcast();
    }
   }else this.send(p,{type:"correction",x:p.x,y:p.y,z:p.z});
  }else if(m.type==="reload"){
   if(this.phase!=="action"||p.droneActive)return;
   if(p.reloadingUntil>now||p.shots>=30||now-(p.lastReload||0)<1750){
    this.send(p,{type:"reload-denied",shots:p.shots});return;
   }
   p.lastReload=now;p.reloadingUntil=now+1700;this.saveAttachment(p);
   this.send(p,{type:"reload-start",durationMs:1700});
   this.broadcast({event:"reload-start",from:p.id});return;
  }else if(m.type==="shot"){
   if((this.phase!=="action"&&!(this.phase==="prep"&&p.side==="defender"))||p.droneActive)return;
   if(p.reloadingUntil>now||now-p.lastShot<135||p.shots<1)return;
   p.lastShot=now;p.firedAt=now;p.shots--;
   this.saveAttachment(p);this.send(p,{type:"shot-ok",shots:p.shots});
   const target=this.players.get(String(m.targetId||""));
   if(m.targetDrone)this.droneShot(p,this.players.get(String(m.targetDrone)));
   if(this.phase==="action"&&target&&target!==p&&validShot(p,target,wallParts(ironvale,this.world))){
    // Victims are not damage-authoritative. Damage and KOs originate here.
    const protectedEntry=target.side==="attacker"&&
      now-(target.spawnedAt||0)<2300&&!(target.firedAt>=target.spawnedAt)&&
      Math.hypot(target.x-target.insertX,target.z-target.insertZ)<3;
    if(!protectedEntry){
      target.health=Math.max(0,target.health-25);
      target.alive=target.health>0;
      if(!target.alive){dropDefuser(this.world,target);interactStop(this.world,target.id);}
      this.saveAttachment(target);
      this.broadcast({event:"hit",from:p.id,to:target.id,health:target.health});
      if(!target.alive)this.finishIfEliminated();
    }
   }
   this.broadcast({event:"shot",from:p.id});
  }
 }
 close(ws){
  const player=[...this.players.values()].find(p=>p.ws===ws);
  if(!player)return;
  if(this.world){dropDefuser(this.world,player);interactStop(this.world,player.id);}
  this.players.delete(player.id);
  if(this.world)this.saveMatch();
  this.broadcast({event:"leave",id:player.id});
  if(!this.players.size){this.status="lobby";this.phase="lobby";this.world=null;
   this.winner=null;this.saveMatch()}
  else this.finishIfEliminated();
 }
 webSocketClose(ws){this.close(ws)}
 webSocketError(ws){this.close(ws)}
}
