import {THREE} from './core.js';
import {normalizeMaterialSettings} from './material-catalog.mjs';

const hexRgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const clamp=(n,min=0,max=255)=>Math.min(max,Math.max(min,n));
function noise(x,y,seed){
  let n=(Math.imul(x+seed,374761393)^Math.imul(y+seed,668265263))|0;
  n=Math.imul(n^(n>>>13),1274126177);
  return ((n^(n>>>16))>>>0)/4294967295;
}
function overlayPatterns(ctx,preset,size){
  const {pattern,seed}=preset;
  const s=size/256;
  ctx.lineCap='square';
  if(pattern==='brick'){
    const h=43*s,w=96*s,g=3*s;
    ctx.strokeStyle='rgba(30,26,25,.44)';ctx.lineWidth=g;
    for(let row=0;row<Math.ceil(size/h);row++){
      const y=row*h;
      ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(size,y);ctx.stroke();
      const off=row%2?w/2:0;
      for(let x=-w+off;x<size+w;x+=w){
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+h);ctx.stroke();
      }
    }
  }else if(pattern==='tile'){
    const step=64*s;
    ctx.strokeStyle='rgba(27,35,37,.46)';ctx.lineWidth=3*s;
    for(let i=0;i<=size;i+=step){
      ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,size);ctx.moveTo(0,i);ctx.lineTo(size,i);ctx.stroke();
    }
    ctx.strokeStyle='rgba(255,255,255,.22)';ctx.lineWidth=s;
    for(let i=2*s;i<size;i+=step){
      ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,size);ctx.moveTo(0,i);ctx.lineTo(size,i);ctx.stroke();
    }
  }else if(pattern==='roof'){
    const row=37*s,col=86*s;
    ctx.strokeStyle='rgba(17,22,27,.5)';ctx.lineWidth=3*s;
    for(let y=0,k=0;y<size+row;y+=row,k++){
      ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(size,y);ctx.stroke();
      for(let x=(k%2?col/2:0)-col;x<size+col;x+=col){
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+row);ctx.stroke();
      }
    }
  }else if(pattern==='stone'){
    ctx.strokeStyle='rgba(30,32,29,.36)';ctx.lineWidth=2.4*s;
    for(let row=0;row<5;row++){
      const y=row*54*s;
      ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(size,y);ctx.stroke();
      const off=noise(row,0,seed)*64*s;
      for(let x=-100*s+off;x<size;x+=70*s+noise(row,Math.round(x),seed)*50*s){
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+6*s,y+54*s);ctx.stroke();
      }
    }
  }else if(pattern==='wood'){
    for(let i=0;i<95;i++){
      const y=noise(i,4,seed)*size;
      ctx.strokeStyle='rgba(36,22,13,'+(.06+noise(i,5,seed)*.21).toFixed(3)+')';
      ctx.lineWidth=(.4+noise(i,6,seed)*2.5)*s;
      ctx.beginPath();ctx.moveTo(0,y);
      ctx.bezierCurveTo(size*.27,y+Math.sin(i+seed)*9*s,size*.7,y-Math.cos(i*.5)*7*s,size,y+Math.sin(i*.71)*5*s);
      ctx.stroke();
    }
    ctx.strokeStyle='rgba(25,16,10,.34)';
    for(let i=0;i<2;i++){
      const x=noise(i,7,seed)*size,y=noise(i,8,seed)*size;
      ctx.beginPath();ctx.ellipse(x,y,15*s,5*s,.1,0,Math.PI*2);ctx.stroke();
    }
  }else if(pattern==='metal'){
    for(let i=0;i<130;i++){
      const y=noise(i,1,seed)*size;
      ctx.strokeStyle=i%4?'rgba(0,0,0,.065)':'rgba(255,255,255,.18)';
      ctx.lineWidth=Math.max(.4*s,.6*s);
      ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(size,y);ctx.stroke();
    }
  }else if(pattern==='fabric'){
    ctx.lineWidth=.6*s;
    for(let i=0;i<size;i+=3*s){
      ctx.strokeStyle='rgba(255,255,255,.13)';
      ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,size);ctx.stroke();
      ctx.strokeStyle='rgba(0,0,0,.12)';
      ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(size,i);ctx.stroke();
    }
  }else if(pattern==='ground'){
    for(let i=0;i<620;i++){
      const x=noise(i,21,seed)*size,y=noise(i,22,seed)*size;
      const r=(.5+noise(i,23,seed)*4)*s;
      ctx.fillStyle=i%3?'rgba(25,25,25,.16)':'rgba(255,255,255,.15)';
      ctx.beginPath();ctx.ellipse(x,y,r,r*.6,noise(i,24,seed)*3,0,Math.PI*2);ctx.fill();
    }
  }else if(pattern==='plaster'||pattern==='concrete'){
    for(let i=0;i<300;i++){
      const x=noise(i,31,seed)*size,y=noise(i,32,seed)*size;
      const r=(.3+noise(i,33,seed)*(pattern==='plaster'?3:1.7))*s;
      ctx.fillStyle=i%2?'rgba(255,255,255,.12)':'rgba(20,20,20,.1)';
      ctx.fillRect(x,y,r,r);
    }
  }else if(pattern==='leather'){
    for(let i=0;i<750;i++){
      const x=noise(i,41,seed)*size,y=noise(i,42,seed)*size;
      ctx.fillStyle=i%3?'rgba(0,0,0,.1)':'rgba(255,255,255,.12)';
      ctx.fillRect(x,y,.9*s+noise(i,43,seed)*s,.9*s+noise(i,44,seed)*s);
    }
  }
}

// A seeded, tileable approximation for the first generation of materials.
// Only visible swatches and selected materials generate their maps.
export function createMaterialCanvas(preset,overrides={},size=256){
  const settings=normalizeMaterialSettings(preset,overrides);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx)throw new Error('Canvas 2D is required for procedural materials');
  const [r,g,b]=hexRgb(settings.color);
  const image=ctx.createImageData(size,size);
  const strength=({glass:1.2,paint:1.3,plastic:2,metal:7,wood:12,ground:17,
    fabric:10,leather:10,concrete:10,plaster:11,brick:10,tile:4,roof:10,stone:13})[preset.pattern]||9;
  for(let y=0;y<size;y++) for(let x=0;x<size;x++){
    const fine=(noise(x,y,preset.seed)-.5)*strength*2;
    const broad=Math.sin((x*.063+y*.037)+preset.seed)*strength*.37;
    const variation=fine+broad;
    const off=(y*size+x)*4;
    image.data[off]=clamp(r+variation);
    image.data[off+1]=clamp(g+variation);
    image.data[off+2]=clamp(b+variation);
    image.data[off+3]=255;
  }
  ctx.putImageData(image,0,0);
  overlayPatterns(ctx,preset,size);
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
