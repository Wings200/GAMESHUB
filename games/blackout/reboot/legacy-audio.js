// BLACKOUT V0.6 — standalone procedural WebAudio mixer.
// No audio downloads, server requirements or hidden autoplay. First click unlocks it.
export class GameAudio{
  constructor(){
    this.ctx=null;this.master=null;this.noiseBuffer=null;this.enabled=true;
    this.spatialBuses=[];this.spatialIndex=0;this.spatialBus=null;
    this.activeVoices=0;this.voiceLimit=72;this.failedEvents=0;
  }
  async unlock(){
    try{
      if(!this.ctx){
        const Context=window.AudioContext||window.webkitAudioContext;
        if(!Context)return false;
        this.ctx=new Context({latencyHint:"interactive"});
        const c=this.ctx;
        this.master=c.createGain();this.master.gain.value=.86;
        const compressor=c.createDynamicsCompressor();
        compressor.threshold.value=-12;compressor.knee.value=12;
        compressor.ratio.value=5;compressor.attack.value=.002;compressor.release.value=.16;
        this.master.connect(compressor);compressor.connect(c.destination);
        // Fixed-size spatial voice buses: don't leak one GainNode and
        // StereoPannerNode for every bot shot for the entire match.
        for(let i=0;i<12;i++){
          const gain=c.createGain();gain.gain.value=1;
          let panner=null;
          if(typeof c.createStereoPanner==="function"){
            panner=c.createStereoPanner();
            gain.connect(panner);panner.connect(this.master);
          }else gain.connect(this.master);
          this.spatialBuses.push({gain,panner});
        }
        const size=Math.floor(c.sampleRate*.65);
        this.noiseBuffer=c.createBuffer(1,size,c.sampleRate);
        const data=this.noiseBuffer.getChannelData(0);
        // Noise sample is just raw white noise; every event gets its own envelope.
        for(let i=0;i<size;i++)data[i]=Math.random()*2-1;
      }
      if(this.ctx.state!=="running")await this.ctx.resume();
      return this.ctx.state==="running";
    }catch(err){console.warn("BLACKOUT audio unavailable",err);return false;}
  }
  get ready(){return !!(this.ctx&&this.ctx.state==="running"&&this.enabled);}
  envelope(gain,at,peak,duration,attack=.003){
    const c=this.ctx,g=c.createGain();
    const t=Math.max(c.currentTime,at);
    g.gain.setValueAtTime(.0001,t);
    g.gain.linearRampToValueAtTime(Math.max(.0002,peak),t+attack);
    g.gain.exponentialRampToValueAtTime(.0001,t+Math.max(attack+.008,duration));
    gain.connect(g);g.connect(this.spatialBus||this.master);
    return g;
  }
  tone(hz,seconds,level,type="triangle",delay=0,endHz=hz){
    if(!this.ready||this.activeVoices>=this.voiceLimit)return;
    const c=this.ctx,t=c.currentTime+delay,o=c.createOscillator();
    o.type=type;o.frequency.setValueAtTime(hz,t);
    if(endHz!==hz)o.frequency.exponentialRampToValueAtTime(Math.max(20,endHz),t+seconds);
    const envelope=this.envelope(o,t,level,seconds,.002);
    this.activeVoices++;
    o.onended=()=>{
      try{o.disconnect();envelope.disconnect();}catch{}
      this.activeVoices=Math.max(0,this.activeVoices-1);
    };
    try{o.start(t);o.stop(t+seconds+.01);}
    catch(error){
      o.onended=null;try{o.disconnect();envelope.disconnect();}catch{}
      this.activeVoices=Math.max(0,this.activeVoices-1);
      throw error;
    }
  }
  noise(seconds,level,frequency=2200,mode="bandpass",delay=0,attack=.002){
    if(!this.ready||this.activeVoices>=this.voiceLimit)return;
    const c=this.ctx,t=c.currentTime+delay;
    const source=c.createBufferSource();source.buffer=this.noiseBuffer;
    const filter=c.createBiquadFilter();filter.type=mode;
    filter.frequency.value=frequency;filter.Q.value=mode==="bandpass"?.65:.7;
    source.connect(filter);
    const envelope=this.envelope(filter,t,level,seconds,attack);
    this.activeVoices++;
    source.onended=()=>{
      try{source.disconnect();filter.disconnect();envelope.disconnect();}catch{}
      this.activeVoices=Math.max(0,this.activeVoices-1);
    };
    try{source.start(t,Math.random()*.16);source.stop(t+seconds+.012);}
    catch(error){
      source.onended=null;try{source.disconnect();filter.disconnect();envelope.disconnect();}catch{}
      this.activeVoices=Math.max(0,this.activeVoices-1);
      throw error;
    }
  }
  gun(secondary=false){
    // Fast pressure crack + close mid-body + sub punch + short outdoor tail.
    const scale=secondary?.77:1;
    this.noise(.066,.41*scale,5200,"highpass");
    this.noise(.11,.37*scale,1550,"bandpass");
    this.tone(secondary?195:136,.125,.29*scale,"triangle",0,secondary?75:42);
    this.noise(.28,.13*scale,480,"lowpass",.016);
    this.noise(.105,.10*scale,2400,"bandpass",.12);
    this.tone(440,.028,.014,"sine",.055,190);
  }
  playAt(name,x,z,px,pz,yaw=0){
    if(!this.ready)return;
    const dx=x-px,dz=z-pz,distance=Math.hypot(dx,dz);
    const level=1/(1+.09*distance+.007*distance*distance);
    const bus=this.spatialBuses[this.spatialIndex++%this.spatialBuses.length];
    if(!bus)return this.play(name);
    bus.gain.gain.value=Math.max(.13,Math.min(1,level));
    if(bus.panner){
      const side=distance>.01?(dx*Math.cos(yaw)-dz*Math.sin(yaw))/distance:0;
      bus.panner.pan.value=Math.max(-.90,Math.min(.90,side));
    }
    this.spatialBus=bus.gain;
    try{this.play(name);}finally{this.spatialBus=null;}
  }
  play(name){
    if(!this.ready)return;
    try{this.playEvent(name);}
    catch(error){
      // A browser audio scheduling failure must never take down gameplay.
      this.failedEvents++;
      if(this.failedEvents<=2)console.warn("BLACKOUT: audio event failed",name,error);
      this.enabled=false;
    }
  }
  playEvent(name){
    switch(name){
      case "tactical-cue": {
        // Original five-stab tactical phase motif; not sampled or transcribed game audio.
        const notes=[98,117,104,139,165];
        const pulses=[0,.17,.34,.51,.73];
        for(let i=0;i<5;i++){
          const duration=i===4?.45:.14;
          this.tone(notes[i],duration,i===4?.13:.095,"triangle",pulses[i],notes[i]*.69);
          this.tone(notes[i]*2,duration*.7,i===4?.055:.033,"sawtooth",pulses[i],notes[i]*1.2);
          this.noise(i===4?.28:.075,i===4?.16:.085,i===4?430:700,"lowpass",pulses[i]);
        }
        break;
      }
      case "fire":this.gun(false);break;
      case "pistol":this.gun(true);break;
      case "ally-fire":
      case "enemy-fire":
        this.noise(.08,name==="ally-fire"?.10:.12,2600,"bandpass");
        this.tone(112,.11,.075,"triangle",0,55);
        break;
      case "step":
      case "run-step":
      case "enemy-step":
      case "ally-step":
        this.noise(.07,name==="run-step"?.13:name==="enemy-step"?.105:.093,310,"lowpass");
        this.noise(.024,.043,1650,"bandpass");
        this.tone(name==="run-step"?76:60,.07,.043,"sine",0,35);
        break;
      case "reload":
        this.noise(.035,.11,2200,"highpass");
        this.tone(840,.045,.045,"triangle",0,460);
        this.noise(.065,.14,2100,"bandpass",.46);
        this.tone(570,.055,.062,"triangle",.48,230);
        this.noise(.035,.11,2700,"highpass",1.10);
        break;
      case "equip":
      case "aim":
        this.noise(.038,name==="equip"?.075:.027,1700,"bandpass");
        this.tone(350,.043,.021,"triangle",0,190);
        break;
      case "gadget-throw":
        this.noise(.075,.085,900,"bandpass");
        this.tone(250,.065,.035,"triangle",0,140);
        break;
      case "gadget-flash":
        this.noise(.18,.20,3600,"highpass");
        this.tone(1950,.5,.13,"sine",0,1200);
        break;
      case "gadget-blast":
        this.noise(.15,.42,980,"bandpass");
        this.noise(.50,.28,280,"lowpass",.02);
        this.tone(105,.29,.18,"triangle",0,37);
        break;
      case "smoke-throw":
        this.noise(.09,.11,850,"bandpass");
        this.tone(190,.11,.07,"triangle",0,105);
        break;
      case "smoke-trigger":
        this.tone(910,.11,.075,"square",0,550);
        this.noise(.24,.16,700,"lowpass",.11);
        this.noise(.50,.10,330,"lowpass",.20);
        break;
      case "click":
        this.noise(.025,.105,2100,"highpass");
        this.tone(760,.022,.06,"triangle",0,350);
        break;
      case "defuser-tick":
        // A short hard electronic double-tick from the planted unit.
        this.tone(1120,.070,.105,"square",0,920);
        this.tone(530,.085,.045,"sine",.022,370);
        break;
      case "defuser-tick-urgent":
        // Final ten seconds: high, fast alarm with no sustained noise.
        this.tone(1460,.078,.15,"square",0,1260);
        this.tone(830,.075,.065,"sine",.042,720);
        break;
      case "defuser-arming":
        this.noise(.10,.075,1900,"bandpass");
        this.tone(480,.14,.085,"triangle",0,750);
        break;
      case "defuser-disabling":
        // Tablet comes out of its pouch; no periodic alert tones. The
        // planted device's single audio track owns ALL bomb beeping.
        this.noise(.075,.145,1450,"bandpass");
        this.noise(.037,.105,3300,"highpass",.055);
        this.tone(215,.090,.026,"triangle",.026,155);
        break;
      case "plant-key":
        this.tone(840,.055,.068,"sine");
        this.tone(430,.07,.028,"triangle",.015);
        break;
      case "defuse-key":
        // Dry tactile touchscreen taps. Repeating sine tones previously
        // sounded like a second, unsynchronized planted-bomb beep.
        this.noise(.023,.095,3900,"highpass");
        this.noise(.032,.034,1450,"bandpass",.011);
        break;
      case "plant":
        this.tone(600,.11,.12,"sine");
        this.tone(840,.13,.13,"sine",.13);
        this.tone(1100,.29,.15,"sine",.29);
        this.noise(.06,.06,2200,"bandpass");
        break;
      case "defuse":
        // One tablet shutdown/success cue, distinct from the bomb's ticking.
        this.noise(.080,.120,1250,"bandpass");
        this.tone(320,.21,.085,"triangle",.04,175);
        this.noise(.110,.060,500,"lowpass",.15);
        break;
      case "barricade":
        this.noise(.09,.19,670,"bandpass");
        this.noise(.13,.14,360,"lowpass",.12);
        this.tone(380,.10,.13,"triangle",.03,185);
        this.noise(.055,.12,1700,"highpass",.28);
        break;
      case "beep":
        this.tone(1040,.075,.096,"sine");
        this.tone(520,.086,.03,"triangle");
        break;
      case "proximity":
        // Original paired-chirp warning, informed by the supplied ~3.55s
        // proximity-alarm reference; no third-party recording is embedded.
        // Two bursts fit the 3.25-second retrigger window without overlap.
        for(const offset of [0,1.80]){
          this.tone(790,.24,.12,"square",offset,960);
          this.tone(1185,.20,.060,"sine",offset+.012,920);
          this.noise(.045,.035,2800,"highpass",offset);
          this.tone(865,.17,.13,"square",offset+.44,1080);
          this.tone(1320,.16,.060,"sine",offset+.448,1020);
          this.noise(.065,.035,2400,"highpass",offset+.44);
        }
        break;
      case "round-win":
        // BLACKOUT's own victorious stinger, not a sampled Siege cue.
        this.noise(.16,.10,360,"lowpass",0);
        for(const [hz,delay] of [[294,.06],[370,.20],[440,.36],[587,.53]]){
          this.tone(hz,.30,.11,"triangle",delay,hz*.83);
          this.tone(hz*2,.19,.034,"sine",delay+.012,hz*1.5);
        }
        this.tone(294,.69,.09,"triangle",.53,220);
        break;
      case "round-lose":
      case "round-loss":
        // Distinct subdued result cue when the opposing side wins.
        this.noise(.15,.095,510,"lowpass",0);
        this.tone(330,.25,.08,"triangle",.05,262);
        this.tone(247,.32,.092,"triangle",.25,185);
        this.tone(165,.48,.11,"triangle",.47,110);
        break;
      case "hurt":
        this.noise(.19,.19,560,"lowpass");
        this.tone(105,.19,.11,"sawtooth",0,57);
        break;
      case "wire-rattle":
        // Footsteps brushing a coil: fine chain-link ring + short dry scrape.
        // The sound position is set by playAt at the actual wire coordinates.
        this.noise(.10,.12,3400,"highpass");
        this.noise(.16,.13,1100,"bandpass",.025);
        this.tone(790,.095,.071,"triangle",0,405);
        this.tone(1240,.06,.040,"sine",.048,780);
        break;
      case "wire-strike":
        // First V hit: crunchy steel stress without a full collapse.
        this.noise(.13,.21,1800,"bandpass");
        this.noise(.092,.14,4600,"highpass",.024);
        this.tone(615,.16,.16,"triangle",0,238);
        this.tone(1260,.12,.080,"sine",.024,690);
        break;
      case "wire-destroy":
        // Second V hit: bright snap then a tumbling series of metal clatters.
        this.noise(.16,.32,2200,"bandpass");
        this.noise(.12,.26,4900,"highpass",.007);
        this.tone(860,.23,.18,"sawtooth",0,190);
        this.noise(.14,.19,1260,"bandpass",.105);
        this.tone(640,.13,.11,"triangle",.126,300);
        this.noise(.19,.15,2050,"bandpass",.23);
        this.tone(470,.18,.085,"triangle",.255,170);
        this.noise(.22,.10,650,"lowpass",.345);
        break;
      case "impact":
        this.noise(.045,.065,3200,"highpass");
        break;
      case "round-start":
        this.tone(480,.09,.11,"sine");
        this.tone(760,.14,.13,"sine",.14);
        break;
      case "alarm":
        this.tone(850,.15,.12,"square");
        this.tone(540,.19,.10,"square",.20);
        break;
      default:break;
    }
  }
}
