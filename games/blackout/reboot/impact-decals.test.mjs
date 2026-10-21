import test from "node:test";
import assert from "node:assert/strict";
import {createImpactDecals,MAX_DECALS,SURFACE_OFFSET} from "./impact-decals.js";

class V3{
 constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
 clone(){return new V3(this.x,this.y,this.z);}
 transformDirection(){return this;}
 normalize(){const n=Math.hypot(this.x,this.y,this.z)||1;this.x/=n;this.y/=n;this.z/=n;return this;}
 copy(o){this.x=o.x;this.y=o.y;this.z=o.z;return this;}
 addScaledVector(o,s){this.x+=o.x*s;this.y+=o.y*s;this.z+=o.z*s;return this;}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
}
class Quaternion{setFromUnitVectors(a,b){this.normal=b.clone();return this;}}
class Matrix4{compose(p,q,s){this.position=p.clone();this.normal=q.normal.clone();this.scale=s.clone();return this;}}
class InstancedMesh{
 constructor(geometry,material,limit){
  this.geometry=geometry;this.material=material;this.limit=limit;
  this.matrices=[];this.instanceMatrix={setUsage(v){this.usage=v;},needsUpdate:false};
 }
 setMatrixAt(index,matrix){
  this.matrices[index]={position:matrix.position.clone(),
   normal:matrix.normal.clone(),scale:matrix.scale.clone()};
 }
}
class PlaneGeometry{constructor(w,h){this.w=w;this.h=h;}}
class MeshBasicMaterial{constructor(opts){Object.assign(this,opts);}}
class CanvasTexture{constructor(canvas){this.canvas=canvas;}}
const THREE={
 Vector3:V3,Quaternion,Matrix4,InstancedMesh,PlaneGeometry,MeshBasicMaterial,CanvasTexture,
 DynamicDrawUsage:35048,DoubleSide:2,SRGBColorSpace:"srgb"
};
function setup(limit=MAX_DECALS){
 const previous=globalThis.document;
 globalThis.document={createElement:()=>({
  getContext:()=>({
   clearRect(){},createRadialGradient:()=>({addColorStop(){}}),
   fillRect(){},save(){},translate(){},rotate(){},restore(){},
  })
 })};
 const scene={children:[],add(object){this.children.push(object);}};
 const decals=createImpactDecals(THREE,scene,{limit});
 return {decals,scene,restore(){if(previous===undefined)delete globalThis.document;
  else globalThis.document=previous;}};
}
function hit(x=0,z=-6){
 return {point:new V3(x,1.5,z),face:{normal:new V3(0,0,1)},
  object:{matrixWorld:{}}};
}
test("a shot on a wall creates a front-facing visible impact, offset beyond the wall plane",()=>{
 const {decals,scene,restore}=setup(4);
 try{
  assert.equal(decals.mark(hit()),true);
  assert.equal(decals.count,1);
  assert.equal(scene.children.length,1);
  assert.equal(decals.mesh.matrices[0].position.z,-6+SURFACE_OFFSET);
  assert.equal(decals.mesh.matrices[0].normal.z,1);
  assert.ok(decals.mesh.matrices[0].scale.x>=.09);
  assert.equal(decals.mesh.material.depthTest,true);
  assert.equal(decals.mesh.material.depthWrite,false);
  assert.equal(decals.mesh.material.polygonOffset,true);
  assert.equal(decals.mesh.material.side,THREE.DoubleSide);
  assert.equal(decals.mesh.frustumCulled,false);
 }finally{restore();}
});
test("bullet holes do NOT expire after 9 seconds and use a fixed-size ring buffer",()=>{
 const {decals,restore}=setup(3);
 try{
  for(let i=0;i<3;i++)decals.mark(hit(i));
  decals.tick(9999);
  assert.equal(decals.count,3);
  assert.equal(decals.total,3);
  decals.mark(hit(5));
  assert.equal(decals.count,3);
  assert.equal(decals.total,4);
  assert.equal(decals.mesh.matrices[0].position.x,5);
  assert.equal(decals.mesh.instanceMatrix.needsUpdate,true);
  decals.clear();
  assert.equal(decals.count,0);
 }finally{restore();}
});
test("targets despawn on hit, so no bullet hole should be stranded in midair",()=>{
 const {decals,restore}=setup(2);
 try{
  assert.equal(decals.mark(hit(),true),false);
  assert.equal(decals.count,0);
  assert.equal(decals.mark(hit(),false),true);
  assert.equal(decals.count,1);
 }finally{restore();}
});
test("default pool supports hundreds of wall impacts without extra meshes",()=>{
 const {decals,scene,restore}=setup();
 try{
  assert.equal(MAX_DECALS,400);
  for(let i=0;i<420;i++)decals.mark(hit(i*.02));
  assert.equal(decals.count,400);
  assert.equal(decals.total,420);
  assert.equal(scene.children.length,1);
  assert.equal(decals.mesh.matrices[19].position.x,419*.02);
 }finally{restore();}
});
