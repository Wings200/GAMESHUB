import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clampDelta} from './math.js';

export {THREE};
export const ENGINE_VERSION = '0.1.0-dev.003';

export {clampDelta};

export class AssetManager {
  constructor() {
    this.textures = new THREE.TextureLoader();
    this.models = new GLTFLoader();
  }
  async texture(url) {
    const texture = await this.textures.loadAsync(url);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
  }
  model(url) { return this.models.loadAsync(url); }
}

export class GameEngine {
  constructor(canvas, {fov = 72, antialias = true} = {}) {
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Engine requires a canvas element.');
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({canvas, antialias, powerPreference: 'high-performance'});
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(fov, 1, 0.08, 250);
    this.assets = new AssetManager();
    this.renderScale = 1;
    this.callbacks = new Set();
    this.running = false;
    this.elapsed = 0;
    this.lastTime = 0;
    this.frameId = 0;
    this.fps = 0;
    this.frames = 0;
    this.sampleTime = 0;
    this.resize = this.resize.bind(this);
    this.frame = this.frame.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
  }

  onFrame(callback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  resize() {
    const width = Math.max(1, this.canvas.clientWidth || window.innerWidth);
    const height = Math.max(1, this.canvas.clientHeight || window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2) * this.renderScale);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  setRenderScale(value) {
    this.renderScale = THREE.MathUtils.clamp(Number(value) || 1, 0.5, 1);
    this.resize();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.frameId = requestAnimationFrame(this.frame);
  }

  frame(time) {
    if (!this.running) return;
    const dt = clampDelta((time - this.lastTime) / 1000);
    this.lastTime = time;
    this.elapsed += dt;
    this.frames++;
    this.sampleTime += dt;
    if (this.sampleTime >= 0.5) {
      this.fps = Math.round(this.frames / this.sampleTime);
      this.frames = 0;
      this.sampleTime = 0;
    }
    for (const callback of this.callbacks) callback(dt, this.elapsed);
    this.renderer.render(this.scene, this.camera);
    this.frameId = requestAnimationFrame(this.frame);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.frameId);
  }

  dispose() {
    this.stop();
    window.removeEventListener('resize', this.resize);
    this.callbacks.clear();
    this.renderer.dispose();
  }
}
