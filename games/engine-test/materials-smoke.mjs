import {chromium} from 'playwright';
import {strict as assert} from 'node:assert';

const browser=await chromium.launch({headless:true,args:[
  '--enable-webgl','--use-gl=angle','--use-angle=swiftshader'
]});
const errors=[];
const page=await browser.newPage({viewport:{width:1380,height:900}});
page.on('pageerror',error=>errors.push(error.message));
try{
  const response=await page.goto('http://127.0.0.1:8080/games/engine-test/materials.html',
    {waitUntil:'domcontentloaded',timeout:35000});
  assert.equal(response.status(),200);
  await page.waitForFunction(()=>document.querySelectorAll('.material-card').length===168,
    null,{timeout:30000});
  assert.match(await page.locator('#libraryCount').innerText(),/168 MATERIAL PRESETS/);
  await page.waitForFunction(()=>document.querySelector('#previewStatus').textContent.includes('READY'),
    null,{timeout:40000});
  assert.equal(await page.locator('#materialViewport').getAttribute('data-preview-ready'),'true');
  await page.locator('#materialCategory').selectOption('wood');
  assert.equal(await page.locator('.material-card').count(),12);
  await page.locator('#materialSearch').fill('oak');
  assert.equal(await page.locator('.material-card').count(),2);
  await page.locator('.material-card').first().click();
  await page.locator('#materialColor').evaluate(el=>{
    el.value='#aa7799';el.dispatchEvent(new Event('input',{bubbles:true}));
  });
  assert.equal(await page.locator('#colorValue').innerText(),'#AA7799');
  assert.equal(await page.locator('#modifiedBadge').isVisible(),true);
  await page.locator('#previewShape').selectOption('floor');
  await page.locator('#saveMaterial').click();
  assert.equal(await page.locator('.saved-variant').count(),1);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelectorAll('.saved-variant').length===1);
  await page.locator('.saved-variant button').first().click();
  assert.equal(await page.locator('#materialColor').inputValue(),'#aa7799');
  await page.locator('#resetMaterial').click();
  assert.equal(await page.locator('#modifiedBadge').isVisible(),false);
  assert.deepEqual(errors,[]);
  console.log('Material workbench browser smoke passed.');
}finally{await browser.close();}
