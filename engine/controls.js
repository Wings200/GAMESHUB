import {THREE} from './core.js';
import {moveVector} from './math.js';
import {resolveXZ} from './collision.js';
export {moveVector};

export class FirstPersonControls {
  constructor(canvas, camera, {walkSpeed = 4, runSpeed = 7.5, eyeHeight = 1.72, bounds = null, obstacles = []} = {}) {
    this.canvas = canvas;
    this.camera = camera;
    this.walkSpeed = walkSpeed;
    this.runSpeed = runSpeed;
    this.eyeHeight = eyeHeight;
    this.bounds = bounds;
    this.obstacles = obstacles;
    this.keys = new Set();
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.verticalSpeed = 0;
    this.dragging = false;
    this.enabled = true;
    this.pointerLocked = false;
    this.lastX = 0;
    this.lastY = 0;
    this.camera.position.y = eyeHeight;
    this.camera.rotation.order = 'YXZ';
    this.onKeyDown = event => {
      if (!this.enabled) return;
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || event.target?.isContentEditable) return;
      if (/^(Key[WASD]|ShiftLeft|ShiftRight|Space|ArrowLeft|ArrowRight|ArrowUp|ArrowDown)$/.test(event.code)) {
        if (this.enabled) event.preventDefault();
        this.keys.add(event.code);
      }
    };
    this.onKeyUp = event => this.keys.delete(event.code);
    this.onBlur = () => { this.keys.clear(); this.dragging = false; };
    this.onPointerLock = () => { this.pointerLocked = document.pointerLockElement === canvas; if (this.pointerLocked) this.dragging = false; };
    this.onMouseDown = event => {
      if (!this.enabled || event.button !== 0) return;
      this.dragging = true;
      this.lastX = event.clientX;
      this.lastY = event.clientY;
      if (canvas.requestPointerLock) {
        try { const request = canvas.requestPointerLock(); if (request?.catch) request.catch(() => {}); }
        catch { /* Drag-look remains available. */ }
      }
    };
    this.onMouseMove = event => {
      if (!this.enabled || (!this.pointerLocked && !this.dragging)) return;
      const dx = this.pointerLocked ? event.movementX : event.clientX - this.lastX;
      const dy = this.pointerLocked ? event.movementY : event.clientY - this.lastY;
      this.lastX = event.clientX;
      this.lastY = event.clientY;
      this.look(dx, dy);
    };
    this.onMouseUp = () => { this.dragging = false; };
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('pointerlockchange', this.onPointerLock);
    canvas.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  look(dx, dy) {
    this.yaw -= dx * 0.0022;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * 0.0022, -1.35, 1.35);
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  update(dt) {
    if (!this.enabled) return;
    if (this.keys.has('ArrowLeft')) this.look(190 * dt, 0);
    if (this.keys.has('ArrowRight')) this.look(-190 * dt, 0);
    const direction = moveVector(this.keys, this.yaw);
    const speed = (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) ? this.runSpeed : this.walkSpeed;
    const blend = 1 - Math.exp(-11 * dt);
    this.velocity.x += (direction.x * speed - this.velocity.x) * blend;
    this.velocity.z += (direction.z * speed - this.velocity.z) * blend;
    const position = this.camera.position;
    const target = resolveXZ({x:position.x,z:position.z},
      {x:this.velocity.x*dt,z:this.velocity.z*dt}, this.obstacles, this.bounds);
    position.x = target.x;
    position.z = target.z;
    if (target.blockedX) this.velocity.x = 0;
    if (target.blockedZ) this.velocity.z = 0;
    const grounded = position.y <= this.eyeHeight + 0.001;
    if (grounded && this.keys.has('Space')) this.verticalSpeed = 4.6;
    this.verticalSpeed -= 14 * dt;
    position.y = Math.max(this.eyeHeight, position.y + this.verticalSpeed * dt);
    if (position.y === this.eyeHeight && this.verticalSpeed < 0) this.verticalSpeed = 0;
  }

  dispose() {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('pointerlockchange', this.onPointerLock);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  }
}
