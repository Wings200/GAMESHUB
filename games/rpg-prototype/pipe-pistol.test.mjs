import test from 'node:test';
import assert from 'node:assert/strict';
import {createPipePistol} from './pipe-pistol.mjs';

class Vector3{
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
  setScalar(v){this.x=this.y=this.z=v;return this;}
}
class Group{
  constructor(){
    this.children=[];this.position=new Vector3();this.rotation=new Vector3();
    this.scale=new Vector3(1,1,1);this.visible=true;this.name='';
  }
  add(object){this.children.push(object);object.parent=this;}
}
class Mesh extends Group{
  constructor(geometry,material){super();this.geometry=geometry;this.material=material;}
}
class Geometry{constructor(...args){this.args=args;}}
class BoxGeometry extends Geometry{
  constructor(width,height,depth){super(width,height,depth);this.width=width;
    this.height=height;this.depth=depth;}
}
class ExtrudeGeometry extends Geometry{}
class Shape{
  constructor(){this.points=[];}
  moveTo(x,y){this.points.push([x,y]);}
  lineTo(x,y){this.points.push([x,y]);}
  closePath(){}
}
class PointLight extends Group{constructor(color,intensity){super();this.intensity=intensity;}}
const THREE={Group,Mesh,Vector3,BoxGeometry,ExtrudeGeometry,Shape,PointLight,
  CylinderGeometry:Geometry,TorusGeometry:Geometry,PlaneGeometry:Geometry,
  SphereGeometry:Geometry,MeshBasicMaterial:Geometry,
  MeshStandardMaterial:Geometry,AdditiveBlending:1,DoubleSide:2};
const find=(root,name)=>root.children.find(o=>o.name===name);
const overlaps=(centerA,sizeA,centerB,sizeB)=>
  Math.abs(centerA-centerB)<(sizeA+sizeB)/2;

test('The pipe pistol has shaped connected housing rather than only loose pipes',()=>{
  const parent=new Group();
  const model=createPipePistol(THREE,parent);
  assert.equal(parent.children[0],model.root);
  assert.ok(find(model.root,'JoinedReceiverShell'));
  assert.ok(find(model.root,'JoinedBarrelShroud'));
  assert.ok(model.root.children.filter(o=>o.geometry instanceof ExtrudeGeometry).length>=4);
  assert.equal(model.slideGroup.name,'PipePistolChargingBolt');
  assert.ok(model.slideGroup.children.length>=3);
});

test('The seated side magazine physically intersects its socket on all axes',()=>{
  const model=createPipePistol(THREE,new Group());
  const socket=find(model.root,'MagazineSocket');
  const mag=model.magazine;
  assert.ok(socket&&mag);
  assert.ok(overlaps(socket.position.x,socket.geometry.width,
    mag.position.x,mag.geometry.width),'magazine must not hover outside socket');
  assert.ok(overlaps(socket.position.y,socket.geometry.height,
    mag.position.y,mag.geometry.height));
  assert.ok(overlaps(socket.position.z,socket.geometry.depth,
    mag.position.z,mag.geometry.depth));
  assert.equal(model.magBaseX,mag.position.x,'reload starts from seated position');
  assert.equal(model.magazine.children.length,4,'grooves stay attached to moving magazine');
});

test('Both iron sight supports meet the weapon instead of floating above it',()=>{
  const model=createPipePistol(THREE,new Group());
  const front=find(model.root,'FrontSightPedestal');
  const rear=find(model.root,'RearSightRail');
  assert.ok(front&&rear);
  const shroud=find(model.root,'JoinedBarrelShroud');
  assert.ok(front.position.y-front.geometry.height/2<.148,
    'front pedestal must meet the top of barrel shroud');
  assert.ok(front.position.z>-.732&&front.position.z<-.26);
  assert.ok(rear.position.y-rear.geometry.height/2<.191,
    'rear rail must meet receiver');
  assert.ok(shroud.geometry instanceof ExtrudeGeometry);
  assert.equal(model.sightLocal.y,.214);
});

test('World-held pistol shares the same connected parts at smaller scale',()=>{
  const model=createPipePistol(THREE,new Group(),{thirdPerson:true});
  assert.equal(model.root.scale.x,.70);
  assert.ok(find(model.root,'JoinedReceiverShell'));
  assert.ok(find(model.root,'MagazineSocket'));
  assert.ok(model.reloadHand);
  assert.ok(model.muzzleFlare);
});
