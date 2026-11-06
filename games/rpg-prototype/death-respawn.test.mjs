import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const main=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');
const html=readFileSync(new URL('./testing/index.html',import.meta.url),'utf8');

test('death has a real collapse camera, delayed death screen and Haven respawn',()=>{
  for(const id of ['deathScreen','deathCause','deathRespawn','deathMainMenu'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(main,/function beginPlayerDeath\(source=/);
  assert.match(main,/if\(!playerHealth\.alive\)beginPlayerDeath\(enemy\.label,zone\)/);
  assert.match(main,/deathState\.elapsed>=1\.8/);
  assert.match(main,/playerAvatar\.root\.visible=thirdPersonActive\|\|deathState\.active/);
  assert.match(main,/thirdPersonCamera\.lookAt\(deathState\.x,focusY,deathState\.z\)/);
  assert.match(main,/function respawnAtHaven\(/);
  assert.match(main,/resetPlayerHealth\(playerHealth\)/);
  assert.match(main,/player\.x=HAVEN_RESPAWN\.x;player\.z=HAVEN_RESPAWN\.z/);
  assert.doesNotMatch(main,/YOU ARE DOWN · PRESS H TO RESPAWN/);
});

test('death retains backpack but parks and saves the exact occupied suit',()=>{
  const start=main.indexOf('function beginPlayerDeath(');
  const end=main.indexOf('function respawnAtHaven(',start);
  const death=main.slice(start,end);
  assert.match(death,/poweredSuit\.root\.position\.set\(player\.x,0,player\.z\)/);
  assert.match(death,/powerArmorState\.occupied=false/);
  assert.match(death,/markPowerFrameWorn\(activePowerFrame\.id\)/);
  assert.match(death,/savePowerArmor\(\)/);
  assert.doesNotMatch(death,/removeItem\(|createBackpack\(|resetBackpack\(/);
  assert.match(main,/fallen\.visual\.root\.rotation\.z=-\.85\*ease/);
  assert.match(main,/frame\.visual\.root\.rotation\.z=0/);
});

test('map tracks only the latest actually worn and parked power armor frame',()=>{
  assert.match(main,/lastWornPowerFrameId=localStorage\.getItem\('rpg-last-worn-power-frame-v1'\)/);
  assert.match(main,/function recentPowerArmorTarget\(\)/);
  assert.match(main,/if\(!frame\|\|frame\.state\.occupied\)return null/);
  assert.match(main,/if\(powerArmorState\.occupied\)markPowerFrameWorn\(activePowerFrame\.id\)/);
  assert.match(main,/fieldMap\.setPowerArmorTarget\(target\)/);
  assert.match(main,/trackLastPowerArmor=!trackLastPowerArmor/);
  assert.match(main,/rpg-track-last-power-frame-v1/);
  for(const id of ['fieldPowerArmorWaypoint','visorPowerArmorWaypoint',
    'fieldMapPowerTrack','fieldMapPowerStatus'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(main,/messages\.push\('▣ POWER ARMOR · '/);
});
