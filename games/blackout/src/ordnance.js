import {stepThrowable} from "./throw-physics.js?v=blackout-v320-ballistics-breakable-walls";
// BLACKOUT V3.3: offline PvE secondary utility sandbox.
// Shared physics; tactical blast LOS; finite ammo; shootable persistent tools.
// These are game-world interactions, not server-authoritative multiplayer.
export const SECONDARY_KITS=Object.freeze({
  attacker:Object.freeze([
    {id:"recon",label:"RECON PULSE",count:2},
    {id:"frag",label:"FRAG GRENADE",count:2},
    {id:"stun",label:"FLASHBANG",count:2},
    {id:"claymore",label:"CLAYMORE",count:1}
  ]),
  defender:Object.freeze([
    {id:"sensor",label:"PROXIMITY ALARM",count:2},
    {id:"c4",label:"REMOTE C4",count:1},
    {id:"impact",label:"IMPACT GRENADE",count:2}
  ])
});
export function occluded(colliders,from,to){
  const d={x:to.x-from.x,y:to.y-from.y,z:to.z-from.z};
  for(const c of colliders){
    if(c.tag==="floor-base"||c.maxY<=.08)continue;
    let near=0,far=1;
    for(const [axis,lo,hi] of [["x",c.minX,c.maxX],["y",c.minY,c.maxY],
      ["z",c.minZ,c.maxZ]]){
      if(Math.abs(d[axis])<1e-8){
        if(from[axis]<=lo||from[axis]>=hi){far=-1;break}
        continue;
      }
      const a=(lo-from[axis])/d[axis],b=(hi-from[axis])/d[axis];
      near=Math.max(near,Math.min(a,b));
      far=Math.min(far,Math.max(a,b));
    }
    if(far>near&&near<.98&&far>.02)return true;
  }
  return false;
}
export function radialFactor(dist,radius){
  if(dist>=radius)return 0;
  return Math.max(0,1-dist/radius)**1.15;
}
export class Ordnance{
  constructor(T,world,scene){
    this.T=T;this.world=world;this.scene=scene;
    this.devices=[];this.effects=[];this.pending=null;
    this.flashUntil=0;this.flashIntensity=0;this.flashStarted=0;
    this.onEffect=null;
  }
  reset(){
    if(this.pending)this.removeMesh(this.pending.group);
    this.pending=null;
    for(const d of this.devices)this.cleanupDevice(d);
    this.devices=[];
    for(const fx of this.effects)this.removeMesh(fx.group);
    this.effects=[];
    this.flashUntil=0;this.flashStarted=0;this.flashIntensity=0;
  }
  removeMesh(mesh){
    mesh?.parent?.remove(mesh);
    mesh?.traverse(o=>{if(o.isMesh){
      o.geometry?.dispose?.();o.material?.dispose?.();
    }});
  }
  cleanupDevice(d){
    if(!d||d.removed)return;
    d.removed=true;
    const idx=this.world.shootables.indexOf(d.body);
    if(idx>=0)this.world.shootables.splice(idx,1);
    this.removeMesh(d.group);
  }
  damageDevice(d,damage){
    if(!d||d.removed||d.state==="spent")return false;
    d.hp-=damage;
    if(d.hp>0)return false;
    this.cleanupDevice(d);
    return true;
  }
  placement(camera,player){
    const forward=new this.T.Vector3();
    if(camera?.getWorldDirection)camera.getWorldDirection(forward);
    else forward.set(-Math.sin(player.yaw),0,-Math.cos(player.yaw));
    const planar=Math.hypot(forward.x,forward.z)||1;
    const dx=forward.x/planar,dz=forward.z/planar;
    const origin=new this.T.Vector3();
    if(camera?.getWorldPosition)camera.getWorldPosition(origin);
    else origin.set(player.x,player.y+(player.eyeHeight||1.6),player.z);
    return {dx,dz,forward,origin};
  }
  clearSpot(x,z,r=.42){
    return !this.world.colliders.some(c=>c.maxY>.16&&c.minY<.44&&
      x>c.minX-r&&x<c.maxX+r&&z>c.minZ-r&&z<c.maxZ+r);
  }
  use(type,camera,player,now){
    if(this.pending)return {ok:false,message:"FINISH THROWING THE CURRENT GADGET"};
    if(!["frag","stun","impact","c4","claymore"].includes(type))
      return {ok:false,message:"NO EQUIPMENT SELECTED"};
    const target=this.placement(camera,player);
    if(type==="claymore"){
      const x=player.x+target.dx*1.15,z=player.z+target.dz*1.15;
      if(!this.clearSpot(x,z))return {ok:false,message:"CLAYMORE NEEDS CLEAR FLOOR"};
      this.placeClaymore(x,z,player.yaw,now);
      return {ok:true,message:"CLAYMORE PLACED · ARMING LASER TRIPWIRE",event:"deploy"};
    }
    const T=this.T,group=new T.Group();
    camera.add(group);group.position.set(.31,-.33,-.60);
    const mesh=new T.Mesh(new T.SphereGeometry(.105,10,8),
      new T.MeshStandardMaterial({color:type==="stun"?0xd0d7d8:
        type==="frag"?0x4e6651:type==="c4"?0x527085:0x73634c,
        roughness:.44,metalness:.61}));
    group.add(mesh);
    this.pending={type,group,mesh,at:now,end:now+290,
      camera,player,origin:target.origin};
    return {ok:true,message:type.toUpperCase()+" · THROWING",event:"gadget-throw"};
  }
  makeDevice(type,x,y,z,now){
    const T=this.T,group=new T.Group();
    group.position.set(x,y,z);this.scene.add(group);
    const mat=new T.MeshStandardMaterial({color:type==="stun"?0xe4dfc5:
      type==="frag"?0x667a51:type==="impact"?0xab7149:0x457084,
      metalness:.45,roughness:.52});
    const body=new T.Mesh(type==="c4"?new T.BoxGeometry(.32,.12,.26):
      new T.CylinderGeometry(.11,.12,.24,12),mat);
    body.rotation.z=Math.PI/2;group.add(body);
    const led=new T.Mesh(new T.SphereGeometry(.035,8,6),
      new T.MeshBasicMaterial({color:0xe9a35a}));
    led.position.set(0,.13,0);group.add(led);
    const device={type,group,body,led,x,y,z,vx:0,vy:0,vz:0,
      created:now,last:now,bounces:0,resting:false,
      state:"flying",armedAt:0,detonateAt:type==="frag"?now+3200:
        type==="stun"?now+2250:Infinity,
      hp:type==="c4"?35:18,removed:false};
    body.userData={kind:"ordnance",device};
    this.world.shootables.push(body);this.devices.push(device);
    return device;
  }
  release(pending,now){
    const {dx,dz,forward,origin}=this.placement(pending.camera,pending.player);
    const x=origin.x+dx*.48,z=origin.z+dz*.48,y=Math.max(.33,origin.y-.20);
    const device=this.makeDevice(pending.type,x,y,z,now);
    device.vx=dx*(pending.type==="c4"?8.5:12);
    device.vz=dz*(pending.type==="c4"?8.5:12);
    device.vy=3.1+Math.max(-.6,Math.min(.6,forward.y))*5;
    return device;
  }
  placeClaymore(x,z,yaw,now){
    const T=this.T,group=new T.Group();this.scene.add(group);
    group.position.set(x,.14,z);group.rotation.y=yaw;
    const body=new T.Mesh(new T.BoxGeometry(.39,.26,.19),
      new T.MeshStandardMaterial({color:0x61756a,metalness:.43,roughness:.5}));
    group.add(body);
    const lasers=[];
    for(const side of [-1,0,1]){
      const beam=new T.Mesh(new T.BoxGeometry(.016,.016,3.8),
        new T.MeshBasicMaterial({color:0xf34934,transparent:true,opacity:.52}));
      beam.position.set(side*.32,.12,-1.95);
      beam.rotation.y=side*.13;group.add(beam);lasers.push(beam);
    }
    const d={type:"claymore",group,body,lasers,x,y:.14,z,
      yaw,dirX:-Math.sin(yaw),dirZ:-Math.cos(yaw),state:"arming",
      created:now,armedAt:now+1150,hp:42,removed:false};
    body.userData={kind:"ordnance",device:d};
    this.devices.push(d);this.world.shootables.push(body);
    return d;
  }
  remoteC4(now){
    const ready=this.devices.filter(d=>d.type==="c4"&&d.state==="armed"&&!d.removed);
    if(!ready.length)return {ok:false,message:this.devices.some(d=>d.type==="c4"&&d.state==="flying")?
      "WAIT FOR C4 TO LAND AND ARM":"NO ARMED C4 · PRESS X TO THROW"};
    for(const d of ready)this.explode(d,now);
    return {ok:true,message:"C4 REMOTE DETONATION · "+ready.length+" CHARGE(S)",
      event:"gadget-blast"};
  }
  enemies(round){
    if(!round)return [];
    return round.bots||[];
  }
  lineClear(from,to){
    return !occluded(this.world.colliders,from,to);
  }
  affectUnits(d,kind,now,player,round){
    const flash=kind==="stun",radius=flash?10:kind==="claymore"?5.2:
      kind==="c4"?6.5:kind==="impact"?3.5:5.6;
    const base=kind==="c4"?135:kind==="claymore"?116:
      kind==="impact"?75:115;
    // Both AI teams participate. Friendly-fire is possible in the lab.
    for(const unit of [...(round?.bots||[]),...(round?.allies||[])]){
      if(!unit.alive)continue;
      const dist=Math.hypot(unit.x-d.x,unit.z-d.z);
      if(dist>=radius||!this.lineClear({x:d.x,y:.9,z:d.z},
        {x:unit.x,y:1.15,z:unit.z}))continue;
      const strength=radialFactor(dist,radius);
      if(flash){unit.blindedUntil=Math.max(unit.blindedUntil||0,now+800+strength*3200);}
      else unit.damage(Math.round(base*strength));
    }
    if(player?.health>0){
      const dist=Math.hypot(player.x-d.x,player.z-d.z);
      if(dist<radius&&this.lineClear({x:d.x,y:.9,z:d.z},
        {x:player.x,y:player.y+(player.eyeHeight||1.5)*.65,z:player.z})){
        const strength=radialFactor(dist,radius);
        if(flash){
          this.flashStarted=now;this.flashIntensity=Math.min(1,.3+strength*.8);
          this.flashUntil=now+700+strength*2800;
        }else player.takeDamage(Math.round(base*strength));
      }
    }
    // Frag and C4 may break soft panels and wooden boards, but not
    // magically erase reinforcements.
    if(!flash){
      for(const panel of this.world.panels||[]){
        if(panel.destroyed||panel.reinforced||Math.hypot(panel.x-d.x,panel.z-d.z)>radius*.66)
          continue;
        if(!this.lineClear({x:d.x,y:1.1,z:d.z},
          {x:panel.x,y:1.1,z:panel.z}))continue;
        if(kind!=="impact")panel.damage(500,true);
      }
    }
  }
  explosionFx(d,now,flash=false){
    const T=this.T,group=new T.Group();this.scene.add(group);
    group.position.set(d.x,.9,d.z);
    const material=new T.MeshBasicMaterial({color:flash?0xffffff:0xffa457,
      transparent:true,opacity:.78,depthWrite:false});
    const sphere=new T.Mesh(new T.SphereGeometry(.20,12,9),material);
    group.add(sphere);
    const fx={group,sphere,material,start:now,end:now+(flash?480:390)};
    this.effects.push(fx);
    return fx;
  }
  explode(d,now,player=null,round=null,notify=()=>{}){
    if(!d||d.removed)return;
    const kind=d.type;
    this.cleanupDevice(d);
    this.explosionFx(d,now,kind==="stun");
    // Both remote C4 and automatic fuses must use the same damage path.
    const p=player||this.lastPlayer,r=round||this.world.round;
    this.affectUnits(d,kind,now,p,r);
    notify(kind==="stun"?"FLASHBANG DETONATED":
      kind==="claymore"?"CLAYMORE TRIPPED":
      kind==="impact"?"IMPACT GRENADE DETONATED":
      kind==="frag"?"FRAG DETONATED":"C4 DETONATED",
      kind==="stun"?"gadget-flash":"gadget-blast");
  }
  tick(now,player,notify=()=>{},round=this.world.round){
    this.lastPlayer=player;
    if(this.pending){
      const a=this.pending,p=Math.max(0,Math.min(1,(now-a.at)/290));
      a.group.rotation.x=-Math.sin(Math.PI*p)*.95;
      a.group.position.y=-.33+Math.sin(Math.PI*p)*.17;
      if(now>=a.end){
        this.pending=null;
        this.release(a,now);this.removeMesh(a.group);
        notify(a.type.toUpperCase()+" RELEASED","gadget-throw");
      }
    }
    for(const d of this.devices){
      if(d.removed)continue;
      if(d.state==="flying"){
        const dt=Math.min(.08,Math.max(0,(now-d.last)/1000));
        d.last=now;
        const preBounces=d.bounces;
        stepThrowable(d,this.world.colliders,dt);
        d.group.position.set(d.x,d.y,d.z);
        d.body.rotation.x+=dt*6;d.body.rotation.z+=dt*5;
        if(d.type==="impact"&&d.bounces>preBounces){
          this.explode(d,now,player,round,notify);continue;
        }
        if(d.resting||now-d.created>4600){
          d.state=d.type==="frag"||d.type==="stun"?"counting":"armed";
          d.resting=true;
          d.vx=d.vy=d.vz=0;
          d.armedAt=now;
          d.led.material.color.setHex(0x63efbf);
          if(d.type==="c4")notify("C4 ARMED · PRESS B TO DETONATE");
        }
      }else if(d.state==="arming"&&now>=d.armedAt){
        d.state="armed";
        notify("CLAYMORE ARMED · LASER ACTIVE");
      }
      if(!d.removed&&(d.type==="frag"||d.type==="stun")&&now>=d.detonateAt)
        this.explode(d,now,player,round,notify);
      if(!d.removed&&d.type==="claymore"&&d.state==="armed"){
        for(const enemy of this.enemies(round)){
          if(!enemy.alive)continue;
          const dx=enemy.x-d.x,dz=enemy.z-d.z;
          const ahead=dx*d.dirX+dz*d.dirZ;
          const lateral=Math.abs(dx*d.dirZ-dz*d.dirX);
          if(ahead>0&&ahead<4.0&&lateral<.85+ahead*.18&&
            this.lineClear({x:d.x,y:.7,z:d.z},
              {x:enemy.x,y:1.1,z:enemy.z})){
            this.explode(d,now,player,round,notify);break;
          }
        }
      }
    }
    for(let i=this.effects.length-1;i>=0;i--){
      const fx=this.effects[i],progress=(now-fx.start)/(fx.end-fx.start);
      if(progress>=1){this.removeMesh(fx.group);this.effects.splice(i,1);continue;}
      fx.sphere.scale.setScalar(1+progress*(fx.material.color&&fx.end-fx.start>450?28:20));
      fx.material.opacity=.78*(1-progress);
    }
    // Reuse bounded memory: destroyed devices are removed on the next tick.
    this.devices=this.devices.filter(d=>!d.removed);
  }
  get flashOpacity(){return this.flashIntensity}
  get armedC4(){return this.devices.filter(d=>d.type==="c4"&&d.state==="armed"&&!d.removed).length}
  get count(){return this.devices.length}
}
