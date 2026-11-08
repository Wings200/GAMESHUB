import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clampDelta} from './math.js';
import {qualitySettings, clampScale} from './quality.js';

export {THREE};
export const ENGINE_VERSION = '0.1.0-dev.009';

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
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(fov, 1, 0.08, 250);
    // The gameplay camera remains the movement/audio source; rendering can
    // optionally use a chase camera for third-person games.
    this.renderCamera = this.camera;
    this.assets = new AssetManager();
    this.renderScale = 1;
    this.quality = 'balanced';
    this.maxPixelRatio = 1.5;
    this.qualityConfig = qualitySettings('balanced');
    this.callbacks = new Set();
    this.running = false;
    this.elapsed = 0;
    this.lastTime = 0;
    this.frameId = 0;
    this.fps = 0;
    this.frames = 0;
    this.totalFrames = 0;
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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.maxPixelRatio) * this.renderScale);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    if (this.renderCamera !== this.camera && this.renderCamera?.isPerspectiveCamera) {
      this.renderCamera.aspect = width / height;
      this.renderCamera.updateProjectionMatrix();
    }
  }

  setRenderCamera(camera = this.camera) {
    if (!camera?.isCamera) throw new TypeError('Render camera must be a THREE.Camera');
    this.renderCamera = camera;
    this.resize();
    return camera;
  }

  setRenderScale(value) {
    this.renderScale = clampScale(value);
    this.resize();
  }

  setQuality(profile) {
    const options = qualitySettings(profile);
    this.quality = options.profile;
    this.qualityConfig = options;
    this.maxPixelRatio = options.pixelRatio;
    this.setRenderScale(options.renderScale);
    this.renderer.shadowMap.enabled = options.shadows;
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.toneMappingExposure = options.exposure;
    return options;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.frameId = requestAnimationFrame(this.frame);
  }

  frame(time) {
    if (!this.running) return;
    const realDt = Math.max(0,(time - this.lastTime) / 1000);
    const dt = clampDelta(realDt);
    this.lastTime = time;
    this.elapsed += realDt;
    this.frames++;
    // Frame-rate diagnostics must report wall-clock FPS, never an inflated
    // number caused by physics delta clamping on a struggling GPU.
    this.sampleTime += realDt;
    if (this.sampleTime >= 0.5) {
      this.fps = Math.round(this.frames / this.sampleTime);
      this.frames = 0;
      this.sampleTime = 0;
    }
    for (const callback of this.callbacks) callback(dt, this.elapsed);
    this.renderer.render(this.scene, this.renderCamera);
    this.totalFrames++;
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
