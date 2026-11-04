// W20.34: original pipe SMG; continuous steel receiver, real side-stick
// magazine, exposed reciprocating bolt, welded stock, iron sights and hands.
export function createPipeSMG(THREE,parent,{thirdPerson=false,flareTexture=null}={}){
  const root=new THREE.Group();root.name=thirdPerson?'PipeSMGWorldHeld':'PipeSMGFirstPerson';
  root.position.set(thirdPerson?0:.255,thirdPerson?-.050:-.360,thirdPerson?.02:-1.04);
  if(thirdPerson)root.scale.setScalar(.70);
  parent.add(root);
  const iron=new THREE.MeshStandardMaterial({color:0x393e3d,metalness:.55,roughness:.77});
  const dark=new THREE.MeshStandardMaterial({color:0x22282a,metalness:.58,roughness:.88});
  const rusty=new THREE.MeshStandardMaterial({color:0x84503c,metalness:.25,roughness:.95});
  const redOxide=new THREE.MeshStandardMaterial({color:0x994e30,metalness:.21,roughness:.99});
  const walnut=new THREE.MeshStandardMaterial({color:0x544331,metalness:.02,roughness:.97});
  const plywood=new THREE.MeshStandardMaterial({color:0x34291f,roughness:1});
  const metalTrim=new THREE.MeshStandardMaterial({color:0x797369,metalness:.48,roughness:.75});
  const glove=new THREE.MeshStandardMaterial({color:0x39443b,roughness:.98});
  const part=(geo,mat,x,y,z,group=root)=>{
    const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=thirdPerson;
    group.add(m);return m;
  };
  const box=(w,h,d,mat,x,y,z,group=root)=>
    part(new THREE.BoxGeometry(w,h,d),mat,x,y,z,group);
  const tube=(r,len,mat,x,y,z,group=root,segments=16)=>{
    const m=part(new THREE.CylinderGeometry(r,r,len,segments),mat,x,y,z,group);
    m.rotation.x=Math.PI/2;return m;
  };
  // Square-cut receiver wraps a true bore rather than disconnected cylinders.
  box(.214,.192,.528,iron,0,.138,-.118).name='SMGWeldedReceiverShell';
  box(.203,.150,.490,dark,0,.125,-.119).name='SMGReceiverRecess';
  box(.226,.049,.557,rusty,0,.240,-.120).name='SMGContinuousReceiverTop';
  box(.224,.061,.553,rusty,0,.031,-.122).name='SMGReceiverBottomRail';
  box(.064,.171,.508,redOxide,.092,.132,-.118).name='SMGRightReceiverRustStrip';
  for(let i=0;i<5;i++){
    box(.016,.025,.038,metalTrim,.120,.205,-.317+i*.107)
      .name='SMGReceiverRivet';
  }
  // Barrel has one long continuous bore and an overlapping receiver seat.
  tube(.055,.875,dark,0,.142,-.708).name='SMGContinuousGunBarrel';
  tube(.038,.891,iron,0,.142,-.704);
  tube(.064,.055,rusty,0,.142,-.531).name='SMGWeldedBarrelCollar';
  tube(.071,.065,dark,0,.142,-1.118).name='SMGThreadedMuzzle';
  tube(.037,.010,metalTrim,0,.142,-1.153).name='SMGOpenMuzzleRing';
  for(let i=0;i<3;i++)
    tube(.067,.031,rusty,0,.142,-.840-i*.105)
      .name='SMGBarrelHeatBand';
  // Wooden handguard is bedded against barrel collars and receiver nose.
  box(.185,.140,.450,walnut,0,.065,-.560)
    .name='SMGConnectedWoodForearm';
  box(.182,.035,.420,plywood,0,-.014,-.553);
  for(const side of [-1,1])
    for(let i=0;i<4;i++)
      box(.012,.089,.021,rusty,side*.095,.062,-.722+i*.102);
  // Rear frame, trigger housing, diagonal grip and welded stock intersect.
  box(.169,.148,.229,iron,0,.021,.214).name='SMGRearReceiverBridge';
  const grip=box(.172,.346,.164,walnut,0,-.192,.238);
  grip.rotation.x=-.22;grip.name='SMGContinuousPistolGrip';
  box(.177,.046,.195,iron,0,-.063,.242).name='SMGGripFerrule';
  for(const side of [-1,1])
    box(.010,.260,.124,plywood,side*.091,-.181,.238)
      .name='SMGPistolGripSidePanel';
  const guard=part(new THREE.TorusGeometry(.103,.014,7,24),
    dark,0,-.088,.075);
  guard.scale.set(.82,.77,1);guard.name='SMGConnectedTriggerGuard';
  const trigger=box(.022,.077,.037,iron,0,-.103,.073);
  trigger.rotation.x=-.3;trigger.name='SMGTrigger';
  // Two overlapping rails lead into a scuffed triangular stock shoulder pad.
  for(const side of [-1,1]){
    box(.032,.059,.475,dark,side*.063,.121,.385)
      .name='SMGStockSupportRail';
    box(.042,.066,.203,rusty,side*.063,.121,.472);
  }
  box(.215,.236,.100,walnut,0,.106,.640).name='SMGAttachedButtstock';
  box(.236,.258,.034,dark,0,.102,.698).name='SMGButtpad';
  // Functional side receiver slot with a reciprocating bolt on a common rig.
  box(.010,.085,.295,dark,.115,.145,-.120).name='SMGBoltWindowBorder';
  const slideGroup=new THREE.Group();root.add(slideGroup);
  slideGroup.name='SMGReciprocatingBoltAssembly';
  box(.013,.066,.195,metalTrim,.126,.149,-.142,slideGroup)
    .name='SMGMovingBoltCarrier';
  const handle=tube(.026,.102,iron,.168,.146,-.035,slideGroup,12);
  handle.rotation.x=0;handle.rotation.z=Math.PI/2;
  handle.name='SMGConnectedChargingHandle';
  // Side-mounted 30-round stick magazine: built into one moving magazine rig.
  const magazine=new THREE.Group();magazine.name='SMGDetachableSideMagazine';
  magazine.position.set(-.182,.060,-.153);root.add(magazine);
  box(.112,.359,.114,rusty,0,-.145,0,magazine)
    .name='SMGThirtyRoundMagazineBody';
  box(.129,.028,.131,dark,0,-.320,0,magazine)
    .name='SMGRealMagazineFloorplate';
  box(.116,.075,.122,iron,0,.026,0,magazine)
    .name='SMGMagazineNeck';
  for(let i=0;i<7;i++)
    box(.009,.009,.089,metalTrim,-.061,-.264+i*.038,0,magazine)
      .name='SMGMagazineWitnessMark';
  box(.160,.091,.139,iron,-.128,.086,-.153)
    .name='SMGConnectedMagazineDock';
  const magazineBase=new THREE.Group();magazineBase.name='SMGMagazineDummyBase';
  magazineBase.visible=false;root.add(magazineBase);
  // Iron sight blade and rear notch each end on the same ADS ray y=.285.
  box(.125,.038,.067,iron,0,.255,.026).name='SMGRearNotchBridge';
  for(const side of [-1,1])
    box(.018,.058,.029,dark,side*.047,.256,.029)
      .name='SMGRearNotchPost';
  box(.040,.112,.044,iron,0,.225,-1.063).name='SMGFrontSightSupport';
  const tip=box(.012,.008,.020,metalTrim,0,.281,-1.063);
  tip.name='SMGFrontSightTip';tip.userData.sightReference=true;
  // Hands anchor onto two actual pieces of wood, both when idle and ADS.
  const gripHand=new THREE.Group(),supportHand=new THREE.Group(),
    reloadHand=new THREE.Group();
  root.add(gripHand,supportHand,reloadHand);
  if(!thirdPerson){
    box(.132,.163,.154,glove,.095,-.187,.230,gripHand)
      .name='SMGRightPalmOnPistolGrip';
    box(.136,.143,.173,glove,-.115,-.032,-.598,supportHand)
      .name='SMGLeftPalmOnWoodForearm';
    for(let i=0;i<4;i++){
      const f=part(new THREE.CapsuleGeometry(.018,.083,4,7),
        glove,.049,-.120-i*.038,.162,gripHand);
      f.rotation.z=1.05;f.name='SMGGripFinger';
      const lf=part(new THREE.CapsuleGeometry(.019,.095,4,7),
        glove,-.054,.008-i*.027,-.603,supportHand);
      lf.rotation.z=-1.02;lf.name='SMGForearmFinger';
    }
    box(.143,.082,.164,glove,.106,-.301,.269,gripHand);
    box(.144,.085,.188,glove,-.135,-.138,-.550,supportHand);
    const strongArm=part(new THREE.CylinderGeometry(.078,.105,.325,10),
      glove,.154,-.474,.350,gripHand);
    strongArm.rotation.z=-.16;strongArm.name='SMGAttachedRightForearm';
    const supportArm=part(new THREE.CylinderGeometry(.076,.102,.310,10),
      glove,-.171,-.331,-.515,supportHand);
    supportArm.rotation.z=.23;supportArm.name='SMGAttachedLeftForearm';
    box(.152,.145,.158,glove,0,0,0,reloadHand);
    for(let i=0;i<4;i++)
      box(.033,.075,.091,glove,-.056+i*.038,.080,-.014,reloadHand);
  }
  reloadHand.visible=false;
  const muzzleGlow=new THREE.PointLight(0xffb672,0,2,2);
  muzzleGlow.position.set(0,.142,-1.161);root.add(muzzleGlow);
  const muzzleFlare=part(new THREE.PlaneGeometry(.25,.25),
    new THREE.MeshBasicMaterial({map:flareTexture,color:0xffbf8a,
      transparent:true,opacity:0,depthWrite:false,
      blending:THREE.AdditiveBlending,side:THREE.DoubleSide}),
    0,.142,-1.170);
  muzzleFlare.visible=false;muzzleFlare.userData.ignoreSightProbe=true;
  return {root,magazine,magazineBase,slideGroup,gripHand,supportHand,
    reloadHand,trigger,muzzleGlow,muzzleFlare,flashScale:.91,
    magBaseX:-.182,magBaseY:.060,magBaseZ:-.153,
    magFootX:0,magFootY:0,
    defaultX:.255,defaultY:-.360,defaultZ:-1.04,
    sightLocal:new THREE.Vector3(0,.285,.029),
    ejectionLocal:new THREE.Vector3(.145,.146,-.145)};
}
