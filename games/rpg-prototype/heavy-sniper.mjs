// W20.40: original long-range anti-materiel sniper, not a stretched hunting rifle.
// Scope body, receiver, bolt, barrel, magazine, hands and bipod all share
// a connected first/third-person frame; ADS reticle uses the sight mount.
export function createHeavySniper(THREE,parent,{thirdPerson=false,flareTexture=null}={}){
  const root=new THREE.Group();
  root.name=thirdPerson?'HeavySniperWorldHeld':'HeavySniperFirstPerson';
  root.position.set(thirdPerson?0:.275,thirdPerson?-.078:-.375,thirdPerson?.025:-1.23);
  if(thirdPerson)root.scale.setScalar(.68);
  parent.add(root);
  const material=(color,metalness=.4,roughness=.75,extra={})=>
    new THREE.MeshStandardMaterial({color,metalness,roughness,...extra});
  const frame=material(0x333d3d,.72,.64);
  const blued=material(0x18262a,.73,.46);
  const dark=material(0x11191c,.28,.81);
  const worn=material(0x60665b,.40,.85);
  const rust=material(0x805540,.32,.92);
  const bronze=material(0x98836b,.57,.76);
  const polymer=material(0x444a43,.06,.94);
  const rubber=material(0x232927,.02,.99);
  const glass=material(0x163b42,.28,.22,{transparent:true,opacity:.42,
    depthWrite:false,side:THREE.DoubleSide});
  const opticEdge=material(0x6b786e,.52,.67);
  const glove=material(0x343f3a,.08,.96);
  const part=(geometry,mat,x,y,z,group=root)=>{
    const mesh=new THREE.Mesh(geometry,mat);
    mesh.position.set(x,y,z);mesh.castShadow=thirdPerson;
    group.add(mesh);return mesh;
  };
  const box=(w,h,d,mat,x,y,z,group=root)=>
    part(new THREE.BoxGeometry(w,h,d),mat,x,y,z,group);
  const tube=(r,length,mat,x,y,z,group=root,segments=16)=>{
    const m=part(new THREE.CylinderGeometry(r,r,length,segments),
      mat,x,y,z,group);m.rotation.x=Math.PI/2;return m;
  };
  const ring=(major,minor,mat,x,y,z,group=root)=>
    part(new THREE.TorusGeometry(major,minor,9,24),mat,x,y,z,group);
  const pin=(x,y,z)=>{
    const m=part(new THREE.CylinderGeometry(.012,.012,.009,9),
      bronze,x,y,z);m.rotation.z=Math.PI/2;
  };
  // Recessed, stepped, heavy receiver with a forward barrel trunnion.
  box(.300,.245,.66,frame,0,.016,-.098).name='SniperSolidReceiver';
  box(.262,.084,.53,blued,0,.158,-.112).name='SniperTopReceiverBridge';
  box(.292,.045,.45,worn,0,-.133,-.065).name='SniperReceiverUnderside';
  box(.145,.080,.235,dark,.136,.061,-.145).name='SniperEjectionPort';
  box(.093,.019,.19,bronze,.142,.095,-.140).name='SniperBoltRaceway';
  for(const side of [-1,1]){
    box(.018,.13,.27,rust,side*.153,.000,-.14).name='SniperSideWearPlate';
    for(const z of [-.330,-.090,.115])pin(side*.160,.033,z);
    box(.022,.032,.31,worn,side*.148,-.103,-.13);
  }
  // Adjustable rear stock: skeleton struts, cheek rest, buttpad and trigger grip.
  const stockBeam=box(.175,.085,.77,frame,0,.008,.542);
  stockBeam.rotation.x=.052;
  for(const side of [-1,1]){
    const brace=box(.041,.070,.58,worn,side*.094,-.125,.564);
    brace.rotation.x=-.26;
    box(.027,.120,.055,bronze,side*.102,-.055,.335);
  }
  box(.195,.128,.305,polymer,0,.159,.641).name='SniperRaisedCheekRest';
  box(.235,.273,.078,rubber,0,-.053,1.024).name='SniperShockAbsorbingButt';
  for(const y of [-.160,-.099,-.039,.023])box(.230,.012,.024,worn,0,y,1.073);
  const pistolGrip=box(.155,.290,.165,polymer,0,-.255,.241);
  pistolGrip.rotation.x=-.21;
  for(const side of [-1,1])for(let n=0;n<4;n++)
    box(.012,.023,.135,rubber,side*.080,-.338+n*.049,.247);
  const trigger=box(.017,.094,.027,bronze,0,-.194,.059);
  trigger.rotation.x=-.19;
  box(.180,.020,.175,frame,0,-.310,.098).name='SniperTriggerGuard';

  // Heavier long-range barrel, fitted brake, cooling jacket and folded bipod.
  tube(.066,1.59,blued,0,.103,-1.079,root,20).name='SniperLongForgedBarrel';
  tube(.103,.92,frame,0,.103,-.909,root,20).name='SniperVentedBarrelSleeve';
  for(const z of [-1.36,-1.21,-1.06,-.91,-.76,-.61]){
    ring(.103,.014,worn,0,.103,z).name='SniperBarrelCoolingRing';
    for(const side of [-1,1])
      box(.040,.026,.072,dark,side*.102,.103,z).name='SniperHeatVent';
  }
  tube(.080,.26,blued,0,.103,-1.911,root,20).name='SniperMuzzleBrake';
  for(const side of [-1,1])for(const z of [-1.973,-1.873])
    box(.042,.041,.061,dark,side*.073,.103,z).name='SniperBrakePort';
  ring(.054,.014,bronze,0,.103,-2.051).name='SniperBoreCrown';
  box(.249,.164,.55,polymer,0,.006,-.518).name='SniperTexturedHandguard';
  for(const side of [-1,1])for(let z=-.74;z<-.34;z+=.075){
    box(.011,.071,.032,dark,side*.132,-.004,z);
    box(.012,.018,.044,worn,side*.131,.071,z);
  }
  box(.16,.038,.20,blued,0,-.096,-1.285).name='SniperBipodHinge';
  for(const side of [-1,1]){
    const folded=box(.032,.035,.57,worn,side*.095,-.162,-1.298);
    folded.rotation.z=side*.10;
    box(.088,.041,.09,rubber,side*.110,-.184,-1.520);
  }
  // Five-round detachable long box magazine inside a visible mag well.
  box(.245,.091,.302,frame,0,-.171,-.046).name='SniperMagazineWell';
  const magazine=new THREE.Group();
  magazine.position.set(0,-.307,-.032);root.add(magazine);
  box(.205,.285,.240,blued,0,-.006,0,magazine).name='SniperFiveRoundMagazine';
  box(.214,.044,.259,worn,0,-.169,0,magazine).name='SniperMagazineFloorplate';
  for(const side of [-1,1]){
    box(.012,.017,.17,bronze,side*.109,.074,.012,magazine);
    for(let i=0;i<3;i++)box(.013,.013,.13,frame,
      side*.109,-.033-i*.055,.015,magazine);
  }
  const magazineBase=new THREE.Group();
  magazineBase.position.set(0,-.485,-.032);root.add(magazineBase);
  box(.211,.014,.25,bronze,0,0,0,magazineBase);
  // Mechanical bolt and rear knob form a single sliding/lifting group.
  const boltAssembly=new THREE.Group();
  boltAssembly.name='SniperRotatingBoltAssembly';
  boltAssembly.position.set(.105,.144,.044);root.add(boltAssembly);
  tube(.039,.305,worn,0,0,.015,boltAssembly).name='SniperBoltBody';
  box(.175,.035,.038,frame,.074,-.022,.097,boltAssembly)
    .name='SniperBoltHandle';
  part(new THREE.SphereGeometry(.050,12,10),polymer,
    .187,-.026,.098,boltAssembly).name='SniperBoltKnob';
  box(.090,.052,.08,bronze,0,.025,.128,boltAssembly);

  // Physical 6x optic: open rear aperture, large front objective, lens coating,
  // two real rings, rail mounts, turret knobs and a stepped ocular cup.
  const scopeY=.368,scopeZ=-.255;
  box(.170,.035,.67,blued,0,.201,-.250).name='SniperPicatinnyRail';
  for(let z=-.52;z<.05;z+=.064)
    box(.196,.012,.025,bronze,0,.225,z);
  tube(.078,.66,blued,0,scopeY,scopeZ,root,22).name='SniperSixPowerScopeTube';
  tube(.108,.150,frame,0,scopeY,-.525,root,22).name='SniperObjectiveBell';
  tube(.094,.158,frame,0,scopeY,.017,root,22).name='SniperOcularBell';
  tube(.099,.065,rubber,0,scopeY,.105,root,22).name='SniperEyecup';
  for(const z of [-.607,-.454,-.068,.111]){
    ring(z<-.4?.108:.094,.018,dark,0,scopeY,z);
    ring(z<-.4?.112:.095,.005,bronze,0,scopeY,z-.014);
  }
  // Glass discs are translucent in hip view; the actual magnified sight is
  // camera-space, with a scoped reticle that never shifts off the shot ray.
  const frontLens=part(new THREE.CircleGeometry(.089,28),glass,
    0,scopeY,-.609);frontLens.name='SniperObjectiveLens';
  const rearLens=part(new THREE.CircleGeometry(.075,28),glass,
    0,scopeY,.116);rearLens.name='SniperOcularLens';
  for(const z of [-.400,-.074]){
    box(.125,.075,.038,frame,0,.272,z).name='SniperScopeClamp';
    box(.172,.024,.066,dark,0,.230,z);
    for(const side of [-1,1])pin(side*.085,.277,z);
  }
  const elevation=part(new THREE.CylinderGeometry(.055,.055,.089,18),
    worn,0,.466,-.248);
  elevation.name='SniperElevationTurret';
  for(let i=0;i<10;i++){
    const a=i*Math.PI/5;
    box(.010,.024,.015,dark,Math.cos(a)*.058,
      .496, -.248+Math.sin(a)*.058);
  }
  const windage=part(new THREE.CylinderGeometry(.047,.047,.09,16),
    bronze,.115,.363,-.252);
  windage.rotation.z=Math.PI/2;windage.name='SniperWindageTurret';
  ring(.085,.010,opticEdge,0,scopeY,.124);
  // Small worn markings and asymmetry make the weapon identifiable at a glance.
  box(.075,.035,.210,rust,-.157,.019,-.166);
  box(.034,.058,.113,bronze,.166,-.005,.077).rotation.z=.16;
  for(let i=0;i<4;i++)pin(.169,.045,-.10+i*.064);

  const gripHand=new THREE.Group(),supportHand=new THREE.Group(),
    boltCycleHand=new THREE.Group(),reloadHand=new THREE.Group();
  root.add(gripHand,supportHand,reloadHand);boltAssembly.add(boltCycleHand);
  if(!thirdPerson){
    box(.158,.160,.176,glove,.089,-.292,.240,gripHand);
    for(let i=0;i<4;i++)box(.030,.077,.109,glove,.031+i*.037,
      -.227,.187,gripHand);
    box(.175,.141,.220,glove,-.116,-.093,-.683,supportHand);
    for(let i=0;i<4;i++)box(.037,.082,.139,glove,
      -.066+i*.040,-.034,-.704,supportHand);
    box(.155,.144,.164,glove,.192,-.063,.106,boltCycleHand);
    box(.168,.155,.167,glove,0,0,0,reloadHand);
    for(let i=0;i<4;i++)box(.034,.076,.104,glove,
      -.058+i*.038,.078,-.026,reloadHand);
  }
  reloadHand.visible=false;boltCycleHand.visible=false;
  // Muzzle flashes and brass always originate at the actual barrel opening.
  const slideGroup=new THREE.Group();root.add(slideGroup);
  const muzzleGlow=new THREE.PointLight(0xffc398,0,3.5,2);
  muzzleGlow.position.set(0,.103,-2.067);root.add(muzzleGlow);
  const muzzleFlare=part(new THREE.PlaneGeometry(.42,.42),
    new THREE.MeshBasicMaterial({map:flareTexture,color:0xffd6b6,
      transparent:true,opacity:0,depthWrite:false,
      blending:THREE.AdditiveBlending,side:THREE.DoubleSide}),
    0,.103,-2.073);
  muzzleFlare.visible=false;muzzleFlare.userData.ignoreSightProbe=true;
  return {root,boltAssembly,boltBaseZ:.044,gripHand,boltCycleHand,
    slideGroup,magazine,magazineBase,reloadHand,supportHand,trigger,
    muzzleGlow,muzzleFlare,flashScale:1.72,
    magBaseY:-.307,magFootY:-.485,
    defaultX:.275,defaultY:-.375,defaultZ:-1.23,
    sightLocal:new THREE.Vector3(0,scopeY,.116),
    ejectionLocal:new THREE.Vector3(.183,.143,-.035)};
}
