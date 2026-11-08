import {THREE} from '../../engine/core.js';
import {MATERIAL_PRESETS,MATERIAL_CATEGORIES,getMaterialPreset,normalizeMaterialSettings} from '../../engine/material-catalog.mjs';
import {createMaterialCanvas,createBuildingMaterial} from '../../engine/material-factory.js?v=build014';

const $=id=>document.getElementById(id);
const storageKey='gameshub-engine-custom-building-materials-v1';
let saved=[];
try {
  const value=JSON.parse(localStorage.getItem(storageKey)||'[]');
  if(Array.isArray(value)) saved=value.filter(item=>getMaterialPreset(item?.baseId)&&item?.settings&&typeof item.settings==='object').slice(0,80);
}catch(error){console.warn('Material variants could not be read:',error);}
let selected=getMaterialPreset('concrete-poured-gray')||MATERIAL_PRESETS[0];
let overrides={};
let activeCustom=null;
let currentGpu=null,preview=null,displayMesh=null,renderer=null,camera=null,scene=null;
let pendingTextureUpdate=null;
let activeShape='wall';
let drawingRequested=false;

function status(message){$('feedback').textContent=message;}
function persist(){
  try {localStorage.setItem(storageKey,JSON.stringify(saved));return true;}
  catch(error){status('Browser storage is unavailable. Download JSON to keep your material.');return false;}
}
function settings(){return normalizeMaterialSettings(selected,overrides);}
function isModified(){
  const s=settings();
  return s.color.toLowerCase()!==selected.color.toLowerCase()||
    Math.abs(s.roughness-selected.roughness)>.001||
    Math.abs(s.metalness-selected.metalness)>.001||
    Math.abs(s.repeat-selected.repeat)>.001 ||
    Math.abs(s.detailStrength-1)>.001;
}

function drawLibrary(){
  const query=$('materialSearch').value.trim().toLowerCase(),category=$('materialCategory').value;
  const list=MATERIAL_PRESETS.filter(p=>
    (category==='all'||p.category===category)&&
    (!query||(p.name+' '+p.categoryName+' '+p.id).toLowerCase().includes(query)));
  $('resultCount').textContent=list.length+' SHOWN';
  const fragment=document.createDocumentFragment();
  for(const preset of list){
    const card=document.createElement('button');
    card.type='button';card.className='material-card';card.setAttribute('role','option');
    card.setAttribute('aria-selected',String(preset.id===selected.id));
    card.dataset.materialId=preset.id;
    const canvas=createMaterialCanvas(preset,{},96);
    canvas.setAttribute('aria-hidden','true');
    card.append(canvas);
    const name=document.createElement('strong');name.textContent=preset.name;
    const categoryName=document.createElement('span');categoryName.textContent=preset.categoryName;
    card.append(name,categoryName);
    card.addEventListener('click',()=>selectPreset(preset));
    fragment.append(card);
  }
  $('materialGrid').replaceChildren(fragment);
}
function drawSaved(){
  const list=$('savedVariants');list.replaceChildren();
  if(saved.length===0){
    const empty=document.createElement('span');empty.textContent='Nothing saved yet.';
    list.append(empty);return;
  }
  for(const item of saved.slice().reverse()){
    const wrap=document.createElement('div');wrap.className='saved-variant';
    const open=document.createElement('button');open.type='button';open.textContent=item.name;
    open.addEventListener('click',()=>{
      const base=getMaterialPreset(item.baseId);
      if(!base)return;
      selected=base;overrides={...item.settings};activeCustom=item.id;
      drawControls();drawLibrary();refreshMaterial();status('Loaded '+item.name+'.');
    });
    const remove=document.createElement('button');remove.type='button';remove.textContent='×';
    remove.title='Remove '+item.name;remove.className='remove';
    remove.addEventListener('click',()=>{
      saved=saved.filter(v=>v.id!==item.id);
      if(activeCustom===item.id)activeCustom=null;
      persist();drawSaved();
      status('Removed saved variant. The catalog preset is unchanged.');
    });
    wrap.append(open,remove);list.append(wrap);
  }
}
function selectPreset(preset){
  selected=preset;overrides={};activeCustom=null;
  drawControls();drawLibrary();refreshMaterial();
}
function drawControls(){
  const s=settings();
  $('selectedName').textContent=selected.name;
  $('selectedCategory').textContent=selected.categoryName.toUpperCase();
  $('selectedId').textContent=selected.id;
  $('materialColor').value=s.color;
  $('colorValue').textContent=s.color.toUpperCase();
  $('materialRoughness').value=s.roughness;
  $('roughnessValue').textContent=s.roughness.toFixed(2);
  $('materialMetalness').value=s.metalness;
  $('metalnessValue').textContent=s.metalness.toFixed(2);
  $('materialRepeat').value=s.repeat;
  $('repeatValue').textContent=s.repeat.toFixed(2)+'×';
  $('detailStrength').value=s.detailStrength;
  $('detailStrengthValue').textContent=s.detailStrength.toFixed(2)+'×';
  const supported=['concrete','brick','wood','stone','tile','metal','roof'].includes(selected.category);
  $('detailStrength').disabled=!supported;
  $('detailToggle').disabled=!supported;
  $('detailSupport').textContent=supported
    ?'Normal + roughness maps · compare on/off'
    :'Depth maps coming later for this family';
  $('modifiedBadge').hidden=!isModified();
}
function queueDraw(){
  if(!renderer||drawingRequested)return;
  drawingRequested=true;
  requestAnimationFrame(()=>{
    drawingRequested=false;
    if(renderer&&scene&&camera)renderer.render(scene,camera);
  });
}
function refreshMaterial(){
  if(pendingTextureUpdate!==null){
    clearTimeout(pendingTextureUpdate);pendingTextureUpdate=null;
  }
  if(!displayMesh)return;
  const next=createBuildingMaterial(selected,overrides);
  const previous=currentGpu;
  currentGpu=next;
  displayMesh.material=next.material;
  if(!$('detailToggle').checked){
    next.material.normalMap=null;
    next.material.roughnessMap=null;
    next.material.needsUpdate=true;
  }
  $('materialViewport').dataset.detailEnabled=String(Boolean(next.material.normalMap));
  previous?.dispose();
  queueDraw();
  $('previewStatus').textContent='LIVE PREVIEW READY';
}
function scheduleTextureRefresh(){
  if(pendingTextureUpdate!==null)clearTimeout(pendingTextureUpdate);
  $('previewStatus').textContent='UPDATING MATERIAL…';
  // Continuous slider dragging should not synchronously allocate a new
  // high-resolution GPU texture on every single pointer movement.
  pendingTextureUpdate=setTimeout(refreshMaterial,90);
}
function updateControl(which,rawValue){
  if(which==='color')overrides.color=rawValue;
  else overrides[which]=Number(rawValue);
  activeCustom=null;
  drawControls();
  if(!currentGpu)return;
  const s=settings();
  if(which==='roughness'||which==='metalness'){
    currentGpu.material[which]=s[which];
    queueDraw();
  }else scheduleTextureRefresh();
}
function selectShape(shape){
  activeShape=shape;
  if(!displayMesh)return;
  displayMesh.geometry.dispose();
  let geometry;
  if(shape==='floor')geometry=new THREE.BoxGeometry(3.65,.18,3.65);
  else if(shape==='cube')geometry=new THREE.BoxGeometry(2.5,2.5,2.5);
  else if(shape==='sphere')geometry=new THREE.SphereGeometry(1.42,64,48);
  else if(shape==='column')geometry=new THREE.CylinderGeometry(.85,.85,3.5,64);
  else geometry=new THREE.BoxGeometry(3.7,3.4,.2);
  displayMesh.geometry=geometry;
  displayMesh.position.y=shape==='floor'?.22:shape==='wall'?1.85:shape==='column'?1.85:1.5;
  displayMesh.rotation.set(0,shape==='wall'?-.16:0,0);
  queueDraw();
}
function initPreview(){
  const canvas=$('materialViewport');
  try{
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(1.5,window.devicePixelRatio||1));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.42;
    scene=new THREE.Scene();scene.background=new THREE.Color('#202b27');
    camera=new THREE.PerspectiveCamera(40,1,.1,40);
    camera.position.set(4.1,3.1,6.9);camera.lookAt(0,1.35,0);
    const hemisphere=new THREE.HemisphereLight(0xebf4ff,0x4e5147,2.0);
    const key=new THREE.DirectionalLight(0xffefdc,4.0);key.position.set(-4,6,5);
    const rim=new THREE.DirectionalLight(0xd2e7ff,2.5);rim.position.set(5,4,-5);
    scene.add(hemisphere,key,rim);
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(80,80),
      new THREE.MeshStandardMaterial({color:0x303b34,roughness:.95}));
    ground.rotation.x=-Math.PI/2;ground.position.y=-.04;scene.add(ground);
    const grid=new THREE.GridHelper(16,16,0x657469,0x425148);
    grid.position.y=-.035;scene.add(grid);
    displayMesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial());
    scene.add(displayMesh);
    selectShape(activeShape);
    const resize=()=>{
      const rect=canvas.getBoundingClientRect();
      const width=Math.max(1,Math.round(rect.width)),height=Math.max(1,Math.round(rect.height));
      renderer.setSize(width,height,false);
      camera.aspect=width/height;camera.updateProjectionMatrix();queueDraw();
    };
    const observer=new ResizeObserver(resize);
    observer.observe(canvas);resize();
    let last=null;
    canvas.addEventListener('pointerdown',event=>{
      last={id:event.pointerId,x:event.clientX,y:event.clientY};
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove',event=>{
      if(!last||event.pointerId!==last.id)return;
      displayMesh.rotation.y+=(event.clientX-last.x)*.008;
      displayMesh.rotation.x=Math.max(-.4,Math.min(.4,displayMesh.rotation.x+(event.clientY-last.y)*.004));
      last.x=event.clientX;last.y=event.clientY;queueDraw();
    });
    const release=()=>{last=null;};
    canvas.addEventListener('pointerup',release);
    canvas.addEventListener('pointercancel',release);
    canvas.dataset.previewReady='true';
    refreshMaterial();
    window.addEventListener('pagehide',()=>{
      observer.disconnect();currentGpu?.dispose();displayMesh.geometry.dispose();
      ground.geometry.dispose();ground.material.dispose();renderer.dispose();
    },{once:true});
  }catch(error){
    console.warn('3D material preview unavailable:',error);
    $('previewMessage').hidden=false;
    $('previewStatus').textContent='2D SWATCHES AVAILABLE';
    try{renderer?.dispose();}catch(_){}
    renderer=null;
  }
}
function exportSelected(){
  const definition={schema:'gameshub.material.v1',id:selected.id,category:selected.category,
    name:selected.name,pattern:selected.pattern,seed:selected.seed,
    transmission:selected.transmission,settings:settings()};
  const blob=new Blob([JSON.stringify(definition,null,2)+'\n'],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download=selected.id+'-material.json';
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),500);
  status('Downloaded '+selected.name+' material settings as JSON.');
}

for(const category of MATERIAL_CATEGORIES){
  const option=document.createElement('option');option.value=category.id;option.textContent=category.label;
  $('materialCategory').append(option);
}
$('libraryCount').textContent=MATERIAL_PRESETS.length+' MATERIAL PRESETS';
$('materialSearch').addEventListener('input',drawLibrary);
$('materialCategory').addEventListener('change',drawLibrary);
$('previewShape').addEventListener('change',event=>selectShape(event.target.value));
$('detailToggle').addEventListener('change',event=>{
  if(!currentGpu)return;
  currentGpu.material.normalMap=event.target.checked?currentGpu.normalTexture:null;
  currentGpu.material.roughnessMap=event.target.checked?currentGpu.roughnessTexture:null;
  currentGpu.material.needsUpdate=true;
  $('materialViewport').dataset.detailEnabled=String(Boolean(currentGpu.material.normalMap));
  queueDraw();
  status(event.target.checked?'Surface depth and varied roughness enabled.':'Surface depth and varied roughness disabled for comparison.');
});
for(const [id,key] of [['materialColor','color'],['materialRoughness','roughness'],
  ['materialMetalness','metalness'],['materialRepeat','repeat'],['detailStrength','detailStrength']])
  $(id).addEventListener('input',event=>updateControl(key,event.target.value));
$('resetMaterial').addEventListener('click',()=>{
  overrides={};activeCustom=null;drawControls();refreshMaterial();status('Reset to the original '+selected.name+' preset.');
});
$('saveMaterial').addEventListener('click',()=>{
  const n=saved.filter(v=>v.baseId===selected.id).length+1;
  const name=selected.name+' · Custom '+n;
  saved.push({id:'custom-'+Date.now()+'-'+Math.round(Math.random()*1e6),
    name,baseId:selected.id,settings:settings()});
  if(saved.length>80)saved=saved.slice(-80);
  activeCustom=saved[saved.length-1].id;
  persist();drawSaved();status('Saved '+name+' locally. Download JSON to use outside this browser.');
});
$('exportMaterial').addEventListener('click',exportSelected);
$('clearVariants').addEventListener('click',()=>{
  if(!saved.length)return;
  if(!window.confirm('Remove all locally saved custom material variants?'))return;
  saved=[];activeCustom=null;persist();drawSaved();
  status('All locally saved custom variants removed. Built-in presets are unchanged.');
});
drawControls();drawLibrary();drawSaved();initPreview();
