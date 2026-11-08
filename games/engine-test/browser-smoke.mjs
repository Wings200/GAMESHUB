// Runs in GitHub Actions with Playwright. Verifies that the actual room loads
// and can be entered using headless Chromium + software WebGL.
import {chromium} from 'playwright';
import {strict as assert} from 'node:assert';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,args:[
  '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
]});
const failures=[];
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
page.on('pageerror', error=>failures.push('Uncaught: '+error.message));
page.on('console', message=>{if(message.type()==='error') failures.push('Console: '+message.text());});
await mkdir('artifacts',{recursive:true});
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
  if (await page.locator('#intro').isVisible()) await page.locator('[data-skip-intro]').click();
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
  await page.screenshot({path:'artifacts/engine-balanced.png',fullPage:true});
  const preview=await page.screenshot({type:'jpeg',quality:38,clip:{x:0,y:0,width:960,height:600}});
  console.log('ENGINE_QA_PREVIEW_B64='+preview.toString('base64'));
  await page.locator('#quality').selectOption('quality');
  await page.waitForTimeout(750);
  await page.screenshot({path:'artifacts/engine-quality.png',fullPage:true});
  await page.locator('#quality').selectOption('performance');
  await page.waitForTimeout(500);
  assert.equal(await page.locator('#shadows').isChecked(),false);
  await page.locator('#motion').uncheck();
  await page.screenshot({path:'artifacts/engine-performance.png',fullPage:true});
  const fatal=await page.locator('#error').isVisible();
  assert.equal(fatal,false,'engine fatal overlay visible');
  if(failures.length) throw new Error(failures.join('\n'));
  console.log('WebGL browser smoke passed; screenshots created.');
} finally {
  await browser.close();
}
