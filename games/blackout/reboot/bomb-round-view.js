// BLACKOUT V0.25.0 · actual floor defuser object and bomb-site rings,
// site A/B label markers. Decorative markers have no movement collision.
import {BOMB_RULES} from "./bomb-round.js?v=reboot-053";
export function createBombRoundView(THREE,scene){
 const group=new THREE.Group();group.name="BLACKOUT BOMB ROUND OBJECTIVES";
 const siteMaterials=[
  new THREE.MeshBasicMaterial({color:0x5cecd2,transparent:true,opacity:.38,depthWrite:false}),
  new THREE.MeshBasicMaterial({color:0xf5bc66,transparent:true,opacity:.38,depthWrite:false})
 ];
 const disposal=[];
 function textSprite(label,color){
  const canvas=document.createElement("canvas");canvas.width=256;canvas.height=128;
  const ctx=canvas.getContext("2d");
  ctx.fillStyle="rgba(6,16,23,.87)";ctx.fillRect(12,14,232,98);
  ctx.strokeStyle=color;ctx.lineWidth=7;ctx.strokeRect(12,14,232,98);
  ctx.font="bold 54px system-ui";ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.fillStyle="#ffffff";ctx.fillText(label,128,64);
  const tex=new THREE.CanvasTexture(canvas);disposal.push(tex);
  const mat=new THREE.SpriteMaterial({map:tex,depthTest:true,transparent:true});
  disposal.push(mat);
  const sprite=new THREE.Sprite(mat);sprite.scale.set(2.7,1.35,1);
  return sprite;
 }
 BOMB_RULES.sites.forEach((s,i)=>{
  const ring=new THREE.Mesh(new THREE.RingGeometry(s.radius-.13,s.radius,80),
   siteMaterials[i]);
  ring.rotation.x=-Math.PI/2;ring.position.set(s.x,.035,s.z);
  group.add(ring);disposal.push(ring.geometry);
  const footprint=new THREE.Mesh(new THREE.CircleGeometry(s.radius,80),
   new THREE.MeshBasicMaterial({color:i?0xe0a64b:0x25d5bd,
    transparent:true,opacity:.045,depthWrite:false,side:THREE.DoubleSide}));
  footprint.rotation.x=-Math.PI/2;footprint.position.set(s.x,.031,s.z);
  group.add(footprint);disposal.push(footprint.geometry,footprint.material);
  const sprite=textSprite("SITE "+s.id,i?"#f5bc66":"#5cecd2");
  sprite.position.set(s.x,2.9,s.z);group.add(sprite);
 });
 const metal=new THREE.MeshStandardMaterial({color:0x374d58,metalness:.72,roughness:.35});
 const plating=new THREE.MeshStandardMaterial({color:0xb1cad0,metalness:.68,roughness:.32});
 const lit=new THREE.MeshBasicMaterial({color:0x4dfad2});
 const defuser=new THREE.Group();
 defuser.name="DROP/PICKUP DEFUSER (HOLD X TO DROP)";
 const body=new THREE.Mesh(new THREE.BoxGeometry(.54,.25,.42),metal);
 body.position.y=.16;defuser.add(body);
 const panel=new THREE.Mesh(new THREE.BoxGeometry(.45,.04,.34),plating);
 panel.position.set(0,.31,0);defuser.add(panel);
 const screen=new THREE.Mesh(new THREE.BoxGeometry(.30,.01,.16),lit);
 screen.position.set(0,.339,-.03);defuser.add(screen);
 const handle=new THREE.Mesh(new THREE.TorusGeometry(.19,.038,8,24,Math.PI),
  metal);
 handle.rotation.x=-Math.PI/2;handle.position.set(0,.23,.21);
 defuser.add(handle);
 const light=new THREE.PointLight(0x39f4ce,.5,2);
 light.position.y=.4;defuser.add(light);
 group.add(defuser);
 scene.add(group);group.visible=false;
 function update(state,dt=0){
  group.visible=Boolean(state?.mode==="bomb");
  if(!group.visible)return;
  const d=state.defuser;
  defuser.visible=d.status!=="carried";
  if(defuser.visible){
   defuser.position.set(d.x,0,d.z);
   lit.color.setHex(d.status==="planted"?0xff6655:0x4dfad2);
   light.color.setHex(d.status==="planted"?0xff6655:0x39f4ce);
   light.intensity=d.status==="planted"?1.15:.48;
   screen.visible=true;
   if(d.status==="planted")screen.scale.x=.9+Math.sin(Date.now()*.006)*.1;
  }
 }
 function dispose(){
  scene.remove(group);
  for(const item of disposal)item.dispose();
  for(const obj of [body,panel,screen,handle])obj.geometry.dispose();
  for(const m of [metal,plating,lit])m.dispose();
 }
 return {group,defuser,update,dispose};
}
