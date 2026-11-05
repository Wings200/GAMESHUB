// W20.58 — browser QA for nested developer controls, edits, authorization and publish.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {existsSync} from 'node:fs';
import {chromium} from 'playwright-core';

const root=process.cwd();
let version=5, changes={}, writes=0;
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript'};
const server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/api/dev/settings'){
    if(req.method==='PUT'){
      let raw='';
      for await(const chunk of req)raw+=chunk;
      const body=JSON.parse(raw);
      if(body.version!==version){
        res.writeHead(409,{'Content-Type':'application/json'});
        res.end(JSON.stringify({ok:false,error:'Conflict'}));return;
      }
      version++;changes=body.changes;writes++;
    }
    res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});
    res.end(JSON.stringify({ok:true,version,changes,admin:true}));return;
  }
  if(url.pathname==='/dev-panel-preview'){
    const admin=url.searchParams.get('admin')!=='0';
    const page='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
      '<body style="background:#12261f;color:white"><h1>Testing Field Developer UI</h1>' +
      '<script type="module">import {startGameSettingsUI} from "/games/rpg-prototype/testing/developer-panel.mjs";' +
      'startGameSettingsUI({ok:true,version:5,changes:{},admin:'+admin+'});</script></body></html>';
    res.writeHead(200,{'Content-Type':'text/html'});res.end(page);return;
  }
  try{
    const path=resolve(root,'.'+url.pathname);
    if(!path.startsWith(root+sep))throw Error('Invalid path');
    if(!(await stat(path)).isFile())throw Error('Not a file');
    const body=await readFile(path);
    res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream'});
    res.end(body);
  }catch(error){res.writeHead(404);res.end(String(error));}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const port=server.address().port;
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable',
  '/usr/bin/chromium','/usr/bin/chromium-browser'].find(existsSync);
if(!chrome)throw Error('Chromium is required for the developer panel browser test.');
let browser;
try{
  browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:'+port+'/dev-panel-preview');
  await page.locator('#gh-dev-launch').waitFor({state:'visible'});
  await page.locator('#gh-dev-launch').click();
  await page.getByRole('button',{name:'Scrap',exact:false}).first().click();
  await page.locator('#gh-dev-search').fill('steel');
  await page.getByRole('button',{name:/Steel.*material:steel/}).click();
  const value=page.getByRole('spinbutton',{name:'Steel Base value (caps)'});
  assert.equal(await value.inputValue(),'4');
  await value.fill('20');
  await value.press('Tab');
  await page.screenshot({path:'/tmp/rpg-dev-panel-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'SAVE & PUBLISH'}).click();
  await page.locator('#gh-game-updating').waitFor({state:'visible'});
  assert.equal(writes,1);
  assert.equal(changes.scrap['material:steel'].value,20);
  assert.deepEqual(errors,[]);

  const ordinary=await browser.newPage();
  await ordinary.goto('http://127.0.0.1:'+port+'/dev-panel-preview?admin=0');
  await ordinary.waitForTimeout(500);
  assert.equal(await ordinary.locator('#gh-dev-launch').count(),0);
  await ordinary.close();
  await page.close();
  console.log('Developer panel browser QA passed: hierarchy, pricing edit, save, update and hidden non-admin UI.');
} finally {
  if(browser)await browser.close();
  await new Promise(done=>server.close(done));
}
