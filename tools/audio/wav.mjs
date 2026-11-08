// WAV utilities for assistant-authored, recording-based game sounds.
// No third-party packages, oscillator sound substitutes, or network downloads.
const MAX_INPUT_BYTES = 32 * 1024 * 1024;

export function decodeWav(input) {
  const bytes = Buffer.from(input);
  if (bytes.length > MAX_INPUT_BYTES) throw new Error('Recording exceeds the 32 MB input limit.');
  if (bytes.length < 44 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('Source is not a RIFF/WAVE recording. Convert it to WAV first.');
  }

  let format = null;
  let data = null;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const kind = bytes.toString('ascii', offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (start + size > bytes.length) throw new Error('Corrupt WAV chunk length.');
    if (kind === 'fmt ') {
      if (size < 16) throw new Error('Invalid WAV format chunk.');
      const code = bytes.readUInt16LE(start);
      const channels = bytes.readUInt16LE(start + 2);
      const sampleRate = bytes.readUInt32LE(start + 4);
      const blockAlign = bytes.readUInt16LE(start + 12);
      const bits = bytes.readUInt16LE(start + 14);
      // WAVE_FORMAT_EXTENSIBLE: the real format tag is at offset 24.
      const encoding = code === 65534 && size >= 40 ? bytes.readUInt16LE(start + 24) : code;
      format = {encoding, channels, sampleRate, blockAlign, bits};
    }
    if (kind === 'data') data = {start, size};
    offset = start + size + (size % 2);
  }
  if (!format || !data) throw new Error('WAV file has no format or audio samples.');
  const {encoding, channels, sampleRate, blockAlign, bits} = format;
  if (![1, 2].includes(channels) || sampleRate < 8000 || sampleRate > 192000) throw new Error('Only mono/stereo WAV at 8–192 kHz is supported.');
  if (!((encoding === 1 && [8, 16, 24, 32].includes(bits)) || (encoding === 3 && [32, 64].includes(bits)))) {
    throw new Error('Supported formats: PCM 8/16/24/32-bit or float 32/64-bit WAV.');
  }
  if (blockAlign !== channels * bits / 8 || data.size % blockAlign !== 0) throw new Error('Invalid WAV sample alignment.');
  const frames = data.size / blockAlign;
  if (!frames) throw new Error('WAV recording is empty.');
  const output = Array.from({length: channels}, () => new Float32Array(frames));
  const stride = bits / 8;
  for (let i = 0; i < frames; i++) {
    for (let channel = 0; channel < channels; channel++) {
      const position = data.start + i * blockAlign + channel * stride;
      let sample;
      if (encoding === 3) sample = bits === 32 ? bytes.readFloatLE(position) : bytes.readDoubleLE(position);
      else if (bits === 8) sample = (bytes.readUInt8(position) - 128) / 128;
      else if (bits === 16) sample = bytes.readInt16LE(position) / 32768;
      else if (bits === 24) {
        let integer = bytes[position] | bytes[position + 1] << 8 | bytes[position + 2] << 16;
        if (integer & 0x800000) integer -= 0x1000000;
        sample = integer / 8388608;
      } else sample = bytes.readInt32LE(position) / 2147483648;
      if (!Number.isFinite(sample)) throw new Error('WAV contains a non-finite audio sample.');
      output[channel][i] = Math.max(-1, Math.min(1, sample));
    }
  }
  return {sampleRate, channels: output, duration: frames / sampleRate, frames};
}

export function encodeWav({left, right, sampleRate}) {
  if (!(left instanceof Float32Array) || !(right instanceof Float32Array) || left.length !== right.length) {
    throw new Error('WAV output requires equal-length float32 stereo channels.');
  }
  const file = Buffer.alloc(44 + left.length * 4);
  file.write('RIFF', 0, 'ascii');
  file.writeUInt32LE(file.length - 8, 4);
  file.write('WAVE', 8, 'ascii');
  file.write('fmt ', 12, 'ascii');
  file.writeUInt32LE(16, 16);
  file.writeUInt16LE(1, 20);
  file.writeUInt16LE(2, 22);
  file.writeUInt32LE(sampleRate, 24);
  file.writeUInt32LE(sampleRate * 4, 28);
  file.writeUInt16LE(4, 32);
  file.writeUInt16LE(16, 34);
  file.write('data', 36, 'ascii');
  file.writeUInt32LE(left.length * 4, 40);
  for (let i = 0; i < left.length; i++) {
    for (const [channel, value] of [[0, left[i]], [1, right[i]]]) {
      const sample = Math.max(-1, Math.min(1, value));
      file.writeInt16LE(sample < 0 ? Math.round(sample * 32768) : Math.round(sample * 32767), 44 + i * 4 + channel * 2);
    }
  }
  return file;
}
