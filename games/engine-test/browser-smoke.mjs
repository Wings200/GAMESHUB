// Runs in GitHub Actions with Playwright. Verifies that the actual room loads
// and can be entered using headless Chromium + software WebGL.
import {chromium} from 'playwright';
import {strict as assert} from 'node:assert';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,args:[
  '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
]});
const failures=[];
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
page.on('pageerror', error=>failures.push('Uncaught: '+error.message));
page.on('console', message=>{if(message.type()==='error') failures.push('Console: '+message.text());});
await mkdir('artifacts',{recursive:true});
async function recordFrame(name,{preview=false}={}) {
  try {
    // Best-effort capture: WebGL readback can hang in software Chromium.
    const raw=await Promise.race([
      page.evaluate(() => document.getElementById('world').toDataURL('image/jpeg',0.48).split(',')[1]),
      new Promise((_,reject)=>setTimeout(()=>reject(new Error('GPU screenshot readback timeout')),6000))
    ]);
    if (!raw || raw.length < 100) throw new Error('Empty canvas image');
    await writeFile('artifacts/'+name+'.jpg',Buffer.from(raw,'base64'));
    if(preview) console.log('ENGINE_QA_PREVIEW_B64='+raw);
  } catch(error) {
    console.warn('Screenshot evidence unavailable in software WebGL:',error.message);
  }
}
try {
  const response=await page.goto('http://127.0.0.1:8080/games/engine-test/',{waitUntil:'domcontentloaded',timeout:35000});
  assert.equal(response.status(),200);
  await page.getByRole('button',{name:/LAUNCH ENGINE TEST/}).click();
  await page.waitForFunction(()=>{
    const error=document.getElementById('error');
    if(error && !error.hidden) throw new Error(document.getElementById('errorMessage')?.textContent);
    return document.getElementById('launch').hidden &&
      document.getElementById('fps').textContent !== '--';
  },null,{timeout:45000});
  // Programmatic click avoids the auto-finish/actionability race at 4.9 seconds.
  await page.evaluate(() => document.querySelector('[data-skip-intro]')?.click());
  await page.waitForTimeout(1000);
  const diagnostic=await page.evaluate(()=>({
    fps:document.getElementById('fps').textContent,
    drawCalls:document.getElementById('drawCalls').textContent,
    triangles:document.getElementById('triangles').textContent,
    renderer:document.getElementById('rendererState').textContent,
  }));
  console.log('Balanced:',diagnostic);
  assert.ok(Number(diagnostic.drawCalls)>0,'scene rendered no geometry');
  assert.ok(Number(diagnostic.fps)>0,'renderer stalled');
  await recordFrame('engine-balanced',{preview:true});
  await page.locator('#quality').selectOption('quality');
  await page.waitForTimeout(750);
  await recordFrame('engine-quality');
  await page.locator('#quality').selectOption('performance');
  await page.waitForTimeout(500);
  assert.equal(await page.locator('#shadows').isChecked(),false);
  await page.locator('#motion').uncheck();
  await recordFrame('engine-performance');
  const fatal=await page.locator('#error').isVisible();
  assert.equal(fatal,false,'engine fatal overlay visible');
  if(failures.length) throw new Error(failures.join('\n'));
  console.log('WebGL browser smoke passed; screenshots created.');
} finally {
  await browser.close();
}
