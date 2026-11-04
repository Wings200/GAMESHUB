// W20.11: properly paced procedural weapon, movement and powered-frame audio.
// Preserve real-time weapon mechanics; timing changes affect sound only.
// No external sound files, downloads, autoplay, or additional dependencies.
// Materials are explicitly tagged on the raycasted mesh. Missing tags fall
// back to concrete instead of treating all hits as the same material.
export const IMPACT_MATERIALS=Object.freeze(['paper','wood','metal','concrete']);
// Metres travelled per audible footfall. Previous 0.70m walk / 0.91m sprint
// spacing produced 6-8 impacts per second at the actual movement speeds.
export const FOOTSTEP_STRIDE_METERS=Object.freeze({
  walk:1.95,sprint:2.35,crouch:1.55,armorWalk:2.35,armorSprint:2.8
});
export function footstepStrideMeters({sprinting=false,crouched=false,powerArmor=false}={}) {
  if(powerArmor)return sprinting?FOOTSTEP_STRIDE_METERS.armorSprint:FOOTSTEP_STRIDE_METERS.armorWalk;
  return crouched?FOOTSTEP_STRIDE_METERS.crouch:
    sprinting?FOOTSTEP_STRIDE_METERS.sprint:FOOTSTEP_STRIDE_METERS.walk;
}
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
      this.noiseBuffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .85), ctx.sampleRate);
      const channel = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < channel.length; i++) channel[i] = Math.random() * 2 - 1;
    }
    return this.noiseBuffer;
  }
  _noiseBurst(time, length, peak, highpass = 250, lowpass = 5500) {
    if (!this.ready) return;
    const ctx = this.context;
    // Let the noise decay finish naturally instead of truncating at 0.32s.
    const audibleLength=Math.min(.70,Math.max(.025,length*1.32));
    const source = ctx.createBufferSource();
    source.buffer = this._noise();
    const high = ctx.createBiquadFilter();
    high.type = 'highpass'; high.frequency.setValueAtTime(highpass, time);
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass'; low.frequency.setValueAtTime(lowpass, time);
    const volume = ctx.createGain();
    volume.gain.setValueAtTime(.0001, time);
    volume.gain.exponentialRampToValueAtTime(peak, time + .004);
    volume.gain.exponentialRampToValueAtTime(.0001, time + audibleLength);
    source.connect(high); high.connect(low); low.connect(volume); volume.connect(ctx.destination);
    source.start(time); source.stop(time + audibleLength + .02);
  }
  _tone(time, freq, endFreq, duration, peak, wave = 'triangle') {
    if (!this.ready) return;
    const ctx = this.context;
    const oscillator = ctx.createOscillator();
    oscillator.type = wave;
    // Lower synthesized pitch and lengthen the decay; no audio node is
    // played back at an artificially increased playbackRate.
    const decay=Math.max(.025,duration*1.30);
    oscillator.frequency.setValueAtTime(Math.max(1,freq*.82), time);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1,endFreq*.82), time + decay);
    const volume = ctx.createGain();
    volume.gain.setValueAtTime(Math.max(.0001, peak), time);
    volume.gain.exponentialRampToValueAtTime(.0001, time + decay);
    oscillator.connect(volume); volume.connect(ctx.destination);
    oscillator.start(time); oscillator.stop(time + decay + .01);
  }
  gunshot(kind='pistol') {
    if (!this.unlock()) return;
    const t = this.context.currentTime + .005;
    // Different acoustic signatures per gun instead of the old universal pop.
    const sounds={
      '10mm':{crack:.17,body:.26,level:.31,freq:116},
      pipe:{crack:.13,body:.21,level:.26,freq:148},
      'pipe-rifle':{crack:.16,body:.25,level:.28,freq:124},
      'double-barrel':{crack:.20,body:.33,level:.32,freq:81},
      'pump-action':{crack:.17,body:.29,level:.29,freq:96},
      'hunting-bolt':{crack:.19,body:.32,level:.30,freq:104},
      'pipe-smg':{crack:.088,body:.155,level:.22,freq:202},
      pistol:{crack:.115,body:.19,level:.27,freq:158},
      revolver:{crack:.14,body:.24,level:.30,freq:120},
      smg:{crack:.065,body:.12,level:.20,freq:235},
      carbine:{crack:.09,body:.20,level:.26,freq:180},
      shotgun:{crack:.17,body:.28,level:.31,freq:95},
      rifle:{crack:.15,body:.27,level:.29,freq:105}
    };
    const v=sounds[kind]||sounds.pistol;
    this._noiseBurst(t,v.crack,v.level,(['shotgun','double-barrel','pump-action','hunting-bolt'].includes(kind))?120:330,
      kind==='smg'?7500:6800);
    this._noiseBurst(t+.011,v.body,Math.min(.22,v.level*.55),85,1350);
    // Low report and a quieter atmospheric tail stop shots from sounding
    // like tiny speeded-up pops while preserving the initial muzzle crack.
    this._noiseBurst(t+.065,Math.max(.26,v.body*1.3),v.level*.20,65,950);
    this._tone(t,v.freq,Math.max(38,v.freq*.36),Math.min(.25,v.body),.22,'triangle');
    this._tone(t+.008,kind==='smg'?1300:840,400,.085,.036,'sawtooth');
  }
  breakActionReload(rounds=2,duration=2.65){
    if(!this.unlock())return;
    const t=this.context.currentTime+.005;
    const d=Math.max(1.2,Math.min(3.4,Number.isFinite(duration)?duration:2.65));
    const count=Math.max(1,Math.min(2,Number.isInteger(rounds)?rounds:2));
    // Open latch; hinged heavy metal swing; empty hulls pop, then soft
    // cartridge seating contacts and a firm final closure.
    this._tone(t,620,180,.12,.055,'triangle');
    this._noiseBurst(t+d*.15,.17,.075,110,1600);
    this._tone(t+d*.24,155,76,.21,.061,'triangle');
    this._noiseBurst(t+d*.32,.11,.06,560,3900);
    for(let i=0;i<count;i++){
      const at=t+d*(.53+i*.18/Math.max(1,count-1));
      this._noiseBurst(at,.095,.055,720,2800);
      this._tone(at,420,180,.10,.049,'triangle');
    }
    this._noiseBurst(t+d*.91,.17,.10,80,1650);
    this._tone(t+d*.91,175,78,.19,.074,'triangle');
  }
  pumpActionCycle(duration=.60){
    if(!this.unlock())return;
    const t=this.context.currentTime+.005;
    const d=Math.max(.35,Math.min(.90,duration));
    // Real stroke: unlock, slide toward the shooter, eject at full travel,
    // and latch the bolt as the hand drives the fore-end forward.
    this._tone(t+d*.14,520,156,.08,.053,'triangle');
    this._noiseBurst(t+d*.25,.115,.067,130,2800);
    this._tone(t+d*.43,250,86,.13,.080,'sawtooth');
    this._noiseBurst(t+d*.60,.10,.065,200,2900);
    this._tone(t+d*.82,410,115,.105,.087,'triangle');
  }
  pumpActionReload(rounds=1,duration=1.49){
    if(!this.unlock())return;
    const t=this.context.currentTime+.005;
    const count=Math.max(1,Math.min(6,Number.isInteger(rounds)?rounds:1));
    const d=Math.max(.9,Math.min(5.2,Number.isFinite(duration)?duration:1.49));
    this._tone(t,340,133,.11,.044,'triangle');
    for(let i=0;i<count;i++){
      const at=t+d*(.24+(i+.5)*.61/count);
      this._noiseBurst(at,.065,.053,420,2500);
      this._tone(at,270,114,.11,.054,'triangle');
    }
    this._tone(t+d*.92,530,195,.075,.044,'triangle');
  }
  pipeSMGReload(duration=2.75){
    if(!this.unlock())return;
    const t=this.context.currentTime+.005;
    const d=Math.max(1.3,Math.min(4.0,Number.isFinite(duration)?duration:2.75));
    this._tone(t+d*.09,690,260,.055,.044,'triangle'); // release latch
    this._noiseBurst(t+d*.31,.14,.064,400,2700); // magazine out
    this._tone(t+d*.56,385,150,.09,.054,'triangle'); // fresh magazine
    this._noiseBurst(t+d*.75,.13,.070,340,3000); // magazine seats
    this._tone(t+d*.86,610,195,.085,.054,'triangle'); // bolt catch
    this._noiseBurst(t+d*.89,.08,.046,460,3100);
  }
  revolverReload(rounds=6,duration=3.48){
    if(!this.unlock())return;
    const t=this.context.currentTime+.005;
    const d=Math.max(1.0,Math.min(5.0,Number.isFinite(duration)?duration:3.48));
    const count=Math.max(1,Math.min(6,Number.isInteger(rounds)?rounds:6));
    this._tone(t+d*.10,380,210,.11,.047,'triangle'); // cylinder latch
    this._noiseBurst(t+d*.24,.095,.063,260,2400);    // swing out
    this._noiseBurst(t+d*.32,.072,.056,390,2700);    // extractor star
    for(let i=0;i<count;i++){
      const at=t+d*(.43+(i+.5)*.36/count);
      this._tone(at,600,220,.055,.038,'triangle');
      this._noiseBurst(at,.038,.034,580,2800);
    }
    this._noiseBurst(t+d*.91,.095,.077,250,2700);    // cylinder snap shut
    this._tone(t+d*.94,370,160,.105,.046,'triangle');
  }
  boltActionCycle(duration=.88){
    if(!this.unlock())return;
    const t=this.context.currentTime+.005;
    const d=Math.max(.56,Math.min(1.25,duration));
    this._tone(t+d*.13,570,210,.075,.043,'triangle');  // lift
    this._noiseBurst(t+d*.36,.14,.071,220,3500);        // retract
    this._tone(t+d*.49,880,430,.12,.038,'triangle');    // fired brass
    this._noiseBurst(t+d*.71,.105,.061,280,2900);      // seat
    this._tone(t+d*.90,450,140,.13,.071,'triangle');    // lock
  }
  boltActionReload(rounds=1,duration=1.51){
    if(!this.unlock())return;
    const t=this.context.currentTime+.005;
    const d=Math.max(1,Math.min(4.5,Number.isFinite(duration)?duration:1.51));
    const count=Math.max(1,Math.min(5,Number.isInteger(rounds)?rounds:1));
    this._tone(t+d*.1,570,200,.10,.049,'triangle');
    this._noiseBurst(t+d*.28,.14,.056,230,3100);
    for(let i=0;i<count;i++){
      const at=t+d*(.36+(i+.5)*.43/count);
      this._noiseBurst(at,.059,.050,500,2800);
      this._tone(at,340,142,.09,.048,'triangle');
    }
    this._noiseBurst(t+d*.87,.09,.056,220,2800);
    this._tone(t+d*.96,480,147,.13,.067,'triangle');
  }
  laserCrank(chargeLevel=1) {
    if(!this.unlock())return;
    const t=this.context.currentTime+.005;
    const level=Math.max(1,Math.min(6,chargeLevel));
    // Three ratchet contacts as the user's hand rotates the full wheel;
    // a rising electrical coil tone locks the charge into the capacitor.
    for(const offset of [0,.23,.46]){
      this._noiseBurst(t+offset,.082,.066,300,2250);
      this._tone(t+offset,92,57,.084,.065,'triangle');
    }
    this._tone(t+.18,260+level*45,730+level*52,.41,.07,'sawtooth');
    this._tone(t+.57,800+level*70,610+level*56,.09,.042,'triangle');
  }
  laserBlast(chargeLevel=1) {
    if(!this.unlock())return;
    const t=this.context.currentTime+.005;
    const level=Math.max(1,Math.min(6,chargeLevel));
    this._noiseBurst(t,.11,.14+level*.012,420,6200);
    this._tone(t,1050+level*145,106+level*18,.43,.14+level*.015,'sawtooth');
    this._tone(t+.022,1470+level*100,390,.34,.08,'triangle');
    this._noiseBurst(t+.09,.32,.055+level*.005,120,1700);
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
      this._noiseBurst(t,.25,.072,45,580);
      this._tone(t,67,33,.29,.12,'triangle');
      // High sine overtone sounded like a bell instead of a heavy boot.
      this._noiseBurst(t+.065,.10,.022,55,420);
    }else{
      this._noiseBurst(t,.15,.038,140,1350);
      this._tone(t,145,65,.16,.03,'triangle');
    }
  }
  powerArmorTransition(entering=true,duration=4.5) {
    if(!this.unlock())return;
    const t=this.context.currentTime+.01;
    const d=Number.isFinite(duration)?Math.max(2.5,Math.min(6,duration)):4.5;
    // Doors/hydraulics plus three BOOT LANDINGS at the actual climb contacts.
    // No high sustained pitched sine/sawtooth accents: those read as dings.
    this._noiseBurst(t,.45,.065,45,620);
    this._tone(t,76,34,.43,.057,'triangle');
    const contacts=entering?[.49,.64,.81]:[.45,.60,.77];
    for(const fraction of contacts){
      const landing=t+d*fraction;
      this._noiseBurst(landing,.20,.085,45,730);
      this._tone(landing,69,28,.22,.09,'triangle');
      this._noiseBurst(landing+.045,.12,.026,60,480);
    }
    const latch=t+d*.93;
    this._noiseBurst(latch,.15,.060,90,980);
    this._tone(latch,64,37,.17,.045,'triangle');
  }
  dryFire() {
    if (!this.unlock()) return;
    const t = this.context.currentTime + .005;
    this._tone(t, 980, 340, .055, .058, 'square');
  }
}
