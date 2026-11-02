// W16.0: grounded rear-hatch entry/exit choreography.
// Frame-local coordinates: -Z is rear, +Z is suit front.
// The survivor model's forward is -Z, so facing +Z requires yaw PI.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t)};
const lerp=(a,b,t)=>a+(b-a)*t;
const wrapped=a=>Math.atan2(Math.sin(a),Math.cos(a));
export function powerEntryPose(phase,progress,origin={x:0,z:-2.3,yaw:0}){
  const t=clamp(Number.isFinite(progress)?progress:0,0,1);
  const entering=phase==='entering',exiting=phase==='exiting';
  if(!entering&&!exiting)
    return {x:0,y:0,z:-.28,yaw:Math.PI,walking:false,walkSpeed:0,
      step:0,hatch:0,brace:0,seated:true};
  // Open the hatch before a foot moves. Keep it open until both feet
  // are inside/outside, then let hydraulic latches close it.
  const hatch=smooth(0,.19,t)*(1-smooth(.84,1,t));
  const startX=clamp(Number.isFinite(origin.x)?origin.x:0,-1.7,1.7);
  const startZ=clamp(Number.isFinite(origin.z)?origin.z:-2.3,-3.45,-1.50);
  const startYaw=wrapped(Number.isFinite(origin.yaw)?origin.yaw:0);
  let x,z,yaw,walk;
  if(entering){
    const turn=smooth(0,.17,t);
    // Turn FIRST. Then take grounded steps into the rear cage.
    yaw=startYaw+wrapped(Math.PI-startYaw)*turn;
    const lineUp=smooth(.20,.38,t),board=smooth(.38,.82,t);
    x=lerp(startX,0,lineUp);
    z=lerp(startZ,-1.94,lineUp);
    z=lerp(z,-.28,board);
    walk=(t>.20&&t<.82);
  }else{
    // Face the hatch before stepping OUT. No backwards moonwalk.
    yaw=Math.PI*(1-smooth(0,.18,t));
    const stepOut=smooth(.21,.78,t);
    x=0;
    z=lerp(-.28,-2.35,stepOut);
    walk=(t>.21&&t<.78);
  }
  // The body root stays on the ground; only individual legs may lift.
  const step=walk?Math.sin((entering?t-.20:t-.21)*Math.PI*9):0;
  const brace=entering?smooth(.62,.78,t)*(1-smooth(.82,1,t)):
    smooth(0,.14,t)*(1-smooth(.25,.39,t));
  return {x,y:0,z,yaw,walking:walk,walkSpeed:walk?1.75:0,
    step,hatch,brace,seated:entering?t>=.82:t<=.21};
}
