// W09.0 real glTF character models. The same shared rig works for the
// visible pilot and the three NPCs; hitbox and combat state stay separate.
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
export async function mountRiggedCharacter(parent,id,targetHeight=1.85){
  const gltf=await fetchCharacter(id);
  const skeleton=cloneSkinned(gltf.scene);
  const bounds=new THREE.Box3().setFromObject(skeleton);
  const size=bounds.getSize(new THREE.Vector3());
  if(!Number.isFinite(size.y)||size.y<=0)
    throw new Error('Character GLB missing usable dimensions: '+id);
  const scale=targetHeight/size.y;
  skeleton.scale.setScalar(scale);
  const fitted=new THREE.Box3().setFromObject(skeleton);
  const center=fitted.getCenter(new THREE.Vector3());
  skeleton.position.set(-center.x,-fitted.min.y,-center.z);
  const root=new THREE.Group();
  root.name='RiggedCharacter-'+id;
  root.add(skeleton);
  parent.add(root);
  root.traverse(object=>{
    if(object.isMesh||object.isSkinnedMesh){
      object.castShadow=true;object.receiveShadow=true;
      object.frustumCulled=false; // animated limbs must not disappear mid-step
    }
  });
  const mixer=new THREE.AnimationMixer(skeleton);
  const walk=gltf.animations.find(a=>/walk/i.test(a.name));
  const action=walk?mixer.clipAction(walk):null;
  action?.play();
  return {
    root,mixer,source:id,animations:gltf.animations.map(a=>a.name),
    baseScale:scale,
    update(dt,moving=false,crouch=0){
      if(action){
        action.paused=!moving;
        if(moving)mixer.update(dt);
      }
      // Temporary crouch deformation until bespoke crouch/cover clips land.
      // Feet remain planted; the controller still owns the real hitboxes.
      root.scale.y=1-.35*Math.max(0,Math.min(1,crouch));
    },
    dispose(){
      mixer.stopAllAction();
      parent.remove(root);
    }
  };
}
