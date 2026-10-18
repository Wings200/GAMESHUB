// BLACKOUT V0.4 — Entirely 3D optical sights rigidly attached to the gun.
// No HUD scope images, crosshair overlays or fake screen-space glass.
// One camera ray is used for the shot and 3D optic's optical zero.
export function createWeaponOptics(THREE,weaponRoot) {
  const housing=new THREE.MeshStandardMaterial({color:0x1a252f,metalness:.78,roughness:.38});
  const edge=new THREE.MeshStandardMaterial({color:0x536775,metalness:.73,roughness:.42});
  const glass=new THREE.MeshPhysicalMaterial({color:0x68bbdd,transparent:true,opacity:.12,
    roughness:.08,metalness:0,depthWrite:false,side:THREE.DoubleSide});
  const red=new THREE.MeshBasicMaterial({color:0xff4940,depthTest:true,depthWrite:false,
    transparent:true,opacity:.98,side:THREE.DoubleSide,toneMapped:false});
  const green=new THREE.MeshBasicMaterial({color:0x86f2c4,depthTest:true,depthWrite:false,
    transparent:true,opacity:.95,side:THREE.DoubleSide,toneMapped:false});
  const amber=new THREE.MeshBasicMaterial({color:0xffc074,depthTest:true,depthWrite:false,
    transparent:true,opacity:.95,side:THREE.DoubleSide,toneMapped:false});
  const mount=new THREE.Group();mount.position.set(0,.23,-.37);weaponRoot.add(mount);
  const styles={};
  const box=(parent,x,y,z,w,h,d,mat)=>{
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
    m.position.set(x,y,z);parent.add(m);return m;
  };
  const dot=(group,z,color,r=.0037)=>{
    const m=new THREE.Mesh(new THREE.SphereGeometry(r,10,8),color);
    m.position.z=z;group.add(m);return m;
  };
  const circle=(group,z,color,r=.025,tube=.0018)=>{
    const m=new THREE.Mesh(new THREE.TorusGeometry(r,tube,6,48),color);
    m.position.z=z;group.add(m);return m;
  };
  const bar=(group,x,y,z,w,h,mat)=>box(group,x,y,z,w,h,.003,mat);
  function squareHousing(g,w=.235,h=.215){
    const t=.028,z=0;
    box(g,-w/2+t/2,0,z,t,h,.076,housing);
    box(g,w/2-t/2,0,z,t,h,.076,housing);
    box(g,0,h/2-t/2,z,w,t,.076,housing);
    box(g,0,-h/2+t/2,z,w,t,.076,housing);
    box(g,0,-h/2-.028,.007,.12,.042,.17,edge);
    box(g,0,-h/2-.051,.038,.13,.014,.19,housing);
    box(g,0,0,-.012,w-t*2,h-t*2,.004,glass);
  }
  {
    const g=new THREE.Group();mount.add(g);
    squareHousing(g,.235,.214);
    circle(g,.018,red,.026,.0018);dot(g,.019,red,.004);
    bar(g,0,.046,.019,.0016,.013,red);
    bar(g,0,-.046,.019,.0016,.013,red);
    styles["holo-a"]=g;
  }
  {
    const g=new THREE.Group();mount.add(g);
    squareHousing(g,.245,.182);
    circle(g,.018,green,.019,.0016);
    bar(g,-.043,0,.02,.023,.0017,green);
    bar(g,.043,0,.02,.023,.0017,green);
    bar(g,0,.042,.02,.0017,.023,green);
    bar(g,0,-.042,.02,.0017,.023,green);
    dot(g,.022,green,.0037);
    styles["holo-b"]=g;
  }
  {
    const g=new THREE.Group();mount.add(g);
    const torus=new THREE.Mesh(new THREE.TorusGeometry(.108,.022,12,48),housing);
    g.add(torus);
    const lip=new THREE.Mesh(new THREE.TorusGeometry(.087,.005,8,48),edge);
    lip.position.z=.02;g.add(lip);
    const lens=new THREE.Mesh(new THREE.CircleGeometry(.087,32),glass);lens.position.z=-.008;g.add(lens);
    box(g,0,-.12,.013,.11,.055,.15,housing);
    dot(g,.028,red,.0045);
    styles["red-dot"]=g;
  }
  {
    const g=new THREE.Group();mount.add(g);
    // Rear U-notch + the center front sight blade are real 3D geometry.
    box(g,-.082,-.005,.095,.024,.16,.029,housing);
    box(g,.082,-.005,.095,.024,.16,.029,housing);
    box(g,0,-.08,.095,.18,.026,.029,housing);
    box(g,0,-.018,-.24,.024,.145,.028,edge);
    box(g,0,.049,-.217,.011,.018,.018,amber);
    box(g,0,-.122,0,.12,.038,.17,housing);
    styles.iron=g;
  }
  function selectSight(name){
    const selected=styles[name]?name:"holo-a";
    for(const [id,group] of Object.entries(styles))group.visible=id===selected;
    return selected;
  }
  selectSight("holo-a");
  // The gun's ADS position must make the mount origin world-space (0,0)
  // in front of the camera. Multiply by slotScale for a smaller sidearm.
  const mountY=mount.position.y;
  function aimPosition(slotScale=1){
    return {x:0,y:-mountY*slotScale,z:-.81};
  }
  return {mount,styles,selectSight,aimPosition,mountY};
}
