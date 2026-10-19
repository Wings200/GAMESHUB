import {stepThrowable} from "./throw-physics.js?v=blackout-v330-advanced-ordnance";
import {Ordnance,SECONDARY_KITS} from "./ordnance.js?v=blackout-v330-advanced-ordnance";
// BLACKOUT V0.2 — role-specific gadgets tested against standalone panels.
// Offline only; future multiplayer must validate all gadget state on server.
export class Gadgets {
  constructor(THREE,world,scene){
    this.THREE=THREE;this.world=world;this.scene=scene;
    this.raycaster=new THREE.Raycaster();
    this.role="attacker";this.sensors=[];this.charge=null;this.action=null;
    this.scanUntil=0;this.scanMarkers=[];
    this.electronics=[];this.gasFields=[];this.specialLastAt=0;
    this.specialAction=null;this.specialFx=[];
    this.smokeCanisters=[];this.lastProjectileTick=null;
    this.ordnance=new Ordnance(THREE,world,scene);
    this.secondaryType="recon";this.hostiles=[];
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
    if(this.specialAction){
      const fx=this.specialAction;
      fx.group.parent?.remove(fx.group);
      fx.group.traverse(obj=>{if(obj.isMesh){
        obj.geometry?.dispose?.();obj.material?.dispose?.();
      }});
      this.specialAction=null;
    }
  }
  reset(role=this.role){
    this.cancelAction();
    this.ordnance.reset();
    if(!SECONDARY_KITS[role]?.some(t=>t.id===this.secondaryType))
      this.secondaryType=role==="attacker"?"recon":"sensor";
    for(const device of this.smokeCanisters)this.removeSmokeCanister(device);
    this.smokeCanisters=[];this.lastProjectileTick=null;
    for(const effect of this.specialFx){
      effect.group.parent?.remove(effect.group);
      effect.group.traverse(obj=>{if(obj.isMesh){
        obj.geometry?.dispose?.();obj.material?.dispose?.();
      }});
    }
    this.specialFx=[];
    this.role=role;
    const spec=this.operator?.side===role?this.operator:null;
    this.counts={g:role==="attacker"?(spec?.kit.breach??2):(spec?.kit.shield??2),
      x:role==="attacker"?(spec?.kit.scan??2):(spec?.kit.sensor??2),
      reinforce:spec?.kit.reinforce??2};
    this.specialCount=spec?.kit.special??0;
    this.counts.x=SECONDARY_KITS[role].find(t=>t.id===this.secondaryType).count;
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
  setSecondaryType(type){
    const spec=SECONDARY_KITS[this.role]?.find(item=>item.id===type);
    if(!spec)return false;
    this.ordnance.reset();
    this.secondaryType=type;
    this.counts.x=spec.count;
    return true;
  }
  remoteC4(now){return this.ordnance.remoteC4(now)}
  damageOrdnance(device,damage){return this.ordnance.damageDevice(device,damage)}
  get ordnanceStatus(){return {type:this.secondaryType,armedC4:this.ordnance.armedC4,
    deployed:this.ordnance.count,flashUntil:this.ordnance.flashUntil}}

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
      marker.position.set(panel.x,(panel.y||0)+1.6,panel.z+(camera.position.z>panel.z?.24:-.24));
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
  // Stage 2: all throwable special equipment uses reusable collision
  // physics. Smoke has two separate inputs: throw (G) and remote ignite (B).
  // Neither placement nor the throw-release animation creates damage/gas.
  createSmokeCanister(camera,player,now){
    const T=this.THREE,forward=new T.Vector3();
    if(typeof camera?.getWorldDirection==="function")
      camera.getWorldDirection(forward);
    else forward.set(-Math.sin(player.yaw),-Math.sin(player.pitch||0),
      -Math.cos(player.yaw));
    const origin=new T.Vector3();
    if(typeof camera?.getWorldPosition==="function")
      camera.getWorldPosition(origin);
    else origin.set(player.x,player.y+player.eyeHeight-.17,player.z);
    const horizontal=Math.hypot(forward.x,forward.z)||1;
    const dx=forward.x/horizontal,dz=forward.z/horizontal;
    const x=origin.x+dx*.44,z=origin.z+dz*.44;
    const y=Math.max(.32,origin.y-.22);
    const group=new T.Group();this.scene.add(group);
    const body=new T.Mesh(new T.CylinderGeometry(.12,.12,.25,12),
      new T.MeshStandardMaterial({color:0x59684f,metalness:.55,roughness:.55}));
    body.rotation.z=Math.PI/2;group.add(body);
    const capMat=new T.MeshStandardMaterial({color:0x1b262a,metalness:.7});
    for(const sign of [-1,1]){
      const cap=new T.Mesh(new T.CylinderGeometry(.125,.125,.035,12),capMat);
      cap.rotation.z=Math.PI/2;cap.position.x=sign*.14;group.add(cap);
    }
    const led=new T.Mesh(new T.SphereGeometry(.045,8,6),
      new T.MeshBasicMaterial({color:0xffc473}));
    led.position.set(0,.13,0);group.add(led);
    const device={kind:"smoke-canister",team:"ally",x,y,z,
      vx:dx*10.7,vy:2.8+Math.max(-.5,Math.min(.5,forward.y))*5.4,
      vz:dz*10.7,group,body,led,bounces:0,resting:false,
      stage:"flying",bornAt:now,armedAt:Infinity,active:false,
      destroyed:false,health:24,lastUpdateAt:now};
    group.position.set(x,y,z);
    body.userData={kind:"smoke-canister",device};
    this.world.shootables.push(body);
    this.smokeCanisters.push(device);
    return device;
  }
  removeSmokeCanister(device){
    if(!device||device.destroyed)return;
    device.destroyed=true;device.stage="destroyed";
    const index=this.world.shootables.indexOf(device.body);
    if(index>=0)this.world.shootables.splice(index,1);
    device.group.parent?.remove(device.group);
    device.group.traverse(node=>{if(node.isMesh){
      node.geometry?.dispose?.();node.material?.dispose?.();
    }});
  }
  damageSmokeCanister(device,damage){
    if(!device||device.destroyed||device.stage==="spent")return false;
    device.health-=damage;
    if(device.health>0)return false;
    if(device.active){
      const idx=this.gasFields.indexOf(device);
      if(idx>=0)this.gasFields.splice(idx,1);
    }
    this.removeSmokeCanister(device);
    return true;
  }
  throwSmoke(camera,player,now){
    if(this.operator?.id!=="smoke"||this.role!=="defender")
      return {ok:false,message:"SMOKE CANISTERS ARE DEFENDER-ONLY"};
    if(this.specialAction)return {ok:false,message:"FINISH THE CURRENT THROW"};
    if(this.specialCount<=0)return {ok:false,message:"NO GAS CANISTERS REMAIN"};
    const started=this.startAbility("smoke",camera,{x:player.x,z:player.z},
      now,430,()=>{
        this.createSmokeCanister(camera,player,now+430);
        return {message:"CANISTER THROWN · WAIT FOR LANDING, THEN PRESS B"};
      });
    if(started.ok)this.specialCount--;
    return started;
  }
  detonateSmoke(now){
    if(this.operator?.id!=="smoke"||this.role!=="defender")
      return {ok:false,message:"REMOTE DETONATOR IS SMOKE-ONLY"};
    const ready=this.smokeCanisters.filter(d=>!d.destroyed&&d.stage==="armed");
    if(!ready.length)return {ok:false,message:this.smokeCanisters.some(d=>d.stage==="flying")?
      "CANISTER IN FLIGHT · WAIT FOR IT TO LAND":
      "NO ARMED GAS CANISTERS · THROW WITH G FIRST"};
    for(const device of ready){
      device.stage="active";device.active=true;
      device.nextTick=now;device.end=now+10000;device.detonatedAt=now;
      const T=this.THREE;
      const cloud=new T.Mesh(new T.SphereGeometry(1.7,16,12),
        new T.MeshBasicMaterial({color:0x7e9162,transparent:true,
          opacity:.08,depthWrite:false,side:T.DoubleSide}));
      cloud.position.set(0,1.15-device.y,0);device.group.add(cloud);
      device.cloud=cloud;device.kind="gas";
      this.gasFields.push(device);
      device.led.material.color.setHex(0xf2e9bf);
    }
    return {ok:true,message:"REMOTE GAS DETONATED · "+ready.length+
      " CANISTER"+(ready.length===1?"":"S")+" · 10S AREA DENIAL"};
  }
  tickSmokeProjectiles(now,ping){
    for(const device of this.smokeCanisters){
      if(device.destroyed)continue;
      if(device.stage==="flying"){
        const dt=Math.min(.08,Math.max(0,(now-device.lastUpdateAt)/1000));
        device.lastUpdateAt=now;
        stepThrowable(device,this.world.colliders,dt);
        device.group.position.set(device.x,device.y,device.z);
        device.group.rotation.z+=dt*9;
        if(device.resting||now-device.bornAt>3800){
          device.stage="armed";device.resting=true;
          device.armedAt=now;device.vx=device.vy=device.vz=0;
          device.group.rotation.z=0;
          device.led.material.color.setHex(0x5cff9c);
          ping("SMOKE CANISTER ARMED · PRESS B TO REMOTELY DETONATE");
        }
      }else if(device.stage==="armed"){
        device.led.visible=Math.floor(now/280)%2===0;
      }else if(device.stage==="active"){
        device.led.visible=true;
        device.body.rotation.x=Math.sin(now*.006)*.11;
      }
    }
    // Stop spent devices from ever damaging a later round.
    for(let i=this.smokeCanisters.length-1;i>=0;i--){
      const d=this.smokeCanisters[i];
      if(d.stage==="active"&&now>d.end){
        const idx=this.gasFields.indexOf(d);
        if(idx>=0)this.gasFields.splice(idx,1);
        this.removeSmokeCanister(d);
        this.smokeCanisters.splice(i,1);
      }
    }
  }
  deployBotSensor(x,z,team="enemy"){
    const T=this.THREE,group=new T.Group();
    group.position.set(x,.055,z);this.scene.add(group);
    const ring=new T.Mesh(new T.RingGeometry(4.7,4.85,36),
      new T.MeshBasicMaterial({color:team==="enemy"?0xff9654:0x65d6e6,
        transparent:true,opacity:.16,side:T.DoubleSide}));
    ring.rotation.x=-Math.PI/2;group.add(ring);
    const core=new T.Mesh(new T.CylinderGeometry(.20,.24,.16,12),
      new T.MeshStandardMaterial({color:0x445766,metalness:.5,roughness:.46}));
    group.add(core);
    const sensor={x,z,group,team,armed:true,lastPing:0,hostileInside:false,
      disabledUntil:0};
    this.sensors.push(sensor);return sensor;
  }
  deployBotGas(x,z,team="enemy",now=performance.now()){
    const T=this.THREE,group=new T.Group();
    group.position.set(x,0,z);this.scene.add(group);
    const canister=new T.Mesh(new T.CylinderGeometry(.16,.19,.32,12),
      new T.MeshStandardMaterial({color:0x60714a,metalness:.55}));
    canister.position.y=.16;group.add(canister);
    const cloud=new T.Mesh(new T.SphereGeometry(2.0,16,12),
      new T.MeshBasicMaterial({color:0x849961,transparent:true,
        opacity:.18,depthWrite:false,side:T.DoubleSide}));
    cloud.position.y=1.22;group.add(cloud);
    const field={kind:"gas",team,x,z,group,cloud,
      nextTick:now,end:now+9500,disabledUntil:0};
    this.gasFields.push(field);return field;
  }
  deployJammer(x,z,team="enemy"){
    const group=new this.THREE.Group();group.position.set(x,0,z);this.scene.add(group);
    const housing=new this.THREE.Mesh(new this.THREE.BoxGeometry(.58,.30,.52),
      new this.THREE.MeshStandardMaterial({color:0x3c5b68,metalness:.55,roughness:.43}));
    housing.position.y=.16;group.add(housing);
    const indicator=new this.THREE.Mesh(new this.THREE.SphereGeometry(.055,10,8),
      new this.THREE.MeshBasicMaterial({color:0x69fff2}));
    indicator.position.y=.35;group.add(indicator);
    const device={kind:"jammer",team,x,z,group,light:indicator,disabledUntil:0};
    this.electronics.push(device);
    return device;
  }
  populateEnemyDefenses(sites){
    // Ensure attacker gadgets have real enemy electronics to counter.
    // These are physical units in both rooms, not decorative HUD labels.
    for(const site of Object.values(sites))
      this.deployJammer(site.x-((site.id==="A")?1.3:-1.3),
        site.z+1.2,"enemy");
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
    return {ok:true,message:"DRONE SHOCK · ELECTRONIC DEVICE DISABLED",
      target:{x:e.x,z:e.z}};
  }
  startAbility(type,camera,position,now,duration,onComplete){
    if(this.specialAction)return {ok:false,message:"FINISH THE CURRENT GADGET ANIMATION"};
    const T=this.THREE;
    const handheld=["sledge","doc","pulse","smoke"].includes(type)&&camera;
    const group=new T.Group();
    if(handheld){
      camera.add(group);group.position.set(.36,-.36,-.65);
    }else{
      this.scene.add(group);
      group.position.set(position.x,1.40,position.z);
    }
    const body=new T.Mesh(new T.BoxGeometry(
      type==="thermite"?1.04:type==="castle"?.72:.30,
      type==="thermite"?1.25:type==="castle"?.58:.46,.13),
      new T.MeshStandardMaterial({color:type==="thermite"?0x373d42:
        type==="thatcher"?0x516279:type==="doc"?0xd2e0e7:0x434f56,
        metalness:.65,roughness:.4}));
    group.add(body);
    if(type==="sledge"){
      const handle=new T.Mesh(new T.CylinderGeometry(.055,.055,.72,10),
        new T.MeshStandardMaterial({color:0x765642,metalness:.24,roughness:.7}));
      handle.position.y=-.24;group.add(handle);
    }
    if(type==="doc"){
      const injector=new T.Mesh(new T.CylinderGeometry(.055,.068,.55,10),
        new T.MeshStandardMaterial({color:0x9dc7d8,metalness:.68}));
      injector.rotation.z=Math.PI/2;injector.position.set(0,-.23,0);
      group.add(injector);
    }
    const lamps=[];
    for(let i=0;i<3;i++){
      const glow=new T.Mesh(new T.SphereGeometry(.045,8,6),
        new T.MeshBasicMaterial({color:type==="thermite"?0xfba45d:0x75f4eb}));
      glow.position.set((i-1)*.21,.03,-.077);group.add(glow);lamps.push(glow);
    }
    const traveling=!handheld&&["ash","thatcher"].includes(type)&&
      camera?.position;
    const origin=traveling?camera.position.clone():null;
    if(origin)group.position.copy(origin);
    const action={kind:type,group,body,lamps,
      start:now,end:now+duration,duration,progress:0,
      onComplete,position:{...position},handheld,origin};
    this.specialAction=action;
    return {ok:true,message:type.toUpperCase()+" · "+
      (type==="thermite"?"PLACING EXOTHERMIC CHARGE":
       type==="sledge"?"SWINGING HAMMER":
       type==="ash"?"FIRING BREACHING ROUND":
       type==="castle"?"INSTALLING ARMOR PANEL":
       type==="doc"?"PREPARING STIM":
       type==="mute"?"DEPLOYING JAMMER":
       type==="smoke"?"THROWING GAS CANISTER":
       type==="thatcher"?"THROWING EMP":"ACTIVATING SENSOR")+
      " · "+(duration/1000).toFixed(1)+"S"};
  }
  finishAbilityFx(type,pos,now){
    // Persistent-for-650ms explosion, spark, or activation feedback.
    // Created only at gadget activation, not per game frame.
    const T=this.THREE,group=new T.Group();
    group.position.set(pos.x,1.42,pos.z);this.scene.add(group);
    const material=new T.MeshBasicMaterial({color:
      type==="thermite"||type==="ash"?0xffa85f:0x6becdd,
      transparent:true,opacity:.78,depthWrite:false});
    const flash=new T.Mesh(new T.SphereGeometry(.18,12,8),material);
    group.add(flash);
    for(let i=0;i<8;i++){
      const angle=i*Math.PI/4;
      const spark=new T.Mesh(new T.BoxGeometry(.045,.20,.04),
        new T.MeshBasicMaterial({color:i%2?0xffdc85:0xf2a96b,
          transparent:true,opacity:.9}));
      spark.userData={vx:Math.cos(angle),vy:.35+(i%3)*.18,
        vz:Math.sin(angle)};
      group.add(spark);
    }
    this.specialFx.push({group,flash,material,start:now,end:now+690});
  }
  tickAbility(now,ping){
    const a=this.specialAction;
    if(a){
      a.progress=Math.min(1,Math.max(0,(now-a.start)/a.duration));
      // Visible placement/swing timing: gadget doesn't instantly delete
      // geometry. LEDs accelerate as the exothermic cutter charges.
      a.lamps.forEach((l,i)=>{l.visible=
        a.kind!=="thermite"||Math.floor((now-a.start)/Math.max(75,280-a.progress*195)+i)%2===0;});
      if(a.handheld){
        a.group.rotation.x=-Math.sin(a.progress*Math.PI)*.9;
        a.group.rotation.z=Math.sin(a.progress*Math.PI)*.48;
      }else{
        a.group.scale.setScalar(.65+a.progress*.35);
        a.body.rotation.y=a.kind==="thatcher"?a.progress*4:0;
        if(a.origin){
          // Ash's round and Thatcher's canister travel through the level,
          // instead of appearing instantly on the target wall.
          const p=a.progress;
          a.group.position.set(
            a.origin.x+(a.position.x-a.origin.x)*p,
            a.origin.y+(1.4-a.origin.y)*p+Math.sin(p*Math.PI)*.55,
            a.origin.z+(a.position.z-a.origin.z)*p);
        }
      }
      if(now>=a.end){
        this.specialAction=null;
        a.group.parent?.remove(a.group);
        a.group.traverse(obj=>{if(obj.isMesh){
          obj.geometry?.dispose?.();obj.material?.dispose?.();
        }});
        const result=a.onComplete();
        // A throw has no explosion at the operator's hand; the cloud
        // only exists after the separately commanded remote detonation.
        if(a.kind!=="smoke")this.finishAbilityFx(a.kind,a.position,now);
        ping(result?.message||a.kind.toUpperCase()+" · ACTIVATED",
          a.kind==="thermite"||a.kind==="ash"?"impact":
          a.kind==="smoke"?"smoke-throw":"click");
      }
    }
    for(let i=this.specialFx.length-1;i>=0;i--){
      const fx=this.specialFx[i],progress=(now-fx.start)/(fx.end-fx.start);
      if(now>=fx.end){
        fx.group.parent?.remove(fx.group);
        fx.group.traverse(obj=>{if(obj.isMesh){obj.geometry?.dispose?.();obj.material?.dispose?.()}});
        this.specialFx.splice(i,1);continue;
      }
      fx.flash.scale.setScalar(1+progress*14);
      fx.material.opacity=(1-progress)*.65;
      for(const spark of fx.group.children.slice(1)){
        const v=spark.userData;
        spark.position.set(v.vx*progress*1.2,v.vy*progress*1.7,
          v.vz*progress*1.2);
        spark.material.opacity=1-progress;
      }
    }
  }
  useSpecial(camera,player,now,round){
    const id=this.operator?.id;
    const count=this.specialCount||0;
    if(this.specialAction)return {ok:false,message:"GADGET ANIMATION IN PROGRESS"};
    if(id!=="pulse"&&count<=0)return {ok:false,message:"NO SPECIAL GADGETS REMAIN"};
    const fx=-Math.sin(player.yaw),fz=-Math.cos(player.yaw);
    const x=player.x+fx*1.25,z=player.z+fz*1.25;
    const panel=this.nearestPanel(camera,id==="ash"?17:id==="thermite"?3.7:2.7);
    const bars=this.world.barricades,opening=bars?.nearest(player,2.7);
    const consume=()=>{if(id!=="pulse")this.specialCount--;};
    if(id==="sledge"||id==="ash"||id==="thermite"){
      const door=opening&&bars.hasBarricade(opening)?opening:null;
      if(!door&&!panel)return {ok:false,message:"AIM AT A BREACHABLE WALL OR BARRICADE"};
      if(!door&&panel.reinforced&&id!=="thermite")
        return {ok:false,message:"REINFORCED WALL · NEED THERMITE"};
      if(!door&&panel.destroyed)return {ok:false,message:"WALL ALREADY BREACHED"};
      const p=door?{x:door.x,z:door.z}:{x:panel.x,z:panel.z};
      const duration=id==="thermite"?3400:id==="sledge"?660:970;
      const r=this.startAbility(id,camera,p,now,duration,()=>{
        if(door){
          bars.breakAll(door);return{message:id.toUpperCase()+" · BARRICADE BREACHED"};
        }
        if(id==="thermite")panel.reinforced=false;
        const ok=panel.damage(500,true);
        return {message:ok?id.toUpperCase()+" · WALL BREACHED":"BREACH BLOCKED"};
      });
      if(r.ok)consume();
      return r;
    }
    if(id==="thatcher"){
      const r=this.startAbility(id,camera,{x,z},now,920,()=>{
        let disabled=0;
        for(const e of [...this.electronics,...this.sensors]){
          if(Math.hypot(e.x-x,e.z-z)<=9){e.disabledUntil=now+14000;disabled++;}
        }
        return {message:"EMP DETONATED · "+disabled+" DEVICES DISABLED"};
      });
      if(r.ok)consume();return r;
    }
    if(id==="twitch")return {ok:false,message:"TWITCH · USE THE DRONE DURING PREP · X PINGS"};
    if(id==="smoke")return this.throwSmoke(camera,player,now);
    if(id==="mute"){
      if(this.world.colliders.some(c=>c.maxY>.4&&c.minY<.6&&
        x>=c.minX-.32&&x<=c.maxX+.32&&z>=c.minZ-.32&&z<=c.maxZ+.32))
        return {ok:false,message:"JAMMER PLACEMENT BLOCKED · FACE OPEN FLOOR"};
      const r=this.startAbility(id,camera,{x,z},now,1250,()=>{
        this.deployJammer(x,z,"ally");
        return {message:"MUTE SIGNAL JAMMER ONLINE · DRONES DISRUPTED"};
      });
      if(r.ok)consume();
      return r;
    }
    if(id==="castle"){
      if(!opening)return {ok:false,message:"FACE AN EMPTY DOOR OR WINDOW"};
      if(bars.hasBarricade(opening))return {ok:false,message:"REMOVE EXISTING BARRICADE FIRST"};
      const r=this.startAbility(id,camera,{x:opening.x,z:opening.z},now,2150,()=>{
        const ok=bars.place(opening,true);
        return {message:ok?"CASTLE · ARMOR PANEL INSTALLED":"ARMOR PANEL BLOCKED"};
      });
      if(r.ok)consume();return r;
    }
    if(id==="pulse"){
      if(now-this.specialLastAt<2200)return {ok:false,message:"HEARTBEAT SENSOR COOLING DOWN"};
      this.specialLastAt=now;
      const targets=round?.bots?.filter(b=>b.alive&&Math.hypot(b.x-player.x,b.z-player.z)<13)||[];
      this.scanUntil=now+2000;
      return this.startAbility(id,camera,{x:player.x,z:player.z},now,340,()=>
        ({message:"HEARTBEAT SENSOR · "+targets.length+" SIGNALS WITHIN 13M"}));
    }
    if(id==="doc"){
      const ally=round?.allies?.filter(b=>b.alive&&b.health<b.healthMax&&
        Math.hypot(b.x-player.x,b.z-player.z)<5).sort((a,b)=>a.health-b.health)[0];
      if(player.health>=player.maxHealth&&!ally)
        return {ok:false,message:"NO INJURED OPERATOR IN RANGE"};
      const r=this.startAbility(id,camera,{x:player.x,z:player.z},now,860,()=>{
        if(ally?.alive)ally.health=Math.min(ally.healthMax,ally.health+55);
        else player.health=Math.min(player.maxHealth,player.health+55);
        return {message:"DOC STIM · "+(ally?.alive?"FRIENDLY HEALED":"SELF HEALED")};
      });
      if(r.ok)consume();return r;
    }
    return {ok:false,message:"OPERATOR ABILITY UNAVAILABLE"};
  }
  secondary(camera,player,now){
    if(this.counts.x<=0)return {ok:false,message:"NO SECONDARY GADGETS REMAIN"};
    if(!["recon","sensor"].includes(this.secondaryType)){
      const result=this.ordnance.use(this.secondaryType,camera,player,now);
      if(result.ok)this.counts.x--;
      return result;
    }
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
    this.sensors.push({x,z,group,team:"ally",armed:false,lastPing:0,
      hostileInside:false,disabledUntil:0});
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
  get busy(){return !!(this.action||this.specialAction||this.ordnance.pending);}
  get actionProgress(){return this.specialAction?.progress??this.action?.progress??(this.ordnance.pending?Math.min(1,(performance.now()-this.ordnance.pending.at)/(this.ordnance.pending.end-this.ordnance.pending.at)):0);}
  get currentAction(){return this.specialAction||this.action||this.ordnance.pending;}
  tick(now,player,ping,hostileBots=[]){
    this.hostiles=hostileBots;
    this.tickAbility(now,ping);
    this.tickSmokeProjectiles(now,ping);
    this.ordnance.tick(now,player,ping,this.world.round);
    if(this.action){
      const a=this.action;
      a.progress=Math.max(0,Math.min(1,(now-a.start)/3000));
      if(a.panel.destroyed){
        this.cancelAction();ping("REINFORCEMENT CANCELLED · PANEL DESTROYED");
      }else if(Math.hypot(player.x-a.panel.x,player.z-a.panel.z)>5.8||
        Math.abs((player.y||0)-(a.panel.y||0))>1.4){
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
    const round=this.world.round;
    for(const gas of this.gasFields){
      if(gas.active===false||gas.destroyed)continue;
      if(now>gas.end){gas.group.visible=false;continue;}
      if(now>=gas.nextTick){
        gas.nextTick=now+450;
        const targets=gas.team==="enemy"?
          (round?.role==="attacker"?round.allies:round.bots):
          (round?.role==="defender"?round.bots:round.allies);
        for(const enemy of targets||hostileBots)if(enemy.alive&&
          Math.hypot(enemy.x-gas.x,enemy.z-gas.z)<3.55)enemy.damage(7);
        if(round&&gas.team==="enemy"&&round.role==="attacker"&&
          round.playerAlive&&Math.hypot(player.x-gas.x,player.z-gas.z)<3.55)
          player.takeDamage(6);
      }
      if(gas.cloud){
        const life=Math.max(0,1-(gas.end-now)/10000);
        gas.cloud.scale.setScalar(1+Math.min(2.2,life*2.2));
        gas.cloud.material.opacity=Math.min(.23,Math.max(.025,
          Math.min(life*2,.96,(1-life)*5)*.22));
      }
    }
    for(const sensor of this.sensors){
      if((sensor.disabledUntil||0)>now)continue;
      const owner=sensor.team||"ally";
      const enemies=owner==="enemy"?
        (round?.role==="attacker"?round.allies:round.bots):
        (round?.role==="defender"?round.bots:round.allies);
      const nearPlayer=owner==="enemy"&&round?.role==="attacker"&&
        round.playerAlive&&Math.hypot(player.x-sensor.x,player.z-sensor.z)<4.75;
      const nearBot=(enemies||hostileBots).some(bot=>bot.alive&&
        Math.hypot(bot.x-sensor.x,bot.z-sensor.z)<4.75);
      const hostileInside=nearPlayer||nearBot;
      if(hostileInside&&!sensor.hostileInside&&now-sensor.lastPing>700){
        sensor.lastPing=now;
        ping(null,"proximity-beep");
        if(round)for(const defender of (owner==="enemy"?round.bots:round.allies))
          if(defender.alive){
            const intruder=(enemies||hostileBots).find(b=>b.alive&&
              Math.hypot(b.x-sensor.x,b.z-sensor.z)<4.75);
            defender.hearing=intruder?{x:intruder.x,z:intruder.z}:
              {x:player.x,z:player.z};
            defender.hearingUntil=now+3000;
          }
      }
      sensor.hostileInside=hostileInside;
    }
  }
  get smokeStatus(){
    return {armed:this.smokeCanisters.filter(d=>d.stage==="armed").length,
      flying:this.smokeCanisters.filter(d=>d.stage==="flying").length,
      active:this.smokeCanisters.filter(d=>d.stage==="active").length,
      remaining:this.specialCount};
  }
  get details(){
    const secondary=SECONDARY_KITS[this.role]?.find(item=>item.id===this.secondaryType);
    if(this.operator?.id==="smoke")
      return {g:"THROW GAS",x:secondary?.label||"PROX SENSOR",f:"REINFORCE PANEL",
        remote:"B · DETONATE LANDED CANISTERS"};
    const special=this.operator?.passive||"SPECIAL";
    return this.role==="attacker"?
      {g:special,x:secondary?.label||"RECON / UTILITY",f:"PLANT DEFUSER"}:
      {g:special,x:secondary?.label||"PROX SENSOR",f:"REINFORCE PANEL"};
  }
}
