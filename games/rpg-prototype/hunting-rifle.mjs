// W20.30: original, connected bolt-action hunting rifle.
// A forged steel receiver, full walnut stock, bedded long barrel, stationary
// wooden fore-end, true lift/slide bolt, top feed port and one-at-a-time rounds.
export function createHuntingRifle(THREE,parent,{thirdPerson=false,flareTexture=null}={}){
  const root=new THREE.Group();
  root.name=thirdPerson?'HuntingRifleWorldHeld':'HuntingRifleFirstPerson';
  root.position.set(thirdPerson?0:.265,thirdPerson?-.075:-.385,thirdPerson?.033:-1.20);
  if(thirdPerson)root.scale.setScalar(.68);
  parent.add(root);
  const iron=new THREE.MeshStandardMaterial({color:0x4a5050,metalness:.54,roughness:.72});
  const blueSteel=new THREE.MeshStandardMaterial({color:0x22292d,metalness:.56,roughness:.75});
  const worn=new THREE.MeshStandardMaterial({color:0x69645b,metalness:.36,roughness:.86});
  const rusty=new THREE.MeshStandardMaterial({color:0x825039,metalness:.20,roughness:.94});
  const walnut=new THREE.MeshStandardMaterial({color:0x60412d,metalness:.02,roughness:.97});
  const darkWood=new THREE.MeshStandardMaterial({color:0x352a22,roughness:.99});
  const brass=new THREE.MeshStandardMaterial({color:0xb7a06a,metalness:.70,roughness:.53});
  const copper=new THREE.MeshStandardMaterial({color:0xb76741,metalness:.62,roughness:.56});
  const glove=new THREE.MeshStandardMaterial({color:0x3b443c,roughness:.97});
  const part=(geometry,material,x,y,z,group=root)=>{
    const mesh=new THREE.Mesh(geometry,material);
    mesh.position.set(x,y,z);mesh.castShadow=thirdPerson;group.add(mesh);return mesh;
  };
  const box=(w,h,d,material,x,y,z,group=root)=>
    part(new THREE.BoxGeometry(w,h,d),material,x,y,z,group);
  const tube=(r,len,material,x,y,z,group=root)=>{
    const mesh=part(new THREE.CylinderGeometry(r,r,len,16),material,x,y,z,group);
    mesh.rotation.x=Math.PI/2;return mesh;
  };
  const panel=(points,width,material,group=root)=>{
    const shape=new THREE.Shape();
    shape.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++)shape.lineTo(points[i][0],points[i][1]);
    shape.closePath();
    const mesh=part(new THREE.ExtrudeGeometry(shape,{
      depth:width,bevelEnabled:true,bevelSize:.009,bevelThickness:.007,
      bevelSegments:2,steps:1
    }),material,width/2,0,0,group);
    mesh.rotation.y=-Math.PI/2;return mesh;
  };
  const rivet=(x,y,z)=>{
    const m=part(new THREE.CylinderGeometry(.010,.010,.012,10),brass,x,y,z);
    m.rotation.z=Math.PI/2;return m;
  };

  // Traditional full wood stock and trigger wrist overlap steel receiver.
  panel([[-.463,-.110],[-.434,.165],[-.272,.217],
    [.084,.204],[.295,.133],[.351,-.081],[.245,-.166],
    [-.302,-.175]],.229,iron).name='HuntingForgedReceiver';
  panel([[.174,.040],[.294,.128],[.449,.113],[.670,.032],
    [.937,-.096],[.946,-.212],[.776,-.273],[.560,-.244],
    [.373,-.191],[.197,-.115]],.222,walnut)
    .name='HuntingFullWoodStock';
  panel([[.166,-.116],[.370,-.115],[.568,-.195],
    [.691,-.239],[.402,-.194]],.171,blueSteel)
    .name='HuntingStockReinforcement';
  box(.228,.236,.061,darkWood,0,-.154,.948).name='HuntingButtpad';
  box(.160,.049,.248,darkWood,0,.080,.515);
  const grip=box(.148,.272,.179,walnut,0,-.256,.194);grip.rotation.x=-.28;
  for(const side of [-1,1]){
    for(let i=0;i<3;i++)
      box(.013,.023,.155,darkWood,side*.081,-.325+i*.052,.194);
    for(const z of [.443,.603,.764])rivet(side*.111,-.046,z);
  }
  const trigger=box(.018,.104,.024,brass,0,-.198,.026);
  trigger.rotation.x=-.21;
  box(.178,.025,.181,blueSteel,0,-.315,.072).name='HuntingTriggerGuard';

  // Integral long barrel enters the receiver and its wooden bedding.
  tube(.061,1.58,blueSteel,0,.163,-.908).name='HuntingFullLengthBarrel';
  tube(.068,.115,iron,0,.163,-1.632).name='HuntingMuzzleSleeve';
  part(new THREE.TorusGeometry(.044,.012,7,22),
    blueSteel,0,.163,-1.701).name='HuntingOpenMuzzleRing';
  tube(.068,.22,worn,0,.163,-.437).name='HuntingReceiverBarrelSeat';
  panel([[-1.372,-.123],[-1.313,.093],[-.466,.114],
    [-.429,-.110],[-.522,-.177],[-1.308,-.175]],
    .203,walnut).name='HuntingBeddedWoodForestock';
  box(.105,.033,.944,blueSteel,0,.087,-.906)
    .name='HuntingForestockMetalBedding';
  for(const z of [-1.307,-.844,-.528]){
    box(.224,.051,.055,rusty,0,.079,z)
      .name='HuntingBarrelBand';
    for(const side of [-1,1])rivet(side*.114,.084,z);
  }
  for(const side of [-1,1]){
    for(const z of [-1.230,-1.110,-.990,-.870,-.750]){
      box(.012,.065,.023,darkWood,side*.103,-.119,z)
        .name='HuntingForestockGripCut';
    }
  }
  // Narrow, purposeful five-round internal magazine under receiver.
  box(.183,.183,.238,blueSteel,0,-.217,-.095)
    .name='HuntingFixedMagazineHousing';
  box(.150,.033,.193,iron,0,-.317,-.095)
    .name='HuntingMagazineFloorplate';

  // Openable ejection/feeding port is actually cut visually on receiver top.
  box(.129,.012,.292,blueSteel,0,.227,-.152)
    .name='HuntingReceiverOpenFeedPort';
  box(.092,.019,.200,iron,0,.220,-.155)
    .name='HuntingFeedRamp';
  // Bolt's slide and lift remain one coupled assembly.
  const boltAssembly=new THREE.Group();
  boltAssembly.name='HuntingRotatingSlidingBolt';
  boltAssembly.position.set(0,.156,-.135);root.add(boltAssembly);
  tube(.053,.322,worn,0,0,0,boltAssembly)
    .name='HuntingBoltCylinder';
  tube(.065,.040,iron,0,0,.130,boltAssembly)
    .name='HuntingBoltRearCollar';
  box(.205,.029,.034,iron,.101,-.028,.095,boltAssembly)
    .name='HuntingBoltHandleStem';
  const boltKnob=part(new THREE.SphereGeometry(.054,12,8),
    walnut,.208,-.029,.095,boltAssembly);
  boltKnob.name='HuntingBoltHandleKnob';
  // The lift handle and bolt cylinder rotate and translate AS ONE.
  const loadingShell=new THREE.Group();
  loadingShell.name='HuntingTopLoadedCartridge';
  root.add(loadingShell);
  tube(.022,.121,brass,0,0,0,loadingShell);
  tube(.019,.028,copper,0,0,-.075,loadingShell);
  tube(.025,.011,worn,0,0,.065,loadingShell);
  loadingShell.visible=false;
  const reloadHand=new THREE.Group();root.add(reloadHand);
  const supportHand=new THREE.Group();root.add(supportHand);
  const gripHand=new THREE.Group();root.add(gripHand);
  const boltCycleHand=new THREE.Group();boltAssembly.add(boltCycleHand);
  if(!thirdPerson){
    box(.142,.142,.172,glove,.113,-.294,.161,gripHand);
    box(.146,.133,.160,glove,.208,-.107,.095,boltCycleHand);
    box(.179,.142,.211,glove,-.129,-.122,-1.003,supportHand);
    for(let i=0;i<4;i++)
      box(.033,.085,.123,glove,-.080+i*.041,-.052,-1.006,supportHand);
    box(.158,.154,.167,glove,0,0,0,reloadHand);
    for(let i=0;i<4;i++)
      box(.033,.081,.103,glove,-.051+i*.034,.076,-.013,reloadHand);
  }
  reloadHand.visible=false;boltCycleHand.visible=false;

  // Brass tips physically touch their iron supports and share the ADS ray.
  box(.056,.115,.086,iron,0,.229,-1.592)
    .name='HuntingFrontSightPedestal';
  const bead=box(.017,.012,.019,brass,0,.284,-1.592);
  bead.name='HuntingFrontSightTip';bead.userData.sightReference=true;
  box(.187,.059,.120,iron,0,.220,-.233).name='HuntingRearSightBridge';
  for(const side of [-1,1]){
    box(.024,.070,.027,blueSteel,side*.063,.250,-.239);
    const dot=box(.014,.012,.015,brass,side*.063,.284,-.239);
    dot.userData.sightReference=true;
  }
  const magazine=new THREE.Group(),magazineBase=new THREE.Group();
  const slideGroup=new THREE.Group();root.add(magazine,magazineBase,slideGroup);
  magazine.visible=false;magazineBase.visible=false;
  const muzzleGlow=new THREE.PointLight(0xffb780,0,2.3,2);
  muzzleGlow.position.set(0,.163,-1.719);root.add(muzzleGlow);
  const flareMat=new THREE.MeshBasicMaterial({
    map:flareTexture,color:0xffc7a2,transparent:true,opacity:0,
    depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide
  });
  const muzzleFlare=part(new THREE.PlaneGeometry(.31,.31),
    flareMat,0,.163,-1.724);muzzleFlare.visible=false;
  return {root,boltAssembly,gripHand,boltCycleHand,
    reloadAction:loadingShell,slideGroup,
    magazine,magazineBase,reloadHand,supportHand,trigger,muzzleGlow,
    muzzleFlare,flashScale:1.22,magBaseY:0,magFootY:0,
    defaultX:.265,defaultY:-.385,defaultZ:-1.20,
    sightLocal:new THREE.Vector3(0,.290,-.239),
    ejectionLocal:new THREE.Vector3(.151,.190,-.164)};
}
