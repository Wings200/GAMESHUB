// Headless Chrome gameplay smoke test for the actual 3D RPG test lab.
// Run with: npm install --no-save playwright-core three@0.180.0
//           node games/rpg-prototype/browser-smoke.mjs
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,join,extname,sep} from 'node:path';
import {existsSync} from 'node:fs';
import {chromium} from 'playwright-core';
import {getItem} from './inventory.mjs';
const root=process.cwd();
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript',
  '.css':'text/css','.png':'image/png','.json':'application/json'};
const server=createServer(async(req,res)=>{
  try{
    let pathname=new URL(req.url,'http://localhost').pathname;
    if(pathname.endsWith('/'))pathname+='index.html';
    const path=resolve(root,'.'+pathname);
    if(!path.startsWith(root+sep))throw Error('invalid path');
    const stats=await stat(path);
    if(!stats.isFile())throw Error('not a file');
    let body=await readFile(path);
    if(pathname.endsWith('/games/rpg-prototype/testing/index.html')){
      body=Buffer.from(body.toString().replace(
        'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js',
        '/node_modules/three/build/three.module.js').replace(
        'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/',
        '/node_modules/three/examples/jsm/'));
    }
    res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream',
      'Cache-Control':'no-store'});
    res.end(body);
  }catch(e){res.writeHead(404);res.end(String(e));}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const port=server.address().port;
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable',
  '/usr/bin/chromium','/usr/bin/chromium-browser'].find(existsSync);
if(!chrome)throw Error('Chrome/Chromium unavailable on CI runner');
let browser;
try{
  browser=await chromium.launch({headless:true,executablePath:chrome,args:[
    '--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
    '--enable-unsafe-swiftshader','--disable-gpu-sandbox'
  ]});
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{
    // The test lab intentionally has no favicon (404); don't interpret
    // harmless asset warnings as a JavaScript gameplay error.
    if(m.type()==='error'&&!m.text().includes('404'))
      errors.push('console: '+m.text());
  });
  await page.goto('http://127.0.0.1:'+port+
    '/games/rpg-prototype/testing/?station=9&smoke=1',
    {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__rpgSmokeState?.().enemies.length===3,
    {timeout:30000});
  let state=await page.evaluate(()=>window.__rpgSmokeState());
  assert.equal(state.stationIndex,8,'URL should open Station 9');
  assert.equal(state.arenaActive,true);
  assert.equal(state.enemies.length,3);
  await page.locator('#enterAI').click();
  await page.waitForFunction(()=>window.__rpgSmokeState().locked,
    {timeout:7000});
  const before=await page.evaluate(()=>window.__rpgSmokeState());
  await page.waitForTimeout(1400);
  const after=await page.evaluate(()=>window.__rpgSmokeState());
  const moved=after.enemies.some((e,i)=>
    Math.hypot(e.x-before.enemies[i].x,e.z-before.enemies[i].z)>.08);
  assert.ok(moved,'At least one live AI must physically move in the arena');
  // Freeze AI for a stable sightline, reset enemy positions and then aim at
  // the Scout's centre with real pointer-locked browser mouse input.
  await page.keyboard.press('j');
  await page.keyboard.press('k');
  let frozen=await page.evaluate(()=>window.__rpgSmokeState());
  assert.equal(frozen.aiEnabled,false);
  await page.evaluate(()=>window.__rpgSmokeAimAtScout());
  const initialHp=frozen.enemies.find(e=>e.id==='scout').health;
  // A coordinate click AFTER pointer lock moves the view in Chrome.
  // Dispatch mouse-button events directly on the locked window instead,
  // preserving the calibrated Scout sight line while exercising game input.
  await page.evaluate(()=>window.dispatchEvent(
    new MouseEvent('mousedown',{button:2,bubbles:true})));
  for(let i=0;i<7;i++){
    await page.evaluate(()=>window.dispatchEvent(
      new MouseEvent('mousedown',{button:0,bubbles:true})));
    await page.waitForTimeout(300);
    await page.evaluate(()=>window.dispatchEvent(
      new MouseEvent('mouseup',{button:0,bubbles:true})));
    const current=await page.evaluate(()=>window.__rpgSmokeState());
    if(current.enemies.find(e=>e.id==='scout').health<initialHp)break;
  }
  await page.evaluate(()=>window.dispatchEvent(
    new MouseEvent('mouseup',{button:2,bubbles:true})));
  const result=await page.evaluate(()=>window.__rpgSmokeState());
  const scoutHealth=result.enemies.find(e=>e.id==='scout').health;
  console.log('BROWSER DAMAGE DEBUG',JSON.stringify({
    before:frozen,after:result,errors
  }));
  assert.ok(scoutHealth<initialHp,
    'Player pistol must cause real damage to an enemy in 3D hit detection');
  // Reproduce the reported continuous buzz with the automatic Pipe SMG.
  // Hold its trigger past the final bullet and verify a SINGLE empty click
  // for the entire uninterrupted hold (including a few extra render frames).
  await page.evaluate(()=>{
    const menu=document.getElementById('weaponSelect');
    menu.value='pipe-smg';
    menu.dispatchEvent(new Event('change',{bubbles:true}));
  });
  // Reduce to one round only for this smoke run: software WebGL does not
  // guarantee 30 shots in realtime, but one final shot tests the same path.
  await page.evaluate(()=>window.__rpgSmokeSetMagazine(1));
  const smgStart=await page.evaluate(()=>window.__rpgSmokeState());
  assert.equal(smgStart.weapon.id,'pipe-smg');
  assert.equal(smgStart.weapon.magazine,1);
  await page.evaluate(()=>window.dispatchEvent(
    new MouseEvent('mousedown',{button:0,bubbles:true})));
  await page.waitForFunction(()=>window.__rpgSmokeState().weapon.magazine===0,
    null,{timeout:12000});
  await page.waitForFunction(()=>window.__rpgSmokeState().dryFireClicks===1,
    null,{timeout:12000});
  const emptyA=await page.evaluate(()=>window.__rpgSmokeState());
  await page.waitForTimeout(650);
  const emptyB=await page.evaluate(()=>window.__rpgSmokeState());
  assert.equal(emptyB.dryFireClicks,emptyA.dryFireClicks,
    'A held empty automatic weapon must NOT make a buzzing stream of clicks');
  assert.equal(emptyB.dryFireClicks,1);
  assert.equal(emptyB.emptyClickLatched,true);
  await page.evaluate(()=>window.dispatchEvent(
    new MouseEvent('mouseup',{button:0,bubbles:true})));
  // A SECOND intentional trigger pull should produce exactly one more click.
  await page.evaluate(()=>window.dispatchEvent(
    new MouseEvent('mousedown',{button:0,bubbles:true})));
  await page.waitForTimeout(200);
  const second=await page.evaluate(()=>window.__rpgSmokeState());
  assert.equal(second.dryFireClicks,2,
    'After releasing the trigger, one new empty click must be possible');
  await page.evaluate(()=>window.dispatchEvent(
    new MouseEvent('mouseup',{button:0,bubbles:true})));
  // Reloading restores firing and does not leave the latch stuck on empty.
  await page.keyboard.press('r');
  const reloading=await page.evaluate(()=>window.__rpgSmokeState());
  assert.ok(reloading.weapon.reloadRemaining>0,'R must start a reload');
  await page.evaluate(()=>window.__rpgSmokeFinishReload());
  await page.waitForFunction(()=>window.__rpgSmokeState().weapon.magazine===30,
    null,{timeout:12000});
  await page.evaluate(()=>window.dispatchEvent(
    new MouseEvent('mousedown',{button:0,bubbles:true})));
  await page.waitForTimeout(190);
  await page.evaluate(()=>window.dispatchEvent(
    new MouseEvent('mouseup',{button:0,bubbles:true})));
  const recovered=await page.evaluate(()=>window.__rpgSmokeState());
  assert.ok(recovered.weapon.magazine<30,
    'Automatic fire must work after empty magazine and successful reload');
  // W06.0: The world loot bag must be searchable and its inventory items
  // must transfer, equip and reduce armor damage in the real 3D browser.
  const lootId=await page.evaluate(()=>window.__rpgSmokeSpawnLoot('raider'));
  assert.ok(lootId);
  const gearLoot=await page.evaluate(()=>window.__rpgSmokeState());
  const worn=Object.values(gearLoot.enemies.find(e=>e.id==='raider').armor)
    .filter(id=>id!=='none').sort();
  const dropped=gearLoot.loot[0].items.filter(e=>e.itemId.startsWith('armor:'))
    .map(e=>e.itemId.slice(6)).sort();
  assert.ok(dropped.length>=1&&dropped.length<=2,
    'Raiders should drop only one or two armor pieces');
  assert.ok(dropped.length<worn.length,
    'A raider must not drop their whole equipped suit');
  assert.ok(dropped.every(id=>worn.includes(id)),
    'Every dropped armor item must actually be worn by the NPC');
  const testArmor=getItem('armor:'+dropped[0]);
  const nearby=await page.evaluate(()=>window.__rpgSmokeApproachLoot());
  assert.equal(nearby,true);
  await page.keyboard.press('e');
  await page.waitForSelector('#lootPanel:not(.hidden)',{timeout:7000});
  assert.ok(await page.locator('#lootItems .loot-entry').count()>=3);
  await page.locator('#lootTakeAll').click();
  const inventoryAfterLoot=await page.evaluate(()=>window.__rpgSmokeState());
  assert.equal(inventoryAfterLoot.loot.length,0,
    'A fully looted bag must disappear from the 3D world');
  assert.ok(inventoryAfterLoot.inventory.items.some(i=>
    i.itemId===testArmor.id));
  await page.locator('#lootClose').click();
  await page.waitForFunction(()=>window.__rpgSmokeState().locked,
    null,{timeout:7000});
  await page.keyboard.press('i');
  await page.waitForSelector('#inventoryPanel:not(.hidden)',{timeout:7000});
  await page.locator('#inventoryItems .loot-entry')
    .filter({hasText:testArmor.name}).getByRole('button',{name:'EQUIP'}).click();
  await page.locator('#inventoryItems .loot-entry')
    .filter({hasText:'Pipe SMG'}).first().getByRole('button',{name:'EQUIP'}).click();
  const equipped=await page.evaluate(()=>window.__rpgSmokeState());
  assert.equal(equipped.inventory.armor[testArmor.slot],testArmor.key);
  assert.equal(equipped.inventory.equippedWeapon,'pipe-smg');
  await page.locator('#inventoryClose').click();
  // Regression: restored non-default weapons previously called selectWeapon()
  // before slideCycle/shotNoticeTime/weaponMotion had initialized, crashing
  // the page only for returning players with a saved inventory.
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>
    window.__rpgSmokeState?.().weapon?.id==='pipe-smg',
    null,{timeout:30000});
  const restoredInventory=await page.evaluate(()=>window.__rpgSmokeState());
  assert.equal(restoredInventory.inventory.equippedWeapon,'pipe-smg');
  assert.equal(restoredInventory.inventory.armor[testArmor.slot],testArmor.key);
  assert.equal(await page.locator('#fatal').evaluate(el=>
    getComputedStyle(el).display),'none',
    'Saved player weapon must not cause a startup exception');
  // W07: craft a genuine 4× rifle optic from backpack materials in the UI,
  // verify it survives a reload rather than becoming a temporary HUD label.
  await page.evaluate(()=>window.__rpgSmokeGiveBenchMaterials());
  await page.locator('#workbenchOpen').click();
  await page.waitForSelector('#workbenchPanel:not(.hidden)',{timeout:7000});
  await page.locator('#benchWeapon').selectOption('hunting-rifle');
  assert.ok((await page.locator('#benchMaterials').textContent()).includes('OPTIC GLASS'));
  await page.locator('#benchOptics .loot-entry').filter({hasText:'Marksman scope'})
    .getByRole('button',{name:'CRAFT + INSTALL'}).click();
  assert.equal((await page.locator('#benchOptics .loot-entry')
    .filter({hasText:'Marksman scope'}).textContent()).includes('INSTALLED'),true);
  await page.locator('#benchClose').click();
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__rpgSmokeState?.().enemies?.length===3,
    null,{timeout:30000});
  await page.locator('#workbenchOpen').click();
  await page.locator('#benchWeapon').selectOption('hunting-rifle');
  assert.ok((await page.locator('#benchOptics .loot-entry')
    .filter({hasText:'Marksman scope'}).textContent()).includes('INSTALLED'),
    'Crafted scope must survive page reload');
  await page.locator('#benchClose').click();
  // W06.5: visible armor must exactly match the real equipped slots.
  const gearInitial=await page.evaluate(()=>window.__rpgSmokeState().enemies);
  for(const enemy of gearInitial){
    for(const [slot,id] of Object.entries(enemy.armor))
      assert.equal(enemy.armorVisible[slot],id!=='none',
        enemy.id+' should render armor consistently on '+slot);
  }
  // The neck hitbox and remote-death regression must still work.
  assert.equal(await page.evaluate(()=>window.__rpgSmokeNeckHit()),'chest',
    'A neck shot must intersect an NPC hitbox');
  await page.locator('#enterAI').click();
  await page.waitForFunction(()=>window.__rpgSmokeState().locked,
    null,{timeout:7000});
  // This is the actual camera's FOV, not a CSS-only scope overlay.
  await page.evaluate(()=>{
    const select=document.getElementById('weaponSelect');
    select.value='hunting-rifle';
    select.dispatchEvent(new Event('change',{bubbles:true}));
    window.dispatchEvent(new MouseEvent('mousedown',{button:2,bubbles:true}));
  });
  await page.waitForFunction(()=>window.__rpgSmokeState().scopedFOV<35,
    null,{timeout:20000});
  const zoomed=await page.evaluate(()=>window.__rpgSmokeState());
  assert.equal(zoomed.optic,'scope-4x');
  assert.equal(zoomed.weapon.id,'hunting-rifle');
  await page.evaluate(()=>window.dispatchEvent(new MouseEvent('mouseup',{button:2,bubbles:true})));
  await page.keyboard.press('j');
  const gearAfterReset=await page.evaluate(()=>window.__rpgSmokeState().enemies);
  assert.notDeepEqual(gearAfterReset.map(e=>e.armor),gearInitial.map(e=>e.armor),
    'J reset should rotate each enemy into a new visible armor outfit');
  for(const enemy of gearAfterReset){
    for(const [slot,id] of Object.entries(enemy.armor))
      assert.equal(enemy.armorVisible[slot],id!=='none');
  }
  assert.equal(await page.evaluate(()=>window.__rpgSmokeMoveOutsideArena()),true);
  const distantStart=await page.evaluate(()=>window.__rpgSmokeState());
  assert.equal(distantStart.aiEnabled,true,'AI must be enabled for patrol test');
  assert.equal(distantStart.locked,true,'Player must retain pointer lock');
  assert.ok(distantStart.playerHealth>0,'Player must be alive for AI testing');
  // SwiftShader can render only a couple of frames per second in CI. Wait
  // for real simulation distance rather than an unreliable wall-clock pause.
  await page.waitForFunction(start=>{
    const now=window.__rpgSmokeState().enemies;
    return now.some((e,i)=>Math.hypot(e.x-start[i].x,e.z-start[i].z)>.08);
  },distantStart.enemies,{timeout:25000});
  assert.equal(await page.evaluate(()=>window.__rpgSmokeDownEnemy('scout')),true);
  assert.equal((await page.evaluate(()=>window.__rpgSmokeState())).enemies
    .find(e=>e.id==='scout').flash,0,
    'Defeated enemies must immediately clear the red hit flash');
  await page.waitForFunction(()=>window.__rpgSmokeState().enemies
    .find(e=>e.id==='scout').visible===false,
    null,{timeout:20000});
  // W06.7: a hit from outside the arena must wake AI return fire past 14 m.
  const distantEngage=await page.evaluate(()=>window.__rpgSmokeLongRangeEngage());
  assert.equal(distantEngage.insideArena,false);
  assert.ok(distantEngage.distance>25&&distantEngage.distance<37);
  await page.waitForFunction(()=>window.__rpgSmokeState().enemies
    .find(e=>e.id==='raider').enemyShots>0,
    null,{timeout:25000});
  assert.equal(errors.length,0,
    'No runtime JavaScript/WebGL errors allowed: '+errors.join('; '));
  console.log(JSON.stringify({
    smoke:'PASS',aiMoved:true,scoutHealthBefore:initialHp,
    scoutHealthAfter:scoutHealth,enemies:result.enemies.length,
    heldEmptyClicks:emptyB.dryFireClicks,secondPullClicks:second.dryFireClicks,
    smgAfterReloadMagazine:recovered.weapon.magazine,
    lootPickup:true,equippedArmor:equipped.inventory.armor[testArmor.slot],
    equippedWeapon:equipped.inventory.equippedWeapon
  }));
  await page.close();
}finally{
  await browser?.close();
  await new Promise(ok=>server.close(ok));
}
