// BLACKOUT V0.9 · physically modeled six-plank barricade test station.
// Each plank is its own hit-scan + player collision surface. Damage marks are
// children of the affected plank, so destroying it cannot leave floating decals.
import {BARRICADE,createBarricadeState,barricadeDamage,barricadeRebuild,
 barricadeBlockers,barricadeStatus,canInteractWithBarricade,boardBounds,barricadeMeleeDamage,BARRICADE_MELEE_HITS}
 from "./barricade.js?v=reboot-068";

export function createBarricadeStation(THREE,scene){
 const b=BARRICADE;
 const stateRef={current:createBarricadeState()};
 const root=new THREE.Group();
 root.name="BLACKOUT physical barricade testing station";
 scene.add(root);
 const frameWood=new THREE.MeshStandardMaterial({color:0x4c3428,roughness:.91,metalness:0});
 const innerTrim=new THREE.MeshStandardMaterial({color:0x997155,roughness:.83,metalness:0});
 const metal=new THREE.MeshStandardMaterial({color:0x334451,roughness:.67,metalness:.38});
 const dark=new THREE.MeshBasicMaterial({color:0x101b23});
 const splinterMat=new THREE.MeshStandardMaterial({color:0xa27b53,roughness:.95});
 // Procedurally streaked varnished plywood (real UV texture, not flat cardboard).
 const canvas=document.createElement("canvas");
 canvas.width=512;canvas.height=128;
 const ctx=canvas.getContext("2d");
 if(ctx){
  ctx.fillStyle="#9d7550";ctx.fillRect(0,0,512,128);
  let seed=201337;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<330;i++){
   const v=rand(),r=Math.floor(48+v*64);
   ctx.strokeStyle=v>.5?"rgba(53,28,17,.15)":"rgba(248,207,145,.17)";
   ctx.lineWidth=1+rand()*2;ctx.beginPath();
   const y=rand()*128,x=rand()*512;ctx.moveTo(x,y);
   ctx.bezierCurveTo(x+60,y+rand()*3,x+150,y-rand()*5,x+300,y+rand()*2);ctx.stroke();
  }
  ctx.fillStyle="rgba(55,33,22,.18)";ctx.fillRect(0,0,512,4);ctx.fillRect(0,124,512,4);
 }
 const tex=ctx?new THREE.CanvasTexture(canvas):null;
 if(tex){tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;}
 const plankMat=new THREE.MeshStandardMaterial({color:0xffffff,map:tex,roughness:.91,metalness:0});
 const rawMeshes=[];
 function mesh(name,w,h,d,x,y,z,material,physicsId){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
  m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;m.name=name;
  if(physicsId)m.userData.physicsObstacleId=physicsId;
  root.add(m);
  if(physicsId)rawMeshes.push(m);
  return m;
 }
 const half=b.openingWidth/2;
 for(const side of [-1,1]){
  const x=b.x+side*(half+b.postWidth/2);
  mesh("permanent door jamb",b.postWidth,b.postHeight,b.depth+.12,
       x,b.postHeight/2,b.z,frameWood,b.id+"-frame-"+(side<0?"left":"right"));
  mesh("metal corner trim",.03,b.postHeight,.02,
       x-side*(b.postWidth/2-.03),b.postHeight/2,b.z+.151,metal);
 }
 const headerHeight=b.postHeight-b.openingHeight;
 mesh("solid overhead lintel",b.openingWidth,headerHeight,b.depth+.12,
   b.x,b.openingHeight+headerHeight/2,b.z,frameWood,b.id+"-frame-header");
 // Bright testing placard: visible from initial spawn, no HUD gadget pretenses.
 const signCanvas=document.createElement("canvas");
 signCanvas.width=512;signCanvas.height=90;
 const sc=signCanvas.getContext("2d");
 if(sc){
  sc.fillStyle="#243645";sc.fillRect(0,0,512,90);
  sc.fillStyle="#d9ebe9";sc.font="bold 36px Arial";sc.fillText("BARRICADE TEST",20,48);
  sc.font="bold 18px Arial";sc.fillStyle="#9cdbc9";sc.fillText("SHOOT BOARDS / HOLD F TO REBUILD",20,74);
 }
 const signTex=sc?new THREE.CanvasTexture(signCanvas):null;
 if(signTex)signTex.colorSpace=THREE.SRGBColorSpace;
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(2.0,.35),
   new THREE.MeshBasicMaterial({map:signTex,color:0xffffff,side:THREE.DoubleSide}));
 sign.position.set(b.x,b.postHeight+.22,b.z+.165);root.add(sign);
 const boards=[];
 for(let i=0;i<b.boardCount;i++){
  const {center}=boardBounds(i);
  // Alternate the plank face by 6mm so vertically overlapping wood has
  // no coplanar z-fighting shimmer or see-through cracks in the renderer.
  const board=mesh("wood plank "+(i+1),b.openingWidth,b.boardHeight,b.depth,
    b.x,center,b.z+(i%2===0?.006:-.006),plankMat,b.id+"-board-"+i);
  board.userData.barricadeIndex=i;
  const boltGeometry=new THREE.CylinderGeometry(.023,.023,.009,8);
  const boltMat=metal;
  for(const side of [-1,1]){
   const bolt=new THREE.Mesh(boltGeometry,boltMat);
   bolt.rotation.x=Math.PI/2;
   bolt.position.set(side*(half-.085),0,b.depth/2+.006);board.add(bolt);
  }
  boards.push(board);
 }
 const fragments=[];
 const markMaterial=new THREE.MeshBasicMaterial({color:0x1b1612,side:THREE.DoubleSide,
  polygonOffset:true,polygonOffsetFactor:-3,depthWrite:false});
 function markDamage(board,hit){
  // Exact triangle plane normal in plank local coordinates. Parent is the plank.
  board.updateWorldMatrix(true,false);
  const local=board.worldToLocal(hit.point.clone());
  const normal=hit.face.normal.clone().normalize();
  local.addScaledVector(normal,.008);
  const dot=new THREE.Mesh(new THREE.CircleGeometry(.026,12),markMaterial);
  dot.position.copy(local);
  dot.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);
  dot.name="temporary-wood-bullet-hole";board.add(dot);
 }
 function shards(board){
  for(let i=0;i<7;i++){
   const g=new THREE.BoxGeometry(.025+i*.005,.055+i*.012,.017);
   const shard=new THREE.Mesh(g,splinterMat);
   board.getWorldPosition(shard.position);
   shard.position.x+=(Math.random()-.5)*.9;
   shard.position.y+=(Math.random()-.5)*.2;
   shard.position.z+=(Math.random()-.5)*.05;
   scene.add(shard);
   fragments.push({mesh:shard,vx:(Math.random()-.5)*2.4,
      vy:1.0+Math.random()*1.9,vz:(Math.random()-.5)*2.2,age:0});
  }
 }
 function hitBoard(hit){
  const index=hit?.object?.userData?.barricadeIndex;
  if(!Number.isInteger(index)||index<0||!boards[index]?.visible)
   return {handled:false};
  const old=stateRef.current;
  const result=barricadeDamage(old,index);
  if(!result.changed)return {handled:false};
  stateRef.current=result.state;
  if(result.broken){
   boards[index].visible=false;
   shards(boards[index]);
  }else markDamage(boards[index],hit);
  return {handled:true,index:index+1,broken:result.broken,
   remaining:stateRef.current.boards.filter(hp=>hp>0).length};
 }
 function meleeHit(hit){
  const index=hit?.object?.userData?.barricadeIndex;
  if(!Number.isInteger(index)||!boards[index]?.visible)return {handled:false};
  const outcome=barricadeMeleeDamage(stateRef.current);
  if(!outcome.handled)return outcome;
  stateRef.current=outcome.state;
  if(outcome.broken){
   // Destroy ALL six boards in one final physical melee impact, not one
   // arbitrary tiny plank. Both model and collision state update together.
   for(const board of boards){
    if(board.visible){shards(board);board.visible=false;}
   }
  }else{
   // A visible dent on the struck board after each nonfatal punch.
   markDamage(boards[index],hit);
  }
  return {...outcome,remaining:Math.max(0,BARRICADE_MELEE_HITS-outcome.hits)};
 }
 function blastAt(blast){
  if(!blast)return 0;
  let destroyed=0;
  for(let i=0;i<boards.length;i++){
   if(!boards[i].visible)continue;
   const center=boardBounds(i).center;
   const distance=Math.hypot(blast.x-b.x,blast.y-center,blast.z-b.z);
   if(distance>blast.radius)continue;
   const result=barricadeDamage(stateRef.current,i,b.boardHP);
   if(!result.changed)continue;
   stateRef.current=result.state;
   boards[i].visible=false;
   shards(boards[i]);
   destroyed++;
  }
  return destroyed;
 }
 function rebuild(){
  const old=stateRef.current;
  const next=barricadeRebuild(old);
  if(next===old)return false;
  stateRef.current=next;
  for(const board of boards){
   board.visible=true;
   for(const child of [...board.children])
    if(child.name==="temporary-wood-bullet-hole")board.remove(child);
  }
  return true;
 }
 function tick(dt){
  for(let i=fragments.length-1;i>=0;i--){
   const f=fragments[i];f.age+=dt;f.vy-=9.8*dt;
   f.mesh.position.x+=f.vx*dt;f.mesh.position.y+=f.vy*dt;f.mesh.position.z+=f.vz*dt;
   f.mesh.rotation.x+=dt*6;f.mesh.rotation.y+=dt*9;
   if(f.age>.72||f.mesh.position.y<.03){
    scene.remove(f.mesh);f.mesh.geometry.dispose();fragments.splice(i,1);
   }
  }
 }
 return {
  hitBoard,meleeHit,blastAt,rebuild,tick,
  blockers:()=>barricadeBlockers(stateRef.current),
  shootables:()=>[...rawMeshes.filter(m=>m.userData.barricadeIndex===undefined),
    ...boards.filter((m,i)=>stateRef.current.boards[i]>0)],
  near:player=>canInteractWithBarricade(player),
  get state(){return stateRef.current;},
  get status(){return barricadeStatus(stateRef.current);},
  get remaining(){return stateRef.current.boards.filter(hp=>hp>0).length;},
  root,boards
 };
}
