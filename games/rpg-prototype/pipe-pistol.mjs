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
  // Folded and beveled sheet-metal profiles join the round internal pipe into
  // ONE continuous receiver. X thickness is centered over the bore.
  const formedPanel=(profile,width,material,g=root)=>{
    const shape=new THREE.Shape();
    shape.moveTo(profile[0][0],profile[0][1]);
    for(let i=1;i<profile.length;i++)shape.lineTo(profile[i][0],profile[i][1]);
    shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{
      depth:width,bevelEnabled:true,bevelSize:.008,
      bevelThickness:.007,bevelSegments:2,steps:1
    });
    const mesh=part(geo,material,width/2,0,0,g);
    mesh.rotation.y=-Math.PI/2;
    return mesh;
  };
  // Thick welded breech and narrow salvaged barrel share their centerline.
  pipeTube(.092,.36,rust,0,.080,-.105);
  pipeTube(.106,.22,dark,0,.080,.047);
  pipeTube(.064,.64,pipe,0,.080,-.442);
  // Angled receiver shoulders and bridge carry the slide, barrel and grip.
  const joinedReceiver=formedPanel([[-.32,.019],[-.28,.155],[-.10,.179],
    [.145,.175],[.236,.096],[.225,-.092],
    [-.12,-.105],[-.29,-.061]],.197,dark);
  joinedReceiver.name='JoinedReceiverShell';
  formedPanel([[-.245,.136],[-.184,.190],[.148,.191],
    [.193,.151],[.193,.117],[-.245,.115]],.194,pipe);
  // The long upper handguard actually surrounds and supports the barrel.
  const barrelShroud=formedPanel([[-.732,.042],[-.705,.139],[-.31,.148],
    [-.26,.108],[-.26,.025],[-.710,.019]],.151,pipe);
  barrelShroud.name='JoinedBarrelShroud';
  for(const side of [-1,1]){
    // Inset vent slots are surface details ON the housing, not free blocks.
    for(const z of [-.56,-.45,-.34]){
      box(.008,.026,.061,dark,side*.084,.089,z);
    }
    box(.013,.024,.38,rust,side*.086,.038,-.49);
  }
  pipeTube(.048,.07,band,0,.080,-.767);
  ring(.047,.011,dark,0,.080,-.798);
  ring(.069,.016,band,0,.080,-.290);
  ring(.068,.014,rust,0,.080,-.567);
  // Riveted seam ties the long barrel housing to the angled main receiver.
  for(const side of [-1,1]){
    for(const z of [-.27,-.15,.008,.115]){
      const rivet=part(new THREE.SphereGeometry(.013,8,6),
        band,side*.111,.057,z);
      rivet.scale.set(1,.84,1);
    }
  }
  // The lower spine overlaps the receiver shell and reaches the wood grip.
  formedPanel([[-.215,.013],[-.12,-.106],[.142,-.117],
    [.242,-.083],[.247,.016],[.07,.044]],.175,rust);
  box(.167,.082,.223,dark,0,-.138,.159);
  // Cast-on right charging channel encloses the movable steel bolt.
  box(.062,.101,.335,dark,.110,.117,.046);
  box(.018,.025,.264,band,.147,.161,.036);
  // Exposed charging bolt rides inside the receiver and retracts rearward.
  const slideGroup=new THREE.Group();
  slideGroup.name='PipePistolChargingBolt';
  root.add(slideGroup);
  pipeTube(.044,.26,band,.102,.114,.034,slideGroup);
  // Small charging grip is welded TO the sliding bolt, not hovering beside it.
  box(.071,.055,.115,band,.137,.136,.116,slideGroup);
  box(.043,.033,.070,copper,.162,.155,.158,slideGroup);
  box(.043,.022,.066,dark,.164,.176,.159,slideGroup);
  // Continuous sight rail anchors both blades to real metal underneath.
  const rearSightRail=box(.144,.041,.232,pipe,0,.183,.118);
  rearSightRail.name='RearSightRail';
  for(const side of [-1,1]){
    box(.023,.061,.033,dark,side*.056,.228,.163);
    box(.010,.015,.013,band,side*.056,.2395,.163);
  }
  // Front pedestal connects to the *shroud*, instead of floating in air.
  const frontPedestal=box(.057,.094,.084,dark,0,.174,-.683);
  frontPedestal.name='FrontSightPedestal';
  box(.022,.053,.037,dark,0,.216,-.683);
  box(.015,.016,.019,band,0,.239,-.683);
  // Wooden pistol grip angles back; twisted cloth wrap reinforces the handle.
  // Angled steel tang fills the upper grip-to-receiver seam.
  formedPanel([[.111,-.071],[.250,-.075],
    [.340,-.187],[.303,-.262],[.132,-.166]],.129,dark);
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
  const magazine=box(.099,.251,.156,rust,-.211,-.057,-.069);
  magazine.rotation.z=-.11;
  for(let j=0;j<4;j++)
    box(.010,.019,.13,pipe,-.056,-.089+j*.046,0,magazine);
  const magazineBase=box(.116,.028,.177,dark,-.211,-.197,-.069);
  box(.058,.014,.09,band,0,-.018,0,magazineBase);
  // Deep socket overlaps the magazine on all three axes while installed.
  // Guide rails remain attached to the gun when the magazine slides outward.
  const magazineSocket=box(.082,.180,.210,pipe,-.144,-.023,-.054);
  magazineSocket.name='MagazineSocket';
  box(.100,.047,.211,dark,-.175,.061,-.054);
  box(.084,.047,.174,dark,-.177,-.120,-.054);
  box(.041,.032,.074,band,-.165,.081,-.047);
  for(const z of [-.135,.023])
    box(.022,.032,.038,copper,-.151,-.079,z);
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
    muzzleGlow,muzzleFlare,magBaseX:-.211,magFootX:-.211,
    magBaseY:-.057,magFootY:-.197,flashScale:.83,defaultX:.29,
    sightLocal:new THREE.Vector3(0,.247,-.12),
    ejectionLocal:new THREE.Vector3(.145,.137,.09)};
}
