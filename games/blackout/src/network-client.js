// BLACKOUT V8 online room client. Remote avatars reflect ONLY actual sockets.
// REDLINE and the offline AI simulation are not used as network substitutes.
const WORKER="https://redline-multiplayer.guestuseonly0173.workers.dev";
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export class BlackoutNetworkClient {
 constructor(T,scene,onStatus=()=>{},onEvent=()=>{}){
  this.T=T;this.scene=scene;this.onStatus=onStatus;this.onEvent=onEvent;
  this.ws=null;this.id=null;this.code="";this.host=false;this.mode="offline";
  this.players=[];this.avatars=new Map();this.lastPositionAt=0;this.local=null;
 }
 get connected(){return this.ws?.readyState===WebSocket.OPEN}
 get active(){return this.connected&&this.mode==="active"}
 async create({name,side,operator}){
  this.disconnect();
  const res=await fetch(WORKER+"/api/blackout/rooms",{
    method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
  const data=await res.json().catch(()=>({}));
  if(!res.ok||!data.code)throw Error(data.error||"Room server not deployed");
  return this.join({code:data.code,name,side,operator});
 }
 join({code,name,side,operator}){
  this.disconnect();
  code=String(code).trim().toUpperCase();
  if(!/^[A-HJ-NP-Z2-9]{6}$/.test(code))throw Error("Enter a valid 6-character room code");
  const qs=new URLSearchParams({name:String(name||"Operator").slice(0,22),
    side,operator});
  const endpoint=WORKER.replace(/^http/,"ws")+
    "/api/blackout/rooms/"+code+"/ws?"+qs.toString();
  this.onStatus("CONNECTING TO REAL BLACKOUT ROOM "+code+"...");
  return new Promise((resolve,reject)=>{
    let settled=false;
    const ws=new WebSocket(endpoint);this.ws=ws;this.code=code;
    ws.onopen=()=>{
      this.onStatus("WEBSOCKET CONNECTED · WAITING FOR ROOM WELCOME");
    };
    ws.onmessage=(event)=>{
      let message;try{message=JSON.parse(event.data)}catch{return}
      if(message.type==="welcome"){
        this.id=message.id;this.host=Boolean(message.host);this.mode=message.mode||"lobby";
        this.players=message.players||[];
        this.onStatus("CONNECTED · ROOM "+code+" · "+
          this.players.length+"/10 REAL PEOPLE");
        this.syncAvatars();this.onEvent(message);
        if(!settled){settled=true;resolve(message)}
      }else if(message.type==="state"){
        this.mode=message.mode;this.players=message.players||[];
        if(message.hostId)this.host=String(message.hostId)===this.id;
        this.syncAvatars();this.onEvent(message);
      }else if(message.type==="correction"){this.onEvent(message)}
      else if(message.type==="notice")this.onStatus(message.message);
    };
    ws.onerror=()=>{
      if(!settled){settled=true;reject(Error("WebSocket handshake failed. Deploy the BLACKOUT Worker first."))}
      this.onStatus("MULTIPLAYER SOCKET ERROR");
    };
    ws.onclose=(event)=>{
      this.mode="offline";this.onStatus("ROOM DISCONNECTED · "+(event.reason||"SERVER UNAVAILABLE"));
      this.clearAvatars();this.onEvent({type:"disconnect",code:event.code});
      if(!settled){settled=true;reject(Error("Room connection refused; team full or Worker not deployed"))}
    };
  });
 }
 start(){if(this.connected&&this.host)this.ws.send(JSON.stringify({type:"start"}))}
 operator(id){if(this.connected&&this.mode==="lobby")
   this.ws.send(JSON.stringify({type:"operator",operator:id}))}
 sendPosition(player,now){
  if(!this.active||now-this.lastPositionAt<70)return;
  this.lastPositionAt=now;
  this.ws.send(JSON.stringify({type:"move",x:player.x,y:player.y,z:player.z,
    yaw:player.yaw,pitch:player.pitch}));
 }
 shoot(targetId){if(this.active)
   this.ws.send(JSON.stringify({type:"shot",targetId:String(targetId||"")}))}
 reload(){if(this.active)this.ws.send(JSON.stringify({type:"reload"}))}
 disconnect(){
  if(this.ws){this.ws.onclose=null;this.ws.close();this.ws=null}
  this.id=null;this.host=false;this.code="";this.mode="offline";
  this.players=[];this.clearAvatars();
 }
 clearAvatars(){for(const group of this.avatars.values()){
  this.scene.remove(group);
  group.traverse(n=>{n.geometry?.dispose?.();
    if(Array.isArray(n.material))n.material.forEach(m=>m.dispose?.());
    else n.material?.dispose?.()});
 }this.avatars.clear();}
 createAvatar(p){
  const T=this.T,root=new T.Group();
  const color=p.side==="attacker"?0x66b9f6:0xedab70;
  const shell=new T.MeshStandardMaterial({color,metalness:.42,roughness:.57});
  const under=new T.MeshStandardMaterial({color:0x283a49,metalness:.22,roughness:.67});
  const body=new T.Mesh(new T.CylinderGeometry(.32,.38,.97,10),shell);
  body.position.y=1.06;root.add(body);
  const head=new T.Mesh(new T.SphereGeometry(.245,10,9),under);
  head.position.y=1.73;root.add(head);
  const feet=new T.Mesh(new T.CylinderGeometry(.36,.32,.65,10),under);
  feet.position.y=.33;root.add(feet);
  const badge=new T.Mesh(new T.BoxGeometry(.46,.12,.1),shell);
  badge.position.set(0,1.18,-.35);root.add(badge);
  for(const mesh of [body,head,feet]){
    mesh.userData.networkPlayerId=p.id;mesh.userData.kind="network-player";
  }
  root.userData.networkPlayerId=p.id;
  this.scene.add(root);this.avatars.set(p.id,root);return root;
 }
 syncAvatars(){
  const ids=new Set();
  for(const p of this.players){
    if(p.id===this.id)continue;
    ids.add(p.id);
    let avatar=this.avatars.get(p.id);
    if(!avatar)avatar=this.createAvatar(p);
    avatar.visible=p.alive&&this.mode==="active";
    // Do not lerp through solid cover or upper/lower floors: network state
    // is authoritative, and interpolation is cosmetic only.
    avatar.position.set(p.x,p.y,p.z);
    avatar.rotation.y=p.yaw||0;
  }
  for(const [id,avatar] of this.avatars)if(!ids.has(id)){
    this.scene.remove(avatar);
    avatar.traverse(n=>{n.geometry?.dispose?.();n.material?.dispose?.()});
    this.avatars.delete(id);
  }
 }
 findTarget(raycaster,aim,camera,occluders=[]){
  if(!this.active)return null;
  camera.updateMatrixWorld(true);
  raycaster.setFromCamera(aim,camera);raycaster.far=55;
  const avatars=[...this.avatars.values()].filter(v=>v.visible);
  const hits=raycaster.intersectObjects([...avatars,...occluders],true);
  for(const hit of hits){
    let mesh=hit.object;
    while(mesh){
      if(mesh.userData.networkPlayerId)return mesh.userData.networkPlayerId;
      if(mesh.userData.kind==="solid"||mesh.userData.kind==="panel")return null;
      mesh=mesh.parent;
    }
  }
  return null;
 }
 get me(){return this.players.find(p=>p.id===this.id)||null}
}
