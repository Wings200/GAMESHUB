// W20.60: exercise the physical Station 7 firearm crate in a real browser.
// In particular, X/Z must NEVER switch guns after they are equipped here.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {existsSync} from 'node:fs';
import {chromium} from 'playwright-core';

const root=process.cwd();
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript',
  '.png':'image/png','.json':'application/json'};
const server=createServer(async(req,res)=>{
  try{
    let pathname=new URL(req.url,'http://localhost').pathname;
    if(pathname.endsWith('/'))pathname+='index.html';
    const file=resolve(root,'.'+pathname);
    if(!file.startsWith(root+sep)||(await stat(file)).isFile()!==true)
      throw Error('Invalid file');
    let body=await readFile(file);
    if(pathname.endsWith('/games/rpg-prototype/testing/index.html'))
      body=Buffer.from(body.toString()
        .replace('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js',
          '/node_modules/three/build/three.module.js')
        .replace('https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/',
          '/node_modules/three/examples/jsm/'));
    res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream',
      'Cache-Control':'no-store'});res.end(body);
  }catch(e){res.writeHead(404);res.end(String(e));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable',
  '/usr/bin/chromium','/usr/bin/chromium-browser'].find(existsSync);
if(!chrome)throw Error('Chrome/Chromium is required for 3D weapon crate QA');
let browser;
try{
  browser=await chromium.launch({headless:true,executablePath:chrome,args:[
    '--no-sandbox','--enable-webgl','--use-gl=angle',
    '--use-angle=swiftshader','--enable-unsafe-swiftshader',
    '--disable-gpu-sandbox'
  ]});
  const page=await browser.newPage({viewport:{width:1280,height:820}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url='http://127.0.0.1:'+server.address().port+
    '/games/rpg-prototype/testing/?smoke=1&weapons-crate-qa=1';
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.__rpgSmokeState==='function',
    null,{timeout:60000});
  assert.equal(await page.locator('#weaponSelect').isVisible(),false,
    'old pause-menu gun picker must not be visible');
  assert.equal(await page.locator('#weaponSelect').isDisabled(),true);
  await page.locator('#enterWeaponsCrate').click();
  await page.waitForFunction(()=>window.__rpgSmokeState().locked&&
    window.__rpgSmokeState().crateNearby,null,{timeout:10000});
  assert.match(await page.locator('#lootPrompt').textContent(),/OPEN WEAPONS CRATE/);
  await page.keyboard.press('e');
  await page.locator('#weaponsCratePanel:not(.hidden)').waitFor({timeout:10000});
  assert.equal(await page.locator('#weaponsCrateItems .weapon-crate-entry').count(),10);
  assert.match(await page.locator('#weaponsCrateEquipped').textContent(),/10MM PISTOL/);
  const smg=page.locator('.weapon-crate-entry[data-weapon-id="pipe-smg"]');
  assert.match(await smg.textContent(),/PIPE SMG/i);
  await smg.locator('button').click();
  await page.locator('#weaponsCratePanel').waitFor({state:'hidden',timeout:5000});
  await page.waitForFunction(()=>window.__rpgSmokeState().locked,
    null,{timeout:10000});
  assert.equal(await page.evaluate(()=>window.__rpgSmokeState().weapon.id),'pipe-smg');
  assert.equal(await page.evaluate(()=>
    JSON.parse(localStorage.getItem('rpg-lab-player-inventory')).equipment.weapon),
    'pipe-smg','equipped weapon is saved using existing backpack state');
  await page.keyboard.press('z');
  await page.keyboard.press('x');
  assert.equal(await page.evaluate(()=>window.__rpgSmokeState().weapon.id),'pipe-smg',
    'old Z / X hotkeys must not cycle weapons');
  await page.keyboard.press('e');
  await page.locator('#weaponsCratePanel:not(.hidden)').waitFor();
  const laser=page.locator('.weapon-crate-entry[data-weapon-id="laser-musket"]');
  await laser.locator('button').click();
  assert.equal(await page.evaluate(()=>window.__rpgSmokeState().weapon.id),'laser-musket');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__rpgSmokeState?.().weapon.id==='laser-musket',
    null,{timeout:60000});
  assert.equal(await page.locator('#currentWeaponSummary').textContent(),'LASER MUSKET');
  // Crate selection must survive reload. Z/X still have no effect.
  await page.locator('#enterWeaponsCrate').click();
  await page.waitForFunction(()=>window.__rpgSmokeState().locked&&
    window.__rpgSmokeState().crateNearby,null,{timeout:10000});
  await page.keyboard.press('z');
  await page.keyboard.press('x');
  assert.equal(await page.evaluate(()=>window.__rpgSmokeState().weapon.id),'laser-musket');
  await page.keyboard.press('e');
  await page.locator('#weaponsCratePanel:not(.hidden)').waitFor();
  assert.equal(await page.locator('.weapon-crate-entry.selected').count(),1);
  assert.match(await page.locator('.weapon-crate-entry.selected').textContent(),/LASER MUSKET/i);
  await page.keyboard.press('Escape');
  await page.locator('#weaponsCratePanel').waitFor({state:'hidden'});
  assert.deepEqual(errors,[],'No browser exceptions: '+errors.join(' | '));
  await page.screenshot({path:'/tmp/rpg-weapon-crate.png'});
  console.log('WEAPONS_CRATE_UI_QA_PASS: 3D crate, E equip, 10 guns, no Z/X switching, save/reload, escape');
}finally{
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
}
