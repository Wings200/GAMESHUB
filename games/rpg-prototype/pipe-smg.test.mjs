import test from 'node:test';
import assert from 'node:assert/strict';
import {createPipeSMG} from './pipe-smg.mjs';
class Vec{
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
  setScalar(n){this.x=this.y=this.z=n;return this;}
}
class Group{
  constructor(){this.position=new Vec();this.rotation=new Vec();this.scale=new Vec(1,1,1);
    this.children=[];this.name='';this.visible=true;this.userData={};}
  add(...children){for(const child of children){this.children.push(child);child.parent=this;}}
}
class Mesh extends Group{constructor(geometry,material){super();this.geometry=geometry;this.material=material;}}
class Geometry{constructor(...args){this.args=args;}}
class BoxGeometry extends Geometry{
  constructor(width,height,depth){super(width,height,depth);
    this.width=width;this.height=height;this.depth=depth;}
}
class ExtrudeGeometry extends Geometry{constructor(shape,opts){super(shape,opts);this.profile=shape.points;}}
class Shape{
  constructor(){this.points=[];}
  moveTo(x,y){this.points.push([x,y]);}
  lineTo(x,y){this.points.push([x,y]);}
  closePath(){}}
const THREE={Group,Mesh,Vector3:Vec,BoxGeometry,ExtrudeGeometry,Shape,
  CylinderGeometry:Geometry,TorusGeometry:Geometry,PlaneGeometry:Geometry,
  SphereGeometry:Geometry,CapsuleGeometry:Geometry,MeshStandardMaterial:Geometry,MeshBasicMaterial:Geometry,
  PointLight:Group,AdditiveBlending:1,DoubleSide:2};
const find=(root,name)=>root.children.find(c=>c.name===name);
const zRange=obj=>obj.geometry.profile?
  [Math.min(...obj.geometry.profile.map(p=>p[0])),
    Math.max(...obj.geometry.profile.map(p=>p[0]))]:
  [obj.position.z-obj.geometry.depth/2,obj.position.z+obj.geometry.depth/2];
const overlap=(a,b)=>Math.min(a[1],b[1])>Math.max(a[0],b[0]);


test('Welded receiver, long barrel and wood forearm overlap as one gun',()=>{
  const r=createPipeSMG(THREE,new Group());
  const receiver=find(r.root,'SMGWeldedReceiverShell');
  const fore=find(r.root,'SMGConnectedWoodForearm');
  const barrel=find(r.root,'SMGContinuousGunBarrel');
  const seat=find(r.root,'SMGWeldedBarrelCollar');
  assert.ok(receiver&&fore&&barrel&&seat);
  assert.ok(overlap(zRange(receiver),zRange(fore)));
  const len=barrel.geometry.args[2];
  const br=[barrel.position.z-len/2,barrel.position.z+len/2];
  assert.ok(overlap(zRange(receiver),br));
  assert.ok(overlap(zRange(fore),br));
  assert.ok(find(r.root,'SMGThreadedMuzzle'));
  assert.ok(find(r.root,'SMGOpenMuzzleRing'));
  assert.equal(r.root.children.filter(c=>c.name==='SMGBarrelHeatBand').length,3);
});
test('Worn stock and trigger grip connect through the steel rear bridge',()=>{
  const r=createPipeSMG(THREE,new Group());
  const receiver=find(r.root,'SMGWeldedReceiverShell');
  const bridge=find(r.root,'SMGRearReceiverBridge');
  const stock=find(r.root,'SMGStockSupportRail');
  const grip=find(r.root,'SMGContinuousPistolGrip');
  assert.ok(bridge&&stock&&grip);
  assert.ok(overlap(zRange(receiver),zRange(bridge)));
  assert.ok(overlap(zRange(bridge),zRange(stock)));
  assert.ok(overlap(zRange(bridge),zRange(grip)));
  assert.ok(find(r.root,'SMGAttachedButtstock'));
  assert.ok(find(r.root,'SMGButtpad'));
  assert.ok(find(r.root,'SMGConnectedTriggerGuard'));
});
test('Real 30-round side magazine mounts through a receiver dock',()=>{
  const r=createPipeSMG(THREE,new Group());
  const mag=r.magazine;
  assert.equal(mag.parent,r.root);
  const body=find(mag,'SMGThirtyRoundMagazineBody');
  const floor=find(mag,'SMGRealMagazineFloorplate');
  const neck=find(mag,'SMGMagazineNeck');
  assert.ok(body&&floor&&neck);
  const dock=find(r.root,'SMGConnectedMagazineDock');
  assert.ok(dock);
  const magRight=mag.position.x+body.position.x+body.geometry.width/2;
  const dockLeft=dock.position.x-dock.geometry.width/2;
  assert.ok(magRight>dockLeft,'magazine enters fixed dock');
  assert.equal(r.magBaseX,-.182);
  assert.equal(mag.children.filter(c=>c.name==='SMGMagazineWitnessMark').length,7);
});
test('SMG movable bolt and charging handle are attached to one cycling group',()=>{
  const r=createPipeSMG(THREE,new Group());
  assert.equal(r.slideGroup.parent,r.root);
  assert.ok(find(r.slideGroup,'SMGMovingBoltCarrier'));
  assert.ok(find(r.slideGroup,'SMGConnectedChargingHandle'));
  r.slideGroup.position.z=.145;
  assert.equal(r.slideGroup.position.z,.145);
});
test('Both hands visibly touch wood and have wrapping fingers and forearms',()=>{
  const r=createPipeSMG(THREE,new Group());
  const grip=find(r.root,'SMGContinuousPistolGrip');
  const fore=find(r.root,'SMGConnectedWoodForearm');
  const hands=[
    [r.gripHand.children.find(c=>c.name==='SMGRightPalmOnPistolGrip'),grip],
    [r.supportHand.children.find(c=>c.name==='SMGLeftPalmOnWoodForearm'),fore]
  ];
  for(const [p,wood] of hands){
    assert.ok(p);
    assert.ok(Math.abs(p.position.x-wood.position.x)<
      (p.geometry.width+wood.geometry.width)/2);
    assert.ok(Math.abs(p.position.y-wood.position.y)<
      (p.geometry.height+wood.geometry.height)/2);
    assert.ok(Math.abs(p.position.z-wood.position.z)<
      (p.geometry.depth+wood.geometry.depth)/2);
  }
  assert.equal(r.gripHand.children.filter(c=>c.name==='SMGGripFinger').length,4);
  assert.equal(r.supportHand.children.filter(c=>c.name==='SMGForearmFinger').length,4);
  assert.ok(r.gripHand.children.some(c=>c.name==='SMGAttachedRightForearm'));
  assert.ok(r.supportHand.children.some(c=>c.name==='SMGAttachedLeftForearm'));
  assert.equal(r.reloadHand.visible,false);
});
test('Slim irons have matching tip height and clear centerline',()=>{
  const r=createPipeSMG(THREE,new Group());
  const front=find(r.root,'SMGFrontSightTip'),post=find(r.root,'SMGFrontSightSupport');
  assert.ok(Math.abs(front.position.y+front.geometry.height/2-.285)<1e-10);
  assert.ok(post.position.y+post.geometry.height/2>=front.position.y-front.geometry.height/2);
  assert.equal(r.sightLocal.y,.285);
  assert.equal(r.sightLocal.z,.029);
  const rear=r.root.children.filter(c=>c.name==='SMGRearNotchPost');
  assert.equal(rear.length,2);
  rear.forEach(c=>assert.ok(Math.abs(c.position.y+c.geometry.height/2-.285)<1e-10));
});
test('World-held SMG keeps magazine, bolt, and wood stock without phantom arms',()=>{
  const r=createPipeSMG(THREE,new Group(),{thirdPerson:true});
  assert.equal(r.root.scale.x,.70);
  assert.ok(find(r.root,'SMGAttachedButtstock'));
  assert.ok(find(r.magazine,'SMGThirtyRoundMagazineBody'));
  assert.ok(find(r.slideGroup,'SMGMovingBoltCarrier'));
  assert.equal(r.reloadHand.children.length,0);
  assert.equal(r.reloadHand.visible,false);
});
