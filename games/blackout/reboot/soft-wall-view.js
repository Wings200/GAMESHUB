// BLACKOUT V0.10 · true dynamic cutouts from instanced gypsum material.
// The rendered mesh AND physics blocks derive from the same cell-state array.
// No fake black-hole decals painted onto an otherwise solid wall.
import {SOFT_WALL,SOFT_WALL_TOTAL,newSoftWall,softWallRemove,
 softWallReset,softWallBlockers,softWallFrame,canResetSoftWall,softWallStatus,
 softWallWorld,softWallBreachWindow} from "./soft-wall.js?v=reboot-046";

export function createSoftWallStation(THREE,scene){
 const spec=SOFT_WALL;
 let state=newSoftWall(),instanceToCell=[],activeCount=0;
 const frameMat=new THREE.MeshStandardMaterial({color:0x354e5c,metalness:.42,roughness:.65});
 const edgeMat=new THREE.MeshStandardMaterial({color:0x756b58,roughness:.9,metalness:0});
 const plasterCanvas=document.createElement("canvas");
 plasterCanvas.width=256;plasterCanvas.height=256;
 const pctx=plasterCanvas.getContext("2d");
 if(pctx){
  pctx.fillStyle="#b4aba0";pctx.fillRect(0,0,256,256);
  let seed=38051;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<900;i++){
   const a=rand();
   pctx.fillStyle=a>.57?"rgba(240,235,217,.065)":"rgba(55,54,52,.04)";
   const x=rand()*256,y=rand()*256,s=.5+rand()*3;
   pctx.fillRect(x,y,s,s);
  }
 }
 const tex=pctx?new THREE.CanvasTexture(plasterCanvas):null;
 if(tex){tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;}
 const material=new THREE.MeshStandardMaterial({
  color:0xffffff,map:tex,roughness:.93,metalness:0,side:THREE.DoubleSide
 });
 // Visible true wall thickness on every remaining chipped cell.
 const cellGeometry=new THREE.BoxGeometry(spec.cell,spec.cell,spec.depth);
 const panel=new THREE.InstancedMesh(cellGeometry,material,SOFT_WALL_TOTAL);
 panel.name="V0.10 cuttable gypsum panel";
 panel.userData.physicsObstacleId=spec.id+"-panel";
 panel.frustumCulled=false; // the true remaining tiles can be disjoint
 panel.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 scene.add(panel);
 const tempMatrix=new THREE.Matrix4();
 function refresh(){
  let count=0;
  for(let index=0;index<SOFT_WALL_TOTAL;index++){
   if(!state.solid[index])continue;
   const world=softWallWorld(index);
   tempMatrix.makeTranslation(world.x,world.y,world.z);
   panel.setMatrixAt(count,tempMatrix);
   instanceToCell[count]=index;
   count++;
  }
  instanceToCell.length=count;
  panel.count=count;
  panel.instanceMatrix.needsUpdate=true;
  activeCount=count;
 }
 refresh();
 const frameMeshes=[];
 for(const piece of softWallFrame()){
  const h=piece.height-piece.bottom;
  const m=new THREE.Mesh(new THREE.BoxGeometry(piece.width,h,piece.depth),frameMat);
  m.position.set(piece.x,piece.bottom+h/2,piece.z);
  m.userData.physicsObstacleId=piece.id;
  m.name="soft wall permanent support";
  m.receiveShadow=true;
  scene.add(m);frameMeshes.push(m);
 }
 // A subtle chipped material edge behind exposed cutouts, but no solid backface
 // plate that could incorrectly stop a bullet passing through a hole.
 const base=new THREE.Mesh(new THREE.BoxGeometry(spec.columns*spec.cell+.05,.09,.31),edgeMat);
 base.position.set(spec.x,.045,spec.z);scene.add(base);
 // Label intentionally independent from raycast collision.
 const labelCanvas=document.createElement("canvas");
 labelCanvas.width=512;labelCanvas.height=96;
 const ctx=labelCanvas.getContext("2d");
 if(ctx){
  ctx.fillStyle="#21333d";ctx.fillRect(0,0,512,96);
  ctx.fillStyle="#f0ebe0";ctx.font="bold 36px Arial";
  ctx.fillText("SOFT WALL TEST",16,46);
  ctx.fillStyle="#a8daca";ctx.font="bold 19px Arial";
  ctx.fillText("SHOOT THROUGH / PRESS T TO RESET",16,77);
 }
 const signTex=ctx?new THREE.CanvasTexture(labelCanvas):null;
 if(signTex)signTex.colorSpace=THREE.SRGBColorSpace;
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(2.2,.42),
  new THREE.MeshBasicMaterial({color:0xffffff,map:signTex,side:THREE.DoubleSide}));
 sign.position.set(spec.x,spec.postHeight+.30,spec.z+.18);
 scene.add(sign);
 // Short gypsum chips: one independent low-cost dust fleck per bullet, capped.
 const chips=[];
 const chipMaterial=new THREE.MeshStandardMaterial({color:0xc2b9ae,roughness:.99});
 function addChip(point){
  const chip=new THREE.Mesh(new THREE.BoxGeometry(.038,.027,.016),chipMaterial);
  chip.position.copy(point);chip.position.z+=.04;
  scene.add(chip);
  chips.push({mesh:chip,age:0,vx:(Math.random()-.5)*1.6,
   vy:.25+Math.random()*1.2,vz:(Math.random()-.5)*1.5});
  while(chips.length>28){
   const old=chips.shift();scene.remove(old.mesh);old.mesh.geometry.dispose();
  }
 }
 function onHit(hit){
  if(hit?.object!==panel||!Number.isInteger(hit.instanceId))
   return {handled:false};
  const index=instanceToCell[hit.instanceId];
  if(!Number.isInteger(index))return {handled:false};
  const result=softWallRemove(state,index);
  if(!result.removed)return {handled:false};
  state=result.state;
  addChip(hit.point);
  refresh();
  return {handled:true,index,removed:state.removed,remaining:activeCount};
 }
 function blastAt(blast){
  if(!blast)return 0;
  // Real holes across all cells within the blast sphere. Steel reinforcement
  // protection is handled by the caller before this damage method runs.
  let removed=0;
  for(let index=0;index<SOFT_WALL_TOTAL;index++){
   if(!state.solid[index])continue;
   const world=softWallWorld(index);
   if(Math.hypot(blast.x-world.x,blast.y-world.y,blast.z-world.z)>blast.radius)continue;
   const result=softWallRemove(state,index);
   if(result.removed){state=result.state;removed++;}
  }
  if(removed)refresh(); // both visual cells and collision strips disappear
  return removed;
 }
 function breachWindow(window){
  const result=softWallBreachWindow(state,window);
  if(result.removed){state=result.state;refresh();}
  return result.removed;
 }
 function reset(player){
  if(!canResetSoftWall(player))return {ok:false,reason:"STAND CLEAR OF WALL"};
  if(state.removed===0)return {ok:false,reason:"WALL ALREADY INTACT"};
  state=softWallReset(state);
  refresh();
  return {ok:true,reason:"SOFT WALL RESTORED"};
 }
 function tick(dt){
  for(let i=chips.length-1;i>=0;i--){
   const c=chips[i];c.age+=dt;c.vy-=7*dt;
   c.mesh.position.x+=c.vx*dt;c.mesh.position.y+=c.vy*dt;
   c.mesh.position.z+=c.vz*dt;c.mesh.rotation.x+=dt*8;
   if(c.age>.58||c.mesh.position.y<.03){
    scene.remove(c.mesh);c.mesh.geometry.dispose();chips.splice(i,1);
   }
  }
 }
 return {
  onHit,blastAt,breachWindow,reset,tick,
  shootables:()=>activeCount?[panel,...frameMeshes]:frameMeshes.slice(),
  blockers:()=>softWallBlockers(state),
  near:player=>Math.hypot(player.x-spec.x,player.z-spec.z)<4.5,
  get remaining(){return activeCount;},
  get removed(){return state.removed;},
  get status(){return softWallStatus(state);},
  get cellCount(){return SOFT_WALL_TOTAL;},
  get state(){return state;},
  panel,
 };
}
