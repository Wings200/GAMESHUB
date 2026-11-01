// W09.3: Original wasteland-survivor player avatar.
// This is authored in-game rather than loading the photorealistic enemy GLBs.
// Mesh joints are hierarchical and animated independently of player hitboxes.
import * as THREE from 'three';

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

export function createPlayerAvatar(scene){
  const root=new THREE.Group();root.name='OriginalPixelSurvivor';
  root.scale.setScalar(.80);
  scene.add(root);
  const jacket=pixelFabric('#536c59','#283e37',9);
  const jacketLight=pixelFabric('#81927a','#3f5c4f',21);
  const pants=pixelFabric('#5b5d50','#303b35',33);
  const cloth=pixelFabric('#353d3b','#172728',47);
  const boot=pixelFabric('#373638','#151c21',51);
  const skin=pixelFabric('#b58c72','#845c4a',55);
  const leather=pixelFabric('#7d6348','#3c322b',61);
  const metal=new THREE.MeshStandardMaterial({color:0x84968b,roughness:.88,metalness:.16});
  const dark=new THREE.MeshStandardMaterial({color:0x1a292d,roughness:1});
  const glass=new THREE.MeshStandardMaterial({color:0xb4c69c,roughness:.36,metalness:.12});
  const materials=[jacket,jacketLight,pants,cloth,boot,skin,leather,metal,dark,glass];

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
  const chest=oval(torso,.37,.39,.25,jacket,0,.34,0);
  chest.scale.z=.22; // fitted torso, not a broad cylindrical mannequin
  oval(torso,.36,.34,.24,jacket,0,.33,0);
  oval(torso,.29,.19,.21,cloth,0,.04,0);
  roundedBox(torso,.67,.11,.40,.04,jacketLight,0,.60,0);
  // Jacket lapels, zipper, stitched pockets and crossing utility harness.
  for(const side of [-1,1]){
    const lapel=roundedBox(torso,.15,.43,.045,.028,jacketLight,
      side*.15,.39,-.235);lapel.rotation.z=-side*.24;
    roundedBox(torso,.21,.18,.065,.027,leather,side*.205,.14,-.242);
    roundedBox(torso,.16,.038,.05,.015,metal,side*.205,.20,-.288);
    strap(torso,[side*.27,.58,-.205],[side*.11,.09,-.274],.036,leather);
  }
  strap(torso,[-.25,.58,-.21],[.22,.11,-.27],.034,cloth);
  roundedBox(torso,.045,.44,.040,.014,dark,0,.38,-.247);
  roundedBox(torso,.19,.16,.12,.035,leather,.34,.26,.02); // radio pouch
  roundedBox(torso,.12,.08,.06,.02,metal,.35,.29,-.065);
  // Rounded hood and scarf allow a stylized, original face at low texture res.
  const neck=group(torso,0,.66,0);
  taper(neck,.115,.14,.16,skin,0,.035,0);
  oval(neck,.22,.10,.21,cloth,0,-.035,.015);
  const head=group(neck,0,.18,0);
  oval(head,.177,.224,.166,skin,0,.035,0);
  oval(head,.194,.184,.17,cloth,0,.105,.08); // cloth hood at back
  oval(head,.178,.183,.152,skin,0,.018,-.019);
  oval(head,.075,.035,.045,skin,0,-.055,-.162);
  // Angular tinted goggles and half-mask: visible identity without noisy faces.
  roundedBox(head,.335,.095,.060,.025,dark,0,.074,-.154);
  for(const side of [-1,1]){
    roundedBox(head,.139,.070,.013,.018,glass,side*.084,.075,-.190);
    roundedBox(head,.10,.035,.055,.016,cloth,side*.10,-.051,-.147);
  }
  roundedBox(head,.24,.115,.045,.034,cloth,0,-.041,-.176);
  for(let i=-1;i<=1;i++)roundedBox(head,.034,.024,.014,.009,metal,
    i*.062,-.045,-.205);
  // Mesh ponytail / hood tie.
  oval(head,.075,.115,.063,cloth,0,.03,.174);
  strap(head,[0,-.04,.175],[0,-.20,.22],.022,leather);

  const arms=[],legs=[];
  for(const side of [-1,1]){
    const shoulder=group(torso,side*.392,.53,0);
    oval(shoulder,.15,.16,.175,jacketLight,0,-.055,0);
    taper(shoulder,.135,.113,.34,jacket,side*.025,-.20,0);
    roundedBox(shoulder,.255,.18,.29,.055,jacketLight,
      side*.02,-.18,-.025);
    const elbow=group(shoulder,side*.035,-.40,0);
    oval(elbow,.115,.105,.12,cloth);
    taper(elbow,.119,.091,.29,jacket,0,-.18,0);
    for(let k=0;k<3;k++)strap(elbow,[-.10,-.10-k*.057,-.03],
      [.10,-.10-k*.057,-.03],.013,leather);
    const hand=group(elbow,0,-.36,-.016);
    oval(hand,.095,.11,.083,boot,0,-.045,-.01);
    for(const f of [-1,0,1]){
      taper(hand,.019,.016,.115,boot,f*.054,-.132,-.063,8);
    }
    arms.push({shoulder,elbow,hand,side});

    const hip=group(pelvis,side*.164,-.12,0);
    oval(hip,.167,.20,.155,pants,0,-.055,0);
    taper(hip,.15,.12,.45,pants,0,-.29,0);
    roundedBox(hip,.24,.19,.16,.05,cloth,0,-.31,-.13);
    const knee=group(hip,0,-.42,0);
    oval(knee,.135,.13,.128,cloth);
    roundedBox(knee,.205,.18,.12,.045,leather,0,-.02,-.12);
    taper(knee,.123,.088,.39,pants,0,-.245,0);
    for(let k=0;k<2;k++)strap(knee,[-.10,-.20-k*.07,-.015],
      [.10,-.20-k*.07,-.015],.012,leather);
    const foot=group(knee,0,-.25,-.035);
    oval(foot,.139,.11,.182,boot,0,-.03,-.07);
    roundedBox(foot,.29,.13,.39,.08,boot,0,-.092,-.124);
    roundedBox(foot,.295,.05,.41,.055,dark,0,-.17,-.12);
    roundedBox(foot,.23,.045,.055,.015,metal,0,-.045,-.285);
    legs.push({hip,knee,foot,side});
  }
  const resting=new THREE.Box3().setFromObject(root,true);
  const naturalHeight=resting.max.y-resting.min.y;
  // The geometry is created at realistic dimensions. This group is a visual,
  // never a collider or a raycast target; hit detection stays authoritative.
  root.traverse(child=>{if(child.isMesh)child.userData.playerCosmetic=true;});
  let phase=0,crouchBlend=0,aimBlend=0,deathBlend=0;
  function update({dt,x,z,ground=0,jump=0,yaw=0,speed=0,sprinting=false,
    crouched=false,aiming=false,alive=true,pitch=0}){
    const step=clamp(Number.isFinite(dt)?dt:0,0,.05);
    const move=clamp(speed/4,0,1);
    phase+=step*(2.5+speed*1.8);
    crouchBlend=lerp(crouchBlend,crouched?1:0,1-Math.exp(-12*step));
    aimBlend=lerp(aimBlend,aiming?1:0,1-Math.exp(-12*step));
    deathBlend=lerp(deathBlend,alive?0:1,1-Math.exp(-7*step));
    const stride=Math.sin(phase)*(sprinting?.72:.43)*move;
    const bob=Math.abs(Math.sin(phase))*.016*move;
    root.position.set(x,ground+jump+bob-.32*crouchBlend-.62*deathBlend,z);
    // The modeled front faces local -Z, and the FPS camera faces -Z at yaw 0.
    root.rotation.y=yaw;
    root.rotation.z=lerp(root.rotation.z,deathBlend*1.18,1-Math.exp(-9*step));
    pelvis.rotation.x=.10*crouchBlend;
    torso.rotation.x=.30*crouchBlend+.018*Math.sin(phase*.7);
    head.rotation.x=clamp(pitch*.45,-.3,.3)-.13*crouchBlend;
    for(let i=0;i<2;i++){
      const leg=legs[i],arm=arms[i],sign=i===0?1:-1;
      leg.hip.rotation.x=sign*stride+.69*crouchBlend;
      leg.knee.rotation.x=Math.max(0,-sign*Math.sin(phase))*.46*move-1.03*crouchBlend;
      leg.foot.rotation.x=-.24*leg.knee.rotation.x-.18*crouchBlend;
      arm.shoulder.rotation.x=-sign*stride*.72-(.87+.08*sign)*aimBlend;
      arm.shoulder.rotation.z=-sign*(.13+.20*aimBlend);
      arm.elbow.rotation.x=-.18-.64*aimBlend;
      arm.elbow.rotation.z=sign*.18*aimBlend;
    }
  }
  return {
    root,materials,
    get metrics(){return {height:naturalHeight,crouched:crouchBlend,aiming:aimBlend};},
    update,
    dispose(){
      scene.remove(root);
      root.traverse(child=>{if(child.geometry)child.geometry.dispose();});
      for(const mat of materials){mat.map?.dispose();mat.dispose();}
    }
  };
}
