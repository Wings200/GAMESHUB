/*
 * REDLINE V13 — clean, RPM-locked engine synthesis experiment.
 *
 * No third-party recording, microphones, crowd or broadband-noise layers.
 * Harmonic combustion-pulse waves follow the local physics RPM; throttle
 * changes the exhaust/intake balance. Nine factory engine characters.
 *
 * Opt in with ?engine=v13. Normal V11.2 is not changed.
 */
const limit=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,Number.isFinite(v)?v:lo));
const MODELS=Object.freeze({
  gt:      {name:"Smooth straight-six",cyl:6,rough:.10,bass:.72,edge:.42,turbo:0,pitch:1.00},
  vortex:  {name:"Sports V8",cyl:8,rough:.30,bass:.73,edge:.70,turbo:0,pitch:1.01},
  apex:    {name:"Lightweight four",cyl:4,rough:.09,bass:.38,edge:.72,turbo:0,pitch:1.06},
  bayside: {name:"Turbo street four",cyl:4,rough:.18,bass:.48,edge:.77,turbo:.75,pitch:1.01},
  aurora:  {name:"Rally turbo four",cyl:4,rough:.23,bass:.64,edge:.55,turbo:.80,pitch:.96},
  ironclad:{name:"Crossplane muscle V8",cyl:8,rough:.53,bass:1.00,edge:.33,turbo:0,pitch:.93},
  cirrus:  {name:"Touring V8",cyl:8,rough:.19,bass:.86,edge:.41,turbo:0,pitch:.97},
  obsidian:{name:"High-rev race V8",cyl:8,rough:.17,bass:.48,edge:.97,turbo:0,pitch:1.07},
  phantom: {name:"High-rev V10",cyl:10,rough:.10,bass:.38,edge:1.00,turbo:0,pitch:1.09}
});
const set=(ctx,param,value,time=.065)=>{
  if(!param)return;
  const now=ctx.currentTime;
  param.cancelScheduledValues(now);
  param.setTargetAtTime(value,now,time);
};
function gain(ctx,output,value=0){
  const node=ctx.createGain();node.gain.value=value;node.connect(output);return node;
}
function filter(ctx,type,hz,output,Q=.71){
  const node=ctx.createBiquadFilter();
  node.type=type;node.frequency.value=hz;node.Q.value=Q;
  node.connect(output);return node;
}
/*
 * Make a periodically firing two-cylinder-group combustion cycle.
 * Inharmonic crowd ambience is impossible: waveform contains ONLY
 * deterministic engine harmonics. The two exhaust pops can differ in
 * amplitude, giving a crossplane V8 a loping idle without noisy hiss.
 */
function combustionWave(ctx,rough,kind){
  const count=256,harmonics=48;
  const waveform=new Float32Array(count);
  const width=kind==="rumble"?.086:kind==="intake"?.052:.036;
  const tail=kind==="rumble"?.27:.125;
  for(let n=0;n<count;n++){
    const t=n/count;
    let sum=0;
    const strength=[1+rough,1-rough];
    for(let p=0;p<2;p++){
      const d=(t-p*.5+1)%1;
      // Fast pressure rise and soft exhaust-decay tail; no random noise.
      const rise=Math.exp(-Math.pow(Math.min(d,1-d)/width,2));
      const decay=d<.40?Math.exp(-d/tail):0;
      sum+=strength[p]*(kind==="intake"?rise*.72+decay*.28:rise*.48+decay*.52);
    }
    waveform[n]=sum;
  }
  const real=new Float32Array(harmonics+1);
  const imag=new Float32Array(harmonics+1);
  // A fixed bandlimited Fourier table, with no DC component.
  for(let k=1;k<=harmonics;k++){
    let re=0,im=0;
    for(let n=0;n<count;n++){
      const phase=2*Math.PI*k*n/count;
      re+=waveform[n]*Math.cos(phase);
      im-=waveform[n]*Math.sin(phase);
    }
    const rolloff=kind==="rumble"?Math.exp(-k/11):
      kind==="intake"?Math.exp(-k/27):Math.exp(-k/20);
    real[k]=(re*2/count)*rolloff;
    imag[k]=(im*2/count)*rolloff;
  }
  return ctx.createPeriodicWave(real,imag,{disableNormalization:false});
}
function makeVoice(ctx,wave,out,type,hz){
  const osc=ctx.createOscillator();
  osc.setPeriodicWave(wave);
  osc.frequency.value=hz;
  osc.connect(out);
  osc.start();
  return osc;
}
export function createV13EnginePreview({
  context,engineBus,sfxBus,buffers,fallbackFactory
}={}){
  if(!context||!engineBus||!sfxBus||typeof fallbackFactory!=="function")
    throw new Error("V13 requires a Web Audio context and V11.2 fallback");

  const oldBus=gain(context,engineBus,1);
  const old=fallbackFactory({
    context,engineBus:oldBus,sfxBus,buffers
  });
  let active=false,engaged=false,profile=MODELS.gt,car="gt";
  let lastGear=1,shiftDip=0,rpm=900,throttle=0;
  let nodes=[],sources=[],waves=new Map();
  let exhaust,body,intake,crank,turbo;
  let exhLevel,bodyLevel,intakeLevel,crankLevel,turboLevel;
  let exhFilter,bodyFilter,intakeFilter;
  let mainGain;
  let status="Waiting for race";

  function build(){
    // Only the synth engine reaches mainGain. V11.2 continues supplying
    // tyre, shifting, impact and boost effects through the existing SFX bus.
    mainGain=gain(context,engineBus,0);
    nodes.push(mainGain);
    const dynamics=context.createDynamicsCompressor();
    dynamics.threshold.value=-19;
    dynamics.knee.value=12;
    dynamics.ratio.value=2.6;
    dynamics.attack.value=.008;
    dynamics.release.value=.12;
    dynamics.connect(mainGain);
    nodes.push(dynamics);

    exhLevel=gain(context,dynamics,0);
    bodyLevel=gain(context,dynamics,0);
    intakeLevel=gain(context,dynamics,0);
    crankLevel=gain(context,dynamics,0);
    turboLevel=gain(context,dynamics,0);
    nodes.push(exhLevel,bodyLevel,intakeLevel,crankLevel,turboLevel);
    exhFilter=filter(context,"lowpass",1100,exhLevel);
    bodyFilter=filter(context,"lowpass",360,bodyLevel);
    intakeFilter=filter(context,"bandpass",850,intakeLevel,.75);
    nodes.push(exhFilter,bodyFilter,intakeFilter);

    for(const [id,spec] of Object.entries(MODELS)){
      waves.set(id,{
        exhaust:combustionWave(context,spec.rough,"exhaust"),
        rumble:combustionWave(context,spec.rough,"rumble"),
        intake:combustionWave(context,spec.rough,"intake")
      });
    }
    const w=waves.get(car);
    exhaust=makeVoice(context,w.exhaust,exhFilter,"exhaust",48);
    body=makeVoice(context,w.rumble,bodyFilter,"body",48);
    intake=makeVoice(context,w.intake,intakeFilter,"intake",48);
    crank=context.createOscillator();
    crank.type="sine";crank.frequency.value=30;
    crank.connect(crankLevel);crank.start();
    turbo=context.createOscillator();
    turbo.type="sine";turbo.frequency.value=250;
    turbo.connect(turboLevel);turbo.start();
    sources.push(exhaust,body,intake,crank,turbo);
  }
  function start(){
    if(active)return;
    active=true;engaged=false;car="gt";profile=MODELS.gt;
    rpm=900;throttle=0;shiftDip=0;lastGear=1;
    status="Starting clean engine";
    set(context,oldBus.gain,1,.02);
    old.start();
    try {
      build();
      set(context,mainGain.gain,.90,.045);
      set(context,oldBus.gain,.0001,.09);
      engaged=true;
      status="Clean RPM-linked engine active";
    }catch(error){
      status="V13 unsupported; V11.2 fallback: "+(error?.message||"audio error");
      for(const s of sources)try{s.stop()}catch{}
      for(const n of nodes)try{n.disconnect()}catch{}
      sources=[];nodes=[];waves.clear();
      set(context,oldBus.gain,1,.05);
    }
  }
  function update(data={},dt=.016){
    if(!active)return;
    old.update(data,dt);
    if(!engaged)return;
    const step=limit(Number(dt)||.016,.001,.09);
    const id=Object.hasOwn(MODELS,data.car)?data.car:"gt";
    if(id!==car){
      car=id;profile=MODELS[car];
      const w=waves.get(car);
      exhaust.setPeriodicWave(w.exhaust);
      body.setPeriodicWave(w.rumble);
      intake.setPeriodicWave(w.intake);
    }
    const r=limit(Number(data.rpm)||900,900,7600);
    const gear=limit(Math.round(Number(data.gear)||1),1,6);
    if(gear!==lastGear)shiftDip=1;
    lastGear=gear;
    shiftDip=Math.max(0,shiftDip-step*5.5);
    const alpha=1-Math.exp(-step*12);
    // Do not synthesize an unrelated RPM from speed: gear changes come
    // through the same transmission telemetry used by the on-screen tach.
    rpm+=(r-rpm)*alpha;
    throttle+=((data.throttle?1:0)-throttle)*(1-Math.exp(-step*10));
    const rev=limit((rpm-900)/6700);
    const firingHz=(rpm/60)*(profile.cyl/2);
    // A two-pulse wavetable repeats at HALF of the engine firing rate.
    const fundamental=limit(firingHz*.5*profile.pitch,12,420);
    set(context,exhaust.frequency,fundamental,.040);
    set(context,body.frequency,fundamental,.058);
    set(context,intake.frequency,fundamental,.043);
    set(context,crank.frequency,limit(rpm/60,15,130),.067);
    set(context,turbo.frequency,250+570*rev,.080);

    const shifting=1-.48*shiftDip;
    const load=.35+.65*throttle;
    // Low-passed exhaust carries the engine. Intake opens with throttle
    // and higher RPM rather than continuously producing a whistling tone.
    set(context,exhLevel.gain,(.16+.09*profile.bass)*(.64+.36*load)*shifting,.085);
    set(context,bodyLevel.gain,(.062+.069*profile.bass)*(.78+.22*load)*shifting,.095);
    set(context,intakeLevel.gain,(.027+.11*profile.edge)*(.14+.86*throttle)*
      (.42+.58*rev)*shifting,.075);
    set(context,crankLevel.gain,.015*profile.bass*(.72+.28*load),.09);
    set(context,turboLevel.gain,.009*profile.turbo*throttle*
      Math.pow(rev,1.6),.095);
    set(context,exhFilter.frequency,560+770*rev+330*throttle+
      240*profile.edge,.090);
    set(context,bodyFilter.frequency,185+240*rev+95*throttle,.12);
    set(context,intakeFilter.frequency,490+960*rev+420*profile.edge,.095);
  }
  function stop(){
    if(!active)return;
    active=false;engaged=false;status="Stopped";
    if(mainGain)set(context,mainGain.gain,0,.025);
    // A short fade prevents click at race-to-menu transitions.
    for(const s of sources){
      try{s.stop(context.currentTime+.13)}catch{}
    }
    const branches=nodes.slice(),voices=sources.slice();
    if(voices.length){
      let waiting=voices.length;
      for(const s of voices)s.onended=()=>{
        try{s.disconnect()}catch{}
        if(--waiting===0)for(const n of branches)try{n.disconnect()}catch{}
      };
    }else for(const n of branches)try{n.disconnect()}catch{}
    sources=[];nodes=[];waves.clear();
    old.stop();
  }
  return {
    start,update,stop,
    get active(){return active},
    get debug(){return {
      active,mode:"V13 clean harmonic engine preview",
      usingFallback:!engaged,status,car,engine:profile.name,
      rpm:Math.round(rpm),throttle:Number(throttle.toFixed(2)),
      recording:false,ambientVoices:false,externalMedia:false
    }}
  };
}
