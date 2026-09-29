import * as THREE
  from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";


/* =========================================================
   REDLINE MULTIPLAYER RACE V1

   ADDS:
   - Remote racers visible as ghost cars
   - NO player-vs-player collision
   - Smooth remote interpolation
   - Server-synced race timer
   - Live race position
   - Multiplayer minimap dots
   - Different car models/colors
   - Starting grid offsets
   - ~12.5 network updates / second
   - Finish reporting

   AUDIO:
   - audio.js remains in full control
   - NO oscillator audio in this file
========================================================= */


/* =========================================================
   HTML
========================================================= */

const canvas =
  document.getElementById(
    "gameCanvas"
  );

const menu =
  document.getElementById(
    "menu"
  );

const hud =
  document.getElementById(
    "hud"
  );

const startBtn =
  document.getElementById(
    "startBtn"
  );

const trackSelect =
  document.getElementById(
    "trackSelect"
  );

const trackDescription =
  document.getElementById(
    "trackDescription"
  );

const selectedCarName =
  document.getElementById(
    "selectedCarName"
  );

const speedStat =
  document.getElementById(
    "speedStat"
  );

const accelStat =
  document.getElementById(
    "accelStat"
  );

const gripStat =
  document.getElementById(
    "gripStat"
  );

const driftStat =
  document.getElementById(
    "driftStat"
  );


const trackNameEl =
  document.getElementById(
    "trackName"
  );

const objectiveEl =
  document.getElementById(
    "objective"
  );

const checkpointText =
  document.getElementById(
    "checkpointText"
  );

const directionArrow =
  document.getElementById(
    "directionArrow"
  );

const navigationText =
  document.getElementById(
    "navigationText"
  );

const checkpointDistance =
  document.getElementById(
    "checkpointDistance"
  );

const wrongWay =
  document.getElementById(
    "wrongWay"
  );


const racePositionEl =
  document.getElementById(
    "racePosition"
  );

const totalRacersEl =
  document.getElementById(
    "totalRacers"
  );

const raceTimerEl =
  document.getElementById(
    "raceTimer"
  );


const minimap =
  document.getElementById(
    "minimap"
  );

const mapCtx =
  minimap.getContext(
    "2d"
  );


const speedEl =
  document.getElementById(
    "speed"
  );

const gearEl =
  document.getElementById(
    "gear"
  );

const rpmBar =
  document.getElementById(
    "rpmBar"
  );

const nitroBar =
  document.getElementById(
    "nitroBar"
  );

const nitroPercent =
  document.getElementById(
    "nitroPercent"
  );

const fpsEl =
  document.getElementById(
    "fps"
  );


const countdown =
  document.getElementById(
    "countdown"
  );

const checkpointPopup =
  document.getElementById(
    "checkpointPopup"
  );

const message =
  document.getElementById(
    "message"
  );


/* =========================================================
   THREE
========================================================= */

const renderer =
  new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference:
      "high-performance"
  });


renderer.outputColorSpace =
  THREE.SRGBColorSpace;

renderer.setPixelRatio(
  1
);


const scene =
  new THREE.Scene();


const camera =
  new THREE.PerspectiveCamera(
    68,
    16 / 9,
    0.1,
    380
  );


scene.add(
  new THREE.HemisphereLight(
    0xc8ddff,
    0x142030,
    1.65
  )
);


const sun =
  new THREE.DirectionalLight(
    0xffffff,
    1.25
  );


sun.position.set(
  30,
  45,
  20
);


scene.add(
  sun
);


const clock =
  new THREE.Clock();


/* =========================================================
   PERFORMANCE
========================================================= */

const quality = {
  renderScale:
    0.74
};


let lastFpsTime =
  performance.now();


let fpsFrames =
  0;


function resizeRenderer() {

  const width =
    Math.max(
      320,
      window.innerWidth
    );


  const height =
    Math.max(
      240,
      window.innerHeight
    );


  renderer.setSize(
    Math.floor(
      width *
      quality.renderScale
    ),

    Math.floor(
      height *
      quality.renderScale
    ),

    false
  );


  canvas.style.width =
    `${width}px`;


  canvas.style.height =
    `${height}px`;


  camera.aspect =
    width /
    height;


  camera.updateProjectionMatrix();

}


window.addEventListener(
  "resize",
  resizeRenderer
);


resizeRenderer();


/* =========================================================
   CAR SPECS
========================================================= */

const cars = {

  gt: {

    name:
      "REDLINE GT",

    model:
      "gt",

    topSpeed:
      50,

    nitroSpeed:
      61,

    acceleration:
      19,

    reverseAcceleration:
      10.5,

    braking:
      34,

    grip:
      8.5,

    driftGrip:
      1.36,

    steer:
      1.32,

    drag:
      0.34,

    aeroDrag:
      0.018,

    body:
      0xe8edf4,

    accent:
      0x3f78d8,

    stats: {
      speed: 76,
      accel: 78,
      grip: 75,
      drift: 70
    }

  },


  vortex: {

    name:
      "VORTEX R",

    model:
      "vortex",

    topSpeed:
      64,

    nitroSpeed:
      76,

    acceleration:
      20,

    reverseAcceleration:
      9.5,

    braking:
      31,

    grip:
      7.1,

    driftGrip:
      0.95,

    steer:
      1.08,

    drag:
      0.14,

    aeroDrag:
      0.009,

    body:
      0xb93648,

    accent:
      0x20242d,

    stats: {
      speed: 98,
      accel: 76,
      grip: 58,
      drift: 63
    }

  },


  apex: {

    name:
      "APEX S",

    model:
      "apex",

    topSpeed:
      46,

    nitroSpeed:
      56,

    acceleration:
      21.5,

    reverseAcceleration:
      11.5,

    braking:
      38,

    grip:
      10.2,

    driftGrip:
      1.18,

    steer:
      1.52,

    drag:
      0.40,

    aeroDrag:
      0.020,

    body:
      0x39a79a,

    accent:
      0x182d31,

    stats: {
      speed: 68,
      accel: 90,
      grip: 92,
      drift: 86
    }

  }

};


let selectedCar =
  "gt";


let activeCarSpec =
  cars.gt;


/* =========================================================
   GARAGE UI
========================================================= */

function updateGarageUI() {

  const spec =
    cars[
      selectedCar
    ]
    ||
    cars.gt;


  if (
    selectedCarName
  ) {

    selectedCarName.textContent =
      spec.name;

  }


  if (speedStat) {
    speedStat.style.width =
      `${spec.stats.speed}%`;
  }


  if (accelStat) {
    accelStat.style.width =
      `${spec.stats.accel}%`;
  }


  if (gripStat) {
    gripStat.style.width =
      `${spec.stats.grip}%`;
  }


  if (driftStat) {
    driftStat.style.width =
      `${spec.stats.drift}%`;
  }


  document
    .querySelectorAll(
      ".car-card"
    )
    .forEach(
      card => {

        card.classList.toggle(
          "selected",
          card.dataset.car ===
          selectedCar
        );

      }
    );

}


document
  .querySelectorAll(
    ".car-card"
  )
  .forEach(
    card => {

      card.addEventListener(
        "click",
        () => {

          selectedCar =
            card.dataset.car
            ||
            "gt";


          updateGarageUI();

        }
      );

    }
  );


updateGarageUI();


/* =========================================================
   TRACK
========================================================= */

const ROAD_HALF =
  6.6;


const SIDEWALK_OUTER =
  9.2;


const CAR_RADIUS =
  1.18;


const TARGET_LAPS =
  3;


const TRACK_SAMPLES =
  300;


const neonControls = [

  [-8, 58],

  [28, 60],

  [62, 48],

  [84, 20],

  [87, -14],

  [70, -42],

  [39, -58],

  [5, -54],

  [-22, -38],

  [-52, -35],

  [-75, -12],

  [-72, 20],

  [-50, 47]

];


const CHECKPOINT_TS = [
  0.09,
  0.23,
  0.37,
  0.51,
  0.65,
  0.79,
  0.93
];


const tracks = {

  neon: {

    name:
      "NEON DISTRICT",

    description:
      "Night street circuit through downtown Neon District.",

    sky:
      0x07101c,

    fog:
      0x07101c,

    ground:
      0x101722

  }

};


let activeTrack =
  tracks.neon;


let trackCurve =
  null;


let trackPoints =
  [];


let trackLengths =
  [];


let totalTrackLength =
  1;


let checkpointFractions =
  [];


/* =========================================================
   WORLD STATE
========================================================= */

let worldGroup =
  null;


let car =
  null;


let carVisual =
  null;


let carState =
  null;


let raceActive =
  false;


let raceStarted =
  false;


let localFinished =
  false;


let localFinishElapsed =
  null;


let lap =
  1;


let checkpointStep =
  0;


let wrongWayTimer =
  0;


let serverRaceStartAt =
  null;


let goHideAt =
  0;


const keys =
  new Set();


/* =========================================================
   PHYSICAL WORLD
========================================================= */

const barrierSegments =
  [];


const obstacles =
  [];


const boostPads =
  [];


const boostCooldowns =
  new Map();


/* =========================================================
   MULTIPLAYER STATE
========================================================= */

const remoteRacers =
  new Map();


const raceStates =
  new Map();


let finishOrder =
  [];


let lastNetworkSend =
  0;


const NETWORK_INTERVAL =
  80;


/* =========================================================
   BASIC HELPERS
========================================================= */

function clamp(
  value,
  min,
  max
) {

  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );

}


function lerpAngle(
  current,
  target,
  amount
) {

  let difference =
    (
      target -
      current +
      Math.PI
    )
    %
    (
      Math.PI *
      2
    )
    -
    Math.PI;


  if (
    difference <
    -Math.PI
  ) {

    difference +=
      Math.PI *
      2;

  }


  return current +
    difference *
    amount;

}


function headingFromDirection(
  direction
) {

  return Math.atan2(
    -direction.x,
    -direction.z
  );

}


function getForward(
  heading
) {

  return new THREE.Vector3(
    -Math.sin(
      heading
    ),
    0,
    -Math.cos(
      heading
    )
  );

}


function getTrackNormal(
  t
) {

  const tangent =
    trackCurve
      .getTangentAt(
        (
          t +
          1
        )
        %
        1
      )
      .normalize();


  return new THREE.Vector3(
    -tangent.z,
    0,
    tangent.x
  );

}


/* =========================================================
   TRACK CURVE
========================================================= */

function buildTrackCurve() {

  const controls =
    neonControls.map(
      point =>
        new THREE.Vector3(
          point[0],
          0,
          point[1]
        )
    );


  trackCurve =
    new THREE.CatmullRomCurve3(
      controls,
      true,
      "catmullrom",
      0.45
    );


  trackPoints =
    [];


  for (
    let i = 0;
    i < TRACK_SAMPLES;
    i++
  ) {

    trackPoints.push(
      trackCurve.getPointAt(
        i /
        TRACK_SAMPLES
      )
    );

  }


  trackLengths =
    [
      0
    ];


  totalTrackLength =
    0;


  for (
    let i = 1;
    i <= TRACK_SAMPLES;
    i++
  ) {

    const previous =
      trackPoints[
        i - 1
      ];


    const current =
      trackPoints[
        i %
        TRACK_SAMPLES
      ];


    totalTrackLength +=
      previous.distanceTo(
        current
      );


    trackLengths.push(
      totalTrackLength
    );

  }


  checkpointFractions =
    CHECKPOINT_TS.map(
      value =>
        value
    );

}


/* =========================================================
   WORLD CLEANUP
========================================================= */

function disposeWorld() {

  remoteRacers.clear();

  raceStates.clear();

  barrierSegments.length =
    0;

  obstacles.length =
    0;

  boostPads.length =
    0;

  boostCooldowns.clear();


  if (
    !worldGroup
  ) {

    return;

  }


  worldGroup.traverse(
    object => {

      if (
        object.geometry
      ) {

        object.geometry.dispose?.();

      }


      if (
        object.material
      ) {

        const materials =
          Array.isArray(
            object.material
          )
            ?
            object.material
            :
            [
              object.material
            ];


        for (
          const material
          of materials
        ) {

          material.map?.dispose?.();

          material.dispose?.();

        }

      }

    }
  );


  scene.remove(
    worldGroup
  );


  worldGroup =
    null;

}


/* =========================================================
   ROAD MESH
========================================================= */

function makeRoadRibbon(
  halfWidth,
  color,
  height
) {

  const vertices =
    [];


  const indices =
    [];


  for (
    let i = 0;
    i < TRACK_SAMPLES;
    i++
  ) {

    const t =
      i /
      TRACK_SAMPLES;


    const point =
      trackCurve.getPointAt(
        t
      );


    const normal =
      getTrackNormal(
        t
      );


    const left =
      point
        .clone()
        .addScaledVector(
          normal,
          halfWidth
        );


    const right =
      point
        .clone()
        .addScaledVector(
          normal,
          -halfWidth
        );


    vertices.push(
      left.x,
      height,
      left.z,

      right.x,
      height,
      right.z
    );

  }


  for (
    let i = 0;
    i < TRACK_SAMPLES;
    i++
  ) {

    const next =
      (
        i +
        1
      )
      %
      TRACK_SAMPLES;


    const a =
      i *
      2;


    const b =
      a +
      1;


    const c =
      next *
      2;


    const d =
      c +
      1;


    indices.push(
      a,
      b,
      c,

      b,
      d,
      c
    );

  }


  const geometry =
    new THREE.BufferGeometry();


  geometry.setAttribute(
    "position",

    new THREE.Float32BufferAttribute(
      vertices,
      3
    )
  );


  geometry.setIndex(
    indices
  );


  geometry.computeVertexNormals();


  return new THREE.Mesh(
    geometry,

    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.87,
      metalness: 0.03
    })
  );

}


/* =========================================================
   CITY
========================================================= */

function buildCity() {

  const buildingGeometry =
    new THREE.BoxGeometry(
      1,
      1,
      1
    );


  const buildingMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x1c2735,
      roughness: 0.9
    });


  for (
    let i = 0;
    i < TRACK_SAMPLES;
    i += 15
  ) {

    const t =
      i /
      TRACK_SAMPLES;


    const point =
      trackCurve.getPointAt(
        t
      );


    const normal =
      getTrackNormal(
        t
      );


    for (
      const side
      of [
        -1,
        1
      ]
    ) {

      const distance =
        17 +
        (
          (
            i *
            7
          )
          %
          18
        );


      const height =
        7 +
        (
          (
            i *
            11
          )
          %
          18
        );


      const building =
        new THREE.Mesh(
          buildingGeometry,
          buildingMaterial
        );


      building.position
        .copy(
          point
        )
        .addScaledVector(
          normal,
          distance *
          side
        );


      building.position.y =
        height /
        2;


      building.scale.set(
        7 +
        (
          i %
          6
        ),

        height,

        7 +
        (
          (
            i *
            3
          )
          %
          8
        )
      );


      worldGroup.add(
        building
      );

    }

  }


  const lightPoleGeometry =
    new THREE.CylinderGeometry(
      0.07,
      0.09,
      4.3,
      6
    );


  const poleMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x465367,
      metalness: 0.5,
      roughness: 0.45
    });


  const lampMaterial =
    new THREE.MeshBasicMaterial({
      color: 0x84b9ff
    });


  for (
    let i = 0;
    i < TRACK_SAMPLES;
    i += 22
  ) {

    const t =
      i /
      TRACK_SAMPLES;


    const point =
      trackCurve.getPointAt(
        t
      );


    const normal =
      getTrackNormal(
        t
      );


    const pole =
      new THREE.Mesh(
        lightPoleGeometry,
        poleMaterial
      );


    pole.position
      .copy(
        point
      )
      .addScaledVector(
        normal,
        SIDEWALK_OUTER +
        1
      );


    pole.position.y =
      2.15;


    const lamp =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          0.45,
          0.16,
          0.45
        ),
        lampMaterial
      );


    lamp.position.copy(
      pole.position
    );


    lamp.position.y =
      4.35;


    worldGroup.add(
      pole,
      lamp
    );

  }

}


/* =========================================================
   ROAD DETAILS
========================================================= */

function buildRoadDetails() {

  const road =
    makeRoadRibbon(
      ROAD_HALF,
      0x272d36,
      0.03
    );


  worldGroup.add(
    road
  );


  const sidewalk =
    makeRoadRibbon(
      SIDEWALK_OUTER,
      0x343942,
      0.005
    );


  worldGroup.add(
    sidewalk
  );


  /*
    Re-add road on top so sidewalk only
    remains visible outside the asphalt.
  */

  const roadTop =
    makeRoadRibbon(
      ROAD_HALF,
      0x252b34,
      0.045
    );


  worldGroup.add(
    roadTop
  );


  const dashGeometry =
    new THREE.BoxGeometry(
      0.13,
      0.025,
      2.6
    );


  const dashMaterial =
    new THREE.MeshBasicMaterial({
      color: 0xc3c7cc
    });


  for (
    let i = 0;
    i < TRACK_SAMPLES;
    i += 10
  ) {

    const t =
      i /
      TRACK_SAMPLES;


    const point =
      trackCurve.getPointAt(
        t
      );


    const tangent =
      trackCurve.getTangentAt(
        t
      );


    const dash =
      new THREE.Mesh(
        dashGeometry,
        dashMaterial
      );


    dash.position.copy(
      point
    );


    dash.position.y =
      0.085;


    dash.rotation.y =
      headingFromDirection(
        tangent
      );


    worldGroup.add(
      dash
    );

  }

}


/* =========================================================
   CHECKPOINT GATES
========================================================= */

function buildCheckpointGates() {

  const postGeometry =
    new THREE.BoxGeometry(
      0.28,
      4.2,
      0.28
    );


  const beamGeometry =
    new THREE.BoxGeometry(
      ROAD_HALF *
      2,
      0.28,
      0.28
    );


  CHECKPOINT_TS.forEach(
    (
      t,
      index
    ) => {

      const point =
        trackCurve.getPointAt(
          t
        );


      const normal =
        getTrackNormal(
          t
        );


      const tangent =
        trackCurve.getTangentAt(
          t
        );


      const material =
        new THREE.MeshBasicMaterial({
          color:
            index === 0
              ?
              0x6fa8ff
              :
              0xd9e0ea
        });


      const left =
        new THREE.Mesh(
          postGeometry,
          material
        );


      left.position
        .copy(
          point
        )
        .addScaledVector(
          normal,
          ROAD_HALF -
          0.25
        );


      left.position.y =
        2.1;


      const right =
        new THREE.Mesh(
          postGeometry,
          material
        );


      right.position
        .copy(
          point
        )
        .addScaledVector(
          normal,
          -ROAD_HALF +
          0.25
        );


      right.position.y =
        2.1;


      const beam =
        new THREE.Mesh(
          beamGeometry,
          material
        );


      beam.position.copy(
        point
      );


      beam.position.y =
        4.15;


      beam.rotation.y =
        headingFromDirection(
          normal
        );


      worldGroup.add(
        left,
        right,
        beam
      );

    }
  );

}


/* =========================================================
   VISIBLE BARRIERS
========================================================= */

const barrierSections = [

  {
    start: 0.17,
    end: 0.28,
    side: 1
  },

  {
    start: 0.30,
    end: 0.39,
    side: -1
  },

  {
    start: 0.45,
    end: 0.57,
    side: 1
  },

  {
    start: 0.61,
    end: 0.70,
    side: -1
  },

  {
    start: 0.76,
    end: 0.86,
    side: 1
  },

  {
    start: 0.89,
    end: 0.98,
    side: -1
  }

];


function addBarrierSegment(
  a,
  b
) {

  const delta =
    b
      .clone()
      .sub(
        a
      );


  const length =
    delta.length();


  if (
    length <
    0.1
  ) {

    return;

  }


  const midpoint =
    a
      .clone()
      .add(
        b
      )
      .multiplyScalar(
        0.5
      );


  const barrier =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        0.34,
        0.72,
        length
      ),

      new THREE.MeshStandardMaterial({
        color: 0xb7c0cd,
        roughness: 0.55,
        metalness: 0.4
      })

    );


  barrier.position.copy(
    midpoint
  );


  barrier.position.y =
    0.42;


  barrier.rotation.y =
    headingFromDirection(
      delta.normalize()
    );


  worldGroup.add(
    barrier
  );


  barrierSegments.push({
    a:
      a.clone(),

    b:
      b.clone()
  });

}


function buildBarriers() {

  const step =
    0.012;


  for (
    const section
    of barrierSections
  ) {

    for (
      let t = section.start;
      t < section.end;
      t += step
    ) {

      const t2 =
        Math.min(
          section.end,
          t +
          step
        );


      const p1 =
        trackCurve.getPointAt(
          t
        );


      const p2 =
        trackCurve.getPointAt(
          t2
        );


      const n1 =
        getTrackNormal(
          t
        );


      const n2 =
        getTrackNormal(
          t2
        );


      p1.addScaledVector(
        n1,
        (
          SIDEWALK_OUTER +
          0.2
        )
        *
        section.side
      );


      p2.addScaledVector(
        n2,
        (
          SIDEWALK_OUTER +
          0.2
        )
        *
        section.side
      );


      addBarrierSegment(
        p1,
        p2
      );

    }

  }

}


/* =========================================================
   OBSTACLES
========================================================= */

const obstacleSetup = [

  {
    t: 0.29,
    offset: 2.7
  },

  {
    t: 0.55,
    offset: -2.7
  },

  {
    t: 0.875,
    offset: 2.4
  }

];


function buildObstacles() {

  for (
    const setup
    of obstacleSetup
  ) {

    const point =
      trackCurve.getPointAt(
        setup.t
      );


    const normal =
      getTrackNormal(
        setup.t
      );


    point.addScaledVector(
      normal,
      setup.offset
    );


    const mesh =
      new THREE.Mesh(

        new THREE.BoxGeometry(
          2.1,
          1.0,
          1.0
        ),

        new THREE.MeshStandardMaterial({
          color: 0xe27338,
          roughness: 0.7
        })

      );


    mesh.position.copy(
      point
    );


    mesh.position.y =
      0.52;


    worldGroup.add(
      mesh
    );


    obstacles.push({
      position:
        point.clone(),

      radius:
        1.3
    });

  }

}


/* =========================================================
   BOOST PADS
========================================================= */

function buildBoostPad(
  t,
  offset
) {

  const point =
    trackCurve.getPointAt(
      t
    );


  const normal =
    getTrackNormal(
      t
    );


  const tangent =
    trackCurve.getTangentAt(
      t
    );


  point.addScaledVector(
    normal,
    offset
  );


  const mesh =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        2.6,
        0.08,
        4.6
      ),

      new THREE.MeshBasicMaterial({
        color: 0x338dff
      })

    );


  mesh.position.copy(
    point
  );


  mesh.position.y =
    0.09;


  mesh.rotation.y =
    headingFromDirection(
      tangent
    );


  worldGroup.add(
    mesh
  );


  boostPads.push({
    mesh,
    position:
      point.clone()
  });

}


function buildBoostPads() {

  buildBoostPad(
    0.16,
    -1.9
  );


  buildBoostPad(
    0.62,
    1.8
  );

}


/* =========================================================
   CAR MODEL
========================================================= */

function makeMaterial(
  color,
  ghost,
  emissive = false
) {

  return new THREE.MeshStandardMaterial({

    color,

    roughness:
      0.52,

    metalness:
      0.22,

    transparent:
      ghost,

    opacity:
      ghost
        ?
        0.48
        :
        1,

    depthWrite:
      !ghost,

    emissive:
      emissive
        ?
        color
        :
        0x000000,

    emissiveIntensity:
      ghost
        ?
        0.16
        :
        0

  });

}


function makeCarModel(
  spec,
  ghost = false
) {

  const group =
    new THREE.Group();


  const bodyMaterial =
    makeMaterial(
      spec.body,
      ghost,
      true
    );


  const accentMaterial =
    makeMaterial(
      spec.accent,
      ghost
    );


  const glassMaterial =
    makeMaterial(
      0x101820,
      ghost
    );


  const wheelMaterial =
    makeMaterial(
      0x090b0f,
      ghost
    );


  let bodyLength =
    3.7;


  let bodyWidth =
    1.82;


  let bodyHeight =
    0.50;


  if (
    spec.model ===
    "vortex"
  ) {

    bodyLength =
      4.15;


    bodyWidth =
      1.90;


    bodyHeight =
      0.43;

  }


  if (
    spec.model ===
    "apex"
  ) {

    bodyLength =
      3.45;


    bodyWidth =
      1.76;


    bodyHeight =
      0.55;

  }


  const body =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        bodyWidth,
        bodyHeight,
        bodyLength
      ),

      bodyMaterial

    );


  body.position.y =
    0.58;


  group.add(
    body
  );


  const nose =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        bodyWidth *
        0.92,
        0.18,
        0.82
      ),

      accentMaterial

    );


  nose.position.set(
    0,
    0.72,
    -bodyLength /
    2 +
    0.34
  );


  group.add(
    nose
  );


  const cabin =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        bodyWidth *
        0.72,
        spec.model ===
        "apex"
          ?
          0.63
          :
          0.52,
        spec.model ===
        "vortex"
          ?
          1.58
          :
          1.48
      ),

      glassMaterial

    );


  cabin.position.set(
    0,
    0.98,
    0.05
  );


  group.add(
    cabin
  );


  if (
    spec.model ===
    "vortex"
  ) {

    const wing =
      new THREE.Mesh(

        new THREE.BoxGeometry(
          1.65,
          0.10,
          0.34
        ),

        accentMaterial

      );


    wing.position.set(
      0,
      1.03,
      1.72
    );


    group.add(
      wing
    );

  }


  if (
    spec.model ===
    "apex"
  ) {

    const rearWing =
      new THREE.Mesh(

        new THREE.BoxGeometry(
          1.35,
          0.08,
          0.25
        ),

        accentMaterial

      );


    rearWing.position.set(
      0,
      1.08,
      1.36
    );


    group.add(
      rearWing
    );

  }


  const wheels =
    [];


  const wheelGeometry =
    new THREE.CylinderGeometry(
      0.33,
      0.33,
      0.24,
      10
    );


  const wheelZ =
    spec.model ===
    "vortex"
      ?
      1.42
      :
      1.25;


  for (
    const x
    of [
      -0.94,
      0.94
    ]
  ) {

    for (
      const z
      of [
        -wheelZ,
        wheelZ
      ]
    ) {

      const wheel =
        new THREE.Mesh(
          wheelGeometry,
          wheelMaterial
        );


      wheel.rotation.z =
        Math.PI /
        2;


      wheel.position.set(
        x,
        0.38,
        z
      );


      group.add(
        wheel
      );


      wheels.push(
        wheel
      );

    }

  }


  group.userData.wheels =
    wheels;


  return group;

}


/* =========================================================
   GHOST USERNAME
========================================================= */

function makeNameSprite(
  username
) {

  const labelCanvas =
    document.createElement(
      "canvas"
    );


  labelCanvas.width =
    256;


  labelCanvas.height =
    64;


  const ctx =
    labelCanvas.getContext(
      "2d"
    );


  ctx.clearRect(
    0,
    0,
    256,
    64
  );


  ctx.font =
    "bold 27px Arial";


  ctx.textAlign =
    "center";


  ctx.textBaseline =
    "middle";


  ctx.fillStyle =
    "rgba(0,0,0,.62)";


  ctx.fillRect(
    20,
    8,
    216,
    48
  );


  ctx.fillStyle =
    "#ffffff";


  ctx.fillText(
    username,
    128,
    32
  );


  const texture =
    new THREE.CanvasTexture(
      labelCanvas
    );


  texture.colorSpace =
    THREE.SRGBColorSpace;


  const sprite =
    new THREE.Sprite(

      new THREE.SpriteMaterial({
        map:
          texture,

        transparent:
          true,

        depthTest:
          false
      })

    );


  sprite.scale.set(
    4.2,
    1.05,
    1
  );


  sprite.position.y =
    2.35;


  return sprite;

}


/* =========================================================
   START GRID
========================================================= */

function getGridTransform(
  playerIndex
) {

  const baseT =
    0.002;


  const base =
    trackCurve.getPointAt(
      baseT
    );


  const tangent =
    trackCurve
      .getTangentAt(
        baseT
      )
      .normalize();


  const normal =
    new THREE.Vector3(
      -tangent.z,
      0,
      tangent.x
    );


  const lane =
    playerIndex %
    2;


  const row =
    Math.floor(
      playerIndex /
      2
    );


  const lateral =
    lane === 0
      ?
      -1.55
      :
      1.55;


  const position =
    base
      .clone()
      .addScaledVector(
        normal,
        lateral
      )
      .addScaledVector(
        tangent,
        -row *
        4.0
      );


  return {
    position,

    rotation:
      headingFromDirection(
        tangent
      )
  };

}


/* =========================================================
   BUILD WORLD
========================================================= */

function buildWorld() {

  disposeWorld();


  buildTrackCurve();


  worldGroup =
    new THREE.Group();


  scene.add(
    worldGroup
  );


  scene.background =
    new THREE.Color(
      activeTrack.sky
    );


  scene.fog =
    new THREE.Fog(
      activeTrack.fog,
      90,
      260
    );


  const ground =
    new THREE.Mesh(

      new THREE.PlaneGeometry(
        420,
        420
      ),

      new THREE.MeshStandardMaterial({
        color:
          activeTrack.ground,
        roughness:
          1
      })

    );


  ground.rotation.x =
    -Math.PI /
    2;


  ground.position.y =
    -0.03;


  worldGroup.add(
    ground
  );


  buildRoadDetails();

  buildCity();

  buildCheckpointGates();

  buildBarriers();

  buildObstacles();

  buildBoostPads();


  /*
    Selected server-side car wins.
  */

  const multiplayerCar =
    window.REDLINE_MP
      ?.myPlayer
      ?.car;


  selectedCar =
    multiplayerCar
    ||
    selectedCar
    ||
    "gt";


  activeCarSpec =
    cars[
      selectedCar
    ]
    ||
    cars.gt;


  updateGarageUI();


  car =
    makeCarModel(
      activeCarSpec,
      false
    );


  carVisual =
    car;


  worldGroup.add(
    car
  );


  const players =
    window.REDLINE_MP
      ?.players
      ??
      [];


  const myId =
    window.REDLINE_MP
      ?.playerId;


  let myIndex =
    players.findIndex(
      player =>
        player.id ===
        myId
    );


  if (
    myIndex <
    0
  ) {

    myIndex =
      0;

  }


  const spawn =
    getGridTransform(
      myIndex
    );


  car.position.copy(
    spawn.position
  );


  car.rotation.y =
    spawn.rotation;


  carState = {

    velocity:
      new THREE.Vector3(),

    steer:
      0,

    gear:
      1,

    rpm:
      900,

    nitro:
      100,

    boostTimer:
      0

  };


  lap =
    1;


  checkpointStep =
    0;


  wrongWayTimer =
    0;


  localFinished =
    false;


  localFinishElapsed =
    null;


  finishOrder =
    [];


  updateObjective();


  /*
    Create the remote cars immediately so everyone
    is visible on the starting grid before packets arrive.
  */

  players.forEach(
    (
      player,
      index
    ) => {

      if (
        player.id ===
        myId
      ) {

        return;

      }


      createRemoteRacer(
        player,
        index
      );

    }
  );

}


/* =========================================================
   REMOTE GHOST CARS
========================================================= */

function createRemoteRacer(
  player,
  playerIndex = 0
) {

  if (
    !worldGroup
    ||
    !player?.id
    ||
    player.id ===
    window.REDLINE_MP?.playerId
  ) {

    return null;

  }


  if (
    remoteRacers.has(
      player.id
    )
  ) {

    return remoteRacers.get(
      player.id
    );

  }


  const spec =
    cars[
      player.car
    ]
    ||
    cars.gt;


  const model =
    makeCarModel(
      spec,
      true
    );


  const nameSprite =
    makeNameSprite(
      player.username
      ||
      "Racer"
    );


  model.add(
    nameSprite
  );


  const spawn =
    getGridTransform(
      playerIndex
    );


  model.position.copy(
    spawn.position
  );


  model.rotation.y =
    spawn.rotation;


  worldGroup.add(
    model
  );


  const remote = {

    playerId:
      player.id,

    username:
      player.username,

    car:
      player.car,

    model,

    targetPosition:
      spawn.position.clone(),

    targetRotation:
      spawn.rotation,

    lastUpdate:
      performance.now()

  };


  remoteRacers.set(
    player.id,
    remote
  );


  return remote;

}


function removeRemoteRacer(
  playerId
) {

  const remote =
    remoteRacers.get(
      playerId
    );


  if (
    !remote
  ) {

    return;

  }


  worldGroup?.remove(
    remote.model
  );


  remoteRacers.delete(
    playerId
  );


  raceStates.delete(
    playerId
  );

}


function receiveRaceState(
  state
) {

  if (
    !state?.playerId
  ) {

    return;

  }


  raceStates.set(
    state.playerId,
    state
  );


  if (
    state.playerId ===
    window.REDLINE_MP?.playerId
  ) {

    return;

  }


  const players =
    window.REDLINE_MP
      ?.players
      ??
      [];


  const playerIndex =
    Math.max(
      0,
      players.findIndex(
        player =>
          player.id ===
          state.playerId
      )
    );


  const player =
    players.find(
      entry =>
        entry.id ===
        state.playerId
    )
    ||
    {
      id:
        state.playerId,

      username:
        state.username,

      car:
        state.car
    };


  const remote =
    createRemoteRacer(
      player,
      playerIndex
    );


  if (
    !remote
  ) {

    return;

  }


  remote.targetPosition.set(
    state.x,
    state.y,
    state.z
  );


  remote.targetRotation =
    state.rotation;


  remote.lastUpdate =
    performance.now();

}


function updateRemoteRacers(
  delta
) {

  const positionLerp =
    1 -
    Math.exp(
      -12 *
      delta
    );


  const rotationLerp =
    1 -
    Math.exp(
      -15 *
      delta
    );


  for (
    const remote
    of remoteRacers.values()
  ) {

    remote.model.position.lerp(
      remote.targetPosition,
      positionLerp
    );


    remote.model.rotation.y =
      lerpAngle(
        remote.model.rotation.y,
        remote.targetRotation,
        rotationLerp
      );


    const state =
      raceStates.get(
        remote.playerId
      );


    const wheelSpeed =
      Math.abs(
        state?.speed
        ||
        0
      );


    for (
      const wheel
      of remote.model
        .userData
        .wheels
        ??
        []
    ) {

      wheel.rotation.x +=
        wheelSpeed *
        delta *
        1.4;

    }

  }

}


/* =========================================================
   NEAREST TRACK INFO
========================================================= */

function nearestTrackInfo(
  position
) {

  let bestDistance =
    Infinity;


  let bestIndex =
    0;


  let bestT =
    0;


  let bestPoint =
    null;


  for (
    let i = 0;
    i < TRACK_SAMPLES;
    i++
  ) {

    const a =
      trackPoints[
        i
      ];


    const b =
      trackPoints[
        (
          i +
          1
        )
        %
        TRACK_SAMPLES
      ];


    const ab =
      b
        .clone()
        .sub(
          a
        );


    const ap =
      position
        .clone()
        .sub(
          a
        );


    ab.y =
      0;


    ap.y =
      0;


    const lengthSq =
      ab.lengthSq()
      ||
      1;


    const t =
      clamp(
        ap.dot(
          ab
        )
        /
        lengthSq,

        0,
        1
      );


    const closest =
      a
        .clone()
        .addScaledVector(
          ab,
          t
        );


    const distance =
      new THREE.Vector2(
        position.x -
        closest.x,

        position.z -
        closest.z
      ).length();


    if (
      distance <
      bestDistance
    ) {

      bestDistance =
        distance;


      bestIndex =
        i;


      bestT =
        t;


      bestPoint =
        closest;

    }

  }


  const segmentStartLength =
    trackLengths[
      bestIndex
    ]
    ??
    0;


  const segmentLength =
    trackPoints[
      bestIndex
    ].distanceTo(

      trackPoints[
        (
          bestIndex +
          1
        )
        %
        TRACK_SAMPLES
      ]

    );


  const distanceAlong =
    segmentStartLength
    +
    segmentLength *
    bestT;


  return {

    distance:
      bestDistance,

    index:
      bestIndex,

    t:
      bestT,

    closest:
      bestPoint,

    routeProgress:
      (
        distanceAlong
        /
        totalTrackLength
      )
      %
      1

  };

}


/* =========================================================
   SURFACE
========================================================= */

function getSurface(
  position
) {

  const road =
    nearestTrackInfo(
      position
    );


  if (
    road.distance <=
    ROAD_HALF
  ) {

    return {

      name:
        "asphalt",

      road,

      acceleration:
        1,

      grip:
        1,

      drag:
        1,

      steer:
        1

    };

  }


  if (
    road.distance <=
    SIDEWALK_OUTER
  ) {

    return {

      name:
        "sidewalk",

      road,

      acceleration:
        0.72,

      grip:
        0.74,

      drag:
        2.3,

      steer:
        0.88

    };

  }


  return {

    name:
      "grass",

    road,

    acceleration:
      0.46,

    grip:
      0.42,

    drag:
      6.7,

    steer:
      0.68

  };

}


/* =========================================================
   BARRIER COLLISION
========================================================= */

function closestPointOnSegment(
  point,
  a,
  b
) {

  const ab =
    b
      .clone()
      .sub(
        a
      );


  const ap =
    point
      .clone()
      .sub(
        a
      );


  const lengthSq =
    ab.lengthSq()
    ||
    1;


  const t =
    clamp(
      ap.dot(
        ab
      )
      /
      lengthSq,

      0,
      1
    );


  return a
    .clone()
    .addScaledVector(
      ab,
      t
    );

}


function collideVisibleWorld() {

  if (
    !carState
    ||
    !car
  ) {

    return;

  }


  /*
    Physical barrier collisions.

    REMOTE PLAYERS ARE INTENTIONALLY
    NOT INCLUDED HERE.
  */

  for (
    const barrier
    of barrierSegments
  ) {

    const closest =
      closestPointOnSegment(
        car.position,
        barrier.a,
        barrier.b
      );


    const delta =
      car.position
        .clone()
        .sub(
          closest
        );


    delta.y =
      0;


    const distance =
      delta.length();


    if (
      distance <
      CAR_RADIUS
    ) {

      if (
        distance <
        0.001
      ) {

        delta.set(
          1,
          0,
          0
        );

      }

      else {

        delta.divideScalar(
          distance
        );

      }


      car.position.addScaledVector(
        delta,
        CAR_RADIUS -
        distance +
        0.02
      );


      const intoWall =
        carState.velocity.dot(
          delta
        );


      if (
        intoWall <
        0
      ) {

        carState.velocity.addScaledVector(
          delta,
          -intoWall *
          1.45
        );

      }


      carState.velocity.multiplyScalar(
        0.68
      );

    }

  }


  for (
    const obstacle
    of obstacles
  ) {

    const delta =
      car.position
        .clone()
        .sub(
          obstacle.position
        );


    delta.y =
      0;


    const required =
      obstacle.radius +
      CAR_RADIUS;


    const distance =
      delta.length();


    if (
      distance <
      required
    ) {

      if (
        distance <
        0.001
      ) {

        delta.set(
          1,
          0,
          0
        );

      }

      else {

        delta.divideScalar(
          distance
        );

      }


      car.position.addScaledVector(
        delta,
        required -
        distance +
        0.02
      );


      const impact =
        carState.velocity.dot(
          delta
        );


      if (
        impact <
        0
      ) {

        carState.velocity.addScaledVector(
          delta,
          -impact *
          1.55
        );

      }


      carState.velocity.multiplyScalar(
        0.56
      );

    }

  }

}


/* =========================================================
   BOOSTS
========================================================= */

function updateBoostPads(
  now
) {

  for (
    let i = 0;
    i < boostPads.length;
    i++
  ) {

    const pad =
      boostPads[
        i
      ];


    if (
      car.position.distanceTo(
        pad.position
      )
      >
      2.6
    ) {

      continue;

    }


    const last =
      boostCooldowns.get(
        i
      )
      ||
      0;


    if (
      now -
      last <
      1500
    ) {

      continue;

    }


    boostCooldowns.set(
      i,
      now
    );


    const forward =
      getForward(
        car.rotation.y
      );


    carState.velocity.addScaledVector(
      forward,
      11
    );


    carState.nitro =
      Math.min(
        100,
        carState.nitro +
        18
      );

  }

}


/* =========================================================
   GEARBOX
========================================================= */

const shiftUp = [
  0,
  22,
  42,
  64,
  87,
  112,
  145
];


const shiftDown = [
  0,
  0,
  16,
  34,
  54,
  76,
  98
];


const gearRatios = [
  0,
  3.0,
  2.2,
  1.65,
  1.30,
  1.05,
  0.86
];


function updateGearbox() {

  const mph =
    carState.velocity.length()
    *
    2.45;


  let gear =
    carState.gear;


  if (
    gear <
    6
    &&
    mph >
    shiftUp[
      gear
    ]
  ) {

    gear++;

  }

  else if (
    gear >
    1
    &&
    mph <
    shiftDown[
      gear
    ]
  ) {

    gear--;

  }


  carState.gear =
    gear;


  const ratio =
    gearRatios[
      gear
    ];


  carState.rpm =
    clamp(
      900
      +
      mph *
      ratio *
      22,

      900,
      7600
    );

}


/* =========================================================
   PHYSICS
========================================================= */

function updateCar(
  delta,
  now
) {

  if (
    !car
    ||
    !carState
  ) {

    return;

  }


  if (
    !raceActive
    ||
    localFinished
  ) {

    carState.rpm =
      900;


    return;

  }


  const accelerate =
    keys.has(
      "w"
    )
    ||
    keys.has(
      "arrowup"
    );


  const brake =
    keys.has(
      "s"
    )
    ||
    keys.has(
      "arrowdown"
    );


  const left =
    keys.has(
      "a"
    )
    ||
    keys.has(
      "arrowleft"
    );


  const right =
    keys.has(
      "d"
    )
    ||
    keys.has(
      "arrowright"
    );


  const handbrake =
    keys.has(
      " "
    );


  const nitro =
    (
      keys.has(
        "shift"
      )
      ||
      keys.has(
        "shiftleft"
      )
    )
    &&
    carState.nitro >
    0;


  const surface =
    getSurface(
      car.position
    );


  const forward =
    getForward(
      car.rotation.y
    );


  let forwardSpeed =
    carState.velocity.dot(
      forward
    );


  const forwardVelocity =
    forward
      .clone()
      .multiplyScalar(
        forwardSpeed
      );


  const lateralVelocity =
    carState.velocity
      .clone()
      .sub(
        forwardVelocity
      );


  if (
    accelerate
  ) {

    carState.velocity.addScaledVector(

      forward,

      activeCarSpec.acceleration
      *
      surface.acceleration
      *
      delta

    );

  }


  if (
    brake
  ) {

    if (
      forwardSpeed >
      1
    ) {

      carState.velocity.addScaledVector(

        forward,

        -activeCarSpec.braking
        *
        delta

      );

    }

    else {

      carState.velocity.addScaledVector(

        forward,

        -activeCarSpec.reverseAcceleration
        *
        surface.acceleration
        *
        delta

      );

    }

  }


  /*
    Lateral grip.

    Space = intentionally lower grip.
  */

  const grip =
    (
      handbrake
        ?
        activeCarSpec.driftGrip
        :
        activeCarSpec.grip
    )
    *
    surface.grip;


  carState.velocity.addScaledVector(

    lateralVelocity,

    -Math.min(
      1,
      grip *
      delta
    )

  );


  /*
    Rolling/off-road drag.
  */

  const drag =
    activeCarSpec.drag
    *
    surface.drag;


  carState.velocity.multiplyScalar(

    Math.exp(
      -drag *
      delta
    )

  );


  const speed =
    carState.velocity.length();


  /*
    Car-specific aero drag.
  */

  if (
    speed >
    42
  ) {

    carState.velocity.multiplyScalar(

      Math.exp(
        -(
          speed -
          42
        )
        *
        activeCarSpec.aeroDrag
        *
        delta

      )

    );

  }


  /*
    Steering.
  */

  const steerInput =
    (
      left
        ?
        1
        :
        0
    )
    -
    (
      right
        ?
        1
        :
        0
    );


  carState.steer =
    THREE.MathUtils.lerp(
      carState.steer,
      steerInput,
      0.16
    );


  forwardSpeed =
    carState.velocity.dot(
      forward
    );


  const steeringSpeed =
    clamp(
      Math.abs(
        forwardSpeed
      )
      /
      8,

      0,
      1
    );


  const reverseDirection =
    forwardSpeed >=
    0
      ?
      1
      :
      -1;


  const handbrakeBonus =
    handbrake
      ?
      1.25
      :
      1;


  car.rotation.y +=

    carState.steer
    *
    activeCarSpec.steer
    *
    surface.steer
    *
    steeringSpeed
    *
    handbrakeBonus
    *
    delta
    *
    reverseDirection;


  /*
    Nitro.
  */

  if (
    nitro
    &&
    speed >
    4
  ) {

    carState.velocity.addScaledVector(
      getForward(
        car.rotation.y
      ),
      21 *
      delta
    );


    carState.nitro =
      Math.max(
        0,
        carState.nitro -
        24 *
        delta
      );

  }

  else {

    carState.nitro =
      Math.min(
        100,
        carState.nitro +
        4.5 *
        delta
      );

  }


  /*
    Speed limits.
  */

  const maximum =
    nitro
      ?
      activeCarSpec.nitroSpeed
      :
      activeCarSpec.topSpeed;


  const currentSpeed =
    carState.velocity.length();


  if (
    currentSpeed >
    maximum
  ) {

    carState.velocity.multiplyScalar(
      maximum /
      currentSpeed
    );

  }


  /*
    Move.
  */

  car.position.addScaledVector(
    carState.velocity,
    delta
  );


  collideVisibleWorld();

  updateBoostPads(
    now
  );

  updateGearbox();

  updateCarVisuals(
    delta
  );

  updateCheckpoints();

  updateNavigation(
    delta
  );

}


/* =========================================================
   LOCAL CAR VISUAL
========================================================= */

function updateCarVisuals(
  delta
) {

  if (
    !carVisual
    ||
    !carState
  ) {

    return;

  }


  const speed =
    carState.velocity.length();


  for (
    const wheel
    of carVisual
      .userData
      .wheels
      ??
      []
  ) {

    wheel.rotation.x +=
      speed *
      delta *
      1.6;

  }

}


/* =========================================================
   CHECKPOINTS
========================================================= */

function getNextCheckpointPosition() {

  return trackCurve.getPointAt(

    CHECKPOINT_TS[
      checkpointStep
    ]

  );

}


function updateCheckpoints() {

  if (
    localFinished
  ) {

    return;

  }


  const target =
    getNextCheckpointPosition();


  const distance =
    car.position.distanceTo(
      target
    );


  if (
    distance >
    7.5
  ) {

    return;

  }


  checkpointPopup.classList.remove(
    "hidden"
  );


  clearTimeout(
    updateCheckpoints.popupTimer
  );


  updateCheckpoints.popupTimer =
    setTimeout(
      () => {

        checkpointPopup.classList.add(
          "hidden"
        );

      },
      550
    );


  checkpointStep++;


  if (
    checkpointStep >=
    CHECKPOINT_TS.length
  ) {

    checkpointStep =
      0;


    lap++;


    if (
      lap >
      TARGET_LAPS
    ) {

      finishRace();

      return;

    }

  }


  updateObjective();

}


function updateObjective() {

  objectiveEl.textContent =
    `LAP ${Math.min(
      lap,
      TARGET_LAPS
    )} / ${TARGET_LAPS}`;


  checkpointText.textContent =
    `CHECKPOINT ${
      checkpointStep +
      1
    } / ${
      CHECKPOINT_TS.length
    }`;

}


/* =========================================================
   CHECKPOINT PROGRESS
========================================================= */

function getCheckpointProgress() {

  if (
    !car
  ) {

    return 0;

  }


  const road =
    nearestTrackInfo(
      car.position
    );


  const current =
    road.routeProgress;


  const next =
    checkpointFractions[
      checkpointStep
    ];


  const previous =
    checkpointStep ===
    0
      ?
      checkpointFractions[
        checkpointFractions.length -
        1
      ]
      :
      checkpointFractions[
        checkpointStep -
        1
      ];


  let span =
    next -
    previous;


  if (
    span <=
    0
  ) {

    span +=
      1;

  }


  let travelled =
    current -
    previous;


  if (
    travelled <
    0
  ) {

    travelled +=
      1;

  }


  return clamp(
    travelled /
    span,
    0,
    0.9999
  );

}


/* =========================================================
   NAVIGATION
========================================================= */

function updateNavigation(
  delta
) {

  if (
    !car
    ||
    localFinished
  ) {

    return;

  }


  const target =
    getNextCheckpointPosition();


  const toTarget =
    target
      .clone()
      .sub(
        car.position
      );


  toTarget.y =
    0;


  const distance =
    toTarget.length();


  checkpointDistance.textContent =
    `${Math.round(
      distance
    )}m`;


  if (
    distance <
    0.001
  ) {

    return;

  }


  toTarget.normalize();


  const forward =
    getForward(
      car.rotation.y
    );


  const right =
    new THREE.Vector3(
      Math.cos(
        car.rotation.y
      ),
      0,
      -Math.sin(
        car.rotation.y
      )
    );


  const forwardDot =
    forward.dot(
      toTarget
    );


  const rightDot =
    right.dot(
      toTarget
    );


  const degrees =
    THREE.MathUtils.radToDeg(

      Math.atan2(
        rightDot,
        forwardDot
      )

    );


  directionArrow.style.transform =
    `rotate(${clamp(
      degrees,
      -105,
      105
    )}deg)`;


  const absolute =
    Math.abs(
      degrees
    );


  if (
    absolute <
    18
  ) {

    navigationText.textContent =
      "STRAIGHT";

  }

  else if (
    absolute <
    60
  ) {

    navigationText.textContent =
      degrees >
      0
        ?
        "TURN RIGHT"
        :
        "TURN LEFT";

  }

  else {

    navigationText.textContent =
      degrees >
      0
        ?
        "HARD RIGHT"
        :
        "HARD LEFT";

  }


  if (
    forwardDot <
    -0.35
    &&
    carState.velocity.length()
    >
    4
  ) {

    wrongWayTimer +=
      delta;

  }

  else {

    wrongWayTimer =
      Math.max(
        0,
        wrongWayTimer -
        delta *
        2
      );

  }


  wrongWay.classList.toggle(
    "hidden",
    wrongWayTimer <
    0.85
  );

}


/* =========================================================
   TIMER
========================================================= */

function formatRaceTime(
  milliseconds
) {

  const total =
    Math.max(
      0,
      Math.floor(
        milliseconds
      )
    );


  const minutes =
    Math.floor(
      total /
      60000
    );


  const seconds =
    Math.floor(
      (
        total %
        60000
      )
      /
      1000
    );


  const millis =
    total %
    1000;


  return (
    `${String(
      minutes
    ).padStart(
      2,
      "0"
    )}:` +

    `${String(
      seconds
    ).padStart(
      2,
      "0"
    )}.` +

    `${String(
      millis
    ).padStart(
      3,
      "0"
    )}`
  );

}


function updateRaceTimer() {

  if (
    !serverRaceStartAt
  ) {

    raceTimerEl.textContent =
      "00:00.000";

    return;

  }


  if (
    localFinishElapsed !==
    null
  ) {

    raceTimerEl.textContent =
      formatRaceTime(
        localFinishElapsed
      );


    return;

  }


  const elapsed =
    Date.now() -
    serverRaceStartAt;


  raceTimerEl.textContent =
    formatRaceTime(
      Math.max(
        0,
        elapsed
      )
    );

}


/* =========================================================
   SERVER COUNTDOWN
========================================================= */

function updateCountdown() {

  if (
    !raceStarted
    ||
    !serverRaceStartAt
  ) {

    return;

  }


  const now =
    Date.now();


  const remaining =
    serverRaceStartAt -
    now;


  if (
    remaining >
    0
  ) {

    raceActive =
      false;


    countdown.classList.remove(
      "hidden"
    );


    const number =
      Math.min(
        3,
        Math.max(
          1,
          Math.ceil(
            remaining /
            1000
          )
        )
      );


    countdown.textContent =
      String(
        number
      );


    return;

  }


  if (
    !raceActive
    &&
    !localFinished
  ) {

    raceActive =
      true;


    countdown.classList.remove(
      "hidden"
    );


    countdown.textContent =
      "GO";


    goHideAt =
      now +
      650;

  }


  if (
    goHideAt
    &&
    now >=
    goHideAt
  ) {

    countdown.classList.add(
      "hidden"
    );


    goHideAt =
      0;

  }

}


/* =========================================================
   MULTIPLAYER LOCAL STATE
========================================================= */

function createLocalRaceState() {

  if (
    !car
    ||
    !carState
  ) {

    return null;

  }


  return {

    playerId:
      window.REDLINE_MP
        ?.playerId,

    username:
      window.REDLINE_MP
        ?.myPlayer
        ?.username
      ||
      "Racer",

    car:
      selectedCar,

    x:
      car.position.x,

    y:
      car.position.y,

    z:
      car.position.z,

    rotation:
      car.rotation.y,

    speed:
      carState.velocity.length(),

    lap:
      Math.min(
        lap,
        TARGET_LAPS
      ),

    checkpoint:
      checkpointStep,

    progress:
      getCheckpointProgress(),

    finished:
      localFinished,

    timestamp:
      Date.now()

  };

}


/* =========================================================
   NETWORK SENDING
========================================================= */

function updateNetwork(
  now
) {

  if (
    !raceStarted
    ||
    !window.REDLINE_MP
      ?.connected
  ) {

    return;

  }


  const state =
    createLocalRaceState();


  if (
    !state?.playerId
  ) {

    return;

  }


  raceStates.set(
    state.playerId,
    state
  );


  if (
    now -
    lastNetworkSend <
    NETWORK_INTERVAL
  ) {

    return;

  }


  lastNetworkSend =
    now;


  window.REDLINE_MP
    .sendRaceState(
      state
    );

}


/* =========================================================
   RACE POSITION
========================================================= */

function getStateScore(
  state
) {

  if (
    !state
  ) {

    return -1;

  }


  return (

    (
      state.lap -
      1
    )
    *
    CHECKPOINT_TS.length

    +

    state.checkpoint

    +

    clamp(
      state.progress,
      0,
      0.9999
    )

  );

}


function updateRacePosition() {

  const players =
    window.REDLINE_MP
      ?.players
      ??
      [];


  const myId =
    window.REDLINE_MP
      ?.playerId;


  if (
    !myId
  ) {

    racePositionEl.textContent =
      "1";


    totalRacersEl.textContent =
      "1";


    return;

  }


  totalRacersEl.textContent =
    Math.max(
      1,
      players.length
    );


  const ranked =
    players.map(
      player => {

        const finish =
          finishOrder.find(
            result =>
              result.playerId ===
              player.id
          );


        return {

          playerId:
            player.id,

          finished:
            Boolean(
              finish
            ),

          finishPlace:
            finish?.place
            ??
            Infinity,

          score:
            getStateScore(
              raceStates.get(
                player.id
              )
            )

        };

      }
    );


  ranked.sort(
    (
      a,
      b
    ) => {

      if (
        a.finished
        &&
        b.finished
      ) {

        return (
          a.finishPlace -
          b.finishPlace
        );

      }


      if (
        a.finished
      ) {

        return -1;

      }


      if (
        b.finished
      ) {

        return 1;

      }


      return (
        b.score -
        a.score
      );

    }
  );


  const index =
    ranked.findIndex(
      racer =>
        racer.playerId ===
        myId
    );


  racePositionEl.textContent =
    index >=
    0
      ?
      String(
        index +
        1
      )
      :
      "1";

}


/* =========================================================
   FINISH
========================================================= */

function finishRace() {

  if (
    localFinished
  ) {

    return;

  }


  localFinished =
    true;


  raceActive =
    false;


  carState.velocity.set(
    0,
    0,
    0
  );


  localFinishElapsed =
    Math.max(
      0,

      Date.now() -
      (
        serverRaceStartAt
        ||
        Date.now()
      )
    );


  message.textContent =
    "FINISH";


  message.classList.remove(
    "hidden"
  );


  setTimeout(
    () => {

      message.classList.add(
        "hidden"
      );

    },
    1800
  );


  window.REDLINE_MP
    ?.sendFinish?.();

}


/* =========================================================
   MULTIPLAYER EVENTS
========================================================= */

window.addEventListener(
  "redline:race-state",
  event => {

    receiveRaceState(
      event.detail
    );

  }
);


window.addEventListener(
  "redline:race-snapshot",
  event => {

    const states =
      event.detail?.states
      ??
      [];


    if (
      event.detail?.startAt
    ) {

      serverRaceStartAt =
        event.detail.startAt;

    }


    finishOrder =
      event.detail?.finishOrder
      ??
      [];


    for (
      const state
      of states
    ) {

      receiveRaceState(
        state
      );

    }

  }
);


window.addEventListener(
  "redline:player-finished",
  event => {

    finishOrder =
      event.detail
        ?.finishOrder
      ??
      finishOrder;

  }
);


window.addEventListener(
  "redline:player-disconnected",
  event => {

    removeRemoteRacer(
      event.detail?.playerId
    );

  }
);


window.addEventListener(
  "redline:race-started",
  event => {

    if (
      event.detail?.startAt
    ) {

      serverRaceStartAt =
        event.detail.startAt;

    }

  }
);


/* =========================================================
   MINIMAP
========================================================= */

function getTrackBounds() {

  let minX =
    Infinity;


  let maxX =
    -Infinity;


  let minZ =
    Infinity;


  let maxZ =
    -Infinity;


  for (
    const point
    of trackPoints
  ) {

    minX =
      Math.min(
        minX,
        point.x
      );


    maxX =
      Math.max(
        maxX,
        point.x
      );


    minZ =
      Math.min(
        minZ,
        point.z
      );


    maxZ =
      Math.max(
        maxZ,
        point.z
      );

  }


  return {
    minX,
    maxX,
    minZ,
    maxZ
  };

}


function drawMinimap() {

  if (
    !car
    ||
    !trackPoints.length
  ) {

    return;

  }


  const width =
    minimap.width;


  const height =
    minimap.height;


  mapCtx.clearRect(
    0,
    0,
    width,
    height
  );


  const bounds =
    getTrackBounds();


  const padding =
    17;


  const scale =
    Math.min(

      (
        width -
        padding *
        2
      )
      /
      (
        bounds.maxX -
        bounds.minX
      ),

      (
        height -
        padding *
        2
      )
      /
      (
        bounds.maxZ -
        bounds.minZ
      )

    );


  function mapPoint(
    x,
    z
  ) {

    return {

      x:
        padding
        +
        (
          x -
          bounds.minX
        )
        *
        scale,

      y:
        height
        -
        padding
        -
        (
          z -
          bounds.minZ
        )
        *
        scale

    };

  }


  mapCtx.strokeStyle =
    "rgba(255,255,255,.30)";


  mapCtx.lineWidth =
    5;


  mapCtx.lineJoin =
    "round";


  mapCtx.lineCap =
    "round";


  mapCtx.beginPath();


  trackPoints.forEach(
    (
      point,
      index
    ) => {

      const mapped =
        mapPoint(
          point.x,
          point.z
        );


      if (
        index ===
        0
      ) {

        mapCtx.moveTo(
          mapped.x,
          mapped.y
        );

      }

      else {

        mapCtx.lineTo(
          mapped.x,
          mapped.y
        );

      }

    }
  );


  const first =
    mapPoint(
      trackPoints[0].x,
      trackPoints[0].z
    );


  mapCtx.lineTo(
    first.x,
    first.y
  );


  mapCtx.stroke();


  /*
    Remote players
  */

  for (
    const remote
    of remoteRacers.values()
  ) {

    const mapped =
      mapPoint(
        remote.model.position.x,
        remote.model.position.z
      );


    mapCtx.fillStyle =
      "rgba(255,255,255,.68)";


    mapCtx.beginPath();


    mapCtx.arc(
      mapped.x,
      mapped.y,
      3.4,
      0,
      Math.PI *
      2
    );


    mapCtx.fill();

  }


  /*
    Local player
  */

  const player =
    mapPoint(
      car.position.x,
      car.position.z
    );


  mapCtx.save();


  mapCtx.translate(
    player.x,
    player.y
  );


  mapCtx.rotate(
    -car.rotation.y
  );


  mapCtx.fillStyle =
    "#74a6ff";


  mapCtx.beginPath();


  mapCtx.moveTo(
    0,
    -7
  );


  mapCtx.lineTo(
    5,
    6
  );


  mapCtx.lineTo(
    -5,
    6
  );


  mapCtx.closePath();


  mapCtx.fill();


  mapCtx.restore();

}


/* =========================================================
   CAMERA
========================================================= */

function updateCamera(
  delta
) {

  if (
    !car
  ) {

    return;

  }


  const speed =
    carState
      ?.velocity
      ?.length()
    ||
    0;


  const offset =
    new THREE.Vector3(
      0,
      3.15 +
      Math.min(
        speed *
        0.012,
        0.6
      ),
      7.3 +
      Math.min(
        speed *
        0.035,
        2.0
      )
    );


  offset.applyAxisAngle(

    new THREE.Vector3(
      0,
      1,
      0
    ),

    car.rotation.y

  );


  const desired =
    car.position
      .clone()
      .add(
        offset
      );


  const amount =
    1 -
    Math.exp(
      -7 *
      delta
    );


  camera.position.lerp(
    desired,
    amount
  );


  const look =
    car.position.clone();


  look.y +=
    0.75;


  look.addScaledVector(
    getForward(
      car.rotation.y
    ),
    5
  );


  camera.lookAt(
    look
  );


  const targetFov =
    68 +
    Math.min(
      speed *
      0.16,
      9
    );


  camera.fov =
    THREE.MathUtils.lerp(
      camera.fov,
      targetFov,
      amount
    );


  camera.updateProjectionMatrix();

}


/* =========================================================
   HUD
========================================================= */

function updateHud() {

  if (
    !carState
  ) {

    return;

  }


  const mph =
    carState.velocity.length()
    *
    2.45;


  speedEl.textContent =
    Math.round(
      mph
    );


  const forward =
    getForward(
      car.rotation.y
    );


  const forwardSpeed =
    carState.velocity.dot(
      forward
    );


  gearEl.textContent =
    forwardSpeed <
    -1
      ?
      "R"
      :
      carState.gear;


  rpmBar.style.width =
    `${clamp(
      carState.rpm /
      7600,
      0,
      1
    ) * 100}%`;


  nitroBar.style.width =
    `${carState.nitro}%`;


  nitroPercent.textContent =
    `${Math.round(
      carState.nitro
    )}%`;


  updateRaceTimer();

  updateRacePosition();

}


/* =========================================================
   START RACE
========================================================= */

function startRace() {

  activeTrack =
    tracks[
      window.REDLINE_MP
        ?.room
        ?.map
    ]
    ||
    tracks.neon;


  buildWorld();


  trackNameEl.textContent =
    activeTrack.name;


  trackDescription.textContent =
    activeTrack.description;


  menu.classList.add(
    "hidden"
  );


  hud.classList.remove(
    "hidden"
  );


  message.classList.add(
    "hidden"
  );


  serverRaceStartAt =
    window.REDLINE_MP
      ?.raceStartAt
    ||
    (
      Date.now() +
      3000
    );


  raceActive =
    false;


  raceStarted =
    true;


  goHideAt =
    0;


  totalRacersEl.textContent =
    Math.max(
      1,
      window.REDLINE_MP
        ?.players
        ?.length
      ||
      1
    );


  raceTimerEl.textContent =
    "00:00.000";


  racePositionEl.textContent =
    "1";

}


/* =========================================================
   INPUT
========================================================= */

window.addEventListener(
  "keydown",
  event => {

    const key =
      event.key
        .toLowerCase();


    if (
      [
        "arrowup",
        "arrowdown",
        "arrowleft",
        "arrowright",
        " "
      ].includes(
        key
      )
    ) {

      event.preventDefault();

    }


    keys.add(
      key
    );

  }
);


window.addEventListener(
  "keyup",
  event => {

    keys.delete(
      event.key
        .toLowerCase()
    );

  }
);


window.addEventListener(
  "blur",
  () => {

    keys.clear();

  }
);


/* =========================================================
   FPS
========================================================= */

function updateFPS(
  now
) {

  fpsFrames++;


  if (
    now -
    lastFpsTime <
    1000
  ) {

    return;

  }


  const fps =
    Math.round(

      fpsFrames *
      1000
      /
      (
        now -
        lastFpsTime
      )

    );


  fpsEl.textContent =
    `FPS ${fps}`;


  if (
    fps <
    34
    &&
    quality.renderScale >
    0.52
  ) {

    quality.renderScale =
      Math.max(
        0.52,
        quality.renderScale -
        0.06
      );


    resizeRenderer();

  }

  else if (
    fps >
    55
    &&
    quality.renderScale <
    0.88
  ) {

    quality.renderScale =
      Math.min(
        0.88,
        quality.renderScale +
        0.03
      );


    resizeRenderer();

  }


  fpsFrames =
    0;


  lastFpsTime =
    now;

}


/* =========================================================
   LOOP
========================================================= */

function gameLoop(
  now
) {

  requestAnimationFrame(
    gameLoop
  );


  const delta =
    Math.min(
      clock.getDelta(),
      0.04
    );


  if (
    raceStarted
  ) {

    updateCountdown();

    updateCar(
      delta,
      now
    );

    updateNetwork(
      now
    );

    updateRemoteRacers(
      delta
    );

    updateCamera(
      delta
    );

    updateHud();

    drawMinimap();

  }

  else {

    /*
      Preview camera.
    */

    updateCamera(
      delta
    );

    drawMinimap();

  }


  updateFPS(
    now
  );


  renderer.render(
    scene,
    camera
  );

}


/* =========================================================
   INITIAL PREVIEW
========================================================= */

buildTrackCurve();


activeTrack =
  tracks.neon;


buildWorld();


trackDescription.textContent =
  activeTrack.description;


startBtn.addEventListener(
  "click",
  startRace
);


requestAnimationFrame(
  gameLoop
);
