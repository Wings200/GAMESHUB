// BLACKOUT author-approved 178-piece Consolate + Clubhouse gameplay map.
// Render/physics use the exported player blueprint, not hand-invented walls.
// Neither the editor nor this client module implements online multiplayer.
import {createTacticalPanel} from "./tactical-panels.js?v=blackout-v531-interactive-walls";
const near=(x,z,p)=>Math.hypot(x-p.x,z-p.z);
export function pieceFootprint(part){
  const r=(part.rotationY||0)*Math.PI/180,c=Math.abs(Math.cos(r)),s=Math.abs(Math.sin(r));
  return {x:part.size.x*c+part.size.z*s,z:part.size.x*s+part.size.z*c};
}
export function sampleClubhouseFloor(map,x,z,footY=0){
  // A slab's Y is its WALKABLE UPPER surface. An upper slab cannot pull
  // an operator up four metres until stairs/rappel have reached its level.
  let best=0;
  for(const part of map.elements){
    if(part.type!=="floor")continue;
    const fp=pieceFootprint(part),p=part.position;
    if(x<p.x-fp.x/2||x>p.x+fp.x/2||z<p.z-fp.z/2||z>p.z+fp.z/2)continue;
    if(p.y<=footY+.36&&p.y>best)best=p.y;
  }
  // Stair treads are physical, continuous step samples. Stair travel runs
  // from local -Z (low) toward local +Z (high) on either flight.
  for(const part of map.elements){
    if(part.type!=="stairs")continue;
    const a=part.rotationY*Math.PI/180;
    const dx=x-part.position.x,dz=z-part.position.z;
    const lx=Math.cos(a)*dx-Math.sin(a)*dz;
    const lz=Math.sin(a)*dx+Math.cos(a)*dz;
    if(Math.abs(lx)>part.size.x/2+.05||
       Math.abs(lz)>part.size.z/2+.05)continue;
    const fraction=Math.max(0,Math.min(1,(lz+part.size.z/2)/part.size.z));
    const floor=part.position.y+fraction*part.size.y;
    if(floor<=footY+.36&&floor>best)best=floor;
  }
  return best;
}
export function clubhouseSpawnPoints(map,kind){
  return map.elements.filter(e=>e.type===kind)
    .map(e=>({...e.position,y:e.position.y||0,yaw:(e.rotationY||0)*Math.PI/180}));
}
export function clubhouseSitePair(pair){
  return {id:pair.id,name:pair.name,
    A:site("A",pair.A),B:site("B",pair.B)};
}
function site(key,s){
  const zones=s.plantZones||[];
  const bounds=zones.length?{
    minX:Math.min(...zones.map(z=>z.x-z.width/2)),
    maxX:Math.max(...zones.map(z=>z.x+z.width/2)),
    minZ:Math.min(...zones.map(z=>z.z-z.depth/2)),
    maxZ:Math.max(...zones.map(z=>z.z+z.depth/2))
  }:{minX:s.x-2,maxX:s.x+2,minZ:s.z-2,maxZ:s.z+2};
  return {id:key,name:key==="A"?"BOMB A":"BOMB B",x:s.x,y:s.y,z:s.z,
    radius:2.95,bounds,plantZones:zones,defuseRange:s.defuseRange??2.25};
}
export function clubhouseStairEndpoints(part){
  const a=part.rotationY*Math.PI/180,dx=Math.sin(a)*part.size.z/2,
    dz=Math.cos(a)*part.size.z/2,p=part.position;
  return {bottom:{x:p.x-dx,z:p.z-dz,y:p.y},
    top:{x:p.x+dx,z:p.z+dz,y:p.y+part.size.y}};
}
export function createClubhouse(T,scene,map,state={collisionRevision:0}){
  const root=new T.Group();root.name=map.name||"CUSTOM TACTICAL COMPLEX";
  scene.add(root);root.visible=false;
  const colliders=[],shootables=[],panels=[],openings=[],coverPoints=[],anchors=[];
  const ironvale=map.name?.includes("IRONVALE");
  const panelWorld={colliders,shootables,
    get collisionRevision(){return state.collisionRevision},
    set collisionRevision(v){state.collisionRevision=v}};
  const material=(color,metalness=.1,roughness=.75)=>
    new T.MeshStandardMaterial({color,roughness,metalness});
  const mats={
    hardWall:material(0x788a94,.14,.88),
    floor:material(0x596b75,.08,.95),
    floorHall:material(0x536b77,.09,.81),
    floorOffice:material(0x877b69,.03,.9),
    floorTech:material(0x465b69,.22,.66),
    techTrim:material(0x84cad5,.55,.3),
    deskTrim:material(0xb7ae9b,.10,.8),
    underside:material(0x394957,.18,.84),
    door:material(0x637885,.52,.57),
    window:material(0x688a9e,.48,.6),
    stairs:material(0x9daeb8,.23,.8),
    cover:material(0x8c7867,.06,.93),
    railing:material(0xc4a067,.45,.48),
    rope:material(0x85e2cc,.26,.54),
    reinforcedWall:material(0x607c8e,.8,.36),
    glass:new T.MeshPhysicalMaterial({color:0x9ad4ea,metalness:.12,roughness:.18,
      transparent:true,opacity:.24,depthWrite:false,side:T.DoubleSide})
  };
  function solidPartBox(parent,x,y,z,w,h,d,mat,collide=true,tag="map"){
    const node=new T.Mesh(new T.BoxGeometry(w,h,d),mat);
    node.position.set(x,y,z);parent.add(node);
    node.userData={kind:"solid",tag};
    shootables.push(node);
    if(collide){
      // World colliders are AABBs in metres and never include floor slabs.
      const m=parent.rotation.y,swapped=Math.abs(Math.sin(m))>.7;
      const aw=swapped?d:w,ad=swapped?w:d;
      const cx=parent.position.x+Math.cos(m)*x+Math.sin(m)*z;
      const cz=parent.position.z-Math.sin(m)*x+Math.cos(m)*z;
      colliders.push({minX:cx-aw/2,maxX:cx+aw/2,
        minZ:cz-ad/2,maxZ:cz+ad/2,
        minY:parent.position.y+y-h/2,maxY:parent.position.y+y+h/2,tag});
    }
    return node;
  }
  // The Mechanics Lab's 240m training floor is hidden when maps switch.
  // Give the approved map its own outdoor terrain for the five attacker
  // approaches and nine exterior rappel ropes (physics ground remains Y=0).
  const terrain=new T.Mesh(new T.PlaneGeometry(190,190),
    material(0x43545a,.015,.96));
  terrain.rotation.x=-Math.PI/2;
  terrain.position.set(
    (Math.min(...map.elements.filter(e=>e.type==="floor").map(e=>e.position.x))+
     Math.max(...map.elements.filter(e=>e.type==="floor").map(e=>e.position.x)))/2,
    -.025,
    (Math.min(...map.elements.filter(e=>e.type==="floor").map(e=>e.position.z))+
     Math.max(...map.elements.filter(e=>e.type==="floor").map(e=>e.position.z)))/2
  );
  terrain.userData.kind="solid";
  root.add(terrain);shootables.push(terrain);
  const groups=new Map();
  for(const part of map.elements){
    const {type,position:p,size:s}=part;
    if(type==="softWall"||type==="reinforcedWall"){
      const angle=((part.rotationY%180)+180)%180;
      const wall=createTacticalPanel(T,root,panelWorld,{
        x:p.x,z:p.z,y:p.y,id:part.id,width:s.x,height:s.y,
        axis:angle>45&&angle<135?"x":"z",materialType:"drywall"
      });
      panels.push(wall);
      if(type==="reinforcedWall")wall.reinforce();
      continue;
    }
    const g=new T.Group();g.position.set(p.x,p.y,p.z);
    g.rotation.y=(part.rotationY||0)*Math.PI/180;root.add(g);groups.set(part.id,g);
    const half=s.x/2,halfDepth=s.z/2;
    if(type==="floor"){
      const tech=/Server|Network|Vault|Battery|Electrical|Plant Control|Tech|Operations Center|Encrypted|Generator/.test(part.name);
      const hall=/Hall|Corridor|Gallery|Passage|Atrium|Reception|Lobby|Stairs|Landing/.test(part.name);
      const surface=ironvale?(tech?mats.floorTech:hall?mats.floorHall:mats.floorOffice):mats.floor;
      const node=solidPartBox(g,0,-s.y/2,0,s.x,s.y,s.z,
        [surface,surface,surface,mats.underside,surface,surface],false);
      node.userData.kind="solid";
      // Three-dimensional direction stripe differentiates the public
      // connecting circulation spine from enclosed tactical rooms.
      if(ironvale&&hall){
        const stripe=new T.Mesh(new T.BoxGeometry(.11,.012,s.z*.82),
          mats.techTrim);
        stripe.position.set(s.x*.32,.008,0);g.add(stripe);
      }
    }else if(type==="hardWall"){
      solidPartBox(g,0,s.y/2,0,s.x,s.y,s.z,mats.hardWall);
    }else if(type==="cover"){
      const tech=ironvale&&/equipment|Network|Vault|Server|Operations|Battery/.test(part.name);
      const artMat=tech?mats.floorTech:mats.cover;
      solidPartBox(g,0,s.y/2,0,s.x,s.y,s.z,artMat);
      if(ironvale){
        // Original solid server rack/desk with a separate physical trim,
        // rather than rows of identical untextured crates.
        const top=new T.Mesh(new T.BoxGeometry(s.x+.06,.08,s.z+.06),
          tech?mats.techTrim:mats.deskTrim);
        top.position.y=s.y+.025;g.add(top);
        if(tech){
          for(let k=0;k<3;k++){
            const slot=new T.Mesh(new T.BoxGeometry(s.x*.66,.07,.012),
              mats.techTrim);
            slot.position.set(0,.25+k*.28,s.z/2+.013);g.add(slot);
          }
        }else{
          const apron=new T.Mesh(new T.BoxGeometry(s.x*.85,.08,.06),
            mats.deskTrim);
          apron.position.set(0,s.y*.65,s.z/2+.025);g.add(apron);
        }
      }
      coverPoints.push({x:p.x+1,z:p.z+1,y:p.y});
    }else if(type==="door"||type==="window"){
      const sill=type==="window"?.86:0,header=.26,post=.13,
        openH=Math.max(.6,s.y-sill-header);
      for(const side of [-1,1])
        solidPartBox(g,side*(half-post/2),s.y/2,0,post,s.y,s.z,mats[type],true,"door-frame");
      solidPartBox(g,0,s.y-header/2,0,s.x,header,s.z,mats[type],true,"door-frame");
      if(sill)solidPartBox(g,0,sill/2,0,s.x,sill,s.z,mats.hardWall,true,"window-sill");
      let glass=null;
      if(type==="window"){
        glass=solidPartBox(g,0,sill+openH/2,0,s.x-post*2,openH,.018,
          mats.glass,false,"glass");
        glass.userData.kind="glass"; // non-solid; visibly shatters on entry
      }
      const axis=Math.abs(Math.sin(g.rotation.y))>.7?"x":"z";
      openings.push({id:part.id,kind:type,axis,x:p.x,z:p.z,y:p.y,
        width:s.x,height:openH,bottom:sill,glass});
    }else if(type==="stairs"){
      const steps=Math.max(12,Math.ceil(s.y/.18));
      for(let k=0;k<steps;k++){
        const rise=s.y*(k+1)/steps,tread=s.z/steps;
        solidPartBox(g,0,rise/2,-halfDepth+(k+.5)*tread,
          s.x,rise,tread,mats.stairs,false,"stairs");
      }
    }else if(type==="railing"){
      solidPartBox(g,0,s.y-.07,0,s.x,.14,s.z,mats.railing);
      for(const side of [-1,1])
        solidPartBox(g,side*(half-.06),s.y/2,0,.13,s.y,s.z,mats.railing);
    }else if(type==="rappelAnchor"){
      // The anchor is not a solid capsule around a human climber.
      // Render the actual cable from roof to ground so its range is clear.
      solidPartBox(g,0,.08,0,s.x,.16,s.z,mats.rope,false,"rappel-hook");
      const rope=new T.Mesh(new T.CylinderGeometry(.035,.035,s.y,8),mats.rope);
      rope.position.y=-s.y/2;g.add(rope);
      // Strong ground-level locator: rope runs from hook to a marked
      // attachment ring. No collision body is added around the cable.
      const locator=new T.Mesh(new T.RingGeometry(.44,.59,24),
        new T.MeshBasicMaterial({color:0x65f4e1,side:T.DoubleSide}));
      locator.rotation.x=-Math.PI/2;
      locator.position.y=-s.y+.045;
      g.add(locator);
      const base=new T.Mesh(new T.CylinderGeometry(.10,.10,.18,12),
        mats.rope);
      base.position.y=-s.y+.09;g.add(base);
      anchors.push({...p,id:part.id,length:s.y,rotationY:part.rotationY});
    }else if(type==="attackerSpawn"||type==="defenderSpawn"){
      const color=type==="attackerSpawn"?0x68c1fb:0xffb167;
      const tagMesh=new T.Mesh(new T.CylinderGeometry(.47,.47,.065,16),
        material(color,.05,.48));
      tagMesh.position.y=.045;g.add(tagMesh);
    }
  }
  const sitePairs=map.sitePairs.map(clubhouseSitePair);
  const defenders=clubhouseSpawnPoints(map,"defenderSpawn");
  const attackers=clubhouseSpawnPoints(map,"attackerSpawn");
  // Derive structural extent from actual author-designed floor geometry,
  // not the old Clubhouse hardcoded 48 × 22 metre rectangle.
  const slabs=map.elements.filter(e=>e.type==="floor");
  const building={
    minX:Math.min(...slabs.map(e=>e.position.x-pieceFootprint(e).x/2)),
    maxX:Math.max(...slabs.map(e=>e.position.x+pieceFootprint(e).x/2)),
    minZ:Math.min(...slabs.map(e=>e.position.z-pieceFootprint(e).z/2)),
    maxZ:Math.max(...slabs.map(e=>e.position.z+pieceFootprint(e).z/2))
  };
  const facilities={
    mode:"clubhouse",mapName:map.name,bounds:building,coverPoints,openings,sitePairs,
    anchors,attackSpawns:attackers,defendSpawns:defenders,
    stairConnectors:map.elements.filter(e=>e.type==="stairs").map(clubhouseStairEndpoints),
    shell:root,
    zoneAt(x,z,y=0){
      const inside=x>=building.minX&&x<=building.maxX&&
        z>=building.minZ&&z<=building.maxZ;
      const label=(map.name||"TACTICAL COMPLEX").split("·")[0].trim();
      return inside?label+" / "+(y>=3.6?"2F":"1F"):label+" / EXTERIOR";
    }
  };
  function dispose(){
    scene.remove(root);
    root.traverse?.(n=>n.geometry?.dispose?.());
    for(const m of Object.values(mats))m.dispose?.();
  }
  return {root,colliders,shootables,panels,openings,coverPoints,anchors,sitePairs,facilities,
    attackerSpawns:attackers,defenderSpawns:defenders,
    floorAt:(x,z,y)=>sampleClubhouseFloor(map,x,z,y),
    setActiveCollections(c,s){panelWorld.colliders=c;panelWorld.shootables=s;},
    dispose};
}
