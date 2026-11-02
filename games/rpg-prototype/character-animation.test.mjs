import test from 'node:test';
import assert from 'node:assert/strict';
import {createCharacterAnimation,stepCharacterAnimation} from './character-animation.mjs';

test('Character animation starts neutral and ignores invalid frame lengths',()=>{
  const state=createCharacterAnimation();
  stepCharacterAnimation(state,NaN,{speed:0});
  assert.equal(state.pose,'idle');assert.equal(state.stride,0);
  assert.ok(Object.values(state).every(v=>typeof v!=='number'||Number.isFinite(v)));
});
test('Walk, sprint and crouch blend continuously without foot teleports',()=>{
  const state=createCharacterAnimation();
  for(let i=0;i<25;i++)stepCharacterAnimation(state,.016,{speed:2.5});
  assert.equal(state.pose,'walk');
  assert.ok(state.move>.3&&Math.abs(state.stride)<=.8);
  const oldPhase=state.phase;
  for(let i=0;i<25;i++)stepCharacterAnimation(state,.016,
    {speed:6,sprinting:true,crouched:true});
  assert.equal(state.pose,'crouch');
  assert.ok(state.sprint>.5&&state.crouch>.5&&state.phase>oldPhase);
  for(let i=0;i<50;i++)stepCharacterAnimation(state,.016,{speed:0});
  assert.ok(state.move<.02&&state.crouch<.05);
});
test('Jump and landing have distinct short lived poses',()=>{
  const state=createCharacterAnimation();
  stepCharacterAnimation(state,.02,{airborne:true,speed:3});
  assert.equal(state.pose,'jump');assert.ok(state.jump>0);
  stepCharacterAnimation(state,.02,{airborne:false,speed:3});
  assert.ok(state.land>.8&&state.bob<.05);
  for(let i=0;i<20;i++)stepCharacterAnimation(state,.03,{speed:0});
  assert.equal(state.land,0);assert.equal(state.pose,'idle');
});
test('Recoil, damage, and reload blend back toward their rest poses',()=>{
  const state=createCharacterAnimation();
  stepCharacterAnimation(state,.03,{reloading:true,recoil:1,hit:.9});
  assert.equal(state.pose,'reload');
  assert.equal(state.recoil,1);assert.equal(state.hit,.9);
  assert.ok(state.reload>0&&state.reloadClock>0);
  for(let i=0;i<50;i++)stepCharacterAnimation(state,.03,{});
  assert.equal(state.pose,'idle');
  assert.equal(state.reloadClock,0);
  assert.ok(state.recoil<.01&&state.hit<.01&&state.reload<.01);
});
test('Downed characters settle independently of movement commands',()=>{
  const state=createCharacterAnimation();
  for(let i=0;i<55;i++)stepCharacterAnimation(state,.02,
    {alive:false,speed:7,sprinting:true,aiming:true});
  assert.equal(state.pose,'down');
  assert.ok(state.death>.7&&state.move<.01&&state.aim<.01);
});
