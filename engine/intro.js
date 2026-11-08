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
      this.timer = setTimeout(() => this.finish(), 3850);
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
