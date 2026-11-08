import test from 'node:test';
import assert from 'node:assert/strict';
import {WORLD_FORMAT,normalizeWorldEntity,normalizeWorldDocument} from '../engine/world-schema.mjs';

const mesh={id:'west-wall',type:'mesh',geometry:'box',
  size:{x:4,y:3,z:.3},position:{x:2,y:1.5,z:0},
  material:'brick-red-clay',collidable:true};
test('code-first world schema is deterministic, normalizes presets and survives JSON',()=>{
  const normalized=normalizeWorldEntity(mesh);
  assert.equal(normalized.id,mesh.id);
  assert.equal(normalized.material.id,'brick-red-clay');
  assert.equal(normalized.material.settings.detailStrength,1);
  assert.deepEqual(normalized.rotation,{x:0,y:0,z:0});
  const doc={format:WORLD_FORMAT,entities:[
    mesh,
    {id:'factory-light',type:'light',kind:'spot',position:{x:0,y:5,z:0},
      target:{x:0,y:0,z:0},color:'#ffaa88',angle:.65,intensity:9},
    {id:'door-open',type:'sound',clip:'door-open',volume:.7}
  ]};
  const output=normalizeWorldDocument(doc);
  assert.equal(output.entities.length,3);
  assert.equal(output.entities[1].color,'#ffaa88');
  assert.equal(output.entities[1].penumbra,.3);
  assert.equal(output.entities[2].volume,.7);
  assert.deepEqual(normalizeWorldDocument(JSON.parse(JSON.stringify(output))),output);
});
test('all 180 material presets can be referenced without generated textures',async()=>{
  const {MATERIAL_PRESETS}=await import('../engine/material-catalog.mjs');
  assert.equal(MATERIAL_PRESETS.length,180);
  for(const preset of MATERIAL_PRESETS){
    const out=normalizeWorldEntity({
      id:'test_'+preset.category,type:'mesh',geometry:'box',material:preset.id
    });
    assert.equal(out.material.id,preset.id);
  }
});
test('invalid geometry, material, rotation and physics inputs are rejected before render',()=>{
  assert.throws(()=>normalizeWorldEntity({...mesh,material:'not-real'}),/Unknown material/);
  assert.throws(()=>normalizeWorldEntity({...mesh,geometry:'teapot'}),/Unknown geometry/);
  assert.throws(()=>normalizeWorldEntity({...mesh,rotation:{y:1}}),/zero rotation/);
  assert.throws(()=>normalizeWorldEntity({...mesh,size:{x:0,y:3,z:2}}),/size.x/);
  assert.throws(()=>normalizeWorldEntity({...mesh,size:{x:NaN}}),/size.x/);
  assert.throws(()=>normalizeWorldEntity({...mesh,id:'<script>'}),/id must/);
  assert.throws(()=>normalizeWorldEntity({...mesh,type:'physics'}),/Unknown entity type/);
  assert.throws(()=>normalizeWorldEntity({id:'sun',type:'light',kind:'sun'}),/point or spot/);
  assert.throws(()=>normalizeWorldEntity({id:'sun',type:'light',color:'javascript:bad'}),/six-digit/);
  assert.throws(()=>normalizeWorldEntity({id:'audio',type:'sound',clip:'door',volume:8}),/volume/);
});
test('a scene with duplicate IDs or wrong format cannot be loaded',()=>{
  assert.throws(()=>normalizeWorldDocument({format:'old',entities:[]}),/Unsupported world format/);
  assert.throws(()=>normalizeWorldDocument({format:WORLD_FORMAT,entities:[mesh,mesh]}),/Duplicate entity/);
  assert.throws(()=>normalizeWorldDocument({format:WORLD_FORMAT,entities:[mesh,{...mesh,id:'x',material:'absent'}]}),/Unknown material/);
  assert.throws(()=>normalizeWorldDocument({format:WORLD_FORMAT,entities:{}}),/array/);
});
test('unrotated XZ physical footprints use bounding sizes for boxes and spheres',()=>{
  const box=normalizeWorldEntity(mesh);
  const sphere=normalizeWorldEntity({
    id:'ball',type:'mesh',geometry:'sphere',size:{radius:2},
    material:'metal-brushed-steel',position:{x:0,y:2,z:0},collidable:true});
  assert.deepEqual(box.size,{x:4,y:3,z:.3});
  assert.deepEqual(sphere.size,{radius:2});
  const cylinder=normalizeWorldEntity({id:'post',type:'mesh',geometry:'cylinder',
    size:{radius:.4,height:4},material:'concrete-poured-gray',collidable:true});
  assert.equal(cylinder.collidable,true);
  // Explicitly permissive rotations are limited to noncollidable meshes.
  const decorative=normalizeWorldEntity({...mesh,id:'ornament',collidable:false,rotation:{y:Math.PI/4}});
  assert.equal(decorative.rotation.y,Math.PI/4);
});
