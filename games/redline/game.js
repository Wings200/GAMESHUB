import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

const canvas = document.getElementById("gameCanvas");
const menu = document.getElementById("menu");
const hud = document.getElementById("hud");

const startBtn = document.getElementById("startBtn");
const trackSelect = document.getElementById("trackSelect");
const trackDescription = document.getElementById("trackDescription");

const trackNameEl = document.getElementById("trackName");
const objectiveEl = document.getElementById("objective");
const checkpointText = document.getElementById("checkpointText");

const directionArrow = document.getElementById("directionArrow");
const navigationText = document.getElementById("navigationText");
const checkpointDistance = document.getElementById("checkpointDistance");
const wrongWay = document.getElementById("wrongWay");

const minimap = document.getElementById("minimap");
const mapCtx = minimap.getContext("2d");

const speedEl = document.getElementById("speed");
const gearEl = document.getElementById("gear");
const rpmBar = document.getElementById("rpmBar");
const nitroBar = document.getElementById("nitroBar");
const nitroPercent = document.getElementById("nitroPercent");

const fpsEl = document.getElementById("fps");

const countdown = document.getElementById("countdown");
const checkpointPopup = document.getElementById("checkpointPopup");
const message = document.getElementById("message");


/* =========================
   THREE.JS
========================= */

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
    360
  );


scene.add(
  new THREE.HemisphereLight(
    0xffffff,
    0x263040,
    1.65
  )
);


const sunlight =
  new THREE.DirectionalLight(
    0xffffff,
    1.15
  );

sunlight.position.set(
  30,
  50,
  20
);

scene.add(sunlight);


const clock =
  new THREE.Clock();

const keys =
  new Set();


const ROAD_HALF = 7;

const CAR_HALF_WIDTH = 1.05;

const TARGET_LAPS = 3;


const quality = {
  renderScale: 0.72
};


let fpsFrames = 0;

let lastFpsTime =
  performance.now();


let worldGroup = null;

let car = null;

let carState = null;

let activeTrack = null;

let raceActive = false;

let checkpointStep = 0;

let lap = 1;

let wrongWayTimer = 0;

let checkpointPopupTimer = null;


let obstacles = [];

let boostPads = [];

let pickups = [];

let ramps = [];


/* =========================
   TRACKS
========================= */

const tracks = {

  neon: {

    name:
      "NEON DISTRICT",

    description:
      "Night street circuit with guardrails, roadblocks, boost lanes and a city jump.",

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

    guardrail:
      0x596579,

    grip:
      1.0,

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

    ],

    boosts: [

      {
        segment: 1,
        t: 0.42,
        offset: -1.8
      },

      {
        segment: 6,
        t: 0.58,
        offset: 1.6
      }

    ],

    pickups: [

      {
        type: "nitro",
        segment: 3,
        t: 0.48,
        offset: 2.4
      },

      {
        type: "overdrive",
        segment: 9,
        t: 0.5,
        offset: -2.2
      }

    ],

    obstacles: [

      {
        kind: "roadblock",
        segment: 2,
        t: 0.42,
        offset: 2.4,
        radius: 1.35
      },

      {
        kind: "crate",
        segment: 5,
        t: 0.44,
        offset: -2.2,
        radius: 1.2
      },

      {
        kind: "roadblock",
        segment: 10,
        t: 0.52,
        offset: 2.1,
        radius: 1.35
      }

    ],

    ramps: [

      {
        segment: 8,
        t: 0.5,
        offset: 0
      }

    ]

  },


  canyon: {

    name:
      "DUSTFALL CANYON",

    description:
      "Desert circuit with rock hazards, boost pads and a canyon jump.",

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

    guardrail:
      0x8f6c50,

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

    ],

    boosts: [

      {
        segment: 0,
        t: 0.62,
        offset: 0
      },

      {
        segment: 7,
        t: 0.48,
        offset: -1.5
      }

    ],

    pickups: [

      {
        type: "overdrive",
        segment: 4,
        t: 0.55,
        offset: 2.3
      },

      {
        type: "nitro",
        segment: 10,
        t: 0.45,
        offset: -2.3
      }

    ],

    obstacles: [

      {
        kind: "rock",
        segment: 2,
        t: 0.63,
        offset: -2.1,
        radius: 1.5
      },

      {
        kind: "rock",
        segment: 5,
        t: 0.35,
        offset: 2.4,
        radius: 1.45
      },

      {
        kind: "crate",
        segment: 9,
        t: 0.48,
        offset: 2.0,
        radius: 1.2
      }

    ],

    ramps: [

      {
        segment: 6,
        t: 0.54,
        offset: 0
      }

    ]

  },


  arctic: {

    name:
      "ARCTIC RELAY",

    description:
      "Low-grip ice circuit with frozen hazards, energy pickups and an ice jump.",

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

    guardrail:
      0x91b4bd,

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

    ],

    boosts: [

      {
        segment: 2,
        t: 0.48,
        offset: 1.7
      },

      {
        segment: 8,
        t: 0.58,
        offset: -1.8
      }

    ],

    pickups: [

      {
        type: "nitro",
        segment: 5,
        t: 0.45,
        offset: -2.2
      },

      {
        type: "overdrive",
        segment: 10,
        t: 0.52,
        offset: 2.1
      }

    ],

    obstacles: [

      {
        kind: "ice",
        segment: 1,
        t: 0.56,
        offset: 2.2,
        radius: 1.35
      },

      {
        kind: "ice",
        segment: 6,
        t: 0.45,
        offset: -2.4,
        radius: 1.35
      },

      {
        kind: "roadblock",
        segment: 9,
        t: 0.46,
        offset: 2.0,
        radius: 1.35
      }

    ],

    ramps: [

      {
        segment: 4,
        t: 0.48,
        offset: 0
      }

    ]

  }

};


/* =========================
   SCREEN SIZE
========================= */

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


/* =========================
   HELPERS
========================= */

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


function rightVector() {

  const forward =
    forwardVector();


  return new THREE.Vector3(

    forward.z,

    0,

    -forward.x

  );

}


function segmentInfo(
  track,
  segmentIndex,
  t = 0.5,
  offset = 0,
  y = 0
) {

  const a =
    pointToVector(
      track.points[
        segmentIndex
      ]
    );


  const b =
    pointToVector(

      track.points[

        (
          segmentIndex +
          1
        )

        %

        track.points.length

      ]

    );


  const tangent =
    b
      .clone()
      .sub(a)
      .normalize();


  const normal =
    new THREE.Vector3(

      -tangent.z,

      0,

      tangent.x

    );


  const position =
    a
      .clone()
      .lerp(
        b,
        t
      )
      .addScaledVector(
        normal,
        offset
      );


  position.y =
    y;


  return {

    position,

    tangent,

    normal,

    rotationY:
      Math.atan2(
        tangent.x,
        tangent.z
      )

  };

}


/* =========================
   CLEAN OLD WORLD
========================= */

function disposeWorld() {

  if (
    !worldGroup
  ) {

    return;

  }


  worldGroup.traverse(

    object => {

      object.geometry
        ?.dispose?.();


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


        materials.forEach(

          material =>
            material
              .dispose?.()

        );

      }

    }

  );


  scene.remove(
    worldGroup
  );


  worldGroup = null;

}


/* =========================
   ROAD
========================= */

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


  buildCenterLines(
    track
  );


  buildGuardrails(
    track
  );

}


/* =========================
   ROAD LINES
========================= */

function buildCenterLines(
  track
) {

  const placements =
    [];


  for (
    let i = 0;
    i < track.points.length;
    i++
  ) {

    const a =
      pointToVector(
        track.points[i]
      );


    const b =
      pointToVector(

        track.points[

          (
            i +
            1
          )

          %

          track.points.length

        ]

      );


    const direction =
      b
        .clone()
        .sub(a);


    const length =
      direction.length();


    const tangent =
      direction
        .clone()
        .normalize();


    const rotationY =
      Math.atan2(

        tangent.x,

        tangent.z

      );


    for (

      let distance = 5;

      distance <
      length - 2;

      distance += 7

    ) {

      placements.push({

        position:

          a
            .clone()
            .addScaledVector(

              tangent,

              distance

            )
            .setY(
              0.065
            ),

        rotationY

      });

    }

  }


  const mesh =
    new THREE.InstancedMesh(

      new THREE.BoxGeometry(
        0.12,
        0.025,
        2.5
      ),

      new THREE.MeshBasicMaterial({
        color: 0xcbd0d8
      }),

      placements.length

    );


  const dummy =
    new THREE.Object3D();


  placements.forEach(

    (
      item,
      index
    ) => {

      dummy.position.copy(
        item.position
      );


      dummy.rotation.set(

        0,

        item.rotationY,

        0

      );


      dummy.updateMatrix();


      mesh.setMatrixAt(

        index,

        dummy.matrix

      );

    }

  );


  worldGroup.add(
    mesh
  );

}


/* =========================
   GUARDRAILS
========================= */

function buildGuardrails(
  track
) {

  const placements =
    [];


  for (
    let i = 0;
    i < track.points.length;
    i++
  ) {

    const a =
      pointToVector(
        track.points[i]
      );


    const b =
      pointToVector(

        track.points[

          (
            i +
            1
          )

          %

          track.points.length

        ]

      );


    const direction =
      b
        .clone()
        .sub(a);


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


    const rotationY =
      Math.atan2(

        tangent.x,

        tangent.z

      );


    for (

      let distance = 3;

      distance <
      length - 1;

      distance += 5.2

    ) {

      const center =
        a
          .clone()
          .addScaledVector(

            tangent,

            distance

          );


      for (
        const side
        of [-1, 1]
      ) {

        placements.push({

          position:

            center
              .clone()
              .addScaledVector(

                normal,

                side *

                (
                  ROAD_HALF +
                  0.18
                )

              )
              .setY(
                0.38
              ),

          rotationY

        });

      }

    }

  }


  const mesh =
    new THREE.InstancedMesh(

      new THREE.BoxGeometry(

        0.18,

        0.66,

        4.75

      ),

      new THREE.MeshLambertMaterial({

        color:
          track.guardrail

      }),

      placements.length

    );


  const dummy =
    new THREE.Object3D();


  placements.forEach(

    (
      item,
      index
    ) => {

      dummy.position.copy(
        item.position
      );


      dummy.rotation.set(

        0,

        item.rotationY,

        0

      );


      dummy.updateMatrix();


      mesh.setMatrixAt(

        index,

        dummy.matrix

      );

    }

  );


  worldGroup.add(
    mesh
  );

}


/* =========================
   CHECKPOINT GATES
========================= */

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


  const material =
    new THREE.MeshBasicMaterial({

      color:

        gateNumber === 0

        ?

        0x72a7ff

        :

        0xffffff

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


  const topBeam =
    new THREE.Mesh(

      new THREE.BoxGeometry(

        ROAD_HALF *
        2 -
        1,

        0.35,

        0.35

      ),

      material

    );


  topBeam.position.y =
    4.4;


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


/* =========================
   SCENERY
========================= */

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


function buildCanyon() {

  const geometry =
    new THREE.BoxGeometry(
      1,
      1,
      1
    );


  const material =
    new THREE.MeshLambertMaterial({
      color: 0x6d472f
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


/* =========================
   BOOST PADS
========================= */

function buildBoostPads(
  track
) {

  boostPads =
    [];


  const geometry =
    new THREE.BoxGeometry(

      3.6,

      0.06,

      5.2

    );


  const material =
    new THREE.MeshBasicMaterial({

      color:
        0x36a7ff

    });


  track.boosts.forEach(

    definition => {

      const info =
        segmentInfo(

          track,

          definition.segment,

          definition.t,

          definition.offset,

          0.075

        );


      const mesh =
        new THREE.Mesh(

          geometry,

          material

        );


      mesh.position.copy(
        info.position
      );


      mesh.rotation.y =
        info.rotationY;


      worldGroup.add(
        mesh
      );


      boostPads.push({

        mesh,

        position:
          info.position.clone(),

        cooldown: 0

      });

    }

  );

}


/* =========================
   POWERUPS
========================= */

function createPickupMesh(
  type
) {

  if (
    type ===
    "overdrive"
  ) {

    return new THREE.Mesh(

      new THREE.OctahedronGeometry(
        0.72,
        0
      ),

      new THREE.MeshBasicMaterial({
        color: 0xff8c35
      })

    );

  }


  return new THREE.Mesh(

    new THREE.OctahedronGeometry(
      0.68,
      0
    ),

    new THREE.MeshBasicMaterial({
      color: 0x58c6ff
    })

  );

}


function buildPickups(
  track
) {

  pickups =
    [];


  track.pickups.forEach(

    definition => {

      const info =
        segmentInfo(

          track,

          definition.segment,

          definition.t,

          definition.offset,

          1.15

        );


      const mesh =
        createPickupMesh(
          definition.type
        );


      mesh.position.copy(
        info.position
      );


      worldGroup.add(
        mesh
      );


      pickups.push({

        type:
          definition.type,

        mesh,

        position:
          info.position.clone(),

        active:
          true,

        respawn:
          0,

        spin:
          Math.random()
          *
          Math.PI
          *
          2

      });

    }

  );

}


/* =========================
   OBSTACLES
========================= */

function buildObstacles(
  track
) {

  obstacles =
    [];


  track.obstacles.forEach(

    definition => {

      const info =
        segmentInfo(

          track,

          definition.segment,

          definition.t,

          definition.offset,

          0

        );


      let mesh;


      if (
        definition.kind ===
        "rock"
      ) {

        mesh =
          new THREE.Mesh(

            new THREE.DodecahedronGeometry(
              1.25,
              0
            ),

            new THREE.MeshLambertMaterial({
              color: 0x67452f
            })

          );


        mesh.scale.set(

          1.25,

          0.95,

          1.05

        );


        mesh.position.y =
          0.95;

      }


      else if (
        definition.kind ===
        "ice"
      ) {

        mesh =
          new THREE.Mesh(

            new THREE.DodecahedronGeometry(
              1.1,
              0
            ),

            new THREE.MeshLambertMaterial({
              color: 0xbfe8ef
            })

          );


        mesh.scale.set(

          1.2,

          1,

          1

        );


        mesh.position.y =
          1;

      }


      else if (
        definition.kind ===
        "crate"
      ) {

        mesh =
          new THREE.Mesh(

            new THREE.BoxGeometry(
              1.7,
              1.7,
              1.7
            ),

            new THREE.MeshLambertMaterial({
              color: 0x7b5638
            })

          );


        mesh.position.y =
          0.85;

      }


      else {

        mesh =
          new THREE.Mesh(

            new THREE.BoxGeometry(
              2.5,
              1.1,
              0.7
            ),

            new THREE.MeshLambertMaterial({
              color: 0xd7dbe2
            })

          );


        mesh.rotation.y =
          info.rotationY;


        mesh.position.y =
          0.55;

      }


      mesh.position.x +=
        info.position.x;


      mesh.position.z +=
        info.position.z;


      worldGroup.add(
        mesh
      );


      obstacles.push({

        mesh,

        position:

          new THREE.Vector3(

            info.position.x,

            0,

            info.position.z

          ),

        radius:
          definition.radius

      });

    }

  );

}


/* =========================
   RAMPS
========================= */

function createRampGeometry() {

  const w =
    3.8;

  const l =
    5.5;

  const h =
    1.25;


  const hw =
    w / 2;

  const hl =
    l / 2;


  const vertices =
    new Float32Array([

      -hw, 0, -hl,
       hw, 0, -hl,
      -hw, h,  hl,

       hw, 0, -hl,
       hw, h,  hl,
      -hw, h,  hl,


      -hw, 0, -hl,
      -hw, 0,  hl,
      -hw, h,  hl,


       hw, 0, -hl,
       hw, h,  hl,
       hw, 0,  hl,


      -hw, 0, hl,
       hw, 0, hl,
      -hw, h, hl,


       hw, 0, hl,
       hw, h, hl,
      -hw, h, hl

    ]);


  const geometry =
    new THREE.BufferGeometry();


  geometry.setAttribute(

    "position",

    new THREE.BufferAttribute(

      vertices,

      3

    )

  );


  geometry.computeVertexNormals();


  return geometry;

}


function buildRamps(
  track
) {

  ramps =
    [];


  const geometry =
    createRampGeometry();


  const material =
    new THREE.MeshLambertMaterial({
      color: 0x6e7683
    });


  track.ramps.forEach(

    definition => {

      const info =
        segmentInfo(

          track,

          definition.segment,

          definition.t,

          definition.offset,

          0.04

        );


      const mesh =
        new THREE.Mesh(

          geometry,

          material

        );


      mesh.position.copy(
        info.position
      );


      mesh.rotation.y =
        info.rotationY;


      worldGroup.add(
        mesh
      );


      ramps.push({

        mesh,

        position:
          info.position.clone(),

        cooldown:
          0

      });

    }

  );

}


/* =========================
   CAR
========================= */

function makeCar() {

  const group =
    new THREE.Group();


  const bodyMaterial =
    new THREE.MeshLambertMaterial({
      color: 0xe9eef4
    });


  const glassMaterial =
    new THREE.MeshLambertMaterial({
      color: 0x151c26
    });


  const wheelMaterial =
    new THREE.MeshLambertMaterial({
      color: 0x07090d
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


/* =========================
   BUILD TRACK
========================= */

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


  buildBoostPads(
    track
  );


  buildPickups(
    track
  );


  buildObstacles(
    track
  );


  buildRamps(
    track
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

    nitro: 100,

    boostTimer: 0,

    overdriveTimer: 0,

    verticalVelocity: 0,

    airborne: false,

    impactCooldown: 0,

    rampCooldown: 0

  };


  checkpointStep =
    0;


  lap =
    1;


  wrongWayTimer =
    0;


  updateObjective();

}


/* =========================
   ROAD POSITION
========================= */

function nearestRoadInfo(
  position
) {

  let best =
    null;


  const player =
    new THREE.Vector2(

      position.x,

      position.z

    );


  for (
    let i = 0;
    i < activeTrack.points.length;
    i++
  ) {

    const p1 =
      activeTrack.points[i];


    const p2 =
      activeTrack.points[

        (
          i +
          1
        )

        %

        activeTrack.points.length

      ];


    const a =
      new THREE.Vector2(

        p1[0],

        p1[1]

      );


    const b =
      new THREE.Vector2(

        p2[0],

        p2[1]

      );


    const ab =
      b
        .clone()
        .sub(a);


    const lengthSquared =
      ab.lengthSq()
      ||
      1;


    const t =
      THREE.MathUtils.clamp(

        player
          .clone()
          .sub(a)
          .dot(ab)

        /

        lengthSquared,

        0,

        1

      );


    const closest =
      a
        .clone()
        .add(

          ab
            .clone()
            .multiplyScalar(
              t
            )

        );


    const distance =
      player.distanceTo(
        closest
      );


    if (
      !best
      ||
      distance <
      best.distance
    ) {

      const tangent =
        b
          .clone()
          .sub(a)
          .normalize();


      const normal =
        new THREE.Vector2(

          -tangent.y,

          tangent.x

        );


      const delta =
        player
          .clone()
          .sub(
            closest
          );


      best = {

        distance,

        closest:

          new THREE.Vector3(

            closest.x,

            0,

            closest.y

          ),

        tangent:

          new THREE.Vector3(

            tangent.x,

            0,

            tangent.y

          ),

        normal:

          new THREE.Vector3(

            normal.x,

            0,

            normal.y

          ),

        signedDistance:

          delta.dot(
            normal
          ),

        segmentIndex:
          i

      };

    }

  }


  return best;

}


/* =========================
   POPUP
========================= */

function showRacePopup(
  text,
  duration = 700
) {

  checkpointPopup.textContent =
    text;


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


        checkpointPopup.textContent =
          "CHECKPOINT";

      },

      duration

    );

}


/* =========================
   GUARDRAIL COLLISION
========================= */

function handleGuardrailCollision() {

  if (

    carState.airborne

    &&

    car.position.y >
    0.7

  ) {

    return;

  }


  const road =
    nearestRoadInfo(
      car.position
    );


  const maxDistance =

    ROAD_HALF -

    CAR_HALF_WIDTH;


  if (
    road.distance <=
    maxDistance
  ) {

    return;

  }


  const side =

    road.signedDistance >= 0

    ?

    1

    :

    -1;


  const corrected =
    road.closest
      .clone()
      .addScaledVector(

        road.normal,

        side *
        maxDistance

      );


  car.position.x =
    corrected.x;


  car.position.z =
    corrected.z;


  if (

    carState.impactCooldown <= 0

    &&

    Math.abs(
      carState.speed
    )
    >
    9

  ) {

    showRacePopup(

      "GUARDRAIL HIT",

      480

    );


    carState.impactCooldown =
      0.45;

  }


  carState.speed *=
    0.64;


  carState.steer *=
    -0.25;

}


/* =========================
   OBSTACLE COLLISION
========================= */

function handleObstacleCollisions() {

  if (

    carState.airborne

    &&

    car.position.y >
    1.25

  ) {

    return;

  }


  for (
    const obstacle
    of obstacles
  ) {

    const dx =

      car.position.x -

      obstacle.position.x;


    const dz =

      car.position.z -

      obstacle.position.z;


    const distance =
      Math.hypot(
        dx,
        dz
      );


    const minimum =

      obstacle.radius +

      0.85;


    if (
      distance <
      minimum
    ) {

      const safeDistance =
        Math.max(
          distance,
          0.001
        );


      car.position.x =

        obstacle.position.x

        +

        (
          dx /
          safeDistance
        )

        *

        minimum;


      car.position.z =

        obstacle.position.z

        +

        (
          dz /
          safeDistance
        )

        *

        minimum;


      if (

        carState.impactCooldown <= 0

        &&

        Math.abs(
          carState.speed
        )
        >
        7

      ) {

        showRacePopup(

          "CRASH",

          500

        );


        carState.impactCooldown =
          0.55;

      }


      carState.speed *=
        0.28;


      break;

    }

  }

}


/* =========================
   BOOST PADS
========================= */

function updateBoostPads(
  delta
) {

  for (
    const pad
    of boostPads
  ) {

    pad.cooldown =
      Math.max(

        0,

        pad.cooldown -
        delta

      );


    const distance =
      Math.hypot(

        car.position.x -
        pad.position.x,

        car.position.z -
        pad.position.z

      );


    if (

      distance <
      2.7

      &&

      pad.cooldown <= 0

    ) {

      carState.boostTimer =
        Math.max(

          carState.boostTimer,

          1.35

        );


      carState.speed =
        Math.max(

          carState.speed,

          30

        );


      pad.cooldown =
        1.2;


      showRacePopup(

        "BOOST PAD",

        520

      );

    }

  }

}


/* =========================
   PICKUPS
========================= */

function updatePickups(
  delta
) {

  for (
    const pickup
    of pickups
  ) {

    if (
      !pickup.active
    ) {

      pickup.respawn -=
        delta;


      if (
        pickup.respawn <= 0
      ) {

        pickup.active =
          true;


        pickup.mesh.visible =
          true;

      }


      continue;

    }


    pickup.spin +=
      delta *
      1.8;


    pickup.mesh.rotation.y =
      pickup.spin;


    pickup.mesh.position.y =

      pickup.position.y

      +

      Math.sin(

        performance.now()
        *
        0.003

        +

        pickup.spin

      )

      *

      0.18;


    const distance =
      Math.hypot(

        car.position.x -
        pickup.position.x,

        car.position.z -
        pickup.position.z

      );


    if (
      distance <
      2.1
    ) {

      pickup.active =
        false;


      pickup.mesh.visible =
        false;


      pickup.respawn =
        8;


      if (
        pickup.type ===
        "overdrive"
      ) {

        carState.overdriveTimer =
          Math.max(

            carState.overdriveTimer,

            3.2

          );


        showRacePopup(

          "OVERDRIVE",

          650

        );

      }


      else {

        carState.nitro =
          Math.min(

            100,

            carState.nitro +
            45

          );


        showRacePopup(

          "NITRO +45",

          650

        );

      }

    }

  }

}


/* =========================
   RAMPS / JUMPING
========================= */

function updateRamps(
  delta
) {

  carState.rampCooldown =
    Math.max(

      0,

      carState.rampCooldown -
      delta

    );


  if (

    !carState.airborne

    &&

    carState.rampCooldown <= 0

  ) {

    for (
      const ramp
      of ramps
    ) {

      const distance =
        Math.hypot(

          car.position.x -
          ramp.position.x,

          car.position.z -
          ramp.position.z

        );


      if (

        distance <
        2.8

        &&

        carState.speed >
        12

      ) {

        carState.airborne =
          true;


        carState.verticalVelocity =

          8.5

          +

          Math.min(

            3.5,

            carState.speed *
            0.055

          );


        carState.rampCooldown =
          1.6;


        carState.speed *=
          1.03;


        showRacePopup(

          "AIR!",

          520

        );


        break;

      }

    }

  }


  if (
    carState.airborne
  ) {

    car.position.y +=

      carState.verticalVelocity

      *

      delta;


    carState.verticalVelocity -=

      20 *

      delta;


    car.rotation.x =
      THREE.MathUtils.lerp(

        car.rotation.x,

        -0.08,

        0.08

      );


    if (

      car.position.y <= 0

      &&

      carState.verticalVelocity < 0

    ) {

      car.position.y =
        0;


      carState.verticalVelocity =
        0;


      carState.airborne =
        false;


      car.rotation.x =
        0;

    }

  }


  else {

    car.position.y =
      0;


    car.rotation.x =
      THREE.MathUtils.lerp(

        car.rotation.x,

        0,

        0.2

      );

  }

}


/* =========================
   TEMP ENGINE SOUND
========================= */

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
    0.006;


  engineOscillator
    .connect(
      engineGain
    )
    .connect(
      audioContext.destination
    );


  engineOscillator.start();

}


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

    42

    +

    normalizedRPM *
    92;


  engineOscillator
    .frequency
    .setTargetAtTime(

      frequency,

      audioContext.currentTime,

      0.06

    );

}


/* =========================
   TRANSMISSION
========================= */

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


  carState.rpm =
    THREE.MathUtils.clamp(

      900

      +

      mph

      *

      gearRatios[
        gear
      ]

      *

      22,

      900,

      7600

    );

}


/* =========================
   CAR PHYSICS
========================= */

function updateCar(
  delta
) {

  if (
    !raceActive
  ) {

    return;

  }


  carState.boostTimer =
    Math.max(

      0,

      carState.boostTimer -
      delta

    );


  carState.overdriveTimer =
    Math.max(

      0,

      carState.overdriveTimer -
      delta

    );


  carState.impactCooldown =
    Math.max(

      0,

      carState.impactCooldown -
      delta

    );


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


  const road =
    nearestRoadInfo(
      car.position
    );


  const onRoad =

    road.distance <

    ROAD_HALF +
    0.5;


  const overdrive =

    carState.overdriveTimer >
    0;


  /* ACCELERATION */

  if (
    accelerate
  ) {

    const acceleration =

      overdrive

      ?

      27

      :

      (
        onRoad
        ?
        20
        :
        8
      );


    carState.speed +=

      acceleration

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


  /* BRAKES */

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


  /* NITRO */

  if (

    nitroActive

    &&

    carState.speed >
    4

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


  const specialBoost =

    carState.boostTimer > 0

    ||

    overdrive;


  const maximumSpeed =

    specialBoost

    ?

    68

    :

    (
      nitroActive

      ?

      60

      :

      49
    );


  carState.speed =
    THREE.MathUtils.clamp(

      carState.speed,

      -12,

      maximumSpeed

    );


  /* STEERING */

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


  if (
    carState.airborne
  ) {

    turnRate *=
      0.22;

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


  car.position
    .addScaledVector(

      forwardVector(),

      carState.speed *
      delta

    );


  updateRamps(
    delta
  );


  handleGuardrailCollision();


  handleObstacleCollisions();


  updateBoostPads(
    delta
  );


  updatePickups(
    delta
  );


  updateTransmission();


  updateEngineAudio();


  updateCheckpoints();


  updateNavigation(
    delta
  );

}


/* =========================
   CHECKPOINTS
========================= */

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


function updateCheckpoints() {

  const target =
    getNextCheckpoint();


  const carFlat =
    new THREE.Vector3(

      car.position.x,

      0,

      car.position.z

    );


  const distance =
    carFlat.distanceTo(
      target.position
    );


  if (
    distance >
    7
  ) {

    return;

  }


  showRacePopup(

    "CHECKPOINT",

    600

  );


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

    `LAP ${
      Math.min(
        lap,
        TARGET_LAPS
      )
    } / ${TARGET_LAPS}`;


  checkpointText.textContent =

    `CHECKPOINT ${
      checkpointStep + 1
    } / ${
      activeTrack
        .checkpoints
        .length
    }`;

}


/* =========================
   NAVIGATION
========================= */

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

        new THREE.Vector3(

          car.position.x,

          0,

          car.position.z

        )

      );


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
    rightVector();


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


/* =========================
   MINIMAP
========================= */

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


  /* BOOST PAD DOTS */

  for (
    const pad
    of boostPads
  ) {

    const mapped =
      mapPoint(

        pad.position.x,

        pad.position.z

      );


    mapCtx.fillStyle =
      "#36a7ff";


    mapCtx.fillRect(

      mapped.x - 2,

      mapped.y - 2,

      4,

      4

    );

  }


  /* CHECKPOINTS */

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


  /* PLAYER */

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


/* =========================
   CAMERA
========================= */

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


/* =========================
   HUD
========================= */

function updateHUD() {

  if (
    !carState
  ) {

    return;

  }


  speedEl.textContent =
    Math.round(

      Math.abs(
        carState.speed
      )

      *

      2.45

    );


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


/* =========================
   COUNTDOWN
========================= */

async function runCountdown() {

  countdown
    .classList
    .remove(
      "hidden"
    );


  for (
    const value
    of [
      "3",
      "2",
      "1",
      "GO"
    ]
  ) {

    countdown.textContent =
      value;


    await new Promise(

      resolve =>

        setTimeout(

          resolve,

          value === "GO"

          ?

          550

          :

          700

        )

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


/* =========================
   START / FINISH
========================= */

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


/* =========================
   MENU
========================= */

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


/* =========================
   INPUT
========================= */

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


/* =========================
   FPS / CHROMEBOOK QUALITY
========================= */

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


/* =========================
   GAME LOOP
========================= */

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


/* =========================
   LOAD
========================= */

buildTrack(
  tracks.neon
);


requestAnimationFrame(
  gameLoop
);
