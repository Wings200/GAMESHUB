import {chromium} from 'playwright';
import {strict as assert} from 'node:assert';

const browser=await chromium.launch({headless:true,args:[
  '--enable-webgl','--use-gl=angle','--use-angle=swiftshader'
]});
const page=await browser.newPage({viewport:{width:1040,height:760}});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
  const response=await page.goto('http://127.0.0.1:8080/games/engine-test/materials.html',
    {waitUntil:'domcontentloaded',timeout:45000});
  assert.equal(response.status(),200);
  await page.waitForFunction(()=>document.querySelector('#materialViewport')?.dataset.previewReady==='true',
    null,{timeout:40000});
  const result=await page.evaluate(async()=>{
    const [{THREE},{createGameWorld},{lightEffectFactor}]=await Promise.all([
      import('../../engine/core.js'),import('../../engine/world.js'),
      import('../../engine/light-effects.mjs')
    ]);
    const scene=new THREE.Scene();
    scene.background=new THREE.Color('#12151a');
    const callbacks=new Set(),engine={scene,quality:'balanced',
      onFrame(fn){callbacks.add(fn);return ()=>callbacks.delete(fn);}};
    const world=createGameWorld(engine);
    world.addLight({id:'lamp',kind:'point',position:{x:0,y:2,z:2},
      color:'#ffcc88',intensity:12,distance:14,decay:2,
      visibleSource:true,sourceRadius:.17,castShadow:true,shadowSize:1024});
    const lamp=world.get('lamp');
    const emitter=lamp.children.find(c=>c.isMesh);
    const sourceInitially={
      type:lamp.type,sourceCount:lamp.children.length,
      sameColor:emitter.material.color.getHexString()===lamp.color.getHexString(),
      sourceRadius:emitter.userData.radius,
      shadowEnabled:lamp.castShadow,
      shadowSize:lamp.shadow.mapSize.width,
      decay:lamp.decay
    };
    world.addLight({id:'spot',kind:'spot',position:{x:3,y:4,z:1},
      color:'#ddf0ff',intensity:25,distance:20,decay:2,
      castShadow:true,shadowSize:1024,visibleSource:true,
      target:{x:0,y:0,z:0}});
    world.addLight({id:'third',kind:'point',position:{x:-2,y:3,z:-2},
      castShadow:true,shadowSize:1024,intensity:3});
    const balanced=[world.get('lamp').castShadow,world.get('spot').castShadow,
      world.get('third').castShadow];
    world.setLightingProfile('quality');
    const quality={
      lights:[world.get('lamp').castShadow,world.get('spot').castShadow,
        world.get('third').castShadow],
      shadowSize:world.get('spot').shadow.mapSize.width
    };
    world.setLightingProfile('performance');
    const performance=[world.get('lamp').castShadow,world.get('spot').castShadow,
      world.get('third').castShadow];
    world.setLightingProfile('balanced');
    world.setLight('lamp',{position:{x:5,y:2,z:1},
      color:'#ffaa22',sourceRadius:.22,intensity:18,
      effect:{type:'pulse',frequency:1,amount:.6}});
    const updated=world.get('lamp');
    updated.updateMatrixWorld(true);
    const sourceUpdated={
      radius:updated.children[0].userData.radius,
      localOrigin:updated.children[0].position.length(),
      worldX:updated.children[0].getWorldPosition(new THREE.Vector3()).x,
      color:updated.children[0].material.color.getHexString()
    };
    const baseline=world.description('lamp').intensity;
    for(const cb of callbacks)cb(.016,.75);
    const animated=updated.intensity;
    world.setLight('lamp',{effect:{type:'steady'}});
    const steady=updated.intensity;
    world.setLight('lamp',{visibleSource:false});
    const emitterRemoved=updated.children.length===0;
    world.setLight('lamp',{visibleSource:true});
    const emitterRecreated=updated.children.length===1;
    const serialized=world.toJSON();
    world.loadJSON(serialized);
    const reload={
      count:world.items.size,
      lampSource:world.get('lamp').children.length,
      effects:world.description('lamp').effect.type,
      spotTarget:world.get('spot').target.position.x
    };
    // Render a real shadow-casting spotlight and visible lens into a tiny
    // offscreen Three.js frame; don't depend on unverified visual impressions.
    world.clear();
    world.setLightingProfile('balanced');
    const canvas=document.createElement('canvas');
    const renderer=new THREE.WebGLRenderer({canvas,antialias:false});
    renderer.setSize(96,96,false);
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    const camera=new THREE.PerspectiveCamera(55,1,.1,40);
    camera.position.set(0,2.4,5.4);
    camera.lookAt(0,.55,0);
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(12,12),
      new THREE.MeshStandardMaterial({color:0x888888,roughness:.6}));
    ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;
    scene.add(ground);
    const cube=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),
      new THREE.MeshStandardMaterial({color:0xaabbee}));
    cube.position.y=.5;cube.castShadow=true;cube.receiveShadow=true;
    scene.add(cube);
    world.addLight({id:'shadowed-spot',kind:'spot',color:'#ffe7c2',intensity:30,
      position:{x:0,y:4,z:2},target:{x:0,y:0,z:0},distance:15,decay:2,
      castShadow:true,shadowSize:512,visibleSource:true});
    renderer.render(scene,camera);
    const rendered={calls:renderer.info.render.calls,
      hasShadowMap:Boolean(world.get('shadowed-spot').shadow.map),
      visibleEmitter:world.get('shadowed-spot').children.some(c=>c.isMesh)};
    world.dispose();scene.remove(ground,cube);
    ground.geometry.dispose();ground.material.dispose();
    cube.geometry.dispose();cube.material.dispose();
    renderer.dispose();
    return {sourceInitially,balanced,quality,performance,sourceUpdated,
      baseline,animated,expected:baseline*lightEffectFactor({type:'pulse',
        frequency:1,amount:.6,seed:0},.75),steady,emitterRemoved,
      emitterRecreated,reload,rendered,callbacks:callbacks.size};
  });
  assert.equal(result.sourceInitially.type,'PointLight');
  assert.equal(result.sourceInitially.sourceCount,1);
  assert.equal(result.sourceInitially.sameColor,true);
  assert.equal(result.sourceInitially.sourceRadius,.17);
  assert.equal(result.sourceInitially.shadowEnabled,true);
  assert.equal(result.sourceInitially.shadowSize,512);
  assert.equal(result.sourceInitially.decay,2);
  assert.deepEqual(result.balanced,[true,true,false]);
  assert.deepEqual(result.quality.lights,[true,true,true]);
  assert.equal(result.quality.shadowSize,1024);
  assert.deepEqual(result.performance,[false,false,false]);
  assert.equal(result.sourceUpdated.radius,.22);
  assert.equal(result.sourceUpdated.localOrigin,0);
  assert.equal(result.sourceUpdated.worldX,5);
  assert.equal(result.sourceUpdated.color,'ffaa22');
  assert.ok(Math.abs(result.animated-result.expected)<1e-9);
  assert.equal(result.steady,result.baseline);
  assert.equal(result.emitterRemoved,true);
  assert.equal(result.emitterRecreated,true);
  assert.deepEqual(result.reload,{count:3,lampSource:1,effects:'steady',spotTarget:0});
  assert.ok(result.rendered.calls>0);
  assert.equal(result.rendered.hasShadowMap,true);
  assert.equal(result.rendered.visibleEmitter,true);
  assert.equal(result.callbacks,0);
  assert.deepEqual(errors,[]);
  console.log('Lighting browser smoke passed: source-linked lamps, actual shadow maps, profiles and effects.');
}finally{
  await browser.close();
}
