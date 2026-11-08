import {chromium} from 'playwright';
import {strict as assert} from 'node:assert';

const browser=await chromium.launch({headless:true,args:[
  '--enable-webgl','--use-gl=angle','--use-angle=swiftshader'
]});
const page=await browser.newPage({viewport:{width:1100,height:720}});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));

try{
  const response=await page.goto('http://127.0.0.1:8080/games/engine-test/materials.html',{
    waitUntil:'domcontentloaded',timeout:45000
  });
  assert.equal(response.status(),200);
  await page.waitForFunction(()=>document.querySelector('#materialViewport')?.dataset.previewReady==='true',
    null,{timeout:40000});
  const result=await page.evaluate(async()=>{
    const [{THREE},{createGameWorld},{resolveXZ},{resolveCapsule3D}]=await Promise.all([
      import('../../engine/core.js'),
      import('../../engine/world.js'),
      import('../../engine/collision.js'),
      import('../../engine/collision-3d.js')
    ]);
    const scene=new THREE.Scene();
    const callbacks=new Set(),calls=[];
    const engine={scene,onFrame(fn){callbacks.add(fn);return ()=>callbacks.delete(fn);}};
    const audio={playClip(clip,options){calls.push({clip,...options});return {played:clip};}};
    const world=createGameWorld(engine,{audio});
    const colliders=world.colliders;
    const material={id:'concrete-poured-gray',settings:{repeat:.5,detailStrength:1}};
    const first=world.addMesh({
      id:'wall-one',geometry:'box',size:{x:4,y:3,z:.4},
      position:{x:0,y:1.5,z:0},material,collidable:true
    });
    const second=world.addMesh({
      id:'wall-two',geometry:'box',size:{x:4,y:3,z:.4},
      position:{x:0,y:1.5,z:5},material,collidable:true
    });
    const shared=first.material===second.material;
    const before=world.materials.stats();
    const blocked=resolveXZ({x:-5,z:0},{x:8,z:0},world.colliders);
    world.setTransform('wall-one',{position:{x:8,y:1.5,z:0}});
    const colliderUpdated=world.colliders[0].minX===6 && world.colliders===colliders &&
      world.colliders[0].minY===0 && world.colliders[0].maxY===3;
    // New 3D collision supports raised slabs and Y transform updates,
    // without disturbing the original horizontal resolver.
    world.addMesh({id:'upper-platform',geometry:'box',
      size:{x:3,y:.4,z:3},position:{x:0,y:2,z:0},
      material,collidable:true});
    const upstairs=resolveCapsule3D(
      {x:0,y:5,z:0},{x:0,y:-4,z:0},world.colliders);
    const raisedFloor=upstairs.y;
    world.setTransform('upper-platform',{position:{x:0,y:3,z:0}});
    const colliderRaised=world.colliders.find(c=>c.maxY>3)?.maxY===3.2;
    world.remove('upper-platform');
    world.setMaterial('wall-two',{
      id:'wood-light-oak',settings:{repeat:.5,detailStrength:0.8}
    });
    const changedMaterial=second.material!==first.material;
    world.addLight({id:'hall-light',kind:'point',position:{x:0,y:4,z:0},
      color:'#ffaa88',intensity:5,distance:12});
    const spot=world.addLight({id:'entrance-spot',kind:'spot',
      position:{x:2,y:6,z:0},target:{x:0,y:0,z:0},intensity:3});
    world.setLight('hall-light',{intensity:7,color:'#f5f5f5'});
    world.addSound({id:'door-sound',clip:'door-open',volume:.5});
    const soundResult=world.playSound('door-sound',{volume:.8});
    let ticks=0;
    const stop=world.onUpdate(()=>ticks++);
    for(const fn of callbacks)fn(.016,1);
    stop();
    for(const fn of callbacks)fn(.016,2);
    const snapshot=world.toJSON();
    const beforeInvalid=world.items.size;
    let invalidPreserved=false;
    try{
      world.loadJSON(JSON.stringify({format:'gameshub.world.v1',
        entities:[{id:'bad',type:'mesh',material:'unknown-material'}]}));
    }catch(error){
      invalidPreserved=world.items.size===beforeInvalid && !!world.get('hall-light');
    }
    const count=world.loadJSON(snapshot);
    const afterLoad={count,entities:world.items.size,colliders:world.colliders.length,
      lights:[world.get('hall-light')?.type,world.get('entrance-spot')?.type],
      sounds:world.get('door-sound')?.type,
      materials:world.materials.stats()};
    const colliderRefSurvived=world.colliders===colliders;
    const exported=JSON.parse(world.toJSON());
    world.dispose();
    const afterDispose={materials:world.materials.stats(),rootDetached:world.root.parent===null,
      colliders:colliders.length,callbacks:callbacks.size};
    return {
      shared,before,blocked:blocked.x,colliderUpdated,raisedFloor,colliderRaised,
      changedMaterial,spot:spot.type,soundResult:soundResult.played,
      played:calls,ticks,invalidPreserved,afterLoad,
      colliderRefSurvived,exportedFormat:exported.format,afterDispose
    };
  });
  assert.equal(result.shared,true,'identical objects must share GPU materials');
  assert.deepEqual(result.before,{uniqueMaterials:1,references:2});
  assert.ok(result.blocked<-2.2,'real engine collision solver must block the wall');
  assert.equal(result.colliderUpdated,true);
  assert.equal(result.raisedFloor,3.52);
  assert.equal(result.colliderRaised,true);
  assert.equal(result.changedMaterial,true);
  assert.equal(result.spot,'SpotLight');
  assert.equal(result.soundResult,'door-open');
  assert.deepEqual(result.played,[{clip:'door-open',volume:.8}]);
  assert.equal(result.ticks,1);
  assert.equal(result.invalidPreserved,true);
  assert.deepEqual(result.afterLoad,{
    count:5,entities:5,colliders:2,lights:['PointLight','SpotLight'],
    sounds:'Group',materials:{uniqueMaterials:2,references:2}
  });
  assert.equal(result.colliderRefSurvived,true);
  assert.equal(result.exportedFormat,'gameshub.world.v1');
  assert.deepEqual(result.afterDispose,{
    materials:{uniqueMaterials:0,references:0},rootDetached:true,colliders:0,callbacks:0
  });
  assert.deepEqual(errors,[]);
  console.log('Code-first GameWorld API browser integration smoke passed.');
}finally{
  await browser.close();
}
