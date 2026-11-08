import {THREE} from '../../engine/core.js';

function solid(scene, geometry, material, position, shadow = true) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function labelTexture(text, detail = '') {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#111a2c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#d7eaff';
  ctx.font = '900 140px system-ui, sans-serif';
  ctx.fillText(text, 1024, 240);
  ctx.fillStyle = '#6ecae7';
  ctx.font = '600 45px system-ui, sans-serif';
  ctx.fillText(detail, 1024, 328);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export function createTestRoom(engine) {
  const scene = engine.scene;
  scene.background = new THREE.Color('#090f1b');
  scene.fog = new THREE.Fog('#090f1b', 27, 67);
  const floorMat = new THREE.MeshStandardMaterial({color: '#293443', roughness: 0.28, metalness: 0.38});
  const darkMetal = new THREE.MeshStandardMaterial({color: '#192233', roughness: 0.37, metalness: 0.65});
  const concrete = new THREE.MeshStandardMaterial({color: '#253043', roughness: 0.78, metalness: 0.05});
  const border = new THREE.MeshStandardMaterial({color: '#56667b', roughness: 0.29, metalness: 0.9});
  const glow = new THREE.MeshStandardMaterial({color: '#72dfff', emissive: '#2f86ae', emissiveIntensity: 1.65, roughness: 0.4});

  solid(scene, new THREE.BoxGeometry(25, 0.45, 35), floorMat, [0, -0.25, 0], false);
  solid(scene, new THREE.BoxGeometry(25, 0.3, 35), darkMetal, [0, 7.2, 0], false);
  solid(scene, new THREE.BoxGeometry(25, 7, 0.55), concrete, [0, 3.5, -17.4], false);
  solid(scene, new THREE.BoxGeometry(25, 7, 0.55), concrete, [0, 3.5, 17.4], false);
  solid(scene, new THREE.BoxGeometry(0.55, 7, 35), concrete, [-12.35, 3.5, 0], false);
  solid(scene, new THREE.BoxGeometry(0.55, 7, 35), concrete, [12.35, 3.5, 0], false);

  // Repeated structural bays and light bands establish believable scale.
  for (const z of [-14, -7, 0, 7, 14]) {
    for (const x of [-12.0, 12.0]) {
      solid(scene, new THREE.BoxGeometry(0.28, 7.0, 0.57), border, [x, 3.5, z], false);
      solid(scene, new THREE.BoxGeometry(0.085, 5.3, 0.14), glow, [x > 0 ? 11.79 : -11.79, 3.5, z], false);
    }
    solid(scene, new THREE.BoxGeometry(24.5, 0.23, 0.44), border, [0, 6.97, z], false);
    solid(scene, new THREE.BoxGeometry(18, 0.04, 0.12), glow, [0, 6.77, z], false);
  }

  // Floor panels with real gaps and subtle reflectivity; no low-res repeating textures.
  for (let z = -16; z <= 16; z += 2) {
    for (let x = -11; x <= 11; x += 2) {
      const panel = solid(scene, new THREE.BoxGeometry(1.95, 0.018, 1.95),
        new THREE.MeshStandardMaterial({color: ((x + z) / 2) % 2 ? '#2e3b4b' : '#344050',
          metalness: 0.2, roughness: 0.48}), [x, 0.01, z], false);
      panel.receiveShadow = true;
    }
  }

  // Large architectural sign: high-resolution canvas, not stretched text geometry.
  const sign = labelTexture('GAMESHUB ENGINE', 'MATERIALS  •  LIGHTING  •  PERFORMANCE');
  const board = solid(scene, new THREE.BoxGeometry(12.7, 3.17, 0.12), darkMetal, [0, 4.5, -16.96], false);
  board.add(new THREE.Mesh(new THREE.PlaneGeometry(12.3, 3.05),
    new THREE.MeshBasicMaterial({map: sign, toneMapped: false})));
  board.children[0].position.z = 0.08;

  // Three shader material samples are intentional calibration objects.
  const specimens = [
    {x: -6.5, mat: new THREE.MeshPhysicalMaterial({color: '#9db1c8', metalness: 1, roughness: 0.14, clearcoat: 1}), name: 'CHROME'},
    {x: 0, mat: new THREE.MeshPhysicalMaterial({color: '#68afdc', metalness: 0, roughness: 0.06, transmission: 0.67, thickness: 2.2, ior: 1.47}), name: 'GLASS'},
    {x: 6.5, mat: new THREE.MeshPhysicalMaterial({color: '#bd8554', metalness: 0.88, roughness: 0.48, clearcoat: 0.23}), name: 'BRONZE'}
  ];
  const obstacles = [];
  for (const sample of specimens) {
    solid(scene, new THREE.CylinderGeometry(1.4, 1.54, 0.32, 48), border, [sample.x, 0.18, -8.4]);
    solid(scene, new THREE.CylinderGeometry(1.2, 1.22, 1.5, 48), darkMetal, [sample.x, 0.93, -8.4]);
    solid(scene, new THREE.CylinderGeometry(1.28, 1.28, 0.08, 48), glow, [sample.x, 1.71, -8.4], false);
    const model = solid(scene, new THREE.SphereGeometry(0.92, 64, 48), sample.mat, [sample.x, 2.7, -8.4]);
    model.userData.baseY = model.position.y;
    const plaque = labelTexture(sample.name, 'PBR MATERIAL TEST');
    const plaqueMesh = solid(scene, new THREE.PlaneGeometry(2.1, 0.52),
      new THREE.MeshBasicMaterial({map: plaque, toneMapped: false}), [sample.x, 1.02, -7.15], false);
    plaqueMesh.rotation.x = -0.20;
    obstacles.push({minX: sample.x - 1.32, maxX: sample.x + 1.32, minZ: -9.65, maxZ: -7.15});
    sample.model = model;
  }

  const ambient = new THREE.HemisphereLight('#a9d7ff', '#1b2134', 2.0);
  scene.add(ambient);
  const key = new THREE.DirectionalLight('#fff3dd', 2.9);
  key.position.set(-6, 11, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -19;
  key.shadow.camera.right = 19;
  key.shadow.camera.top = 20;
  key.shadow.camera.bottom = -20;
  key.shadow.bias = -0.00018;
  scene.add(key);
  for (const x of [-9, 0, 9]) {
    const spot = new THREE.SpotLight('#b8d9ff', 125, 19, Math.PI / 4, 0.55, 1.4);
    spot.position.set(x, 6.5, -6.5);
    spot.target.position.set(x * 0.72, 1.5, -8.4);
    scene.add(spot, spot.target);
  }
  const rim = new THREE.PointLight('#4bcfff', 35, 15, 2);
  rim.position.set(0, 3.2, 4);
  scene.add(rim);

  engine.camera.position.set(0, 1.72, 10);
  const remove = engine.onFrame((dt, time) => {
    for (const sample of specimens) {
      sample.model.rotation.y += dt * 0.32;
      sample.model.position.y = sample.model.userData.baseY + Math.sin(time * 0.65 + sample.x) * 0.065;
    }
  });
  return {
    key,
    ambient,
    specimens,
    obstacles,
    bounds: {minX: -11.65, maxX: 11.65, minZ: -16.65, maxZ: 16.65},
    dispose: remove
  };
}
