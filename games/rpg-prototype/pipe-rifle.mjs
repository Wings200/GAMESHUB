// W20.24: authored, modular pipe rifle for the browser mechanics range.
// Hand-built fitted metal/wood chassis; no borrowed or floating gun assets.
export function createPipeRifle(THREE,parent,{thirdPerson=false,flareTexture=null}={}){
  const root=new THREE.Group();
  root.name=thirdPerson?'PipeRifleWorldHeld':'PipeRifleFirstPerson';
  root.position.set(thirdPerson?0:.37,thirdPerson?-.085:-.35,thirdPerson?.045:-1.02);
  if(thirdPerson)root.scale.setScalar(.68);
  parent.add(root);

  const iron=new THREE.MeshStandardMaterial({color:0x424b4b,metalness:.52,roughness:.73});
  const steel=new THREE.MeshStandardMaterial({color:0x777e7a,metalness:.63,roughness:.61});
  const blued=new THREE.MeshStandardMaterial({color:0x252f32,metalness:.49,roughness:.72});
  const rust=new THREE.MeshStandardMaterial({color:0x8b5844,metalness:.34,roughness:.86});
  const wood=new THREE.MeshStandardMaterial({color:0x674a33,metalness:.03,roughness:.97});
  const woodEdge=new THREE.MeshStandardMaterial({color:0x3f3027,metalness:.04,roughness:.95});
  const brass=new THREE.MeshStandardMaterial({color:0xb2a17b,metalness:.58,roughness:.59});
  const canvas=new THREE.MeshStandardMaterial({color:0x575446,metalness:0,roughness:1});
  const glove=new THREE.MeshStandardMaterial({color:0x3d453d,metalness:0,roughness:.95});

  const part=(geo,material,x,y,z,g=root)=>{
    const mesh=new THREE.Mesh(geo,material);
    mesh.position.set(x,y,z);
    mesh.castShadow=thirdPerson;
    g.add(mesh);
    return mesh;
  };
  const box=(w,h,d,material,x,y,z,g=root)=>
    part(new THREE.BoxGeometry(w,h,d),material,x,y,z,g);
  const tube=(radius,length,material,x,y,z,g=root)=>{
    const mesh=part(new THREE.CylinderGeometry(radius,radius,length,14),material,x,y,z,g);
    mesh.rotation.x=Math.PI/2;
    return mesh;
  };
  // Folded sheet-metal extrusions run along the rifle's Z axis. Profile X
  // becomes world Z after rotation; thickness is centered across world X.
  const panel=(profile,width,material,g=root)=>{
    const shape=new THREE.Shape();
    shape.moveTo(profile[0][0],profile[0][1]);
    for(let i=1;i<profile.length;i++)shape.lineTo(profile[i][0],profile[i][1]);
    shape.closePath();
    const mesh=part(new THREE.ExtrudeGeometry(shape,{
      depth:width,bevelEnabled:true,bevelSize:.009,bevelThickness:.007,
      bevelSegments:2,curveSegments:3,steps:1
    }),material,width/2,0,0,g);
    mesh.rotation.y=-Math.PI/2;
    return mesh;
  };
  const rivet=(x,y,z)=>{
    const screw=part(new THREE.CylinderGeometry(.013,.013,.010,10),
      brass,x,y,z);
    screw.rotation.z=Math.PI/2;
    return screw;
  };

  // The breech overlaps the barrel shroud and the buttstock tang; all three
  // pieces are a continuous silhouette, not disconnected cylinder props.
  const receiver=panel([[-.49,-.065],[-.455,.095],[-.37,.210],
    [-.09,.225],[.240,.196],[.332,.102],[.313,-.113],
    [.185,-.157],[-.333,-.149]],.245,iron);
  receiver.name='PipeRifleReceiverShell';
  const topCover=panel([[-.438,.157],[-.380,.218],[-.075,.233],
    [.205,.212],[.268,.173],[.268,.145]],.230,steel);
  topCover.name='ReceiverTopCover';
  const handguard=panel([[-1.088,.023],[-1.036,.142],[-.469,.171],
    [-.347,.128],[-.361,-.078],[-1.035,-.068]],.204,steel);
  handguard.name='PipeRifleHandguardShell';
  panel([[-1.055,-.056],[-.430,-.072],[-.329,-.149],
    [.027,-.155],[-.008,-.204],[-.53,-.124],[-1.045,-.10]],.114,rust);
  tube(.061,.55,blued,0,.071,-.888);
  tube(.055,.32,steel,0,.071,-1.074);
  // Muzzle collar actually encloses the last section of barrel.
  tube(.075,.075,blued,0,.071,-1.213);
  box(.137,.032,.135,iron,0,-.053,-.416).name='ShroudReceiverBridge';
  for(const side of [-1,1]){
    // Recessed vent impressions and welded lengthwise reinforcing seams.
    for(const z of [-.94,-.79,-.64,-.49])
      box(.010,.027,.074,blued,side*.110,.078,z);
    box(.015,.023,.61,rust,side*.109,-.018,-.725);
    for(const z of [-.405,-.261,-.11,.08,.219])
      rivet(side*.133,.114,z);
  }

  // Real wood-stock silhouette cut from one continuous shaped panel.
  const stock=panel([[.185,.087],[.321,.137],[.483,.126],[.643,.034],
    [.777,-.039],[.782,-.248],[.603,-.273],[.425,-.211],
    [.253,-.135]],.190,wood);
  stock.name='PipeRifleStockBody';
  const stockTang=panel([[.165,-.085],[.319,-.082],[.533,-.172],
    [.589,-.263],[.362,-.223],[.186,-.145]],.160,iron);
  stockTang.name='PipeRifleStockTang';
  // Stock end and cheek rest overlap the wood without small detached gaps.
  box(.210,.405,.071,blued,0,-.059,.767).name='PipeRifleButtplate';
  box(.193,.058,.302,woodEdge,0,.119,.478).name='StockCheekRest';
  for(const side of [-1,1]){
    box(.015,.032,.270,rust,side*.100,-.175,.555);
    rivet(side*.102,-.106,.394);
    rivet(side*.102,-.168,.641);
  }
  // Welded magazine housing carries the trigger tang and side braces.
  const triggerTang=panel([[.068,-.13],[.184,-.117],
    [.297,-.245],[.272,-.337],[.141,-.236]],.150,iron);
  triggerTang.name='PipeRifleGripTang';
  const grip=box(.154,.344,.156,wood,0,-.296,.223);
  grip.rotation.x=-.24;
  for(const side of [-1,1]){
    const edge=box(.017,.299,.149,woodEdge,side*.084,-.297,.221);
    edge.rotation.x=-.24;
    for(let n=0;n<4;n++){
      const wrap=box(.015,.027,.142,canvas,side*.093,-.381+n*.055,.223);
      wrap.rotation.x=-.24;
    }
  }
  box(.177,.037,.175,blued,0,-.466,.271);
  const trigger=box(.020,.091,.029,brass,0,-.209,.061);
  trigger.rotation.x=-.20;
  box(.125,.026,.195,iron,0,-.272,.063);
  box(.016,.104,.024,iron,0,-.233,.158).rotation.x=-.12;

  // A front-inserted rectangular 15-round magazine sits DEEP in a socket.
  const magWell=box(.207,.164,.243,blued,0,-.110,-.137);
  magWell.name='PipeRifleMagazineWell';
  const magazine=box(.157,.320,.172,iron,0,-.265,-.137);
  magazine.name='PipeRifleDetachableMagazine';
  for(const side of [-1,1]){
    for(let n=0;n<5;n++)
      box(.011,.023,.142,rust,side*.083,-.107+n*.042,.001,magazine);
  }
  const magazineBase=box(.178,.043,.193,blued,0,-.429,-.137);
  magazineBase.name='PipeRifleMagazineFoot';
  box(.113,.012,.139,steel,0,-.017,0,magazineBase);
  box(.226,.042,.249,iron,0,-.052,-.137);
  // Exposed charging carrier runs INSIDE a right-side receiver channel.
  box(.072,.110,.378,blued,.122,.128,.047).name='BoltChannelHousing';
  const slideGroup=new THREE.Group();
  slideGroup.name='PipeRifleChargingCarrier';
  root.add(slideGroup);
  const bolt=box(.069,.072,.277,steel,.128,.125,.072,slideGroup);
  bolt.name='PipeRifleBoltCarrier';
  box(.078,.057,.098,steel,.178,.141,.133,slideGroup);
  box(.058,.025,.078,blued,.200,.170,.169,slideGroup);
  // Stationary guide rails bracket the bolt and stay with the receiver.
  box(.016,.022,.317,rust,.174,.171,.059);
  box(.020,.024,.301,iron,.178,.081,.059);

  // Measured iron-sight picture: BOTH rear dots and front blade tip reach
  // Y=.258. In ADS, camera -Z ray passes through those precise points.
  const rearBridge=box(.172,.041,.215,blued,0,.202,.166);
  rearBridge.name='PipeRifleRearSightBridge';
  for(const side of [-1,1]){
    box(.028,.075,.043,blued,side*.060,.215,.188)
      .userData.sightReference=true;
    box(.012,.016,.016,brass,side*.060,.250,.188)
      .userData.sightReference=true;
  }
  const frontBase=box(.070,.104,.105,blued,0,.174,-1.034);
  frontBase.name='PipeRifleFrontSightBase';
  box(.024,.056,.040,blued,0,.217,-1.034)
    .userData.sightReference=true;
  const frontBead=box(.016,.016,.019,brass,0,.250,-1.034);
  frontBead.name='PipeRifleFrontSightTip';
  frontBead.userData.sightReference=true;

  // Two individually placed player hands; each grip contacts actual wood
  // or the shroud, never an unsupported floating gun part.
  const supportHand=new THREE.Group();root.add(supportHand);
  supportHand.name='PipeRifleSupportHand';
  if(!thirdPerson){
    box(.159,.161,.182,glove,.104,-.334,.230).rotation.x=-.24;
    box(.120,.051,.178,glove,.141,-.219,.216);
    for(let n=0;n<3;n++)
      box(.037,.112,.052,glove,.187,-.320,.202-n*.046);
    box(.176,.130,.211,glove,-.126,-.089,-.719,supportHand);
    for(let n=0;n<4;n++)
      box(.036,.092,.144,glove,-.103+n*.035,-.025,-.022,supportHand);
  }
  const reloadHand=new THREE.Group();
  reloadHand.name='PipeRifleReloadHand';
  root.add(reloadHand);
  if(!thirdPerson){
    box(.161,.145,.170,glove,0,0,0,reloadHand);
    for(let n=0;n<4;n++)
      box(.037,.085,.112,glove,-.058+n*.040,.079,-.014,reloadHand);
  }
  reloadHand.visible=false;

  const muzzleGlow=new THREE.PointLight(0xffba78,0,1.7,2);
  muzzleGlow.position.set(0,.071,-1.235);root.add(muzzleGlow);
  const flareMaterial=new THREE.MeshBasicMaterial({
    map:flareTexture,color:0xffd2ac,transparent:true,opacity:0,
    depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide
  });
  const muzzleFlare=part(new THREE.PlaneGeometry(.35,.35),
    flareMaterial,0,.071,-1.242);
  muzzleFlare.visible=false;

  return {root,slideGroup,magazine,magazineBase,reloadHand,supportHand,trigger,
    muzzleGlow,muzzleFlare,magBaseY:-.265,magFootY:-.429,
    flashScale:1.06,defaultX:.37,defaultY:-.35,defaultZ:-1.02,
    sightLocal:new THREE.Vector3(0,.258,-.12),
    ejectionLocal:new THREE.Vector3(.175,.151,.004)};
}
