// Development-only screenshot QA. The screenshots come from live WebGL,
// not from asset mockups or a separate animation simulator.
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {existsSync} from 'node:fs';
import {chromium} from 'playwright-core';

const root=process.cwd();
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript'};
const server=createServer(async(req,res)=>{
  try{
    let pathname=new URL(req.url,'http://localhost').pathname;
    if(pathname.endsWith('/'))pathname+='index.html';
    const filename=resolve(root,'.'+pathname);
    if(!filename.startsWith(root+sep)||(await stat(filename)).isFile()!==true)
      throw Error('Invalid file');
    let source=await readFile(filename);
    if(pathname.endsWith('/games/rpg-prototype/testing/index.html')){
      source=Buffer.from(source.toString().replace(
        'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js',
        '/node_modules/three/build/three.module.js').replace(
        'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/',
        '/node_modules/three/examples/jsm/'));
    }
    res.writeHead(200,{'Content-Type':mime[extname(filename)]||
      'application/octet-stream'});res.end(source);
  }catch(error){res.writeHead(404);res.end(String(error));}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browserPath=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable',
  '/usr/bin/chromium','/usr/bin/chromium-browser'].find(existsSync);
if(!browserPath)throw Error('Chromium is not installed on this runner');
let browser;
try{
  browser=await chromium.launch({headless:true,executablePath:browserPath,args:[
    '--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
    '--enable-unsafe-swiftshader','--disable-gpu-sandbox'
  ]});
  const page=await browser.newPage({viewport:{width:920,height:570}});
  const problems=[];
  page.on('pageerror',error=>problems.push(error.message));
  await page.goto('http://127.0.0.1:'+server.address().port+
    '/games/rpg-prototype/testing/?smoke=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__rpgSmokePowerVisual?.().frameFeatures?.hydraulics===8,
    null,{timeout:45000});
  await page.locator('#start').click();
  await page.waitForFunction(()=>window.__rpgSmokeState().locked,
    null,{timeout:15000});
  await page.addStyleTag({content:'#fieldHud,#questTracker,#lootPrompt{display:none!important}'});
  const frame=async()=>{
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>resolve())));
  };
  const capture=async name=>{
    await frame();
    const snap=await page.screenshot({type:'jpeg',quality:32,
      animations:'allow'});
    console.log('W20_IMAGE_'+name+':'+snap.toString('base64'));
  };
  // Capture both sides of the ACTUAL finished model, not just entry.
  await page.evaluate(()=>window.__rpgSmokePreviewPowerFrame(true));
  await capture('front');
  await page.evaluate(()=>window.__rpgSmokePreviewPowerFrame(false));
  await capture('rear');
  await page.evaluate(()=>window.__rpgSmokePowerTransition());
  await page.waitForFunction(()=>window.__rpgSmokeState().powerArmor.phase==='entering',
    null,{timeout:12000});
  await page.evaluate(()=>window.__rpgSmokeSetPowerProgress(.43));
  await page.waitForFunction(()=>window.__rpgSmokePowerVisual().pilotStage==='lower-step',
    null,{timeout:12000});
  await capture('firststep');
  await page.evaluate(()=>window.__rpgSmokeSetPowerProgress(.57));
  await page.waitForFunction(()=>window.__rpgSmokePowerVisual().pilotStage==='upper-step',
    null,{timeout:12000});
  await capture('secondstep');
  if(problems.length)throw Error('Browser errors: '+problems.join(' | '));
  console.log('VISUAL_QA_PASS');
} finally {
  await browser?.close();
  await new Promise(ok=>server.close(ok));
}
