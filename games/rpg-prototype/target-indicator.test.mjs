import test from 'node:test';
import assert from 'node:assert/strict';
import {characterUnderCrosshair,targetHealthFraction} from './target-indicator.mjs';

const hit=(distance,userData={})=>({distance,object:{userData}});

test('visible enemy directly under the reticle becomes the selected hostile',()=>{
  assert.deepEqual(characterUnderCrosshair([hit(13,{enemyId:'raider'})]),
    {kind:'hostile',id:'raider'});
});

test('a friendly contact produces a friendly bar only when directly visible',()=>{
  assert.deepEqual(characterUnderCrosshair([hit(4,{targetResidentId:'dispatch'})]),
    {kind:'friendly',id:'dispatch'});
});

test('the nearest solid wall hides both hostile and friendly contact bars',()=>{
  assert.equal(characterUnderCrosshair([
    hit(2,{impactMaterial:'concrete'}),hit(5,{enemyId:'raider'})]),null);
  assert.equal(characterUnderCrosshair([
    hit(2,{impactMaterial:'metal'}),hit(5,{targetResidentId:'foreman'})]),null);
});

test('no bar appears for distant targets or when the reticle is on empty space',()=>{
  assert.equal(characterUnderCrosshair([]),null);
  assert.equal(characterUnderCrosshair([hit(54,{enemyId:'raider'})]),null);
});

test('bar length uses actual fractional HP and clamps damage edge cases',()=>{
  assert.equal(targetHealthFraction(60,120),.5);
  assert.equal(targetHealthFraction(0,100),0);
  assert.equal(targetHealthFraction(-12,100),0);
  assert.equal(targetHealthFraction(200,100),1);
  assert.equal(targetHealthFraction(12,0),0);
});
