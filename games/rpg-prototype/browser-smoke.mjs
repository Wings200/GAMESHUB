// Headless Chrome gameplay smoke test for the actual 3D RPG test lab.
// Run with: npm install --no-save playwright-core three@0.180.0
//           node games/rpg-prototype/browser-smoke.mjs
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,join,extname,sep} from 'node:path';
import {existsSync} from 'node:fs';
import {chromium} from 'playwright-core';
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
  page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
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
  const initialHp=frozen.enemies.find(e=>e.id==='scout').health;
  await page.mouse.down({button:'right'});
  for(let i=0;i<7;i++){
    await page.mouse.click(640,400,{button:'left'});
    await page.waitForTimeout(270);
    const current=await page.evaluate(()=>window.__rpgSmokeState());
    if(current.enemies.find(e=>e.id==='scout').health<initialHp)break;
  }
  await page.mouse.up({button:'right'});
  const result=await page.evaluate(()=>window.__rpgSmokeState());
  const scoutHealth=result.enemies.find(e=>e.id==='scout').health;
  console.log('BROWSER DAMAGE DEBUG',JSON.stringify({
    before:frozen,after:result,errors
  }));
  assert.ok(scoutHealth<initialHp,
    'Player pistol must cause real damage to an enemy in 3D hit detection');
  assert.equal(errors.length,0,
    'No runtime JavaScript/WebGL errors allowed: '+errors.join('; '));
  console.log(JSON.stringify({
    smoke:'PASS',aiMoved:true,scoutHealthBefore:initialHp,
    scoutHealthAfter:scoutHealth,enemies:result.enemies.length
  }));
  await page.close();
}finally{
  await browser?.close();
  await new Promise(ok=>server.close(ok));
}
