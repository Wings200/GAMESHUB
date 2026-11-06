import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {POWER_ARMOR_SLOTS} from './power-armor.mjs';

const html=readFileSync(new URL('./testing/index.html',import.meta.url),'utf8');
const main=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');

test('six clickable service figure segments match the visor condition figure',()=>{
  for(const slot of POWER_ARMOR_SLOTS){
    const visor=html.match(new RegExp('<g id="visorArmor-'+slot+'"[^>]*>\\s*<path class="armor-shell" d="([^"]+)"'));
    const service=html.match(new RegExp('<g id="powerFigure-'+slot+'"[^>]*>\\s*<path class="armor-shell" d="([^"]+)"'));
    assert.ok(visor&&service,slot+' is present in both indicators');
    assert.equal(service[1],visor[1],slot+' uses the same silhouette as the HUD');
    assert.match(main,/const target=\$\('powerFigure-'\+slot\)/); // interactive slot binding
  }
});

test('configuration layout centers the figure between chassis status and part selection',()=>{
  const start=html.indexOf('<div class="power-service-layout">');
  const end=html.indexOf('<div class="loot-meta"',start);
  const layout=html.slice(start,end);
  assert.ok(layout.indexOf('power-status-pane')<layout.indexOf('power-figure-pane'));
  assert.ok(layout.indexOf('power-figure-pane')<layout.indexOf('power-config-pane'));
  for(const id of ['powerChassisSummary','powerPartChoices','powerPartPreviewName',
    'powerPartPreviewDetails','powerSelectedFill','powerPartAction','powerRepairSelected'])
    assert.match(layout,new RegExp('id="'+id+'"'));
});

test('previewing an owned plate does not install it before explicit confirmation',()=>{
  assert.match(main,/let selectedPowerChoice='installed'/);
  assert.match(main,/selectedPowerChoice=option\.id;\s*refreshPowerPartChoices\(\)/);
  assert.match(main,/NO PARTS HAVE BEEN MOVED/);
  assert.match(main,/\$\('powerPartAction'\)\.addEventListener\('click',/);
  assert.match(main,/picker\.dispatchEvent\(new Event\('change'/);
  assert.match(main,/\$\('powerRepairSelected'\)\.addEventListener\('click',/);
  assert.match(main,/selectedPowerChoice='installed';\s*refreshPowerArmorUI\(\);refreshInventoryUI\(\)/);
});

test('each discovered chassis can be entered, configured and saved independently',()=>{
  assert.match(main,/for\(const definition of ABANDONED_POWER_FRAMES\)/);
  assert.match(main,/registerPowerFrame\(definition.id/);
  assert.match(main,/function selectNearbyPowerFrame\(\)/);
  assert.match(main,/activePowerFrame=selected;[\s\S]*?poweredSuit=selected.visual;[\s\S]*?powerArmorState=selected.state/);
  assert.match(main,/rpg-lab-abandoned-power-frames-v1/);
  assert.match(main,/rpg-lab-power-frame-positions-v1/);
  assert.match(main,/lastAppearanceKey=''; \/\/ recolor/);
  assert.match(html,/id="powerFrameIdentity"/);
});
