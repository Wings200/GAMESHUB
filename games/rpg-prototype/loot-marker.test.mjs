import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');
const start=source.indexOf('function makeLootMarker(bag){');
const end=source.indexOf('function spawnWorldLoot(',start);
const markerSource=source.slice(start,end);

test('Loot drops use a glowing physical case instead of floating world text',()=>{
  assert.ok(start>0&&end>start);
  assert.match(markerSource,/new THREE\.Mesh\(new THREE\.BoxGeometry/);
  assert.match(markerSource,/emissive:tint/);
  assert.match(markerSource,/function updateLootGlow\(dt\)/);
  assert.match(source,/updateLootGlow\(dt\)/);
  assert.doesNotMatch(markerSource,/document\.createElement\('canvas'\)/);
  assert.doesNotMatch(markerSource,/new THREE\.Sprite\(/);
  assert.doesNotMatch(markerSource,/fillText\(/);
});

test('Loot interaction remains a nearby E prompt, not a hovering billboard',()=>{
  assert.match(source,/else if\(nearby\)\$\('lootPrompt'\)\.textContent='E · SEARCH '/);
  assert.match(source,/if\(!bag\.items\.length\)return null/);
  assert.match(source,/disposeLootMarker\(bag\.mesh\)/);
});
