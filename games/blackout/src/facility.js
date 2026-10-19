// BLACKOUT V0.7 — compact enterable tactical facility and two bomb rooms.
// Geometry, bullet blockers and player collision are generated from the same AABBs.
export function buildFacility(T,scene,world){
  const {root,colliders,shootables}=world;
  const shell=new T.Group();root.add(shell);
  const wallMat=texture(0x65727b,0x394751,"wall");
  const concrete=texture(0x8a9190,0x3c4645,"concrete");
  const flooring=texture(0x303f46,0x23343a,"floor");
  const metal=new T.MeshStandardMaterial({color:0x333f4a,metalness:.78,roughness:.39,side:T.DoubleSide});
  const frame=new T.MeshStandardMaterial({color:0x1c2b36,metalness:.61,roughness:.44});
  const painted=new T.MeshStandardMaterial({color:0x9d7e5e,metalness:.13,roughness:.76});
  const yellow=new T.MeshBasicMaterial({color:0xf2b951});
  const cyan=new T.MeshBasicMaterial({color:0x6ae9e2});
  function texture(top,dark,kind){
    const cv=document.createElement("canvas");cv.width=cv.height=256;
    const c=cv.getContext("2d");
    c.fillStyle="#"+top.toString(16).padStart(6,"0");c.fillRect(0,0,256,256);
    c.globalAlpha=.21;c.fillStyle="#"+dark.toString(16).padStart(6,"0");
    for(let y=0;y<256;y+=kind==="wall"?56:36){
      c.fillRect(0,y,256,3);
      for(let x=0;x<256;x+=kind==="wall"?74:54)c.fillRect(x+(y%112?20:0),y,2,kind==="wall"?56:36);
    }
    c.globalAlpha=.16;
    for(let i=0;i<650;i++){const x=(i*73)%256,y=(i*137)%256;
      c.fillStyle=i%3?"#d6d9c7":"#142029";c.fillRect(x,y,i%5===0?3:1,i%4===0?2:1);}
    c.globalAlpha=1;
    const tex=new T.CanvasTexture(cv);tex.wrapS=tex.wrapT=T.RepeatWrapping;
    tex.repeat.set(kind==="floor"?5:2,kind==="wall"?1.4:4);
    tex.colorSpace=T.SRGBColorSpace;
    return new T.MeshStandardMaterial({map:tex,roughness:.9,metalness:0,side:T.DoubleSide});
  }
  function box(x,y,z,w,h,d,material,solid=false,tag="facility"){
    const m=new T.Mesh(new T.BoxGeometry(w,h,d),material);
    m.position.set(x,y,z);shell.add(m);
    if(solid){
      colliders.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,
        minY:y-h/2,maxY:y+h/2,tag});
      m.userData.kind="solid";shootables.push(m);
    }
    return m;
  }
  // Matte tile slab overlays the old test-range grid at a slightly higher Y.
  box(0,.040,-36,19.4,.078,34.2,flooring);
  // Ground footprint, floor guidance, two stacked roof beams and exposed fixtures.
  for(const x of [-9.7,9.7])box(x,.05,-36,.14,.09,34.2,yellow);
  for(const z of [-53,-19])box(0,.045,z,19.4,.065,.12,yellow);
  const H=3.55;
  function wall(x,z,w,d,mat=wallMat){return box(x,H/2,z,w,H,d,mat,true,"wall");}
  // Real door and window openings; corresponding barricade meshes will reuse
  // these exact aperture coordinates to avoid colliding with unseen wall faces.
  const openings=[];
  // Entrance & exit are real openings with lintels. Never collide across them.
  for(const z of [-53,-19]){
    wall(-5.75,z,7.9,.36);wall(5.75,z,7.9,.36);
    box(0,3.22,z,3.75,.68,.37,metal,true,"lintel");
    box(-1.82,1.65,z,.09,3.2,.46,frame,true,"door-frame");
    box(1.82,1.65,z,.09,3.2,.46,frame,true,"door-frame");
    openings.push({id:z===-53?"entry-north":"entry-south",kind:"door",
      axis:"z",x:0,z,width:3.48,height:3.02,bottom:0});
  }
  // Exterior flanks: split the complete wall material around genuine
  // window apertures rather than drawing glass over an invisible full wall.
  for(const x of [-9.5,9.5]){
    const doorway=x<0?-40:-27;
    const minZ=-53,maxZ=-19,winZ=x<0?-45:-44,halfW=1.17;
    const segments=[[minZ,winZ-halfW],[winZ+halfW,doorway-1.5],
      [doorway+1.5,maxZ]];
    for(const [a,b] of segments)if(b-a>.15)wall(x,(a+b)/2,.38,b-a);
    // Collision covers sill (0-0.95m) and header (2.68-3.55m),
    // NOT the open window span. This enables real bullet passage and vaults.
    box(x,.475,winZ,.38,.95,halfW*2,concrete,true,"window-sill");
    box(x,(2.68+H)/2,winZ,.38,H-2.68,halfW*2,wallMat,true,"window-header");
    for(const side of [-1,1]){
      box(x,1.815,winZ+side*halfW,.42,1.73,.10,frame,true,"window-frame");
    }
    openings.push({id:x<0?"west-window":"east-window",kind:"window",
      axis:"x",x,z:winZ,width:halfW*2-.10,height:1.67,bottom:.97});
    box(x,3.24,doorway,.43,.62,3.1,frame,true,"lintel");
    for(const side of [-1,1])
      box(x,1.5,doorway+side*1.53,.43,3,.09,frame,true,"door-frame");
    openings.push({id:x<0?"west-entry":"east-entry",kind:"door",
      axis:"x",x,z:doorway,width:2.85,height:3.0,bottom:0});
  }
  // Cross-corridor: two 2.8m clear doorways for rotations and flanks.
  wall(-7.9,-37,3.2,.34);
  // Center span intentionally leaves a flush soft-wall opening, supplied by world.makePanel.
  wall(-2.3,-37,1.4,.34);
  wall(2.3,-37,1.4,.34);
  wall(7.9,-37,3.2,.34);
  for(const x of [-4.55,4.55]){
    box(x-1.47,1.5,-37,.10,3,.45,frame,true,"door-frame");
    box(x+1.47,1.5,-37,.10,3,.45,frame,true,"door-frame");
    box(x,3.25,-37,2.95,.60,.45,metal,true,"lintel");
    openings.push({id:x<0?"west-hall":"east-hall",kind:"door",
      axis:"z",x,z:-37,width:2.80,height:2.96,bottom:0});
  }
  // Middle dividing walls with openings at -45 and -29. Split corridors
  // into site rooms without ever sealing either bomb room off.
  for(const [z1,z2] of [[-50.5,-47],[-43,-37],[-37,-31],[-27,-21]])
    wall(0,(z1+z2)/2,.30,z2-z1);
  for(const z of [-45,-29]){
    box(0,3.24,z,.38,.60,4,metal,true,"lintel");
    for(const dz of [-2,2])box(0,1.47,z+dz,.42,2.95,.09,frame,true,"door-frame");
    openings.push({id:z===-45?"server-door":"control-door",kind:"door",
      axis:"x",x:0,z,width:3.73,height:2.95,bottom:0});
  }
  // Low reinforced foundation strips and door thresholds; all collision
  // boxes are generated with exact coordinates from the visible meshes.
  for(const x of [-9.5,9.5])box(x,.18,-36,.47,.34,33.5,metal);
  const ceiling=new T.Group();shell.add(ceiling);
  // Real roof with a small realistic fixture grid, not a giant floating plane.
  const roof=box(0,3.67,-36,19.2,.18,34.1,frame,true,"roof");
  roof.castShadow=false;roof.receiveShadow=true;
  // Use glowing rectangular ceiling luminaires plus actual point lights.
  const fixtures=[];
  const coverPoints=[];
  for(const z of [-48,-42,-33,-25]){
    for(const x of [-5.7,5.7]){
      const fixture=box(x,3.52,z,2.3,.09,.48,cyan);
      const lamp=new T.PointLight(0xd7f5ec,2.0,14,2);
      lamp.position.set(x,3.05,z);scene.add(lamp);fixtures.push(lamp);
    }
  }
  // Waist-height cover with actual collision, tactical routes around the
  // desks, lockers, crates, and server racks.
  const cover=(x,z,w,h,d,type="cover")=>{
    for(const [px,pz] of [[x-w/2-1.15,z],[x+w/2+1.15,z],[x,z-d/2-1.15],[x,z+d/2+1.15]])
      coverPoints.push({x:px,z:pz});
    box(x,h/2,z,w,h,d,type==="locker"?metal:type==="desk"?painted:concrete,true,type);
    if(type==="desk"){
      box(x,h-.035,z,w+.11,.07,d+.15,frame);
      for(const ax of [-1,1])box(x+ax*(w/2-.08),.34,z,.09,.65,.09,metal);
    }
  };
  cover(-7.6,-49,1.45,.98,.95,"crate");
  cover(-3.3,-41.0,2.1,1.03,1.05,"desk");
  cover(-7.4,-27,1.0,1.86,1.15,"locker");
  cover(-3.4,-23.5,1.6,1.05,1.25,"crate");
  cover(7.65,-48,1.1,2.05,1.05,"locker");
  cover(4.1,-49.8,1.9,.95,.85,"desk");
  cover(7.6,-23.1,1.4,.98,.9,"crate");
  cover(3.25,-33.8,1.55,.98,.8,"desk");
  // A few tiny wall details help avoid empty polygon-box rooms.
  for(const [x,z] of [[-8.7,-44],[-8.7,-31],[8.7,-44],[8.7,-31]]){
    box(x,1.4,z,.085,1.05,.75,metal);
    box(x,1.4,z,.094,.38,.55,frame);
  }
  function sign(text,x,z,rotation=0){
    const cv=document.createElement("canvas");cv.width=512;cv.height=128;
    const ctx=cv.getContext("2d");
    ctx.fillStyle="#0b1b27";ctx.fillRect(0,0,512,128);
    ctx.fillStyle="#6be3d4";ctx.fillRect(0,0,512,9);
    ctx.font="900 52px Arial";ctx.textAlign="center";ctx.fillStyle="#e9fcfa";
    ctx.fillText(text,256,84,492);
    const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;
    const s=new T.Mesh(new T.PlaneGeometry(2.40,.58),
      new T.MeshBasicMaterial({map:tex,transparent:true,side:T.DoubleSide}));
    s.position.set(x,2.85,z);s.rotation.y=rotation;shell.add(s);
  }
  sign("A  /  SERVER ROOM",-5.15,-52.73,0);
  sign("B  /  CONTROL ROOM",5.12,-19.28,0);
  sign("BLACKOUT | TRAINING",0,-18.73,0);
  // 2 clearly separated legitimate objectives. The active ring is controlled
  // by ObjectiveDrill; the other area stays available as physical level space.
  // Two distinct *rooms*, not a 2.95m circle around each bomb cart.
  // These are legal planting zones and objective defense areas, not bomb
  // model footprints. Plant on any walkable floor tile inside a room.
  const sites={
    A:{id:"A",name:"SERVER ROOM",x:-5,z:-44,radius:2.95,
      bounds:{minX:-9.12,maxX:-.58,minZ:-52.58,maxZ:-37.38}},
    B:{id:"B",name:"CONTROL ROOM",x:5,z:-29,radius:2.95,
      bounds:{minX:.58,maxX:9.12,minZ:-36.62,maxZ:-19.42}}
  };
  function zoneAt(x,z){
    if(x>-9.5&&x<9.5&&z>-53&&z<-19){
      if(z<-37)return x<0?"SERVER ROOM":"STORAGE / MAINTENANCE";
      return x<0?"ADMIN CORRIDOR":"CONTROL ROOM";
    }
    return "FACILITY EXTERIOR";
  }
  return {shell,sites,zoneAt,fixtures,coverPoints,openings,
    bounds:{minX:-9.5,maxX:9.5,minZ:-53,maxZ:-19}};
}
