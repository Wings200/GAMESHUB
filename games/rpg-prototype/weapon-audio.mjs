// W01.2: short procedural weapon sounds, synthesised after a user gesture.
// No external sound files, downloads, autoplay, or additional dependencies.
export class WeaponAudio {
  constructor(contextFactory = null) {
    this.contextFactory = contextFactory;
    this.context = null;
    this.enabled = true;
    this.noiseBuffer = null;
  }
  unlock() {
    if (!this.enabled) return false;
    try {
      if (!this.context) {
        const Ctor = this.contextFactory ||
          (typeof AudioContext !== 'undefined' ? AudioContext :
            typeof webkitAudioContext !== 'undefined' ? webkitAudioContext : null);
        if (!Ctor) return false;
        this.context = new Ctor();
      }
      if (this.context.state === 'suspended') {
        // Browser policies require creation/resume inside a click or key event.
        const pending = this.context.resume();
        if (pending && typeof pending.catch === 'function') pending.catch(() => {});
      }
      return true;
    } catch {
      return false;
    }
  }
  setEnabled(enabled) {
    this.enabled = !!enabled;
    if (this.enabled) this.unlock();
    return this.enabled;
  }
  get ready() {
    return this.enabled && !!this.context;
  }
  _noise() {
    if (!this.noiseBuffer) {
      const ctx = this.context;
      this.noiseBuffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .32), ctx.sampleRate);
      const channel = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < channel.length; i++) channel[i] = Math.random() * 2 - 1;
    }
    return this.noiseBuffer;
  }
  _noiseBurst(time, length, peak, highpass = 250, lowpass = 5500) {
    if (!this.ready) return;
    const ctx = this.context;
    const source = ctx.createBufferSource();
    source.buffer = this._noise();
    const high = ctx.createBiquadFilter();
    high.type = 'highpass'; high.frequency.setValueAtTime(highpass, time);
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass'; low.frequency.setValueAtTime(lowpass, time);
    const volume = ctx.createGain();
    volume.gain.setValueAtTime(.0001, time);
    volume.gain.exponentialRampToValueAtTime(peak, time + .004);
    volume.gain.exponentialRampToValueAtTime(.0001, time + length);
    source.connect(high); high.connect(low); low.connect(volume); volume.connect(ctx.destination);
    source.start(time); source.stop(time + Math.min(length + .02, .32));
  }
  _tone(time, freq, endFreq, duration, peak, wave = 'triangle') {
    if (!this.ready) return;
    const ctx = this.context;
    const oscillator = ctx.createOscillator();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(freq, time);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), time + duration);
    const volume = ctx.createGain();
    volume.gain.setValueAtTime(Math.max(.0001, peak), time);
    volume.gain.exponentialRampToValueAtTime(.0001, time + duration);
    oscillator.connect(volume); volume.connect(ctx.destination);
    oscillator.start(time); oscillator.stop(time + duration + .01);
  }
  gunshot() {
    if (!this.unlock()) return;
    const t = this.context.currentTime + .005;
    this._noiseBurst(t, .115, .27, 330, 6800);
    this._noiseBurst(t + .011, .19, .15, 85, 1350);
    this._tone(t, 158, 58, .14, .22, 'triangle');
    this._tone(t + .008, 840, 400, .085, .036, 'sawtooth');
  }
  impact(type = 'concrete') {
    if (!this.unlock()) return;
    const t = this.context.currentTime + .005;
    if (type === 'paper') {
      this._noiseBurst(t, .048, .077, 680, 4300);
      this._tone(t, 420, 270, .045, .024);
    } else {
      this._noiseBurst(t, .10, .1, 160, 3200);
      this._tone(t, type === 'metal' ? 1100 : 220,
        type === 'metal' ? 550 : 90, .13, type === 'metal' ? .068 : .041);
    }
  }
  reload() {
    if (!this.unlock()) return;
    const t = this.context.currentTime + .005;
    // Magazine release, slide rattle and final lock-in, scheduled against the
    // AudioContext clock rather than using background timers.
    this._tone(t, 1050, 540, .07, .055, 'square');
    this._noiseBurst(t + .36, .115, .095, 780, 4100);
    this._tone(t + .45, 450, 660, .11, .045, 'triangle');
    this._tone(t + 1.23, 1250, 610, .08, .08, 'square');
    this._noiseBurst(t + 1.26, .06, .055, 1100, 6100);
  }
  dryFire() {
    if (!this.unlock()) return;
    const t = this.context.currentTime + .005;
    this._tone(t, 980, 340, .055, .058, 'square');
  }
}
