import test from 'node:test';
import assert from 'node:assert/strict';
import {renderMechanicalTestCue, renderIntroMetalOverlay, installPolishedFoley} from '../engine/foley.js';
import {EngineAudio} from '../engine/audio.js';

function stats(sound) {
  let peak = 0, energy = 0, finite = true;
  for (const channel of [sound.left, sound.right]) {
    for (const sample of channel) {
      peak = Math.max(peak, Math.abs(sample));
      energy += sample * sample;
      finite &&= Number.isFinite(sample);
    }
  }
  return {peak, energy, finite};
}

test('new mechanical cue is short, stable, non-clipped, and reproducible', () => {
  const one = renderMechanicalTestCue(), two = renderMechanicalTestCue();
  assert.equal(one.sampleRate, 48000);
  assert.equal(one.left.length, Math.round(0.92 * 48000));
  assert.deepEqual(one.left, two.left);
  assert.deepEqual(one.right, two.right);
  const {peak, energy, finite} = stats(one);
  assert.ok(finite && peak > 0.1 && peak < 1);
  assert.ok(energy > 5);
  assert.ok(one.left.slice(0, 2000).every(value => value === 0), 'begins quietly before impact');
  assert.equal(one.left.at(-1), 0);
});

test('intro metal overlay preserves the original intro duration with no clipping', () => {
  const sound = renderIntroMetalOverlay();
  assert.equal(sound.left.length, Math.round(4.82 * 48000));
  const {peak, energy, finite} = stats(sound);
  assert.ok(finite && peak > 0.1 && peak < 1 && energy > 1);
  assert.equal(sound.right.at(-1), 0);
});

test('Foley clips install as stereo audio buffers once the browser audio context is active', () => {
  const clips = new Map();
  const context = {state:'running', createBuffer(channels, length, rate) {
    assert.equal(channels, 2); assert.equal(rate, 48000);
    return {length, copies: [], copyToChannel(pcm, channel) {
      assert.equal(pcm.length, length); this.copies.push(channel);
    }};
  }};
  assert.equal(installPolishedFoley({context:{...context,state:'suspended'},clips}), false);
  assert.equal(installPolishedFoley({context,clips}), true);
  assert.deepEqual(Array.from(clips.keys()), ['gameshub-mechanical-test','gameshub-intro-metal-overlay']);
  for (const buffer of clips.values()) assert.deepEqual(buffer.copies, [0,1]);
});

test('new cue takes priority and intro stops both original and enhancement on skip', () => {
  const audio = new EngineAudio();
  const names = [], stopped = [];
  audio.playClip = name => {names.push(name); return {stop(){stopped.push(name);}};};
  for (const name of ['gameshub-test-cue','gameshub-mechanical-test','gameshub-logo-intro','gameshub-intro-metal-overlay'])
    audio.clips.set(name, {});
  audio.ping(); audio.intro();
  assert.deepEqual(names,['gameshub-mechanical-test','gameshub-logo-intro','gameshub-intro-metal-overlay']);
  audio.stopIntro();
  assert.deepEqual(stopped,['gameshub-logo-intro','gameshub-intro-metal-overlay']);
});
