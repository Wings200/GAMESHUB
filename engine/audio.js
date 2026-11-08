export class EngineAudio {
  constructor() { this.context = null; this.muted = false; this.clips = new Map(); }

  async unlock() {
    if (!this.context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return false;
      this.context = new AudioContextClass();
    }
    if (this.context.state !== 'running') await this.context.resume();
    return this.context.state === 'running';
  }

  // Load real, exported audio assets from the Audio Workbench into the engine.
  async loadClip(name, url) {
    if (this.clips.has(name)) return this.clips.get(name);
    const ready = await this.unlock();
    if (!ready) throw new Error('Web Audio is unavailable.');
    const response = await fetch(url, {credentials: 'same-origin'});
    if (!response.ok) throw new Error(`Audio asset unavailable: ${url}`);
    const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
    this.clips.set(name, buffer);
    return buffer;
  }

  playClip(name, {volume = 1, pan = 0, loop = false} = {}) {
    if (this.muted || !this.context || this.context.state !== 'running') return null;
    const buffer = this.clips.get(name);
    if (!buffer) throw new Error(`Audio clip "${name}" has not been loaded.`);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = Boolean(loop);
    const gain = this.context.createGain();
    gain.gain.value = Math.max(0, Math.min(1.5, Number(volume) || 0));
    const stereo = this.context.createStereoPanner();
    stereo.pan.value = Math.max(-1, Math.min(1, Number(pan) || 0));
    source.connect(gain).connect(stereo).connect(this.context.destination);
    source.start();
    return source;
  }

  tone({frequency = 120, endFrequency = frequency, duration = 0.3, volume = 0.12, type = 'sine', delay = 0} = {}) {
    if (this.muted || !this.context || this.context.state !== 'running') return;
    const ctx = this.context;
    const start = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + Math.min(0.05, duration / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  intro() {
    this.tone({frequency: 60, endFrequency: 42, duration: 2.1, volume: 0.12, type: 'sawtooth'});
    this.tone({frequency: 170, endFrequency: 68, duration: 0.75, delay: 1.25, volume: 0.1, type: 'triangle'});
    this.tone({frequency: 270, endFrequency: 84, duration: 0.85, delay: 1.27, volume: 0.11});
    this.tone({frequency: 490, endFrequency: 460, duration: 0.95, delay: 1.8, volume: 0.045});
  }

  ping() {
    this.tone({frequency: 440, endFrequency: 660, duration: 0.25, volume: 0.08});
    this.tone({frequency: 880, endFrequency: 550, duration: 0.32, delay: 0.07, volume: 0.035});
  }

  dispose() { this.context?.close(); this.context = null; this.clips.clear(); }
}
