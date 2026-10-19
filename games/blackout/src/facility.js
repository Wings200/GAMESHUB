// BLACKOUT V3.0 — open mechanics sandbox, NOT a tactical building.
// Every station lives on one flat training floor; no ceiling, outer perimeter,
// interior corridors or large decorative map geometry. Only intentional test
// walls, vault frames, barricades and cover create player/bullet collision.
export function buildFacility(T,scene,world){
  const {root,colliders,shootables}=world;
  const shell=new T.Group();root.add(shell);
  const steel=new T.MeshStandardMaterial({color:0x394e60,metalness:.64,roughness:.47});
  const dark=new T.MeshStandardMaterial({color:0x152636,metalness:.49,roughness:.56});
  const concrete=new T.MeshStandardMaterial({color:0x6c7883,metalness:.1,roughness:.87});
  const light=new T.MeshBasicMaterial({color:0x68f0d9});
  const yellow=new T.MeshBasicMaterial({color:0xf8bc74});
  const siteA=new T.MeshBasicMaterial({color:0x123e48,transparent:true,opacity:.38,depthWrite:false,side:T.DoubleSide});
  const siteB=new T.MeshBasicMaterial({color:0x5c3c25,transparent:true,opacity:.32,depthWrite:false,side:T.DoubleSide});
  function box(x,y,z,w,h,d,mat,solid=false,tag="station"){
    const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat);
    mesh.position.set(x,y,z);shell.add(mesh);
    if(solid){
      const c={minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,
        minY:y-h/2,maxY:y+h/2,tag};
      colliders.push(c);mesh.userData.kind="solid";shootables.push(mesh);
    }
    return mesh;
  }
  function floorZone(site,mat,ink){
    const b=site.bounds,w=b.maxX-b.minX,d=b.maxZ-b.minZ;
    box((b.minX+b.maxX)/2,.021,(b.minZ+b.maxZ)/2,w,.022,d,mat);
    // A thin border and floor stripes communicate the entire *legal*
    // planting area, never a tiny circle around the bomb trolley.
    for(const z of [b.minZ,b.maxZ])box((b.minX+b.maxX)/2,.042,z,w,.045,.10,ink);
    for(const x of [b.minX,b.maxX])box(x,.042,(b.minZ+b.maxZ)/2,.10,.045,d,ink);
    for(let i=0;i<6;i++)box(b.minX+.5+i*.75,.045,b.minZ+.45,.34,.035,.09,ink);
    label("BOMB SITE "+site.id,(b.minX+b.maxX)/2,b.maxZ-.8,3.4,ink);
  }
  function label(txt,x,z,size,ink){
    const cv=document.createElement("canvas");
    cv.width=512;cv.height=128;
    const ctx=cv.getContext("2d");
    ctx.fillStyle="#081824";ctx.fillRect(0,0,512,128);
    ctx.fillStyle="#6beadd";ctx.fillRect(0,0,512,7);
    ctx.font="900 48px Arial";ctx.fillStyle="#edfaf8";ctx.textAlign="center";
    ctx.fillText(txt,256,84,492);
    const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;
    const mesh=new T.Mesh(new T.PlaneGeometry(size,size*.25),
      new T.MeshBasicMaterial({map:tex,transparent:true,side:T.DoubleSide}));
    mesh.position.set(x,.080,z);mesh.rotation.x=-Math.PI/2;
    shell.add(mesh);return mesh;
  }
  const sites={
    A:{id:"A",name:"BOMB LAB A",x:-5,z:-44,radius:2.95,
      bounds:{minX:-9.12,maxX:-.58,minZ:-52.58,maxZ:-37.38}},
    B:{id:"B",name:"BOMB LAB B",x:5,z:-29,radius:2.95,
      bounds:{minX:.58,maxX:9.12,minZ:-36.62,maxZ:-19.42}}
  };
  floorZone(sites.A,siteA,light);floorZone(sites.B,siteB,yellow);
  label("MOVEMENT + DRONES",0,9,5,light);
  label("SOFT / REINFORCED WALLS",0,-34,5,yellow);
  label("BARRICADES + VAULT",0,-57,5,light);
  label("COVER + AI LANES",0,-14,4.5,yellow);
  const openings=[];
  // Freestanding physical door/window TEST FRAMES. They aren't connected
  // into hallways, and they do not create an enclosing structure.
  function portal(id,kind,axis,x,z,width=2.8){
    const half=width/2,edge=.15,height=kind==="window"?1.6:2.95;
    const bottom=kind==="window"?.96:0;
    if(axis==="z"){
      for(const sign of [-1,1])
        box(x+sign*(half+.11),1.45,z,.20,2.90,.22,steel,true,"test-door-frame");
      box(x,3.00,z,width+.56,.18,.22,steel,true,"test-door-frame");
      if(kind==="window")box(x,.45,z,width+.35,.9,.25,concrete,true,"window-sill");
    }else{
      for(const sign of [-1,1])
        box(x,1.45,z+sign*(half+.11),.22,2.9,.20,steel,true,"test-door-frame");
      box(x,3.00,z,.22,.18,width+.56,steel,true,"test-door-frame");
      if(kind==="window")box(x,.45,z,.25,.9,width+.35,concrete,true,"window-sill");
    }
    openings.push({id,kind,axis,x,z,width,height,bottom});
    return openings[openings.length-1];
  }
  // Two entries nearest site A/B are used by automated defender prep.
  portal("west-hall","door","z",-4.55,-37.0);
  portal("east-hall","door","z",4.55,-37.0);
  // Separate barricade stations for shooting/plank tests.
  portal("entry-north","door","z",-4.55,-57.0);
  portal("entry-south","door","z",4.55,-57.0);
  portal("west-entry","door","x",-13,-41,2.5);
  portal("east-entry","door","x",13,-25,2.5);
  portal("server-door","door","x",-13,-51,2.5);
  portal("control-door","door","x",13,-36,2.5);
  portal("west-window","window","x",-16,-45,2.36);
  portal("east-window","window","x",16,-45,2.36);
  // Freestanding cover test rigs. Exact visible size = physical collider.
  const coverPoints=[];
  function cover(x,z,w,h,d){
    box(x,h/2,z,w,h,d,concrete,true,"test-cover");
    for(const [px,pz] of [[x-w/2-1.10,z],[x+w/2+1.10,z],
      [x,z-d/2-1.10],[x,z+d/2+1.10]])
      coverPoints.push({x:px,z:pz});
  }
  for(const [x,z,w,h,d] of [
    [-7.1,-49.5,1.25,1.05,1.00],[-3.7,-42.7,1.3,.88,1.0],
    [7.7,-24.6,1.4,.98,.95],[3.15,-33.5,1.35,1.05,.85],
    [-8,-14,1.5,1.05,1.2],[-3,-13,1.3,1.4,1.2],
    [3,-13,1.3,1.05,1.2],[8,-14,1.5,1.75,1.2]
  ])cover(x,z,w,h,d);
  // Short strips separate stations, but NO map perimeter is constructed.
  for(const x of [-16,16])box(x,.04,-36,.12,.065,52,yellow);
  const fixtures=[];
  function zoneAt(x,z){
    const a=sites.A.bounds,b=sites.B.bounds;
    if(x>=a.minX&&x<=a.maxX&&z>=a.minZ&&z<=a.maxZ)return "BOMB SITE A";
    if(x>=b.minX&&x<=b.maxX&&z>=b.minZ&&z<=b.maxZ)return "BOMB SITE B";
    if(z<-54)return "BARRICADE TRAINING";
    if(z>-18&&z<4)return "COVER + AI TEST";
    if(x<-10||x>10)return "BREACH + VAULT TEST";
    return "OPEN MECHANICS RANGE";
  }
  // During 45-second setup keep defenders in the central test area.
  // Sandbox has no actual building, so action-phase runout pings are disabled.
  return {mode:"mechanics-sandbox",shell,sites,zoneAt,fixtures,
    coverPoints,openings,bounds:{minX:-9.5,maxX:9.5,minZ:-53,maxZ:-19}};
}
