export class EngineAudio {
  constructor() { this.context = null; this.muted = false; this.clips = new Map(); this.introSource = null; this.metalOverlaySource = null; this.footstepMix = 0.6; }

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

  playClip(name, {volume = 1, pan = 0, loop = false, rate = 1, footstepEq = false} = {}) {
    if (this.muted || !this.context || this.context.state !== 'running') return null;
    const buffer = this.clips.get(name);
    if (!buffer) throw new Error(`Audio clip "${name}" has not been loaded.`);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = Boolean(loop);
    source.playbackRate.value = Number.isFinite(rate) ? Math.max(0.8,Math.min(1.2,rate)) : 1;
    const gain = this.context.createGain();
    gain.gain.value = Math.max(0, Math.min(1.5, Number(volume) || 0));
    const stereo = this.context.createStereoPanner();
    stereo.pan.value = Math.max(-1, Math.min(1, Number(pan) || 0));
    if (footstepEq && typeof this.context.createBiquadFilter === 'function') {
      // Kenney's concrete pack has a noticeable hollow/wood-like mid knock
      // at original gain. Remove its resonant midrange; preserve contact grit.
      const high=this.context.createBiquadFilter();
      high.type='highpass'; high.frequency.value=115; high.Q.value=.75;
      const notch=this.context.createBiquadFilter();
      notch.type='peaking'; notch.frequency.value=430; notch.Q.value=1.2; notch.gain.value=-7;
      const edge=this.context.createBiquadFilter();
      edge.type='lowpass'; edge.frequency.value=3700; edge.Q.value=.62;
      source.connect(high).connect(notch).connect(edge).connect(gain);
    } else source.connect(gain);
    gain.connect(stereo).connect(this.context.destination);
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
    if (this.clips.has('gameshub-logo-intro'))
      this.introSource = this.playClip('gameshub-logo-intro', {volume: 0.70});
    if (this.clips.has('gameshub-intro-metal-overlay'))
      this.metalOverlaySource = this.playClip('gameshub-intro-metal-overlay', {volume: 0.72});
    return this.introSource || this.metalOverlaySource;
  }

  stopIntro() {
    for (const source of [this.introSource, this.metalOverlaySource]) {
      try { source?.stop(); } catch { /* Source already finished. */ }
    }
    this.introSource = null;
    this.metalOverlaySource = null;
  }

  ping() {
    // The new short mechanical thunk replaces the former doorbell-like double strike.
    const cue = this.clips.has('gameshub-mechanical-test') ? 'gameshub-mechanical-test' : 'gameshub-test-cue';
    if (!this.clips.has(cue)) return null;
    return this.playClip(cue, {volume: 0.68});
  }

  setFootstepMix(value) {
    const number=Number(value);
    this.footstepMix=Number.isFinite(number)?Math.max(0,Math.min(1,number)):0.6;
  }

  // Recorded CC0 concrete steps. If the assets have not loaded, remain silent;
  // never fall back to buzzy synthesised footsteps.
  footstep({index=0,foot='left',running=false}={}) {
    const number=((Math.floor(index)%5)+5)%5;
    const key='footstep-concrete-'+number;
    if (!this.clips.has(key)) return null;
    return this.playClip(key,{
      volume: (running?.20:.16) * this.footstepMix,
      pan: foot==='right'?.065:-.065,
      rate: 0.94 + (number%4)*0.028,
      footstepEq: true
    });
  }

  dispose() { this.stopIntro(); this.context?.close(); this.context = null; this.clips.clear(); }
}
