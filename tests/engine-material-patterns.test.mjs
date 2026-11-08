import test from 'node:test';
import assert from 'node:assert/strict';
import {MATERIAL_PRESETS} from '../engine/material-catalog.mjs';
import {sampleMaterialPattern} from '../engine/material-patterns.mjs';

const close=(actual,expected,label)=>
  assert.ok(Math.abs(actual-expected)<1e-6,label+': '+actual+' vs '+expected);

test('all 168 procedural materials have matching opposite edges',()=>{
  for(const preset of MATERIAL_PRESETS) for(const repeat of [1,2,4,7.5]) for(let i=0;i<=32;i++){
    const t=i/32;
    close(sampleMaterialPattern(preset,0,t,repeat),sampleMaterialPattern(preset,1,t,repeat),
      preset.id+' left/right at '+t+', repeat '+repeat);
    close(sampleMaterialPattern(preset,t,0,repeat),sampleMaterialPattern(preset,t,1,repeat),
      preset.id+' top/bottom at '+t+', repeat '+repeat);
  }
});

test('patterns remain continuous under 2x and 4x UV tiling',()=>{
  for(const preset of MATERIAL_PRESETS){
    for(const repeat of [1,2,4,7.5]) for(let i=0;i<20;i++){
      const u=(i+.25)/20,v=((i*7)%20+.6)/20;
      close(sampleMaterialPattern(preset,u,v,repeat),
        sampleMaterialPattern(preset,u+1,v-2,repeat),
        preset.id+' repeat '+repeat);
    }
  }
});

test('organic grain and stone lines meet smoothly across texture borders',()=>{
  // Exact equal endpoints alone can hide a one-pixel jump. This checks
  // samples approaching the seam from opposite sides.
  for(const category of ['wood','stone','metal','concrete','plaster','ground']){
    const preset=MATERIAL_PRESETS.find(p=>p.category===category);
    for(let i=0;i<150;i++){
      const t=(i+.33)/150,epsilon=1e-5;
      const xDiff=Math.abs(sampleMaterialPattern(preset,epsilon,t)-
        sampleMaterialPattern(preset,1-epsilon,t));
      const yDiff=Math.abs(sampleMaterialPattern(preset,t,epsilon)-
        sampleMaterialPattern(preset,t,1-epsilon));
      assert.ok(xDiff<1&&yDiff<1,category+' has a visible edge jump');
    }
  }
});

test('the patterns retain visible texture detail away from joins',()=>{
  for(const category of ['brick','stone','wood','metal','tile','roof']){
    const preset=MATERIAL_PRESETS.find(p=>p.category===category);
    const samples=[];
    for(let y=0;y<14;y++)for(let x=0;x<14;x++)
      samples.push(sampleMaterialPattern(preset,(x+.33)/14,(y+.47)/14));
    assert.ok(Math.max(...samples)-Math.min(...samples)>10,
      category+' lost its pattern contrast');
  }
});

test('2x detail is unique across quadrants, not four identical panels',()=>{
  for(const category of ['concrete','brick','stone','wood','metal','roof','tile','ground']){
    const preset=MATERIAL_PRESETS.find(p=>p.category===category);
    let difference=0;
    for(let i=0;i<100;i++){
      const u=(i%10+.37)/20,v=(Math.floor(i/10)+.29)/20;
      difference+=Math.abs(sampleMaterialPattern(preset,u,v,2)-
        sampleMaterialPattern(preset,u+.5,v,2));
    }
    assert.ok(difference>50,category+' still repeats its top-left pattern in top-right');
  }
});
