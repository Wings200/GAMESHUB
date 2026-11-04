// W09.3: Original wasteland-survivor player avatar.
// This is authored in-game rather than loading the photorealistic enemy GLBs.
// Mesh joints are hierarchical and animated independently of player hitboxes.
import * as THREE from 'three';
import {createCharacterAnimation,stepCharacterAnimation} from './character-animation.mjs';
import {reloadPoseForWeapon} from './weapon-handling.mjs';
import {solveBoardingLeg} from './boarding-ik.mjs';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;

function pixelFabric(primary,secondary,seed=7){
  const canvas=document.createElement('canvas');
  canvas.width=64;canvas.height=64;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle=primary;ctx.fillRect(0,0,64,64);
  let state=seed>>>0;
  const next=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  // Small intentional blocks and seams, not interpolated photographic noise.
  for(let i=0;i<115;i++){
    const x=Math.floor(next()*16)*4,y=Math.floor(next()*16)*4;
    ctx.globalAlpha=.10+next()*.17;
    ctx.fillStyle=secondary;ctx.fillRect(x,y,2+Math.floor(next()*3),2+Math.floor(next()*3));
  }
  ctx.globalAlpha=.30;ctx.fillStyle=secondary;
  for(let y=4;y<64;y+=16)ctx.fillRect(0,y,64,1);
  ctx.globalAlpha=1;
  const tex=new THREE.CanvasTexture(canvas);
  tex.colorSpace=THREE.SRGBColorSpace;
  tex.magFilter=THREE.NearestFilter;
  tex.minFilter=THREE.NearestFilter;
  tex.generateMipmaps=false;
  return new THREE.MeshStandardMaterial({
    map:tex,color:0xffffff,roughness:1,metalness:0
  });
}

export function createPlayerAvatar(scene,{variant='survivor',heldWeaponEnabled=true}={}){
  // Shared silhouette and pixel-texel scale, but each NPC gets its own
  // clothing, equipment details, and identity rather than an imported GLB.
  const palette={
    survivor:['#536c59','#81927a','#5b5d50','#353d3b','#373638','#b58c72','#7d6348'],
    scout:['#796c4a','#9a8d63','#575e46','#343b32','#38352d','#b28a6b','#91764e'],
    raider:['#795247','#ab7060','#534747','#392f36','#342a31','#ab806d','#754332'],
    enforcer:['#435967','#728a92','#394758','#293340','#242b35','#9f7969','#485661']
  }[variant]||['#536c59','#81927a','#5b5d50','#353d3b','#373638','#b58c72','#7d6348'];
  const plainSurvivor=variant==='survivor';
  const root=new THREE.Group();root.name='OriginalPixelSurvivor';
  root.userData.npcVariant=variant;
  root.scale.setScalar(.80);
  scene.add(root);
  const jacket=pixelFabric(palette[0],'#283e37',9);
  const jacketLight=pixelFabric(palette[1],'#3f5c4f',21);
  const pants=pixelFabric(palette[2],'#303b35',33);
  const cloth=pixelFabric(palette[3],'#172728',47);
  const boot=pixelFabric(palette[4],'#151c21',51);
  const skin=pixelFabric(palette[5],'#845c4a',55);
  const leather=pixelFabric(palette[6],'#3c322b',61);
  const hair=pixelFabric('#322b27','#1d1b1b',66);
  const capFabric=pixelFabric('#687665','#37483b',68);
  const packFabric=pixelFabric('#68715d','#343f36',69);
  const metal=new THREE.MeshStandardMaterial({color:0x84968b,roughness:.88,metalness:.16});
  const dark=new THREE.MeshStandardMaterial({color:0x1a292d,roughness:1});
  const glass=new THREE.MeshStandardMaterial({color:0xb4c69c,roughness:.36,metalness:.12});
  const materials=[jacket,jacketLight,pants,cloth,boot,skin,leather,hair,capFabric,packFabric,metal,dark,glass];

  function group(parent,x=0,y=0,z=0){
    const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;
  }
  function mesh(parent,geo,material,x=0,y=0,z=0){
    const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);
    m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
  }
  function oval(parent,rx,ry,rz,material,x=0,y=0,z=0){
    const m=mesh(parent,new THREE.SphereGeometry(1,16,12),material,x,y,z);
    m.scale.set(rx,ry,rz);return m;
  }
  function taper(parent,top,bottom,height,material,x=0,y=0,z=0,segments=14){
    return mesh(parent,new THREE.CylinderGeometry(top,bottom,height,segments,1),material,x,y,z);
  }
  function roundedBox(parent,w,h,d,r,material,x=0,y=0,z=0){
    const shape=new THREE.Shape(),a=w/2,b=h/2,k=Math.min(r,w*.24,h*.24);
    shape.moveTo(-a+k,-b);shape.lineTo(a-k,-b);
    shape.quadraticCurveTo(a,-b,a,-b+k);
    shape.lineTo(a,b-k);shape.quadraticCurveTo(a,b,a-k,b);
    shape.lineTo(-a+k,b);shape.quadraticCurveTo(-a,b,-a,b-k);
    shape.lineTo(-a,-b+k);shape.quadraticCurveTo(-a,-b,-a+k,-b);
    const geometry=new THREE.ExtrudeGeometry(shape,{
      depth:d,bevelEnabled:true,bevelThickness:.010,bevelSize:.012,
      bevelSegments:2,curveSegments:4
    });
    geometry.translate(0,0,-d/2);
    return mesh(parent,geometry,material,x,y,z);
  }
  function strap(parent,a,b,r,material){
    const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b);
    const dir=to.clone().sub(from);
    const m=taper(parent,r,r,dir.length(),material,
      (from.x+to.x)/2,(from.y+to.y)/2,(from.z+to.z)/2,10);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());
    return m;
  }

  const pelvis=group(root,0,.99,0);
  oval(pelvis,.28,.17,.18,pants,0,0,0);
  roundedBox(pelvis,.53,.13,.31,.06,leather,0,.10,.01);
  roundedBox(pelvis,.13,.10,.035,.018,metal,0,.12,-.20);
  const torso=group(pelvis,0,.14,0);
  // One continuous torso mesh. The previous pair occupied the same space,
  // making the inner mesh flicker visibly through the outer character.
  oval(torso,.36,.39,.24,jacket,0,.33,0);
  oval(torso,.29,.19,.21,cloth,0,.04,0);
  // Default player appearance is plain cloth. No fake body armor,
  // backpack, straps, hat, mask or pouches until real equipment is worn.
  if(plainSurvivor){
    roundedBox(torso,.55,.06,.38,.027,jacketLight,0,.57,-.01);
    roundedBox(torso,.034,.33,.025,.012,cloth,0,.35,-.245);
    for(const side of [-1,1]){
      const collar=roundedBox(torso,.145,.16,.028,.016,jacketLight,
        side*.10,.55,-.235);
      collar.rotation.z=-side*.28;
    }
  }else{
    roundedBox(torso,.67,.11,.40,.04,jacketLight,0,.60,0);
    // Existing NPC role-specific survival outfits retain their field gear.
    for(const side of [-1,1]){
      const lapel=roundedBox(torso,.15,.43,.045,.028,jacketLight,
        side*.15,.39,-.235);lapel.rotation.z=-side*.24;
      roundedBox(torso,.21,.18,.065,.027,leather,side*.205,.14,-.242);
      roundedBox(torso,.16,.038,.05,.015,metal,side*.205,.20,-.288);
      strap(torso,[side*.27,.58,-.205],[side*.11,.09,-.274],.036,leather);
    }
    strap(torso,[-.25,.58,-.21],[.22,.11,-.27],.034,cloth);
    roundedBox(torso,.045,.44,.040,.014,dark,0,.38,-.247);
    roundedBox(torso,.19,.16,.12,.035,leather,.34,.26,.02);
    roundedBox(torso,.12,.08,.06,.02,metal,.35,.29,-.065);
  }
  // Rounded hood and scarf allow a stylized, original face at low texture res.
  const neck=group(torso,0,.66,0);
  taper(neck,.115,.14,.16,skin,0,.035,0);
  if(!plainSurvivor)oval(neck,.22,.10,.21,cloth,0,-.035,.015);
  const head=group(neck,0,.18,0);
  // A single face volume prevents a second head peeking through in motion.
  oval(head,.177,.224,.166,skin,0,.035,0);
  oval(head,.075,.035,.045,skin,0,-.055,-.162);
  if(plainSurvivor){
    // Uncovered head, hair and readable eyes instead of permanent headgear.
    oval(head,.167,.071,.153,hair,0,.209,.015);
    for(const side of [-1,1]){
      oval(head,.038,.019,.016,dark,side*.081,.072,-.164);
      roundedBox(head,.080,.012,.015,.005,hair,
        side*.082,.113,-.157);
      oval(head,.043,.054,.022,skin,side*.169,-.007,.005);
    }
    oval(head,.036,.054,.027,skin,0,-.016,-.168);
    roundedBox(head,.083,.009,.01,.004,leather,0,-.094,-.162);
  }else{
    oval(head,.194,.184,.17,cloth,0,.105,.08);
    roundedBox(head,.335,.095,.060,.025,dark,0,.074,-.154);
    for(const side of [-1,1]){
      roundedBox(head,.139,.070,.013,.018,glass,side*.084,.075,-.190);
      roundedBox(head,.10,.035,.055,.016,cloth,side*.10,-.051,-.147);
    }
    roundedBox(head,.24,.115,.045,.034,cloth,0,-.041,-.176);
    for(let i=-1;i<=1;i++)roundedBox(head,.034,.024,.014,.009,metal,
      i*.062,-.045,-.205);
    oval(head,.075,.115,.063,cloth,0,.03,.174);
    strap(head,[0,-.04,.175],[0,-.20,.22],.022,leather);
  }
  // Both are INVISIBLE by default and follow genuine equipped clothing items.
  const clothCap=group(head);
  clothCap.name='EquippedHeadwear';
  roundedBox(clothCap,.355,.105,.325,.049,capFabric,0,.219,.03);
  roundedBox(clothCap,.30,.026,.22,.012,capFabric,0,.170,-.208);
  roundedBox(clothCap,.11,.035,.045,.015,leather,0,.246,-.155);
  clothCap.visible=false;
  const clothBackpack=group(torso);
  clothBackpack.name='EquippedBackpack';
  roundedBox(clothBackpack,.51,.59,.24,.075,packFabric,0,.32,.393);
  roundedBox(clothBackpack,.45,.10,.27,.029,leather,0,.52,.435);
  roundedBox(clothBackpack,.44,.21,.13,.042,packFabric,0,.14,.545);
  roundedBox(clothBackpack,.20,.06,.05,.018,metal,0,.20,.618);
  for(const side of [-1,1]){
    strap(clothBackpack,[side*.22,.54,.28],[side*.25,.10,-.215],.028,leather);
    roundedBox(clothBackpack,.11,.15,.13,.025,packFabric,
      side*.28,.28,.425);
  }
  clothBackpack.visible=false;
  const clothingSlots={head:'none',back:'none'};
  function setClothing(loadout={}){
    clothingSlots.head=loadout.head==='field-cap'?'field-cap':'none';
    clothingSlots.back=loadout.back==='field-backpack'?'field-backpack':'none';
    clothBackpack.visible=clothingSlots.back==='field-backpack';
    clothCap.visible=clothingSlots.head==='field-cap'&&equippedArmor.head==='none';
  }

  // W09.6: silhouettes and gear that identify the three enemy roles even
  // when their randomized armor slots are empty.
  if(variant==='scout'){
    // Lightweight scouting hood, desert shoulder cape and antenna radio.
    roundedBox(torso,.59,.47,.065,.065,leather,0,.36,.266);
    roundedBox(torso,.47,.08,.08,.022,jacketLight,0,.55,.310);
    roundedBox(head,.39,.082,.29,.034,jacketLight,0,.227,-.045);
    roundedBox(head,.31,.055,.14,.02,leather,0,.184,-.185);
    roundedBox(torso,.15,.20,.13,.03,cloth,.34,.35,.08);
    strap(torso,[.34,.48,.12],[.34,.86,.12],.009,metal);
    for(const side of [-1,1])roundedBox(torso,.095,.17,.09,.02,leather,
      side*.27,.21,.22);
  }else if(variant==='raider'){
    // Asymmetric red scavenger scarf, strapped canisters and patched hood.
    roundedBox(torso,.67,.14,.46,.055,jacketLight,0,.57,.01);
    const scarf=roundedBox(torso,.26,.28,.068,.03,jacketLight,-.14,.42,-.255);
    scarf.rotation.z=.23;
    roundedBox(head,.33,.105,.13,.04,leather,0,-.02,-.172);
    roundedBox(head,.42,.045,.30,.012,jacketLight,0,.174,.017);
    for(let n=0;n<3;n++)roundedBox(torso,.096,.15,.09,.021,leather,
      .30,.19+n*.14,.258);
    roundedBox(torso,.13,.21,.16,.042,cloth,-.34,.19,.16);
  }else if(variant==='enforcer'){
    // Heavy blue-grey collar, armored radio pack, full respirator visor.
    roundedBox(torso,.80,.14,.56,.07,metal,0,.63,.015);
    roundedBox(torso,.52,.49,.20,.073,cloth,0,.31,.33);
    roundedBox(torso,.30,.22,.13,.05,metal,0,.35,.44);
    roundedBox(head,.40,.25,.35,.08,metal,0,.17,.055);
    roundedBox(head,.32,.12,.075,.027,glass,0,.068,-.211);
    roundedBox(head,.22,.11,.13,.029,dark,0,-.045,-.215);
    for(const side of [-1,1]){
      roundedBox(torso,.17,.22,.22,.055,metal,side*.39,.51,.015);
      roundedBox(head,.07,.13,.12,.021,cloth,side*.18,-.025,-.035);
    }
  }
  // Guns attach to an animated torso joint instead of hovering in world space.
  const weaponSocket=group(torso,.21,.35,-.34);
  weaponSocket.name='TorsoWeaponSocket';
  // Third-person held weapon: the old rig had a socket, but no visible gun.
  // These meshes are purely cosmetic and follow the same animated torso.
  const heldWeapon=plainSurvivor&&heldWeaponEnabled?group(weaponSocket,0,-.07,0):null;
  let heldWeaponId=null;
  let heldMagazine=null,heldBarrel=null,heldReceiver=null,heldStock=null,heldScope=null;
  let heldCylinder=null,heldPump=null,heldBolt=null,heldRound=null;
  if(heldWeapon){
    heldWeapon.name='SurvivorHeldWeapon';
    const part=(w,h,d,mat,x,y,z)=>{
      const item=mesh(heldWeapon,new THREE.BoxGeometry(w,h,d),mat,x,y,z);
      item.userData.playerCosmetic=true;return item;
    };
    heldReceiver=part(.18,.15,.45,metal,0,0,-.18);
    part(.13,.20,.14,dark,0,-.18,-.07).rotation.x=-.16;
    heldStock=part(.15,.12,.33,leather,0,-.02,.18);
    heldMagazine=part(.11,.22,.14,dark,0,-.17,-.19);
    heldBarrel=new THREE.Mesh(new THREE.CylinderGeometry(.035,.039,.58,10),dark);
    heldBarrel.rotation.x=Math.PI/2;heldBarrel.position.set(0,.015,-.56);
    heldBarrel.castShadow=true;heldWeapon.add(heldBarrel);
    heldScope=part(.09,.095,.20,dark,0,.155,-.26);
    part(.045,.055,.05,metal,0,.21,-.26);
    heldCylinder=part(.19,.16,.19,metal,0,.025,-.16);
    heldPump=part(.23,.12,.24,leather,0,-.015,-.39);
    heldBolt=part(.10,.05,.09,metal,.10,.10,-.08);
    heldRound=part(.04,.10,.04,metal,.065,.12,-.13);
  }
  function setHeldWeapon(id='scrap-pistol'){
    if(heldWeaponId===id)return;
    heldWeaponId=id;
    if(!heldWeapon)return;
    if(id===null){heldWeapon.visible=false;return;}
    heldWeapon.visible=true;
    const configs={
      'scrap-pistol':{length:.58,mag:1.0,stock:false,optic:false},
      'iron-revolver':{length:.69,mag:.65,stock:false,optic:false},
      'pipe-smg':{length:.95,mag:1.2,stock:true,optic:false},
      'service-carbine':{length:1.22,mag:1.25,stock:true,optic:true},
      'scrap-shotgun':{length:1.32,mag:.65,stock:true,optic:false},
      'hunting-rifle':{length:1.55,mag:.7,stock:true,optic:true}
    };
    const model=configs[id]||configs['scrap-pistol'];
    heldWeapon.scale.z=model.length;
    heldWeapon.scale.x=id==='scrap-shotgun'?1.3:1;
    heldBarrel.scale.y=model.length;
    heldReceiver.scale.z=model.length>1?1.23:1;
    heldStock.visible=model.stock;
    heldMagazine.scale.y=model.mag;
    heldMagazine.visible=!['iron-revolver','scrap-shotgun','hunting-rifle'].includes(id);
    heldScope.visible=model.optic;
    heldCylinder.visible=id==='iron-revolver';
    heldPump.visible=id==='scrap-shotgun';
    heldBolt.visible=id==='hunting-rifle';
    heldRound.visible=false;
  }
  setHeldWeapon();

  // W09.4: each real inventory armor slot has a matching removable mesh,
  // independently skinned onto the same articulated parent as the clothing.
  // All four families keep distinct colors, silhouette and coverage.
  const armorKinds=['scrap','ranger','militia','citadel'];
  const armorSlots=['head','chest','leftArm','rightArm','leftLeg','rightLeg'];
  const armorStyle={
    scrap:{main:pixelFabric('#857765','#4a4741',72),
      edge:pixelFabric('#e5ba77','#8f5d35',81),bulk:.94,detail:leather},
    ranger:{main:pixelFabric('#637862','#354b39',73),
      edge:pixelFabric('#b7ce86','#576e49',82),bulk:1.02,detail:cloth},
    militia:{main:pixelFabric('#718993','#3b5661',74),
      edge:pixelFabric('#a8d1d2','#547d87',83),bulk:1.10,detail:metal},
    citadel:{main:pixelFabric('#475774','#262d43',75),
      edge:pixelFabric('#c4b6e6','#69648d',84),bulk:1.22,detail:dark}
  };
  materials.push(...Object.values(armorStyle).flatMap(style=>[style.main,style.edge]));
  const armorGroups=Object.fromEntries(armorSlots.map(slot=>
    [slot,Object.fromEntries(armorKinds.map(kind=>[kind,[]]))]));
  const equippedArmor=Object.fromEntries(armorSlots.map(slot=>[slot,'none']));
  function armorLayer(slot,kind,parent,draw){
    const layer=group(parent);
    layer.name='SurvivorArmor_'+slot+'_'+kind;
    layer.visible=false;
    draw(layer,armorStyle[kind],kind);
    armorGroups[slot][kind].push(layer);
  }
  for(const kind of armorKinds){
    armorLayer('head',kind,head,(layer,{main,edge,detail,bulk},tier)=>{
      // Helmet shell protrudes past the hood in every camera direction.
      roundedBox(layer,.36*bulk,.23,.36*bulk,.08,main,0,.19,.055);
      roundedBox(layer,.35*bulk,.06,.37*bulk,.02,edge,0,.115,.03);
      roundedBox(layer,.36*bulk,.09,.10,.028,main,0,.09,-.211);
      roundedBox(layer,.25*bulk,.045,.035,.014,edge,0,.065,-.269);
      for(const side of [-1,1]){
        roundedBox(layer,.08,.18,.20,.028,main,side*.168,-.035,-.026);
        roundedBox(layer,.042,.11,.06,.012,edge,side*.188,-.035,-.112);
      }
      if(tier==='citadel')
        roundedBox(layer,.28,.07,.05,.022,detail,0,.015,-.267);
    });
    armorLayer('chest',kind,torso,(layer,{main,edge,detail,bulk},tier)=>{
      // Raised armor must visibly change the silhouette from BEHIND as well
      // as from the front, because third-person follows the survivor's back.
      roundedBox(layer,.66*bulk,.52,.17,.085,main,0,.35,-.315);
      roundedBox(layer,.64*bulk,.50,.17,.085,main,0,.35,.308);
      roundedBox(layer,.54*bulk,.075,.05,.025,edge,0,.52,-.416);
      roundedBox(layer,.54*bulk,.075,.05,.025,edge,0,.52,.411);
      roundedBox(layer,.37*bulk,.12,.07,.035,detail,0,.24,-.414);
      roundedBox(layer,.34*bulk,.11,.07,.035,detail,0,.24,.410);
      for(const side of [-1,1]){
        strap(layer,[side*.28,.59,-.28],[side*.27,.11,-.29],.028,edge);
        roundedBox(layer,.16,.17,.075,.029,main,side*.24,.16,.395);
        roundedBox(layer,.16,.17,.075,.029,main,side*.24,.16,-.396);
      }
      if(tier==='militia'||tier==='citadel')
        roundedBox(layer,.33*bulk,.13,.095,.035,edge,0,.36,.420);
    });
  }
  function setArmor(loadout={}){
    for(const slot of armorSlots){
      const id=loadout[slot];
      const tier=armorKinds.find(kind=>id===kind+'-'+slot)||'none';
      if(equippedArmor[slot]===tier+'-'+slot||
        (tier==='none'&&equippedArmor[slot]==='none'))continue;
      for(const kind of armorKinds)
        for(const layer of armorGroups[slot][kind])
          layer.visible=kind===tier;
      equippedArmor[slot]=tier==='none'?'none':tier+'-'+slot;
    }
    // Armor helmets cover cloth hats rather than clipping through them.
    clothCap.visible=clothingSlots.head==='field-cap'&&equippedArmor.head==='none';
  }

  const arms=[],legs=[];
  for(const side of [-1,1]){
    const shoulder=group(torso,side*.392,.53,0);
    oval(shoulder,.15,.16,.175,jacketLight,0,-.055,0);
    taper(shoulder,.135,.113,.34,jacket,side*.025,-.20,0);
    if(!plainSurvivor)roundedBox(shoulder,.255,.18,.29,.055,jacketLight,
      side*.02,-.18,-.025);
    const elbow=group(shoulder,side*.035,-.40,0);
    oval(elbow,.115,.105,.12,cloth);
    taper(elbow,.119,.091,.29,jacket,0,-.18,0);
    if(!plainSurvivor)for(let k=0;k<3;k++)strap(elbow,[-.10,-.10-k*.057,-.03],
      [.10,-.10-k*.057,-.03],.013,leather);
    const hand=group(elbow,0,-.36,-.016);
    oval(hand,.095,.11,.083,boot,0,-.045,-.01);
    for(const f of [-1,0,1]){
      taper(hand,.019,.016,.115,boot,f*.054,-.132,-.063,8);
    }
    const armSlot=side<0?'leftArm':'rightArm';
    for(const kind of armorKinds){
      armorLayer(armSlot,kind,shoulder,(layer,{main,edge,bulk})=>{
        oval(layer,.16*bulk,.18,.19*bulk,main,0,-.115,0);
        roundedBox(layer,.31*bulk,.20,.09,.047,main,0,-.14,.179);
        roundedBox(layer,.26*bulk,.055,.09,.023,edge,0,-.08,.241);
        roundedBox(layer,.29*bulk,.18,.09,.045,main,0,-.15,-.179);
      });
      armorLayer(armSlot,kind,elbow,(layer,{main,edge,bulk})=>{
        roundedBox(layer,.23*bulk,.30,.11,.045,main,0,-.20,-.135);
        roundedBox(layer,.23*bulk,.30,.11,.045,main,0,-.20,.145);
        roundedBox(layer,.20*bulk,.045,.06,.016,edge,0,-.10,.214);
      });
    }

    arms.push({shoulder,elbow,hand,side});

    const hip=group(pelvis,side*.164,-.12,0);
    oval(hip,.167,.20,.155,pants,0,-.055,0);
    taper(hip,.15,.12,.45,pants,0,-.29,0);
    if(!plainSurvivor)roundedBox(hip,.24,.19,.16,.05,cloth,0,-.31,-.13);
    const knee=group(hip,0,-.42,0);
    oval(knee,.135,.13,.128,cloth);
    if(!plainSurvivor)roundedBox(knee,.205,.18,.12,.045,leather,0,-.02,-.12);
    taper(knee,.123,.088,.39,pants,0,-.245,0);
    if(!plainSurvivor)for(let k=0;k<2;k++)strap(knee,[-.10,-.20-k*.07,-.015],
      [.10,-.20-k*.07,-.015],.012,leather);
    const foot=group(knee,0,-.25,-.035);
    oval(foot,.139,.11,.182,boot,0,-.03,-.07);
    roundedBox(foot,.29,.13,.39,.08,boot,0,-.092,-.124);
    roundedBox(foot,.295,.05,.41,.055,dark,0,-.17,-.12);
    roundedBox(foot,.23,.045,.055,.015,metal,0,-.045,-.285);
    const legSlot=side<0?'leftLeg':'rightLeg';
    for(const kind of armorKinds){
      armorLayer(legSlot,kind,hip,(layer,{main,edge,bulk})=>{
        roundedBox(layer,.29*bulk,.30,.12,.055,main,0,-.26,-.181);
        roundedBox(layer,.29*bulk,.30,.12,.055,main,0,-.26,.184);
        roundedBox(layer,.24*bulk,.055,.065,.02,edge,0,-.19,.257);
      });
      armorLayer(legSlot,kind,knee,(layer,{main,edge,bulk})=>{
        roundedBox(layer,.26*bulk,.21,.12,.05,main,0,-.015,-.16);
        roundedBox(layer,.26*bulk,.30,.12,.052,main,0,-.23,-.134);
        roundedBox(layer,.26*bulk,.30,.12,.052,main,0,-.23,.15);
        roundedBox(layer,.22*bulk,.05,.06,.016,edge,0,-.16,.22);
      });
    }

    legs.push({hip,knee,foot,side});
  }
  const resting=new THREE.Box3().setFromObject(root,true);
  const naturalHeight=resting.max.y-resting.min.y;
  // The geometry is created at realistic dimensions. This group is a visual,
  // never a collider or a raycast target; hit detection stays authoritative.
  root.traverse(child=>{if(child.isMesh)child.userData.playerCosmetic=true;});
  const animation=createCharacterAnimation();
  let previousYaw=null;
  function update({dt,x,z,ground=0,jump=0,yaw=0,speed=0,sprinting=false,
    crouched=false,aiming=false,alive=true,pitch=0,airborne=false,
    reloading=false,reloadProgress=0,recoil=0,hit=0,bracing=false,
    reloadStyle=null,reloadRounds=null,boardingPose=null,turnRate=null}){
    const step=clamp(Number.isFinite(dt)?dt:0,0,.05);
    const deltaYaw=previousYaw===null?0:
      Math.atan2(Math.sin(yaw-previousYaw),Math.cos(yaw-previousYaw));
    const actualTurn=Number.isFinite(turnRate)?turnRate:
      step>0?deltaYaw/step:0;
    previousYaw=yaw;
    const pose=stepCharacterAnimation(animation,dt,{
      speed,sprinting,crouched,aiming,alive,airborne,reloading,recoil,hit,bracing,
      turnRate:actualTurn
    });
    const crouchBlend=pose.crouch,aimBlend=pose.aim,deathBlend=pose.death;
    const stride=pose.stride,move=pose.move;
    const roundsReload=['iron-revolver','scrap-shotgun','hunting-rifle'].includes(
      reloadStyle||heldWeaponId);
    root.position.set(x,ground+jump+(boardingPose?0:pose.bob)-.32*crouchBlend-
      (plainSurvivor?.62:0)*deathBlend,z);
    // Keep forward exactly aligned with the authoritative camera/AI yaw.
    root.rotation.y=yaw;
    root.rotation.z=lerp(root.rotation.z,
      (plainSurvivor?deathBlend*1.18:0)+pose.hit*.14,
      1-Math.exp(-9*step));
    // During rear-frame boarding the pelvis dips as a real person steps
    // up; this keeps the torso's centre of mass over the supporting boot.
    pelvis.position.y=.99-(boardingPose?.walking ? .19 : 0);
    pelvis.rotation.x=.10*crouchBlend+.15*pose.land-.10*pose.sprint+
      pose.startLean*.055;
    if(boardingPose?.walking)pelvis.rotation.x+=.14;
    pelvis.rotation.z=-pose.turn*.045;
    torso.rotation.x=.30*crouchBlend+.055*pose.sprint+
      pose.breath*.7+pose.startLean*.09-
      pose.hit*.13+pose.recoil*.055+pose.brace*.07;
    torso.rotation.z=Math.sin(pose.phase)*.025*move+pose.hit*.12-
      pose.turn*.09;
    torso.rotation.y=Math.sin(pose.phase*.5)*.018*move;
    head.rotation.x=clamp(pitch*.45,-.3,.3)-.13*crouchBlend+
      pose.hit*.10+pose.breath*.42;
    head.rotation.z=-pose.hit*.10+pose.turn*.06;
    const boardingLegIKDebug=[];
    for(let i=0;i<2;i++){
      const leg=legs[i],arm=arms[i],sign=i===0?1:-1;
      leg.hip.rotation.x=sign*stride+.69*crouchBlend+
        (i===0?-.32:.20)*pose.jump+.20*pose.land;
      leg.knee.rotation.x=Math.max(0,-sign*Math.sin(pose.phase))*.46*move-
        1.03*crouchBlend+.53*pose.jump+.18*pose.land;
      leg.foot.rotation.x=-.24*leg.knee.rotation.x-.18*crouchBlend-
        .20*pose.land+Math.max(0,-sign*Math.sin(pose.phase))*.12*move;
      // Toe lift happens on the forward swing, while the opposite foot
      // remains planted. Feet never move the authoritative collision body.
      leg.foot.position.y=-.25+
        Math.max(0,sign*Math.sin(pose.phase))*.045*move*(1-crouchBlend);
      arm.shoulder.rotation.x=-sign*stride*.72-(.87+.08*sign)*aimBlend-
        .42*pose.sprint+pose.reload*(i===0?(roundsReload ? -.95 : -.65):
          (roundsReload ? .06 : .24))+
        pose.recoil*.19+pose.hit*.19-pose.brace*.8;
      arm.shoulder.rotation.z=-sign*(.13+.20*aimBlend+.13*pose.brace)+
        (i===0?-.09:.14)*pose.reload+sign*.10*pose.jump;
      arm.elbow.rotation.x=-.18-.64*aimBlend-
        pose.reload*(i===0?(roundsReload ? .94 : .70):.32);
      arm.elbow.rotation.z=sign*(.18*aimBlend+.28*pose.reload);
      arm.hand.rotation.x=.10*pose.reload+.08*pose.recoil;
      arm.hand.rotation.z=sign*.08*pose.brace;
      // Return every shoulder and wrist degree of freedom from a previous
      // boarding pose to a neutral value before ordinary locomotion.
      arm.shoulder.rotation.y=0;
      arm.elbow.rotation.y=0;
      arm.hand.rotation.y=0;
      arm.elbow.position.x=arm.side*.035;
      arm.hand.position.z=-.016;
      if(boardingPose){
        // Frame-local rear-hatch walk. Drive real hip/knee/ankle and
        // shoulder/elbow joints from distance traveled, with grounded toes.
        const wave=Math.sin((boardingPose.footPhase||0)+(i===0?0:Math.PI));
        const motion=boardingPose.walking?1:0;
        const brace=boardingPose.brace||0;
        // Each raised boot now clears an actual service stair. The other
        // boot stays planted rather than both feet floating through a frame.
        const lift=Math.max(0,boardingPose.footLifts?.[i]||0);
        const contact=boardingPose.footTargets?.[i];
        if(contact){
          // Solve a real ankle target on the tread, in the survivor's
          // sagittal plane. Root yaw PI reverses local Z relative to the
          // frame. The boot sole is approximately .17m below the ankle.
          const hipHeight=boardingPose.y+pelvis.position.y-.12;
          const ankleY=contact.y+.17-hipHeight;
          const ankleZ=boardingPose.z-contact.z+.10;
          const ik=solveBoardingLeg(ankleY,ankleZ);
          leg.hip.rotation.x=ik.hip;
          leg.knee.rotation.x=ik.knee;
          leg.foot.rotation.x=ik.ankle;
          leg.foot.position.y=-.25;
          boardingLegIKDebug.push({leg:i,error:ik.error,
            unreachable:ik.unreachable,targetY:ankleY,
            targetZ:ankleZ,hip:ik.hip,knee:ik.knee});
        }else{
          // Approach and clear-hatch strides use regular gait until the
          // feet enter or leave the service stair contact zone.
          const anchored=i===boardingPose.plantedLeg;
          const offset=anchored?clamp(
            boardingPose.y-boardingPose.plantedHeight,-.24,.24):0;
          leg.hip.rotation.x=wave*.18*motion+lift*1.65+brace*.12;
          leg.knee.rotation.x=Math.max(0,wave)*.13*motion-lift*1.65+
            brace*.16+Math.abs(offset)*.9;
          leg.foot.rotation.x=-.72*leg.hip.rotation.x-
            .48*leg.knee.rotation.x;
          leg.foot.position.y=-.25+lift*.65-offset*.90;
        }
        // Set an ordinary relaxed transition pose, then aim the actual
        // upper arm, elbow and wrist at the moving service handle.
        arm.shoulder.rotation.x=-wave*.12*motion-.10*brace;
        arm.shoulder.rotation.z=sign*.08;
        arm.elbow.rotation.x=-.22;
        arm.elbow.rotation.z=0;
        arm.hand.rotation.x=0;
        const grip=clamp(boardingPose.grip||0,0,1);
        const handTarget=boardingPose.handTargets?.[i];
        if(handTarget&&grip>.001&&root.parent){
          // Target is authored in the parent pilot's actual world-space
          // frame, including frame rotation and moving handle hinges.
          const worldTarget=root.parent.localToWorld(
            new THREE.Vector3(...handTarget));
          const relative=arm.shoulder.parent.worldToLocal(worldTarget)
            .sub(arm.shoulder.position);
          const upperLength=.40,lowerLength=.36;
          const distance=relative.length();
          if(distance>.0001){
            const direction=relative.normalize();
            const reach=clamp(distance,Math.abs(upperLength-lowerLength)+.01,
              upperLength+lowerLength-.008);
            const target=direction.clone().multiplyScalar(reach);
            const along=(upperLength**2-lowerLength**2+reach**2)/(2*reach);
            const across=Math.sqrt(Math.max(0,upperLength**2-along**2));
            // The elbow naturally hangs below the handhold, not out
            // sideways in a fixed, T-pose-like shoulder rotation.
            const down=new THREE.Vector3(0,-1,0)
              .addScaledVector(direction,direction.y);
            if(down.lengthSq()<.001)down.set(0,0,-1);
            down.normalize();
            const elbowPoint=target.clone().multiplyScalar(along/reach)
              .addScaledVector(down,across);
            const shoulderTarget=new THREE.Quaternion()
              .setFromUnitVectors(new THREE.Vector3(0,-1,0),
                elbowPoint.clone().normalize());
            const forearmDir=target.clone().sub(elbowPoint)
              .applyQuaternion(shoulderTarget.clone().invert()).normalize();
            const elbowTarget=new THREE.Quaternion()
              .setFromUnitVectors(new THREE.Vector3(0,-1,0),forearmDir);
            // Remove the small cosmetic joint offsets while gripping:
            // these would otherwise keep the palm .04m off the rail.
            arm.elbow.position.x=0;
            arm.hand.position.z=0;
            arm.shoulder.quaternion.slerp(shoulderTarget,grip);
            arm.elbow.quaternion.slerp(elbowTarget,grip);
            arm.hand.rotation.x=-.16*grip;
          }
        }
      }
    }
    // Physical validation in local and real 3D browser tests: each palm
    // must be within a small tolerance of its frame-mounted handhold.
    root.userData.boardingGripDistances=
      boardingPose?.handTargets&&root.parent?arms.map((arm,i)=>{
        const worldGoal=root.parent.localToWorld(
          new THREE.Vector3(...boardingPose.handTargets[i]));
        return {hand:i,distance:arm.hand.getWorldPosition(
          new THREE.Vector3()).distanceTo(worldGoal)};
      }):null;
    root.userData.boardingLegIK=boardingPose?boardingLegIKDebug:null;
    root.userData.boardingJointAngles=boardingPose?legs.map(leg=>({
      hip:leg.hip.rotation.x,knee:leg.knee.rotation.x,
      ankle:leg.foot.rotation.x
    })):null;
    if(heldWeapon){
      const stage=clamp(reloadProgress,0,1);
      const gunPose=reloadPoseForWeapon(heldWeaponId,
        reloading?1-stage:0,1,reloadRounds);
      heldWeapon.rotation.x=-pose.recoil*.14+pose.reload*gunPose.tilt;
      heldWeapon.rotation.z=pose.reload*(gunPose.cylinderOpen*.1+.03);
      heldMagazine.position.y=-.17-gunPose.magazineOffset*.55;
      heldMagazine.rotation.z=gunPose.magazineAngle;
      heldCylinder.position.x=-.03-.10*gunPose.cylinderOpen;
      heldCylinder.rotation.y=.8*gunPose.cylinderOpen;
      heldPump.position.z=-.39+gunPose.pumpOffset;
      heldBolt.position.z=-.08+gunPose.boltOffset;
      heldBolt.rotation.z=gunPose.boltHandleLift*.4;
      heldRound.visible=gunPose.roundVisible;
      heldRound.position.y=.12-.10*gunPose.shellProgress;
      heldRound.position.z=-.13-.10*gunPose.shellProgress;
      heldWeapon.position.y=-.07-pose.reload*.025;
    }
  }
  return {
    root,materials,setArmor,setClothing,weaponSocket,setHeldWeapon,heldWeapon,
    get clothing(){return {...clothingSlots};},
    get visibleClothing(){return {
      head:clothCap.visible,back:clothBackpack.visible
    };},
    get armor(){return {...equippedArmor};},
    get visibleArmorPieces(){return Object.fromEntries(armorSlots.map(slot=>
      [slot,armorKinds.reduce((count,kind)=>count+
        armorGroups[slot][kind].filter(layer=>layer.visible).length,0)]));},
    get metrics(){return {height:naturalHeight,crouched:animation.crouch,
      aiming:animation.aim,pose:animation.pose,land:animation.land,
      recoil:animation.recoil,heldWeapon:heldWeapon?heldWeaponId:null};},
    update,
    dispose(){
      scene.remove(root);
      root.traverse(child=>{if(child.geometry)child.geometry.dispose();});
      for(const mat of materials){mat.map?.dispose();mat.dispose();}
    }
  };
}
