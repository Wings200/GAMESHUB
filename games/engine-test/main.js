import {GameEngine, ENGINE_VERSION} from '../../engine/core.js';
import {FirstPersonControls} from '../../engine/controls.js';
import {EngineIntro} from '../../engine/intro.js';
import {EngineAudio} from '../../engine/audio.js';
import {createTestRoom} from './room.js';

const $ = id => document.getElementById(id);
const audio = new EngineAudio();
const intro = new EngineIntro($('intro'), audio);
let engine = null;
let controls = null;
let facility = null;
let introRunning = false;

function fatal(error) {
  console.error('GAMESHUB Engine failed:', error);
  $('launch').hidden = true;
  $('intro').hidden = true;
  $('hud').hidden = true;
  $('panel').hidden = true;
  $('hint').hidden = true;
  $('reticle').hidden = true;
  $('error').hidden = false;
  $('errorMessage').textContent = error?.message || 'The browser could not start the 3D renderer.';
  controls?.dispose();
  engine?.dispose();
}

async function runIntro() {
  if (introRunning) return;
  introRunning = true;
  if (document.pointerLockElement) document.exitPointerLock();
  if (controls) controls.enabled = false;
  await intro.play();
  if (controls) controls.enabled = true;
  introRunning = false;
}

async function start() {
  $('launchButton').disabled = true;
  try {
    // The click is the audio-unlock gesture required by browsers.
    await audio.unlock().catch(() => false);
    engine = new GameEngine($('world'));
    facility = createTestRoom(engine);
    controls = new FirstPersonControls($('world'), engine.camera, {
      bounds: facility.bounds, obstacles: facility.obstacles
    });
    engine.onFrame(dt => controls.update(dt));
    let statsInterval = 0;
    engine.onFrame((dt) => {
      statsInterval += dt;
      if (statsInterval < 0.25) return;
      statsInterval = 0;
      const stats = engine.renderer.info.render;
      $('fps').textContent = engine.fps || '--';
      $('drawCalls').textContent = stats.calls;
      $('triangles').textContent = stats.triangles.toLocaleString();
      $('frameTime').textContent = engine.fps ? (1000 / engine.fps).toFixed(1) : '--';
    });
    $('launch').hidden = true;
    $('hud').hidden = false;
    $('panel').hidden = false;
    $('hint').hidden = false;
    $('reticle').hidden = false;
    $('rendererState').textContent = engine.renderer.capabilities.isWebGL2 ? 'WEBGL 2 · ACTIVE' : 'WEBGL · ACTIVE';
    engine.start();
    await runIntro();
  } catch (error) { fatal(error); }
}

$('launchButton').addEventListener('click', start, {once: true});
$('replay').addEventListener('click', async () => {
  await audio.unlock().catch(() => false);
  await runIntro();
});

function range(id, output, setter, format) {
  const input = $(id);
  const update = () => {
    const value = Number(input.value);
    $(output).textContent = format(value);
    if (engine && facility) setter(value);
  };
  input.addEventListener('input', update);
  update();
}
range('exposure', 'exposureValue', value => { engine.renderer.toneMappingExposure = value; }, value => value.toFixed(2));
range('intensity', 'intensityValue', value => { facility.key.intensity = value; }, value => value.toFixed(1));
range('resolution', 'resolutionValue', value => engine.setRenderScale(value), value => `${Math.round(value * 100)}%`);
$('shadows').addEventListener('change', event => { if (engine) engine.renderer.shadowMap.enabled = event.target.checked; });
$('audio').addEventListener('change', event => { audio.muted = !event.target.checked; });
$('soundTest').addEventListener('click', async () => { await audio.unlock().catch(() => false); audio.ping(); });
window.addEventListener('pagehide', () => {
  controls?.dispose();
  facility?.dispose();
  engine?.dispose();
  audio.dispose();
});

console.info(`GAMESHUB Engine ${ENGINE_VERSION} | Build 001 | Developer Lab`);
