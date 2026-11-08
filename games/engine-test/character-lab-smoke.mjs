import {chromium} from 'playwright';
import {strict as assert} from 'node:assert';

const browser=await chromium.launch({headless:true,args:[
  '--enable-webgl','--use-gl=angle','--use-angle=swiftshader'
]});
const page=await browser.newPage({viewport:{width:1380,height:840}});
const pageErrors=[];
page.on('pageerror',error=>pageErrors.push(error.message));
try{
  const response=await page.goto('http://127.0.0.1:8080/games/engine-test/character.html',
    {waitUntil:'domcontentloaded',timeout:40000});
  assert.equal(response.status(),200);
  await page.locator('#launchButton').click();
  await page.waitForFunction(()=>window.__characterLab?.ready,{timeout:60000});
  const starting=await page.evaluate(()=>{
    const lab=window.__characterLab;
    const rig=lab.character.root;
    let skinnedMeshes=0;
    rig.traverse(node=>{if(node.isSkinnedMesh)skinnedMeshes++;});
    return {
      mode:lab.mode,viewCamera:lab.engine.renderCamera!==null,
      characterVisible:rig.visible,viewmodelVisible:lab.viewRig.visible,
      animators:lab.session.animators.size,
      clips:[...lab.animator.clips.keys()],
      source:lab.source,missing:lab.missing,
      skinnedMeshes,reloadDisabled:document.getElementById('reloadButton').disabled,
      colliders:lab.session.world.colliders.length,
      rendererCalls:lab.engine.renderer.info.render.calls,
      ready:lab.ready
    };
  });
  assert.equal(starting.ready,true);
  assert.equal(starting.mode,'third');
  assert.equal(starting.viewCamera,true);
  assert.equal(starting.characterVisible,true);
  assert.equal(starting.viewmodelVisible,false);
  assert.equal(starting.animators,2);
  assert.equal(starting.source,'authored');
  assert.ok(starting.clips.includes('walk'));
  assert.ok(starting.clips.includes('land'));
  assert.ok(!starting.clips.includes('reload'));
  assert.ok(starting.missing.includes('reload'));
  assert.equal(starting.reloadDisabled,true);
  assert.ok(starting.skinnedMeshes>0);
  assert.ok(starting.colliders>=5);
  assert.ok(starting.rendererCalls>0);
  // The CI runner uses SwiftShader, not a physical GPU. Keep the character
  // state/transition smoke at a software-friendly resolution and profile.
  await page.locator('#quality').selectOption('performance');
  await page.keyboard.down('w');
  await page.waitForFunction(()=>window.__characterLab?.active==='walk',{timeout:10000});
  const walk=await page.evaluate(()=>{
    const lab=window.__characterLab;
    return {state:lab.active,speed:Math.hypot(lab.session.controls.velocity.x,
      lab.session.controls.velocity.z),
      viewmodelState:lab.viewAnimator.active};
  });
  assert.equal(walk.state,'walk');
  assert.equal(walk.viewmodelState,'walk');
  assert.ok(walk.speed>=.12);
  await page.keyboard.down('Shift');
  await page.waitForFunction(()=>window.__characterLab?.active==='run',{timeout:10000});
  const run=await page.evaluate(()=>window.__characterLab.active);
  assert.equal(run,'run');
  await page.keyboard.up('Shift');
  await page.keyboard.up('w');
  await page.waitForFunction(()=>window.__characterLab?.active==='idle',{timeout:10000});
  await page.keyboard.down('Space');
  await page.waitForFunction(()=>window.__characterLab?.active==='jump' ||
    window.__characterLab?.active==='fall',{timeout:10000});
  await page.keyboard.up('Space');
  await page.waitForFunction(()=>window.__characterLab?.active==='idle',{timeout:10000});
  await page.keyboard.press('v');
  const first=await page.evaluate(()=>{
    const lab=window.__characterLab;
    return {mode:lab.mode,renderCamera:lab.engine.renderCamera===null,
      bodyVisible:lab.character.root.visible,handsVisible:lab.viewRig.visible,
      reticleVisible:!document.getElementById('reticle').hidden};
  });
  assert.deepEqual(first,{
    mode:'first',renderCamera:true,bodyVisible:false,handsVisible:true,reticleVisible:true
  });
  await page.keyboard.press('r');
  assert.match(await page.locator('#feedback').innerText(),/no authored reload/i);
  assert.equal(await page.evaluate(()=>window.__characterLab.actions),0);
  await page.locator('#characterSource').selectOption('diagnostic');
  assert.equal(await page.evaluate(()=>window.__characterLab.source),'diagnostic');
  assert.equal(await page.locator('#reloadButton').isEnabled(),true);
  await page.waitForFunction(()=>!window.__characterLab.viewAnimator.oneShot,
    null,{timeout:10000});
  await page.locator('#reloadButton').click();
  await page.waitForFunction(()=>window.__characterLab?.active==='reload',
    null,{timeout:5000});
  const reloading=await page.evaluate(()=>({
    body:window.__characterLab.animator.active,
    hands:window.__characterLab.viewAnimator.active,
    count:window.__characterLab.actions
  }));
  assert.equal(reloading.body,'reload');
  assert.equal(reloading.hands,'reload');
  assert.equal(reloading.count,1);
  await page.waitForFunction(()=>window.__characterLab?.active==='idle',{timeout:8000});
  await page.locator('#characterSource').selectOption('authored');
  assert.equal(await page.evaluate(()=>window.__characterLab.source),'authored');
  await page.locator('#interactButton').click();
  await page.waitForFunction(()=>window.__characterLab?.active==='interact',
    null,{timeout:10000});
  try{
    await page.waitForFunction(()=>window.__characterLab?.active==='idle',
      null,{timeout:60000});
  }catch(error){
    console.error('IMPORTED GESTURE DIAGNOSTICS',await page.evaluate(()=>{
      const lab=window.__characterLab;
      return {active:lab.active,oneShot:lab.animator.oneShot?.time,
        speed:lab.animator.current?.getEffectiveTimeScale(),
        fps:lab.engine.fps,grounded:lab.session.controls.grounded,
        velocity:lab.session.controls.velocity.toArray(),status:lab.status};
    }));
    throw error;
  }
  await page.keyboard.press('v');
  assert.equal(await page.evaluate(()=>window.__characterLab.mode),'third');
  const eInteraction=await page.evaluate(()=>{
    const lab=window.__characterLab;
    lab.session.controls.camera.position.set(0,lab.session.controls.eyeHeight,-2.35);
    return lab.actions;
  });
  await page.waitForFunction(()=>!document.getElementById('interactionHint').hidden,
    {timeout:8000});
  await page.keyboard.press('e');
  await page.waitForFunction(()=>window.__characterLab?.active==='interact',{timeout:5000});
  assert.equal(await page.evaluate(()=>window.__characterLab.actions),eInteraction+1);
  await page.waitForFunction(()=>window.__characterLab?.active==='idle',{timeout:8000});
  await page.locator('#quality').selectOption('performance');
  const performance=await page.evaluate(()=>({
    renderer:window.__characterLab.engine.renderer.shadowMap.enabled,
    world:window.__characterLab.session.world.get('key-light').castShadow
  }));
  assert.deepEqual(performance,{renderer:false,world:false});
  await page.locator('#quality').selectOption('quality');
  const quality=await page.evaluate(()=>({
    renderer:window.__characterLab.engine.renderer.shadowMap.enabled,
    world:window.__characterLab.session.world.get('key-light').castShadow,
    view:document.body.dataset.view,
    state:document.body.dataset.animation,
    callbacks:window.__characterLab.engine.callbacks.size
  }));
  assert.equal(quality.renderer,true);
  assert.equal(quality.world,true);
  assert.equal(quality.view,'third');
  assert.equal(quality.state,'idle');
  assert.equal(quality.callbacks,2);
  // Moving near the front wall must not leave the chase camera outside it.
  await page.evaluate(()=>{
    const lab=window.__characterLab;
    lab.session.controls.camera.position.set(0,lab.session.controls.eyeHeight,16.5);
    lab.session.controls.yaw=0;
  });
  await page.waitForFunction(()=>{
    const lab=window.__characterLab;
    return lab.engine.renderCamera.position.z>16 &&
      lab.engine.renderCamera.position.z<17.74;
  },{timeout:8000});
  assert.deepEqual(pageErrors,[]);
  console.log('Character Animation Test Room browser smoke passed: launch, articulated rig, WASD, sprint, jump/land, view, reload/interact, console, camera collision, quality.');
}finally{await browser.close();}
