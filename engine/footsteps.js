// GAMESHUB Engine gait-driven footstep scheduler.
// Distance, NOT a wall-clock loop, drives real recorded sound triggers.
export class FootstepSequencer {
  constructor(onStep,{walkStride=2.2,runStride=2.55,firstStep=.65}={}) {
    if(typeof onStep!=='function') throw new TypeError('Footstep callback required');
    this.onStep=onStep;
    this.walkStride=walkStride;
    this.runStride=runStride;
    this.firstStep=firstStep;
    this.distance=0;
    this.next=firstStep;
    this.index=0;
    this.active=false;
    this.grounded=true;
  }
  reset(){this.distance=0;this.next=this.firstStep;this.active=false;}
  advance({distance=0,grounded=true,running=false,enabled=true}={}) {
    if (!Number.isFinite(distance) || distance<0) throw new TypeError('Invalid travelled distance');
    if (!enabled || !grounded) {
      // Jumping or losing control must never leave a queued step.
      this.reset();this.grounded=grounded;return 0;
    }
    this.grounded=true;
    if(distance<1e-4) {this.active=false;return 0;}
    if (!this.active) {
      this.active=true;
      this.distance=0;
      this.next=this.firstStep;
    }
    this.distance+=distance;
    let played=0;
    while(this.distance>=this.next && played<3) {
      this.onStep({index:this.index++,foot:(this.index&1)?'right':'left',running});
      this.next+=running?this.runStride:this.walkStride;
      played++;
    }
    // cap recovery from long frame stalls to avoid audible machine-gun steps
    if(this.distance-this.next>this.runStride*3) {
      this.distance=this.next;
    }
    return played;
  }
}
