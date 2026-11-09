import * as pc from 'playcanvas';

// Code-first foundation used by GAMESHUB's PlayCanvas experiments and future
// games. It deliberately does not alter the existing Three.js-based engine.
const AMMO_URLS=Object.freeze({
  glueUrl:'https://developer.playcanvas.com/assets/modules/ammo/ammo.wasm.js',
  wasmUrl:'https://developer.playcanvas.com/assets/modules/ammo/ammo.wasm.wasm',
  fallbackUrl:'https://developer.playcanvas.com/assets/modules/ammo/ammo.js'
});
let ammoInitialization;

async function prepareAmmo(timeoutMs){
  if(!ammoInitialization){
    pc.WasmModule.setConfig('Ammo',AMMO_URLS);
    ammoInitialization=new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(new Error('Ammo physics timed out')),timeoutMs);
      try{
        pc.WasmModule.getInstance('Ammo',module=>{
          clearTimeout(timeout);
          if(module)resolve(module);
          else reject(new Error('Ammo physics did not initialize'));
        });
      }catch(error){clearTimeout(timeout);reject(error);}
    }).catch(error=>{
      // A transient network error must not permanently poison later attempts.
      ammoInitialization=undefined;
      throw error;
    });
  }
  await ammoInitialization;
}

function requireTriple(values,label){
  if(!Array.isArray(values)||values.length!==3||
    values.some(value=>!Number.isFinite(value)))
    throw new TypeError(`${label} must contain three finite numbers`);
  return values;
}

function color(value){
  return value instanceof pc.Color?value.clone():new pc.Color().fromString(value);
}

export class PlayCanvasFoundation{
  constructor(canvas,app,physicsReady){
    this.canvas=canvas;
    this.app=app;
    this.physicsReady=physicsReady;
    this.destroyed=false;
    this._assetPromises=new Map();
    this._resize=()=>{if(!this.destroyed)this.app.resizeCanvas();};
    window.addEventListener('resize',this._resize);
  }

  static async create(canvas,{physics=true,physicsTimeoutMs=22000}={}){
    if(!(canvas instanceof HTMLCanvasElement))
      throw new TypeError('PlayCanvasFoundation.create requires a canvas');
    if(physics)await prepareAmmo(physicsTimeoutMs);
    const device=await pc.createGraphicsDevice(canvas,{deviceTypes:[pc.DEVICETYPE_WEBGL2]});
    const options=new pc.AppOptions();
    options.graphicsDevice=device;
    options.componentSystems=[pc.RenderComponentSystem,pc.CameraComponentSystem,
      pc.LightComponentSystem,pc.AnimComponentSystem];
    if(physics)options.componentSystems.push(pc.CollisionComponentSystem,
      pc.RigidBodyComponentSystem);
    options.resourceHandlers=[pc.TextureHandler,pc.ContainerHandler];
    const app=new pc.AppBase(canvas);
    try{
      app.init(options);
      app.setCanvasResolution(pc.RESOLUTION_AUTO);
      app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
      app.start();
      return new PlayCanvasFoundation(canvas,app,physics);
    }catch(error){app.destroy();throw error;}
  }

  _assertActive(){
    if(this.destroyed)throw new Error('PlayCanvas world has been destroyed');
  }

  material(hex,{metalness=0,gloss=.45,emissive=0}={}){
    this._assertActive();
    const material=new pc.StandardMaterial();
    material.diffuse=color(hex);
    material.metalness=metalness;
    material.useMetalness=metalness>0;
    material.gloss=gloss;
    if(emissive){
      material.emissive=color(hex);
      material.emissiveIntensity=emissive;
    }
    material.update();
    return material;
  }

  box(name,position,size,material,{collidable=false,mass=0,parent=this.app.root}={}){
    this._assertActive();
    requireTriple(position,'position');
    requireTriple(size,'size');
    if(size.some(value=>value<=0))throw new RangeError('box size must be positive');
    if(collidable&&!this.physicsReady)
      throw new Error('This world was created without physics');
    if(mass<0||!Number.isFinite(mass))throw new RangeError('Invalid rigid-body mass');
    const entity=new pc.Entity(name);
    entity.addComponent('render',{type:'box',material,castShadows:true,receiveShadows:true});
    entity.setLocalScale(...size);
    entity.setPosition(...position);
    if(collidable){
      // Collision half extents use world units, not scaled render dimensions.
      entity.addComponent('collision',{type:'box',
        halfExtents:new pc.Vec3(size[0]/2,size[1]/2,size[2]/2)});
      entity.addComponent('rigidbody',{type:mass>0?'dynamic':'static',mass,
        friction:.65,restitution:.08});
    }
    parent.addChild(entity);
    return entity;
  }

  light(name,type,position,hex,intensity,{shadow=false,range=28,parent=this.app.root}={}){
    this._assertActive();
    requireTriple(position,'position');
    const entity=new pc.Entity(name);
    entity.addComponent('light',{type,color:color(hex),intensity,range,
      castShadows:shadow,shadowResolution:1024,shadowBias:.14,normalOffsetBias:.03});
    entity.setPosition(...position);
    parent.addChild(entity);
    return entity;
  }

  camera(name,{position=[0,3,6],clearColor=new pc.Color(.043,.083,.12),
    fov=68,nearClip=.08,farClip=120,parent=this.app.root}={}){
    this._assertActive();
    requireTriple(position,'position');
    const entity=new pc.Entity(name);
    entity.addComponent('camera',{clearColor:color(clearColor),fov,nearClip,farClip});
    entity.setPosition(...position);
    parent.addChild(entity);
    return entity;
  }

  async loadContainer(url,{name='GLB Container'}={}){
    this._assertActive();
    if(!url||typeof url!=='string')throw new TypeError('Model URL is required');
    if(!this._assetPromises.has(url)){
      const asset=new pc.Asset(name,'container',{url});
      this.app.assets.add(asset);
      const task=new Promise((resolve,reject)=>{
        asset.ready(()=>resolve(asset));
        asset.once('error',error=>reject(error));
        this.app.assets.load(asset);
      }).catch(error=>{
        this._assetPromises.delete(url);
        this.app.assets.remove(asset);
        throw error;
      });
      this._assetPromises.set(url,task);
    }
    return this._assetPromises.get(url);
  }

  async animatedModel(url,{name='Animated Model',parent=this.app.root,
    scale=1,yaw=0,requiredClips=[],nonLoopingClips=['Jump'],initialClip='Idle'}={}){
    const asset=await this.loadContainer(url,{name});
    this._assertActive();
    const tracks=asset.resource.animations;
    const clipNames=tracks.map(clip=>clip.resource.name);
    const missing=requiredClips.filter(clip=>!clipNames.includes(clip));
    if(missing.length)throw new Error(`Animated model is missing clips: ${missing.join(', ')}`);
    if(!Number.isFinite(scale)||scale<=0)throw new RangeError('Model scale must be positive');
    const anchor=new pc.Entity(`${name} Facing and Scale`);
    anchor.setLocalEulerAngles(0,yaw,0);
    anchor.setLocalScale(scale,scale,scale);
    parent.addChild(anchor);
    try{
      const model=asset.resource.instantiateRenderEntity({castShadows:true});
      model.name=name;
      anchor.addChild(model);
      model.addComponent('anim',{activate:true});
      for(const clip of tracks){
        const clipName=clip.resource.name;
        model.anim.assignAnimation(clipName,clip.resource,undefined,1,
          !nonLoopingClips.includes(clipName));
      }
      if(initialClip&&clipNames.includes(initialClip))
        model.anim.baseLayer.transition(initialClip,0);
      return {model,anchor,clipNames,asset};
    }catch(error){anchor.destroy();throw error;}
  }

  onUpdate(callback){
    this._assertActive();
    this.app.on('update',callback);
    return ()=>this.app.off('update',callback);
  }

  destroy(){
    if(this.destroyed)return;
    this.destroyed=true;
    window.removeEventListener('resize',this._resize);
    this._assetPromises.clear();
    this.app.destroy();
  }
}

export {pc};
