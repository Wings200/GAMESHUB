// W20: explicit rear stairway choreography for the open power frame.
// Suit front is +Z. The survivor mesh faces -Z, so boarding faces yaw PI.
// Stage heights correspond to physical treads authored in power-armor-visual.mjs.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a));
const smooth=(a,b,value)=>{
  const t=clamp((value-a)/(b-a),0,1);return t*t*(3-2*t);
};
const lerp=(a,b,t)=>a+(b-a)*t;
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
export const POWER_BOARDING=Object.freeze({
  low:Object.freeze({z:-1.47,y:.22}),
  high:Object.freeze({z:-1.07,y:.43}),
  cabin:Object.freeze({z:-.60,y:.49}),
  rearExit:-2.35
});
const segment=(a,b,start,end,time)=>lerp(start,end,smooth(a,b,time));
export function powerEntryPose(phase,progress,origin={x:0,z:-2.35,yaw:Math.PI}){
  const t=clamp(progress,0,1);
  const entering=phase==='entering',exiting=phase==='exiting';
  const idle={x:0,y:POWER_BOARDING.cabin.y,z:POWER_BOARDING.cabin.z,
    yaw:Math.PI,walking:false,walkSpeed:0,step:0,footPhase:0,
    distance:0,hatch:0,brace:0,seated:true,stage:'parked',footLifts:[0,0]};
  if(!entering&&!exiting)return idle;
  const startX=clamp(origin?.x??0,-1.55,1.55);
  const startZ=clamp(origin?.z??-2.35,-3.55,-1.3);
  const startYaw=wrap(Number.isFinite(origin?.yaw)?origin.yaw:Math.PI);
  // Doors swing completely open before the first step and stay open until
  // the pilot is clear. Sliding behind closed plates is never a keyframe.
  const hatch=smooth(0,.20,t)*(1-smooth(.87,1,t));
  let x=0,z=0,y=0,yaw=0,stage='ready',stride=0,footLifts=[0,0];
  if(entering){
    yaw=startYaw+wrap(Math.PI-startYaw)*smooth(.05,.19,t);
    x=segment(.21,.35,startX,0,t);
    if(t<.35){z=segment(.21,.35,startZ,-1.93,t);stage='approach';}
    else if(t<.49){z=segment(.371,.49,-1.93,POWER_BOARDING.low.z,t);stage='lower-step';}
    else if(t<.64){z=segment(.5125,.64,POWER_BOARDING.low.z,POWER_BOARDING.high.z,t);stage='upper-step';}
    else if(t<.81){z=segment(.6655,.81,POWER_BOARDING.high.z,POWER_BOARDING.cabin.z,t);stage='cabin-step';}
    else{z=POWER_BOARDING.cabin.z;stage='braced';}
    if(t<.35)y=0;
    else if(t<.49)y=segment(.378,.49,0,POWER_BOARDING.low.y,t);
    else if(t<.64)y=segment(.52,.64,POWER_BOARDING.low.y,POWER_BOARDING.high.y,t);
    else if(t<.81)y=segment(.674,.81,POWER_BOARDING.high.y,POWER_BOARDING.cabin.y,t);
    else y=POWER_BOARDING.cabin.y;
    stride=Math.hypot(x-startX,z-startZ);
  }else{
    // Turn around while the rear spine is open, then climb DOWN the very
    // same steps rather than moving backwards through the shell.
    yaw=Math.PI*(1-smooth(.04,.22,t));
    x=0;
    if(t<.28){z=POWER_BOARDING.cabin.z;y=POWER_BOARDING.cabin.y;stage='turn-out';}
    else if(t<.45){
      z=segment(.3055,.45,POWER_BOARDING.cabin.z,POWER_BOARDING.high.z,t);
      y=segment(.314,.45,POWER_BOARDING.cabin.y,POWER_BOARDING.high.y,t);
      stage='cabin-step';
    }else if(t<.60){
      z=segment(.4725,.60,POWER_BOARDING.high.z,POWER_BOARDING.low.z,t);
      y=segment(.48,.60,POWER_BOARDING.high.y,POWER_BOARDING.low.y,t);
      stage='upper-step';
    }else if(t<.77){
      z=segment(.6255,.77,POWER_BOARDING.low.z,-1.93,t);
      y=segment(.634,.77,POWER_BOARDING.low.y,0,t);
      stage='lower-step';
    }else if(t<.85){
      z=segment(.77,.85,-1.93,POWER_BOARDING.rearExit,t);
      y=0;stage='clear-hatch';
    }else{z=POWER_BOARDING.rearExit;y=0;stage='outside';}
    stride=Math.abs(z-POWER_BOARDING.cabin.z);
  }
  const walking=entering?t>.21&&t<.81:t>.28&&t<.85;
  const footPhase=stride*Math.PI*2/.84;
  // Deliberate left/right climb instead of simultaneous knee bending.
  // Joint pose reads these independent foot lifts, not a random idle sine.
  const stepWindow=entering?(
    stage==='lower-step'?[.35,.49,0]:
    stage==='upper-step'?[.49,.64,1]:
    stage==='cabin-step'?[.64,.81,0]:null):(
    stage==='cabin-step'?[.28,.45,1]:
    stage==='upper-step'?[.45,.60,0]:
    stage==='lower-step'?[.60,.77,1]:null);
  let plantedLeg=null,plantedHeight=y,footTargets=null;
  if(stepWindow){
    const [a,b,leg]=stepWindow;
    const phaseProgress=clamp((t-a)/(b-a),0,1);
    footLifts[leg]=Math.sin(Math.PI*phaseProgress)*.24;
    // While the stepping boot moves to the next tread, keep the OTHER
    // boot aligned with the prior tread rather than lifting it along with
    // the root. This is the first constraint of the climb-contact rig.
    plantedLeg=1-leg;
    const level=entering?(
      stage==='lower-step'?0:
      stage==='upper-step'?POWER_BOARDING.low.y:POWER_BOARDING.high.y):(
      stage==='cabin-step'?POWER_BOARDING.cabin.y:
      stage==='upper-step'?POWER_BOARDING.high.y:POWER_BOARDING.low.y);
    plantedHeight=level;
    // Move the leading boot across the next tread in an arc while the
    // trailing boot transfers its weight a little later. Both land on a
    // measurable platform by the end of this interval. Inverse kinematics
    // determines the hip/knee angles from these foot-contact coordinates.
    const prev=entering?(
      stage==='lower-step'?{z:-1.93,y:0}:
      stage==='upper-step'?POWER_BOARDING.low:POWER_BOARDING.high):(
      stage==='cabin-step'?POWER_BOARDING.cabin:
      stage==='upper-step'?POWER_BOARDING.high:POWER_BOARDING.low);
    const next=entering?(
      stage==='lower-step'?POWER_BOARDING.low:
      stage==='upper-step'?POWER_BOARDING.high:POWER_BOARDING.cabin):(
      stage==='cabin-step'?POWER_BOARDING.high:
      stage==='upper-step'?POWER_BOARDING.low:{z:-1.93,y:0});
    const target=(fraction,arc)=>({
      z:lerp(prev.z,next.z,fraction),
      y:lerp(prev.y,next.y,fraction)+arc*Math.sin(Math.PI*fraction)
    });
    const lead=smooth(.05,.78,phaseProgress);
    const follow=smooth(.50,.98,phaseProgress);
    footTargets=[null,null];
    footTargets[leg]=target(lead,.16);
    footTargets[1-leg]=target(follow,.08);
  }else if((entering&&stage==='braced')||
           (exiting&&stage==='turn-out')){
    footTargets=[{...POWER_BOARDING.cabin},{...POWER_BOARDING.cabin}];
  }
  // Reach the rear handholds BEFORE placing the first boot, then pull
  // the upper body up. These arm cues are separate from the suit servos.
  const grip=entering?smooth(.23,.36,t)*(1-smooth(.83,.93,t)):
    smooth(.04,.14,t)*(1-smooth(.78,.90,t));
  const brace=entering?smooth(.77,.86,t)*(1-smooth(.91,1,t)):
    smooth(.04,.13,t)*(1-smooth(.25,.32,t));
  return {x,y,z,yaw,walking,walkSpeed:walking?1.55:0,
    step:walking?Math.sin(footPhase):0,footPhase,distance:stride,
    hatch,brace,grip,seated:entering?t>=.81:t<=.28,
    stage,footLifts,footTargets,plantedLeg,plantedHeight};
}
