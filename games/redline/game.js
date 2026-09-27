import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

/* =========================================================
   REDLINE V4 — PHYSICS / COLLISION REBUILD
   Neon District development build
   ========================================================= */

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

/* =========================================================
   THREE.JS
   ========================================================= */

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  powerPreference: "high-performance"
});

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(1);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07101c);
scene.fog = new THREE.Fog(0x07101c, 95, 270);

const camera = new THREE.PerspectiveCamera(
  66,
  16 / 9,
  0.1,
  420
);

scene.add(
  new THREE.HemisphereLight(
    0xc8dcff,
    0x101722,
    1.75
  )
);

const sun = new THREE.DirectionalLight(
  0xffffff,
  1.15
);

sun.position.set(
  -25,
  50,
  30
);

scene.add(sun);

const clock = new THREE.Clock();
const keys = new Set();

/* =========================================================
   PERFORMANCE
   ========================================================= */

const quality = {
  renderScale: 0.76
};

let fpsFrames = 0;
let lastFpsTime = performance.now();

function resizeRenderer() {
  const width = Math.max(
    320,
    window.innerWidth
  );

  const height = Math.max(
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
   TRACK CONSTANTS
   ========================================================= */

const ROAD_HALF = 6.6;
const SIDEWALK_OUTER = 9.2;
const TRACK_SAMPLE_COUNT = 300;
const TARGET_LAPS = 3;
const CAR_RADIUS = 0.95;

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

/*
  IMPORTANT:
  These are the ONLY places that have
  physical track-edge barriers.

  If you do not see a barrier,
  you can drive off the road.
*/

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

const obstacleDefinitions = [
  {
    t: 0.29,
    offset: 2.7,
    kind: "barrier",
    radius: 1.2
  },

  {
    t: 0.55,
    offset: -2.7,
    kind: "parked",
    radius: 1.4
  },

  {
    t: 0.875,
    offset: 2.4,
    kind: "barrier",
    radius: 1.2
  }
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

/* =========================================================
   STATE
   ========================================================= */

let worldGroup = null;

let trackSamples = [];

let checkpointGates = [];

let barriers = [];

let obstacles = [];

let boostPads = [];

let pickups = [];

let car = null;

let carState = null;

let raceActive = false;

let checkpointStep = 0;

let lap = 1;

let wrongWayTimer = 0;

let checkpointPopupTimer = null;

/* =========================================================
   HELPERS
   ========================================================= */

function getFrameAt(t) {
  const wrapped =
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
      wrapped
    );

  const tangent =
    curve
      .getTangentAt(
        wrapped
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
    t: wrapped,
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

function rightVector() {
  const f =
    forwardVector();

  return new THREE.Vector3(
    f.z,
    0,
    -f.x
  );
}

function flatDistance(a, b) {
  return Math.hypot(
    a.x -
    b.x,

    a.z -
    b.z
  );
}

function sampleTrack() {
  trackSamples = [];

  for (
    let i = 0;
    i < TRACK_SAMPLE_COUNT;
    i++
  ) {
    const frame =
      getFrameAt(
        i /
        TRACK_SAMPLE_COUNT
      );

    trackSamples.push({
      ...frame,
      index: i
    });
  }
}

function nearestTrackInfo(position) {
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

        distanceSq,

        distance:
          Math.sqrt(
            distanceSq
          ),

        offset
      };
    }
  }

  return best;
}

/* =========================================================
   SURFACES
   ========================================================= */

function getSurface(
  roadInfo
) {
  const distance =
    Math.abs(
      roadInfo.offset
    );

  /*
    Asphalt
  */

  if (
    distance <=
    ROAD_HALF
  ) {
    return {
      name:
        "ASPHALT",

      acceleration:
        1,

      grip:
        8.5,

      drag:
        0.34,

      steer:
        1
    };
  }

  /*
    Sidewalk / curb area
  */

  if (
    distance <=
    SIDEWALK_OUTER
  ) {
    return {
      name:
        "SIDEWALK",

      acceleration:
        0.72,

      grip:
        6.3,

      drag:
        0.8,

      steer:
        0.88
    };
  }

  /*
    Grass / dirt beyond the track.
  */

  return {
    name:
      "GRASS",

    acceleration:
      0.46,

    grip:
      3.5,

    drag:
      2.35,

    steer:
      0.68
  };
}

/* =========================================================
   CLEANUP
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

        list.forEach(
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

  worldGroup =
    null;
}

/* =========================================================
   TRACK GEOMETRY
   ========================================================= */

function makeRibbon(
  innerDistance,
  outerDistance,
  color,
  y = 0.02
) {
  const vertices = [];

  const indices = [];

  for (
    let i = 0;
    i < TRACK_SAMPLE_COUNT;
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
    i < TRACK_SAMPLE_COUNT;
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
   ROAD
   ========================================================= */

function buildRoad() {
  worldGroup.add(

    makeRibbon(
      -ROAD_HALF,
      ROAD_HALF,
      0x222a35,
      0.04
    ),

    makeRibbon(
      ROAD_HALF,
      SIDEWALK_OUTER,
      0x353d48,
      0.055
    ),

    makeRibbon(
      -ROAD_HALF,
      -SIDEWALK_OUTER,
      0x353d48,
      0.055
    ),

    makeRibbon(
      ROAD_HALF -
      0.28,

      ROAD_HALF +
      0.12,

      0xcbd2dc,

      0.075
    ),

    makeRibbon(
      -ROAD_HALF +
      0.28,

      -ROAD_HALF -
      0.12,

      0xcbd2dc,

      0.075
    )

  );

  const dashSamples = [];

  for (
    let i = 0;
    i < TRACK_SAMPLE_COUNT;
    i += 9
  ) {
    dashSamples.push(
      trackSamples[i]
    );
  }

  const dashes =
    new THREE.InstancedMesh(

      new THREE.BoxGeometry(
        0.12,
        0.025,
        3.0
      ),

      new THREE.MeshBasicMaterial({
        color:
          0xd7dce4
      }),

      dashSamples.length

    );

  const dummy =
    new THREE.Object3D();

  dashSamples.forEach(
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

      dashes.setMatrixAt(
        index,
        dummy.matrix
      );
    }
  );

  worldGroup.add(
    dashes
  );
}

/* =========================================================
   CITY
   ========================================================= */

function buildCity() {
  const ground =
    new THREE.Mesh(

      new THREE.PlaneGeometry(
        540,
        540
      ),

      new THREE.MeshLambertMaterial({
        color:
          0x0a131d
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

  const buildingGeometry =
    new THREE.BoxGeometry(
      1,
      1,
      1
    );

  const materials = [

    new THREE.MeshLambertMaterial({
      color:
        0x172231
    }),

    new THREE.MeshLambertMaterial({
      color:
        0x202c3b
    }),

    new THREE.MeshLambertMaterial({
      color:
        0x283444
    })

  ];

  const buckets =
    materials.map(
      () => []
    );

  let buildingIndex =
    0;

  for (
    let i = 0;
    i < TRACK_SAMPLE_COUNT;
    i += 15
  ) {
    const sample =
      trackSamples[i];

    for (
      const side
      of [-1, 1]
    ) {
      const distance =
        17
        +
        (
          buildingIndex *
          5
        )
        %
        9;

      const height =
        9
        +
        (
          buildingIndex *
          17
        )
        %
        18;

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
        7
        +
        (
          buildingIndex *
          11
        )
        %
        7;

      const position =
        sample.point
          .clone()
          .addScaledVector(
            sample.normal,
            side *
            distance
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

          buildingGeometry,

          materials[
            bucketIndex
          ],

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

  buildStreetLights();

  buildNeonSigns();
}

function buildStreetLights() {
  const poleGeometry =
    new THREE.CylinderGeometry(
      0.055,
      0.075,
      5.0,
      6
    );

  const poleMaterial =
    new THREE.MeshLambertMaterial({
      color:
        0x515d6d
    });

  const lightGeometry =
    new THREE.BoxGeometry(
      0.20,
      0.12,
      0.78
    );

  const lightMaterial =
    new THREE.MeshBasicMaterial({
      color:
        0xcbe1ff
    });

  for (
    let i = 0;
    i < TRACK_SAMPLE_COUNT;
    i += 24
  ) {
    const sample =
      trackSamples[i];

    for (
      const side
      of [-1, 1]
    ) {
      const base =
        sample.point
          .clone()
          .addScaledVector(
            sample.normal,
            side *
            8.1
          );

      const pole =
        new THREE.Mesh(
          poleGeometry,
          poleMaterial
        );

      pole.position.copy(
        base
      );

      pole.position.y =
        2.5;

      const light =
        new THREE.Mesh(
          lightGeometry,
          lightMaterial
        );

      light.position.copy(
        base
      );

      light.position.y =
        4.95;

      light.rotation.y =
        sample.rotationY;

      worldGroup.add(
        pole,
        light
      );
    }
  }
}

function buildNeonSigns() {
  const signs = [
    {
      t: 0.12,
      side: 1,
      color: 0x4e91ff
    },

    {
      t: 0.34,
      side: -1,
      color: 0xff4e73
    },

    {
      t: 0.58,
      side: 1,
      color: 0x8a64ff
    },

    {
      t: 0.78,
      side: -1,
      color: 0x39d9ff
    }
  ];

  for (
    const signDef
    of signs
  ) {
    const frame =
      getFrameAt(
        signDef.t
      );

    const sign =
      new THREE.Mesh(

        new THREE.BoxGeometry(
          5.0,
          1.25,
          0.15
        ),

        new THREE.MeshBasicMaterial({
          color:
            signDef.color
        })

      );

    sign.position
      .copy(
        frame.point
      )
      .addScaledVector(
        frame.normal,
        signDef.side *
        11.8
      );

    sign.position.y =
      4.4;

    sign.rotation.y =
      frame.rotationY;

    worldGroup.add(
      sign
    );
  }
}

/* =========================================================
   VISIBLE PHYSICAL BARRIERS
   ========================================================= */

function sectionContains(
  t,
  start,
  end
) {
  if (
    start <= end
  ) {
    return (
      t >= start
      &&
      t <= end
    );
  }

  return (
    t >= start
    ||
    t <= end
  );
}

function buildBarriers() {
  barriers = [];

  const material =
    new THREE.MeshLambertMaterial({
      color:
        0x697688
    });

  for (
    const section
    of barrierSections
  ) {
    for (
      let i = 0;
      i < TRACK_SAMPLE_COUNT;
      i += 3
    ) {
      const t =
        i /
        TRACK_SAMPLE_COUNT;

      if (
        !sectionContains(
          t,
          section.start,
          section.end
        )
      ) {
        continue;
      }

      const nextIndex =
        (
          i +
          3
        )
        %
        TRACK_SAMPLE_COUNT;

      const aSample =
        trackSamples[i];

      const bSample =
        trackSamples[
          nextIndex
        ];

      const a =
        aSample.point
          .clone()
          .addScaledVector(
            aSample.normal,

            section.side *
            (
              SIDEWALK_OUTER +
              0.45
            )
          );

      const b =
        bSample.point
          .clone()
          .addScaledVector(
            bSample.normal,

            section.side *
            (
              SIDEWALK_OUTER +
              0.45
            )
          );

      const midpoint =
        a
          .clone()
          .add(b)
          .multiplyScalar(
            0.5
          );

      const segment =
        b
          .clone()
          .sub(a);

      const length =
        segment.length();

      const rail =
        new THREE.Mesh(

          new THREE.BoxGeometry(
            0.28,
            0.80,
            length
          ),

          material

        );

      rail.position.copy(
        midpoint
      );

      rail.position.y =
        0.45;

      rail.rotation.y =
        Math.atan2(
          segment.x,
          segment.z
        );

      worldGroup.add(
        rail
      );

      barriers.push({
        a:
          new THREE.Vector2(
            a.x,
            a.z
          ),

        b:
          new THREE.Vector2(
            b.x,
            b.z
          )
      });
    }
  }
}

function collideWithBarriers() {
  const player =
    new THREE.Vector2(
      car.position.x,
      car.position.z
    );

  for (
    const barrier
    of barriers
  ) {
    const ab =
      barrier.b
        .clone()
        .sub(
          barrier.a
        );

    const lengthSq =
      ab.lengthSq()
      ||
      1;

    const t =
      THREE.MathUtils.clamp(

        player
          .clone()
          .sub(
            barrier.a
          )
          .dot(ab)

        /

        lengthSq,

        0,
        1

      );

    const closest =
      barrier.a
        .clone()
        .add(
          ab.multiplyScalar(
            t
          )
        );

    const delta =
      player
        .clone()
        .sub(
          closest
        );

    const distance =
      delta.length();

    const collisionDistance =
      CAR_RADIUS +
      0.18;

    if (
      distance >=
      collisionDistance
    ) {
      continue;
    }

    let normal;

    if (
      distance >
      0.0001
    ) {
      normal =
        delta.multiplyScalar(
          1 /
          distance
        );
    } else {
      const direction =
        barrier.b
          .clone()
          .sub(
            barrier.a
          )
          .normalize();

      normal =
        new THREE.Vector2(
          -direction.y,
          direction.x
        );
    }

    const penetration =
      collisionDistance -
      distance;

    car.position.x +=
      normal.x *
      penetration;

    car.position.z +=
      normal.y *
      penetration;

    const normal3D =
      new THREE.Vector3(
        normal.x,
        0,
        normal.y
      );

    const velocityNormal =
      carState.velocity
        .dot(
          normal3D
        );

    if (
      velocityNormal <
      0
    ) {
      carState.velocity
        .addScaledVector(
          normal3D,
          -1.55 *
          velocityNormal
        );
    }

    carState.velocity
      .multiplyScalar(
        0.72
      );

    if (
      carState.impactCooldown <=
      0

      &&

      carState.velocity.length() >
      8
    ) {
      showRacePopup(
        "BARRIER HIT",
        420
      );

      carState.impactCooldown =
        0.4;
    }
  }
}

/* =========================================================
   OBSTACLES
   ========================================================= */

function buildObstacles() {
  obstacles = [];

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
            3.7
          ),

          new THREE.MeshLambertMaterial({
            color:
              0x667080
          })

        );

      body.position.y =
        0.54;

      const cabin =
        new THREE.Mesh(

          new THREE.BoxGeometry(
            1.45,
            0.48,
            1.55
          ),

          new THREE.MeshLambertMaterial({
            color:
              0x171d26
          })

        );

      cabin.position.set(
        0,
        0.95,
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
            2.5,
            1.0,
            0.72
          ),

          new THREE.MeshLambertMaterial({
            color:
              0xd7dce4
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

function collideWithObstacles() {
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
      CAR_RADIUS;

    if (
      distance >=
      minimum
    ) {
      continue;
    }

    const safeDistance =
      Math.max(
        distance,
        0.001
      );

    const nx =
      dx /
      safeDistance;

    const nz =
      dz /
      safeDistance;

    const penetration =
      minimum -
      distance;

    car.position.x +=
      nx *
      penetration;

    car.position.z +=
      nz *
      penetration;

    const normal =
      new THREE.Vector3(
        nx,
        0,
        nz
      );

    const velocityNormal =
      carState.velocity
        .dot(
          normal
        );

    if (
      velocityNormal <
      0
    ) {
      carState.velocity
        .addScaledVector(
          normal,
          -1.35 *
          velocityNormal
        );
    }

    carState.velocity
      .multiplyScalar(
        0.58
      );

    if (
      carState.impactCooldown <=
      0
    ) {
      showRacePopup(
        "CRASH",
        450
      );

      carState.impactCooldown =
        0.5;
    }
  }
}

/* =========================================================
   CHECKPOINTS
   ========================================================= */

function buildCheckpointGates() {
  checkpointGates = [];

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
            index ===
            0
            ?
            0x5a9cff
            :
            0x657186
        });

      const poleGeometry =
        new THREE.BoxGeometry(
          0.22,
          5.0,
          0.22
        );

      const beamGeometry =
        new THREE.BoxGeometry(
          ROAD_HALF *
          2
          +
          2.0,

          0.30,
          0.26
        );

      const left =
        new THREE.Mesh(
          poleGeometry,
          material
        );

      const right =
        new THREE.Mesh(
          poleGeometry,
          material
        );

      const beam =
        new THREE.Mesh(
          beamGeometry,
          material
        );

      left.position.set(
        -(
          ROAD_HALF +
          0.7
        ),
        2.5,
        0
      );

      right.position.set(
        ROAD_HALF +
        0.7,
        2.5,
        0
      );

      beam.position.set(
        0,
        4.95,
        0
      );

      group.add(
        left,
        right,
        beam
      );

      worldGroup.add(
        group
      );

      checkpointGates.push({
        group,
        material,

        point:
          frame.point.clone(),

        t
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
      gate.material.color
        .setHex(
          index ===
          checkpointStep
          ?
          0x5a9cff
          :
          0x657186
        );
    }
  );
}

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
    7.0
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
   BOOST PADS
   ========================================================= */

function buildBoostPads() {
  boostPads = [];

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
      const forward =
        forwardVector();

      const forwardSpeed =
        carState.velocity
          .dot(
            forward
          );

      if (
        forwardSpeed <
        33
      ) {
        carState.velocity
          .addScaledVector(
            forward,
            33 -
            forwardSpeed
          );
      }

      carState.boostTimer =
        1.3;

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
   PICKUPS
   ========================================================= */

function buildPickups() {
  pickups = [];

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
            3.2
          );

        showRacePopup(
          "OVERDRIVE",
          600
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
          600
        );
      }
    }
  }
}

/* =========================================================
   PLAYER CAR
   ========================================================= */

function makeCar() {
  const group =
    new THREE.Group();

  const bodyMaterial =
    new THREE.MeshLambertMaterial({
      color:
        0xe8edf4
    });

  const glassMaterial =
    new THREE.MeshLambertMaterial({
      color:
        0x151b24
    });

  const tireMaterial =
    new THREE.MeshLambertMaterial({
      color:
        0x07090d
    });

  const tailMaterial =
    new THREE.MeshBasicMaterial({
      color:
        0xff3c4f
    });

  const body =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        1.92,
        0.42,
        3.85
      ),

      bodyMaterial

    );

  body.position.y =
    0.56;

  const cabin =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        1.48,
        0.55,
        1.55
      ),

      glassMaterial

    );

  cabin.position.set(
    0,
    0.96,
    -0.18
  );

  const hood =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        1.72,
        0.16,
        1.05
      ),

      bodyMaterial

    );

  hood.position.set(
    0,
    0.78,
    1.18
  );

  const spoiler =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        1.62,
        0.10,
        0.30
      ),

      glassMaterial

    );

  spoiler.position.set(
    0,
    0.96,
    -1.72
  );

  const tailLeft =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        0.44,
        0.13,
        0.06
      ),

      tailMaterial

    );

  tailLeft.position.set(
    -0.53,
    0.61,
    -1.94
  );

  const tailRight =
    tailLeft.clone();

  tailRight.position.x =
    0.53;

  group.add(
    body,
    cabin,
    hood,
    spoiler,
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
    of [-0.95, 0.95]
  ) {
    for (
      const z
      of [-1.24, 1.24]
    ) {
      const wheel =
        new THREE.Mesh(
          wheelGeometry,
          tireMaterial
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
   V4 PHYSICS
   ========================================================= */

function updatePhysics(
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

  const roadInfo =
    nearestTrackInfo(
      car.position
    );

  const surface =
    getSurface(
      roadInfo
    );

  const throttle =
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

  let forward =
    forwardVector();

  let rightVec =
    rightVector();

  let forwardSpeed =
    carState.velocity
      .dot(
        forward
      );

  let lateralSpeed =
    carState.velocity
      .dot(
        rightVec
      );

  const speed =
    carState.velocity.length();

  const speedFactor =
    THREE.MathUtils.clamp(
      Math.abs(
        forwardSpeed
      )
      /
      14,
      0,
      1
    );

  let steerRate =
    1.32
    *
    surface.steer;

  if (
    handbrake
  ) {
    steerRate *=
      1.55;
  }

  if (
    speed >
    40

    &&

    !handbrake
  ) {
    steerRate *=
      0.82;
  }

  const direction =
    forwardSpeed >=
    -0.3
    ?
    1
    :
    -1;

  car.rotation.y +=
    carState.steer
    *
    steerRate
    *
    speedFactor
    *
    delta
    *
    direction;

  forward =
    forwardVector();

  rightVec =
    rightVector();

  forwardSpeed =
    carState.velocity
      .dot(
        forward
      );

  lateralSpeed =
    carState.velocity
      .dot(
        rightVec
      );

  const overdrive =
    carState.overdriveTimer >
    0;

  const baseAcceleration =
    overdrive
    ?
    27
    :
    19;

  /*
    THROTTLE
  */

  if (
    throttle
  ) {
    carState.velocity
      .addScaledVector(
        forward,

        baseAcceleration
        *
        surface.acceleration
        *
        delta
      );
  }

  /*
    BRAKING / REVERSE
  */

  if (
    brake
  ) {
    if (
      forwardSpeed >
      1.5
    ) {
      const braking =
        Math.min(
          forwardSpeed,
          34 *
          delta
        );

      carState.velocity
        .addScaledVector(
          forward,
          -braking
        );
    }

    else {
      carState.velocity
        .addScaledVector(
          forward,

          -10.5
          *
          surface.acceleration
          *
          delta
        );
    }
  }

  /*
    NITRO
  */

  if (
    nitroActive

    &&

    forwardSpeed >
    3
  ) {
    carState.nitro =
      Math.max(
        0,
        carState.nitro -
        24 *
        delta
      );

    carState.velocity
      .addScaledVector(
        forward,
        22 *
        delta
      );
  }

  else {
    carState.nitro =
      Math.min(
        100,
        carState.nitro +
        3.7 *
        delta
      );
  }

  /*
    TIRE GRIP

    This is what lets the car slide.
    Handbrake greatly lowers lateral grip.
  */

  const grip =
    handbrake
    ?
    surface.grip *
    0.16
    :
    surface.grip;

  const lateralCorrection =
    THREE.MathUtils.clamp(
      grip *
      delta,
      0,
      1
    );

  carState.velocity
    .addScaledVector(
      rightVec,

      -lateralSpeed
      *
      lateralCorrection
    );

  /*
    SURFACE DRAG
  */

  const dragFactor =
    Math.exp(
      -surface.drag *
      delta
    );

  carState.velocity
    .multiplyScalar(
      dragFactor
    );

  /*
    HIGH SPEED AERO DRAG
  */

  const currentSpeed =
    carState.velocity.length();

  if (
    currentSpeed >
    42
  ) {
    carState.velocity
      .multiplyScalar(
        Math.exp(
          -(
            currentSpeed -
            42
          )
          *
          0.016
          *
          delta
        )
      );
  }

  const maxSpeed =
    carState.boostTimer >
    0
    ||
    overdrive
    ?
    70
    :
    (
      nitroActive
      ?
      61
      :
      50
    );

  if (
    carState.velocity.length() >
    maxSpeed
  ) {
    carState.velocity
      .setLength(
        maxSpeed
      );
  }

  /*
    ACTUAL MOVEMENT

    Notice there is NO track clamp here.
  */

  car.position
    .addScaledVector(
      carState.velocity,
      delta
    );

  /*
    BODY ROLL
  */

  car.rotation.z =
    THREE.MathUtils.lerp(
      car.rotation.z,

      -carState.steer
      *
      Math.min(
        carState.velocity.length()
        /
        45,
        1
      )
      *
      0.055,

      0.12
    );

  /*
    REAL VISIBLE COLLISIONS
  */

  collideWithBarriers();

  collideWithObstacles();

  updateBoostPads(
    delta
  );

  updatePickups(
    delta,
    clock.elapsedTime
  );

  updateTransmission();

  updateCheckpoints();

  updateNavigation(
    delta,
    roadInfo
  );
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
      rightVector();

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

    const absolute =
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
      absolute <
      16
    ) {
      navigationText.textContent =
        "STRAIGHT";
    }

    else if (
      absolute <
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

    carState.velocity.length() >
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
   CAMERA
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

  const speed =
    carState.velocity.length();

  const speed01 =
    THREE.MathUtils.clamp(
      speed /
      60,
      0,
      1
    );

  /*
    Camera slightly follows actual
    velocity during a drift.
  */

  const velocityDirection =
    carState.velocity.lengthSq() >
    0.1
    ?
    carState.velocity
      .clone()
      .normalize()
    :
    forward.clone();

  const cameraForward =
    forward
      .clone()
      .lerp(
        velocityDirection,
        0.18
      )
      .normalize();

  const desired =
    car.position
      .clone()
      .add(
        new THREE.Vector3(
          0,
          2.9
          +
          speed01 *
          0.4,
          0
        )
      )
      .addScaledVector(
        cameraForward,
        -(
          7.1
          +
          speed01 *
          1.6
        )
      );

  const smoothing =
    1
    -
    Math.pow(
      0.0015,
      delta
    );

  camera.position
    .lerp(
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
        cameraForward,
        6
        +
        speed01 *
        4.5
      );

  camera.lookAt(
    lookAt
  );

  camera.fov =
    THREE.MathUtils.lerp(
      camera.fov,
      64
      +
      speed01 *
      13,
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

  const mph =
    Math.round(
      carState.velocity.length()
      *
      2.45
    );

  speedEl.textContent =
    mph;

  const forwardSpeed =
    carState.velocity
      .dot(
        forwardVector()
      );

  gearEl.textContent =
    forwardSpeed <
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
   WORLD
   ========================================================= */

function buildWorld() {
  disposeWorld();

  worldGroup =
    new THREE.Group();

  scene.add(
    worldGroup
  );

  sampleTrack();

  buildCity();

  buildRoad();

  buildBarriers();

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
   START / FINISH
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
  "Neon District V4 — free off-track driving, real barriers and drift physics.";

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

  updatePhysics(
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
   INITIAL PREVIEW
   ========================================================= */

buildWorld();

requestAnimationFrame(
  gameLoop
);
