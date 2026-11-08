import {GameEngine, ENGINE_VERSION} from '../../engine/core.js?v=build009';
import {FirstPersonControls} from '../../engine/controls.js';
import {EngineIntro} from '../../engine/intro.js?v=build009';
import {EngineAudio} from '../../engine/audio.js?v=build009';
import {ENGINE_LOGO_MP3} from '../../engine/generated-sounds.js?v=build009';
import {installPolishedFoley} from '../../engine/foley.js?v=build009';
import {createTestRoom} from './room.js?v=build009';
import {FootstepSequencer} from '../../engine/footsteps.js?v=build009';

const $ = id => document.getElementById(id);
const audio = new EngineAudio();
const intro = new EngineIntro($('intro'), audio);
let engine = null;
let controls = null;
let facility = null;
let introRunning = false;
const steps = new FootstepSequencer(event => audio.footstep(event));
let recordedStepsReady = 0;

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
  steps.reset();
  await intro.play();
  if (controls) controls.enabled = true;
  introRunning = false;
}

async function start() {
  $('launchButton').disabled = true;
  try {
    // The click is the audio-unlock gesture required by browsers.
    const audioReady = await audio.unlock().catch(() => false);
    if (audioReady) {
      const assets = await Promise.allSettled([
        audio.loadEncodedClip('gameshub-logo-intro', ENGINE_LOGO_MP3),
      ]);
      for (const result of assets) if (result.status === 'rejected') console.warn('Audio asset failed to load:', result.reason);
      try { installPolishedFoley(audio); }
      catch (error) { console.warn('Mechanical Foley could not be prepared:', error); }
      const recordings=await Promise.allSettled(
        Array.from({length:5},(_,i)=>audio.loadClip(
          'footstep-concrete-'+i,
          new URL('./assets/audio/footstep_concrete_'+String(i).padStart(3,'0')+'.ogg',import.meta.url)
        ))
      );
      recordedStepsReady=recordings.filter(r=>r.status==='fulfilled').length;
      for(const failure of recordings) if(failure.status==='rejected')
        console.warn('A licensed recorded footstep could not load:',failure.reason);
      $('footstepStatus').textContent=recordedStepsReady===5
        ? 'RECORDED FOOTSTEPS · CONCRETE · 5 VARIANTS READY'
        : 'RECORDED FOOTSTEPS · '+recordedStepsReady+'/5 LOADED';

    }
    engine = new GameEngine($('world'));
    engine.setQuality($('quality').value);
    facility = createTestRoom(engine);
    controls = new FirstPersonControls($('world'), engine.camera, {
      bounds: facility.bounds, obstacles: facility.obstacles
    });
    // Spawn facing the new SOUTH chamber entrance; E operates the door.
    controls.yaw=Math.PI;
    controls.camera.rotation.y=Math.PI;
    engine.onFrame(dt => {
      const startX=controls.camera.position.x, startZ=controls.camera.position.z;
      controls.update(dt);
      const moved=Math.hypot(controls.camera.position.x-startX,controls.camera.position.z-startZ);
      steps.advance({
        distance:moved,
        grounded:controls.camera.position.y<=controls.eyeHeight+.001,
        running:controls.keys.has('ShiftLeft')||controls.keys.has('ShiftRight'),
        enabled:controls.enabled&&!introRunning&&!audio.muted&&$('footsteps').checked
      });
    });
    $('lampStatus').textContent=facility.fixtureLights.length+' REAL DOWNLIGHTS · LINKED TO VISIBLE CEILING PANELS';
    let lastStatsTick = 0;
    engine.onFrame(() => {
      const now=performance.now();
      if (now-lastStatsTick < 250) return;
      lastStatsTick=now;
      const stats = engine.renderer.info.render;
      $('fps').textContent = engine.fps || '--';
      $('drawCalls').textContent = stats.calls;
      $('triangles').textContent = stats.triangles.toLocaleString();
      $('frameTime').textContent = engine.fps ? (1000 / engine.fps).toFixed(1) : '--';
      const chamber=facility.chamber.getStatus();
      $('doorStatus').dataset.requestedOpen=String(chamber.requestedOpen);
      $('doorStatus').dataset.directIntensity=chamber.directIntensity.toFixed(2);
      $('doorStatus').dataset.bounceIntensity=chamber.bounceIntensity.toFixed(2);
      $('doorStatus').textContent=chamber.openness>=.998
        ? 'DOOR OPEN · LIGHT ENTERING CHAMBER'
        : chamber.openness<=.002 ? 'DOOR CLOSED · CHAMBER UNLIT' : 'DOOR MOVING · '+Math.round(chamber.openness*100)+'%';
      $('doorToggle').textContent=chamber.requestedOpen?'CLOSE CHAMBER DOOR':'OPEN CHAMBER DOOR';
      const captures=facility.getReflectionCaptures();
      $('reflectionStatus').textContent='REFLECTION PROBES · SHOWROOM '+captures.showroom
        +' / CHAMBER '+captures.chamber
        + (chamber.localProbeEnabled?' · ENABLED':' · DISABLED');
      const near=facility.chamber.near(controls.camera.position.x,controls.camera.position.z);
      $('doorHint').hidden=!near || introRunning;
      $('doorHint').textContent=chamber.requestedOpen?'PRESS E TO CLOSE DOOR':'PRESS E TO OPEN DOOR';
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
range('intensity', 'intensityValue', value => { facility.setCeilingIntensity(value); }, value => value.toFixed(1));
range('resolution', 'resolutionValue', value => engine.setRenderScale(value), value => `${Math.round(value * 100)}%`);
$('quality').addEventListener('change', event => {
  if (!engine || !facility) return;
  const config=engine.setQuality(event.target.value);
  facility.setShadowQuality(config.profile);
  facility.setCeilingIntensity(Number($('intensity').value));
  $('resolution').value=String(config.renderScale);
  $('resolutionValue').textContent=`${Math.round(config.renderScale*100)}%`;
  $('exposure').value=String(config.exposure);
  $('exposureValue').textContent=config.exposure.toFixed(2);
  $('shadows').checked=config.shadows;
});
$('motion').addEventListener('change', event => facility?.setMotion(event.target.checked));
$('shadows').addEventListener('change', event => { if (engine) { engine.renderer.shadowMap.enabled = event.target.checked; engine.renderer.shadowMap.needsUpdate=true; } });
$('audio').addEventListener('change', event => { audio.muted = !event.target.checked; });
$('soundTest').addEventListener('click', async () => { await audio.unlock().catch(() => false); audio.ping(); });

function interactWithDoor(force=false) {
  if (!facility || !controls || introRunning) return;
  if(!facility.chamber.toggle(controls.camera.position,force))
    $('doorStatus').textContent='DOOR BLOCKED · MOVE AWAY FROM SWING PATH';
}
$('doorToggle').addEventListener('click',()=>interactWithDoor(true));
function onDoorKey(event) {
  if(event.code!=='KeyE'||event.repeat||event.ctrlKey||event.altKey||event.metaKey) return;
  if (['INPUT','TEXTAREA','SELECT','BUTTON'].includes(event.target?.tagName) || event.target?.isContentEditable) return;
  if(!controls?.enabled) return;
  event.preventDefault();
  interactWithDoor(false);
}
document.addEventListener('keydown',onDoorKey);
$('reflectionToggle').addEventListener('change',event=>facility?.setReflectionEnabled(event.target.checked));
$('probeNow').addEventListener('click',()=>{
  if(!facility)return;
  const result=facility.captureReflections();
  if(!result.showroom && !result.chamber)
    $('reflectionStatus').textContent='REFLECTION CAPTURE UNAVAILABLE IN THIS QUALITY MODE';
});
$('bounceToggle').addEventListener('change',event=>facility?.chamber.setBounce(event.target.checked));
$('footstepLevel').addEventListener('input',event=>{
  const level=Number(event.target.value);
  audio.setFootstepMix(level/100);
  $('footstepLevelValue').textContent=level+'%';
});

window.addEventListener('pagehide', () => {
  document.removeEventListener('keydown',onDoorKey);
  controls?.dispose();
  facility?.dispose();
  engine?.dispose();
  steps.reset();
  audio.dispose();
});

console.info(`GAMESHUB Engine ${ENGINE_VERSION} | Build 009 | Developer Lab`);
