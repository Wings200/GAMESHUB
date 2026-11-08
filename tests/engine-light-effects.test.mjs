import test from 'node:test';
import assert from 'node:assert/strict';
import {lightEffectFactor,normalizeLightEffect,shadowBudget,LIGHTING_PROFILES} from '../engine/light-effects.mjs';
import {normalizeWorldEntity,normalizeWorldDocument,WORLD_FORMAT} from '../engine/world-schema.mjs';
test('light effects are deterministic bounded and never amplify beyond base intensity',()=>{
  for(const type of ['pulse','flicker']){
    const effect={type,frequency:2.5,amount:.75,seed:9};
    for(let i=0;i<=160;i++){
      const t=i/30;
      const value=lightEffectFactor(effect,t);
      assert.ok(value>=.25-1e-9 && value<=1+1e-9, type+' bounded');
      assert.equal(value,lightEffectFactor(effect,t),type+' repeatability');
    }
  }
  assert.equal(lightEffectFactor({type:'steady'},100),1);
  assert.equal(lightEffectFactor({type:'pulse',frequency:1,amount:0},.25),1);
  assert.equal(lightEffectFactor({type:'pulse',frequency:1,amount:1},.25),1);
  assert.equal(lightEffectFactor({type:'pulse',frequency:1,amount:1},.75),0);
});
test('invalid high-frequency flashes, biases, shadow budgets and emitters are rejected',()=>{
  assert.throws(()=>normalizeLightEffect({type:'spark'}),/Unknown light effect/);
  assert.throws(()=>normalizeLightEffect({type:'pulse',frequency:100}),/frequency/);
  assert.throws(()=>normalizeLightEffect({type:'flicker',amount:2}),/amount/);
  assert.throws(()=>normalizeLightEffect({type:'flicker',seed:NaN}),/seed/);
  assert.throws(()=>lightEffectFactor({type:'steady'},NaN),/time/);
  assert.throws(()=>shadowBudget('ultra'),/Unknown lighting profile/);
  assert.throws(()=>normalizeWorldEntity({id:'bulb',type:'light',shadowSize:350}),/shadowSize/);
  assert.throws(()=>normalizeWorldEntity({id:'bulb',type:'light',sourceRadius:-1}),/sourceRadius/);
  assert.throws(()=>normalizeWorldEntity({id:'bulb',type:'light',decay:9}),/decay/);
  assert.throws(()=>normalizeWorldEntity({id:'bulb',type:'light',shadowNormalBias:-1}),/shadowNormalBias/);
  assert.equal(LIGHTING_PROFILES.performance.maxShadowLights,0);
  assert.ok(LIGHTING_PROFILES.quality.maxShadowLights>LIGHTING_PROFILES.balanced.maxShadowLights);
});
test('light specs preserve visible emitter, shadow quality, falloff and animation across JSON',()=>{
  const light=normalizeWorldEntity({id:'lamp',type:'light',kind:'spot',
    position:{x:3,y:4,z:-2},target:{x:1,y:0,z:3},
    color:'#FFCC88',intensity:19,distance:20,decay:2,
    visibleSource:true,sourceRadius:.18,castShadow:true,
    shadowSize:2048,shadowBias:-.0002,shadowNormalBias:.02,
    effect:{type:'flicker',frequency:.8,amount:.17,seed:4}
  });
  assert.equal(light.color,'#ffcc88');
  assert.equal(light.visibleSource,true);
  assert.equal(light.decay,2);
  assert.equal(light.castShadow,true);
  assert.deepEqual(light.effect,{type:'flicker',frequency:.8,amount:.17,seed:4});
  const document=normalizeWorldDocument({format:WORLD_FORMAT,entities:[light]});
  assert.deepEqual(normalizeWorldDocument(JSON.parse(JSON.stringify(document))),document);
});
test('old lights load with conservative no-lens, steady defaults',()=>{
  const spec=normalizeWorldEntity({id:'legacy',type:'light',kind:'point',intensity:3});
  assert.equal(spec.visibleSource,false);
  assert.equal(spec.castShadow,false);
  assert.equal(spec.effect.type,'steady');
  assert.equal(spec.decay,2);
  assert.equal(spec.sourceRadius,.14);
});
