// BLACKOUT V5.0 / SWITCHYARD — original stacked industrial tactical arena.
import {createTacticalPanel} from "./tactical-panels.js?v=blackout-v530-interactive-walls";
// Geometry, floor collision, visibility, 3 floor levels and site pairs share
// a single authoritative definition. This is NOT a copied Siege map.
// The first release is an offline playable map, not network matchmaking.
export const SWITCHYARD_SITE_PAIRS=Object.freeze([
  {id:"operations",label:"GROUND / SWITCHROOM",floor:0,
    A:{name:"SWITCHROOM",x:-7.5,z:-41,y:0,bounds:{minX:-12.3,maxX:-2,minZ:-47.8,maxZ:-35.4}},
    B:{name:"DISPATCH",x:7,z:-28,y:0,bounds:{minX:2,maxX:12.3,minZ:-34,maxZ:-22}}},
  {id:"control",label:"UPPER / CONTROL DECK",floor:4,
    A:{name:"CONTROL CENTER",x:-7,z:-41,y:4,bounds:{minX:-12.3,maxX:-2,minZ:-47.8,maxZ:-35.4}},
    B:{name:"SERVER OPERATIONS",x:7,z:-28,y:4,bounds:{minX:2,maxX:12.3,minZ:-34,maxZ:-22}}},
  {id:"rooftop",label:"ROOF / RELAY DECK",floor:8,
    A:{name:"RELAY ARRAY",x:-7,z:-41,y:8,bounds:{minX:-12.3,maxX:-2,minZ:-47.8,maxZ:-35.4}},
    B:{name:"RADIO CONTROL",x:7,z:-28,y:8,bounds:{minX:2,maxX:12.3,minZ:-34,maxZ:-22}}}
]);
const inRange=(v,a,b)=>v>=a&&v<=b;
const between=(x,z,a,b,c,d)=>inRange(x,a,b)&&inRange(z,c,d);
export function switchyardFloorAt(x,z,footY=0){
  // Vertical floor selection depends on the operator's CURRENT height.
  // No upper-floor auto-teleport just because (x,z) overlaps downstairs.
  const candidates=[0];
  if(between(x,z,-14.2,14.2,-51.2,-19.8)){
    candidates.push(4,8);
  }
  // The connected exterior staircase traverses real height values.
  if(between(x,z,15.3,18.9,-50.3,-35.7))
    candidates.push(Math.max(0,Math.min(4,4*(z+50)/14)));
  if(between(x,z,15.3,18.9,-35.4,-20.6))
    candidates.push(Math.max(4,Math.min(8,4+4*(z+35)/14)));
  if(between(x,z,13.6,18.9,-36.1,-34.6))candidates.push(4);
  if(between(x,z,13.3,18.9,-24.4,-19.5))candidates.push(8);
  // Low edge stair: allow at most 23cm step changes per frame.
  return Math.max(...candidates.filter(v=>v<=footY+.235+.012),0);
}
export function createSwitchyard(T,scene,state={collisionRevision:0}){
  const root=new T.Group();root.visible=false;scene.add(root);
  const colliders=[],shootables=[],coverPoints=[],props=[],panels=[],openings=[];
  const panelWorld={
    colliders,shootables,
    get collisionRevision(){return state.collisionRevision},
    set collisionRevision(v){state.collisionRevision=v}
  };
  function softWall(id,axis,x,z,level,kind="drywall"){
    const panel=createTacticalPanel(T,root,panelWorld,{
      id,axis,x,z,y:level,width:3.10,height:2.91,materialType:kind
    });
    panels.push(panel);return panel;
  }
  function doorway(id,axis,x,z,level,width=2.6,kind="door"){
    const half=width/2,height=3.7,head=kind==="window"?1.15:.5;
    if(axis==="z"){
      for(const side of [-1,1])
        box(x+side*(half+.12),level+height/2,z,.22,height,.32,steel,{solid:true,tag:"door-frame"});
      box(x,level+height-head/2,z,width+.65,head,.32,steel,{solid:true,tag:"door-frame"});
      if(kind==="window")
        box(x,level+.49,z,width+.45,.98,.32,concrete,{solid:true,tag:"window-sill"});
    }else{
      for(const side of [-1,1])
        box(x,level+height/2,z+side*(half+.12),.32,height,.22,steel,{solid:true,tag:"door-frame"});
      box(x,level+height-head/2,z,.32,head,width+.65,steel,{solid:true,tag:"door-frame"});
      if(kind==="window")
        box(x,level+.49,z,.32,.98,width+.45,concrete,{solid:true,tag:"window-sill"});
    }
    openings.push({id,axis,kind,x,z,y:level,width,height:kind==="window"?1.45:3.2,
      bottom:kind==="window"?.98:0});
  }
  const materials={};
  function texture(base,kind){
    const canvas=document.createElement("canvas");canvas.width=256;canvas.height=256;
    const c=canvas.getContext("2d");
    c.fillStyle=base;c.fillRect(0,0,256,256);
    const count=kind==="floor"?750:kind==="concrete"?1100:380;
    for(let i=0;i<count;i++){
      const x=(i*73+i*i*13)%256,y=(i*47+i*i*19)%256;
      c.fillStyle=i%4===0?"#ffffff09":"#070d1414";
      c.fillRect(x,y,(i%6)+1,(i%4)+1);
    }
    if(kind==="floor"){
      c.strokeStyle="#151f273d";c.lineWidth=1;
      for(let x=0;x<256;x+=32){c.beginPath();c.moveTo(x,0);c.lineTo(x,256);c.stroke();}
    }
    if(kind==="metal"){
      c.strokeStyle="#bbc9d01b";c.lineWidth=2;
      for(let y=0;y<256;y+=24){c.beginPath();c.moveTo(0,y);c.lineTo(256,y);c.stroke();}
    }
    const t=new T.CanvasTexture(canvas);t.colorSpace=T.SRGBColorSpace;
    t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(3,3);t.anisotropy=4;
    return t;
  }
  const concrete=new T.MeshStandardMaterial({map:texture("#687783","concrete"),roughness:.92});
  const floor=new T.MeshStandardMaterial({map:texture("#555f69","floor"),roughness:.88});
  const steel=new T.MeshStandardMaterial({map:texture("#2b3b47","metal"),metalness:.6,roughness:.48});
  const black=new T.MeshStandardMaterial({color:0x1a2831,metalness:.57,roughness:.55});
  const glass=new T.MeshPhysicalMaterial({color:0x6ba5b4,transparent:true,opacity:.42,metalness:.23,roughness:.16});
  const pale=new T.MeshStandardMaterial({color:0xb6c2c6,metalness:.05,roughness:.72});
  const safety=new T.MeshStandardMaterial({color:0xedb359,roughness:.7});
  const red=new T.MeshStandardMaterial({color:0xbc5545,metalness:.2});
  const signal=new T.MeshBasicMaterial({color:0x72ecd6});
  Object.assign(materials,{concrete,floor,steel,black,glass,pale,safety,red,signal});
  function box(x,y,z,w,h,d,mat,{solid=false,tag="map",shoot=true}={}){
    const node=new T.Mesh(new T.BoxGeometry(w,h,d),mat);
    node.position.set(x,y,z);node.receiveShadow=true;node.castShadow=h>1.5;
    root.add(node);props.push(node);
    if(shoot){node.userData.kind="solid";shootables.push(node)}
    if(solid){
      colliders.push({minX:x-w/2,maxX:x+w/2,
        minY:y-h/2,maxY:y+h/2,minZ:z-d/2,maxZ:z+d/2,tag});
    }
    return node;
  }
  function label(txt,x,y,z,size=3){
    const c=document.createElement("canvas");c.width=512;c.height=128;
    const g=c.getContext("2d");
    g.fillStyle="#10212b";g.fillRect(0,0,512,128);
    g.fillStyle="#e6b05c";g.fillRect(0,0,512,10);
    g.fillStyle="#e8f4f6";g.font="900 38px Arial";g.textAlign="center";g.fillText(txt,256,84,496);
    const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;
    const mesh=new T.Mesh(new T.PlaneGeometry(size,size/4),
      new T.MeshBasicMaterial({map:tex,transparent:true,side:T.DoubleSide}));
    mesh.position.set(x,y,z);mesh.rotation.x=-Math.PI/2;root.add(mesh);
  }
  // Outdoor compound perimeter is a physical level, not a painted rectangle.
  box(0,-.17,-10,70,.3,103,concrete,{shoot:true});
  for(const x of [-31,31]){
    box(x,1.25,-30,.45,2.5,63,steel,{solid:true});
    for(let z=-57;z<-6;z+=9)box(x,2.65,z,.25,.34,1.35,safety);
  }
  // Opaque spawn blocker across the north yard so no direct prep sightline
  // exists from the bomb building to initial attacker pads.
  box(-10,2,-4,26,4,.65,steel,{solid:true});
  box(13,2,-4,16,4,.65,steel,{solid:true});
  for(const x of [-25,-22,22,25])
    box(x,.75,-11,2.1,1.5,2.6,concrete,{solid:true});
  label("SWITCHYARD / TACTICAL OPERATIONS",0,.02,11,8);
  // Horizontal levels: main, upper, accessible roof. All raycast as actual
  // steel-backed geometry. Player floorAt picks based on foot height.
  for(const [height,surface] of [[0,floor],[4,floor],[8,concrete]]){
    if(height>0)box(0,height-.16,-35.5,28.4,.30,31.4,steel,{shoot:true});
    box(0,height+.025,-35.5,28,.055,31,surface,{shoot:true});
    for(const z of [-50.2,-20.8])
      box(0,height+.065,z,28,.12,.17,steel,{shoot:true});
    // Safety strips on the approach to an interior staircase doorway.
    box(12.9,height+.04,height===8?-21:-35,1,.05,2.3,safety,{shoot:true});
  }
  // Outer shell per floor: framed openings allow movement and sightlines,
  // while the remainder is real opaque cover (both physics and bullets).
  // Front main doors x=-1..1 at z=-20; stair entrance on east facade.
  for(const level of [0,4]){
    const y=level+1.87;
    box(0,y,-51,.5,3.74,.48,steel,{solid:true});
    // Northern entry walls: four extra, fully interactive soft-breach bays.
    // Defenders can close them with steel, attackers can charge an unreinforced
    // bay to make an actual opening into the floor's bomb-room approach.
    for(const x of [-7.2,7.2]){
      for(const dx of [-4.2,4.2])
        box(x+dx,y,-51,5.3,3.74,.48,concrete,{solid:true});
      softWall("north-"+(x<0?"west":"east")+"-"+level,
        "z",x,-51,level,"drywall");
    }
    for(const [x,w] of [[-8,11.7],[8,11.7]]){
      box(x,y,-20,w,3.74,.45,concrete,{solid:true});
    }
    box(0,level+3.18,-20,4.2,1.12,.48,steel,{solid:true});
    // Window is a physically empty, framed cutout, not a fake 12m glass wall.
    for(const [z,d] of [[-46.5,9],[-39.65,4.7],[-32.3,4.6],[-25.5,11]])
      box(-14,y,z,.45,3.74,d,concrete,{solid:true});
    doorway("switch-west-window-"+level,"x",-14,-36,level,2.55,"window");
    // East wall opened at the two landings; interior doors not fake portals.
    for(const [z,d] of [[-46.5,9],[-28,12]])
      box(14,y,z,.45,3.74,d,concrete,{solid:true});
    box(14,level+3.31,-36,.5,.86,3.3,steel,{solid:true});
    box(14,level+3.31,-21,.5,.86,3.3,steel,{solid:true});
    // Upper-floor safety rail and industrial service duct
    box(-1,level+3.60,-35.5,18,.19,.25,steel,{shoot:true});
  }
  // Roof half-height opaque cover; full 3D model but no fake kill planes.
  for(const z of [-51,-20]){
    box(-7,.65+8,z,13.8,1.30,.48,steel,{solid:true});
    box(7,.65+8,z,13.8,1.30,.48,steel,{solid:true});
  }
  box(-14,8.65,-35.5,.5,1.3,31,steel,{solid:true});
  // East roof guardrail has a real stairwell gate at z≈-21;
  // a full-length wall here would trap everybody on the stairs.
  box(14,8.65,-37.65,.5,1.3,26.5,steel,{solid:true});
  // Original open central spine provides a loop for both A and B sites.
  for(const level of [0,4]){
    // Separating wall, segmented by wide corridor opening z[-37,-33].
    // Center wall modules now use working reinforcement / soft breach.
    for(const [z,d] of [[-49.15,3.5],[-42.4,3.8],[-32.5,3.2],[-24,6.8]])
      box(0,level+1.85,z,.35,3.7,d,concrete,{solid:true});
    softWall("center-A-"+level,"x",0,-45.85,level,"drywall");
    softWall("center-B-"+level,"x",0,-29.0,level,"plywood");
    doorway("switch-cross-"+level,"x",0,-37.3,level,2.6,"door");
    // Room walls mix solid supporting sections with real soft panel inserts.
    for(const z of [-38,-30]){
      for(const x of [-10,10]){
        const destructible=(z===-38&&x<0)||(z===-30&&x>0);
        if(destructible){
          box(x-2.36,level+1.85,z,1.4,3.7,.32,concrete,{solid:true});
          box(x+2.36,level+1.85,z,1.4,3.7,.32,concrete,{solid:true});
          softWall("partition-"+(z===-38?"A":"B")+"-"+level,"z",x,z,level);
        }else{
          for(const offset of [-2.2,2.2])
            box(x+offset,level+1.85,z,1.5,3.7,.32,pale,{solid:true});
          doorway("switch-room-"+(x<0?"W":"E")+"-"+z+"-"+level,
            "z",x,z,level,2.6,"door");
        }
      }
    }
    doorway("switch-south-"+level,"z",0,-20,level,2.6,"door");
    for(const [x,z] of [[-7,-45],[7,-29],[-7,-26],[7,-46]]){
      // Vertical electrical cabinets are real cover with matching AABB.
      box(x,level+1.0,z,1.3,2,1.0,steel,{solid:true});
      box(x,level+1.86,z+.52,.95,.12,.12,signal,{shoot:false});
      for(const shift of [-.3,0,.3])
        box(x+shift,level+.95,z+.53,.10,.3,.04,safety,{shoot:false});
      for(const [px,pz] of [[x-1.2,z],[x+1.2,z],[x,z+1.2]])
        coverPoints.push({x:px,z:pz,y:level});
    }
    for(const [x,z] of [[-10,-32],[10,-40]]){
      box(x,level+.52,z,2.2,1.04,1.3,concrete,{solid:true});
      for(const dx of [-2,2])coverPoints.push({x:x+dx,z,y:level});
    }
    // Exposed trays and suspended conduit make ceiling material believable.
    for(const x of [-11,-4,4,11])
      box(x,level+3.48,-35.5,.13,.13,26,black,{shoot:true});
    // Site markers stay at the legal floor height for player readability.
    label("A / EQUIPMENT", -7,level+.07,-48,3.2);
    label("B / CONTROL",7,level+.07,-23,3.2);
  }
  // Two *continuous walkable* ramped staircases, rising 4m each over 14m.
  // Small step lip <= 20cm; floorAt follows the same height profile.
  for(let tier=0;tier<2;tier++){
    const z0=tier===0?-50:-35,base=tier*4;
    for(let step=0;step<20;step++){
      const za=z0+step*.7;
      const y=base+(step+1)*.2;
      box(17.1,y-.08,za+.35,3.6,.16,.70,steel,{shoot:true});
      box(15.37,base+2.0,za+.35,.14,4,.70,black,{shoot:false});
      box(18.83,base+2.0,za+.35,.14,4,.70,black,{shoot:false});
      if(step%4===0)box(17.1,y+.016,za+.39,3.1,.025,.10,safety,{shoot:false});
    }
    for(const side of [-1,1])
      box(17.1+side*1.86,base+2.1,z0+7,.15,4.1,14.2,steel,{shoot:false});
  }
  // Transition landings attach physically to the appropriate floors.
  for(const [y,z] of [[0,-50],[4,-35.5],[8,-21]]) {
    // Roof access is a wide connected landing, not a 2m strip that lets
    // a character drop 8m the moment it turns toward the bomb site.
    const length=y===8?5.0:y===4?4.0:2.2;
    const centerZ=y===8?-21.9:z;
    box(15.4,y-.12,centerZ,4,.22,length,steel,{shoot:true});
    box(15.4,y+.04,centerZ,4,.07,length,floor,{shoot:true});
  }
  // Roof apparatus with distinctive silhouette.
  // Keep mechanical rooftop units OUTSIDE both legal bomb-site floors.
  for(const [x,z] of [[-12,-49],[12,-44],[0,-24]]){
    box(x,8.55,z,2.0,1.1,1.6,black,{solid:true});
    box(x,9.8,z,.15,1.45,.15,steel,{shoot:true});
    box(x,10.54,z,.80,.15,.15,safety,{shoot:true});
    box(x,11.05,z,.12,.95,.12,steel,{shoot:true});
    coverPoints.push({x:x-2.2,z,y:8},{x:x+2.2,z,y:8});
  }
  // Level accents outside player route: industrial lamps/light spill.
  for(const y of [3.5,7.5]){
    for(const z of [-46,-36,-26]){
      const light=new T.PointLight(0xb1dbea,.7,13,1.8);
      light.position.set(0,y,z);root.add(light);
      box(0,y+.05,z,1.55,.12,.4,pale,{shoot:false});
    }
  }
  const sitePairs=SWITCHYARD_SITE_PAIRS;
  const facilities={mode:"switchyard",bounds:{minX:-14,maxX:14,minZ:-51,maxZ:-20},
    sitePairs,coverPoints,openings,shell:root,
    zoneAt(x,z,y=0){
      const level=y>=6?"ROOF":y>=2?"UPPER":"GROUND";
      if(between(x,z,-14,14,-51,-20))return "SWITCHYARD / "+level;
      if(between(x,z,15,19,-51,-20))return "EXTERIOR ACCESS STAIRS";
      return "SWITCHYARD / EXTERIOR";
    }};
  const dispose=()=>{scene.remove(root);root.traverse?.(n=>{
    n.geometry?.dispose?.();
    // materials intentionally shared by nodes, dispose only once below.
  });for(const mat of Object.values(materials)){mat.map?.dispose?.();mat.dispose?.();}};
  return {root,colliders,shootables,coverPoints,facilities,sitePairs,panels,openings,
    setActiveCollections(activeColliders,activeShootables){
      panelWorld.colliders=activeColliders;
      panelWorld.shootables=activeShootables;
    },
    floorAt:switchyardFloorAt,dispose};
}
