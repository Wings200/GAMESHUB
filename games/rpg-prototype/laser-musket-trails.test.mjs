import test from 'node:test';
import assert from 'node:assert/strict';
import {laserTrailOpacity,createLaserTrails} from './laser-musket-trails.mjs';
import {LASER_MUSKET_TUNING} from './laser-musket-mechanics.mjs';

class Vector3{
  constructor(x=0,y=0,z=0){this.set(x,y,z);}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
  copy(v){return this.set(v.x,v.y,v.z);}
  add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this;}
  sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this;}
  multiplyScalar(t){this.x*=t;this.y*=t;this.z*=t;return this;}
  length(){return Math.hypot(this.x,this.y,this.z);}
  setScalar(n){return this.set(n,n,n);}
}
class Group{
  constructor(){this.position=new Vector3();this.scale=new Vector3(1,1,1);
    this.quaternion={setFromUnitVectors(){}};this.children=[];this.visible=true;}
  add(...meshes){this.children.push(...meshes);}
  removeFromParent(){}
}
class Mesh extends Group{constructor(geometry,material){super();this.geometry=geometry;this.material=material;}}
class Material{constructor(options){Object.assign(this,options);}dispose(){}}
class Geometry{dispose(){}}
const THREE={Vector3,Group,Mesh,CylinderGeometry:Geometry,SphereGeometry:Geometry,
  MeshBasicMaterial:Material,AdditiveBlending:2};
test('Beam remains bright for 0.13s, then dissolves smoothly until 0.66s',()=>{
  const {beamSeconds,beamHoldSeconds}=LASER_MUSKET_TUNING;
  assert.equal(beamSeconds,.66);
  assert.equal(beamHoldSeconds,.13);
  assert.equal(laserTrailOpacity(0),1);
  assert.equal(laserTrailOpacity(.10),1);
  assert.ok(laserTrailOpacity(.28)>.20&&laserTrailOpacity(.28)<1);
  assert.ok(laserTrailOpacity(.45)<laserTrailOpacity(.28));
  assert.ok(laserTrailOpacity(.60)<.03);
  assert.equal(laserTrailOpacity(.66),0);
});
test('Persistent beam is fixed in world space, fades, hides and reuses the pool',()=>{
  const scene=new Group();
  const lasers=createLaserTrails(scene,THREE,{capacity:2});
  assert.equal(scene.children.length,2,'pre-allocate, no per-shot mesh churn');
  const source=new Vector3(1,1,1),dest=new Vector3(1,1,-24);
  assert.equal(lasers.spawn(source,dest,6),true);
  assert.equal(lasers.metrics.active,1);
  assert.equal(scene.children[0].visible,true);
  assert.equal(scene.children[0].position.z,-11.5);
  lasers.update(.11);
  assert.equal(scene.children[0].visible,true);
  lasers.update(.20);
  assert.equal(scene.children[0].visible,true);
  const opacity=scene.children[0].children[1].material.opacity;
  assert.ok(opacity>0&&opacity<.92);
  for(let i=0;i<5;i++)lasers.update(.10);
  assert.equal(lasers.metrics.active,0);
  assert.equal(scene.children[0].visible,false);
  assert.equal(lasers.spawn(source,new Vector3(1,1,-4),1),true);
  assert.equal(lasers.spawn(source,new Vector3(1,1,-5),1),true);
  assert.equal(lasers.metrics.active,2);
  lasers.dispose();
});
