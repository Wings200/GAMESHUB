import {chromium} from 'playwright';
import {strict as assert} from 'node:assert';

const browser=await chromium.launch({headless:true,args:[
  '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
  '--autoplay-policy=no-user-gesture-required'
]});
const page=await browser.newPage({viewport:{width:1365,height:835}});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
  const response=await page.goto('http://127.0.0.1:8080/games/engine-test/character-lab.html',{
    waitUntil:'domcontentloaded',timeout:45000
  });
  assert.equal(response.status(),200);
  assert.equal(await page.locator('#launchButton').isVisible(),true);
  await page.locator('#launchButton').click();
  await page.waitForFunction(()=>window.__characterLab?.ready===true,null,{timeout:75000});
  const initial=await page.evaluate(()=>{
    const lab=window.__characterLab;
    const world=lab.session.world;
    const mesh=world.get('west-wall');
    const light=world.get('overhead-A');
    return {
      engineCanvas:lab.engine.canvas.id,mode:lab.mode,
      worldEntities:world.items.size,colliders:world.colliders.length,
      materialShared:world.materials.stats().uniqueMaterials,
      thirdCamera:lab.engine.renderCamera!==lab.engine.camera,
      avatar:lab.avatar.root.visible,
      viewModel:lab.viewModel.root.visible,
      animatorCount:lab.session.animators.size,
      clips:['idle','walk','run','jump','fall','interact','reload']
        .every(name=>lab.avatar.animator.has(name)),
      castShadow:light.castShadow,
      wallY:world.colliders.find(c=>c.minX< -11 && c.maxY>3)?.maxY,
      frameCallbacks:lab.engine.callbacks.size,
      viewport:lab.engine.renderer.domElement.width
    };
  });
  assert.equal(initial.engineCanvas,'game');
  assert.equal(initial.mode,'third');
  assert.ok(initial.worldEntities>=27);
  assert.ok(initial.colliders>=8);
  assert.ok(initial.materialShared>=3);
  assert.equal(initial.thirdCamera,true);
  assert.equal(initial.avatar,true);
  assert.equal(initial.viewModel,false);
  assert.equal(initial.animatorCount,3);
  assert.equal(initial.clips,true);
  assert.equal(initial.castShadow,true);
  assert.equal(initial.wallY,6);
  assert.equal(initial.frameCallbacks,2);
  assert.ok(initial.viewport>0);

  await page.keyboard.down('w');
  await page.waitForTimeout(900);
  const walking=await page.evaluate(()=>{
    const lab=window.__characterLab;
    return {state:lab.avatar.animator.active,z:lab.engine.camera.position.z,
      speed:Math.hypot(lab.session.controls.velocity.x,lab.session.controls.velocity.z)};
  });
  await page.keyboard.down('Shift');
  await page.waitForTimeout(700);
  const running=await page.evaluate(()=>{
    const lab=window.__characterLab;
    return {state:lab.avatar.animator.active,
      speed:Math.hypot(lab.session.controls.velocity.x,lab.session.controls.velocity.z)};
  });
  await page.keyboard.up('Shift');
  await page.keyboard.up('w');
  assert.equal(walking.state,'walk');
  assert.ok(walking.z<7);
  assert.ok(walking.speed>3.3&&walking.speed<4.3);
  assert.equal(running.state,'run');
  assert.ok(running.speed>6.3&&running.speed<7.5);

  await page.keyboard.press('v');
  const first=await page.evaluate(()=>{
    const lab=window.__characterLab;
    return {mode:lab.mode,renderHead:lab.engine.renderCamera===lab.engine.camera,
      modelVisible:lab.avatar.root.visible,weaponVisible:lab.viewModel.root.visible};
  });
  assert.deepEqual(first,{mode:'first',renderHead:true,modelVisible:false,weaponVisible:true});
  await page.keyboard.press('e');
  await page.waitForTimeout(130);
  assert.equal(await page.evaluate(()=>window.__characterLab.avatar.animator.active),'interact');
  await page.waitForTimeout(1100);
  assert.equal(await page.evaluate(()=>window.__characterLab.avatar.animator.active),'idle');
  await page.keyboard.press('r');
  await page.waitForTimeout(130);
  assert.equal(await page.evaluate(()=>window.__characterLab.avatar.animator.active),'reload');
  await page.waitForTimeout(1450);
  assert.equal(await page.evaluate(()=>window.__characterLab.avatar.animator.active),'idle');

  await page.keyboard.down('Space');
  await page.waitForTimeout(120);
  await page.keyboard.up('Space');
  const airborne=await page.evaluate(()=>{
    const lab=window.__characterLab;
    return {state:lab.avatar.animator.active,
      grounded:lab.session.controls.grounded,
      y:lab.engine.camera.position.y};
  });
  assert.equal(airborne.grounded,false);
  assert.equal(airborne.state,'jump');
  assert.ok(airborne.y>1.72);
  await page.waitForTimeout(1150);
  assert.equal(await page.evaluate(()=>window.__characterLab.session.controls.grounded),true);

  await page.keyboard.press('v');
  assert.equal(await page.evaluate(()=>window.__characterLab.mode),'third');
  await page.locator('#quality').selectOption('performance');
  assert.deepEqual(await page.evaluate(()=>{
    const lab=window.__characterLab;
    return {rendererShadows:lab.engine.renderer.shadowMap.enabled,
      worldShadows:lab.session.world.get('overhead-A').castShadow};
  }),{rendererShadows:false,worldShadows:false});
  await page.locator('#quality').selectOption('balanced');
  assert.deepEqual(await page.evaluate(()=>{
    const lab=window.__characterLab;
    return {rendererShadows:lab.engine.renderer.shadowMap.enabled,
      worldShadows:lab.session.world.get('overhead-A').castShadow};
  }),{rendererShadows:true,worldShadows:true});

  await page.evaluate(()=>{
    const controls=window.__characterLab.session.controls;
    controls.camera.position.set(3.7,1.72,-3.8);
    controls.velocity.set(0,0,0);
  });
  await page.keyboard.press('e');
  assert.equal(await page.evaluate(()=>window.__characterLab.session.world.description('console-light').intensity),12);
  await page.locator('#resetButton').click();
  const reset=await page.evaluate(()=>{
    const lab=window.__characterLab;
    return {x:lab.engine.camera.position.x,z:lab.engine.camera.position.z,
      mode:lab.mode,worldAlive:lab.session.world.items.size>20};
  });
  assert.deepEqual(reset,{x:0,z:8,mode:'third',worldAlive:true});
  assert.deepEqual(errors,[]);
  console.log('Character animation lab browser smoke passed: actual playable room, movement, first/third cameras, jump, actions, lights and UI.');
}finally{
  await browser.close();
}
