import test from 'node:test';
import assert from 'node:assert/strict';
import {MATERIAL_PRESETS,getMaterialPreset} from '../engine/material-catalog.mjs';
import {sampleMaterialPattern,sampleMaterialRelief} from '../engine/material-patterns.mjs';

const families=['fabric','carpet'];
test('all 24 fabric and carpet materials preserve edge-continuity from .25x to 8x',()=>{
  for(const category of families)for(const preset of MATERIAL_PRESETS.filter(p=>p.category===category)){
    for(const density of [.25,.5,1,1.25,2,2.5,4,7.5,8])for(let n=0;n<=42;n++){
      const t=n/42;
      for(const sample of [sampleMaterialPattern,sampleMaterialRelief]){
        const west=sample(preset,0,t,density);
        const east=sample(preset,1,t,density);
        const north=sample(preset,t,0,density);
        const south=sample(preset,t,1,density);
        for(const key of sample===sampleMaterialRelief?['height','roughness']:[]){
          assert.ok(Math.abs(west[key]-east[key])<1e-9,
            preset.id+' '+key+' horizontal seam at '+density);
          assert.ok(Math.abs(north[key]-south[key])<1e-9,
            preset.id+' '+key+' vertical seam at '+density);
          assert.ok(west[key]>=0&&west[key]<=1,preset.id+' '+key+' bounds');
        }
        if(sample===sampleMaterialPattern){
          assert.ok(Math.abs(west-east)<1e-9,preset.id+' color horizontal seam');
          assert.ok(Math.abs(north-south)<1e-9,preset.id+' color vertical seam');
        }
      }
    }
  }
});

test('fabric woven fibers and carpet pile have visibly varying surface normals and roughness',()=>{
  for(const category of families){
    const presets=MATERIAL_PRESETS.filter(p=>p.category===category);
    for(const preset of presets){
      const height=[],rough=[],color=[];
      for(let y=0;y<32;y++)for(let x=0;x<32;x++){
        const u=(x+.31)/32,v=(y+.37)/32;
        const p=sampleMaterialRelief(preset,u,v,1.5);
        height.push(p.height);rough.push(p.roughness);
        color.push(sampleMaterialPattern(preset,u,v,1.5));
      }
      assert.ok(Math.max(...height)-Math.min(...height)>.035,
        preset.id+' normal height too flat');
      assert.ok(Math.max(...rough)-Math.min(...rough)>.025,
        preset.id+' lacks roughness variation');
      assert.ok(Math.max(...color)-Math.min(...color)>4,
        preset.id+' lacks albedo fiber texture');
    }
  }
});

test('fabric and carpet have different relief patterns, not rebranded duplicates',()=>{
  const woven=getMaterialPreset('fabric-natural-linen');
  const velvet=getMaterialPreset('fabric-burgundy-velvet');
  const plush=getMaterialPreset('carpet-warm-beige-plush');
  const loop=getMaterialPreset('carpet-charcoal-berber');
  const sample=p=>Array.from({length:150},(_,i)=>{
    const u=(i%15+.11)/15,v=(Math.floor(i/15)+.18)/10;
    return sampleMaterialRelief(p,u,v,1.5).height;
  });
  const profiles=[woven,velvet,plush,loop].map(sample);
  const difference=(a,b)=>a.reduce((sum,x,i)=>sum+Math.abs(x-b[i]),0);
  assert.ok(difference(profiles[0],profiles[1])>1,'velvet must differ from linen');
  assert.ok(difference(profiles[1],profiles[2])>1,'carpet should differ from velvet');
  assert.ok(difference(profiles[2],profiles[3])>1,'berber should differ from plush');
});

test('twill remains seamless at fractional density and scale changes do not create repeat panels',()=>{
  const twill=getMaterialPreset('fabric-sage-twill');
  const rug=getMaterialPreset('carpet-rust-woven-rug');
  for(const preset of [twill,rug])for(const density of [1.25,2.75]){
    for(let i=0;i<35;i++){
      const t=(i+.22)/35,epsilon=1e-6;
      assert.ok(Math.abs(sampleMaterialPattern(preset,epsilon,t,density)-
        sampleMaterialPattern(preset,1-epsilon,t,density))<.1);
      assert.ok(Math.abs(sampleMaterialPattern(preset,t,epsilon,density)-
        sampleMaterialPattern(preset,t,1-epsilon,density))<.1);
    }
    let quadrantDifference=0;
    for(let i=0;i<80;i++){
      const u=(i%10+.25)/20,v=(Math.floor(i/10)+.21)/20;
      quadrantDifference+=Math.abs(sampleMaterialPattern(preset,u,v,density)-
        sampleMaterialPattern(preset,u+.5,v,density));
    }
    assert.ok(quadrantDifference>40,preset.id+' repeats an identical quadrant');
  }
});
