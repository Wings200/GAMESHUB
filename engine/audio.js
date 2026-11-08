export class EngineAudio {
  constructor() { this.context = null; this.muted = false; this.clips = new Map(); this.introSource = null; }

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

  // Browser-decode an original sound packaged as an encoded asset module.
  async loadEncodedClip(name, encodedMp3) {
    if (this.clips.has(name)) return this.clips.get(name);
    if (!(await this.unlock())) throw new Error('Web Audio is unavailable.');
    const bytes = Uint8Array.from(atob(encodedMp3), character => character.charCodeAt(0));
    const decoded = await this.context.decodeAudioData(bytes.buffer);
    this.clips.set(name, decoded);
    return decoded;
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
    this.stopIntro();
    if (!this.clips.has('gameshub-logo-intro')) return null;
    this.introSource = this.playClip('gameshub-logo-intro', {volume: 0.8});
    return this.introSource;
  }

  stopIntro() {
    if (this.introSource) {
      try { this.introSource.stop(); } catch { /* Source may have finished naturally. */ }
      this.introSource = null;
    }
  }

  ping() {
    if (!this.clips.has('gameshub-test-cue')) return null;
    return this.playClip('gameshub-test-cue', {volume: 0.64});
  }

  dispose() { this.stopIntro(); this.context?.close(); this.context = null; this.clips.clear(); }
}
