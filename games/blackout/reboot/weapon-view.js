// BLACKOUT V0.4 · original geometric BX-7 carbine and offline target range.
// Visual model, optic, effects and dummies are THREE meshes, not HUD art.
export function createWeaponView(THREE,camera,scene){
 const root=new THREE.Group();
 root.name="BX-7 physically mounted weapon viewmodel";
 camera.add(root);
 scene.add(camera);
 const metal=new THREE.MeshStandardMaterial({color:0x252f36,metalness:.68,roughness:.39});
 const polymer=new THREE.MeshStandardMaterial({color:0x151d23,metalness:.24,roughness:.74});
 const raised=new THREE.MeshStandardMaterial({color:0x485862,metalness:.67,roughness:.35});
 const trim=new THREE.MeshStandardMaterial({color:0x627984,metalness:.69,roughness:.31});
 const glow=new THREE.MeshBasicMaterial({color:0x7ef8dd,transparent:true,opacity:.92,depthWrite:false});
 const glass=new THREE.MeshPhysicalMaterial({color:0x4eaaa6,metalness:0,roughness:.12,
  transmission:.42,transparent:true,opacity:.20,side:THREE.DoubleSide,depthWrite:false});
 function box(parent,w,h,d,x,y,z,material=metal,rotX=0,rotZ=0){
  const item=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
  item.position.set(x,y,z);item.rotation.x=rotX;item.rotation.z=rotZ;
  item.castShadow=false;parent.add(item);return item;
 }
 function tube(parent,r,length,x,y,z,material=metal){
  const item=new THREE.Mesh(new THREE.CylinderGeometry(r,r,length,12),material);
  item.rotation.x=Math.PI/2;item.position.set(x,y,z);parent.add(item);return item;
 }
 // Magazine-fed original compact carbine. Barrel is along camera-forward -Z.
 box(root,.245,.205,.48,0,-.06,-.18,metal);
 box(root,.235,.042,.75,0,.071,-.325,raised);
 box(root,.04,.03,.65,-.084,.10,-.32,trim);
 box(root,.04,.03,.65,.084,.10,-.32,trim);
 box(root,.218,.145,.36,0,-.041,-.57,polymer);
 for(let n=0;n<7;n++){
  box(root,.23,.012,.017,0,.045,-.42-n*.045,raised);
  box(root,.012,.060,.018,-.112,-.023,-.42-n*.045,raised);
  box(root,.012,.060,.018,.112,-.023,-.42-n*.045,raised);
 }
 tube(root,.027,.48,0,-.021,-.82,metal);
 tube(root,.04,.075,0,-.021,-1.085,polymer);
 for(let i=0;i<3;i++)box(root,.044,.012,.012,0,-.021,-1.11+i*.025,raised);
 box(root,.17,.115,.22,0,-.065,.26,polymer);
 box(root,.20,.125,.065,0,-.065,.35,metal);
 box(root,.108,.225,.09,0,-.219,-.09,polymer,-.25);
 box(root,.122,.30,.13,0,-.237,-.29,raised,.17);
 box(root,.09,.012,.23,0,-.15,-.08,metal);
 box(root,.018,.09,.04,.01,-.167,-.12,trim);
 box(root,.07,.026,.07,.137,-.03,-.09,trim);
 for(const side of [-1,1]){
  box(root,.017,.07,.075,side*.132,-.055,-.17,polymer);
  box(root,.017,.06,.074,side*.113,-.038,-.60,raised);
 }
 // Real, attached holographic sight. ADS aligns the window with camera center.
 box(root,.19,.048,.24,0,.124,-.46,polymer);
 box(root,.18,.024,.05,0,.16,-.43,metal);
 for(const x of [-.077,.077])box(root,.026,.145,.051,x,.227,-.43,metal);
 box(root,.184,.032,.055,0,.305,-.43,metal);
 box(root,.148,.12,.009,0,.235,-.428,glass);
 const reticle=new THREE.Group();
 reticle.position.set(0,.233,-.418);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.014,.0016,6,24),glow);
 reticle.add(ring);
 for(const [x,y,w,h] of [[0,.020,.002,.007],[0,-.020,.002,.007],
    [.020,0,.007,.002],[-.020,0,.007,.002]]){
  const tick=new THREE.Mesh(new THREE.PlaneGeometry(w,h),glow);
  tick.position.set(x,y,.002);reticle.add(tick);
 }
 root.add(reticle);
 const muzzleGlow=new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),
   new THREE.MeshBasicMaterial({color:0xffe4ad,transparent:true,opacity:.9,depthWrite:false}));
 muzzleGlow.position.set(0,-.021,-1.13);
 muzzleGlow.visible=false;root.add(muzzleGlow);
 let flashLeft=0;
 function flash(){flashLeft=.045;}
 function update(dt,aimMix,recoil,moving){
  const t=Math.min(1,Math.max(0,aimMix));
  root.position.set(.265*(1-t),-.277+(.044*t)-recoil*.025,-.48+.035*t+recoil*.13);
  root.rotation.set(-.026+recoil*.045,0,-.055*(1-t));
  const bob=moving?Math.sin(performance.now()*.012)*.003:0;
  root.position.y+=bob*(1-t);
  reticle.visible=t>.22;
  flashLeft=Math.max(0,flashLeft-dt);
  muzzleGlow.visible=flashLeft>0;
  if(muzzleGlow.visible)muzzleGlow.scale.setScalar(.6+Math.random()*1.4);
 }
 return {root,update,flash};
}

export function createTargetRange(THREE,scene){
 const green=new THREE.MeshStandardMaterial({color:0x3a9b87,roughness:.78});
 const orange=new THREE.MeshStandardMaterial({color:0xf2a74e,roughness:.76});
 const dark=new THREE.MeshStandardMaterial({color:0x24323b,roughness:.83});
 const white=new THREE.MeshStandardMaterial({color:0xd4e5e8,roughness:.83});
 const stand=new THREE.MeshStandardMaterial({color:0x536675,metalness:.4,roughness:.64});
 const positions=[[-11,-18],[-2,-22],[7,-17],[13,-23]];
 const targets=[];
 for(let i=0;i<positions.length;i++){
  const group=new THREE.Group();
  const id="dummy-"+(i+1);
  group.position.set(positions[i][0],0,positions[i][1]);
  const base=new THREE.Mesh(new THREE.BoxGeometry(.8,.09,.6),stand);
  base.position.y=.05;group.add(base);
  const pole=new THREE.Mesh(new THREE.BoxGeometry(.06,1.18,.06),stand);
  pole.position.y=.72;group.add(pole);
  const torso=new THREE.Mesh(new THREE.BoxGeometry(.74,1.02,.22),i%2?green:orange);
  torso.position.y=1.25;torso.userData.targetId=id;
  group.add(torso);
  const chest=new THREE.Mesh(new THREE.CircleGeometry(.16,24),dark);
  chest.position.set(0,1.28,.122);chest.userData.targetId=id;group.add(chest);
  const bullseye=new THREE.Mesh(new THREE.CircleGeometry(.072,24),white);
  bullseye.position.set(0,1.28,.128);bullseye.userData.targetId=id;group.add(bullseye);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.233,12,10),i%2?green:orange);
  head.position.set(0,1.99,0);head.userData.targetId=id;group.add(head);
  scene.add(group);
  targets.push({id,group,downTime:0,hits:0});
 }
 return targets;
}

export function createShotEffects(THREE,scene){
 const impacts=[];
 const black=new THREE.MeshBasicMaterial({color:0x0a151a,polygonOffset:true,
  polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 const hitMat=new THREE.MeshBasicMaterial({color:0x8bffd8,polygonOffset:true,
  polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 return {
  mark(hit,target=false){
   const normal=hit.face?.normal?.clone().transformDirection(hit.object.matrixWorld)||
      new THREE.Vector3(0,0,1);
   const disc=new THREE.Mesh(new THREE.CircleGeometry(target?.055:.028,10),
     target?hitMat:black);
   disc.position.copy(hit.point).addScaledVector(normal,.015);
   disc.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);
   disc.renderOrder=2;
   scene.add(disc);
   impacts.push({disc,age:0});
   if(impacts.length>75){
    const old=impacts.shift();scene.remove(old.disc);old.disc.geometry.dispose();
   }
  },
  tick(dt){
   for(let i=impacts.length-1;i>=0;i--){
    impacts[i].age+=dt;
    if(impacts[i].age>9){
     const old=impacts.splice(i,1)[0];
     scene.remove(old.disc);old.disc.geometry.dispose();
    }
   }
  }
 };
}

export class WeaponAudio{
 constructor(){this.context=null;this.buffer=null;}
 connect(context){
  if(!context)return;
  this.context=context;
  if(!this.buffer){
   const b=context.createBuffer(1,Math.ceil(context.sampleRate*.22),context.sampleRate);
   const d=b.getChannelData(0);
   let seed=0x8d7d291;
   for(let i=0;i<d.length;i++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    d[i]=(seed/2147483648)-1;
   }
   this.buffer=b;
  }
 }
 fire(){
  const ctx=this.context;
  if(!ctx||ctx.state!=="running"||!this.buffer)return;
  const now=ctx.currentTime;
  const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
  src.buffer=this.buffer;
  filter.type="lowpass";filter.frequency.setValueAtTime(2800,now);
  filter.frequency.exponentialRampToValueAtTime(430,now+.18);
  gain.gain.setValueAtTime(.26,now);
  gain.gain.exponentialRampToValueAtTime(.0001,now+.195);
  src.connect(filter);filter.connect(gain);gain.connect(ctx.destination);
  src.start(now,Math.random()*.012,.20);
 }
}
