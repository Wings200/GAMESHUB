import {chromium} from 'playwright';
import {strict as assert} from 'node:assert';

const browser=await chromium.launch({headless:true,args:[
  '--enable-webgl','--use-gl=angle','--use-angle=swiftshader'
]});
const page=await browser.newPage({viewport:{width:1280,height:720}});
const pageErrors=[];
page.on('pageerror',error=>pageErrors.push(error.message));
try{
  const response=await page.goto(
    'http://127.0.0.1:8080/games/engine-test/playcanvas-benchmark.html',
    {waitUntil:'domcontentloaded',timeout:40000});
  assert.equal(response.status(),200);
  await page.locator('#start').click();
  await page.waitForFunction(()=>window.__pcBenchmark?.ready ||
    !document.getElementById('error').hidden,null,{timeout:90000});
  const error=await page.locator('#error').isVisible();
  if(error)throw new Error('PlayCanvas could not initialize: '+
    await page.locator('#errorMessage').innerText());
  const starting=await page.evaluate(()=>{
    const b=window.__pcBenchmark;
    return {ready:b.ready,physics:b.physicsReady,clips:b.clips,
      avatar:!!b.avatar.anim,rigidbody:!!b.crate.rigidbody,
      camera:!!b.camera.camera,position:b.player.getPosition().z,
      sharedFoundation:b.foundation?.constructor.name==='PlayCanvasFoundation',
      reusableMotor:b.motor?.constructor.name==='PlayCanvasCharacterMotor',
      reusableCamera:b.orbitCamera?.constructor.name==='PlayCanvasOrbitFollowCamera',
      reusableMethods:['material','box','light','camera','loadContainer',
        'animatedModel','onUpdate','destroy'].every(key=>
        typeof b.foundation?.[key]==='function'),
      importedAssetCount:b.foundation?._assetPromises.size};
  });
  assert.equal(starting.ready,true);
  assert.equal(starting.physics,true);
  assert.equal(starting.avatar,true);
  assert.equal(starting.rigidbody,true);
  assert.equal(starting.camera,true);
  assert.equal(starting.sharedFoundation,true);
  assert.equal(starting.reusableMotor,true);
  assert.equal(starting.reusableCamera,true);
  assert.equal(starting.reusableMethods,true);
  assert.equal(starting.importedAssetCount,1);
  for(const clip of ['Idle','Walk','Run','Jump'])assert.ok(starting.clips.includes(clip));

  await page.waitForTimeout(1000);
  await page.screenshot({path:'/tmp/playcanvas-benchmark-idle.png'});

  await page.keyboard.down('w');
  await page.waitForFunction(()=>window.__pcBenchmark?.animation==='Walk',null,
    {timeout:14000});
  // Software WebGL can spend several hundred milliseconds in a single shader
  // compilation frame; wait for actual movement instead of an elapsed timer.
  await page.waitForFunction(startZ=>window.__pcBenchmark?.player.getPosition().z<startZ-.1,
    starting.position,{timeout:18000});
  const walk=await page.evaluate(()=>({speed:window.__pcBenchmark.speed,
    z:window.__pcBenchmark.player.getPosition().z}));
  assert.ok(walk.speed>.1);
  assert.ok(walk.z<starting.position-.08);
  // Animated feet turn throughout the gait, so derive the model's actual
  // forward direction from the shoulder axis (left-to-right and world up).
  const walkFacing=await page.evaluate(()=>{
    const avatar=window.__pcBenchmark.avatar;
    const left=avatar.findByName('LeftShoulder')?.getPosition();
    const right=avatar.findByName('RightShoulder')?.getPosition();
    if(!left||!right)return null;
    const acrossX=left.x-right.x,acrossZ=left.z-right.z;
    return -acrossX/(Math.hypot(acrossX,acrossZ)||1);
  });
  assert.ok(walkFacing!==null&&walkFacing>.7,
    `Body faced backwards/sideways while walking toward -Z: ${walkFacing}`);
  await page.keyboard.down('Shift');
  await page.waitForFunction(()=>window.__pcBenchmark?.animation==='Run',null,
    {timeout:15000});
  const run=await page.evaluate(()=>({
    transition:window.__pcBenchmark.motor.lastTransition,
    cadence:window.__pcBenchmark.avatar.anim.speed
  }));
  assert.equal(run.transition?.from,'Walk');
  assert.equal(run.transition?.to,'Run');
  assert.ok(run.transition.offset>=0&&run.transition.offset<=1,
    'Walk/Run transition lost gait phase');
  assert.ok(run.cadence>=.7&&run.cadence<=1.25);
  await page.keyboard.up('Shift');
  await page.keyboard.up('w');
  await page.waitForFunction(()=>window.__pcBenchmark?.animation==='Idle',null,
    {timeout:16000});
  const restingTransitions=await page.evaluate(()=>window.__pcBenchmark.motor.transitionCount);
  await page.waitForTimeout(400);
  assert.equal(await page.evaluate(()=>window.__pcBenchmark.motor.transitionCount),
    restingTransitions,'Idle state is flickering between animation clips');
  const rightStart=await page.evaluate(()=>window.__pcBenchmark.player.getPosition().x);
  await page.keyboard.down('d');
  await page.waitForFunction(x=>window.__pcBenchmark?.player.getPosition().x>x+.55,
    rightStart,{timeout:18000});
  const rightFacing=await page.evaluate(()=>{
    const avatar=window.__pcBenchmark.avatar;
    const left=avatar.findByName('LeftShoulder')?.getPosition();
    const right=avatar.findByName('RightShoulder')?.getPosition();
    if(!left||!right)return null;
    const acrossX=left.x-right.x,acrossZ=left.z-right.z;
    return -acrossZ/(Math.hypot(acrossX,acrossZ)||1);
  });
  assert.ok(rightFacing!==null&&rightFacing>.55,
    `Body turned opposite rightward travel: ${rightFacing}`);
  await page.keyboard.up('d');
  await page.waitForFunction(()=>window.__pcBenchmark?.animation==='Idle',null,
    {timeout:16000});
  await page.keyboard.down('Space');
  await page.waitForFunction(()=>!window.__pcBenchmark?.grounded,null,
    {timeout:15000});
  assert.ok(await page.evaluate(()=>window.__pcBenchmark.player.getPosition().y)>0,
    'Jump did not move the player vertically');
  await page.keyboard.up('Space');
  await page.waitForFunction(()=>window.__pcBenchmark?.grounded,null,
    {timeout:16000});
  assert.ok(Math.abs(await page.evaluate(()=>window.__pcBenchmark.player.getPosition().y))<.01,
    'Character did not settle on the floor after landing');

  await page.mouse.move(680,320);
  await page.mouse.down();
  await page.mouse.move(740,340,{steps:3});
  await page.mouse.up();
  const orbit=await page.evaluate(()=>({
    yaw:window.__pcBenchmark.orbitCamera.yaw,
    pitch:window.__pcBenchmark.orbitCamera.pitch
  }));
  assert.ok(Math.abs(orbit.yaw)>.2,'Orbit camera did not respond to dragging');
  assert.ok(orbit.pitch>=-.12&&orbit.pitch<=.65);
  // Camera orbit must rotate BOTH the view and the WASD basis in the same
  // direction. The old sign mismatch made W/S veer sideways after dragging.
  for(const {code,sign} of [{code:'w',sign:1},{code:'s',sign:-1}]){
    await page.keyboard.down(code);
    await page.waitForFunction(()=>window.__pcBenchmark?.motor.speed>1.4,null,
      {timeout:18000});
    const alignment=await page.evaluate(()=>{
      const b=window.__pcBenchmark,yaw=b.orbitCamera.yaw;
      const {x,z}=b.motor.velocity;
      return (-Math.sin(yaw)*x-Math.cos(yaw)*z)/b.motor.speed;
    });
    assert.ok(alignment*sign>.93,
      `${code.toUpperCase()} diverged from orbit camera direction: ${alignment}`);
    await page.keyboard.up(code);
    await page.waitForFunction(()=>window.__pcBenchmark?.motor.speed<.12,null,
      {timeout:18000});
  }
  const kicked=await page.evaluate(()=>{
    const b=window.__pcBenchmark;
    b.player.setPosition(0,0,-.8);
    const applied=b.pushCrate();
    return {applied,velocity:b.crateVelocity.length()};
  });
  assert.equal(kicked.applied,true);
  assert.ok(kicked.velocity>.1);
  await page.waitForTimeout(1000);
  const screenshot=await page.screenshot({path:'/tmp/playcanvas-benchmark.png'});
  const renderDiagnostic=await page.evaluate(()=>{
    const b=window.__pcBenchmark;
    const layers=b.app.scene.layers;
    return {
      canvas:[b.app.graphicsDevice.width,b.app.graphicsDevice.height],
      cameraPosition:b.camera.getPosition().toString(),
      cameraCoordinates:b.camera.getPosition().toArray(),
      playerPosition:b.player.getPosition().toString(),
      cameraLayers:b.camera.camera.layers,
      renderCount:b.app.root.findComponents('render').length,
      avatarPosition:b.avatar.getPosition().toArray(),
      avatarLocalScale:b.avatar.getLocalScale().toArray(),
      characterBounds:b.avatar.findComponents('render').reduce((bounds,component)=>{
        for(const mesh of component.meshInstances){
          const bb=mesh.aabb;
          bounds.push({center:bb.center.toArray(),halfExtents:bb.halfExtents.toArray()});
        }
        return bounds;
      },[]).slice(0,5),
      drawCalls:b.app.stats.drawCalls,
      layers:layers.layerList.map(l=>({name:l.name,id:l.id,
        opaque:l.opaqueMeshInstances?.length,transparent:l.transparentMeshInstances?.length}))
    };
  });
  console.log('PlayCanvas rendering diagnostics:',JSON.stringify(renderDiagnostic));
  assert.ok(renderDiagnostic.cameraCoordinates.every(Number.isFinite),
    '3D camera position became non-finite; the scene cannot be visible');
  assert.ok(renderDiagnostic.drawCalls.total>0,
    '3D scene produced no draw calls');
  // Capture size is only a coarse blank-frame guard. The screenshot is also
  // uploaded for actual visual review (software WebGL can affect appearance).
  assert.ok(screenshot.byteLength>60000,
    '3D screenshot is nearly empty despite an initialized camera and models');
  assert.deepEqual(pageErrors,[]);
  console.log('PlayCanvas benchmark passed: shared motor/camera, matched gait-phase transitions, stable idle, grounded jump, orbit and Ammo physics.');
}finally{await browser.close();}
