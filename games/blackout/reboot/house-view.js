// BLACKOUT V0.26.0 · two-floor house graybox built from real collision cells.
import {HOUSE,HOUSE_BLOCKERS} from "./house-layout.js?v=reboot-062";

export function createHouseView(THREE,scene){
 const group=new THREE.Group();group.name="BLACKOUT · TWO-STORY HOUSE";
 group.visible=false;scene.add(group);
 const resources=[],shootables=[];
 const materials={
  exterior:new THREE.MeshStandardMaterial({color:0x6b7a7c,roughness:.91}),
  plaster:new THREE.MeshStandardMaterial({color:0xb3b8af,roughness:.95}),
  floor:new THREE.MeshStandardMaterial({color:0x746f66,roughness:.87}),
  roof:new THREE.MeshStandardMaterial({color:0x40545b,roughness:.92}),
  sofa:new THREE.MeshStandardMaterial({color:0x316b79,roughness:.89}),
  bed:new THREE.MeshStandardMaterial({color:0x7a8f9e,roughness:.91}),
  table:new THREE.MeshStandardMaterial({color:0x7b5841,roughness:.91}),
  shelf:new THREE.MeshStandardMaterial({color:0x785842,roughness:.82}),
  sink:new THREE.MeshStandardMaterial({color:0x96a9a9,roughness:.37,metalness:.35}),
  desk:new THREE.MeshStandardMaterial({color:0x5b665e,roughness:.71}),
  counter:new THREE.MeshStandardMaterial({color:0x67766b,roughness:.65}),
  crate:new THREE.MeshStandardMaterial({color:0x715d42,roughness:.93})
 };
 resources.push(...Object.values(materials));
 function box(name,w,h,d,x,y,z,mat,parent=group,solid=false){
  const geo=new THREE.BoxGeometry(w,h,d);resources.push(geo);
  const m=new THREE.Mesh(geo,mat);m.name=name;
  m.position.set(x,y,z);m.castShadow=h>.18;m.receiveShadow=true;
  parent.add(m);if(solid)shootables.push(m);return m;
 }
 for(const b of HOUSE_BLOCKERS){
  const h=b.height-b.bottom;
  const m=box(b.id+" · "+b.kind,b.width,h,b.depth,
   b.x,b.bottom+h/2,b.z,materials[b.material]||materials.plaster,group,true);
  m.userData.physicsObstacleId=b.id;
  m.userData.houseLevel=b.bottom>=HOUSE.floorHeight?2:1;
 }
 // Wood-and-metal stair treads follow the same continuous grade as the
 // player foot-height function. They are not separate blockers that could
 // wedge the player between steps.
 const stepMat=new THREE.MeshStandardMaterial({color:0x9d8870,roughness:.81});
 const railMat=new THREE.MeshStandardMaterial({color:0x313e47,roughness:.52,metalness:.55});
 const glassMat=new THREE.MeshStandardMaterial({color:0x6ab9c3,transparent:true,
  opacity:.20,roughness:.2,metalness:.1,side:THREE.DoubleSide,depthWrite:false});
 const porchMat=new THREE.MeshStandardMaterial({color:0x666e6b,roughness:.95});
 const lampMat=new THREE.MeshBasicMaterial({color:0xf5d8a0});
 resources.push(stepMat,railMat,glassMat,porchMat,lampMat);
 const stair=HOUSE.stairs,count=21;
 for(let i=0;i<count;i++){
  const fraction=(i+.5)/count;
  const top=HOUSE.floorHeight*fraction;
  const z=stair.maxZ-(i+.5)*(stair.maxZ-stair.minZ)/count;
  box("WALKABLE STAIR TREAD "+(i+1),1.57,.11,(stair.maxZ-stair.minZ)/count,
   1.05,top-.055,z,stepMat);
  // Thin riser fronts make the stairs readable at a distance.
  box("STAIR RISER "+(i+1),1.57,.14,.045,1.05,top-.11,z-.14,railMat);
 }
 box("FLUSH UPPER STAIR LANDING",1.60,.11,.86,1.05,HOUSE.floorHeight-.055,-12.40,stepMat);
 // Sloped rail segments; furniture-only geometry, never invisible collision.
 for(const x of [stair.minX-.11,stair.maxX+.11]){
  for(let i=0;i<7;i++){
   const z=stair.maxZ-(i+.5);
   const y=HOUSE.floorHeight*(stair.maxZ-z)/(stair.maxZ-stair.minZ);
   box("STAIR SAFETY POST",.06,1.0,.06,x,y+.52,z,railMat);
  }
 }
 // Raised front porch and porch steps (no taller than the player's walk
 // clearance): indicate the two external entries, without trapping anyone.
 box("FRONT DOOR THRESHOLD",2.75,.07,1.20,0,.014,-1.42,porchMat);
 box("REAR EXIT THRESHOLD",2.75,.07,.9,0,.014,-20.46,porchMat);
 for(const [x,z,y] of [[-7,-3.5,0],[-7,-16.2,0],[7,-3.5,0],
  [7,-16.2,0],[-7,-4,3.2],[-7,-16,3.2],[7,-4,3.2],[7,-16,3.2]]){
  const fixture=box("CEILING LIGHT",.95,.055,.45,x,y+2.94,z,lampMat);
  fixture.castShadow=false;
  const light=new THREE.PointLight(0xffe1b3,.66,10,2);
  light.position.set(x,y+2.70,z);group.add(light);
 }
 // Windows reveal real openings through the wall; panes are visual only
 // so they do not accidentally become bulletproof or block recon drones.
 const windowSpecs=[
  [-6,-20,0,0],[6,-20,0,0],[-6,-2,0,0],[6,-2,0,0],
  [-10,-6,0,Math.PI/2],[10,-6,0,Math.PI/2],
  [-6,-20,3.2,0],[6,-20,3.2,0],[-6,-2,3.2,0],[6,-2,3.2,0],
  [-10,-16,3.2,Math.PI/2],[10,-16,3.2,Math.PI/2],
  [-10,-6,3.2,Math.PI/2],[10,-6,3.2,Math.PI/2]
 ];
 for(const [x,z,y,yaw] of windowSpecs){
  const pane=box("BREAKABLE-LOOK WINDOW · OPEN LINE OF FIRE",2.02,1.15,.016,
   x,y+1.62,z,glassMat);
  pane.rotation.y=yaw;pane.castShadow=false;
 }
 return {group,colliders:HOUSE_BLOCKERS,shootables,dispose(){
  scene.remove(group);for(const r of resources)r.dispose();
 }};
}
