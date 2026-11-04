// W20.29: One mechanically continuous six-shell, tube-fed pump-action shotgun.
// Forged receiver, real joined barrel/magazine assembly, sliding fore-end and
// action rails, chamber port, physical loading port and first-/third-person rigs.
export function createPumpActionShotgun(THREE,parent,{thirdPerson=false,flareTexture=null}={}){
  const root=new THREE.Group();
  root.name=thirdPerson?'PumpShotgunWorldHeld':'PumpShotgunFirstPerson';
  root.position.set(thirdPerson?0:.29,thirdPerson?-.09:-.37,thirdPerson?.038:-1.13);
  if(thirdPerson)root.scale.setScalar(.68);
  parent.add(root);
  const iron=new THREE.MeshStandardMaterial({color:0x414943,roughness:.79,metalness:.43});
  const oxide=new THREE.MeshStandardMaterial({color:0x292e2d,roughness:.86,metalness:.36});
  const worn=new THREE.MeshStandardMaterial({color:0x76624f,roughness:.91,metalness:.22});
  const rust=new THREE.MeshStandardMaterial({color:0x835037,roughness:.96,metalness:.16});
  const wood=new THREE.MeshStandardMaterial({color:0x67472f,roughness:.98,metalness:.03});
  const deepWood=new THREE.MeshStandardMaterial({color:0x372a22,roughness:.99});
  const brass=new THREE.MeshStandardMaterial({color:0xb5a16d,roughness:.61,metalness:.65});
  const red=new THREE.MeshStandardMaterial({color:0x9a3534,roughness:.92});
  const glove=new THREE.MeshStandardMaterial({color:0x3a443a,roughness:.98});
  const part=(geometry,material,x,y,z,group=root)=>{
    const m=new THREE.Mesh(geometry,material);
    m.position.set(x,y,z);m.castShadow=thirdPerson;group.add(m);return m;
  };
  const box=(w,h,d,material,x,y,z,group=root)=>
    part(new THREE.BoxGeometry(w,h,d),material,x,y,z,group);
  const tube=(radius,length,material,x,y,z,group=root)=>{
    const mesh=part(new THREE.CylinderGeometry(radius,radius,length,18),material,x,y,z,group);
    mesh.rotation.x=Math.PI/2;return mesh;
  };
  // Profile coordinates map to world Z/Y; stock and receiver intersect.
  const panel=(points,width,material,group=root)=>{
    const shape=new THREE.Shape();
    shape.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++)shape.lineTo(points[i][0],points[i][1]);
    shape.closePath();
    const mesh=part(new THREE.ExtrudeGeometry(shape,{
      depth:width,bevelEnabled:true,bevelSize:.009,bevelThickness:.008,
      bevelSegments:2,steps:1
    }),material,width/2,0,0,group);
    mesh.rotation.y=-Math.PI/2;return mesh;
  };
  const pin=(x,y,z)=>{
    const rivet=part(new THREE.CylinderGeometry(.011,.011,.009,10),brass,x,y,z);
    rivet.rotation.z=Math.PI/2;return rivet;
  };
  panel([[-.44,-.112],[-.40,.201],[-.27,.225],[.137,.217],
    [.322,.113],[.314,-.138],[.14,-.174],[-.336,-.174]],.258,iron)
    .name='PumpForgedReceiver';
  panel([[.171,.083],[.333,.139],[.51,.094],[.754,-.068],
    [.819,-.138],[.812,-.231],[.621,-.276],[.431,-.204],
    [.196,-.126]],.220,wood).name='PumpFullWoodStock';
  panel([[.159,-.117],[.327,-.115],[.52,-.198],
    [.623,-.257],[.351,-.214]],.172,oxide).name='PumpStockTang';
  box(.226,.272,.049,deepWood,0,-.146,.815).name='PumpButtpad';
  for(const side of [-1,1]){
    box(.016,.141,.103,rust,side*.111,-.045,.642)
      .name='PumpStockReinforcement';
    for(const z of [.571,.680])pin(side*.127,-.062,z);
    for(const z of [-.315,-.138,.054])pin(side*.143,.098,z);
  }
  const pistolGrip=box(.166,.310,.175,wood,0,-.282,.208);
  pistolGrip.rotation.x=-.27;
  for(const side of [-1,1])
    for(let n=0;n<4;n++)
      box(.012,.023,.142,deepWood,side*.088,-.365+n*.062,.202);
  box(.205,.042,.181,oxide,0,-.422,.235);
  const trigger=box(.022,.099,.025,brass,0,-.216,.031);
  trigger.rotation.x=-.21;
  box(.028,.038,.155,oxide,0,-.314,.084).name='PumpTriggerGuard';

  // True full-length forged barrel overlaps the stationary receiver.
  tube(.066,1.36,oxide,0,.160,-.722).name='PumpMainBarrel';
  tube(.073,.11,worn,0,.160,-1.336).name='PumpMuzzleSleeve';
  const muzzleRing=part(new THREE.TorusGeometry(.048,.012,8,24),
    iron,0,.160,-1.405);
  muzzleRing.name='PumpOpenMuzzleRing';
  box(.077,.018,1.075,iron,0,.232,-.771)
    .name='PumpContinuousBarrelRib';
  for(const z of [-.91,-.57,-.25])
    box(.184,.025,.043,rust,0,.229,z).name='PumpWeldedRibClamp';
  // The shell-storage tube sits directly BELOW and attaches to the receiver.
  tube(.048,1.06,oxide,0,-.068,-.704).name='PumpFixedMagazineTube';
  tube(.057,.054,brass,0,-.068,-1.240).name='PumpMagazineEndCap';
  for(const z of [-1.044,-.385]){
    box(.158,.134,.077,iron,0,.046,z).name='PumpBarrelTubeBridge';
    for(const side of [-1,1])pin(side*.083,.038,z);
  }

  // The movable fore-end has joined walnut, grooves and two real action bars.
  // Its group moves TOWARD the receiver; fixed tube and barrel remain stationary.
  const pumpGroup=new THREE.Group();
  pumpGroup.name='PumpSlidingForend';
  root.add(pumpGroup);
  panel([[-1.067,-.153],[-1.045,-.093],[-.548,-.092],
    [-.504,-.158],[-.540,-.218],[-1.027,-.218]],.211,wood,pumpGroup)
    .name='PumpJoinedWoodForend';
  for(const side of [-1,1]){
    for(const z of [-.986,-.917,-.848,-.779,-.710,-.641]){
      box(.013,.080,.018,deepWood,side*.108,-.153,z,pumpGroup)
        .name='PumpForendFingerGroove';
    }
    box(.015,.028,.832,iron,side*.095,-.027,-.418,pumpGroup)
      .name='PumpReceiverActionBar';
    box(.046,.095,.156,oxide,side*.080,-.083,-.658,pumpGroup)
      .name='PumpForendRailMount';
  }
  const supportHand=new THREE.Group();
  pumpGroup.add(supportHand);
  // Ejection port is fixed to the receiver. Bolt alone retracts on pump.
  box(.008,.108,.277,oxide,.137,.101,-.135).name='PumpOpenEjectionPort';
  const boltGroup=new THREE.Group();
  boltGroup.name='PumpSlidingBolt';
  root.add(boltGroup);
  box(.018,.085,.233,worn,.146,.101,-.143,boltGroup)
    .name='PumpActionBoltFace';
  box(.032,.045,.047,brass,.165,.137,-.087,boltGroup)
    .name='PumpBoltLug';

  // Loading gate and moving shell must meet, not appear beside the shotgun.
  box(.108,.020,.219,oxide,0,-.181,-.139).name='PumpBottomLoadingGate';
  box(.071,.014,.163,iron,0,-.193,-.143).name='PumpLoadingGateSpring';
  const reloadAction=new THREE.Group();
  reloadAction.name='PumpHandLoadedShell';
  root.add(reloadAction);
  tube(.037,.137,red,0,0,0,reloadAction);
  tube(.044,.019,brass,0,0,.075,reloadAction);
  reloadAction.visible=false;
  const reloadHand=new THREE.Group();root.add(reloadHand);
  if(!thirdPerson){
    box(.143,.148,.180,glove,.108,-.302,.191);
    box(.173,.138,.202,glove,-.134,-.147,-.750,supportHand);
    for(let n=0;n<4;n++)
      box(.031,.085,.115,glove,-.086+n*.042,-.075,-.746,supportHand);
    box(.152,.145,.181,glove,0,0,0,reloadHand);
    for(let n=0;n<4;n++)
      box(.033,.083,.108,glove,-.052+n*.034,.075,-.008,reloadHand);
  }
  reloadHand.visible=false;
  // True line-of-sight zero: front brass bead top and rear dots both Y=.270.
  box(.062,.105,.076,iron,0,.210,-1.294)
    .name='PumpFrontSightPedestal';
  const front=box(.018,.012,.023,brass,0,.264,-1.294);
  front.name='PumpFrontSightTip';front.userData.sightReference=true;
  box(.165,.050,.104,iron,0,.219,-.207).name='PumpRearSightBridge';
  for(const side of [-1,1]){
    box(.026,.056,.026,oxide,side*.052,.232,-.191);
    const dot=box(.014,.012,.014,brass,side*.052,.264,-.191);
    dot.userData.sightReference=true;
  }

  // Hidden compatibility handles. This gun never swaps a pistol magazine.
  const magazine=new THREE.Group(),magazineBase=new THREE.Group();
  const slideGroup=new THREE.Group();
  root.add(magazine,magazineBase,slideGroup);
  magazine.visible=false;magazineBase.visible=false;
  const muzzleGlow=new THREE.PointLight(0xffb877,0,2.3,2);
  muzzleGlow.position.set(0,.160,-1.431);root.add(muzzleGlow);
  const flareMat=new THREE.MeshBasicMaterial({
    map:flareTexture,color:0xffc69a,transparent:true,opacity:0,
    depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide
  });
  const muzzleFlare=part(new THREE.PlaneGeometry(.46,.46),
    flareMat,0,.160,-1.435);
  muzzleFlare.visible=false;
  return {root,pumpGroup,boltGroup,reloadAction,slideGroup,magazine,
    magazineBase,reloadHand,supportHand,trigger,muzzleGlow,muzzleFlare,
    flashScale:1.55,magBaseY:0,magFootY:0,
    defaultX:.29,defaultY:-.37,defaultZ:-1.13,
    sightLocal:new THREE.Vector3(0,.270,-.19),
    ejectionLocal:new THREE.Vector3(.184,.11,-.14)};
}
