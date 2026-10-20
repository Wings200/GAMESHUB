import test from "node:test";
import assert from "node:assert/strict";
import {buildBX7Model} from "./weapon-model.js";
import {OPTIC_CENTER,weaponPose} from "./weapon-aim.js";

class Node{
 constructor(){this.children=[];this.position={x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z;}};
  this.rotation={x:0,y:0,z:0};}
 add(child){this.children.push(child);child.parent=this;}
}
class Mesh extends Node{constructor(geometry,material){super();this.geometry=geometry;this.material=material;}}
class Shape{moveTo(){}lineTo(){}closePath(){}}
const Constructor=class{constructor(...args){this.args=args;}};
const MockThree={Mesh,Shape,Group:Node};
for(const key of ["MeshStandardMaterial","MeshPhysicalMaterial","MeshBasicMaterial",
 "BoxGeometry","ExtrudeGeometry","CylinderGeometry","TorusGeometry",
 "SphereGeometry","PlaneGeometry"])MockThree[key]=Constructor;
function allChildren(n){return [n,...n.children.flatMap(allChildren)];}

test("detailed weapon builds as real meshes, with distinct optic and muzzle",()=>{
 const root=new Node();
 const model=buildBX7Model(MockThree,root);
 const meshCount=allChildren(root).filter(x=>x instanceof Mesh).length;
 assert.ok(meshCount>90,"expected a detailed multi-part model, not one solid box");
 assert.equal(model.reticle.parent,root);
 assert.equal(model.flash.parent,root);
 assert.equal(model.flash.visible,false);
 assert.equal(model.reticle.position.x,OPTIC_CENTER.x);
 assert.equal(model.reticle.position.y,OPTIC_CENTER.y);
 assert.equal(model.reticle.position.z,OPTIC_CENTER.z);
 assert.ok(model.reticle.children.length>3,"optic includes actual 3D dot and ring");
});
test("model's optic center coincides with full ADS camera axis",()=>{
 const model=buildBX7Model(MockThree,new Node());
 const pose=weaponPose(1);
 assert.equal(pose.x+model.reticle.position.x,0);
 assert.equal(pose.y+model.reticle.position.y,0);
 assert.equal(pose.pitch,0);
 assert.equal(pose.roll,0);
});
