// BLACKOUT V2 — real attacker preparation reconnaissance.
// While drone-controlled, the operator has NOT spawned into the map yet.
// Camera is attached to a small independently moving ground drone.
export function createReconDrone(T,scene,world,camera){
  const body=new T.Group();scene.add(body);body.visible=false;
  const shell=new T.MeshStandardMaterial({color:0x20292f,metalness:.63,roughness:.52});
  const rubber=new T.MeshStandardMaterial({color:0x111619,roughness:.94});
  const lens=new T.MeshBasicMaterial({color:0x61e5ee});
  const cube=(x,y,z,w,h,d,mat)=>{
    const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);
    m.position.set(x,y,z);body.add(m);return m;
  };
  cube(0,.10,0,.30,.16,.42,shell);
  for(const x of [-.19,.19])for(const z of [-.145,.145]){
    const wheel=new T.Mesh(new T.CylinderGeometry(.085,.085,.045,12),rubber);
    wheel.rotation.z=Math.PI/2;wheel.position.set(x,.092,z);body.add(wheel);
  }
  cube(0,.225,-.18,.12,.065,.05,lens);
  let x=0,z=-15.8,yaw=0,pitch=0,active=false;
  let lastPing=0,jammed=false,pingCount=0;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const canMove=(nx,nz)=>{
    if(nx<-28||nx>28||nz<-64||nz>24)return false;
    return !world.colliders.some(c=>c.maxY>.08&&c.minY<.30&&
      nx>=c.minX-.155&&nx<=c.maxX+.155&&
      nz>=c.minZ-.155&&nz<=c.maxZ+.155);
  };
  function begin(now=0){
    x=0;z=-15.8;yaw=0;pitch=0;active=true;jammed=false;pingCount=0;
    lastPing=now-1000;body.visible=true;body.position.set(x,.0,z);
    camera.rotation.order="YXZ";
    update(0,new Set(),null);
  }
  function look(dx,dy,sensitivity=.0022){
    if(!active)return;
    yaw-=clamp(dx,-180,180)*sensitivity;
    pitch=clamp(pitch-clamp(dy,-180,180)*sensitivity,-.62,.75);
    camera.rotation.set(pitch,yaw,0);
  }
  function update(dt,keys,gadgets){
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
    const contacts=bots.filter(bot=>bot.alive&&Math.hypot(bot.x-x,bot.z-z)<11);
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
    if(result.ok)gadgets.specialCount--;
    return result;
  }
  function end(){
    active=false;body.visible=false;
  }
  return {begin,update,look,ping,shock,end,
    get active(){return active},get jammed(){return jammed},
    get position(){return {x,z}},get pingCount(){return pingCount}};
}
