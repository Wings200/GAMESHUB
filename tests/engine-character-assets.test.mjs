import test from 'node:test';
import assert from 'node:assert/strict';
import {THREE} from '../engine/core.js';
import {resolveCharacterClips,createCharacterAsset} from '../engine/character-assets.js';
import {AnimationController} from '../engine/animation.js';

const clip=name=>new THREE.AnimationClip(name,1,[
  new THREE.NumberKeyframeTrack('Body.position[y]',[0,1],[0,.02])
]);

test('animation importer maps authored names and identifies absent actions honestly',()=>{
  const original=[clip('Idle'),clip('Walking'),clip('Running'),clip('Wave')];
  const {clips,missing,sourceNames}=resolveCharacterClips(original);
  assert.deepEqual(Object.keys(clips),['idle','walk','run','interact']);
  assert.ok(missing.includes('reload'));
  assert.ok(missing.includes('fall'));
  assert.deepEqual(sourceNames,['Idle','Walking','Running','Wave']);
  assert.notEqual(clips.idle,original[0]);
  assert.equal(clips.idle.name,'idle');
  assert.equal(original[0].name,'Idle');
  const customized=resolveCharacterClips([clip('stand'),clip('step'),clip('dash')],{
    clipMap:{idle:'stand',walk:['step'],run:'dash'}
  });
  assert.ok(customized.clips.run);
  assert.throws(()=>resolveCharacterClips([clip('Idle')]),/walk, run/);
  assert.throws(()=>resolveCharacterClips([clip('Idle')],{clipMap:{walk:27}}),/aliases/);
});

test('each imported instance receives independent pose hierarchy and size',()=>{
  const scene=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(.6,2,.4),
    new THREE.MeshStandardMaterial({color:'white'}));
  body.name='Body';body.position.y=1;scene.add(body);
  const asset=createCharacterAsset({scene,animations:[clip('Idle'),clip('Walking'),clip('Running')]});
  const a=asset.createInstance({height:1.8});
  const b=asset.createInstance({height:1.8,heading:Math.PI});
  assert.notEqual(a.root,b.root);
  assert.notEqual(a.model,b.model);
  assert.ok(Math.abs(new THREE.Box3().setFromObject(a.root).getSize(new THREE.Vector3()).y-1.8)<.001);
  assert.ok(Math.abs(a.model.rotation.y)<.001);
  assert.ok(Math.abs(b.model.rotation.y-Math.PI)<.001);
  a.root.position.x=10;
  assert.equal(b.root.position.x,0);
  a.dispose();
  assert.equal(asset.disposed,false);
  asset.dispose();
  assert.equal(asset.disposed,true);
  assert.throws(()=>asset.createInstance(),/disposed/);
});

test('character importer rejects invalid models and scale',()=>{
  assert.throws(()=>createCharacterAsset({scene:{},animations:[]}),/glTF scene/);
  const scene=new THREE.Group();
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1)));
  const asset=createCharacterAsset({scene,animations:[clip('Idle'),clip('Walking'),clip('Running')]});
  assert.throws(()=>asset.createInstance({height:-2}),/size/);
  asset.dispose();
});

test('an authored jump can be divided into takeoff, fall and landing phases',()=>{
  const scene=new THREE.Group();
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(1,2,1)));
  const jump=new THREE.AnimationClip('Jump',.7,[
    new THREE.NumberKeyframeTrack('Body.position[y]',
      [0,.1,.2,.3,.4,.5,.6,.7],[0,.1,.2,.3,.32,.26,.1,0])
  ]);
  const asset=createCharacterAsset({scene,
    animations:[clip('Idle'),clip('Walking'),clip('Running'),jump]},
  {splitJump:true});
  for(const name of ['jump','fall','land']){
    assert.ok(asset.clips[name] instanceof THREE.AnimationClip);
    assert.ok(asset.clips[name].duration>0);
  }
  assert.ok(!asset.missing.includes('fall'));
  assert.ok(!asset.missing.includes('land'));
  asset.dispose();
});

test('authored locomotion cadence can be tuned to physical player speed',()=>{
  const actor=new THREE.Group();
  const body=new THREE.Group();body.name='Body';actor.add(body);
  const controller=new AnimationController(actor,{
    clips:{idle:clip('idle'),walk:clip('walk'),run:clip('run')},
    runThreshold:4,locomotionRates:{walk:1.55,run:1.8}
  });
  controller.setLocomotion({speed:2.8,grounded:true});
  assert.equal(controller.current.getEffectiveTimeScale(),1.55);
  controller.setLocomotion({speed:5,grounded:true});
  assert.equal(controller.current.getEffectiveTimeScale(),1.8);
  assert.throws(()=>new AnimationController(actor,{locomotionRates:{run:-1}}),/locomotionRates/);
  controller.dispose();
});
