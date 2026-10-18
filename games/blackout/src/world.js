// BLACKOUT V0.2 — The Lab. Pure flat mechanics range, not a map.
// Targets and breach-test panels are the only obstacles. All collidable
// panel meshes share transforms with their real collision records.
export function buildRange(THREE,scene){
  scene.background=new THREE.Color(0x9db7c6);
  scene.fog=new THREE.FogExp2(0x9db7c6,.004);
  scene.add(new THREE.HemisphereLight(0xd7f0ff,0x3e4e61,2));
  const sun=new THREE.DirectionalLight(0xffe8c5,2.4);
  sun.position.set(-38,85,-54);scene.add(sun);
  const root=new THREE.Group();scene.add(root);
  const colliders=[],shootables=[],targets=[],panels=[],placed=[];
  const surface=new THREE.MeshStandardMaterial({color:0x525c67,roughness:.96,metalness:.05});
  const dark=new THREE.MeshStandardMaterial({color:0x273341,metalness:.4,roughness:.67});
  const bright=new THREE.MeshStandardMaterial({color:0xe4eef5,roughness:.55});
  const line=new THREE.MeshBasicMaterial({color:0x97aeb8});
  const warning=new THREE.MeshStandardMaterial({color:0xf3aa4f,metalness:.2,roughness:.55});
  const cyan=new THREE.MeshBasicMaterial({color:0x6ef3ef});
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(240,240),surface);
  floor.rotation.x=-Math.PI/2;root.add(floor);shootables.push(floor);
  const grid=new THREE.GridHelper(240,48,0x728a99,0x617281);grid.position.y=.012;root.add(grid);
  function mesh(geo,mat,x,y,z,parent=root){
    const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);parent.add(m);return m;
  }
  function box(x,y,z,w,h,d,mat,parent=root){
    return mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z,parent);
  }
  function label(text,x,z,scale=3){
    const cv=document.createElement("canvas");cv.width=512;cv.height=128;
    const c=cv.getContext("2d");c.fillStyle="#10202e";c.fillRect(0,0,512,128);
    c.fillStyle="#6defee";c.fillRect(0,0,512,8);
    c.font="bold 39px Arial";c.textAlign="center";c.textBaseline="middle";
    c.fillStyle="#e4f9ff";c.fillText(text,256,69,492);
    const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;
    const p=mesh(new THREE.PlaneGeometry(scale,scale/4),new THREE.MeshBasicMaterial({map:t,transparent:true,side:THREE.DoubleSide}),x,.025,z);
    p.rotation.x=-Math.PI/2;
  }
  // Fixed-range distance markers on the ground, not building geometry.
  for(const z of [10,0,-10,-20,-30,-40,-50,-60]){
    box(0,.019,z,62,.025,.08,z===10?cyan:line);
    label(z===10?"START":`${Math.abs(z-10)} METERS`,-23,z+1.2,4.5);
  }
  for(const x of [-32,32]){
    box(x,.014,-24,.10,.026,85,warning);
  }
  // Low silhouette target geometry: head and center mass have independent
  // raycast regions, no physical wall collider, bounded scene assets.
  let targetId=0;
  function makeTarget(x,z,distanceLabel){
    const group=new THREE.Group();root.add(group);group.position.set(x,0,z);
    const pole=box(0,1.1,0,.12,2.2,.14,dark,group);
    const base=box(0,.09,0,.75,.18,.66,dark,group);
    const torso=box(0,1.46,.05,.86,1.08,.25,bright,group);
    const chest=box(0,1.48,.203,.35,.36,.018,warning,group);
    const head=mesh(new THREE.SphereGeometry(.255,12,10),bright,0,2.21,.04,group);
    const id=++targetId;
    const target={id,group,torso,head,chest,x,z,distanceLabel,health:100,alive:true,hits:0,
      reset(){this.health=100;this.alive=true;this.hits=0;torso.material=bright;head.material=bright;chest.visible=true;group.visible=true;},
      damage(amount){if(!this.alive)return false;this.health=Math.max(0,this.health-amount);this.hits++;
        if(!this.health){this.alive=false;torso.material=dark;head.material=dark;chest.visible=false;}
        return !this.health; }};
    torso.userData={kind:"target",target,hitZone:"body"};
    head.userData={kind:"target",target,hitZone:"head"};
    chest.userData={kind:"target",target,hitZone:"body"};
    targets.push(target);shootables.push(torso,head,chest);
    return target;
  }
  for(const z of [-10,-22,-36,-51]){
    for(const x of [-12,0,12])makeTarget(x,z,`${Math.abs(z-10)}m`);
  }
  // Standalone panels for weapon penetration and attacker/defender tests.
  // They are NOT a level, so remove/rebuild them without changing the arena.
  let panelId=0;
  function makePanel(x,z){
    const id=++panelId,g=new THREE.Group();root.add(g);
    g.position.set(x,0,z);
    const frameMat=new THREE.MeshStandardMaterial({color:0x38444e,roughness:.82,metalness:.3});
    const soft=new THREE.MeshStandardMaterial({color:0x977d63,roughness:.93});
    const reinforced=new THREE.MeshStandardMaterial({color:0x4b667a,roughness:.55,metalness:.75});
    box(-1.56,1.48,0,.13,2.97,.4,frameMat,g);
    box(1.56,1.48,0,.13,2.97,.4,frameMat,g);
    const center=box(0,1.5,0,3,2.88,.18,soft,g);
    const rails=[.65,1.55,2.45].map(h=>box(0,h,.125,2.94,.085,.09,frameMat,g));
    const c={minX:x-1.56,maxX:x+1.56,minZ:z-.22,maxZ:z+.22,minY:0,maxY:2.99,tag:"test-panel"};
    colliders.push(c);
    const panel={id,x,z,group:g,mesh:center,rails,collider:c,hp:220,reinforced:false,destroyed:false,
      reset(){this.hp=220;this.reinforced=false;this.destroyed=false;g.visible=true;
        center.material=soft;rails.forEach(r=>r.material=frameMat);
        if(!colliders.includes(c))colliders.push(c);},
      reinforce(){if(this.destroyed||this.reinforced)return false;this.reinforced=true;
        center.material=reinforced;rails.forEach(r=>r.material=reinforced);return true;},
      damage(amount,breach=false){
        if(this.destroyed||this.reinforced)return false;
        this.hp=Math.max(0,this.hp-(breach?500:amount));
        if(this.hp===0){this.destroyed=true;g.visible=false;
          const i=colliders.indexOf(c);if(i!==-1)colliders.splice(i,1);return true;}
        return false;
      }};
    for(const part of [center,...rails])part.userData={kind:"panel",panel};
    panels.push(panel);shootables.push(center,...rails);
    return panel;
  }
  makePanel(-18,-29);makePanel(18,-29);
  function addShield(x,z,yaw){
    const forward={x:-Math.sin(yaw),z:-Math.cos(yaw)};
    const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=yaw;root.add(g);
    const mat=new THREE.MeshStandardMaterial({color:0x3d566b,metalness:.75,roughness:.44});
    const center=box(0,.68,0,1.65,1.35,.21,mat,g);
    box(-.76,.67,.07,.13,1.3,.31,dark,g);box(.76,.67,.07,.13,1.3,.31,dark,g);
    box(0,1.30,.02,1.48,.10,.23,cyan,g);
    // Convert rotated 1.65m panel to its actual axis-aligned world AABB.
    const halfX=Math.abs(Math.cos(yaw))*.9+Math.abs(Math.sin(yaw))*.14;
    const halfZ=Math.abs(Math.sin(yaw))*.9+Math.abs(Math.cos(yaw))*.14;
    const c={minX:x-halfX,maxX:x+halfX,minZ:z-halfZ,maxZ:z+halfZ,minY:0,maxY:1.42,tag:"shield"};
    colliders.push(c);
    const shield={group:g,collider:c,mesh:center,remove(){
      const i=colliders.indexOf(c);if(i>=0)colliders.splice(i,1);
      g.visible=false;root.remove(g);
      const j=placed.indexOf(shield);if(j>=0)placed.splice(j,1);
    }};
    center.userData={kind:"shield",shield};shootables.push(center);
    placed.push(shield);return shield;
  }
  function reset(){
    for(const t of targets)t.reset();
    for(const p of panels)p.reset();
    for(const s of [...placed])s.remove();
  }
  return {root,colliders,shootables,targets,panels,placed,floor,reset,addShield,
    floorAt:()=>0,zoneAt:()=>"THE LAB / OPEN RANGE",
    spawn:{x:0,y:0,z:19,yaw:0},
    specifications:{flat:true,size:240,targetCount:targets.length,panelCount:panels.length}};
}
