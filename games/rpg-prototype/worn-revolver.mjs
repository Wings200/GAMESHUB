// W20.32: original six-shot worn revolver, connected frame, swing-out cylinder,
// indexed six-chamber drum, working hammer, ejector and one-at-a-time cartridges.
export function createWornRevolver(THREE,parent,{thirdPerson=false,flareTexture=null}={}){
  const root=new THREE.Group();root.name=thirdPerson?'WornRevolverWorldHeld':'WornRevolverFirstPerson';
  root.position.set(thirdPerson?0:.29,thirdPerson?-.035:-.36,thirdPerson?.03:-.91);
  if(thirdPerson)root.scale.setScalar(.76);
  parent.add(root);
  const steel=new THREE.MeshStandardMaterial({color:0x4b4b47,metalness:.66,roughness:.70});
  const dark=new THREE.MeshStandardMaterial({color:0x252b2c,metalness:.60,roughness:.83});
  const worn=new THREE.MeshStandardMaterial({color:0x786c58,metalness:.49,roughness:.83});
  const oxide=new THREE.MeshStandardMaterial({color:0x724b37,metalness:.28,roughness:.96});
  const walnut=new THREE.MeshStandardMaterial({color:0x62432e,metalness:.03,roughness:.95});
  const gripInlay=new THREE.MeshStandardMaterial({color:0x32291f,metalness:0,roughness:1});
  const brass=new THREE.MeshStandardMaterial({color:0xb5995b,metalness:.77,roughness:.51});
  const copper=new THREE.MeshStandardMaterial({color:0xa76445,metalness:.60,roughness:.65});
  const glove=new THREE.MeshStandardMaterial({color:0x3e463e,roughness:.98});
  const part=(geo,material,x,y,z,group=root)=>{
    const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);
    m.castShadow=thirdPerson;group.add(m);return m;
  };
  const box=(w,h,d,material,x,y,z,group=root)=>{
    return part(new THREE.BoxGeometry(w,h,d),material,x,y,z,group);
  };
  const tube=(r,len,material,x,y,z,group=root,segments=18)=>{
    const m=part(new THREE.CylinderGeometry(r,r,len,segments),material,x,y,z,group);
    m.rotation.x=Math.PI/2;return m;
  };
  // One structural barrel and underlug physically overlap the forged frame.
  box(.244,.164,.072,steel,0,.101,-.135).name='RevolverForgedFrame';
  box(.192,.068,.50,steel,0,-.058,-.220).name='RevolverLowerFrameWeb';
  box(.163,.090,.425,steel,0,0,.058).name='RevolverFrameGripBridge';
  box(.132,.090,.154,steel,0,.196,-.080).name='RevolverUpperFrameNeck';
  box(.195,.045,.920,steel,0,.243,-.500).name='RevolverFullTopStrap';
  const barrel=tube(.065,.655,dark,0,.100,-.810);
  barrel.name='RevolverContinuousBarrel';
  tube(.052,.655,worn,0,.099,-.810);
  tube(.057,.024,steel,0,.100,-1.124).name='RevolverMuzzleCrown';
  tube(.039,.007,dark,0,.100,-1.140).name='RevolverOpenBore';
  box(.140,.097,.585,steel,0,-.005,-.674).name='RevolverUnderBarrelLug';
  box(.065,.051,.355,oxide,0,-.057,-.610).name='RevolverUnderlugWear';
  // Frame backstrap is continuous from the action through the wood grip.
  const backstrap=box(.162,.400,.142,steel,0,-.173,.192);
  backstrap.rotation.x=-.22;backstrap.name='RevolverGripSteelTang';
  const grip=box(.205,.383,.180,walnut,0,-.252,.225);
  grip.rotation.x=-.22;grip.name='RevolverSolidWalnutGrip';
  for(const side of [-1,1]){
    box(.012,.294,.124,gripInlay,side*.104,-.240,.222)
      .name='RevolverCheckeredGripPanel';
    for(let i=0;i<5;i++){
      const stripe=box(.014,.006,.125,oxide,side*.113,-.340+i*.047,.228);
      stripe.rotation.x=-.22;
    }
    tube(.010,.015,brass,side*.114,-.222,.240).name='RevolverGripScrew';
  }
  const triggerGuard=part(new THREE.TorusGeometry(.135,.016,6,22),dark,
    0,-.112,.040);
  triggerGuard.scale.set(.78,.75,1);triggerGuard.name='RevolverAttachedTriggerGuard';
  const trigger=box(.024,.092,.046,dark,0,-.106,.052);
  trigger.rotation.x=-.25;trigger.name='RevolverTrigger';
  const hammerPivot=new THREE.Group();hammerPivot.name='RevolverPivotingHammer';
  hammerPivot.position.set(0,.161,.206);root.add(hammerPivot);
  box(.110,.123,.062,steel,0,.034,.013,hammerPivot)
    .name='RevolverHammerSpur';
  box(.135,.027,.074,dark,0,.095,.019,hammerPivot)
    .name='RevolverHammerCheckering';
  box(.048,.055,.038,worn,0,-.016,-.010,hammerPivot);
  // A single real yoke carries the drum. Swinging the yoke shifts the drum
  // out of the frame; the cylinder and every chamber then rotate as one.
  const cylinderYoke=new THREE.Group();
  cylinderYoke.name='RevolverSwingOutYoke';
  cylinderYoke.position.set(-.12,.100,-.365);root.add(cylinderYoke);
  const pivot=tube(.022,.270,steel,0,0,-.035,cylinderYoke);
  pivot.name='RevolverYokeHinge';
  const cylinderSpinGroup=new THREE.Group();
  cylinderSpinGroup.name='RevolverIndexedSixChamberCylinder';
  cylinderSpinGroup.position.set(.12,0,0);cylinderYoke.add(cylinderSpinGroup);
  const cylinder=tube(.116,.243,worn,0,0,0,cylinderSpinGroup,24);
  cylinder.name='RevolverActualCylinder';
  tube(.104,.011,steel,0,0,-.119,cylinderSpinGroup).name='RevolverFrontCylinderFace';
  tube(.101,.012,steel,0,0,.121,cylinderSpinGroup).name='RevolverCylinderRearFace';
  const chamberRadius=.071;
  for(let i=0;i<6;i++){
    const theta=i*Math.PI/3,x=Math.cos(theta)*chamberRadius,y=Math.sin(theta)*chamberRadius;
    const chamber=tube(.032,.012,dark,x,y,-.132,cylinderSpinGroup,12);
    chamber.name='RevolverRealChamberBore';
    tube(.020,.014,brass,x,y,.137,cylinderSpinGroup,12)
      .name='RevolverCartridgeHead';
    tube(.010,.004,oxide,x,y,.147,cylinderSpinGroup,10);
    box(.010,.208,.025,dark,x*.56,y*.56,-.002,cylinderSpinGroup)
      .rotation.z=theta;
  }
  // The ejector star is on the cylinder axis, not an unattached decoration.
  const ejectorGroup=new THREE.Group();
  ejectorGroup.name='RevolverMovingEjectorStar';cylinderSpinGroup.add(ejectorGroup);
  tube(.055,.012,brass,0,0,.164,ejectorGroup);
  for(let i=0;i<6;i++){
    const theta=i*Math.PI/3;
    const tooth=box(.015,.013,.019,dark,
      Math.cos(theta)*.039,Math.sin(theta)*.039,.164,ejectorGroup);
    tooth.rotation.z=theta;
  }
  tube(.016,.248,steel,0,0,.050,cylinderSpinGroup)
    .name='RevolverEjectorRod';
  // The rear notch and front blade are exactly level at y=.165 for ADS.
  box(.118,.070,.067,dark,0,.229,.132).name='RevolverRearNotchBridge';
  for(const side of [-1,1])
    box(.014,.052,.034,steel,side*.049,.249,.122)
      .name='RevolverRearNotchPost';
  box(.036,.110,.040,steel,0,.216,-1.055).name='RevolverFrontSightPost';
  const tip=box(.014,.008,.019,worn,0,.271,-1.055);
  tip.name='RevolverFrontSightTip';tip.userData.sightReference=true;
  // A separate .44-like cartridge moves from gloved hand to the open drum.
  const reloadAction=new THREE.Group();
  reloadAction.name='RevolverHandLoadedCartridge';root.add(reloadAction);
  tube(.024,.103,brass,0,0,0,reloadAction,12);
  tube(.019,.029,copper,0,0,-.061,reloadAction,12);
  tube(.025,.009,worn,0,0,.059,reloadAction,12);
  reloadAction.visible=false;
  const magazine=new THREE.Group(),magazineBase=new THREE.Group();
  root.add(magazine,magazineBase);magazine.visible=false;magazineBase.visible=false;
  const reloadHand=new THREE.Group();root.add(reloadHand);
  const supportHand=new THREE.Group();root.add(supportHand);
  const gripHand=new THREE.Group();root.add(gripHand);
  if(!thirdPerson){
    // Both resting hands meet the same wooden handle, not the air below
    // the barrel. The strong hand encloses the right side; the support hand
    // cups the grip and strong hand from the left in a two-handed stance.
    box(.126,.175,.160,glove,.106,-.256,.223,gripHand)
      .name='RevolverStrongHandPalmOnGrip';
    box(.125,.167,.151,glove,-.105,-.262,.223,supportHand)
      .name='RevolverSupportHandPalmOnGrip';
    for(let i=0;i<4;i++){
      const rightFinger=part(new THREE.CapsuleGeometry(.018,.090,4,7),
        glove,.046,-.181-i*.043,.137,gripHand);
      rightFinger.rotation.z=1.04;
      rightFinger.name='RevolverStrongFingerWrappingGrip';
      const leftFinger=part(new THREE.CapsuleGeometry(.018,.090,4,7),
        glove,-.046,-.183-i*.043,.137,supportHand);
      leftFinger.rotation.z=-1.04;
      leftFinger.name='RevolverSupportFingerWrappingGrip';
    }
    const rightThumb=part(new THREE.CapsuleGeometry(.026,.093,4,7),
      glove,.080,-.161,.289,gripHand);
    rightThumb.rotation.z=-.55;rightThumb.name='RevolverStrongThumbOnBackstrap';
    const leftThumb=part(new THREE.CapsuleGeometry(.026,.087,4,7),
      glove,-.080,-.162,.288,supportHand);
    leftThumb.rotation.z=.55;leftThumb.name='RevolverSupportThumbOnBackstrap';
    // Cuffs and forearms overlap both palms; no disconnected hand blocks.
    box(.135,.088,.165,glove,.111,-.368,.259,gripHand)
      .name='RevolverStrongWristCuff';
    box(.135,.088,.165,glove,-.109,-.371,.256,supportHand)
      .name='RevolverSupportWristCuff';
    const rightArm=part(new THREE.CylinderGeometry(.075,.097,.320,10),
      glove,.150,-.480,.343,gripHand);
    rightArm.rotation.z=-.16;rightArm.name='RevolverAttachedStrongForearm';
    const leftArm=part(new THREE.CylinderGeometry(.075,.097,.320,10),
      glove,-.148,-.485,.344,supportHand);
    leftArm.rotation.z=.16;leftArm.name='RevolverAttachedSupportForearm';
    box(.157,.140,.176,glove,0,0,0,reloadHand);
    for(let i=0;i<4;i++)
      box(.033,.076,.097,glove,-.055+i*.037,.082,-.006,reloadHand);
  }
  reloadHand.visible=false;
  const slideGroup=new THREE.Group();root.add(slideGroup);
  const muzzleGlow=new THREE.PointLight(0xffa868,0,1.9,2);
  muzzleGlow.position.set(0,.100,-1.151);root.add(muzzleGlow);
  const muzzleFlare=part(new THREE.PlaneGeometry(.27,.27),
    new THREE.MeshBasicMaterial({map:flareTexture,color:0xffd4ad,
      transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,
      side:THREE.DoubleSide}),0,.100,-1.157);
  muzzleFlare.visible=false;muzzleFlare.userData.ignoreSightProbe=true;
  return {root,magazine,magazineBase,reloadHand,gripHand,supportHand,
    cylinderYoke,cylinderSpinGroup,ejectorGroup,hammerPivot,trigger,
    reloadAction,slideGroup,muzzleGlow,muzzleFlare,
    chamberIndex:0,previousChamberIndex:0,flashScale:1.14,
    magBaseY:0,magFootY:0,
    defaultX:.29,defaultY:-.36,defaultZ:-.91,
    sightLocal:new THREE.Vector3(0,.275,-.180),
    ejectionLocal:new THREE.Vector3(-.10,.09,-.35)};
}
