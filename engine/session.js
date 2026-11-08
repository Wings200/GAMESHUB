import {FirstPersonControls} from './controls.js';
import {GameWorld} from './world.js';
import {AnimationController} from './animation.js';

// The assistant-facing composition API for a new game. Instead of each game
// registering independent callbacks in an arbitrary order, the entire frame
// runs through a single GameSession in a known sequence.
export class GameSession {
  constructor(engine,{audio=null,materials=null,controls={}}={}){
    if(!engine?.canvas||!engine?.camera||!engine?.scene||typeof engine.onFrame!=='function'||
       typeof engine.setQuality!=='function')
      throw new TypeError('GameSession requires an initialized GameEngine');
    if(controls===null||typeof controls!=='object'||Array.isArray(controls))
      throw new TypeError('controls must be an options object');

    this.engine=engine;
    this.audio=audio;
    this.world=null;
    this.controls=null;
    this.animators=new Map();
    this.stopFrame=null;
    this.disposed=false;
    try{
      this.world=new GameWorld(engine,{audio,materials,autoUpdate:false});
      this.controls=new FirstPersonControls(engine.canvas,engine.camera,{
        verticalCollision:true,...controls,
        // Always use the world collider array. The live reference stays
        // valid after add/remove/setTransform and scene load.
        obstacles:this.world.colliders
      });
      this.world.setLightingProfile(engine.quality||'balanced');
      this.stopFrame=engine.onFrame((dt,elapsed)=>this.step(dt,elapsed));
    }catch(error){
      this.stopFrame?.();
      this.controls?.dispose();
      this.world?.dispose();
      throw error;
    }
  }

  step(dt,elapsed){
    if(this.disposed)throw new Error('Cannot step a disposed game session');
    if(!Number.isFinite(dt)||dt<0||!Number.isFinite(elapsed))
      throw new TypeError('GameSession requires finite elapsed time and nonnegative delta');
    // These systems use the *same* camera position within each frame.
    this.controls.update(dt);
    for(const {controller,followControls} of this.animators.values()){
      if(followControls)controller.syncFromControls(this.controls);
      controller.update(dt);
    }
    this.engine.camera.updateMatrixWorld(true);
    this.world.updateLighting(elapsed);
    this.world.updateAudio(elapsed);
  }

  addAnimator(id,root,clips,options={}){
    if(this.disposed)throw new Error('Cannot add animator to disposed game session');
    if(typeof id!=='string'||!id.trim())throw new TypeError('Animator ID must be nonempty');
    if(this.animators.has(id))throw new Error('Duplicate animator ID: '+id);
    const {followControls=false,...settings}=options;
    if(typeof followControls!=='boolean')throw new TypeError('followControls must be boolean');
    const controller=new AnimationController(root,{clips,...settings});
    this.animators.set(id,{controller,followControls});
    return controller;
  }

  removeAnimator(id){
    if(this.disposed)throw new Error('Cannot remove animator from disposed game session');
    const item=this.animators.get(id);
    if(!item)return false;
    item.controller.dispose();
    this.animators.delete(id);
    return true;
  }

  setQuality(profile){
    if(this.disposed)throw new Error('Cannot change a disposed game session');
    const config=this.engine.setQuality(profile);
    this.world.setLightingProfile(this.engine.quality);
    return config;
  }

  dispose(){
    if(this.disposed)return;
    this.disposed=true;
    this.stopFrame?.();
    this.stopFrame=null;
    this.controls?.dispose();
    for(const item of this.animators.values())item.controller.dispose();
    this.animators.clear();
    this.world?.dispose();
    // The caller created engine and audio, so they remain caller-owned.
  }
}
export function createGameSession(engine,options){
  return new GameSession(engine,options);
}
