// W20.59 dedicated in-browser weapon workbench acceptance test.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {existsSync} from 'node:fs';
import {chromium} from 'playwright-core';
import {CRAFTING_COMPONENTS} from './materials.mjs';

const root=process.cwd();
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript',
  '.png':'image/png','.json':'application/json'};
const server=createServer(async(req,res)=>{
  try{
    let pathname=new URL(req.url,'http://localhost').pathname;
    if(pathname.endsWith('/'))pathname+='index.html';
    const file=resolve(root,'.'+pathname);
    if(!file.startsWith(root+sep)||(await stat(file)).isFile()!==true)throw Error('Invalid file');
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
const port=server.address().port;
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable',
  '/usr/bin/chromium','/usr/bin/chromium-browser'].find(existsSync);
if(!chrome)throw Error('Chrome required to run the 3D workbench acceptance test');
let browser;
try{
  browser=await chromium.launch({headless:true,executablePath:chrome,args:[
    '--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
    '--enable-unsafe-swiftshader','--disable-gpu-sandbox'
  ]});
  const origin='http://127.0.0.1:'+port;
  const materialCounts=Object.fromEntries(CRAFTING_COMPONENTS.map(i=>[i.id,100]));
  const context=await browser.newContext({
    viewport:{width:1280,height:850},
    storageState:{cookies:[],origins:[{origin,localStorage:[{
      name:'rpg-lab-player-inventory',
      value:JSON.stringify({items:[],nextId:1,materials:materialCounts,
        equipment:{weapon:'pipe-smg'}})
    }]}]}
  });
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url=origin+'/games/rpg-prototype/testing/?smoke=1&weapon-mods-qa=1';
  await page.goto(url,{waitUntil:'domcontentloaded'});
  try{
    await page.waitForFunction(()=>typeof window.__rpgSmokeWeaponMods==='function'||
      document.getElementById('fatal')?.style.display==='block',null,{timeout:45000});
  }catch(error){
    const state=await page.evaluate(()=>({smoke:typeof window.__rpgSmokeState,
      hook:typeof window.__rpgSmokeWeaponMods,
      fatal:document.getElementById('fatal')?.textContent,
      menu:document.getElementById('engineStatus')?.textContent}));
    console.error('WORKBENCH BOOT DIAGNOSTIC',JSON.stringify({state,errors}));
    throw error;
  }
  const initial=await page.evaluate(()=>({
    spec:window.__rpgSmokeWeaponMods?.('pipe-smg'),
    fatal:document.getElementById('fatal')?.textContent}));
  console.log('WORKBENCH INITIAL',JSON.stringify(initial));
  assert.equal(initial.spec?.magazineSize,30,'Clean SMG starts with 30-round magazine');
  await page.locator('#workbenchOpen').click();
  await page.locator('#workbenchPanel:not(.hidden)').waitFor();
  assert.equal(await page.locator('#benchWeapon option').count(),10);
  assert.equal(await page.locator('#benchSlots .bench-tab').count(),6);
  await page.locator('#benchWeapon').selectOption('pipe-smg');
  await page.locator('#benchSlots .bench-tab').filter({hasText:'MAGAZINE / CHAMBER'}).click();
  const drum=page.locator('#benchOptics .bench-part').filter({hasText:'High-capacity drum'});
  assert.match(await drum.textContent(),/GEARS/);
  assert.match(await drum.textContent(),/SPRING/);
  await drum.locator('button').click();
  assert.match(await page.locator('#benchFeedback').textContent(),/CRAFTED & INSTALLED/);
  assert.match(await page.locator('#benchStats').textContent(),/CAPACITY 75/);
  const live=await page.evaluate(()=>window.__rpgSmokeWeaponMods('pipe-smg'));
  assert.equal(live.magazineSize,75);
  assert.ok(live.firstParts>2&&live.worldParts>2,
    'Modified geometry must exist on real first-person and world-held models');
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('rpg-lab-player-inventory')));
  assert.equal(stored.materials['material:steel'],96);
  assert.equal(stored.materials['material:aluminum'],93);
  assert.equal(stored.materials['material:gears'],97);
  assert.equal(stored.materials['material:spring'],95);
  assert.equal(stored.materials['material:screw'],96);
  assert.equal(stored.equipment.weaponMods['pipe-smg'].magazine,
    'mod:pipe-smg:magazine:drum');
  await page.locator('#benchSlots .bench-tab').filter({hasText:'SIGHTS / SCOPES'}).click();
  const holo=page.locator('#benchOptics .bench-part').filter({hasText:'Holo A'});
  await holo.locator('button').click();
  assert.match(await page.locator('#benchFeedback').textContent(),/CRAFTED & INSTALLED/);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('rpg-lab-player-inventory'))
    .equipment.optics['pipe-smg']),'holo-a');
  await page.screenshot({path:'/tmp/rpg-weapon-bench.png'});
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__rpgSmokeWeaponMods?.('pipe-smg').magazineSize===75,
    null,{timeout:60000});
  const restored=await page.evaluate(()=>window.__rpgSmokeWeaponMods('pipe-smg'));
  assert.equal(restored.magazineSize,75,'crafted stats persist after a page reload');
  assert.ok(restored.firstParts>2&&restored.worldParts>2,
    'installed physical parts persist after a page reload');
  await page.locator('#workbenchOpen').click();
  await page.locator('#benchWeapon').selectOption('pipe-smg');
  await page.locator('#benchSlots .bench-tab').filter({hasText:'MAGAZINE / CHAMBER'}).click();
  assert.match(await page.locator('#benchOptics .bench-part')
    .filter({hasText:'High-capacity drum'}).textContent(),/INSTALLED/);
  await page.locator('#benchClose').click();
  // A different blueprint cannot be installed by an unaffordable partial purchase.
  const before=await page.evaluate(()=>{
    const pack=JSON.parse(localStorage.getItem('rpg-lab-player-inventory'));
    pack.materials={};
    localStorage.setItem('rpg-lab-player-inventory',JSON.stringify(pack));
    return JSON.stringify(pack.equipment.weaponMods);
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__rpgSmokeWeaponMods!==undefined,null,{timeout:60000});
  await page.locator('#workbenchOpen').click();
  await page.locator('#benchWeapon').selectOption('pipe-smg');
  const receiver=page.locator('#benchOptics .bench-part').filter({hasText:'Calibrated action'});
  await receiver.locator('button').click();
  assert.match(await page.locator('#benchFeedback').textContent(),/MISSING MATERIALS/);
  const after=await page.evaluate(()=>JSON.stringify(
    JSON.parse(localStorage.getItem('rpg-lab-player-inventory')).equipment.weaponMods));
  assert.equal(after,before,'failed crafting must not change installed parts');
  assert.deepEqual(errors,[],'No browser errors: '+errors.join(' | '));
  console.log('WEAPON_MOD_UI_QA_PASS: 10 guns, 6 tabs, materials, crafting, 3D, optics, persistence, rejection');
  await context.close();
}finally{
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
}
