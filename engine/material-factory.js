import {THREE} from './core.js';
import {normalizeMaterialSettings} from './material-catalog.mjs?v=build016';
import {sampleMaterialPattern,sampleMaterialRelief} from './material-patterns.mjs?v=build016';

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
    const variation=sampleMaterialPattern(preset,u,v,settings.repeat);
    const off=(y*size+x)*4;
    image.data[off]=clamp(r+variation);
    image.data[off+1]=clamp(g+variation);
    image.data[off+2]=clamp(b+variation);
    image.data[off+3]=255;
  }
  ctx.putImageData(image,0,0);
  return canvas;
}

export function createMaterialDetailCanvases(preset,overrides={},size=256){
  if(!['concrete','brick','wood','stone','tile','metal','roof','fabric','carpet'].includes(preset.category))return null;
  const settings=normalizeMaterialSettings(preset,overrides);
  const roughCanvas=document.createElement('canvas');
  const normalCanvas=document.createElement('canvas');
  roughCanvas.width=roughCanvas.height=normalCanvas.width=normalCanvas.height=size;
  const roughCtx=roughCanvas.getContext('2d');
  const normalCtx=normalCanvas.getContext('2d');
  if(!roughCtx||!normalCtx)throw new Error('Canvas 2D is required for material relief maps');
  const roughImage=roughCtx.createImageData(size,size);
  const normalImage=normalCtx.createImageData(size,size);
  const heights=new Float32Array(size*size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const data=sampleMaterialRelief(preset,x/(size-1),y/(size-1),settings.repeat);
    const index=y*size+x,off=index*4;
    heights[index]=data.height;
    // Three.js reads roughness from the green channel. Its scalar roughness
    // slider remains the global multiplier for this spatially varying map.
    const value=Math.round(clamp((1+(data.roughness-1)*settings.detailStrength)*255));
    roughImage.data[off]=roughImage.data[off+1]=roughImage.data[off+2]=value;
    roughImage.data[off+3]=255;
  }
  // The last row/column duplicate the first ones for seamless wrapping.
  // Calculate derivatives modulo the unique period so the normal map also
  // agrees pixel-for-pixel at each opposite edge.
  const period=size-1;
  const heightAt=(x,y)=>heights[((y%period+period)%period)*size+
    ((x%period+period)%period)];
  const intensity=({concrete:2.5,brick:1.45,wood:1.9,stone:2.05,tile:1.5,metal:2.5,roof:1.6,fabric:1.75,carpet:2.0}[preset.category])*settings.detailStrength;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const dx=(heightAt(x-1,y)-heightAt(x+1,y))*intensity;
    const dy=(heightAt(x,y-1)-heightAt(x,y+1))*intensity;
    const length=Math.hypot(dx,dy,1);
    const off=(y*size+x)*4;
    normalImage.data[off]=Math.round(clamp((dx/length*.5+.5)*255));
    normalImage.data[off+1]=Math.round(clamp((dy/length*.5+.5)*255));
    normalImage.data[off+2]=Math.round(clamp((1/length*.5+.5)*255));
    normalImage.data[off+3]=255;
  }
  roughCtx.putImageData(roughImage,0,0);
  normalCtx.putImageData(normalImage,0,0);
  return {normalCanvas,roughCanvas};
}

export function createBuildingMaterial(preset,overrides={}){
  const settings=normalizeMaterialSettings(preset,overrides);
  // A larger tiling setting generates more distinct pattern across one map.
  // Resolution grows with density (within a GPU-safe budget) to keep detail.
  const resolution=settings.repeat<=1.5?256:settings.repeat<=3?512:1024;
  const canvas=createMaterialCanvas(preset,settings,resolution);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  // Repeating one map made four identical panels at 2x. The procedural
  // generator already handles density without repeating entire quadrants.
  texture.repeat.set(1,1);
  texture.anisotropy=4;
  const detail=createMaterialDetailCanvases(preset,settings,resolution);
  const normalTexture=detail?new THREE.CanvasTexture(detail.normalCanvas):null;
  const roughnessTexture=detail?new THREE.CanvasTexture(detail.roughCanvas):null;
  for(const map of [normalTexture,roughnessTexture]){
    if(!map)continue;
    map.colorSpace=THREE.NoColorSpace;
    map.wrapS=map.wrapT=THREE.RepeatWrapping;
    map.anisotropy=4;
  }
  const options={map:texture,roughness:settings.roughness,metalness:settings.metalness,
    normalMap:normalTexture,roughnessMap:roughnessTexture,side:THREE.DoubleSide};
  const material=preset.category==='glass'
    ?new THREE.MeshPhysicalMaterial({...options,transmission:preset.transmission,ior:1.47,thickness:.16,
      transparent:false,envMapIntensity:1})
    :new THREE.MeshStandardMaterial(options);
  material.name=preset.id;
  material.userData.materialPreset={id:preset.id,...settings};
  return {material,texture,normalTexture,roughnessTexture,
    dispose(){material.dispose();texture.dispose();normalTexture?.dispose();roughnessTexture?.dispose();}};
}
