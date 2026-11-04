import test from 'node:test';
import assert from 'node:assert/strict';
import {createPumpActionShotgun} from './pump-action-shotgun.mjs';
class Vec{
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
  setScalar(n){this.x=this.y=this.z=n;return this;}
}
class Group{
  constructor(){this.position=new Vec();this.rotation=new Vec();
    this.scale=new Vec(1,1,1);this.children=[];this.name='';
    this.visible=true;this.userData={};}
  add(...children){for(const child of children){this.children.push(child);child.parent=this;}}
}
class Mesh extends Group{constructor(geometry,material){super();this.geometry=geometry;this.material=material;}}
class Geometry{constructor(...args){this.args=args;}}
class BoxGeometry extends Geometry{
  constructor(width,height,depth){super(width,height,depth);
    this.width=width;this.height=height;this.depth=depth;}
}
class ExtrudeGeometry extends Geometry{constructor(shape,opt){super(shape,opt);this.profile=shape.points;}}
class Shape{
  constructor(){this.points=[];}
  moveTo(x,y){this.points.push([x,y]);}
  lineTo(x,y){this.points.push([x,y]);}
  closePath(){}}
const THREE={Group,Mesh,Vector3:Vec,BoxGeometry,ExtrudeGeometry,Shape,
  CylinderGeometry:Geometry,TorusGeometry:Geometry,PlaneGeometry:Geometry,
  MeshStandardMaterial:Geometry,MeshBasicMaterial:Geometry,PointLight:Group,
  AdditiveBlending:1,DoubleSide:2};
const find=(group,name)=>group.children.find(x=>x.name===name);
const zRange=mesh=>mesh.geometry.profile?
  [Math.min(...mesh.geometry.profile.map(p=>p[0])),
    Math.max(...mesh.geometry.profile.map(p=>p[0]))]:
  [mesh.position.z-mesh.geometry.depth/2,mesh.position.z+mesh.geometry.depth/2];
const overlaps=(a,b)=>Math.min(a[1],b[1])>Math.max(a[0],b[0]);
test('Shotgun receiver and full stock connect without a floating buttpad',()=>{
  const gun=createPumpActionShotgun(THREE,new Group());
  const receiver=find(gun.root,'PumpForgedReceiver');
  const stock=find(gun.root,'PumpFullWoodStock');
  const tang=find(gun.root,'PumpStockTang');
  const butt=find(gun.root,'PumpButtpad');
  assert.ok(receiver&&stock&&tang&&butt);
  assert.ok(overlaps(zRange(receiver),zRange(stock)));
  assert.ok(overlaps(zRange(stock),zRange(tang)));
  assert.ok(overlaps(zRange(stock),zRange(butt)));
  assert.ok(find(gun.root,'PumpTriggerGuard'));
});
test('Stationary barrel, tube and bridges are physically one assembly',()=>{
  const gun=createPumpActionShotgun(THREE,new Group());
  const barrel=find(gun.root,'PumpMainBarrel');
  const tube=find(gun.root,'PumpFixedMagazineTube');
  const receiver=find(gun.root,'PumpForgedReceiver');
  assert.ok(barrel&&tube&&receiver);
  const barrelZ=[barrel.position.z-barrel.geometry.args[2]/2,
    barrel.position.z+barrel.geometry.args[2]/2];
  const tubeZ=[tube.position.z-tube.geometry.args[2]/2,
    tube.position.z+tube.geometry.args[2]/2];
  assert.ok(overlaps(barrelZ,zRange(receiver)));
  assert.ok(overlaps(tubeZ,zRange(receiver)));
  assert.equal(gun.root.children.filter(c=>c.name==='PumpBarrelTubeBridge').length,2);
  assert.ok(find(gun.root,'PumpContinuousBarrelRib'));
  assert.ok(find(gun.root,'PumpOpenMuzzleRing'));
});
test('Pump action bars overlap both receiver and sliding wood fore-end',()=>{
  const gun=createPumpActionShotgun(THREE,new Group());
  assert.equal(gun.pumpGroup.parent,gun.root);
  assert.equal(gun.pumpGroup.name,'PumpSlidingForend');
  const wood=find(gun.pumpGroup,'PumpJoinedWoodForend');
  const bars=gun.pumpGroup.children.filter(c=>c.name==='PumpReceiverActionBar');
  const mounts=gun.pumpGroup.children.filter(c=>c.name==='PumpForendRailMount');
  assert.ok(wood);
  assert.equal(bars.length,2);
  assert.equal(mounts.length,2);
  assert.equal(gun.pumpGroup.children.filter(c=>c.name==='PumpForendFingerGroove').length,12);
  for(const bar of bars){
    assert.ok(overlaps(zRange(wood),zRange(bar)));
    assert.ok(overlaps(zRange(find(gun.root,'PumpForgedReceiver')),zRange(bar)));
  }
  gun.pumpGroup.position.z=.245;
  gun.boltGroup.position.z=.151;
  assert.equal(gun.pumpGroup.position.z,.245);
  assert.equal(gun.boltGroup.position.z,.151);
  assert.ok(find(gun.boltGroup,'PumpActionBoltFace'));
});
test('Visible reload shell and hand meet fixed lower receiver loading gate',()=>{
  const gun=createPumpActionShotgun(THREE,new Group());
  const loadingGate=find(gun.root,'PumpBottomLoadingGate');
  assert.ok(loadingGate);
  assert.ok(find(gun.root,'PumpLoadingGateSpring'));
  assert.equal(gun.reloadAction.parent,gun.root);
  assert.equal(gun.reloadAction.visible,false);
  assert.ok(gun.reloadAction.children.length===2);
  assert.equal(gun.magazine.children.length,0,'the tube does not detach');
  assert.equal(gun.supportHand.parent,gun.pumpGroup,
    'support hand travels with the pump during the stroke');
});
test('Iron sights zero to actual front tip, no floating blade',()=>{
  const gun=createPumpActionShotgun(THREE,new Group());
  const tip=find(gun.root,'PumpFrontSightTip');
  const base=find(gun.root,'PumpFrontSightPedestal');
  assert.ok(base.position.y+base.geometry.height/2>=tip.position.y-tip.geometry.height/2);
  assert.equal(tip.position.y+tip.geometry.height/2,.270);
  assert.equal(gun.sightLocal.y,.270);
  const dots=gun.root.children.filter(c=>c.geometry instanceof BoxGeometry&&
    c.geometry.width===.014&&c.geometry.height===.012&&c.position.z===-.191);
  assert.equal(dots.length,2);
  dots.forEach(d=>assert.equal(d.position.y+d.geometry.height/2,.270));
});
test('Third-person model shares full authored pump assembly at proper size',()=>{
  const gun=createPumpActionShotgun(THREE,new Group(),{thirdPerson:true});
  assert.equal(gun.root.scale.x,.68);
  assert.ok(find(gun.root,'PumpFixedMagazineTube'));
  assert.ok(find(gun.pumpGroup,'PumpJoinedWoodForend'));
  assert.ok(find(gun.boltGroup,'PumpActionBoltFace'));
  assert.equal(gun.reloadAction.visible,false);
});
