// W20.61 — actual browser UX acceptance for modular dev panel + stable defaults.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {existsSync} from 'node:fs';
import {chromium} from 'playwright-core';
import {validateBalanceChanges} from './balance-schema.mjs';
import {validateDeveloperGrant} from './dev-grants.mjs';
const root=process.cwd();
let version=5,changes={},defaults={},writes=0;
const actions=[];
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript'};
const server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/api/dev/grant'&&req.method==='POST'){
    try{
      let raw='';for await(const chunk of req)raw+=chunk;
      const grant=validateDeveloperGrant(JSON.parse(raw));
      res.writeHead(200,{'Content-Type':'application/json'});
      res.end(JSON.stringify({ok:true,grant}));
    }catch(error){
      res.writeHead(400,{'Content-Type':'application/json'});
      res.end(JSON.stringify({ok:false,error:error.message}));
    }
    return;
  }
  if(url.pathname==='/api/dev/settings'){
    if(req.method==='PUT'){
      let raw='';for await(const chunk of req)raw+=chunk;
      const body=JSON.parse(raw);
      if(body.version!==version){
        res.writeHead(409,{'Content-Type':'application/json'});
        res.end(JSON.stringify({ok:false,error:'Conflict'}));return;
      }
      changes=validateBalanceChanges(body.changes);
      if(body.action==='set-default'){
        const group=defaults[body.category]||={};
        if(changes[body.category]?.[body.id])
          group[body.id]={...changes[body.category][body.id]};
        else delete group[body.id];
        if(!Object.keys(group).length)delete defaults[body.category];
      }
      actions.push(body.action||'publish');
      version++;writes++;
    }
    res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});
    res.end(JSON.stringify({ok:true,version,changes,defaults,admin:true}));return;
  }
  if(url.pathname==='/dev-panel-preview'){
    const admin=url.searchParams.get('admin')!=='0';
    const initial=JSON.stringify({ok:true,version,changes,defaults,admin});
    const page='<!doctype html><html><head><meta name="viewport" '+
      'content="width=device-width,initial-scale=1"></head>'+
      '<body style="background:#12261f;color:white">'+
      '<h1>Testing Field Developer UI</h1>'+
      '<script type="module">import {startGameSettingsUI} from '+
      '"/games/rpg-prototype/testing/developer-panel.mjs";'+
      'startGameSettingsUI('+initial+');</script></body></html>';
    res.writeHead(200,{'Content-Type':'text/html'});res.end(page);return;
  }
  try{
    const file=resolve(root,'.'+url.pathname);
    if(!file.startsWith(root+sep)||(await stat(file)).isFile()!==true)
      throw Error('Invalid file');
    const body=await readFile(file);
    res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});
    res.end(body);
  }catch(error){res.writeHead(404);res.end(String(error));}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable',
  '/usr/bin/chromium','/usr/bin/chromium-browser'].find(existsSync);
if(!chrome)throw Error('Chromium required for developer panel QA.');
let browser;
try{
  browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.addInitScript(()=>{
    window.__mockGrants=[];
    window.addEventListener('gameshub-admin-grant',event=>{
      const grant=event.detail.grant;
      window.__mockGrants.push(grant);
      event.detail.complete({ok:true,added:grant.quantity??grant.amount,leftover:0});
    });
  });
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const url='http://127.0.0.1:'+server.address().port+'/dev-panel-preview';
  const launch=async()=>{
    await page.goto(url);
    await page.locator('#gh-dev-launch').waitFor({state:'visible'});
    await page.locator('#gh-dev-launch').click();
  };
  await launch();
  const categories=await page.locator('#gh-dev-categories .gh-dev-cat span').allTextContents();
  assert.deepEqual(categories,['Weapons','Armor / Power Armor','Junk',
    'Resources','Consumables','Misc']);
  // Only base guns appear in the family list, not hundreds of loose mods.
  await page.locator('#gh-dev-search').fill('pipe smg');
  await page.getByRole('button',{name:/Pipe SMG/}).first().click();
  const familyCount=await page.locator('#gh-dev-item-list .gh-dev-item').count();
  assert.equal(familyCount,1,'All weapon modifications should live INSIDE gun family');
  assert.equal(await page.locator('.gh-dev-slot').count(),6,
    'Base gun + five real part categories; no sight variable category');
  await page.locator('.gh-dev-slot[data-slot="barrel"]').click();
  await page.locator('#gh-dev-variant').selectOption('mod:pipe-smg:barrel:ported');
  const recoil=page.getByRole('spinbutton',{name:'Ported barrel Recoil multiplier'});
  assert.equal(await recoil.inputValue(),'0.7');
  await recoil.fill('0.5');
  await recoil.press('Tab');
  const recipe=page.locator('.gh-dev-recipes summary');
  assert.match(await recipe.textContent(),/31 RESOURCE TYPES/);
  await recipe.click();
  const steel=page.getByRole('spinbutton',{name:/Ported barrel Recipe · steel/});
  assert.equal(await steel.inputValue(),'3');
  await steel.fill('9');await steel.press('Tab');
  await page.screenshot({path:'/tmp/rpg-dev-panel-desktop.png',fullPage:true});
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#gh-dev-set-default').click();
  await page.locator('#gh-game-updating').waitFor({state:'visible'});
  assert.equal(writes,1);
  assert.deepEqual(actions,['set-default']);
  const id='mod:pipe-smg:barrel:ported';
  assert.equal(changes.weapons[id].recoilMultiplier,.5);
  assert.equal(changes.weapons[id].cost_steel,9);
  assert.equal(defaults.weapons[id].recoilMultiplier,.5,
    'set-default must be a persistent baseline, not a local input reset');
  // Second session: an extreme published experiment may not overwrite default.
  await launch();
  await page.locator('#gh-dev-search').fill('pipe smg');
  await page.getByRole('button',{name:/Pipe SMG/}).first().click();
  await page.locator('.gh-dev-slot[data-slot="barrel"]').click();
  await page.locator('#gh-dev-variant').selectOption(id);
  const edited=page.getByRole('spinbutton',{name:'Ported barrel Recoil multiplier'});
  assert.equal(await edited.inputValue(),'0.5');
  await edited.fill('2.5');await edited.press('Tab');
  await page.locator('#gh-dev-save').click();
  await page.locator('#gh-game-updating').waitFor({state:'visible'});
  assert.equal(writes,2);assert.equal(changes.weapons[id].recoilMultiplier,2.5);
  assert.equal(defaults.weapons[id].recoilMultiplier,.5);
  // Third session: revert this EXACT barrel to new custom default, publish.
  await launch();
  await page.locator('#gh-dev-search').fill('pipe smg');
  await page.getByRole('button',{name:/Pipe SMG/}).first().click();
  await page.locator('.gh-dev-slot[data-slot="barrel"]').click();
  await page.locator('#gh-dev-variant').selectOption(id);
  await page.locator('#gh-dev-reset').click();
  assert.equal(await page.getByRole('spinbutton',{
    name:'Ported barrel Recoil multiplier'}).inputValue(),'0.5');
  await page.locator('#gh-dev-save').click();
  await page.locator('#gh-game-updating').waitFor({state:'visible'});
  assert.equal(changes.weapons[id].recoilMultiplier,.5);
  // All 16 authored armor families & 6 body pieces can be browsed.
  await launch();
  await page.locator('#gh-dev-categories .gh-dev-cat').filter({
    hasText:'Armor / Power Armor'}).click();
  await page.locator('#gh-dev-search').fill('T-45 Field Armor');
  await page.locator('#gh-dev-item-list .gh-dev-item').first().click();
  assert.equal(await page.locator('.gh-dev-slot').count(),7);
  await page.locator('.gh-dev-slot[data-slot="head"]').click();
  assert.match(await page.locator('#gh-dev-editor').textContent(),/Maximum durability/);
  await page.locator('#gh-dev-categories .gh-dev-cat').filter({
    hasText:'Resources'}).click();
  await page.locator('#gh-dev-search').fill('steel');
  await page.locator('#gh-dev-item-list .gh-dev-item').first().click();
  assert.equal(await page.locator('.gh-dev-stat').count(),2,
    'Resources must expose buy cost and sell price only');
  assert.equal(await page.getByRole('spinbutton',{name:'Steel Buy cost (caps)'}).inputValue(),'5');
  await page.locator('#gh-dev-categories .gh-dev-cat').filter({
    hasText:'Junk'}).click();
  assert.match(await page.locator('#gh-dev-editor').textContent(),/not implemented yet/i);
  // W20.62: the item-grant section uses a searchable REAL catalog, not a
  // hand-written array of guns or field loot crates.
  await page.locator('#gh-dev-mode').click();
  await page.locator('#gh-grant-search').fill('pipe smg');
  await page.locator('#gh-grant-results .gh-grant-item').first().click();
  assert.match(await page.locator('#gh-grant-selected').textContent(),/Pipe SMG/);
  await page.locator('#gh-grant-quantity').fill('2');
  await page.locator('#gh-grant-item-submit').click();
  await page.waitForFunction(()=>window.__mockGrants.length===1);
  assert.deepEqual(await page.evaluate(()=>window.__mockGrants[0]),
    {action:'item',itemId:'weapon:pipe-smg',quantity:2});
  assert.match(await page.locator('#gh-grant-feedback').textContent(),/ADDED 2/);
  await page.locator('#gh-grant-caps').fill('250');
  await page.locator('#gh-grant-caps-submit').click();
  await page.waitForFunction(()=>window.__mockGrants.length===2);
  assert.deepEqual(await page.evaluate(()=>window.__mockGrants[1]),
    {action:'caps',amount:250});
  await page.locator('#gh-grant-quantity').fill('1000');
  await page.locator('#gh-grant-item-submit').click();
  assert.match(await page.locator('#gh-grant-feedback').textContent(),/NOT GRANTED/);
  assert.equal(await page.evaluate(()=>window.__mockGrants.length),2);
  await page.locator('#gh-dev-mode').click();
  assert.equal(await page.locator('#gh-dev-categories').isVisible(),true);
  const ordinary=await browser.newPage();
  await ordinary.goto(url+'?admin=0');
  await ordinary.waitForTimeout(350);
  assert.equal(await ordinary.locator('#gh-dev-launch').count(),0,
    'Non-admin must not even see the launch button');
  await ordinary.close();
  assert.deepEqual(errors,[],'Browser errors: '+errors.join(' | '));
  console.log('DEVELOPER_PANEL_W20_62_PASS: variables, defaults, item search, grants, caps, validation, authorization');
}finally{
  await browser?.close();
  await new Promise(done=>server.close(done));
}

