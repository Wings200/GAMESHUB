import {normalizeAudioPosition} from './audio-spatial.js';
export class EngineAudio {
  constructor() { this.context = null; this.muted = false; this.clips = new Map(); this.introSource = null; this.metalOverlaySource = null; this.footstepMix = 0.6; this.mixer=null; this.mixBuses=new Map(); this.spatialSources=new Set(); }

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

  getBus(name='sfx'){
    if(!['sfx','ambience','music','ui'].includes(name))
      throw new TypeError('Unknown audio mix bus: '+String(name));
    if(!this.context)throw new Error('Unlock audio before creating mix buses');
    if(!this.mixer){
      this.mixer=this.context.createGain();
      this.mixer.gain.value=1;
      this.mixer.connect(this.context.destination);
    }
    if(!this.mixBuses.has(name)){
      const node=this.context.createGain();
      node.gain.value=1;
      node.connect(this.mixer);
      this.mixBuses.set(name,node);
    }
    return this.mixBuses.get(name);
  }
  setMasterVolume(value){
    if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1.5)
      throw new TypeError('Master volume must be between 0 and 1.5');
    if(!this.context)throw new Error('Unlock audio first');
    this.getBus('sfx');
    this.mixer.gain.value=value;
  }
  setBusVolume(bus,value){
    if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1.5)
      throw new TypeError('Bus volume must be between 0 and 1.5');
    this.getBus(bus).gain.value=value;
  }
  setListenerPose({position,forward={x:0,y:0,z:-1},up={x:0,y:1,z:0}}){
    if(!this.context)return false;
    const p=normalizeAudioPosition(position),f=normalizeAudioPosition(forward,'forward');
    const u=normalizeAudioPosition(up,'up'),listener=this.context.listener;
    if(!listener)return false;
    const now=this.context.currentTime;
    const set=(attr,val)=>attr?.setValueAtTime?.(val,now);
    if(listener.positionX){
      set(listener.positionX,p.x);set(listener.positionY,p.y);set(listener.positionZ,p.z);
      set(listener.forwardX,f.x);set(listener.forwardY,f.y);set(listener.forwardZ,f.z);
      set(listener.upX,u.x);set(listener.upY,u.y);set(listener.upZ,u.z);
    }else{
      listener.setPosition?.(p.x,p.y,p.z);
      listener.setOrientation?.(f.x,f.y,f.z,u.x,u.y,u.z);
    }
    return true;
  }
  playSpatialClip(name,{
    position,volume=1,loop=false,rate=1,bus='sfx',
    refDistance=1,maxDistance=35,rolloffFactor=1,occlusion=0
  }={}){
    if(this.muted || !this.context || this.context.state!=='running')return null;
    const buffer=this.clips.get(name);
    if(!buffer)throw new Error('Audio clip "'+name+'" has not been loaded');
    if(typeof volume!=='number'||!Number.isFinite(volume)||volume<0||volume>1.5)
      throw new TypeError('Invalid spatial clip volume');
    for(const [field,value,min,max] of [
      ['refDistance',refDistance,.05,1000],
      ['maxDistance',maxDistance,.1,10000],
      ['rolloffFactor',rolloffFactor,0,10],
      ['rate',rate,.25,4],['occlusion',occlusion,0,1]
    ])if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)
      throw new TypeError('Invalid '+field);
    if(maxDistance<refDistance)throw new TypeError('maxDistance must be >= refDistance');
    const at=normalizeAudioPosition(position);
    const ctx=this.context,source=ctx.createBufferSource(),panner=ctx.createPanner();
    const filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    source.buffer=buffer;source.loop=Boolean(loop);source.playbackRate.value=rate;
    panner.panningModel='HRTF';panner.distanceModel='inverse';
    panner.refDistance=refDistance;panner.maxDistance=maxDistance;panner.rolloffFactor=rolloffFactor;
    filter.type='lowpass';filter.Q.value=.6;
    source.connect(filter).connect(panner).connect(gain).connect(this.getBus(bus));
    const now=()=>ctx.currentTime;
    const setPosition=value=>{
      const p=normalizeAudioPosition(value);
      if(panner.positionX){
        panner.positionX.setValueAtTime(p.x,now());
        panner.positionY.setValueAtTime(p.y,now());
        panner.positionZ.setValueAtTime(p.z,now());
      }else panner.setPosition(p.x,p.y,p.z);
    };
    const setOcclusion=value=>{
      const amount=Math.max(0,Math.min(1,Number(value)||0));
      const cutoff=17000*(1-amount)+850*amount;
      filter.frequency.setTargetAtTime?.(cutoff,now(),.03);
      if(!filter.frequency.setTargetAtTime)filter.frequency.value=cutoff;
      const level=volume*(1-amount*.65);
      gain.gain.setTargetAtTime?.(level,now(),.03);
      if(!gain.gain.setTargetAtTime)gain.gain.value=level;
    };
    let ended=false;
    const handle={source,panner,filter,gain,
      setPosition,setOcclusion,
      stop:()=>{
        if(ended)return;
        try{source.stop();}catch{}
      }
    };
    source.onended=()=>{
      ended=true;
      source.disconnect();filter.disconnect();panner.disconnect();gain.disconnect();
      this.spatialSources.delete(handle);
    };
    try{
      setPosition(at);
      setOcclusion(occlusion);
      this.spatialSources.add(handle);
      source.start();
      return handle;
    }catch(error){
      this.spatialSources.delete(handle);
      source.disconnect();filter.disconnect();panner.disconnect();gain.disconnect();
      throw error;
    }
  }

  dispose() {
    this.stopIntro();
    for(const sound of [...this.spatialSources])try{sound.stop();}catch{}
    this.spatialSources.clear();
    for(const bus of this.mixBuses.values())bus.disconnect();
    this.mixBuses.clear();
    this.mixer?.disconnect();
    this.mixer=null;
    this.context?.close();
    this.context = null;
    this.clips.clear();
  }
}
