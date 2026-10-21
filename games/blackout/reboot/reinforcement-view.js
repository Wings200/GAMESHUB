// BLACKOUT V0.11 · genuine metal wall reinforcement, independent of drywall.
// Visible three-second bottom-up construction; a full-depth physical panel
// becomes live in BOTH shooter and player collisions only on completion.
// Decorative ribs/rivets are not separate raycast blockers.
import {REINFORCEMENT,newReinforcement,stepReinforcement,
 removeReinforcement,reinforcementBlockers,canWorkOnReinforcement,
 reinforcementStatus,hardBreachReinforcement} from "./reinforcement.js?v=reboot-045";

export function createReinforcementStation(THREE,scene){
 const spec=REINFORCEMENT;
 let state=newReinforcement();
 const root=new THREE.Group();
 root.name="BLACKOUT steel reinforcement";
 root.position.set(spec.x,0,spec.z);
 root.visible=false;scene.add(root);
 const steel=new THREE.MeshStandardMaterial({
  color:0x536b78,metalness:.82,roughness:.38,side:THREE.DoubleSide});
 const dark=new THREE.MeshStandardMaterial({
  color:0x1e323e,metalness:.75,roughness:.46});
 const ribs=new THREE.MeshStandardMaterial({
  color:0x829ba2,metalness:.85,roughness:.37});
 const boltMat=new THREE.MeshStandardMaterial({
  color:0xabb8b4,metalness:.95,roughness:.24});
 function box(name,w,h,d,x,y,z,material){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
  mesh.position.set(x,y,z);
  mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;
  root.add(mesh);return mesh;
 }
 const core=box("real bulletproof metal",spec.width,spec.height,spec.depth,
   0,spec.height/2,0,steel);
 core.userData.physicsObstacleId=spec.id;
 core.userData.reinforcementShield=true;
 // Two-sided industrial folded steel plating with believable seams.
 // The center slab is the only raycast collision object.
 for(const face of [-1,1]){
  const z=face*(spec.depth/2+.014);
  box("left steel panel",spec.width/2-.045,spec.height-.13,.022,
      -(spec.width/4),spec.height/2,z,steel);
  box("right steel panel",spec.width/2-.045,spec.height-.13,.022,
      spec.width/4,spec.height/2,z,steel);
  box("central connecting rib",.095,spec.height-.035,.045,0,spec.height/2,
      face*(spec.depth/2+.035),dark);
  for(const offset of [.31,.84,1.37,1.9,2.22]){
   box("horizontal reinforcement rib",spec.width-.065,.048,.057,
       0,offset,face*(spec.depth/2+.045),ribs);
  }
  for(const xpos of [-spec.width/2+.065,-.07,.07,spec.width/2-.065]){
   box("vertical riveted seam",.035,spec.height-.05,.045,xpos,spec.height/2,
       face*(spec.depth/2+.045),dark);
   for(const ypos of [.2,.72,1.24,1.76,2.22]){
    const bolt=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.012,9),boltMat);
    bolt.rotation.x=Math.PI/2;
    bolt.position.set(xpos,ypos,face*(spec.depth/2+.075));
    bolt.name="steel rivet";root.add(bolt);
   }
  }
 }
 // The intact metal slab/ornament remains unchanged until an actual
 // breaching charge creates the first physical gap.
 const intactMeshes=[...root.children];
 let breachMeshes=[],breachSignature="";
 function rebuildBreachMeshes(){
  const signature=state.installed&&state.breach?
   [state.breach.left,state.breach.right,state.breach.top].join(":"):"";
  if(signature===breachSignature)return;
  for(const mesh of breachMeshes){root.remove(mesh);mesh.geometry.dispose();}
  breachMeshes=[];breachSignature=signature;
  if(signature){
   for(const part of reinforcementBlockers(state)){
    const height=part.height-part.bottom;
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(part.width,height,part.depth),steel);
    mesh.name="REAL HARD BREACH STEEL "+part.id;
    mesh.position.set(part.x-spec.x,part.bottom+height/2,0);
    mesh.castShadow=true;mesh.receiveShadow=true;
    mesh.userData.physicsObstacleId=part.id;
    mesh.userData.reinforcementShield=true;
    root.add(mesh);breachMeshes.push(mesh);
   }
  }
 }
 const sparks=[];
 const sparkMat=new THREE.MeshBasicMaterial({color:0xffda9a,depthWrite:false});
 function steelImpact(hit){
  if(!state.installed||!(state.breach?breachMeshes.includes(hit?.object):hit?.object===core))return false;
  const flash=new THREE.Mesh(new THREE.SphereGeometry(.038,6,5),sparkMat);
  flash.position.copy(hit.point);
  flash.position.z+=(hit.point.z>=spec.z ? .018 : -.018);
  scene.add(flash);sparks.push({mesh:flash,left:.095});
  return true;
 }
 function sync(){
  rebuildBreachMeshes();
  const pct=state.installed?1:Math.max(0,state.progress/spec.installSeconds);
  root.visible=pct>0;
  for(const mesh of intactMeshes)mesh.visible=!state.breach;
  // No decorative metal ribs are left floating across a blasted opening.
  root.scale.y=Math.max(.00001,pct);
 }
 function breachAt(blast){
  const result=hardBreachReinforcement(state,blast);
  if(result.opened){state=result.state;sync();}
  return result;
 }
 function step({player,holding,dt,moving=false,sprinting=false}){
  const result=stepReinforcement(state,{player,holding,dt,moving,sprinting});
  state=result.state;
  sync();
  return result;
 }
 function remove(player){
  const result=removeReinforcement(state,player);
  state=result.state;
  sync();
  return result;
 }
 function tick(dt){
  for(let i=sparks.length-1;i>=0;i--){
   const item=sparks[i];item.left-=dt;
   item.mesh.scale.setScalar(Math.max(.01,item.left/.095));
   if(item.left<=0){
    scene.remove(item.mesh);item.mesh.geometry.dispose();sparks.splice(i,1);
   }
  }
 }
 return {
  step,remove,tick,steelImpact,breachAt,
  shootables:()=>state.installed?(state.breach?breachMeshes.slice():[core]):[],
  blockers:()=>reinforcementBlockers(state),
  near:player=>canWorkOnReinforcement(player),
  get state(){return state;},
  get status(){return reinforcementStatus(state);},
  get progress(){return state.installed?1:state.progress/spec.installSeconds;},
  get installed(){return state.installed;},
  get breached(){return Boolean(state.breach);},
  get electrified(){return Boolean(state.electrified);},
  root,core
 };
}
