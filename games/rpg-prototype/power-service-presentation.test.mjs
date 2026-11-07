import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {powerServiceComparison} from './power-service-presentation.mjs';

test('power armor chooser compares actual effective armor points and condition',()=>{
  const old={tier:'t45',current:80};
  const upgraded=powerServiceComparison('chest',old,{tier:'t60',condition:145});
  assert.equal(upgraded.before,34);
  assert.equal(upgraded.after,57);
  assert.equal(upgraded.delta,23);
  assert.equal(upgraded.oldPercent,80);
  assert.equal(upgraded.newPercent,100);
  assert.equal(upgraded.broken,false);
});

test('broken spare plates grant zero effective armor until repaired',()=>{
  const actual=powerServiceComparison('head',{tier:'none',current:0},
    {tier:'t01',condition:0});
  assert.equal(actual.before,0);
  assert.equal(actual.after,0);
  assert.equal(actual.newTier,'t01');
  assert.equal(actual.broken,true);
  const restored=powerServiceComparison('head',{tier:'t60',current:60});
  assert.equal(restored.delta,0);
  assert.equal(restored.after,57);
});

test('removing a plate previews real loss without mutating chassis',()=>{
  const source={tier:'t45',current:35};
  const result=powerServiceComparison('rightLeg',source,'remove');
  assert.equal(result.after,0);
  assert.equal(result.delta,-34);
  assert.equal(source.tier,'t45');
  assert.equal(source.current,35);
});

test('six-slot figure, preview and repair UI stay wired to real service actions',()=>{
  const main=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('./testing/index.html',import.meta.url),'utf8');
  assert.match(main,/powerServiceComparison\(/);
  assert.match(main,/previewWorkshopRecipe\(backpack,settlementBuildState,repairCost\)/);
  assert.match(main,/savePowerService\(\)/);
  assert.match(html,/id="powerPartCompare"/);
  assert.match(html,/id="powerRepairLedger"/);
  for(const part of ['head','chest','leftArm','rightArm','leftLeg','rightLeg']){
    assert.match(html,new RegExp('id="powerFigure-'+part+'"'));
  }
});
