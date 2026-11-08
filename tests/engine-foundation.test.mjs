import test from 'node:test';
import assert from 'node:assert/strict';
import {clampDelta, moveVector} from '../engine/math.js';

test('game-loop delta stays safe after frame stalls', () => {
  assert.equal(clampDelta(0.016), 0.016);
  assert.equal(clampDelta(4), 0.05);
  assert.equal(clampDelta(-2), 0);
  assert.equal(clampDelta(NaN), 0);
});

test('movement vectors match first-person camera yaw', () => {
  const forward = moveVector(new Set(['KeyW']), 0);
  assert.ok(Math.abs(forward.x) < 1e-9);
  assert.equal(forward.z, -1);
  const side = moveVector(new Set(['KeyD']), 0);
  assert.equal(side.x, 1);
  assert.ok(Math.abs(side.z) < 1e-9);
  const turned = moveVector(new Set(['KeyW']), Math.PI / 2);
  assert.ok(Math.abs(turned.x + 1) < 1e-9);
});

test('diagonal movement is normalized; opposite inputs cancel', () => {
  const diagonal = moveVector(new Set(['KeyW', 'KeyD']), 0);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.z) - 1) < 1e-9);
  assert.deepEqual(moveVector(new Set(['KeyW', 'KeyS']), 0), {x: 0, z: 0});
});
