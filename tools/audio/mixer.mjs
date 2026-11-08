import {encodeWav} from './wav.mjs';

export const MAX_LAYERS = 12;
export const MAX_SECONDS = 30;
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const db = value => Math.pow(10, value / 20);

function number(value, defaultValue, min, max, label) {
  if (value === undefined) return defaultValue;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${label} must be a number from ${min} to ${max}.`);
  }
  return value;
}

function sample(samples, index) {
  const start = Math.floor(index);
  if (start < 0 || start >= samples.length) return 0;
  const end = Math.min(start + 1, samples.length - 1);
  const mix = index - start;
  return samples[start] * (1 - mix) + samples[end] * mix;
}

export function renderRecipe(recipe, recordings) {
  const sampleRate = number(recipe.sampleRate, 48000, 22050, 96000, 'sampleRate');
  if (!Number.isInteger(sampleRate)) throw new Error('sampleRate must be an integer.');
  if (!Array.isArray(recipe.layers) || !recipe.layers.length || recipe.layers.length > MAX_LAYERS) {
    throw new Error(`A recipe needs 1–${MAX_LAYERS} recorded layers.`);
  }

  const tracks = recipe.layers.map((layer, id) => {
    const audio = recordings.get(layer.source);
    if (!audio) throw new Error(`Missing recorded sound: ${layer.source}.`);
    const start = number(layer.start, 0, 0, MAX_SECONDS, `layers[${id}].start`);
    const trimStart = number(layer.trimStart, 0, 0, audio.duration, `layers[${id}].trimStart`);
    const trimEnd = number(layer.trimEnd, audio.duration, trimStart, audio.duration, `layers[${id}].trimEnd`);
    const pitch = number(layer.pitchSemitones, 0, -12, 12, `layers[${id}].pitchSemitones`);
    const speed = 2 ** (pitch / 12);
    const duration = (trimEnd - trimStart) / speed;
    if (duration <= 0) throw new Error(`layers[${id}] has an empty trim selection.`);
    return {audio, start, trimStart, speed, duration,
      gain: db(number(layer.gainDb, 0, -60, 12, `layers[${id}].gainDb`)),
      pan: number(layer.pan, 0, -1, 1, `layers[${id}].pan`),
      fadeIn: number(layer.fadeIn, 0.01, 0, 3, `layers[${id}].fadeIn`),
      fadeOut: number(layer.fadeOut, 0.12, 0, 5, `layers[${id}].fadeOut`),
      lowpass: number(layer.lowpassHz, 20000, 200, 20000, `layers[${id}].lowpassHz`)};
  });

  const requestedDuration = Math.max(...tracks.map(track => track.start + track.duration));
  if (requestedDuration > MAX_SECONDS) throw new Error(`Mix is ${requestedDuration.toFixed(2)}s; maximum is ${MAX_SECONDS}s. Reduce trim or start delay.`);
  const count = Math.ceil((requestedDuration + 0.1) * sampleRate);
  const left = new Float32Array(count);
  const right = new Float32Array(count);

  for (const track of tracks) {
    const {audio, start, trimStart, speed, duration, gain, pan, fadeIn, fadeOut, lowpass} = track;
    const initialFrame = Math.round(start * sampleRate);
    const endFrame = Math.min(count, Math.ceil((start + duration) * sampleRate));
    const alpha = 1 - Math.exp(-2 * Math.PI * lowpass / sampleRate);
    let filteredL = 0;
    let filteredR = 0;
    const mono = audio.channels.length === 1;
    const leftGain = mono ? Math.cos((pan + 1) * Math.PI / 4) : pan > 0 ? Math.cos(pan * Math.PI / 2) : 1;
    const rightGain = mono ? Math.sin((pan + 1) * Math.PI / 4) : pan < 0 ? Math.cos(-pan * Math.PI / 2) : 1;
    for (let frame = initialFrame; frame < endFrame; frame++) {
      const elapsed = (frame - initialFrame) / sampleRate;
      const position = (trimStart + elapsed * speed) * audio.sampleRate;
      if (position >= audio.frames) break;
      const envelope = Math.min(1, fadeIn ? elapsed / fadeIn : 1, fadeOut ? (duration - elapsed) / fadeOut : 1);
      const l = sample(audio.channels[0], position);
      const r = sample(audio.channels[mono ? 0 : 1], position);
      filteredL += alpha * (l - filteredL);
      filteredR += alpha * (r - filteredR);
      left[frame] += filteredL * leftGain * gain * Math.max(0, envelope);
      right[frame] += filteredR * rightGain * gain * Math.max(0, envelope);
    }
  }

  const master = db(number(recipe.masterGainDb, -3, -48, 12, 'masterGainDb'));
  let preLimitPeak = 0;
  for (let i = 0; i < count; i++) {
    left[i] *= master;
    right[i] *= master;
    preLimitPeak = Math.max(preLimitPeak, Math.abs(left[i]), Math.abs(right[i]));
  }
  const attenuation = preLimitPeak > 0.98 ? 0.98 / preLimitPeak : 1;
  let energy = 0;
  for (let i = 0; i < count; i++) {
    left[i] *= attenuation;
    right[i] *= attenuation;
    energy += (left[i] ** 2 + right[i] ** 2) / 2;
  }
  const rms = Math.sqrt(energy / count);
  const warnings = [];
  if (attenuation < 0.8) warnings.push('Mix required significant peak attenuation; lower layer levels.');
  if (rms < 0.005) warnings.push('Mix is very quiet; check source recordings and gain.');
  if (tracks.every(track => track.start > 0.5)) warnings.push('Mix has more than half a second of leading silence.');
  return {wav: encodeWav({left, right, sampleRate}), stats: {
    sampleRate, seconds: count / sampleRate, layers: tracks.length, peakBeforeAttenuation: +preLimitPeak.toFixed(5),
    peakAfterAttenuation: +(preLimitPeak * attenuation).toFixed(5), rms: +rms.toFixed(5),
    autoAttenuationDb: +(20 * Math.log10(attenuation)).toFixed(2), warnings
  }};
}
