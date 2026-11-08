import test from 'node:test';
import assert from 'node:assert/strict';
import {MATERIAL_PRESETS,getMaterialPreset} from '../engine/material-catalog.mjs';
import {sampleMaterialRelief} from '../engine/material-patterns.mjs';

const newFamilies=['stone','tile','metal','roof'];
test('all 48 new presets produce bounded, periodic height and roughness maps',()=>{
  for(const family of newFamilies) {
    const presets=MATERIAL_PRESETS.filter(p=>p.category===family);
    assert.equal(presets.length,12,family);
    for(const preset of presets)for(const scale of [0.5,1,2,4,7.5])for(let n=0;n<24;n++){
      const t=(n+.17)/24;
      const a=sampleMaterialRelief(preset,0,t,scale);
      const b=sampleMaterialRelief(preset,1,t,scale);
      const c=sampleMaterialRelief(preset,t,0,scale);
      const d=sampleMaterialRelief(preset,t,1,scale);
      assert.ok(a && b && c && d);
      for(const v of [a,b,c,d]) {
        assert.ok(Number.isFinite(v.height)&&v.height>=0&&v.height<=1,
          family+' unbounded height');
        assert.ok(Number.isFinite(v.roughness)&&v.roughness>=0&&v.roughness<=1,
          family+' unbounded roughness');
      }
      assert.ok(Math.abs(a.height-b.height)<1e-7 && Math.abs(a.roughness-b.roughness)<1e-7,
        family+' left/right edge mismatch');
      assert.ok(Math.abs(c.height-d.height)<1e-7 && Math.abs(c.roughness-d.roughness)<1e-7,
        family+' top/bottom edge mismatch');
    }
  }
});

test('tile grout recessed below smooth faces',()=>{
  const tile=getMaterialPreset('tile-white-subway');
  const mortar=sampleMaterialRelief(tile,0,0,1);
  const face=sampleMaterialRelief(tile,.125,.125,1);
  assert.ok(face.height-mortar.height>.25);
  assert.ok(mortar.roughness>face.roughness);
});
test('stone is uneven with recesses and natural roughness variation',()=>{
  const stone=getMaterialPreset('stone-granite-silver');
  const heights=[],roughs=[];
  for(let y=0;y<28;y++)for(let x=0;x<28;x++){
    const p=sampleMaterialRelief(stone,(x+.11)/28,(y+.2)/28,2);
    heights.push(p.height);roughs.push(p.roughness);
  }
  assert.ok(Math.max(...heights)-Math.min(...heights)>.25);
  assert.ok(Math.max(...roughs)-Math.min(...roughs)>.055);
});
test('metal has brushed height grain and restrained smooth polished variants',()=>{
  const brushed=getMaterialPreset('metal-brushed-steel');
  const chrome=getMaterialPreset('metal-polished-chrome');
  const samples=[],polished=[];
  for(let i=0;i<512;i++) {
    samples.push(sampleMaterialRelief(brushed,.31,(i+.33)/512,2).height);
    polished.push(sampleMaterialRelief(chrome,.31,(i+.33)/96,2).height);
  }
  assert.ok(Math.max(...samples)-Math.min(...samples)>.05);
  assert.ok(Math.max(...polished)-Math.min(...polished) <
    Math.max(...samples)-Math.min(...samples),'polished metal should have subtler relief');
});
test('roof seams and tiered shingles have measurable perceived height variation',()=>{
  const roof=getMaterialPreset('roof-slate-roof');
  const heights=[];
  for(let i=0;i<64;i++)heights.push(sampleMaterialRelief(roof,.31,(i+.23)/64,1).height);
  assert.ok(Math.max(...heights)-Math.min(...heights)>.18);
});
