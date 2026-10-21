import test from "node:test";
import assert from "node:assert/strict";
import {createDroneView} from "./drone-view.js";
import {newDrone,tickDrone} from "./drone-physics.js";
class Vector{
 constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}
 set(x,y,z){this.x=x;this.y=y;this.z=z}
}
class Node{
 constructor(){this.children=[];this.position=new Vector;this.rotation={x:0,y:0,z:0};
  this.visible=true;this.castShadow=false}
 add(child){this.children.push(child)}
}
class Mesh extends Node{constructor(g,m){super();this.geometry=g;this.material=m}}
class Geometry{constructor(...args){this.args=args}}
class Material{constructor(data){this.data=data}}
const THREE={Group:Node,Mesh,BoxGeometry:Geometry,CylinderGeometry:Geometry,
 TorusGeometry:Geometry,MeshStandardMaterial:Material};
test("wheeled drone stays hidden before deployment and uses original camera lens/model",()=>{
 const scene={things:[],add(x){this.things.push(x)}};
 const v=createDroneView(THREE,scene);
 assert.equal(v.root.visible,false);
 assert.equal(scene.things[0],v.root);
 assert.equal(v.wheels.length,4);
 assert.ok(v.root.children.some(m=>m.material?.data?.emissive===0x2bc29e));
 assert.ok(v.lens);
});
test("physical world drone preserves camera target and wheel movement across shots",()=>{
 const scene={add(){}};
 const v=createDroneView(THREE,scene);
 let d=newDrone(2,4,Math.PI/2);
 v.place(d);
 assert.equal(v.root.visible,true);
 assert.equal(v.root.position.x,2);
 assert.equal(v.root.position.z,4);
 let next=tickDrone(d,{forward:1},1/60);
 v.update(next,1/60);
 assert.ok(v.root.position.x<2);
 assert.equal(v.root.rotation.y,Math.PI/2);
 assert.ok(v.wheels.some(w=>w.rotation.x!==0));
 // Drone can disconnect without deleting model, position or charge state.
 assert.equal(next.charges,d.charges);
 assert.equal(v.root.visible,true);
});
