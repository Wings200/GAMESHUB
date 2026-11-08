import {THREE} from './core.js';
import {chooseLocomotionClip} from './animation-state.mjs';

// One mixer per animated object. Clips must already target compatible names
// in the object's rig (typically glTF animations). This module does not make
// procedural skeletal animation or substitute for authored character assets.
export class AnimationController {
  constructor(root,{clips={},fadeSeconds=.2,walkThreshold=.12,runThreshold=5,
    hysteresis=.18,
    locomotionRates={}}={}){
    if(!root?.isObject3D)throw new TypeError('AnimationController requires a THREE.Object3D');
    if(!Number.isFinite(fadeSeconds)||fadeSeconds<0||fadeSeconds>5)
      throw new TypeError('fadeSeconds must be between 0 and 5');
    if(!Number.isFinite(hysteresis)||hysteresis<0||hysteresis>2)
      throw new TypeError('hysteresis must be between 0 and 2');
    if(!locomotionRates||typeof locomotionRates!=='object'||Array.isArray(locomotionRates)||
      Object.values(locomotionRates).some(rate=>!Number.isFinite(rate)||rate<=0||rate>5))
      throw new TypeError('locomotionRates must contain playback speeds from 0 to 5');
    this.root=root;
    this.mixer=new THREE.AnimationMixer(root);
    this.clips=new Map();
    this.actions=new Map();
    this.fadeSeconds=fadeSeconds;
    this.walkThreshold=walkThreshold;
    this.runThreshold=runThreshold;
    this.hysteresis=hysteresis;
    this.locomotionRates={...locomotionRates};
    this.desiredLoop=null;
    this.current=null;
    this.activeName=null;
    this.oneShot=null;
    this.fades=new Map();
    this.upperBodyActions=new Map();
    this.upperBodyActive=null;
    this.completeListeners=new Set();
    this.oneShotCallback=null;
    this.disposed=false;

    this._onFinished=event=>{
      if(this.upperBodyActive?.action===event.action){
        const finished=this.upperBodyActive;
        this.upperBodyActive=null;
        this._fadeTo(event.action,0,finished.fadeSeconds);
        finished.onFinish?.(finished.name);
        return;
      }
      if(event.action!==this.oneShot)return;
      const finished=this.activeName;
      this.oneShot=null;
      const callback=this.oneShotCallback;
      this.oneShotCallback=null;
      if(this.desiredLoop && this.actions.has(this.desiredLoop))
        this._activate(this.desiredLoop,{once:false,fade:this.fadeSeconds,speed:1});
      else{
        event.action.stop();
        this.current=null;
        this.activeName=null;
      }
      callback?.(finished);
      for(const listener of [...this.completeListeners])listener(finished);
    };
    this.mixer.addEventListener('finished',this._onFinished);
    if(Array.isArray(clips)){
      for(const clip of clips)this.register(clip.name,clip);
    }else if(clips && typeof clips==='object'){
      for(const [name,clip] of Object.entries(clips))this.register(name,clip);
    }else throw new TypeError('clips must be an array or name-to-clip mapping');
  }
  ensureActive(){if(this.disposed)throw new Error('AnimationController has been disposed');}
  register(name,clip){
    this.ensureActive();
    if(typeof name!=='string'||!name.trim())
      throw new TypeError('Animation clip name must be a nonempty string');
    if(!(clip instanceof THREE.AnimationClip))
      throw new TypeError('Animation '+name+' must be a THREE.AnimationClip');
    if(this.clips.has(name))throw new Error('Duplicate animation clip: '+name);
    this.clips.set(name,clip);
    this.actions.set(name,this.mixer.clipAction(clip,this.root));
    return this;
  }
  has(name){return this.clips.has(name);}
  get active(){return this.activeName;}
  get displayActive(){return this.upperBodyActive?.name||this.activeName;}
  hasUpperBody(name){return this.upperBodyActions.has(name);}
  registerUpperBody(name,clip,{weight=.75,fadeSeconds=.14}={}){
    this.ensureActive();
    if(typeof name!=='string'||!name.trim()||this.upperBodyActions.has(name))
      throw new TypeError('Upper-body animation needs a unique nonempty name');
    if(!(clip instanceof THREE.AnimationClip)||clip.tracks.length===0)
      throw new TypeError('Upper-body animation needs a nonempty AnimationClip');
    if(!Number.isFinite(weight)||weight<=0||weight>1||
      !Number.isFinite(fadeSeconds)||fadeSeconds<0||fadeSeconds>5)
      throw new TypeError('Invalid upper-body weight or fade duration');
    this.upperBodyActions.set(name,{
      action:this.mixer.clipAction(clip,this.root),weight,fadeSeconds
    });
    return this;
  }
  playUpperBodyOnce(name,{onFinish=null}={}){
    this.ensureActive();
    const layer=this.upperBodyActions.get(name);
    if(!layer)throw new Error('Unknown upper-body animation: '+name);
    if(onFinish!==null&&typeof onFinish!=='function')
      throw new TypeError('onFinish must be a function');
    if(this.upperBodyActive)throw new Error('Upper-body action is already playing');
    const action=layer.action;
    action.reset();
    action.enabled=true;
    action.clampWhenFinished=true;
    action.setLoop(THREE.LoopOnce,1);
    action.setEffectiveTimeScale(1);
    action.setEffectiveWeight(0);
    action.play();
    this._fadeTo(action,layer.weight,layer.fadeSeconds);
    this.upperBodyActive={...layer,name,onFinish};
    return action;
  }
  // Track current effective weights ourselves rather than re-scheduling
  // Three.js fadeIn/fadeOut from 0/1 on every rapid state change. A new
  // transition can begin halfway through an old transition without a pop.
  _fadeTo(action,target,duration){
    this.fades.delete(action);
    const from=action.getEffectiveWeight();
    if(duration===0||Math.abs(from-target)<1e-5){
      action.setEffectiveWeight(target);
      if(target===0)action.stop();
    }else this.fades.set(action,{from,target,duration,elapsed:0});
  }
  _activate(name,{once=false,fade=this.fadeSeconds,speed=1}={}){
    const action=this.actions.get(name);
    if(!action)throw new Error('Unknown animation clip: '+name);
    if(!Number.isFinite(fade)||fade<0||fade>5)
      throw new TypeError('Animation fade must be 0–5 seconds');
    if(!Number.isFinite(speed)||speed<=0||speed>5)
      throw new TypeError('Animation playback speed must be between 0 and 5');
    const previous=this.current;
    if(!once && previous===action && !this.oneShot){
      action.setEffectiveTimeScale(speed);
      return action;
    }
    const wasScheduled=action.isScheduled()&&previous!==action;
    const savedWeight=wasScheduled?action.getEffectiveWeight():0;
    if(!wasScheduled)action.reset();
    action.enabled=true;
    action.clampWhenFinished=once;
    action.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,once?1:Infinity);
    action.setEffectiveWeight(savedWeight);
    action.setEffectiveTimeScale(speed);
    action.play();
    // Fade *every* scheduled previous base action, not just the most recent.
    // Interrupted crossfades can otherwise leave residual weighted poses.
    for(const other of this.actions.values()){
      if(other===action||!other.isScheduled())continue;
      this._fadeTo(other,0,fade);
    }
    this._fadeTo(action,1,previous?fade:0);
    this.current=action;
    this.activeName=name;
    return action;
  }
  playLoop(name,options={}){
    this.ensureActive();
    if(!this.actions.has(name))throw new Error('Unknown animation clip: '+name);
    // A one-shot owns the pose until its finish event; locomotion requests
    // during that action update the state we return to, not interrupt it.
    this.desiredLoop=name;
    if(this.oneShot)return this.actions.get(name);
    return this._activate(name,{...options,once:false});
  }
  playOnce(name,{onFinish=null,...options}={}){
    this.ensureActive();
    if(onFinish!==null && typeof onFinish!=='function')
      throw new TypeError('onFinish must be a function');
    if(!this.actions.has(name))throw new Error('Unknown animation clip: '+name);
    this.oneShot=null;
    this.oneShotCallback=onFinish;
    const action=this._activate(name,{...options,once:true});
    this.oneShot=action;
    return action;
  }
  setLocomotion({speed=0,grounded=true,verticalSpeed=0}={}){
    this.ensureActive();
    let name=chooseLocomotionClip({speed,grounded,verticalSpeed},
      this.actions.keys(),{walkThreshold:this.walkThreshold,runThreshold:this.runThreshold});
    // Keep a small deadband around the run threshold so analog movement
    // speeds do not make walk/run flicker every other frame.
    const was=this.desiredLoop;
    if(grounded&&this.actions.has('walk')&&this.actions.has('run')){
      if(was==='run'&&name==='walk'&&speed>this.runThreshold-this.hysteresis)
        name='run';
      if(was==='walk'&&name==='run'&&speed<this.runThreshold+this.hysteresis)
        name='walk';
    }
    if(name)this.playLoop(name,{speed:this.locomotionRates[name]??1});
    return name;
  }
  syncFromControls(controls){
    this.ensureActive();
    if(!controls?.velocity)throw new TypeError('Controls must expose velocity');
    const velocity=controls.velocity;
    return this.setLocomotion({
      speed:Math.hypot(velocity.x,velocity.z),
      grounded:controls.grounded!==false,
      verticalSpeed:controls.verticalSpeed??0
    });
  }
  onComplete(listener){
    this.ensureActive();
    if(typeof listener!=='function')throw new TypeError('Completion listener must be a function');
    this.completeListeners.add(listener);
    return ()=>this.completeListeners.delete(listener);
  }
  update(dt){
    this.ensureActive();
    if(!Number.isFinite(dt)||dt<0)throw new TypeError('Animation delta must be nonnegative and finite');
    for(const [action,fade] of [...this.fades]){
      fade.elapsed=Math.min(fade.duration,fade.elapsed+dt);
      const t=fade.elapsed/fade.duration;
      action.setEffectiveWeight(fade.from+(fade.target-fade.from)*t);
      if(t>=1){
        this.fades.delete(action);
        if(fade.target===0)action.stop();
      }
    }
    this.mixer.update(dt);
  }
  stop(){
    this.ensureActive();
    this.fades.clear();
    this.mixer.stopAllAction();
    this.current=null;
    this.activeName=null;
    this.desiredLoop=null;
    this.oneShot=null;
    this.oneShotCallback=null;
    this.upperBodyActive=null;
  }
  dispose(){
    if(this.disposed)return;
    this.mixer.removeEventListener('finished',this._onFinished);
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.root);
    this.fades.clear();
    this.actions.clear();
    this.clips.clear();
    this.upperBodyActions.clear();
    this.completeListeners.clear();
    this.oneShot=null;
    this.oneShotCallback=null;
    this.upperBodyActive=null;
    this.current=null;
    this.activeName=null;
    this.desiredLoop=null;
    this.disposed=true;
    // The caller still owns the model, geometries, materials and clip data.
  }
}
