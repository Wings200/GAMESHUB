import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeAudioPosition,segmentIntersectsAABB,estimateOcclusion} from '../engine/audio-spatial.js';
import {normalizeWorldEntity,WORLD_FORMAT,normalizeWorldDocument} from '../engine/world-schema.mjs';

const wall={minX:-.2,maxX:.2,minY:0,maxY:3,minZ:-2,maxZ:2};
const a={x:-3,y:1.7,z:0},b={x:3,y:1.7,z:0};
test('ray crossing a real full-height wall muffles sound',()=>{
  assert.equal(segmentIntersectsAABB(a,b,wall),true);
  assert.ok(estimateOcclusion(a,b,[wall])>.4);
  assert.equal(estimateOcclusion(a,b,[]),0);
  assert.ok(estimateOcclusion(a,b,[wall,wall])>estimateOcclusion(a,b,[wall]));
});
test('sound under an overhead slab stays unoccluded by it',()=>{
  const overhead={...wall,minY:4,maxY:5};
  assert.equal(segmentIntersectsAABB(a,b,overhead),false);
  assert.equal(estimateOcclusion(a,b,[overhead]),0);
});
test('far away, behind-player and non-overlapping walls do not muffle',()=>{
  const far={...wall,minX:7,maxX:8};
  assert.equal(segmentIntersectsAABB(a,b,far),false);
  assert.equal(estimateOcclusion(a,b,[far]),0);
  assert.equal(segmentIntersectsAABB(b,a,wall),true);
});
test('sound position validation handles malformed input safely',()=>{
  assert.deepEqual(normalizeAudioPosition({x:0,y:-2,z:3}),{x:0,y:-2,z:3});
  assert.throws(()=>normalizeAudioPosition({x:0,y:NaN,z:2}),/finite/);
  assert.throws(()=>segmentIntersectsAABB(a,b,{...wall,minY:7,maxY:4}),/Invalid/);
  assert.throws(()=>estimateOcclusion(a,b,{}),/array/);
});
test('sound emitter marker schema contains spatial and mix controls',()=>{
  const marker=normalizeWorldEntity({id:'machine-noise',type:'sound',clip:'pump',
    position:{x:8,y:3,z:2},spatial:true,loop:true,bus:'ambience',
    volume:.4,refDistance:2,maxDistance:40,rolloffFactor:1.3});
  assert.equal(marker.spatial,true);
  assert.equal(marker.loop,true);
  assert.equal(marker.bus,'ambience');
  assert.equal(marker.occlusion,true);
  assert.equal(marker.maxDistance,40);
  const doc=normalizeWorldDocument({format:WORLD_FORMAT,entities:[marker]});
  assert.deepEqual(normalizeWorldDocument(doc),doc);
  assert.throws(()=>normalizeWorldEntity({...marker,bus:'unsafe'}),/Unknown sound bus/);
  assert.throws(()=>normalizeWorldEntity({...marker,maxDistance:.1,refDistance:2}),/maxDistance/);
  assert.throws(()=>normalizeWorldEntity({...marker,rolloffFactor:25}),/rolloffFactor/);
  assert.equal(normalizeWorldEntity({id:'legacy',type:'sound',clip:'bell'}).spatial,false);
});
