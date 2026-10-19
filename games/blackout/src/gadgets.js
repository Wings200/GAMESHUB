// BLACKOUT V0.2 — role-specific gadgets tested against standalone panels.
// Offline only; future multiplayer must validate all gadget state on server.
export class Gadgets {
  constructor(THREE,world,scene){
    this.THREE=THREE;this.world=world;this.scene=scene;
    this.raycaster=new THREE.Raycaster();
    this.role="attacker";this.sensors=[];this.charge=null;this.action=null;
    this.scanUntil=0;this.scanMarkers=[];
    this.electronics=[];this.gasFields=[];this.specialLastAt=0;
    this.hostiles=[];
    const ringMat=new THREE.MeshBasicMaterial({color:0x60f9f0,transparent:true,opacity:.9,depthTest:false});
    for(const t of world.targets){
      const marker=new THREE.Mesh(new THREE.RingGeometry(.32,.42,24),ringMat);
      marker.position.set(t.x,2.95,t.z);
      marker.visible=false;scene.add(marker);this.scanMarkers.push({marker,target:t});
    }
    this.botMarkers=[];
    for(let i=0;i<6;i++){
      const mesh=new THREE.Mesh(new THREE.RingGeometry(.30,.42,24),
        new THREE.MeshBasicMaterial({color:0xffd48a,transparent:true,opacity:.98,depthTest:false}));
      mesh.visible=false;scene.add(mesh);this.botMarkers.push(mesh);
    }
    this.reset("attacker");
  }
  cancelAction(){
    if(this.action?.panel)this.action.panel.cancelReinforcement();
    this.action=null;
  }
  reset(role=this.role){
    this.cancelAction();
    this.role=role;
    const spec=this.operator?.side===role?this.operator:null;
    this.counts={g:role==="attacker"?(spec?.kit.breach??2):(spec?.kit.shield??2),
      x:role==="attacker"?(spec?.kit.scan??2):(spec?.kit.sensor??2),
      reinforce:spec?.kit.reinforce??2};
    this.specialCount=spec?.kit.special??0;
    this.scanUntil=0;
    for(const effect of [...this.electronics,...this.gasFields]){
      this.scene.remove(effect.group);
    }
    this.electronics=[];this.gasFields=[];
    for(const a of this.scanMarkers)a.marker.visible=false;
    for(const marker of this.botMarkers)marker.visible=false;
    if(this.charge){
      this.scene.remove(this.charge.marker);
      this.charge.marker.geometry?.dispose?.();
      this.charge.marker.material?.dispose?.();
      this.charge=null;
    }
    for(const s of this.sensors){
      this.scene.remove(s.group);
      s.group.traverse?.(node=>{
        if(node.isMesh){node.geometry?.dispose?.();node.material?.dispose?.();}
      });
    }
    this.sensors=[];
  }
  setOperator(spec){
    this.operator=spec;
    this.reset(spec.side);
  }
  nearestPanel(camera,limit=6.5){
    this.raycaster.setFromCamera({x:0,y:0},camera);
    const hits=this.raycaster.intersectObjects(this.world.panels
      .filter(p=>!p.destroyed).flatMap(p=>[p.mesh,...p.rails]),false);
    const hit=hits.find(h=>h.distance<=limit);
    return hit?.object.userData.panel||null;
  }
  main(camera,player,now,round=null){
    if(this.operator?.kit.special!==undefined)
      return this.useSpecial(camera,player,now,round);
    if(this.counts.g<=0)return {ok:false,message:"NO PRIMARY GADGETS REMAIN"};
    if(this.role==="attacker"){
      const panel=this.nearestPanel(camera,7);
      if(!panel)return {ok:false,message:"AIM AT A TEST PANEL WITHIN 7 METERS"};
      if(panel.reinforced)return {ok:false,message:"STANDARD CHARGE CANNOT BREACH REINFORCEMENT"};
      if(this.charge)return {ok:false,message:"WAIT FOR ACTIVE CHARGE TO DETONATE"};
      this.counts.g--;
      const mat=new this.THREE.MeshStandardMaterial({color:0xffb451,emissive:0xb45211,emissiveIntensity:1});
      const marker=new this.THREE.Mesh(new this.THREE.BoxGeometry(.48,.32,.16),mat);
      marker.position.set(panel.x,1.6,panel.z+(camera.position.z>panel.z?.24:-.24));
      this.scene.add(marker);this.charge={panel,marker,detonateAt:now+1500};
      return {ok:true,message:"BREACH CHARGE PLANTED · DETONATING IN 1.5S"};
    }
    const forwardX=-Math.sin(player.yaw),forwardZ=-Math.cos(player.yaw);
    // The old test used a 2.5-by-2.5 metre invisible square and never
    // checked collider heights. It rejected wide open hallways because a
    // nearby wall or overhead beam was inside that oversized box.
    const halfX=Math.abs(Math.cos(player.yaw))*.90+Math.abs(Math.sin(player.yaw))*.14;
    const halfZ=Math.abs(Math.sin(player.yaw))*.90+Math.abs(Math.cos(player.yaw))*.14;
    const fits=(x,z)=>{
      const margin=.045;
      const left=x-halfX-margin,right=x+halfX+margin;
      const back=z-halfZ-margin,front=z+halfZ+margin;
      if(Math.hypot(x-player.x,z-player.z)<.92)return false;
      for(const c of this.world.colliders){
        if(c.tag==="floor-base"||c.maxY<=.09||c.minY>=1.42)continue;
        if(right>c.minX&&left<c.maxX&&front>c.minZ&&back<c.maxZ)
          return false;
      }
      // Do not magically deploy a shield behind a wall: the short line
      // from the operator to its final position must also be reachable.
      const distance=Math.hypot(x-player.x,z-player.z);
      for(let d=.48;d<distance-.23;d+=.18){
        const px=player.x+forwardX*d,pz=player.z+forwardZ*d;
        if(this.world.colliders.some(c=>c.maxY>.40&&c.minY<1.42&&
          px>c.minX-.12&&px<c.maxX+.12&&
          pz>c.minZ-.12&&pz<c.maxZ+.12))return false;
      }
      return true;
    };
    // Search just ahead of the operator; only place in the direction faced,
    // without jumping to another room or using a far-away fake location.
    for(const distance of [1.38,1.62,1.90,2.15]){
      const x=player.x+forwardX*distance,z=player.z+forwardZ*distance;
      if(!fits(x,z))continue;
      this.world.addShield(x,z,player.yaw);this.counts.g--;
      return {ok:true,message:"DEPLOYABLE SHIELD PLACED · PHYSICAL COVER"};
    }
    return {ok:false,message:"SHIELD NEEDS 1.8M CLEAR SPACE IN FRONT · FACE OPEN FLOOR"};
  }
  jammedAt(x,z,now=performance.now()){
    return this.electronics.some(e=>e.kind==="jammer"&&
      e.disabledUntil<=now&&Math.hypot(x-e.x,z-e.z)<5.2);
  }
  shockNear(x,z,range=3.5,now=performance.now()){
    const e=this.electronics.find(e=>e.disabledUntil<=now&&
      Math.hypot(x-e.x,z-e.z)<=range);
    if(!e)return {ok:false,message:"NO ENEMY ELECTRONICS WITHIN RANGE"};
    e.disabledUntil=now+12000;
    e.light.material.color.setHex(0x5a6974);
    return {ok:true,message:"DRONE SHOCK · ELECTRONIC DEVICE DISABLED"};
  }
  useSpecial(camera,player,now,round){
    const id=this.operator?.id;
    const count=this.specialCount||0;
    if(id!=="pulse"&&count<=0)return {ok:false,message:"NO SPECIAL GADGETS REMAIN"};
    const fx=-Math.sin(player.yaw),fz=-Math.cos(player.yaw);
    const x=player.x+fx*1.25,z=player.z+fz*1.25;
    const panel=this.nearestPanel(camera,id==="ash"?17:id==="thermite"?3.7:2.7);
    const bars=this.world.barricades,opening=bars?.nearest(player,2.7);
    const consume=()=>{if(id!=="pulse")this.specialCount--;};
    if(id==="sledge"||id==="ash"||id==="thermite"){
      if(opening&&bars.hasBarricade(opening)){
        bars.breakAll(opening);consume();
        return {ok:true,message:id.toUpperCase()+" · BARRICADE BREACHED"};
      }
      if(!panel)return {ok:false,message:"AIM AT A BREAKABLE PANEL WITHIN RANGE"};
      if(panel.reinforced&&id!=="thermite")
        return {ok:false,message:"REINFORCED WALL · NEED THERMITE"};
      if(panel.destroyed)return {ok:false,message:"WALL ALREADY BREACHED"};
      if(id==="thermite")panel.reinforced=false;
      if(!panel.damage(500,true))return {ok:false,message:"BREACH BLOCKED"};
      consume();
      return {ok:true,message:id.toUpperCase()+" · WALL BREACHED"};
    }
    if(id==="thatcher"){
      consume();let disabled=0;
      for(const e of this.electronics){
        if(Math.hypot(e.x-x,e.z-z)<=9){
          e.disabledUntil=now+13000;disabled++;
        }
      }
      for(const gas of this.gasFields){
      if(now>gas.end){gas.group.visible=false;continue;}
      if(now>=gas.nextTick){
        gas.nextTick=now+450;
        for(const enemy of hostileBots)if(enemy.alive&&
          Math.hypot(enemy.x-gas.x,enemy.z-gas.z)<4.0)enemy.damage(7);
      }
      gas.group.scale.setScalar(1+Math.min(2,(now-(gas.end-10500))/5000));
    }
    for(const sensor of this.sensors){
      if(sensor.disabledUntil>now)continue;
        if(Math.hypot(sensor.x-x,sensor.z-z)<=9){sensor.disabledUntil=now+13000;disabled++;}
      }
      return {ok:true,message:"EMP DETONATED · "+disabled+" DEVICES DISABLED"};
    }
    if(id==="twitch")return {ok:false,message:"TWITCH · USE THE DRONE DURING PREP · X PINGS"};
    if(id==="mute"||id==="smoke"){
      if(this.world.colliders.some(c=>c.maxY>.4&&c.minY<.6&&
        x>=c.minX-.32&&x<=c.maxX+.32&&z>=c.minZ-.32&&z<=c.maxZ+.32))
        return {ok:false,message:"GADGET PLACEMENT BLOCKED · FACE OPEN FLOOR"};
      const group=new this.THREE.Group();group.position.set(x,0,z);this.scene.add(group);
      const mat=new this.THREE.MeshStandardMaterial({color:id==="mute"?0x415e6b:0x68724d,metalness:.38});
      const mesh=new this.THREE.Mesh(new this.THREE.BoxGeometry(.55,.31,.45),mat);
      mesh.position.y=.16;group.add(mesh);
      const light=new this.THREE.Mesh(new this.THREE.SphereGeometry(.045,8,6),
        new this.THREE.MeshBasicMaterial({color:id==="mute"?0x59f0db:0xe5a55f}));
      light.position.y=.37;group.add(light);
      const entry={kind:id==="mute"?"jammer":"gas",x,z,group,light,disabledUntil:0,
        end:now+10500,nextTick:now};
      if(id==="mute")this.electronics.push(entry);
      else this.gasFields.push(entry);
      consume();
      return{ok:true,message:id==="mute"?"MUTE JAMMER ONLINE · DRONES JAMMED NEARBY":
        "SMOKE CANISTER ACTIVE · 10 SECOND AREA DENIAL"};
    }
    if(id==="castle"){
      if(!opening)return {ok:false,message:"FACE AN EMPTY DOOR OR WINDOW"};
      if(bars.hasBarricade(opening))return {ok:false,message:"REMOVE EXISTING BARRICADE FIRST"};
      if(!bars.place(opening,true))return {ok:false,message:"ARMOR PANEL UNAVAILABLE"};
      consume();return {ok:true,message:"CASTLE · REINFORCED ARMOR PANEL INSTALLED"};
    }
    if(id==="pulse"){
      if(now-this.specialLastAt<2200)return {ok:false,message:"HEARTBEAT SENSOR COOLING DOWN"};
      this.specialLastAt=now;
      const targets=round?.bots?.filter(b=>b.alive&&Math.hypot(b.x-player.x,b.z-player.z)<13)||[];
      this.scanUntil=now+2000;
      return {ok:true,message:"HEARTBEAT SENSOR · "+targets.length+" SIGNALS WITHIN 13M"};
    }
    if(id==="doc"){
      const ally=round?.allies?.filter(b=>b.alive&&b.health<b.healthMax&&
        Math.hypot(b.x-player.x,b.z-player.z)<5).sort((a,b)=>a.health-b.health)[0];
      if(player.health>=player.maxHealth&&!ally)
        return {ok:false,message:"NO INJURED OPERATOR IN RANGE"};
      if(ally)ally.health=Math.min(ally.healthMax,ally.health+55);
      else player.health=Math.min(player.maxHealth,player.health+55);
      consume();return {ok:true,message:"DOC STIM · "+(ally?"FRIENDLY HEALED":"SELF HEALED")};
    }
    return {ok:false,message:"OPERATOR ABILITY UNAVAILABLE"};
  }
  secondary(camera,player,now){
    if(this.counts.x<=0)return {ok:false,message:"NO SECONDARY GADGETS REMAIN"};
    if(this.role==="attacker"){
      this.counts.x--;this.scanUntil=now+4500;
      return {ok:true,message:"RECON PULSE · HOSTILE CONTACTS MARKED FOR 4.5S"};
    }
    const fx=-Math.sin(player.yaw),fz=-Math.cos(player.yaw);
    const x=player.x+fx*2,z=player.z+fz*2;
    const group=new this.THREE.Group();this.scene.add(group);group.position.set(x,.055,z);
    const mat=new this.THREE.MeshBasicMaterial({color:0xfba65e,transparent:true,opacity:.45,side:this.THREE.DoubleSide});
    const indicator=new this.THREE.Mesh(new this.THREE.RingGeometry(4.8,5,48),mat);
    indicator.rotation.x=-Math.PI/2;group.add(indicator);
    const core=new this.THREE.Mesh(new this.THREE.CylinderGeometry(.23,.31,.18,12),
      new this.THREE.MeshStandardMaterial({color:0xdc7044,emissive:0xff501c,emissiveIntensity:.4}));
    group.add(core);
    this.sensors.push({x,z,group,armed:false,lastPing:0,hostileInside:false});
    this.counts.x--;
    return {ok:true,message:"PROXIMITY SENSOR DEPLOYED · EXIT ITS RADIUS TO ARM"};
  }
  interact(camera,now){
    if(this.role!=="defender")return {ok:false,message:"ATTACKERS CANNOT REINFORCE PANELS"};
    if(this.action)return {ok:false,message:"REINFORCEMENT ALREADY IN PROGRESS"};
    if(this.counts.reinforce<=0)return {ok:false,message:"NO REINFORCEMENTS REMAIN"};
    const p=this.nearestPanel(camera,5.3);
    if(!p)return {ok:false,message:"AIM AT A PANEL WITHIN 5 METERS"};
    if(p.reinforced||p.destroyed)return {ok:false,message:"PANEL ALREADY REINFORCED OR DESTROYED"};
    this.action={kind:"reinforce",panel:p,start:now,end:now+3000,progress:0};
    p.previewReinforcement(.001);
    return {ok:true,message:"INSTALLING REINFORCEMENT · 3.0 SECONDS"};
  }
  get busy(){return !!this.action;}
  get actionProgress(){return this.action?.progress||0;}
  tick(now,player,ping,hostileBots=[]){
    this.hostiles=hostileBots;
    if(this.action){
      const a=this.action;
      a.progress=Math.max(0,Math.min(1,(now-a.start)/3000));
      if(a.panel.destroyed){
        this.cancelAction();ping("REINFORCEMENT CANCELLED · PANEL DESTROYED");
      }else if(Math.hypot(player.x-a.panel.x,player.z-a.panel.z)>5.8){
        this.cancelAction();ping("REINFORCEMENT CANCELLED · OUT OF RANGE");
      }else if(now>=a.end){
        a.panel.previewReinforcement(1);
        const ok=a.panel.reinforce();
        if(ok)this.counts.reinforce--;
        this.action=null;
        ping(ok?"REINFORCEMENT INSTALLED · STEEL WALL READY":"REINFORCEMENT INTERRUPTED");
      }else a.panel.previewReinforcement(a.progress);
    }
    if(this.charge&&now>=this.charge.detonateAt){
      const {panel,marker}=this.charge;
      this.scene.remove(marker);
      marker.geometry?.dispose?.();marker.material?.dispose?.();
      this.charge=null;
      const destroyed=panel.damage(500,true);
      ping(destroyed?"PANEL BREACHED · OPEN PATH":"CHARGE DID NOT BREACH");
    }
    const scan=now<this.scanUntil;
    for(const {target,marker} of this.scanMarkers){
      marker.visible=scan&&target.alive;
      if(scan)marker.rotation.y=now*.0013;
    }
    // Recon is usable in actual objective rounds: mark REAL hostile bots,
    // not just range dummies. These reusable meshes do not allocate per frame.
    const aliveBots=scan&&this.role==="attacker"?hostileBots.filter(b=>b.alive):[];
    for(let i=0;i<this.botMarkers.length;i++){
      const marker=this.botMarkers[i];
      const bot=aliveBots[i];
      marker.visible=Boolean(scan&&this.role==="attacker"&&bot);
      if(marker.visible){
        marker.position.set(bot.x,2.54,bot.z);
        marker.rotation.y=now*.0018;
      }
    }
    for(const sensor of this.sensors){
      const r=Math.hypot(player.x-sensor.x,player.z-sensor.z);
      if(r>=5.25)sensor.armed=true;
      if(sensor.armed&&r<4.75){
        sensor.armed=false;
        sensor.lastPing=now;
        // Preserve user re-entry beep for solo testing.
        ping(null,"proximity-beep");
      }
      // In objective drills, defenders' sensors also detect approaching hostile
      // training bots, independently from the player's own test re-entry.
      const hostileInside=hostileBots.some(bot=>bot.alive&&
        Math.hypot(bot.x-sensor.x,bot.z-sensor.z)<4.75);
      if(hostileInside&&!sensor.hostileInside){
        sensor.lastPing=now;
        ping(null,"proximity-beep");
      }
      sensor.hostileInside=hostileInside;
    }
  }
  get details(){
    const special=this.operator?.passive||"SPECIAL";
    return this.role==="attacker"?
      {g:special,x:"RECON / UTILITY",f:"PLANT DEFUSER"}:
      {g:special,x:"PROX SENSOR",f:"REINFORCE PANEL"};
  }
}
