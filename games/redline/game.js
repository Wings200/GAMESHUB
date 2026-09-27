import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

const canvas = document.getElementById("gameCanvas");
const menu = document.getElementById("menu");
const hud = document.getElementById("hud");
const startBtn = document.getElementById("startBtn");
const trackSelect = document.getElementById("trackSelect");
const trackNameEl = document.getElementById("trackName");
const objectiveEl = document.getElementById("objective");
const speedEl = document.getElementById("speed");
const gearEl = document.getElementById("gear");
const rpmBar = document.getElementById("rpmBar");
const nitroBar = document.getElementById("nitroBar");
const fpsEl = document.getElementById("fps");
const countdown = document.getElementById("countdown");
const message = document.getElementById("message");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  powerPreference: "high-performance"
});

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(68, 16 / 9, 0.1, 340);

scene.add(new THREE.HemisphereLight(0xffffff, 0x253040, 1.65));

const sun = new THREE.DirectionalLight(0xffffff, 1.25);
sun.position.set(20, 45, 15);
scene.add(sun);

const clock = new THREE.Clock();
const keys = new Set();

let worldGroup = null;
let car = null;
let carState = null;
let activeTrack = null;
let raceActive = false;
let currentCheckpoint = 0;
let lap = 1;
const targetLaps = 3;

let lastFpsTime = performance.now();
let fpsFrames = 0;

const quality = {
  renderScale: 0.72,
  sceneryStep: 2,
  particles: true
};

const tracks = {
  neon: {
    name: "NEON DISTRICT",
    sky: 0x0b1020,
    fog: 0x0b1020,
    ground: 0x111722,
    road: 0x242a35,
    edge: 0x4f5a6d,
    grip: 1.0,
    points: [
      [-8, 0], [0, -35], [22, -72], [58, -90], [94, -76],
      [118, -45], [122, -7], [103, 28], [67, 49], [28, 52],
      [-13, 39], [-35, 8]
    ]
  },

  canyon: {
    name: "DUSTFALL CANYON",
    sky: 0xb06c3a,
    fog: 0xb06c3a,
    ground: 0x8a5732,
    road: 0x48413c,
    edge: 0x72563f,
    grip: 0.92,
    points: [
      [-10, 0], [-3, -42], [20, -79], [58, -111], [104, -113],
      [139, -86], [151, -46], [140, -5], [110, 30], [70, 45],
      [27, 37], [-3, 18]
    ]
  },

  arctic: {
    name: "ARCTIC RELAY",
    sky: 0xbad7df,
    fog: 0xbad7df,
    ground: 0xd4e7eb,
    road: 0x52646d,
    edge: 0x8fb6bf,
    grip: 0.72,
    points: [
      [-8, 0], [-15, -38], [0, -80], [33, -110], [77, -116],
      [111, -93], [132, -55], [128, -17], [104, 20], [69, 43],
      [28, 48], [-7, 30]
    ]
  }
};

const ROAD_HALF = 6.8;

function resizeRenderer() {
  const w = Math.max(320, window.innerWidth);
  const h = Math.max(240, window.innerHeight);
  const scale = quality.renderScale;

  renderer.setSize(Math.floor(w * scale), Math.floor(h * scale), false);
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";

  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

window.addEventListener("resize", resizeRenderer);
resizeRenderer();

function disposeWorld() {
  if (!worldGroup) return;

  worldGroup.traverse(obj => {
    if (obj.geometry) obj.geometry.dispose?.();
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach(m => m.dispose?.());
    }
  });

  scene.remove(worldGroup);
  worldGroup = null;
}

function v2To3(p, y = 0) {
  return new THREE.Vector3(p[0], y, p[1]);
}

function buildRoad(points, materialColor, edgeColor) {
  const verts = [];
  const idx = [];

  const closed = [...points, points[0]];

  for (let i = 0; i < closed.length; i++) {
    const curr = v2To3(closed[i]);
    const prev = v2To3(closed[(i - 1 + closed.length) % closed.length]);
    const next = v2To3(closed[(i + 1) % closed.length]);

    const tangent = next.clone().sub(prev).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);

    const left = curr.clone().addScaledVector(normal, ROAD_HALF);
    const right = curr.clone().addScaledVector(normal, -ROAD_HALF);

    verts.push(left.x, 0.03, left.z);
    verts.push(right.x, 0.03, right.z);
  }

  for (let i = 0; i < closed.length - 1; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    idx.push(a, b, c, b, d, c);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  const road = new THREE.Mesh(
    geo,
    new THREE.MeshLambertMaterial({ color: materialColor })
  );

  const edgeGeo = new THREE.BoxGeometry(0.16, 0.06, 1);
  const edgeMat = new THREE.MeshBasicMaterial({ color: edgeColor });

  for (let i = 0; i < points.length; i++) {
    const a = v2To3(points[i], 0.07);
    const b = v2To3(points[(i + 1) % points.length], 0.07);
    const dir = b.clone().sub(a);
    const len = dir.length();
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const angle = Math.atan2(dir.x, dir.z);

    for (const side of [-1, 1]) {
      const tangent = dir.clone().normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);
      const e = new THREE.Mesh(edgeGeo, edgeMat);
      e.scale.z = len;
      e.position.copy(mid).addScaledVector(normal, ROAD_HALF * side);
      e.rotation.y = angle;
      worldGroup.add(e);
    }
  }

  worldGroup.add(road);
}

function buildScenery(track) {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(420, 420),
    new THREE.MeshLambertMaterial({ color: track.ground })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  worldGroup.add(ground);

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);

  if (track === tracks.neon) {
    const mat = new THREE.MeshLambertMaterial({ color: 0x2b3443 });

    for (let i = 0; i < 62; i += quality.sceneryStep) {
      const side = i % 2 ? 1 : -1;
      const building = new THREE.Mesh(boxGeo, mat);
      building.position.set(
        side * (22 + ((i * 7) % 26)),
        3 + ((i * 5) % 9),
        -105 + ((i * 17) % 190)
      );
      building.scale.set(5 + (i % 4), 7 + (i % 10), 5 + ((i * 3) % 5));
      worldGroup.add(building);
    }
  } else if (track === tracks.canyon) {
    const mat = new THREE.MeshLambertMaterial({ color: 0x69442d });

    for (let i = 0; i < 48; i += quality.sceneryStep) {
      const rock = new THREE.Mesh(boxGeo, mat);
      const a = (i / 48) * Math.PI * 2;
      const r = 65 + (i % 7) * 7;
      rock.position.set(Math.cos(a) * r + 45, 3, Math.sin(a) * r - 40);
      rock.scale.set(5 + (i % 5), 5 + ((i * 2) % 9), 6 + ((i * 3) % 6));
      rock.rotation.y = a;
      worldGroup.add(rock);
    }
  } else {
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.23, 2, 5);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4b4038 });
    const treeGeo = new THREE.ConeGeometry(1.2, 4, 6);
    const treeMat = new THREE.MeshLambertMaterial({ color: 0x6f8e8d });

    for (let i = 0; i < 54; i += quality.sceneryStep) {
      const a = (i / 54) * Math.PI * 2;
      const r = 50 + (i % 9) * 6;

      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(Math.cos(a) * r + 38, 1, Math.sin(a) * r - 40);

      const crown = new THREE.Mesh(treeGeo, treeMat);
      crown.position.set(trunk.position.x, 4, trunk.position.z);

      worldGroup.add(trunk, crown);
    }
  }
}

function buildTrack(track) {
  disposeWorld();

  activeTrack = track;
  worldGroup = new THREE.Group();
  scene.add(worldGroup);

  scene.background = new THREE.Color(track.sky);
  scene.fog = new THREE.Fog(track.fog, 75, 230);

  buildScenery(track);
  buildRoad(track.points, track.road, track.edge);

  const markerGeo = new THREE.TorusGeometry(3.4, 0.12, 5, 18);
  const markerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  track.points.forEach((p, i) => {
    if (i % 2 !== 0) return;
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.rotation.x = Math.PI / 2;
    marker.position.set(p[0], 0.18, p[1]);
    marker.userData.checkpoint = true;
    marker.userData.index = i;
    worldGroup.add(marker);
  });

  car = makeCar();
  worldGroup.add(car);

  const start = v2To3(track.points[0], 0);
  const next = v2To3(track.points[1], 0);
  car.position.copy(start);
  car.rotation.y = Math.atan2(next.x - start.x, next.z - start.z);

  carState = {
    speed: 0,
    steer: 0,
    gear: 1,
    rpm: 1000,
    nitro: 100,
    airborne: false
  };

  currentCheckpoint = 0;
  lap = 1;
  updateObjective();
}

function makeCar() {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xe9eef4 });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x171d27 });
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x090b0f });

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.45, 3.8),
    bodyMat
  );
  body.position.y = 0.58;
  group.add(body);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.45, 0.52, 1.65),
    darkMat
  );
  cabin.position.set(0, 0.95, -0.15);
  group.add(cabin);

  const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.24, 10);

  for (const x of [-0.92, 0.92]) {
    for (const z of [-1.25, 1.25]) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.38, z);
      group.add(wheel);
    }
  }

  return group;
}

function nearestRoadInfo(pos) {
  let best = { d: Infinity, index: 0, t: 0, point: null };

  const pts = activeTrack.points;

  for (let i = 0; i < pts.length; i++) {
    const a = new THREE.Vector2(pts[i][0], pts[i][1]);
    const b = new THREE.Vector2(
      pts[(i + 1) % pts.length][0],
      pts[(i + 1) % pts.length][1]
    );

    const p = new THREE.Vector2(pos.x, pos.z);
    const ab = b.clone().sub(a);
    const lenSq = ab.lengthSq() || 1;
    const t = THREE.MathUtils.clamp(p.clone().sub(a).dot(ab) / lenSq, 0, 1);
    const q = a.clone().add(ab.multiplyScalar(t));
    const d = p.distanceTo(q);

    if (d < best.d) {
      best = { d, index: i, t, point: q };
    }
  }

  return best;
}

let audioCtx = null;
let engineOscA = null;
let engineOscB = null;
let engineGain = null;
let noiseBuffer = null;
let tyreNode = null;
let tyreGain = null;

function initAudio() {
  if (audioCtx) {
    if (audioCtx.state === "suspended") audioCtx.resume();
    return;
  }

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  engineOscA = audioCtx.createOscillator();
  engineOscB = audioCtx.createOscillator();
  engineGain = audioCtx.createGain();

  engineOscA.type = "sawtooth";
  engineOscB.type = "triangle";

  engineOscA.connect(engineGain);
  engineOscB.connect(engineGain);
  engineGain.connect(audioCtx.destination);

  engineGain.gain.value = 0.02;
  engineOscA.start();
  engineOscB.start();

  const len = audioCtx.sampleRate;
  noiseBuffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const data = noiseBuffer.getChannelData(0);

  for (let i = 0; i < len; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  tyreNode = audioCtx.createBufferSource();
  tyreNode.buffer = noiseBuffer;
  tyreNode.loop = true;

  const filter = audioCtx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1600;
  filter.Q.value = 0.8;

  tyreGain = audioCtx.createGain();
  tyreGain.gain.value = 0;

  tyreNode.connect(filter).connect(tyreGain).connect(audioCtx.destination);
  tyreNode.start();
}

function oneShot(freq, duration, gain = 0.05, type = "square") {
  if (!audioCtx) return;

  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();

  o.type = type;
  o.frequency.setValueAtTime(freq, audioCtx.currentTime);
  g.gain.setValueAtTime(gain, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

  o.connect(g).connect(audioCtx.destination);
  o.start();
  o.stop(audioCtx.currentTime + duration);
}

function shiftSound(up) {
  if (!audioCtx) return;
  oneShot(up ? 150 : 115, 0.055, 0.065, "square");
  setTimeout(() => oneShot(up ? 245 : 185, 0.075, 0.045, "sawtooth"), 35);
}

function updateEngineSound() {
  if (!audioCtx || !carState) return;

  const rpm01 = THREE.MathUtils.clamp(carState.rpm / 7600, 0, 1);
  const f = 42 + rpm01 * 155;

  engineOscA.frequency.setTargetAtTime(f, audioCtx.currentTime, 0.025);
  engineOscB.frequency.setTargetAtTime(f * 0.51, audioCtx.currentTime, 0.04);

  const throttle = keys.has("w") || keys.has("arrowup");
  engineGain.gain.setTargetAtTime(throttle ? 0.035 : 0.018, audioCtx.currentTime, 0.05);

  const drifting =
    (keys.has(" ") && Math.abs(carState.speed) > 12) ||
    Math.abs(carState.steer) > 0.7 && Math.abs(carState.speed) > 26;

  tyreGain.gain.setTargetAtTime(drifting ? 0.025 : 0, audioCtx.currentTime, 0.03);
}

const ratios = [0, 3.0, 2.2, 1.65, 1.3, 1.05, 0.86];
const shiftUpAt = [0, 20, 38, 58, 78, 100, 130];
const shiftDownAt = [0, 0, 14, 30, 47, 65, 85];

function automaticGearbox() {
  const mph = Math.abs(carState.speed) * 2.45;
  let nextGear = carState.gear;

  if (nextGear < 6 && mph > shiftUpAt[nextGear]) nextGear++;
  else if (nextGear > 1 && mph < shiftDownAt[nextGear]) nextGear--;

  if (nextGear !== carState.gear) {
    const up = nextGear > carState.gear;
    carState.gear = nextGear;
    carState.rpm = up ? carState.rpm * 0.72 : Math.min(7200, carState.rpm * 1.28);
    shiftSound(up);
  }

  const ratio = ratios[carState.gear];
  carState.rpm = THREE.MathUtils.clamp(
    900 + mph * ratio * 22,
    900,
    7600
  );
}

function updateCar(dt) {
  if (!raceActive) return;

  const forward = keys.has("w") || keys.has("arrowup");
  const brake = keys.has("s") || keys.has("arrowdown");
  const left = keys.has("a") || keys.has("arrowleft");
  const right = keys.has("d") || keys.has("arrowright");
  const handbrake = keys.has(" ");
  const boost = (keys.has("shift") || keys.has("shiftleft")) && carState.nitro > 0;

  const road = nearestRoadInfo(car.position);
  const onRoad = road.d <= ROAD_HALF + 1.2;

  const grip = activeTrack.grip * (handbrake ? 0.42 : 1);
  const topSpeed = boost ? 58 : 48;

  if (forward) {
    carState.speed += (onRoad ? 20 : 8) * dt;
  } else {
    carState.speed *= Math.pow(0.985, dt * 60);
  }

  if (brake) {
    if (carState.speed > 2) carState.speed -= 34 * dt;
    else carState.speed -= 12 * dt;
  }

  if (!onRoad) {
    carState.speed *= Math.pow(0.958, dt * 60);
  }

  if (boost && carState.speed > 5) {
    carState.nitro = Math.max(0, carState.nitro - 24 * dt);
    carState.speed += 26 * dt;
  } else {
    carState.nitro = Math.min(100, carState.nitro + 4.5 * dt);
  }

  carState.speed = THREE.MathUtils.clamp(carState.speed, -12, topSpeed);

  const steerInput = (left ? 1 : 0) - (right ? 1 : 0);
  const speedSteer = THREE.MathUtils.clamp(Math.abs(carState.speed) / 10, 0, 1);

  carState.steer = THREE.MathUtils.lerp(carState.steer, steerInput, 0.14);

  const direction = carState.speed >= 0 ? 1 : -1;
  const turnRate = (1.35 + (1 - grip) * 0.8) * speedSteer;

  car.rotation.y += carState.steer * turnRate * dt * direction;

  const forwardVec = new THREE.Vector3(
    -Math.sin(car.rotation.y),
    0,
    -Math.cos(car.rotation.y)
  );

  car.position.addScaledVector(forwardVec, carState.speed * dt);

  automaticGearbox();
  updateEngineSound();
  checkCheckpoints();
}

function checkCheckpoints() {
  const pts = activeTrack.points;
  const checkIndex = (currentCheckpoint * 2) % pts.length;
  const p = pts[checkIndex];
  const d = Math.hypot(car.position.x - p[0], car.position.z - p[1]);

  if (d < 8) {
    currentCheckpoint++;

    const checkpointsPerLap = Math.ceil(pts.length / 2);

    if (currentCheckpoint >= checkpointsPerLap) {
      currentCheckpoint = 0;
      lap++;

      if (lap > targetLaps) {
        finishRace();
        return;
      }

      oneShot(520, 0.12, 0.05, "square");
    } else {
      oneShot(360, 0.06, 0.03, "square");
    }

    updateObjective();
  }
}

function updateObjective() {
  objectiveEl.textContent = `LAP ${Math.min(lap, targetLaps)} / ${targetLaps}`;
}

function updateCamera(dt) {
  if (!car) return;

  const offset = new THREE.Vector3(0, 3.1, 7.2);
  offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), car.rotation.y);

  const desired = car.position.clone().add(offset);
  const lerp = 1 - Math.pow(0.0008, dt);

  camera.position.lerp(desired, lerp);

  const look = car.position.clone();
  look.y += 0.8;

  const forwardLook = new THREE.Vector3(
    -Math.sin(car.rotation.y),
    0,
    -Math.cos(car.rotation.y)
  ).multiplyScalar(5);

  look.add(forwardLook);
  camera.lookAt(look);
}

function updateHud() {
  if (!carState) return;

  speedEl.textContent = Math.round(Math.abs(carState.speed) * 2.45);
  gearEl.textContent = carState.speed < -1 ? "R" : carState.gear;
  rpmBar.style.width = `${THREE.MathUtils.clamp(carState.rpm / 7600, 0, 1) * 100}%`;
  nitroBar.style.width = `${carState.nitro}%`;
}

async function runCountdown() {
  countdown.classList.remove("hidden");

  for (const n of ["3", "2", "1", "GO"]) {
    countdown.textContent = n;
    oneShot(n === "GO" ? 680 : 320, n === "GO" ? 0.14 : 0.08, 0.045, "square");
    await new Promise(r => setTimeout(r, n === "GO" ? 650 : 700));
  }

  countdown.classList.add("hidden");
  raceActive = true;
}

function startRace() {
  initAudio();

  const selected = tracks[trackSelect.value];
  buildTrack(selected);

  trackNameEl.textContent = selected.name;
  menu.classList.add("hidden");
  hud.classList.remove("hidden");
  message.classList.add("hidden");

  raceActive = false;
  runCountdown();
}

function finishRace() {
  raceActive = false;
  message.textContent = "FINISH";
  message.classList.remove("hidden");
  oneShot(720, 0.16, 0.06, "square");
  setTimeout(() => oneShot(930, 0.22, 0.06, "square"), 160);

  setTimeout(() => {
    message.classList.add("hidden");
    menu.classList.remove("hidden");
    hud.classList.add("hidden");
  }, 2200);
}

startBtn.addEventListener("click", startRace);

window.addEventListener("keydown", e => {
  const key = e.key.toLowerCase();

  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
    e.preventDefault();
  }

  keys.add(key);
});

window.addEventListener("keyup", e => {
  keys.delete(e.key.toLowerCase());
});

window.addEventListener("blur", () => keys.clear());

function fpsTick(now) {
  fpsFrames++;

  if (now - lastFpsTime >= 1000) {
    const fps = Math.round((fpsFrames * 1000) / (now - lastFpsTime));
    fpsEl.textContent = `FPS ${fps}`;

    if (fps < 35 && quality.renderScale > 0.52) {
      quality.renderScale = Math.max(0.52, quality.renderScale - 0.08);
      resizeRenderer();
    } else if (fps > 54 && quality.renderScale < 0.86) {
      quality.renderScale = Math.min(0.86, quality.renderScale + 0.04);
      resizeRenderer();
    }

    fpsFrames = 0;
    lastFpsTime = now;
  }
}

function loop(now) {
  requestAnimationFrame(loop);

  const dt = Math.min(clock.getDelta(), 0.04);

  updateCar(dt);
  updateCamera(dt);
  updateHud();
  fpsTick(now);

  renderer.render(scene, camera);
}

buildTrack(tracks.neon);
requestAnimationFrame(loop);
