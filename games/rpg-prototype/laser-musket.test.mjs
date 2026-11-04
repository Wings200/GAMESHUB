import test from 'node:test';
import assert from 'node:assert/strict';
import {createLaserMusket} from './laser-musket.mjs';

class Vector3{
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
  setScalar(n){this.x=this.y=this.z=n;return this;}
}
class Group{
  constructor(){this.position=new Vector3();this.rotation=new Vector3();
    this.scale=new Vector3(1,1,1);this.children=[];this.visible=true;
    this.userData={};this.name='';}
  add(mesh){this.children.push(mesh);mesh.parent=this;}
}
class Mesh extends Group{constructor(geometry,material){super();this.geometry=geometry;this.material=material;}}
class Geometry{constructor(...args){this.args=args;}}
class BoxGeometry extends Geometry{constructor(x,y,z){super(x,y,z);this.width=x;this.height=y;this.depth=z;}}
class ExtrudeGeometry extends Geometry{constructor(shape,opts){super(shape,opts);this.profile=shape.points;}}
class Shape{
  constructor(){this.points=[];}
  moveTo(x,y){this.points.push([x,y]);}
  lineTo(x,y){this.points.push([x,y]);}
  closePath(){}
}
const THREE={Group,Mesh,Vector3,BoxGeometry,ExtrudeGeometry,Shape,
  CylinderGeometry:Geometry,TorusGeometry:Geometry,PlaneGeometry:Geometry,
  MeshStandardMaterial:Geometry,MeshBasicMaterial:Geometry,PointLight:Group,
  AdditiveBlending:1,DoubleSide:2};
const find=(root,name)=>root.children.find(x=>x.name===name);
const range=p=>[Math.min(...p.map(x=>x[0])),Math.max(...p.map(x=>x[0]))];
const overlap=(a,b)=>Math.min(a[1],b[1])>Math.max(a[0],b[0]);
test('Musket is one physically overlapping rifle, with no free-floating barrel',()=>{
  const gun=createLaserMusket(THREE,new Group());
  const receiver=find(gun.root,'LaserMusketReceiver');
  const cage=find(gun.root,'LaserMusketCoilCage');
  const stock=find(gun.root,'LaserMusketFullStock');
  const tang=find(gun.root,'LaserMusketStockTang');
  assert.ok(receiver&&cage&&stock&&tang);
  assert.ok(overlap(range(receiver.geometry.profile),range(cage.geometry.profile)));
  assert.ok(overlap(range(receiver.geometry.profile),range(stock.geometry.profile)));
  assert.ok(overlap(range(stock.geometry.profile),range(tang.geometry.profile)));
  assert.ok(find(gun.root,'LaserMusketReceiverBridge'));
  assert.ok(find(gun.root,'LaserMusketRustedMuzzleSleeve'));
  assert.ok(find(gun.root,'LaserMusketRedEmitter'));
  assert.equal(gun.chargeRings.length,8);
  assert.equal(gun.root.children.filter(x=>x.name==='LaserMusketCopperCageRail').length,2);
});
test('Actual rotary crank carries its wheel, handle and gripping hand',()=>{
  const gun=createLaserMusket(THREE,new Group());
  const crank=gun.crankPivot;
  assert.equal(crank.name,'LaserMusketRotatingCrank');
  assert.ok(find(crank,'LaserMusketHandCrankWheel'));
  assert.ok(find(crank,'LaserMusketCrankGrip'));
  assert.ok(find(crank,'LaserMusketCrankHandleJoint'));
  assert.equal(gun.chargeHand.parent,crank);
  assert.ok(gun.chargeHand.children.length>=5,'hand holds the turning crank');
  assert.equal(gun.chargeHand.visible,false);
  assert.ok(find(gun.root,'LaserMusketFusionCellPack'));
  assert.equal(gun.magazine.position.y,gun.magBaseY);
  assert.equal(gun.magazineBase.position.y,gun.magFootY);
});
test('Brass iron-sight tips are level and third-person frame has same details',()=>{
  const gun=createLaserMusket(THREE,new Group());
  const tip=find(gun.root,'LaserMusketFrontSightTip');
  const frontBase=find(gun.root,'LaserMusketFrontSightSupport');
  assert.ok(frontBase.position.y+frontBase.geometry.height/2>=tip.position.y-tip.geometry.height/2,
    'the brass front sight tip must touch the front post, not float above it');
  assert.equal(tip.position.y+tip.geometry.height/2,.263);
  const rear=gun.root.children.filter(mesh=>
    mesh.geometry instanceof BoxGeometry&&mesh.geometry.width===.016&&
    mesh.geometry.height===.012&&mesh.position.z===.229);
  assert.equal(rear.length,2);
  for(const dot of rear)assert.equal(dot.position.y+dot.geometry.height/2,.263);
  assert.equal(gun.sightLocal.y,.263);
  const world=createLaserMusket(THREE,new Group(),{thirdPerson:true});
  assert.equal(world.root.scale.x,.68);
  assert.ok(find(world.root,'LaserMusketHandCrankWheel')===undefined,
    'wheel correctly belongs to the rotating crank socket');
  assert.ok(find(world.crankPivot,'LaserMusketHandCrankWheel'));
  assert.ok(find(world.root,'LaserMusketChargeCrystal'));
});
