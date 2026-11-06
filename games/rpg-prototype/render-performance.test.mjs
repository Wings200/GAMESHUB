import test from 'node:test';
import assert from 'node:assert/strict';
import {preferLowGraphics,createFrameBudgetGovernor} from './render-performance.mjs';

test('constrained Chromebooks start at low graphics but capable machines do not',()=>{
  assert.equal(preferLowGraphics({deviceMemory:4,hardwareConcurrency:8}),true);
  assert.equal(preferLowGraphics({deviceMemory:8,hardwareConcurrency:4}),true);
  assert.equal(preferLowGraphics({reducedRenderer:true}),true);
  assert.equal(preferLowGraphics({deviceMemory:8,hardwareConcurrency:8}),false);
  assert.equal(preferLowGraphics({}),false);
});

test('sustained slow frames reduce quality, not isolated stutters',()=>{
  const governor=createFrameBudgetGovernor({windowSeconds:1,minimumFps:28});
  const run=(count,dt,opts)=>{
    let dropped=false;
    for(let i=0;i<count;i++)dropped=governor.observe(dt,opts)||dropped;
    return dropped;
  };
  assert.equal(run(60,1/60),false);
  assert.equal(governor.observe(2),false,'Background pause does not count');
  assert.equal(run(25,1/25),false,'First slow window is not sufficient');
  assert.equal(run(25,1/25),true,'Second slow window triggers low quality');
  assert.equal(run(250,1/25),false,'Do not retrigger after reduction');
});

test('very slow software frames still trigger an automatic reduction',()=>{
  const governor=createFrameBudgetGovernor({windowSeconds:1});
  assert.equal(governor.observe(.4),false);
  assert.equal(governor.observe(.4),false);
  assert.equal(governor.observe(.4),false);
  assert.equal(governor.observe(.4),false);
  assert.equal(governor.observe(.4),false);
  assert.equal(governor.observe(.4),true);
});

test('manual graphics choice and hidden tabs are never automatically changed',()=>{
  const governor=createFrameBudgetGovernor({windowSeconds:1});
  for(let i=0;i<100;i++){
    assert.equal(governor.observe(.08,{manual:true}),false);
    assert.equal(governor.observe(.08,{visible:false}),false);
  }
});
