import test from 'node:test';
import assert from 'node:assert/strict';
import {THREE} from '../engine/core.js';
import {resolveCharacterClips,createCharacterAsset,maskClipToUpperBody} from '../engine/character-assets.js';
import {AnimationController} from '../engine/animation.js';
import {FootGrounding} from '../engine/foot-grounding.js';

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

test('CC0 human movement, work and punch map to reusable gameplay states',()=>{
  const scene=new THREE.Group();
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(1,2,1)));
  const work=new THREE.AnimationClip('Working',6.4,[
    new THREE.NumberKeyframeTrack('LeftArm.position[x]',[0,.5,1,2,6.4],[0,1,0,1,0])
  ]);
  const asset=createCharacterAsset({scene,animations:[clip('Idle'),clip('Walk'),
    clip('Run'),clip('Jump'),clip('Punch'),work]},
  {maxActionSeconds:{interact:1.6},splitJump:true});
  assert.ok(asset.clips.interact.duration>0);
  assert.ok(asset.clips.interact.duration<=1.61);
  assert.ok(asset.clips.attack);
  assert.ok(asset.clips.land);
  const actor=asset.createInstance();
  assert.ok(actor.placement.isGroup);
  asset.dispose();
});

test('upper-body mask strips hip and leg tracks but retains arm and spine',()=>{
  const original=new THREE.AnimationClip('Working',1,[
    ...['Hips','LeftFoot','RightLeg','LeftArm','Spine2','RightHand'].map(bone=>
      new THREE.NumberKeyframeTrack(bone+'.position[x]',[0,1],[0,1]))
  ]);
  const upper=maskClipToUpperBody(original,{name:'work-upper'});
  assert.equal(upper.name,'work-upper');
  assert.deepEqual(upper.tracks.map(t=>t.name),[
    'LeftArm.position[x]','Spine2.position[x]','RightHand.position[x]']);
  assert.equal(original.tracks.length,6);
  assert.notEqual(upper.tracks[0],original.tracks[3]);
  assert.throws(()=>maskClipToUpperBody(clip('Idle')),/upper-body bone/);
});

test('interrupted fades keep current weights continuous instead of popping',()=>{
  const root=new THREE.Group(),body=new THREE.Group();
  body.name='Body';root.add(body);
  const animator=new AnimationController(root,{clips:{
    idle:clip('Idle'),walk:clip('Walk'),run:clip('Run')
  },fadeSeconds:.4,runThreshold:4,hysteresis:.2});
  animator.playLoop('idle');
  animator.update(.05);
  animator.playLoop('walk');
  animator.update(.12);
  const before=animator.actions.get('walk').getEffectiveWeight();
  assert.ok(before>.2&&before<.6);
  animator.playLoop('run');
  assert.ok(Math.abs(animator.actions.get('walk').getEffectiveWeight()-before)<1e-6,
    'interrupting a fade must not immediately restore the action to full weight');
  animator.update(.04);
  const after=animator.actions.get('walk').getEffectiveWeight();
  assert.ok(after<before&&after>0);
  assert.equal(animator.active,'run');
  animator.setLocomotion({speed:3.9});
  assert.equal(animator.active,'run','run should remain until below the hysteresis band');
  animator.setLocomotion({speed:3.5});
  assert.equal(animator.active,'walk');
  animator.dispose();
});

test('masked upper-body one-shot plays independently from moving legs',()=>{
  const actor=new THREE.Group(),arm=new THREE.Bone();
  arm.name='LeftArm';actor.add(arm);
  const base=new THREE.AnimationClip('Walk',1,[
    new THREE.NumberKeyframeTrack('LeftArm.position[x]',[0,1],[0,.2])
  ]);
  const work=new THREE.AnimationClip('Working',.7,[
    new THREE.NumberKeyframeTrack('LeftArm.position[y]',[0,.35,.7],[0,.3,0])
  ]);
  const animator=new AnimationController(actor,{clips:{walk:base},fadeSeconds:.2});
  animator.playLoop('walk');
  animator.registerUpperBody('interact',maskClipToUpperBody(work),{fadeSeconds:.1});
  let completed=0;
  animator.playUpperBodyOnce('interact',{onFinish:()=>completed++});
  assert.equal(animator.active,'walk');
  assert.equal(animator.displayActive,'interact');
  for(let i=0;i<12;i++)animator.update(.08);
  assert.equal(completed,1);
  assert.equal(animator.active,'walk');
  assert.equal(animator.displayActive,'walk');
  animator.dispose();
});

test('replaying a completed one-shot restarts it during its outgoing fade',()=>{
  const root=new THREE.Group(),body=new THREE.Group();
  body.name='Body';root.add(body);
  const oneShot=new THREE.AnimationClip('Reload',.25,[
    new THREE.NumberKeyframeTrack('Body.position[y]',[0,.25],[0,.2])
  ]);
  const animator=new AnimationController(root,{clips:{idle:clip('Idle'),reload:oneShot},
    fadeSeconds:.25});
  animator.playLoop('idle');
  let count=0;
  animator.playOnce('reload',{onFinish:()=>count++});
  animator.update(.3);
  assert.equal(count,1);
  assert.equal(animator.active,'idle');
  animator.playOnce('reload',{onFinish:()=>count++});
  assert.ok(animator.oneShot);
  assert.equal(animator.oneShot.time,0);
  animator.update(.3);
  assert.equal(count,2);
  animator.dispose();
});

test('ground contact adjusts visuals within limit without moving player root',()=>{
  const root=new THREE.Group(),placement=new THREE.Group();
  root.position.y=2;
  root.add(placement);
  for(const [name,height] of [['LeftFoot',.13],['RightFoot',.25]]){
    const bone=new THREE.Bone();bone.name=name;
    bone.position.y=height;placement.add(bone);
  }
  const grounding=new FootGrounding(root,placement,{clearance:.075});
  assert.equal(grounding.available,true);
  for(let i=0;i<25;i++)grounding.update(.016,{grounded:true,groundHeight:2});
  assert.ok(grounding.offset<0&&grounding.offset>-.14);
  assert.equal(root.position.y,2);
  for(let i=0;i<50;i++)grounding.update(.016,{grounded:false,groundHeight:2});
  assert.ok(Math.abs(grounding.offset)<.001);
  grounding.reset();
  assert.equal(placement.position.y,0);
});
