import {THREE} from './core.js';

// Subtle physical surface variation: albedo lives in sRGB, not screen-space
// film grain. Reuse each texture and material across many meshes.
function surfaceMap(rgb, {seed=1, variant='mineral', size=256} = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D is required to generate material maps.');
  const image = context.createImageData(size,size);
  let state = seed >>> 0;
  const rand = () => {state = (Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  let streak = 0;
  for (let y=0;y<size;y++) {
    if (variant === 'timber') streak = streak*.93 + (rand()-.5)*1.3;
    for (let x=0;x<size;x++) {
      const noise = (rand()-.5);
      const broad = Math.sin((variant === 'timber' ? y*0.17 : x*.037+y*.041)+seed)*.5;
      const shift = variant === 'timber'
        ? (noise*3.5+streak*6+broad*7)
        : variant === 'metal'
          ? (noise*2.2+Math.sin(y*.57)*1.25)
          : (noise*3+broad*1.7);
      const pixel=(y*size+x)*4;
      for(let ch=0;ch<3;ch++) image.data[pixel+ch]=Math.max(0,Math.min(255,Math.round(rgb[ch]+shift)));
      image.data[pixel+3]=255;
    }
  }
  context.putImageData(image,0,0);
  const tex=new THREE.CanvasTexture(canvas);
  tex.colorSpace=THREE.SRGBColorSpace;
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
  tex.anisotropy=8;
  tex.needsUpdate=true;
  return tex;
}

export function createSurfaceLibrary() {
  const textures=[
    surfaceMap([108,110,110],{seed:17}),
    surfaceMap([151,149,141],{seed:53}),
    surfaceMap([66,75,81],{seed:31,variant:'metal'}),
    surfaceMap([105,77,57],{seed:74,variant:'timber'})
  ];
  const [floorMap,wallMap,steelMap,woodMap]=textures;
  const materials={
    floor:new THREE.MeshStandardMaterial({map:floorMap, roughness:.91, metalness:0}),
    wall:new THREE.MeshStandardMaterial({map:wallMap, roughness:.96, metalness:0}),
    paintedMetal:new THREE.MeshStandardMaterial({color:0xb7bdc1,roughness:.39,metalness:.57}),
    darkMetal:new THREE.MeshStandardMaterial({map:steelMap,metalness:.73,roughness:.41}),
    blackSteel:new THREE.MeshStandardMaterial({color:0x252b2d,metalness:.65,roughness:.46}),
    iron:new THREE.MeshStandardMaterial({color:0x858a8e,metalness:.87,roughness:.27}),
    rubber:new THREE.MeshStandardMaterial({color:0x242728,metalness:0,roughness:.95}),
    wood:new THREE.MeshStandardMaterial({map:woodMap,metalness:0,roughness:.67}),
    brass:new THREE.MeshStandardMaterial({color:0xb39158,metalness:.9,roughness:.31}),
    copper:new THREE.MeshStandardMaterial({color:0xb77951,metalness:.86,roughness:.38}),
    ceramic:new THREE.MeshPhysicalMaterial({color:0xe1dfd8,metalness:0,roughness:.23,clearcoat:.12}),
    glass:new THREE.MeshPhysicalMaterial({color:0xcbdce1,metalness:0,roughness:.1,transmission:.87,ior:1.47,thickness:.26,envMapIntensity:1}),
    light:new THREE.MeshStandardMaterial({color:0xfff0d3,emissive:0xffdfb8,emissiveIntensity:1.35,roughness:.8}),
    greenLight:new THREE.MeshStandardMaterial({color:0x8accaa,emissive:0x32885e,emissiveIntensity:.85,roughness:.9}),
    screen:new THREE.MeshBasicMaterial({color:0x172e38,toneMapped:false}),
    matte:new THREE.MeshStandardMaterial({color:0x313b3f,roughness:.88,metalness:.06})
  };
  return {
    materials,textures,
    dispose() {for(const material of Object.values(materials)) material.dispose(); for(const tex of textures) tex.dispose();}
  };
}
