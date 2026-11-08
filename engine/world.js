import {THREE} from './core.js';
import {normalizeWorldEntity,normalizeWorldDocument,WORLD_FORMAT} from './world-schema.mjs';
import {MaterialPool} from './material-pool.js';
import {estimateOcclusion} from './audio-spatial.js';

// Code-first, reusable scene assembly layer. It does not replace GameEngine's
// renderer, collision solver, or EngineAudio; it composes those existing tools.
export class GameWorld {
  constructor(engine,{audio=null,materials=null}={}){
    if(!engine?.scene?.add||!engine?.scene?.remove)
      throw new TypeError('GameWorld requires an engine with a THREE scene');
    this.engine=engine;
    this.audio=audio;
    this.materials=materials||new MaterialPool();
    this.ownsMaterials=!materials;
    this.root=new THREE.Group();
    this.root.name='GAMESHUB_Game_World';
    engine.scene.add(this.root);
    this.items=new Map();
    this.colliders=[]; // Stable array reference for FirstPersonControls.
    this.unsubscribers=new Set();
    this.activeSounds=new Map();
    this.nextOcclusionSample=0;
    this.disposed=false;
    if(audio?.setListenerPose&&engine.camera&&typeof engine.onFrame==='function'){
      const forward=new THREE.Vector3(),position=new THREE.Vector3();
      const unregister=engine.onFrame((_dt,elapsed)=>{
        engine.camera.getWorldPosition(position);
        engine.camera.getWorldDirection(forward);
        const pose={position:{x:position.x,y:position.y,z:position.z},
          forward:{x:forward.x,y:forward.y,z:forward.z},
          up:{x:0,y:1,z:0}};
        audio.setListenerPose(pose);
        if(elapsed>=this.nextOcclusionSample){
          this.nextOcclusionSample=elapsed+.18;
          for(const [id,handles] of this.activeSounds){
            const item=this.items.get(id);
            if(!item?.spec.spatial || !item.spec.occlusion)continue;
            const occlusion=estimateOcclusion(pose.position,item.spec.position,this.colliders);
            for(const handle of handles)handle.setOcclusion?.(occlusion);
          }
        }
      });
      this.unsubscribers.add(unregister);
    }
  }
  ensureActive(){if(this.disposed)throw new Error('World has been disposed');}

  create(definition){
    this.ensureActive();
    const spec=normalizeWorldEntity(definition);
    if(this.items.has(spec.id))throw new Error('Duplicate entity id: '+spec.id);
    let node,lease=null,collider=null,extra=null;
    try{
      if(spec.type==='mesh'){
        lease=this.materials.acquire(spec.material.id,spec.material.settings);
        if(spec.geometry==='box')
          node=new THREE.Mesh(new THREE.BoxGeometry(spec.size.x,spec.size.y,spec.size.z),lease.material);
        else if(spec.geometry==='sphere')
          node=new THREE.Mesh(new THREE.SphereGeometry(spec.size.radius,24,16),lease.material);
        else node=new THREE.Mesh(new THREE.CylinderGeometry(spec.size.radius,spec.size.radius,
          spec.size.height,24),lease.material);
        node.castShadow=spec.castShadow;
        node.receiveShadow=spec.receiveShadow;
        if(spec.collidable)collider=this.footprint(spec);
      }else if(spec.type==='light'){
        if(spec.kind==='point'){
          node=new THREE.PointLight(spec.color,spec.intensity,spec.distance);
        }else{
          node=new THREE.SpotLight(spec.color,spec.intensity,spec.distance,
            spec.angle,spec.penumbra);
          extra=node.target;
          extra.position.set(spec.target.x,spec.target.y,spec.target.z);
        }
        node.castShadow=spec.castShadow;
      }else{
        // Sound markers are reusable triggers, not audio sources. A game
        // explicitly loads its clips via EngineAudio and calls playSound().
        node=new THREE.Group();
      }
      node.name=spec.id;
      node.userData.worldId=spec.id;
      node.position.set(spec.position.x,spec.position.y,spec.position.z);
      if(spec.type==='mesh')
        node.rotation.set(spec.rotation.x,spec.rotation.y,spec.rotation.z);
      this.root.add(node);
      if(extra)this.root.add(extra);
      if(collider)this.colliders.push(collider);
      this.items.set(spec.id,{spec,node,lease,collider,extra});
      return node;
    }catch(error){
      node?.removeFromParent();
      extra?.removeFromParent();
      if(node?.isMesh)node.geometry.dispose();
      lease?.release();
      throw error;
    }
  }
  addMesh(options){return this.create({...options,type:'mesh'});}
  addLight(options){return this.create({...options,type:'light'});}
  addSound(options){return this.create({...options,type:'sound'});}
  get(id){return this.items.get(id)?.node||null;}
  description(id){
    const spec=this.items.get(id)?.spec;
    return spec?structuredClone(spec):null;
  }
  footprint(spec){
    const halfX=spec.geometry==='box'?spec.size.x/2:spec.size.radius;
    const halfZ=spec.geometry==='box'?spec.size.z/2:spec.size.radius;
    const halfY=spec.geometry==='box'?spec.size.y/2:
      spec.geometry==='sphere'?spec.size.radius:spec.size.height/2;
    return {minX:spec.position.x-halfX,maxX:spec.position.x+halfX,
      minY:spec.position.y-halfY,maxY:spec.position.y+halfY,
      minZ:spec.position.z-halfZ,maxZ:spec.position.z+halfZ};
  }
  setTransform(id,{position,rotation}={}){
    this.ensureActive();
    const item=this.items.get(id);
    if(!item)throw new Error('Unknown entity: '+id);
    const spec=normalizeWorldEntity({...item.spec,
      position:position??item.spec.position,
      ...(rotation!==undefined?{rotation}:{})});
    item.spec=spec;
    item.node.position.set(spec.position.x,spec.position.y,spec.position.z);
    if(spec.type==='mesh'){
      item.node.rotation.set(spec.rotation.x,spec.rotation.y,spec.rotation.z);
      if(item.collider)Object.assign(item.collider,this.footprint(spec));
    }
    if(spec.type==='light'&&item.extra&&spec.target)
      item.extra.position.set(spec.target.x,spec.target.y,spec.target.z);
    if(spec.type==='sound'){
      for(const handle of this.activeSounds.get(id)||[])
        handle.setPosition?.(spec.position);
    }
    return item.node;
  }
  setMaterial(id,material){
    this.ensureActive();
    const item=this.items.get(id);
    if(!item||item.spec.type!=='mesh')throw new Error('Material requires a mesh: '+id);
    // Normalize and allocate before releasing the old material.
    const spec=normalizeWorldEntity({...item.spec,material});
    const next=this.materials.acquire(spec.material.id,spec.material.settings);
    const previous=item.lease;
    item.node.material=next.material;
    item.spec=spec;
    item.lease=next;
    previous.release();
    return item.node.material;
  }
  setLight(id,options={}){
    this.ensureActive();
    const item=this.items.get(id);
    if(!item||item.spec.type!=='light')throw new Error('Not a light: '+id);
    const spec=normalizeWorldEntity({...item.spec,...options,type:'light'});
    if(spec.kind!==item.spec.kind)throw new TypeError('Changing light kind requires replacement');
    item.node.color.set(spec.color);
    item.node.intensity=spec.intensity;
    item.node.distance=spec.distance;
    item.node.castShadow=spec.castShadow;
    item.node.position.set(spec.position.x,spec.position.y,spec.position.z);
    if(item.extra){
      item.node.angle=spec.angle;
      item.node.penumbra=spec.penumbra;
      item.extra.position.set(spec.target.x,spec.target.y,spec.target.z);
    }
    item.spec=spec;
    return item.node;
  }
  setSound(id,options={}){
    this.ensureActive();
    const item=this.items.get(id);
    if(!item||item.spec.type!=='sound')throw new Error('Not a sound marker: '+id);
    const spec=normalizeWorldEntity({...item.spec,...options,type:'sound'});
    item.spec=spec;
    item.node.position.set(spec.position.x,spec.position.y,spec.position.z);
    for(const handle of this.activeSounds.get(id)||[])
      handle.setPosition?.(spec.position);
    return item.node;
  }
  playSound(id,options={}){
    this.ensureActive();
    const item=this.items.get(id);
    if(!item||item.spec.type!=='sound')throw new Error('Not a sound marker: '+id);
    const spec=item.spec;
    if(!spec.spatial){
      if(!this.audio?.playClip)throw new Error('World has no EngineAudio playback service');
      return this.audio.playClip(spec.clip,{volume:spec.volume,...options});
    }
    if(!this.audio?.playSpatialClip)throw new Error('Spatial sound requires EngineAudio.playSpatialClip');
    const listener=this.engine.camera?.position;
    const occlusion=spec.occlusion&&listener?
      estimateOcclusion({x:listener.x,y:listener.y,z:listener.z},spec.position,this.colliders):0;
    const handle=this.audio.playSpatialClip(spec.clip,{
      position:spec.position,volume:spec.volume,loop:spec.loop,
      refDistance:spec.refDistance,maxDistance:spec.maxDistance,
      rolloffFactor:spec.rolloffFactor,bus:spec.bus,occlusion,...options
    });
    if(handle?.stop){
      if(!this.activeSounds.has(id))this.activeSounds.set(id,new Set());
      this.activeSounds.get(id).add(handle);
      handle.source?.addEventListener?.('ended',()=>{
        this.activeSounds.get(id)?.delete(handle);
        if(this.activeSounds.get(id)?.size===0)this.activeSounds.delete(id);
      },{once:true});
    }
    return handle;
  }
  onUpdate(callback){
    this.ensureActive();
    if(typeof callback!=='function')throw new TypeError('onUpdate requires a function');
    if(typeof this.engine.onFrame!=='function')throw new Error('Engine does not support frame callbacks');
    const unbind=this.engine.onFrame((dt,elapsed)=>callback(dt,elapsed,this));
    let active=true;
    const stop=()=>{
      if(!active)return;
      active=false;
      this.unsubscribers.delete(stop);
      unbind();
    };
    this.unsubscribers.add(stop);
    return stop;
  }
  remove(id){
    this.ensureActive();
    const item=this.items.get(id);
    if(!item)return false;
    for(const handle of this.activeSounds.get(id)||[])handle.stop?.();
    this.activeSounds.delete(id);
    item.node.removeFromParent();
    item.extra?.removeFromParent();
    if(item.collider){
      const index=this.colliders.indexOf(item.collider);
      if(index!==-1)this.colliders.splice(index,1);
    }
    if(item.node.isMesh)item.node.geometry.dispose();
    item.node.dispose?.();
    item.lease?.release();
    this.items.delete(id);
    return true;
  }
  clear(){
    this.ensureActive();
    for(const id of [...this.items.keys()])this.remove(id);
  }
  toDocument(){
    this.ensureActive();
    return {format:WORLD_FORMAT,entities:[...this.items.values()].map(item=>structuredClone(item.spec))};
  }
  toJSON(){return JSON.stringify(this.toDocument(),null,2);}
  loadDocument(document,{replace=true}={}){
    this.ensureActive();
    const normalized=normalizeWorldDocument(document);
    if(!replace){
      for(const entity of normalized.entities)
        if(this.items.has(entity.id))throw new Error('Duplicate entity id: '+entity.id);
    }
    // Validate *before* discarding the current scene so malformed input
    // cannot destroy user-authored work.
    if(replace)this.clear();
    const added=[];
    try{
      for(const entity of normalized.entities){
        this.create(entity);
        added.push(entity.id);
      }
    }catch(error){
      for(const id of added)this.remove(id);
      throw error;
    }
    return added.length;
  }
  loadJSON(json,options={}){
    if(typeof json!=='string')throw new TypeError('loadJSON expects JSON text');
    return this.loadDocument(JSON.parse(json),options);
  }
  dispose(){
    if(this.disposed)return;
    for(const stop of [...this.unsubscribers])stop();
    this.clear();
    this.root.removeFromParent();
    if(this.ownsMaterials)this.materials.dispose();
    this.disposed=true;
  }
}
export function createGameWorld(engine,options){return new GameWorld(engine,options);}
