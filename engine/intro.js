// Logo/title animations settle by ~3.2s. Keep the finished card visible
// before revealing the game, even when the intro is replayed.
export const INTRO_ANIMATION_MS = 3300;
export const INTRO_HOLD_MS = 1600;

export class EngineIntro {
  constructor(root, audio) {
    this.root = root;
    this.audio = audio;
    this.skip = root.querySelector('[data-skip-intro]');
    this.timer = null;
    this.done = null;
    this.skip.addEventListener('click', () => this.finish());
  }

  play() {
    this.finish();
    return new Promise(resolve => {
      this.done = resolve;
      this.root.hidden = false;
      this.root.classList.remove('playing');
      void this.root.offsetWidth; // Rewind CSS keyframes for Replay.
      this.root.classList.add('playing');
      this.audio?.intro();
      this.timer = setTimeout(() => this.finish(), INTRO_ANIMATION_MS + INTRO_HOLD_MS);
    });
  }

  finish() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (!this.done) return;
    const resolve = this.done;
    this.done = null;
    this.root.classList.remove('playing');
    this.root.hidden = true;
    resolve();
  }
}
