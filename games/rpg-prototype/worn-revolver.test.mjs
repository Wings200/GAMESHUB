import test from 'node:test';
import assert from 'node:assert/strict';
import {createWornRevolver} from './worn-revolver.mjs';
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

test('Revolver forged frame, barrel, lug and walnut tang form a continuous assembly',()=>{
  const r=createWornRevolver(THREE,new Group());
  const barrel=find(r.root,'RevolverContinuousBarrel');
  const crown=find(r.root,'RevolverMuzzleCrown');
  const lug=find(r.root,'RevolverUnderBarrelLug');
  const frame=find(r.root,'RevolverForgedFrame');
  const backstrap=find(r.root,'RevolverGripSteelTang');
  const grip=find(r.root,'RevolverSolidWalnutGrip');
  assert.ok(barrel&&crown&&lug&&frame&&backstrap&&grip);
  assert.ok(overlap(zRange(backstrap),zRange(grip)));
  const bridge=find(r.root,'RevolverFrameGripBridge');
  assert.ok(bridge);
  assert.ok(overlap(zRange(backstrap),zRange(bridge)));
  assert.ok(overlap(zRange(frame),zRange(bridge)));
  assert.ok(find(r.root,'RevolverUpperFrameNeck'));
  assert.ok(find(r.root,'RevolverFullTopStrap'));
  assert.ok(find(r.root,'RevolverLowerFrameWeb'));
  assert.ok(find(r.root,'RevolverAttachedTriggerGuard'));
});
test('Six indexed bore holes and six cartridge heads are on one rotating drum',()=>{
  const r=createWornRevolver(THREE,new Group());
  const spin=r.cylinderSpinGroup;
  assert.equal(r.cylinderYoke.parent,r.root);
  assert.equal(spin.parent,r.cylinderYoke);
  assert.ok(find(spin,'RevolverActualCylinder'));
  assert.equal(spin.children.filter(c=>c.name==='RevolverRealChamberBore').length,6);
  assert.equal(spin.children.filter(c=>c.name==='RevolverCartridgeHead').length,6);
  spin.rotation.z=Math.PI/3;
  assert.equal(spin.rotation.z,Math.PI/3);
});
test('Hammer and ejector actually pivot and slide with the swing-out yoke',()=>{
  const r=createWornRevolver(THREE,new Group());
  assert.equal(r.hammerPivot.parent,r.root);
  assert.ok(find(r.hammerPivot,'RevolverHammerSpur'));
  assert.ok(find(r.hammerPivot,'RevolverHammerCheckering'));
  assert.equal(r.ejectorGroup.parent,r.cylinderSpinGroup);
  assert.ok(r.ejectorGroup.children.length>=7);
  r.cylinderYoke.rotation.y=1.12;
  r.cylinderYoke.position.x=-.27;
  r.ejectorGroup.position.z=.12;
  assert.equal(r.ejectorGroup.position.z,.12);
});
test('Reload shell is hand fed and the six-shooter has no fake detachable magazine',()=>{
  const r=createWornRevolver(THREE,new Group());
  assert.equal(r.reloadAction.name,'RevolverHandLoadedCartridge');
  assert.equal(r.reloadAction.children.length,3);
  assert.equal(r.reloadAction.visible,false);
  assert.equal(r.magazine.children.length,0);
  assert.equal(r.magazineBase.children.length,0);
  assert.ok(r.reloadHand.children.length>=5);
});
test('Front bead and both rear notch posts share the exact ADS tip height',()=>{
  const r=createWornRevolver(THREE,new Group());
  const front=find(r.root,'RevolverFrontSightTip'),
    post=find(r.root,'RevolverFrontSightPost');
  assert.equal(front.position.y+front.geometry.height/2,.275);
  assert.ok(post.position.y+post.geometry.height/2>=
    front.position.y-front.geometry.height/2);
  assert.equal(r.sightLocal.y,.275);
  const rear=r.root.children.filter(c=>c.name==='RevolverRearNotchPost');
  assert.equal(rear.length,2);
  rear.forEach(c=>assert.equal(c.position.y+c.geometry.height/2,.275));
  assert.equal(r.sightLocal.x,0);
});
test('World-held version preserves the physical cylinder and rear barrel connection',()=>{
  const r=createWornRevolver(THREE,new Group(),{thirdPerson:true});
  assert.equal(r.root.scale.x,.76);
  assert.ok(find(r.root,'RevolverContinuousBarrel'));
  assert.ok(find(r.cylinderSpinGroup,'RevolverActualCylinder'));
  assert.equal(r.reloadAction.visible,false);
});

test('W20.33 both visible resting palms and fingers physically clasp wood grip',()=>{
  const r=createWornRevolver(THREE,new Group());
  const wood=find(r.root,'RevolverSolidWalnutGrip');
  const palms=[
    r.gripHand.children.find(c=>c.name==='RevolverStrongHandPalmOnGrip'),
    r.supportHand.children.find(c=>c.name==='RevolverSupportHandPalmOnGrip')
  ];
  assert.equal(palms.length,2);
  palms.forEach(p=>{
    assert.ok(p,'missing hand palm');
    assert.ok(Math.abs(p.position.x)-p.geometry.width/2<
      wood.geometry.width/2,'palm overlaps actual grip across x');
    assert.ok(Math.abs(p.position.z-wood.position.z)<
      (p.geometry.depth+wood.geometry.depth)/2,'palm overlaps grip depth');
    assert.ok(Math.abs(p.position.y-wood.position.y)<
      (p.geometry.height+wood.geometry.height)/2,'palm overlaps grip height');
  });
  assert.equal(r.gripHand.children.filter(c=>
    c.name==='RevolverStrongFingerWrappingGrip').length,4);
  assert.equal(r.supportHand.children.filter(c=>
    c.name==='RevolverSupportFingerWrappingGrip').length,4);
  assert.ok(r.gripHand.children.some(c=>c.name==='RevolverAttachedStrongForearm'));
  assert.ok(r.supportHand.children.some(c=>c.name==='RevolverAttachedSupportForearm'));
  assert.equal(r.supportHand.visible,true);
  assert.equal(r.reloadHand.visible,false);
});
