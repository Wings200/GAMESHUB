// GAMESHUB Engine — second sound-design pass, 0.1.0-dev.006.
// Noise-forward, aperiodic mechanical Foley layers. No pitched UI chimes.
// Deterministic PCM rendering lets every browser reuse exactly the same cue.
const SAMPLE_RATE = 48000;

function createSound(duration, seed) {
  const length = Math.round(duration * SAMPLE_RATE);
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  let state = seed >>> 0;
  const random = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296 * 2 - 1;
  };
  function addAt(index, value, pan = 0) {
    if (index < 0 || index >= length) return;
    left[index] += value * (1 - Math.max(0, pan)) * 0.78;
    right[index] += value * (1 + Math.min(0, pan)) * 0.78;
  }
  // One band of broad, filtered random pressure; no repeating tone.
  function burst({at, duration = 0.16, gain = 0.28, low = 120, high = 6500, decay = 0.045, pan = 0, attack = 0.001}) {
    const from = Math.round(at * SAMPLE_RATE);
    const total = Math.min(length - from, Math.ceil(duration * SAMPLE_RATE));
    if (total <= 0) return;
    const lowA = Math.min(0.95, 2 * Math.PI * low / SAMPLE_RATE);
    const highA = Math.min(0.95, 2 * Math.PI * high / SAMPLE_RATE);
    let lowState = 0, bandState = 0;
    const invAttack = 1 / Math.max(1, attack * SAMPLE_RATE);
    for (let i = 0; i < total; i++) {
      const white = random();
      lowState += lowA * (white - lowState);
      const highPassed = white - lowState;
      bandState += highA * (highPassed - bandState);
      const env = Math.min(1, i * invAttack) * Math.exp(-i / (decay * SAMPLE_RATE));
      addAt(from + i, bandState * gain * env, pan);
    }
  }
  function bass(at, duration = 0.36, gain = 0.21) {
    const from = Math.round(at * SAMPLE_RATE);
    const n = Math.min(Math.round(duration * SAMPLE_RATE), length - from);
    let phase = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SAMPLE_RATE;
      const hz = 74 * Math.exp(-t * 15) + 38;
      phase += 2 * Math.PI * hz / SAMPLE_RATE;
      const env = Math.min(1, t / 0.006) * Math.exp(-t * 8.5);
      addAt(from + i, Math.sin(phase) * gain * env);
    }
  }
  function mechanicalHit(at, strength = 1, pan = 0) {
    // Hard metal edge, a chunky steel body and brief gritty resonance.
    burst({at, duration: 0.045, gain: 1.45 * strength, low: 900, high: 14000, decay: 0.008, pan, attack: 0.0002});
    burst({at: at + 0.002, duration: 0.17, gain: 0.86 * strength, low: 110, high: 3600, decay: 0.034, pan, attack: 0.0002});
    burst({at: at + 0.004, duration: 0.21, gain: 0.45 * strength, low: 80, high: 950, decay: 0.074, pan, attack: 0.001});
    burst({at: at + 0.018, duration: 0.1, gain: 0.19 * strength, low: 1500, high: 9000, decay: 0.04, pan, attack: 0.0004});
  }
  function scrape(at, duration = 0.23, gain = 0.2, pan = 0) {
    // A rough mechanical slide with interrupted contact, not a ringing note.
    const from = Math.round(at * SAMPLE_RATE);
    const total = Math.min(Math.round(duration * SAMPLE_RATE), length - from);
    let lower = 0, upper = 0;
    for (let i = 0; i < total; i++) {
      const t = i / SAMPLE_RATE;
      const white = random();
      lower += 0.035 * (white - lower);
      upper += 0.48 * ((white - lower) - upper);
      const rough = 0.55 + 0.25 * Math.sin(t * 740) + 0.2 * Math.sin(t * 329);
      const env = Math.sin(Math.PI * Math.min(1, t / duration)) ** 0.7 * Math.exp(-t * 3.5);
      addAt(from + i, upper * rough * gain * env, pan);
    }
  }
  function finish({gain = 1, echo = true} = {}) {
    if (echo) {
      // Sparse room reflections; no sustained pitched feedback or wet reverb.
      const offsets = [0.019, 0.053, 0.096].map(v => Math.round(v * SAMPLE_RATE));
      const taps = [0.11, -0.075, 0.045];
      for (let k = 0; k < offsets.length; k++) {
        const lag = offsets[k], a = taps[k];
        for (let i = length - 1; i >= lag; i--) {
          left[i] += right[i - lag] * a;
          right[i] += left[i - lag] * a;
        }
      }
    }
    let peak = 0;
    for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
    const scale = peak > 0 ? gain * 0.78 / peak : 1;
    for (let i = 0; i < length; i++) {
      const endFade = Math.min(1, (length - 1 - i) / (0.08 * SAMPLE_RATE));
      left[i] = Math.tanh(left[i] * scale) * endFade;
      right[i] = Math.tanh(right[i] * scale) * endFade;
    }
    return {sampleRate: SAMPLE_RATE, duration, left, right};
  }
  return {burst, bass, mechanicalHit, scrape, finish};
}

export function renderMechanicalTestCue() {
  const sound = createSound(0.92, 0x7ee36dc1);
  sound.mechanicalHit(0.055, 1);
  sound.bass(0.06, 0.22, 0.17);
  sound.scrape(0.107, 0.19, 0.24, 0.08);
  // Uneven bounce and short loose hardware rattling, not two musical notes.
  sound.mechanicalHit(0.154, 0.22, 0.16);
  sound.mechanicalHit(0.199, 0.11, -0.25);
  sound.burst({at: 0.242, duration: 0.12, gain: 0.16, low: 480, high: 4300, decay: 0.039, pan: 0.15});
  return sound.finish();
}

export function renderIntroMetalOverlay() {
  const sound = createSound(4.82, 0x2f74cadb);
  // Enhance, don't replace the existing airy sweep and logo impact.
  sound.scrape(0.47, 0.3, 0.12, -0.35);
  sound.mechanicalHit(0.59, 0.19, -0.4);
  sound.mechanicalHit(0.93, 0.24, 0.25);
  sound.scrape(1.02, 0.26, 0.18, 0.2);
  sound.mechanicalHit(1.17, 0.3, -0.13);
  sound.mechanicalHit(1.43, 1.0);
  sound.bass(1.42, 0.62, 0.27);
  sound.scrape(1.57, 0.32, 0.24, 0.1);
  sound.mechanicalHit(1.86, 0.13, 0.35);
  sound.burst({at: 1.95, duration: 0.55, gain: 0.19, low: 230, high: 6500, decay: 0.2});
  return sound.finish({gain: 0.72});
}

export function installPolishedFoley(audio) {
  if (!audio?.context || audio.context.state !== 'running') return false;
  for (const [name, render] of [
    ['gameshub-mechanical-test', renderMechanicalTestCue],
    ['gameshub-intro-metal-overlay', renderIntroMetalOverlay],
  ]) {
    const sound = render();
    const buffer = audio.context.createBuffer(2, sound.left.length, sound.sampleRate);
    buffer.copyToChannel(sound.left, 0);
    buffer.copyToChannel(sound.right, 1);
    audio.clips.set(name, buffer);
  }
  return true;
}
