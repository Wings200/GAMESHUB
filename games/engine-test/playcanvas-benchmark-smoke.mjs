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
      camera:!!b.camera.camera,position:b.player.getPosition().z};
  });
  assert.equal(starting.ready,true);
  assert.equal(starting.physics,true);
  assert.equal(starting.avatar,true);
  assert.equal(starting.rigidbody,true);
  assert.equal(starting.camera,true);
  for(const clip of ['Idle','Walk','Run','Jump'])assert.ok(starting.clips.includes(clip));

  await page.keyboard.down('w');
  await page.waitForFunction(()=>window.__pcBenchmark?.animation==='Walk',null,
    {timeout:14000});
  await page.waitForTimeout(500);
  const walk=await page.evaluate(()=>({speed:window.__pcBenchmark.speed,
    z:window.__pcBenchmark.player.getPosition().z}));
  assert.ok(walk.speed>.1);
  assert.ok(walk.z<starting.position-.08);
  await page.keyboard.down('Shift');
  await page.waitForFunction(()=>window.__pcBenchmark?.animation==='Run',null,
    {timeout:15000});
  await page.keyboard.up('Shift');
  await page.keyboard.up('w');
  await page.waitForFunction(()=>window.__pcBenchmark?.animation==='Idle',null,
    {timeout:16000});
  await page.keyboard.down('Space');
  await page.waitForFunction(()=>!window.__pcBenchmark?.grounded,null,
    {timeout:15000});
  await page.keyboard.up('Space');
  await page.waitForFunction(()=>window.__pcBenchmark?.grounded,null,
    {timeout:16000});
  const kicked=await page.evaluate(()=>{
    const b=window.__pcBenchmark;
    b.player.setPosition(0,0,-.8);
    const applied=b.pushCrate();
    return {applied,velocity:b.crateVelocity.length()};
  });
  assert.equal(kicked.applied,true);
  assert.ok(kicked.velocity>.1);
  await page.waitForTimeout(1000);
  await page.screenshot({path:'/tmp/playcanvas-benchmark.png'});
  const renderDiagnostic=await page.evaluate(()=>{
    const b=window.__pcBenchmark;
    const layers=b.app.scene.layers;
    return {
      canvas:[b.app.graphicsDevice.width,b.app.graphicsDevice.height],
      cameraPosition:b.camera.getPosition().toString(),
      playerPosition:b.player.getPosition().toString(),
      cameraLayers:b.camera.camera.layers,
      renderCount:b.app.root.findComponents('render').length,
      drawCalls:b.app.stats.drawCalls,
      layers:layers.layerList.map(l=>({name:l.name,id:l.id,
        opaque:l.opaqueMeshInstances?.length,transparent:l.transparentMeshInstances?.length}))
    };
  });
  console.log('PlayCanvas rendering diagnostics:',JSON.stringify(renderDiagnostic));
  assert.ok(renderDiagnostic.drawCalls.total>0,
    '3D renderer produced zero draw calls even though engine update and physics passed');
  assert.deepEqual(pageErrors,[]);
  console.log('PlayCanvas benchmark passed: real CC0 GLB clips, responsive character movement, camera, jump and Ammo rigid-body impulse.');
}finally{await browser.close();}
