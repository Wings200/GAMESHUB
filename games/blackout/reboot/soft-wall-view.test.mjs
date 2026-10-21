import test from "node:test";
import assert from "node:assert/strict";
import {createSoftWallStation} from "./soft-wall-view.js";
import {SOFT_WALL,SOFT_WALL_TOTAL} from "./soft-wall.js";

class V3{
 constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this}
 copy(p){return this.set(p.x,p.y,p.z)}
 clone(){return new V3(this.x,this.y,this.z)}
}
class M4{makeTranslation(x,y,z){this.location=new V3(x,y,z);return this}}
class Node{
 constructor(){this.position=new V3();this.rotation={x:0,y:0,z:0};this.userData={};}
}
class Mesh extends Node{constructor(geometry,material){super();this.geometry=geometry;this.material=material}}
class Instances extends Node{
 constructor(geometry,material,capacity){
  super();this.geometry=geometry;this.material=material;this.capacity=capacity;
  this.instanceMatrix={needsUpdate:false,setUsage(){}};
  this.matrices=[];this.count=capacity;
 }
 setMatrixAt(id,m){this.matrices[id]=m.location.clone()}
}
class Geometry{constructor(...args){this.size=args}dispose(){}}
class Material{constructor(options){this.options=options}}
const THREE={Mesh,InstancedMesh:Instances,BoxGeometry:Geometry,PlaneGeometry:Geometry,
 MeshStandardMaterial:Material,MeshBasicMaterial:Material,
 CanvasTexture:class{constructor(canvas){this.canvas=canvas}},Matrix4:M4,
 DoubleSide:2,DynamicDrawUsage:35048,SRGBColorSpace:"srgb"};
function boot(){
 const previous=globalThis.document;
 const ctx={fillRect(){},fillText(){}};
 globalThis.document={createElement:()=>({getContext:()=>ctx})};
 const scene={objects:[],add(o){this.objects.push(o)},remove(o){this.objects=this.objects.filter(x=>x!==o)}};
 const station=createSoftWallStation(THREE,scene);
 return {station,scene,restore(){
  if(previous===undefined)delete globalThis.document;
  else globalThis.document=previous;
 }};
}
test("instanced geometry renders 640 individually penetrable tiles and permanent posts",()=>{
 const {station,restore}=boot();
 try{
  assert.equal(station.panel.count,SOFT_WALL_TOTAL);
  assert.equal(station.remaining,640);
  assert.equal(station.blockers().length,SOFT_WALL.rows+3);
  assert.equal(station.shootables().length,4);
  assert.equal(station.panel.frustumCulled,false);
  assert.equal(station.panel.userData.physicsObstacleId,SOFT_WALL.id+"-panel");
 }finally{restore()}
});
test("real raycast instance removes correct cell and compacts only still-solid geometry",()=>{
 const {station,restore}=boot();
 try{
  const tile0=station.panel.matrices[0].clone();
  const hit={object:station.panel,instanceId:0,point:tile0};
  const first=station.onHit(hit);
  assert.equal(first.handled,true);
  assert.equal(first.index,0);
  assert.equal(station.panel.count,SOFT_WALL_TOTAL-1);
  assert.equal(station.state.solid[0],0);
  assert.equal(station.panel.matrices[0].x,tile0.x+SOFT_WALL.cell);
  assert.equal(station.remaining,SOFT_WALL_TOTAL-1);
  // The closest remaining instance now points at cell 1, not old cell 0.
  const second=station.onHit({object:station.panel,instanceId:0,
   point:station.panel.matrices[0]});
  assert.equal(second.index,1);
  assert.equal(station.state.solid[1],0);
  assert.equal(station.panel.count,SOFT_WALL_TOTAL-2);
 }finally{restore()}
});
test("non-wall hit cannot punch through gypsum, even if its instance index matches",()=>{
 const {station,restore}=boot();
 try{
  assert.equal(station.onHit({object:{},instanceId:0}).handled,false);
  assert.equal(station.onHit({object:station.panel,instanceId:9999}).handled,false);
  assert.equal(station.panel.count,640);
  assert.equal(station.removed,0);
 }finally{restore()}
});
test("T reset safely rebuilds actual visible cells and collision only when player clear",()=>{
 const {station,restore}=boot();
 try{
  station.onHit({object:station.panel,instanceId:25,point:new V3(7,1,3)});
  assert.equal(station.reset({x:SOFT_WALL.x,z:SOFT_WALL.z}).ok,false);
  assert.equal(station.removed,1);
  assert.equal(station.reset({x:0,z:8}).ok,true);
  assert.equal(station.remaining,SOFT_WALL_TOTAL);
  assert.equal(station.panel.count,SOFT_WALL_TOTAL);
  assert.equal(station.reset({x:0,z:8}).ok,false);
 }finally{restore()}
});
