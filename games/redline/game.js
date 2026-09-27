import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

/* =========================================================
   REDLINE
   Navigation / HUD build
   ========================================================= */


/* -------------------------
   HTML ELEMENTS
------------------------- */

const canvas =
  document.getElementById("gameCanvas");

const menu =
  document.getElementById("menu");

const hud =
  document.getElementById("hud");

const startBtn =
  document.getElementById("startBtn");

const trackSelect =
  document.getElementById("trackSelect");

const trackDescription =
  document.getElementById("trackDescription");

const trackNameEl =
  document.getElementById("trackName");

const objectiveEl =
  document.getElementById("objective");

const checkpointText =
  document.getElementById("checkpointText");

const directionArrow =
  document.getElementById("directionArrow");

const navigationText =
  document.getElementById("navigationText");

const checkpointDistance =
  document.getElementById("checkpointDistance");

const wrongWay =
  document.getElementById("wrongWay");

const minimap =
  document.getElementById("minimap");

const mapCtx =
  minimap.getContext("2d");

const speedEl =
  document.getElementById("speed");

const gearEl =
  document.getElementById("gear");

const rpmBar =
  document.getElementById("rpmBar");

const nitroBar =
  document.getElementById("nitroBar");

const nitroPercent =
  document.getElementById("nitroPercent");

const fpsEl =
  document.getElementById("fps");

const countdown =
  document.getElementById("countdown");

const checkpointPopup =
  document.getElementById("checkpointPopup");

const message =
  document.getElementById("message");


/* =========================================================
   THREE.JS
   ========================================================= */

const renderer =
  new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: "high-performance"
  });

renderer.outputColorSpace =
  THREE.SRGBColorSpace;

renderer.setPixelRatio(1);


const scene =
  new THREE.Scene();


const camera =
  new THREE.PerspectiveCamera(
    68,
    16 / 9,
    0.1,
    350
  );


const hemisphere =
  new THREE.HemisphereLight(
    0xffffff,
    0x263040,
    1.7
  );

scene.add(hemisphere);


const sunlight =
  new THREE.DirectionalLight(
    0xffffff,
    1.2
  );

sunlight.position.set(
  30,
  50,
  20
);

scene.add(sunlight);


const clock =
  new THREE.Clock();


/* =========================================================
   GAME STATE
   ========================================================= */

const keys =
  new Set();


let worldGroup = null;

let car = null;

let carState = null;

let activeTrack = null;

let raceActive = false;

let checkpointStep = 0;

let lap = 1;

const targetLaps = 3;

let wrongWayTimer = 0;

let checkpointPopupTimer = null;


/* PERFORMANCE */

const quality = {
  renderScale: 0.72
};


let fpsFrames = 0;

let lastFpsTime =
  performance.now();


/* ROAD */

const ROAD_HALF =
  7;


/* =========================================================
   TRACK DATA
   ========================================================= */

const tracks = {

  neon: {

    name:
      "NEON DISTRICT",

    description:
      "Night street circuit through the city with fast sweepers and tight corners.",

    sky:
      0x0b1020,

    fog:
      0x0b1020,

    ground:
      0x101722,

    road:
      0x282d37,

    edge:
      0x8794a8,

    grip:
      1,

    points: [

      [-8, 0],

      [0, -35],

      [22, -72],

      [58, -90],

      [94, -76],

      [118, -45],

      [122, -7],

      [103, 28],

      [67, 49],

      [28, 52],

      [-13, 39],

      [-35, 8]

    ],

    checkpoints: [
      1,
      3,
      5,
      7,
      9,
      11,
      0
    ]
  },


  canyon: {

    name:
      "DUSTFALL CANYON",

    description:
      "Fast desert circuit with long straights, sweeping turns and reduced off-road grip.",

    sky:
      0xb06d3d,

    fog:
      0xb06d3d,

    ground:
      0x87562f,

    road:
      0x48423d,

    edge:
      0xc19a70,

    grip:
      0.92,

    points: [

      [-10, 0],

      [-3, -42],

      [20, -79],

      [58, -111],

      [104, -113],

      [139, -86],

      [151, -46],

      [140, -5],

      [110, 30],

      [70, 45],

      [27, 37],

      [-3, 18]

    ],

    checkpoints: [
      1,
      3,
      5,
      7,
      9,
      11,
      0
    ]
  },


  arctic: {

    name:
      "ARCTIC RELAY",

    description:
      "Frozen research-road circuit where reduced traction makes every corner dangerous.",

    sky:
      0xbad7df,

    fog:
      0xbad7df,

    ground:
      0xd3e5e8,

    road:
      0x52646d,

    edge:
      0xd6f5ff,

    grip:
      0.72,

    points: [

      [-8, 0],

      [-15, -38],

      [0, -80],

      [33, -110],

      [77, -116],

      [111, -93],

      [132, -55],

      [128, -17],

      [104, 20],

      [69, 43],

      [28, 48],

      [-7, 30]

    ],

    checkpoints: [
      1,
      3,
      5,
      7,
      9,
      11,
      0
    ]
  }

};


/* =========================================================
   RENDER SIZE
   ========================================================= */

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
    width + "px";

  canvas.style.height =
    height + "px";


  camera.aspect =
    width / height;

  camera.updateProjectionMatrix();

}


window.addEventListener(
  "resize",
  resizeRenderer
);

resizeRenderer();


/* =========================================================
   HELPERS
   ========================================================= */

function pointToVector(
  point,
  y = 0
) {

  return new THREE.Vector3(
    point[0],
    y,
    point[1]
  );

}


function forwardVector() {

  return new THREE.Vector3(

    Math.sin(
      car.rotation.y
    ),

    0,

    Math.cos(
      car.rotation.y
    )

  );

}


/* =========================================================
   CLEANUP
   ========================================================= */

function disposeWorld() {

  if (!worldGroup) {
    return;
  }


  worldGroup.traverse(

    object => {

      if (
        object.geometry
      ) {

        object.geometry
          .dispose?.();

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
          [object.material];


        materials.forEach(

          material => {

            material
              .dispose?.();

          }

        );

      }

    }

  );


  scene.remove(
    worldGroup
  );


  worldGroup = null;

}


/* =========================================================
   ROAD
   ========================================================= */

function buildRoad(
  track
) {

  const points =
    track.points;


  const vertices = [];

  const indices = [];


  for (
    let i = 0;
    i < points.length;
    i++
  ) {

    const current =
      pointToVector(
        points[i]
      );


    const previous =
      pointToVector(

        points[

          (
            i -
            1 +
            points.length
          )

          %

          points.length

        ]

      );


    const next =
      pointToVector(

        points[

          (
            i +
            1
          )

          %

          points.length

        ]

      );


    const tangent =
      next
        .clone()
        .sub(previous)
        .normalize();


    const normal =
      new THREE.Vector3(

        -tangent.z,

        0,

        tangent.x

      );


    const left =
      current
        .clone()
        .addScaledVector(
          normal,
          ROAD_HALF
        );


    const right =
      current
        .clone()
        .addScaledVector(
          normal,
          -ROAD_HALF
        );


    vertices.push(

      left.x,
      0.03,
      left.z,

      right.x,
      0.03,
      right.z

    );

  }


  for (
    let i = 0;
    i < points.length;
    i++
  ) {

    const next =
      (
        i +
        1
      )

      %

      points.length;


    const a =
      i * 2;

    const b =
      a + 1;

    const c =
      next * 2;

    const d =
      c + 1;


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


  const road =
    new THREE.Mesh(

      geometry,

      new THREE.MeshLambertMaterial({

        color:
          track.road

      })

    );


  worldGroup.add(
    road
  );


  buildRoadEdges(
    track
  );


  buildCenterLines(
    track
  );

}


/* =========================================================
   ROAD EDGES
   ========================================================= */

function buildRoadEdges(
  track
) {

  const geometry =
    new THREE.BoxGeometry(
      0.20,
      0.08,
      1
    );


  const material =
    new THREE.MeshBasicMaterial({

      color:
        track.edge

    });


  const points =
    track.points;


  for (
    let i = 0;
    i < points.length;
    i++
  ) {

    const start =
      pointToVector(
        points[i],
        0.08
      );


    const end =
      pointToVector(

        points[

          (
            i +
            1
          )

          %

          points.length

        ],

        0.08

      );


    const direction =
      end
        .clone()
        .sub(start);


    const length =
      direction.length();


    const tangent =
      direction
        .clone()
        .normalize();


    const normal =
      new THREE.Vector3(

        -tangent.z,

        0,

        tangent.x

      );


    const midpoint =
      start
        .clone()
        .add(end)
        .multiplyScalar(
          0.5
        );


    const rotation =
      Math.atan2(

        direction.x,

        direction.z

      );


    for (
      const side
      of [-1, 1]
    ) {

      const edge =
        new THREE.Mesh(
          geometry,
          material
        );


      edge.scale.z =
        length;


      edge.position
        .copy(midpoint)
        .addScaledVector(

          normal,

          ROAD_HALF *
          side

        );


      edge.rotation.y =
        rotation;


      worldGroup.add(
        edge
      );

    }

  }

}


/* =========================================================
   CENTER LINES
   ========================================================= */

function buildCenterLines(
  track
) {

  const geometry =
    new THREE.BoxGeometry(
      0.12,
      0.025,
      2.4
    );


  const material =
    new THREE.MeshBasicMaterial({

      color:
        0xcbd0d8

    });


  const points =
    track.points;


  for (
    let i = 0;
    i < points.length;
    i++
  ) {

    const start =
      pointToVector(
        points[i],
        0.065
      );


    const end =
      pointToVector(

        points[

          (
            i +
            1
          )

          %

          points.length

        ],

        0.065

      );


    const segment =
      end
        .clone()
        .sub(start);


    const length =
      segment.length();


    const direction =
      segment
        .clone()
        .normalize();


    const rotation =
      Math.atan2(

        direction.x,

        direction.z

      );


    const dashCount =
      Math.floor(
        length /
        7
      );


    for (
      let dash = 1;
      dash <= dashCount;
      dash++
    ) {

      const marker =
        new THREE.Mesh(
          geometry,
          material
        );


      marker.position
        .copy(start)
        .addScaledVector(

          direction,

          dash * 7

        );


      marker.rotation.y =
        rotation;


      worldGroup.add(
        marker
      );

    }

  }

}


/* =========================================================
   CHECKPOINT GATES
   ========================================================= */

function addCheckpointGate(
  track,
  pointIndex,
  gateNumber
) {

  const point =
    pointToVector(

      track.points[
        pointIndex
      ]

    );


  const previous =
    pointToVector(

      track.points[

        (
          pointIndex -
          1 +
          track.points.length
        )

        %

        track.points.length

      ]

    );


  const next =
    pointToVector(

      track.points[

        (
          pointIndex +
          1
        )

        %

        track.points.length

      ]

    );


  const tangent =
    next
      .clone()
      .sub(previous)
      .normalize();


  const normal =
    new THREE.Vector3(

      -tangent.z,

      0,

      tangent.x

    );


  const gate =
    new THREE.Group();


  gate.position.copy(
    point
  );


  const color =

    gateNumber === 0
    ?
    0x72a7ff
    :
    0xffffff;


  const material =
    new THREE.MeshBasicMaterial({
      color
    });


  const postGeometry =
    new THREE.BoxGeometry(
      0.35,
      4.5,
      0.35
    );


  const leftPost =
    new THREE.Mesh(
      postGeometry,
      material
    );


  leftPost.position
    .copy(normal)
    .multiplyScalar(

      ROAD_HALF -
      0.6

    );


  leftPost.position.y =
    2.25;


  const rightPost =
    new THREE.Mesh(
      postGeometry,
      material
    );


  rightPost.position
    .copy(normal)
    .multiplyScalar(

      -ROAD_HALF +
      0.6

    );


  rightPost.position.y =
    2.25;


  const topGeometry =
    new THREE.BoxGeometry(

      ROAD_HALF *
      2 -
      1,

      0.35,

      0.35

    );


  const topBeam =
    new THREE.Mesh(
      topGeometry,
      material
    );


  topBeam.position.y =
    4.4;


  /*
    Beam lies across the road.
  */

  topBeam.rotation.y =

    Math.atan2(

      normal.z,

      normal.x

    );


  gate.add(

    leftPost,
    rightPost,
    topBeam

  );


  worldGroup.add(
    gate
  );

}


/* =========================================================
   SCENERY
   ========================================================= */

function buildScenery(
  track
) {

  const ground =
    new THREE.Mesh(

      new THREE.PlaneGeometry(
        430,
        430
      ),

      new THREE.MeshLambertMaterial({

        color:
          track.ground

      })

    );


  ground.rotation.x =
    -Math.PI / 2;


  ground.position.y =
    -0.02;


  worldGroup.add(
    ground
  );


  if (
    track ===
    tracks.neon
  ) {

    buildCity();

  }

  else if (
    track ===
    tracks.canyon
  ) {

    buildCanyon();

  }

  else {

    buildArctic();

  }

}


/* CITY */

function buildCity() {

  const geometry =
    new THREE.BoxGeometry(
      1,
      1,
      1
    );


  const materials = [

    new THREE.MeshLambertMaterial({
      color: 0x242d3b
    }),

    new THREE.MeshLambertMaterial({
      color: 0x303949
    }),

    new THREE.MeshLambertMaterial({
      color: 0x1d2531
    })

  ];


  for (
    let i = 0;
    i < 34;
    i++
  ) {

    const building =
      new THREE.Mesh(

        geometry,

        materials[
          i %
          materials.length
        ]

      );


    const side =
      i % 2
      ?
      1
      :
      -1;


    building.position.set(

      side *
      (
        24 +
        (
          i %
          7
        )
        *
        4
      ),

      4 +
      (
        i %
        9
      ),

      -100 +
      (
        i *
        17
      )
      %
      190

    );


    building.scale.set(

      5 +
      (
        i %
        4
      ),

      8 +
      (
        i %
        10
      ),

      5 +
      (
        i %
        5
      )

    );


    worldGroup.add(
      building
    );

  }

}


/* CANYON */

function buildCanyon() {

  const geometry =
    new THREE.BoxGeometry(
      1,
      1,
      1
    );


  const material =
    new THREE.MeshLambertMaterial({

      color:
        0x6d472f

    });


  for (
    let i = 0;
    i < 30;
    i++
  ) {

    const angle =
      (
        i /
        30
      )
      *
      Math.PI *
      2;


    const radius =
      70 +
      (
        i %
        7
      )
      *
      7;


    const rock =
      new THREE.Mesh(
        geometry,
        material
      );


    rock.position.set(

      Math.cos(angle)
      *
      radius
      +
      45,

      3,

      Math.sin(angle)
      *
      radius
      -
      40

    );


    rock.scale.set(

      5 +
      (
        i %
        5
      ),

      5 +
      (
        i %
        9
      ),

      6 +
      (
        i %
        6
      )

    );


    rock.rotation.y =
      angle;


    worldGroup.add(
      rock
    );

  }

}


/* ARCTIC */

function buildArctic() {

  const trunkGeometry =
    new THREE.CylinderGeometry(
      0.17,
      0.22,
      2,
      5
    );


  const trunkMaterial =
    new THREE.MeshLambertMaterial({
      color: 0x54473e
    });


  const treeGeometry =
    new THREE.ConeGeometry(
      1.2,
      4,
      6
    );


  const treeMaterial =
    new THREE.MeshLambertMaterial({
      color: 0x668585
    });


  for (
    let i = 0;
    i < 34;
    i++
  ) {

    const angle =
      (
        i /
        34
      )
      *
      Math.PI *
      2;


    const radius =
      57 +
      (
        i %
        7
      )
      *
      7;


    const x =
      Math.cos(angle)
      *
      radius
      +
      38;


    const z =
      Math.sin(angle)
      *
      radius
      -
      40;


    const trunk =
      new THREE.Mesh(

        trunkGeometry,
        trunkMaterial

      );


    trunk.position.set(
      x,
      1,
      z
    );


    const crown =
      new THREE.Mesh(

        treeGeometry,
        treeMaterial

      );


    crown.position.set(
      x,
      4,
      z
    );


    worldGroup.add(
      trunk,
      crown
    );

  }

}


/* =========================================================
   CAR
   ========================================================= */

function makeCar() {

  const group =
    new THREE.Group();


  const bodyMaterial =
    new THREE.MeshLambertMaterial({

      color:
        0xe9eef4

    });


  const glassMaterial =
    new THREE.MeshLambertMaterial({

      color:
        0x151c26

    });


  const wheelMaterial =
    new THREE.MeshLambertMaterial({

      color:
        0x07090d

    });


  const body =
    new THREE.Mesh(

      new THREE.BoxGeometry(

        1.85,
        0.48,
        3.8

      ),

      bodyMaterial

    );


  body.position.y =
    0.62;


  group.add(
    body
  );


  const cabin =
    new THREE.Mesh(

      new THREE.BoxGeometry(

        1.45,
        0.52,
        1.7

      ),

      glassMaterial

    );


  cabin.position.set(
    0,
    1,
    -0.15
  );


  group.add(
    cabin
  );


  const wheelGeometry =
    new THREE.CylinderGeometry(

      0.32,
      0.32,
      0.24,
      10

    );


  for (
    const x
    of [-0.94, 0.94]
  ) {

    for (
      const z
      of [-1.25, 1.25]
    ) {

      const wheel =
        new THREE.Mesh(

          wheelGeometry,
          wheelMaterial

        );


      wheel.rotation.z =
        Math.PI / 2;


      wheel.position.set(

        x,
        0.38,
        z

      );


      group.add(
        wheel
      );

    }

  }


  return group;

}


/* =========================================================
   BUILD TRACK
   ========================================================= */

function buildTrack(
  track
) {

  disposeWorld();


  activeTrack =
    track;


  worldGroup =
    new THREE.Group();


  scene.add(
    worldGroup
  );


  scene.background =
    new THREE.Color(
      track.sky
    );


  scene.fog =
    new THREE.Fog(

      track.fog,

      80,

      240

    );


  buildScenery(
    track
  );


  buildRoad(
    track
  );


  track.checkpoints.forEach(

    (
      checkpoint,
      index
    ) => {

      addCheckpointGate(

        track,

        checkpoint,

        index

      );

    }

  );


  car =
    makeCar();


  worldGroup.add(
    car
  );


  const start =
    pointToVector(
      track.points[0]
    );


  const next =
    pointToVector(
      track.points[1]
    );


  const direction =
    next
      .clone()
      .sub(start);


  car.position.copy(
    start
  );


  /*
    IMPORTANT:
    This makes the car actually face
    the direction of the first road.
  */

  car.rotation.y =
    Math.atan2(

      direction.x,

      direction.z

    );


  carState = {

    speed: 0,

    steer: 0,

    gear: 1,

    rpm: 900,

    nitro: 100

  };


  checkpointStep =
    0;


  lap =
    1;


  wrongWayTimer =
    0;


  updateObjective();

}


/* =========================================================
   DISTANCE FROM ROAD
   ========================================================= */

function nearestRoadDistance(
  position
) {

  let closest =
    Infinity;


  const points =
    activeTrack.points;


  const player =
    new THREE.Vector2(

      position.x,

      position.z

    );


  for (
    let i = 0;
    i < points.length;
    i++
  ) {

    const start =
      new THREE.Vector2(

        points[i][0],

        points[i][1]

      );


    const nextPoint =
      points[

        (
          i +
          1
        )

        %

        points.length

      ];


    const end =
      new THREE.Vector2(

        nextPoint[0],

        nextPoint[1]

      );


    const line =
      end
        .clone()
        .sub(start);


    const lengthSquared =
      line.lengthSq()
      ||
      1;


    const t =
      THREE.MathUtils.clamp(

        player
          .clone()
          .sub(start)
          .dot(line)

        /

        lengthSquared,

        0,

        1

      );


    const point =
      start
        .clone()
        .add(

          line.multiplyScalar(
            t
          )

        );


    closest =
      Math.min(

        closest,

        player.distanceTo(
          point
        )

      );

  }


  return closest;

}


/* =========================================================
   AUDIO - TEMPORARY
   ========================================================= */

let audioContext = null;

let engineOscillator = null;

let engineGain = null;


function initAudio() {

  if (
    audioContext
  ) {

    if (
      audioContext.state ===
      "suspended"
    ) {

      audioContext.resume();

    }

    return;

  }


  audioContext =
    new (

      window.AudioContext
      ||
      window.webkitAudioContext

    )();


  engineOscillator =
    audioContext
      .createOscillator();


  engineGain =
    audioContext
      .createGain();


  engineOscillator.type =
    "sawtooth";


  engineGain.gain.value =
    0.008;


  engineOscillator
    .connect(
      engineGain
    )
    .connect(
      audioContext.destination
    );


  engineOscillator.start();

}


/*
  THIS AUDIO IS STILL TEMPORARY.
  We're replacing it with a much
  better engine system next.
*/

function updateEngineAudio() {

  if (
    !audioContext
    ||
    !carState
  ) {

    return;

  }


  const normalizedRPM =
    carState.rpm /
    7600;


  const frequency =
    45 +
    normalizedRPM *
    100;


  engineOscillator
    .frequency
    .setTargetAtTime(

      frequency,

      audioContext.currentTime,

      0.06

    );

}


/* =========================================================
   AUTOMATIC TRANSMISSION
   ========================================================= */

const gearRatios = [

  0,

  3,

  2.2,

  1.65,

  1.30,

  1.05,

  0.86

];


const shiftUpSpeeds = [

  0,

  22,

  40,

  60,

  82,

  105,

  140

];


const shiftDownSpeeds = [

  0,

  0,

  15,

  31,

  49,

  68,

  88

];


function updateTransmission() {

  const mph =
    Math.abs(
      carState.speed
    )
    *
    2.45;


  let gear =
    carState.gear;


  if (

    gear < 6

    &&

    mph >
    shiftUpSpeeds[
      gear
    ]

  ) {

    gear++;

  }


  else if (

    gear > 1

    &&

    mph <
    shiftDownSpeeds[
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
    THREE.MathUtils.clamp(

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
   CAR PHYSICS
   ========================================================= */

function updateCar(
  delta
) {

  if (
    !raceActive
  ) {

    return;

  }


  const accelerate =

    keys.has("w")

    ||

    keys.has(
      "arrowup"
    );


  const brake =

    keys.has("s")

    ||

    keys.has(
      "arrowdown"
    );


  const left =

    keys.has("a")

    ||

    keys.has(
      "arrowleft"
    );


  const right =

    keys.has("d")

    ||

    keys.has(
      "arrowright"
    );


  const handbrake =
    keys.has(" ");


  const nitroActive =

    (
      keys.has("shift")

      ||

      keys.has(
        "shiftleft"
      )
    )

    &&

    carState.nitro > 0;


  const roadDistance =
    nearestRoadDistance(
      car.position
    );


  const onRoad =

    roadDistance <

    ROAD_HALF +
    1.5;


  /*
    ACCELERATION
  */

  if (
    accelerate
  ) {

    carState.speed +=

      (
        onRoad
        ?
        20
        :
        8
      )

      *

      delta;

  }

  else {

    carState.speed *=
      Math.pow(

        0.985,

        delta *
        60

      );

  }


  /*
    BRAKING / REVERSE
  */

  if (
    brake
  ) {

    if (
      carState.speed >
      2
    ) {

      carState.speed -=
        34 *
        delta;

    }

    else {

      carState.speed -=
        12 *
        delta;

    }

  }


  /*
    OFF ROAD
  */

  if (
    !onRoad
  ) {

    carState.speed *=
      Math.pow(

        0.95,

        delta *
        60

      );

  }


  /*
    NITRO
  */

  if (

    nitroActive

    &&

    carState.speed > 4

  ) {

    carState.nitro =
      Math.max(

        0,

        carState.nitro -
        25 *
        delta

      );


    carState.speed +=
      26 *
      delta;

  }

  else {

    carState.nitro =
      Math.min(

        100,

        carState.nitro +
        4 *
        delta

      );

  }


  const maximumSpeed =

    nitroActive
    ?
    60
    :
    49;


  carState.speed =
    THREE.MathUtils.clamp(

      carState.speed,

      -12,

      maximumSpeed

    );


  /*
    STEERING
  */

  const steeringInput =

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

      steeringInput,

      handbrake
      ?
      0.2
      :
      0.13

    );


  const speedFactor =
    THREE.MathUtils.clamp(

      Math.abs(
        carState.speed
      )

      /

      12,

      0,

      1

    );


  let turnRate =

    1.35 *

    activeTrack.grip;


  if (
    handbrake
  ) {

    turnRate *=
      1.7;

  }


  const reverseDirection =

    carState.speed >= 0
    ?
    1
    :
    -1;


  car.rotation.y +=

    carState.steer

    *

    turnRate

    *

    speedFactor

    *

    delta

    *

    reverseDirection;


  /*
    MOVE FORWARD
  */

  const forward =
    forwardVector();


  car.position
    .addScaledVector(

      forward,

      carState.speed *
      delta

    );


  updateTransmission();

  updateEngineAudio();

  updateCheckpoints();

  updateNavigation(
    delta
  );

}


/* =========================================================
   CHECKPOINT HELPERS
   ========================================================= */

function getNextCheckpoint() {

  const pointIndex =

    activeTrack.checkpoints[
      checkpointStep
    ];


  const point =

    activeTrack.points[
      pointIndex
    ];


  return {

    pointIndex,

    point,

    position:
      pointToVector(
        point
      )

  };

}


/* =========================================================
   CHECKPOINT POPUP
   ========================================================= */

function showCheckpointMessage() {

  checkpointPopup
    .classList
    .remove(
      "hidden"
    );


  clearTimeout(
    checkpointPopupTimer
  );


  checkpointPopupTimer =
    setTimeout(

      () => {

        checkpointPopup
          .classList
          .add(
            "hidden"
          );

      },

      650

    );

}


/* =========================================================
   CHECKPOINT DETECTION
   ========================================================= */

function updateCheckpoints() {

  const target =
    getNextCheckpoint();


  const distance =
    car.position
      .clone()
      .setY(0)
      .distanceTo(
        target.position
      );


  if (
    distance >
    7
  ) {

    return;

  }


  showCheckpointMessage();


  checkpointStep++;


  if (

    checkpointStep >=

    activeTrack
      .checkpoints
      .length

  ) {

    checkpointStep =
      0;


    lap++;


    if (
      lap >
      targetLaps
    ) {

      finishRace();

      return;

    }

  }


  updateObjective();

}


/* =========================================================
   OBJECTIVE UI
   ========================================================= */

function updateObjective() {

  objectiveEl.textContent =

    `LAP ${
      Math.min(
        lap,
        targetLaps
      )
    } / ${targetLaps}`;


  checkpointText.textContent =

    `CHECKPOINT ${
      checkpointStep + 1
    } / ${
      activeTrack
        .checkpoints
        .length
    }`;

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
    !activeTrack
  ) {

    return;

  }


  const checkpoint =
    getNextCheckpoint();


  const vectorToTarget =
    checkpoint.position
      .clone()
      .sub(
        car.position
      );


  vectorToTarget.y =
    0;


  const distance =
    vectorToTarget.length();


  checkpointDistance.textContent =

    `${Math.round(
      distance
    )}m`;


  if (
    distance <
    0.01
  ) {

    return;

  }


  vectorToTarget.normalize();


  const forward =
    forwardVector();


  const right =
    new THREE.Vector3(

      forward.z,

      0,

      -forward.x

    );


  const forwardDot =
    forward.dot(
      vectorToTarget
    );


  const rightDot =
    right.dot(
      vectorToTarget
    );


  const angle =
    Math.atan2(

      rightDot,

      forwardDot

    );


  const degrees =
    THREE.MathUtils.radToDeg(
      angle
    );


  /*
    Rotate arrow.
  */

  directionArrow.style.transform =

    `rotate(${
      THREE.MathUtils.clamp(
        degrees,
        -110,
        110
      )
    }deg)`;


  const absoluteAngle =
    Math.abs(
      degrees
    );


  if (
    absoluteAngle <
    18
  ) {

    navigationText.textContent =
      "STRAIGHT";

  }


  else if (
    absoluteAngle <
    60
  ) {

    navigationText.textContent =

      degrees > 0
      ?
      "TURN RIGHT"
      :
      "TURN LEFT";

  }


  else {

    navigationText.textContent =

      degrees > 0
      ?
      "HARD RIGHT"
      :
      "HARD LEFT";

  }


  /*
    WRONG WAY
  */

  if (

    forwardDot <
    -0.35

    &&

    Math.abs(
      carState.speed
    )
    >
    5

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


  wrongWay
    .classList
    .toggle(

      "hidden",

      wrongWayTimer <
      0.9

    );

}


/* =========================================================
   MINIMAP
   ========================================================= */

function getTrackBounds(
  track
) {

  let minX =
    Infinity;

  let maxX =
    -Infinity;

  let minZ =
    Infinity;

  let maxZ =
    -Infinity;


  track.points.forEach(

    point => {

      minX =
        Math.min(
          minX,
          point[0]
        );


      maxX =
        Math.max(
          maxX,
          point[0]
        );


      minZ =
        Math.min(
          minZ,
          point[1]
        );


      maxZ =
        Math.max(
          maxZ,
          point[1]
        );

    }

  );


  return {

    minX,
    maxX,
    minZ,
    maxZ

  };

}


function drawMinimap() {

  if (
    !activeTrack
    ||
    !car
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
    getTrackBounds(
      activeTrack
    );


  const padding =
    18;


  const mapWidth =

    bounds.maxX -
    bounds.minX;


  const mapHeight =

    bounds.maxZ -
    bounds.minZ;


  const scale =
    Math.min(

      (
        width -
        padding *
        2
      )

      /

      mapWidth,


      (
        height -
        padding *
        2
      )

      /

      mapHeight

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


  /*
    TRACK LINE
  */

  mapCtx.strokeStyle =
    "rgba(255,255,255,.35)";


  mapCtx.lineWidth =
    5;


  mapCtx.lineJoin =
    "round";


  mapCtx.lineCap =
    "round";


  mapCtx.beginPath();


  activeTrack.points.forEach(

    (
      point,
      index
    ) => {

      const mapped =
        mapPoint(

          point[0],

          point[1]

        );


      if (
        index === 0
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

      activeTrack
        .points[0][0],

      activeTrack
        .points[0][1]

    );


  mapCtx.lineTo(

    first.x,

    first.y

  );


  mapCtx.stroke();


  /*
    CHECKPOINT DOTS
  */

  activeTrack
    .checkpoints
    .forEach(

      (
        checkpoint,
        index
      ) => {

        const point =

          activeTrack.points[
            checkpoint
          ];


        const mapped =

          mapPoint(

            point[0],

            point[1]

          );


        mapCtx.fillStyle =

          index ===
          checkpointStep

          ?

          "#ffffff"

          :

          "rgba(255,255,255,.25)";


        mapCtx.beginPath();


        mapCtx.arc(

          mapped.x,

          mapped.y,

          index ===
          checkpointStep

          ?

          4.5

          :

          2.5,

          0,

          Math.PI *
          2

        );


        mapCtx.fill();

      }

    );


  /*
    PLAYER
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
    car.rotation.y
  );


  mapCtx.fillStyle =
    "#72a7ff";


  mapCtx.beginPath();


  mapCtx.moveTo(
    0,
    7
  );


  mapCtx.lineTo(
    -5,
    -6
  );


  mapCtx.lineTo(
    5,
    -6
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


  const forward =
    forwardVector();


  /*
    Camera sits behind the car.
  */

  const desired =
    car.position
      .clone()
      .add(
        new THREE.Vector3(
          0,
          3.2,
          0
        )
      )
      .addScaledVector(

        forward,

        -7.4

      );


  const smoothing =

    1

    -

    Math.pow(

      0.0007,

      delta

    );


  camera.position.lerp(

    desired,

    smoothing

  );


  const lookAt =
    car.position
      .clone()
      .add(
        new THREE.Vector3(
          0,
          0.8,
          0
        )
      )
      .addScaledVector(

        forward,

        5

      );


  camera.lookAt(
    lookAt
  );

}


/* =========================================================
   HUD
   ========================================================= */

function updateHUD() {

  if (
    !carState
  ) {

    return;

  }


  const mph =
    Math.round(

      Math.abs(
        carState.speed
      )

      *

      2.45

    );


  speedEl.textContent =
    mph;


  gearEl.textContent =

    carState.speed <
    -1

    ?

    "R"

    :

    carState.gear;


  rpmBar.style.width =

    `${
      THREE.MathUtils.clamp(

        carState.rpm /
        7600,

        0,

        1

      )

      *

      100
    }%`;


  nitroBar.style.width =

    `${carState.nitro}%`;


  nitroPercent.textContent =

    `${Math.round(
      carState.nitro
    )}%`;

}


/* =========================================================
   COUNTDOWN
   ========================================================= */

async function runCountdown() {

  countdown
    .classList
    .remove(
      "hidden"
    );


  const sequence = [

    "3",

    "2",

    "1",

    "GO"

  ];


  for (
    const value
    of sequence
  ) {

    countdown.textContent =
      value;


    await new Promise(

      resolve => {

        setTimeout(

          resolve,

          value === "GO"
          ?
          550
          :
          700

        );

      }

    );

  }


  countdown
    .classList
    .add(
      "hidden"
    );


  raceActive =
    true;

}


/* =========================================================
   START RACE
   ========================================================= */

function startRace() {

  initAudio();


  const track =

    tracks[
      trackSelect.value
    ];


  buildTrack(
    track
  );


  trackNameEl.textContent =
    track.name;


  menu
    .classList
    .add(
      "hidden"
    );


  hud
    .classList
    .remove(
      "hidden"
    );


  message
    .classList
    .add(
      "hidden"
    );


  raceActive =
    false;


  runCountdown();

}


/* =========================================================
   FINISH RACE
   ========================================================= */

function finishRace() {

  raceActive =
    false;


  message.textContent =
    "FINISH";


  message
    .classList
    .remove(
      "hidden"
    );


  setTimeout(

    () => {

      message
        .classList
        .add(
          "hidden"
        );


      hud
        .classList
        .add(
          "hidden"
        );


      menu
        .classList
        .remove(
          "hidden"
        );

    },

    2200

  );

}


/* =========================================================
   TRACK DESCRIPTION
   ========================================================= */

function updateTrackDescription() {

  const track =

    tracks[
      trackSelect.value
    ];


  trackDescription.textContent =
    track.description;

}


trackSelect.addEventListener(

  "change",

  updateTrackDescription

);


updateTrackDescription();


startBtn.addEventListener(

  "click",

  startRace

);


/* =========================================================
   KEYBOARD INPUT
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
      ]
      .includes(
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
   FPS / DYNAMIC RESOLUTION
   ========================================================= */

function updateFPS(
  now
) {

  fpsFrames++;


  if (

    now -
    lastFpsTime

    <

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


  /*
    Weak Chromebook:
    lower internal resolution automatically.
  */

  if (

    fps <
    35

    &&

    quality.renderScale >
    0.5

  ) {

    quality.renderScale =
      Math.max(

        0.5,

        quality.renderScale -
        0.08

      );


    resizeRenderer();

  }


  /*
    Raise quality again only when
    performance is comfortably high.
  */

  else if (

    fps >
    56

    &&

    quality.renderScale <
    0.86

  ) {

    quality.renderScale =
      Math.min(

        0.86,

        quality.renderScale +
        0.04

      );


    resizeRenderer();

  }


  fpsFrames =
    0;


  lastFpsTime =
    now;

}


/* =========================================================
   MAIN LOOP
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


  updateCar(
    delta
  );


  updateCamera(
    delta
  );


  updateHUD();


  drawMinimap();


  updateFPS(
    now
  );


  renderer.render(

    scene,

    camera

  );

}


/* =========================================================
   INITIAL BACKGROUND
   ========================================================= */

buildTrack(
  tracks.neon
);


requestAnimationFrame(
  gameLoop
);
