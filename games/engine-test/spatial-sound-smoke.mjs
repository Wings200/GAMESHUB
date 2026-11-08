import {chromium} from 'playwright';
import {strict as assert} from 'node:assert';
const browser=await chromium.launch({headless:true,args:[
  '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
  '--autoplay-policy=no-user-gesture-required'
]});
const page=await browser.newPage({viewport:{width:1100,height:740}});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
try{
  const response=await page.goto('http://127.0.0.1:8080/games/engine-test/materials.html',
    {waitUntil:'domcontentloaded',timeout:40000});
  assert.equal(response.status(),200);
  await page.waitForFunction(()=>document.querySelector('#materialViewport')?.dataset.previewReady==='true',
    null,{timeout:40000});
  const result=await page.evaluate(async()=>{
    const [{EngineAudio},{createGameWorld},{THREE}]=await Promise.all([
      import('../../engine/audio.js'),
      import('../../engine/world.js'),
      import('../../engine/core.js')
    ]);
    const audio=new EngineAudio();
    const unlocked=await audio.unlock();
    if(!unlocked)return {unlocked:false};
    // A silent buffer verifies the REAL browser Web Audio graph, without
    // synthesizing or pretending to have recorded a sound effect.
    audio.clips.set('room-noise',audio.context.createBuffer(1,44100,44100));
    audio.setMasterVolume(.72);
    audio.setBusVolume('ambience',.38);
    const volume={master:audio.mixer.gain.value,ambience:audio.mixBuses.get('ambience').gain.value};
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();
    camera.position.set(-2,1.72,0);
    camera.lookAt(3,1.72,0);
    camera.updateMatrixWorld(true);
    const callbacks=new Set();
    const engine={scene,camera,onFrame(fn){callbacks.add(fn);return ()=>callbacks.delete(fn);}};
    const world=createGameWorld(engine,{audio});
    world.addMesh({id:'blocking-wall',geometry:'box',size:{x:.3,y:3,z:4},
      material:'brick-red-clay',position:{x:0,y:1.5,z:0},collidable:true});
    world.addSound({id:'emitter',clip:'room-noise',position:{x:3,y:1.72,z:0},
      spatial:true,loop:true,bus:'ambience',refDistance:1,maxDistance:30,volume:.5});
    const sound=world.playSound('emitter');
    // AudioParams reflect scheduled values only after audio render quanta.
    await new Promise(resolve=>setTimeout(resolve,120));
    const spatial={
      type:sound?.panner?.panningModel,model:sound?.panner?.distanceModel,
      maxDistance:sound?.panner?.maxDistance,
      x:sound?.panner?.positionX?.value,
      loop:sound?.source?.loop,
      isSpatial:sound?.panner instanceof PannerNode
    };
    for(const cb of callbacks)cb(.016,1);
    await new Promise(resolve=>setTimeout(resolve,120));
    const listener={x:audio.context.listener.positionX.value,
      y:audio.context.listener.positionY.value,
      z:audio.context.listener.positionZ.value};
    world.setTransform('emitter',{position:{x:6,y:2.2,z:0}});
    await new Promise(resolve=>setTimeout(resolve,120));
    const moved={x:sound.panner.positionX.value,y:sound.panner.positionY.value};
    world.setSound('emitter',{refDistance:2,maxDistance:50});
    await new Promise(resolve=>setTimeout(resolve,80));
    const filtered=sound.filter.frequency.value;
    const activeBefore=audio.spatialSources.size;
    world.remove('emitter');
    await new Promise(resolve=>setTimeout(resolve,50));
    world.dispose();
    const worldDisposed={colliders:world.colliders.length,callbacks:callbacks.size};
    audio.dispose();
    return {unlocked,volume,spatial,listener,moved,filtered,activeBefore,worldDisposed};
  });
  assert.equal(result.unlocked,true,'AudioContext must run');
  assert.ok(Math.abs(result.volume.master-.72)<1e-5);
  assert.ok(Math.abs(result.volume.ambience-.38)<1e-5);
  assert.equal(result.spatial.type,'HRTF');
  assert.equal(result.spatial.model,'inverse');
  assert.equal(result.spatial.maxDistance,30);
  assert.equal(result.spatial.x,3);
  assert.equal(result.spatial.loop,true);
  assert.equal(result.spatial.isSpatial,true);
  assert.ok(Math.abs(result.listener.x+2)<.0001);
  assert.ok(Math.abs(result.listener.y-1.72)<.0001);
  assert.equal(result.moved.x,6);
  assert.ok(Math.abs(result.moved.y-2.2)<1e-5);
  assert.ok(result.filtered<17000,'wall must cause actual lowpass cutoff');
  assert.equal(result.activeBefore,1);
  assert.deepEqual(result.worldDisposed,{colliders:0,callbacks:0});
  assert.deepEqual(errors,[]);
  console.log('Spatial audio browser smoke passed: HRTF, listener, buses, moving emitters and wall muffling');
}finally{await browser.close();}
