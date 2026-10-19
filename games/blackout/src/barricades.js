// BLACKOUT V0.8 — physical wooden door/window barricades.
// Every visible plank has its own bullet mesh and matching player/AI collider.
export class Barricades {
  constructor(T,world,scene,openings=[]){
    this.T=T;this.world=world;this.scene=scene;
    this.openings=[];this.action=null;this.role="attacker";this.vaultCooldown=0;
    const wood=new T.MeshStandardMaterial({color:0x947255,roughness:.88,metalness:.04});
    const stripe=new T.MeshStandardMaterial({color:0xd8a846,roughness:.81,metalness:.05});
    const bolts=new T.MeshStandardMaterial({color:0x343f44,metalness:.65,roughness:.36});
    this.armoredMaterial=new T.MeshStandardMaterial({color:0x596877,metalness:.84,roughness:.36});
    this.configure=(entries)=>{
      // Regenerate map-specific boards. Old boards, meshes and collision
      // handles must never survive a SWITCHYARD <-> LAB map swap.
      for(const old of this.openings){
        for(const board of old.planks){
          const bi=this.world.shootables.indexOf(board.mesh);
          if(bi>=0)this.world.shootables.splice(bi,1);
          const ci=this.world.colliders.indexOf(board.collider);
          if(ci>=0)this.world.colliders.splice(ci,1);
          board.mesh.geometry?.dispose?.();
        }
        this.scene.remove(old.group);
      }
      this.openings.length=0;this.cancel();
      for(const item of entries){
      const o={...item,planks:[],active:false,group:new T.Group()};
      o.group.position.set(item.x,item.y||0,item.z);scene.add(o.group);
      const count=item.kind==="window"?4:6;
      const step=item.height/count;
      for(let i=0;i<count;i++){
        const y=item.bottom+(i+.5)*step;
        const alongX=item.axis==="z";
        const w=alongX?item.width-.04:.095;
        const d=alongX?.095:item.width-.04;
        const board=new T.Mesh(new T.BoxGeometry(w,step-.025,d),i%3===0?stripe:wood);
        board.position.y=y;
        o.group.add(board);
        const barWidth=alongX?item.width-.04:.025;
        const barDepth=alongX?.025:item.width-.04;
        if(i===1||i===count-2){
          const bar=new T.Mesh(new T.BoxGeometry(barWidth,.025,barDepth),bolts);
          bar.position.y=y;bar.visible=true;board.add(bar);
        }
        const c={minX:item.x-w/2,maxX:item.x+w/2,minZ:item.z-d/2,maxZ:item.z+d/2,
          minY:(item.y||0)+y-(step-.025)/2,
          maxY:(item.y||0)+y+(step-.025)/2,tag:"barricade",barricade:o};
        const plank={mesh:board,collider:c,hp:0,broken:true,originalMaterial:board.material};
        board.userData={kind:"barricade",barricade:o,plank,open:true};
        o.planks.push(plank);this.world.shootables.push(board);
      }
      o.group.visible=false;this.openings.push(o);
      }
      this.world.collisionRevision++;
    };
    this.configure(openings);
  }
  reset(role=this.role){
    this.cancel();this.role=role;
    for(const o of this.openings)this.breakAll(o,false);
    this.world.collisionRevision++;
  }
  hasBarricade(o){return o.planks.some(p=>!p.broken);}
  breakAll(o,bump=true){
    for(const p of o.planks){
      p.broken=true;p.hp=0;p.mesh.visible=false;
      const i=this.world.colliders.indexOf(p.collider);
      if(i>=0)this.world.colliders.splice(i,1);
    }
    o.group.visible=false;o.active=false;o.armored=false;
    if(bump)this.world.collisionRevision++;
  }
  place(o,armored=false){
    if(!o||this.hasBarricade(o))return false;
    o.armored=armored;
    o.group.visible=true;o.active=true;
    for(const p of o.planks){
      p.hp=armored?180:48;p.broken=false;p.mesh.visible=true;
      p.mesh.material=armored?this.armoredMaterial:p.originalMaterial;
      if(!this.world.colliders.includes(p.collider))this.world.colliders.push(p.collider);
    }
    this.world.collisionRevision++;return true;
  }
  hit(plank,damage){
    if(!plank||plank.broken)return false;
    plank.hp-=damage;
    if(plank.hp>0)return false;
    plank.broken=true;plank.mesh.visible=false;
    const i=this.world.colliders.indexOf(plank.collider);
    if(i>=0)this.world.colliders.splice(i,1);
    const o=plank.mesh.userData.barricade;
    o.active=this.hasBarricade(o);
    if(!o.active)o.group.visible=false;
    this.world.collisionRevision++;
    return true;
  }
  // The nearest opening must be in front of the player's facing direction.
  nearest(player,dist=2.45){
    let chosen=null,best=dist;
    for(const o of this.openings){
      const dx=o.x-player.x,dz=o.z-player.z;
      const d=Math.hypot(dx,dz);
      if(d>.001&&d<best&&Math.abs((player.y||0)-(o.y||0))<1.3){
        // Avoid sealing a fresh wooden barrier through the player's own
        // capsule when they're standing in the threshold.
        const sideDist=Math.abs(o.axis==="z"?player.z-o.z:player.x-o.x);
        if(sideDist<.46)continue;
        const f=(-Math.sin(player.yaw)*dx-Math.cos(player.yaw)*dz)/d;
        if(f<.22)continue;
        best=d;chosen=o;
      }
    }
    return chosen;
  }
  interact(player,now){
    if(this.action)return {ok:false,message:"BARRICADE INTERACTION IN PROGRESS"};
    const o=this.nearest(player);
    if(!o)return {ok:false,message:"NO BARRICADABLE OPENING IN FRONT"};
    const active=this.hasBarricade(o);
    if(!active&&this.role!=="defender")
      return {ok:false,message:"ONLY DEFENDERS INSTALL BARRICADES"};
    this.action={opening:o,kind:active?"remove":"install",end:now+(active?1450:2500),start:now};
    return {ok:true,message:(active?"REMOVING":"INSTALLING")+" "+o.kind.toUpperCase()+" BARRICADE · HOLD F"};
  }
  cancel(){this.action=null;}
  get busy(){return !!this.action;}
  get progress(){return this.action?Math.max(0,Math.min(1,(this.lastNow-this.action.start)/(this.action.end-this.action.start))):0;}
  tick(now,held,player,ping){
    this.lastNow=now;
    const a=this.action;if(!a)return;
    if(!held||Math.hypot(player.x-a.opening.x,player.z-a.opening.z)>2.8||
      Math.abs((player.y||0)-(a.opening.y||0))>1.3){
      this.cancel();ping("BARRICADE ACTION CANCELLED");return;
    }
    if(now<a.end)return;
    const ok=a.kind==="install"?this.place(a.opening):true;
    if(a.kind==="remove")this.breakAll(a.opening);
    ping(ok?(a.kind==="install"?"BARRICADE INSTALLED":"BARRICADE REMOVED"):
      "BARRICADE UNAVAILABLE","barricade");
    this.cancel();
  }
  // Vaults are available only through unbarricaded, real side-window cutouts.
  vault(player,now){
    if(now<this.vaultCooldown)return false;
    for(const o of this.openings){
      if(o.kind!=="window"||this.hasBarricade(o))continue;
      if(Math.abs((player.y||0)-(o.y||0))>1.1)continue;
      if(Math.abs(player.z-o.z)>o.width*.5-.34)continue;
      if(Math.abs(player.x-o.x)>1.35)continue;
      if(Math.abs(player.x-o.x)<.035)continue;
      const nx=o.x+(player.x<o.x?1.05:-1.05);
      if(player.blocked(nx,o.z,o.y||0,player.height,player.radius))continue;
      if(!player.startVault?.(nx,o.z))continue;
      this.vaultCooldown=now+1150;return true;
    }
    return false;
  }
  get info(){return this.openings.map(o=>({id:o.id,kind:o.kind,active:this.hasBarricade(o),
    intact:o.planks.filter(p=>!p.broken).length,total:o.planks.length}));}
}
