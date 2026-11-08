import test from 'node:test';
import assert from 'node:assert/strict';
import {MATERIAL_PRESETS,MATERIAL_CATEGORIES,getMaterialPreset,normalizeMaterialSettings} from '../engine/material-catalog.mjs';

test('large catalog has deterministic and distinct identifiers',()=>{
  assert.equal(MATERIAL_CATEGORIES.length,15);
  assert.equal(MATERIAL_PRESETS.length,180);
  const ids=MATERIAL_PRESETS.map(p=>p.id);
  assert.equal(new Set(ids).size,ids.length);
  for(const preset of MATERIAL_PRESETS){
    assert.equal(getMaterialPreset(preset.id),preset);
    assert.match(preset.color,/^#[0-9a-f]{6}$/i);
    assert.ok(preset.roughness>=.02&&preset.roughness<=1);
    assert.ok(preset.metalness>=0&&preset.metalness<=1);
    assert.ok(preset.repeat>0);
  }
});

test('all material categories contain a useful selection',()=>{
  for(const category of MATERIAL_CATEGORIES){
    assert.ok(MATERIAL_PRESETS.filter(p=>p.category===category.id).length>=12,
      category.id+' should have at least 12 presets');
  }
});

test('custom overrides are normalized without mutating presets',()=>{
  const initial=getMaterialPreset('metal-brushed-steel');
  const override=normalizeMaterialSettings(initial,{
    color:'#AB12CF',roughness:4,metalness:-1,repeat:99
  });
  assert.deepEqual(override,{color:'#AB12CF',roughness:1,metalness:0,repeat:12,detailStrength:1});
  assert.notEqual(initial.color,override.color);
  const invalid=normalizeMaterialSettings(initial,{color:'url(javascript:x)',roughness:'nope'});
  assert.equal(invalid.color,initial.color);
  assert.equal(invalid.roughness,initial.roughness);
});

test('material strength is bounded and defaults to neutral across presets',()=>{
  for(const preset of MATERIAL_PRESETS) {
    assert.equal(normalizeMaterialSettings(preset).detailStrength,1);
    assert.equal(normalizeMaterialSettings(preset,{detailStrength:0}).detailStrength,0);
    assert.equal(normalizeMaterialSettings(preset,{detailStrength:99}).detailStrength,2);
  }
});

test('carpet adds 12 new presets without changing existing material ids or seeds',()=>{
  const carpet=MATERIAL_PRESETS.filter(p=>p.category==='carpet');
  const fabric=MATERIAL_PRESETS.filter(p=>p.category==='fabric');
  assert.equal(carpet.length,12);
  assert.equal(fabric.length,12);
  // A representative original seed must not change when adding a category.
  assert.equal(getMaterialPreset('fabric-natural-linen').seed,10*101+0*37+17);
  assert.equal(getMaterialPreset('ground-fine-gravel').seed,11*101+0*37+17);
  assert.equal(getMaterialPreset('carpet-warm-beige-plush').metalness,0);
  assert.ok(getMaterialPreset('carpet-ivory-shag').roughness>.8);
});
