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
    for(const preset of MATERIAL_PRESETS)for(const repeat of [1,2,4]){
      const size=64;
      const ctx=createMaterialCanvas(preset,{repeat},size).getContext('2d');
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
  const tiling=await page.evaluate(async()=>{
    const {getMaterialPreset}=await import('../../engine/material-catalog.mjs');
    const {createBuildingMaterial,createMaterialCanvas}=await import('../../engine/material-factory.js');
    const preset=getMaterialPreset('concrete-poured-gray');
    const built=createBuildingMaterial(preset,{repeat:2});
    const textureRepeat=built.texture.repeat.x;
    const width=built.texture.image.width;
    built.dispose();
    const size=128,data=createMaterialCanvas(preset,{repeat:2},size)
      .getContext('2d').getImageData(0,0,size,size).data;
    let difference=0;
    for(let y=0;y<64;y++)for(let x=0;x<64;x++)
      difference+=Math.abs(data[(y*size+x)*4]-data[(y*size+x+64)*4]);
    return {textureRepeat,width,difference};
  });
  assert.equal(tiling.textureRepeat,1,'texture should not duplicate identical UV quadrants');
  assert.ok(tiling.width>=512,'2x source needs sufficient detail');
  assert.ok(tiling.difference>500,'2x texture still contains identical quadrants');
  const detailResults=await page.evaluate(async()=>{
    const {MATERIAL_PRESETS}=await import('../../engine/material-catalog.mjs');
    const {createMaterialDetailCanvases}=await import('../../engine/material-factory.js');
    const output=[];
    for(const category of ['concrete','brick','wood']){
      const preset=MATERIAL_PRESETS.find(p=>p.category===category),size=64;
      const maps=createMaterialDetailCanvases(preset,{repeat:2},size);
      const normal=maps.normalCanvas.getContext('2d').getImageData(0,0,size,size).data;
      const rough=maps.roughCanvas.getContext('2d').getImageData(0,0,size,size).data;
      let edgeDifference=0,normalDetail=0,minRough=255,maxRough=0;
      for(let y=0;y<size;y++)for(let x=0;x<size;x++){
        const index=(y*size+x)*4;
        normalDetail=Math.max(normalDetail,Math.abs(normal[index]-128),
          Math.abs(normal[index+1]-128));
        minRough=Math.min(minRough,rough[index+1]);
        maxRough=Math.max(maxRough,rough[index+1]);
        for(let channel=0;channel<3;channel++){
          const pixel=(yy,xx)=>(yy*size+xx)*4+channel;
          edgeDifference=Math.max(edgeDifference,
            Math.abs(normal[pixel(y,0)]-normal[pixel(y,size-1)]),
            Math.abs(normal[pixel(0,x)]-normal[pixel(size-1,x)]),
            Math.abs(rough[pixel(y,0)]-rough[pixel(y,size-1)]),
            Math.abs(rough[pixel(0,x)]-rough[pixel(size-1,x)]));
        }
      }
      output.push({category,edgeDifference,normalDetail,roughVariation:maxRough-minRough});
    }
    return output;
  });
  for(const detail of detailResults){
    assert.equal(detail.edgeDifference,0,detail.category+' relief texture seam');
    assert.ok(detail.normalDetail>4,detail.category+' normal map appears flat');
    assert.ok(detail.roughVariation>4,detail.category+' roughness map appears flat');
  }
  await page.locator('#materialCategory').selectOption('wood');
  assert.equal(await page.locator('.material-card').count(),12);
  await page.locator('#materialSearch').fill('oak');
  assert.equal(await page.locator('.material-card').count(),2);
  await page.locator('.material-card').first().click();
  assert.equal(await page.locator('#detailToggle').isEnabled(),true);
  assert.equal(await page.locator('#materialViewport').getAttribute('data-detail-enabled'),'true');
  await page.locator('#detailToggle').uncheck();
  assert.equal(await page.locator('#materialViewport').getAttribute('data-detail-enabled'),'false');
  await page.locator('#detailToggle').check();
  assert.equal(await page.locator('#materialViewport').getAttribute('data-detail-enabled'),'true');
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
