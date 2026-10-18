// BLACKOUT V0.5 — offline, playable bomb-site drills with lightweight hostile bots.
// All mechanics are local training simulations, not networked 5v5 rounds.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export class ObjectiveDrill {
  constructor(THREE,world,scene){
    this.THREE=THREE;this.world=world;this.scene=scene;
    this.site={x:0,z:-29,radius:3.6};
    this.root=new THREE.Group();scene.add(this.root);
    const ring=new THREE.Mesh(new THREE.RingGeometry(3.35,3.52,64),
      new THREE.MeshBasicMaterial({color:0x60e9e0,side:THREE.DoubleSide,transparent:true,opacity:.83}));
    ring.rotation.x=-Math.PI/2;ring.position.set(0,.045,-29);this.root.add(ring);this.ring=ring;
    const center=new THREE.Mesh(new THREE.CylinderGeometry(.49,.55,.26,12),
      new THREE.MeshStandardMaterial({color:0x294857,metalness:.72,roughness:.3,emissive:0x15565c,emissiveIntensity:.45}));
    center.position.set(0,.15,-29);this.root.add(center);this.device=center;
    const beacon=new THREE.Mesh(new THREE.BoxGeometry(.32,.32,.32),
      new THREE.MeshBasicMaterial({color:0x76f7e0}));
    beacon.position.set(0,.43,-29);this.root.add(beacon);this.beacon=beacon;
    const cv=document.createElement("canvas");cv.width=768;cv.height=150;
    const ctx=cv.getContext("2d");ctx.fillStyle="#10202ceb";ctx.fillRect(0,0,768,150);
    ctx.fillStyle="#5ce9e6";ctx.fillRect(0,0,768,10);
    ctx.fillStyle="#e6f9f8";ctx.font="900 65px Arial";ctx.textAlign="center";
    ctx.fillText("SITE A   /   OBJECTIVE",384,97);
    const texture=new THREE.CanvasTexture(cv);texture.colorSpace=THREE.SRGBColorSpace;
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(4.8,.94),
      new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,transparent:true,depthWrite:false}));
    sign.position.set(0,3.5,-29);this.root.add(sign);
    this.ray=new THREE.Raycaster();
    this.bots=[];this.reset("attacker");
  }
  clearBots(){
    for(const bot of this.bots){
      for(const hitbox of bot.hitboxes){
        const i=this.world.shootables.indexOf(hitbox);
        if(i>=0)this.world.shootables.splice(i,1);
      }
      this.scene.remove(bot.group);
      bot.group.traverse(n=>{if(n.isMesh){n.geometry.dispose();n.material.dispose();}});
    }
    this.bots=[];
  }
  reset(role="attacker"){
    this.clearBots();
    this.role=role;this.phase="ready";this.result="";
    this.deadline=0;this.bombEnd=0;this.nextWave=0;this.wave=0;
    this.hold=0;this.holdNeeded=role==="attacker"?5000:5500;
    this.pausedAt=0;this.lastHitNotice=0;
    this.ring.material.color.setHex(role==="attacker"?0x68e9e8:0xffbd6a);
    this.beacon.material.color.setHex(role==="attacker"?0x76f7e0:0xffc168);
  }
  spawnBot(x,z,stationary=false){
    const T=this.THREE;
    const group=new T.Group();group.position.set(x,0,z);this.scene.add(group);
    const body=new T.Mesh(new T.BoxGeometry(.7,1.0,.43),
      new T.MeshStandardMaterial({color:0xba5534,emissive:0x42160c,emissiveIntensity:.3,roughness:.7}));
    body.position.y=1.25;group.add(body);
    const head=new T.Mesh(new T.SphereGeometry(.24,12,10),
      new T.MeshStandardMaterial({color:0xf1b38b,roughness:.8}));
    head.position.y=2.03;group.add(head);
    const vest=new T.Mesh(new T.BoxGeometry(.52,.38,.47),
      new T.MeshStandardMaterial({color:0x372d2c,roughness:.8}));
    vest.position.y=1.25;group.add(vest);
    const bot={group,body,head,hitboxes:[body,head],x,z,health:72,alive:true,
      stationary,nextShot:0,working:0,walkSpeed:2.15,
      damage(amount){
        if(!this.alive)return false;
        this.health=Math.max(0,this.health-amount);
        if(this.health===0){this.alive=false;this.group.visible=false;return true;}
        body.material.color.setHex(0xdc805c);
        return false;
      }};
    for(const part of bot.hitboxes)part.userData={kind:"bot",bot,hitZone:part===head?"head":"body"};
    this.world.shootables.push(...bot.hitboxes);this.bots.push(bot);return bot;
  }
  pause(now){
    if(this.phase!=="ready"&&this.phase!=="won"&&this.phase!=="lost"&&!this.pausedAt)
      this.pausedAt=now;
  }
  resume(now){
    if(!this.pausedAt)return;
    const diff=Math.max(0,now-this.pausedAt);
    if(this.deadline)this.deadline+=diff;
    if(this.bombEnd)this.bombEnd+=diff;
    if(this.nextWave)this.nextWave+=diff;
    if(this.lastHitNotice)this.lastHitNotice+=diff;
    for(const bot of this.bots)if(Number.isFinite(bot.nextShot))bot.nextShot+=diff;
    this.pausedAt=0;
  }
  start(now){
    if(this.phase!=="ready")return;
    if(this.role==="attacker"){
      this.phase="clear";this.deadline=now+115000;
      this.spawnBot(-4.5,-33,true);this.spawnBot(4.5,-33,true);
    }else{
      this.phase="guard";this.deadline=now+85000;
      this.spawnWave(now);this.nextWave=now+18000;
    }
  }
  spawnWave(now){
    this.wave++;
    const active=this.bots.filter(b=>b.alive).length;
    if(active>=4)return;
    this.spawnBot(this.wave%2?-6.5:6.5,8,false);
    if(active<2)this.spawnBot(this.wave%2?8:-8,10,false);
  }
  atSite(player){return Math.hypot(player.x-this.site.x,player.z-this.site.z)<this.site.radius;}
  canInteract(player){
    return this.atSite(player)&&(
      this.role==="attacker"&&(this.phase==="clear"||this.phase==="plant")||
      this.role==="defender"&&this.phase==="planted");
  }
  end(won,reason,notify){
    if(this.phase==="won"||this.phase==="lost")return;
    this.phase=won?"won":"lost";this.result=reason;
    notify((won?"ROUND WON · ":"ROUND LOST · ")+reason);
  }
  canBotSeePlayer(bot,player){
    const a=new this.THREE.Vector3(bot.x,1.7,bot.z);
    const b=player.camera.position.clone();
    const direction=b.sub(a),distance=direction.length();
    if(distance>19||distance<.01)return false;
    this.ray.set(a,direction.normalize());
    this.ray.near=0;this.ray.far=Math.max(0,distance-.45);
    const cover=this.world.shootables.filter(m=>{
      const k=m.userData.kind;
      return k==="panel"&&!m.userData.panel.destroyed||k==="shield"&&m.userData.shield.group.parent;
    });
    return !this.ray.intersectObjects(cover,false).length;
  }
  update(now,dt,player,holdingF,notify){
    if(this.phase==="ready"||this.phase==="won"||this.phase==="lost")return;
    if(player.health<=0){this.end(false,"OPERATOR ELIMINATED",notify);return;}
    if(this.phase==="clear"&&!this.bots.some(b=>b.alive&&b.stationary)){
      this.phase="plant";notify("SITE CLEARED · ENTER SITE A AND HOLD F TO PLANT");
    }
    if(now>=this.deadline&&(this.phase==="clear"||this.phase==="plant")){
      this.end(false,"ATTACK TIME EXPIRED",notify);return;
    }
    if(this.phase==="guard"&&now>=this.deadline){
      this.end(true,"SITE A DEFENDED",notify);return;
    }
    if(this.phase==="guard"&&now>=this.nextWave){
      this.spawnWave(now);this.nextWave=now+18500;
      notify("INCOMING HOSTILE TRAINING WAVE");
    }
    if(this.phase==="planted"&&now>=this.bombEnd){
      this.end(this.role==="attacker",
        this.role==="attacker"?"DEFUSER DETONATED":"DEFUSER DETONATED",notify);return;
    }
    const canHold=this.canInteract(player);
    const required=this.role==="attacker"?5000:5500;
    if(canHold&&holdingF&&(this.phase==="plant"||this.role==="defender"&&this.phase==="planted")){
      this.hold+=dt*1000;
      if(this.hold>=required){
        this.hold=0;
        if(this.role==="attacker"){
          this.phase="planted";this.bombEnd=now+24000;
          this.spawnBot(-7,-9,false);this.spawnBot(7,-10,false);
          notify("DEFUSER PLANTED · HOLD THE SITE FOR 24 SECONDS");
        }else this.end(true,"DEFUSER DISABLED",notify);
      }
    }else this.hold=0;
    if(this.phase==="won"||this.phase==="lost")return;
    const activeBotMode=this.phase==="guard"||this.phase==="planted";
    for(const bot of this.bots){
      if(!bot.alive)continue;
      if(activeBotMode&&!bot.stationary){
        const dist=Math.hypot(bot.x-this.site.x,bot.z-this.site.z);
        if(dist>2.35){
          const speed=bot.walkSpeed*dt;
          const nx=bot.x+(this.site.x-bot.x)/dist*Math.min(speed,dist);
          const nz=bot.z+(this.site.z-bot.z)/dist*Math.min(speed,dist);
          const blocked=this.world.colliders.some(c=>
            nx>=c.minX-.25&&nx<=c.maxX+.25&&nz>=c.minZ-.25&&nz<=c.maxZ+.25&&c.maxY>1);
          if(!blocked){bot.x=nx;bot.z=nz;bot.group.position.set(nx,0,nz);}
          bot.group.rotation.y=Math.atan2(this.site.x-bot.x,this.site.z-bot.z);
        }else{
          bot.working+=dt*1000;
          if(bot.working>=4900){
            if(this.role==="defender"&&this.phase==="guard"){
              this.phase="planted";this.bombEnd=now+26000;
              this.hold=0;notify("DEFUSER PLANTED · GET TO SITE A, HOLD F TO DISABLE");
            }else if(this.role==="attacker"&&this.phase==="planted"){
              this.end(false,"DEFUSER DISABLED BY HOSTILES",notify);return;
            }
            bot.working=0;
          }
        }
      }
      bot.group.updateMatrixWorld(true);
      if(now>=bot.nextShot&&this.canBotSeePlayer(bot,player)){
        bot.nextShot=now+1150+Math.random()*600;
        // Their accuracy is intentionally imperfect; health affects the drill.
        if(Math.random()<.74){
          player.takeDamage(7+Math.floor(Math.random()*3));
          if(player.health<=0){this.end(false,"OPERATOR ELIMINATED",notify);return;}
          if(!this.lastHitNotice||now-this.lastHitNotice>2600){
            notify("TAKING FIRE · "+player.health+" HP REMAINING");this.lastHitNotice=now;
          }
        }
      }
    }
  }
  get hint(){
    if(this.phase==="ready")return "ENTER RANGE TO START THE ROUND";
    if(this.phase==="won"||this.phase==="lost")return this.result+" · ESC → RESET LAB TO REPLAY";
    if(this.role==="attacker"){
      if(this.phase==="clear")return "ELIMINATE THE TWO ORANGE SITE DEFENDERS";
      if(this.phase==="plant")return "SITE A · GET WITHIN THE CIRCLE AND HOLD F TO PLANT";
      return "PROTECT THE PLANTED DEFUSER · STOP THE ORANGE DEFUSERS";
    }
    if(this.phase==="guard")return "DEFEND SITE A · ELIMINATE APPROACHING ATTACKERS";
    return "SITE A · HOLD F NEAR THE DEVICE TO DISABLE IT";
  }
  summary(now){
    const sec=n=>Math.max(0,Math.ceil(n/1000))+"S";
    if(this.phase==="ready")return "SITE A · WAITING";
    if(this.phase==="won"||this.phase==="lost")return (this.phase==="won"?"VICTORY":"DEFEAT")+" · "+this.result;
    if(this.phase==="planted")return "DEFUSER ACTIVE · "+sec(this.bombEnd-now);
    if(this.role==="defender")return "DEFEND SITE A · "+sec(this.deadline-now);
    if(this.phase==="clear")return "ELIMINATE SENTRIES · "+this.bots.filter(b=>b.alive&&b.stationary).length+" LEFT";
    return "PLANT AT SITE A · "+sec(this.deadline-now);
  }
  get holdPercent(){return clamp(this.hold/(this.role==="attacker"?5000:5500)*100,0,100);}
}