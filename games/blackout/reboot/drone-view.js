// BLACKOUT V0.12.2 · original 3D drone model, hide own model only while viewing its lens.
// Driving uses drone-physics.js; this is only geometry/presentation.
export function createDroneView(THREE,scene){
 const root=new THREE.Group();root.name="BLACKOUT RECON R-1 wheeled drone";
 root.visible=false; // No unlaunched drone model at world origin.
 const bodyMat=new THREE.MeshStandardMaterial({color:0x30434f,metalness:.62,roughness:.48});
 const armor=new THREE.MeshStandardMaterial({color:0x6e8187,metalness:.7,roughness:.39});
 const rubber=new THREE.MeshStandardMaterial({color:0x141d22,metalness:.06,roughness:.91});
 const lensMat=new THREE.MeshStandardMaterial({color:0x0e1f29,metalness:.5,roughness:.1,
   emissive:0x092935,emissiveIntensity:.35});
 const lightMat=new THREE.MeshStandardMaterial({color:0x70e9d6,emissive:0x2bc29e,
  emissiveIntensity:1.4,metalness:.25,roughness:.26});
 function box(w,h,d,x,y,z,mat){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  mesh.position.set(x,y,z);mesh.castShadow=true;root.add(mesh);return mesh;
 }
 box(.28,.135,.40,0,.13,0,bodyMat);
 box(.25,.045,.29,0,.22,.01,armor);
 box(.17,.072,.19,0,.256,-.075,bodyMat);
 const lens=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.05,16),lensMat);
 lens.rotation.x=Math.PI/2;lens.position.set(0,.26,-.19);root.add(lens);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.053,.011,5,16),lightMat);
 ring.position.set(0,.26,-.224);root.add(ring);
 const wheels=[];
 for(const x of [-.19,.19])for(const z of [-.135,.135]){
  const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.10,.10,.085,14),rubber);
  wheel.rotation.z=Math.PI/2;wheel.position.set(x,.12,z);
  wheel.castShadow=true;root.add(wheel);wheels.push(wheel);
 }
 for(const x of [-.105,.105]){
  box(.045,.027,.025,x,.17,.207,lightMat);
 }
 scene.add(root);
 let oldX=0,oldZ=0;
 function update(state,dt){
  root.visible=state.deployed;
  if(!root.visible)return;
  const distance=Math.hypot(state.x-oldX,state.z-oldZ);
  root.position.set(state.x,state.y,state.z);
  root.rotation.y=state.yaw;
  const sign=distance>1e-4?1:0;
  for(const w of wheels)w.rotation.x+=Math.min(1,distance)*8*sign;
  oldX=state.x;oldZ=state.z;
 }
 function place(state){oldX=state.x;oldZ=state.z;update(state,0)}
 // Include every physical component in hitscan. Parent Group is not raycastable.
 const shootables=[];
 root.traverse(node=>{if(node.isMesh)shootables.push(node);});
 function setIndex(index){for(const mesh of shootables)mesh.userData.reconDroneIndex=index;}
 function dispose(){
  scene.remove(root);
  for(const mesh of shootables)mesh.geometry.dispose();
  for(const mat of [bodyMat,armor,rubber,lensMat,lightMat])mat.dispose();
 }
 return {root,update,place,wheels,lens,shootables,setIndex,dispose};
}

// Camera-only visibility: no camera should render inside its own body.
// World model stays visible to the operator and to *other drone cameras*.
// Call after droneView.update(), which restores its deployed world visibility.
export function setDroneCameraVisibility(views,selectedIndex,isViewingDrone){
 for(let i=0;i<views.length;i++){
  if(!views[i]?.root)continue;
  if(isViewingDrone&&i===selectedIndex)views[i].root.visible=false;
 }
}
