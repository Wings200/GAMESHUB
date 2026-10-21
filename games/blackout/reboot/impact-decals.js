// BLACKOUT V0.7.4 — box-local persistent impacts, wall decal fallback.
// One instanced mesh / shared procedural alpha texture (not one render draw call
// per bullet). Recycles oldest after MAX_DECALS; there is NO lifetime expiry.
// Offset + depth bias prevent z-fighting against actual wall/box/floor surfaces.
export const MAX_DECALS=400;
export const SURFACE_OFFSET=.008;

function bulletTexture(THREE){
 const canvas=document.createElement("canvas");
 canvas.width=canvas.height=128;
 const g=canvas.getContext("2d");
 if(!g)return null;
 const cx=64,cy=64;
 g.clearRect(0,0,128,128);
 const soot=g.createRadialGradient(cx,cy,6,cx,cy,57);
 soot.addColorStop(0,"rgba(2,6,8,1)");
 soot.addColorStop(.22,"rgba(3,8,12,1)");
 soot.addColorStop(.29,"rgba(17,23,27,.98)");
 soot.addColorStop(.36,"rgba(9,15,19,.90)");
 soot.addColorStop(.41,"rgba(128,145,154,.58)");
 soot.addColorStop(.51,"rgba(23,30,35,.51)");
 soot.addColorStop(.70,"rgba(15,21,26,.20)");
 soot.addColorStop(.95,"rgba(14,20,24,0)");
 g.fillStyle=soot;
 g.fillRect(0,0,128,128);
 // An irregular chipped edge makes the hole readable on pale surfaces,
 // without the oversized black circles of earlier prototypes.
 let state=0x41acbbcd;
 function random(){state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;}
 for(let i=0;i<24;i++){
  const angle=(i/24)*Math.PI*2+(random()-.5)*.15;
  const radius=18+random()*11;
  const x=cx+Math.cos(angle)*radius,y=cy+Math.sin(angle)*radius;
  g.save();g.translate(x,y);g.rotate(angle);
  g.fillStyle=i%3===0?"rgba(199,208,213,.45)":"rgba(5,12,16,.77)";
  g.fillRect(-1.5,-.8,2+random()*5,1+random()*2);
  g.restore();
 }
 const tex=new THREE.CanvasTexture(canvas);
 tex.colorSpace=THREE.SRGBColorSpace;
 tex.anisotropy=2;
 return tex;
}

export function createImpactDecals(THREE,scene,{limit=MAX_DECALS}={}){
 const maximum=Math.max(1,Math.floor(limit));
 const geometry=new THREE.PlaneGeometry(1,1);
 const texture=bulletTexture(THREE);
 const material=new THREE.MeshBasicMaterial({
  map:texture||null,
  color:texture?0xffffff:0x081218,
  transparent:Boolean(texture),alphaTest:texture?0.035:0,
  depthTest:true,depthWrite:false,
  side:THREE.DoubleSide,
  polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,
  toneMapped:false,
 });
 const decals=new THREE.InstancedMesh(geometry,material,maximum);
 decals.count=0;
 decals.frustumCulled=false; // instances can be anywhere in the range
 decals.renderOrder=2;
 decals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 decals.name="persistent-surface-bullet-holes";
 scene.add(decals);
 // The shared scene-space instance pool works for walls, but in the recorded
 // test BOX-ONE received hits without showing marks. Boxes now own a small
 // dedicated instance pool IN THEIR LOCAL COORDINATE SYSTEM. This guarantees
 // their front/side/top face impacts follow the actual struck mesh transform.
 const boxPools=new Map(), BOX_CAPACITY=160;
 function poolForBox(surface){
  let entry=boxPools.get(surface);
  if(entry)return entry;
  const mesh=new THREE.InstancedMesh(geometry,material,BOX_CAPACITY);
  mesh.count=0;
  mesh.frustumCulled=false;
  mesh.renderOrder=3;
  mesh.name="box-face-bullet-holes";
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  surface.add(mesh);
  entry={mesh,cursor:0,total:0};
  boxPools.set(surface,entry);
  return entry;
 }
 const up=new THREE.Vector3(0,0,1);
 const quat=new THREE.Quaternion();
 const matrix=new THREE.Matrix4();
 const scale=new THREE.Vector3();
 const pos=new THREE.Vector3();
 let cursor=0,total=0,wallTotal=0,lastFace="NONE",lastObjectId="NONE";
 function mark(hit,target=false){
  // Target dummies despawn on hit: a world-stuck decal would float when they do.
  if(target||!hit?.point||!hit?.object||!hit.face?.normal)return false;
  const surface=hit.object;
  const objectId=surface.userData?.physicsObstacleId||"SURFACE";
  const isBox=objectId.startsWith("box-");
  lastObjectId=objectId;
  // Three.js raycaster points are WORLD coordinates, but the triangle normal
  // and the box's geometry dimensions are in the MESH'S LOCAL coordinates.
  // Compute decal position/rotation locally then transform the WHOLE plane
  // back to world space. Mixing these coordinate spaces caused the edge
  // clipping/orientation bug seen in the user's screenshot.
  surface.updateWorldMatrix?.(true,false);
  const normal=hit.face.normal.clone().normalize();
  if(![normal.x,normal.y,normal.z].every(Number.isFinite))return false;
  pos.copy(hit.point);
  surface.worldToLocal(pos);
  const size=isBox?.100+(total%4)*.005:.068+(total%4)*.004;
  const components=["x","y","z"];
  const facing=components.reduce((a,b)=>
    Math.abs(normal[b])>Math.abs(normal[a])?b:a,"x");
  lastFace=(facing==="y"?(normal.y>0?"TOP":"BOTTOM"):
    facing==="x"?(normal.x>0?"RIGHT":"LEFT"):
    normal.z>0?"FRONT":"BACK");
  // Keep the entire mark inside the real mesh face. Decals centered at
  // the top/side edge previously extended into thin air, then depth tests
  // clipped part of the mark and made it look rotated above the wall.
  const geometry=surface.geometry;
  if(geometry&&!geometry.boundingBox)geometry.computeBoundingBox?.();
  const bounds=geometry?.boundingBox;
  if(bounds){
    pos[facing]=normal[facing]>=0?bounds.max[facing]:bounds.min[facing];
    for(const axis of components){
      if(axis===facing)continue;
      const min=bounds.min[axis]+size*.5+.003;
      const max=bounds.max[axis]-size*.5-.003;
      pos[axis]=Math.max(min,Math.min(max,pos[axis]));
      if(max<min)pos[axis]=(bounds.min[axis]+bounds.max[axis])*.5;
    }
  }
  // Apply bias in local face coordinates. The resulting instance world
  // transform matches exactly the collision mesh's translation and rotation.
  pos.addScaledVector(normal,SURFACE_OFFSET);
  quat.setFromUnitVectors(up,normal);
  scale.set(size,size,1);
  matrix.compose(pos,quat,scale);
  if(isBox){
   // No world-space conversion for box marks. The pool is a child of the
   // box mesh, so Three's renderer uses its exact parent matrix.
   const pool=poolForBox(surface);
   pool.mesh.setMatrixAt(pool.cursor,matrix);
   pool.cursor=(pool.cursor+1)%BOX_CAPACITY;
   pool.total++;
   pool.mesh.count=Math.min(pool.total,BOX_CAPACITY);
   pool.mesh.instanceMatrix.needsUpdate=true;
  }else{
   matrix.premultiply(surface.matrixWorld);
   decals.setMatrixAt(cursor,matrix);
   cursor=(cursor+1)%maximum;
   wallTotal++;
   decals.count=Math.min(wallTotal,maximum);
   decals.instanceMatrix.needsUpdate=true;
  }
  total++;
  return true;
 }
 return {
  mark,
  tick(){/* Deliberately permanent. No 9-second timeout or per-frame scans. */},
  clear(){
   cursor=total=wallTotal=0;decals.count=0;decals.instanceMatrix.needsUpdate=true;
   for(const p of boxPools.values()){
    p.cursor=p.total=0;p.mesh.count=0;p.mesh.instanceMatrix.needsUpdate=true;
   }
  },
  get count(){return decals.count+
    [...boxPools.values()].reduce((n,p)=>n+p.mesh.count,0);},
  get total(){return total;},
  get lastFace(){return lastFace;},
  get lastObjectId(){return lastObjectId;},
  get boxPoolCount(){return boxPools.size;},
  getBoxCount(id){
   for(const [surface,p] of boxPools){
    if(surface.userData?.physicsObstacleId===id)return p.mesh.count;
   }
   return 0;
  },
  mesh:decals,
 };
}
