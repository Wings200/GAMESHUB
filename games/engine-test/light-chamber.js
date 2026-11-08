// GAMESHUB Engine laboratory: a real door aperture, dynamic shadowed
// direct spill, a separate *approximate* bounced-light channel and an on-
// demand local cubemap for polished calibration specimens.
//
// NOTE: cube reflections are local scene captures, NOT ray-traced GI.
// The bounce light is a tunable approximation of diffuse interreflection.
import {THREE} from '../../engine/core.js';
import {approach} from '../../engine/motion.js';

import {HINGE_X,PORTAL_Z,LEAF_W,MAX_ANGLE,doorCollisionAt,doorDistance,lightAperture} from '../../engine/portal.js';

export function makeLightChamber({engine,root,cube,sign,mat,fixtures,obstacles,onDoorChange=()=>{}}) {
  const scene=engine.scene, renderer=engine.renderer;
  const ownMaterials=[], ownGeometries=[];
  const concrete=new THREE.MeshStandardMaterial({color:0x363a3c,roughness:.94,metalness:.03});
  const wall=new THREE.MeshStandardMaterial({color:0x33383b,roughness:.97,metalness:0});
  const doorMat=new THREE.MeshStandardMaterial({color:0x5a676b,metalness:.72,roughness:.32});
  const amber=new THREE.MeshStandardMaterial({color:0xffdfa6,emissive:0xffbd6b,emissiveIntensity:1.7});
  ownMaterials.push(concrete,wall,doorMat,amber);
  // Chamber sits directly behind the openable center aperture at z=17.5.
  cube('Dark chamber concrete floor',[10,.36,14.2],concrete,[0,-.21,24.5],{cast:false});
  cube('Dark chamber ceiling',[10,.28,14.1],mat.matte,[0,6.93,24.5],{cast:false});
  for(const x of [-5.08,5.08]){
    cube('Dark chamber sidewall',[.28,6.9,14.1],wall,[x,3.42,24.5],{cast:false});
    cube('Dark chamber rail',[.12,.16,12.4],mat.darkMetal,[x+(x<0?.17:-.17),1.25,24.5],{cast:false});
  }
  cube('Dark chamber back wall',[10,6.9,.3],wall,[0,3.42,31.53],{cast:false});
  // Explicit threshold, continuous floor, accessible doorway.
  cube('Recessed threshold',[3.25,.07,.39],mat.iron,[0,.035,17.56],{cast:false});
  cube('Door frame left',[.19,3.7,.32],mat.blackSteel,[-1.7,1.85,17.53]);
  cube('Door frame right',[.19,3.7,.32],mat.blackSteel,[1.7,1.85,17.53]);
  cube('Door frame lintel',[3.55,.19,.32],mat.blackSteel,[0,3.64,17.53]);
  cube('Flood lamp ceiling bracket',[.16,3.48,.2],mat.iron,[0,4.94,16.32]);
  cube('Flood lamp metal housing',[1.92,.41,.5],mat.blackSteel,[0,3.21,16.52],{radius:.05});
  cube('Flood lamp visible warm source',[1.52,.28,.045],amber,[0,3.17,16.795],{cast:false});

  // Source is literally at the face of the visible flood lamp and shines
  // THROUGH the door aperture; the solid door casts an updated shadow.
  const portalLight=new THREE.SpotLight(0xffdca2,46,17,Math.PI*.31,.63,1.8);
  portalLight.name='Portal direct light — from visible flood lamp';
  portalLight.position.set(0,3.17,16.82);
  portalLight.target.position.set(0,1.45,25.0);
  portalLight.castShadow=true;
  portalLight.shadow.camera.near=.1; portalLight.shadow.camera.far=21;
  portalLight.shadow.mapSize.set(1024,1024);
  portalLight.shadow.bias=-.00005;portalLight.shadow.normalBias=.015;
  scene.add(portalLight,portalLight.target);
  fixtures.push(portalLight,portalLight.target);
  // Tiny face glow comes from the same visible lamp. Its warm bounce onto
  // the front of the steel door remains even when the door is shut.
  const faceGlow=new THREE.SpotLight(0xffdfaa,4.2,3.7,Math.PI*.35,.72,2);
  faceGlow.name='Flood lamp near-field — shadowed by closed door';
  faceGlow.position.copy(portalLight.position);
  faceGlow.target.position.set(0,1.5,19);
  faceGlow.castShadow=true;
  faceGlow.shadow.mapSize.set(512,512);
  faceGlow.shadow.bias=-.00005;
  scene.add(faceGlow,faceGlow.target); fixtures.push(faceGlow,faceGlow.target);

  // This soft glow is a separate APPROXIMATION for multi-bounce diffuse light.
  // Zero while shut and smoothly increases as the aperture opens.
  const bouncedLight=new THREE.PointLight(0xffca8c,0,8.2,2);
  bouncedLight.name='Approximate diffuse light bounced from chamber floor';
  bouncedLight.position.set(.1,.3,19.2);
  scene.add(bouncedLight);fixtures.push(bouncedLight);

  const hinge=new THREE.Group();
  hinge.name='Interactive hinged chamber door';
  hinge.position.set(HINGE_X,0,PORTAL_Z);
  root.add(hinge);
  function doorPiece(name,w,h,d,material,x,y,z=0) {
    const geo=new THREE.BoxGeometry(w,h,d);
    ownGeometries.push(geo);
    const mesh=new THREE.Mesh(geo,material);
    mesh.name=name;mesh.position.set(x,y,z);
    mesh.castShadow=true;mesh.receiveShadow=true;
    hinge.add(mesh);
    return mesh;
  }
  doorPiece('Steel insulated door leaf',LEAF_W,3.47,.13,doorMat,LEAF_W/2,1.75);
  doorPiece('Vertical steel frame stiffener',.075,3.33,.14,mat.iron,.26,1.75);
  doorPiece('Door closer arm',.95,.075,.21,mat.iron,.52,3.38);
  doorPiece('Door handle main side',.46,.11,.21,mat.brass,2.45,1.18,-.11);
  doorPiece('Door handle dark-room side',.46,.11,.21,mat.brass,2.45,1.18,.11);
  doorPiece('Door lock housing',.2,.32,.15,mat.blackSteel,2.56,1.15,-.1);

  // The room is dark deliberately. The local reflection object proves whether
  // light fixtures/door geometry change its surroundings in captured probes.
  cube('Calibration pedestal',[2.25,.84,2.25],mat.blackSteel,[1.25,.42,24.65],{radius:.07});
  cube('Calibration pedestal top',[2.45,.12,2.45],mat.iron,[1.25,.91,24.65],{radius:.025});
  const steel=new THREE.MeshStandardMaterial({color:0xe2e5e7,metalness:1,roughness:.18,envMapIntensity:1.4});
  const polished=new THREE.MeshStandardMaterial({color:0xd8e1e6,metalness:.93,roughness:.25,envMapIntensity:1.15});
  ownMaterials.push(steel,polished);
  const glossyMeshes=[];
  const ballGeo=new THREE.SphereGeometry(.78,40,26);
  ownGeometries.push(ballGeo);
  const sphere=new THREE.Mesh(ballGeo,steel);
  sphere.name='Polished dynamic reflection test sphere';
  sphere.position.set(1.25,1.78,24.65);
  sphere.castShadow=true; sphere.receiveShadow=true;
  root.add(sphere); glossyMeshes.push(sphere);
  const panel=cube('Steel reflection calibration panel',[.15,2.7,2.55],polished,[-3.78,1.64,26.1],{radius:.025});
  glossyMeshes.push(panel);
  cube('Dark chamber secondary metallic sample',[.65,1.5,.65],mat.brass,[-2.42,.76,23.12],{radius:.05});
  sign('LIGHT TEST', 'E TO OPEN  /  REFLECTION PROBE', [0,4.57,17.29],[3.3,.79],{background:'#222c31',accent:'#f0bf7c'}).rotation.y=Math.PI;

  // Structural walls (the door opening itself remains unobstructed).
  obstacles.push({minX:-12.5,maxX:-1.76,minZ:17.38,maxZ:17.79});
  obstacles.push({minX:1.76,maxX:12.5,minZ:17.38,maxZ:17.79});
  obstacles.push({minX:-5.45,maxX:-4.86,minZ:17.75,maxZ:31.74});
  obstacles.push({minX:4.86,maxX:5.45,minZ:17.75,maxZ:31.74});
  obstacles.push({minX:-5.2,maxX:5.2,minZ:31.30,maxZ:31.83});
  obstacles.push({minX:.02,maxX:2.43,minZ:23.33,maxZ:25.85});
  const doorBarrier=doorCollisionAt(0);
  obstacles.push(doorBarrier);

  let openness=0,targetOpen=false,bounceEnabled=true,probeEnabled=true,shadowProfile='balanced';
  let playerLocation=null,dirty=true,lastCapture=-100,captureCount=0;
  const probeTarget=new THREE.WebGLCubeRenderTarget(64,{
    format:THREE.RGBAFormat,
    generateMipmaps:true,minFilter:THREE.LinearMipmapLinearFilter
  });
  const probe=new THREE.CubeCamera(.1,44,probeTarget);
  probe.name='Door chamber local environmental reflection capture';
  probe.position.set(0,1.85,23.85);
  // Keep the capture camera out of the ordinary scene graph (its children
  // are cameras, not surface geometry); update() renders from its own views.
  function captureProbe() {
    if (!probeEnabled || shadowProfile==='performance')return false;
    // Avoid capturing a glossy sample's reflection of itself.
    const wasVisible=glossyMeshes.map(mesh=>mesh.visible);
    glossyMeshes.forEach(mesh=>mesh.visible=false);
    try {
      probe.update(renderer,scene);
      for(const material of [steel,polished]){
        material.envMap=probeTarget.texture;
        material.needsUpdate=true;
      }
      captureCount++;
      dirty=false;
      return true;
    } catch(error) {
      console.warn('Local cubemap update unavailable; falling back to shared environment.',error);
      dirty=false;
      return false;
    } finally {
      glossyMeshes.forEach((mesh,index)=>mesh.visible=wasVisible[index]);
    }
  }
  function syncDoor() {
    hinge.rotation.y=-MAX_ANGLE*openness;
    Object.assign(doorBarrier,doorCollisionAt(openness));
    const aperture=lightAperture(openness);
    portalLight.intensity=46*aperture;
    faceGlow.intensity=shadowProfile==='performance' ? 4.2*aperture : 4.2;
    bouncedLight.intensity=bounceEnabled?2.5*aperture:0;
    dirty=true;
    onDoorChange();
  }
  function setQuality(profile) {
    shadowProfile=profile;
    portalLight.castShadow=profile!=='performance';
    faceGlow.castShadow=profile!=='performance';
    const size=profile==='quality'?1536:profile==='balanced'?1024:512;
    portalLight.shadow.mapSize.set(size,size);
    portalLight.shadow.map?.dispose();
    portalLight.shadow.map=null;
    portalLight.shadow.needsUpdate=true;
    faceGlow.shadow.needsUpdate=true;
    faceGlow.intensity=profile==='performance'?4.2*lightAperture(openness):4.2;
    dirty=true;
  }
  function toggle(player,force=false) {
    if (!player)return false;
    if(!force && doorDistance(player.x,player.z)>3.2)return false;
    if(targetOpen) {
      // Avoid deliberately sweeping the leaf through a player in its path.
      if(player.z>16.95 && player.z<20.5 && player.x>-1.8 && player.x<1.55) return false;
    }
    targetOpen=!targetOpen;
    dirty=true;
    return true;
  }
  function update(dt,seconds,player) {
    playerLocation=player;
    const previous=openness;
    openness=approach(openness,targetOpen?1:0,4.6,dt);
    if(Math.abs(openness-(targetOpen?1:0))<.002)openness=targetOpen?1:0;
    if(openness!==previous) syncDoor();
    // Cubemap rendering is expensive: only capture after an actual change,
    // when the player is near enough to inspect reflective specimens, and
    // only after the door has settled rather than every animation frame.
    if(dirty && openness===(targetOpen?1:0) && seconds-lastCapture>1.1
      && player && player.z>13.5 && shadowProfile!=='performance') {
      lastCapture=seconds;
      captureProbe();
    }
  }
  function setProbes(enabled) {
    probeEnabled=Boolean(enabled);
    if(!probeEnabled){
      for(const material of [steel,polished]){
        material.envMap=null;
        material.needsUpdate=true;
      }
    } else dirty=true;
  }
  function setBounce(enabled){bounceEnabled=Boolean(enabled);syncDoor();}
  function getStatus(){
    return {
      openness,requestedOpen:targetOpen,directIntensity:portalLight.intensity,
      bounceIntensity:bouncedLight.intensity,reflectionCaptures:captureCount,
      localProbeEnabled:probeEnabled,doorBarrier:{...doorBarrier}
    };
  }
  syncDoor();
  setQuality(engine.quality);
  return {
    toggle,update,setQuality,setProbes,setBounce,doorBarrier,
    captureReflections: captureProbe,
    getStatus,near(x,z){return doorDistance(x,z)<3.2;},
    dispose(){
      probeTarget.dispose();
      for(const material of ownMaterials)material.dispose();
      for(const geo of ownGeometries)geo.dispose();
    }
  };
}
