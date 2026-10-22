// BLACKOUT V0.25.6 · tangible bomb bodies block drones and bullets at
// Sites A and B, clear objective markers, and the real dropped defuser.
// Bomb props are objectives, not a second deployable gadget or fake team AI.
import {BOMB_RULES} from "./bomb-round.js?v=reboot-059";
import {BOMB_HARDWARE} from "./bomb-presentation.js?v=reboot-059";

export function drawBombRoundMinimap(ctx,state){
 if(!ctx||!state||state.mode!=="bomb")return;
 const width=ctx.canvas.width,height=ctx.canvas.height;
 const x=v=>(v+30)/60*width,z=v=>(v+30)/60*height;
 ctx.save();
 for(const site of BOMB_RULES.sites){
  const sx=x(site.x),sy=z(site.z);
  ctx.fillStyle=site.id==="A"?"#31dfbd":"#ffb45b";
  ctx.strokeStyle="#0c1822";ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(sx,sy,10,0,Math.PI*2);
  ctx.fill();ctx.stroke();
  ctx.fillStyle="#0a1a22";ctx.font="bold 12px Arial";
  ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.fillText(site.id,sx,sy+.5);
 }
 if(state.defuser.status!=="carried"){
  const dx=x(state.defuser.x),dz=z(state.defuser.z);
  ctx.fillStyle=state.defuser.status==="planted"?"#ff5a55":"#f3f4ed";
  ctx.fillRect(dx-4,dz-4,8,8);
  ctx.strokeStyle="#0c1822";ctx.strokeRect(dx-4,dz-4,8,8);
 }
 ctx.restore();
}

export function createBombRoundView(THREE,scene){
 const group=new THREE.Group();
 group.name="BLACKOUT BOMB ROUND · ACTUAL SITE A / B EXPLOSIVE DEVICES";
 const toDispose=[];
 function material(params){
  const m=new THREE.MeshStandardMaterial(params);toDispose.push(m);return m;
 }
 const caseMat=material({color:0x293944,metalness:.7,roughness:.44});
 const rimMat=material({color:0x9badaf,metalness:.78,roughness:.33});
 const redMat=material({color:0xaa2937,metalness:.38,roughness:.35});
 const blackMat=material({color:0x0e1720,metalness:.32,roughness:.56});
 const aGlow=material({color:0x1cebc7,emissive:0x0cc9ac,emissiveIntensity:1.5});
 const bGlow=material({color:0xffa34e,emissive:0xff861c,emissiveIntensity:1.5});
 const redGlow=material({color:0xff575a,emissive:0xf92527,emissiveIntensity:2});
 function mesh(parent,shape,mat,name,x=0,y=0,z=0){
  const m=new THREE.Mesh(shape,mat);
  m.position.set(x,y,z);m.name=name;m.castShadow=true;m.receiveShadow=true;
  parent.add(m);toDispose.push(shape);return m;
 }
 function labelSprite(text,color){
  const c=document.createElement("canvas");c.width=512;c.height=180;
  const ct=c.getContext("2d");if(!ct)return new THREE.Group();
  ct.fillStyle="rgba(5,16,24,.91)";ct.fillRect(8,12,496,152);
  ct.strokeStyle=color;ct.lineWidth=9;ct.strokeRect(8,12,496,152);
  ct.font="900 70px Arial";ct.textAlign="center";ct.textBaseline="middle";
  ct.fillStyle="#faffff";ct.fillText(text,256,88);
  const tex=new THREE.CanvasTexture(c);toDispose.push(tex);
  const mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:true});
  toDispose.push(mat);
  const sprite=new THREE.Sprite(mat);sprite.scale.set(3.7,1.3,1);
  return sprite;
 }
 const bombs=[],bombColliders=[];
 const collisionMat=new THREE.MeshBasicMaterial({transparent:true,opacity:0,
  depthWrite:false,side:THREE.DoubleSide});toDispose.push(collisionMat);
 BOMB_RULES.sites.forEach((site,i)=>{
  const root=new THREE.Group();
  root.position.set(site.x,0,site.z);
  root.name="REAL BOMB "+site.id+" · SITE "+site.id;
  group.add(root);
  const color=i?"#ffbd65":"#69fce2";
  const glow=i?bGlow:aGlow;
  const ring=mesh(root,new THREE.RingGeometry(site.radius-.16,site.radius,96),
   glow,"SITE "+site.id+" · PHYSICAL PLANTING BOUNDARY",0,.05,0);
  ring.rotation.x=-Math.PI/2;
  const field=mesh(root,new THREE.CircleGeometry(site.radius,72),
   new THREE.MeshBasicMaterial({color:i?0xffa04a:0x33dcbd,
    transparent:true,opacity:.07,depthWrite:false,side:THREE.DoubleSide}),
   "SITE "+site.id+" · PLANT ZONE",0,.04,0);
  field.rotation.x=-Math.PI/2;toDispose.push(field.material);
  // The original version rendered only circles. These are full 3D
  // bomb prop assemblies, complete with explosive canisters and wiring.
  mesh(root,new THREE.BoxGeometry(1.65,.13,1.15),blackMat,
   "BOMB "+site.id+" · PLATFORM",0,.09,0);
  mesh(root,new THREE.BoxGeometry(1.32,.66,.81),caseMat,
   "BOMB "+site.id+" · MAIN CHARGE MODULE",0,.47,0);
  mesh(root,new THREE.BoxGeometry(1.46,.095,.94),rimMat,
   "BOMB "+site.id+" · CASE TOP",0,.84,0);
  // Three exposed explosive cylinders across the bomb's front.
  for(let j=-1;j<=1;j++){
   const charge=mesh(root,new THREE.CylinderGeometry(.115,.115,.54,14),
    redMat,"BOMB "+site.id+" · RED EXPLOSIVE CANISTER "+(j+2),
    j*.36,.51,-.49);
   charge.rotation.z=Math.PI/2;
   mesh(root,new THREE.BoxGeometry(.08,.065,.05),blackMat,
    "DETONATOR CONNECTION",j*.36,.72,-.54);
  }
  const wires=[];
  for(let j=-1;j<=1;j++){
   wires.push(j*.35,.71,-.53,j*.22,.94,-.35);
  }
  const wg=new THREE.BufferGeometry();
  wg.setAttribute("position",new THREE.Float32BufferAttribute(wires,3));
  const wm=new THREE.LineBasicMaterial({color:0xff715c,linewidth:2});
  const w=new THREE.LineSegments(wg,wm);w.name="BOMB "+site.id+" · VISIBLE RED WIRING";root.add(w);
  toDispose.push(wg,wm);
  mesh(root,new THREE.BoxGeometry(.5,.20,.07),glow,
   "BOMB "+site.id+" · LIVE CONTROL PANEL",0,.57,.48);
  const status=mesh(root,new THREE.BoxGeometry(.22,.09,.095),redGlow,
   "BOMB "+site.id+" · FLASHING STATUS LIGHT",.42,.72,.46);
  const beacon=new THREE.PointLight(i?0xffab44:0x36f8d9,1.8,8);
  beacon.position.set(0,1.3,0);root.add(beacon);
  const beam=mesh(root,new THREE.CylinderGeometry(.028,.13,3.3,12,1,true),
   new THREE.MeshBasicMaterial({color:i?0xffad55:0x50f3df,
    transparent:true,opacity:.17,depthWrite:false,side:THREE.DoubleSide}),
   "BOMB "+site.id+" · TALL BEACON",0,2.1,0);
  toDispose.push(beam.material);
  const label=labelSprite("BOMB "+site.id,color);
  label.position.set(0,4.1,0);root.add(label);
  // Authoritative full-body bomb obstacle matches physics AABB and is
  // included in combat raycasts. VISIBLE prop stays unchanged; drones,
  // players and flying utility already receive the AABB from world physics.
  const hitbox=mesh(root,new THREE.BoxGeometry(
    BOMB_HARDWARE.width,BOMB_HARDWARE.height,BOMB_HARDWARE.depth),
   collisionMat,"SOLID BOMB "+site.id+" · DRONE / BULLET OBSTACLE",
   0,BOMB_HARDWARE.height/2,0);
  hitbox.userData.bombSiteId=site.id;
  bombColliders.push(hitbox);
  bombs.push({root,status,beacon});
 });
 // The portable DEFUSER is separate from the two fixed SITE BOMBS.
 const defuser=new THREE.Group();defuser.name="DROPPED / PLANTED PORTABLE DEFUSER";
 mesh(defuser,new THREE.BoxGeometry(.55,.26,.45),caseMat,
  "PORTABLE DEFUSER CASE",0,.18,0);
 mesh(defuser,new THREE.BoxGeometry(.47,.043,.37),rimMat,
  "PORTABLE DEFUSER CONTROL PANEL",0,.33,0);
 const indicator=mesh(defuser,new THREE.BoxGeometry(.29,.012,.17),aGlow,
  "PORTABLE DEFUSER STATUS SCREEN",0,.36,-.04);
 const portableLid=new THREE.Group();
 portableLid.name="ACTUALLY HINGED PORTABLE DEFUSER SCREEN";
 portableLid.position.set(0,.33,-.17);defuser.add(portableLid);
 mesh(portableLid,new THREE.BoxGeometry(.48,.32,.038),rimMat,
  "ARMORED LCD LID",0,.15,-.019);
 const armedScreen=mesh(portableLid,new THREE.PlaneGeometry(.40,.25),
  redGlow,"OPEN ARMED DEFUSER LCD",0,.15,.004);
 armedScreen.material=redGlow;
 const handle=mesh(defuser,new THREE.TorusGeometry(.17,.035,8,22,Math.PI),blackMat,
  "DEFUSER HANDLE",0,.24,.24);handle.rotation.x=-Math.PI/2;
 const portableLight=new THREE.PointLight(0x37e7bd,.75,2.6);
 portableLight.position.set(0,.55,0);defuser.add(portableLight);
 const tag=labelSprite("DEFUSER","#b0fff0");
 tag.position.set(0,1.28,0);tag.scale.set(1.8,.65,1);defuser.add(tag);
 group.add(defuser);
 group.visible=false;scene.add(group);
 function update(state){
  group.visible=Boolean(state?.mode==="bomb");
  if(!group.visible)return;
  const d=state.defuser;
  defuser.visible=d.status!=="carried";
  if(defuser.visible){
   defuser.position.set(d.x,0,d.z);
   const planted=d.status==="planted";
   defuser.rotation.y=Number.isFinite(d.yaw)?d.yaw:0;
   portableLid.rotation.x=planted?.10:Math.PI/2;
   portableLid.visible=planted;
   indicator.material=planted?redGlow:aGlow;
   portableLight.color.setHex(planted?0xff575a:0x37e7bd);
  }
  const t=performance.now()*.001;
  bombs.forEach((b,i)=>{
   b.beacon.intensity=1.2+.7*(.5+.5*Math.sin(t*3+i));
   b.status.scale.x=.92+.08*Math.sin(t*4+i);
  });
 }
 function dispose(){
  scene.remove(group);
  for(const resource of toDispose)resource.dispose();
 }
 return {group,defuser,bombs,bombColliders,update,dispose};
}
