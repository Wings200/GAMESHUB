import test from 'node:test';
import assert from 'node:assert/strict';
import {createHeavySniper} from './heavy-sniper.mjs';
import {HEAVY_SNIPER_TUNING,heavySniperBoltCyclePose} from './heavy-sniper-mechanics.mjs';
import {HEAVY_SNIPER,createWeaponState,fireWeapon,updateWeapon,startWeaponReload} from './weapons.mjs';
import {sightMount,adsWeaponPosition,isAlignedToBore,sightForOptic} from './weapon-sights.mjs';
import {reloadPoseForWeapon} from './weapon-handling.mjs';
import {WORLD_WEAPON_GRIPS} from './weapon-grip-ik.mjs';

// Geometry-only scene stub: builds both complete model variants without WebGL,
// while tracking assembly, anchors and animated parts.
function fakeTHREE(){
 const vector=()=>({x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z;}});
 class Object3D{
  constructor(){
   this.children=[];this.position=vector();this.rotation=vector();
   this.scale={value:1,setScalar(v){this.value=v;}};
   this.userData={};this.visible=true;this.name='';
  }
  add(...children){this.children.push(...children);}
 }
 class Group extends Object3D{}
 class Mesh extends Object3D{constructor(geometry,material){super();this.geometry=geometry;this.material=material;}}
 class PointLight extends Object3D{constructor(color,intensity,distance,decay){super();Object.assign(this,{color,intensity,distance,decay});}}
 class Geometry{constructor(...args){this.args=args;}}
 class Material{constructor(opts){this.opts=opts;}}
 class Vector3{constructor(x,y,z){Object.assign(this,{x,y,z});}}
 return {Group,Mesh,PointLight,Vector3,
  BoxGeometry:Geometry,CylinderGeometry:Geometry,TorusGeometry:Geometry,
  SphereGeometry:Geometry,CircleGeometry:Geometry,PlaneGeometry:Geometry,
  MeshStandardMaterial:Material,MeshBasicMaterial:Material,
  DoubleSide:2,AdditiveBlending:3};
}
const descendants=(node)=>[node,...node.children.flatMap(descendants)];

test('heavy sniper has actual world geometry, a 6x optical assembly and foregrip',()=>{
 const THREE=fakeTHREE();
 const world=new THREE.Group();
 const gun=createHeavySniper(THREE,world,{thirdPerson:true});
 const parts=descendants(gun.root);
 const named=new Set(parts.map(v=>v.name).filter(Boolean));
 for(const name of [
  'SniperSolidReceiver','SniperLongForgedBarrel','SniperMuzzleBrake',
  'SniperFiveRoundMagazine','SniperRotatingBoltAssembly',
  'SniperSixPowerScopeTube','SniperObjectiveLens','SniperOcularLens',
  'SniperElevationTurret','SniperWindageTurret','SniperRaisedCheekRest',
  'SniperBipodHinge'
 ])assert.ok(named.has(name),name);
 assert.ok(parts.length>100,'the rifle has authored details, not a placeholder');
 assert.equal(gun.root.scale.value,WORLD_WEAPON_GRIPS['heavy-sniper'].scale);
 assert.equal(gun.gripHand.children.length,0,'world arms use avatar IK');
 assert.equal(gun.supportHand.children.length,0,'world arms use avatar IK');
 assert.equal(world.children.includes(gun.root),true);
 assert.ok(Math.abs(gun.muzzleGlow.position.z+2.067)<.001);
 assert.ok(gun.ejectionLocal.x>.1);
});
test('first-person hands and all sniper animation objects are defined',()=>{
 const THREE=fakeTHREE();
 const gun=createHeavySniper(THREE,new THREE.Group());
 assert.ok(gun.gripHand.children.length>=5);
 assert.ok(gun.supportHand.children.length>=5);
 assert.ok(gun.boltCycleHand.children.length>0);
 assert.ok(gun.reloadHand.children.length>0);
 assert.equal(gun.boltCycleHand.visible,false);
 assert.equal(gun.reloadHand.visible,false);
 assert.equal(gun.magazine.position.y,gun.magBaseY);
 assert.equal(gun.magazineBase.position.y,gun.magFootY);
 assert.equal(gun.sightLocal.y,sightMount('heavy-sniper').y);
});
test('mag-fed heavy sniper locks rate of fire and reloads five rounds',()=>{
 const w=createWeaponState(HEAVY_SNIPER);
 assert.equal(w.magazine,5);
 assert.equal(fireWeapon(w,HEAVY_SNIPER,()=>.5).status,'fired');
 assert.equal(w.magazine,4);
 assert.notEqual(fireWeapon(w,HEAVY_SNIPER,()=>.5).status,'fired');
 updateWeapon(w,HEAVY_SNIPER.fireInterval+.05,HEAVY_SNIPER);
 assert.equal(fireWeapon(w,HEAVY_SNIPER,()=>.5).status,'fired');
 assert.equal(startWeaponReload(w,HEAVY_SNIPER),true);
 updateWeapon(w,HEAVY_SNIPER.reloadSeconds+.1,HEAVY_SNIPER);
 assert.equal(w.magazine,5);
});
test('mechanical bolt has separate lift, extraction, ejection and lock stages',()=>{
 assert.equal(HEAVY_SNIPER_TUNING.cycleSeconds,1.42);
 const progress=p=>heavySniperBoltCyclePose((1-p)*HEAVY_SNIPER_TUNING.cycleSeconds);
 assert.equal(progress(0).ejectNow,false);
 assert.ok(progress(.20).handleLift>.1);
 assert.ok(progress(.51).boltOffset>.15);
 assert.equal(progress(.55).ejectNow,true);
 assert.equal(progress(.80).ejectNow,false);
 assert.ok(progress(.99).boltOffset<.001);
 assert.equal(heavySniperBoltCyclePose(0).active,false);
});
test('scope genuinely zooms to 12 degrees and stays center-zero',()=>{
 assert.equal(sightForOptic('heavy-sniper','factory').fov,12);
 assert.equal(sightMount('heavy-sniper').optic,'scope');
 assert.equal(adsWeaponPosition('heavy-sniper').y,-.368);
 assert.ok(isAlignedToBore('heavy-sniper'));
});
test('reload lowers detachable magazine and ends with bolt chambering',()=>{
 const pose=p=>reloadPoseForWeapon('heavy-sniper',4.15*(1-p),4.15);
 assert.ok(pose(.48).magazineOffset>.1);
 assert.ok(pose(.97).magazineOffset<.01);
 assert.ok(pose(.9).boltHandleLift>.2);
 assert.ok(pose(.9).boltOffset>.01);
 assert.ok(Math.abs(pose(.98).boltOffset)<.00001);
});
