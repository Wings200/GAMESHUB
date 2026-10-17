/*
 * REDLINE V11 — sampled multi-layer vehicle soundscape.
 *
 * Persistent, crossfaded low/high engine WAV loops, distinct factory-car
 * exhaust response, tire/road noise, boost whoosh, turbo spool, wind, gear
 * shift burbles and short collision transients. No network/physics changes.
 * All generators run on the SAME AudioContext and existing saved volumes.
 * WebAudio sounds start only after the player clicks START (audio unlock).
 */
const limit=(x,min=0,max=1)=>Math.max(min,Math.min(max,Number.isFinite(x)?x:0));
const mix=(a,b,t)=>a+(b-a)*t;
const CAR_SOUND={
  gt:{pitch:1,rumble:.52,edge:.44},
  vortex:{pitch:1.15,rumble:.28,edge:.79},
  apex:{pitch:1.07,rumble:.38,edge:.60},
  bayside:{pitch:1.16,rumble:.24,edge:.69},
  aurora:{pitch:.93,rumble:.62,edge:.31},
  ironclad:{pitch:.80,rumble:1,edge:.27},
  cirrus:{pitch:1.03,rumble:.55,edge:.54},
  obsidian:{pitch:1.24,rumble:.25,edge:.96},
  phantom:{pitch:1.36,rumble:.20,edge:1.00}
};
const set=(param,value,context,smooth=.065)=>{
 const time=context.currentTime;
 const finite=Number.isFinite(value)?value:0;
 param.cancelScheduledValues(time);
 param.setTargetAtTime(finite,time,smooth);
};
function buildNoise(context){
 const length=Math.max(1,Math.round(context.sampleRate*1.23));
 const buffer=context.createBuffer(1,length,context.sampleRate);
 const samples=buffer.getChannelData(0);
 let seed=17787;
 for(let i=0;i<length;i++){
   seed=(Math.imul(seed,1664525)+1013904223)>>>0;
   samples[i]=(seed/2147483648-1)*.84;
 }
 return buffer;
}
function gain(context,destination,initial=0){
 const node=context.createGain();
 node.gain.value=initial;node.connect(destination);return node;
}
function filter(context,type,frequency,q,destination){
 const node=context.createBiquadFilter();
 node.type=type;node.frequency.value=frequency;node.Q.value=q;
 node.connect(destination);return node;
}
function makeOsc(context,type,freq,target){
 const o=context.createOscillator();
 o.type=type;o.frequency.value=freq;o.connect(target);o.start();
 return o;
}
function makeNoise(context,buffer,target){
 const src=context.createBufferSource();
 src.buffer=buffer;src.loop=true;src.connect(target);src.start();
 return src;
}
function releaseNode(node){try{node.stop()}catch{}try{node.disconnect()}catch{}}

/** Soundscape routes engine sources into engineBus and effects into sfxBus. */
export function createRedlineSoundscape({context,engineBus,sfxBus,buffers={}}){
 if(!context||!engineBus||!sfxBus)throw new Error("Soundscape needs the race audio context and buses");
 const noise=buildNoise(context);
 const state={active:false,profile:"gt",rpm:900,speed:0,throttle:0,
   boost:false,gear:1,shiftDuck:0,prevThrottle:0,lastImpact:0,
   lastShift:0,lastExhaust:0,lastBoost:false,engineSources:[],
   elapsed:0};
 let stream=[],connections=[];
 let lowGain,highGain,rumbleGain,rumbleTone,harmonicGain,harmonicTone;
 let tyreGain,tyreFilter,tyreSquealGain,tyreSquealTone;
 let windGain,windFilter,turboGain,turboFilter,boostGain,boostFilter;
 const live=()=>state.active;
 const persistentGain=(destination,initial=0)=>{
   const n=gain(context,destination,initial);connections.push(n);return n;
 };
 const persistentFilter=(type,frequency,q,destination)=>{
   const n=filter(context,type,frequency,q,destination);
   connections.push(n);return n;
 };
 function transient(type,intensity=1){
   if(!live())return;
   const now=context.currentTime,amount=limit(intensity,.1,1.5);
   const peak=type==="impact"?.26*amount:type==="shift"?.094*amount:.13*amount;
   const duration=type==="impact"?.29:type==="shift"?.14:.25;
   const output=gain(context,sfxBus,0);
   const eq=filter(context,type==="boost"?"bandpass":"lowpass",
     type==="impact"?300:type==="shift"?870:1450,
     type==="boost"?.63:.72,output);
   const src=context.createBufferSource();
   src.buffer=noise;src.loop=false;src.connect(eq);
   output.gain.setValueAtTime(.0001,now);
   output.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),now+.013);
   output.gain.exponentialRampToValueAtTime(.0001,now+duration);
   src.start(now);src.stop(now+duration+.03);
   if(type==="impact"){
     const thud=gain(context,sfxBus,0);
     const osc=context.createOscillator();
     osc.type="sine";
     osc.frequency.setValueAtTime(97,now);
     osc.frequency.exponentialRampToValueAtTime(41,now+.21);
     osc.connect(thud);
     thud.gain.setValueAtTime(.0001,now);
     thud.gain.exponentialRampToValueAtTime(.20*amount,now+.009);
     thud.gain.exponentialRampToValueAtTime(.0001,now+.22);
     osc.start(now);osc.stop(now+.24);
     osc.onended=()=>{try{osc.disconnect();thud.disconnect()}catch{}};
   }
   src.onended=()=>{try{src.disconnect();eq.disconnect();output.disconnect()}catch{}};
 }
 function begin(){
   if(state.active)return;
   state.active=true;
   state.prevThrottle=0;state.shiftDuck=0;state.lastImpact=0;
   state.lastBoost=false;state.gear=1;state.elapsed=0;
   connections=[];
   lowGain=persistentGain(engineBus);
   highGain=persistentGain(engineBus);
   rumbleGain=persistentGain(engineBus);
   const rumbleEQ=persistentFilter("lowpass",215,.43,rumbleGain);
   rumbleTone=makeOsc(context,"sawtooth",47,rumbleEQ);
   harmonicGain=persistentGain(engineBus);
   const harmonicEQ=persistentFilter("lowpass",820,.52,harmonicGain);
   harmonicTone=makeOsc(context,"triangle",93,harmonicEQ);
   stream.push(rumbleTone,harmonicTone);
   if(buffers.low){
     const low=makeNoise(context,buffers.low,lowGain);
     state.engineSources.push(low);stream.push(low);
   }
   if(buffers.high){
     const high=makeNoise(context,buffers.high,highGain);
     state.engineSources.push(high);stream.push(high);
   }
   // Inexpensive procedural fallback exists if the WAV assets fail to load.
   tyreGain=persistentGain(sfxBus);
   tyreFilter=persistentFilter("bandpass",1450,.78,tyreGain);
   stream.push(makeNoise(context,noise,tyreFilter));
   tyreSquealGain=persistentGain(sfxBus);
   tyreSquealTone=makeOsc(context,"sine",890,tyreSquealGain);
   stream.push(tyreSquealTone);
   windGain=persistentGain(sfxBus);
   windFilter=persistentFilter("lowpass",950,.75,windGain);
   stream.push(makeNoise(context,noise,windFilter));
   turboGain=persistentGain(sfxBus);
   turboFilter=persistentFilter("bandpass",2050,1.4,turboGain);
   stream.push(makeNoise(context,noise,turboFilter));
   boostGain=persistentGain(sfxBus);
   boostFilter=persistentFilter("bandpass",620,.64,boostGain);
   stream.push(makeNoise(context,noise,boostFilter));
   return true;
 }
 function update(telemetry={},dt=.016){
   if(!live())return;
   const delta=limit(Number(dt)||0,.001,.08),t=telemetry||{};
   state.elapsed+=delta;
   const id=typeof t.car==="string"?t.car:"gt";
   const profile=CAR_SOUND[id]||CAR_SOUND.gt;
   state.profile=id in CAR_SOUND?id:"gt";
   const rpm=limit(Number(t.rpm)||900,800,7800);
   const throttle=t.throttle?1:0,brake=t.brake?1:0;
   const speed=limit(Number(t.speed)||0,0,130);
   const slip=limit(Math.abs(Number(t.slip)||0),0,38);
   const grounded=!t.airborne;
   const boost=!!t.nitro;
   const gear=Math.round(limit(Number(t.gear)||1,1,6));
   const tension=limit((rpm-900)/6500),speedRatio=limit(speed/50);
   state.rpm=mix(state.rpm,rpm,1-Math.exp(-delta*11));
   state.speed=mix(state.speed,speed,1-Math.exp(-delta*6));
   state.throttle=mix(state.throttle,throttle,1-Math.exp(-delta*8));
   const spread=limit((state.rpm-1300)/2100);
   const wavLow=Math.cos(spread*Math.PI*.5),wavHigh=Math.sin(spread*Math.PI*.5);
   const lift=(1-state.throttle)*.32+.68;
   const input=lift*(.75+.25*tension)*(1-state.shiftDuck*.55);
   const basePitch=profile.pitch;
   // Both recorded samples play continuously. No 50ms dead-air switch.
   set(lowGain.gain,buffers.low ? .43*wavLow*input : 0,context);
   set(highGain.gain,buffers.high ? .45*wavHigh*input : 0,context);
   let engineIndex=0;
   if(buffers.low){
     set(state.engineSources[engineIndex++].playbackRate,
       limit(state.rpm/1000*basePitch,.75,2.65),context,.045);
   }
   if(buffers.high){
     set(state.engineSources[engineIndex++].playbackRate,
       limit(state.rpm/2000*basePitch,.80,3.65),context,.045);
   }
   // Car sound identity: heavy Ironclad bass, high Phantom/Cirrus whine.
   set(rumbleTone.frequency,limit(state.rpm*(.0085+profile.edge*.0030),36,132),context,.05);
   set(rumbleGain.gain,((buffers.low||buffers.high) ? .020 : .055)+
     .030*profile.rumble*(.45+.55*state.throttle),context);
   set(harmonicTone.frequency,limit(state.rpm*(.019+profile.edge*.008),70,230),context);
   set(harmonicGain.gain,.010+.025*profile.edge*tension,context);
   // Continuous physics-driven layers with short smoothing (no pops).
   const drift=grounded?limit((slip-2.8)/11+(t.handbrake&&speed>7?.3:0)):0;
   const ice=t.surface==="ICE"||t.surface==="SNOW";
   const squeal=ice?.18:1;
   set(tyreGain.gain,(.003+.12*drift*squeal)*(.5+.5*speedRatio),context,.085);
   set(tyreFilter.frequency,ice?1250:1670,context);
   set(tyreSquealTone.frequency,930+155*drift+speed*5,context,.052);
   set(tyreSquealGain.gain,.035*Math.pow(drift,1.5)*squeal,context,.075);
   const wind=limit((state.speed-8)/60);
   set(windGain.gain,.019*wind*wind+(t.airborne?.028*wind:0),context,.11);
   set(windFilter.frequency,720+speed*19,context,.13);
   const turbo=limit((tension-.24)/.62)*state.throttle;
   set(turboGain.gain,.005+.042*turbo*profile.edge,context,.09);
   set(turboFilter.frequency,1350+2300*turbo,context,.085);
   set(boostGain.gain,boost?.12:0,context,.065);
   set(boostFilter.frequency,boost?1120:550,context,.09);
   if(gear!==state.gear&&state.elapsed>1.0){
     transient("shift",.56+.3*tension);
     state.shiftDuck=1;
   }
   state.gear=gear;state.shiftDuck=Math.max(0,state.shiftDuck-delta*7.2);
   // Short exhaust burbles on lifting off after accelerating.
   if(state.prevThrottle>.65&&throttle===0&&state.rpm>2450&&
      state.elapsed-state.lastExhaust>.22){
     transient("shift",.45+.35*profile.rumble);
     state.lastExhaust=state.elapsed;
   }
   state.prevThrottle=throttle;
   if(boost&&!state.lastBoost)transient("boost",.58);
   state.lastBoost=boost;
   const impact=limit(Number(t.impact)||0);
   if(impact>.36&&state.lastImpact<=.15&&state.elapsed-state.lastShift>.27){
     transient("impact",limit((speed+10)/45,.35,1));
     state.lastShift=state.elapsed;
   }
   state.lastImpact=impact;
 }
 function stop(){
   if(!state.active)return;
   state.active=false;
   const at=context.currentTime;
   // Release quietly so a menu transition doesn't click.
   for(const g of [lowGain,highGain,rumbleGain,harmonicGain,tyreGain,
      tyreSquealGain,windGain,turboGain,boostGain]){
     if(g){g.gain.cancelScheduledValues(at);g.gain.setTargetAtTime(0,at,.025);}
   }
   const old=stream.slice();
   const staleConnections=connections.slice();
   stream=[];connections=[];state.engineSources=[];
   // Web Audio clock cleanup: no lingering lowpass/gain branches each time
   // the player goes back to the Garage and starts another race.
   let awaiting=old.length;
   for(const source of old){
     source.onended=()=>{
       try{source.disconnect()}catch{}
       if(--awaiting===0)for(const n of staleConnections)try{n.disconnect()}catch{}
     };
     try{source.stop(at+.12)}catch{source.onended?.()}
   }
   if(!old.length)for(const n of staleConnections)try{n.disconnect()}catch{};
 }
 return {
   get active(){return state.active},
   start:begin,update,stop,
   get debug(){return {
     active:state.active,profile:state.profile,rpm:state.rpm,
     speed:state.speed,engineSamples:state.engineSources.length
   }}
 };
}
