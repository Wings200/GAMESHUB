import {createDefuserModel} from "./defuser-model.js";
import {makeTacticalBot,advanceTacticalBot} from "./bot-ai.js";
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
    sign.position.y=3.04;this.root.add(sign);
    const alternate=new T.Mesh(new T.RingGeometry(2.87,3.01,64),
      new T.MeshBasicMaterial({color:0x50646a,transparent:true,opacity:.5,side:T.DoubleSide}));
    alternate.rotation.x=-Math.PI/2;alternate.position.y=.049;scene.add(alternate);
    this.alternate=alternate;
    this.defuser=createDefuserModel(T,scene);
    this.ray=new T.Raycaster();this.bots=[];this.botSerial=0;
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
    for(const bot of this.bots){
      for(const hitbox of bot.hitboxes){
        const at=this.world.shootables.indexOf(hitbox);
        if(at>=0)this.world.shootables.splice(at,1);
      }
      this.scene.remove(bot.group);
      bot.group.traverse(node=>{
        if(node.isMesh){node.geometry?.dispose?.();node.material?.dispose?.();}
      });
    }
    this.bots=[];
  }
  reset(role="attacker"){
    this.clearBots();
    this.role=role;this.phase="ready";this.result="";
    this.deadline=0;this.bombEnd=0;this.nextWave=0;this.wave=0;
    this.hold=0;this.lastInteractionTick=-1;this.nextBeep=0;
    this.pausedAt=0;this.lastHitNotice=0;this.lastFootstep=0;
    this.defuser.hide();
    this.ring.material.color.setHex(role==="attacker"?0x62eee2:0xffb76d);
  }
  spawnBot(x,z,stationary=false){
    const bot=makeTacticalBot(this.THREE,this.scene,this.world,++this.botSerial,x,z,stationary);
    this.bots.push(bot);return bot;
  }
  pause(now){
    if(!this.pausedAt&&this.phase!=="ready"&&this.phase!=="won"&&this.phase!=="lost")
      this.pausedAt=now;
  }
  resume(now){
    if(!this.pausedAt)return;
    const d=Math.max(0,now-this.pausedAt);
    this.deadline+=d;if(this.bombEnd)this.bombEnd+=d;
    if(this.nextWave)this.nextWave+=d;if(this.nextBeep)this.nextBeep+=d;
    this.lastHitNotice+=d;
    for(const b of this.bots){
      if(b.nextShot)b.nextShot+=d;
      if(b.repathAt)b.repathAt+=d;
      if(b.hearingUntil)b.hearingUntil+=d;
    }
    this.pausedAt=0;
  }
  start(now){
    if(this.phase!=="ready")return;
    if(this.role==="attacker"){
      this.phase="attack";this.deadline=now+120000;
      // Sentries remain ALIVE while attackers plant or rotate sites.
      if(this.siteId==="A"){
        this.spawnBot(-7,-48,true);
        this.spawnBot(-3,-46,true);
      }else{
        this.spawnBot(7,-33,true);
        this.spawnBot(3,-25,true);
      }
    }else{
      this.phase="guard";this.deadline=now+100000;
      this.spawnWave(now);this.nextWave=now+25000;
    }
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
  atSite(p){return Math.hypot(p.x-this.site.x,p.z-this.site.z)<this.site.radius;}
  canInteract(p){
    return this.atSite(p)&&
      (this.role==="attacker"&&this.phase==="attack"||
       this.role==="defender"&&this.phase==="planted");
  }
  end(won,reason,notify=()=>{}){
    if(this.phase==="won"||this.phase==="lost")return;
    this.phase=won?"won":"lost";this.result=reason;this.hold=0;
    this.score[won?this.role:this.role==="attacker"?"defender":"attacker"]++;
    notify((won?"ROUND WON · ":"ROUND LOST · ")+reason,won?"round-win":"round-lose");
  }
  // Audible action travels to nearby bots. Bots do not have omniscient player tracking.
  onNoise(x,z,radius,now){
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
    for(const bot of this.bots){
      if(!bot.alive)continue;
      const visible=this.canBotSeePlayer(bot,player);
      const playerDist=Math.hypot(player.x-bot.x,player.z-bot.z);
      const targetDist=Math.hypot(this.site.x-bot.x,this.site.z-bot.z);
      let goal=null;
      if(this.phase==="planted"||this.role==="defender"){
        // Defuse or attack the active site, using navmesh A* around walls.
        goal={x:this.site.x+((bot.id%2)?-.45:.45),z:this.site.z};
        bot.state="objective";
      }else if(visible){
        bot.state="hold-angle";bot.group.rotation.y=Math.atan2(bot.x-player.x,bot.z-player.z);
        if(playerDist>12)goal={x:player.x,z:player.z};
      }else if(bot.hearingUntil>now&&bot.hearing){
        bot.state="investigate";goal=bot.hearing;
      }else if(!bot.stationary){
        bot.state="flank";goal={x:this.site.x+(bot.id%2?2:-2),z:this.site.z+(bot.id%2?3:-3)};
      }else bot.state="guard";
      if(visible&&playerDist<9&&bot.hitAt&&now-bot.hitAt<1500){
        goal=this.coverDestination(bot,player)||goal;
        bot.state="seek-cover";
      }
      if(bot.stationary&&bot.state==="guard")goal=null;
      // Once a hostile has sight on the player, it holds an angle rather
      // than running blindly into their muzzle.
      if(visible&&playerDist<9&&bot.state!=="seek-cover"&&
         this.role==="defender"&&targetDist>2.5)goal=null;
      const moved=goal?advanceTacticalBot(bot,goal,this.world,dt,now):0;
      if(visible&&moved<.2)
        bot.group.rotation.y=Math.atan2(bot.x-player.x,bot.z-player.z);
      if(targetDist<1.85&&!bot.stationary&&
        (this.role==="defender"&&this.phase==="guard"||
         this.role==="attacker"&&this.phase==="planted")){
        bot.working+=dt*1000;
        if(bot.working>=7500){
          bot.working=0;
          if(this.role==="defender"&&this.phase==="guard"){
            this.phase="planted";this.bombEnd=now+32000;this.nextBeep=now+750;
            this.defuser.show(this.site.x,this.site.z,32,now);
            this.hold=0;notify("HOSTILES PLANTED AT SITE "+this.siteId+" · DISABLE THE DEFUSER","plant");
          }else if(this.role==="attacker"&&this.phase==="planted"){
            this.defuser.hide();notify(null,"defuse");
            this.end(false,"DEFUSER DISABLED BY HOSTILES",notify);return;
          }
        }
      }else bot.working=0;
      bot.group.updateMatrixWorld(true);
      bot.animate(dt,now,moved);
      if(now>=bot.nextShot&&visible&&playerDist<20){
        bot.nextShot=now+920+Math.random()*540;
        bot.lastShotAt=now;
        notify(null,"enemy-fire");
        // Actual line-of-sight, imperfect aim and limited effective range.
        const hitRate=clamp(.78-playerDist*.021-(player.moving?.08:0)-(Math.abs(player.lean)>.3?.08:0),.27,.79);
        if(Math.random()<hitRate){
          player.takeDamage(8+Math.floor(Math.random()*3));
          notify(null,"hurt");
          if(player.health<=0){this.end(false,"OPERATOR ELIMINATED",notify);return;}
          if(now-this.lastHitNotice>1850){
            notify("UNDER FIRE · "+player.health+" HP");this.lastHitNotice=now;
          }
        }
      }
    }
  }
  update(now,dt,player,holdingF,notify=()=>{}){
    if(["ready","won","lost"].includes(this.phase))return;
    if(player.health<=0){this.end(false,"OPERATOR ELIMINATED",notify);return;}
    if(this.phase==="attack"&&now>=this.deadline){
      this.end(false,"ATTACK TIME EXPIRED",notify);return;
    }
    if(this.phase==="guard"&&now>=this.deadline){
      this.end(true,"SITE "+this.siteId+" DEFENDED",notify);return;
    }
    if(this.phase==="guard"&&now>=this.nextWave){
      this.spawnWave(now);this.nextWave=now+24000;
      notify("HOSTILES ENTERING THE FACILITY","alarm");
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
    const canHold=this.canInteract(player);
    const stationary=!player.sprinting&&Math.hypot(player.velX,player.velZ)<.38;
    if(this.phase==="planted"&&this.role==="defender")
      this.defuser.setMode(canHold&&holdingF?"DISARMING":"ARMED");
    const required=this.role==="attacker"?5000:5500;
    if(canHold&&holdingF&&stationary){
      this.hold+=dt*1000;
      const tick=Math.floor(this.hold/400);
      if(tick>this.lastInteractionTick){
        this.lastInteractionTick=tick;
        notify(null,this.role==="attacker"?"plant-key":"defuse-key");
      }
      if(this.hold>=required){
        this.hold=0;this.lastInteractionTick=-1;
        if(this.role==="attacker"){
          this.phase="planted";this.bombEnd=now+32000;this.nextBeep=now+800;
          this.defuser.show(this.site.x,this.site.z,32,now);
          for(const bot of this.bots)if(bot.alive)bot.stationary=false;
          notify("DEFUSER PLANTED AT SITE "+this.siteId+" · DEFEND FOR 32 SECONDS","plant");
        }else{
          this.defuser.hide();notify("DEFUSER DISABLED","defuse");
          this.end(true,"DEFUSER DISABLED",notify);return;
        }
      }
    }else{
      this.hold=0;this.lastInteractionTick=-1;
    }
    this.updateBots(now,dt,player,notify);
  }
  get hint(){
    if(this.phase==="ready")return "ENTER RANGE TO START THE ROUND";
    if(this.phase==="won"||this.phase==="lost")return this.result+" · ESC → RESET TO PLAY AGAIN";
    if(this.phase==="planted")return this.role==="attacker"?
      "PROTECT DEFUSER · PREVENT HOSTILE DISABLE":
      "SITE "+this.siteId+" · STAND STILL AND HOLD F TO DISABLE";
    if(this.role==="attacker")return "SITE "+this.siteId+" · STAND STILL AND HOLD F TO PLANT, EVEN WITH DEFENDERS ALIVE";
    return "DEFEND SITE "+this.siteId+" · STOP PLANTING HOSTILES";
  }
  summary(now){
    const sec=n=>Math.max(0,Math.ceil(n/1000))+"S";
    if(this.phase==="ready")return "SITE "+this.siteId+" · READY";
    if(this.phase==="won"||this.phase==="lost")return (this.phase==="won"?"VICTORY":"DEFEAT")+" · "+this.result;
    if(this.phase==="planted")return "DEFUSER ACTIVE · "+sec(this.bombEnd-now);
    return (this.role==="attacker"?"PLANT":"DEFEND")+" SITE "+this.siteId+" · "+sec(this.deadline-now);
  }
  get holdPercent(){return clamp(this.hold/(this.role==="attacker"?5000:5500)*100,0,100);}
}
