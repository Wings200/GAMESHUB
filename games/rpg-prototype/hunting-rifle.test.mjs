import test from 'node:test';
import assert from 'node:assert/strict';
import {createHuntingRifle} from './hunting-rifle.mjs';
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
  SphereGeometry:Geometry,MeshStandardMaterial:Geometry,MeshBasicMaterial:Geometry,
  PointLight:Group,AdditiveBlending:1,DoubleSide:2};
const find=(root,name)=>root.children.find(c=>c.name===name);
const zRange=obj=>obj.geometry.profile?
  [Math.min(...obj.geometry.profile.map(p=>p[0])),
    Math.max(...obj.geometry.profile.map(p=>p[0]))]:
  [obj.position.z-obj.geometry.depth/2,obj.position.z+obj.geometry.depth/2];
const overlap=(a,b)=>Math.min(a[1],b[1])>Math.max(a[0],b[0]);
test('Full walnut stock overlaps receiver, wrist reinforcement and buttpad',()=>{
  const rifle=createHuntingRifle(THREE,new Group());
  const receiver=find(rifle.root,'HuntingForgedReceiver'),
    stock=find(rifle.root,'HuntingFullWoodStock'),
    brace=find(rifle.root,'HuntingStockReinforcement'),
    butt=find(rifle.root,'HuntingButtpad');
  assert.ok(receiver&&stock&&brace&&butt);
  assert.ok(overlap(zRange(receiver),zRange(stock)));
  assert.ok(overlap(zRange(stock),zRange(brace)));
  assert.ok(overlap(zRange(stock),zRange(butt)));
  assert.ok(find(rifle.root,'HuntingTriggerGuard'));
});
test('Long barrel, wood forestock and receiver physically intersect',()=>{
  const rifle=createHuntingRifle(THREE,new Group());
  const barrel=find(rifle.root,'HuntingFullLengthBarrel'),
    wood=find(rifle.root,'HuntingBeddedWoodForestock'),
    receiver=find(rifle.root,'HuntingForgedReceiver');
  const len=barrel.geometry.args[2];
  const bRange=[barrel.position.z-len/2,barrel.position.z+len/2];
  assert.ok(overlap(bRange,zRange(receiver)));
  assert.ok(overlap(bRange,zRange(wood)));
  assert.ok(overlap(zRange(wood),zRange(receiver)));
  assert.ok(find(rifle.root,'HuntingReceiverBarrelSeat'));
  assert.ok(find(rifle.root,'HuntingOpenMuzzleRing'));
  assert.equal(rifle.root.children.filter(c=>c.name==='HuntingBarrelBand').length,3);
  assert.equal(rifle.root.children.filter(c=>c.name==='HuntingForestockGripCut').length,10);
});
test('Bolt body, handle stem, rounded knob and cycling hand move together',()=>{
  const rifle=createHuntingRifle(THREE,new Group());
  assert.equal(rifle.boltAssembly.parent,rifle.root);
  assert.equal(rifle.boltAssembly.name,'HuntingRotatingSlidingBolt');
  assert.ok(find(rifle.boltAssembly,'HuntingBoltCylinder'));
  assert.ok(find(rifle.boltAssembly,'HuntingBoltRearCollar'));
  assert.ok(find(rifle.boltAssembly,'HuntingBoltHandleStem'));
  assert.ok(find(rifle.boltAssembly,'HuntingBoltHandleKnob'));
  assert.equal(rifle.boltCycleHand.parent,rifle.boltAssembly);
  assert.equal(rifle.boltCycleHand.visible,false);
  assert.ok(rifle.boltCycleHand.children.length>0);
  assert.ok(rifle.gripHand.children.length>0);
  rifle.boltAssembly.rotation.z=1.08;
  rifle.boltAssembly.position.z=.12;
  assert.equal(rifle.boltAssembly.rotation.z,1.08);
  assert.equal(rifle.boltAssembly.position.z,.12);
});
test('Top shell feed and five-round internal box are actually modeled',()=>{
  const rifle=createHuntingRifle(THREE,new Group());
  assert.ok(find(rifle.root,'HuntingFixedMagazineHousing'));
  assert.ok(find(rifle.root,'HuntingMagazineFloorplate'));
  assert.ok(find(rifle.root,'HuntingReceiverOpenFeedPort'));
  assert.ok(find(rifle.root,'HuntingFeedRamp'));
  assert.equal(rifle.reloadAction.name,'HuntingTopLoadedCartridge');
  assert.equal(rifle.reloadAction.children.length,3);
  assert.equal(rifle.reloadAction.visible,false);
  assert.equal(rifle.magazine.children.length,0,'box is integral; no fake drop magazine');
});
test('Both iron sight references match the real brass bead tip',()=>{
  const rifle=createHuntingRifle(THREE,new Group());
  const front=find(rifle.root,'HuntingFrontSightTip'),
    pedestal=find(rifle.root,'HuntingFrontSightPedestal');
  assert.ok(pedestal.position.y+pedestal.geometry.height/2>=
    front.position.y-front.geometry.height/2,'front bead attaches to post');
  assert.equal(front.position.y+front.geometry.height/2,.290);
  assert.equal(rifle.sightLocal.y,.290);
  const dots=rifle.root.children.filter(c=>c.geometry instanceof BoxGeometry&&
    c.geometry.width===.014&&c.geometry.height===.012&&c.position.z===-.239);
  assert.equal(dots.length,2);
  dots.forEach(c=>assert.equal(c.position.y+c.geometry.height/2,.290));
});
test('World-held rifle reuses real bolt model at same reduced scale',()=>{
  const rifle=createHuntingRifle(THREE,new Group(),{thirdPerson:true});
  assert.equal(rifle.root.scale.x,.68);
  assert.ok(find(rifle.root,'HuntingFullWoodStock'));
  assert.ok(find(rifle.boltAssembly,'HuntingBoltHandleKnob'));
  assert.equal(rifle.reloadAction.visible,false);
});
