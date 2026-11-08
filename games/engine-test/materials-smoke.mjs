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
  // Read actual generated pixels, not only numeric pattern functions. Every
  // sample's opposite edges must match before WebGL repeats its UVs.
  const edgeDiff=await page.evaluate(async()=>{
    const {MATERIAL_PRESETS}=await import('../../engine/material-catalog.mjs');
    const {createMaterialCanvas}=await import('../../engine/material-factory.js');
    let worst=0;
    for(const preset of MATERIAL_PRESETS){
      const size=64;
      const ctx=createMaterialCanvas(preset,{},size).getContext('2d');
      const data=ctx.getImageData(0,0,size,size).data;
      for(let i=0;i<size;i++)for(let channel=0;channel<3;channel++){
        const index=(y,x)=>(y*size+x)*4+channel;
        worst=Math.max(worst,
          Math.abs(data[index(i,0)]-data[index(i,size-1)]),
          Math.abs(data[index(0,i)]-data[index(size-1,i)]));
      }
    }
    return worst;
  });
  assert.equal(edgeDiff,0,'texture borders must be pixel-identical at any repeat level');
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
