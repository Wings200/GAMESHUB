// BLACKOUT V0.2 — role-specific gadgets tested against standalone panels.
// Offline only; future multiplayer must validate all gadget state on server.
export class Gadgets {
  constructor(THREE,world,scene){
    this.THREE=THREE;this.world=world;this.scene=scene;
    this.raycaster=new THREE.Raycaster();
    this.role="attacker";this.sensors=[];this.charge=null;this.action=null;
    this.scanUntil=0;this.scanMarkers=[];
    const ringMat=new THREE.MeshBasicMaterial({color:0x60f9f0,transparent:true,opacity:.9,depthTest:false});
    for(const t of world.targets){
      const marker=new THREE.Mesh(new THREE.RingGeometry(.32,.42,24),ringMat);
      marker.position.set(t.x,2.95,t.z);
      marker.visible=false;scene.add(marker);this.scanMarkers.push({marker,target:t});
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
    this.scanUntil=0;
    for(const a of this.scanMarkers)a.marker.visible=false;
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
  main(camera,player,now){
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
    const x=player.x+forwardX*2.35,z=player.z+forwardZ*2.35;
    const collision=this.world.colliders.some(c=>x>c.minX-1.25&&x<c.maxX+1.25
      &&z>c.minZ-1.25&&z<c.maxZ+1.25);
    if(collision)return {ok:false,message:"SHIELD PLACEMENT BLOCKED"};
    this.world.addShield(x,z,player.yaw);this.counts.g--;
    return {ok:true,message:"DEPLOYABLE SHIELD PLACED · PHYSICAL COVER"};
  }
  secondary(camera,player,now){
    if(this.counts.x<=0)return {ok:false,message:"NO SECONDARY GADGETS REMAIN"};
    if(this.role==="attacker"){
      this.counts.x--;this.scanUntil=now+4500;
      return {ok:true,message:"RECON PULSE · DUMMIES MARKED FOR 4.5S"};
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
    return this.role==="attacker"?
      {g:"BREACH CHARGE",x:"RECON PULSE",f:"NO ACTION"}:
      {g:"DEPLOY SHIELD",x:"PROX SENSOR",f:"REINFORCE PANEL"};
  }
}
