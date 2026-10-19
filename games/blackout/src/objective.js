import {createDefuserModel} from "./defuser-model.js?v=blackout-v301-video-fixes";
import {createBombStations} from "./bomb-sites.js?v=blackout-v301-video-fixes";
import {makeTacticalBot,advanceTacticalBot} from "./bot-ai.js?v=blackout-v301-video-fixes";
import {updateSquadCombat,updateDefenderPrep} from "./squad-ai.js?v=blackout-v301-video-fixes";
import {operatorsForSide} from "./operators.js?v=blackout-v301-video-fixes";
// BLACKOUT V0.7 — two-site, single-player tactical attack/defend rounds.
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
export class ObjectiveDrill{
  constructor(T,world,scene){
    this.THREE=T;this.world=world;this.scene=scene;
    this.sites=world.facility.sites;
    this.siteId="A";this.site=this.sites.A;
    this.root=new T.Group();scene.add(this.root);
    this.ring=new T.Mesh(new T.RingGeometry(2.86,3.02,64),
      new T.MeshBasicMaterial({color:0x64f4de,side:T.DoubleSide,transparent:true,opacity:.91}));
    this.ring.rotation.x=-Math.PI/2;this.ring.position.y=.047;this.root.add(this.ring);
    this.center=new T.Mesh(new T.CylinderGeometry(.5,.5,.026,20),
      new T.MeshStandardMaterial({color:0x294857,metalness:.72,roughness:.37}));
    this.center.position.y=.015;this.root.add(this.center);
    const canvas=document.createElement("canvas");canvas.width=768;canvas.height=136;
    this.signContext=canvas.getContext("2d");
    this.signTexture=new T.CanvasTexture(canvas);this.signTexture.colorSpace=T.SRGBColorSpace;
    const sign=new T.Mesh(new T.PlaneGeometry(4.7,.84),
      new T.MeshBasicMaterial({map:this.signTexture,transparent:true,side:T.DoubleSide,depthWrite:false}));
    sign.position.y=3.04;sign.visible=false;this.root.add(sign);
    const alternate=new T.Mesh(new T.RingGeometry(2.87,3.01,64),
      new T.MeshBasicMaterial({color:0x50646a,transparent:true,opacity:.5,side:T.DoubleSide}));
    alternate.rotation.x=-Math.PI/2;alternate.position.y=.049;scene.add(alternate);
    this.alternate=alternate;
    this.defuser=createDefuserModel(T,scene);
    this.bombStations=createBombStations(T,scene,world,this.sites);
    this.operator=null;this.prepUntil=0;this.actionStartedAt=0;this.holdNeeded=5000;
    // Objective decals are not restricted planting circles.
    this.ring.visible=false;this.center.visible=false;alternate.visible=false;
    this.ray=new T.Raycaster();this.bots=[];this.allies=[];this.botSerial=0;
    this.score={attacker:0,defender:0};this.roundNumber=1;
    this.chooseSite("A");this.reset("attacker");
  }
  chooseSite(id){
    this.siteId=id==="B"?"B":"A";this.site=this.sites[this.siteId];
    this.root.position.set(this.site.x,0,this.site.z);
    const other=this.sites[this.siteId==="A"?"B":"A"];
    this.alternate.position.set(other.x,.052,other.z);
    const ctx=this.signContext;
    ctx.clearRect(0,0,768,136);ctx.fillStyle="#0a1b2a";ctx.fillRect(0,0,768,136);
    ctx.fillStyle="#68f2df";ctx.fillRect(0,0,768,9);
    ctx.font="900 63px Arial";ctx.textAlign="center";ctx.fillStyle="#f2faff";
    ctx.fillText("SITE "+this.siteId+" / "+this.site.name,384,90,740);
    this.signTexture.needsUpdate=true;
  }
  clearBots(){
    for(const bot of [...this.bots,...this.allies]){
      for(const hitbox of bot.hitboxes){
        const at=this.world.shootables.indexOf(hitbox);
        if(at>=0)this.world.shootables.splice(at,1);
      }
      this.scene.remove(bot.group);
      bot.group.traverse(node=>{
        if(node.isMesh){node.geometry?.dispose?.();node.material?.dispose?.();}
      });
    }
    this.bots=[];this.allies=[];
  }
  reset(role="attacker"){
    if(this.phase==="won"||this.phase==="lost")this.roundNumber++;
    this.clearBots();
    this.role=role;this.phase="ready";this.result="";
    this.deadline=0;this.bombEnd=0;this.nextWave=0;this.wave=0;
    this.hold=0;this.lastInteractionTick=-1;this.nextBeep=0;this.plantPosition=null;this.holdSiteId=null;
    this.pausedAt=0;this.lastHitNotice=0;this.lastFootstep=0;
    this.playerAlive=true;this.runoutPlayer=false;this.runoutUntil=0;
    this.runoutTarget=null;this.runoutAlly=null;this.lastRunoutNotice=0;this.lastRunoutEnemy=0;
    this.defuser.hide();this.prepUntil=0;this.prepFortified=false;
    this.defuseOperatorId=null;
    this.teamIntel={ally:null,enemy:null};
    this.updateHoldRequirement();
    this.ring.material.color.setHex(role==="attacker"?0x62eee2:0xffb76d);
  }
  setOperator(operator){
    this.operator=operator;this.updateHoldRequirement();
  }
  updateHoldRequirement(){
    this.holdNeeded=this.role==="attacker"?5000:5500;
  }
  findSafeSpawn(x,z){
    const clear=(px,pz)=>!this.world.colliders.some(c=>
      c.maxY>.5&&c.minY<1.8&&px>c.minX-.41&&px<c.maxX+.41&&
      pz>c.minZ-.41&&pz<c.maxZ+.41);
    if(clear(x,z))return {x,z};
    // Never spawn an AI body through a desk, bomb cabinet or wall.
    // Test compact rings around the intended team setup position.
    for(const radius of [.6,1.1,1.7,2.3]){
      for(let k=0;k<16;k++){
        const a=k*Math.PI/8,px=x+Math.cos(a)*radius,
          pz=z+Math.sin(a)*radius;
        if(clear(px,pz))return {x:px,z:pz};
      }
    }
    return {x,z};
  }
  spawnBot(x,z,stationary=false,team="enemy",siteId="A"){
    const safe=this.findSafeSpawn(x,z);
    x=safe.x;z=safe.z;
    const bot=makeTacticalBot(this.THREE,this.scene,this.world,
      ++this.botSerial,x,z,stationary,team);
    const botSide=team==="ally"?this.role:
      this.role==="attacker"?"defender":"attacker";
    const roster=operatorsForSide(botSide);
    const teammates=team==="ally"?this.allies:this.bots;
    const taken=new Set(teammates.map(b=>b.operatorSpec?.id));
    if(team==="ally"&&this.operator?.side===botSide)taken.add(this.operator.id);
    bot.operatorSpec=roster.find(o=>!taken.has(o.id))||roster[0];
    bot.assignedSite=this.sites[siteId];
    bot.anchor={x,z};bot.carrier=false;bot.spottedUntil=0;
    teammates.push(bot);
    return bot;
  }
  isInside(p){
    const b=this.world.facility.bounds;
    return p.x>b.minX+.08&&p.x<b.maxX-.08&&
      p.z>b.minZ+.08&&p.z<b.maxZ-.08;
  }
  updateRunouts(now,player,notify){
    // No outside/inside concept exists in this stripped mechanics sandbox.
    // Runout detection belongs to future enclosed competitive maps, not
    // open floor testing; otherwise every training drill reports false pings.
    if(this.world.facility.mode==="mechanics-sandbox"){
      this.runoutPlayer=false;this.runoutTarget=null;this.runoutAlly=null;
      return;
    }
    const action=this.phase==="attack"||this.phase==="guard"||this.phase==="planted";
    this.runoutPlayer=action&&this.role==="defender"&&!this.isInside(player)&&player.health>0;
    if(this.runoutPlayer){
      this.runoutUntil=now+2300;
      if(now-this.lastRunoutNotice>3000){
        this.lastRunoutNotice=now;
        notify("DEFENDER OUTSIDE · YOUR POSITION IS REVEALED","alarm");
      }
      // Enemy attacker bots receive a continuously refreshed last-known
      // runout location. This has real gameplay consequences, not just UI.
      for(const bot of this.bots)if(bot.alive){
        bot.hearing={x:player.x,z:player.z};bot.hearingUntil=now+2300;
        bot.runoutTarget={x:player.x,z:player.z};
      }
    }
    this.runoutTarget=null;this.runoutAlly=null;
    if(action&&this.role==="defender"){
      // Allied defender AI can also be spotted if it roams outdoors.
      for(const ally of this.allies){
        if(!ally.alive||this.isInside(ally))continue;
        this.runoutAlly=ally;ally.runoutUntil=now+2300;
        for(const attacker of this.bots)if(attacker.alive){
          attacker.hearing={x:ally.x,z:ally.z};
          attacker.hearingUntil=now+2300;
        }
        if(now-this.lastRunoutEnemy>3800){
          this.lastRunoutEnemy=now;
          notify("SQUADMATE DETECTED OUTSIDE · ATTACKERS PINGED LOCATION","alarm");
        }
        break;
      }
    }
    if(action&&this.role==="attacker"){
      for(const defender of this.bots){
        if(!defender.alive||this.isInside(defender))continue;
        defender.runoutUntil=now+2300;
        defender.spottedUntil=now+4500;
        this.runoutTarget=defender;
        for(const ally of this.allies)if(ally.alive){
          ally.hearing={x:defender.x,z:defender.z};
          ally.hearingUntil=now+2300;
        }
        if(now-this.lastRunoutEnemy>3800){
          this.lastRunoutEnemy=now;
          notify("DEFENDER DETECTED OUTSIDE · LOCATION PINGED","alarm");
        }
        break;
      }
    }
  }
  pause(now){
    if(!this.pausedAt&&this.phase!=="ready"&&this.phase!=="won"&&this.phase!=="lost")
      this.pausedAt=now;
  }
  resume(now){
    if(!this.pausedAt)return;
    const d=Math.max(0,now-this.pausedAt);
    this.deadline+=d;if(this.bombEnd)this.bombEnd+=d;
    if(this.prepUntil)this.prepUntil+=d;
    if(this.nextWave)this.nextWave+=d;if(this.nextBeep)this.nextBeep+=d;
    this.lastHitNotice+=d;
    for(const b of [...this.bots,...this.allies]){
      if(b.nextShot)b.nextShot+=d;
      if(b.repathAt)b.repathAt+=d;
      if(b.hearingUntil)b.hearingUntil+=d;
      if(b.coverUntil)b.coverUntil+=d;
      if(b.intelUntil)b.intelUntil+=d;
    }
    for(const intel of Object.values(this.teamIntel||{}))if(intel)intel.until+=d;
    this.pausedAt=0;
  }
  start(now){
    if(this.phase!=="ready")return;
    this.phase="prep";
    this.prepUntil=now+45000;
    // Each side fields FIVE operators: human plus 4 active squad bots
    // versus 5 hostile bots. Friendly defenders prepare inside the facility.
    if(this.role==="attacker"){
      for(const [i,p] of [
        [-7,12,"A"],[7,13,"B"],[-13,-40,"A"],[13,-27,"B"]
      ].entries()){
        const [x,z,site]=p;this.spawnBot(x,z,false,"ally",site);
      }
      for(const [x,z,site] of [
        [-7,-48,"A"],[-4,-41,"A"],[7,-33,"B"],
        [5,-24.6,"B"],[-6,-28,"B"]
      ])this.spawnBot(x,z,true,"enemy",site);
    }else{
      for(const [x,z,site] of [
        [-7,-46,"A"],[-3,-41,"A"],[6,-32,"B"],[5,-25,"B"]
      ])this.spawnBot(x,z,true,"ally",site);
    }
  }
  beginAction(now,notify=()=>{}){
    if(this.phase!=="prep")return;
    this.actionStartedAt=now;
    this.phase=this.role==="attacker"?"attack":"guard";
    this.deadline=now+145000;
    if(this.role==="defender"){
      // Five enemy attackers use south, southwest, southeast, west and east
      // approaches. Two flank the outer entrances instead of rushing mid.
      for(const [i,[x,z,site]] of [
        [0,12,"A"],[-7,14,"A"],[7,13,"B"],
        [-13,-40,"A"],[13,-27,"B"]
      ].entries()){
        const bot=this.spawnBot(x,z,false,"enemy",site);
        bot.carrier=i===2;bot.nextShot=now+950+i*180;
      }
      // Allies begin their own rotations only after the action phase.
      for(const ally of this.allies)ally.stationary=false;
    }
    notify("ACTION PHASE · "+(this.role==="attacker"?
      "FIVE ATTACKERS · CLEAR A / B AND PLANT":"FIVE ATTACKERS APPROACHING · DEFEND BOTH SITES"),
      "round-start");
  }
  spawnWave(now){
    this.wave++;
    if(this.bots.filter(b=>b.alive).length>=5)return;
    const first=this.spawnBot(this.wave%2?0:-5,10,false);
    first.nextShot=now+1200;
    if(this.wave===1||this.bots.filter(b=>b.alive).length<3){
      const second=this.spawnBot(this.wave%2?6:0,14,false);
      second.nextShot=now+1700;
    }
  }
  siteAt(p){
    // Full room boundaries. Planting no longer requires standing near a
    // floating circle or bomb station, only a legal walkable site floor.
    return Object.values(this.sites).find(({bounds:b})=>
      p.x>=b.minX&&p.x<=b.maxX&&p.z>=b.minZ&&p.z<=b.maxZ)||null;
  }
  atSite(p){return !!this.siteAt(p);}
  canInteract(p){
    if(this.role==="attacker")return this.phase==="attack"&&this.atSite(p);
    return this.phase==="planted"&&!!this.plantPosition&&
      Math.hypot(p.x-this.plantPosition.x,p.z-this.plantPosition.z)<2.25;
  }
  end(won,reason,notify=()=>{}){
    if(this.phase==="won"||this.phase==="lost")return;
    this.phase=won?"won":"lost";this.result=reason;this.hold=0;
    this.score[won?this.role:this.role==="attacker"?"defender":"attacker"]++;
    notify((won?"ROUND WON · ":"ROUND LOST · ")+reason,won?"round-win":"round-lose");
  }
  // Audible action travels to nearby bots. Bots do not have omniscient player tracking.
  onNoise(x,z,radius,now){
    // The player's own teammates know which side fired that weapon.
    // Never lure the friendly squad into investigating a friendly gunshot.
    for(const bot of this.bots){
      if(!bot.alive||Math.hypot(bot.x-x,bot.z-z)>radius)continue;
      bot.hearing={x,z};bot.hearingUntil=now+5800;
      if(bot.stationary&&this.phase==="attack"){
        bot.state="investigate";bot.stationary=false;
      }
    }
  }
  canBotSeePlayer(bot,player){
    const from=new this.THREE.Vector3(bot.x,1.65,bot.z);
    const direction=player.camera.position.clone().sub(from);
    const distance=direction.length();
    if(distance<.05||distance>20)return false;
    this.ray.set(from,direction.normalize());
    this.ray.near=0;this.ray.far=distance-.3;
    const cover=this.world.shootables.filter(m=>{
      const info=m.userData||{};
      return info.kind==="solid"||
        info.kind==="panel"&&!info.panel.destroyed||
        info.kind==="barricade"&&!info.plank.broken||
        info.kind==="shield"&&info.shield.group.parent;
    });
    return !this.ray.intersectObjects(cover,false).length;
  }
  coverDestination(bot,player){
    const possibilities=this.world.facility.coverPoints||[];
    let choice=null,best=Infinity;
    for(const pos of possibilities){
      const db=Math.hypot(pos.x-bot.x,pos.z-bot.z);
      const dp=Math.hypot(pos.x-player.x,pos.z-player.z);
      if(db<1||db>8||dp<3)continue;
      const value=db+dp*.08;
      if(value<best){best=value;choice=pos;}
    }
    return choice;
  }
  updateBots(now,dt,player,notify){
    // Dedicated squad controller handles friendly vs hostile gunfights,
    // cover, flanks, planted-device actions and barricade breaching.
    updateSquadCombat(this,now,dt,player,notify);
  }
  update(now,dt,player,holdingF,notify=()=>{}){
    this.bombStations.update(now,this.siteId);
    if(["ready","won","lost"].includes(this.phase))return;
    if(this.phase==="prep"){
      // Defensive squads actually prepare the facility rather than sitting
      // idle for 45 seconds. Leave external approaches available so neither
      // attackers nor defenders become sealed into a corner.
      // Defenders physically WALK to the setup points, play a timed
      // installation animation and place collision-aware equipment.
      // This runs during prep, not only during action.
      updateDefenderPrep(this,now,dt,notify);
      if(now>=this.prepUntil)this.beginAction(now,notify);
      else return;
    }
    this.playerAlive=player.health>0;
    if(!this.playerAlive&&!this.allies.some(b=>b.alive)){
      this.end(false,"ATTACK TEAM ELIMINATED",notify);return;
    }
    if(!this.playerAlive&&this.role==="attacker"&&!this.allies.some(b=>b.carrier&&b.alive)){
      const carrier=this.allies.find(b=>b.alive);
      if(carrier)carrier.carrier=true;
    }
    if(this.phase==="attack"&&now>=this.deadline){
      this.end(false,"ATTACK TIME EXPIRED",notify);return;
    }
    if(this.phase==="guard"&&now>=this.deadline){
      this.end(true,"SITE "+this.siteId+" DEFENDED",notify);return;
    }
    // Five-on-five round resolution uses *team* elimination, not the
    // player's life alone. If the player dies, friendly bots keep fighting.
    if((this.phase==="attack"||this.phase==="guard")&&this.bots.length&&
        !this.bots.some(bot=>bot.alive)){
      this.end(true,this.role==="attacker"?"DEFENDERS ELIMINATED":"ATTACKERS ELIMINATED",notify);
      return;
    }
    if(this.phase==="planted"){
      const remaining=Math.max(0,(this.bombEnd-now)/1000);
      this.defuser.update(remaining,now);
      if(now>=this.nextBeep){
        notify(null,"beep");this.nextBeep=now+(remaining<8?280:remaining<15?550:930);
      }
      if(now>=this.bombEnd){
        this.end(this.role==="attacker","DEFUSER TIMER EXPIRED",notify);return;
      }
    }
    this.updateRunouts(now,player,notify);
    const canHold=this.playerAlive&&this.canInteract(player);
    const plantSite=this.role==="attacker"?this.siteAt(player):null;
    if(this.holdSiteId&&plantSite&&this.holdSiteId!==plantSite.id){
      this.hold=0;this.lastInteractionTick=-1;
    }
    const stationary=!player.sprinting&&Math.hypot(player.velX,player.velZ)<.38;
    if(this.phase==="planted"&&this.role==="defender")
      this.defuser.setMode(canHold&&holdingF?"DISARMING":"ARMED");
    const required=this.holdNeeded;
    if(canHold&&holdingF&&stationary){
      if(plantSite)this.holdSiteId=plantSite.id;
      this.hold+=dt*1000;
      const tick=Math.floor(this.hold/400);
      if(tick>this.lastInteractionTick){
        this.lastInteractionTick=tick;
        notify(null,this.role==="attacker"?"plant-key":"defuse-key");
      }
      if(this.hold>=required){
        this.hold=0;this.lastInteractionTick=-1;
        if(this.role==="attacker"){
          this.chooseSite(this.holdSiteId||this.siteId);
          this.phase="planted";this.bombEnd=now+35000;this.nextBeep=now+800;
          this.defuseOperatorId=null;
          this.plantPosition={x:player.x,z:player.z};
          this.defuser.show(player.x,player.z,35,now,this.siteId);
          for(const bot of this.bots)if(bot.alive)bot.stationary=false;
          notify("DEFUSER PLANTED AT SITE "+this.siteId+" · DEFEND FOR 35 SECONDS","plant");
        }else{
          this.defuser.hide();notify("DEFUSER DISABLED","defuse");
          this.end(true,"DEFUSER DISABLED",notify);return;
        }
      }
    }else{
      this.hold=0;this.lastInteractionTick=-1;this.holdSiteId=null;
    }
    this.updateBots(now,dt,player,notify);
    if(!this.playerAlive&&!this.allies.some(bot=>bot.alive)&&
       this.phase!=="won"&&this.phase!=="lost")
      this.end(false,"YOUR SQUAD WAS ELIMINATED",notify);
  }
  get hint(){
    if(this.phase==="ready")return "SELECT OPERATOR · SELECT SITE · DEPLOY";
    if(this.phase==="prep")return this.role==="defender"?
      "PREPARATION · BARRICADE DOORS / REINFORCE WALLS · PROTECT BOTH DEVICES":
      "DRONE PHASE · DRIVE THROUGH ENTRANCES · X PING ENEMIES";
    if(this.phase==="won"||this.phase==="lost")return this.result+" · ESC → RESET TO PLAY AGAIN";
    if(this.phase==="planted")return this.role==="attacker"?
      "PROTECT DEFUSER · PREVENT HOSTILE DISABLE":
      "SITE "+this.siteId+" · STAND STILL AND HOLD F TO DISABLE";
    if(this.role==="attacker")return "SITE A OR B · FIND THE BOMB · STAND STILL & HOLD F TO PLANT";
    return "DEFEND SITE "+this.siteId+" · STOP PLANTING HOSTILES";
  }
  summary(now){
    const sec=n=>Math.max(0,Math.ceil(n/1000))+"S";
    if(this.phase==="ready")return "SITE "+this.siteId+" · READY";
    if(this.phase==="prep")return "PREPARATION · "+sec(this.prepUntil-now);
    if(this.phase==="won"||this.phase==="lost")return (this.phase==="won"?"VICTORY":"DEFEAT")+" · "+this.result;
    if(this.phase==="planted")return "DEFUSER ACTIVE · "+sec(this.bombEnd-now);
    return (this.role==="attacker"?"PLANT AT A / B":"DEFEND BOTH BOMB SITES")+" · "+sec(this.deadline-now);
  }
  get clockEnd(){return this.phase==="prep"?this.prepUntil:this.phase==="planted"?this.bombEnd:this.deadline;}
  get holdPercent(){return clamp(this.hold/this.holdNeeded*100,0,100);}
}
