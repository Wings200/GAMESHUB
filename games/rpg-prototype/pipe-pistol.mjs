// W20.20: original improvised side-fed pipe pistol.
// Functional receiver bolt, crude clamp collars, removable lateral magazine,
// upright iron sights and common first/third-person attachment points.
export function createPipePistol(THREE,parent,{thirdPerson=false,flareTexture=null}={}){
  const root=new THREE.Group();
  root.name=thirdPerson?'PipePistolWorldHeld':'PipePistolFirstPerson';
  root.position.set(thirdPerson?0:.29,thirdPerson?-.067:-.31,thirdPerson?0:-.77);
  if(thirdPerson)root.scale.setScalar(.70);
  parent.add(root);
  const pipe=new THREE.MeshStandardMaterial({color:0x656665,metalness:.55,roughness:.71});
  const rust=new THREE.MeshStandardMaterial({color:0x8a5b43,metalness:.26,roughness:.90});
  const dark=new THREE.MeshStandardMaterial({color:0x242e30,metalness:.45,roughness:.72});
  const wood=new THREE.MeshStandardMaterial({color:0x715338,metalness:.04,roughness:.98});
  const band=new THREE.MeshStandardMaterial({color:0xa0a29a,metalness:.50,roughness:.65});
  const copper=new THREE.MeshStandardMaterial({color:0x8f7460,metalness:.52,roughness:.69});
  const fabric=new THREE.MeshStandardMaterial({color:0x55503f,metalness:0,roughness:1});
  const glove=new THREE.MeshStandardMaterial({color:0x3d463f,metalness:0,roughness:.95});
  const part=(geometry,material,x,y,z,parentGroup=root)=>{
    const m=new THREE.Mesh(geometry,material);
    m.position.set(x,y,z);m.castShadow=thirdPerson;
    parentGroup.add(m);return m;
  };
  const box=(w,h,d,material,x,y,z,g=root)=>
    part(new THREE.BoxGeometry(w,h,d),material,x,y,z,g);
  const pipeTube=(r,d,material,x,y,z,g=root)=>{
    const m=part(new THREE.CylinderGeometry(r,r,d,12),material,x,y,z,g);
    m.rotation.x=Math.PI/2;return m;
  };
  const ring=(r,t,material,x,y,z,g=root)=>
    part(new THREE.TorusGeometry(r,t,7,15),material,x,y,z,g);
  // Thick welded breech and narrow salvaged barrel are two distinct pipes.
  pipeTube(.092,.36,rust,0,.080,-.105);
  pipeTube(.106,.22,dark,0,.080,.047);
  pipeTube(.064,.64,pipe,0,.080,-.442);
  pipeTube(.048,.07,band,0,.080,-.767);
  ring(.048,.013,dark,0,.080,-.806);
  ring(.095,.020,band,0,.080,-.290);
  ring(.079,.014,rust,0,.080,-.567);
  // Asymmetric collars and offset hand-welds prevent the generic gun silhouette.
  for(const z of [-.24,-.48,-.65]){
    const collar=ring(.074,.009,band,0,.080,z);
    collar.rotation.y=.05;
    box(.032,.026,.075,rust,.082,.018,z);
  }
  for(let j=0;j<3;j++){
    box(.009,.022,.041,copper,.081,.123,-.15+j*.091);
    box(.028,.029,.026,band,-.079,.027,-.23+j*.087);
  }
  // Improvised stamped sheet-metal lower receiver, behind the barrel.
  const plate=box(.187,.121,.392,dark,0,-.048,.075);
  plate.rotation.x=-.048;
  box(.22,.027,.312,pipe,0,.013,.062);
  box(.138,.042,.275,rust,0,-.116,.08);
  // Exposed charging bolt rides inside the receiver and retracts rearward.
  const slideGroup=new THREE.Group();
  slideGroup.name='PipePistolChargingBolt';
  root.add(slideGroup);
  pipeTube(.054,.26,band,.094,.109,.034,slideGroup);
  box(.068,.049,.072,dark,.137,.130,.125,slideGroup);
  box(.056,.036,.067,copper,.148,.138,.186,slideGroup);
  for(let j=0;j<4;j++)
    ring(.033,.006,copper,.097,.109,-.055+j*.045,slideGroup);
  // Simple welded two-post rear notch, front bead at the barrel clamp.
  for(const side of [-1,1]){
    box(.023,.061,.033,dark,side*.056,.228,.163);
    box(.010,.015,.013,band,side*.056,.257,.163);
  }
  box(.022,.053,.037,dark,0,.216,-.683);
  box(.015,.016,.019,band,0,.239,-.683);
  // Wooden pistol grip angles back; twisted cloth wrap reinforces the handle.
  const grip=box(.144,.36,.158,wood,0,-.252,.246);
  grip.rotation.x=-.29;
  for(const side of [-1,1]){
    const brace=box(.016,.278,.125,rust,side*.079,-.250,.246);
    brace.rotation.x=-.29;
    for(let j=0;j<5;j++){
      const wrap=box(.014,.022,.132,fabric,side*.089,-.349+j*.048,.246);
      wrap.rotation.x=-.31;
    }
    const screw=part(new THREE.CylinderGeometry(.013,.013,.009,9),
      band,side*.093,-.205,.245);
    screw.rotation.z=Math.PI/2;
  }
  box(.180,.037,.159,dark,0,-.450,.284);
  // Visible trigger assembly and bent metal guard under the breech.
  const trigger=box(.018,.091,.025,band,0,-.157,-.011);
  trigger.rotation.x=-.17;
  const guard=part(new THREE.TorusGeometry(.085,.012,7,17,Math.PI*1.58),
    rust,0,-.151,-.007);
  guard.rotation.z=-.42;
  // Distinctive LEFT side-feed magazine, not a grip magazine:
  // physically slides outward in X during reload. Bottom plate goes with it.
  const magazine=box(.099,.251,.156,rust,-.249,-.057,-.069);
  magazine.rotation.z=-.11;
  for(let j=0;j<4;j++)
    box(.010,.019,.13,pipe,-.056,-.089+j*.046,0,magazine);
  const magazineBase=box(.116,.028,.177,dark,-.249,-.197,-.069);
  box(.058,.014,.09,band,0,-.018,0,magazineBase);
  // Receiver-side magazine bracket and retaining latch stay on the firearm.
  box(.05,.166,.21,pipe,-.14,-.025,-.054);
  box(.046,.028,.08,band,-.158,.075,-.045);
  for(const z of [-.145,.028])
    box(.017,.037,.041,copper,-.155,-.087,z);
  // Primary shooting hand and separate reload hand; low-poly but not a
  // static magazine that phases through the receiver during animations.
  if(!thirdPerson){
    box(.163,.188,.180,glove,.111,-.323,.269).rotation.x=-.29;
    box(.107,.051,.154,glove,.147,-.212,.242);
    for(let j=0;j<3;j++)
      box(.029,.110,.050,glove,.191,-.300,.268-j*.046);
  }
  const reloadHand=new THREE.Group();
  reloadHand.name='PipePistolReloadHand';
  root.add(reloadHand);
  if(!thirdPerson){
    box(.152,.140,.169,glove,0,0,0,reloadHand);
    for(let j=0;j<4;j++)box(.032,.105,.10,glove,-.059+j*.039,.078,-.022,reloadHand);
  }
  reloadHand.visible=false;
  const muzzleGlow=new THREE.PointLight(0xffb971,0,1.50,2);
  muzzleGlow.position.set(0,.080,-.809);
  root.add(muzzleGlow);
  const flareMaterial=new THREE.MeshBasicMaterial({map:flareTexture,
    color:0xffd1a0,transparent:true,opacity:0,depthWrite:false,
    blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
  const muzzleFlare=part(new THREE.PlaneGeometry(.28,.28),
    flareMaterial,0,.080,-.821);
  muzzleFlare.visible=false;
  return {root,slideGroup,magazine,magazineBase,reloadHand,trigger,
    muzzleGlow,muzzleFlare,magBaseX:-.249,magFootX:-.249,
    magBaseY:-.057,magFootY:-.197,flashScale:.83,defaultX:.29,
    sightLocal:new THREE.Vector3(0,.214,-.12),
    ejectionLocal:new THREE.Vector3(.145,.137,.09)};
}
