// BLACKOUT V0.6 — standalone procedural WebAudio mixer.
// No audio downloads, server requirements or hidden autoplay. First click unlocks it.
export class GameAudio{
  constructor(){this.ctx=null;this.master=null;this.noiseBuffer=null;this.enabled=true;}
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
    gain.connect(g);g.connect(this.master);
    return g;
  }
  tone(hz,seconds,level,type="triangle",delay=0,endHz=hz){
    if(!this.ready)return;
    const c=this.ctx,t=c.currentTime+delay,o=c.createOscillator();
    o.type=type;o.frequency.setValueAtTime(hz,t);
    if(endHz!==hz)o.frequency.exponentialRampToValueAtTime(Math.max(20,endHz),t+seconds);
    this.envelope(o,t,level,seconds,.002);
    o.start(t);o.stop(t+seconds+.01);
  }
  noise(seconds,level,frequency=2200,mode="bandpass",delay=0,attack=.002){
    if(!this.ready)return;
    const c=this.ctx,t=c.currentTime+delay;
    const source=c.createBufferSource();source.buffer=this.noiseBuffer;
    const filter=c.createBiquadFilter();filter.type=mode;
    filter.frequency.value=frequency;filter.Q.value=mode==="bandpass"?.65:.7;
    source.connect(filter);this.envelope(filter,t,level,seconds,attack);
    source.start(t,Math.random()*.16);source.stop(t+seconds+.012);
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
  play(name){
    if(!this.ready)return;
    switch(name){
      case "fire":this.gun(false);break;
      case "pistol":this.gun(true);break;
      case "enemy-fire":
        this.noise(.08,.12,2600,"bandpass");
        this.tone(112,.11,.075,"triangle",0,55);
        break;
      case "step":
      case "run-step":
        this.noise(.07,name==="run-step"?.13:.093,310,"lowpass");
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
      case "click":
        this.noise(.025,.105,2100,"highpass");
        this.tone(760,.022,.06,"triangle",0,350);
        break;
      case "plant-key":
      case "defuse-key":
        this.tone(name==="plant-key"?840:610,.055,.068,"sine");
        this.tone(name==="plant-key"?430:300,.07,.028,"triangle",.015);
        break;
      case "plant":
        this.tone(600,.11,.12,"sine");
        this.tone(840,.13,.13,"sine",.13);
        this.tone(1100,.29,.15,"sine",.29);
        this.noise(.06,.06,2200,"bandpass");
        break;
      case "defuse":
        this.tone(940,.10,.10,"sine");
        this.tone(670,.11,.10,"sine",.14);
        this.tone(400,.23,.11,"sine",.28);
        break;
      case "beep":
        this.tone(1040,.075,.096,"sine");
        this.tone(520,.086,.03,"triangle");
        break;
      case "proximity":
        this.tone(720,.10,.10,"square");
        this.tone(720,.10,.10,"square",.18);
        this.tone(1080,.25,.12,"square",.38);
        break;
      case "hurt":
        this.noise(.19,.19,560,"lowpass");
        this.tone(105,.19,.11,"sawtooth",0,57);
        break;
      case "impact":
        this.noise(.045,.065,3200,"highpass");
        break;
      case "round-win":
        this.tone(440,.20,.13,"sine");
        this.tone(554,.21,.13,"sine",.23);
        this.tone(659,.42,.15,"sine",.47);
        break;
      case "round-lose":
        this.tone(490,.2,.12,"triangle");
        this.tone(365,.2,.13,"triangle",.25);
        this.tone(240,.46,.14,"triangle",.5);
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
