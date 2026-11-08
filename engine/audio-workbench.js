// A reusable, recording-based sound construction pipeline for GAMESHUB Engine.
// The builder deliberately doesn't generate substitute oscillator sounds.
export const AUDIO_WORKBENCH_VERSION = '0.1.0-dev.003';
export const MAX_LAYERS = 12;
export const MAX_MIX_SECONDS = 30;

export const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

export function layerTiming(layer) {
  if (!layer?.buffer || !Number.isFinite(layer.buffer.duration)) {
    return {start: 0, trimStart: 0, trimEnd: 0, playbackRate: 1, duration: 0};
  }
  const trimStart = clamp(layer.trimStart ?? 0, 0, layer.buffer.duration);
  const trimEnd = clamp(layer.trimEnd ?? layer.buffer.duration, trimStart, layer.buffer.duration);
  const playbackRate = Math.pow(2, clamp(layer.pitch ?? 0, -12, 12) / 12);
  const start = clamp(layer.delay ?? 0, 0, MAX_MIX_SECONDS);
  return {start, trimStart, trimEnd, playbackRate, duration: (trimEnd - trimStart) / playbackRate};
}

export function mixDuration(layers) {
  return Math.min(MAX_MIX_SECONDS, Math.max(0, ...layers.map(layer => {
    const timing = layerTiming(layer);
    return timing.start + timing.duration;
  })));
}

export function connectMix(context, layers, {masterGain = 0.82, compression = true} = {}) {
  const master = context.createGain();
  master.gain.value = clamp(masterGain, 0, 1);
  if (compression) {
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -12;
    compressor.knee.value = 12;
    compressor.ratio.value = 2.5;
    compressor.attack.value = 0.006;
    compressor.release.value = 0.2;
    master.connect(compressor).connect(context.destination);
  } else master.connect(context.destination);

  const sources = [];
  for (const layer of layers.slice(0, MAX_LAYERS)) {
    const {start, trimStart, trimEnd, playbackRate, duration} = layerTiming(layer);
    if (duration <= 0 || start >= MAX_MIX_SECONDS) continue;
    const source = context.createBufferSource();
    source.buffer = layer.buffer;
    source.playbackRate.value = playbackRate;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = clamp(layer.lowpass ?? 20000, 500, 20000);
    const volume = context.createGain();
    const target = clamp(layer.gain ?? 0.8, 0, 2);
    const fadeIn = Math.min(clamp(layer.fadeIn ?? 0.02, 0, 2), duration / 2);
    const fadeOut = Math.min(clamp(layer.fadeOut ?? 0.12, 0, 3), duration / 2);
    const begin = context.currentTime + start;
    const finish = begin + Math.min(duration, MAX_MIX_SECONDS - start);
    volume.gain.setValueAtTime(fadeIn ? 0 : target, begin);
    if (fadeIn) volume.gain.linearRampToValueAtTime(target, begin + fadeIn);
    volume.gain.setValueAtTime(target, Math.max(begin + fadeIn, finish - fadeOut));
    if (fadeOut) volume.gain.linearRampToValueAtTime(0, finish);
    const panner = context.createStereoPanner();
    panner.pan.value = clamp(layer.pan ?? 0, -1, 1);
    source.connect(filter).connect(volume).connect(panner).connect(master);
    source.start(begin, trimStart, Math.min(trimEnd - trimStart, (finish - begin) * playbackRate));
    sources.push(source);
  }
  return {sources, duration: mixDuration(layers), master};
}

export function encodeWav(audioBuffer) {
  const frames = audioBuffer.length;
  const channels = Math.min(2, audioBuffer.numberOfChannels);
  const rate = audioBuffer.sampleRate;
  const bytes = new ArrayBuffer(44 + frames * 2 * 2);
  const view = new DataView(bytes);
  const writeString = (offset, text) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, bytes.byteLength - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, frames * 4, true);
  const left = audioBuffer.getChannelData(0);
  const right = audioBuffer.getChannelData(channels === 2 ? 1 : 0);
  let offset = 44;
  for (let i = 0; i < frames; i++) {
    for (const sample of [left[i], right[i]]) {
      const safe = Math.max(-1, Math.min(1, Number.isFinite(sample) ? sample : 0));
      view.setInt16(offset, safe < 0 ? Math.round(safe * 32768) : Math.round(safe * 32767), true);
      offset += 2;
    }
  }
  return new Blob([bytes], {type: 'audio/wav'});
}

export async function renderWav(layers, {sampleRate = 48000, masterGain = 0.82} = {}) {
  const seconds = mixDuration(layers);
  if (!layers.length || seconds <= 0 || seconds > MAX_MIX_SECONDS) {
    throw new Error('Import and configure at least one valid recorded sound first.');
  }
  const frames = Math.ceil((seconds + 0.12) * sampleRate);
  const context = new OfflineAudioContext(2, frames, sampleRate);
  connectMix(context, layers, {masterGain});
  return encodeWav(await context.startRendering());
}
