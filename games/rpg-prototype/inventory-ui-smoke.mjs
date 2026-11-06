// Auth-safe QA: test GAMESHUB inventory from the checked-out source, never production.
/* Run: npm install --no-save playwright-core three@0.180.0
        node games/rpg-prototype/inventory-ui-smoke.mjs */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {existsSync} from 'node:fs';
import {chromium} from 'playwright-core';
import {initialCampaignState} from './campaign.mjs';
import {getItem} from './inventory.mjs';

const root=process.cwd();
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript',
  '.png':'image/png','.json':'application/json'};
const server=createServer(async(req,res)=>{
  try{
    let pathname=new URL(req.url,'http://localhost').pathname;
    if(pathname.endsWith('/'))pathname+='index.html';
    const file=resolve(root,'.'+pathname);
    if(!file.startsWith(root+sep)||(await stat(file)).isFile()!==true)
      throw Error('invalid file');
    let body=await readFile(file);
    if(pathname.endsWith('/games/rpg-prototype/testing/index.html')){
      body=Buffer.from(body.toString()
        .replace('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js',
          '/node_modules/three/build/three.module.js')
        .replace('https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/',
          '/node_modules/three/examples/jsm/'));
    }
    res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream',
      'Cache-Control':'no-store'});
    res.end(body);
  }catch(error){res.writeHead(404);res.end(String(error));}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const port=server.address().port;
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable',
  '/usr/bin/chromium','/usr/bin/chromium-browser'].find(existsSync);
if(!chrome)throw Error('Headless Chromium is unavailable');
let browser;
try{
  browser=await chromium.launch({headless:true,executablePath:chrome,args:[
    '--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
    '--enable-unsafe-swiftshader','--disable-gpu-sandbox'
  ]});
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:'+port+
    '/games/rpg-prototype/testing/?station=9&smoke=1&inventory-qa=1',
    {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__rpgSmokeState?.().enemies.length===3,
    null,{timeout:45000});
  await page.locator('#inventoryOpen').click();
  await page.locator('#inventoryPanel:not(.hidden)').waitFor({timeout:10000});
  assert.equal(await page.locator('#inventoryArmorDetails .inventory-protection-line').count(),6,
    'All six armor hit zones must be visible');
  assert.match(await page.locator('#inventoryArmor').textContent(),/6 ZONES PROTECTED/,
    'Armor summary must clearly state that it counts body zones');
  assert.equal(await page.locator('#inventoryCategories .inventory-category').count(),9,
    'Inventory must expose weapons, armor and the material pouch');
  await page.locator('#inventoryCategories [data-category="weapon"]').click();
  assert.equal(await page.locator('#inventorySectionTitle').textContent(),'WEAPONS');
  await page.locator('#inventoryCategories [data-category="materials"]').click();
  assert.equal(await page.locator('#inventorySectionTitle').textContent(),'MATERIALS');
  assert.match(await page.locator('#inventorySectionCount').textContent(),/COMPONENT TYPES/);
  await page.locator('#inventoryCategories [data-category="armor"]').click();
  assert.equal(await page.locator('#inventorySectionTitle').textContent(),'ARMOR');
  await page.locator('#inventoryCategories [data-category="all"]').click();
  assert.equal(await page.locator('#inventorySectionTitle').textContent(),'ALL ITEMS');
  await page.screenshot({path:'/tmp/rpg-inventory-desktop.png'});
  await page.keyboard.press('Escape');
  await page.locator('#inventoryPanel').waitFor({state:'hidden'});
  await page.keyboard.press('i');
  await page.locator('#inventoryPanel:not(.hidden)').waitFor({timeout:5000});
  await page.setViewportSize({width:760,height:700});
  await page.screenshot({path:'/tmp/rpg-inventory-tablet.png'});
  // W20.62: Physical shop interaction remains, but free test caps are gone.
  await page.keyboard.press('Escape');
  await page.locator('#inventoryPanel').waitFor({state:'hidden'});
  await page.locator('#enterVendors').click();
  await page.waitForFunction(()=>window.__rpgSmokeState().locked,null,{timeout:7000});
  await page.keyboard.press('e');
  await page.locator('#vendorPanel:not(.hidden)').waitFor({timeout:7000});
  assert.match(await page.locator('#vendorName').textContent(),/BRIGGS · ARMORER/);
  await page.locator('#vendorSearch').fill('nonexistent-item');
  assert.match(await page.locator('#vendorItems').textContent(),/NO MATCHES/);
  await page.locator('#vendorSearch').fill('');
  assert.equal(await page.locator('#vendorCredit').count(),0,
    'No more free merchant cap handout');
  assert.match(await page.locator('#vendorCaps').textContent(),/0 CAPS/);
  await page.locator('#vendorSellTab').click();
  assert.equal(await page.locator('#vendorSellTab').getAttribute('aria-pressed'),'true');
  await page.keyboard.press('Escape');
  await page.locator('#vendorPanel').waitFor({state:'hidden'});
  // W20.65: A merchant must actually run out of physical stock. The same
  // player-owned stock must survive closing the shop and reloading the lab.
  const funded=initialCampaignState();funded.caps=5000;
  await page.evaluate(saved=>localStorage.setItem('rpg-lab-campaign-v1',
    JSON.stringify(saved)),funded);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__rpgSmokeState?.().enemies.length===3,
    null,{timeout:45000});
  const openArmorer=async()=>{
    await page.locator('#enterVendors').click();
    await page.waitForFunction(()=>window.__rpgSmokeState().locked,
      null,{timeout:7000});
    await page.keyboard.press('e');
    await page.locator('#vendorPanel:not(.hidden)').waitFor({timeout:7000});
  };
  const offeredName=getItem('armor:scrap-chest').name;
  const stockRow=()=>page.locator('#vendorItems .vendor-item').filter({hasText:offeredName}).first();
  await openArmorer();
  assert.match(await stockRow().textContent(),/STOCK ×2/);
  await stockRow().getByRole('button',{name:/BUY/}).click();
  assert.match(await stockRow().textContent(),/STOCK ×1/);
  await page.keyboard.press('Escape');
  await page.locator('#vendorPanel').waitFor({state:'hidden'});
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__rpgSmokeState?.().enemies.length===3,
    null,{timeout:45000});
  await openArmorer();
  assert.match(await stockRow().textContent(),/STOCK ×1/,
    'Merchant stock must persist across reloads');
  await stockRow().getByRole('button',{name:/BUY/}).click();
  assert.match(await stockRow().textContent(),/STOCK ×0/);
  assert.equal(await stockRow().getByRole('button',{name:'SOLD OUT'}).isDisabled(),true);
  await page.locator('#vendorSellTab').click();
  await page.locator('#vendorItems .vendor-item').filter({hasText:offeredName})
    .first().getByRole('button',{name:/SELL 1/}).click();
  await page.locator('#vendorBuyTab').click();
  assert.match(await stockRow().textContent(),/STOCK ×1/,
    'Selling an offered item must replenish the merchant');
  assert.equal(errors.length,0,'Inventory/vendor UI should not cause browser exceptions: '+
    errors.join(' | '));
  console.log('INVENTORY_VENDOR_UI_QA_PASS: categories, armor, finite vendor stock, persistence, sale restock');
}finally{
  await browser?.close();
  await new Promise(done=>server.close(done));
}

