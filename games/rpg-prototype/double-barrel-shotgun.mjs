// W20.28: original, welded side-by-side break-action shotgun.
// Actual rotating breech, twin bores, chambered shells, linked ejectors and
// hand-inserted red shells. No floating muzzle props or duplicated barrels.
export function createDoubleBarrelShotgun(THREE,parent,{thirdPerson=false,flareTexture=null}={}){
  const root=new THREE.Group();
  root.name=thirdPerson?'DoubleBarrelWorldHeld':'DoubleBarrelFirstPerson';
  root.position.set(thirdPerson?0:.36,thirdPerson?-.085:-.35,thirdPerson?.045:-1.05);
  if(thirdPerson)root.scale.setScalar(.68);
  parent.add(root);
  const iron=new THREE.MeshStandardMaterial({color:0x4d514d,metalness:.40,roughness:.86});
  const blackened=new THREE.MeshStandardMaterial({color:0x252b2c,metalness:.46,roughness:.78});
  const worn=new THREE.MeshStandardMaterial({color:0x746352,metalness:.38,roughness:.89});
  const rust=new THREE.MeshStandardMaterial({color:0x935637,metalness:.20,roughness:.96});
  const brass=new THREE.MeshStandardMaterial({color:0xb7a168,metalness:.66,roughness:.64});
  const wood=new THREE.MeshStandardMaterial({color:0x694932,metalness:.04,roughness:.96});
  const darkWood=new THREE.MeshStandardMaterial({color:0x3e3027,roughness:.98});
  const shellRed=new THREE.MeshStandardMaterial({color:0x8d3032,roughness:.93});
  const glove=new THREE.MeshStandardMaterial({color:0x3b433c,roughness:.97});
  const part=(geometry,material,x,y,z,group=root)=>{
    const m=new THREE.Mesh(geometry,material);
    m.position.set(x,y,z);m.castShadow=thirdPerson;group.add(m);return m;
  };
  const box=(w,h,d,mat,x,y,z,g=root)=>part(new THREE.BoxGeometry(w,h,d),mat,x,y,z,g);
  const tube=(rad,len,mat,x,y,z,g=root)=>{
    const m=part(new THREE.CylinderGeometry(rad,rad,len,16),mat,x,y,z,g);
    m.rotation.x=Math.PI/2;return m;
  };
  const panel=(points,width,material)=>{
    const shape=new THREE.Shape();
    shape.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++)shape.lineTo(points[i][0],points[i][1]);
    shape.closePath();
    const m=part(new THREE.ExtrudeGeometry(shape,{
      depth:width,bevelEnabled:true,bevelSize:.009,bevelThickness:.008,
      bevelSegments:2,steps:1
    }),material,width/2,0,0);
    m.rotation.y=-Math.PI/2;return m;
  };
  const rivet=(x,y,z)=>{
    const m=part(new THREE.CylinderGeometry(.011,.011,.011,10),brass,x,y,z);
    m.rotation.z=Math.PI/2;
  };

  // The buttstock and action are one connected load-bearing assembly.
  panel([[-.50,-.109],[-.471,.101],[-.383,.190],
    [-.088,.205],[.230,.169],[.327,.064],[.313,-.128],
    [.136,-.173],[-.361,-.172]],.253,iron).name='DoubleBarrelSteelReceiver';
  panel([[.184,.080],[.343,.130],[.509,.088],[.754,-.079],
    [.790,-.152],[.781,-.274],[.614,-.286],[.421,-.211],
    [.232,-.124]],.202,wood).name='DoubleBarrelFullWoodStock';
  panel([[.144,-.121],[.316,-.121],[.518,-.209],
    [.615,-.266],[.328,-.218]],.168,blackened).name='DoubleBarrelStockTang';
  box(.216,.338,.061,darkWood,0,-.100,.776).name='DoubleBarrelButtpad';
  box(.203,.066,.293,darkWood,0,.121,.493);
  for(const side of [-1,1]){
    const band=box(.019,.170,.099,rust,side*.110,-.045,.604);
    band.name='DoubleBarrelStockBrace';
    for(const z of [.568,.639])rivet(side*.122,-.052,z);
    for(const z of [-.378,-.262,-.116,.061])
      rivet(side*.137,.107,z);
  }
  const grip=box(.154,.326,.167,wood,0,-.294,.214);
  grip.rotation.x=-.26;
  for(const side of [-1,1])
    for(let j=0;j<3;j++)
      box(.015,.027,.142,darkWood,side*.082,-.382+j*.078,.213);
  box(.178,.043,.166,blackened,0,-.452,.246);
  const trigger=box(.020,.104,.023,brass,0,-.222,.060);
  trigger.rotation.x=-.24;
  // Forged barrel hinge runs through both side plates.
  tube(.040,.258,blackened,0,-.067,-.422).rotation.set(0,0,Math.PI/2);
  for(const side of [-1,1]){
    box(.030,.160,.147,iron,side*.119,-.090,-.438)
      .name='DoubleBarrelHingeCheek';
    rivet(side*.142,-.079,-.424);
  }
  box(.226,.041,.160,worn,0,.103,-.449).name='DoubleBarrelTopLatch';
  box(.110,.028,.124,brass,0,.139,-.421).name='DoubleBarrelLatchThumb';

  // The entire front assembly rotates DOWN around the stationary rear hinge.
  const hingeGroup=new THREE.Group();
  hingeGroup.name='DoubleBarrelHingedBarrels';
  hingeGroup.position.set(0,-.065,-.427);
  root.add(hingeGroup);
  for(const side of [-1,1]){
    const x=side*.079;
    tube(.065,.988,blackened,x,.138,-.446,hingeGroup)
      .name='DoubleBarrelPrimaryBore';
    tube(.069,.070,worn,x,.138,-.900,hingeGroup);
    tube(.071,.086,iron,x,.138,-.020,hingeGroup)
      .name='DoubleBarrelBreechCollar';
    tube(.073,.044,rust,x,.138,-.922,hingeGroup);
    // A hollow-looking dark mouth framed by a welded iron muzzle ring.
    const mouth=part(new THREE.TorusGeometry(.045,.013,8,20),
      blackened,x,.138,-.949,hingeGroup);
    mouth.name='DoubleBarrelOpenMuzzle';
  }
  // Under-rib and upper solder seam bridge both tubes for the full length.
  box(.082,.038,.946,iron,0,.067,-.442,hingeGroup)
    .name='DoubleBarrelUnderRib';
  box(.102,.021,.899,worn,0,.210,-.451,hingeGroup)
    .name='DoubleBarrelJoinedTopRib';
  for(const z of [-.812,-.505,-.209])
    box(.235,.033,.041,rust,0,.072,z,hingeGroup)
      .name='DoubleBarrelRibClamp';
  // Sight travels with the barrel pivot. Its top at Y=.270 exactly matches
  // the two rear brass points and the shared camera ADS ray when closed.
  box(.063,.156,.090,iron,0,.250,-.838,hingeGroup)
    .name='DoubleBarrelFrontSightPedestal';
  const bead=box(.016,.010,.021,brass,0,.330,-.838,hingeGroup);
  bead.name='DoubleBarrelFrontSightTip';
  bead.userData.sightReference=true;
  box(.176,.052,.118,iron,0,.212,.186).name='DoubleBarrelRearSightBridge';
  for(const side of [-1,1]){
    box(.028,.060,.035,blackened,side*.061,.227,.204)
      .userData.sightReference=true;
    box(.015,.012,.018,brass,side*.061,.264,.204)
      .userData.sightReference=true;
  }

  // Visible shells sit INSIDE the two chamber necks while breech is open.
  const shellDisplays=[];
  for(const side of [-1,1]){
    const shell=new THREE.Group();
    shell.name='DoubleBarrelLiveShell';
    shell.position.set(side*.079,.138,.034);
    hingeGroup.add(shell);
    tube(.041,.145,shellRed,0,0,-.055,shell);
    tube(.048,.020,brass,0,0,.024,shell);
    shell.visible=false;
    shellDisplays.push(shell);
  }
  const ejector=new THREE.Group();
  ejector.name='DoubleBarrelShellExtractor';
  hingeGroup.add(ejector);
  for(const side of [-1,1]){
    tube(.050,.014,brass,side*.079,.138,.068,ejector);
  }
  const slideGroup=new THREE.Group();root.add(slideGroup);
  // Shell-insertion animation uses a single hand-held shell; repeated once
  // per missing chamber rather than faking a straight pistol magazine.
  const reloadAction=new THREE.Group();
  reloadAction.name='DoubleBarrelReloadShell';
  root.add(reloadAction);
  tube(.041,.145,shellRed,0,0,0,reloadAction);
  tube(.047,.019,brass,0,0,.080,reloadAction);
  reloadAction.visible=false;
  // The common HUD animator expects magazine handles for every weapon.
  // They are empty non-rendering holders; real rounds live in shellDisplays.
  const magazine=new THREE.Group(),magazineBase=new THREE.Group();
  root.add(magazine,magazineBase);
  magazine.visible=false;magazineBase.visible=false;
  const supportHand=new THREE.Group(),reloadHand=new THREE.Group();
  root.add(supportHand,reloadHand);
  if(!thirdPerson){
    box(.146,.152,.165,glove,.113,-.311,.200);
    box(.177,.140,.199,glove,-.134,-.117,-.797,supportHand);
    for(let n=0;n<4;n++)
      box(.033,.091,.123,glove,-.082+n*.041,-.048,-.782,supportHand);
    box(.156,.144,.169,glove,0,0,0,reloadHand);
    for(let n=0;n<4;n++)
      box(.034,.082,.110,glove,-.052+n*.035,.075,-.014,reloadHand);
  }
  reloadHand.visible=false;
  const muzzleGlow=new THREE.PointLight(0xffb177,0,2.1,2);
  muzzleGlow.position.set(0,.138,-.969);hingeGroup.add(muzzleGlow);
  const flareMat=new THREE.MeshBasicMaterial({
    map:flareTexture,color:0xffc49d,transparent:true,opacity:0,
    depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide
  });
  const muzzleFlare=part(new THREE.PlaneGeometry(.46,.46),
    flareMat,0,.138,-.981,hingeGroup);
  muzzleFlare.visible=false;
  return {root,hingeGroup,shellDisplays,ejector,reloadAction,
    slideGroup,magazine,magazineBase,reloadHand,supportHand,trigger,
    muzzleGlow,muzzleFlare,flashScale:1.48,magBaseY:0,magFootY:0,
    defaultX:.36,defaultY:-.35,defaultZ:-1.05,
    sightLocal:new THREE.Vector3(0,.270,-.12),
    ejectionLocal:new THREE.Vector3(.15,.13,-.435)};
}
