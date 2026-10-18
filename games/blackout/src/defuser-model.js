// BLACKOUT V0.6 — distinct, physical 3D defuser equipment (not a HUD sprite).
// Drawn entirely with local Three.js geometry and an animated canvas screen.
export function createDefuserModel(THREE,scene){
  const root=new THREE.Group();root.visible=false;scene.add(root);
  const casing=new THREE.MeshStandardMaterial({color:0x27333a,metalness:.72,roughness:.39});
  const rubber=new THREE.MeshStandardMaterial({color:0x111a21,metalness:.12,roughness:.85});
  const metal=new THREE.MeshStandardMaterial({color:0x687f87,metalness:.88,roughness:.28});
  const orange=new THREE.MeshStandardMaterial({color:0xc37b36,metalness:.46,roughness:.4});
  const glass=new THREE.MeshStandardMaterial({color:0x0b1d27,metalness:.38,roughness:.19});
  const green=new THREE.MeshBasicMaterial({color:0x5affe1});
  const red=new THREE.MeshBasicMaterial({color:0xff664a});
  const body=new THREE.Group();root.add(body);
  const box=(w,h,d,x,y,z,material,parent=body)=>{
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
    mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  };
  // Reinforced field case and orange corner bumpers with contrasting silhouette.
  box(.85,.24,.57,0,.185,0,casing);
  box(.83,.035,.55,0,.32,0,metal);
  box(.78,.055,.50,0,.345,0,glass);
  for(const x of [-.41,.41]){
    for(const z of [-.27,.27]){
      box(.07,.30,.07,x,.18,z,rubber);
      box(.074,.06,.086,x,.33,z,orange);
    }
  }
  for(const z of [-.19,.19]){
    box(.075,.09,.08,-.33,.37,z,orange);
    box(.075,.09,.08,.33,.37,z,orange);
  }
  // Fold-out upper console, clear front-facing LCD and physical button matrix.
  const lid=new THREE.Group();lid.position.set(0,.345,-.115);
  lid.rotation.x=-.27;body.add(lid);
  box(.74,.052,.40,0,.105,-.065,casing,lid);
  box(.69,.012,.35,0,.141,-.065,metal,lid);
  const screenCanvas=document.createElement("canvas");
  screenCanvas.width=512;screenCanvas.height=256;
  const ctx=screenCanvas.getContext("2d");
  const screenTexture=new THREE.CanvasTexture(screenCanvas);
  screenTexture.colorSpace=THREE.SRGBColorSpace;
  const screenMat=new THREE.MeshBasicMaterial({map:screenTexture,side:THREE.DoubleSide});
  box(.48,.014,.245,-.055,.158,-.09,screenMat,lid);
  for(let row=0;row<3;row++)for(let col=0;col<2;col++){
    box(.055,.022,.047,.252+col*.067,.157,-.16+row*.081,col===1?orange:rubber,lid);
  }
  // Carry handle and locking clamps.
  box(.30,.05,.08,0,.265,.35,rubber);
  box(.23,.05,.075,0,.265,.39,metal);
  box(.065,.10,.06,-.11,.25,.32,metal);
  box(.065,.10,.06,.11,.25,.32,metal);
  // Dual whip antennas and blinking physical LEDs.
  function rod(x,z,h){
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.009,.014,h,8),metal);
    mesh.position.set(x,.365+h/2,z);body.add(mesh);
    const tip=new THREE.Mesh(new THREE.SphereGeometry(.021,8,6),orange);
    tip.position.set(x,.365+h,z);body.add(tip);
  }
  rod(-.30,-.20,.39);rod(.32,-.20,.28);
  const ledA=new THREE.Mesh(new THREE.SphereGeometry(.032,10,8),green);
  const ledB=new THREE.Mesh(new THREE.SphereGeometry(.025,10,8),red);
  ledA.position.set(-.30,.375,.22);ledB.position.set(-.20,.375,.22);
  body.add(ledA,ledB);
  const light=new THREE.PointLight(0x35ffc5,.42,2.5,1.8);
  light.position.set(0,.48,0);root.add(light);
  let mode="ARMED",lastDraw=-1,lastSeconds=-1;
  function updateScreen(seconds,now){
    const remaining=Math.max(0,Math.ceil(seconds));
    if(remaining===lastSeconds&&now-lastDraw<450)return;
    lastSeconds=remaining;lastDraw=now;
    const w=512,h=256;
    ctx.fillStyle="#041822";ctx.fillRect(0,0,w,h);
    ctx.strokeStyle="#17636e";ctx.lineWidth=4;ctx.strokeRect(8,8,w-16,h-16);
    for(let n=0;n<17;n++){ctx.strokeStyle="#0b3540";ctx.beginPath();ctx.moveTo(0,n*16);ctx.lineTo(w,n*16);ctx.stroke();}
    ctx.textAlign="left";ctx.fillStyle="#74ffdf";ctx.font="bold 28px monospace";
    ctx.fillText("BLACKOUT // EOD-01",23,47);
    ctx.fillStyle=remaining<=8?"#ff906e":"#bafaf1";
    ctx.font="bold 72px monospace";ctx.fillText("00:"+String(remaining).padStart(2,"0"),22,134);
    ctx.font="bold 25px monospace";ctx.fillText(mode+" / SITE A",24,179);
    ctx.fillStyle="#224a4e";ctx.fillRect(22,205,465,20);
    ctx.fillStyle=remaining<=8?"#fd7554":"#5bf1c9";
    ctx.fillRect(22,205,465*Math.min(1,seconds/26),20);
    screenTexture.needsUpdate=true;
  }
  return {
    root,screenTexture,
    show(x,z,seconds=25){
      root.position.set(x,0,z);root.visible=true;mode="ARMED";
      lastSeconds=-1;updateScreen(seconds,0);
    },
    hide(){root.visible=false;},
    setMode(next){mode=next;lastSeconds=-1;},
    update(seconds,now=0){
      if(!root.visible)return;
      updateScreen(seconds,now);
      const flash=Math.floor(now/(seconds<=8?220:650))%2===0;
      ledA.visible=flash;ledB.visible=!flash;
      light.intensity=flash?.68:.15;
      body.rotation.y=Math.sin(now*.0004)*.018;
    }
  };
}
