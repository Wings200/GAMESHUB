import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {encodeWav, decodeWav} from '../tools/audio/wav.mjs';
import {renderRecipe} from '../tools/audio/mixer.mjs';
import {buildAudio} from '../tools/audio/build.mjs';

function fixture(amplitude = 0.2, frames = 4800, channels = 1) {
  const left = Float32Array.from({length: frames}, (_, i) => Math.sin(i / 10) * amplitude);
  if (channels === 1) {
    const wav = Buffer.alloc(44 + frames * 2);
    wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVE', 8);
    wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(1, 22); wav.writeUInt32LE(48000, 24); wav.writeUInt32LE(96000, 28);
    wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36);
    wav.writeUInt32LE(frames * 2, 40);
    left.forEach((value, i) => wav.writeInt16LE(Math.round(value * 32767), 44 + i * 2));
    return wav;
  }
  const right = Float32Array.from({length: frames}, (_, i) => Math.cos(i / 10) * amplitude);
  return encodeWav({left, right, sampleRate: 48000});
}

test('WAV recordings decode as stereo float channels', () => {
  const decoded = decodeWav(fixture(0.2, 240, 2));
  assert.equal(decoded.frames, 240);
  assert.equal(decoded.sampleRate, 48000);
  assert.equal(decoded.channels.length, 2);
  assert.ok(Math.abs(decoded.channels[1][0] - 0.2) < 0.0001);
});

test('rendering two recorded layers produces a playable WAV and loudness report', () => {
  const recording = decodeWav(fixture());
  const {wav, stats} = renderRecipe({sampleRate: 48000, layers: [
    {source: 'a.wav', start: 0.1, gainDb: -6, pan: -0.2},
    {source: 'a.wav', start: 0.2, pitchSemitones: -12, gainDb: -9, fadeOut: 0.04}
  ]}, new Map([['a.wav', recording]]));
  assert.equal(stats.layers, 2);
  assert.ok(stats.seconds > 0.45 && stats.seconds < 0.55);
  assert.ok(stats.rms > 0.001);
  assert.equal(decodeWav(wav).channels.length, 2);
});

test('invalid recipe fails loudly instead of silently truncating sounds', () => {
  const recording = decodeWav(fixture());
  assert.throws(() => renderRecipe({layers: [{source: 'a.wav', start: 29.95}]}, new Map([['a.wav', recording]])), /maximum is 30s/);
  assert.throws(() => renderRecipe({layers: [{source: 'missing.wav'}]}, new Map()), /Missing recorded sound/);
});

test('assistant CLI builds a WAV and JSON report from a local recording', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'gameshub-audio-'));
  try {
    await writeFile(join(temporary, 'recording.wav'), fixture());
    await writeFile(join(temporary, 'recipe.json'), JSON.stringify({output: 'finished.wav', layers: [{source: 'recording.wav', gainDb: -1}]}));
    const result = await buildAudio(join(temporary, 'recipe.json'));
    assert.equal(result.layers, 1);
    const wav = decodeWav(await readFile(join(temporary, 'finished.wav')));
    assert.equal(wav.sampleRate, 48000);
    const report = JSON.parse(await readFile(join(temporary, 'finished.report.json'), 'utf8'));
    assert.equal(report.layers, 1);
  } finally { await rm(temporary, {recursive: true, force: true}); }
});
