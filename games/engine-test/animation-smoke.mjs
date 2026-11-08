import {chromium} from 'playwright';
import {strict as assert} from 'node:assert';

const browser=await chromium.launch({headless:true,args:[
  '--enable-webgl','--use-gl=angle','--use-angle=swiftshader'
]});
const page=await browser.newPage({viewport:{width:700,height:500}});
const pageErrors=[];
page.on('pageerror',error=>pageErrors.push(error.message));
try{
  const response=await page.goto('http://127.0.0.1:8080/games/engine-test/session-smoke.html',
    {waitUntil:'domcontentloaded',timeout:35000});
  assert.equal(response.status(),200);
  const result=await page.evaluate(async()=>{
    const {THREE,GameEngine,createGameSession,AnimationController}=await import('../../engine/index.js');
    const engine=new GameEngine(document.querySelector('#game'),{antialias:false});
    let session;
    try{
      session=createGameSession(engine);
      const root=new THREE.Group();
      root.name='AnimatedCharacter';
      engine.scene.add(root);
      const clip=(name,y,duration=1)=>new THREE.AnimationClip(name,duration,[
        new THREE.NumberKeyframeTrack('.position[y]',[0,duration],[y,y])
      ]);
      const clips={
        idle:clip('idle',0),walk:clip('walk',1),run:clip('run',2),
        jump:clip('jump',3),fall:clip('fall',-1),interact:clip('interact',4)
      };
      const animator=session.addAnimator('player-view-model',root,clips,{
        followControls:true,fadeSeconds:.12
      });
      const singleCallback=engine.callbacks.size;
      const duplicateRejected=(()=>{
        try{session.addAnimator('player-view-model',root,clips);return false;}
        catch(error){return /Duplicate animator/.test(error.message);}
      })();
      session.world.addMesh({id:'ground',geometry:'box',
        size:{x:100,y:.2,z:100},position:{x:0,y:-.1,z:0},
        material:{id:'concrete-poured-gray',settings:{repeat:.5}},
        collidable:true});
      session.world.addLight({id:'test-lamp',kind:'spot',
        position:{x:0,y:4,z:0},target:{x:0,y:0,z:0},
        intensity:8,color:'#ffeedd',castShadow:true,
        effect:{type:'pulse',frequency:1,amount:.3}});
      const tick=(frames,time=0)=>{
        for(let i=0;i<frames;i++)session.step(1/60,time+(i+1)/60);
      };
      tick(30);
      const idle={name:animator.active,y:root.position.y};
      session.controls.keys.add('KeyW');
      tick(100,1);
      const walk={name:animator.active,y:root.position.y,
        speed:Math.hypot(session.controls.velocity.x,session.controls.velocity.z)};
      session.controls.keys.add('ShiftLeft');
      tick(100,3);
      const run={name:animator.active,y:root.position.y,
        speed:Math.hypot(session.controls.velocity.x,session.controls.velocity.z)};
      session.controls.keys.delete('KeyW');
      session.controls.keys.delete('ShiftLeft');
      tick(100,5);
      const stationary={name:animator.active,y:root.position.y};
      session.controls.keys.add('Space');
      tick(2,7);
      session.controls.keys.delete('Space');
      const airborne={name:animator.active,y:root.position.y,
        grounded:session.controls.grounded};
      tick(27,7.2);
      const falling={name:animator.active,verticalSpeed:session.controls.verticalSpeed};
      tick(100,8);
      const landed={name:animator.active,grounded:session.controls.grounded};
      const finished=[];
      const unsubscribe=animator.onComplete(name=>finished.push(name));
      let callbackCount=0;
      animator.playOnce('interact',{onFinish:()=>callbackCount++});
      tick(25,10);
      const whileAction={name:animator.active,y:root.position.y,
        desired:animator.desiredLoop};
      tick(60,11);
      const afterAction={name:animator.active,y:root.position.y,
        callbackCount,finished:[...finished]};
      unsubscribe();
      const second=new THREE.Group();
      engine.scene.add(second);
      const manual=new AnimationController(second,{clips:{idle:clips.idle,walk:clips.walk},
        fadeSeconds:.2});
      manual.playLoop('idle');
      manual.update(.01);
      manual.playLoop('walk');
      manual.update(.1);
      const halfway=second.position.y;
      manual.update(.2);
      const fullyBlended=second.position.y;
      const badClipRejected=(()=>{
        try{manual.register('broken',{});return false;}
        catch(error){return /AnimationClip/.test(error.message);}
      })();
      manual.dispose();
      const modelStillOwned=second.parent===engine.scene;
      const removed=session.removeAnimator('player-view-model');
      const modelStillVisible=root.parent===engine.scene;
      const animatorsEmpty=session.animators.size===0;
      session.world.setLightingProfile('balanced');
      engine.renderer.render(engine.scene,engine.camera);
      const rendered=engine.renderer.info.render.calls>0;
      session.dispose();
      const resources={
        callbacks:engine.callbacks.size,
        rootStillOwned:root.parent===engine.scene,
        animators:session.animators.size
      };
      session=null;
      return {singleCallback,duplicateRejected,idle,walk,run,stationary,
        airborne,falling,landed,whileAction,afterAction,halfway,fullyBlended,
        badClipRejected,modelStillOwned,removed,modelStillVisible,animatorsEmpty,
        rendered,resources};
    }finally{
      session?.dispose();
      engine.dispose();
    }
  });
  assert.equal(result.singleCallback,1);
  assert.equal(result.duplicateRejected,true);
  assert.deepEqual(result.idle,{name:'idle',y:0});
  assert.equal(result.walk.name,'walk');
  assert.ok(Math.abs(result.walk.y-1)<.02);
  assert.ok(result.walk.speed>3.5 && result.walk.speed<4.2);
  assert.equal(result.run.name,'run');
  assert.ok(Math.abs(result.run.y-2)<.02);
  assert.ok(result.run.speed>7 && result.run.speed<8);
  assert.deepEqual(result.stationary,{name:'idle',y:0});
  assert.equal(result.airborne.name,'jump');
  assert.equal(result.airborne.grounded,false);
  assert.ok(result.falling.verticalSpeed<0);
  assert.equal(result.falling.name,'fall');
  assert.deepEqual(result.landed,{name:'idle',grounded:true});
  assert.equal(result.whileAction.name,'interact');
  assert.equal(result.whileAction.desired,'idle');
  assert.ok(result.whileAction.y>3.95);
  assert.equal(result.afterAction.name,'idle');
  assert.ok(Math.abs(result.afterAction.y)<.02);
  assert.equal(result.afterAction.callbackCount,1);
  assert.deepEqual(result.afterAction.finished,['interact']);
  assert.ok(result.halfway>.1 && result.halfway<.9,'must actually blend poses');
  assert.ok(Math.abs(result.fullyBlended-1)<.02);
  assert.equal(result.badClipRejected,true);
  assert.equal(result.modelStillOwned,true);
  assert.equal(result.removed,true);
  assert.equal(result.modelStillVisible,true);
  assert.equal(result.animatorsEmpty,true);
  assert.equal(result.rendered,true);
  assert.deepEqual(result.resources,{callbacks:0,rootStillOwned:true,animators:0});
  assert.deepEqual(pageErrors,[]);
  console.log('Build 022 browser smoke passed: real THREE animation transitions, actions and session lifecycle.');
}finally{
  await browser.close();
}
