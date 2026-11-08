import {THREE} from '../../engine/core.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// A self-contained, original training dummy, authored from geometry for
// visual testing. It is deliberately NOT presented as a finished game model.
export function createTrainingCharacter({variant='pilot'}={}) {
  const root=new THREE.Group();
  root.name='TrainingCharacter';
  const geometries=[],materials=[];
  const material=(color,{metalness=.08,roughness=.72,emissive=null}={})=>{
    const mat=new THREE.MeshStandardMaterial({
      color,metalness,roughness,
      ...(emissive?{emissive,emissiveIntensity:.55}:{})
    });
    materials.push(mat);
    return mat;
  };
  const suit=material(variant==='pilot'?0x4b646c:0x484f55);
  const armor=material(variant==='pilot'?0x8b9b9e:0x687b86,{metalness:.35,roughness:.47});
  const dark=material(0x242d35,{metalness:.19,roughness:.79});
  const joints=material(0x141e27,{roughness:.91});
  const cyan=material(variant==='pilot'?0x79dbef:0xe4a66c,{metalness:.23,roughness:.4,emissive:variant==='pilot'?0x12303a:0x3e2210});
  const visor=material(0x182d39,{metalness:.55,roughness:.18});
  const trim=material(0xc4c7bb,{metalness:.32,roughness:.48});

  const rounded=(parent,name,dimensions,xyz,mat,radius=.055)=>{
    const [w,h,d]=dimensions;
    const geo=new RoundedBoxGeometry(w,h,d,3,Math.min(radius,w*.25,h*.25,d*.25));
    geometries.push(geo);
    const mesh=new THREE.Mesh(geo,mat);
    mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;
    mesh.position.set(...xyz);parent.add(mesh);
    return mesh;
  };
  const capsule=(parent,name,radius,height,xyz,mat)=>{
    const geo=new THREE.CapsuleGeometry(radius,height,5,12);
    geometries.push(geo);
    const mesh=new THREE.Mesh(geo,mat);
    mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;
    mesh.position.set(...xyz);parent.add(mesh);return mesh;
  };

  const hips=new THREE.Group();hips.name='Hips';hips.position.y=1.04;root.add(hips);
  rounded(hips,'UnderSuit',[.39,.31,.24],[0,0,0],suit,.075);
  rounded(hips,'BackPlate',[.47,.64,.27],[0,.36,.02],armor,.095);
  rounded(hips,'ChestRig',[.49,.36,.305],[0,.52,-.018],suit,.07);
  rounded(hips,'ChestPlate',[.37,.21,.08],[0,.51,-.18],armor,.04);
  rounded(hips,'CenterIdentifier',[.085,.055,.018],[0,.53,-.232],cyan,.009);
  rounded(hips,'WaistBelt',[.48,.115,.31],[0,.02,0],dark,.025);
  for(const x of [-.185,.185]){
    rounded(hips,'GearPouch',[.12,.18,.105],[x,-.085,-.15],dark,.018);
    rounded(hips,'ShoulderPlate',[.21,.21,.31],[x*1.55,.62,0],armor,.065);
  }
  const head=new THREE.Group();head.name='Head';head.position.set(0,.89,0);hips.add(head);
  capsule(head,'HelmetShell',.195,.13,[0,.12,0],armor);
  rounded(head,'FaceShield',[.31,.15,.092],[0,.125,-.186],visor,.043);
  rounded(head,'VisorHighlight',[.25,.025,.015],[0,.155,-.238],cyan,.008);
  rounded(head,'Collar',[.37,.105,.33],[0,-.105,.015],dark,.035);
  rounded(head,'HelmetCamera',[.075,.07,.07],[.145,.16,-.16],dark,.018);

  const leftArm=new THREE.Group();leftArm.name='LeftArm';leftArm.position.set(-.326,.58,0);hips.add(leftArm);
  const rightArm=new THREE.Group();rightArm.name='RightArm';rightArm.position.set(.326,.58,0);hips.add(rightArm);
  for(const [arm,side]of [[leftArm,-1],[rightArm,1]]){
    capsule(arm,'ArmSleeve',.11,.255,[side*.006,-.235,.008],suit);
    rounded(arm,'ForearmArmor',[.17,.265,.22],[side*.005,-.48,-.006],armor,.048);
    rounded(arm,'Gauntlet',[.16,.15,.19],[side*.008,-.665,-.02],dark,.04);
    rounded(arm,'Hand',[.13,.14,.13],[side*.008,-.753,-.04],joints,.035);
  }
  rounded(leftArm,'TeamMark',[.035,.19,.15],[-.102,-.27,-.014],cyan,.01);
  const leftLeg=new THREE.Group();leftLeg.name='LeftLeg';leftLeg.position.set(-.148,-.12,0);hips.add(leftLeg);
  const rightLeg=new THREE.Group();rightLeg.name='RightLeg';rightLeg.position.set(.148,-.12,0);hips.add(rightLeg);
  for(const leg of [leftLeg,rightLeg]){
    capsule(leg,'Thigh',.126,.17,[0,-.225,.015],suit);
    rounded(leg,'KneePad',[.2,.2,.19],[0,-.45,-.063],armor,.046);
    capsule(leg,'LowerLeg',.105,.17,[0,-.64,.028],suit);
    rounded(leg,'Shin',[.18,.29,.19],[0,-.665,-.035],armor,.04);
    rounded(leg,'Boot',[.205,.16,.33],[0,-.86,-.076],dark,.047);
    rounded(leg,'Sole',[.215,.065,.36],[0,-.945,-.078],joints,.026);
  }
  // Small powered tool held on the right arm (not an operational firearm).
  const tool=new THREE.Group();tool.name='Tool';tool.position.set(-.035,-.68,-.16);rightArm.add(tool);
  rounded(tool,'ToolBody',[.15,.17,.41],[0,-.01,-.2],dark,.03);
  rounded(tool,'ToolSide',[.055,.1,.3],[.095,.02,-.18],armor,.01);
  rounded(tool,'ToolHead',[.18,.07,.16],[0,.03,-.44],trim,.016);
  rounded(tool,'ToolIndicator',[.03,.03,.13],[.10,.075,-.18],cyan,.012);
  rounded(tool,'ToolGrip',[.09,.19,.12],[0,-.115,.005],joints,.016);

  const parts=['Hips.position[y]','Hips.rotation[x]',
    'LeftArm.rotation[x]','RightArm.rotation[x]',
    'LeftLeg.rotation[x]','RightLeg.rotation[x]','Head.rotation[x]'];
  const base=[1.04,0,-.07,-.07,0,0,0];
  const createClip=(name,times,frames)=>{
    const tracks=parts.map((path,index)=>new THREE.NumberKeyframeTrack(
      path,times,frames.map(frame=>frame[index]??base[index])
    ));
    return new THREE.AnimationClip(name,times.at(-1),tracks);
  };
  const pose=(hip=1.04,lean=0,la=-.07,ra=-.07,ll=0,rl=0,head=0)=>
    [hip,lean,la,ra,ll,rl,head];
  const clips={
    idle:createClip('idle',[0,.55,1.1],[
      pose(1.04),pose(1.053,0,-.09,-.06,0,0,-.027),pose(1.04)
    ]),
    walk:createClip('walk',[0,.19,.38,.57,.76],[
      pose(1.04,.04,-.46,.4,.59,-.59),
      pose(1.01,.035,0,-.05,0,0),
      pose(1.04,.04,.4,-.46,-.59,.59),
      pose(1.01,.035,0,-.05,0,0),
      pose(1.04,.04,-.46,.4,.59,-.59)
    ]),
    run:createClip('run',[0,.14,.28,.42,.56],[
      pose(1.015,.17,-.89,.77,.92,-.9,-.06),
      pose(.982,.15,-.19,.18,-.12,.08,-.06),
      pose(1.015,.17,.77,-.89,-.9,.92,-.06),
      pose(.982,.15,.18,-.19,.08,-.12,-.06),
      pose(1.015,.17,-.89,.77,.92,-.9,-.06)
    ]),
    jump:createClip('jump',[0,.18,.42,.65],[
      pose(1.04,.07,-.2,-.1,.1,.1),
      pose(.98,-.03,-.66,-.55,.38,.38,-.1),
      pose(1.03,.04,-.45,-.42,.22,.28,-.05),
      pose(1.04,.07,-.2,-.1,.1,.1)
    ]),
    fall:createClip('fall',[0,.3,.6],[
      pose(1.04,.11,-.35,-.28,.16,.16),
      pose(1.065,.15,-.65,-.55,.16,.15),
      pose(1.04,.11,-.35,-.28,.16,.16)
    ]),
    interact:createClip('interact',[0,.18,.42,.67,.9],[
      pose(),pose(1.04,-.03,-.23,1.15,.0,0),
      pose(1.035,-.04,-.25,1.38,.02,0,-.12),
      pose(1.04,0,-.13,.93,0,0),pose()
    ]),
    reload:createClip('reload',[0,.19,.48,.8,1.1,1.28],[
      pose(),pose(1.04,.06,.32,.82,0,0,-.16),
      pose(1.04,.08,.89,1.1,0,0,-.13),
      pose(1.04,.04,.82,.9,0,0,-.13),
      pose(1.04,.03,.24,.36,0,0),pose()
    ])
  };
  return {
    root,clips,
    dispose(){
      root.removeFromParent();
      for(const geo of geometries)geo.dispose();
      for(const mat of materials)mat.dispose();
    }
  };
}

export function createFirstPersonViewModel(camera) {
  const root=new THREE.Group();root.name='FirstPersonViewModel';
  root.position.set(.29,-.27,-.68);
  camera.add(root);
  const model=new THREE.Group();model.name='WeaponRig';root.add(model);
  const materials=[
    new THREE.MeshStandardMaterial({color:0x303f49,metalness:.5,roughness:.36}),
    new THREE.MeshStandardMaterial({color:0x889da3,metalness:.64,roughness:.27}),
    new THREE.MeshStandardMaterial({color:0x576d78,metalness:.03,roughness:.85}),
    new THREE.MeshStandardMaterial({color:0x81d8ef,emissive:0x1b7489,emissiveIntensity:.45})
  ];
  const geometries=[];
  const piece=(name,w,h,d,x,y,z,index=0)=>{
    const geometry=new RoundedBoxGeometry(w,h,d,3,.025);
    geometries.push(geometry);
    const mesh=new THREE.Mesh(geometry,materials[index]);mesh.name=name;
    mesh.position.set(x,y,z);mesh.castShadow=false;model.add(mesh);
    return mesh;
  };
  piece('ToolBarrel',.12,.11,.5,0,-.045,-.18,1);
  piece('ToolBody',.2,.2,.34,0,-.05,.16);
  piece('Sight',.1,.065,.11,0,.08,-.035,3);
  piece('UpperHand',.16,.13,.32,-.17,-.2,.25,2);
  piece('LowerHand',.18,.12,.35,.18,-.21,.26,2);
  piece('PowerCell',.15,.18,.18,0,-.2,.15,1);
  const tracks=(name,duration,frames)=>{
    const times=frames.map(([t])=>t);
    return new THREE.AnimationClip(name,duration,[
      new THREE.NumberKeyframeTrack('WeaponRig.position[y]',times,frames.map(([,y])=>y)),
      new THREE.NumberKeyframeTrack('WeaponRig.rotation[x]',times,frames.map(([,,r])=>r)),
      new THREE.NumberKeyframeTrack('WeaponRig.rotation[z]',times,frames.map(([,,,z])=>z))
    ]);
  };
  const clips={
    idle:tracks('idle',1,[[0,0,0,0],[.5,.008,0,.015],[1,0,0,0]]),
    walk:tracks('walk',.76,[[0,-.03,.03,.05],[.19,.02,-.018,0],[.38,-.03,.03,-.05],[.57,.02,-.018,0],[.76,-.03,.03,.05]]),
    run:tracks('run',.56,[[0,-.13,.2,.08],[.14,-.1,.16,0],[.28,-.13,.2,-.08],[.42,-.1,.16,0],[.56,-.13,.2,.08]]),
    jump:tracks('jump',.7,[[0,0,0,0],[.3,-.12,-.12,0],[.7,-.06,.03,0]]),
    fall:tracks('fall',.7,[[0,-.06,.08,0],[.35,-.08,.1,0],[.7,-.06,.08,0]]),
    interact:tracks('interact',.88,[[0,0,0,0],[.2,.13,-.4,-.13],[.5,.1,-.43,-.12],[.88,0,0,0]]),
    reload:tracks('reload',1.28,[[0,0,0,0],[.2,-.11,-.32,-.29],[.5,-.18,-.54,-.32],[.9,-.12,-.23,-.12],[1.28,0,0,0]])
  };
  return {
    root,clips,
    dispose(){
      root.removeFromParent();
      geometries.forEach(geometry=>geometry.dispose());
      materials.forEach(material=>material.dispose());
    }
  };
}
