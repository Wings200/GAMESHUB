import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
const $ = id => document.getElementById(id);
const canvas = $("gameCanvas");
const menu = $("menu");
const hud = $("hud");
const startBtn = $("startBtn");
const trackSelect = $("trackSelect");
const trackDescription = $("trackDescription");
const trackNameEl = $("trackName");
const objectiveEl = $("objective");
const checkpointText = $("checkpointText");
const directionArrow = $("directionArrow");
const navigationText = $("navigationText");
const checkpointDistance = $("checkpointDistance");
const wrongWay = $("wrongWay");
const racePositionEl = $("racePosition");
const totalRacersEl = $("totalRacers");
const raceTimerEl = $("raceTimer");
const minimap = $("minimap");
const mapCtx = minimap.getContext("2d");
const speedEl = $("speed");
const gearEl = $("gear");
const rpmBar = $("rpmBar");
const nitroBar = $("nitroBar");
const nitroPercent = $("nitroPercent");
const fpsEl = $("fps");
const countdown = $("countdown");
const checkpointPopup = $("checkpointPopup");
const message = $("message");
const selectedCarName = $("selectedCarName");
const speedStat = $("speedStat");
const accelStat = $("accelStat");
const gripStat = $("gripStat");
const driftStat = $("driftStat");
const carCards = [
    ...document.querySelectorAll(".car-card")
];
const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: "high-performance"
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(1);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060c16);
scene.fog = new THREE.Fog(0x060c16, 105, 290);
const camera = new THREE.PerspectiveCamera(66, 16 / 9, 0.1, 440);
scene.add(new THREE.HemisphereLight(0xc7dcff, 0x0d1420, 1.75));
const moonLight = new THREE.DirectionalLight(0xdee9ff, 1.18);
moonLight.position.set(-35, 55, 25);
scene.add(moonLight);
const fillLight = new THREE.DirectionalLight(0x637cff, 0.30);
fillLight.position.set(40, 18, -30);
scene.add(fillLight);
const clock = new THREE.Clock();
const keys = new Set();
const quality = {
    renderScale: 0.76
};
let fpsFrames = 0;
let lastFpsTime = performance.now();
function resizeRenderer() {
    const width = Math.max(320, window.innerWidth);
    const height = Math.max(240, window.innerHeight);
    renderer.setSize(Math.floor(width *
        quality.renderScale), Math.floor(height *
        quality.renderScale), false);
    canvas.style.width =
        `${width}px`;
    canvas.style.height =
        `${height}px`;
    camera.aspect =
        width /
            height;
    camera.updateProjectionMatrix();
}
window.addEventListener("resize", resizeRenderer);
resizeRenderer();
const ROAD_HALF = 6.6;
const SIDEWALK_OUTER = 9.2;
const CAR_RADIUS = 0.95;

const TRACKS = {
    neon: {
        id: "neon",
        name: "NEON DISTRICT",
        description: "Neon District — tight city streets, boost pads, traffic obstacles and three fast laps.",
        sampleCount: 300,
        laps: 3,
        background: 0x060c16,
        fogNear: 105,
        fogFar: 290,
        controlPoints: [
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
        ],
        checkpoints: [
            0.09,
            0.23,
            0.37,
            0.51,
            0.65,
            0.79,
            0.93
        ],
        crosswalks: [
            0.035,
            0.285,
            0.585,
            0.835
        ],
        barriers: [
            { start: 0.17, end: 0.28, side: 1 },
            { start: 0.30, end: 0.39, side: -1 },
            { start: 0.45, end: 0.57, side: 1 },
            { start: 0.61, end: 0.70, side: -1 },
            { start: 0.76, end: 0.86, side: 1 },
            { start: 0.89, end: 0.98, side: -1 }
        ],
        obstacles: [
            { t: 0.29, offset: 2.7, kind: "barrier", radius: 1.2 },
            { t: 0.55, offset: -2.7, kind: "parked", radius: 1.4 },
            { t: 0.875, offset: 2.4, kind: "barrier", radius: 1.2 }
        ],
        boosts: [
            { t: 0.16, offset: -1.9 },
            { t: 0.62, offset: 1.8 }
        ],
        pickups: [
            { t: 0.40, offset: -2.2, type: "overdrive" },
            { t: 0.82, offset: 2.0, type: "nitro" }
        ],
        ramps: []
    },

    arctic: {
        id: "arctic",
        name: "ARCTIC RELAY",
        description: "Arctic Relay — a huge one-lap ice run with ramps, power-ups, obstacles and hidden shortcut jumps.",
        sampleCount: 560,
        laps: 1,
        background: 0x07131f,
        fogNear: 150,
        fogFar: 430,
        controlPoints: [
            [-30, 285],
            [75, 305],
            [175, 275],
            [260, 205],
            [315, 105],
            [320, -10],
            [285, -125],
            [215, -225],
            [110, -285],
            [-10, -310],
            [-135, -285],
            [-245, -225],
            [-315, -135],
            [-345, -25],
            [-325, 95],
            [-275, 195],
            [-185, 265],
            [-95, 295]
        ],
        checkpoints: [
            0.06,
            0.14,
            0.22,
            0.30,
            0.38,
            0.46,
            0.54,
            0.62,
            0.70,
            0.78,
            0.86,
            0.94
        ],
        crosswalks: [],
        barriers: [
            { start: 0.03, end: 0.10, side: -1 },
            { start: 0.15, end: 0.21, side: 1 },
            { start: 0.28, end: 0.36, side: -1 },
            { start: 0.40, end: 0.47, side: 1 },
            { start: 0.55, end: 0.61, side: -1 },
            { start: 0.66, end: 0.73, side: 1 },
            { start: 0.82, end: 0.89, side: -1 },
            { start: 0.93, end: 0.985, side: 1 }
        ],
        obstacles: [
            { t: 0.105, offset: 2.2, kind: "ice", radius: 1.35 },
            { t: 0.175, offset: -2.6, kind: "snowbarrier", radius: 1.25 },
            { t: 0.265, offset: 2.9, kind: "ice", radius: 1.4 },
            { t: 0.355, offset: -2.1, kind: "ice", radius: 1.25 },
            { t: 0.435, offset: 2.5, kind: "snowbarrier", radius: 1.25 },
            { t: 0.515, offset: -2.7, kind: "ice", radius: 1.4 },
            { t: 0.645, offset: 2.0, kind: "ice", radius: 1.3 },
            { t: 0.735, offset: -2.8, kind: "snowbarrier", radius: 1.25 },
            { t: 0.825, offset: 2.4, kind: "ice", radius: 1.35 },
            { t: 0.915, offset: -2.3, kind: "ice", radius: 1.3 }
        ],
        boosts: [
            { t: 0.075, offset: -1.8 },
            { t: 0.185, offset: 1.8 },
            { t: 0.335, offset: -1.7 },
            { t: 0.475, offset: 1.7 },
            { t: 0.655, offset: -1.8 },
            { t: 0.815, offset: 1.8 },
            { t: 0.955, offset: 0 }
        ],
        pickups: [
            { t: 0.12, offset: 2.0, type: "nitro" },
            { t: 0.245, offset: -2.0, type: "overdrive" },
            { t: 0.37, offset: 1.9, type: "nitro" },
            { t: 0.505, offset: -1.8, type: "overdrive" },
            { t: 0.59, offset: 2.0, type: "nitro" },
            { t: 0.72, offset: -1.9, type: "overdrive" },
            { t: 0.84, offset: 2.1, type: "nitro" },
            { t: 0.965, offset: -1.8, type: "overdrive" }
        ],
        ramps: [
            { t: 0.10, offset: 0, strength: 7.5, secret: false },
            { t: 0.34, offset: -2.1, strength: 8.0, secret: false },
            { t: 0.49, offset: 2.0, strength: 7.7, secret: false },
            { t: 0.68, offset: 0.8, strength: 8.2, secret: false },
            { t: 0.90, offset: -1.6, strength: 8.5, secret: false },

            { t: 0.232, offset: 8.4, strength: 9.2, secret: true, targetT: 0.287, minSpeed: 24 },
            { t: 0.552, offset: -8.5, strength: 9.4, secret: true, targetT: 0.607, minSpeed: 27 },
            { t: 0.792, offset: 8.3, strength: 9.6, secret: true, targetT: 0.847, minSpeed: 29 }
        ]
    }
};

let activeTrackId = "neon";
let TRACK_SAMPLE_COUNT = 300;
let TARGET_LAPS = 3;
let checkpointTs = [];
let crosswalkTs = [];
let barrierSections = [];
let obstacleDefinitions = [];
let boostDefinitions = [];
let pickupDefinitions = [];
let rampDefinitions = [];
let curve = null;

function applyTrackConfig(trackId) {
    const config =
        TRACKS[trackId]
        ||
        TRACKS.neon;

    activeTrackId =
        config.id;

    TRACK_SAMPLE_COUNT =
        config.sampleCount;

    TARGET_LAPS =
        config.laps;

    checkpointTs =
        [...config.checkpoints];

    crosswalkTs =
        [...config.crosswalks];

    barrierSections =
        config.barriers.map(section => ({ ...section }));

    obstacleDefinitions =
        config.obstacles.map(obstacle => ({ ...obstacle }));

    boostDefinitions =
        config.boosts.map(boost => ({ ...boost }));

    pickupDefinitions =
        config.pickups.map(pickup => ({ ...pickup }));

    rampDefinitions =
        config.ramps.map(ramp => ({ ...ramp }));

    curve =
        new THREE.CatmullRomCurve3(
            config.controlPoints.map(
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

    scene.background =
        new THREE.Color(
            config.background
        );

    scene.fog =
        new THREE.Fog(
            config.background,
            config.fogNear,
            config.fogFar
        );

    camera.far =
        activeTrackId ===
        "arctic"
            ?
            900
            :
            440;

    camera.updateProjectionMatrix();

    return config;
}

applyTrackConfig(
    "neon"
);
const cars = {
    gt: {
        name: "REDLINE GT",
        topSpeed: 50,
        nitroSpeed: 61,
        boostSpeed: 70,
        acceleration: 19,
        reverseAcceleration: 10.5,
        braking: 34,
        grip: 8.5,
        driftGrip: 1.36,
        steer: 1.32,
        highSpeedSteer: 0.82,
        drag: 0.34,
        stats: {
            speed: 76,
            accel: 78,
            grip: 75,
            drift: 70
        },
        body: 0xe9edf2,
        accent: 0x315fbd,
        glass: 0x111820,
        model: "gt"
    },
    vortex: {
        name: "VORTEX R",
        topSpeed: 64,
        nitroSpeed: 76,
        boostSpeed: 84,
        acceleration: 18.5,
        reverseAcceleration: 9.5,
        braking: 31,
        grip: 7.1,
        driftGrip: 0.95,
        steer: 1.08,
        highSpeedSteer: 0.68,
        drag: 0.20,
        stats: {
            speed: 98,
            accel: 74,
            grip: 58,
            drift: 63
        },
        body: 0xb72f43,
        accent: 0x191d24,
        glass: 0x080c11,
        model: "vortex"
    },
    apex: {
        name: "APEX S",
        topSpeed: 46,
        nitroSpeed: 56,
        boostSpeed: 64,
        acceleration: 21.5,
        reverseAcceleration: 11.5,
        braking: 38,
        grip: 10.2,
        driftGrip: 1.18,
        steer: 1.52,
        highSpeedSteer: 0.92,
        drag: 0.40,
        stats: {
            speed: 68,
            accel: 90,
            grip: 92,
            drift: 86
        },
        body: 0x36a697,
        accent: 0x15282c,
        glass: 0x0c1a20,
        model: "apex"
    }
};
let selectedCar = "gt";
let activeCarSpec = cars.gt;
let worldGroup = null;
let effectsGroup = null;
let trackSamples = [];
let checkpointGates = [];
let barriers = [];
let obstacles = [];
let boostPads = [];
let pickups = [];
let ramps = [];
let surfaceZones = [];
let car = null;
let carState = null;
let carVisual = null;
let raceActive = false;
let checkpointStep = 0;
let lastCheckpointTransform = null;
let lap = 1;
let wrongWayTimer = 0;
let checkpointPopupTimer = null;
let raceStarted = false;
let serverRaceStartAt = null;
let localFinished = false;
let localFinishElapsed = null;
let goHideAt = 0;
let lastNetworkSend = 0;
const NETWORK_INTERVAL = 80;
const remoteRacers = new Map();
const raceStates = new Map();
let finishOrder = [];
const fx = {
    smoke: [],
    smokeIndex: 0,
    skidMarks: [],
    skidIndex: 0,
    sparks: [],
    sparkIndex: 0
};
function material(color, roughness = 0.45, metalness = 0.18) {
    return new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness
    });
}
function addMesh(parent, geometry, meshMaterial, x, y, z) {
    const object = new THREE.Mesh(geometry, meshMaterial);
    object.position.set(x, y, z);
    parent.add(object);
    return object;
}
function createWedgeGeometry(width, length, frontHeight, rearHeight, topScale = 0.82) {
    const halfWidth = width / 2;
    const halfLength = length / 2;
    const topHalfWidth = halfWidth *
        topScale;
    const vertices = new Float32Array([
        -halfWidth,
        0,
        halfLength,
        halfWidth,
        0,
        halfLength,
        halfWidth,
        0,
        -halfLength,
        -halfWidth,
        0,
        -halfLength,
        -topHalfWidth,
        frontHeight,
        halfLength,
        topHalfWidth,
        frontHeight,
        halfLength,
        topHalfWidth,
        rearHeight,
        -halfLength,
        -topHalfWidth,
        rearHeight,
        -halfLength
    ]);
    const indices = [
        0, 2, 1,
        0, 3, 2,
        4, 5, 6,
        4, 6, 7,
        0, 1, 5,
        0, 5, 4,
        1, 2, 6,
        1, 6, 5,
        2, 3, 7,
        2, 7, 6,
        3, 0, 4,
        3, 4, 7
    ];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
}
function createTextTexture(text, foreground = "#ffffff", background = "#111827") {
    const c = document.createElement("canvas");
    c.width =
        512;
    c.height =
        160;
    const ctx = c.getContext("2d");
    ctx.fillStyle =
        background;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle =
        foreground;
    ctx.font =
        "900 66px Arial";
    ctx.textAlign =
        "center";
    ctx.textBaseline =
        "middle";
    ctx.fillText(text, c.width / 2, c.height / 2 + 2);
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace =
        THREE.SRGBColorSpace;
    texture.minFilter =
        THREE.LinearFilter;
    return texture;
}
function getFrameAt(t) {
    const wrapped = ((t %
        1)
        +
            1)
        %
            1;
    const point = curve.getPointAt(wrapped);
    const tangent = curve
        .getTangentAt(wrapped)
        .normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x)
        .normalize();
    return {
        t: wrapped,
        point,
        tangent,
        normal,
        rotationY: Math.atan2(tangent.x, tangent.z)
    };
}
function forwardVector() {
    return new THREE.Vector3(Math.sin(car.rotation.y), 0, Math.cos(car.rotation.y));
}
function rightVector() {
    const forward = forwardVector();
    return new THREE.Vector3(forward.z, 0, -forward.x);
}
function flatDistance(a, b) {
    return Math.hypot(a.x -
        b.x, a.z -
        b.z);
}
function sampleTrack() {
    trackSamples =
        [];
    for (let i = 0; i < TRACK_SAMPLE_COUNT; i++) {
        const frame = getFrameAt(i /
            TRACK_SAMPLE_COUNT);
        trackSamples.push({
            ...frame,
            index: i
        });
    }
}
function nearestTrackInfo(position) {
    let best = null;
    for (const sample of trackSamples) {
        const dx = position.x -
            sample.point.x;
        const dz = position.z -
            sample.point.z;
        const distanceSq = dx *
            dx
            +
                dz *
                    dz;
        if (!best
            ||
                distanceSq <
                    best.distanceSq) {
            const offset = dx *
                sample.normal.x
                +
                    dz *
                        sample.normal.z;
            best = {
                ...sample,
                distanceSq,
                distance: Math.sqrt(distanceSq),
                offset
            };
        }
    }
    return best;
}
function pointInsideZone(position, zone) {
    const dx = position.x -
        zone.center.x;
    const dz = position.z -
        zone.center.z;
    const along = dx *
        zone.tangent.x
        +
            dz *
                zone.tangent.z;
    const across = dx *
        zone.normal.x
        +
            dz *
                zone.normal.z;
    return (Math.abs(along)
        <=
            zone.halfLength
        &&
            Math.abs(across)
                <=
                    zone.halfWidth);
}
function localPoint(zone, across, along, y = 0) {
    return zone.center
        .clone()
        .addScaledVector(zone.normal, across)
        .addScaledVector(zone.tangent, along)
        .setY(y);
}
function getSurface(roadInfo) {
    for (const zone of surfaceZones) {
        if (pointInsideZone(car.position, zone)) {
            return {
                name: "ASPHALT",
                acceleration: 0.96,
                gripMultiplier: 0.96,
                drag: 1.06,
                steer: 0.98
            };
        }
    }
    const distance = Math.abs(roadInfo.offset);
    if (distance <=
        ROAD_HALF) {
        return {
            name: "ASPHALT",
            acceleration: 1,
            gripMultiplier: 1,
            drag: 1,
            steer: 1
        };
    }
    if (distance <=
        SIDEWALK_OUTER) {
        return {
            name: "SIDEWALK",
            acceleration: 0.72,
            gripMultiplier: 0.74,
            drag: 2.3,
            steer: 0.88
        };
    }
    return {
        name: "ROUGH",
        acceleration: 0.46,
        gripMultiplier: 0.42,
        drag: 6.7,
        steer: 0.68
    };
}
function disposeWorld() {
    remoteRacers.clear();
    raceStates.clear();
    finishOrder =
        [];
    if (!worldGroup) {
        return;
    }
    worldGroup.traverse(object => {
        object.geometry
            ?.dispose?.();
        if (object.material) {
            const list = Array.isArray(object.material)
                ?
                    object.material
                :
                    [
                        object.material
                    ];
            list.forEach(mat => mat.dispose?.());
        }
    });
    scene.remove(worldGroup);
    worldGroup =
        null;
    effectsGroup =
        null;
    fx.smoke =
        [];
    fx.skidMarks =
        [];
    fx.sparks =
        [];
    fx.smokeIndex =
        0;
    fx.skidIndex =
        0;
    fx.sparkIndex =
        0;
}
function makeRibbon(innerDistance, outerDistance, color, y = 0.02, roughness = 0.9) {
    const vertices = [];
    const indices = [];
    for (let i = 0; i < TRACK_SAMPLE_COUNT; i++) {
        const sample = trackSamples[i];
        const inner = sample.point
            .clone()
            .addScaledVector(sample.normal, innerDistance);
        const outer = sample.point
            .clone()
            .addScaledVector(sample.normal, outerDistance);
        inner.y =
            y;
        outer.y =
            y;
        vertices.push(inner.x, inner.y, inner.z, outer.x, outer.y, outer.z);
    }
    for (let i = 0; i < TRACK_SAMPLE_COUNT; i++) {
        const next = (i +
            1)
            %
                TRACK_SAMPLE_COUNT;
        const a = i *
            2;
        const b = a +
            1;
        const c = next *
            2;
        const d = c +
            1;
        indices.push(a, c, b, c, d, b);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness: 0.03,
        side: THREE.DoubleSide
    }));
}
function buildRoad() {
    const roadColor =
        activeTrackId ===
        "arctic"
            ?
            0x263746
            :
            0x1b2430;

    const shoulderColor =
        activeTrackId ===
        "arctic"
            ?
            0xa9bcc9
            :
            0x39414b;

    const edgeColor =
        activeTrackId ===
        "arctic"
            ?
            0xe5f2f7
            :
            0xbec7d3;

    worldGroup.add(
        makeRibbon(-ROAD_HALF, ROAD_HALF, roadColor, 0.04, 0.78),
        makeRibbon(ROAD_HALF, SIDEWALK_OUTER, shoulderColor, 0.055, 0.95),
        makeRibbon(-ROAD_HALF, -SIDEWALK_OUTER, shoulderColor, 0.055, 0.95),
        makeRibbon(ROAD_HALF - 0.30, ROAD_HALF + 0.12, edgeColor, 0.078, 0.8),
        makeRibbon(-ROAD_HALF + 0.30, -ROAD_HALF - 0.12, edgeColor, 0.078, 0.8),
        makeRibbon(5.55, 5.68, 0xd6dce4, 0.084, 0.8),
        makeRibbon(-5.55, -5.68, 0xd6dce4, 0.084, 0.8)
    );
    const dashSamples = [];
    for (let i = 0; i < TRACK_SAMPLE_COUNT; i += 9) {
        dashSamples.push(trackSamples[i]);
    }
    const dashes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.025, 3.0), new THREE.MeshBasicMaterial({
        color: 0xe4e7eb
    }), dashSamples.length);
    const dummy = new THREE.Object3D();
    dashSamples.forEach((sample, index) => {
        dummy.position.copy(sample.point);
        dummy.position.y =
            0.08;
        dummy.rotation.set(0, sample.rotationY, 0);
        dummy.updateMatrix();
        dashes.setMatrixAt(index, dummy.matrix);
    });
    dashes.instanceMatrix.needsUpdate =
        true;
    worldGroup.add(dashes);
    buildCrosswalks();
}
function buildCrosswalks() {
    const stripeMaterial = new THREE.MeshBasicMaterial({
        color: 0xdfe4eb
    });
    for (const t of crosswalkTs) {
        const frame = getFrameAt(t);
        const group = new THREE.Group();
        group.position.copy(frame.point);
        group.rotation.y =
            frame.rotationY;
        for (let i = -5; i <= 5; i++) {
            const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.026, ROAD_HALF *
                2 -
                0.9), stripeMaterial);
            stripe.position.set(i *
                0.95, 0.095, 0);
            stripe.rotation.y =
                Math.PI /
                    2;
            group.add(stripe);
        }
        worldGroup.add(group);
    }
}
function buildCity() {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(560, 560), new THREE.MeshStandardMaterial({
        color: 0x08111b,
        roughness: 1
    }));
    ground.rotation.x =
        -Math.PI /
            2;
    ground.position.y =
        -0.02;
    worldGroup.add(ground);
    const buildingSpecs = [];
    let buildingIndex = 0;
    for (let i = 0; i < TRACK_SAMPLE_COUNT; i += 13) {
        const sample = trackSamples[i];
        for (const side of [-1, 1]) {
            const distance = 18
                +
                    (buildingIndex *
                        7)
                        %
                            10;
            const height = 10
                +
                    (buildingIndex *
                        13)
                        %
                            22;
            const width = 7
                +
                    (buildingIndex *
                        5)
                        %
                            5;
            const depth = 8
                +
                    (buildingIndex *
                        11)
                        %
                            6;
            const position = sample.point
                .clone()
                .addScaledVector(sample.normal, side *
                distance);
            const colors = [
                0x172231,
                0x1e2938,
                0x253142,
                0x202532
            ];
            buildingSpecs.push({
                position,
                rotationY: sample.rotationY,
                normal: sample.normal.clone(),
                tangent: sample.tangent.clone(),
                side,
                width,
                height,
                depth,
                color: colors[buildingIndex %
                    colors.length],
                index: buildingIndex
            });
            buildingIndex++;
        }
    }
    const buildingMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.88,
        metalness: 0.04
    }), buildingSpecs.length);
    const dummy = new THREE.Object3D();
    buildingSpecs.forEach((b, index) => {
        dummy.position.copy(b.position);
        dummy.position.y =
            b.height /
                2;
        dummy.rotation.set(0, b.rotationY, 0);
        dummy.scale.set(b.width, b.height, b.depth);
        dummy.updateMatrix();
        buildingMesh.setMatrixAt(index, dummy.matrix);
        buildingMesh.setColorAt(index, new THREE.Color(b.color));
    });
    buildingMesh.instanceMatrix.needsUpdate =
        true;
    if (buildingMesh.instanceColor) {
        buildingMesh.instanceColor.needsUpdate =
            true;
    }
    worldGroup.add(buildingMesh);
    buildBuildingWindows(buildingSpecs);
    buildRooftopDetails(buildingSpecs);
    buildStreetLights();
    buildNeonSigns(buildingSpecs);
    buildBillboards();
    buildTrafficLights();
    buildLandmarkTower();
    buildTunnel();
}
function buildArcticEnvironment() {
    const ground =
        new THREE.Mesh(
            new THREE.PlaneGeometry(
                1500,
                1500
            ),
            new THREE.MeshStandardMaterial({
                color:
                    0xc7d5df,
                roughness:
                    1
            })
        );

    ground.rotation.x =
        -Math.PI /
        2;

    ground.position.y =
        -0.025;

    worldGroup.add(
        ground
    );


    /*
      Frozen lake / blue ice field.
    */

    const lakeFrame =
        getFrameAt(
            0.58
        );


    const lake =
        new THREE.Mesh(
            new THREE.CircleGeometry(
                78,
                40
            ),
            new THREE.MeshStandardMaterial({
                color:
                    0x6f9eb8,
                roughness:
                    0.34,
                metalness:
                    0.12,
                transparent:
                    true,
                opacity:
                    0.88
            })
        );

    lake.rotation.x =
        -Math.PI /
        2;

    lake.position
        .copy(
            lakeFrame.point
        )
        .addScaledVector(
            lakeFrame.normal,
            -68
        );

    lake.position.y =
        0.005;

    worldGroup.add(
        lake
    );


    /*
      Low-poly pine forest. Instancing keeps Arctic usable
      on Chromebook hardware even though the map is much larger.
    */

    const treeEntries =
        [];


    for (
        let i = 0;
        i < TRACK_SAMPLE_COUNT;
        i += 18
    ) {

        const sample =
            trackSamples[i];


        for (
            const side
            of [-1, 1]
        ) {

            const spread =
                21
                +
                (
                    (
                        i *
                        13
                        +
                        side *
                        7
                    )
                    %
                    17
                );


            const position =
                sample.point
                    .clone()
                    .addScaledVector(
                        sample.normal,
                        side *
                        spread
                    );


            treeEntries.push({
                position,

                height:
                    5.5
                    +
                    (
                        i %
                        9
                    )
                    *
                    0.42,

                rotation:
                    (
                        i *
                        0.31
                    )
                    %
                    (
                        Math.PI *
                        2
                    )
            });

        }

    }


    const trunks =
        new THREE.InstancedMesh(
            new THREE.CylinderGeometry(
                0.24,
                0.34,
                1,
                6
            ),
            new THREE.MeshStandardMaterial({
                color:
                    0x3a3029,
                roughness:
                    1
            }),
            treeEntries.length
        );


    const needles =
        new THREE.InstancedMesh(
            new THREE.ConeGeometry(
                1,
                1,
                7
            ),
            new THREE.MeshStandardMaterial({
                color:
                    0x173a36,
                roughness:
                    0.95
            }),
            treeEntries.length
        );


    const dummy =
        new THREE.Object3D();


    treeEntries.forEach(
        (
            tree,
            index
        ) => {

            dummy.position
                .copy(
                    tree.position
                );

            dummy.position.y =
                tree.height *
                0.18;

            dummy.rotation.set(
                0,
                tree.rotation,
                0
            );

            dummy.scale.set(
                1,
                tree.height *
                0.36,
                1
            );

            dummy.updateMatrix();

            trunks.setMatrixAt(
                index,
                dummy.matrix
            );


            dummy.position.y =
                tree.height *
                0.58;

            dummy.scale.set(
                1.7,
                tree.height *
                0.78,
                1.7
            );

            dummy.updateMatrix();

            needles.setMatrixAt(
                index,
                dummy.matrix
            );

        }
    );


    trunks.instanceMatrix.needsUpdate =
        true;

    needles.instanceMatrix.needsUpdate =
        true;

    worldGroup.add(
        trunks,
        needles
    );


    /*
      Mountain silhouettes beyond the trees.
    */

    const mountainMaterial =
        new THREE.MeshStandardMaterial({
            color:
                0x667783,
            roughness:
                1
        });


    for (
        let i = 0;
        i < TRACK_SAMPLE_COUNT;
        i += 70
    ) {

        const sample =
            trackSamples[i];


        for (
            const side
            of [-1, 1]
        ) {

            const mountain =
                new THREE.Mesh(
                    new THREE.ConeGeometry(
                        25
                        +
                        (
                            i %
                            4
                        )
                        *
                        5,
                        55
                        +
                        (
                            i %
                            5
                        )
                        *
                        8,
                        6
                    ),
                    mountainMaterial
                );


            mountain.position
                .copy(
                    sample.point
                )
                .addScaledVector(
                    sample.normal,
                    side *
                    (
                        78
                        +
                        (
                            i %
                            3
                        )
                        *
                        20
                    )
                );

            mountain.position.y =
                24;

            mountain.rotation.y =
                i *
                0.17;

            worldGroup.add(
                mountain
            );

        }

    }


    /*
      Aurora strips above the course.
    */

    const auroraMaterial =
        new THREE.MeshBasicMaterial({
            color:
                0x63ffd1,
            transparent:
                true,
            opacity:
                0.11,
            side:
                THREE.DoubleSide,
            depthWrite:
                false
        });


    for (
        let i = 0;
        i < 3;
        i++
    ) {

        const strip =
            new THREE.Mesh(
                new THREE.PlaneGeometry(
                    420,
                    28
                ),
                auroraMaterial.clone()
            );


        strip.position.set(
            -80
            +
            i *
            90,
            62
            +
            i *
            6,
            -30
            +
            i *
            38
        );

        strip.rotation.set(
            -0.22,
            0.22
            +
            i *
            0.15,
            0.04
        );

        worldGroup.add(
            strip
        );

    }

}


function buildBuildingWindows(buildings) {
    const lit = [];
    const dark = [];
    for (const b of buildings) {
        const rows = Math.max(2, Math.min(7, Math.floor((b.height -
            3)
            /
                2.5)));
        const cols = Math.max(2, Math.min(4, Math.floor(b.depth /
            2.2)));
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const y = 2.3
                    +
                        row *
                            2.45;
                if (y >
                    b.height -
                        1) {
                    continue;
                }
                const along = (col
                    -
                        (cols -
                            1)
                            /
                                2)
                    *
                        1.75;
                const p = b.position
                    .clone()
                    .addScaledVector(b.normal, -b.side *
                    (b.width /
                        2
                        +
                            0.04))
                    .addScaledVector(b.tangent, along);
                p.y =
                    y;
                const entry = {
                    position: p,
                    rotationY: b.rotationY
                };
                if ((b.index *
                    3
                    +
                        row *
                            5
                    +
                        col *
                            7)
                    %
                        5
                    <
                        3) {
                    lit.push(entry);
                }
                else {
                    dark.push(entry);
                }
            }
        }
    }
    const geometry = new THREE.BoxGeometry(0.07, 0.62, 0.62);
    const litMesh = new THREE.InstancedMesh(geometry, new THREE.MeshBasicMaterial({
        color: 0xffd69a
    }), lit.length);
    const darkMesh = new THREE.InstancedMesh(geometry, new THREE.MeshBasicMaterial({
        color: 0x111927
    }), dark.length);
    const dummy = new THREE.Object3D();
    lit.forEach((item, index) => {
        dummy.position.copy(item.position);
        dummy.rotation.set(0, item.rotationY, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        litMesh.setMatrixAt(index, dummy.matrix);
    });
    dark.forEach((item, index) => {
        dummy.position.copy(item.position);
        dummy.rotation.set(0, item.rotationY, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        darkMesh.setMatrixAt(index, dummy.matrix);
    });
    litMesh.instanceMatrix.needsUpdate =
        true;
    darkMesh.instanceMatrix.needsUpdate =
        true;
    worldGroup.add(litMesh, darkMesh);
}
function buildRooftopDetails(buildings) {
    const vents = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material(0x3e4856, 0.8, 0.25), buildings.length);
    const dummy = new THREE.Object3D();
    buildings.forEach((b, index) => {
        dummy.position.copy(b.position);
        dummy.position.y =
            b.height +
                0.55;
        dummy.position.addScaledVector(b.tangent, ((b.index %
            3)
            -
                1)
            *
                1.1);
        dummy.rotation.set(0, b.rotationY, 0);
        dummy.scale.set(1.2
            +
                (b.index %
                    2)
                    *
                        0.4, 0.9, 1.4);
        dummy.updateMatrix();
        vents.setMatrixAt(index, dummy.matrix);
    });
    vents.instanceMatrix.needsUpdate =
        true;
    worldGroup.add(vents);
}
function buildStreetLights() {
    const placements = [];
    for (let i = 0; i < TRACK_SAMPLE_COUNT; i += 18) {
        const sample = trackSamples[i];
        for (const side of [-1, 1]) {
            placements.push({
                position: sample.point
                    .clone()
                    .addScaledVector(sample.normal, side *
                    8.25),
                rotationY: sample.rotationY
            });
        }
    }
    const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.055, 0.075, 5.1, 6), material(0x555f6d, 0.7, 0.45), placements.length);
    const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.12, 0.88), new THREE.MeshBasicMaterial({
        color: 0xbddcff
    }), placements.length);
    const dummy = new THREE.Object3D();
    placements.forEach((item, index) => {
        dummy.position.copy(item.position);
        dummy.position.y =
            2.55;
        dummy.rotation.set(0, item.rotationY, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        poles.setMatrixAt(index, dummy.matrix);
        dummy.position.copy(item.position);
        dummy.position.y =
            5.02;
        dummy.rotation.set(0, item.rotationY, 0);
        dummy.updateMatrix();
        heads.setMatrixAt(index, dummy.matrix);
    });
    poles.instanceMatrix.needsUpdate =
        true;
    heads.instanceMatrix.needsUpdate =
        true;
    worldGroup.add(poles, heads);
}
function buildNeonSigns(buildings) {
    const colors = [
        0x4e91ff,
        0xff4e73,
        0x8a64ff,
        0x39d9ff,
        0xffad4d
    ];
    for (let i = 2; i < buildings.length; i += 7) {
        const b = buildings[i];
        const sign = new THREE.Mesh(new THREE.BoxGeometry(0.10, 1.35, Math.min(5.2, b.depth *
            0.68)), new THREE.MeshBasicMaterial({
            color: colors[i %
                colors.length]
        }));
        sign.position
            .copy(b.position)
            .addScaledVector(b.normal, -b.side *
            (b.width /
                2
                +
                    0.11));
        sign.position.y =
            Math.min(b.height -
                2, 4.3
                +
                    (i %
                        3)
                        *
                            1.2);
        sign.rotation.y =
            b.rotationY;
        worldGroup.add(sign);
    }
}
function buildBillboards() {
    const defs = [
        {
            t: 0.115,
            side: 1,
            text: "REDLINE",
            fg: "#ffffff",
            bg: "#243e85"
        },
        {
            t: 0.345,
            side: -1,
            text: "NEON",
            fg: "#ffb3c0",
            bg: "#421a2a"
        },
        {
            t: 0.695,
            side: 1,
            text: "APEX",
            fg: "#d9fff8",
            bg: "#163c39"
        },
        {
            t: 0.915,
            side: -1,
            text: "VORTEX",
            fg: "#ffffff",
            bg: "#491a24"
        }
    ];
    for (const def of defs) {
        const frame = getFrameAt(def.t);
        const group = new THREE.Group();
        group.position
            .copy(frame.point)
            .addScaledVector(frame.normal, def.side *
            12);
        group.rotation.y =
            frame.rotationY
                +
                    (def.side >
                        0
                        ?
                            Math.PI /
                                2
                        :
                            -Math.PI /
                                2);
        const poleMat = material(0x4a5360, 0.72, 0.4);
        addMesh(group, new THREE.BoxGeometry(0.12, 4, 0.12), poleMat, -1.7, 2, 0);
        addMesh(group, new THREE.BoxGeometry(0.12, 4, 0.12), poleMat, 1.7, 2, 0);
        const texture = createTextTexture(def.text, def.fg, def.bg);
        const board = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.45), new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide
        }));
        board.position.y =
            4.2;
        group.add(board);
        worldGroup.add(group);
    }
}
function buildTrafficLights() {
    const trafficTs = [
        0.28,
        0.585,
        0.835
    ];
    for (const t of trafficTs) {
        const frame = getFrameAt(t);
        const group = new THREE.Group();
        group.position.copy(frame.point);
        group.rotation.y =
            frame.rotationY;
        const poleMat = material(0x454f5c, 0.75, 0.45);
        addMesh(group, new THREE.BoxGeometry(0.13, 4.8, 0.13), poleMat, -(ROAD_HALF +
            1.5), 2.4, 0);
        addMesh(group, new THREE.BoxGeometry(ROAD_HALF *
            2
            +
                3, 0.12, 0.12), poleMat, 0, 4.65, 0);
        const housing = addMesh(group, new THREE.BoxGeometry(0.55, 1.55, 0.42), material(0x10151d, 0.85, 0.1), 2, 4.05, 0);
        addMesh(housing, new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({
            color: 0xff3044
        }), 0, 0.46, -0.23);
        addMesh(housing, new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({
            color: 0x56481d
        }), 0, 0, -0.23);
        addMesh(housing, new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({
            color: 0x1d5c3f
        }), 0, -0.46, -0.23);
        worldGroup.add(group);
    }
}
function buildLandmarkTower() {
    const frame = getFrameAt(0.09);
    const center = frame.point
        .clone()
        .addScaledVector(frame.normal, 34);
    const tower = new THREE.Group();
    tower.position.copy(center);
    addMesh(tower, new THREE.CylinderGeometry(7, 8.5, 34, 8), material(0x1b2635, 0.72, 0.12), 0, 17, 0);
    addMesh(tower, new THREE.CylinderGeometry(5.2, 6.8, 14, 8), material(0x263b55, 0.22, 0.22), 0, 41, 0);
    addMesh(tower, new THREE.CylinderGeometry(5.6, 5.6, 0.65, 8), new THREE.MeshBasicMaterial({
        color: 0x4f8cff
    }), 0, 48.2, 0);
    addMesh(tower, new THREE.CylinderGeometry(0.12, 0.12, 10, 6), new THREE.MeshBasicMaterial({
        color: 0xff4f74
    }), 0, 53.5, 0);
    worldGroup.add(tower);
}
function buildTunnel() {
    const start = 0.46;
    const end = 0.535;
    const steps = 10;
    const concrete = material(0x303844, 0.92, 0.03);
    const dark = material(0x151a22, 0.95, 0.02);
    const lightMat = new THREE.MeshBasicMaterial({
        color: 0xa8d9ff
    });
    for (let i = 0; i <= steps; i++) {
        const t = start
            +
                (end -
                    start)
                    *
                        (i /
                            steps);
        const frame = getFrameAt(t);
        const group = new THREE.Group();
        group.position.copy(frame.point);
        group.rotation.y =
            frame.rotationY;
        addMesh(group, new THREE.BoxGeometry(0.55, 6.2, 0.65), concrete, -(SIDEWALK_OUTER +
            0.4), 3.1, 0);
        addMesh(group, new THREE.BoxGeometry(0.55, 6.2, 0.65), concrete, SIDEWALK_OUTER +
            0.4, 3.1, 0);
        addMesh(group, new THREE.BoxGeometry(SIDEWALK_OUTER *
            2
            +
                1.3, 0.45, 0.65), concrete, 0, 6.15, 0);
        worldGroup.add(group);
    }
    const mid = getFrameAt((start +
        end)
        /
            2);
    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(SIDEWALK_OUTER *
        2
        +
            1.6, 0.35, 23), dark);
    ceiling.position.copy(mid.point);
    ceiling.position.y =
        6;
    ceiling.rotation.y =
        mid.rotationY;
    worldGroup.add(ceiling);
    for (let i = 0; i < 6; i++) {
        const t = start
            +
                (end -
                    start)
                    *
                        ((i +
                            0.5)
                            /
                                6);
        const frame = getFrameAt(t);
        const light = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 3), lightMat);
        light.position.copy(frame.point);
        light.position.y =
            5.75;
        light.rotation.y =
            frame.rotationY;
        worldGroup.add(light);
    }
}
function buildParkingLot() {
    const frame = getFrameAt(0.72);
    const zone = {
        center: frame.point
            .clone()
            .addScaledVector(frame.normal, 15),
        tangent: frame.tangent.clone(),
        normal: frame.normal.clone(),
        halfWidth: 7.5,
        halfLength: 11.5,
        rotationY: frame.rotationY
    };
    surfaceZones.push(zone);
    const lot = new THREE.Mesh(new THREE.BoxGeometry(zone.halfWidth *
        2, 0.045, zone.halfLength *
        2), new THREE.MeshStandardMaterial({
        color: 0x202935,
        roughness: 0.86,
        metalness: 0.02
    }));
    lot.position.copy(zone.center);
    lot.position.y =
        0.04;
    lot.rotation.y =
        zone.rotationY;
    worldGroup.add(lot);
    const stripeMat = new THREE.MeshBasicMaterial({
        color: 0xbfc7d2
    });
    for (const across of [
        -4.8,
        -1.6,
        1.6,
        4.8
    ]) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.025, 8), stripeMat);
        stripe.position.copy(localPoint(zone, across, 1.5, 0.08));
        stripe.rotation.y =
            zone.rotationY;
        worldGroup.add(stripe);
    }
    const parkedOffsets = [
        [-5.7, -4],
        [-2.1, -4],
        [1.6, -4],
        [5.2, -4]
    ];
    parkedOffsets.forEach(([across, along], index) => {
        const parked = buildParkedCar(0x4c5d73
            +
                index *
                    0x080604);
        parked.position.copy(localPoint(zone, across, along, 0));
        parked.rotation.y =
            zone.rotationY;
        worldGroup.add(parked);
        obstacles.push({
            mesh: parked,
            position: new THREE.Vector3(parked.position.x, 0, parked.position.z),
            radius: 1.35,
            kind: "parked"
        });
    });
    const signTexture = createTextTexture("PARKING", "#ffffff", "#1e3a5f");
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 1.1), new THREE.MeshBasicMaterial({
        map: signTexture,
        side: THREE.DoubleSide
    }));
    sign.position.copy(localPoint(zone, 0, -10.4, 2.5));
    sign.rotation.y =
        zone.rotationY;
    worldGroup.add(sign);
}
function sectionContains(t, start, end) {
    return start <= end
        ?
            (t >= start
                &&
                    t <= end)
        :
            (t >= start
                ||
                    t <= end);
}
function buildBarriers() {
    barriers =
        [];
    const barrierMaterial =
        material(
            activeTrackId ===
            "arctic"
                ?
                0xd7e4ec
                :
                0x697688,
            0.62,
            0.35
        );
    for (const section of barrierSections) {
        for (let i = 0; i < TRACK_SAMPLE_COUNT; i += 3) {
            const t = i /
                TRACK_SAMPLE_COUNT;
            if (!sectionContains(t, section.start, section.end)) {
                continue;
            }
            const nextIndex = (i +
                3)
                %
                    TRACK_SAMPLE_COUNT;
            const aSample = trackSamples[i];
            const bSample = trackSamples[nextIndex];
            const a = aSample.point
                .clone()
                .addScaledVector(aSample.normal, section.side *
                (SIDEWALK_OUTER +
                    0.45));
            const b = bSample.point
                .clone()
                .addScaledVector(bSample.normal, section.side *
                (SIDEWALK_OUTER +
                    0.45));
            const midpoint = a
                .clone()
                .add(b)
                .multiplyScalar(0.5);
            const segment = b
                .clone()
                .sub(a);
            const length = segment.length();
            const rail = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.80, length), barrierMaterial);
            rail.position.copy(midpoint);
            rail.position.y =
                0.45;
            rail.rotation.y =
                Math.atan2(segment.x, segment.z);
            worldGroup.add(rail);
            barriers.push({
                a: new THREE.Vector2(a.x, a.z),
                b: new THREE.Vector2(b.x, b.z)
            });
        }
    }
}
function buildEffects() {
    effectsGroup =
        new THREE.Group();
    worldGroup.add(effectsGroup);
    buildSmokePool();
    buildSkidPool();
    buildSparkPool();
}
function buildSmokePool() {
    const geometry = new THREE.SphereGeometry(0.23, 5, 4);
    for (let i = 0; i < 32; i++) {
        const mat = new THREE.MeshBasicMaterial({
            color: 0xaeb5bf,
            transparent: true,
            opacity: 0,
            depthWrite: false
        });
        const mesh = new THREE.Mesh(geometry, mat);
        mesh.visible =
            false;
        effectsGroup.add(mesh);
        fx.smoke.push({
            mesh,
            velocity: new THREE.Vector3(),
            life: 0,
            maxLife: 1
        });
    }
}
function emitSmoke(position, velocity) {
    if (!fx.smoke.length) {
        return;
    }
    const particle = fx.smoke[fx.smokeIndex];
    fx.smokeIndex =
        (fx.smokeIndex +
            1)
            %
                fx.smoke.length;
    particle.life =
        0.72
            +
                Math.random() *
                    0.35;
    particle.maxLife =
        particle.life;
    particle.mesh.visible =
        true;
    particle.mesh.position.copy(position);
    particle.mesh.position.x +=
        (Math.random() -
            0.5)
            *
                0.12;
    particle.mesh.position.z +=
        (Math.random() -
            0.5)
            *
                0.12;
    particle.velocity.copy(velocity);
    particle.velocity.x +=
        (Math.random() -
            0.5)
            *
                0.55;
    particle.velocity.z +=
        (Math.random() -
            0.5)
            *
                0.55;
    particle.velocity.y =
        0.18
            +
                Math.random() *
                    0.35;
    particle.mesh.scale.setScalar(0.55);
    particle.mesh.material.opacity =
        0.20;
}
function updateSmoke(delta) {
    for (const particle of fx.smoke) {
        if (particle.life <=
            0) {
            continue;
        }
        particle.life -=
            delta;
        if (particle.life <=
            0) {
            particle.mesh.visible =
                false;
            particle.mesh.material.opacity =
                0;
            continue;
        }
        particle.mesh.position
            .addScaledVector(particle.velocity, delta);
        particle.velocity.y +=
            0.16 *
                delta;
        particle.velocity.multiplyScalar(Math.exp(-0.7 *
            delta));
        const progress = 1
            -
                particle.life /
                    particle.maxLife;
        particle.mesh.scale.setScalar(0.55
            +
                progress *
                    1.65);
        particle.mesh.material.opacity =
            0.20
                *
                    (particle.life /
                        particle.maxLife);
    }
}
function buildSkidPool() {
    const geometry = new THREE.BoxGeometry(0.16, 0.012, 1.15);
    for (let i = 0; i < 90; i++) {
        const mat = new THREE.MeshBasicMaterial({
            color: 0x090a0d,
            transparent: true,
            opacity: 0,
            depthWrite: false
        });
        const mark = new THREE.Mesh(geometry, mat);
        mark.visible =
            false;
        effectsGroup.add(mark);
        fx.skidMarks.push({
            mesh: mark,
            life: 0,
            maxLife: 8
        });
    }
}
function emitSkidMark(position, yaw) {
    if (!fx.skidMarks.length) {
        return;
    }
    const mark = fx.skidMarks[fx.skidIndex];
    fx.skidIndex =
        (fx.skidIndex +
            1)
            %
                fx.skidMarks.length;
    mark.life =
        8;
    mark.maxLife =
        8;
    mark.mesh.visible =
        true;
    mark.mesh.position.copy(position);
    mark.mesh.position.y =
        0.105;
    mark.mesh.rotation.set(0, yaw, 0);
    mark.mesh.material.opacity =
        0.58;
}
function updateSkidMarks(delta) {
    for (const mark of fx.skidMarks) {
        if (mark.life <=
            0) {
            continue;
        }
        mark.life -=
            delta;
        if (mark.life <=
            0) {
            mark.mesh.visible =
                false;
            mark.mesh.material.opacity =
                0;
            continue;
        }
        if (mark.life <
            2) {
            mark.mesh.material.opacity =
                0.58
                    *
                        (mark.life /
                            2);
        }
    }
}
function buildSparkPool() {
    const geometry = new THREE.BoxGeometry(0.035, 0.035, 0.20);
    for (let i = 0; i < 48; i++) {
        const mat = new THREE.MeshBasicMaterial({
            color: 0xffc05b,
            transparent: true,
            opacity: 0
        });
        const spark = new THREE.Mesh(geometry, mat);
        spark.visible =
            false;
        effectsGroup.add(spark);
        fx.sparks.push({
            mesh: spark,
            velocity: new THREE.Vector3(),
            life: 0,
            maxLife: 0.35
        });
    }
}
function emitSparks(position, normal, strength = 1) {
    const amount = Math.min(12, 5
        +
            Math.floor(strength *
                5));
    for (let i = 0; i < amount; i++) {
        const spark = fx.sparks[fx.sparkIndex];
        fx.sparkIndex =
            (fx.sparkIndex +
                1)
                %
                    fx.sparks.length;
        spark.life =
            0.18
                +
                    Math.random() *
                        0.26;
        spark.maxLife =
            spark.life;
        spark.mesh.visible =
            true;
        spark.mesh.position.copy(position);
        spark.velocity.copy(normal);
        spark.velocity.multiplyScalar(4
            +
                Math.random() *
                    5);
        spark.velocity.x +=
            (Math.random() -
                0.5)
                *
                    4;
        spark.velocity.z +=
            (Math.random() -
                0.5)
                *
                    4;
        spark.velocity.y =
            1.2
                +
                    Math.random() *
                        3.2;
        spark.mesh.material.opacity =
            1;
        spark.mesh.scale.setScalar(0.7
            +
                Math.random() *
                    0.8);
    }
}
function updateSparks(delta) {
    for (const spark of fx.sparks) {
        if (spark.life <=
            0) {
            continue;
        }
        spark.life -=
            delta;
        if (spark.life <=
            0) {
            spark.mesh.visible =
                false;
            spark.mesh.material.opacity =
                0;
            continue;
        }
        spark.velocity.y -=
            7 *
                delta;
        spark.mesh.position
            .addScaledVector(spark.velocity, delta);
        spark.mesh.rotation.x +=
            12 *
                delta;
        spark.mesh.rotation.y +=
            9 *
                delta;
        spark.mesh.material.opacity =
            spark.life /
                spark.maxLife;
    }
}
function updateEffects(delta) {
    updateSmoke(delta);
    updateSkidMarks(delta);
    updateSparks(delta);
}
function collideWithBarriers() {
    const player = new THREE.Vector2(car.position.x, car.position.z);
    for (const barrier of barriers) {
        const ab = barrier.b
            .clone()
            .sub(barrier.a);
        const lengthSq = ab.lengthSq()
            ||
                1;
        const t = THREE.MathUtils.clamp(player
            .clone()
            .sub(barrier.a)
            .dot(ab)
            /
                lengthSq, 0, 1);
        const closest = barrier.a
            .clone()
            .add(ab.multiplyScalar(t));
        const delta = player
            .clone()
            .sub(closest);
        const distance = delta.length();
        const collisionDistance = CAR_RADIUS +
            0.18;
        if (distance >=
            collisionDistance) {
            continue;
        }
        let normal;
        if (distance >
            0.0001) {
            normal =
                delta.multiplyScalar(1 /
                    distance);
        }
        else {
            const direction = barrier.b
                .clone()
                .sub(barrier.a)
                .normalize();
            normal =
                new THREE.Vector2(-direction.y, direction.x);
        }
        const penetration = collisionDistance -
            distance;
        car.position.x +=
            normal.x *
                penetration;
        car.position.z +=
            normal.y *
                penetration;
        const normal3D = new THREE.Vector3(normal.x, 0, normal.y);
        const velocityNormal = carState.velocity
            .dot(normal3D);
        const hitSpeed = Math.abs(velocityNormal);
        if (velocityNormal <
            0) {
            carState.velocity
                .addScaledVector(normal3D, -1.45 *
                velocityNormal);
        }
        carState.velocity
            .multiplyScalar(0.78);
        carState.impactPulse =
            1;
        carState.cameraShake =
            Math.max(carState.cameraShake, Math.min(1, hitSpeed /
                20));
        if (carState.sparkCooldown <=
            0
            &&
                hitSpeed >
                    4) {
            const contact = car.position
                .clone()
                .addScaledVector(normal3D, -0.9);
            contact.y =
                0.42;
            emitSparks(contact, normal3D, Math.min(1.4, hitSpeed /
                16));
            carState.sparkCooldown =
                0.10;
        }
        if (carState.impactCooldown <=
            0
            &&
                hitSpeed >
                    7) {
            showRacePopup("BARRIER HIT", 420);
            carState.impactCooldown =
                0.4;
        }
    }
}
function buildParkedCar(color = 0x586575) {
    const group = new THREE.Group();
    const body = material(color, 0.5, 0.16);
    const glass = material(0x111820, 0.25, 0.1);
    addMesh(group, createWedgeGeometry(1.9, 3.7, 0.36, 0.52, 0.9), body, 0, 0.3, 0);
    addMesh(group, createWedgeGeometry(1.45, 1.7, 0.48, 0.5, 0.75), glass, 0, 0.68, -0.15);
    const tireMat = material(0x050608, 0.95, 0.02);
    for (const x of [-0.95, 0.95]) {
        for (const z of [-1.15, 1.15]) {
            const wheel = addMesh(group, new THREE.CylinderGeometry(0.29, 0.29, 0.22, 10), tireMat, x, 0.30, z);
            wheel.rotation.z =
                Math.PI /
                    2;
        }
    }
    return group;
}
function buildObstacles() {
    obstacles =
        [];
    for (const definition of obstacleDefinitions) {
        const frame = getFrameAt(definition.t);
        let mesh;
        if (definition.kind ===
            "parked") {
            mesh =
                buildParkedCar();
        }
        else if (
            definition.kind ===
            "ice"
        ) {
            mesh =
                new THREE.Mesh(
                    new THREE.DodecahedronGeometry(
                        1.05,
                        0
                    ),
                    material(
                        0xa8d6e8,
                        0.34,
                        0.12
                    )
                );

            mesh.scale.set(
                1.1,
                0.95,
                1.35
            );

            mesh.position.y =
                0.9;
        }
        else if (
            definition.kind ===
            "snowbarrier"
        ) {
            mesh =
                new THREE.Mesh(
                    new THREE.BoxGeometry(
                        2.8,
                        0.9,
                        0.8
                    ),
                    material(
                        0xe6f1f6,
                        0.84,
                        0.05
                    )
                );

            mesh.position.y =
                0.45;
        }
        else {
            mesh =
                new THREE.Mesh(new THREE.BoxGeometry(2.5, 1, 0.72), material(0xd7dce4, 0.75, 0.12));
            mesh.position.y =
                0.5;
        }
        mesh.position
            .add(frame.point)
            .addScaledVector(frame.normal, definition.offset);
        mesh.rotation.y =
            frame.rotationY;
        worldGroup.add(mesh);
        obstacles.push({
            ...definition,
            mesh,
            position: new THREE.Vector3(mesh.position.x, 0, mesh.position.z)
        });
    }
}
function collideWithObstacles() {
    for (const obstacle of obstacles) {
        const dx = car.position.x -
            obstacle.position.x;
        const dz = car.position.z -
            obstacle.position.z;
        const distance = Math.hypot(dx, dz);
        const minimum = obstacle.radius +
            CAR_RADIUS;
        if (distance >=
            minimum) {
            continue;
        }
        const safeDistance = Math.max(distance, 0.001);
        const nx = dx /
            safeDistance;
        const nz = dz /
            safeDistance;
        const penetration = minimum -
            distance;
        car.position.x +=
            nx *
                penetration;
        car.position.z +=
            nz *
                penetration;
        const normal = new THREE.Vector3(nx, 0, nz);
        const velocityNormal = carState.velocity
            .dot(normal);
        const hitSpeed = Math.abs(velocityNormal);
        if (velocityNormal <
            0) {
            carState.velocity
                .addScaledVector(normal, -1.22 *
                velocityNormal);
        }
        carState.velocity
            .multiplyScalar(0.65);
        carState.impactPulse =
            1;
        carState.cameraShake =
            Math.max(carState.cameraShake, Math.min(1, hitSpeed /
                16));
        if (carState.sparkCooldown <=
            0
            &&
                hitSpeed >
                    5) {
            const contact = car.position
                .clone()
                .addScaledVector(normal, -0.85);
            contact.y =
                0.45;
            emitSparks(contact, normal, Math.min(1.3, hitSpeed /
                14));
            carState.sparkCooldown =
                0.13;
        }
        if (carState.impactCooldown <=
            0) {
            showRacePopup("CRASH", 450);
            carState.impactCooldown =
                0.5;
        }
    }
}
function buildCheckpointGates() {
    checkpointGates =
        [];
    checkpointTs.forEach((t, index) => {
        const frame = getFrameAt(t);
        const group = new THREE.Group();
        group.position.copy(frame.point);
        group.rotation.y =
            frame.rotationY;
        const gateMaterial = new THREE.MeshBasicMaterial({
            color: index ===
                0
                ?
                    0x5a9cff
                :
                    0x445064
        });
        const poles = new THREE.BoxGeometry(0.18, 4.6, 0.18);
        const beam = new THREE.BoxGeometry(ROAD_HALF *
            2
            +
                1.9, 0.26, 0.22);
        addMesh(group, poles, gateMaterial, -(ROAD_HALF +
            0.6), 2.3, 0);
        addMesh(group, poles, gateMaterial, ROAD_HALF +
            0.6, 2.3, 0);
        addMesh(group, beam, gateMaterial, 0, 4.55, 0);
        worldGroup.add(group);
        checkpointGates.push({
            group,
            material: gateMaterial,
            point: frame.point.clone(),
            t
        });
    });
}
function updateGateColors() {
    checkpointGates.forEach((gate, index) => {
        gate.material.color.setHex(index ===
            checkpointStep
            ?
                0x5a9cff
            :
                0x445064);
    });
}
function nextCheckpoint() {
    return checkpointGates[checkpointStep];
}
function updateCheckpoints() {
    const target = nextCheckpoint();
    if (!target
        ||
            flatDistance(car.position, target.point)
                >
                    7) {
        return;
    }
    showRacePopup("CHECKPOINT", 500);
    checkpointStep++;
    if (checkpointStep >=
        checkpointGates.length) {
        checkpointStep =
            0;
        lap++;
        if (lap >
            TARGET_LAPS) {
            finishRace();
            return;
        }
    }
    updateObjective();
    updateGateColors();
}
function updateObjective() {
    objectiveEl.textContent =
        `LAP ${Math.min(lap, TARGET_LAPS)} / ${TARGET_LAPS}`;
    checkpointText.textContent =
        `CHECKPOINT ${checkpointStep + 1} / ${checkpointTs.length}`;
}
function buildBoostPads() {
    boostPads =
        [];
    for (const definition of boostDefinitions) {
        const frame = getFrameAt(definition.t);
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.055, 5.8), new THREE.MeshBasicMaterial({
            color: 0x2d9dff
        }));
        mesh.position
            .copy(frame.point)
            .addScaledVector(frame.normal, definition.offset);
        mesh.position.y =
            0.09;
        mesh.rotation.y =
            frame.rotationY;
        worldGroup.add(mesh);
        boostPads.push({
            mesh,
            position: mesh.position.clone(),
            cooldown: 0
        });
    }
}
function updateBoostPads(delta) {
    for (const pad of boostPads) {
        pad.cooldown =
            Math.max(0, pad.cooldown -
                delta);
        if (pad.cooldown >
            0) {
            continue;
        }
        if (flatDistance(car.position, pad.position)
            <
                2.9) {
            const forward = forwardVector();
            const forwardSpeed = carState.velocity
                .dot(forward);
            if (forwardSpeed <
                33) {
                carState.velocity
                    .addScaledVector(forward, 33 -
                    forwardSpeed);
            }
            carState.boostTimer =
                1.3;
            pad.cooldown =
                1.4;
            showRacePopup("BOOST", 450);
        }
    }
}
function buildPickups() {
    pickups =
        [];
    for (const definition of pickupDefinitions) {
        const frame = getFrameAt(definition.t);
        const color = definition.type ===
            "overdrive"
            ?
                0xff9c3a
            :
                0x59c7ff;
        const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.72, 0), new THREE.MeshBasicMaterial({
            color
        }));
        mesh.position
            .copy(frame.point)
            .addScaledVector(frame.normal, definition.offset);
        mesh.position.y =
            1.25;
        worldGroup.add(mesh);
        pickups.push({
            ...definition,
            mesh,
            position: mesh.position.clone(),
            active: true,
            respawn: 0,
            spin: definition.t *
                10
        });
    }
}
function updatePickups(delta, elapsed) {
    for (const pickup of pickups) {
        if (!pickup.active) {
            pickup.respawn -=
                delta;
            if (pickup.respawn <=
                0) {
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
                    Math.sin(elapsed *
                        3
                        +
                            pickup.spin)
                        *
                            0.16;
        if (flatDistance(car.position, pickup.position)
            <
                2) {
            pickup.active =
                false;
            pickup.mesh.visible =
                false;
            pickup.respawn =
                9;
            if (pickup.type ===
                "overdrive") {
                carState.overdriveTimer =
                    Math.max(carState.overdriveTimer, 3.2);
                showRacePopup("OVERDRIVE", 600);
            }
            else {
                carState.nitro =
                    Math.min(100, carState.nitro +
                        45);
                showRacePopup("NITRO +45", 600);
            }
        }
    }
}
function addWheel(root, x, z, front, scale = 1) {
    const steerPivot = new THREE.Group();
    steerPivot.position.set(x, 0.34 *
        scale, z);
    const spinPivot = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.235 *
        scale, 0.095 *
        scale, 8, 14), material(0x040506, 0.95, 0.02));
    tire.rotation.y =
        Math.PI /
            2;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.18 *
        scale, 0.18 *
        scale, 0.20 *
        scale, 12), material(0x9ba4b1, 0.28, 0.78));
    rim.rotation.z =
        Math.PI /
            2;
    spinPivot.add(tire, rim);
    steerPivot.add(spinPivot);
    root.add(steerPivot);
    carVisual.wheels.push(spinPivot);
    if (front) {
        carVisual.frontSteer.push(steerPivot);
    }
}
function addLights(bodyPivot, frontZ, rearZ, frontY, rearY) {
    const headMaterial = new THREE.MeshBasicMaterial({
        color: 0xd6ecff
    });
    const tailMaterialLeft = new THREE.MeshStandardMaterial({
        color: 0x670a12,
        emissive: 0xff2237,
        emissiveIntensity: 0.45
    });
    const tailMaterialRight = tailMaterialLeft.clone();
    carVisual.brakeMaterials.push(tailMaterialLeft, tailMaterialRight);
    const headGeometry = new THREE.BoxGeometry(0.48, 0.13, 0.07);
    addMesh(bodyPivot, headGeometry, headMaterial, -0.55, frontY, frontZ);
    addMesh(bodyPivot, headGeometry, headMaterial, 0.55, frontY, frontZ);
    const tailGeometry = new THREE.BoxGeometry(0.48, 0.14, 0.07);
    addMesh(bodyPivot, tailGeometry, tailMaterialLeft, -0.55, rearY, rearZ);
    addMesh(bodyPivot, tailGeometry, tailMaterialRight, 0.55, rearY, rearZ);
}
function addNitroFlames(bodyPivot, rearZ, y, spacing = 0.47) {
    const flameMaterial = new THREE.MeshBasicMaterial({
        color: 0x49b7ff,
        transparent: true,
        opacity: 0.90
    });
    for (const x of [-spacing, spacing]) {
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.72, 7), flameMaterial.clone());
        flame.position.set(x, y, rearZ);
        flame.rotation.x =
            -Math.PI /
                2;
        flame.visible =
            false;
        bodyPivot.add(flame);
        carVisual.nitroFlames.push(flame);
    }
}
function buildGT(root, bodyPivot, spec) {
    const bodyMat = material(spec.body, 0.34, 0.3);
    const accentMat = material(spec.accent, 0.42, 0.35);
    const glassMat = material(spec.glass, 0.16, 0.12);
    const darkMat = material(0x080b10, 0.7, 0.16);
    addMesh(bodyPivot, createWedgeGeometry(1.94, 3.85, 0.40, 0.48, 0.94), bodyMat, 0, 0.32, 0);
    addMesh(bodyPivot, createWedgeGeometry(1.80, 1.30, 0.15, 0.28, 0.90), bodyMat, 0, 0.69, 1.10);
    addMesh(bodyPivot, createWedgeGeometry(1.55, 1.75, 0.48, 0.58, 0.72), glassMat, 0, 0.76, -0.20);
    addMesh(bodyPivot, new THREE.BoxGeometry(1.20, 0.10, 0.95), accentMat, 0, 1.32, -0.28);
    addMesh(bodyPivot, new THREE.BoxGeometry(1.92, 0.20, 0.30), darkMat, 0, 0.33, 1.93);
    addMesh(bodyPivot, new THREE.BoxGeometry(1.90, 0.22, 0.28), darkMat, 0, 0.35, -1.92);
    addMesh(bodyPivot, new THREE.BoxGeometry(0.90, 0.18, 0.04), darkMat, 0, 0.48, 2.09);
    addMesh(bodyPivot, new THREE.BoxGeometry(1.65, 0.09, 0.32), darkMat, 0, 1.08, -1.66);
    addLights(bodyPivot, 1.96, -1.96, 0.58, 0.59);
    addNitroFlames(bodyPivot, -2.18, 0.32, 0.48);
    addWheel(root, -0.99, 1.22, true, 1);
    addWheel(root, 0.99, 1.22, true, 1);
    addWheel(root, -0.99, -1.24, false, 1);
    addWheel(root, 0.99, -1.24, false, 1);
}
function buildVortex(root, bodyPivot, spec) {
    const bodyMat = material(spec.body, 0.26, 0.4);
    const carbonMat = material(spec.accent, 0.35, 0.5);
    const glassMat = material(spec.glass, 0.12, 0.18);
    const darkMat = material(0x05070a, 0.7, 0.15);
    addMesh(bodyPivot, createWedgeGeometry(2.10, 4.25, 0.28, 0.42, 0.92), bodyMat, 0, 0.27, 0);
    addMesh(bodyPivot, createWedgeGeometry(2.02, 1.65, 0.10, 0.30, 0.88), bodyMat, 0, 0.58, 1.30);
    addMesh(bodyPivot, createWedgeGeometry(1.58, 1.65, 0.36, 0.43, 0.68), glassMat, 0, 0.66, -0.18);
    addMesh(bodyPivot, createWedgeGeometry(1.80, 0.95, 0.17, 0.10, 0.90), carbonMat, 0, 0.63, -1.43);
    addMesh(bodyPivot, new THREE.BoxGeometry(2.22, 0.07, 0.52), carbonMat, 0, 0.18, 2.16);
    addMesh(bodyPivot, new THREE.BoxGeometry(2.05, 0.16, 0.50), carbonMat, 0, 0.25, -2.09);
    addMesh(bodyPivot, new THREE.BoxGeometry(2.00, 0.10, 0.40), carbonMat, 0, 1.12, -1.80);
    addLights(bodyPivot, 2.13, -2.13, 0.51, 0.50);
    addNitroFlames(bodyPivot, -2.30, 0.34, 0.43);
    addWheel(root, -1.06, 1.32, true, 1.02);
    addWheel(root, 1.06, 1.32, true, 1.02);
    addWheel(root, -1.06, -1.35, false, 1.08);
    addWheel(root, 1.06, -1.35, false, 1.08);
}
function buildApex(root, bodyPivot, spec) {
    const bodyMat = material(spec.body, 0.40, 0.25);
    const accentMat = material(spec.accent, 0.50, 0.25);
    const glassMat = material(spec.glass, 0.17, 0.08);
    const darkMat = material(0x080b0f, 0.72, 0.12);
    addMesh(bodyPivot, createWedgeGeometry(1.85, 3.55, 0.40, 0.54, 0.94), bodyMat, 0, 0.32, 0);
    addMesh(bodyPivot, createWedgeGeometry(1.72, 0.95, 0.14, 0.26, 0.9), bodyMat, 0, 0.70, 1.31);
    addMesh(bodyPivot, createWedgeGeometry(1.55, 1.70, 0.62, 0.66, 0.77), glassMat, 0, 0.73, -0.18);
    addMesh(bodyPivot, new THREE.BoxGeometry(1.28, 0.11, 1.18), accentMat, 0, 1.39, -0.25);
    addMesh(bodyPivot, new THREE.BoxGeometry(1.84, 0.18, 0.34), darkMat, 0, 0.34, -1.77);
    addMesh(bodyPivot, new THREE.BoxGeometry(1.55, 0.10, 0.34), darkMat, 0, 1.35, -1.34);
    addLights(bodyPivot, 1.80, -1.80, 0.59, 0.63);
    addNitroFlames(bodyPivot, -1.98, 0.34, 0.42);
    addWheel(root, -0.94, 1.11, true, 0.98);
    addWheel(root, 0.94, 1.11, true, 0.98);
    addWheel(root, -0.94, -1.10, false, 0.98);
    addWheel(root, 0.94, -1.10, false, 0.98);
}
function cleanAppearanceHex(value, fallback) {
    const text = String(value || "").trim();
    return /^#[0-9a-f]{6}$/i.test(text) ? text : fallback;
}
function appearanceColorNumber(value, fallback) {
    const clean = cleanAppearanceHex(value, fallback);
    return Number.parseInt(clean.slice(1), 16);
}
function normalizeGarageAppearance(appearance) {
    const body = ["coupe", "supercar", "muscle", "track"].includes(appearance?.body)
        ? appearance.body
        : "coupe";
    return {
        body,
        color: cleanAppearanceHex(appearance?.color, "#e9edf2"),
        accent: cleanAppearanceHex(appearance?.accent, "#315fbd")
    };
}
function applyAppearanceToSpec(baseSpec, appearance) {
    const clean = normalizeGarageAppearance(appearance);
    const modelMap = {
        coupe: "gt",
        supercar: "vortex",
        muscle: "muscle",
        track: "apex"
    };
    return {
        ...baseSpec,
        model: modelMap[clean.body] || "gt",
        body: appearanceColorNumber(clean.color, "#e9edf2"),
        accent: appearanceColorNumber(clean.accent, "#315fbd"),
        garageAppearance: clean
    };
}
function appearanceSignature(appearance) {
    const clean = normalizeGarageAppearance(appearance);
    return `${clean.body}|${clean.color.toLowerCase()}|${clean.accent.toLowerCase()}`;
}
function buildMuscle(root, bodyPivot, spec) {
    const bodyMat = material(spec.body, 0.38, 0.28);
    const accentMat = material(spec.accent, 0.42, 0.34);
    const glassMat = material(spec.glass ?? 0x111820, 0.18, 0.10);
    const darkMat = material(0x07090d, 0.78, 0.14);

    addMesh(bodyPivot, createWedgeGeometry(2.08, 4.15, 0.46, 0.54, 0.96), bodyMat, 0, 0.34, 0);
    addMesh(bodyPivot, new THREE.BoxGeometry(1.94, 0.22, 1.15), bodyMat, 0, 0.70, 1.30);
    addMesh(bodyPivot, createWedgeGeometry(1.52, 1.72, 0.54, 0.61, 0.83), glassMat, 0, 0.79, -0.28);
    addMesh(bodyPivot, new THREE.BoxGeometry(1.52, 0.10, 2.15), accentMat, 0, 0.61, 0.12);
    addMesh(bodyPivot, new THREE.BoxGeometry(2.04, 0.20, 0.34), darkMat, 0, 0.35, 2.05);
    addMesh(bodyPivot, new THREE.BoxGeometry(2.02, 0.22, 0.38), darkMat, 0, 0.38, -2.04);
    addMesh(bodyPivot, new THREE.BoxGeometry(1.55, 0.10, 0.32), accentMat, 0, 1.15, -1.68);

    addLights(bodyPivot, 2.08, -2.08, 0.62, 0.62);
    addNitroFlames(bodyPivot, -2.28, 0.34, 0.50);

    addWheel(root, -1.04, 1.30, true, 1.08);
    addWheel(root, 1.04, 1.30, true, 1.08);
    addWheel(root, -1.04, -1.32, false, 1.12);
    addWheel(root, 1.04, -1.32, false, 1.12);
}
function makeCarModel(spec) {
    const root = new THREE.Group();
    const bodyPivot = new THREE.Group();
    root.add(bodyPivot);
    carVisual = {
        bodyPivot,
        wheels: [],
        frontSteer: [],
        brakeMaterials: [],
        nitroFlames: []
    };
    if (spec.model ===
        "vortex") {
        buildVortex(root, bodyPivot, spec);
    }
    else if (spec.model ===
        "apex") {
        buildApex(root, bodyPivot, spec);
    }
    else if (spec.model ===
        "muscle") {
        buildMuscle(root, bodyPivot, spec);
    }
    else {
        buildGT(root, bodyPivot, spec);
    }
    return root;
}
function createNameSprite(username) {
    const labelCanvas = document.createElement("canvas");
    labelCanvas.width =
        256;
    labelCanvas.height =
        64;
    const ctx = labelCanvas.getContext("2d");
    ctx.clearRect(0, 0, 256, 64);
    ctx.fillStyle =
        "rgba(5,10,18,.72)";
    ctx.fillRect(18, 8, 220, 48);
    ctx.font =
        "700 27px Arial";
    ctx.textAlign =
        "center";
    ctx.textBaseline =
        "middle";
    ctx.fillStyle =
        "#ffffff";
    ctx.fillText(username ||
        "Racer", 128, 32);
    const texture = new THREE.CanvasTexture(labelCanvas);
    texture.colorSpace =
        THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false
    }));
    sprite.scale.set(4.2, 1.05, 1);
    sprite.position.y =
        2.55;
    return sprite;
}
function makeGhostCar(spec, username) {
    const savedVisual = carVisual;
    const model = makeCarModel(spec);
    const visual = carVisual;
    carVisual =
        savedVisual;
    model.traverse(object => {
        if (!object.isMesh
            ||
                !object.material) {
            return;
        }
        const source = Array.isArray(object.material)
            ?
                object.material
            :
                [
                    object.material
                ];
        const ghosts = source.map(original => {
            const ghost = original.clone();
            ghost.transparent =
                true;
            ghost.opacity =
                0.50;
            ghost.depthWrite =
                false;
            if ("emissiveIntensity"
                in ghost) {
                ghost.emissiveIntensity =
                    Math.max(ghost.emissiveIntensity ||
                        0, 0.18);
            }
            return ghost;
        });
        object.material =
            Array.isArray(object.material)
                ?
                    ghosts
                :
                    ghosts[0];
    });
    model.add(createNameSprite(username));
    return {
        model,
        visual
    };
}
function getGridTransform(playerIndex) {
    const frame = getFrameAt(0.015);
    const lane = playerIndex %
        2;
    const row = Math.floor(playerIndex /
        2);
    const lateral = lane ===
        0
        ?
            -1.55
        :
            1.55;
    const position = frame.point
        .clone()
        .addScaledVector(frame.normal, lateral)
        .addScaledVector(frame.tangent, -row *
        4.0);
    return {
        position,
        rotationY: frame.rotationY
    };
}
function createRemoteRacer(player, playerIndex = 0, appearance = null) {
    if (!worldGroup
        ||
            !player?.id
        ||
            player.id ===
                window.REDLINE_MP?.playerId) {
        return null;
    }

    const cleanAppearance = normalizeGarageAppearance(appearance);
    const signature = appearanceSignature(cleanAppearance);
    const existing = remoteRacers.get(player.id);

    if (existing) {
        if (existing.appearanceSignature === signature) {
            return existing;
        }

        const savedPosition = existing.model.position.clone();
        const savedRotation = existing.model.rotation.y;
        worldGroup?.remove(existing.model);
        remoteRacers.delete(player.id);

        const baseSpec = cars[player.car] || cars.gt;
        const spec = applyAppearanceToSpec(baseSpec, cleanAppearance);
        const ghost = makeGhostCar(spec, player.username);
        ghost.model.position.copy(savedPosition);
        ghost.model.rotation.y = savedRotation;
        worldGroup.add(ghost.model);

        const rebuilt = {
            ...existing,
            car: player.car || "gt",
            model: ghost.model,
            visual: ghost.visual,
            appearance: cleanAppearance,
            appearanceSignature: signature
        };
        remoteRacers.set(player.id, rebuilt);
        return rebuilt;
    }

    const baseSpec = cars[player.car] || cars.gt;
    const spec = applyAppearanceToSpec(baseSpec, cleanAppearance);
    const ghost = makeGhostCar(spec, player.username);
    const spawn = getGridTransform(playerIndex);
    ghost.model.position.copy(spawn.position);
    ghost.model.rotation.y = spawn.rotationY;
    worldGroup.add(ghost.model);

    const remote = {
        playerId: player.id,
        username: player.username || "Racer",
        car: player.car || "gt",
        model: ghost.model,
        visual: ghost.visual,
        appearance: cleanAppearance,
        appearanceSignature: signature,
        targetPosition: spawn.position.clone(),
        targetRotation: spawn.rotationY,
        lastUpdate: performance.now()
    };
    remoteRacers.set(player.id, remote);
    return remote;
}
function removeRemoteRacer(playerId) {
    const remote = remoteRacers.get(playerId);
    if (!remote) {
        return;
    }
    worldGroup?.remove(remote.model);
    remoteRacers.delete(playerId);
    raceStates.delete(playerId);
}
function receiveRaceState(state) {
    if (!state?.playerId) {
        return;
    }
    raceStates.set(state.playerId, state);
    if (state.playerId ===
        window.REDLINE_MP?.playerId) {
        return;
    }
    const players = window.REDLINE_MP?.players
        ??
            [];
    const playerIndex = Math.max(0, players.findIndex(player => player.id ===
        state.playerId));
    const player = players.find(item => item.id ===
        state.playerId)
        ||
            {
                id: state.playerId,
                username: state.username ||
                    "Racer",
                car: state.car ||
                    "gt",
                appearance: state.appearance ||
                    null
            };
    const remote = createRemoteRacer(player, playerIndex, state.appearance || player.appearance || null);
    if (!remote) {
        return;
    }
    remote.targetPosition.set(Number(state.x)
        ||
            0, Number(state.y)
        ||
            0, Number(state.z)
        ||
            0);
    remote.targetRotation =
        Number.isFinite(Number(state.rotation))
            ?
                Number(state.rotation)
            :
                remote.targetRotation;
    remote.lastUpdate =
        performance.now();
}
function interpolateAngle(current, target, amount) {
    let difference = (target -
        current +
        Math.PI)
        %
            (Math.PI *
                2)
        -
            Math.PI;
    if (difference <
        -Math.PI) {
        difference +=
            Math.PI *
                2;
    }
    return current +
        difference *
            amount;
}
function updateRemoteRacers(delta) {
    const positionAmount = 1 -
        Math.exp(-12 *
            delta);
    const rotationAmount = 1 -
        Math.exp(-15 *
            delta);
    for (const remote of remoteRacers.values()) {
        remote.model.position.lerp(remote.targetPosition, positionAmount);
        remote.model.rotation.y =
            interpolateAngle(remote.model.rotation.y, remote.targetRotation, rotationAmount);
        const state = raceStates.get(remote.playerId);
        const spin = Math.abs(Number(state?.speed)
            ||
                0)
            *
                delta
            *
                2.9;
        for (const wheel of remote.visual?.wheels
            ||
                []) {
            wheel.rotation.x -=
                spin;
        }
    }
}
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
    const mph = carState.velocity.length()
        *
            2.45;
    let gear = carState.gear;
    if (gear <
        6
        &&
            mph >
                shiftUp[gear]) {
        gear++;
    }
    else if (gear >
        1
        &&
            mph <
                shiftDown[gear]) {
        gear--;
    }
    carState.gear =
        gear;
    carState.rpm =
        THREE.MathUtils.clamp(900
            +
                mph
                    *
                        gearRatios[gear]
                    *
                        22, 900, 7600);
}
function getRearTirePositions() {
    const left = new THREE.Vector3(-0.76, 0.12, -1.12);
    const right = new THREE.Vector3(0.76, 0.12, -1.12);
    car.localToWorld(left);
    car.localToWorld(right);
    return {
        left,
        right
    };
}
function updateDrivingEffects(delta, handbrake, lateralSpeed, surface, nitroActive) {
    const speed = carState.velocity.length();
    const slipping = Math.abs(lateralSpeed);
    const drifting = (handbrake
        &&
            speed >
                8)
        ||
            (slipping >
                4.8
                &&
                    speed >
                        11);
    if (drifting) {
        carState.smokeTimer +=
            delta;
        carState.skidTimer +=
            delta;
        const tires = getRearTirePositions();
        if (carState.smokeTimer >
            0.045) {
            carState.smokeTimer =
                0;
            const baseVelocity = carState.velocity
                .clone()
                .multiplyScalar(0.10);
            emitSmoke(tires.left, baseVelocity);
            emitSmoke(tires.right, baseVelocity);
        }
        if (carState.skidTimer >
            0.055
            &&
                surface.name ===
                    "ASPHALT") {
            carState.skidTimer =
                0;
            emitSkidMark(tires.left, car.rotation.y);
            emitSkidMark(tires.right, car.rotation.y);
        }
    }
    else {
        carState.smokeTimer =
            Math.min(carState.smokeTimer, 0.045);
        carState.skidTimer =
            Math.min(carState.skidTimer, 0.055);
    }
    const flamesOn = nitroActive
        ||
            carState.boostTimer >
                0
        ||
            carState.overdriveTimer >
                0;
    for (let i = 0; i < carVisual.nitroFlames.length; i++) {
        const flame = carVisual.nitroFlames[i];
        flame.visible =
            flamesOn;
        if (flamesOn) {
            const pulse = 0.88
                +
                    Math.sin(clock.elapsedTime *
                        38
                        +
                            i)
                        *
                            0.17;
            flame.scale.set(0.9, pulse, 0.9);
            flame.material.opacity =
                0.72
                    +
                        Math.sin(clock.elapsedTime *
                            43
                            +
                                i)
                            *
                                0.18;
        }
    }
}
function updatePhysics(delta) {
    if (!raceActive) {
        return;
    }
    carState.boostTimer =
        Math.max(0, carState.boostTimer -
            delta);
    carState.overdriveTimer =
        Math.max(0, carState.overdriveTimer -
            delta);
    carState.impactCooldown =
        Math.max(0, carState.impactCooldown -
            delta);
    carState.sparkCooldown =
        Math.max(0, carState.sparkCooldown -
            delta);
    carState.impactPulse =
        Math.max(0, carState.impactPulse -
            delta *
                4);
    carState.cameraShake *=
        Math.exp(-7.5 *
            delta);
    const roadInfo = nearestTrackInfo(car.position);
    const surface = getSurface(roadInfo);
    const throttle = keys.has("w")
        ||
            keys.has("arrowup");
    const brake = keys.has("s")
        ||
            keys.has("arrowdown");
    const left = keys.has("a")
        ||
            keys.has("arrowleft");
    const right = keys.has("d")
        ||
            keys.has("arrowright");
    const handbrake = keys.has(" ");
    const nitroActive = (keys.has("shift")
        ||
            keys.has("shiftleft"))
        &&
            carState.nitro >
                0;
    const steeringInput = (left
        ?
            1
        :
            0)
        -
            (right
                ?
                    1
                :
                    0);
    carState.steer =
        THREE.MathUtils.lerp(carState.steer, steeringInput, handbrake
            ?
                0.22
            :
                0.13);
    let forward = forwardVector();
    let rightVec = rightVector();
    let forwardSpeed = carState.velocity
        .dot(forward);
    let lateralSpeed = carState.velocity
        .dot(rightVec);
    const speed = carState.velocity.length();
    const speedFactor = THREE.MathUtils.clamp(Math.abs(forwardSpeed)
        /
            14, 0, 1);
    let steerRate = activeCarSpec.steer
        *
            surface.steer;
    if (handbrake) {
        steerRate *=
            1.42;
    }
    if (speed >
        40
        &&
            !handbrake) {
        steerRate *=
            activeCarSpec
                .highSpeedSteer;
    }
    const direction = forwardSpeed >=
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
            .dot(forward);
    lateralSpeed =
        carState.velocity
            .dot(rightVec);
    const overdrive = carState.overdriveTimer >
        0;
    const acceleration = (overdrive
        ?
            activeCarSpec.acceleration *
                1.35
        :
            activeCarSpec.acceleration)
        *
            surface.acceleration;
    if (throttle) {
        carState.velocity
            .addScaledVector(forward, acceleration *
            delta);
    }
    if (brake) {
        if (forwardSpeed >
            1.5) {
            const braking = Math.min(forwardSpeed, activeCarSpec.braking *
                delta);
            carState.velocity
                .addScaledVector(forward, -braking);
        }
        else {
            carState.velocity
                .addScaledVector(forward, -activeCarSpec
                .reverseAcceleration
                *
                    surface.acceleration
                *
                    delta);
        }
    }
    if (nitroActive
        &&
            forwardSpeed >
                3) {
        carState.nitro =
            Math.max(0, carState.nitro -
                24 *
                    delta);
        carState.velocity
            .addScaledVector(forward, 22 *
            delta);
    }
    else {
        carState.nitro =
            Math.min(100, carState.nitro +
                3.7 *
                    delta);
    }
    const grip = handbrake
        ?
            activeCarSpec.driftGrip
                *
                    surface.gripMultiplier
        :
            activeCarSpec.grip
                *
                    surface.gripMultiplier;
    const lateralCorrection = THREE.MathUtils.clamp(grip *
        delta, 0, 1);
    carState.velocity
        .addScaledVector(rightVec, -lateralSpeed *
        lateralCorrection);
    const drag = activeCarSpec.drag
        *
            surface.drag;
    carState.velocity
        .multiplyScalar(Math.exp(-drag *
        delta));
    const currentSpeed = carState.velocity.length();
    if (currentSpeed >
        42) {
        carState.velocity
            .multiplyScalar(Math.exp(-(currentSpeed -
            42)
            *
                0.016
            *
                delta));
    }
    const maxSpeed = carState.boostTimer >
        0
        ||
            overdrive
        ?
            activeCarSpec.boostSpeed
        :
            nitroActive
                ?
                    activeCarSpec.nitroSpeed
                :
                    activeCarSpec.topSpeed;
    if (carState.velocity.length() >
        maxSpeed) {
        carState.velocity
            .setLength(maxSpeed);
    }
    car.position
        .addScaledVector(carState.velocity, delta);
    collideWithBarriers();
    collideWithObstacles();
    updateBoostPads(delta);
    updatePickups(delta, clock.elapsedTime);
    updateTransmission();
    updateCheckpoints();
    updateNavigation(delta, roadInfo);
    updateDrivingEffects(delta, handbrake, lateralSpeed, surface, nitroActive);
    updateCarVisuals(delta, throttle, brake, nitroActive);
}
function updateCarVisuals(delta, throttle, brake, nitroActive) {
    if (!carVisual) {
        return;
    }
    const forward = forwardVector();
    const forwardSpeed = carState.velocity
        .dot(forward);
    const speed = carState.velocity.length();
    const wheelSpin = forwardSpeed
        *
            delta
        *
            2.9;
    for (const wheel of carVisual.wheels) {
        wheel.rotation.x -=
            wheelSpin;
    }
    for (const pivot of carVisual.frontSteer) {
        pivot.rotation.y =
            THREE.MathUtils.lerp(pivot.rotation.y, -carState.steer *
                0.43, 0.22);
    }
    const roll = -carState.steer
        *
            Math.min(speed /
                38, 1)
        *
            0.058;
    const pitchTarget = brake
        ?
            0.040
        :
            throttle
                ?
                    -0.020
                :
                    0;
    const impactJolt = carState.impactPulse
        *
            0.035;
    carVisual.bodyPivot.rotation.z =
        THREE.MathUtils.lerp(carVisual.bodyPivot.rotation.z, roll, 0.15);
    carVisual.bodyPivot.rotation.x =
        THREE.MathUtils.lerp(carVisual.bodyPivot.rotation.x, pitchTarget +
            impactJolt, 0.16);
    carVisual.bodyPivot.position.y =
        0.012
            +
                Math.sin(clock.elapsedTime
                    *
                        (5
                            +
                                speed *
                                    0.13))
                    *
                        Math.min(speed /
                            1500, 0.020);
    const brakeIntensity = brake
        &&
            forwardSpeed >
                1
        ?
            4
        :
            0.45;
    for (const brakeMaterial of carVisual.brakeMaterials) {
        brakeMaterial.emissiveIntensity =
            brakeIntensity;
    }
}
function updateNavigation(delta, roadInfo) {
    const target = nextCheckpoint();
    if (!target) {
        return;
    }
    const toTarget = target.point
        .clone()
        .sub(car.position);
    toTarget.y =
        0;
    const distance = toTarget.length();
    checkpointDistance.textContent =
        `${Math.round(distance)}m`;
    if (distance >
        0.001) {
        toTarget.normalize();
        const forward = forwardVector();
        const right = rightVector();
        const forwardDot = forward.dot(toTarget);
        const rightDot = right.dot(toTarget);
        const degrees = THREE.MathUtils.radToDeg(Math.atan2(rightDot, forwardDot));
        const absolute = Math.abs(degrees);
        directionArrow.style.transform =
            `rotate(${THREE.MathUtils.clamp(degrees, -105, 105)}deg)`;
        if (absolute <
            16) {
            navigationText.textContent =
                "STRAIGHT";
        }
        else if (absolute <
            48) {
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
    const roadDirectionDot = forwardVector()
        .dot(roadInfo.tangent);
    if (roadDirectionDot <
        -0.25
        &&
            carState.velocity.length() >
                5) {
        wrongWayTimer +=
            delta;
    }
    else {
        wrongWayTimer =
            Math.max(0, wrongWayTimer -
                delta *
                    2);
    }
    wrongWay.classList.toggle("hidden", wrongWayTimer <
        0.85);
}
function getTrackBounds() {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const sample of trackSamples) {
        minX =
            Math.min(minX, sample.point.x);
        maxX =
            Math.max(maxX, sample.point.x);
        minZ =
            Math.min(minZ, sample.point.z);
        maxZ =
            Math.max(maxZ, sample.point.z);
    }
    return {
        minX,
        maxX,
        minZ,
        maxZ
    };
}
function drawMinimap() {
    if (!car
        ||
            !trackSamples.length) {
        return;
    }
    const width = minimap.width;
    const height = minimap.height;
    const bounds = getTrackBounds();
    const padding = 18;
    const scale = Math.min((width -
        padding *
            2)
        /
            (bounds.maxX -
                bounds.minX), (height -
        padding *
            2)
        /
            (bounds.maxZ -
                bounds.minZ));
    const mapPoint = (x, z) => ({
        x: padding
            +
                (x -
                    bounds.minX)
                    *
                        scale,
        y: height
            -
                padding
            -
                (z -
                    bounds.minZ)
                    *
                        scale
    });
    mapCtx.clearRect(0, 0, width, height);
    mapCtx.strokeStyle =
        "rgba(255,255,255,.42)";
    mapCtx.lineWidth =
        5;
    mapCtx.lineJoin =
        "round";
    mapCtx.lineCap =
        "round";
    mapCtx.beginPath();
    trackSamples.forEach((sample, index) => {
        const mapped = mapPoint(sample.point.x, sample.point.z);
        if (index ===
            0) {
            mapCtx.moveTo(mapped.x, mapped.y);
        }
        else {
            mapCtx.lineTo(mapped.x, mapped.y);
        }
    });
    const first = mapPoint(trackSamples[0]
        .point.x, trackSamples[0]
        .point.z);
    mapCtx.lineTo(first.x, first.y);
    mapCtx.stroke();
    checkpointGates.forEach((gate, index) => {
        const mapped = mapPoint(gate.point.x, gate.point.z);
        mapCtx.fillStyle =
            index ===
                checkpointStep
                ?
                    "#ffffff"
                :
                    "rgba(255,255,255,.24)";
        mapCtx.beginPath();
        mapCtx.arc(mapped.x, mapped.y, index ===
            checkpointStep
            ?
                4.3
            :
                2.4, 0, Math.PI *
            2);
        mapCtx.fill();
    });
    for (const remote of remoteRacers.values()) {
        const mapped = mapPoint(remote.model.position.x, remote.model.position.z);
        mapCtx.fillStyle =
            "rgba(255,255,255,.72)";
        mapCtx.beginPath();
        mapCtx.arc(mapped.x, mapped.y, 3.5, 0, Math.PI *
            2);
        mapCtx.fill();
    }
    const player = mapPoint(car.position.x, car.position.z);
    mapCtx.save();
    mapCtx.translate(player.x, player.y);
    mapCtx.rotate(car.rotation.y);
    mapCtx.fillStyle =
        "#5a9cff";
    mapCtx.beginPath();
    mapCtx.moveTo(0, -7);
    mapCtx.lineTo(5, 6);
    mapCtx.lineTo(-5, 6);
    mapCtx.closePath();
    mapCtx.fill();
    mapCtx.restore();
}
function updateCamera(delta) {
    if (!car
        ||
            !carState) {
        return;
    }
    const forward = forwardVector();
    const right = rightVector();
    const speed = carState.velocity.length();
    const speed01 = THREE.MathUtils.clamp(speed /
        activeCarSpec.nitroSpeed, 0, 1);
    const velocityDirection = carState.velocity.lengthSq() >
        0.1
        ?
            carState.velocity
                .clone()
                .normalize()
        :
            forward.clone();
    const cameraForward = forward
        .clone()
        .lerp(velocityDirection, 0.20)
        .normalize();
    const desired = car.position
        .clone()
        .add(new THREE.Vector3(0, 2.9
        +
            speed01 *
                0.45, 0))
        .addScaledVector(cameraForward, -(7.1
        +
            speed01 *
                1.8));
    desired.addScaledVector(right, -carState.steer *
        speed01 *
        0.32);
    const shake = carState.cameraShake;
    if (shake >
        0.001) {
        desired.x +=
            Math.sin(clock.elapsedTime *
                57)
                *
                    shake *
                0.16;
        desired.y +=
            Math.sin(clock.elapsedTime *
                71
                +
                    1.7)
                *
                    shake *
                0.10;
        desired.z +=
            Math.sin(clock.elapsedTime *
                49
                +
                    3.1)
                *
                    shake *
                0.12;
    }
    const smoothing = 1
        -
            Math.pow(0.0015, delta);
    camera.position.lerp(desired, smoothing);
    const lookAt = car.position
        .clone()
        .add(new THREE.Vector3(0, 0.72, 0))
        .addScaledVector(cameraForward, 6
        +
            speed01 *
                5);
    lookAt.addScaledVector(right, carState.steer *
        speed01 *
        0.45);
    camera.lookAt(lookAt);
    const boostExtra = (carState.boostTimer >
        0
        ||
            carState.overdriveTimer >
                0)
        ?
            3
        :
            0;
    camera.fov =
        THREE.MathUtils.lerp(camera.fov, 63
            +
                speed01 *
                    14
            +
                boostExtra, 0.08);
    camera.updateProjectionMatrix();
}
function updateHUD() {
    if (!carState) {
        return;
    }
    const mph = Math.round(carState.velocity.length()
        *
            2.45);
    speedEl.textContent =
        mph;
    const forwardSpeed = carState.velocity
        .dot(forwardVector());
    gearEl.textContent =
        forwardSpeed <
            -1
            ?
                "R"
            :
                carState.gear;
    rpmBar.style.width =
        `${THREE.MathUtils.clamp(carState.rpm /
            7600, 0, 1)
            *
                100}%`;
    nitroBar.style.width =
        `${carState.nitro}%`;
    nitroPercent.textContent =
        `${Math.round(carState.nitro)}%`;
    updateRaceTimer();
    updateRacePosition();
}
function showRacePopup(text, duration = 600) {
    checkpointPopup.textContent =
        text;
    checkpointPopup.classList.remove("hidden");
    clearTimeout(checkpointPopupTimer);
    checkpointPopupTimer =
        setTimeout(() => {
            checkpointPopup.classList.add("hidden");
            checkpointPopup.textContent =
                "CHECKPOINT";
        }, duration);
}
function buildWorld() {
    disposeWorld();
    const multiplayerCar = window.REDLINE_MP
        ?.myPlayer
        ?.car;
    if (multiplayerCar
        &&
            cars[multiplayerCar]) {
        selectedCar =
            multiplayerCar;
    }
    const baseCarSpec = cars[selectedCar];
    activeCarSpec =
        window.REDLINE_GARAGE_PHYSICS
            ?.getPhysicsSpec?.(baseCarSpec)
            ??
                baseCarSpec;
    updateGarageUI();
    worldGroup =
        new THREE.Group();
    scene.add(worldGroup);
    surfaceZones =
        [];
    sampleTrack();
    buildCity();
    buildRoad();
    buildBarriers();
    buildCheckpointGates();
    buildBoostPads();
    buildPickups();
    buildObstacles();
    buildParkingLot();
    buildEffects();
    car =
        makeCarModel(activeCarSpec);
    worldGroup.add(car);
    const players = window.REDLINE_MP
        ?.players
        ??
            [];
    const myId = window.REDLINE_MP
        ?.playerId;
    let myIndex = players.findIndex(player => player.id ===
        myId);
    if (myIndex <
        0) {
        myIndex =
            0;
    }
    const start = getGridTransform(myIndex);
    car.position.copy(start.position);
    car.rotation.y =
        start.rotationY;
    carState = {
        velocity: new THREE.Vector3(),
        steer: 0,
        gear: 1,
        rpm: 900,
        nitro: 100,
        boostTimer: 0,
        overdriveTimer: 0,
        impactCooldown: 0,
        impactPulse: 0,
        sparkCooldown: 0,
        cameraShake: 0,
        smokeTimer: 0,
        skidTimer: 0
    };
    checkpointStep =
        0;
    lap =
        1;
    wrongWayTimer =
        0;
    localFinished =
        false;
    localFinishElapsed =
        null;
    finishOrder =
        [];
    players.forEach((player, index) => {
        if (player.id ===
            myId) {
            return;
        }
        createRemoteRacer(player, index);
    });
    updateObjective();
    updateGateColors();
}
async function runCountdown() {
    countdown.classList.remove("hidden");
    for (const value of [
        "3",
        "2",
        "1",
        "GO"
    ]) {
        countdown.textContent =
            value;
        await new Promise(resolve => setTimeout(resolve, value ===
            "GO"
            ?
                520
            :
                680));
    }
    countdown.classList.add("hidden");
    raceActive =
        true;
}
function formatRaceTime(milliseconds) {
    const total = Math.max(0, Math.floor(milliseconds));
    const minutes = Math.floor(total /
        60000);
    const seconds = Math.floor((total %
        60000)
        /
            1000);
    const millis = total %
        1000;
    return (`${String(minutes).padStart(2, "0")}:` +
        `${String(seconds).padStart(2, "0")}.` +
        `${String(millis).padStart(3, "0")}`);
}
function getCheckpointProgressForPosition(position, checkpoint) {
    const road = nearestTrackInfo(position);
    if (!road) {
        return 0;
    }
    const currentT = road.t;
    const nextT = checkpointTs[checkpoint];
    const previousT = checkpoint ===
        0
        ?
            checkpointTs[checkpointTs.length -
                1]
        :
            checkpointTs[checkpoint -
                1];
    let span = nextT -
        previousT;
    if (span <=
        0) {
        span +=
            1;
    }
    let travelled = currentT -
        previousT;
    if (travelled <
        0) {
        travelled +=
            1;
    }
    return THREE.MathUtils.clamp(travelled /
        span, 0, 0.9999);
}
function createLocalRaceState() {
    if (!car
        ||
            !carState) {
        return null;
    }
    return {
        playerId: window.REDLINE_MP
            ?.playerId,
        username: window.REDLINE_MP
            ?.myPlayer
            ?.username
            ||
                "Racer",
        car: selectedCar,
        appearance: window.REDLINE_GARAGE
            ?.build
            ?.appearance
            ??
                null,
        x: car.position.x,
        y: car.position.y,
        z: car.position.z,
        rotation: car.rotation.y,
        speed: carState.velocity.length(),
        lap: Math.min(lap, TARGET_LAPS),
        checkpoint: checkpointStep,
        progress: getCheckpointProgressForPosition(car.position, checkpointStep),
        finished: localFinished,
        timestamp: Date.now()
    };
}
function updateNetwork(now) {
    if (!raceStarted
        ||
            !window.REDLINE_MP
                ?.connected) {
        return;
    }
    const state = createLocalRaceState();
    if (!state?.playerId) {
        return;
    }
    raceStates.set(state.playerId, state);
    if (now -
        lastNetworkSend <
        NETWORK_INTERVAL) {
        return;
    }
    lastNetworkSend =
        now;
    window.REDLINE_MP
        .sendRaceState(state);
}
function getStateScore(state) {
    if (!state) {
        return -1;
    }
    return ((state.lap -
        1)
        *
            checkpointTs.length
        +
            state.checkpoint
        +
            THREE.MathUtils.clamp(state.progress, 0, 0.9999));
}
function updateRacePosition() {
    if (!racePositionEl
        ||
            !totalRacersEl) {
        return;
    }
    const players = window.REDLINE_MP
        ?.players
        ??
            [];
    const myId = window.REDLINE_MP
        ?.playerId;
    if (!myId) {
        racePositionEl.textContent =
            "1";
        totalRacersEl.textContent =
            "1";
        return;
    }
    totalRacersEl.textContent =
        String(Math.max(1, players.length));
    const ranked = players.map(player => {
        const finish = finishOrder.find(result => result.playerId ===
            player.id);
        return {
            playerId: player.id,
            finished: Boolean(finish),
            finishPlace: finish?.place
                ??
                    Infinity,
            score: getStateScore(raceStates.get(player.id))
        };
    });
    ranked.sort((a, b) => {
        if (a.finished
            &&
                b.finished) {
            return (a.finishPlace -
                b.finishPlace);
        }
        if (a.finished) {
            return -1;
        }
        if (b.finished) {
            return 1;
        }
        return (b.score -
            a.score);
    });
    const index = ranked.findIndex(racer => racer.playerId ===
        myId);
    racePositionEl.textContent =
        index >=
            0
            ?
                String(index +
                    1)
            :
                "1";
}
function updateRaceTimer() {
    if (!raceTimerEl) {
        return;
    }
    if (!serverRaceStartAt) {
        raceTimerEl.textContent =
            "00:00.000";
        return;
    }
    if (localFinishElapsed !==
        null) {
        raceTimerEl.textContent =
            formatRaceTime(localFinishElapsed);
        return;
    }
    raceTimerEl.textContent =
        formatRaceTime(Math.max(0, Date.now() -
            serverRaceStartAt));
}
function updateServerCountdown() {
    if (!raceStarted
        ||
            !serverRaceStartAt) {
        return;
    }
    const now = Date.now();
    const remaining = serverRaceStartAt -
        now;
    if (remaining >
        0) {
        raceActive =
            false;
        countdown.classList.remove("hidden");
        const number = THREE.MathUtils.clamp(Math.ceil(remaining /
            (4000 /
                3)), 1, 3);
        countdown.textContent =
            String(number);
        return;
    }
    if (!raceActive
        &&
            !localFinished) {
        raceActive =
            true;
        countdown.classList.remove("hidden");
        countdown.textContent =
            "GO";
        goHideAt =
            now +
                650;
    }
    if (goHideAt
        &&
            now >=
                goHideAt) {
        countdown.classList.add("hidden");
        goHideAt =
            0;
    }
}
function startRace() {
    buildWorld();
    trackNameEl.textContent =
        "NEON DISTRICT";
    menu.classList.add("hidden");
    hud.classList.remove("hidden");
    message.classList.add("hidden");
    serverRaceStartAt =
        window.REDLINE_MP
            ?.raceStartAt
            ||
                (Date.now() +
                    2800);
    raceActive =
        false;
    raceStarted =
        true;
    localFinished =
        false;
    localFinishElapsed =
        null;
    goHideAt =
        0;
    lastNetworkSend =
        0;
    raceTimerEl &&
        (raceTimerEl.textContent =
            "00:00.000");
    racePositionEl &&
        (racePositionEl.textContent =
            "1");
    totalRacersEl &&
        (totalRacersEl.textContent =
            String(Math.max(1, window.REDLINE_MP
                ?.players
                ?.length
                ||
                    1)));
}
function finishRace() {
    if (localFinished) {
        return;
    }
    localFinished =
        true;
    raceActive =
        false;
    localFinishElapsed =
        Math.max(0, Date.now() -
            (serverRaceStartAt
                ||
                    Date.now()));
    carState?.velocity?.set(0, 0, 0);
    message.textContent =
        "FINISH";
    message.classList.remove("hidden");
    window.REDLINE_MP
        ?.sendFinish?.();
    setTimeout(() => {
        message.classList.add("hidden");
    }, 2200);
}
window.addEventListener("redline:countdown", event => {
    if (event.detail?.startAt) {
        serverRaceStartAt =
            event.detail.startAt;
    }
});
window.addEventListener("redline:race-started", event => {
    if (event.detail?.startAt) {
        serverRaceStartAt =
            event.detail.startAt;
    }
});
window.addEventListener("redline:race-state", event => {
    receiveRaceState(event.detail);
});
window.addEventListener("redline:race-snapshot", event => {
    if (event.detail?.startAt) {
        serverRaceStartAt =
            event.detail.startAt;
    }
    finishOrder =
        event.detail?.finishOrder
            ??
                [];
    for (const state of (event.detail?.states
        ??
            [])) {
        receiveRaceState(state);
    }
});
window.addEventListener("redline:player-finished", event => {
    finishOrder =
        event.detail
            ?.finishOrder
            ??
                finishOrder;
});
window.addEventListener("redline:player-disconnected", event => {
    removeRemoteRacer(event.detail?.playerId);
});
function updateGarageUI() {
    const spec = cars[selectedCar];
    selectedCarName.textContent =
        spec.name;
    speedStat.style.width =
        `${spec.stats.speed}%`;
    accelStat.style.width =
        `${spec.stats.accel}%`;
    gripStat.style.width =
        `${spec.stats.grip}%`;
    driftStat.style.width =
        `${spec.stats.drift}%`;
    carCards.forEach(card => {
        card.classList.toggle("selected", card.dataset.car ===
            selectedCar);
    });
}
carCards.forEach(card => {
    card.addEventListener("click", () => {
        if (!cars[card.dataset.car]) {
            return;
        }
        selectedCar =
            card.dataset.car;
        updateGarageUI();
    });
});
updateGarageUI();
for (const option of trackSelect.options) {
    if (option.value !==
        "neon") {
        option.disabled =
            true;
        option.textContent =
            `${option.textContent} — REBUILDING`;
    }
}
trackSelect.value =
    "neon";
trackDescription.textContent =
    "Neon District V8 — smoke, skid marks, sparks, nitro flames and upgraded driving feedback.";
startBtn.addEventListener("click", startRace);
window.addEventListener("keydown", event => {
    const key = event.key
        .toLowerCase();
    if ([
        "arrowup",
        "arrowdown",
        "arrowleft",
        "arrowright",
        " "
    ]
        .includes(key)) {
        event.preventDefault();
    }
    keys.add(key);
});
window.addEventListener("keyup", event => {
    keys.delete(event.key
        .toLowerCase());
});
window.addEventListener("blur", () => {
    keys.clear();
});
function updateFPS(now) {
    fpsFrames++;
    if (now -
        lastFpsTime <
        1000) {
        return;
    }
    const fps = Math.round(fpsFrames *
        1000
        /
            (now -
                lastFpsTime));
    fpsEl.textContent =
        `FPS ${fps}`;
    if (fps <
        34
        &&
            quality.renderScale >
                0.52) {
        quality.renderScale =
            Math.max(0.52, quality.renderScale -
                0.07);
        resizeRenderer();
    }
    else if (fps >
        56
        &&
            quality.renderScale <
                0.90) {
        quality.renderScale =
            Math.min(0.90, quality.renderScale +
                0.035);
        resizeRenderer();
    }
    fpsFrames =
        0;
    lastFpsTime =
        now;
}
function gameLoop(now) {
    requestAnimationFrame(gameLoop);
    const delta = Math.min(clock.getDelta(), 0.04);
    updateServerCountdown();
    updatePhysics(delta);
    updateNetwork(now);
    updateRemoteRacers(delta);
    updateEffects(delta);
    updateCamera(delta);
    updateHUD();
    drawMinimap();
    updateFPS(now);
    renderer.render(scene, camera);
}
buildWorld();
requestAnimationFrame(gameLoop);
