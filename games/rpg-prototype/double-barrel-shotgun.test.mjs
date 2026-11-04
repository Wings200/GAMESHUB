import test from 'node:test';
import assert from 'node:assert/strict';
import {createDoubleBarrelShotgun} from './double-barrel-shotgun.mjs';

class Vector3{
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
  setScalar(n){this.x=this.y=this.z=n;return this;}
}
class Group{
  constructor(){this.position=new Vector3();this.rotation=new Vector3();
    this.scale=new Vector3(1,1,1);this.children=[];
    this.visible=true;this.userData={};this.name='';}
  add(child){this.children.push(child);child.parent=this;}
}
class Mesh extends Group{constructor(geo,mat){super();this.geometry=geo;this.material=mat;}}
class Geometry{constructor(...args){this.args=args;}}
class BoxGeometry extends Geometry{
  constructor(x,y,z){super(x,y,z);this.width=x;this.height=y;this.depth=z;}
}
class ExtrudeGeometry extends Geometry{
  constructor(shape,options){super(shape,options);this.profile=shape.points;}
}
class Shape{constructor(){this.points=[];}
  moveTo(x,y){this.points.push([x,y]);}
  lineTo(x,y){this.points.push([x,y]);}
  closePath(){}}
const THREE={Group,Mesh,Vector3,BoxGeometry,ExtrudeGeometry,Shape,
  CylinderGeometry:Geometry,TorusGeometry:Geometry,PlaneGeometry:Geometry,
  MeshStandardMaterial:Geometry,MeshBasicMaterial:Geometry,PointLight:Group,
  AdditiveBlending:1,DoubleSide:2};
const find=(group,name)=>group.children.find(child=>child.name===name);
const bounds=mesh=>[Math.min(...mesh.geometry.profile.map(p=>p[0])),
  Math.max(...mesh.geometry.profile.map(p=>p[0]))];
const overlap=(a,b)=>Math.min(a[1],b[1])>Math.max(a[0],b[0]);
test('Receiver, buttstock and tang overlap rather than hovering apart',()=>{
  const gun=createDoubleBarrelShotgun(THREE,new Group());
  const receiver=find(gun.root,'DoubleBarrelSteelReceiver');
  const stock=find(gun.root,'DoubleBarrelFullWoodStock');
  const tang=find(gun.root,'DoubleBarrelStockTang');
  assert.ok(receiver&&stock&&tang);
  assert.ok(overlap(bounds(receiver),bounds(stock)));
  assert.ok(overlap(bounds(stock),bounds(tang)));
  assert.ok(find(gun.root,'DoubleBarrelButtpad'));
  assert.ok(find(gun.root,'DoubleBarrelTopLatch'));
  assert.ok(find(gun.root,'DoubleBarrelLatchThumb'));
  assert.equal(gun.root.children.filter(c=>c.name==='DoubleBarrelHingeCheek').length,2);
});
test('Two real barrel bores move together around the receiver hinge',()=>{
  const gun=createDoubleBarrelShotgun(THREE,new Group());
  assert.equal(gun.hingeGroup.name,'DoubleBarrelHingedBarrels');
  assert.equal(gun.hingeGroup.parent,gun.root);
  assert.equal(gun.hingeGroup.children.filter(c=>c.name==='DoubleBarrelPrimaryBore').length,2);
  assert.equal(gun.hingeGroup.children.filter(c=>c.name==='DoubleBarrelOpenMuzzle').length,2);
  assert.equal(gun.hingeGroup.children.filter(c=>c.name==='DoubleBarrelRibClamp').length,3);
  assert.ok(find(gun.hingeGroup,'DoubleBarrelJoinedTopRib'));
  gun.hingeGroup.rotation.x=-1.02;
  assert.equal(gun.hingeGroup.rotation.x,-1.02);
  assert.equal(gun.shellDisplays.length,2);
  for(const shell of gun.shellDisplays){
    assert.equal(shell.parent,gun.hingeGroup);
    assert.equal(shell.visible,false);
  }
  assert.equal(gun.ejector.parent,gun.hingeGroup);
  assert.equal(gun.reloadAction.parent,gun.root);
  assert.equal(gun.reloadAction.visible,false);
  assert.equal(gun.magazine.children.length,0,'no fake detachable mag');
});
test('Front brass bead touches its post and ADS ray is precisely zeroed',()=>{
  const gun=createDoubleBarrelShotgun(THREE,new Group());
  const front=find(gun.hingeGroup,'DoubleBarrelFrontSightTip');
  const pedestal=find(gun.hingeGroup,'DoubleBarrelFrontSightPedestal');
  assert.ok(front&&pedestal);
  assert.ok(pedestal.position.y+pedestal.geometry.height/2>=
    front.position.y-front.geometry.height/2);
  const top=gun.hingeGroup.position.y+front.position.y+front.geometry.height/2;
  assert.ok(Math.abs(top-.270)<1e-8);
  assert.equal(gun.sightLocal.y,.270);
  const rear=gun.root.children.filter(c=>c.geometry instanceof BoxGeometry&&
    c.geometry.width===.015&&c.geometry.height===.012&&c.position.z===.204);
  assert.equal(rear.length,2);
  rear.forEach(c=>assert.ok(Math.abs(c.position.y+c.geometry.height/2-.270)<1e-8));
});
test('Third-person held shotgun uses the same hinged model and smaller scale',()=>{
  const gun=createDoubleBarrelShotgun(THREE,new Group(),{thirdPerson:true});
  assert.equal(gun.root.scale.x,.68);
  assert.equal(gun.hingeGroup.children.filter(c=>c.name==='DoubleBarrelPrimaryBore').length,2);
  assert.equal(gun.shellDisplays.length,2);
  assert.equal(gun.reloadAction.visible,false);
});
