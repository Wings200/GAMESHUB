// BLACKOUT V0.7.2 — persistent, surface-facing impact decals.
// One instanced mesh / shared procedural alpha texture (not one render draw call
// per bullet). Recycles oldest after MAX_DECALS; there is NO lifetime expiry.
// Offset + depth bias prevent z-fighting against actual wall/box/floor surfaces.
export const MAX_DECALS=400;
export const SURFACE_OFFSET=.014;

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
 const up=new THREE.Vector3(0,0,1);
 const quat=new THREE.Quaternion();
 const matrix=new THREE.Matrix4();
 const scale=new THREE.Vector3();
 const pos=new THREE.Vector3();
 let cursor=0,total=0;
 function mark(hit,target=false){
  // Target dummies despawn on hit: a world-stuck decal would float when they do.
  if(target||!hit?.point||!hit?.object)return false;
  const normal=hit.face?.normal?.clone()
    .transformDirection(hit.object.matrixWorld).normalize()||
    new THREE.Vector3(0,0,1);
  if(!Number.isFinite(normal.x)||!Number.isFinite(normal.y)||
     !Number.isFinite(normal.z))return false;
  // Visible from the hit surface, NOT coplanar with the wall's texture.
  pos.copy(hit.point).addScaledVector(normal,SURFACE_OFFSET);
  quat.setFromUnitVectors(up,normal);
  const size=.090+(total%5)*.006;
  scale.set(size,size,1);
  matrix.compose(pos,quat,scale);
  decals.setMatrixAt(cursor,matrix);
  cursor=(cursor+1)%maximum;
  total++;
  decals.count=Math.min(total,maximum);
  decals.instanceMatrix.needsUpdate=true;
  return true;
 }
 return {
  mark,
  tick(){/* Deliberately permanent. No 9-second timeout or per-frame scans. */},
  clear(){cursor=total=0;decals.count=0;decals.instanceMatrix.needsUpdate=true;},
  get count(){return decals.count;},
  get total(){return total;},
  mesh:decals,
 };
}
