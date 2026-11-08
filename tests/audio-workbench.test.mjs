import test from 'node:test';
import assert from 'node:assert/strict';
import {layerTiming, mixDuration, encodeWav, MAX_MIX_SECONDS} from '../engine/audio-workbench.js';

const buffer = {duration: 3};
test('audio layer timing respects trim, pitch and offset', () => {
  const layer = layerTiming({buffer, trimStart: 0.5, trimEnd: 2.5, pitch: 12, delay: 0.3});
  assert.equal(layer.playbackRate, 2);
  assert.equal(layer.duration, 1);
  assert.equal(layer.start, 0.3);
});

test('mix length follows the latest layer and never exceeds safety cap', () => {
  assert.equal(mixDuration([{buffer, delay: 0}, {buffer, delay: 2}]), 5);
  assert.equal(mixDuration([{buffer, delay: 90}]), MAX_MIX_SECONDS);
  assert.equal(mixDuration([]), 0);
});

test('exports a valid stereo 16-bit WAV header with correctly encoded PCM samples', async () => {
  const wave = encodeWav({length: 2, numberOfChannels: 1, sampleRate: 48000,
    getChannelData: () => new Float32Array([0.5, -1])});
  assert.equal(wave.type, 'audio/wav');
  assert.equal(wave.size, 52);
  const view = new DataView(await wave.arrayBuffer());
  const ascii = (from, size) => String.fromCharCode(...new Uint8Array(view.buffer, from, size));
  assert.equal(ascii(0, 4), 'RIFF');
  assert.equal(ascii(8, 4), 'WAVE');
  assert.equal(view.getUint16(22, true), 2);
  assert.equal(view.getUint32(24, true), 48000);
  assert.equal(view.getInt16(44, true), 16384);
  assert.equal(view.getInt16(48, true), -32768);
});
