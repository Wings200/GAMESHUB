// W01.2: short procedural weapon sounds, synthesised after a user gesture.
// No external sound files, downloads, autoplay, or additional dependencies.
// Materials are explicitly tagged on the raycasted mesh. Missing tags fall
// back to concrete instead of treating all hits as the same material.
export const IMPACT_MATERIALS=Object.freeze(['paper','wood','metal','concrete']);
export function getImpactMaterial(hit) {
  if(!hit || !hit.object)return null;
  const tag=hit.object.userData?.impactMaterial;
  if(IMPACT_MATERIALS.includes(tag))return tag;
  return hit.object.userData?.targetId != null?'paper':'concrete';
}
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
  gunshot(kind='pistol') {
    if (!this.unlock()) return;
    const t = this.context.currentTime + .005;
    // Different acoustic signatures per gun instead of the old universal pop.
    const sounds={
      pistol:{crack:.115,body:.19,level:.27,freq:158},
      revolver:{crack:.14,body:.24,level:.30,freq:120},
      smg:{crack:.065,body:.12,level:.20,freq:235},
      carbine:{crack:.09,body:.20,level:.26,freq:180},
      shotgun:{crack:.17,body:.28,level:.31,freq:95},
      rifle:{crack:.15,body:.27,level:.29,freq:105}
    };
    const v=sounds[kind]||sounds.pistol;
    this._noiseBurst(t,v.crack,v.level,kind==='shotgun'?120:330,
      kind==='smg'?7500:6800);
    this._noiseBurst(t+.011,v.body,Math.min(.22,v.level*.55),85,1350);
    this._tone(t,v.freq,Math.max(38,v.freq*.36),Math.min(.25,v.body),.22,'triangle');
    this._tone(t+.008,kind==='smg'?1300:840,400,.085,.036,'sawtooth');
  }
  impact(type = 'concrete', delaySeconds = 0) {
    if (!this.unlock()) return;
    // Put the impact AFTER the gunshot transient, rather than burying
    // different material sounds under the same loud muzzle blast.
    const t = this.context.currentTime + .005 +
      Math.max(0, Math.min(.45, Number.isFinite(delaySeconds)?delaySeconds:0));
    switch(type) {
      case 'paper':
        // Thin, high tearing slap with almost no low-frequency body.
        this._noiseBurst(t,.095,.19,1200,7800);
        this._noiseBurst(t+.025,.055,.08,2400,8500);
        this._tone(t,1050,680,.065,.07,'triangle');
        break;
      case 'wood':
        // Hollow wooden thock followed by a low resonant knock.
        this._noiseBurst(t,.09,.14,125,1500);
        this._tone(t,205,91,.18,.19,'triangle');
        this._tone(t+.015,515,185,.07,.085,'triangle');
        break;
      case 'metal':
        // Clear, long high-pitched clang and shorter ricochet ring.
        this._noiseBurst(t,.055,.12,1700,9000);
        this._tone(t,1750,1250,.38,.23,'sine');
        this._tone(t+.026,2920,2320,.24,.11,'triangle');
        break;
      default:
        // Low, gritty masonry crack and short dull crumble.
        this._noiseBurst(t,.16,.19,80,2100);
        this._noiseBurst(t+.035,.105,.11,290,2300);
        this._tone(t,145,63,.17,.17,'triangle');
        break;
    }
  }
  reload(kind='pistol',duration=1.65) {
    if (!this.unlock()) return;
    const t=this.context.currentTime+.005;
    // Mechanical sounds scale with each weapon's ACTUAL reload timeline.
    // Do not trigger the final chamber click before the gun is reloaded.
    const d=Math.max(.5,Number.isFinite(duration)?duration:1.65);
    const initial=kind==='revolver'?750:kind==='shotgun'?590:1050;
    this._tone(t,initial,540,.07,.055,'square');
    this._noiseBurst(t+d*.22,.11,.09,780,4100);
    this._tone(t+d*.33,450,660,.11,.045,'triangle');
    this._tone(t+d*.88,1250,610,.08,.08,'square');
    this._noiseBurst(t+d*.90,.06,.055,1100,6100);
  }
  footstep(heavy=false) {
    // Frame-driven steps use an already unlocked context; do not try to
    // create or resume audio outside an actual user gesture.
    if(!this.ready)return;
    const t=this.context.currentTime+.006;
    if(heavy){
      this._noiseBurst(t,.19,.078,48,540);
      this._tone(t,75,38,.20,.14,'triangle');
      this._tone(t+.037,340,98,.075,.036,'sine');
    }else{
      this._noiseBurst(t,.085,.035,180,1700);
      this._tone(t,175,82,.095,.028,'triangle');
    }
  }
  dryFire() {
    if (!this.unlock()) return;
    const t = this.context.currentTime + .005;
    this._tone(t, 980, 340, .055, .058, 'square');
  }
}
