import test from 'node:test';
import assert from 'node:assert/strict';
import {EngineAudio} from '../engine/audio.js';
import {EngineIntro} from '../engine/intro.js';

test('intro and test buttons use authored clips instead of oscillator tones', () => {
  const audio = new EngineAudio();
  const played = [];
  let stops = 0;
  audio.tone = () => { throw new Error('Oscillator fallback must not be used.'); };
  audio.playClip = name => { played.push(name); return {stop() { stops++; }}; };
  assert.equal(audio.intro(), null, 'missing asset remains silent');
  audio.clips.set('gameshub-logo-intro', {});
  audio.clips.set('gameshub-test-cue', {});
  audio.intro();
  audio.ping();
  audio.stopIntro();
  assert.deepEqual(played, ['gameshub-logo-intro', 'gameshub-test-cue']);
  assert.equal(stops, 1);
});

test('intro skip stops the playing cinematic audio', async () => {
  const elements = new Map();
  const root = {hidden: true, offsetWidth: 0,
    querySelector() { return {addEventListener() {}}; },
    classList: {add() {}, remove() {}}};
  let played = 0;
  let stopped = 0;
  const intro = new EngineIntro(root, {intro() { played++; }, stopIntro() { stopped++; }});
  const promise = intro.play();
  assert.equal(root.hidden, false);
  intro.finish();
  await promise;
  assert.equal(played, 1);
  assert.equal(stopped, 1);
  assert.equal(root.hidden, true);
});
