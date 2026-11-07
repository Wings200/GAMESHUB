import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('./testing/index.html',import.meta.url),'utf8');
const bootstrap=readFileSync(new URL('./testing/bootstrap.mjs',import.meta.url),'utf8');

test('systems testing splash leads with living settlement construction',()=>{
  const log=html.slice(html.indexOf('<div id="menu">'),html.indexOf('<div class="endurance-picker">'));
  assert.match(log,/GAMESHUB \/ RPG SYSTEMS LAB \/ W20\.92/);
  assert.match(log,/<strong>W20\.92 · CRIPPLED LIMBS AFFECT ENEMY COMBAT:<\/strong>/);
  assert.match(log,/<strong>W20\.91 · LIVE V\.A\.T\.S\. SHOT QUEUE:<\/strong>/);
  assert.match(log,/<strong>W20\.90 · TACTICAL BODY-PART TARGETING:<\/strong>/);
  assert.match(log,/<strong>W20\.89 · LIMB INJURIES &amp; FUNCTIONAL MEDICAL CARE:<\/strong>/);
  assert.match(log,/<strong>W20\.88 · LIVE SIX-LEVEL RADIATION GAUGE:<\/strong>/);
  assert.match(log,/<strong>W20\.87 · ACTUAL RADIATION HP LOSS &amp; HUD FIX:<\/strong>/);
  assert.match(log,/<strong>W20\.86 · HAZARD SCENE REPAIR &amp; COLLISION PASS:<\/strong>/);
  assert.match(log,/<strong>W20\.85 · RADIATION & FULL RPG REBUILD FOUNDATION:<\/strong>/);
  assert.match(log,/<strong>W20\.84 · MODULAR ROOF MODELS & SCALE FIX:<\/strong>/);
  assert.match(log,/<strong>W20\.83 · WALL CORNER JOINING & EDGE SNAP:<\/strong>/);
  assert.match(log,/<strong>W20\.82 · REAL SETTLEMENT OBJECT STORAGE:<\/strong>/);
  assert.match(log,/<strong>W20\.81 · TRUE SETTLEMENT SCRAP & POWER ARMOR GANTRY:<\/strong>/);
  assert.match(log,/<strong>W20\.80 · PLACEABLE WORKBENCHES & WORLD SALVAGE:<\/strong>/);
  assert.match(log,/<strong>W20\.79 · LIVING SETTLEMENT WORKSHOP:<\/strong>/);
  assert.match(log,/<strong>W20\.78 · HAVEN JUNCTION WORKSHOP BUILDING:<\/strong>/);
  assert.match(log,/<strong>W20\.77\.2 · CORRECT CORNER PEEK DIRECTION:<\/strong>/);
  assert.match(log,/<strong>W20\.77\.1 · RAISED RIFLES & PHYSICAL CORNER PEEKING:<\/strong>/);
  assert.match(log,/<strong>W20\.77 · ENEMY INTELLIGENCE & COMBAT OVERHAUL:<\/strong>/);
  assert.match(log,/<strong>W20\.76\.1 · FIRST-PERSON DEATH CINEMATIC:<\/strong>/);
  assert.match(log,/<strong>W20\.76 · DEATH & POWER ARMOR RECOVERY:<\/strong>/);
  assert.match(log,/<strong>W20\.75\.2 · SETTLEMENT WEAPON WORKBENCH:<\/strong>/);
  assert.match(log,/<strong>W20\.75\.1 · READ-ONLY DIAGNOSTICS:<\/strong>/);
  assert.match(log,/<strong>W20\.75 · FACTION POWER ARMOR & FOUND FRAMES:<\/strong>/);
  assert.match(log,/<strong>W20\.74\.1 · POWER ARMOR REPAIRS:<\/strong>/);
  assert.match(log,/<strong>W20\.74 · POWER ARMOR CONFIGURATION:<\/strong>/);
  assert.match(log,/<strong>W20\.73 · WEAPON WORKBENCH:<\/strong>/);
  assert.match(log,/<strong>W20\.72\.1 · BARTER CONFIRMATION:<\/strong>/);
  assert.match(log,/<strong>W20\.72 · VENDOR TRADING:<\/strong>/);
  assert.match(log,/<strong>W20\.71 · LOOT TRANSFERS:<\/strong>/);
  assert.match(log,/<strong>W20\.70 · LOOT CASE GLOW:<\/strong>/);
  assert.match(log,/floating LOOT labels/);
  assert.ok(log.indexOf('W20.92 · CRIPPLED LIMBS AFFECT ENEMY COMBAT')<
    log.indexOf('W20.91 · LIVE V.A.T.S. SHOT QUEUE'));
  assert.ok(log.indexOf('W20.91 · LIVE V.A.T.S. SHOT QUEUE')<
    log.indexOf('W20.90 · TACTICAL BODY-PART TARGETING'));
  assert.ok(log.indexOf('W20.90 · TACTICAL BODY-PART TARGETING')<
    log.indexOf('W20.89 · LIMB INJURIES'));
  assert.ok(log.indexOf('W20.89 · LIMB INJURIES')<
    log.indexOf('W20.88 · LIVE SIX-LEVEL RADIATION GAUGE'));
  assert.ok(log.indexOf('W20.88 · LIVE SIX-LEVEL RADIATION GAUGE')<
    log.indexOf('W20.87 · ACTUAL RADIATION HP LOSS'));
  assert.ok(log.indexOf('W20.87 · ACTUAL RADIATION HP LOSS')<
    log.indexOf('W20.86 · HAZARD SCENE REPAIR'));
  assert.ok(log.indexOf('W20.86 · HAZARD SCENE REPAIR')<
    log.indexOf('W20.85 · RADIATION & FULL RPG REBUILD FOUNDATION'));
  assert.ok(log.indexOf('W20.85 · RADIATION & FULL RPG REBUILD FOUNDATION')<
    log.indexOf('W20.84 · MODULAR ROOF MODELS & SCALE FIX'));
  assert.ok(log.indexOf('W20.84 · MODULAR ROOF MODELS & SCALE FIX')<
    log.indexOf('W20.83 · WALL CORNER JOINING & EDGE SNAP'));
  assert.ok(log.indexOf('W20.83 · WALL CORNER JOINING & EDGE SNAP')<
    log.indexOf('W20.82 · REAL SETTLEMENT OBJECT STORAGE'));
  assert.ok(log.indexOf('W20.82 · REAL SETTLEMENT OBJECT STORAGE')<
    log.indexOf('W20.81 · TRUE SETTLEMENT SCRAP & POWER ARMOR GANTRY'));
  assert.ok(log.indexOf('W20.81 · TRUE SETTLEMENT SCRAP & POWER ARMOR GANTRY')<
    log.indexOf('W20.80 · PLACEABLE WORKBENCHES & WORLD SALVAGE'));
  assert.ok(log.indexOf('W20.80 · PLACEABLE WORKBENCHES & WORLD SALVAGE')<
    log.indexOf('W20.79 · LIVING SETTLEMENT WORKSHOP'));
  assert.ok(log.indexOf('W20.79 · LIVING SETTLEMENT WORKSHOP')<
    log.indexOf('W20.78 · HAVEN JUNCTION WORKSHOP BUILDING'));
  assert.ok(log.indexOf('W20.78 · HAVEN JUNCTION WORKSHOP BUILDING')<
    log.indexOf('W20.77.2 · CORRECT CORNER PEEK DIRECTION'));
  assert.ok(log.indexOf('W20.77.2 · CORRECT CORNER PEEK DIRECTION')<
    log.indexOf('W20.77.1 · RAISED RIFLES & PHYSICAL CORNER PEEKING'));
  assert.ok(log.indexOf('W20.77.1 · RAISED RIFLES & PHYSICAL CORNER PEEKING')<
    log.indexOf('W20.77 · ENEMY INTELLIGENCE & COMBAT OVERHAUL'));
  assert.ok(log.indexOf('W20.77 · ENEMY INTELLIGENCE & COMBAT OVERHAUL')<
    log.indexOf('W20.76.1 · FIRST-PERSON DEATH CINEMATIC'));
  assert.ok(log.indexOf('W20.76.1 · FIRST-PERSON DEATH CINEMATIC')<
    log.indexOf('W20.76 · DEATH & POWER ARMOR RECOVERY'));
  assert.ok(log.indexOf('W20.76 · DEATH & POWER ARMOR RECOVERY')<
    log.indexOf('W20.75.2 · SETTLEMENT WEAPON WORKBENCH'));
  assert.ok(log.indexOf('W20.75.2 · SETTLEMENT WEAPON WORKBENCH')<
    log.indexOf('W20.75.1 · READ-ONLY DIAGNOSTICS'));
  assert.ok(log.indexOf('W20.75.1 · READ-ONLY DIAGNOSTICS')<
    log.indexOf('W20.75 · FACTION POWER ARMOR'));
  assert.ok(log.indexOf('W20.75 · FACTION POWER ARMOR')<
    log.indexOf('W20.74.1 · POWER ARMOR REPAIRS'));
});

test('testing entry uses one cache-busted release version',()=>{
  assert.match(html,/bootstrap\.mjs\?v=W20\.92/);
  assert.match(bootstrap,/main\.js\?v=W20\.92/);
});
