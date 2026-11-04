import test from 'node:test';
import assert from 'node:assert/strict';
import {createPipeRifle} from './pipe-rifle.mjs';
import {sightMount,adsWeaponPosition} from './weapon-sights.mjs';

class Vector3{
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
  setScalar(v){this.x=this.y=this.z=v;return this;}
}
class Group{
  constructor(){
    this.children=[];this.position=new Vector3();this.rotation=new Vector3();
    this.scale=new Vector3(1,1,1);this.visible=true;this.name='';this.userData={};
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
class ExtrudeGeometry extends Geometry{constructor(shape,options){super(shape,options);this.profile=shape.points;this.width=options.depth;}}
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
const interval=(center,width)=>[center-width/2,center+width/2];
const overlaps=(a,b)=>Math.min(a[1],b[1])>Math.max(a[0],b[0]);
const profileZ=mesh=>{
  assert.ok(mesh.geometry instanceof ExtrudeGeometry);
  const positions=mesh.geometry.profile.map(p=>p[0]);
  return [Math.min(...positions),Math.max(...positions)];
};

test('Pipe rifle is one joined receiver, shroud and wood buttstock silhouette',()=>{
  const parent=new Group(),gun=createPipeRifle(THREE,parent);
  assert.equal(parent.children[0],gun.root);
  assert.equal(gun.defaultZ,-1.02,'long stock must stay in front of first-person camera');
  const receiver=find(gun.root,'PipeRifleReceiverShell');
  const shroud=find(gun.root,'PipeRifleHandguardShell');
  const stock=find(gun.root,'PipeRifleStockBody');
  const tang=find(gun.root,'PipeRifleStockTang');
  const bridge=find(gun.root,'ShroudReceiverBridge');
  assert.ok(receiver&&shroud&&stock&&tang&&bridge);
  assert.ok(overlaps(profileZ(receiver),profileZ(shroud)),
    'handguard must penetrate receiver, not float off barrel');
  assert.ok(overlaps(profileZ(receiver),profileZ(stock)),
    'shoulder stock must be one connected load-bearing piece');
  assert.ok(overlaps(profileZ(stock),profileZ(tang)));
  assert.ok(overlaps(profileZ(tang),profileZ(receiver)));
  assert.ok(gun.root.children.filter(o=>o.geometry instanceof ExtrudeGeometry).length>=7);
});

test('Rifle 15-round magazine remains seated in a deep well and its foot fits',()=>{
  const gun=createPipeRifle(THREE,new Group());
  const well=find(gun.root,'PipeRifleMagazineWell');
  const mag=gun.magazine,foot=gun.magazineBase;
  assert.ok(well&&mag&&foot);
  for(const axis of ['x','y','z']){
    const size=axis==='x'?'width':axis==='y'?'height':'depth';
    assert.ok(overlaps(interval(well.position[axis],well.geometry[size]),
      interval(mag.position[axis],mag.geometry[size])),axis+' magazine socket gap');
  }
  assert.ok(overlaps(interval(mag.position.y,mag.geometry.height),
    interval(foot.position.y,foot.geometry.height)));
  assert.equal(gun.magBaseY,mag.position.y);
  assert.equal(gun.magFootY,foot.position.y);
  assert.equal(mag.children.length,10,'both sides retain fitted grooves on reload');
});

test('Real bolt carrier stays in its housing throughout recoil and rack',()=>{
  const gun=createPipeRifle(THREE,new Group());
  const housing=find(gun.root,'BoltChannelHousing');
  const bolt=find(gun.slideGroup,'PipeRifleBoltCarrier');
  assert.equal(gun.slideGroup.name,'PipeRifleChargingCarrier');
  assert.ok(housing&&bolt);
  for(const travel of [0,.11,.205,.23]){
    const carrier=interval(bolt.position.z+travel,bolt.geometry.depth);
    const guide=interval(housing.position.z,housing.geometry.depth);
    assert.ok(overlaps(carrier,guide),'bolt must remain partially enclosed');
  }
});

test('Pipe rifle front bead tip and two rear dots align with the live ADS ray',()=>{
  const gun=createPipeRifle(THREE,new Group());
  const front=find(gun.root,'PipeRifleFrontSightTip');
  assert.ok(find(gun.root,'PipeRifleFrontSightBase'));
  assert.ok(find(gun.root,'PipeRifleRearSightBridge'));
  assert.ok(front);
  const frontTip=front.position.y+front.geometry.height/2;
  const rearDots=gun.root.children.filter(o=>o.geometry instanceof BoxGeometry&&
    o.geometry.width===.012&&o.geometry.height===.016&&o.position.z===.188);
  assert.equal(rearDots.length,2);
  for(const dot of rearDots)
    assert.ok(Math.abs(dot.position.y+dot.geometry.height/2-frontTip)<1e-8);
  assert.equal(frontTip,.258);
  assert.equal(gun.sightLocal.y,frontTip);
  assert.equal(sightMount('pipe-rifle').y,frontTip);
  assert.ok(Math.abs(adsWeaponPosition('pipe-rifle').y+frontTip)<1e-8);
});

test('Both gripping hands contact the rifle and held-world version is complete',()=>{
  const gun=createPipeRifle(THREE,new Group());
  assert.ok(gun.supportHand&&gun.supportHand.children.length>=5);
  assert.ok(gun.reloadHand&&gun.reloadHand.children.length>=5);
  assert.equal(gun.reloadHand.visible,false);
  const world=createPipeRifle(THREE,new Group(),{thirdPerson:true});
  assert.equal(world.root.scale.x,.68);
  assert.ok(find(world.root,'PipeRifleStockBody'));
  assert.ok(find(world.root,'PipeRifleReceiverShell'));
  assert.equal(world.magazine.geometry.height,.320);
  assert.ok(world.muzzleGlow&&world.muzzleFlare);
});

test('W20.25 rust finish is visibly patchy and repairs are actually mounted',()=>{
  class FakeDataTexture{
    constructor(data,width,height,format){
      this.image={data,width,height};this.format=format;
    }
  }
  const textured={...THREE,DataTexture:FakeDataTexture,RGBAFormat:1023,
    RepeatWrapping:1000,LinearFilter:1001,SRGBColorSpace:'srgb'};
  const gun=createPipeRifle(textured,new Group());
  const metalObjects=['PipeRifleReceiverShell','PipeRifleHandguardShell',
    'PipeRifleRustyBarrelCoupler'];
  for(const partName of metalObjects){
    const part=find(gun.root,partName);
    assert.ok(part,partName+' must be physically present');
    const material=part.material.args[0],map=material.map;
    assert.ok(map instanceof FakeDataTexture,'rust map on '+partName);
    assert.equal(map.image.width,128);
    const pixels=map.image.data;
    const shades=new Set();
    let oxidized=0;
    for(let i=0;i<pixels.length;i+=4){
      const r=pixels[i],g=pixels[i+1],b=pixels[i+2];
      if(r>g*1.6&&g>b)oxidized++;
      shades.add(r+','+g+','+b);
    }
    assert.ok(shades.size>150,'scrap finish must not be a flat color');
    assert.ok(oxidized>1500,'large rust patches must be plainly visible');
  }
  assert.equal(gun.root.children.filter(x=>x.name==='PipeRifleRustedTopClamp').length,2);
  assert.equal(gun.root.children.filter(x=>x.name==='PipeRifleCouplerThread').length,4);
  assert.ok(find(gun.root,'PipeRifleStockRepairStrap'));
  assert.equal(gun.sightLocal.y,.258,'weathering must not change optic zero');
  assert.equal(gun.magazine.geometry.height,.320,'magazine must remain unchanged');
  const world=createPipeRifle(textured,new Group(),{thirdPerson:true});
  assert.ok(find(world.root,'PipeRifleRustyBarrelCoupler'));
});
