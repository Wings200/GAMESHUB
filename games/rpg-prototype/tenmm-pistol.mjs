// W20.19: original one-piece 10mm sidearm model, independent of retired views.
// Purpose-built moving slide, barrel, sights, frame, removable magazine and hands.
// Both first-person and third-person forms share the same proportions.
export function createTenMillimeterPistol(THREE,parent,{thirdPerson=false,flareTexture=null}={}){
  const root=new THREE.Group();
  root.name=thirdPerson?'TenMMWorldHeld':'TenMMFirstPerson';
  root.position.set(thirdPerson?0:.29,thirdPerson?-.065:-.31,thirdPerson?0:-.77);
  if(thirdPerson)root.scale.setScalar(.66);
  parent.add(root);
  const finish=new THREE.MeshStandardMaterial({color:0x454c50,roughness:.43,metalness:.68});
  const slideMetal=new THREE.MeshStandardMaterial({color:0x747b78,roughness:.48,metalness:.72});
  const charcoal=new THREE.MeshStandardMaterial({color:0x1b282a,roughness:.68,metalness:.28});
  const oxide=new THREE.MeshStandardMaterial({color:0x896b54,roughness:.78,metalness:.23});
  const polymer=new THREE.MeshStandardMaterial({color:0x313934,roughness:.86,metalness:.08});
  const brass=new THREE.MeshStandardMaterial({color:0xbba27a,roughness:.38,metalness:.73});
  const gripGroove=new THREE.MeshStandardMaterial({color:0x222822,roughness:.97});
  const glove=new THREE.MeshStandardMaterial({color:0x3b4642,roughness:.91});
  const materials=[finish,slideMetal,charcoal,oxide,polymer,brass,gripGroove,glove];
  const part=(geometry,material,x,y,z,parentGroup=root)=>{
    const mesh=new THREE.Mesh(geometry,material);
    mesh.position.set(x,y,z);
    mesh.castShadow=thirdPerson;
    mesh.receiveShadow=thirdPerson;
    parentGroup.add(mesh);
    return mesh;
  };
  const box=(w,h,d,m,x,y,z,g=root)=>part(new THREE.BoxGeometry(w,h,d),m,x,y,z,g);
  const tube=(r,depth,m,x,y,z,g=root)=>{
    const t=part(new THREE.CylinderGeometry(r,r,depth,14),m,x,y,z,g);
    t.rotation.x=Math.PI/2;
    return t;
  };
  // Extrude a stepped industrial profile across X. The beveled front and rear
  // are meaningful silhouettes, unlike the old stacked rectangular pistol.
  const bodyProfile=(points,width,m,parentGroup=root)=>{
    const sh=new THREE.Shape();
    sh.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++)sh.lineTo(points[i][0],points[i][1]);
    sh.closePath();
    const g=new THREE.ExtrudeGeometry(sh,{depth:width,steps:1,
      bevelEnabled:true,bevelThickness:.007,bevelSize:.006,bevelSegments:2,
      curveSegments:2});
    const obj=part(g,m,width/2,0,0,parentGroup);
    obj.rotation.y=-Math.PI/2;
    return obj;
  };
  // Distinctive angular lower receiver and exposed steel barrel shroud.
  bodyProfile([[-.54,.083],[-.44,.112],[-.18,.117],[.115,.101],
    [.21,.029],[.18,-.044],[-.19,-.08],[-.48,-.027]],.205,finish);
  box(.235,.036,.24,oxide,0,-.042,-.26);
  box(.14,.035,.24,charcoal,0,-.074,-.25);
  for(let z=-.44;z<-.23;z+=.060)
    box(.125,.018,.018,finish,0,-.084,z);
  // Heavy autoloading slide, independent of the fixed frame. The slide cycles
  // rearward and locks open at empty, and racks during the magazine swap.
  const slideGroup=new THREE.Group();
  slideGroup.name='TenMMSlide';
  root.add(slideGroup);
  bodyProfile([[-.585,.117],[-.548,.194],[-.37,.206],
    [.145,.206],[.205,.159],[.205,.096],[-.50,.089]],.215,slideMetal,slideGroup);
  box(.218,.028,.54,finish,0,.205,-.173,slideGroup);
  box(.235,.018,.45,charcoal,0,.096,-.145,slideGroup);
  // Rear serrations are separate ridges and physically move with the slide.
  for(const side of [-1,1]){
    for(let j=0;j<7;j++){
      const cut=box(.008,.073,.013,charcoal,side*.115,.151,.105-j*.030,slideGroup);
      cut.rotation.x=-.22;
    }
  }
  // The actual right-side ejection port contains a small brass chamber surface.
  box(.004,.052,.132,charcoal,.116,.157,-.175,slideGroup);
  box(.005,.024,.065,brass,.122,.148,-.175,slideGroup);
  box(.006,.011,.15,oxide,.123,.188,-.175,slideGroup);
  // Bore is fixed to the frame; muzzle crown and collar show its real position.
  tube(.044,.55,charcoal,0,.082,-.36);
  tube(.040,.49,finish,0,.082,-.375);
  tube(.052,.038,slideMetal,0,.082,-.618);
  const muzzleRing=part(new THREE.TorusGeometry(.039,.008,8,18),
    charcoal,0,.082,-.64);
  muzzleRing.rotation.z=0;
  // Two rear ears and a single front blade sit on the actual slide.
  for(const side of [-1,1]){
    box(.035,.060,.040,charcoal,side*.061,.238,.143,slideGroup);
    box(.016,.013,.017,brass,side*.061,.269,.143,slideGroup);
  }
  box(.031,.064,.041,charcoal,0,.238,-.515,slideGroup);
  box(.017,.014,.017,brass,0,.267,-.515,slideGroup);
  // Notched ergonomic grip, sharply angled under the rear receiver.
  const gripFrame=box(.166,.38,.19,charcoal,0,-.203,.17);
  gripFrame.rotation.x=-.22;
  const gripCore=box(.166,.33,.178,polymer,0,-.221,.182);
  gripCore.rotation.x=-.22;
  for(const side of [-1,1]){
    const plate=box(.009,.266,.155,polymer,side*.089,-.235,.188);
    plate.rotation.x=-.22;
    for(let j=0;j<7;j++){
      const rib=box(.010,.011,.129,gripGroove,side*.097,-.326+j*.034,.193);
      rib.rotation.x=-.22;
    }
    for(const y of [-.13,-.327]){
      const pin=part(new THREE.CylinderGeometry(.013,.013,.008,10),
        brass,side*.102,y,.195);
      pin.rotation.z=Math.PI/2;
    }
  }
  // Trigger and guard are separate parts; the trigger twitches during firing.
  const guard=part(new THREE.TorusGeometry(.090,.013,8,20,Math.PI*1.65),
    charcoal,0,-.145,-.017);
  guard.rotation.z=-.44;
  const trigger=box(.015,.107,.025,charcoal,0,-.137,-.078);
  trigger.rotation.x=-.24;
  box(.062,.040,.050,oxide,0,-.003,.232); // disassembly latch
  for(const side of [-1,1])
    box(.009,.023,.048,brass,side*.109,.026,.095);
  // True detachable magazine (separate bottom cap follows magazine movement).
  const magazine=box(.125,.185,.120,finish,0,-.325,.185);
  magazine.rotation.x=-.22;
  const magazineBase=box(.142,.031,.139,charcoal,0,-.436,.185);
  magazineBase.rotation.x=-.22;
  box(.072,.015,.058,brass,0,-.028,0,magazineBase);
  // Solid holding hand; second hand grips the moving magazine and racks slide.
  if(!thirdPerson){
    box(.154,.177,.176,glove,.114,-.292,.205).rotation.x=-.2;
    box(.093,.045,.172,glove,.157,-.185,.169);
    for(let k=0;k<3;k++)
      box(.029,.113,.066,glove,.19,-.26,.225-k*.051).rotation.x=-.16;
  }
  const reloadHand=new THREE.Group();
  reloadHand.name='TenMMReloadHand';
  root.add(reloadHand);
  if(!thirdPerson){
    box(.18,.14,.16,glove,0,-.02,0,reloadHand);
    for(let k=0;k<4;k++)
      box(.035,.088,.13,glove,-.064+k*.041,.06,-.026,reloadHand);
  }
  reloadHand.visible=false;
  const muzzleGlow=new THREE.PointLight(0xffb473,0,1.45,2);
  muzzleGlow.position.set(0,.082,-.642);
  root.add(muzzleGlow);
  const flareMaterial=new THREE.MeshBasicMaterial({map:flareTexture,
    color:0xffd3a2,transparent:true,opacity:0,depthWrite:false,
    blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
  const muzzleFlare=part(new THREE.PlaneGeometry(.37,.37),
    flareMaterial,0,.082,-.652);
  muzzleFlare.visible=false;
  // These interface fields are used by the shared recoil, ADS, casing,
  // reload and flash code. They map to actual mechanical components.
  return {root,slideGroup,magazine,magazineBase,reloadHand,
    muzzleGlow,muzzleFlare,trigger,magBaseY:-.325,magFootY:-.436,
    flashScale:1.1,defaultX:.29,sightLocal:new THREE.Vector3(0,.274,-.14),
    ejectionLocal:new THREE.Vector3(.13,.154,-.177),
    materials};
}
