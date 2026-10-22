// BLACKOUT V0.26.2: reproducible, wholly original short device cues.
// Run with Node to generate WAV inputs; mix separately with CC0 mechanical
// recordings from SOURCES.md. No samples or waveforms from other games.
import {writeFileSync} from "node:fs";
const rate=44100;
let randomState=0x7f32a101;
const random=()=>{
 randomState^=randomState<<13;
 randomState^=randomState>>>17;
 randomState^=randomState<<5;
 return ((randomState>>>0)/4294967296)*2-1;
};
function makeCue(duration,compose){
 const data=new Float64Array(Math.ceil(duration*rate));
 function sweep(at,seconds,startHz,endHz,level){
  const end=Math.min(data.length,Math.floor((at+seconds)*rate));
  const begin=Math.floor(at*rate);
  for(let i=begin;i<end;i++){
   const dt=(i/rate)-at,f=dt/seconds;
   const phase=2*Math.PI*(startHz*dt+(endHz-startHz)*dt*f*.5);
   const inEnv=Math.min(1,dt/.006),outEnv=Math.min(1,(seconds-dt)/.036);
   const body=Math.sin(phase)+.14*Math.sin(phase*2+.12)+.045*Math.sin(phase*3);
   data[i]+=level*body*Math.max(0,inEnv*outEnv)*(.92+.08*Math.cos(Math.PI*f));
  }
 }
 function click(at,seconds,level){
  const end=Math.min(data.length,Math.floor((at+seconds)*rate));
  for(let i=Math.floor(at*rate);i<end;i++){
   const p=((i/rate)-at)/seconds;
   data[i]+=random()*level*Math.pow(1-p,3);
  }
 }
 compose({sweep,click});
 // Small discrete reflection makes the device chirp sit in the same room as
 // the player's hands without creating a repeating resonant buzzer.
 const offset=Math.floor(.037*rate);
 for(let i=data.length-1;i>=offset;i--)data[i]+=data[i-offset]*.13;
 let peak=0;for(const x of data)peak=Math.max(peak,Math.abs(x));
 const gain=.84/(peak||1);
 const out=Buffer.alloc(44+data.length*2);
 out.write("RIFF",0);out.writeUInt32LE(out.length-8,4);
 out.write("WAVEfmt ",8);out.writeUInt32LE(16,16);
 out.writeUInt16LE(1,20);out.writeUInt16LE(1,22);
 out.writeUInt32LE(rate,24);out.writeUInt32LE(rate*2,28);
 out.writeUInt16LE(2,32);out.writeUInt16LE(16,34);
 out.write("data",36);out.writeUInt32LE(data.length*2,40);
 for(let i=0;i<data.length;i++)out.writeInt16LE(Math.max(-32768,
  Math.min(32767,Math.round(data[i]*gain*32767))),44+i*2);
 return out;
}
const cues=[
 ["DefuserArmCue.wav",.77,({sweep,click})=>{
  click(.015,.023,.34);sweep(.042,.21,500,900,.62);
  sweep(.045,.13,210,175,.10);click(.32,.019,.30);
  sweep(.342,.23,880,580,.70);sweep(.59,.115,395,330,.20);
  click(.63,.021,.25);
 }],
 ["DefuserTickCue.wav",.17,({sweep,click})=>{
  click(.001,.014,.20);sweep(.017,.108,1070,965,.68);
  sweep(.033,.086,535,485,.22);
 }],
 ["DefuserTickUrgentCue.wav",.17,({sweep,click})=>{
  click(.001,.015,.22);sweep(.015,.11,1240,1090,.75);
  sweep(.030,.082,620,548,.24);
 }],
 ["DefuserShutdownCue.wav",.88,({sweep,click})=>{
  click(.012,.027,.38);sweep(.063,.25,570,300,.50);
  click(.29,.024,.24);sweep(.33,.30,385,160,.57);
  sweep(.44,.26,155,72,.24);click(.62,.028,.38);
 }]
];
for(const [name,duration,sequence] of cues){
 writeFileSync(name,makeCue(duration,sequence));
}
