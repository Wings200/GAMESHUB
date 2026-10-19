// BLACKOUT V0.9 — original bomb-site props, fully 3D and visible before a defuser is planted.
// This fictional training objective is distinct from the attacker deployable defuser.
export function createBombStations(T,scene,world,sites){
  const items={};
  const steel=new T.MeshStandardMaterial({color:0x26333d,metalness:.76,roughness:.33});
  const armor=new T.MeshStandardMaterial({color:0x657783,metalness:.67,roughness:.46});
  const warning=new T.MeshStandardMaterial({color:0xf0b35e,emissive:0x7a370c,emissiveIntensity:.34,metalness:.27});
  const black=new T.MeshStandardMaterial({color:0x101c26,roughness:.77});
  const red=new T.MeshBasicMaterial({color:0xff6851});
  const cyan=new T.MeshBasicMaterial({color:0x72ffdc});
  function mesh(group,geometry,material,x,y,z){
    const m=new T.Mesh(geometry,material);
    m.position.set(x,y,z);group.add(m);return m;
  }
  for(const site of Object.values(sites)){
    const root=new T.Group();
    const x=site.x+(site.id==="A"?1.52:-1.36);
    const z=site.z+(site.id==="A"?1.0:-1.0);
    root.position.set(x,0,z);scene.add(root);
    // Reinforced containment trolley with canisters, numbered security seals,
    // orange hazard shield, status display and revolving warning beacon.
    mesh(root,new T.CylinderGeometry(.72,.77,.14,16),steel,0,.10,0);
    mesh(root,new T.BoxGeometry(1.32,.18,.83),steel,0,.28,0);
    mesh(root,new T.BoxGeometry(1.18,.71,.77),armor,0,.66,0);
    mesh(root,new T.BoxGeometry(1.26,.08,.82),black,0,1.05,0);
    const face=mesh(root,new T.BoxGeometry(1.02,.42,.045),warning,0,.74,.405);
    for(const offset of [-.42,.42]){
      mesh(root,new T.CylinderGeometry(.17,.19,.60,12),black,offset,.68,-.12);
      mesh(root,new T.CylinderGeometry(.08,.08,.60,10),steel,offset,.68,-.12);
      mesh(root,new T.SphereGeometry(.10,10,6),red,offset,1.0,-.12);
    }
    for(let i=0;i<7;i++)
      mesh(root,new T.BoxGeometry(.068,.063,.04),i%2?black:cyan,
        -.35+(i%4)*.23,.67+Math.floor(i/4)*.12,.438);
    const alarm=mesh(root,new T.SphereGeometry(.16,12,10),red,0,1.22,0);
    const halo=mesh(root,new T.TorusGeometry(.99,.055,8,44),
      new T.MeshBasicMaterial({color:site.id==="A"?0x6effdc:0xffcc77,
        transparent:true,opacity:.74,depthWrite:false}),0,.095,0);
    halo.rotation.x=Math.PI/2;
    const light=new T.PointLight(0xff794a,1.4,5,1.9);light.position.set(0,1.3,0);root.add(light);
    // Clear 3D floating site identification (not a full-screen sign).
    const cv=document.createElement("canvas");cv.width=512;cv.height=256;
    const ctx=cv.getContext("2d");
    ctx.fillStyle="#09202a";ctx.fillRect(10,24,492,208);
    ctx.strokeStyle="#7eeede";ctx.lineWidth=8;ctx.strokeRect(12,26,488,204);
    ctx.font="900 135px sans-serif";ctx.textAlign="left";ctx.fillStyle="#ffffff";
    ctx.fillText(site.id,46,175);
    ctx.font="bold 38px sans-serif";ctx.fillStyle="#8dfbe8";
    ctx.fillText("BOMB SITE",179,104);
    ctx.fillStyle="#e5f8f5";ctx.font="bold 28px sans-serif";
    ctx.fillText("CONTAINMENT UNIT",179,156);
    const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;
    const label=mesh(root,new T.PlaneGeometry(1.82,.91),
      new T.MeshBasicMaterial({map:tex,transparent:true,side:T.DoubleSide,
        depthWrite:false}),0,2.12,0);
    const marker=mesh(root,new T.RingGeometry(1.30,1.39,64),
      new T.MeshBasicMaterial({color:site.id==="A"?0x70ffe4:0xf4ae62,
        side:T.DoubleSide,transparent:true,opacity:.82}),0,.055,0);
    marker.rotation.x=-Math.PI/2;
    // One physical body collider, not ten overlapping tiny geometry collisions.
    const c={minX:x-.57,maxX:x+.57,minZ:z-.39,maxZ:z+.39,
      minY:.17,maxY:1.08,tag:"bomb-unit"};
    world.colliders.push(c);
    face.userData.kind="solid";
    // The complete apparatus has bullet blockers; its root isn't used in shots.
    for(const piece of root.children){
      if(piece.isMesh&&piece!==halo&&piece!==label&&piece!==marker){
        piece.userData.kind="solid";world.shootables.push(piece);
      }
    }
    items[site.id]={site,x,z,root,halo,alarm,light,label,marker,collider:c};
  }
  return {
    items,
    update(now,activeId){
      for(const item of Object.values(items)){
        const selected=item.site.id===activeId;
        const blink=Math.floor(now/480)%2===0;
        item.alarm.visible=blink;
        item.light.intensity=blink?(selected?2.2:.8):.22;
        item.halo.rotation.z=now*.00024;
        item.label.position.y=2.12+Math.sin(now*.0016)*.045;
        item.marker.material.opacity=selected?.9:.28;
        item.label.material.opacity=selected?1:.65;
      }
    }
  };
}
