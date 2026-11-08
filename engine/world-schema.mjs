import {getMaterialPreset,normalizeMaterialSettings} from './material-catalog.mjs';

// Versioned, engine-independent scene descriptions. Validation happens before
// any WebGL resources are allocated, so authored games can safely reuse maps.
export const WORLD_FORMAT='gameshub.world.v1';
const ID=/^[a-zA-Z][a-zA-Z0-9_.-]{0,63}$/;
const HEX=/^#[0-9a-fA-F]{6}$/;
const isObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function number(value,defaultValue,label,min=-100000,max=100000){
  if(value===undefined)return defaultValue;
  if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)
    throw new TypeError(label+' must be a finite number in ['+min+', '+max+']');
  return value;
}
function identifier(value,label='id'){
  if(typeof value!=='string'||!ID.test(value))
    throw new TypeError(label+' must start with a letter and contain 1–64 letters, digits, ., _, or -');
  return value;
}
function point(value,label='position'){
  if(value===undefined)return {x:0,y:0,z:0};
  if(!isObject(value))throw new TypeError(label+' must be an {x,y,z} object');
  return {x:number(value.x,0,label+'.x'),y:number(value.y,0,label+'.y'),z:number(value.z,0,label+'.z')};
}
function material(value){
  const name=typeof value==='string'?value:value?.id;
  const preset=getMaterialPreset(name);
  if(!preset)throw new TypeError('Unknown material preset: '+String(name));
  if(typeof value!=='string'&&!isObject(value))throw new TypeError('material must be a preset id or material description');
  const settings=normalizeMaterialSettings(preset,typeof value==='string'?{}:value.settings);
  return {id:name,settings};
}
function size(value,geometry){
  if(!isObject(value))throw new TypeError('size must be an object');
  if(geometry==='box')return {
    x:number(value.x,1,'size.x',.01,1000),
    y:number(value.y,1,'size.y',.01,1000),
    z:number(value.z,1,'size.z',.01,1000)
  };
  if(geometry==='sphere')return {radius:number(value.radius,1,'size.radius',.01,1000)};
  if(geometry==='cylinder')return {
    radius:number(value.radius,1,'size.radius',.01,1000),
    height:number(value.height,2,'size.height',.01,1000)
  };
  throw new TypeError('Unknown mesh geometry: '+String(geometry));
}
export function normalizeWorldEntity(input){
  if(!isObject(input))throw new TypeError('World entity must be an object');
  const id=identifier(input.id);
  const type=input.type;
  const position=point(input.position);
  if(type==='mesh'){
    const geometry=input.geometry??'box';
    if(!['box','sphere','cylinder'].includes(geometry))throw new TypeError('Unknown geometry: '+geometry);
    const rotation=point(input.rotation,'rotation');
    // The existing collision system uses axis-aligned XZ footprints. Forbid
    // rotated colliders until rotated footprint physics is implemented.
    const collidable=input.collidable===true;
    if(collidable && Object.values(rotation).some(v=>Math.abs(v)>1e-10))
      throw new TypeError('Collidable meshes must have zero rotation (XZ AABB collision)');
    const materialRef=material(input.material);
    return {id,type,geometry,size:size(input.size??{},geometry),material:materialRef,
      position,rotation,collidable,
      castShadow:input.castShadow!==false,receiveShadow:input.receiveShadow!==false};
  }
  if(type==='light'){
    const kind=input.kind??'point';
    if(!['point','spot'].includes(kind))throw new TypeError('Light must be point or spot');
    const color=input.color??'#ffffff';
    if(typeof color!=='string'||!HEX.test(color))throw new TypeError('light color must be a six-digit hex color');
    return {id,type,kind,position,color:color.toLowerCase(),
      intensity:number(input.intensity,1,'intensity',0,1000),
      distance:number(input.distance,0,'distance',0,10000),
      castShadow:input.castShadow===true,
      ...(kind==='spot'?{
        target:point(input.target??{x:0,y:0,z:0},'target'),
        angle:number(input.angle,Math.PI/6,'angle',.01,Math.PI/2-.001),
        penumbra:number(input.penumbra,.3,'penumbra',0,1)
      }:{})};
  }
  if(type==='sound'){
    const clip=identifier(input.clip,'clip');
    const bus=input.bus??'sfx';
    if(!['sfx','ambience','music','ui'].includes(bus))throw new TypeError('Unknown sound bus');
    const refDistance=number(input.refDistance,1,'refDistance',.05,1000);
    const maxDistance=number(input.maxDistance,35,'maxDistance',.1,10000);
    if(maxDistance<refDistance)throw new TypeError('Sound maxDistance must be >= refDistance');
    return {id,type,position,clip,volume:number(input.volume,1,'volume',0,1.5),
      spatial:input.spatial===true,loop:input.loop===true,bus,
      refDistance,maxDistance,rolloffFactor:number(input.rolloffFactor,1,'rolloffFactor',0,10),
      occlusion:input.occlusion!==false};
  }
  throw new TypeError('Unknown entity type: '+String(type));
}

export function normalizeWorldDocument(document){
  if(!isObject(document)||document.format!==WORLD_FORMAT)
    throw new TypeError('Unsupported world format (expected '+WORLD_FORMAT+')');
  if(!Array.isArray(document.entities)||document.entities.length>3000)
    throw new TypeError('World entities must be an array of at most 3000 objects');
  const ids=new Set(),entities=[];
  for(const raw of document.entities){
    const item=normalizeWorldEntity(raw);
    if(ids.has(item.id))throw new TypeError('Duplicate entity id: '+item.id);
    ids.add(item.id);
    entities.push(item);
  }
  return {format:WORLD_FORMAT,entities};
}
