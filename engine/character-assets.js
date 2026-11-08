import {THREE} from './core.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';

// A character asset is a rig + its authored animation clips. The game engine
// does not guess how to bend an unfamiliar skeleton or fabricate missing moves.
export const DEFAULT_CHARACTER_CLIPS=Object.freeze({
  idle:['Idle','Standing'],
  walk:['Walking','Walk'],
  run:['Running','Run'],
  jump:['Jump'],
  fall:['Fall','Falling'],
  land:['Land','Landing'],
  interact:['Interact','Interaction','Wave'],
  reload:['Reload','Reloading']
});

function aliases(value){
  if(value===null)return [];
  const entries=typeof value==='string'?[value]:value;
  if(!Array.isArray(entries)||entries.some(name=>
    typeof name!=='string'||!name.trim()))
    throw new TypeError('Character animation aliases must be names or name arrays');
  return entries;
}

export function resolveCharacterClips(animations,{clipMap={},required=['idle','walk','run']}={}){
  if(!Array.isArray(animations)||animations.some(clip=>!(clip instanceof THREE.AnimationClip)))
    throw new TypeError('Character animations must be THREE.AnimationClip objects');
  if(!clipMap||typeof clipMap!=='object'||Array.isArray(clipMap))
    throw new TypeError('Character clipMap must be an object');
  const source=new Map();
  for(const clip of animations){
    const name=clip.name.trim().toLowerCase();
    if(name&&!source.has(name))source.set(name,clip);
  }
  const clips={},missing=[];
  for(const [state,candidates] of Object.entries({...DEFAULT_CHARACTER_CLIPS,...clipMap})){
    const match=aliases(candidates).map(name=>source.get(name.trim().toLowerCase()))
      .find(Boolean);
    if(!match){missing.push(state);continue;}
    clips[state]=match.clone();
    clips[state].name=state;
  }
  if(!Array.isArray(required)||required.some(name=>typeof name!=='string'))
    throw new TypeError('required must be a list of animation state names');
  const absent=required.filter(state=>!clips[state]);
  if(absent.length)throw new Error('Character asset lacks required animations: '+absent.join(', '));
  return {clips,missing,sourceNames:[...source.values()].map(clip=>clip.name)};
}

export function createCharacterAsset(gltf,options={}){
  if(!gltf?.scene?.isObject3D)throw new TypeError('A character needs a glTF scene');
  const {clips,missing,sourceNames}=resolveCharacterClips(gltf.animations||[],options);
  // Some authored characters provide a complete jump with no separately
  // named fall/landing clips. Split it only when explicitly requested.
  if(options.splitJump && clips.jump && !clips.fall && !clips.land){
    const fullJump=clips.jump;
    const fps=30,frames=Math.max(9,Math.round(fullJump.duration*fps));
    const apex=Math.round(frames*.45),impact=Math.round(frames*.79);
    clips.jump=THREE.AnimationUtils.subclip(fullJump,'jump',0,apex,fps);
    clips.fall=THREE.AnimationUtils.subclip(fullJump,'fall',apex,impact,fps);
    clips.land=THREE.AnimationUtils.subclip(fullJump,'land',impact,frames,fps);
    for(const state of ['fall','land']){
      const index=missing.indexOf(state);
      if(index!==-1)missing.splice(index,1);
    }
  }
  const scene=gltf.scene;
  let disposed=false;
  const instances=new Set();
  return {
    clips,missing,sourceNames,
    get disposed(){return disposed;},
    createInstance({height=1.85,heading=0}={}){
      if(disposed)throw new Error('Character asset has been disposed');
      if(!Number.isFinite(height)||height<=0||height>10||!Number.isFinite(heading))
        throw new TypeError('Invalid character size or heading');
      const model=cloneSkeleton(scene);
      const root=new THREE.Group();
      root.name='ImportedCharacter';
      root.add(model);
      model.updateMatrixWorld(true);
      const bounds=new THREE.Box3().setFromObject(model);
      const size=bounds.getSize(new THREE.Vector3());
      if(!Number.isFinite(size.y)||size.y<.001)throw new Error('Character model has no measurable height');
      const factor=height/size.y;
      model.scale.multiplyScalar(factor);
      model.position.y-=bounds.min.y*factor;
      model.rotation.y+=heading;
      model.traverse(node=>{
        if(node.isMesh||node.isSkinnedMesh){
          node.castShadow=true;
          node.receiveShadow=true;
          // Animated mesh bounds may exceed the bind-pose bounds.
          if(node.isSkinnedMesh)node.frustumCulled=false;
        }
      });
      let removed=false;
      const instance={
        root,model,clips,
        dispose(){
          if(removed)return;
          removed=true;
          root.removeFromParent();
          instances.delete(instance);
        }
      };
      instances.add(instance);
      return instance;
    },
    dispose(){
      if(disposed)return;
      for(const instance of [...instances])instance.dispose();
      disposed=true;
      scene.traverse(node=>{
        if(!node.isMesh&&!node.isSkinnedMesh)return;
        node.geometry?.dispose();
        for(const material of (Array.isArray(node.material)?node.material:[node.material])){
          if(!material)continue;
          for(const value of Object.values(material))
            if(value?.isTexture)value.dispose();
          material.dispose();
        }
      });
    }
  };
}

export async function loadCharacterAsset(assetManager,url,options={}){
  if(!assetManager?.model||typeof url!=='string'||!url.trim())
    throw new TypeError('loadCharacterAsset requires a model loader and URL');
  const gltf=await assetManager.model(url);
  return createCharacterAsset(gltf,options);
}
