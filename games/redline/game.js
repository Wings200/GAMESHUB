import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

/* =========================================================
   REDLINE V3 — NEON DISTRICT
   ========================================================= */

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

const racePositionEl =
  document.getElementById("racePosition");

const totalRacersEl =
  document.getElementById("totalRacers");


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


scene.background =
  new THREE.Color(
    0x07101c
  );


scene.fog =
  new THREE.Fog(
    0x07101c,
    95,
    260
  );


const camera =
  new THREE.PerspectiveCamera(
    66,
    16 / 9,
    0.1,
    400
  );


scene.add(

  new THREE.HemisphereLight(
    0xbfd6ff,
    0x111827,
    1.7
  )

);


const keyLight =
  new THREE.DirectionalLight(
    0xffffff,
    1.25
  );


keyLight.position.set(
  -25,
  50,
  35
);


scene.add(
  keyLight
);


const clock =
  new THREE.Clock();


const keys =
  new Set();


/* =========================================================
   PERFORMANCE
   ========================================================= */

const quality = {
  renderScale: 0.76
};


let fpsFrames =
  0;


let lastFpsTime =
  performance.now();


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
   TRACK
   ========================================================= */

const ROAD_HALF =
  6.6;


const SIDEWALK_INNER =
  6.9;


const SIDEWALK_OUTER =
  9.3;


const TRACK_SAMPLE_COUNT =
  240;


const TARGET_LAPS =
  3;


/*
  Smooth hand-designed city circuit.
*/

const CONTROL_POINTS = [

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


const checkpointTs = [

  0.09,

  0.23,

  0.37,

  0.51,

  0.65,

  0.79,

  0.93

];


const boostDefinitions = [

  {
    t: 0.16,
    offset: -1.9
  },

  {
    t: 0.62,
    offset: 1.8
  }

];


const pickupDefinitions = [

  {
    t: 0.40,
    offset: -2.2,
    type: "overdrive"
  },

  {
    t: 0.82,
    offset: 2.0,
    type: "nitro"
  }

];


const obstacleDefinitions = [

  {
    t: 0.29,
    offset: 2.8,
    kind: "barrier",
    radius: 1.25
  },

  {
    t: 0.55,
    offset: -2.8,
    kind: "parked",
    radius: 1.35
  },

  {
    t: 0.875,
    offset: 2.5,
    kind: "barrier",
    radius: 1.25
  }

];


const curve =
  new THREE.CatmullRomCurve3(

    CONTROL_POINTS.map(

      ([x, z]) =>

        new THREE.Vector3(
          x,
          0,
          z
        )

    ),

    true,

    "catmullrom",

    0.18

  );


let trackSamples =
  [];


let worldGroup =
  null;


let car =
  null;


let carState =
  null;


let raceActive =
  false;


let checkpointStep =
  0;


let lap =
  1;


let wrongWayTimer =
  0;


let checkpointPopupTimer =
  null;


let checkpointGates =
  [];


let boostPads =
  [];


let pickups =
  [];


let obstacles =
  [];


/* =========================================================
   HELPERS
   ========================================================= */

function flatDistance(
  a,
  b
) {

  return Math.hypot(

    a.x -
    b.x,

    a.z -
    b.z

  );

}


function getFrameAt(
  t
) {

  const wrappedT =

    (
      (
        t %
        1
      )
      +
      1
    )

    %

    1;


  const point =
    curve.getPointAt(
      wrappedT
    );


  const tangent =
    curve
      .getTangentAt(
        wrappedT
      )
      .normalize();


  const normal =
    new THREE.Vector3(

      -tangent.z,

      0,

      tangent.x

    )
    .normalize();


  return {

    t:
      wrappedT,

    point,

    tangent,

    normal,

    rotationY:

      Math.atan2(

        tangent.x,

        tangent.z

      )

  };

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
   TRACK SAMPLING
   ========================================================= */

function createTrackSamples() {

  trackSamples =
    [];


  for (

    let i = 0;

    i <
    TRACK_SAMPLE_COUNT;

    i++

  ) {

    const t =

      i /
      TRACK_SAMPLE_COUNT;


    const frame =
      getFrameAt(
        t
      );


    trackSamples.push({

      ...frame,

      index:
        i

    });

  }

}


/* =========================================================
   NEAREST TRACK POINT
   ========================================================= */

function nearestTrackInfo(
  position
) {

  let best =
    null;


  for (
    const sample
    of trackSamples
  ) {

    const dx =

      position.x -
      sample.point.x;


    const dz =

      position.z -
      sample.point.z;


    const distanceSq =

      dx *
      dx

      +

      dz *
      dz;


    if (

      !best

      ||

      distanceSq <
      best.distanceSq

    ) {

      const offset =

        dx *
        sample.normal.x

        +

        dz *
        sample.normal.z;


      best = {

        ...sample,

        offset,

        distance:
          Math.sqrt(
            distanceSq
          ),

        distanceSq

      };

    }

  }


  return best;

}


/* =========================================================
   CLEAN WORLD
   ========================================================= */

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

        const list =

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
          of list
        ) {

          material
            .dispose?.();

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
   RIBBON GEOMETRY
   ========================================================= */

function makeRibbon(

  innerDistance,

  outerDistance,

  color,

  y = 0.02

) {

  const vertices =
    [];


  const indices =
    [];


  for (

    let i = 0;

    i <
    TRACK_SAMPLE_COUNT;

    i++

  ) {

    const sample =
      trackSamples[i];


    const inner =
      sample.point
        .clone()
        .addScaledVector(

          sample.normal,

          innerDistance

        );


    const outer =
      sample.point
        .clone()
        .addScaledVector(

          sample.normal,

          outerDistance

        );


    inner.y =
      y;


    outer.y =
      y;


    vertices.push(

      inner.x,
      inner.y,
      inner.z,

      outer.x,
      outer.y,
      outer.z

    );

  }


  for (

    let i = 0;

    i <
    TRACK_SAMPLE_COUNT;

    i++

  ) {

    const next =

      (
        i +
        1
      )

      %

      TRACK_SAMPLE_COUNT;


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
      c,
      b,

      c,
      d,
      b

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

    new THREE.MeshLambertMaterial({

      color,

      side:
        THREE.DoubleSide

    })

  );

}


/* =========================================================
   ROAD SURFACE
   ========================================================= */

function makeRoadSurface() {

  const vertices =
    [];


  const indices =
    [];


  for (

    let i = 0;

    i <
    TRACK_SAMPLE_COUNT;

    i++

  ) {

    const sample =
      trackSamples[i];


    const left =
      sample.point
        .clone()
        .addScaledVector(

          sample.normal,

          ROAD_HALF

        );


    const right =
      sample.point
        .clone()
        .addScaledVector(

          sample.normal,

          -ROAD_HALF

        );


    left.y =
      0.04;


    right.y =
      0.04;


    vertices.push(

      left.x,
      left.y,
      left.z,

      right.x,
      right.y,
      right.z

    );

  }


  for (

    let i = 0;

    i <
    TRACK_SAMPLE_COUNT;

    i++

  ) {

    const next =

      (
        i +
        1
      )

      %

      TRACK_SAMPLE_COUNT;


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
      c,
      b,

      c,
      d,
      b

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

    new THREE.MeshLambertMaterial({

      color:
        0x222a35,

      side:
        THREE.DoubleSide

    })

  );

}


/* =========================================================
   CENTER ROAD LINES
   ========================================================= */

function buildCenterDashes() {

  const placements =
    [];


  for (

    let i = 0;

    i <
    TRACK_SAMPLE_COUNT;

    i +=
    8

  ) {

    placements.push(
      trackSamples[i]
    );

  }


  const mesh =
    new THREE.InstancedMesh(

      new THREE.BoxGeometry(

        0.12,

        0.035,

        3.2

      ),

      new THREE.MeshBasicMaterial({

        color:
          0xd8dde5

      }),

      placements.length

    );


  const dummy =
    new THREE.Object3D();


  placements.forEach(

    (
      sample,
      index
    ) => {

      dummy.position.copy(
        sample.point
      );


      dummy.position.y =
        0.075;


      dummy.rotation.set(

        0,

        sample.rotationY,

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


/* =========================================================
   CURBS
   ========================================================= */

function buildEdgeCurbs() {

  const leftCurb =
    makeRibbon(

      ROAD_HALF -
      0.28,

      ROAD_HALF +
      0.12,

      0xcbd2dc,

      0.075

    );


  const rightCurb =
    makeRibbon(

      -ROAD_HALF +
      0.28,

      -ROAD_HALF -
      0.12,

      0xcbd2dc,

      0.075

    );


  worldGroup.add(

    leftCurb,

    rightCurb

  );

}


/* =========================================================
   SIDEWALKS
   ========================================================= */

function buildSidewalks() {

  const left =
    makeRibbon(

      SIDEWALK_INNER,

      SIDEWALK_OUTER,

      0x343b46,

      0.07

    );


  const right =
    makeRibbon(

      -SIDEWALK_INNER,

      -SIDEWALK_OUTER,

      0x343b46,

      0.07

    );


  worldGroup.add(

    left,

    right

  );

}


/* =========================================================
   STREET LIGHTS
   ========================================================= */

function buildStreetLights() {

  const placements =
    [];


  for (

    let i = 0;

    i <
    TRACK_SAMPLE_COUNT;

    i +=
    18

  ) {

    const sample =
      trackSamples[i];


    for (
      const side
      of [-1, 1]
    ) {

      const position =
        sample.point
          .clone()
          .addScaledVector(

            sample.normal,

            side *
            8.2

          );


      placements.push({

        position,

        rotationY:
          sample.rotationY

      });

    }

  }


  const poleMesh =
    new THREE.InstancedMesh(

      new THREE.CylinderGeometry(

        0.055,

        0.075,

        5.2,

        6

      ),

      new THREE.MeshLambertMaterial({

        color:
          0x4c5563

      }),

      placements.length

    );


  const lightMesh =
    new THREE.InstancedMesh(

      new THREE.BoxGeometry(

        0.18,

        0.12,

        0.8

      ),

      new THREE.MeshBasicMaterial({

        color:
          0xbfd8ff

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


      dummy.position.y =
        2.6;


      dummy.rotation.set(

        0,

        item.rotationY,

        0

      );


      dummy.updateMatrix();


      poleMesh.setMatrixAt(

        index,

        dummy.matrix

      );


      dummy.position.copy(
        item.position
      );


      dummy.position.y =
        5.08;


      dummy.rotation.set(

        0,

        item.rotationY,

        0

      );


      dummy.updateMatrix();


      lightMesh.setMatrixAt(

        index,

        dummy.matrix

      );

    }

  );


  worldGroup.add(

    poleMesh,

    lightMesh

  );

}


/* =========================================================
   CITY
   ========================================================= */

function deterministicHeight(
  index
) {

  return (

    8

    +

    (
      index *
      17
    )

    %

    18

  );

}


function deterministicDepth(
  index
) {

  return (

    7

    +

    (
      index *
      11
    )

    %

    7

  );

}


function buildCity() {

  const buildingColors = [

    0x182231,

    0x202b39,

    0x283343

  ];


  const buckets =
    buildingColors.map(
      () => []
    );


  let buildingIndex =
    0;


  for (

    let i = 0;

    i <
    TRACK_SAMPLE_COUNT;

    i +=
    12

  ) {

    const sample =
      trackSamples[i];


    for (
      const side
      of [-1, 1]
    ) {

      const offset =

        16

        +

        (
          buildingIndex *
          5
        )

        %

        9;


      const position =
        sample.point
          .clone()
          .addScaledVector(

            sample.normal,

            side *
            offset

          );


      const height =
        deterministicHeight(
          buildingIndex
        );


      const width =

        7

        +

        (
          buildingIndex *
          7
        )

        %

        5;


      const depth =
        deterministicDepth(
          buildingIndex
        );


      buckets[
        buildingIndex %
        buckets.length
      ]
      .push({

        position,

        rotationY:
          sample.rotationY,

        scale:
          new THREE.Vector3(

            width,

            height,

            depth

          )

      });


      buildingIndex++;

    }

  }


  buckets.forEach(

    (
      placements,
      bucketIndex
    ) => {

      const mesh =
        new THREE.InstancedMesh(

          new THREE.BoxGeometry(
            1,
            1,
            1
          ),

          new THREE.MeshLambertMaterial({

            color:
              buildingColors[
                bucketIndex
              ]

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


          dummy.position.y =

            item.scale.y /
            2;


          dummy.rotation.set(

            0,

            item.rotationY,

            0

          );


          dummy.scale.copy(
            item.scale
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

  );


  buildNeonSigns();

}


/* =========================================================
   NEON SIGNS
   ========================================================= */

function buildNeonSigns() {

  const definitions = [

    {
      t: 0.11,
      side: 1,
      color: 0x4d8dff
    },

    {
      t: 0.34,
      side: -1,
      color: 0xff466e
    },

    {
      t: 0.58,
      side: 1,
      color: 0x8c5cff
    },

    {
      t: 0.76,
      side: -1,
      color: 0x35d8ff
    }

  ];


  for (
    const definition
    of definitions
  ) {

    const frame =
      getFrameAt(
        definition.t
      );


    const sign =
      new THREE.Mesh(

        new THREE.BoxGeometry(

          4.8,

          1.2,

          0.12

        ),

        new THREE.MeshBasicMaterial({

          color:
            definition.color

        })

      );


    sign.position
      .copy(
        frame.point
      )
      .addScaledVector(

        frame.normal,

        definition.side *
        11.5

      );


    sign.position.y =
      4.2;


    sign.rotation.y =
      frame.rotationY;


    worldGroup.add(
      sign
    );

  }

}


/* =========================================================
   CHECKPOINT GATES
   ========================================================= */

function buildCheckpointGates() {

  checkpointGates =
    [];


  checkpointTs.forEach(

    (
      t,
      index
    ) => {

      const frame =
        getFrameAt(
          t
        );


      const group =
        new THREE.Group();


      group.position.copy(
        frame.point
      );


      group.rotation.y =
        frame.rotationY;


      const material =
        new THREE.MeshBasicMaterial({

          color:

            index === 0

            ?

            0x5a9cff

            :

            0x687386

        });


      const poleGeometry =
        new THREE.BoxGeometry(

          0.22,

          5.2,

          0.22

        );


      const beamGeometry =
        new THREE.BoxGeometry(

          ROAD_HALF *
          2 +
          2.2,

          0.34,

          0.28

        );


      const left =
        new THREE.Mesh(

          poleGeometry,

          material

        );


      left.position.set(

        -(
          ROAD_HALF +
          0.7
        ),

        2.6,

        0

      );


      const right =
        new THREE.Mesh(

          poleGeometry,

          material

        );


      right.position.set(

        ROAD_HALF +
        0.7,

        2.6,

        0

      );


      const top =
        new THREE.Mesh(

          beamGeometry,

          material

        );


      top.position.set(

        0,

        5.15,

        0

      );


      group.add(

        left,

        right,

        top

      );


      worldGroup.add(
        group
      );


      checkpointGates.push({

        group,

        material,

        t,

        point:
          frame.point.clone()

      });

    }

  );

}


function updateGateColors() {

  checkpointGates.forEach(

    (
      gate,
      index
    ) => {

      gate.material.color.setHex(

        index ===
        checkpointStep

        ?

        0x5a9cff

        :

        0x687386

      );

    }

  );

}


/* =========================================================
   BOOST PADS
   ========================================================= */

function buildBoostPads() {

  boostPads =
    [];


  for (
    const definition
    of boostDefinitions
  ) {

    const frame =
      getFrameAt(
        definition.t
      );


    const mesh =
      new THREE.Mesh(

        new THREE.BoxGeometry(

          3.7,

          0.055,

          5.8

        ),

        new THREE.MeshBasicMaterial({

          color:
            0x2d9dff

        })

      );


    mesh.position
      .copy(
        frame.point
      )
      .addScaledVector(

        frame.normal,

        definition.offset

      );


    mesh.position.y =
      0.09;


    mesh.rotation.y =
      frame.rotationY;


    worldGroup.add(
      mesh
    );


    boostPads.push({

      mesh,

      position:
        mesh.position.clone(),

      cooldown:
        0

    });

  }

}


/* =========================================================
   POWERUPS
   ========================================================= */

function buildPickups() {

  pickups =
    [];


  for (
    const definition
    of pickupDefinitions
  ) {

    const frame =
      getFrameAt(
        definition.t
      );


    const color =

      definition.type ===
      "overdrive"

      ?

      0xff9c3a

      :

      0x59c7ff;


    const mesh =
      new THREE.Mesh(

        new THREE.OctahedronGeometry(

          0.72,

          0

        ),

        new THREE.MeshBasicMaterial({
          color
        })

      );


    mesh.position
      .copy(
        frame.point
      )
      .addScaledVector(

        frame.normal,

        definition.offset

      );


    mesh.position.y =
      1.25;


    worldGroup.add(
      mesh
    );


    pickups.push({

      ...definition,

      mesh,

      position:
        mesh.position.clone(),

      active:
        true,

      respawn:
        0,

      spin:
        definition.t *
        10

    });

  }

}


/* =========================================================
   OBSTACLES
   ========================================================= */

function buildObstacles() {

  obstacles =
    [];


  for (
    const definition
    of obstacleDefinitions
  ) {

    const frame =
      getFrameAt(
        definition.t
      );


    let mesh;


    if (
      definition.kind ===
      "parked"
    ) {

      const group =
        new THREE.Group();


      const body =
        new THREE.Mesh(

          new THREE.BoxGeometry(

            1.9,

            0.55,

            3.6

          ),

          new THREE.MeshLambertMaterial({

            color:
              0x5b6472

          })

        );


      body.position.y =
        0.52;


      const cabin =
        new THREE.Mesh(

          new THREE.BoxGeometry(

            1.45,

            0.5,

            1.5

          ),

          new THREE.MeshLambertMaterial({

            color:
              0x171c25

          })

        );


      cabin.position.set(

        0,

        0.93,

        -0.1

      );


      group.add(

        body,

        cabin

      );


      mesh =
        group;

    }


    else {

      mesh =
        new THREE.Mesh(

          new THREE.BoxGeometry(

            2.6,

            1.0,

            0.7

          ),

          new THREE.MeshLambertMaterial({

            color:
              0xd4d8de

          })

        );


      mesh.position.y =
        0.5;

    }


    mesh.position
      .add(
        frame.point
      )
      .addScaledVector(

        frame.normal,

        definition.offset

      );


    mesh.rotation.y =
      frame.rotationY;


    worldGroup.add(
      mesh
    );


    obstacles.push({

      ...definition,

      mesh,

      position:
        new THREE.Vector3(

          mesh.position.x,

          0,

          mesh.position.z

        )

    });

  }

}


/* =========================================================
   PLAYER CAR
   ========================================================= */

function makeCar() {

  const group =
    new THREE.Group();


  const bodyMat =
    new THREE.MeshLambertMaterial({

      color:
        0xe8edf4

    });


  const darkMat =
    new THREE.MeshLambertMaterial({

      color:
        0x151a22

    });


  const tireMat =
    new THREE.MeshLambertMaterial({

      color:
        0x07090d

    });


  const redMat =
    new THREE.MeshBasicMaterial({

      color:
        0xff3c4f

    });


  const body =
    new THREE.Mesh(

      new THREE.BoxGeometry(

        1.9,

        0.42,

        3.85

      ),

      bodyMat

    );


  body.position.y =
    0.57;


  group.add(
    body
  );


  const hood =
    new THREE.Mesh(

      new THREE.BoxGeometry(

        1.72,

        0.18,

        1.0

      ),

      bodyMat

    );


  hood.position.set(

    0,

    0.79,

    1.18

  );


  hood.rotation.x =
    -0.07;


  group.add(
    hood
  );


  const cabin =
    new THREE.Mesh(

      new THREE.BoxGeometry(

        1.48,

        0.56,

        1.55

      ),

      darkMat

    );


  cabin.position.set(

    0,

    0.98,

    -0.18

  );


  group.add(
    cabin
  );


  const spoiler =
    new THREE.Mesh(

      new THREE.BoxGeometry(

        1.65,

        0.10,

        0.32

      ),

      darkMat

    );


  spoiler.position.set(

    0,

    1.0,

    -1.7

  );


  group.add(
    spoiler
  );


  const tailLeft =
    new THREE.Mesh(

      new THREE.BoxGeometry(

        0.45,

        0.14,

        0.06

      ),

      redMat

    );


  tailLeft.position.set(

    -0.53,

    0.62,

    -1.94

  );


  const tailRight =
    tailLeft.clone();


  tailRight.position.x =
    0.53;


  group.add(

    tailLeft,

    tailRight

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

          tireMat

        );


      wheel.rotation.z =
        Math.PI /
        2;


      wheel.position.set(

        x,

        0.34,

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
   BUILD WORLD
   ========================================================= */

function buildWorld() {

  disposeWorld();


  worldGroup =
    new THREE.Group();


  scene.add(
    worldGroup
  );


  createTrackSamples();


  const ground =
    new THREE.Mesh(

      new THREE.PlaneGeometry(

        520,

        520

      ),

      new THREE.MeshLambertMaterial({

        color:
          0x0b1420

      })

    );


  ground.rotation.x =
    -Math.PI /
    2;


  ground.position.y =
    -0.02;


  worldGroup.add(
    ground
  );


  buildCity();


  buildSidewalks();


  worldGroup.add(
    makeRoadSurface()
  );


  buildEdgeCurbs();


  buildCenterDashes();


  buildStreetLights();


  buildCheckpointGates();


  buildBoostPads();


  buildPickups();


  buildObstacles();


  car =
    makeCar();


  worldGroup.add(
    car
  );


  const start =
    getFrameAt(
      0.015
    );


  car.position.copy(
    start.point
  );


  car.rotation.y =
    start.rotationY;


  carState = {

    speed:
      0,

    steer:
      0,

    gear:
      1,

    rpm:
      900,

    nitro:
      100,

    boostTimer:
      0,

    overdriveTimer:
      0,

    impactCooldown:
      0

  };


  checkpointStep =
    0;


  lap =
    1;


  wrongWayTimer =
    0;


  updateObjective();


  updateGateColors();

}


/* =========================================================
   TRANSMISSION
   ========================================================= */

const gearRatios = [

  0,

  3.0,

  2.18,

  1.62,

  1.27,

  1.02,

  0.84

];


const shiftUp = [

  0,

  24,

  43,

  64,

  86,

  110,

  145

];


const shiftDown = [

  0,

  0,

  16,

  34,

  53,

  73,

  95

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


/* =========================================================
   ROAD COLLISION
   ========================================================= */

function keepCarOnRoad(
  roadInfo
) {

  const limit =

    ROAD_HALF -
    1.05;


  if (

    Math.abs(
      roadInfo.offset
    )

    <=

    limit

  ) {

    return;

  }


  const side =

    Math.sign(
      roadInfo.offset
    )

    ||

    1;


  const corrected =
    roadInfo.point
      .clone()
      .addScaledVector(

        roadInfo.normal,

        side *
        limit

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
    8

  ) {

    showRacePopup(

      "WALL HIT",

      430

    );


    carState.impactCooldown =
      0.45;

  }


  carState.speed *=
    0.62;


  carState.steer *=
    -0.20;

}


/* =========================================================
   OBSTACLE COLLISION
   ========================================================= */

function handleObstacleCollisions() {

  for (
    const obstacle
    of obstacles
  ) {

    const distance =
      flatDistance(

        car.position,

        obstacle.position

      );


    const minimum =

      obstacle.radius

      +

      0.85;


    if (
      distance <
      minimum
    ) {

      const dx =

        car.position.x

        -

        obstacle.position.x;


      const dz =

        car.position.z

        -

        obstacle.position.z;


      const safe =
        Math.max(

          distance,

          0.001

        );


      car.position.x =

        obstacle.position.x

        +

        (
          dx /
          safe
        )

        *

        minimum;


      car.position.z =

        obstacle.position.z

        +

        (
          dz /
          safe
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

          450

        );


        carState.impactCooldown =
          0.55;

      }


      carState.speed *=
        0.30;


      return;

    }

  }

}


/* =========================================================
   BOOST PADS
   ========================================================= */

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


    if (
      pad.cooldown >
      0
    ) {

      continue;

    }


    if (

      flatDistance(

        car.position,

        pad.position

      )

      <

      2.9

    ) {

      carState.boostTimer =
        Math.max(

          carState.boostTimer,

          1.25

        );


      carState.speed =
        Math.max(

          carState.speed,

          31

        );


      pad.cooldown =
        1.4;


      showRacePopup(

        "BOOST",

        450

      );

    }

  }

}


/* =========================================================
   POWERUPS
   ========================================================= */

function updatePickups(
  delta,
  elapsed
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
        pickup.respawn <=
        0
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

        elapsed *
        3

        +

        pickup.spin

      )

      *

      0.16;


    if (

      flatDistance(

        car.position,

        pickup.position

      )

      <

      2.0

    ) {

      pickup.active =
        false;


      pickup.mesh.visible =
        false;


      pickup.respawn =
        9;


      if (
        pickup.type ===
        "overdrive"
      ) {

        carState.overdriveTimer =
          Math.max(

            carState.overdriveTimer,

            3.3

          );


        showRacePopup(

          "OVERDRIVE",

          620

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

          620

        );

      }

    }

  }

}


/* =========================================================
   CAR PHYSICS
   ========================================================= */

function updateCar(
  delta,
  elapsed
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

    carState.nitro >
    0;


  const overdrive =

    carState.overdriveTimer >
    0;


  const roadInfo =
    nearestTrackInfo(
      car.position
    );


  const offRoad =

    Math.abs(
      roadInfo.offset
    )

    >

    ROAD_HALF -
    0.35;


  /*
    ACCELERATION
  */

  if (
    accelerate
  ) {

    carState.speed +=

      (
        overdrive

        ?

        25

        :

        (
          offRoad

          ?

          8

          :

          19
        )
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
    BRAKES / REVERSE
  */

  if (
    brake
  ) {

    if (
      carState.speed >
      2
    ) {

      carState.speed -=

        33 *

        delta;

    }


    else {

      carState.speed -=

        11 *

        delta;

    }

  }


  /*
    OFF ROAD
  */

  if (
    offRoad
  ) {

    carState.speed *=

      Math.pow(

        0.952,

        delta *
        60

      );

  }


  /*
    PLAYER NITRO
  */

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
        24 *
        delta

      );


    carState.speed +=

      23 *

      delta;

  }


  else {

    carState.nitro =
      Math.min(

        100,

        carState.nitro +
        3.6 *
        delta

      );

  }


  const boosted =

    carState.boostTimer >
    0

    ||

    overdrive;


  const maxSpeed =

    boosted

    ?

    69

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

      -11,

      maxSpeed

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
      0.22
      :
      0.13

    );


  const speedFactor =
    THREE.MathUtils.clamp(

      Math.abs(
        carState.speed
      )

      /

      11,

      0,

      1

    );


  const reverseDirection =

    carState.speed >=
    0

    ?

    1

    :

    -1;


  let turnRate =

    handbrake

    ?

    1.9

    :

    1.28;


  if (

    Math.abs(
      carState.speed
    )

    >

    40

    &&

    !handbrake

  ) {

    turnRate *=
      0.82;

  }


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


  const updatedRoadInfo =
    nearestTrackInfo(
      car.position
    );


  keepCarOnRoad(
    updatedRoadInfo
  );


  handleObstacleCollisions();


  updateBoostPads(
    delta
  );


  updatePickups(

    delta,

    elapsed

  );


  updateTransmission();


  updateCheckpoints();


  updateNavigation(

    delta,

    updatedRoadInfo

  );

}


/* =========================================================
   CHECKPOINTS
   ========================================================= */

function nextCheckpoint() {

  return checkpointGates[
    checkpointStep
  ];

}


function updateCheckpoints() {

  const target =
    nextCheckpoint();


  if (
    !target
  ) {

    return;

  }


  if (

    flatDistance(

      car.position,

      target.point

    )

    >

    7.2

  ) {

    return;

  }


  showRacePopup(

    "CHECKPOINT",

    500

  );


  checkpointStep++;


  if (

    checkpointStep >=

    checkpointGates.length

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


  updateGateColors();

}


/* =========================================================
   OBJECTIVE HUD
   ========================================================= */

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
      checkpointStep +
      1
    } / ${
      checkpointTs.length
    }`;

}


/* =========================================================
   NAVIGATION
   ========================================================= */

function updateNavigation(
  delta,
  roadInfo
) {

  const target =
    nextCheckpoint();


  if (
    !target
  ) {

    return;

  }


  const toTarget =
    target.point
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
    distance >
    0.001
  ) {

    toTarget.normalize();


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


    const absDegrees =
      Math.abs(
        degrees
      );


    directionArrow.style.transform =

      `rotate(${
        THREE.MathUtils.clamp(
          degrees,
          -105,
          105
        )
      }deg)`;


    if (
      absDegrees <
      16
    ) {

      navigationText.textContent =
        "STRAIGHT";

    }


    else if (
      absDegrees <
      48
    ) {

      navigationText.textContent =

        degrees >
        0

        ?

        "RIGHT"

        :

        "LEFT";

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

  }


  const roadDirectionDot =

    forwardVector()
      .dot(
        roadInfo.tangent
      );


  if (

    roadDirectionDot <
    -0.25

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
      0.85

    );

}


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
    const sample
    of trackSamples
  ) {

    minX =
      Math.min(

        minX,

        sample.point.x

      );


    maxX =
      Math.max(

        maxX,

        sample.point.x

      );


    minZ =
      Math.min(

        minZ,

        sample.point.z

      );


    maxZ =
      Math.max(

        maxZ,

        sample.point.z

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

    !trackSamples.length

  ) {

    return;

  }


  const width =
    minimap.width;


  const height =
    minimap.height;


  const bounds =
    getTrackBounds();


  const padding =
    18;


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


  const mapPoint =

    (
      x,
      z
    ) => ({

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

    });


  mapCtx.clearRect(

    0,

    0,

    width,

    height

  );


  mapCtx.strokeStyle =
    "rgba(255,255,255,.42)";


  mapCtx.lineWidth =
    5;


  mapCtx.lineJoin =
    "round";


  mapCtx.lineCap =
    "round";


  mapCtx.beginPath();


  trackSamples.forEach(

    (
      sample,
      index
    ) => {

      const mapped =
        mapPoint(

          sample.point.x,

          sample.point.z

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

      trackSamples[0]
        .point.x,

      trackSamples[0]
        .point.z

    );


  mapCtx.lineTo(

    first.x,

    first.y

  );


  mapCtx.stroke();


  /*
    CHECKPOINTS
  */

  checkpointGates.forEach(

    (
      gate,
      index
    ) => {

      const mapped =
        mapPoint(

          gate.point.x,

          gate.point.z

        );


      mapCtx.fillStyle =

        index ===
        checkpointStep

        ?

        "#ffffff"

        :

        "rgba(255,255,255,.24)";


      mapCtx.beginPath();


      mapCtx.arc(

        mapped.x,

        mapped.y,

        index ===
        checkpointStep

        ?

        4.3

        :

        2.4,

        0,

        Math.PI *
        2

      );


      mapCtx.fill();

    }

  );


  /*
    BOOST PADS
  */

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
      "#2d9dff";


    mapCtx.fillRect(

      mapped.x -
      2,

      mapped.y -
      2,

      4,

      4

    );

  }


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
    "#5a9cff";


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
   CHASE CAMERA
   ========================================================= */

function updateCamera(
  delta
) {

  if (

    !car

    ||

    !carState

  ) {

    return;

  }


  const forward =
    forwardVector();


  const speed01 =
    THREE.MathUtils.clamp(

      Math.abs(
        carState.speed
      )

      /

      60,

      0,

      1

    );


  const distanceBehind =

    7.0

    +

    speed01 *
    1.5;


  const cameraHeight =

    2.9

    +

    speed01 *
    0.35;


  const desired =
    car.position
      .clone()
      .add(

        new THREE.Vector3(

          0,

          cameraHeight,

          0

        )

      )
      .addScaledVector(

        forward,

        -distanceBehind

      );


  const smoothing =

    1

    -

    Math.pow(

      0.0015,

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

          0.7,

          0

        )

      )
      .addScaledVector(

        forward,

        6

        +

        speed01 *
        4

      );


  camera.lookAt(
    lookAt
  );


  const targetFov =

    64

    +

    speed01 *
    13;


  camera.fov =
    THREE.MathUtils.lerp(

      camera.fov,

      targetFov,

      0.08

    );


  camera.updateProjectionMatrix();

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


/* =========================================================
   POPUP
   ========================================================= */

function showRacePopup(

  text,

  duration = 600

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


/* =========================================================
   COUNTDOWN
   ========================================================= */

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

      resolve => {

        setTimeout(

          resolve,

          value ===
          "GO"

          ?

          520

          :

          680

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

  buildWorld();


  trackNameEl.textContent =
    "NEON DISTRICT";


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
   FINISH
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
   MENU
   ========================================================= */

/*
  Only Neon District is enabled
  during the V3 rebuild.
*/

for (
  const option
  of trackSelect.options
) {

  if (
    option.value !==
    "neon"
  ) {

    option.disabled =
      true;


    option.textContent =

      `${option.textContent} — REBUILDING`;

  }

}


trackSelect.value =
  "neon";


trackDescription.textContent =

  "Neon District V3 — smooth city circuit, boost pads and power pickups.";


if (
  racePositionEl
) {

  racePositionEl.textContent =
    "1ST";

}


if (
  totalRacersEl
) {

  totalRacersEl.textContent =
    "/ 1";

}


startBtn.addEventListener(

  "click",

  startRace

);


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
   FPS
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

      (
        fpsFrames *
        1000
      )

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
        0.07

      );


    resizeRenderer();

  }


  else if (

    fps >
    56

    &&

    quality.renderScale <
    0.90

  ) {

    quality.renderScale =
      Math.min(

        0.90,

        quality.renderScale +
        0.035

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


  const elapsed =
    clock.elapsedTime;


  updateCar(

    delta,

    elapsed

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
   INITIAL PREVIEW
   ========================================================= */

buildWorld();


requestAnimationFrame(
  gameLoop
);
