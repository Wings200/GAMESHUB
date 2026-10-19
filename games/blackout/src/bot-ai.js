// BLACKOUT V0.7 — collision-aware indoor AI navigation and detailed enemy rig.
// Grid navigation uses the very same colliders as the player's character.
const GRID=1,MINX=-19,MAXX=19,MINZ=-65,MAXZ=25;
const WIDTH=(MAXX-MINX)+1,HEIGHT=(MAXZ-MINZ)+1;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function collisionAt(world,x,z,r=.38,ignoreDoorBarricades=false){
  return world.colliders.find(a=>{
    if(ignoreDoorBarricades&&a.tag==="barricade"&&a.barricade?.kind==="door")return false;
    return a.maxY>.42&&a.minY<1.6&&
      x>=a.minX-r&&x<=a.maxX+r&&z>=a.minZ-r&&z<=a.maxZ+r;
  })||null;
}
function blocked(world,x,z,r=.38,ignoreDoorBarricades=false){
  return !!collisionAt(world,x,z,r,ignoreDoorBarricades);
}
const toGrid=(x,z)=>[clamp(Math.round(x-MINX),0,WIDTH-1),
  clamp(Math.round(z-MINZ),0,HEIGHT-1)];
const toWorld=(a,b)=>({x:MINX+a,z:MINZ+b});
const hash=(a,b)=>b*WIDTH+a;
// Static geometry is expensive to test thousands of times during every A*.
// Cache a collision occupancy grid by world collision revision. A damaged
// barricade or breached wall bumps the revision, regenerating exactly once.
const occupancyCache=new WeakMap();
function occupancy(world){
  const cached=occupancyCache.get(world);
  if(cached&&cached.revision===world.collisionRevision&&
      cached.colliderCount===world.colliders.length)return cached.data;
  const data=new Uint8Array(WIDTH*HEIGHT);
  // Expand each wall collider by the bot radius and paint occupied cells.
  // Narrow geometries still resolve through the same blocked() test.
  for(let gz=0;gz<HEIGHT;gz++)for(let gx=0;gx<WIDTH;gx++){
    const pos=toWorld(gx,gz);
    // Wooden DOOR barricades can be shot away, so route THROUGH their
    // openings during planning. Actual movement still collides until
    // enough planks have been destroyed. Windows still block foot travel.
    data[hash(gx,gz)]=Number(blocked(world,pos.x,pos.z,.38,true));
  }
  occupancyCache.set(world,{revision:world.collisionRevision,
    colliderCount:world.colliders.length,data});
  return data;
}
export function findTacticalPath(world,from,to){
  const [ax,az]=toGrid(from.x,from.z);
  const grid=occupancy(world);
  let [bx,bz]=toGrid(to.x,to.z);
  // Never deliberately route into a solid desk, bomb unit or blocked corner.
  // Find the nearest available standing square if the requested square is
  // occupied; a goal behind a removable door is still traversable.
  if(grid[hash(bx,bz)]){
    let best=null,bestD=Infinity;
    for(let r=1;r<=5;r++){
      for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){
        const gx=bx+dx,gz=bz+dz;
        if(gx<0||gz<0||gx>=WIDTH||gz>=HEIGHT||grid[hash(gx,gz)])continue;
        const d=Math.hypot(dx,dz);
        if(d<bestD){best={x:gx,z:gz};bestD=d;}
      }
      if(best)break;
    }
    if(best){bx=best.x;bz=best.z;}
  }
  const s=hash(ax,az),g=hash(bx,bz);
  const exactGoal=grid[hash(...toGrid(to.x,to.z))]===0;
  const destination=exactGoal?to:toWorld(bx,bz);
  if(s===g)return [destination];
  const best=new Float64Array(WIDTH*HEIGHT);best.fill(Infinity);
  const parents=new Int32Array(WIDTH*HEIGHT);parents.fill(-1);
  best[s]=0;
  const open=[{x:ax,z:az,k:s,f:Math.hypot(bx-ax,bz-az)}];
  const closed=new Uint8Array(WIDTH*HEIGHT);
  let found=false,iterations=0;
  const directions=[[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
  while(open.length&&iterations++<3200){
    let low=0;
    for(let i=1;i<open.length;i++)if(open[i].f<open[low].f)low=i;
    const node=open.splice(low,1)[0];
    if(closed[node.k])continue;
    if(node.k===g){found=true;break;}
    closed[node.k]=1;
    for(const [dx,dz] of directions){
      const nx=node.x+dx,nz=node.z+dz;
      if(nx<0||nz<0||nx>=WIDTH||nz>=HEIGHT)continue;
      const nk=hash(nx,nz);
      if(closed[nk])continue;
      if(nk!==g&&grid[nk])continue;
      // Don't cut around wall corners through diagonals.
      if(dx&&dz){
        if(grid[hash(node.x+dx,node.z)]||
           grid[hash(node.x,node.z+dz)])continue;
      }
      const cost=best[node.k]+(dx&&dz?1.414:1);
      if(cost>=best[nk])continue;
      parents[nk]=node.k;best[nk]=cost;
      open.push({x:nx,z:nz,k:nk,f:cost+Math.hypot(bx-nx,bz-nz)});
    }
  }
  if(!found)return [];
  const result=[destination];
  let cursor=g;
  while(cursor!==s&&parents[cursor]>=0){
    cursor=parents[cursor];
    const x=cursor%WIDTH,z=Math.floor(cursor/WIDTH);
    if(cursor!==s)result.push(toWorld(x,z));
    if(result.length>400)break;
  }
  result.reverse();
  // Skip long straight waypoint chains while preserving collision-safe bends.
  const compact=[];
  for(let i=0;i<result.length;i++){
    const prev=result[i-1],at=result[i],next=result[i+1];
    if(prev&&next){
      const a=Math.atan2(at.z-prev.z,at.x-prev.x),b=Math.atan2(next.z-at.z,next.x-at.x);
      if(Math.abs(a-b)<.02)continue;
    }
    compact.push(at);
  }
  return compact;
}
export function advanceTacticalBot(bot,goal,world,dt,now){
  const changingGoal=!bot.lastGoal||Math.hypot(bot.lastGoal.x-goal.x,bot.lastGoal.z-goal.z)>1.4;
  if(bot.blockingBarricade&&!world.barricades?.hasBarricade(bot.blockingBarricade))
    bot.blockingBarricade=null;
  // Never perform a full A* search every frame for an unreachable goal.
  // A failed route is cached until its retry deadline or a collision change.
  const changedWorld=bot.collisionRevision!==world.collisionRevision;
  if(changingGoal||changedWorld||now>=bot.repathAt){
    bot.path=findTacticalPath(world,bot,goal);
    if(changedWorld)bot.blockingBarricade=null;
    bot.repathAt=now+(bot.path.length?1600:2600)+(bot.id%3)*270;
    bot.lastGoal={...goal};
    bot.collisionRevision=world.collisionRevision;
  }
  while(bot.path.length&&Math.hypot(bot.x-bot.path[0].x,bot.z-bot.path[0].z)<.52)
    bot.path.shift();
  const dest=bot.path[0];
  if(!dest)return 0;
  const dx=dest.x-bot.x,dz=dest.z-bot.z,len=Math.hypot(dx,dz);
  if(len<.03)return 0;
  const step=Math.min(len,dt*bot.walkSpeed);
  const nx=bot.x+dx/len*step,nz=bot.z+dz/len*step;
  const collision=collisionAt(world,nx,nz,.34);
  if(collision){
    if(collision.tag==="barricade"&&collision.barricade?.kind==="door"){
      // Don't forget the route: stand at this doorway and shoot the boards.
      // This also prevents infinite loops in a corner when every entrance
      // has been barricaded.
      bot.blockingBarricade=collision.barricade;
      bot.state="breaching";
      return 0;
    }
    // A solid obstacle has appeared, or the grid-to-world turn was too
    // tight. Replan and try a physical sidestep (never through colliders).
    bot.path=[];bot.repathAt=now+850;
    const sign=bot.id%2?-1:1;
    const sidestep=Math.min(.12,dt*bot.walkSpeed);
    for(const side of [sign,-sign]){
      const ex=bot.x+(-dz/len)*sidestep*side;
      const ez=bot.z+(dx/len)*sidestep*side;
      if(!blocked(world,ex,ez,.34)){
        bot.x=ex;bot.z=ez;bot.group.position.set(ex,0,ez);
        return sidestep/Math.max(dt,.001);
      }
    }
    return 0;
  }
  bot.blockingBarricade=null;
  bot.x=nx;bot.z=nz;bot.group.position.set(nx,0,nz);
  bot.group.rotation.y=Math.atan2(-dx,-dz);
  return step/Math.max(.001,dt);
}
export function makeTacticalBot(T,scene,world,id,x,z,stationary=false,team="enemy"){
  const group=new T.Group();group.position.set(x,0,z);scene.add(group);
  const shell=new T.MeshStandardMaterial({color:team==="ally"?0x376879:0x68483a,roughness:.79,metalness:.05});
  const vest=new T.MeshStandardMaterial({color:team==="ally"?0x214453:0x26343c,roughness:.86,metalness:.25});
  const helmet=new T.MeshStandardMaterial({color:team==="ally"?0x32505c:0x353b34,roughness:.72,metalness:.25});
  const skin=new T.MeshStandardMaterial({color:0xbd896d,roughness:.9});
  const muzzleMaterial=new T.MeshBasicMaterial({color:0xffc782,transparent:true,opacity:.9});
  const parts=[];
  function box(parent,w,h,d,px,py,pz,material){
    const m=new T.Mesh(new T.BoxGeometry(w,h,d),material);
    m.position.set(px,py,pz);parent.add(m);parts.push(m);return m;
  }
  function cylinder(parent,r1,r2,h,x,y,z,material){
    const m=new T.Mesh(new T.CylinderGeometry(r1,r2,h,10),material);
    m.position.set(x,y,z);parent.add(m);parts.push(m);return m;
  }
  const body=box(group,.69,.90,.39,0,1.32,0,shell);
  const armor=box(group,.69,.63,.43,0,1.34,-.04,vest);
  for(const ax of [-1,1]){
    box(group,.18,.56,.15,ax*.24,1.32,-.27,vest);
    box(group,.12,.25,.07,ax*.23,1.37,-.37,shell);
  }
  const head=new T.Mesh(new T.SphereGeometry(.23,12,10),skin);
  head.position.set(0,2.10,0);group.add(head);parts.push(head);
  box(group,.49,.17,.47,0,2.24,.03,helmet);
  box(group,.44,.13,.1,0,2.12,-.20,helmet);
  const leftLeg=new T.Group(),rightLeg=new T.Group();
  for(const [g,side] of [[leftLeg,-1],[rightLeg,1]]){
    group.add(g);g.position.set(side*.20,.91,0);
    box(g,.22,.53,.26,0,-.26,0,shell);
    box(g,.21,.30,.21,0,-.62,0,vest);
    box(g,.24,.13,.39,0,-.78,-.09,helmet);
  }
  const leftArm=new T.Group(),rightArm=new T.Group();
  for(const [g,side] of [[leftArm,-1],[rightArm,1]]){
    group.add(g);g.position.set(side*.45,1.70,0);
    box(g,.22,.59,.24,0,-.30,-.12,shell);
    box(g,.17,.18,.17,0,-.60,-.20,skin);
  }
  // Silhouette gun and optic, oriented along the bot's local -Z.
  box(group,.12,.14,.66,.05,1.42,-.44,vest);
  box(group,.045,.035,.33,.05,1.44,-.91,helmet);
  box(group,.09,.1,.13,.05,1.55,-.41,helmet);
  const muzzle=new T.Mesh(new T.SphereGeometry(.055,8,6),muzzleMaterial);
  muzzle.position.set(.05,1.44,-1.10);group.add(muzzle);muzzle.visible=false;
  const shadow=new T.Mesh(new T.CircleGeometry(.43,18),
    new T.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.22,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2;shadow.position.y=.012;group.add(shadow);
  const bot={id,team,group,body,head,hitboxes:[body,head],x,z,
    health:100,alive:true,stationary,healthMax:100,
    armor,walkSpeed:2.1+(id%3)*.19,nextShot:0,working:0,
    path:[],lastGoal:null,repathAt:0,collisionRevision:-1,blockingBarricade:null,state:stationary?"hold":"approach",
    hearing:null,hearingUntil:0,suppressedUntil:0,hitAt:0,lastShotAt:0,
    nextSightAt:0,sightCache:false,visibleTarget:null,coverUntil:0,lastSeen:null,
    moved:0,movePhase:0,muzzle,
    damage(amount){
      if(!this.alive)return false;
      this.health=Math.max(0,this.health-amount);
      this.hitAt=performance.now();
      this.suppressedUntil=this.hitAt+1400;
      // armor is a THREE.Mesh. The material owns the Color, not the mesh.
      // Previously armor.color was undefined, which threw on EVERY bot hit,
      // stopped automatic firing and skipped the hit confirmation.
      armor.material.color.setHex(team==="ally"?0x356675:0x665049);
      if(!this.health){
        this.alive=false;this.group.visible=false;
        return true;
      }
      return false;
    },
    animate(dt,now,movement=0){
      this.movePhase+=dt*Math.max(0,movement)*3.5;
      const wave=Math.sin(this.movePhase)*Math.min(.55,movement*.18);
      leftLeg.rotation.x=wave;rightLeg.rotation.x=-wave;
      leftArm.rotation.x=-wave*.45;rightArm.rotation.x=wave*.45;
      const recoil=Math.max(0,1-(now-this.lastShotAt)/170);
      body.rotation.x=-recoil*.055;
      this.muzzle.visible=recoil>.7;
    }
  };
  // V0.9.2: Combat volumes cover the entire visible silhouette. The old
  // raycast only checked the thin core torso and naked head, even though the
  // player was clearly shooting the helmet, vest, arms and legs.
  //
  // Transparent hit regions take no render space, follow the animated limbs,
  // and are resolved in the same raycast as walls and barricades.
  const hitMaterial=new T.MeshBasicMaterial({
    color:0xffffff,transparent:true,opacity:0,depthWrite:false,
    depthTest:false,side:T.DoubleSide
  });
  function addHitVolume(parent,w,h,d,x,y,z,hitZone="body"){
    const volume=new T.Mesh(new T.BoxGeometry(w,h,d),hitMaterial);
    volume.position.set(x,y,z);
    volume.userData={kind:"bot",bot,hitZone};
    parent.add(volume);
    bot.hitboxes.push(volume);
    world.shootables.push(volume);
  }
  // Head volume also covers the helmet and its visor.
  addHitVolume(group,.54,.48,.54,0,2.14,0,"head");
  // Vest, armor plates and pelvis (close to their visible model limits).
  addHitVolume(group,.85,1.07,.57,0,1.37,-.06);
  for(const [arm,side] of [[leftArm,-1],[rightArm,1]])
    addHitVolume(arm,.28,.73,.32,0,-.33,-.12);
  for(const [leg,side] of [[leftLeg,-1],[rightLeg,1]])
    addHitVolume(leg,.29,.94,.36,0,-.41,-.035);

  // Original torso and face meshes stay hittable as well.
  body.userData={kind:"bot",bot,hitZone:"body"};
  head.userData={kind:"bot",bot,hitZone:"head"};
  world.shootables.push(body,head);
  return bot;
}
