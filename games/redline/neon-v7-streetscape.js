/*
 * REDLINE / NEON DISTRICT V7 — grounded urban detail.
 *
 * All storefront furniture is attached to building footprints already
 * cleared against the race road, shortcuts, model sites and canal by
 * game.js. Street decals are constrained to segments supplied by the
 * collision-cleared ambient street generator.
 *
 * Art-only: never registers barriers/colliders, alters race physics,
 * changes tracks, touches accounts, or synchronizes over multiplayer.
 * Reuses instanced unit cubes to bound draw calls on Chromebooks.
 */
const unit=(v,a=1)=>Number.isFinite(v)?v:a;

function placeInstances(THREE,root,material,instances,name){
  if(!instances.length)return null;
  const mesh=new THREE.InstancedMesh(
    new THREE.BoxGeometry(1,1,1),material,instances.length
  );
  mesh.name="NEON_V7_"+name;
  const dummy=new THREE.Object3D();
  for(let i=0;i<instances.length;i++){
    const p=instances[i];
    dummy.position.set(p.x,p.y,p.z);
    dummy.rotation.set(0,p.rot||0,0);
    dummy.scale.set(p.w,p.h,p.d);
    dummy.updateMatrix();
    mesh.setMatrixAt(i,dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate=true;
  // District extends around the raceway, not one single tight bounding box.
  mesh.frustumCulled=false;
  root.add(mesh);
  return mesh;
}

function safeBuilding(b){
  return b&&Number.isFinite(b.position?.x)&&Number.isFinite(b.position?.z)&&
    Number.isFinite(b.width)&&Number.isFinite(b.depth)&&
    Number.isFinite(b.height)&&b.width>=5&&b.depth>=5&&b.height>=7&&
    Number.isFinite(b.normal?.x)&&Number.isFinite(b.normal?.z)&&
    Number.isFinite(b.tangent?.x)&&Number.isFinite(b.tangent?.z)&&
    Number.isFinite(b.rotationY);
}
export function buildNeonV7District({THREE,worldGroup,buildings=[],
                                      trafficRoads=[]}={}){
  if(!THREE||!worldGroup)throw new Error("Neon V7 requires a scene");
  const root=new THREE.Group();
  root.name="REDLINE_NEON_V7_STREETSCAPE";
  worldGroup.add(root);
  const MAT={
    stone:new THREE.MeshStandardMaterial({color:0x303b49,roughness:.88}),
    steel:new THREE.MeshStandardMaterial({color:0x657282,metalness:.61,roughness:.47}),
    sill:new THREE.MeshStandardMaterial({color:0x202936,roughness:.67,metalness:.27}),
    glass:new THREE.MeshStandardMaterial({
      color:0x31566b,emissive:0x0b2232,emissiveIntensity:.17,
      metalness:.30,roughness:.18,
      transparent:true,opacity:.68,depthWrite:false
    }),
    interior:new THREE.MeshStandardMaterial({
      color:0x927a5b,emissive:0xeab87e,emissiveIntensity:.72,
      metalness:.06,roughness:.57
    }),
    shutter:new THREE.MeshStandardMaterial({color:0x454b54,metalness:.42,roughness:.62}),
    asphalt:new THREE.MeshStandardMaterial({color:0x292e37,roughness:.96,metalness:0}),
    faded:new THREE.MeshStandardMaterial({color:0x555b64,roughness:.86,metalness:.04}),
    edge:new THREE.MeshStandardMaterial({color:0x92939a,roughness:.85,metalness:.0}),
    reflector:new THREE.MeshBasicMaterial({color:0xb2d9ff})
  };
  const bars=[
    new THREE.MeshBasicMaterial({color:0x4cdfff,toneMapped:false}),
    new THREE.MeshBasicMaterial({color:0xff659d,toneMapped:false}),
    new THREE.MeshBasicMaterial({color:0xffc276,toneMapped:false}),
    new THREE.MeshBasicMaterial({color:0x86ddce,toneMapped:false})
  ];
  const shopGlass=[],shopFrames=[],shopLight=[],shopDoor=[],shopAwning=[];
  const shutters=[],edgeColumns=[],roofHvac=[],roofFans=[],roofDucts=[];
  const stairs=[],strips=[[],[],[],[]],roofBeacons=[];
  const buildingList=buildings.filter(safeBuilding);
  const put=(list,x,y,z,w,h,d,rot=0)=>list.push({x,y,z,w,h,d,rot});
  for(let i=0;i<buildingList.length;i++){
    const b=buildingList[i],rot=b.rotationY;
    const nx=-b.normal.x*b.side,nz=-b.normal.z*b.side;
    const tx=b.tangent.x,tz=b.tangent.z;
    // All facade elements hug the exterior face of a previously validated
    // building. Max extrusion is 0.25m, not into the racing roadway.
    const facade=(distance,slide=0)=>{
      return {x:b.position.x+nx*(b.width/2+distance)+tx*slide,
              z:b.position.z+nz*(b.width/2+distance)+tz*slide};
    };
    const front=facade(.075);
    const span=Math.min(b.depth*.78,8);
    const isRetail=i%5!==2;
    const isWarehouse=i%5===2;
    const color=i%bars.length;
    if(isRetail){
      // Stone lintel + base ledge form a real window frame. A previous
      // full opaque slab would have hidden the interior and glass entirely.
      const frame=facade(.20);
      put(shopFrames,frame.x,3.08,frame.z,.13,.16,span,rot);
      put(shopFrames,frame.x,.25,frame.z,.13,.20,span,rot);
      const glass=facade(.177);
      put(shopGlass,glass.x,1.75,glass.z,.048,2.62,span-.34,rot);
      // A recessed warm-lit room behind actual semitransparent glazing.
      // No large ground glow plane and no light per shop.
      const interior=facade(.066);
      put(shopLight,interior.x,1.74,interior.z,.045,2.21,span-.72,rot);
      const door=facade(.185,span*.25);
      put(shopDoor,door.x,1.39,door.z,.075,2.49,.93,rot);
      put(shopAwning,front.x,3.27,front.z,.40,.14,span+.16,rot);
      for(const slide of [-span*.48,span*.48]){
        const q=facade(.19,slide);
        put(edgeColumns,q.x,1.62,q.z,.11,3.24,.12,rot);
      }
      // Slim horizontal signs are built as lit trim, no extra canvas
      // textures and no dozens of per-building dynamic light sources.
      const neon=facade(.235);
      put(strips[color],neon.x,3.11,neon.z,.075,.095,span*.86,rot);
    }else if(isWarehouse){
      const metal=facade(.13);
      put(shutters,metal.x,2.04,metal.z,.11,3.35,span*.75,rot);
      for(let k=0;k<4;k++){
        const rail=facade(.205);
        put(edgeColumns,rail.x,.61+k*.82,rail.z,.09,.058,span*.75,rot);
      }
      const dock=facade(.21);
      put(shopAwning,dock.x,4.01,dock.z,.43,.13,span*.86,rot);
    }
    // Roof details are centered INSIDE the existing building footprint.
    // No ground-level collision needs to be added.
    if(b.height>=12){
      const x=b.position.x,z=b.position.z,y=b.height+.28;
      const c=Math.cos(rot),s=Math.sin(rot);
      const sx=b.depth*.13;
      put(roofHvac,x,y+.60,z,
          Math.min(b.width*.35,2.9),1.18,Math.min(b.depth*.32,3.8),rot);
      put(roofFans,x,y+1.23,z,Math.min(b.width*.23,1.7),.14,
          Math.min(b.depth*.25,2.1),rot);
      if(b.height>27){
        const dx=s*sx,dz=c*sx;
        put(roofDucts,x+dx,y+.18,z+dz,
          Math.min(b.width*.28,2.5),.36,Math.min(b.depth*.20,2.2),rot);
      }
      if(b.height>34&&i%7===0){
        put(roofBeacons,x,y+5.7,z,.13,11.4,.13);
      }
    }
    // A compact fire stair/landing on only a few street-facing buildings.
    // It clings to the same cleared facade, with <=.20m projection.
    if(b.height>18&&i%8===3){
      const p=facade(.16,-span*.33);
      for(let level=0;level<Math.min(3,Math.floor(b.height/7));level++)
        put(stairs,p.x,6.2+level*6.1,p.z,.19,.16,1.65,rot);
    }
  }
  const paved=[],pavementEdges=[],rainPatches=[],roadStuds=[];
  // Only use the AMBIENT grid roads that buildBackdrop has individually
  // clipped away from buildings, bridges, raceway and canal. Never create
  // new full-length streets or pavement that could cross the race route.
  const acceptedRoads=trafficRoads.filter(r=>
    (r?.axis==="x"||r?.axis==="z")&&Number.isFinite(r.centerX)&&
    Number.isFinite(r.centerZ)&&Number.isFinite(r.length)&&
    r.length>=56&&r.length<1000&&r.width>=6&&r.width<=8
  );
  for(let i=0;i<acceptedRoads.length;i++){
    const r=acceptedRoads[i],axis=r.axis==="z"?"z":"x";
    const len=r.length;
    const along=axis==="z"?r.centerZ:r.centerX;
    for(const side of [-1,1]){
      const lat=side*(r.width*.5-.32);
      if(axis==="z")
        put(pavementEdges,r.centerX+lat,.012,r.centerZ,.09,.020,Math.max(0,len-4));
      else
        put(pavementEdges,r.centerX,.012,r.centerZ+lat,Math.max(0,len-4),.020,.09);
    }
    for(let d=-len*.5+10;d<len*.5-8;d+=18){
      const bend=Math.sin((i+3)*17+d*.71)*.27;
      const c=along+d;
      if(axis==="z"){
        put(paved,r.centerX+bend,.018,c,.15,.025,2.8);
        put(rainPatches,r.centerX+1.55,.005,c+3.9,.42,.016,1.32);
        put(roadStuds,r.centerX-1.9,.036,c+.65,.11,.045,.22);
      }else{
        put(paved,c,.018,r.centerZ+bend,2.8,.025,.15);
        put(rainPatches,c+3.9,.005,r.centerZ+1.55,1.32,.016,.42);
        put(roadStuds,c+.65,.036,r.centerZ-1.9,.22,.045,.11);
      }
    }
  }
  placeInstances(THREE,root,MAT.stone,shopFrames,"shop_frames");
  placeInstances(THREE,root,MAT.interior,shopLight,"warm_interiors");
  placeInstances(THREE,root,MAT.glass,shopGlass,"shop_windows");
  placeInstances(THREE,root,MAT.sill,shopDoor,"storefront_doors");
  placeInstances(THREE,root,MAT.steel,shopAwning,"awning_lips");
  placeInstances(THREE,root,MAT.shutter,shutters,"roller_shutters");
  placeInstances(THREE,root,MAT.steel,edgeColumns,"facade_stanchions");
  placeInstances(THREE,root,MAT.stone,roofHvac,"roof_hvac");
  placeInstances(THREE,root,MAT.steel,roofFans,"roof_fan_cowls");
  placeInstances(THREE,root,MAT.sill,roofDucts,"roof_ducting");
  placeInstances(THREE,root,MAT.steel,stairs,"fire_escape_landings");
  placeInstances(THREE,root,MAT.steel,roofBeacons,"roof_masts");
  for(let i=0;i<strips.length;i++)
    placeInstances(THREE,root,bars[i],strips[i],"store_neon_"+i);
  placeInstances(THREE,root,MAT.faded,paved,"ambient_lanes");
  placeInstances(THREE,root,MAT.edge,pavementEdges,"ambient_edge_stripes");
  placeInstances(THREE,root,MAT.asphalt,rainPatches,"road_repair_patches");
  placeInstances(THREE,root,MAT.reflector,roadStuds,"road_studs");
  // Four pooled, low-range street lights help ground the scene at night
  // without the performance cliff of a separate PointLight per storefront.
  let lightCount=0;
  for(let i=2;i<buildingList.length&&lightCount<4;i+=Math.max(1,Math.floor(buildingList.length/4))){
    const b=buildingList[i];
    if(b.height<13)continue;
    const light=new THREE.PointLight(i%2?0xffc18e:0x72bafa,13,24,2);
    light.position.set(
      b.position.x-b.normal.x*b.side*(b.width*.5+1.4),
      4.3,
      b.position.z-b.normal.z*b.side*(b.width*.5+1.4)
    );
    light.castShadow=false;
    root.add(light);lightCount++;
  }
  return {
    buildingsDecorated:buildingList.length,
    ambientRoads:acceptedRoads.length,
    storefronts:shopGlass.length,
    streetLights:lightCount,
    sceneryOnly:true,
    root
  };
}
