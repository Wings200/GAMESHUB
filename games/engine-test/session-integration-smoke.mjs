import {chromium} from 'playwright';
import {strict as assert} from 'node:assert';

const browser=await chromium.launch({headless:true,args:[
  '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
  '--autoplay-policy=no-user-gesture-required'
]});
const page=await browser.newPage({viewport:{width:800,height:530}});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));

try{
  const response=await page.goto('http://127.0.0.1:8080/games/engine-test/session-smoke.html',
    {waitUntil:'domcontentloaded',timeout:35000});
  assert.equal(response.status(),200);
  const result=await page.evaluate(async()=>{
    const {GameEngine,EngineAudio,createGameSession,resolveCapsule3D}=await import('../../engine/index.js');
    let engine=null,audio=null,session=null;
    try{
      engine=new GameEngine(document.querySelector('#game'),{antialias:false});
      // Browser autoplay policy is relaxed for this test, not for actual games.
      audio=new EngineAudio();
      const unlocked=await audio.unlock();
      if(!unlocked)return {unlocked:false};
      audio.clips.set('machine',audio.context.createBuffer(1,44100,44100));
      session=createGameSession(engine,{audio});
      const callbacksInitially=engine.callbacks.size;
      const world=session.world;
      const initialColliderRef=world.colliders;
      world.addMesh({id:'blocking-wall',geometry:'box',size:{x:.5,y:3.4,z:3},
        position:{x:0,y:1.7,z:0},material:{id:'brick-red-clay',settings:{repeat:.5}},
        collidable:true});
      world.addMesh({id:'upper-floor',geometry:'box',size:{x:3,y:.4,z:3},
        position:{x:-4,y:2.8,z:-5},material:{id:'concrete-poured-gray',
          settings:{repeat:.5}},collidable:true});
      world.addMesh({id:'shadow-block',geometry:'box',size:{x:1,y:1,z:1},
        position:{x:0,y:.5,z:4},material:'wood-light-oak',castShadow:true});
      world.addLight({id:'lamp',kind:'spot',position:{x:0,y:4,z:4},
        target:{x:0,y:0,z:4},color:'#ffe5c3',intensity:40,distance:15,
        castShadow:true,visibleSource:true,shadowSize:512,
        effect:{type:'pulse',frequency:1,amount:.5}});
      world.addSound({id:'machine',clip:'machine',spatial:true,loop:true,
        position:{x:3,y:1.72,z:0},volume:.5,refDistance:1,maxDistance:30});
      session.controls.camera.position.set(-3,1.72,0);
      session.controls.keys.add('KeyD');
      const sound=world.playSound('machine');
      for(let i=0;i<100;i++)session.step(1/60,(i+1)/60);
      session.controls.keys.delete('KeyD');
      await new Promise(resolve=>setTimeout(resolve,180));
      const lower={
        x:engine.camera.position.x,
        listenerX:audio.context.listener.positionX.value,
        listenerY:audio.context.listener.positionY.value,
        occludedCutoff:sound.filter.frequency.value,
        callbacks:engine.callbacks.size,
        shadows:world.get('lamp').castShadow,
        pulse:world.get('lamp').intensity
      };
      // A real upper-floor landing, using the actual live GameWorld colliders
      // and the FirstPersonControls vertical movement mode.
      session.controls.camera.position.set(-4,6.45,-5);
      session.controls.verticalSpeed=0;
      for(let i=0;i<85;i++)session.step(1/60,2+(i+1)/60);
      const upper={y:engine.camera.position.y,grounded:session.controls.grounded,
        listenerY:audio.context.listener.positionY.value};
      // Place the emitter at the listener's raised level, behind no wall.
      world.setTransform('machine',{position:{x:2,y:4.72,z:-5}});
      session.step(1/60,4);
      await new Promise(resolve=>setTimeout(resolve,180));
      const unblocked={
        cutoff:sound.filter.frequency.value,
        listenerX:audio.context.listener.positionX.value,
        listenerY:audio.context.listener.positionY.value,
        emitterX:sound.panner.positionX.value,
        emitterY:sound.panner.positionY.value
      };
      session.setQuality('performance');
      const performance={worldShadow:world.get('lamp').castShadow,
        rendererShadow:engine.renderer.shadowMap.enabled};
      session.setQuality('quality');
      const quality={worldShadow:world.get('lamp').castShadow,
        rendererShadow:engine.renderer.shadowMap.enabled,
        mapSize:world.get('lamp').shadow.mapSize.width};
      session.setQuality('balanced');
      const ground=new (await import('three')).Mesh(
        new (await import('three')).PlaneGeometry(12,12),
        new (await import('three')).MeshStandardMaterial({color:0x888888}));
      ground.rotation.x=-Math.PI/2;ground.position.set(0,0,4);
      ground.receiveShadow=true;engine.scene.add(ground);
      engine.camera.position.set(0,2.5,9);
      engine.camera.lookAt(0,1,4);
      engine.camera.updateMatrixWorld(true);
      engine.renderer.render(engine.scene,engine.camera);
      const render={calls:engine.renderer.info.render.calls,
        shadowMap:Boolean(world.get('lamp').shadow.map),
        lens:world.get('lamp').children.some(node=>node.isMesh)};
      engine.scene.remove(ground);ground.geometry.dispose();ground.material.dispose();
      const saved=world.toJSON();
      const entities=world.loadJSON(saved);
      const afterLoad={entities,callbacks:engine.callbacks.size,
        colliderReference:session.controls.obstacles===world.colliders &&
          world.colliders===initialColliderRef,
        soundSpatial:world.description('machine').spatial,
        lightPulse:world.description('lamp').effect.type,
        raisedFloorY:world.description('upper-floor').position.y};
      session.dispose();
      const afterDispose={callbacks:engine.callbacks.size,
        colliders:initialColliderRef.length,worldDetached:world.root.parent===null};
      session=null;
      return {unlocked,callbacksInitially,lower,upper,unblocked,performance,
        quality,render,afterLoad,afterDispose};
    }finally{
      session?.dispose();
      audio?.dispose();
      engine?.dispose();
    }
  });
  assert.equal(result.unlocked,true);
  assert.equal(result.callbacksInitially,1,'session should own the only update callback');
  assert.ok(result.lower.x < -.55,'player should stop at the wall');
  assert.ok(Math.abs(result.lower.listenerX-result.lower.x)<.01,
    'sound listener must use the latest post-movement camera position');
  assert.ok(result.lower.occludedCutoff<16000,'wall must muffle nearby source');
  assert.equal(result.lower.callbacks,1);
  assert.equal(result.lower.shadows,true);
  assert.ok(result.lower.pulse>0 && result.lower.pulse<40);
  assert.ok(Math.abs(result.upper.y-4.72)<.01,'player should land on upper floor');
  assert.equal(result.upper.grounded,true);
  assert.ok(result.unblocked.cutoff>16500,'source above/outside wall should clear muffling');
  assert.ok(Math.abs(result.unblocked.listenerX+4)<.01);
  assert.ok(Math.abs(result.unblocked.listenerY-4.72)<.01);
  assert.ok(Math.abs(result.unblocked.emitterX-2)<.01);
  assert.ok(Math.abs(result.unblocked.emitterY-4.72)<.01);
  assert.deepEqual(result.performance,{worldShadow:false,rendererShadow:false});
  assert.equal(result.quality.worldShadow,true);
  assert.equal(result.quality.rendererShadow,true);
  assert.equal(result.quality.mapSize,512);
  assert.ok(result.render.calls>0,'actual Three.js renderer must render scene');
  assert.equal(result.render.shadowMap,true,'real spotlight shadow-map must exist');
  assert.equal(result.render.lens,true);
  assert.deepEqual(result.afterLoad,{
    entities:5,callbacks:1,colliderReference:true,soundSpatial:true,
    lightPulse:'pulse',raisedFloorY:2.8
  });
  assert.deepEqual(result.afterDispose,{callbacks:0,colliders:0,worldDetached:true});
  assert.deepEqual(errors,[]);
  console.log('Build 021 GameSession integration smoke passed: movement, sound, lights, quality, save/load, cleanup.');
}finally{
  await browser.close();
}
