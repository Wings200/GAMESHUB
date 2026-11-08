import {MAX_LAYERS, MAX_MIX_SECONDS, mixDuration, connectMix, renderWav, clamp} from '../../engine/audio-workbench.js';

const $ = id => document.getElementById(id);
const layers = [];
let context = null;
let playing = [];
let playingTimeout = null;
let busy = false;

function report(text, isError = false) {
  $('message').textContent = text;
  $('message').classList.toggle('error', isError);
}

function updateStatus() {
  $('layerCount').textContent = `${layers.length} / ${MAX_LAYERS}`;
  $('duration').textContent = `${mixDuration(layers).toFixed(2)} SEC`;
  for (const id of ['play', 'export', 'recipe']) $(id).disabled = !layers.length || busy;
  $('stop').disabled = !playing.length;
  if (!layers.length) $('layers').innerHTML = '<div class="empty">Import recorded sound files to start building a layered sound effect.</div>';
}

async function audioContext() {
  if (!context) context = new (window.AudioContext || window.webkitAudioContext)();
  if (context.state !== 'running') await context.resume();
  return context;
}

function drawWave(canvas, layer) {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(300, canvas.clientWidth);
  const height = 80;
  canvas.width = Math.floor(width * pixelRatio);
  canvas.height = Math.floor(height * pixelRatio);
  const ctx = canvas.getContext('2d');
  ctx.scale(pixelRatio, pixelRatio);
  ctx.fillStyle = '#081623';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#243e53';
  ctx.beginPath(); ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2); ctx.stroke();
  const samples = layer.buffer.getChannelData(0);
  const step = Math.max(1, Math.floor(samples.length / width));
  ctx.strokeStyle = '#85dbf1';
  ctx.beginPath();
  for (let x = 0; x < width; x++) {
    let peak = 0;
    const from = Math.floor((x / width) * samples.length);
    for (let i = from; i < Math.min(samples.length, from + step); i += Math.max(1, Math.floor(step / 30))) {
      peak = Math.max(peak, Math.abs(samples[i]));
    }
    ctx.moveTo(x + 0.5, height / 2 - peak * 34);
    ctx.lineTo(x + 0.5, height / 2 + peak * 34);
  }
  ctx.stroke();
  const start = layer.trimStart / layer.buffer.duration * width;
  const end = layer.trimEnd / layer.buffer.duration * width;
  ctx.fillStyle = '#0009';
  ctx.fillRect(0, 0, start, height);
  ctx.fillRect(end, 0, width - end, height);
  ctx.strokeStyle = '#f8da7e';
  for (const x of [start, end]) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
}

const parameters = [
  {key: 'gain', title: 'Layer volume', min: 0, max: 2, step: .01, format: n => `${Math.round(n * 100)}%`},
  {key: 'pitch', title: 'Pitch shift', min: -12, max: 12, step: 1, format: n => `${n > 0 ? '+' : ''}${n} st`},
  {key: 'delay', title: 'Start delay', min: 0, max: 10, step: .05, format: n => `${n.toFixed(2)}s`},
  {key: 'pan', title: 'Stereo position', min: -1, max: 1, step: .05, format: n => n === 0 ? 'CENTER' : `${n < 0 ? 'L' : 'R'} ${Math.round(Math.abs(n) * 100)}`},
  {key: 'trimStart', title: 'Trim in', min: 0, max: null, step: .01, format: n => `${n.toFixed(2)}s`},
  {key: 'trimEnd', title: 'Trim out', min: 0, max: null, step: .01, format: n => `${n.toFixed(2)}s`},
  {key: 'fadeIn', title: 'Fade in', min: 0, max: 2, step: .01, format: n => `${n.toFixed(2)}s`},
  {key: 'fadeOut', title: 'Fade out', min: 0, max: 3, step: .01, format: n => `${n.toFixed(2)}s`},
  {key: 'lowpass', title: 'High-cut filter', min: 500, max: 20000, step: 100, format: n => `${Math.round(n)}Hz`}
];

function rebuildLayers() {
  const root = $('layers');
  root.replaceChildren();
  for (const [index, layer] of layers.entries()) {
    const item = document.createElement('article');
    item.className = 'layer';
    item.innerHTML = '<div class="layer-head"><div class="layer-title"><span class="index"></span><div><strong class="filename"></strong><small class="details"></small></div></div><button type="button">REMOVE</button></div><canvas class="wave"></canvas><div class="controls"></div>';
    item.querySelector('.index').textContent = String(index + 1).padStart(2, '0');
    item.querySelector('.filename').textContent = layer.name;
    item.querySelector('.details').textContent = `${layer.buffer.duration.toFixed(2)}s · ${layer.buffer.sampleRate.toLocaleString()}Hz · ${layer.buffer.numberOfChannels} channel(s)`;
    item.querySelector('.layer-head button').addEventListener('click', () => {
      stop();
      layers.splice(index, 1);
      rebuildLayers();
      report('Layer removed.');
    });
    for (const param of parameters) {
      const wrapper = document.createElement('label');
      const input = document.createElement('input');
      const output = document.createElement('output');
      input.type = 'range';
      input.dataset.key = param.key;
      input.min = param.min;
      input.max = param.max === null ? layer.buffer.duration : param.max;
      input.step = param.step;
      input.value = layer[param.key];
      output.textContent = param.format(layer[param.key]);
      const top = document.createElement('span');
      const caption = document.createElement('span');
      caption.textContent = param.title;
      top.append(caption, output);
      wrapper.append(top, input);
      input.addEventListener('input', () => {
        const next = Number(input.value);
        layer[param.key] = next;
        if (param.key === 'trimStart' && next >= layer.trimEnd) layer.trimEnd = Math.min(layer.buffer.duration, next + .01);
        if (param.key === 'trimEnd' && next <= layer.trimStart) layer.trimStart = Math.max(0, next - .01);
        output.textContent = param.format(next);
        if (param.key.startsWith('trim')) {
          for (const key of ['trimStart', 'trimEnd']) {
            const control = item.querySelector(`[data-key="${key}"]`);
            control.value = layer[key];
            control.parentElement.querySelector('output').textContent = `${layer[key].toFixed(2)}s`;
          }
          drawWave(item.querySelector('canvas'), layer);
        }
        updateStatus();
      });
      item.querySelector('.controls').appendChild(wrapper);
    }
    root.appendChild(item);
    drawWave(item.querySelector('canvas'), layer);
  }
  updateStatus();
}

async function importFiles(files) {
  if (busy) return;
  busy = true;
  updateStatus();
  let added = 0;
  let errors = [];
  try {
    const ctx = await audioContext();
    for (const file of files) {
      if (layers.length >= MAX_LAYERS) { errors.push(`Maximum ${MAX_LAYERS} layers reached.`); break; }
      if (file.size > 25 * 1024 * 1024) { errors.push(`${file.name}: exceeds 25 MB.`); continue; }
      try {
        const buffer = await ctx.decodeAudioData(await file.arrayBuffer());
        if (!buffer?.length) throw new Error('No audio samples.');
        layers.push({name: file.name, buffer, gain: .8, pitch: 0, delay: 0, pan: 0,
          trimStart: 0, trimEnd: Math.min(MAX_MIX_SECONDS, buffer.duration),
          fadeIn: .02, fadeOut: .12, lowpass: 20000});
        added++;
      } catch { errors.push(`${file.name}: could not decode this audio file.`); }
    }
  } catch (error) { errors.push(error.message || 'Unable to initialize audio decoding.'); }
  finally { busy = false; rebuildLayers(); report(`Imported ${added} recording(s). ${errors.join(' ')}`, !!errors.length); }
}

function stop() {
  for (const source of playing) { try { source.stop(); } catch {} }
  playing = [];
  if (playingTimeout) clearTimeout(playingTimeout);
  playingTimeout = null;
  updateStatus();
}

async function preview() {
  if (!layers.length) return;
  stop();
  try {
    const ctx = await audioContext();
    const mix = connectMix(ctx, layers, {masterGain: Number($('masterGain').value)});
    playing = mix.sources;
    updateStatus();
    report('Preview playing from source recordings.');
    playingTimeout = setTimeout(() => { playing = []; updateStatus(); }, (mix.duration + .2) * 1000);
  } catch (error) { report(error.message || 'Preview failed.', true); }
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function cleanName() { return ($('soundName').value || 'gameshub-sound').trim().replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 48) || 'gameshub-sound'; }

async function exportWav() {
  if (!layers.length || busy) return;
  busy = true;
  updateStatus();
  report('Rendering WAV offline…');
  try {
    const blob = await renderWav(layers, {masterGain: Number($('masterGain').value)});
    download(blob, `${cleanName()}.wav`);
    report(`Exported ${cleanName()}.wav · ${(blob.size / 1024).toFixed(0)} KB`);
  } catch (error) { report(error.message || 'WAV export failed.', true); }
  finally { busy = false; updateStatus(); }
}

function exportRecipe() {
  if (!layers.length) return;
  const recipe = {format: 'gameshub-audio-recipe-v1', name: cleanName(),
    version: '0.1.0-dev.003', masterGain: Number($('masterGain').value),
    note: 'Source recordings are not included. Reimport files by name to reproduce this mix.',
    layers: layers.map(({name, buffer, ...settings}) => ({sourceFile: name, sourceDuration: buffer.duration, ...settings}))};
  download(new Blob([JSON.stringify(recipe, null, 2)], {type: 'application/json'}), `${cleanName()}-recipe.json`);
  report('Mix recipe saved. Keep the source recordings too.');
}

$('files').addEventListener('change', event => { importFiles([...event.target.files]); event.target.value = ''; });
const dropzone = $('dropzone');
dropzone.addEventListener('click', () => $('files').click());
dropzone.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); $('files').click(); } });
for (const eventName of ['dragenter', 'dragover']) dropzone.addEventListener(eventName, event => { event.preventDefault(); dropzone.classList.add('dragover'); });
for (const eventName of ['dragleave', 'drop']) dropzone.addEventListener(eventName, event => { event.preventDefault(); dropzone.classList.remove('dragover'); });
dropzone.addEventListener('drop', event => importFiles([...event.dataTransfer.files]));
$('play').addEventListener('click', preview);
$('stop').addEventListener('click', stop);
$('export').addEventListener('click', exportWav);
$('recipe').addEventListener('click', exportRecipe);
$('masterGain').addEventListener('input', event => { $('masterGainValue').textContent = `${Math.round(Number(event.target.value) * 100)}%`; });
window.addEventListener('pagehide', () => { stop(); context?.close(); });
