// BLACKOUT V2 — real attacker preparation reconnaissance.
// While drone-controlled, the operator has NOT spawned into the map yet.
// Camera is attached to a small independently moving ground drone.
export function createReconDrone(T,scene,world,camera){
  const body=new T.Group();scene.add(body);body.visible=false;
  // The physical drone is a shootable world actor. Rendering briefly
  // hides it from its OWN camera only, never from the world or defenders.
  const hitMeshes=[];
  const shell=new T.MeshStandardMaterial({color:0x20292f,metalness:.63,roughness:.52});
  const rubber=new T.MeshStandardMaterial({color:0x111619,roughness:.94});
  const lens=new T.MeshBasicMaterial({color:0x61e5ee});
  const cube=(x,y,z,w,h,d,mat)=>{
    const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);
    m.position.set(x,y,z);body.add(m);hitMeshes.push(m);return m;
  };
  cube(0,.10,0,.30,.16,.42,shell);
  for(const x of [-.19,.19])for(const z of [-.145,.145]){
    const wheel=new T.Mesh(new T.CylinderGeometry(.085,.085,.045,12),rubber);
    wheel.rotation.z=Math.PI/2;wheel.position.set(x,.092,z);body.add(wheel);
    hitMeshes.push(wheel);
  }
  cube(0,.225,-.18,.12,.065,.05,lens);
  let x=0,z=-15.8,yaw=0,pitch=0,active=false;
  let destroyed=false,health=35,lastDamageAt=-Infinity;
  let remaining=2,deployments=0;
  const device={get active(){return active},get destroyed(){return destroyed},
    get health(){return health},get position(){return {x,z}}};
  for(const mesh of hitMeshes){
    mesh.userData={kind:"drone",drone:device};
    world.shootables.push(mesh);
  }
  function damage(amount,now=performance.now()){
    if(!active||destroyed||!(amount>0))return false;
    health=Math.max(0,health-amount);lastDamageAt=now;
    if(health<=0){
      destroyed=true;active=false;body.visible=false;
      for(const fx of dartTraces){
        scene.remove(fx.line);fx.line.geometry.dispose();fx.line.material.dispose();
      }
      dartTraces.length=0;
      return true;
    }
    return false;
  }
  function reset(){
    end();destroyed=false;health=35;remaining=2;deployments=0;
  }
  // In the camera render pass ONLY, avoid drawing the shell/lens
  // sitting centimeters ahead of the camera. Afterwards restore it
  // so world raycasts and enemies continue seeing the real model.
  function concealForOwnCamera(){
    if(!active||destroyed)return ()=>{};
    const wasVisible=body.visible;
    body.visible=false;
    return ()=>{body.visible=wasVisible&&active&&!destroyed;};
  }
  let lastPing=0,jammed=false,pingCount=0;
  const dartTraces=[];
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const scanRay=new T.Raycaster();
  function contactVisible(bot){
    const start=new T.Vector3(x,.28,z),end=new T.Vector3(bot.x,1.5,bot.z);
    const direction=end.sub(start),distance=direction.length();
    if(distance>11||distance<.03)return false;
    scanRay.set(start,direction.normalize());
    scanRay.near=.03;scanRay.far=Math.max(.01,distance-.38);
    const solid=world.shootables.filter(mesh=>{
      const u=mesh.userData||{};
      return mesh.visible!==false&&(u.kind==="solid"||
        u.kind==="panel"&&!u.panel.destroyed||
        u.kind==="barricade"&&!u.plank.broken||
        u.kind==="shield"&&u.shield.group.parent);
    });
    return !scanRay.intersectObjects(solid,false).length;
  }
  const canMove=(nx,nz)=>{
    if(nx<-28||nx>28||nz<-64||nz>24)return false;
    return !world.colliders.some(c=>c.maxY>.08&&c.minY<.30&&
      nx>=c.minX-.155&&nx<=c.maxX+.155&&
      nz>=c.minZ-.155&&nz<=c.maxZ+.155);
  };
  function begin(now=0){
    if(active||remaining<=0)return false;
    remaining--;deployments++;destroyed=false;health=35;
    x=0;z=-15.8;yaw=0;pitch=0;active=true;jammed=false;pingCount=0;
    lastPing=now-1000;body.visible=true;body.position.set(x,.0,z);
    camera.rotation.order="YXZ";
    update(0,new Set(),null);
    return true;
  }
  function look(dx,dy,sensitivity=.0022){
    if(!active)return;
    yaw-=clamp(dx,-180,180)*sensitivity;
    pitch=clamp(pitch-clamp(dy,-180,180)*sensitivity,-.62,.75);
    camera.rotation.set(pitch,yaw,0);
  }
  function update(dt,keys,gadgets){
    for(let i=dartTraces.length-1;i>=0;i--){
      const fx=dartTraces[i],age=performance.now()-fx.start;
      if(age>=280){
        scene.remove(fx.line);fx.line.geometry.dispose();
        fx.line.material.dispose();dartTraces.splice(i,1);
      }else fx.line.material.opacity=1-age/280;
    }
    if(!active)return;
    const fx=-Math.sin(yaw),fz=-Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);
    const f=Number(keys?.has("KeyW"))-Number(keys?.has("KeyS"));
    const s=Number(keys?.has("KeyD"))-Number(keys?.has("KeyA"));
    const len=Math.hypot(f,s)||1;
    const speed=(keys?.has("ShiftLeft")?4.25:3.15)*dt;
    const dx=(fx*f+rx*s)/len*speed,dz=(fz*f+rz*s)/len*speed;
    if(canMove(x+dx,z))x+=dx;
    if(canMove(x,z+dz))z+=dz;
    body.position.set(x,0,z);body.rotation.y=yaw;
    camera.position.set(x,.235,z);
    camera.rotation.set(pitch,yaw,0);
    jammed=Boolean(gadgets?.jammedAt?.(x,z));
    return {x,z,jammed};
  }
  function ping(now,bots){
    if(!active)return {ok:false,message:"DRONE UNAVAILABLE"};
    if(jammed)return {ok:false,message:"SIGNAL JAMMED · MOVE AWAY FROM THE JAMMER"};
    if(now-lastPing<1000)return {ok:false,message:"RECON PING RECHARGING"};
    lastPing=now;
    const contacts=bots.filter(bot=>bot.alive&&contactVisible(bot));
    pingCount+=contacts.length;
    return{ok:true,message:contacts.length?
      "DRONE SCANNED "+contacts.length+" HOSTILE"+(contacts.length===1?"":"S"):
      "DRONE SCAN · NO CONTACTS",contacts};
  }
  function shock(now,gadgets){
    if(!active)return {ok:false,message:"DRONE UNAVAILABLE"};
    if(jammed)return {ok:false,message:"JAMMER BLOCKS SHOCK DRONE"};
    if((gadgets?.specialCount??0)<=0)
      return {ok:false,message:"SHOCK DRONE · NO ELECTRIC DARTS REMAIN"};
    const result=gadgets?.shockNear?.(x,z,3.5,now)||
      {ok:false,message:"NO ELECTRONIC GADGET WITHIN 3.5M"};
    if(result.ok){
      gadgets.specialCount--;
      if(result.target){
        // Visible turquoise electrical discharge from the actual drone
        // muzzle to the disabled jammer/sensor. Brief tracer, no fake hit.
        const geometry=new T.BufferGeometry().setFromPoints([
          new T.Vector3(x,.30,z),
          new T.Vector3(result.target.x,.35,result.target.z)
        ]);
        const line=new T.Line(geometry,new T.LineBasicMaterial({
          color:0x78f5ed,transparent:true,opacity:1,depthWrite:false
        }));
        scene.add(line);
        dartTraces.push({line,start:now});
      }
    }
    return result;
  }
  function end(){
    active=false;body.visible=false;
    for(const fx of dartTraces){
      scene.remove(fx.line);fx.line.geometry.dispose();fx.line.material.dispose();
    }
    dartTraces.length=0;
  }
  return {begin,update,look,ping,shock,end,reset,damage,concealForOwnCamera,body,
    get active(){return active},get destroyed(){return destroyed},
    get health(){return health},get remaining(){return remaining},
    get deployments(){return deployments},get lastDamageAt(){return lastDamageAt},
    get jammed(){return jammed},
    get position(){return {x,z}},get pingCount(){return pingCount}};
}
