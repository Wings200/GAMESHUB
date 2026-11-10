// Math shared by the browser motor and Node tests. No rendering dependencies.
export const MOTION_THRESHOLDS=Object.freeze({
  idle:0.16,
  enterRun:3.85,
  exitRun:3.35
});

export function damp(current,target,responsiveness,deltaTime){
  if(!Number.isFinite(current)||!Number.isFinite(target)||
    !Number.isFinite(responsiveness)||!Number.isFinite(deltaTime))
    throw new TypeError('Damping needs finite numbers');
  if(responsiveness<0||deltaTime<0)
    throw new RangeError('Responsiveness and delta time cannot be negative');
  return current+(target-current)*(1-Math.exp(-responsiveness*deltaTime));
}

export function shortestAngleDegrees(from,to){
  if(!Number.isFinite(from)||!Number.isFinite(to))
    throw new TypeError('Angles must be finite');
  return ((to-from+540)%360+360)%360-180;
}

// Character rigs in our PlayCanvas pipeline face -Z at heading 0.
// Positive Y rotation turns that forward vector toward -X, so X is negated.
export function headingForVelocity(x,z){
  if(!Number.isFinite(x)||!Number.isFinite(z))
    throw new TypeError('Heading needs finite velocity');
  if(x===0&&z===0)return 0;
  return Math.atan2(-x,-z)*180/Math.PI;
}

export function cyclePhase(progress){
  if(!Number.isFinite(progress))return 0;
  return ((progress%1)+1)%1;
}

export function locomotionState(speed,previous,grounded=true,
  thresholds=MOTION_THRESHOLDS){
  if(!Number.isFinite(speed)||speed<0)
    throw new RangeError('Speed must be a non-negative finite number');
  if(!grounded)return 'Jump';
  if(speed<thresholds.idle)return 'Idle';
  if(previous==='Run'&&speed>thresholds.exitRun)return 'Run';
  return speed>thresholds.enterRun?'Run':'Walk';
}
