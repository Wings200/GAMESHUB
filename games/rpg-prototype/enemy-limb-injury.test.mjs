import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createInjuryState,damagePlayerLimb,resetInjuries,
  enemyInjuryModifiers,injuryGaitVisuals} from './injuries.mjs';
import {createEnemyBrain,stepEnemyBrain} from './enemy-ai.mjs';
import {makeEnemyTactics,attemptEnemyShot} from './enemy-tactics.mjs';

const actor=()=>createEnemyBrain({x:45,z:40,yaw:-Math.PI/2,
  patrol:[{x:44,z:40},{x:53,z:40}]});

test('enemy limb conditions change only when real HP damage reaches a zone',()=>{
  const wounds=createInjuryState();
  assert.equal(damagePlayerLimb(wounds,'leftLeg',40).newlyCrippled,true);
  assert.equal(wounds.condition.leftLeg,10);
  assert.equal(wounds.condition.rightLeg,100);
  assert.ok(enemyInjuryModifiers(wounds).speedMultiplier<1);
  assert.equal(enemyInjuryModifiers(wounds).accuracyMultiplier,1);
  resetInjuries(wounds);
  assert.equal(enemyInjuryModifiers(wounds).speedMultiplier,1);
});

test('head, arm and chest trauma lower enemy weapon accuracy',()=>{
  const wounds=createInjuryState();
  const healthy=enemyInjuryModifiers(wounds);
  wounds.condition.rightArm=0;
  assert.ok(enemyInjuryModifiers(wounds).accuracyMultiplier<healthy.accuracyMultiplier);
  wounds.condition.head=0;wounds.condition.chest=0;
  const worse=enemyInjuryModifiers(wounds);
  assert.ok(worse.accuracyMultiplier<.6);
  assert.ok(worse.speedMultiplier<1);
});

test('injured NPCs actually travel more slowly along the same route',()=>{
  const normal=actor(),crippled=actor();
  for(let i=0;i<10;i++){
    stepEnemyBrain(normal,{x:-100,z:0},.05,[],{playerInArena:false});
    stepEnemyBrain(crippled,{x:-100,z:0},.05,[],
      {playerInArena:false,mobilityMultiplier:.48});
  }
  assert.ok(Math.hypot(normal.x-45,normal.z-40)>
    Math.hypot(crippled.x-45,crippled.z-40)+.05);
});

test('arm injury lowers live NPC hit probability, not just a HUD number',()=>{
  const healthy=makeEnemyTactics('raider');
  const injured=makeEnemyTactics('raider');
  healthy.cooldown=0;injured.cooldown=0;
  const baseline=attemptEnemyShot(healthy,12,false,()=>.99,
    {accuracyMultiplier:1});
  const reduced=attemptEnemyShot(injured,12,false,()=>.99,
    {accuracyMultiplier:.6});
  assert.equal(baseline.fired,true);
  assert.equal(reduced.fired,true);
  assert.ok(reduced.accuracy<baseline.accuracy);
});

test('injured leg produces a measured limp, healthy gait remains unchanged',()=>{
  const wounds=createInjuryState();
  const healthy=injuryGaitVisuals(wounds,{phase:Math.PI/2,speed:3});
  assert.equal(healthy.leftStrideScale,1);
  assert.equal(healthy.rightStrideScale,1);
  assert.equal(healthy.pelvisRoll,0);
  assert.equal(healthy.cameraBob,0);
  wounds.condition.leftLeg=0;
  const injured=injuryGaitVisuals(wounds,{phase:Math.PI/2,speed:3});
  assert.ok(injured.leftStrideScale<injured.rightStrideScale);
  assert.ok(injured.leftKneeGuard>0);
  assert.ok(Math.abs(injured.pelvisRoll)>0);
  assert.notEqual(injured.cameraBob,0);
  const stationary=injuryGaitVisuals(wounds,{phase:Math.PI/2,speed:0});
  assert.equal(stationary.pelvisRoll,0);
  assert.equal(stationary.cameraBob,0);
});

test('shared visual limb reaction is physically wired to the combat actors',()=>{
  const main=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');
  const npc=readFileSync(new URL('./npc-avatar.mjs',import.meta.url),'utf8');
  const avatar=readFileSync(new URL('./player-avatar.mjs',import.meta.url),'utf8');
  for(const token of ['injuries:createInjuryState()','resetInjuries(enemy.injuries)',
    'damagePlayerLimb(enemy.injuries,zone,hit.damage)',
    'mobilityMultiplier:enemyTrauma.speedMultiplier',
    'accuracyMultiplier:enemyTrauma.accuracyMultiplier',
    'injuries:enemy.injuries','injuries:injuryState',
    'gait.cameraBob'])
    assert.ok(main.includes(token),token);
  assert.ok(npc.includes('injuries});'));
  assert.ok(avatar.includes('injuryGaitVisuals(injuries'));
  assert.ok(avatar.includes('woundGait.leftStrideScale'));
  assert.ok(avatar.includes('woundGait.rightStrideScale'));
});
