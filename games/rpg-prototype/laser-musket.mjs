// W20.26 · original post-war hand-cranked laser musket.
// Salvaged wooden stock, iron frame, copper coils, exposed capacitor, genuine
// rotating side crank and the character's hand attached to the crank grip.
export function createLaserMusket(THREE,parent,{thirdPerson=false,flareTexture=null}={}){
  const root=new THREE.Group();
  root.name=thirdPerson?'LaserMusketWorldHeld':'LaserMusketFirstPerson';
  root.position.set(thirdPerson?0:.37,thirdPerson?-.085:-.34,thirdPerson?.045:-1.08);
  if(thirdPerson)root.scale.setScalar(.68);
  parent.add(root);
  const iron=new THREE.MeshStandardMaterial({color:0x4a4d48,roughness:.91,metalness:.37});
  const gunmetal=new THREE.MeshStandardMaterial({color:0x2c3230,roughness:.86,metalness:.42});
  const rust=new THREE.MeshStandardMaterial({color:0x91583b,roughness:.97,metalness:.22});
  const copper=new THREE.MeshStandardMaterial({color:0xa7774d,roughness:.66,metalness:.71});
  const brass=new THREE.MeshStandardMaterial({color:0xb5a16a,roughness:.59,metalness:.64});
  const wood=new THREE.MeshStandardMaterial({color:0x634b38,roughness:.97});
  const woodDark=new THREE.MeshStandardMaterial({color:0x352e29,roughness:.98});
  const insulated=new THREE.MeshStandardMaterial({color:0x352f2d,roughness:.98});
  const glove=new THREE.MeshStandardMaterial({color:0x454943,roughness:.96});
  const crystal=new THREE.MeshStandardMaterial({color:0x9e2d2e,metalness:.13,roughness:.29,
    emissive:0xd11c20,emissiveIntensity:.4});
  const lens=new THREE.MeshStandardMaterial({color:0x5f191b,metalness:.4,roughness:.3,
    emissive:0xff232b,emissiveIntensity:1.3});
  const part=(geo,material,x,y,z,g=root)=>{
    const mesh=new THREE.Mesh(geo,material);
    mesh.position.set(x,y,z);mesh.castShadow=thirdPerson;g.add(mesh);return mesh;
  };
  const box=(w,h,d,mat,x,y,z,g=root)=>part(new THREE.BoxGeometry(w,h,d),mat,x,y,z,g);
  const tube=(r,len,mat,x,y,z,g=root)=>{
    const mesh=part(new THREE.CylinderGeometry(r,r,len,14),mat,x,y,z,g);
    mesh.rotation.x=Math.PI/2;return mesh;
  };
  const panel=(points,width,material,g=root)=>{
    const shape=new THREE.Shape();
    shape.moveTo(points[0][0],points[0][1]);
    for(const p of points.slice(1))shape.lineTo(p[0],p[1]);
    shape.closePath();
    const mesh=part(new THREE.ExtrudeGeometry(shape,{
      depth:width,bevelEnabled:true,bevelSize:.008,bevelThickness:.007,
      bevelSegments:2,steps:1,curveSegments:2
    }),material,width/2,0,0,g);
    mesh.rotation.y=-Math.PI/2;return mesh;
  };
  const rivet=(x,y,z)=>{
    const mesh=part(new THREE.CylinderGeometry(.011,.011,.012,9),brass,x,y,z);
    mesh.rotation.z=Math.PI/2;return mesh;
  };
  // Joined furniture: the breech, shroud and full-length stock overlap the
  // same chassis, leaving no unsupported pieces when viewed from underneath.
  panel([[-.49,-.108],[-.462,.115],[-.348,.211],
    [-.102,.216],[.266,.174],[.339,.061],[.308,-.130],
    [.127,-.176],[-.342,-.173]],.245,iron).name='LaserMusketReceiver';
  panel([[-1.126,-.061],[-1.083,.142],[-.465,.160],
    [-.348,.121],[-.352,-.128],[-1.09,-.122]],.167,gunmetal)
    .name='LaserMusketCoilCage';
  box(.177,.065,.217,iron,0,-.049,-.409).name='LaserMusketReceiverBridge';
  panel([[.185,.095],[.337,.129],[.493,.083],[.740,-.068],
    [.795,-.128],[.788,-.269],[.584,-.282],[.404,-.209],
    [.239,-.126]],.197,wood).name='LaserMusketFullStock';
  panel([[.158,-.116],[.332,-.112],[.526,-.216],
    [.608,-.277],[.327,-.221]],.146,iron).name='LaserMusketStockTang';
  box(.220,.323,.065,gunmetal,0,-.106,.781).name='LaserMusketButtplate';
  box(.201,.064,.328,woodDark,0,.117,.489).name='LaserMusketCheekRest';
  for(const side of [-1,1]){
    box(.019,.203,.095,rust,side*.108,-.051,.588);
    for(const z of [.555,.616])rivet(side*.124,-.074,z);
    box(.018,.022,.28,iron,side*.097,-.175,.588);
  }
  const grip=box(.150,.321,.154,wood,0,-.305,.215);grip.rotation.x=-.20;
  box(.169,.032,.156,gunmetal,0,-.471,.238);
  box(.019,.104,.022,brass,0,-.233,.067).rotation.x=-.18;
  for(const side of [-1,1]){
    for(let i=0;i<3;i++)
      box(.015,.021,.13,woodDark,side*.081,-.367+i*.067,.214);
    for(const z of [-.346,-.211,-.054,.110])
      rivet(side*.132,.111,z);
  }

  // Continuous pipe sits within the cage and terminates in one emitter.
  tube(.058,.910,iron,0,.061,-.826).name='LaserMusketBarrelPipe';
  tube(.080,.256,rust,0,.061,-1.272).name='LaserMusketRustedMuzzleSleeve';
  tube(.072,.055,gunmetal,0,.061,-1.414).name='LaserMusketEmitterMouth';
  tube(.048,.062,lens,0,.061,-1.445).name='LaserMusketRedEmitter';
  for(const z of [-1.355,-1.272,-1.188]){
    tube(.086,.023,iron,0,.061,z);
  }
  // Electrified copper helix on an OPEN central conduit. Each ring is
  // embedded around the same real barrel; the bracing bars carry their mass.
  const chargeRings=[];
  for(let i=0;i<8;i++){
    const z=-1.02+i*.075;
    const ring=part(new THREE.TorusGeometry(.089,.014,7,16),copper,0,.061,z);
    ring.name='LaserMusketCopperCoil';chargeRings.push(ring);
  }
  for(const side of [-1,1]){
    box(.024,.027,.713,rust,side*.116,-.053,-.765)
      .name='LaserMusketCopperCageRail';
    box(.024,.028,.664,copper,side*.117,.142,-.762);
    for(const z of [-1.041,-.731,-.483]){
      const clamp=box(.028,.176,.040,iron,side*.117,.048,z);
      clamp.name='LaserMusketCoilFrameClamp';
      rivet(side*.133,-.040,z);
    }
    // Heavy insulated power feed with copper joints, wired into the cell well.
    tube(.019,.411,insulated,side*.117,-.121,-.430);
    tube(.032,.068,copper,side*.117,-.121,-.252);
    box(.028,.117,.034,rust,side*.119,-.050,-.246);
  }

  // Six-cell block seats in a rugged receiver socket and is physically
  // removable by the same magazine motion shared with the other weapons.
  box(.208,.145,.225,gunmetal,0,-.149,-.124).name='LaserMusketCellSocket';
  const magazine=box(.170,.306,.188,rust,0,-.293,-.124);
  magazine.name='LaserMusketFusionCellPack';
  for(const side of [-1,1]){
    for(let i=0;i<3;i++){
      const rod=box(.014,.222,.021,brass,side*.081,0,-.061+i*.061,magazine);
      rod.name='LaserMusketCellConduit';
    }
  }
  const magazineBase=box(.190,.041,.210,gunmetal,0,-.459,-.124);
  magazineBase.name='LaserMusketCellPackFoot';
  box(.229,.037,.246,iron,0,-.081,-.124);

  // Exposed capacitor window has glowing internal plasma, metal brackets,
  // and reinforced wiring: never an isolated glowing cylinder.
  box(.166,.096,.265,gunmetal,0,.152,-.222).name='LaserMusketCapacitorBase';
  const capacitor=box(.106,.080,.213,crystal,0,.217,-.222);
  capacitor.name='LaserMusketChargeCrystal';
  for(const z of [-.331,-.113]){
    box(.205,.029,.040,iron,0,.238,z).name='LaserMusketCapacitorClamp';
  }
  // Rear + front iron dots share the same measured Y=.263 sight line.
  box(.177,.045,.129,gunmetal,0,.207,.214).name='LaserMusketRearSightBridge';
  for(const side of [-1,1]){
    box(.031,.066,.036,iron,side*.062,.221,.229)
      .userData.sightReference=true;
    box(.016,.012,.018,brass,side*.062,.257,.229)
      .userData.sightReference=true;
  }
  box(.071,.140,.093,gunmetal,0,.184,-1.151)
    .name='LaserMusketFrontSightSupport';
  const bead=box(.017,.014,.021,brass,0,.256,-1.151);
  bead.name='LaserMusketFrontSightTip';
  bead.userData.sightReference=true;
  // Its upper surface is .263, exactly matching rear brass dots.

  // Working rotary crank on the right side. Wheel and handle occupy one
  // rotating assembly; the hand is socketed directly onto the handle.
  box(.075,.213,.222,rust,.157,-.002,-.148).name='LaserMusketCrankGearbox';
  const crankPivot=new THREE.Group();
  crankPivot.name='LaserMusketRotatingCrank';
  crankPivot.position.set(.208,-.003,-.148);
  root.add(crankPivot);
  tube(.062,.051,iron,0,0,0,crankPivot).rotation.x=0;
  const wheel=part(new THREE.TorusGeometry(.105,.017,8,24),
    copper,0,0,0,crankPivot);
  wheel.rotation.y=Math.PI/2;wheel.name='LaserMusketHandCrankWheel';
  box(.029,.021,.220,iron,0,0,0,crankPivot);
  box(.029,.219,.021,iron,0,0,0,crankPivot);
  // A single peg crosses through the outer wheel and is clamped to its rim.
  box(.057,.040,.044,rust,.024,.077,.077,crankPivot)
    .name='LaserMusketCrankHandleJoint';
  box(.083,.039,.035,wood,.070,.077,.077,crankPivot)
    .name='LaserMusketCrankGrip';
  const chargeHand=new THREE.Group();
  chargeHand.name='LaserMusketChargingHand';
  chargeHand.position.set(.115,.079,.078);
  crankPivot.add(chargeHand);
  if(!thirdPerson){
    box(.161,.133,.163,glove,0,0,0,chargeHand);
    for(let i=0;i<4;i++)
      box(.030,.076,.065,glove,-.053+i*.034,-.073,.005,chargeHand);
  }
  chargeHand.visible=false;

  const slideGroup=new THREE.Group();root.add(slideGroup);
  const trigger=box(.020,.083,.030,brass,0,-.194,.072);
  const supportHand=new THREE.Group();root.add(supportHand);
  const reloadHand=new THREE.Group();root.add(reloadHand);
  if(!thirdPerson){
    box(.144,.155,.162,glove,.102,-.322,.206);
    box(.178,.136,.180,glove,-.127,-.099,-.810,supportHand);
    for(let i=0;i<4;i++)
      box(.033,.090,.123,glove,-.088+i*.041,-.031,-.803,supportHand);
    box(.152,.142,.160,glove,0,0,0,reloadHand);
    for(let i=0;i<4;i++)
      box(.032,.075,.093,glove,-.049+i*.034,.077,-.013,reloadHand);
  }
  reloadHand.visible=false;
  const muzzleGlow=new THREE.PointLight(0xff324a,0,2.6,2);
  muzzleGlow.position.set(0,.061,-1.466);root.add(muzzleGlow);
  const flareMat=new THREE.MeshBasicMaterial({
    map:flareTexture,color:0xff4655,transparent:true,opacity:0,
    depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide
  });
  const muzzleFlare=part(new THREE.PlaneGeometry(.37,.37),flareMat,0,.061,-1.471);
  muzzleFlare.visible=false;
  return {root,slideGroup,magazine,magazineBase,reloadHand,supportHand,
    chargeHand,crankPivot,chargeRings,capacitor,trigger,muzzleGlow,muzzleFlare,
    magBaseY:-.293,magFootY:-.459,flashScale:1.22,
    defaultX:.37,defaultY:-.34,defaultZ:-1.08,
    sightLocal:new THREE.Vector3(0,.263,-.14),
    ejectionLocal:new THREE.Vector3(.16,.075,-.08)};
}
