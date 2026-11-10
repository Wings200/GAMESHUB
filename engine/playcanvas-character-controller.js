import * as pc from 'playcanvas';
import {cyclePhase,damp,headingForVelocity,locomotionState,shortestAngleDegrees}
  from './locomotion-math.mjs';

const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

// Kinematic third-person motor. Movement and clip playback share ONE velocity,
// avoiding independent walk-cycle speeds that caused visible foot skating.
// Ground height is pluggable; this is not yet a general capsule physics solver.
export class PlayCanvasCharacterMotor{
  constructor({entity,avatar,walkSpeed=2.6,runSpeed=5.1,
    acceleration=10,deceleration=13,turnResponse=13,gravity=15,
    jumpSpeed=5.7,groundHeightAt=()=>0,
    bounds={minX:-14.7,maxX:14.7,minZ:-14.7,maxZ:14.7}}={}){
    if(!entity||!avatar?.anim?.baseLayer)
      throw new TypeError('A player entity and animated avatar are required');
    this.entity=entity;
    this.avatar=avatar;
    this.walkSpeed=walkSpeed;
    this.runSpeed=runSpeed;
    this.acceleration=acceleration;
    this.deceleration=deceleration;
    this.turnResponse=turnResponse;
    this.gravity=gravity;
    this.jumpSpeed=jumpSpeed;
    this.groundHeightAt=groundHeightAt;
    this.bounds=bounds;
    this.velocity=new pc.Vec3();
    this.verticalSpeed=0;
    this.grounded=true;
    this.speed=0;
    this.state='Idle';
    this.heading=entity.getEulerAngles().y;
    this.input={x:0,z:0,run:false,cameraYaw:0};
    this.jumpQueued=false;
    this.transitionCount=0;
    this.lastTransition=null;
    this.onStateChange=null;
  }

  setInput({x=0,z=0,run=false,cameraYaw=0}={}){
    if(![x,z,cameraYaw].every(Number.isFinite))
      throw new TypeError('Character input must be finite');
    this.input={x:clamp(x,-1,1),z:clamp(z,-1,1),run:!!run,cameraYaw};
  }

  requestJump(){
    if(!this.grounded)return false;
    this.jumpQueued=true;
    return true;
  }

  forceState(name){
    this._transition(name);
  }

  _transition(next){
    if(next===this.state)return;
    const from=this.state;
    const layer=this.avatar.anim.baseLayer;
    if(!layer.states.includes(next))return;
    let offset;
    // Match foot-cycle phase at Walk <-> Run boundaries. PlayCanvas's third
    // transition argument is the destination's normalized start offset.
    if((from==='Walk'&&next==='Run')||(from==='Run'&&next==='Walk'))
      offset=cyclePhase(layer.activeStateProgress);
    const duration=next==='Jump'?.1:from==='Jump'?.18:next==='Idle'?.22:.2;
    layer.transition(next,duration,offset);
    this.state=next;
    this.transitionCount++;
    this.lastTransition={from,to:next,duration,offset:offset??null};
    this.onStateChange?.(next,this.lastTransition);
  }

  update(deltaTime){
    if(!Number.isFinite(deltaTime)||deltaTime<0)
      throw new RangeError('Invalid character update delta time');
    const dt=Math.min(deltaTime,.05);
    if(dt===0)return;
    const {x,z,run,cameraYaw}=this.input;
    const magnitude=Math.hypot(x,z);
    const targetSpeed=magnitude?run?this.runSpeed:this.walkSpeed:0;
    const sin=Math.sin(cameraYaw),cos=Math.cos(cameraYaw);
    const targetX=magnitude?(x*cos-z*sin)/magnitude*targetSpeed:0;
    const targetZ=magnitude?(z*cos+x*sin)/magnitude*targetSpeed:0;
    const response=magnitude?this.acceleration:this.deceleration;
    this.velocity.x=damp(this.velocity.x,targetX,response,dt);
    this.velocity.z=damp(this.velocity.z,targetZ,response,dt);
    if(!magnitude&&Math.hypot(this.velocity.x,this.velocity.z)<.01){
      this.velocity.x=0;
      this.velocity.z=0;
    }
    this.speed=Math.hypot(this.velocity.x,this.velocity.z);

    const pos=this.entity.getPosition();
    const nx=clamp(pos.x+this.velocity.x*dt,this.bounds.minX,this.bounds.maxX);
    const nz=clamp(pos.z+this.velocity.z*dt,this.bounds.minZ,this.bounds.maxZ);
    const floorY=this.groundHeightAt(nx,nz);
    if(!Number.isFinite(floorY))throw new RangeError('Ground height must be finite');
    if(this.jumpQueued&&this.grounded){
      this.verticalSpeed=this.jumpSpeed;
      this.grounded=false;
    }
    this.jumpQueued=false;
    let ny=floorY;
    if(!this.grounded){
      this.verticalSpeed-=this.gravity*dt;
      ny=pos.y+this.verticalSpeed*dt;
      if(ny<=floorY){
        ny=floorY;
        this.verticalSpeed=0;
        this.grounded=true;
      }
    }
    this.entity.setPosition(nx,ny,nz);

    if(this.speed>.16){
      const goal=headingForVelocity(this.velocity.x,this.velocity.z);
      this.heading+=shortestAngleDegrees(this.heading,goal)*
        (1-Math.exp(-this.turnResponse*dt));
      this.entity.setEulerAngles(0,this.heading,0);
    }

    this._transition(locomotionState(this.speed,this.state,this.grounded));
    // Synchronize authored gait cadence to actual displacement per second.
    // Idle and airborne clips retain their authored timing.
    this.avatar.anim.speed=this.grounded&&this.state==='Walk'?
      clamp(this.speed/this.walkSpeed,.22,1.3):
      this.grounded&&this.state==='Run'?
        clamp(this.speed/this.runSpeed,.7,1.25):1;
  }
}

// Screen-space orbit/follow behavior is independent of the character's motor.
// This class never assigns a two-argument Vec3.lerp (which made our first
// PlayCanvas comparison camera turn into NaN).
export class PlayCanvasOrbitFollowCamera{
  constructor({camera,target,yaw=0,pitch=.15,distance=5.4,
    targetHeight=1.37,cameraHeight=2.45,followResponse=8,
    minPitch=-.12,maxPitch=.65}={}){
    if(!camera||!target)throw new TypeError('Camera and target are required');
    this.camera=camera;
    this.target=target;
    this.yaw=yaw;
    this.pitch=clamp(pitch,minPitch,maxPitch);
    this.distance=distance;
    this.targetHeight=targetHeight;
    this.cameraHeight=cameraHeight;
    this.followResponse=followResponse;
    this.minPitch=minPitch;
    this.maxPitch=maxPitch;
    this.position=camera.getPosition().clone();
    this.desired=new pc.Vec3();
    this.lookTarget=new pc.Vec3();
  }

  orbit(deltaX,deltaY){
    if(!Number.isFinite(deltaX)||!Number.isFinite(deltaY))return;
    this.yaw-=deltaX*.006;
    this.pitch=clamp(this.pitch+deltaY*.004,this.minPitch,this.maxPitch);
  }

  update(deltaTime){
    if(!Number.isFinite(deltaTime)||deltaTime<0)
      throw new RangeError('Invalid camera update delta time');
    const dt=Math.min(deltaTime,.05);
    const pos=this.target.getPosition();
    const horizontal=Math.cos(this.pitch)*this.distance;
    this.desired.set(pos.x+Math.sin(this.yaw)*horizontal,
      pos.y+this.cameraHeight+Math.sin(this.pitch)*this.distance,
      pos.z+Math.cos(this.yaw)*horizontal);
    this.position.lerp(this.position,this.desired,1-Math.exp(-this.followResponse*dt));
    this.lookTarget.set(pos.x,pos.y+this.targetHeight,pos.z);
    this.camera.setPosition(this.position);
    this.camera.lookAt(this.lookTarget);
  }
}
