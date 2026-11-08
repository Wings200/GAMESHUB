// Runs in GitHub Actions with Playwright. Verifies that the actual room loads
// and can be entered using headless Chromium + software WebGL.
import {chromium} from 'playwright';
import {strict as assert} from 'node:assert';
const browser=await chromium.launch({headless:true,args:[
  '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
]});
const failures=[];
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
page.on('pageerror', error=>failures.push('Uncaught: '+error.message));
page.on('console', message=>{if(message.type()==='error') failures.push('Console: '+message.text());});
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
  assert.match(await page.locator('#lampStatus').innerText(),/24 REAL DOWNLIGHTS/);
  assert.match(await page.locator('#footstepStatus').innerText(),/5 VARIANTS READY/);
  // Door starts shut: no direct light leaks through the closed aperture.
  assert.match(await page.locator('#doorStatus').innerText(),/DOOR CLOSED/);
  assert.equal(Number(await page.locator('#doorStatus').getAttribute('data-direct-intensity')),0);
  await page.locator('#doorToggle').click();
  try {
    await page.waitForFunction(() =>
      document.getElementById('doorStatus').textContent.includes('LIGHT ENTERING CHAMBER'),
      null,{timeout:20000});
  } catch(error) {
    console.error('OPEN DOOR STATE:',await page.locator('#doorStatus').evaluate(el=>({
      text:el.textContent,data:{...el.dataset}
    })).catch(()=>({unavailable:true})));
    console.error('FPS:',await page.locator('#fps').innerText().catch(()=>'<unavailable>'));
    throw error;
  }
  assert.ok(Number(await page.locator('#doorStatus').getAttribute('data-direct-intensity'))>25);
  await page.locator('#bounceToggle').uncheck();
  await page.waitForFunction(()=>
    Number(document.getElementById('doorStatus').dataset.bounceIntensity)===0,
    null,{timeout:20000});
  assert.equal(Number(await page.locator('#doorStatus').getAttribute('data-bounce-intensity')),0);
  await page.locator('#bounceToggle').check();
  await page.locator('#reflectionToggle').uncheck();
  await page.locator('#reflectionToggle').check();
  // This explicitly exercises the real WebGL cube-map capture path (6 faces
  // per scene), rather than declaring dynamic reflections correct from source.
  await page.locator('#probeNow').click({timeout:120000});
  await page.waitForFunction(()=>
    document.getElementById('reflectionStatus').textContent.includes('SHOWROOM 1 / CHAMBER 0'),
    null,{timeout:45000});
  await page.locator('#doorToggle').click();
  await page.waitForFunction(() =>
    document.getElementById('doorStatus').textContent.includes('DOOR CLOSED'),
    null,{timeout:16000});
  assert.equal(Number(await page.locator('#doorStatus').getAttribute('data-direct-intensity')),0);
  const diagnostic=await page.evaluate(()=>({
    fps:document.getElementById('fps').textContent,
    drawCalls:document.getElementById('drawCalls').textContent,
    triangles:document.getElementById('triangles').textContent,
    renderer:document.getElementById('rendererState').textContent,
  }));
  console.log('Balanced:',diagnostic);
  assert.ok(Number(diagnostic.drawCalls)>0,'scene rendered no geometry');
  assert.ok(Number(diagnostic.fps)>0,'renderer stalled');
  await page.locator('#quality').selectOption('quality');
  await page.waitForTimeout(750);
  await page.locator('#quality').selectOption('performance');
  await page.waitForTimeout(500);
  assert.equal(await page.locator('#shadows').isChecked(),false);
  await page.locator('#motion').uncheck();
  await page.locator('#footsteps').uncheck();
  assert.equal(await page.locator('#footsteps').isChecked(),false);
  const fatal=await page.locator('#error').isVisible();
  assert.equal(fatal,false,'engine fatal overlay visible');
  if(failures.length) throw new Error(failures.join('\n'));
  console.log('WebGL browser smoke passed; screenshots require separate hardware-backed visual review.');
} finally {
  await browser.close();
}
