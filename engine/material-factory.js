import {THREE} from './core.js';
import {normalizeMaterialSettings} from './material-catalog.mjs';
import {sampleMaterialPattern} from './material-patterns.mjs';

const hexRgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const clamp=n=>Math.min(255,Math.max(0,n));

// Albedo is sampled from a continuous periodic domain. Unlike unrelated
// noise at each image edge, these pixels wrap without visible panel seams.
// No blur pass is applied; mortar, grain, stone and fine details remain sharp.
export function createMaterialCanvas(preset,overrides={},size=256){
  const settings=normalizeMaterialSettings(preset,overrides);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx)throw new Error('Canvas 2D is required for procedural materials');
  const [r,g,b]=hexRgb(settings.color);
  const image=ctx.createImageData(size,size);
  for(let y=0;y<size;y++) for(let x=0;x<size;x++){
    // Include matching endpoints rather than sampling unrelated edge pixels.
    const u=x/Math.max(1,size-1),v=y/Math.max(1,size-1);
    const variation=sampleMaterialPattern(preset,u,v);
    const off=(y*size+x)*4;
    image.data[off]=clamp(r+variation);
    image.data[off+1]=clamp(g+variation);
    image.data[off+2]=clamp(b+variation);
    image.data[off+3]=255;
  }
  ctx.putImageData(image,0,0);
  return canvas;
}

export function createBuildingMaterial(preset,overrides={}){
  const settings=normalizeMaterialSettings(preset,overrides);
  const canvas=createMaterialCanvas(preset,settings,256);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(settings.repeat,settings.repeat);
  texture.anisotropy=4;
  const options={map:texture,roughness:settings.roughness,metalness:settings.metalness,side:THREE.DoubleSide};
  const material=preset.category==='glass'
    ?new THREE.MeshPhysicalMaterial({...options,transmission:preset.transmission,ior:1.47,thickness:.16,
      transparent:false,envMapIntensity:1})
    :new THREE.MeshStandardMaterial(options);
  material.name=preset.id;
  material.userData.materialPreset={id:preset.id,...settings};
  return {material,texture,dispose(){material.dispose();texture.dispose();}};
}
