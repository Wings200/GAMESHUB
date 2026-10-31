// W09.1: animation-safe character fitting. Never put the height correction
// on an imported GLTF node: some clips animate that node's transforms.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {clone as cloneSkinned} from 'three/addons/utils/SkeletonUtils.js';

export const CHARACTER_ASSETS=Object.freeze({
  scout:Object.freeze({id:'scout',path:'/api/rpg-models/scout',name:'Field Soldier'}),
  raider:Object.freeze({id:'raider',path:'/api/rpg-models/raider',name:'Salvage Cyborg'}),
  enforcer:Object.freeze({id:'enforcer',path:'/api/rpg-models/enforcer',name:'Armored Soldier'})
});
const loader=new GLTFLoader();
const draco=new DRACOLoader();
draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/libs/draco/');
loader.setDRACOLoader(draco);
const library=new Map();
const MIN_HEIGHT=0.001;
const CHECK_INTERVAL=.28;
function fetchCharacter(id){
  const spec=CHARACTER_ASSETS[id];
  if(!spec)return Promise.reject(new Error('Unknown character asset: '+id));
  if(!library.has(id)){
    library.set(id,new Promise((resolve,reject)=>{
      loader.load(spec.path,resolve,undefined,reject);
    }).catch(error=>{
      library.delete(id);throw error;
    }));
  }
  return library.get(id);
}
// Animated imports may include authored root scaling and locomotion tracks.
// Keep skeletal rotation, but discard scale keyframes and large translational
// root motion; these are incompatible with our world-space NPC controller.
// Local knee/hip bob remains where its range is reasonable.
function stationaryClip(clip,sourceHeight){
  if(!clip)return null;
  const filtered=clip.tracks.filter(track=>{
    const property=track.name.slice(track.name.lastIndexOf('.')+1);
    if(property==='scale')return false;
    if(property!=='position'||track.getValueSize()!==3)return true;
    const values=track.values;
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,minZ=Infinity,maxZ=-Infinity;
    for(let i=0;i<values.length;i+=3){
      minX=Math.min(minX,values[i]);maxX=Math.max(maxX,values[i]);
      minY=Math.min(minY,values[i+1]);maxY=Math.max(maxY,values[i+1]);
      minZ=Math.min(minZ,values[i+2]);maxZ=Math.max(maxZ,values[i+2]);
    }
    return Math.max(maxX-minX,maxY-minY,maxZ-minZ)<=sourceHeight*.35;
  });
  return new THREE.AnimationClip(clip.name,clip.duration,filtered);
}
function validBounds(bounds){
  const height=bounds.max.y-bounds.min.y;
  return Number.isFinite(height)&&height>MIN_HEIGHT&&
    [bounds.min.x,bounds.max.x,bounds.min.z,bounds.max.z].every(Number.isFinite);
}
export async function mountRiggedCharacter(parent,id,targetHeight=1.85){
  if(!Number.isFinite(targetHeight)||targetHeight<.3||targetHeight>4)
    throw new Error('Invalid requested character height: '+targetHeight);
  const gltf=await fetchCharacter(id);
  const skeleton=cloneSkinned(gltf.scene);
  // Measure an actual evaluated pose; bind-pose bounds can be radically
  // different to the animation when imported scales and bones are involved.
  const initialBox=new THREE.Box3().setFromObject(skeleton,true);
  if(!validBounds(initialBox))
    throw new Error('Character GLB missing usable dimensions: '+id);
  const rawHeight=initialBox.max.y-initialBox.min.y;
  const mixer=new THREE.AnimationMixer(skeleton);
  const walkClip=stationaryClip(gltf.animations.find(a=>/walk/i.test(a.name)),rawHeight);
  const action=walkClip&&walkClip.tracks.length?mixer.clipAction(walkClip):null;
  action?.play();
  if(action)mixer.update(0);
  skeleton.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(skeleton,true);
  if(!validBounds(box))
    throw new Error('Invalid animated character bounds: '+id);
  const size=box.getSize(new THREE.Vector3());
  const center=box.getCenter(new THREE.Vector3());
  const scale=targetHeight/size.y;
  // This layout matters: imported animation owns ONLY the skeleton, while
  // the external root retains its scaling and the offset lifts feet to y=0.
  const root=new THREE.Group();
  root.name='RiggedCharacter-'+id;
  const offset=new THREE.Group();
  offset.name='ModelFootOffset';
  offset.position.set(-center.x,-box.min.y,-center.z);
  root.add(offset);
  offset.add(skeleton);
  root.scale.setScalar(scale);
  parent.add(root);
  root.traverse(object=>{
    if(object.isMesh||object.isSkinnedMesh){
      object.castShadow=true;object.receiveShadow=true;
      object.frustumCulled=false;
    }
  });
  let elapsed=0;
  const liveBounds=new THREE.Box3();
  const anchor=new THREE.Vector3();
  const liveCenter=new THREE.Vector3();
  let lastHeight=targetHeight, repairs=0;
  function inspectAndRepair(){
    parent.updateWorldMatrix(true,false);
    liveBounds.setFromObject(root,true);
    if(!validBounds(liveBounds)){
      action?.stop();
      return false;
    }
    let height=liveBounds.max.y-liveBounds.min.y;
    // As a final defence against unusually authored animation tracks,
    // clamp height on the unanimated parent, never an animated GLB node.
    if(height>targetHeight*1.2||height<targetHeight*.65){
      const ratio=targetHeight/height;
      root.scale.multiplyScalar(ratio);
      repairs++;
      root.updateWorldMatrix(true,true);
      liveBounds.setFromObject(root,true);
      height=liveBounds.max.y-liveBounds.min.y;
    }
    parent.getWorldPosition(anchor);
    liveBounds.getCenter(liveCenter);
    const horizontalOffset=parent.worldToLocal(liveCenter.clone());
    if(Math.hypot(horizontalOffset.x,horizontalOffset.z)>targetHeight*.55){
      root.position.x-=horizontalOffset.x;
      root.position.z-=horizontalOffset.z;
      repairs++;
    }
    const bottom=liveBounds.min.y-anchor.y;
    if(Math.abs(bottom)>.22){
      root.position.y-=bottom;
      repairs++;
    }
    lastHeight=height;
    return true;
  }
  inspectAndRepair();
  return {
    root,mixer,source:id,animations:gltf.animations.map(a=>a.name),
    baseScale:scale,
    get metrics(){return {height:lastHeight,repairs,scale:root.scale.x,clip:action?.getClip().name||'none'};},
    update(dt,moving=false,crouch=0){
      if(action){
        action.paused=!moving;
        if(moving)mixer.update(dt);
      }
      // Crouch changes the visual only. The NPC controller owns the hitboxes.
      root.scale.y=root.scale.x*(1-.35*Math.max(0,Math.min(1,crouch)));
      elapsed+=dt;
      if(elapsed>=CHECK_INTERVAL){elapsed=0;inspectAndRepair();}
    },
    dispose(){mixer.stopAllAction();parent.remove(root);}
  };
}
