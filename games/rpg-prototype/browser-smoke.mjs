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
  // W13.0: the field HUD replaces the old debug wall by default.
  assert.equal(state.hud.mode,'field');
  assert.equal(state.hud.fieldVisible,true);
  assert.equal(state.hud.visorVisible,false);
  assert.equal(state.hud.debug,false);
  assert.equal(state.hud.fieldAmmo,await page.locator('#weaponAmmo').textContent());
  // W14.0: real seven-branch SPECIAL interface, purchases and save data.
  assert.equal(state.special.attributes.strength,3);
  assert.equal(state.special.statPoints,5);
  assert.equal(await page.locator('#specialGrid .special-branch').count(),7);
  await page.keyboard.press('l');
  await page.locator('#specialPanel:not(.hidden)').waitFor();
  await page.getByRole('button',{name:'Increase STRENGTH'}).click();
  await page.locator('#specialGrid .special-branch').first()
    .locator('button.special-perk').first().click();
  let progressed=await page.evaluate(()=>window.__rpgSmokeState().special);
  assert.equal(progressed.attributes.strength,4);
  assert.equal(progressed.perks['steady-grip'],1);
  assert.equal(progressed.statPoints,4);
  assert.equal(progressed.perkPoints,1);
  assert.ok(progressed.bonuses.recoilMultiplier<1);
  await page.keyboard.press('Escape');
  await page.locator('#specialPanel').waitFor({state:'hidden'});
  // W09.9: the actual Three.js lab's tall maze wall must obstruct both
  // enemy damage and the visible bullet tracer. A higher shot clears it.
  const wallBlock=await page.evaluate(()=>
    window.__rpgSmokeShotBlock({x:-22,y:1.43,z:32},{x:-14,y:1.52,z:32}));
  assert.ok(wallBlock&&wallBlock.t<1,
    'Solid maze wall must stop an NPC tracer before reaching a player');
  const aboveWall=await page.evaluate(()=>
    window.__rpgSmokeShotBlock({x:-22,y:3.2,z:32},{x:-14,y:3.2,z:32}));
  assert.equal(aboveWall,null,'Shots above the wall should remain clear');
  // W09.10: real browser modules must not track moving hidden coordinates,
  // and an old defensive hold must not stop the last-known-location search.
  const occluded=await page.evaluate(()=>
    window.__rpgSmokeOccludedPursuit());
  assert.ok(occluded.hiddenFrames>5,'Fixture must remain behind an opaque wall');
  assert.equal(occluded.stuckHolds,0,'Lost-sight AI may not hold or crouch in place');
  assert.ok(occluded.nearest<.7,'NPC must visit the place it last saw the player');
  assert.deepEqual(occluded.lastSeen,{x:43,z:40},
    'Moving behind a wall must not update the last known position');
  // The ordinary survivor must have no headwear, pack or visible armor.
  assert.deepEqual(state.playerVisual.clothing,{head:'none',back:'none'});
  assert.deepEqual(state.playerVisual.visibleClothing,{head:false,back:false});
  assert.equal(Object.values(state.playerVisual.armorPieces).reduce(
    (a,b)=>a+b,0),0);
  // W09.14 browser integration: real NPC gun damage and armor protection.
  const balance=await page.evaluate(()=>{
    const scenarios={};
    for(const id of ['compact-smg','scout-carbine','pipe-rifle',
      'raider-auto','heavy-rifle','heavy-lmg']){
      scenarios[id]={
        naked:window.__rpgSmokeIncomingDamage(id,'none',false),
        regular:window.__rpgSmokeIncomingDamage(id,'aegis',false),
        powered:window.__rpgSmokeIncomingDamage(id,'aegis',true)
      };
    }
    return scenarios;
  });
  for(const [id,b] of Object.entries(balance)){
    assert.ok(b.naked.damage>=8,id+' unarmored damage');
    assert.ok(b.regular.damage>=2.5,id+' top armor must not make hits harmless');
    assert.ok(b.regular.damage<b.naked.damage);
    assert.ok(Math.abs(b.regular.damage-
      b.naked.damage*(1-b.regular.regularReduction))<1e-9,
      id+' armor must block the equipped percentage');
    assert.ok(b.powered.damage<b.regular.damage);
    assert.ok(b.powered.combinedReduction>=.85);
  }
  // W09.6: all three on-screen NPCs are our own pixel-textured models.
  // Their six cosmetic armor slots must track the authoritative loadout.
  for(const enemy of state.enemies){
    assert.equal(enemy.modelStatus,'original');
    assert.equal(enemy.originalVisual.type,enemy.id);
    assert.equal(enemy.originalVisual.model,'OriginalNpc_'+enemy.id);
    assert.ok(enemy.modelHeight>=1.7&&enemy.modelHeight<=2.15,
      enemy.id+' needs a normal human-size original model');
    assert.equal(enemy.legacyRenderMeshes,0,
      enemy.id+' old collision mannequin must never render');
    assert.equal(enemy.avatarRoots,1,
      enemy.id+' must have exactly one world-space visible avatar');
    assert.equal(enemy.legacyGroupVisible,false,
      enemy.id+' old physics body must stay invisible as a group');
    assert.ok(Math.abs(enemy.visualLocalYaw-Math.PI)<1e-6,
      enemy.id+' model must look in AI +Z forward direction');
    assert.ok(enemy.weaponRpm>100&&enemy.weaponRpm<1600,
      enemy.id+' must have an actual firearm RPM');
    for(const [slot,id] of Object.entries(enemy.armor)){
      assert.equal(enemy.originalVisual.equipped[slot],id);
      assert.equal(enemy.originalVisual.armorPieces[slot]>0,id!=='none',
        enemy.id+' equipped '+slot+' must match its visible plates');
    }
  }
  await page.locator('#enterAI').click();
  await page.waitForFunction(()=>window.__rpgSmokeState().locked,
    {timeout:7000});
  const before=await page.evaluate(()=>window.__rpgSmokeState());
  await page.waitForTimeout(1400);
  const after=await page.evaluate(()=>window.__rpgSmokeState());
  const moved=after.enemies.some((e,i)=>
    Math.hypot(e.x-before.enemies[i].x,e.z-before.enemies[i].z)>.08);
  assert.ok(moved,'At least one live AI must physically move in the arena');
  for(const enemy of after.enemies){
    assert.ok(Number.isFinite(enemy.pace)&&enemy.pace>=0,
      'Each NPC must have an actual tactical walk/run speed');
    assert.equal(typeof enemy.decision,'string');
    if(enemy.crouching)assert.ok(enemy.coverPoint,
      'A crouching NPC must occupy an actual cover position');
  }
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
    // Software WebGL can render fewer than four frames per second on CI.
    // Force the regular cooldown to finish between test attempts so a
    // missed random-spread shot does not leave six ignored clicks.
    await page.evaluate(()=>{
      const s=window.__rpgSmokeState();
      window.__rpgSmokeSetMagazine(s.weapon.magazine);
    });
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
  const dropped=gearLoot.loot.find(b=>b.id===lootId).items.filter(e=>e.itemId.startsWith('armor:'))
    .map(e=>e.itemId.slice(6)).sort();
  assert.ok(dropped.length>=1&&dropped.length<=2,
    'Raiders should drop only one or two armor pieces');
  assert.ok(dropped.length<worn.length,
    'A raider must not drop their whole equipped suit');
  assert.ok(dropped.every(id=>worn.includes(id)),
    'Every dropped armor item must actually be worn by the NPC');
  const testArmor=getItem('armor:'+dropped[0]);
  const nearby=await page.evaluate(id=>window.__rpgSmokeApproachLoot(id),lootId);
  assert.equal(nearby,true);
  await page.keyboard.press('e');
  await page.waitForSelector('#lootPanel:not(.hidden)',{timeout:7000});
  assert.ok(await page.locator('#lootItems .loot-entry').count()>=3);
  await page.locator('#lootTakeAll').click();
  const inventoryAfterLoot=await page.evaluate(()=>window.__rpgSmokeState());
  assert.equal(inventoryAfterLoot.loot.some(b=>b.id===lootId),false,
    'A fully looted enemy bag must disappear from the 3D world');
  assert.ok(inventoryAfterLoot.inventory.items.some(i=>
    i.itemId===testArmor.id));
  assert.ok(inventoryAfterLoot.inventory.ammoReserves['pipe-smg']>150,
    'Taking a loot bag automatically transfers its ammunition to the SMG reserve');
  assert.equal(inventoryAfterLoot.inventory.items.some(i=>
    i.itemId.startsWith('ammo:')),false,'Ammo cannot crowd the backpack');
  await page.locator('#lootClose').click();
  await page.waitForFunction(()=>window.__rpgSmokeState().locked,
    null,{timeout:7000});
  // W07.1: Taking a second identical gun from another kill is valid.
  const firstCopies=inventoryAfterLoot.inventory.items.filter(
    i=>i.itemId==='weapon:pipe-smg');
  assert.equal(firstCopies.length,1);
  const secondLootId=await page.evaluate(()=>window.__rpgSmokeSpawnLoot('raider'));
  assert.equal(await page.evaluate(id=>window.__rpgSmokeApproachLoot(id),secondLootId),true);
  await page.keyboard.press('e');
  await page.waitForSelector('#lootPanel:not(.hidden)',{timeout:7000});
  await page.locator('#lootItems .loot-entry').filter({hasText:'Pipe SMG'})
    .first().getByRole('button',{name:'TAKE'}).click();
  const duplicateInventory=await page.evaluate(()=>window.__rpgSmokeState());
  assert.equal(duplicateInventory.inventory.items.filter(
    i=>i.itemId==='weapon:pipe-smg').length,2,
    'A second identical Pipe SMG must enter a separate backpack slot');
  assert.ok((await page.locator('#lootFeedback').textContent()).includes('2 COPIES'),
    'The player should see explicit duplicate-loot confirmation');
  await page.locator('#lootClose').click();
  await page.waitForFunction(()=>window.__rpgSmokeState().locked,
    null,{timeout:7000});
  await page.evaluate(()=>window.__rpgSmokeGiveBenchMaterials());
  await page.keyboard.press('i');
  await page.waitForSelector('#inventoryPanel:not(.hidden)',{timeout:7000});
  assert.equal(await page.locator('#inventoryItems .loot-description strong')
    .getByText('Pipe SMG',{exact:true}).count(),2);
  assert.ok((await page.locator('#inventoryItems').textContent()).includes('COPY 2 / 2'));
  // W09.8: navigate a real two-panel categorized inventory without losing gear.
  assert.equal(await page.locator('#inventoryCategories button').count(),8);
  await page.locator('#inventoryCategories button[data-category="junk"]').click();
  assert.ok((await page.locator('#inventoryItems').textContent()).includes('Salvaged Parts'));
  assert.equal(await page.locator('#inventoryItems').getByText('Pipe SMG',{exact:true}).count(),0);
  await page.locator('#inventoryCategories button[data-category="quest"]').click();
  assert.ok((await page.locator('#inventoryItems').textContent()).includes('NO QUEST ITEMS YET'));
  await page.locator('#inventoryCategories button[data-category="weapon"]').click();
  assert.ok((await page.locator('#inventoryAmmo').textContent()).includes('AMMO RESERVES'));
  await page.locator('#inventoryCategories button[data-category="all"]').click();
  await page.locator('#inventoryItems .loot-entry')
    .filter({hasText:testArmor.name}).getByRole('button',{name:'EQUIP'}).click();
  await page.locator('#inventoryItems .loot-entry')
    .filter({hasText:'Pipe SMG'}).first().getByRole('button',{name:'EQUIP'}).click();
  const equipped=await page.evaluate(()=>window.__rpgSmokeState());
  assert.equal(equipped.inventory.armor[testArmor.slot],testArmor.key);
  // Ordinary inventory armor must actually drive visible mesh layers on
  // our original player, not just an invisible damage-reduction number.
  await page.waitForFunction(piece=>{
    const visual=window.__rpgSmokeState().playerVisual;
    return visual.armor[piece.slot]===piece.key&&
      visual.armorPieces[piece.slot]>0;
  },{slot:testArmor.slot,key:testArmor.key},{timeout:12000});
  assert.equal(equipped.inventory.equippedWeapon,'pipe-smg');
  // W09.7: Raider loot supplies a wearable canvas backpack. Equipping and
  // removing it must actually toggle the animated model, not just a label.
  let packRow=page.locator('#inventoryItems .loot-entry')
    .filter({hasText:'Canvas Field Backpack'});
  assert.equal(await packRow.count(),1);
  await packRow.getByRole('button',{name:'EQUIP'}).click();
  await page.waitForFunction(()=>{
    const p=window.__rpgSmokeState().playerVisual;
    return p.clothing.back==='field-backpack'&&p.visibleClothing.back;
  },null,{timeout:12000});
  packRow=page.locator('#inventoryItems .loot-entry')
    .filter({hasText:'Canvas Field Backpack'});
  await packRow.getByRole('button',{name:'UNEQUIP'}).click();
  await page.waitForFunction(()=>{
    const p=window.__rpgSmokeState().playerVisual;
    return p.clothing.back==='none'&&!p.visibleClothing.back;
  },null,{timeout:12000});
  packRow=page.locator('#inventoryItems .loot-entry')
    .filter({hasText:'Canvas Field Backpack'});
  await packRow.getByRole('button',{name:'EQUIP'}).click();
  await page.waitForFunction(()=>window.__rpgSmokeState().playerVisual
    .visibleClothing.back,null,{timeout:12000});
  // W08.4: a partial stack drop must reduce the backpack by exactly the
  // chosen count and spawn world loot with that same quantity.
  const salvageBefore=(await page.evaluate(()=>window.__rpgSmokeState()))
    .inventory.items.find(i=>i.itemId==='supply:salvage').quantity;
  assert.ok(salvageBefore>=7);
  let salvageRow=page.locator('#inventoryItems .loot-entry')
    .filter({hasText:'Salvaged Parts'});
  await salvageRow.locator('input.drop-amount').fill('7');
  await salvageRow.getByRole('button',{name:'DROP'}).click();
  const afterPartial=await page.evaluate(()=>window.__rpgSmokeState());
  assert.equal(afterPartial.inventory.items.find(
    i=>i.itemId==='supply:salvage').quantity,salvageBefore-7);
  assert.ok(afterPartial.loot.some(b=>b.source==='player-drop'&&
    b.items.some(i=>i.itemId==='supply:salvage'&&i.quantity===7)),
    'Only the seven selected salvage pieces should appear in world loot');
  salvageRow=page.locator('#inventoryItems .loot-entry')
    .filter({hasText:'Salvaged Parts'});
  await salvageRow.locator('input.drop-amount').fill('999');
  await salvageRow.getByRole('button',{name:'DROP'}).click();
  assert.equal((await page.evaluate(()=>window.__rpgSmokeState()))
    .inventory.items.find(i=>i.itemId==='supply:salvage').quantity,salvageBefore-7,
    'Invalid drop counts must leave the backpack unchanged');
  await salvageRow.getByRole('button',{name:'MAX'}).click();
  assert.equal(await salvageRow.locator('input.drop-amount').inputValue(),String(salvageBefore-7));
  await salvageRow.getByRole('button',{name:'DROP'}).click();
  assert.ok(!(await page.evaluate(()=>window.__rpgSmokeState()))
    .inventory.items.some(i=>i.itemId==='supply:salvage'),
    'MAX must drop only the remaining count in this stack');
  // Even a four-digit reserve renders as 999+, while storing the real total.
  const beforeAmmo=(await page.evaluate(()=>window.__rpgSmokeState()))
    .inventory.ammoReserves['pipe-smg'];
  await page.evaluate(()=>window.__rpgSmokeGiveAmmo('pipe-smg',1200));
  assert.equal((await page.evaluate(()=>window.__rpgSmokeState()))
    .inventory.ammoReserves['pipe-smg'],beforeAmmo+1200);
  assert.ok((await page.locator('#weaponAmmo').textContent()).includes('999+'));
  assert.equal((await page.evaluate(()=>window.__rpgSmokeState()))
    .inventory.items.some(e=>e.itemId.startsWith('ammo:')),false);
  await page.locator('#inventoryClose').click();
  await page.waitForFunction(()=>window.__rpgSmokeState().locked,
    null,{timeout:10000});
  // Regression: restored non-default weapons previously called selectWeapon()
  // before slideCycle/shotNoticeTime/weaponMotion had initialized, crashing
  // the page only for returning players with a saved inventory.
  // W09.5: a separate remote survivor remains visible in both local views.
  const remoteBefore=await page.evaluate(()=>window.__rpgSmokeState().remotePreview);
  assert.equal(remoteBefore.visible,true,'Other player must render in first-person');
  assert.ok(remoteBefore.armorPieces.chest>0,
    'Remote chest armor must mount on the remote body');
  // W09.3: the original player body renders in third-person without
  // changing the authoritative first-person combat camera.
  await page.keyboard.press('v');
  await page.waitForFunction(()=>{
    const p=window.__rpgSmokeState().playerVisual;
    return p.thirdPersonActive&&p.visible;
  },null,{timeout:12000});
  const third=await page.evaluate(()=>window.__rpgSmokeState());
  assert.equal(third.playerVisual.name,'OriginalPixelSurvivor');
  assert.equal(third.playerVisual.visibleClothing.back,true,
    'Equipped backpack must appear on third-person survivor');
  assert.equal(third.playerVisual.armor[testArmor.slot],testArmor.key);
  assert.ok(third.playerVisual.armorPieces[testArmor.slot]>0,
    'Equipped ordinary armor must render on the third-person survivor');
  assert.equal(third.remotePreview.visible,true,
    'Switching V must never hide the other survivor');
  await page.evaluate(()=>window.__rpgSmokeSetRemotePreviewArmor('chest','none'));
  await page.waitForFunction(()=>{
    const v=window.__rpgSmokeState().remotePreview;
    return v.armor.chest==='none'&&v.armorPieces.chest===0;
  },null,{timeout:12000});
  await page.evaluate(()=>window.__rpgSmokeSetRemotePreviewArmor('chest','citadel-chest'));
  await page.waitForFunction(()=>{
    const v=window.__rpgSmokeState().remotePreview;
    return v.armor.chest==='citadel-chest'&&v.armorPieces.chest>0;
  },null,{timeout:12000});
  assert.ok(third.playerVisual.height>1.6&&third.playerVisual.height<2.05,
    'Standing player model must remain near human height');
  await page.keyboard.press('c');
  await page.waitForFunction(()=>window.__rpgSmokeState().playerVisual.crouch>.65,
    null,{timeout:12000});
  await page.keyboard.press('c');
  await page.keyboard.press('v');
  await page.waitForFunction(()=>!window.__rpgSmokeState().playerVisual.thirdPersonActive,
    null,{timeout:12000});
  assert.equal((await page.evaluate(()=>window.__rpgSmokeState())).remotePreview.visible,true,
    'The remote model stays visible when the local player returns to first-person');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>
    window.__rpgSmokeState?.().weapon?.id==='pipe-smg',
    null,{timeout:30000});
  const restoredInventory=await page.evaluate(()=>window.__rpgSmokeState());
  assert.equal(restoredInventory.special.attributes.strength,4);
  assert.equal(restoredInventory.special.perks['steady-grip'],1,
    'SPECIAL attribute purchases and perk ranks survive a reload');
  assert.equal(restoredInventory.special.statPoints,4);
  assert.equal(restoredInventory.inventory.equippedWeapon,'pipe-smg');
  assert.equal(restoredInventory.inventory.ammoReserves['pipe-smg'],beforeAmmo+1200,
    'The true reserve survives a reload, not a capped 999 value');
  assert.equal(restoredInventory.inventory.items.filter(
    i=>i.itemId==='weapon:pipe-smg').length,2,
    'Duplicate weapons must survive loading a saved game');
  assert.equal(restoredInventory.inventory.armor[testArmor.slot],testArmor.key);
  assert.equal(restoredInventory.inventory.clothing.back,'field-backpack',
    'Backpack gear must persist after reload');
  await page.waitForFunction(()=>window.__rpgSmokeState().playerVisual
    .visibleClothing.back,null,{timeout:12000});
  assert.equal(await page.locator('#fatal').evaluate(el=>
    getComputedStyle(el).display),'none',
    'Saved player weapon must not cause a startup exception');
  // W07: craft a genuine 4× rifle optic from backpack materials in the UI,
  // verify it survives a reload rather than becoming a temporary HUD label.
  await page.evaluate(()=>window.__rpgSmokeGiveBenchMaterials());
  await page.locator('#workbenchOpen').click();
  await page.waitForSelector('#workbenchPanel:not(.hidden)',{timeout:7000});
  await page.locator('#benchWeapon').selectOption('service-carbine');
  await page.locator('#benchOptics .loot-entry').filter({hasText:'Holo A'})
    .getByRole('button',{name:'CRAFT + INSTALL'}).click();
  assert.deepEqual(await page.evaluate(()=>
    window.__rpgSmokeSightVisual('service-carbine')),
    {variant:'holo-a',count:1},
    'NATO Holo A must have its own actual 3D sight housing');
  await page.locator('#benchOptics .loot-entry').filter({hasText:'Holo B'})
    .getByRole('button',{name:'CRAFT + INSTALL'}).click();
  assert.deepEqual(await page.evaluate(()=>
    window.__rpgSmokeSightVisual('service-carbine')),
    {variant:'holo-b',count:1},
    'Russian Holo B must replace Holo A with distinct actual geometry');
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
  for(const enemy of gearAfterReset){
    for(const [slot,id] of Object.entries(enemy.armor)){
      assert.equal(enemy.originalVisual.equipped[slot],id,
        'NPC armor must re-render after J reset');
      assert.equal(enemy.originalVisual.armorPieces[slot]>0,id!=='none');
    }
  }
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
  // W08.3: ensure the redesigned shell, human pilot and actual cinematic entry render.
  assert.equal(await page.evaluate(()=>window.__rpgSmokeTeleportToPowerBay()),true);
  const bareArm=await page.evaluate(()=>window.__rpgSmokePowerVisual());
  assert.equal(bareArm.visiblePlates.rightArm,0,'Starter T-45 must have no right arm plate');
  assert.equal(bareArm.moduleSections.rightArm,0,
    'An empty arm slot must show exposed frame, not old permanently armored mesh');
  assert.ok(bareArm.moduleSections.leftArm>0,'The fitted left arm must retain its armor');
  assert.equal(bareArm.frameFeatures.rearHatch,true,'Frame must have an actual rear cage');
  assert.ok(bareArm.frameFeatures.torsoRibs>=4,'The torso needs a continuous mechanical ribcage');
  assert.ok(bareArm.frameFeatures.armLinks>=18,
    'Both skeletal arms must have elbow-to-wrist connections independent of armor');
  assert.ok(bareArm.frameFeatures.legLinks>=14,
    'Both skeletal legs require complete actuator linkages');
  assert.equal(bareArm.rearHatchInReach,true,
    'Station 8 must place the tester behind the frame, ready to climb in');
  assert.equal(await page.evaluate(()=>window.__rpgSmokeApproachPowerCache()),true);
  await page.keyboard.press('e');
  await page.waitForSelector('#lootPanel:not(.hidden)',{timeout:10000});
  await page.locator('#lootTakeAll').click();
  await page.locator('#lootClose').click();
  await page.waitForFunction(()=>window.__rpgSmokeState().locked,
    null,{timeout:10000});
  assert.equal(await page.evaluate(()=>window.__rpgSmokeTeleportToPowerBay()),true);
  await page.keyboard.press('e');
  await page.waitForSelector('#powerArmorPanel:not(.hidden)',{timeout:10000});
  await page.locator('#power-head').selectOption('remove');
  assert.equal((await page.evaluate(()=>window.__rpgSmokePowerVisual())).moduleSections.head,0,
    'Taking off a helmet must expose the actual frame collar');
  assert.ok((await page.evaluate(()=>window.__rpgSmokeState())).inventory.items
    .some(e=>e.itemId==='power-plate:t45-head'),
    'Removed armor is a real preserved inventory item');
  const helmetChoice=await page.locator('#power-head option')
    .filter({hasText:'T-60'}).getAttribute('value');
  const armChoice=await page.locator('#power-rightArm option')
    .filter({hasText:'T-45'}).getAttribute('value');
  assert.ok(helmetChoice&&armChoice,'salvaged modular plates should be owned');
  await page.locator('#power-head').selectOption(helmetChoice);
  await page.locator('#power-rightArm').selectOption(armChoice);
  await page.locator('#powerInsertCore').click();
  assert.ok((await page.locator('#powerCoreStatus').textContent()).includes('100%'));
  assert.ok((await page.locator('#power-rating-head').textContent()).includes('57 AP'));
  const fitted=await page.evaluate(()=>window.__rpgSmokeState().powerArmor);
  assert.equal(fitted.plates.head,'t60');
  assert.equal(fitted.plates.rightArm,'t45');
  assert.ok(fitted.plateDurability.head>0);
  assert.ok(fitted.coreCharge>0);
  const armorVisible=await page.evaluate(()=>window.__rpgSmokePowerVisual());
  assert.ok(armorVisible.chassisHeight>2.65&&armorVisible.chassisHeight<3.15,
    'Power armor must be human-sized, not a towering construction robot');
  assert.ok(armorVisible.chassisWidth>2.1&&armorVisible.chassisWidth<3.1,
    'Armored shoulders should be broad but remain human-proportioned');
  assert.equal(armorVisible.visiblePlates.head,2,'Helmet and visor pieces must appear');
  assert.equal(armorVisible.modelDetails.head.t60,true,'T-60 head has its own geometry');
  assert.equal(armorVisible.modelDetails.rightArm.t45,true,'T-45 arm style is visible');
  assert.equal(armorVisible.plateAppearance.head.color,0x4f7585,
    'T-60 should use its own blue-steel pigment');
  assert.equal(armorVisible.plateAppearance.rightArm.color,0xb1a48b,
    'T-45 should use warm cast-steel coloring');
  assert.notDeepEqual(armorVisible.modelContours.t45,armorVisible.modelContours.t60,
    'T-45 rounded plates and T-60 flared plates need different 3D outlines');
  assert.notDeepEqual(armorVisible.modelContours.t60,armorVisible.modelContours.t01,
    'T-01 angular plates require a distinct faceted silhouette');
  assert.equal(armorVisible.plateAppearance.head.contour,'ExtrudeGeometry');
  assert.ok(armorVisible.moduleSections.rightArm>0,'Installing the right arm adds its armor shell');
  assert.ok(armorVisible.moduleSections.head>0,'Installing the helmet restores its armor shell');
  assert.equal(armorVisible.visiblePlates.leftLeg,2,'Only the fitted leg gets its plates');
  await page.locator('#powerBayClose').click();
  await page.waitForFunction(()=>window.__rpgSmokeState().locked,
    null,{timeout:10000});
  await page.keyboard.down('e');
  await page.waitForFunction(()=>window.__rpgSmokeState().powerArmor.phase==='entering',
    null,{timeout:10000});
  await page.keyboard.up('e');
  await page.evaluate(()=>window.__rpgSmokeSetPowerProgress(.5));
  await page.waitForFunction(()=>window.__rpgSmokePowerVisual().pilotModel===
    'OriginalPixelSurvivor',null,{timeout:12000});
  const pilotWithArmor=await page.evaluate(()=>window.__rpgSmokePowerVisual());
  assert.equal(pilotWithArmor.pilotArmor[testArmor.slot],testArmor.key,
    'Power-armor entry must use the same equipped ordinary armor');
  await page.waitForFunction(()=>{
      const v=window.__rpgSmokePowerVisual();
      return Math.abs(v.rearHatchOpenAngle)>.4 && v.pilotVisible &&
        v.pilotDepth<-.65 && v.pilotDepth>-1.9 &&
        v.cinematic && v.cameraDistanceToHero<.8;
    },null,{timeout:15000});
  await page.evaluate(()=>window.__rpgSmokeCompletePowerTransition());
  await page.waitForFunction(()=>window.__rpgSmokeState().powerArmor.occupied,
    null,{timeout:15000});
  const inSuit=await page.evaluate(()=>window.__rpgSmokeState().powerArmor);
  assert.equal(inSuit.visible,false,'Chassis is worn, not duplicated in the bay');
  assert.equal(inSuit.cockpit,true,'Power armor cockpit must appear in first person');
  await page.waitForFunction(()=>window.__rpgSmokeState().hud.mode==='visor',
    null,{timeout:10000});
  const activeHud=(await page.evaluate(()=>window.__rpgSmokeState())).hud;
  assert.equal(activeHud.visorVisible,true,'Power armor must activate the full visor');
  assert.equal(activeHud.fieldVisible,false,'Field vitals must be replaced by visor vitals');
  assert.ok(activeHud.core.includes('%'),'Visor reactor gauge must display live charge');
  assert.ok(activeHud.integrity.includes('%'),'Visor tracks module condition');
  assert.equal(activeHud.visorAmmo,await page.locator('#weaponAmmo').textContent());
  await page.waitForFunction(()=>{
    const s=window.__rpgSmokeState();
    const h=window.__rpgSmokePowerVisual().cameraHeightAboveGround;
    return !s.player.crouched&&h>1.62&&h<2.0;
  },null,{timeout:12000});
  // The old suit hard-coded 2.82m every frame, so C and CTRL looked broken.
  await page.keyboard.press('c');
  await page.waitForFunction(()=>{
    const s=window.__rpgSmokeState();
    return s.player.crouched &&
      window.__rpgSmokePowerVisual().cameraHeightAboveGround<1.42;
  },null,{timeout:12000});
  await page.keyboard.press('c');
  await page.waitForFunction(()=>{
    const s=window.__rpgSmokeState();
    const h=window.__rpgSmokePowerVisual().cameraHeightAboveGround;
    return !s.player.crouched && h>1.62&&h<2.0;
  },null,{timeout:12000});
  await page.keyboard.down('e');
  await page.waitForFunction(()=>window.__rpgSmokeState().powerArmor.phase==='exiting',
    null,{timeout:10000});
  await page.keyboard.up('e');
  await page.evaluate(()=>window.__rpgSmokeSetPowerProgress(.5));
  await page.waitForFunction(()=>window.__rpgSmokePowerVisual().pilotVisible &&
    window.__rpgSmokePowerVisual().pilotDepth<-.65,
    null,{timeout:15000});
  await page.evaluate(()=>window.__rpgSmokeCompletePowerTransition());
  await page.waitForFunction(()=>window.__rpgSmokeState().powerArmor.phase==='idle'&&
    !window.__rpgSmokeState().powerArmor.occupied,null,{timeout:15000});
  const outSuit=await page.evaluate(()=>window.__rpgSmokeState().powerArmor);
  assert.equal(outSuit.visible,true,'Exited power armor remains a world-space mesh');
  assert.equal(outSuit.cockpit,false);
  await page.waitForFunction(()=>window.__rpgSmokeState().hud.mode==='field'&&
    window.__rpgSmokeState().hud.fieldVisible&&
    !window.__rpgSmokeState().hud.visorVisible,null,{timeout:10000});
  await page.keyboard.press('F3');
  assert.equal((await page.evaluate(()=>window.__rpgSmokeState())).hud.debug,true,
    'F3 should reveal the detailed lab diagnostics');
  await page.keyboard.press('F3');
  assert.equal((await page.evaluate(()=>window.__rpgSmokeState())).hud.debug,false);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__rpgSmokeState?.().powerArmor?.plates?.head==='t60',
    null,{timeout:30000});
  const restoredPower=(await page.evaluate(()=>window.__rpgSmokeState())).powerArmor;
  assert.equal(restoredPower.plates.rightArm,'t45','Salvaged arm persists across reload');
  assert.ok(restoredPower.coreCharge>0,'Inserted fusion core charge persists');
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
