import test from 'node:test';
import assert from 'node:assert/strict';
import {getMaterialPreset,MATERIAL_PRESETS} from '../engine/material-catalog.mjs';
import {getTextileConstruction,sampleTextileStructure} from '../engine/textile-structures.mjs';
import {sampleMaterialPattern,sampleMaterialRelief} from '../engine/material-patterns.mjs';

const representative=[
 ['fabric-natural-linen','linen-plain'],
 ['fabric-navy-canvas','basket-weave'],
 ['fabric-denim','diagonal-twill'],
 ['fabric-burgundy-velvet','velvet-nap'],
 ['fabric-graphite-felt','felted'],
 ['fabric-cream-wool','wool-knit'],
 ['carpet-warm-beige-plush','plush-cut'],
 ['carpet-charcoal-berber','berber-loop'],
 ['carpet-ivory-shag','shag-pile'],
 ['carpet-navy-office-loop','commercial-loop'],
 ['carpet-rust-woven-rug','rug-flatweave'],
 ['carpet-graphite-entry-mat','entry-ribbed']
];

test('construction type has a meaningful identity and is unrelated to color',()=>{
  for(const [id,type] of representative){
    const preset=getMaterialPreset(id);
    assert.ok(preset,id);
    assert.equal(getTextileConstruction(preset),type);
    const retinted={...preset,color:'#999999'};
    assert.equal(getTextileConstruction(retinted),type);
    assert.equal(sampleTextileStructure(preset,.37,.28,1).albedo,
      sampleTextileStructure(retinted,.37,.28,1).albedo);
  }
  assert.equal(getTextileConstruction(getMaterialPreset('metal-brushed-steel')),null);
});

test('all 24 textile presets remain periodic at fractional and integer density',()=>{
  for(const preset of MATERIAL_PRESETS.filter(p=>['fabric','carpet'].includes(p.category))){
    for(const density of [.5,1,1.25,2,2.75,4,7.5])for(let i=0;i<26;i++){
      const v=(i+.42)/26;
      for(const fn of [sampleMaterialPattern]){
        assert.ok(Math.abs(fn(preset,0,v,density)-fn(preset,1,v,density))<1e-8,
          preset.id+' horizontal color seam '+density);
        assert.ok(Math.abs(fn(preset,v,0,density)-fn(preset,v,1,density))<1e-8,
          preset.id+' vertical color seam '+density);
      }
      const left=sampleMaterialRelief(preset,0,v,density),right=sampleMaterialRelief(preset,1,v,density);
      const top=sampleMaterialRelief(preset,v,0,density),bottom=sampleMaterialRelief(preset,v,1,density);
      for(const field of ['height','roughness']){
        assert.ok(Math.abs(left[field]-right[field])<1e-8,preset.id+' X '+field);
        assert.ok(Math.abs(top[field]-bottom[field])<1e-8,preset.id+' Y '+field);
      }
      const sample=sampleTextileStructure(preset,v,.31,density);
      assert.ok(Number.isFinite(sample.albedo)&&sample.albedo>=-45&&sample.albedo<=45);
      assert.ok(Number.isFinite(sample.height)&&sample.height>=0&&sample.height<=1);
      assert.ok(Number.isFinite(sample.roughness)&&sample.roughness>=.72&&sample.roughness<=1);
    }
  }
});

test('equal-color swatches use distinctly different structures—not simply a new seed',()=>{
  const group=[representative.slice(0,6),representative.slice(6)];
  for(const variants of group){
    const profiles=variants.map(([id])=>{
      const p=getMaterialPreset(id);
      return Array.from({length:24*24},(_,n)=>{
        const u=((n%24)+.37)/24,v=(Math.floor(n/24)+.19)/24;
        return sampleTextileStructure({...p,color:'#9a9a9a'},u,v,1);
      });
    });
    for(let a=0;a<profiles.length;a++)for(let b=a+1;b<profiles.length;b++){
      const x=profiles[a],y=profiles[b];
      let contrast=0,shapeDifference=0;
      for(let i=0;i<x.length;i++){
        contrast+=Math.abs(x[i].albedo-y[i].albedo);
        shapeDifference+=Math.abs(x[i].height-y[i].height);
      }
      contrast/=x.length;shapeDifference/=x.length;
      assert.ok(contrast>2.5 && shapeDifference>.015,
        variants[a][0]+' vs '+variants[b][0]+' too similar with same tint');
    }
  }
});

test('high frequency materials are visible at default textile scale',()=>{
  const fabric=getMaterialPreset('fabric-natural-linen');
  const carpet=getMaterialPreset('carpet-warm-beige-plush');
  assert.ok(fabric.repeat<=1.5);
  assert.ok(carpet.repeat<=1.5);
  const bern=getMaterialPreset('carpet-charcoal-berber');
  // Neighboring pixels on either side of outer tile still match, not a
  // hard seam introduced by staggered ring rows.
  for(const sample of [bern,getMaterialPreset('fabric-denim')])for(let i=0;i<30;i++){
    const t=(i+.19)/30;
    const eps=1e-6;
    assert.ok(Math.abs(sampleMaterialPattern(sample,eps,t,2.75)-
      sampleMaterialPattern(sample,1-eps,t,2.75))<.2,
      sample.id+' near boundary color discontinuity');
  }
});
