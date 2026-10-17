/*
 * REDLINE V11.1 — recorded-engine-first racing audio.
 *
 * Corrects V11's harshness: five always-on white-noise layers plus extreme
 * >3x WAV playback speeds made the engine sound like sandpaper. This mix
 * uses two gently filtered engine samples with constant-power crossfade;
 * all secondary engine/tyre/boost sounds are quiet, pure oscillators.
 * Impacts and shifts are brief pitched envelopes, NEVER static noise.
 *
 * Visuals, physics, Garage, accounts, networking and saved audio settings
 * are external and unchanged.
 */
const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,Number.isFinite(v)?v:0));
const smoothstep=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t)};
const PROFILES=Object.freeze({
  gt:      {pitch:1.000,bass:.66,bright:.40,cylinders:6},
  vortex:  {pitch:1.060,bass:.40,bright:.70,cylinders:8},
  apex:    {pitch:1.025,bass:.50,bright:.58,cylinders:4},
  bayside: {pitch:1.080,bass:.37,bright:.70,cylinders:4},
  aurora:  {pitch:.960,bass:.76,bright:.30,cylinders:4},
  ironclad:{pitch:.905,bass:1.00,bright:.28,cylinders:8},
  cirrus:  {pitch:1.015,bass:.69,bright:.53,cylinders:8},
  obsidian:{pitch:1.090,bass:.44,bright:.80,cylinders:8},
  phantom: {pitch:1.110,bass:.35,bright:.87,cylinders:10}
});
function target(param,value,ctx,seconds=.070){
  if(!param)return;
  const time=ctx.currentTime;
  param.cancelScheduledValues(time);
  param.setTargetAtTime(Number.isFinite(value)?value:0,time,seconds);
}
function makeGain(ctx,destination,initial=0){
  const node=ctx.createGain();node.gain.value=initial;
  node.connect(destination);return node;
}
function makeFilter(ctx,type,frequency,destination){
  const node=ctx.createBiquadFilter();
  node.type=type;node.frequency.value=frequency;
  node.Q.value=.55;node.connect(destination);return node;
}
function playOsc(ctx,type,freq,destination){
  const node=ctx.createOscillator();
  node.type=type;node.frequency.value=freq;
  node.connect(destination);node.start();return node;
}
function playSample(ctx,buffer,destination){
  const node=ctx.createBufferSource();
  node.buffer=buffer;node.loop=true;
  node.playbackRate.value=1;
  node.connect(destination);node.start();return node;
}
function eventTone(ctx,bus,type,strength){
  // Short musical engine/impact cues: no white-noise samples, no sizzle.
  const amount=clamp(strength,.12,1.35);
  const now=ctx.currentTime;
  const config=type==="impact"
    ?{wave:"sine",from:116,to:49,peak:.24,life:.27}
    :type==="shift"
    ?{wave:"triangle",from:190,to:85,peak:.043,life:.12}
    :{wave:"sine",from:240,to:420,peak:.042,life:.21};
  const gain=makeGain(ctx,bus,.00001);
  const osc=ctx.createOscillator();
  osc.type=config.wave;
  osc.frequency.setValueAtTime(config.from,now);
  osc.frequency.exponentialRampToValueAtTime(config.to,now+config.life);
  osc.connect(gain);
  gain.gain.setValueAtTime(.00001,now);
  gain.gain.exponentialRampToValueAtTime(
    Math.max(.00002,config.peak*amount),now+.012);
  gain.gain.exponentialRampToValueAtTime(.00001,now+config.life);
  osc.onended=()=>{try{osc.disconnect()}catch{}try{gain.disconnect()}catch{}};
  osc.start(now);osc.stop(now+config.life+.02);
}
/** Shared AudioContext and existing engine/SFX buses from audio.js. */
export function createRedlineSoundscape({
  context,engineBus,sfxBus,buffers={}
}={}){
  if(!context||!engineBus||!sfxBus)
    throw new Error("REDLINE audio requires one context and engine/SFX buses");

  let active=false;
  let streams=[],connections=[],samples=[];
  let lowGain,highGain,subGain,subTone,harmonicGain,harmonicTone;
  let tireGain,tireTone,turboGain,turboTone,boostGain,boostTone;
  let elapsed=0,prevGear=1,prevThrottle=0,prevBoost=false,prevImpact=0;
  let lastImpactTime=-100,lastLiftTime=-100,shiftDip=0;
  let smoothedRPM=900,smoothedSpeed=0,smoothedThrottle=0;
  let model="gt";
  let crossfade=.0;
  let generation=0;

  const attach=(node)=>{connections.push(node);return node;};
  function begin(){
    if(active)return;
    active=true;generation++;
    elapsed=0;prevGear=1;prevThrottle=0;prevBoost=false;
    prevImpact=0;lastImpactTime=-100;lastLiftTime=-100;shiftDip=0;
    smoothedRPM=900;smoothedSpeed=0;smoothedThrottle=0;
    streams=[];connections=[];samples=[];
    lowGain=attach(makeGain(context,engineBus));
    highGain=attach(makeGain(context,engineBus));
    const lowFilter=attach(makeFilter(context,"lowpass",2100,lowGain));
    const highFilter=attach(makeFilter(context,"lowpass",2750,highGain));
    if(buffers.low){
      const low=playSample(context,buffers.low,lowFilter);
      streams.push(low);samples.push({node:low,band:"low"});
    }
    if(buffers.high){
      const high=playSample(context,buffers.high,highFilter);
      streams.push(high);samples.push({node:high,band:"high"});
    }
    // Rounded, almost inaudible cylinders/low-end weight under recordings.
    // Missing WAVs raise only these *tonal* fallback levels.
    subGain=attach(makeGain(context,engineBus));
    const subFilter=attach(makeFilter(context,"lowpass",250,subGain));
    subTone=playOsc(context,"sine",54,subFilter);streams.push(subTone);
    harmonicGain=attach(makeGain(context,engineBus));
    const harmonicFilter=attach(makeFilter(context,"lowpass",570,harmonicGain));
    harmonicTone=playOsc(context,"triangle",106,harmonicFilter);
    streams.push(harmonicTone);

    // SFX do not produce any noise at idle. Tire squeal requires a real
    // slide; boost/turbo whine requires input and revs.
    tireGain=attach(makeGain(context,sfxBus));
    tireTone=playOsc(context,"sine",670,tireGain);streams.push(tireTone);
    turboGain=attach(makeGain(context,sfxBus));
    turboTone=playOsc(context,"sine",440,turboGain);streams.push(turboTone);
    boostGain=attach(makeGain(context,sfxBus));
    boostTone=playOsc(context,"sine",260,boostGain);streams.push(boostTone);
    return true;
  }

  function update(telemetry={},dt=.016){
    if(!active)return;
    const t=telemetry||{};
    const delta=clamp(Number(dt)||.016,.001,.075);
    elapsed+=delta;
    const specId=typeof t.car==="string"?t.car:"gt";
    model=Object.hasOwn(PROFILES,specId)?specId:"gt";
    const profile=PROFILES[model];
    const rawRPM=clamp(Number(t.rpm)||900,800,7600);
    const rpmValue=clamp((rawRPM-900)/6300);
    const speed=clamp(Number(t.speed)||0,0,125);
    const throttle=t.throttle?1:0;
    const boost=!!t.nitro;
    const gear=Math.round(clamp(Number(t.gear)||1,1,6));
    const slip=Math.abs(Number(t.slip)||0);
    const grounded=!t.airborne;
    smoothedRPM+=(rawRPM-smoothedRPM)*(1-Math.exp(-delta*8));
    smoothedSpeed+=(speed-smoothedSpeed)*(1-Math.exp(-delta*7));
    smoothedThrottle+=(throttle-smoothedThrottle)*(1-Math.exp(-delta*8));
    const intensity=.73+.27*smoothedThrottle;
    const safeFactor=1-shiftDip*.32;

    // Recorded 1000/2000 RPM loops are never sped up beyond 1.72x;
    // V11 drove some cars over 3.5x, generating brittle high frequencies.
    crossfade=smoothstep(1200,3050,smoothedRPM);
    const a=Math.cos(crossfade*Math.PI/2);
    const b=Math.sin(crossfade*Math.PI/2);
    const remaining=1+(t.brake?-.07:0);
    target(lowGain.gain,buffers.low?.62*a*intensity*safeFactor*remaining:0,context,.082);
    target(highGain.gain,buffers.high?.66*b*intensity*safeFactor*remaining:0,context,.082);
    const lowPitch=clamp((.91+rpmValue*.44)*profile.pitch,.82,1.49);
    const highPitch=clamp((.92+rpmValue*.59)*profile.pitch,.82,1.72);
    for(const {node,band} of samples)
      target(node.playbackRate,band==="low"?lowPitch:highPitch,context,.11);

    // Quieter engine support: a low sine fundamental and lightly rounded
    // triangle octave (no abrasive sawtooth, broadband white noise).
    const firing=profile.cylinders/2;
    const fundamental=clamp((smoothedRPM/60)*firing/2,32,260);
    target(subTone.frequency,fundamental,context,.10);
    target(harmonicTone.frequency,fundamental*1.90,context,.10);
    const missingBoth=!buffers.low&&!buffers.high;
    const tonalScale=missingBoth?2.5:1;
    target(subGain.gain,(missingBoth?.045:.009)*profile.bass*
      (.62+.38*smoothedThrottle)*tonalScale,context,.095);
    target(harmonicGain.gain,(missingBoth?.020:.003)*
      (.6+.4*profile.bright)*tonalScale,context,.095);

    const drift=grounded&&speed>8
      ?clamp((slip-4.5)/13+(t.handbrake?.25:0)):0;
    const icy=t.surface==="ICE"||t.surface==="SNOW";
    target(tireGain.gain,.015*drift*(icy?.30:1),context,.10);
    target(tireTone.frequency,600+200*drift+speed*2.0,context,.10);

    const turbo=smoothstep(2500,5200,smoothedRPM)*smoothedThrottle;
    target(turboGain.gain,.009*turbo*profile.bright,context,.12);
    target(turboTone.frequency,410+510*turbo,context,.12);

    target(boostGain.gain,boost?.024:0,context,.075);
    target(boostTone.frequency,boost?370:260,context,.09);

    if(gear!==prevGear&&elapsed>.9){
      shiftDip=1;
      eventTone(context,sfxBus,"shift",.48);
    }
    prevGear=gear;
    shiftDip=Math.max(0,shiftDip-delta*6);
    if(prevThrottle===1&&throttle===0&&smoothedRPM>2600&&
       elapsed-lastLiftTime>.3){
      eventTone(context,sfxBus,"shift",.38);
      lastLiftTime=elapsed;
    }
    prevThrottle=throttle;
    if(boost&&!prevBoost)eventTone(context,sfxBus,"boost",.47);
    prevBoost=boost;
    const impact=clamp(Number(t.impact)||0);
    if(impact>.50&&prevImpact<=.20&&elapsed-lastImpactTime>.28){
      eventTone(context,sfxBus,"impact",clamp(.33+speed/65,.35,1));
      lastImpactTime=elapsed;
    }
    prevImpact=impact;
  }

  function stop(){
    if(!active)return;
    active=false;
    const now=context.currentTime;
    // Fade through the WebAudio clock; release all sources and connections
    // as soon as their scheduled stop fires.
    for(const gain of [lowGain,highGain,subGain,harmonicGain,tireGain,
      turboGain,boostGain]){
      if(gain)target(gain.gain,0,context,.018);
    }
    const ending=streams.slice(),branches=connections.slice();
    streams=[];connections=[];samples=[];
    let outstanding=ending.length;
    for(const source of ending){
      source.onended=()=>{
        try{source.disconnect()}catch{}
        if(--outstanding===0)
          for(const branch of branches)try{branch.disconnect()}catch{}
      };
      try{source.stop(now+.105)}catch{
        if(source.onended)source.onended();
      }
    }
    if(!ending.length)for(const branch of branches)
      try{branch.disconnect()}catch{}
  }
  return {
    start:begin,update,stop,
    get active(){return active},
    get debug(){return {
      active,profile:model,rpm:smoothedRPM,speed:smoothedSpeed,
      engineSamples:samples.length,noiseLayers:0,
      highPitchLimit:1.72
    }}
  };
}
