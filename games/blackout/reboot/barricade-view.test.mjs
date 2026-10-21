import test from "node:test";
import assert from "node:assert/strict";
import {createBarricadeStation} from "./barricade-view.js";
import {BARRICADE} from "./barricade.js";

class V3{
 constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
 copy(p){return this.set(p.x,p.y,p.z)}
 clone(){return new V3(this.x,this.y,this.z)}
 addScaledVector(v,s){this.x+=v.x*s;this.y+=v.y*s;this.z+=v.z*s;return this}
 normalize(){const l=Math.hypot(this.x,this.y,this.z)||1;return this.set(this.x/l,this.y/l,this.z/l)}
}
class N{
 constructor(){this.children=[];this.position=new V3;this.rotation={x:0,y:0,z:0};
  this.quaternion={setFromUnitVectors(){return this}};this.userData={};this.visible=true;}
 add(n){n.parent=this;this.children.push(n)}
 remove(n){this.children=this.children.filter(c=>c!==n);n.parent=null}
 updateWorldMatrix(){}
 getWorldPosition(out){let n=this,x=0,y=0,z=0;while(n){x+=n.position.x;y+=n.position.y;z+=n.position.z;n=n.parent}return out.set(x,y,z)}
 worldToLocal(p){let n=this;while(n){p.x-=n.position.x;p.y-=n.position.y;p.z-=n.position.z;n=n.parent}return p}
}
class M extends N{constructor(geometry,material){super();this.geometry=geometry;this.material=material}}
class Geo{constructor(...a){this.args=a}dispose(){}}
class Mat{constructor(x){this.settings=x}}
const THREE={Group:N,Mesh:M,BoxGeometry:Geo,CylinderGeometry:Geo,
 PlaneGeometry:Geo,CircleGeometry:Geo,MeshStandardMaterial:Mat,
 MeshBasicMaterial:Mat,CanvasTexture:class{constructor(canvas){this.canvas=canvas}},
 Vector3:V3,SRGBColorSpace:"srgb",DoubleSide:2};
function boot(){
 const old=globalThis.document;
 const ctx={fillRect(){},beginPath(){},moveTo(){},bezierCurveTo(){},stroke(){},fillText(){}};
 globalThis.document={createElement:()=>({getContext:()=>ctx})};
 const scene=new N;
 const station=createBarricadeStation(THREE,scene);
 return {station,scene,done(){
  if(old===undefined)delete globalThis.document;else globalThis.document=old;
 }};
}
test("builds six independent hittable wooden meshes, plus solid frame and sign",()=>{
 const {station,scene,done}=boot();
 try{
  assert.equal(station.boards.length,6);
  assert.equal(station.shootables().length,9);
  assert.equal(station.blockers().length,9);
  assert.equal(scene.children.length,1);
  for(let i=0;i<6;i++){
   assert.equal(station.boards[i].userData.barricadeIndex,i);
   assert.equal(station.boards[i].visible,true);
  }
  assert.equal(station.status,"INTACT");
 }finally{done()}
});
test("two bullet strikes: wood mark is attached to plank, then plank vanishes from collision/raycast",()=>{
 const {station,done}=boot();
 try{
  const board=station.boards[0];
  const point=board.getWorldPosition(new V3);
  point.z+=BARRICADE.depth/2;
  const hit={object:board,point,face:{normal:new V3(0,0,1)}};
  const baseChildCount=board.children.length;
  const once=station.hitBoard(hit);
  assert.equal(once.handled,true);
  assert.equal(once.broken,false);
  assert.equal(board.children.length,baseChildCount+1);
  assert.ok(board.children.some(c=>c.name==="temporary-wood-bullet-hole"));
  const second=station.hitBoard(hit);
  assert.equal(second.handled,true);
  assert.equal(second.broken,true);
  assert.equal(board.visible,false);
  assert.equal(station.shootables().includes(board),false);
  assert.equal(station.blockers().some(o=>o.id.endsWith("-board-0")),false);
  assert.equal(station.remaining,5);
  assert.equal(station.hitBoard(hit).handled,false);
  station.tick(.016);
 }finally{done()}
});
test("repair restores every plank and removes old bullet holes from the wooden model",()=>{
 const {station,done}=boot();
 try{
  const board=station.boards[4];
  const point=board.getWorldPosition(new V3);point.z+=BARRICADE.depth/2;
  const hit={object:board,point,face:{normal:new V3(0,0,1)}};
  station.hitBoard(hit);station.hitBoard(hit);
  assert.equal(station.near({x:BARRICADE.x,z:BARRICADE.z+1.6}),true);
  assert.equal(station.rebuild(),true);
  assert.equal(station.rebuild(),false);
  assert.equal(station.status,"INTACT");
  assert.equal(station.shootables().length,9);
  assert.equal(station.blockers().length,9);
  assert.equal(board.visible,true);
  assert.equal(board.children.filter(x=>x.name==="temporary-wood-bullet-hole").length,0);
 }finally{done()}
});
