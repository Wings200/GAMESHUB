import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import * as NEON_ART from "./neon-art.js";
import * as NEON_INFRA from "./neon-infrastructure.js";
import * as NEON_TRAFFIC from "./neon-traffic.js";
import * as NEON_WEATHER from "./neon-weather.js";
import * as REDLINE_PARTS from "./upgrade-parts.js";
import { createRemoteMotion } from "./multiplayer-smoothing.js";
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
const weatherStatusEl = $("weatherStatus");
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
    antialias: true,
    powerPreference: "high-performance"
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.setPixelRatio(1);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060c16);
scene.fog = new THREE.Fog(0x060c16, 105, 290);
const camera = new THREE.PerspectiveCamera(66, 16 / 9, 0.1, 440);
const hemisphereLight = new THREE.HemisphereLight(0x9aaacf, 0x08111b, 1.75);
scene.add(hemisphereLight);
const moonLight = new THREE.DirectionalLight(0xb7c8e8, 1.18);
moonLight.position.set(-35, 55, 25);
scene.add(moonLight);
const fillLight = new THREE.DirectionalLight(0x637cff, 0.30);
fillLight.position.set(40, 18, -30);
scene.add(fillLight);
const clock = new THREE.Clock();
const keys = new Set();
const quality = {
    /*
      Keep a little headroom for Chromebook multiplayer while MSAA and
      higher-detail geometry clean up the old low-poly look.
    */
    renderScale: 0.82
};
let trafficSystem = null;
let weatherSystem = null;
let weatherRoadMaterial = null;
let weatherOverride = "auto";
let lastWeatherHudLabel = "";
let lastWeatherHudTime = 0;
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
        description: "Neon District V3 — real graded city streets, twin concrete bridges across the shipping canal, waterfront warehouses, downtown tunnels and elevated approaches.",
        sampleCount: 640,
        laps: 1,
        background: 0x050a13,
        fogNear: 340,
        fogFar: 1290,

        /*
          V2 is a much longer non-self-crossing city loop.
          The jagged outer route creates real blocks and district changes
          without putting guardrails across crossing roads.
        */
        /*
          Canal district geography (X/Z/Y):
          Two engineered bridges cross the north-south river at X≈170.
          Graded approaches rise gradually to 12 m at both spans.
          The west-bank district has a separate mild street grade.
          All Z/heading positions remain from the proven Neon V2 route.
        */
        controlPoints: [
            [-245, 163, 0],
            [-170, 190, 0],
            [-95, 170, 0],
            [-41, 194, 0],
            [27, 173, 0],
            [102, 201, 5],
            [184, 173, 12],
            [245, 139, 5],
            [286, 82, 0],
            [265, 31, 0],
            [292, -24, 0],
            [272, -85, 0],
            [228, -133, 6],
            [170, -160, 12],
            [109, -139, 5],
            [48, -184, 0],
            [-24, -167, 0],
            [-88, -187, 0],
            [-150, -156, 0],
            [-211, -136, 0],
            [-248, -92, 2.5],
            [-228, -48, 4],
            [-275, 0, 3],
            [-258, 65, 1],
            [-224, 109, 0],
            [-184, 139, 0]
        ],

        checkpoints: [
            0.045,
            0.105,
            0.165,
            0.225,
            0.285,
            0.345,
            0.405,
            0.465,
            0.525,
            0.585,
            0.645,
            0.705,
            0.765,
            0.825,
            0.885,
            0.945
        ],

        crosswalks: [
            0.035,
            0.145,
            0.265,
            0.405,
            0.555,
            0.705,
            0.835,
            0.955
        ],

        // Normal streets stay open. Only actual canal bridges need rails.
        barriers: [],

        obstacles: [
            /* Downtown */
            { t: 0.082, offset: 2.5, kind: "barrier", radius: 1.2 },
            { t: 0.118, offset: -2.6, kind: "parked", radius: 1.4 },

            /* Metro approach */
            { t: 0.255, offset: -2.7, kind: "barrier", radius: 1.2 },
            { t: 0.292, offset: 2.5, kind: "parked", radius: 1.4 },

            /* Old-city alley */
            { t: 0.505, offset: 2.6, kind: "barrier", radius: 1.2 },
            { t: 0.548, offset: -2.4, kind: "parked", radius: 1.4 },

            /* Construction district */
            { t: 0.690, offset: -2.7, kind: "barrier", radius: 1.2 },
            { t: 0.724, offset: 2.6, kind: "barrier", radius: 1.2 },
            { t: 0.758, offset: -2.4, kind: "parked", radius: 1.4 },

            /* Final underpass */
            { t: 0.902, offset: 2.5, kind: "barrier", radius: 1.2 }
        ],

        boosts: [
            { t: 0.028, offset: 0 },
            { t: 0.178, offset: -1.7 },
            { t: 0.332, offset: 1.8 },
            { t: 0.472, offset: -1.8 },
            { t: 0.612, offset: 1.8 },
            { t: 0.782, offset: -1.8 },
            { t: 0.935, offset: 0 }
        ],

        pickups: [
            { t: 0.125, offset: 2.0, type: "nitro" },
            { t: 0.285, offset: -2.0, type: "overdrive" },
            { t: 0.445, offset: 2.0, type: "nitro" },
            { t: 0.595, offset: -2.0, type: "overdrive" },
            { t: 0.748, offset: 2.0, type: "nitro" },
            { t: 0.875, offset: -2.0, type: "overdrive" }
        ],

        ramps: [
            // Short, controllable city hops. The former 7.5+ launch
            // velocity threw cars across curved junctions at race speed.
            { t: 0.365, offset: -1.2, strength: 4.0, secret: false },
            { t: 0.642, offset: 1.2, strength: 4.1, secret: false },
            { t: 0.926, offset: 0, strength: 4.0, secret: false },

            /* Hidden downtown corner cut */
            {
                t: 0.092,
                offset: -5.45,
                strength: 8.9,
                secret: true,
                targetT: 0.115,
                landingLead: 5,
                shortcutSpeed: 74,
                minSpeed: 27
            },

            /* Construction service-road jump */
            {
                t: 0.704,
                offset: 5.45,
                strength: 9.2,
                secret: true,
                targetT: 0.730,
                landingLead: 6,
                shortcutSpeed: 78,
                minSpeed: 29
            }
        ]
    },

    arctic: {
        id: "arctic",
        name: "ARCTIC RELAY",
        description: "Arctic Relay V2 — a huge one-lap expedition through a base camp, avalanche valley, mountain tunnels, a frozen lake, an ice cave shortcut and a long ridgeline descent.",
        sampleCount: 880,
        laps: 1,
        background: 0x06111b,
        fogNear: 220,
        fogFar: 760,

        /*
          Clean-sheet V2 route.
          It is deliberately irregular and sector-based instead of being
          a rounded perimeter loop. The long return leg runs through the
          mountain interior so the minimap reads like an expedition route.
        */
        controlPoints: [
            [-920, 520],
            [-720, 535],
            [-520, 510],
            [-320, 445],
            [-130, 520],

            [40, 665],
            [245, 720],
            [445, 650],
            [585, 500],
            [650, 310],

            [585, 120],
            [705, -75],
            [610, -275],
            [430, -420],
            [205, -500],

            [-40, -520],
            [-260, -465],
            [-455, -345],
            [-600, -175],
            [-690, 20],

            [-610, 200],
            [-455, 330],
            [-275, 255],
            [-85, 130],
            [115, 205],

            [315, 330],
            [500, 250],
            [565, 60],
            [450, -95],
            [260, -165],

            [80, -80],
            [-100, 40],
            [-300, 90],
            [-505, 175],
            [-690, 320],
            [-835, 430]
        ],

        checkpoints: [
            0.035,
            0.075,
            0.115,
            0.155,
            0.195,
            0.235,
            0.275,
            0.315,
            0.355,
            0.395,
            0.435,
            0.475,
            0.515,
            0.555,
            0.595,
            0.635,
            0.675,
            0.715,
            0.755,
            0.795,
            0.835,
            0.875,
            0.915,
            0.955,
            0.988
        ],

        crosswalks: [],

        barriers: [
            { start: 0.018, end: 0.082, side: -1 },
            { start: 0.105, end: 0.168, side: 1 },
            { start: 0.205, end: 0.265, side: -1 },
            { start: 0.300, end: 0.365, side: 1 },
            { start: 0.405, end: 0.468, side: -1 },
            { start: 0.505, end: 0.568, side: 1 },
            { start: 0.605, end: 0.668, side: -1 },
            { start: 0.705, end: 0.768, side: 1 },
            { start: 0.805, end: 0.868, side: -1 },
            { start: 0.905, end: 0.972, side: 1 }
        ],

        /*
          Obstacles are grouped into recognizable sectors rather than
          evenly sprinkled around the whole map.
        */
        obstacles: [
            /* Base camp / opening straight */
            { t: 0.050, offset: -2.5, kind: "snowbarrier", radius: 1.25 },
            { t: 0.062, offset: 2.6, kind: "snowbarrier", radius: 1.25 },

            /* Avalanche valley */
            { t: 0.115, offset: -2.9, kind: "ice", radius: 1.35 },
            { t: 0.128, offset: 2.5, kind: "ice", radius: 1.4 },
            { t: 0.142, offset: -1.2, kind: "ice", radius: 1.45 },
            { t: 0.154, offset: 2.8, kind: "snowbarrier", radius: 1.25 },

            /* North pass */
            { t: 0.205, offset: -2.2, kind: "ice", radius: 1.3 },
            { t: 0.224, offset: 2.7, kind: "ice", radius: 1.35 },

            /* Glacier drop */
            { t: 0.292, offset: -2.5, kind: "snowbarrier", radius: 1.25 },
            { t: 0.315, offset: 2.6, kind: "ice", radius: 1.4 },

            /* Frozen lake */
            { t: 0.400, offset: -2.8, kind: "ice", radius: 1.4 },
            { t: 0.425, offset: 2.5, kind: "ice", radius: 1.35 },
            { t: 0.452, offset: -1.6, kind: "ice", radius: 1.3 },

            /* Ice cave approach */
            { t: 0.500, offset: 2.8, kind: "snowbarrier", radius: 1.25 },
            { t: 0.525, offset: -2.5, kind: "ice", radius: 1.4 },

            /* Inner mountain switchbacks */
            { t: 0.605, offset: 2.6, kind: "ice", radius: 1.3 },
            { t: 0.632, offset: -2.7, kind: "snowbarrier", radius: 1.25 },
            { t: 0.660, offset: 2.2, kind: "ice", radius: 1.35 },

            /* Ridgeline */
            { t: 0.745, offset: -2.5, kind: "ice", radius: 1.35 },
            { t: 0.770, offset: 2.7, kind: "snowbarrier", radius: 1.25 },
            { t: 0.802, offset: -1.8, kind: "ice", radius: 1.4 },

            /* Final descent */
            { t: 0.885, offset: 2.8, kind: "ice", radius: 1.35 },
            { t: 0.910, offset: -2.6, kind: "snowbarrier", radius: 1.25 },
            { t: 0.945, offset: 2.0, kind: "ice", radius: 1.3 }
        ],

        boosts: [
            { t: 0.030, offset: 0 },
            { t: 0.095, offset: -1.8 },
            { t: 0.180, offset: 1.8 },
            { t: 0.265, offset: -1.7 },
            { t: 0.345, offset: 1.7 },
            { t: 0.390, offset: -1.8 },
            { t: 0.470, offset: 1.8 },
            { t: 0.575, offset: -1.8 },
            { t: 0.690, offset: 1.8 },
            { t: 0.790, offset: -1.8 },
            { t: 0.865, offset: 1.8 },
            { t: 0.960, offset: 0 }
        ],

        pickups: [
            { t: 0.080, offset: 2.0, type: "nitro" },
            { t: 0.165, offset: -2.0, type: "overdrive" },
            { t: 0.245, offset: 1.9, type: "nitro" },
            { t: 0.335, offset: -1.8, type: "overdrive" },
            { t: 0.430, offset: 2.0, type: "nitro" },
            { t: 0.515, offset: -1.9, type: "overdrive" },
            { t: 0.615, offset: 2.1, type: "nitro" },
            { t: 0.705, offset: -1.8, type: "overdrive" },
            { t: 0.805, offset: 2.0, type: "nitro" },
            { t: 0.900, offset: -1.9, type: "overdrive" }
        ],

        /*
          Only a few big jumps now. Secret jumps are meaningful set pieces,
          not random ramps beside the road.
        */
        ramps: [
            { t: 0.185, offset: 0, strength: 8.2, secret: false },
            { t: 0.285, offset: -1.4, strength: 8.5, secret: false },
            { t: 0.455, offset: 1.2, strength: 8.0, secret: false },
            { t: 0.650, offset: -1.4, strength: 8.4, secret: false },
            { t: 0.820, offset: 1.4, strength: 8.8, secret: false },
            { t: 0.940, offset: 0, strength: 8.3, secret: false },

            /* Ravine skip */
            { t: 0.228, offset: 8.4, strength: 9.7, secret: true, targetT: 0.255, minSpeed: 28 },

            /* Signature cave-mouth shortcut */
            {
                t: 0.528,
                offset: -5.55,
                strength: 13.8,
                secret: true,
                cave: true,
                topHole: true,
                caveProgress: 0.46,
                holeHeight: 18,
                targetT: 0.565,
                landingLead: 18,
                shortcutSpeed: 90,
                minSpeed: 28
            },

            /* Ridgeline gap */
            { t: 0.785, offset: 8.4, strength: 10.0, secret: true, targetT: 0.815, minSpeed: 31 }
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

/*
 * Road-design smoothing for Neon only. Chaikin subdivision rounds hard
 * polygonal city corners into long, driveable arcs. The race still uses
 * one canonical curve for road rendering, vehicle surface height, track
 * checkpoints, props and collisions, so the visual and physical route
 * never disagree. Arctic keeps its exact original control points.
 */
function smoothNeonControlPoints(points) {
    let result = points.map(point => point.clone());
    for (const ratio of [0.22, 0.18]) {
        const rounded = [];
        for (let i = 0; i < result.length; i++) {
            const current = result[i];
            const next = result[(i + 1) % result.length];
            rounded.push(current.clone().lerp(next, ratio));
            rounded.push(current.clone().lerp(next, 1 - ratio));
        }
        result = rounded;
    }
    return result;
}

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

    const originalRoadPoints = config.controlPoints.map(
        ([x, z, elevation = 0]) =>
            new THREE.Vector3(x, config.id === "neon" ? elevation : 0, z)
    );
    curve = new THREE.CatmullRomCurve3(
        config.id === "neon"
            ? smoothNeonControlPoints(originalRoadPoints)
            : originalRoadPoints,
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

    // Keep Arctic's original illumination while making Neon genuinely night.
    hemisphereLight.intensity =
        config.id === "neon" ? 1.05 : 1.75;
    moonLight.intensity =
        config.id === "neon" ? 0.92 : 1.18;
    fillLight.intensity =
        config.id === "neon" ? 0.25 : 0.30;
    renderer.toneMappingExposure =
        config.id === "neon" ? 1.15 : 1.08;

    camera.far =
        activeTrackId ===
        "arctic"
            ?
            900
            :
            (
                activeTrackId ===
                "neon"
                    ?
                    1550
                    :
                    440
            );

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
let environmentColliders = [];
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
function createTextTexture(text, foreground = "#ffffff", background = "#111827", width = 512, height = 160) {
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    const ctx = c.getContext("2d");
    ctx.fillStyle =
        background;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle =
        foreground;
    ctx.font =
        "900 " + Math.round(c.height * 0.4125) + "px Arial";
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
function createSurfaceTexture(
    kind,
    repeatX = 1,
    repeatY = 1
) {

    const canvas =
        document.createElement(
            "canvas"
        );


    canvas.width =
        256;


    canvas.height =
        256;


    const ctx =
        canvas.getContext(
            "2d"
        );


    const palettes = {
        asphalt: [
            "#343c44",
            "#414a53",
            "#1d252d"
        ],
        snow: [
            "#d6e2e8",
            "#b8cad5",
            "#edf5f8"
        ],
        rock: [
            "#53616b",
            "#3d4953",
            "#75838c"
        ],
        ice: [
            "#79a9bf",
            "#a8d7e8",
            "#527b91"
        ],
        concrete: [
            "#596168",
            "#454e56",
            "#747b81"
        ],
        facade: [
            "#263343",
            "#17212d",
            "#425064"
        ]
    };


    const palette =
        palettes[
            kind
        ]
        ||
        palettes.concrete;


    ctx.fillStyle =
        palette[0];


    ctx.fillRect(
        0,
        0,
        256,
        256
    );


    /*
      Deterministic pseudo-random grain. No downloaded texture files,
      so every client sees the same surfaces and the game stays lightweight.
    */

    let seed =
        (
            kind
                .split(
                    ""
                )
                .reduce(
                    (
                        value,
                        char
                    ) =>
                        (
                            value *
                            33
                            +
                            char.charCodeAt(
                                0
                            )
                        )
                        >>>
                        0,
                    2166136261
                )
        )
        >>>
        0;


    function random() {

        seed =
            (
                seed *
                1664525
                +
                1013904223
            )
            >>>
            0;


        return seed /
            4294967296;

    }


    for (
        let i = 0;
        i < 2100;
        i++
    ) {

        const x =
            random() *
            256;


        const y =
            random() *
            256;


        const size =
            0.35
            +
            random() *
            (
                kind ===
                "snow"
                    ?
                    2.4
                    :
                    1.5
            );


        ctx.globalAlpha =
            0.05
            +
            random() *
            0.14;


        ctx.fillStyle =
            palette[
                1
                +
                (
                    random() >
                    0.5
                        ?
                        1
                        :
                        0
                )
            ];


        ctx.fillRect(
            x,
            y,
            size,
            size
        );

    }


    ctx.globalAlpha =
        1;


    if (
        kind ===
        "asphalt"
    ) {

        ctx.strokeStyle =
            "rgba(8,12,16,.34)";


        ctx.lineWidth =
            1;


        for (
            let i = 0;
            i < 8;
            i++
        ) {

            const y =
                18
                +
                i *
                29
                +
                random() *
                10;


            ctx.beginPath();


            ctx.moveTo(
                random() *
                45,
                y
            );


            for (
                let x = 40;
                x < 270;
                x += 38
            ) {

                ctx.lineTo(
                    x,
                    y
                    +
                    (
                        random() -
                        0.5
                    )
                    *
                    12
                );

            }


            ctx.stroke();

        }

    }


    if (
        kind ===
        "rock"
    ) {

        ctx.strokeStyle =
            "rgba(20,26,31,.28)";


        ctx.lineWidth =
            2;


        for (
            let i = 0;
            i < 18;
            i++
        ) {

            ctx.beginPath();


            const x =
                random() *
                256;


            const y =
                random() *
                256;


            ctx.moveTo(
                x,
                y
            );


            ctx.lineTo(
                x
                +
                (
                    random() -
                    0.5
                )
                *
                45,
                y
                +
                20
                +
                random() *
                48
            );


            ctx.stroke();

        }

    }


    if (
        kind ===
        "facade"
    ) {

        ctx.strokeStyle =
            "rgba(145,174,204,.15)";


        ctx.lineWidth =
            2;


        for (
            let y = 16;
            y < 256;
            y += 32
        ) {

            ctx.beginPath();


            ctx.moveTo(
                0,
                y
            );


            ctx.lineTo(
                256,
                y
            );


            ctx.stroke();

        }


        for (
            let x = 20;
            x < 256;
            x += 38
        ) {

            ctx.beginPath();


            ctx.moveTo(
                x,
                0
            );


            ctx.lineTo(
                x,
                256
            );


            ctx.stroke();

        }

    }


    const texture =
        new THREE.CanvasTexture(
            canvas
        );


    texture.colorSpace =
        THREE.SRGBColorSpace;


    texture.wrapS =
        THREE.RepeatWrapping;


    texture.wrapT =
        THREE.RepeatWrapping;


    texture.repeat.set(
        repeatX,
        repeatY
    );


    texture.minFilter =
        THREE.LinearMipmapLinearFilter;


    texture.magFilter =
        THREE.LinearFilter;


    texture.anisotropy =
        Math.min(
            8,
            renderer.capabilities
                .getMaxAnisotropy()
        );


    return texture;

}


function createDetailedMountainGeometry(
    radius,
    height,
    seed = 1
) {

    const radialSegments =
        30;


    const verticalSegments =
        10;


    const vertices =
        [];


    const indices =
        [];


    for (
        let yIndex = 0;
        yIndex <= verticalSegments;
        yIndex++
    ) {

        const t =
            yIndex /
            verticalSegments;


        const y =
            -height /
            2
            +
            t *
            height;


        const taper =
            Math.pow(
                1 -
                t,
                0.78
            );


        for (
            let segment = 0;
            segment < radialSegments;
            segment++
        ) {

            const angle =
                segment /
                radialSegments
                *
                Math.PI
                *
                2;


            const irregularity =
                1
                +
                Math.sin(
                    angle *
                    3
                    +
                    seed *
                    0.71
                    +
                    t *
                    2.3
                )
                *
                0.075
                +
                Math.sin(
                    angle *
                    7
                    +
                    seed *
                    1.37
                    -
                    t *
                    4.2
                )
                *
                0.045
                +
                Math.sin(
                    angle *
                    13
                    +
                    seed
                )
                *
                0.018;


            const ringRadius =
                Math.max(
                    radius *
                    0.025,
                    radius *
                    taper *
                    irregularity
                );


            vertices.push(
                Math.cos(
                    angle
                )
                *
                ringRadius,
                y,
                Math.sin(
                    angle
                )
                *
                ringRadius
            );

        }

    }


    for (
        let ring = 0;
        ring < verticalSegments;
        ring++
    ) {

        for (
            let segment = 0;
            segment < radialSegments;
            segment++
        ) {

            const next =
                (
                    segment +
                    1
                )
                %
                radialSegments;


            const a =
                ring *
                radialSegments
                +
                segment;


            const b =
                ring *
                radialSegments
                +
                next;


            const d =
                (
                    ring +
                    1
                )
                *
                radialSegments
                +
                segment;


            const e =
                (
                    ring +
                    1
                )
                *
                radialSegments
                +
                next;


            indices.push(
                a,
                d,
                b,
                b,
                d,
                e
            );

        }

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


    return geometry;

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

    // Catmull-Rom can undershoot zero between flat-road control points.
    // Prevent the city pavement from dipping below the urban ground.
    if(activeTrackId==="neon" && point.y<0) {
        point.y=0;
        tangent.y=0;
        tangent.normalize();
    }

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
function getShortcutLandingPoint(
    definition
) {

    const frame =
        getFrameAt(
            Number(
                definition.targetT
            )
        );


    return frame.point
        .clone()
        .addScaledVector(
            frame.tangent,
            Number(
                definition.landingLead
            )
            ||
            4
        );

}


function getCaveShortcutGeometry(
    definition
) {

    const startFrame =
        getFrameAt(
            Number(
                definition.t
            )
        );


    const start =
        startFrame.point
            .clone()
            .addScaledVector(
                startFrame.normal,
                Number(
                    definition.offset
                )
                ||
                0
            );


    const landing =
        getShortcutLandingPoint(
            definition
        );


    const horizontal =
        landing
            .clone()
            .sub(
                start
            );


    horizontal.y =
        0;


    const distance =
        horizontal.length();


    if (
        distance <
        0.001
    ) {

        return null;

    }


    const direction =
        horizontal
            .clone()
            .normalize();


    const normal =
        new THREE.Vector3(
            -direction.z,
            0,
            direction.x
        );


    const progress =
        THREE.MathUtils.clamp(
            Number(
                definition.caveProgress
            )
            ||
            0.46,
            0.25,
            0.70
        );


    const holeHeight =
        Math.max(
            10,
            Number(
                definition.holeHeight
            )
            ||
            18
        );


    const hole =
        start
            .clone()
            .addScaledVector(
                direction,
                distance *
                progress
            );


    hole.y =
        holeHeight;


    /*
      Choose a ballistic flight time that puts the car at holeHeight
      exactly when it reaches caveProgress, while still landing at y=0.
      y(pT) = 0.5 * g * T^2 * p * (1-p)
    */

    const gravity =
        17.5;


    const flightTime =
        Math.sqrt(
            (
                2 *
                holeHeight
            )
            /
            (
                gravity
                *
                progress
                *
                (
                    1 -
                    progress
                )
            )
        );


    return {
        start,
        landing,
        direction,
        normal,
        distance,
        progress,
        hole,
        holeHeight,
        gravity,
        flightTime,

        rotationY:
            Math.atan2(
                direction.x,
                direction.z
            )
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
/*
  Continuous road altitude for Neon: interpolate the nearest spline sample
  segment in X/Z. This avoids jerky stair-step chassis motion on 12m bridge
  approaches. Arctic's old ground system remains entirely unchanged.
*/
function neonSurfaceHeight(position) {
    if(activeTrackId!=="neon") return 0;
    const nearest=nearestTrackInfo(position);
    if(!nearest) return 0;
    const n=trackSamples.length;
    let bestDist=Infinity;
    let h=0;
    for(const i of [
        (nearest.index+n-2)%n,
        (nearest.index+n-1)%n,
        nearest.index,
        (nearest.index+1)%n
    ]) {
        const a=trackSamples[i].point;
        const b=trackSamples[(i+1)%n].point;
        const dx=b.x-a.x,dz=b.z-a.z;
        const t=THREE.MathUtils.clamp(
            ((position.x-a.x)*dx+(position.z-a.z)*dz)/
            Math.max(.00001,dx*dx+dz*dz),
            0,1
        );
        const offX=position.x-(a.x+dx*t);
        const offZ=position.z-(a.z+dz*t);
        const distance=offX*offX+offZ*offZ;
        if(distance<bestDist) {
            bestDist=distance;
            h=a.y+(b.y-a.y)*t;
        }
    }
    if(Math.sqrt(bestDist)>SIDEWALK_OUTER+1) {
        if(position.x>127&&position.x<213&&Math.abs(position.z)<400)
            return -.40;
        return 0;
    }
    return h;
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
    weatherSystem?.dispose();
    weatherSystem = null;
    weatherRoadMaterial = null;
    lastWeatherHudLabel = "";
    // All visual traffic meshes belong to worldGroup and dispose with it.
    trafficSystem = null;
    remoteRacers.clear();
    raceStates.clear();
    finishOrder =
        [];

    environmentColliders =
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

            list.forEach(
                mat => {

                    mat.map
                        ?.dispose
                        ?.();


                    if (
                        mat.bumpMap
                        &&
                        mat.bumpMap !==
                        mat.map
                    ) {

                        mat.bumpMap
                            .dispose
                            ?.();

                    }


                    mat.dispose
                        ?.();

                }
            );
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
function makeRibbon(
    innerDistance,
    outerDistance,
    color,
    y = 0.02,
    roughness = 0.9,
    textureKind = null,
    textureRepeats = 22
) {

    const vertices =
        [];


    const indices =
        [];


    const uvs =
        [];


    /*
      Textured Neon ribbons duplicate the first section at the end
      with increasing UV coordinates. This prevents a giant texture smear
      across the wraparound segment near the start/finish line.
    */
    const splitUvSeam =
        activeTrackId === "neon"
        &&
        Boolean(textureKind);

    // World-space texel scale: ~5m per repeat rather than one 80m
    // stretched asphalt tile. Preserve the old Arctic UVs unchanged.
    let roadMeters = 0;
    let previousPoint = null;
    const physicalUv = splitUvSeam;
    const acrossRepeats = Math.abs(outerDistance - innerDistance) / 4.5;


    for (
        let i = 0;
        i < TRACK_SAMPLE_COUNT + (splitUvSeam ? 1 : 0);
        i++
    ) {

        const sample =
            trackSamples[i % TRACK_SAMPLE_COUNT];


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


        // Both shoulders and road mesh follow the actual 3D curve.
        // Arctic remains unchanged because its track Y is zero.
        inner.y = sample.point.y + y;
        outer.y = sample.point.y + y;


        vertices.push(
            inner.x,
            inner.y,
            inner.z,
            outer.x,
            outer.y,
            outer.z
        );


        if (physicalUv && previousPoint) {
            roadMeters += sample.point.distanceTo(previousPoint);
        }
        previousPoint = sample.point;

        const u =
            physicalUv
                ? roadMeters / 4.5
                : i / TRACK_SAMPLE_COUNT * textureRepeats;

        uvs.push(
            u,
            0,
            u,
            physicalUv ? acrossRepeats : 1
        );

    }


    for (
        let i = 0;
        i < TRACK_SAMPLE_COUNT;
        i++
    ) {

        const next =
            splitUvSeam
                ?
                i + 1
                :
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


        const nextA =
            next *
            2;


        const nextB =
            nextA +
            1;


        indices.push(
            a,
            nextA,
            b,
            nextA,
            nextB,
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


    geometry.setAttribute(
        "uv",
        new THREE.Float32BufferAttribute(
            uvs,
            2
        )
    );


    geometry.setIndex(
        indices
    );


    geometry.computeVertexNormals();


    const detailTexture =
        textureKind
            ?
            createSurfaceTexture(
                textureKind,
                1,
                1
            )
            :
            null;


    const meshMaterial =
        new THREE.MeshStandardMaterial({
            color,
            roughness,
            metalness:
                textureKind ===
                "ice"
                    ?
                    0.12
                    :
                    0.03,
            side:
                THREE.DoubleSide,
            map:
                detailTexture
                ||
                null,
            bumpMap:
                detailTexture
                ||
                null,
            bumpScale:
                textureKind ===
                "asphalt"
                    ?
                    0.055
                    :
                    0.025
        });


    return new THREE.Mesh(
        geometry,
        meshMaterial
    );

}
function buildRoad() {
    const roadColor =
        activeTrackId ===
        "arctic"
            ?
            0x263746
            :
            0x2b343e;

    const shoulderColor =
        activeTrackId ===
        "arctic"
            ?
            0xa9bcc9
            :
            0x505a64;

    const edgeColor =
        activeTrackId ===
        "arctic"
            ?
            0xe5f2f7
            :
            0xbec7d3;

    const surfaceLayers = [
        makeRibbon(
            -ROAD_HALF,
            ROAD_HALF,
            activeTrackId === "neon" ? 0xffffff : roadColor,
            0.04,
            0.78,
            "asphalt",
            activeTrackId ===
            "arctic"
                ?
                72
                :
                28
        ),
        makeRibbon(
            ROAD_HALF,
            SIDEWALK_OUTER,
            activeTrackId === "neon" ? 0xffffff : shoulderColor,
            0.055,
            0.95,
            activeTrackId ===
            "arctic"
                ?
                "snow"
                :
                "concrete",
            34
        ),
        makeRibbon(
            -ROAD_HALF,
            -SIDEWALK_OUTER,
            activeTrackId === "neon" ? 0xffffff : shoulderColor,
            0.055,
            0.95,
            activeTrackId ===
            "arctic"
                ?
                "snow"
                :
                "concrete",
            34
        ),
        makeRibbon(ROAD_HALF - 0.30, ROAD_HALF + 0.12, edgeColor, 0.078, 0.8),
        makeRibbon(-ROAD_HALF + 0.30, -ROAD_HALF - 0.12, edgeColor, 0.078, 0.8),
        makeRibbon(5.55, 5.68, 0xd6dce4, 0.084, 0.8),
        makeRibbon(-5.55, -5.68, 0xd6dce4, 0.084, 0.8)
    ];

    worldGroup.add(...surfaceLayers);


    if (
        activeTrackId === "neon"
    ) {

        NEON_ART.applyPbr({
            THREE,
            renderer,
            sceneRoot: worldGroup,
            material: surfaceLayers[0].material,
            kind: "asphalt"
        });
        // Same PBR road material survives the asynchronous texture loads;
        // weather only varies its appearance, never the grip physics.
        weatherRoadMaterial = surfaceLayers[0].material;


        for (
            const layer
            of [surfaceLayers[1], surfaceLayers[2]]
        ) {

            NEON_ART.applyPbr({
                THREE,
                renderer,
                sceneRoot: worldGroup,
                material: layer.material,
                kind: "concrete"
            });

        }


        NEON_ART.addStreetSurfaceDetails({
            THREE,
            worldGroup,
            trackSamples,
            sampleCount: TRACK_SAMPLE_COUNT,
            getFrameAt,
            roadHalf: ROAD_HALF,
            sidewalkOuter: SIDEWALK_OUTER,
            registerCollider: (position, halfWidth, halfDepth, rotationY, options) =>
                addEnvironmentBoxCollider(position, halfWidth, halfDepth, rotationY, options)
        });


        NEON_ART.addStreetLighting({
            THREE,
            worldGroup,
            trackSamples,
            sampleCount: TRACK_SAMPLE_COUNT,
            roadHalf: ROAD_HALF
        });

    }


    const dashSamples = [];
    for (let i = 0; i < TRACK_SAMPLE_COUNT; i += (activeTrackId === "neon" ? 5 : 3)) {
        dashSamples.push(trackSamples[i]);
    }
    const dashes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.025,
        activeTrackId === "neon" ? 1.8 : 3.0), new THREE.MeshBasicMaterial({
        color: 0xe4e7eb
    }), dashSamples.length);
    const dummy = new THREE.Object3D();
    dashSamples.forEach((sample, index) => {
        dummy.position.copy(sample.point);
        dummy.position.y =
            sample.point.y + 0.08;
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
    /*
      Correct zebra crossings: separate white slabs painted across the
      roadway. Previously every 12-m-long strip overlapped the next,
      causing one giant fluorescent slab across city intersections.
    */
    const paint =
        new THREE.MeshStandardMaterial({
            color: 0xd2d6d5,
            roughness: .93,
            metalness: 0
        });

    const stripeGeo =
        new THREE.BoxGeometry(.64,.015,2.35);

    for(const t of crosswalkTs) {
        const frame=getFrameAt(t);
        const group=new THREE.Group();
        group.position.copy(frame.point);
        group.rotation.y=frame.rotationY;
        for(let i=-6;i<=6;i++){
            const stripe=new THREE.Mesh(stripeGeo,paint);
            stripe.position.set(i*.94,.095,0);
            group.add(stripe);
        }
        worldGroup.add(group);
    }
}
function neonBuildingIntrudesOnRoad(position, halfWidth, halfDepth, rotationY, clearance = 3) {
    // The same footprint check is used for visible facades and colliders.
    const cos = Math.cos(rotationY);
    const sin = Math.sin(rotationY);
    const safeMargin = SIDEWALK_OUTER + clearance;
    for (const sample of trackSamples) {
        const dx = sample.point.x - position.x;
        const dz = sample.point.z - position.z;
        const localX = dx * cos - dz * sin;
        const localZ = dx * sin + dz * cos;
        if (Math.abs(localX) < halfWidth + safeMargin &&
            Math.abs(localZ) < halfDepth + safeMargin) return true;
    }
    return false;
}
function buildCity() {
    /*
      Neon V3 is organized around a real shipping canal. Bank terrain
      is physically open at the channel instead of an endless floating
      2.5-kilometer cardboard/concrete slab.
    */
    NEON_INFRA.buildWaterfront({
        THREE,
        worldGroup,
        registerBuilding: (position,width,depth,rotationY,height,tag="WAREHOUSE") => {
            addEnvironmentBoxCollider(
                position,width/2,depth/2,rotationY,
                {minY:-1,maxY:height,tag}
            );
        }
    });

    const cityLayout = NEON_ART.buildBackdrop({
        THREE,
        worldGroup,
        trackSamples,
        sampleCount: TRACK_SAMPLE_COUNT,
        getFrameAt,
        registerBuilding: (position, width, depth, rotationY, height) => {
            addEnvironmentBoxCollider(
                position, width / 2, depth / 2, rotationY,
                { minY: -1, maxY: height, tag: "BUILDING" }
            );
        }
    });

    // Purely decorative local traffic; no race collisions, scoring, or
    // multiplayer packets, even if several clients load the same map.
    trafficSystem = NEON_TRAFFIC.createNeonTraffic({
        THREE, worldGroup,
        roadSegments: cityLayout.trafficRoads,
        trackSamples,
        maxCars: 26
    });

    const activeNeonArtRoot = worldGroup;
    NEON_ART.loadAuthoredModels({
        THREE,
        worldGroup,
        getFrameAt,
        trackSamples,
        sidewalkOuter: SIDEWALK_OUTER,
        registerBuilding: (position, width, depth, rotationY, height) => {
            if (worldGroup !== activeNeonArtRoot || !worldGroup?.parent) return;
            addEnvironmentBoxCollider(
                position, width / 2, depth / 2, rotationY,
                { minY: -1, maxY: height, tag: "MODEL" }
            );
        }
    }).catch(error => console.warn("Neon model dressing:", error));

    const buildingSpecs = [];


    const secretCorridors =
        rampDefinitions
            .filter(
                ramp =>
                    ramp.secret
                    &&
                    Number.isFinite(
                        Number(
                            ramp.targetT
                        )
                    )
            )
            .map(
                ramp => {

                    const frame =
                        getFrameAt(
                            ramp.t
                        );


                    return {
                        start:
                            frame.point
                                .clone()
                                .addScaledVector(
                                    frame.normal,
                                    ramp.offset
                                    ||
                                    0
                                ),

                        end:
                            getShortcutLandingPoint(
                                ramp
                            )
                    };

                }
            );


    /*
      Real GLB building sites line the actual street, not invisible behind
      generic cuboids. Reserve their footprints in the roadside building
      layout and let the asynchronous loader place the model there.
    */
    const authoredRoadsideSites = [
        [[.07,.23,.48,.64,.81],31,0],
        [[.10,.30,.58,.77,.96],30,1],
        [[.16,.40,.70,.89],31,2],
        [[.26,.55,.75],29,3]
    ].flatMap(([stops,offset,modelIndex])=>
        stops.map((t,i)=>{
            const frame=getFrameAt(t);
            const side=(i+modelIndex)%2===0?1:-1;
            return frame.point.clone().addScaledVector(
                frame.normal,side*offset
            );
        })
    );

    let buildingIndex = 0;


    for (
        let i = 0;
        i < TRACK_SAMPLE_COUNT;
        i += 13
    ) {

        const sample =
            trackSamples[i];


        const t =
            i /
            TRACK_SAMPLE_COUNT;


        const alley =
            sectionContains(
                t,
                0.490,
                0.585
            );


        const downtown =
            sectionContains(
                t,
                0.015,
                0.205
            );


        for (
            const side
            of [-1, 1]
        ) {

            const distance =
                alley
                    ?
                    13.8
                    +
                    (
                        buildingIndex *
                        5
                    )
                    %
                    3.5
                    :
                    (
                        18
                        +
                        (
                            buildingIndex *
                            7
                        )
                        %
                        10
                    );


            const height =
                downtown
                    ?
                    24
                    +
                    (
                        buildingIndex *
                        17
                    )
                    %
                    30
                    :
                    (
                        alley
                            ?
                            12
                            +
                            (
                                buildingIndex *
                                9
                            )
                            %
                            15
                            :
                            14
                            +
                            (
                                buildingIndex *
                                13
                            )
                            %
                            26
                    );


            const width =
                7
                +
                (
                    buildingIndex *
                    5
                )
                %
                6;


            const depth =
                8
                +
                (
                    buildingIndex *
                    11
                )
                %
                7;


            // The entire building must clear the sidewalk, not merely
            // its center; adjust for corners and neighboring route legs.
            const safeDistance = Math.max(
                distance, SIDEWALK_OUTER + 4.5 + Math.hypot(width / 2, depth / 2)
            );
            const position = sample.point.clone().addScaledVector(
                sample.normal, side * safeDistance
            );
            for (let shift = 0; shift < 4 &&
                neonBuildingIntrudesOnRoad(position, width / 2, depth / 2,
                    sample.rotationY, 2.5); shift++) {
                position.addScaledVector(sample.normal, side * 4);
            }


            /*
              Never visually wall off the two secret jump trajectories.
            */

            const inSecretFlightPath =
                secretCorridors.some(
                    corridor =>
                        pointToSegmentDistance2D(
                            position,
                            corridor.start,
                            corridor.end
                        )
                        <
                        10.5
                );


            // The central water channel is open. No buildings may
            // stand on its surface or inside a bridge's travel corridor.
            const inCanal =
                position.x > 113 && position.x < 227
                && Math.abs(position.z) < 401;

            const besideAuthoredModel = authoredRoadsideSites.some(
                p => Math.hypot(position.x-p.x,position.z-p.z)<19
            );
            const intersectsRaceway = neonBuildingIntrudesOnRoad(
                position, width / 2, depth / 2, sample.rotationY, 2.5
            );
            const overlapsBuilding = buildingSpecs.some(b =>
                Math.hypot(b.position.x-position.x,b.position.z-position.z) <
                Math.hypot(b.width, b.depth) / 2 + Math.hypot(width,depth) / 2 + 1.2
            );

            if (inSecretFlightPath || inCanal || besideAuthoredModel ||
                intersectsRaceway || overlapsBuilding) {
                continue;
            }


            const colors = [
                0x172231,
                0x1e2938,
                0x253142,
                0x202532,
                0x18283a,
                0x2a2438
            ];


            // Buildings sit on their urban lots, not floating beside a
            // graded approach or elevated bridge.
            position.y = 0;

            buildingSpecs.push({
                position,
                rotationY:
                    sample.rotationY,
                normal:
                    sample.normal.clone(),
                tangent:
                    sample.tangent.clone(),
                side,
                width,
                height,
                depth,
                color:
                    colors[
                        buildingIndex %
                        colors.length
                    ],
                index:
                    buildingIndex
            });


            buildingIndex++;

        }

    }


    NEON_ART.buildRoadsideArchitecture({
        THREE,
        worldGroup,
        buildings: buildingSpecs
    });

    // Match visible roadside building footprints to real oriented colliders.
    // The secret jump corridors remain unobstructed because these are built
    // from the same filtered buildingSpecs used to render the facades.
    for (const b of buildingSpecs) {
        addEnvironmentBoxCollider(b.position, b.width / 2, b.depth / 2,
            b.rotationY, { minY: -1, maxY: b.height, tag: "BUILDING" });
    }


    buildRooftopDetails(buildingSpecs);
    buildStreetLights();
    buildNeonSigns(buildingSpecs);
    NEON_ART.buildNeonAdvertising({THREE, worldGroup, buildings: buildingSpecs});
    buildBillboards();
    buildTrafficLights();
    buildLandmarkTower();

    // Full-size rectangular concrete expressway tunnels replace
    // the earlier bare box/egg-looking placeholder portals.
    NEON_ART.buildMetroTunnel({
        THREE,
        worldGroup,
        getFrameAt,
        sidewalkOuter: SIDEWALK_OUTER,
        start: 0.315,
        end: 0.365,
        theme: "metro",
        registerWallCollider: (position, halfWidth, halfDepth, rotationY, options) =>
            addEnvironmentBoxCollider(position, halfWidth, halfDepth, rotationY, options)
    });

    NEON_ART.buildMetroTunnel({
        THREE,
        worldGroup,
        getFrameAt,
        sidewalkOuter: SIDEWALK_OUTER,
        start: 0.865,
        end: 0.915,
        theme: "industrial",
        registerWallCollider: (position, halfWidth, halfDepth, rotationY, options) =>
            addEnvironmentBoxCollider(position, halfWidth, halfDepth, rotationY, options)
    });

    buildNeonDistrictSetPieces();
}
function addEnvironmentCircleCollider(
    position,
    radius,
    {
        minY = -1,
        maxY = 100,
        bounce = 0.24,
        drag = 0.58,
        tag = "OBJECT"
    } = {}
) {

    environmentColliders.push({
        type:
            "circle",

        x:
            position.x,

        z:
            position.z,

        radius,

        minY,

        maxY,

        bounce,

        drag,

        tag
    });

}


function addEnvironmentBoxCollider(
    position,
    halfWidth,
    halfDepth,
    rotationY = 0,
    {
        minY = -1,
        maxY = 100,
        bounce = 0.20,
        drag = 0.62,
        tag = "OBJECT"
    } = {}
) {

    environmentColliders.push({
        type:
            "box",

        x:
            position.x,

        z:
            position.z,

        halfWidth,

        halfDepth,

        rotationY,

        minY,

        maxY,

        bounce,

        drag,

        tag
    });

}


function pointToSegmentDistance2D(
    point,
    a,
    b
) {

    const abx =
        b.x -
        a.x;


    const abz =
        b.z -
        a.z;


    const apx =
        point.x -
        a.x;


    const apz =
        point.z -
        a.z;


    const lengthSq =
        abx *
        abx
        +
        abz *
        abz
        ||
        1;


    const t =
        THREE.MathUtils.clamp(
            (
                apx *
                abx
                +
                apz *
                abz
            )
            /
            lengthSq,
            0,
            1
        );


    const closestX =
        a.x
        +
        abx *
        t;


    const closestZ =
        a.z
        +
        abz *
        t;


    return Math.hypot(
        point.x -
        closestX,
        point.z -
        closestZ
    );

}


function collideWithEnvironment() {

    if (
        !car
        ||
        !carState
    ) {

        return;

    }


    for (
        const collider
        of environmentColliders
    ) {

        if (
            car.position.y >
            collider.maxY
            ||
            car.position.y <
            collider.minY
        ) {
            continue;
        }

        // Cheap broadphase before any rotation/trigonometry; important
        // once there are hundreds of actual city building colliders.
        const cx = car.position.x - collider.x;
        const cz = car.position.z - collider.z;
        const broadRadius = collider.type === "circle"
            ? collider.radius + CAR_RADIUS
            : Math.hypot(collider.halfWidth, collider.halfDepth) + CAR_RADIUS;
        if (Math.abs(cx) > broadRadius || Math.abs(cz) > broadRadius) {
            continue;
        }

        let normal =
            null;


        let penetration =
            0;


        if (
            collider.type ===
            "circle"
        ) {

            const dx =
                car.position.x -
                collider.x;


            const dz =
                car.position.z -
                collider.z;


            const distance =
                Math.hypot(
                    dx,
                    dz
                );


            const minimum =
                collider.radius
                +
                CAR_RADIUS;


            if (
                distance >=
                minimum
            ) {

                continue;

            }


            const safe =
                Math.max(
                    distance,
                    0.001
                );


            normal =
                new THREE.Vector3(
                    dx /
                    safe,
                    0,
                    dz /
                    safe
                );


            penetration =
                minimum -
                distance;

        }

        else {

            const cos =
                Math.cos(
                    -collider.rotationY
                );


            const sin =
                Math.sin(
                    -collider.rotationY
                );


            const dx =
                car.position.x -
                collider.x;


            const dz =
                car.position.z -
                collider.z;


            const localX =
                dx *
                cos
                -
                dz *
                sin;


            const localZ =
                dx *
                sin
                +
                dz *
                cos;


            const expandedX =
                collider.halfWidth
                +
                CAR_RADIUS;


            const expandedZ =
                collider.halfDepth
                +
                CAR_RADIUS;


            if (
                Math.abs(
                    localX
                )
                >=
                expandedX
                ||
                Math.abs(
                    localZ
                )
                >=
                expandedZ
            ) {

                continue;

            }


            const pushX =
                expandedX
                -
                Math.abs(
                    localX
                );


            const pushZ =
                expandedZ
                -
                Math.abs(
                    localZ
                );


            let nx =
                0;


            let nz =
                0;


            if (
                pushX <
                pushZ
            ) {

                nx =
                    localX >=
                    0
                        ?
                        1
                        :
                        -1;


                penetration =
                    pushX;

            }

            else {

                nz =
                    localZ >=
                    0
                        ?
                        1
                        :
                        -1;


                penetration =
                    pushZ;

            }


            const worldCos =
                Math.cos(
                    collider.rotationY
                );


            const worldSin =
                Math.sin(
                    collider.rotationY
                );


            normal =
                new THREE.Vector3(
                    nx *
                    worldCos
                    -
                    nz *
                    worldSin,
                    0,
                    nx *
                    worldSin
                    +
                    nz *
                    worldCos
                );

        }


        if (
            !normal
            ||
            penetration <=
            0
        ) {

            continue;

        }


        car.position
            .addScaledVector(
                normal,
                penetration
                +
                0.015
            );


        const normalSpeed =
            carState.velocity
                .dot(
                    normal
                );


        const hitSpeed =
            Math.abs(
                normalSpeed
            );


        if (
            normalSpeed <
            0
        ) {

            carState.velocity
                .addScaledVector(
                    normal,
                    -(
                        1
                        +
                        collider.bounce
                    )
                    *
                    normalSpeed
                );

        }


        carState.velocity
            .multiplyScalar(
                collider.drag
            );


        carState.impactPulse =
            Math.max(
                carState.impactPulse,
                0.8
            );


        carState.cameraShake =
            Math.max(
                carState.cameraShake,
                Math.min(
                    0.45,
                    hitSpeed /
                    28
                )
            );


        if (
            carState.impactCooldown <=
            0
            &&
            hitSpeed >
            4
        ) {

            showRacePopup(
                collider.tag ===
                "MOUNTAIN"
                    ?
                    "MOUNTAIN HIT"
                    :
                    "CRASH",
                420
            );


            carState.impactCooldown =
                0.42;

        }

    }

}


function arcticSceneryClearOfRoad(
    position,
    radius,
    margin = 4
) {

    const road =
        nearestTrackInfo(
            position
        );


    if (
        !road
    ) {

        return true;

    }


    return (
        road.distance >
        ROAD_HALF
        +
        radius
        +
        margin
    );

}


function buildArcticTunnel(
    startT,
    endT,
    {
        color = 0x596b78,
        ice = false,
        label = ""
    } = {}
) {

    const steps =
        12;


    const tunnelWallTexture =
        createSurfaceTexture(
            ice
                ?
                "ice"
                :
                "rock",
            3,
            4
        );


    const wallMaterial =
        new THREE.MeshStandardMaterial({
            color,
            roughness:
                ice
                    ?
                    0.40
                    :
                    0.90,
            metalness:
                ice
                    ?
                    0.10
                    :
                    0.015,
            map:
                tunnelWallTexture,
            bumpMap:
                tunnelWallTexture,
            bumpScale:
                ice
                    ?
                    0.055
                    :
                    0.13
        });


    const roofMaterial =
        new THREE.MeshStandardMaterial({
            color:
                ice
                    ?
                    0x8cb7ca
                    :
                    color,
            roughness:
                ice
                    ?
                    0.38
                    :
                    0.96,
            metalness:
                ice
                    ?
                    0.10
                    :
                    0.01
        });


    for (
        let i = 0;
        i <= steps;
        i++
    ) {

        const t =
            startT
            +
            (
                endT -
                startT
            )
            *
            (
                i /
                steps
            );


        const frame =
            getFrameAt(
                t
            );


        const group =
            new THREE.Group();


        group.position
            .copy(
                frame.point
            );


        group.rotation.y =
            frame.rotationY;


        const wallGeometry =
            new THREE.IcosahedronGeometry(
                1,
                2
            );


        const wallOffset =
            SIDEWALK_OUTER
            +
            9.0;


        const left =
            new THREE.Mesh(
                wallGeometry,
                wallMaterial
            );


        left.position.set(
            -wallOffset,
            4.9,
            0
        );


        left.scale.set(
            5.0
            +
            (
                i %
                3
            )
            *
            0.45,
            6.8
            +
            (
                i %
                2
            )
            *
            1.3,
            5.6
        );


        const right =
            new THREE.Mesh(
                wallGeometry,
                wallMaterial
            );


        right.position.set(
            wallOffset,
            4.9,
            0
        );


        right.scale.set(
            5.1
            +
            (
                (
                    i +
                    1
                )
                %
                3
            )
            *
            0.45,
            7.0
            +
            (
                (
                    i +
                    1
                )
                %
                2
            )
            *
            1.2,
            5.6
        );


        group.add(
            left,
            right
        );


        /*
          Continuous mountain/ice roof. The underside is high enough
          for cars and jumps to pass through, but visually the road
          disappears under the mountain instead of just running beside it.
        */

        const roof =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    (
                        SIDEWALK_OUTER
                        +
                        11
                    )
                    *
                    2,
                    3.6,
                    7.4
                ),
                roofMaterial
            );


        roof.position.y =
            8.8
            +
            (
                i %
                2
            )
            *
            0.35;


        group.add(
            roof
        );


        if (
            ice
            &&
            i %
            2 ===
            0
        ) {

            for (
                const x
                of [
                    -6.0,
                    -2.2,
                    2.5,
                    6.1
                ]
            ) {

                const icicle =
                    new THREE.Mesh(
                        new THREE.ConeGeometry(
                            0.16,
                            1.7
                            +
                            (
                                (
                                    i +
                                    Math.round(
                                        x
                                    )
                                )
                                %
                                3
                            )
                            *
                            0.22,
                            6
                        ),
                        new THREE.MeshBasicMaterial({
                            color:
                                0xc7efff
                        })
                    );


                icicle.position.set(
                    x,
                    6.25,
                    0
                );


                icicle.rotation.x =
                    Math.PI;


                group.add(
                    icicle
                );

            }

        }


        worldGroup.add(
            group
        );


        const leftCollider =
            frame.point
                .clone()
                .addScaledVector(
                    frame.normal,
                    -wallOffset
                );


        const rightCollider =
            frame.point
                .clone()
                .addScaledVector(
                    frame.normal,
                    wallOffset
                );


        addEnvironmentCircleCollider(
            leftCollider,
            4.55,
            {
                maxY:
                    12.5,

                bounce:
                    0.16,

                drag:
                    0.48,

                tag:
                    "MOUNTAIN"
            }
        );


        addEnvironmentCircleCollider(
            rightCollider,
            4.55,
            {
                maxY:
                    12.5,

                bounce:
                    0.16,

                drag:
                    0.48,

                tag:
                    "MOUNTAIN"
            }
        );

    }


    if (
        label
    ) {

        const frame =
            getFrameAt(
                startT
            );


        const sign =
            new THREE.Mesh(
                new THREE.PlaneGeometry(
                    5.2,
                    1.45
                ),
                new THREE.MeshBasicMaterial({
                    map:
                        createTextTexture(
                            label,
                            "#eaf7ff",
                            ice
                                ?
                                "#22485d"
                                :
                                "#303942"
                        ),
                    side:
                        THREE.DoubleSide
                })
            );


        sign.position
            .copy(
                frame.point
            )
            .addScaledVector(
                frame.normal,
                -(
                    SIDEWALK_OUTER
                    +
                    1.8
                )
            );


        sign.position.y =
            3.0;


        // Sector markers use two genuine front faces so the rear
        // never displays reversed/mirrored lettering.
        sign.material.side = THREE.FrontSide;
        sign.rotation.y = frame.rotationY + Math.PI;
        const reverseFace = sign.clone();
        reverseFace.rotation.y = frame.rotationY;
        reverseFace.position.y += .002;
        worldGroup.add(sign, reverseFace);

    }

}


function buildSecondShortcutMountainHole() {

    const shortcut =
        rampDefinitions
            .find(
                ramp =>
                    ramp.secret
                    &&
                    ramp.cave
                    &&
                    ramp.topHole
            );


    if (
        !shortcut
    ) {

        return;

    }


    const geometry =
        getCaveShortcutGeometry(
            shortcut
        );


    if (
        !geometry
    ) {

        return;

    }


    const {
        hole,
        normal,
        rotationY,
        holeHeight
    } =
        geometry;


    const mountain =
        new THREE.Group();


    mountain.position.set(
        hole.x,
        0,
        hole.z
    );


    mountain.rotation.y =
        rotationY;


    const rock =
        new THREE.MeshStandardMaterial({
            color:
                0x485762,
            roughness:
                0.98,
            metalness:
                0.01,
            flatShading:
                false,
            side:
                THREE.DoubleSide
        });


    const darkRock =
        new THREE.MeshStandardMaterial({
            color:
                0x35434e,
            roughness:
                1,
            metalness:
                0.01,
            flatShading:
                false,
            side:
                THREE.DoubleSide
        });


    const snow =
        new THREE.MeshStandardMaterial({
            color:
                0xd8e5eb,
            roughness:
                0.96,
            metalness:
                0.01,
            flatShading:
                false,
            side:
                THREE.DoubleSide
        });


    const tunnelDark =
        new THREE.MeshBasicMaterial({
            color:
                0x040a10,
            side:
                THREE.DoubleSide
        });


    const rim =
        new THREE.MeshBasicMaterial({
            color:
                0xa8ebff
        });


    const openingWidth =
        14.5;


    const openingHeight =
        8.5;


    const openingBottom =
        holeHeight
        -
        openingHeight /
        2;


    const openingTop =
        holeHeight
        +
        openingHeight /
        2;


    const mountainHalfWidth =
        23;


    const mountainHeight =
        56;


    const tunnelDepth =
        21;


    /*
      Extruded 2D rock shapes create one continuous mountain silhouette:
      solid at the bottom, rock on both sides, peak above, and ONLY the
      elevated rectangle is empty.
    */

    function extrudedRock(
        points,
        meshMaterial,
        depth =
            tunnelDepth
    ) {

        const shape =
            new THREE.Shape();


        shape.moveTo(
            points[0][0],
            points[0][1]
        );


        for (
            let i = 1;
            i < points.length;
            i++
        ) {

            shape.lineTo(
                points[i][0],
                points[i][1]
            );

        }


        shape.closePath();


        const shapeGeometry =
            new THREE.ExtrudeGeometry(
                shape,
                {
                    depth,
                    bevelEnabled:
                        true,
                    bevelThickness:
                        0.55,
                    bevelSize:
                        0.48,
                    bevelSegments:
                        3,
                    curveSegments:
                        4,
                    steps:
                        2
                }
            );


        shapeGeometry.translate(
            0,
            0,
            -depth /
            2
        );


        const mesh =
            new THREE.Mesh(
                shapeGeometry,
                meshMaterial
            );


        mountain.add(
            mesh
        );


        return mesh;

    }


    /*
      SOLID LOWER MOUNTAIN.
      This explicitly closes the old giant opening at ground level.
    */

    extrudedRock(
        [
            [
                -mountainHalfWidth,
                0
            ],
            [
                mountainHalfWidth,
                0
            ],
            [
                18,
                openingBottom *
                0.58
            ],
            [
                openingWidth /
                2,
                openingBottom
            ],
            [
                -openingWidth /
                2,
                openingBottom
            ],
            [
                -18,
                openingBottom *
                0.58
            ]
        ],
        darkRock
    );


    /*
      LEFT / RIGHT mountain faces wrap around the high opening.
    */

    extrudedRock(
        [
            [
                -mountainHalfWidth,
                0
            ],
            [
                -18,
                openingBottom *
                0.58
            ],
            [
                -openingWidth /
                2,
                openingBottom
            ],
            [
                -openingWidth /
                2,
                openingTop
            ],
            [
                -8.5,
                openingTop
                +
                4
            ],
            [
                -3.0,
                mountainHeight
                -
                8
            ],
            [
                -12,
                37
            ],
            [
                -20,
                18
            ]
        ],
        rock
    );


    extrudedRock(
        [
            [
                mountainHalfWidth,
                0
            ],
            [
                18,
                openingBottom *
                0.58
            ],
            [
                openingWidth /
                2,
                openingBottom
            ],
            [
                openingWidth /
                2,
                openingTop
            ],
            [
                8.5,
                openingTop
                +
                4
            ],
            [
                3.0,
                mountainHeight
                -
                8
            ],
            [
                12,
                37
            ],
            [
                20,
                18
            ]
        ],
        rock
    );


    /*
      Peak / bridge above the hole. This makes it read as one mountain
      instead of two towers with a floating roof.
    */

    extrudedRock(
        [
            [
                -8.5,
                openingTop
            ],
            [
                -3.0,
                mountainHeight
                -
                8
            ],
            [
                0,
                mountainHeight
            ],
            [
                3.0,
                mountainHeight
                -
                8
            ],
            [
                8.5,
                openingTop
            ],
            [
                openingWidth /
                2,
                openingTop
            ],
            [
                -openingWidth /
                2,
                openingTop
            ]
        ],
        rock
    );


    /*
      Snow cap only on the peak.
    */

    extrudedRock(
        [
            [
                -5.2,
                mountainHeight
                -
                12
            ],
            [
                0,
                mountainHeight
            ],
            [
                5.2,
                mountainHeight
                -
                12
            ],
            [
                3.8,
                mountainHeight
                -
                9
            ],
            [
                -3.8,
                mountainHeight
                -
                9
            ]
        ],
        snow,
        tunnelDepth
        +
        0.4
    );


    /*
      Dark tunnel interior. There is NO back wall, so the car can pass
      straight through the elevated opening.
    */

    const floor =
        addMesh(
            mountain,
            new THREE.BoxGeometry(
                openingWidth,
                0.30,
                tunnelDepth
            ),
            new THREE.MeshStandardMaterial({
                color:
                    0x243541,
                roughness:
                    0.82
            }),
            0,
            openingBottom
            +
            0.10,
            0
        );


    const ceiling =
        addMesh(
            mountain,
            new THREE.BoxGeometry(
                openingWidth,
                0.25,
                tunnelDepth
            ),
            tunnelDark,
            0,
            openingTop
            -
            0.10,
            0
        );


    for (
        const side
        of [-1, 1]
    ) {

        addMesh(
            mountain,
            new THREE.BoxGeometry(
                0.28,
                openingHeight,
                tunnelDepth
            ),
            tunnelDark,
            side
            *
            openingWidth /
            2,
            holeHeight,
            0
        );

    }


    /*
      Ice-blue rim on both sides of the elevated hole.
    */

    for (
        const z
        of [
            -tunnelDepth /
            2
            -
            0.20,
            tunnelDepth /
            2
            +
            0.20
        ]
    ) {

        addMesh(
            mountain,
            new THREE.BoxGeometry(
                0.34,
                openingHeight,
                0.42
            ),
            rim,
            -openingWidth /
            2,
            holeHeight,
            z
        );


        addMesh(
            mountain,
            new THREE.BoxGeometry(
                0.34,
                openingHeight,
                0.42
            ),
            rim,
            openingWidth /
            2,
            holeHeight,
            z
        );


        addMesh(
            mountain,
            new THREE.BoxGeometry(
                openingWidth,
                0.34,
                0.42
            ),
            rim,
            0,
            openingTop,
            z
        );

    }


    worldGroup.add(
        mountain
    );


    /*
      PHYSICS:
      - the entire bottom is solid;
      - side rock is solid at hole height;
      - the peak is solid above the hole;
      - the elevated opening itself has NO collider.
    */

    const lowerCenter =
        hole
            .clone()
            .setY(
                0
            );


    addEnvironmentBoxCollider(
        lowerCenter,
        mountainHalfWidth,
        tunnelDepth /
        2,
        rotationY,
        {
            minY:
                -1,

            maxY:
                openingBottom
                -
                0.15,

            bounce:
                0.05,

            drag:
                0.26,

            tag:
                "MOUNTAIN"
        }
    );


    const sideColliderWidth =
        (
            mountainHalfWidth
            -
            openingWidth /
            2
        )
        /
        2;


    const leftWorld =
        lowerCenter
            .clone()
            .addScaledVector(
                normal,
                -(
                    openingWidth /
                    2
                    +
                    sideColliderWidth /
                    2
                )
            );


    const rightWorld =
        lowerCenter
            .clone()
            .addScaledVector(
                normal,
                openingWidth /
                2
                +
                sideColliderWidth /
                2
            );


    addEnvironmentBoxCollider(
        leftWorld,
        sideColliderWidth /
        2,
        tunnelDepth /
        2,
        rotationY,
        {
            minY:
                openingBottom,

            maxY:
                openingTop
                +
                5,

            bounce:
                0.05,

            drag:
                0.27,

            tag:
                "MOUNTAIN"
        }
    );


    addEnvironmentBoxCollider(
        rightWorld,
        sideColliderWidth /
        2,
        tunnelDepth /
        2,
        rotationY,
        {
            minY:
                openingBottom,

            maxY:
                openingTop
                +
                5,

            bounce:
                0.05,

            drag:
                0.27,

            tag:
                "MOUNTAIN"
        }
    );


    addEnvironmentBoxCollider(
        lowerCenter,
        mountainHalfWidth *
        0.58,
        tunnelDepth /
        2,
        rotationY,
        {
            minY:
                openingTop,

            maxY:
                mountainHeight
                +
                4,

            bounce:
                0.04,

            drag:
                0.28,

            tag:
                "MOUNTAIN"
        }
    );

}
function buildArcticEnvironment() {

    /*
      ARCTIC RELAY V2
      ----------------
      The environment is intentionally built as a sequence of memorable
      sectors. No random ring of mountains around a circular road.
    */

    const arcticSnowTexture =
        createSurfaceTexture(
            "snow",
            48,
            42
        );


    const ground =
        new THREE.Mesh(
            new THREE.PlaneGeometry(
                2600,
                2200,
                12,
                10
            ),
            new THREE.MeshStandardMaterial({
                color:
                    0xc7d4dc,
                roughness:
                    0.94,
                map:
                    arcticSnowTexture,
                bumpMap:
                    arcticSnowTexture,
                bumpScale:
                    0.055
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


    const rockTexture =
        createSurfaceTexture(
            "rock",
            5,
            7
        );


    const snowTexture =
        createSurfaceTexture(
            "snow",
            5,
            5
        );


    const rockMaterial =
        new THREE.MeshStandardMaterial({
            color:
                0x52616c,
            roughness:
                0.90,
            map:
                rockTexture,
            bumpMap:
                rockTexture,
            bumpScale:
                0.18
        });


    const darkRockMaterial =
        new THREE.MeshStandardMaterial({
            color:
                0x3f4b55,
            roughness:
                0.94,
            map:
                rockTexture,
            bumpMap:
                rockTexture,
            bumpScale:
                0.18
        });


    const snowMaterial =
        new THREE.MeshStandardMaterial({
            color:
                0xdbe7ed,
            roughness:
                0.92,
            map:
                snowTexture,
            bumpMap:
                snowTexture,
            bumpScale:
                0.07
        });


    function addMountain(
        t,
        side,
        distance,
        radius,
        height,
        dark = false
    ) {

        const frame =
            getFrameAt(
                t
            );


        let safeDistance =
            Math.max(
                Math.abs(
                    distance
                ),
                radius
                +
                SIDEWALK_OUTER
                +
                18
            );


        let position =
            null;


        /*
          Arctic folds back over itself, so checking only the local road is
          not enough. Push the mountain outward until its ENTIRE base clears
          the nearest road section anywhere on the map.
        */

        for (
            let attempt = 0;
            attempt < 12;
            attempt++
        ) {

            const candidate =
                frame.point
                    .clone()
                    .addScaledVector(
                        frame.normal,
                        side *
                        safeDistance
                    );


            if (
                arcticSceneryClearOfRoad(
                    candidate,
                    radius,
                    10
                )
            ) {

                position =
                    candidate;


                break;

            }


            safeDistance +=
                18;

        }


        if (
            !position
        ) {

            /*
              Never spawn a mountain if a safe position cannot be found.
            */

            return;

        }


        const mountain =
            new THREE.Mesh(
                createDetailedMountainGeometry(
                    radius,
                    height,
                    1
                    +
                    Math.floor(
                        t *
                        1000
                    )
                    +
                    (
                        side >
                        0
                            ?
                            41
                            :
                            7
                    )
                ),
                dark
                    ?
                    darkRockMaterial
                    :
                    rockMaterial
            );


        mountain.position
            .copy(
                position
            );


        mountain.position.y =
            height *
            0.42;


        mountain.rotation.y =
            t *
            11.7;


        worldGroup.add(
            mountain
        );


        const cap =
            new THREE.Mesh(
                createDetailedMountainGeometry(
                    radius *
                    0.46,
                    height *
                    0.28,
                    90
                    +
                    Math.floor(
                        t *
                        1000
                    )
                ),
                snowMaterial
            );


        cap.position
            .copy(
                mountain.position
            );


        cap.position.y +=
            height *
            0.34;


        cap.rotation.y =
            mountain.rotation.y;


        worldGroup.add(
            cap
        );


        addEnvironmentCircleCollider(
            mountain.position,
            radius *
            0.72,
            {
                maxY:
                    height
                    +
                    10,

                bounce:
                    0.08,

                drag:
                    0.30,

                tag:
                    "MOUNTAIN"
            }
        );

    }

    /*
      SECTOR 1 — BASE CAMP
      Long opening straight with real buildings and service barriers.
    */

    const baseFrame =
        getFrameAt(
            0.025
        );


    for (
        const side
        of [-1, 1]
    ) {

        const hangar =
            new THREE.Group();


        hangar.position
            .copy(
                baseFrame.point
            )
            .addScaledVector(
                baseFrame.normal,
                side *
                25
            );


        hangar.rotation.y =
            baseFrame.rotationY;


        addMesh(
            hangar,
            new THREE.BoxGeometry(
                22,
                6,
                15
            ),
            material(
                side <
                0
                    ?
                    0x344553
                    :
                    0x2b3c49,
                0.74,
                0.16
            ),
            0,
            3,
            0
        );


        addMesh(
            hangar,
            new THREE.BoxGeometry(
                15,
                0.45,
                16
            ),
            material(
                0xd2dde3,
                0.90,
                0.04
            ),
            0,
            6.15,
            0
        );


        worldGroup.add(
            hangar
        );


        addEnvironmentBoxCollider(
            hangar.position,
            11,
            7.5,
            hangar.rotation.y,
            {
                maxY:
                    7,

                bounce:
                    0.10,

                drag:
                    0.34,

                tag:
                    "STATION"
            }
        );

    }


    /*
      SECTOR 2 — AVALANCHE VALLEY
      Mountains crowd the road on alternating sides.
    */

    addMountain(0.095, -1, 53, 35, 95, true);
    addMountain(0.118, 1, 49, 32, 88, false);
    addMountain(0.142, -1, 50, 37, 105, true);
    addMountain(0.160, 1, 52, 34, 96, false);


    /*
      SECTOR 3 — NORTH PASS
      A proper mountain tunnel.
    */

    buildArcticTunnel(
        0.178,
        0.218,
        {
            color:
                0x485660,

            label:
                "NORTH PASS"
        }
    );


    addMountain(0.184, -1, 50, 39, 112, true);
    addMountain(0.195, 1, 52, 38, 108, true);


    /*
      SECTOR 4 — GLACIER DROP
      Open valley with a huge ravine-jump feel.
    */

    addMountain(0.265, -1, 70, 47, 132, false);
    addMountain(0.300, 1, 75, 52, 145, true);
    addMountain(0.335, -1, 68, 44, 126, false);


    /*
      SECTOR 5 — FROZEN LAKE
      The road cuts across a giant blue ice field.
    */

    const lakeFrame =
        getFrameAt(
            0.420
        );


    const lake =
        new THREE.Mesh(
            new THREE.CircleGeometry(
                190,
                64
            ),
            new THREE.MeshStandardMaterial({
                color:
                    0x6c9db7,
                roughness:
                    0.22,
                metalness:
                    0.15,
                transparent:
                    true,
                opacity:
                    0.92
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
            -52
        );


    lake.position.y =
        0.006;


    worldGroup.add(
        lake
    );


    for (
        const t
        of [
            0.385,
            0.410,
            0.438,
            0.462
        ]
    ) {

        const frame =
            getFrameAt(
                t
            );


        for (
            const side
            of [-1, 1]
        ) {

            const iceSpire =
                new THREE.Mesh(
                    new THREE.ConeGeometry(
                        6.5,
                        20,
                        18,
                        5
                    ),
                    new THREE.MeshStandardMaterial({
                        color:
                            0x9fc8d8,
                        roughness:
                            0.38,
                        metalness:
                            0.06
                    })
                );


            iceSpire.position
                .copy(
                    frame.point
                )
                .addScaledVector(
                    frame.normal,
                    side *
                    20
                );


            iceSpire.position.y =
                8.5;


            worldGroup.add(
                iceSpire
            );


            addEnvironmentCircleCollider(
                iceSpire.position,
                4.2,
                {
                    maxY:
                        22,

                    bounce:
                        0.14,

                    drag:
                        0.40,

                    tag:
                        "ICE"
                }
            );

        }

    }


    /*
      SECTOR 6 — SIGNATURE SECRET CAVE
      Shortcut #2 jumps into this mountain opening.
    */

    buildSecondShortcutMountainHole();


    /*
      The cave structure itself is the mountain here; no extra cone
      mountains are placed across its flight corridor.
    */


    /*
      SECTOR 7 — INNER MOUNTAIN SWITCHBACKS
    */

    buildArcticTunnel(
        0.605,
        0.648,
        {
            color:
                0x708d9c,

            ice:
                true,

            label:
                "GLACIER CORE"
        }
    );


    addMountain(0.585, -1, 52, 38, 110, false);
    addMountain(0.665, 1, 50, 36, 104, true);
    addMountain(0.700, -1, 55, 40, 116, false);


    /*
      SECTOR 8 — RIDGELINE / RADIO OUTPOST
      Keep the whole radio-tower stretch mountain-free so nothing can
      intrude into the asphalt or hide the driving line.
    */


    /*
      SECTOR 9 — ICE VAULT / FINAL DESCENT
    */

    buildArcticTunnel(
        0.855,
        0.892,
        {
            color:
                0x7fa8ba,

            ice:
                true,

            label:
                "ICE VAULT"
        }
    );


    addMountain(0.900, -1, 58, 40, 116, true);
    addMountain(0.930, 1, 62, 42, 124, false);


    /*
      Sparse forest, intentionally secondary to the set pieces.
      Trees stay well outside the racing surface and the signature
      cave shortcut corridor is kept clear.
    */

    const signatureShortcut =
        rampDefinitions
            .find(
                ramp =>
                    ramp.secret
                    &&
                    ramp.cave
                    &&
                    Number.isFinite(
                        Number(
                            ramp.targetT
                        )
                    )
            )
        ??
        null;


    let shortcutStart =
        null;


    let shortcutEnd =
        null;


    if (
        signatureShortcut
    ) {

        const startFrame =
            getFrameAt(
                signatureShortcut.t
            );


        shortcutStart =
            startFrame.point
                .clone()
                .addScaledVector(
                    startFrame.normal,
                    signatureShortcut.offset
                    ||
                    0
                );


        shortcutEnd =
            getShortcutLandingPoint(
                signatureShortcut
            );

    }


    const treeEntries =
        [];


    for (
        let i = 0;
        i < TRACK_SAMPLE_COUNT;
        i += 22
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
                        (
                            28
                            +
                            (
                                (
                                    i /
                                    22
                                )
                                %
                                3
                            )
                            *
                            9
                        )
                    );


            if (
                shortcutStart
                &&
                shortcutEnd
                &&
                pointToSegmentDistance2D(
                    position,
                    shortcutStart,
                    shortcutEnd
                )
                <
                18
            ) {

                continue;

            }


            treeEntries.push({
                position,

                height:
                    6
                    +
                    (
                        i %
                        7
                    )
                    *
                    0.55,

                rotation:
                    i *
                    0.19
            });

        }

    }


    const trunks =
        new THREE.InstancedMesh(
            new THREE.CylinderGeometry(
                0.24,
                0.34,
                1,
                10
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
                16,
                4
            ),
            new THREE.MeshStandardMaterial({
                color:
                    0x173c38,
                roughness:
                    0.96
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
                0.17;


            dummy.rotation.set(
                0,
                tree.rotation,
                0
            );


            dummy.scale.set(
                1,
                tree.height *
                0.34,
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
                1.65,
                tree.height *
                0.76,
                1.65
            );


            dummy.updateMatrix();


            needles.setMatrixAt(
                index,
                dummy.matrix
            );


            addEnvironmentCircleCollider(
                tree.position,
                0.72,
                {
                    maxY:
                        tree.height
                        +
                        1,

                    bounce:
                        0.15,

                    drag:
                        0.42,

                    tag:
                        "TREE"
                }
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
      Research outpost landmark on the ridgeline.
    */

    const outpostFrame =
        getFrameAt(
            0.735
        );


    const outpost =
        new THREE.Group();


    outpost.position
        .copy(
            outpostFrame.point
        )
        .addScaledVector(
            outpostFrame.normal,
            -28
        );


    outpost.rotation.y =
        outpostFrame.rotationY;


    addMesh(
        outpost,
        new THREE.BoxGeometry(
            17,
            5,
            11
        ),
        material(
            0x293b49,
            0.70,
            0.16
        ),
        0,
        2.5,
        0
    );


    addMesh(
        outpost,
        new THREE.CylinderGeometry(
            0.18,
            0.18,
            16,
            6
        ),
        material(
            0x667783,
            0.64,
            0.36
        ),
        5,
        11,
        0
    );


    addMesh(
        outpost,
        new THREE.SphereGeometry(
            0.5,
            8,
            6
        ),
        new THREE.MeshBasicMaterial({
            color:
                0xff4466
        }),
        5,
        19,
        0
    );


    worldGroup.add(
        outpost
    );


    addEnvironmentBoxCollider(
        outpost.position,
        8.5,
        5.5,
        outpost.rotation.y,
        {
            maxY:
                6.5,

            bounce:
                0.10,

            drag:
                0.34,

            tag:
                "STATION"
        }
    );


    /*
      Aurora ribbon over the entire expedition.
    */

    const auroraColors =
        [
            0x62ffd1,
            0x70b8ff,
            0xa47cff
        ];


    for (
        let i = 0;
        i < 6;
        i++
    ) {

        const strip =
            new THREE.Mesh(
                new THREE.PlaneGeometry(
                    880,
                    38
                ),
                new THREE.MeshBasicMaterial({
                    color:
                        auroraColors[
                            i %
                            auroraColors.length
                        ],
                    transparent:
                        true,
                    opacity:
                        0.09,
                    side:
                        THREE.DoubleSide,
                    depthWrite:
                        false
                })
            );


        strip.position.set(
            -420
            +
            i *
            165,
            86
            +
            i *
            4,
            -230
            +
            i *
            92
        );


        strip.rotation.set(
            -0.17,
            0.16
            +
            i *
            0.09,
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
function buildBuildingLedges(
    buildings
) {

    const ledgeMaterial =
        material(
            0x5d6b7c,
            0.58,
            0.26
        );


    const entries =
        [];


    for (
        const building
        of buildings
    ) {

        const levels =
            building.height >
            20
                ?
                [
                    0.30,
                    0.58,
                    0.80
                ]
                :
                [
                    0.42,
                    0.72
                ];


        for (
            const level
            of levels
        ) {

            entries.push({
                building,
                y:
                    building.height *
                    level
            });

        }

    }


    const ledges =
        new THREE.InstancedMesh(
            new THREE.BoxGeometry(
                1,
                0.10,
                1
            ),
            ledgeMaterial,
            entries.length
        );


    const dummy =
        new THREE.Object3D();


    entries.forEach(
        (
            entry,
            index
        ) => {

            const building =
                entry.building;


            dummy.position
                .copy(
                    building.position
                );


            dummy.position.y =
                entry.y;


            dummy.rotation.set(
                0,
                building.rotationY,
                0
            );


            dummy.scale.set(
                building.width
                +
                0.32,
                1,
                building.depth
                +
                0.32
            );


            dummy.updateMatrix();


            ledges.setMatrixAt(
                index,
                dummy.matrix
            );

        }
    );


    ledges.instanceMatrix.needsUpdate =
        true;


    worldGroup.add(
        ledges
    );

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
    for (const item of placements) {
        addEnvironmentCircleCollider(item.position, 0.14, {
            minY: item.position.y - 0.1,
            maxY: item.position.y + 5.1,
            tag: "STREETLIGHT"
        });
    }
    const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.055, 0.075, 5.1, 6), material(0x555f6d, 0.7, 0.45), placements.length);
    const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.12, 0.88), new THREE.MeshBasicMaterial({
        color: 0xbddcff
    }), placements.length);
    const dummy = new THREE.Object3D();
    placements.forEach((item, index) => {
        dummy.position.copy(item.position);
        dummy.position.y =
            item.position.y + 2.55;
        dummy.rotation.set(0, item.rotationY, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        poles.setMatrixAt(index, dummy.matrix);
        dummy.position.copy(item.position);
        dummy.position.y =
            item.position.y + 5.02;
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
        // Billboard sites are kept beyond the curb/sidewalk and vary by
        // neighborhood, with unique colors instead of repeating one sign.
        { t: .038, side: -1, text: "NEON 88", fg:"#ffffff", bg:"#4f164e" },
        { t: .085, side:  1, text: "SYNTH", fg:"#76f8ff", bg:"#12283c" },
        { t: .145, side: -1, text: "PIXEL", fg:"#f6abf8", bg:"#351750" },
        { t: .204, side:  1, text: "RAMEN 24", fg:"#ffdf93", bg:"#63301e" },
        { t: .252, side: -1, text: "METRO", fg:"#aefbff", bg:"#193f55" },
        { t: .307, side:  1, text: "BYTE", fg:"#b7ffe1", bg:"#154034" },
        { t: .382, side: -1, text: "ARCADE", fg:"#fdb7fb", bg:"#402446" },
        { t: .440, side:  1, text: "VOLT", fg:"#ffeb9c", bg:"#46330b" },
        { t: .505, side: -1, text: "NOIR", fg:"#f6a1ff", bg:"#352041" },
        { t: .560, side:  1, text: "DRIVE", fg:"#b0dbff", bg:"#243e85" },
        { t: .615, side: -1, text: "KAIRO", fg:"#6cfbd1", bg:"#163c39" },
        { t: .680, side:  1, text: "APEX", fg:"#d9fff8", bg:"#163c39" },
        { t: .745, side: -1, text: "CYBER", fg:"#ffb3c0", bg:"#421a2a" },
        { t: .815, side:  1, text: "AFTER 9", fg:"#f9cdfd", bg:"#4b2153" },
        { t: .885, side: -1, text: "VORTEX", fg:"#ffffff", bg:"#491a24" },
        { t: .946, side:  1, text: "REDLINE", fg:"#c7dfff", bg:"#243e85" }
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
        // PlaneGeometry's back face mirrors lettering. Use a second
        // independently oriented front face for the other viewpoint.
        board.material.side = THREE.FrontSide;
        const readableBack = board.clone();
        readableBack.rotation.y = Math.PI;
        readableBack.position.z = -0.014;
        group.add(board, readableBack);
        worldGroup.add(group);
        addEnvironmentBoxCollider(group.position, 2.3, 0.14, group.rotation.y, {
            minY: frame.point.y - 0.1,
            maxY: frame.point.y + 5.1,
            tag: "BILLBOARD"
        });
    }
}
function buildTrafficLights() {
    const trafficTs = [
        0.095,
        0.245,
        0.405,
        0.555,
        0.705,
        0.835,
        0.955
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
        const support = frame.point.clone().addScaledVector(frame.normal, ROAD_HALF + 1.5);
        addEnvironmentCircleCollider(support, 0.17, {
            minY: frame.point.y - 0.1,
            maxY: frame.point.y + 4.9,
            tag: "TRAFFIC LIGHT"
        });
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
    addEnvironmentCircleCollider(center, 8.5, {
        minY: frame.point.y - 0.2,
        maxY: frame.point.y + 60,
        tag: "LANDMARK TOWER"
    });
}
function buildTunnel(
    start,
    end,
    wallColor =
        0x303844,
    lightColor =
        0xa8d9ff
) {

    const steps =
        Math.max(
            9,
            Math.round(
                (
                    end -
                    start
                )
                *
                TRACK_SAMPLE_COUNT
                /
                3.3
            )
        );


    const concrete =
        material(
            wallColor,
            0.88,
            0.05
        );


    const dark =
        material(
            0x111720,
            0.96,
            0.02
        );


    const lightMat =
        new THREE.MeshBasicMaterial({
            color:
                lightColor
        });


    for (
        let i = 0;
        i <= steps;
        i++
    ) {

        const t =
            start
            +
            (
                end -
                start
            )
            *
            (
                i /
                steps
            );


        const frame =
            getFrameAt(
                t
            );


        const group =
            new THREE.Group();


        group.position
            .copy(
                frame.point
            );


        group.rotation.y =
            frame.rotationY;


        addMesh(
            group,
            new THREE.BoxGeometry(
                0.65,
                6.4,
                5.8
            ),
            concrete,
            -(
                SIDEWALK_OUTER
                +
                0.5
            ),
            3.2,
            0
        );


        addMesh(
            group,
            new THREE.BoxGeometry(
                0.65,
                6.4,
                5.8
            ),
            concrete,
            SIDEWALK_OUTER
            +
            0.5,
            3.2,
            0
        );


        addMesh(
            group,
            new THREE.BoxGeometry(
                SIDEWALK_OUTER *
                2
                +
                1.65,
                0.42,
                5.8
            ),
            dark,
            0,
            6.25,
            0
        );


        if (
            i %
            2 ===
            0
        ) {

            addMesh(
                group,
                new THREE.BoxGeometry(
                    0.24,
                    0.06,
                    3.2
                ),
                lightMat,
                0,
                6.00,
                0
            );

        }


        if (
            i %
            4 ===
            0
        ) {

            addMesh(
                group,
                new THREE.BoxGeometry(
                    0.09,
                    2.3,
                    3.5
                ),
                new THREE.MeshBasicMaterial({
                    color:
                        lightColor,
                    transparent:
                        true,
                    opacity:
                        0.35
                }),
                -(
                    SIDEWALK_OUTER
                    -
                    0.35
                ),
                2.4,
                0
            );


            addMesh(
                group,
                new THREE.BoxGeometry(
                    0.09,
                    2.3,
                    3.5
                ),
                new THREE.MeshBasicMaterial({
                    color:
                        lightColor,
                    transparent:
                        true,
                    opacity:
                        0.35
                }),
                SIDEWALK_OUTER
                -
                0.35,
                2.4,
                0
            );

        }


        worldGroup.add(
            group
        );

    }

}

function buildNeonDistrictSetPieces() {

    function districtGate(
        t,
        text,
        color
    ) {

        const frame =
            getFrameAt(
                t
            );


        const group =
            new THREE.Group();


        group.position
            .copy(
                frame.point
            );


        group.rotation.y =
            frame.rotationY;


        const structure =
            material(
                0x3b4655,
                0.68,
                0.34
            );


        addMesh(
            group,
            new THREE.BoxGeometry(
                0.30,
                5.6,
                0.30
            ),
            structure,
            -(
                ROAD_HALF
                +
                1.1
            ),
            2.8,
            0
        );


        addMesh(
            group,
            new THREE.BoxGeometry(
                0.30,
                5.6,
                0.30
            ),
            structure,
            ROAD_HALF
            +
            1.1,
            2.8,
            0
        );


        addMesh(
            group,
            new THREE.BoxGeometry(
                ROAD_HALF *
                2
                +
                2.5,
                0.22,
                0.32
            ),
            new THREE.MeshBasicMaterial({
                color
            }),
            0,
            5.55,
            0
        );


        const texture =
            createTextTexture(
                text,
                "#ffffff",
                "#111827",
                768,
                160
            );


        const sign =
            new THREE.Mesh(
                new THREE.PlaneGeometry(
                    5.8,
                    1.10
                ),
                new THREE.MeshBasicMaterial({
                    map:
                        texture,
                    side:
                        THREE.DoubleSide
                })
            );


        // Keep the fascia above the vehicle/camera envelope so it cannot
        // fill the screen as the car passes underneath the gantry.
        sign.position.set(0, 6.30, -0.18);
        sign.rotation.y = Math.PI;
        sign.material.side = THREE.FrontSide;
        const exitSide = sign.clone();
        exitSide.rotation.y = 0;
        exitSide.position.z = 0.18;
        group.add(sign, exitSide);


        worldGroup.add(group);
        for (const side of [-1, 1]) {
            const support = frame.point.clone().addScaledVector(
                frame.normal,
                side * (ROAD_HALF + 1.1)
            );
            addEnvironmentCircleCollider(support, 0.18, {
                minY: frame.point.y - 0.1,
                maxY: frame.point.y + 5.6,
                tag: "DISTRICT GATE"
            });
        }

    }


    districtGate(
        0.020,
        "DOWNTOWN",
        0x4f8cff
    );


    districtGate(
        0.300,
        "METRO",
        0x39d9ff
    );


    districtGate(
        0.485,
        "OLD CITY",
        0xff4e73
    );


    districtGate(
        0.675,
        "CONSTRUCTION",
        0xffad4d
    );


    districtGate(
        0.850,
        "UNDERPASS",
        0xa469ff
    );


    /*
      Multi-level parking structure beside the old-city exit.
    */

    {
        const frame =
            getFrameAt(
                0.605
            );


        const garage =
            new THREE.Group();


        garage.position
            .copy(
                frame.point
            )
            .addScaledVector(
                frame.normal,
                -27
            );


        garage.rotation.y =
            frame.rotationY;


        const slab =
            material(
                0x394553,
                0.82,
                0.10
            );


        const column =
            material(
                0x566474,
                0.74,
                0.18
            );


        for (
            let floor = 0;
            floor < 5;
            floor++
        ) {

            addMesh(
                garage,
                new THREE.BoxGeometry(
                    22,
                    0.45,
                    16
                ),
                slab,
                0,
                0.6
                +
                floor *
                3.15,
                0
            );

        }


        for (
            const x
            of [-9.5, 0, 9.5]
        ) {

            for (
                const z
                of [-6.5, 6.5]
            ) {

                addMesh(
                    garage,
                    new THREE.BoxGeometry(
                        0.55,
                        14.0,
                        0.55
                    ),
                    column,
                    x,
                    7,
                    z
                );

            }

        }


        addMesh(
            garage,
            new THREE.BoxGeometry(
                17,
                0.22,
                0.35
            ),
            new THREE.MeshBasicMaterial({
                color:
                    0xff4e73
            }),
            0,
            15.1,
            -8.1
        );


        worldGroup.add(garage);
        // Garage is a full-height hard structure, not a ghost shell.
        addEnvironmentBoxCollider(
            garage.position, 11, 8, garage.rotation.y,
            { minY: -1, maxY: 15.5, tag: "PARKING GARAGE" }
        );

    }


    /*
      Elevated metro/skyway crossing. Supports stay outside the raceway.
    */

    {
        const frame =
            getFrameAt(
                0.445
            );


        const group =
            new THREE.Group();


        group.position
            .copy(
                frame.point
            );


        group.rotation.y =
            frame.rotationY;


        const steel =
            material(
                0x48576a,
                0.55,
                0.48
            );


        addMesh(
            group,
            new THREE.BoxGeometry(
                SIDEWALK_OUTER *
                2
                +
                12,
                0.75,
                5.2
            ),
            steel,
            0,
            8.4,
            0
        );


        for (
            const side
            of [-1, 1]
        ) {

            addMesh(
                group,
                new THREE.BoxGeometry(
                    0.75,
                    8.4,
                    0.75
                ),
                steel,
                side *
                (
                    SIDEWALK_OUTER
                    +
                    3.5
                ),
                4.2,
                0
            );


            addMesh(
                group,
                new THREE.BoxGeometry(
                    0.24,
                    0.28,
                    4.4
                ),
                new THREE.MeshBasicMaterial({
                    color:
                        side <
                        0
                            ?
                            0x39d9ff
                            :
                            0xff4e73
                }),
                side *
                (
                    SIDEWALK_OUTER
                    +
                    3.5
                ),
                7.1,
                0
            );

        }


        worldGroup.add(group);
        group.updateMatrixWorld(true);
        for (const side of [-1, 1]) {
            const support = group.localToWorld(
                new THREE.Vector3(side * (SIDEWALK_OUTER + 3.5), 0, 0)
            );
            addEnvironmentBoxCollider(
                support, .375, .375, group.rotation.y,
                { minY: -1, maxY: 8.4, tag: "ELEVATED SUPPORT" }
            );
        }

    }


    /*
      Construction crane and half-built tower.
    */

    {
        const frame =
            getFrameAt(
                0.735
            );


        const site =
            new THREE.Group();


        site.position
            .copy(
                frame.point
            )
            .addScaledVector(
                frame.normal,
                27
            );


        site.rotation.y =
            frame.rotationY;


        const concrete =
            material(
                0x4e5965,
                0.88,
                0.08
            );


        const craneMat =
            material(
                0xc99438,
                0.58,
                0.28
            );


        for (
            let floor = 0;
            floor < 4;
            floor++
        ) {

            addMesh(
                site,
                new THREE.BoxGeometry(
                    15,
                    0.45,
                    12
                ),
                concrete,
                -2,
                0.6
                +
                floor *
                3.2,
                0
            );

        }


        for (
            const x
            of [-8, 4]
        ) {

            for (
                const z
                of [-5, 5]
            ) {

                addMesh(
                    site,
                    new THREE.BoxGeometry(
                        0.55,
                        11,
                        0.55
                    ),
                    concrete,
                    x,
                    5.5,
                    z
                );

            }

        }


        addMesh(
            site,
            new THREE.BoxGeometry(
                0.75,
                28,
                0.75
            ),
            craneMat,
            9,
            14,
            -5
        );


        addMesh(
            site,
            new THREE.BoxGeometry(
                21,
                0.55,
                0.55
            ),
            craneMat,
            1,
            26.5,
            -5
        );


        addMesh(
            site,
            new THREE.BoxGeometry(
                0.18,
                7,
                0.18
            ),
            craneMat,
            -8.5,
            22.8,
            -5
        );


        worldGroup.add(site);
        site.updateMatrixWorld(true);
        for (const px of [-8, 4]) {
            for (const pz of [-5, 5]) {
                const foot = site.localToWorld(
                    new THREE.Vector3(px, 0, pz)
                );
                addEnvironmentBoxCollider(
                    foot, .275, .275, site.rotation.y,
                    { minY: -1, maxY: 11, tag: "CONSTRUCTION COLUMN" }
                );
            }
        }
        const craneFoot = site.localToWorld(new THREE.Vector3(9, 0, -5));
        addEnvironmentBoxCollider(
            craneFoot, .375, .375, site.rotation.y,
            { minY: -1, maxY: 28, tag: "CRANE" }
        );

    }


    /*
      Container/service yard near the final sector.
    */

    {
        const frame =
            getFrameAt(
                0.795
            );


        for (
            let i = 0;
            i < 12;
            i++
        ) {

            const side =
                i %
                2 ===
                0
                    ?
                    -1
                    :
                    1;


            const container =
                new THREE.Mesh(
                    new THREE.BoxGeometry(
                        5.8,
                        2.5,
                        2.4
                    ),
                    material(
                        [
                            0x395a76,
                            0x784052,
                            0x4d6a50,
                            0x76563a
                        ][
                            i %
                            4
                        ],
                        0.78,
                        0.16
                    )
                );


            container.position
                .copy(
                    frame.point
                )
                .addScaledVector(
                    frame.normal,
                    side *
                    (
                        19
                        +
                        (
                            i %
                            3
                        )
                        *
                        3.0
                    )
                )
                .addScaledVector(
                    frame.tangent,
                    (
                        Math.floor(
                            i /
                            2
                        )
                        -
                        2.5
                    )
                    *
                    5.4
                );


            container.position.y =
                1.25
                +
                (
                    i %
                    5 ===
                    0
                        ?
                        2.55
                        :
                        0
                );


            container.rotation.y =
                frame.rotationY;


            worldGroup.add(container);
            addEnvironmentBoxCollider(
                container.position, 2.9, 1.2, container.rotation.y,
                {
                    minY: container.position.y - 1.25,
                    maxY: container.position.y + 1.25,
                    tag: "SHIPPING CONTAINER"
                }
            );

        }

    }

}


function buildParkingLot() {
    const frame = getFrameAt(0.625);
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
    // Legible from both ends of the parking entrance.
    sign.material.side = THREE.FrontSide;
    sign.rotation.y = zone.rotationY + Math.PI;
    const parkingReverse = sign.clone();
    parkingReverse.rotation.y = zone.rotationY;
    parkingReverse.position.y += .002;
    worldGroup.add(sign, parkingReverse);
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
function wrappedTrackDistance(
    a,
    b
) {

    const difference =
        Math.abs(
            a -
            b
        );


    return Math.min(
        difference,
        1 -
        difference
    );

}


function barrierWouldBlockCrossing(
    midpoint,
    t,
    barrierY = midpoint.y
) {
    /*
      Both routes pass near their own return legs and district connectors.
      Do not put a wall across another drivable segment. On Neon, ignore
      roads at a different elevation so the bridge rail stays continuous
      above the lower waterfront street.
    */
    for (const sample of trackSamples) {
        if (wrappedTrackDistance(t, sample.t) < 0.035) continue;
        if (activeTrackId === "neon" &&
            Math.abs(sample.point.y - barrierY) > 2.5) continue;
        if (flatDistance(midpoint, sample.point) < ROAD_HALF * 2 + 10) {
            return true;
        }
    }
    return false;
}

function neonRailIntrudesOnRoad(a, b, height) {
    if (activeTrackId !== "neon") return false;
    // A rail that cuts through a curved portion of the drivable asphalt
    // must be omitted. Check the whole span, not only its midpoint.
    // This catches sharp turn/chicane intersections at the final underpass.
    for (const sample of trackSamples) {
        if (Math.abs(sample.point.y - height) > 2.3) continue;
        if (pointToSegmentDistance2D(sample.point, a, b) <
            ROAD_HALF + 1.1) return true;
    }
    return false;
}

function buildBarriers() {
    barriers = [];
    const barrierMaterial = material(
        activeTrackId === "arctic" ? 0xd7e4ec : 0x697688,
        0.62,
        0.35
    );
    for (const section of barrierSections) {
        for (let i = 0; i < TRACK_SAMPLE_COUNT; i += 3) {
            const t = i / TRACK_SAMPLE_COUNT;
            if (!sectionContains(t, section.start, section.end)) continue;

            const nextIndex = (i + 3) % TRACK_SAMPLE_COUNT;
            const aSample = trackSamples[i];
            const bSample = trackSamples[nextIndex];
            const barrierY = (aSample.point.y + bSample.point.y) * 0.5;

            // Raised Neon spans already receive grade-following guardrails
            // and collision segments from NEON_INFRA.buildRaisedRoads.
            if (activeTrackId === "neon" && barrierY > 1.0) continue;

            const a = aSample.point.clone().addScaledVector(
                aSample.normal,
                section.side * (SIDEWALK_OUTER + 0.45)
            );
            const b = bSample.point.clone().addScaledVector(
                bSample.normal,
                section.side * (SIDEWALK_OUTER + 0.45)
            );
            const midpoint = a.clone().add(b).multiplyScalar(0.5);

            if (barrierWouldBlockCrossing(midpoint, t, barrierY)) continue;
            if (neonRailIntrudesOnRoad(a, b, barrierY)) continue;

            const segment = b.clone().sub(a);
            const horizontalLength = Math.hypot(segment.x, segment.z);
            const rail = new THREE.Mesh(
                new THREE.BoxGeometry(0.28, 0.80, segment.length()),
                barrierMaterial
            );
            rail.position.copy(midpoint);
            rail.position.y = barrierY + 0.45;
            rail.rotation.order = "YXZ";
            rail.rotation.y = Math.atan2(segment.x, segment.z);
            rail.rotation.x = -Math.atan2(segment.y, horizontalLength);
            worldGroup.add(rail);

            barriers.push({
                a: new THREE.Vector2(a.x, a.z),
                b: new THREE.Vector2(b.x, b.z),
                y: barrierY
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
        // A guardrail on an elevated bridge must not block a vehicle
        // traveling on the lower waterfront beside/under that bridge.
        if (activeTrackId === "neon" && Number.isFinite(barrier.y) &&
            Math.abs(car.position.y-barrier.y)>2.1) continue;
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
                car.position.y + 0.42;
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
function buildConstructionBarrier() {
    const group = new THREE.Group();
    const concrete = material(0xa2a9af, 0.88, 0.02);
    const darkFoot = material(0x333d46, 0.82, 0.04);
    const orange = new THREE.MeshStandardMaterial({
        color: 0xff9a36,
        roughness: 0.55,
        metalness: 0.02,
        emissive: 0x8b3a05,
        emissiveIntensity: 0.22
    });
    const white = new THREE.MeshStandardMaterial({
        color: 0xf0f2f4,
        roughness: 0.78,
        metalness: 0.02,
        emissive: 0x30363d,
        emissiveIntensity: 0.10
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.78, 0.72), concrete);
    body.position.y = 0.44;
    group.add(body);

    for (const x of [-0.82, 0.82]) {
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.16, 0.92), darkFoot);
        foot.position.set(x, 0.09, 0);
        group.add(foot);
    }

    const cap = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.08, 0.76), white);
    cap.position.y = 0.85;
    group.add(cap);

    for (let i = 0; i < 6; i++) {
        const x = -1.0 + i * 0.4;
        const stripeMaterial = i % 2 === 0 ? orange : white;
        for (const z of [-0.382, 0.382]) {
            const stripe = new THREE.Mesh(
                new THREE.BoxGeometry(0.22, 0.56, 0.035),
                stripeMaterial
            );
            stripe.position.set(x, 0.46, z);
            stripe.rotation.z = -0.38;
            group.add(stripe);
        }
    }

    const reflectorMaterial = new THREE.MeshBasicMaterial({ color: 0xffd77a });
    for (const x of [-0.92, 0, 0.92]) {
        const reflector = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.11, 0.06),
            reflectorMaterial
        );
        reflector.position.set(x, 0.72, 0.40);
        group.add(reflector);
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
        else if (activeTrackId === "neon") {
            mesh = buildConstructionBarrier();
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
            position: new THREE.Vector3(
                mesh.position.x,mesh.position.y,mesh.position.z
            )
        });
    }
}
function collideWithObstacles() {
    for (const obstacle of obstacles) {
        if (activeTrackId === "neon" &&
            Math.abs(car.position.y - obstacle.position.y)>2.4) continue;
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
                car.position.y + 0.45;
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
        if (activeTrackId === "neon") {
            // No more giant white scaffolding across real city junctions.
            // Keep the checkpoint hitbox and HUD exactly as before, but
            // mark its edges with understated, reflective roadside bollards.
            const bollard = new THREE.BoxGeometry(0.18, 1.25, 0.18);
            for (const side of [-1, 1]) {
                addMesh(group, bollard, gateMaterial,
                    side * (ROAD_HALF + 0.8), 0.625, 0);
            }
        } else {
            // Arctic retains its original checkpoint appearance.
            const poles = new THREE.BoxGeometry(0.18, 4.6, 0.18);
            const beam = new THREE.BoxGeometry(ROAD_HALF * 2 + 1.9, 0.26, 0.22);
            addMesh(group, poles, gateMaterial, -(ROAD_HALF + 0.6), 2.3, 0);
            addMesh(group, poles, gateMaterial, ROAD_HALF + 0.6, 2.3, 0);
            addMesh(group, beam, gateMaterial, 0, 4.55, 0);
        }
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
function respawnAtLastCheckpoint(
    automatic = false
) {

    if (
        !car
        ||
        !carState
        ||
        !lastCheckpointTransform
        ||
        localFinished
    ) {

        return;

    }


    car.position
        .copy(
            lastCheckpointTransform
                .position
        );


    car.position.y =
        activeTrackId === "neon"
            ? lastCheckpointTransform.position.y
            : 0;


    car.rotation.y =
        lastCheckpointTransform
            .rotationY;


    carState.velocity
        .set(
            0,
            0,
            0
        );


    carState.airborne =
        false;


    carState.verticalVelocity =
        0;


    carState.shortcutActive =
        false;


    carState.shortcutTakeoffT =
        null;


    carState.shortcutLandingT =
        null;


    carState.shortcutFlightTime =
        null;


    carState.shortcutLandingPoint =
        null;


    carState.stillTimer =
        0;


    carState.respawnCooldown =
        1.25;


    carState.cameraShake =
        0;


    showRacePopup(
        automatic
            ?
            "STUCK — RETURNED TO CHECKPOINT"
            :
            "RETURNED TO CHECKPOINT",
        800
    );

}


function trackForwardDistance(
    fromT,
    toT
) {

    return (
        (
            toT -
            fromT
        )
        %
        1
        +
        1
    )
    %
    1;

}


function creditShortcutCheckpoints(
    startT,
    endT
) {

    if (
        !Number.isFinite(
            Number(
                startT
            )
        )
        ||
        !Number.isFinite(
            Number(
                endT
            )
        )
    ) {

        return 0;

    }


    const shortcutSpan =
        trackForwardDistance(
            Number(
                startT
            ),
            Number(
                endT
            )
        );


    if (
        shortcutSpan <=
        0
        ||
        shortcutSpan >
        0.25
    ) {

        return 0;

    }


    let credited =
        0;


    for (
        let safety = 0;
        safety < checkpointGates.length;
        safety++
    ) {

        const gate =
            nextCheckpoint();


        if (
            !gate
        ) {

            break;

        }


        const gateDistance =
            trackForwardDistance(
                Number(
                    startT
                ),
                gate.t
            );


        const atTakeoffGate =
            Math.abs(
                gate.t -
                Number(
                    startT
                )
            )
            <
            0.012;


        const crossedByShortcut =
            atTakeoffGate
            ||
            (
                gateDistance >
                0
                &&
                gateDistance <=
                shortcutSpan
                +
                0.003
            );


        if (
            !crossedByShortcut
        ) {

            break;

        }


        const reachedFrame =
            getFrameAt(
                gate.t
            );


        lastCheckpointTransform = {
            position:
                reachedFrame.point
                    .clone()
                    .addScaledVector(
                        reachedFrame.tangent,
                        3.4
                    ),

            rotationY:
                reachedFrame.rotationY
        };


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


                return (
                    credited +
                    1
                );

            }

        }


        credited++;

    }


    if (
        credited >
        0
    ) {

        updateObjective();
        updateGateColors();

    }


    return credited;

}


function updateCheckpoints() {
    const target = nextCheckpoint();
    if (!target
        ||
            flatDistance(car.position, target.point) > 7
            ||
            (activeTrackId === "neon" &&
                Math.abs(car.position.y-target.point.y)>4)) {
        return;
    }
    showRacePopup("CHECKPOINT", 500);


    const reachedFrame =
        getFrameAt(
            target.t
        );


    lastCheckpointTransform = {
        position:
            reachedFrame.point
                .clone()
                .addScaledVector(
                    reachedFrame.tangent,
                    3.4
                ),

        rotationY:
            reachedFrame.rotationY
    };


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
            frame.point.y + 0.09;
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
        if (flatDistance(car.position, pad.position)<2.9
            && (activeTrackId !== "neon" ||
                Math.abs(car.position.y-pad.position.y)<2.5)) {
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
    pickups = [];
    for (const definition of pickupDefinitions) {
        const frame = getFrameAt(definition.t);
        const color = definition.type === "overdrive" ? 0xff9c3a : 0x59c7ff;

        // A clear floating power-up, with a matching ground ring and a soft
        // beacon so it reads as a collectible instead of a misplaced marker.
        const mesh = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.72, 0),
            new THREE.MeshStandardMaterial({
                color,
                emissive: color,
                emissiveIntensity: 0.55,
                metalness: 0.12,
                roughness: 0.28
            })
        );
        mesh.position.copy(frame.point).addScaledVector(frame.normal, definition.offset);
        mesh.position.y = frame.point.y + 1.25;

        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.88, 0.035, 6, 24),
            new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity: 0.72,
                depthWrite: false
            })
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.set(mesh.position.x, frame.point.y + 0.14, mesh.position.z);

        const beam = new THREE.Mesh(
            new THREE.CylinderGeometry(0.035, 0.12, 1.1, 8, 1, true),
            new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity: 0.20,
                depthWrite: false,
                side: THREE.DoubleSide
            })
        );
        beam.position.set(mesh.position.x, frame.point.y + 0.70, mesh.position.z);

        worldGroup.add(ring, beam, mesh);
        pickups.push({
            ...definition,
            mesh,
            ring,
            beam,
            position: mesh.position.clone(),
            active: true,
            respawn: 0,
            spin: definition.t * 10
        });
    }
}
function updatePickups(delta, elapsed) {
    for (const pickup of pickups) {
        if (!pickup.active) {
            pickup.respawn -= delta;
            if (pickup.respawn <= 0) {
                pickup.active = true;
                pickup.mesh.visible = true;
                pickup.ring.visible = true;
                pickup.beam.visible = true;
            }
            continue;
        }

        pickup.spin += delta * 1.8;
        pickup.mesh.rotation.y = pickup.spin;
        pickup.mesh.rotation.x = 0.12 + Math.sin(elapsed * 2.1 + pickup.spin) * 0.08;
        pickup.mesh.position.y = pickup.position.y +
            Math.sin(elapsed * 3 + pickup.spin) * 0.16;
        pickup.ring.material.opacity = 0.58 +
            Math.sin(elapsed * 3.2 + pickup.spin) * 0.12;
        pickup.beam.material.opacity = 0.15 +
            Math.sin(elapsed * 2.7 + pickup.spin) * 0.045;

        if (flatDistance(car.position, pickup.position) < 2
            && (activeTrackId !== "neon" ||
                Math.abs(car.position.y - pickup.position.y) < 2.5)) {
            pickup.active = false;
            pickup.mesh.visible = false;
            pickup.ring.visible = false;
            pickup.beam.visible = false;
            pickup.respawn = 9;
            if (pickup.type === "overdrive") {
                carState.overdriveTimer = Math.max(carState.overdriveTimer, 3.2);
                showRacePopup("OVERDRIVE", 600);
            }
            else {
                carState.nitro = Math.min(100, carState.nitro + 45);
                showRacePopup("NITRO +45", 600);
            }
        }
    }
}
function buildRamps() {
    ramps =
        [];


    for (
        const definition
        of rampDefinitions
    ) {

        const frame =
            getFrameAt(
                definition.t
            );


        const group =
            new THREE.Group();


        group.position
            .copy(
                frame.point
            )
            .addScaledVector(
                frame.normal,
                definition.offset
                ||
                0
            );


        let rampTangent =
            frame.tangent
                .clone();


        let rampNormal =
            frame.normal
                .clone();


        if (
            definition.secret
            &&
            Number.isFinite(
                Number(
                    definition.targetT
                )
            )
        ) {

            const caveGeometry =
                definition.cave
                &&
                definition.topHole
                    ?
                    getCaveShortcutGeometry(
                        definition
                    )
                    :
                    null;


            const target =
                caveGeometry
                    ?
                    caveGeometry.hole
                        .clone()
                    :
                    getShortcutLandingPoint(
                        definition
                    );


            rampTangent =
                target
                    .sub(
                        group.position
                    );


            rampTangent.y =
                0;


            if (
                rampTangent.lengthSq() >
                0.001
            ) {

                rampTangent.normalize();


                rampNormal =
                    new THREE.Vector3(
                        -rampTangent.z,
                        0,
                        rampTangent.x
                    );


                group.rotation.y =
                    Math.atan2(
                        rampTangent.x,
                        rampTangent.z
                    );

            }

            else {

                group.rotation.y =
                    frame.rotationY;

            }

        }

        else {

            group.rotation.y =
                frame.rotationY;

        }


        const width =
            definition.cave
            &&
            definition.topHole
                ?
                4.2
                :
                (
                    definition.secret
                        ?
                        2.7
                        :
                        4.4
                );


        const length =
            definition.cave
            &&
            definition.topHole
                ?
                12.5
                :
                (
                    definition.secret
                        ?
                        6.4
                        :
                        7.2
                );


        const rampMaterial =
            material(
                definition.secret
                    ?
                    0x6f8e9d
                    :
                    (
                        activeTrackId ===
                        "arctic"
                            ?
                            0xc4d8e3
                            :
                            0x607188
                    ),
                0.72,
                0.10
            );


        if (activeTrackId === "neon" && !(definition.cave && definition.topHole)) {
            // Proper wedge: rear entrance is flush with the asphalt, with
            // a smooth sloped top rising toward the exit (+local Z).
            const low = 0.035;
            const high = definition.secret ? 0.92 : 0.76;
            const wedge = new THREE.Mesh(
                createWedgeGeometry(width, length, high, low, 1.0),
                new THREE.MeshStandardMaterial({
                    color: definition.secret ? 0x3c555e : 0x46515e,
                    roughness: 0.86,
                    metalness: 0.09,
                    side: THREE.DoubleSide
                })
            );
            wedge.position.y = 0.025;
            group.add(wedge);

            const stripColor = definition.secret ? 0xffc76a : 0x54b7ff;
            const stripMat = new THREE.MeshBasicMaterial({color:stripColor});
            const pitch = -Math.atan2(high - low, length);
            for (const edge of [-1, 1]) {
                const trim = new THREE.Mesh(
                    new THREE.BoxGeometry(0.085, 0.027, length * 0.93),
                    stripMat
                );
                trim.position.set(edge * (width * .5 - .11),
                    (high + low) * .5 + .05, 0);
                trim.rotation.x = pitch;
                group.add(trim);
            }
            // Distinct caution marks keep the jump readable at speed.
            const topMark = new THREE.Mesh(
                new THREE.BoxGeometry(width * 0.55, 0.03, 0.13),
                stripMat
            );
            topMark.position.set(0, high + 0.058, length * .5 - .22);
            topMark.rotation.x = pitch;
            group.add(topMark);
        } else {
            // Preserve existing Arctic/cave ramp geometry.
            const deck = new THREE.Mesh(
                new THREE.BoxGeometry(width, 0.28, length),
                rampMaterial
            );
            deck.position.y = definition.cave && definition.topHole ? 0.95 : 0.48;
            deck.rotation.x = definition.cave && definition.topHole ? -0.34 : -0.12;
            group.add(deck);

            if (!definition.secret) {
                const stripe = new THREE.Mesh(
                    new THREE.BoxGeometry(width * 0.72, 0.04, 0.55),
                    new THREE.MeshBasicMaterial({color:0x5a9cff})
                );
                stripe.position.set(0, 0.66, -1.15);
                stripe.rotation.x = -0.12;
                group.add(stripe);
            }
        }

        worldGroup.add(
            group
        );


        ramps.push({
            ...definition,

            group,

            position:
                group.position
                    .clone(),

            tangent:
                rampTangent
                    .clone(),

            normal:
                rampNormal
                    .clone(),

            rotationY:
                group.rotation.y,

            cooldown:
                0
        });

    }

}


function updateRamps(
    delta
) {

    if (
        !carState
        ||
        !car
    ) {

        return;

    }


    carState.rampCooldown =
        Math.max(
            0,
            (
                carState.rampCooldown
                ||
                0
            )
            -
            delta
        );


    if (
        carState.rampCooldown >
        0
        ||
        carState.airborne
    ) {

        return;

    }


    const speed =
        carState.velocity
            .length();


    for (
        const ramp
        of ramps
    ) {

        ramp.cooldown =
            Math.max(
                0,
                (
                    ramp.cooldown
                    ||
                    0
                )
                -
                delta
            );


        if (
            ramp.cooldown >
            0
        ) {

            continue;

        }


        const distance =
            flatDistance(
                car.position,
                ramp.position
            );


        if (
            distance >
            (
                ramp.secret
                    ?
                    2.15
                    :
                    2.8
            )
        ) {

            continue;

        }


        const minSpeed =
            Number(
                ramp.minSpeed
            )
            ||
            13;


        const travelDirection =
            carState.velocity
                .clone()
                .normalize();


        const approachDot =
            travelDirection.dot(
                ramp.tangent
            );


        /*
          Only launch if the car is actually driving up the ramp.
          Grazing a ramp sideways/backwards was one source of wild jumps.
        */

        if (
            approachDot <
            0.30
        ) {

            continue;

        }


        if (
            speed <
            minSpeed
        ) {

            if (
                ramp.secret
            ) {

                showRacePopup(
                    "SECRET JUMP — NEED MORE SPEED",
                    650
                );

                ramp.cooldown =
                    1.0;

            }


            continue;

        }


        const takeoffRoad =
            nearestTrackInfo(
                car.position
            );


        /*
          Blend the horizontal velocity toward the ramp direction instead
          of freezing the car to one heading. This keeps takeoff stable
          while still preserving the driver's approach angle.
        */

        const launchDirection =
            travelDirection
                .clone()
                .lerp(
                    ramp.tangent,
                    ramp.secret
                        ?
                        0.46
                        :
                        0.32
                )
                .normalize();


        carState.velocity
            .copy(
                launchDirection
            )
            .multiplyScalar(
                speed
            );


        carState.airborne =
            true;


        carState.airTime =
            0;


        carState.airSteer =
            0;


        carState.takeoffTrackT =
            takeoffRoad?.t
            ??
            ramp.t;


        carState.takeoffSpeed =
            Math.max(
                1,
                speed
            );


        /*
          Ramp launches used to inherit collision camera shake and
          steering corrections from the ground on the same frame.
          That is what caused the violent snap / fling behavior.
        */

        carState.cameraShake =
            0;


        carState.verticalVelocity =
            Number(
                ramp.strength
            )
            ||
            7.5;


        carState.rampCooldown =
            1.1;


        ramp.cooldown =
            1.25;


        if (
            ramp.secret
            &&
            Number.isFinite(
                Number(
                    ramp.targetT
                )
            )
        ) {

            const shortcutLanding =
                getFrameAt(
                    Number(
                        ramp.targetT
                    )
                );


            const landingPoint =
                getShortcutLandingPoint(
                    ramp
                );


            const toLanding =
                landingPoint
                    .clone()
                    .sub(
                        car.position
                    );


            toLanding.y =
                0;


            const distanceToLanding =
                toLanding.length();


            const caveGeometry =
                ramp.cave
                &&
                ramp.topHole
                    ?
                    getCaveShortcutGeometry(
                        ramp
                    )
                    :
                    null;


            /*
              The mountain shortcut is solved around the elevated hole:
              the same parabola crosses holeHeight at caveProgress and
              returns to ground level on the shortcut landing.
            */

            const flightTime =
                caveGeometry
                    ?
                    caveGeometry.flightTime
                    :
                    THREE.MathUtils.clamp(
                        distanceToLanding
                        /
                        Math.max(
                            Number(
                                ramp.shortcutSpeed
                            )
                            ||
                            68,
                            speed *
                            1.06
                        ),
                        1.20,
                        3.20
                    );


            if (
                distanceToLanding >
                0.1
            ) {

                const shortcutDirection =
                    toLanding
                        .clone()
                        .normalize();


                const requiredHorizontalSpeed =
                    THREE.MathUtils.clamp(
                        distanceToLanding /
                        flightTime,
                        34,
                        125
                    );


                carState.velocity
                    .copy(
                        shortcutDirection
                    )
                    .multiplyScalar(
                        requiredHorizontalSpeed
                    );

            }


            carState.verticalVelocity =
                17.5
                *
                flightTime
                *
                0.5;


            carState.shortcutActive =
                true;


            carState.shortcutTakeoffT =
                Number(
                    ramp.t
                );


            carState.shortcutLandingT =
                Number(
                    ramp.targetT
                );


            carState.shortcutFlightTime =
                flightTime;


            carState.shortcutLandingPoint =
                landingPoint;


            showRacePopup(
                "SECRET JUMP!",
                800
            );

        }

        else {

            carState.shortcutActive =
                false;


            carState.shortcutTakeoffT =
                null;


            carState.shortcutLandingT =
                null;


            carState.shortcutFlightTime =
                null;


            carState.shortcutLandingPoint =
                null;


            showRacePopup(
                "RAMP!",
                500
            );

        }


        break;

    }

}


function updateAirborne(
    delta
) {

    if (
        !carState
        ||
        !car
    ) {

        return;

    }


    if (
        !carState.airborne
    ) {

        car.position.y =
            activeTrackId === "neon"
                ? neonSurfaceHeight(car.position)
                : Math.max(0,car.position.y);


        /*
          Settle the chassis naturally after landing.
        */

        let roadPitch=0;
        if(activeTrackId==="neon") {
            const info=nearestTrackInfo(car.position);
            if(info && Math.abs(info.offset)<SIDEWALK_OUTER+1) {
                const t=info.tangent;
                const planar=Math.hypot(t.x,t.z);
                if(planar>.001) {
                    const travelSign=forwardVector().x*t.x+
                        forwardVector().z*t.z>=0?1:-1;
                    roadPitch=-Math.atan2(t.y,planar)*travelSign;
                }
            }
        }
        car.rotation.x =
            THREE.MathUtils.lerp(
                car.rotation.x,
                roadPitch,
                1 - Math.exp(-12*delta)
            );


        car.rotation.z =
            THREE.MathUtils.lerp(
                car.rotation.z,
                0,
                1 -
                Math.exp(
                    -12 *
                    delta
                )
            );


        return;

    }


    carState.airTime =
        (
            carState.airTime
            ||
            0
        )
        +
        delta;


    const airLeft =
        keys.has(
            "a"
        )
        ||
        keys.has(
            "arrowleft"
        );


    const airRight =
        keys.has(
            "d"
        )
        ||
        keys.has(
            "arrowright"
        );


    const airForward =
        keys.has(
            "w"
        )
        ||
        keys.has(
            "arrowup"
        );


    const airBack =
        keys.has(
            "s"
        )
        ||
        keys.has(
            "arrowdown"
        );


    const airSteerTarget =
        (
            airLeft
                ?
                1
                :
                0
        )
        -
        (
            airRight
                ?
                1
                :
                0
        );


    carState.airSteer =
        THREE.MathUtils.lerp(
            carState.airSteer
            ||
            0,
            airSteerTarget,
            1 -
            Math.exp(
                -8 *
                delta
            )
        );


    /*
      Limited air steering:
      A/D can yaw and bank the car, but not instantly spin it.
      The velocity follows the new heading gradually, which prevents
      the camera from looking one way while the car travels sideways.
    */

    const airYawRate =
        0.82;


    car.rotation.y +=
        carState.airSteer
        *
        airYawRate
        *
        delta;


    const horizontalSpeed =
        carState.velocity
            .length();


    if (
        horizontalSpeed >
        0.01
    ) {

        const desiredDirection =
            forwardVector();


        const currentDirection =
            carState.velocity
                .clone()
                .normalize();


        const airControl =
            1 -
            Math.exp(
                -1.45 *
                delta
            );


        currentDirection
            .lerp(
                desiredDirection,
                airControl
                *
                0.58
            )
            .normalize();


        carState.velocity
            .copy(
                currentDirection
            )
            .multiplyScalar(
                horizontalSpeed
            );

    }


    carState.verticalVelocity -=
        17.5 *
        delta;


    car.position.y +=
        carState.verticalVelocity
        *
        delta;


    /*
      Full-car airborne tilt. W/S adds pitch control and A/D adds roll.
      Vertical velocity also naturally raises the nose on takeoff and
      lowers it on descent.
    */

    const manualPitch =
        (
            airBack
                ?
                1
                :
                0
        )
        -
        (
            airForward
                ?
                1
                :
                0
        );


    const flightPitch =
        THREE.MathUtils.clamp(
            -carState.verticalVelocity
            *
            0.028
            +
            manualPitch
            *
            0.10,
            -0.30,
            0.30
        );


    const flightRoll =
        THREE.MathUtils.clamp(
            -carState.airSteer
            *
            0.20,
            -0.24,
            0.24
        );


    const tiltAmount =
        1 -
        Math.exp(
            -7.5 *
            delta
        );


    car.rotation.x =
        THREE.MathUtils.lerp(
            car.rotation.x,
            flightPitch,
            tiltAmount
        );


    car.rotation.z =
        THREE.MathUtils.lerp(
            car.rotation.z,
            flightRoll,
            tiltAmount
        );


    const maxAirTime =
        carState.shortcutActive
            ?
            Math.max(
                2.25,
                Number(
                    carState.shortcutFlightTime
                )
                +
                0.35
            )
            :
            2.25;


    let landingGround = activeTrackId === "neon"
        ? neonSurfaceHeight(car.position)
        : 0;

    // Once a car has fallen *below* a bridge, its underside is not a
    // magical trampoline. It must descend to the river or lower streets.
    if(activeTrackId==="neon" && landingGround>2.5 &&
        car.position.y<landingGround-2.5) {
        landingGround=(
            car.position.x>127 && car.position.x<213
            && Math.abs(car.position.z)<400
        ) ? -.40 : 0;
    }

    if(activeTrackId==="neon") {
        // Bridges and canal have different landing heights.
        if(car.position.y>landingGround &&
            carState.airTime<Math.max(5.5,maxAirTime)) return;
    } else if(car.position.y>0 && carState.airTime<maxAirTime) {
        return;
    }

    car.position.y = landingGround;


    carState.verticalVelocity =
        0;


    carState.airborne =
        false;


    carState.airTime =
        0;


    carState.airSteer =
        0;


    /*
      IMPORTANT: landing from a ramp must NEVER change X/Z position.
      The old code had two teleports here:
      1) secret jumps copied the car to a target track point;
      2) normal jumps could snap the car back to the nearest road.
      Both are gone. Only R / the 5-second stuck recovery may teleport.
    */

    if (
        carState.shortcutActive
    ) {

        const landingPoint =
            carState.shortcutLandingPoint;


        const closeEnough =
            landingPoint
            &&
            flatDistance(
                car.position,
                landingPoint
            )
            <
            34;


        if (
            closeEnough
        ) {

            const checkpointCredits =
                creditShortcutCheckpoints(
                    carState.shortcutTakeoffT,
                    carState.shortcutLandingT
                );


            carState.boostTimer =
                Math.max(
                    carState.boostTimer,
                    0.9
                );


            showRacePopup(
                checkpointCredits >
                0
                    ?
                    `SHORTCUT + ${checkpointCredits} CHECKPOINT${checkpointCredits === 1 ? "" : "S"}`
                    :
                    "SHORTCUT LANDED",
                750
            );

        }

        else {

            showRacePopup(
                "SHORTCUT MISSED",
                650
            );

        }

    }


    carState.shortcutActive =
        false;


    carState.shortcutTakeoffT =
        null;


    carState.shortcutLandingT =
        null;


    carState.shortcutFlightTime =
        null;


    carState.shortcutLandingPoint =
        null;

    car.rotation.x =
        THREE.MathUtils.clamp(
            car.rotation.x,
            -0.34,
            0.34
        );


    car.rotation.z =
        THREE.MathUtils.clamp(
            car.rotation.z,
            -0.30,
            0.30
        );


    carState.takeoffTrackT =
        null;


    carState.takeoffSpeed =
        0;


    carState.rampCooldown =
        Math.max(
            carState.rampCooldown,
            0.75
        );


    carState.cameraShake =
        0;

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
        .addScaledVector(frame.tangent, -row * 4.0);
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
        targetPitch: 0,
        targetRoll: 0,
        motion: createRemoteMotion(),
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
    if (!state?.playerId) return;
    if(state.playerId === window.REDLINE_MP?.playerId){
        // Local car is already authoritative for its own position.
        return;
    }
    const players=window.REDLINE_MP?.players ?? [];
    const playerIndex=Math.max(0,players.findIndex(p=>p.id===state.playerId));
    const player=players.find(p=>p.id===state.playerId) || {
        id:state.playerId,
        username:state.username || "Racer",
        car:state.car || "gt",
        appearance:state.appearance || null
    };
    const remote=createRemoteRacer(player,playerIndex,
        state.appearance || player.appearance || null);
    if(!remote)return;
    if(!remote.motion)remote.motion=createRemoteMotion();
    const arrival=performance.now();
    const accepted=remote.motion.push(state,arrival);
    if(!accepted.accepted)return; // Never rewind late/out-of-order ghosts.
    raceStates.set(state.playerId,state);
    const snap=remote.motion.consumeTeleport();
    if(snap){
        // Checkpoint respawns and reconnections must snap, not slide.
        remote.model.position.set(snap.x,snap.y,snap.z);
        remote.model.rotation.set(snap.pitch,snap.rotation,snap.roll);
    }
    remote.lastUpdate=arrival;
}
function updateRemoteRacers(delta) {
    const now=performance.now();
    for(const remote of remoteRacers.values()){
        const state=remote.motion?.sample(now);
        if(state){
            remote.model.position.set(state.x,state.y,state.z);
            remote.model.rotation.set(state.pitch,state.rotation,state.roll);
        }
        const speed=Math.abs(Number(state?.speed) || 0);
        const spin=speed * delta * 2.9;
        for(const wheel of remote.visual?.wheels || [])
            wheel.rotation.x-=spin;
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

    carState.respawnCooldown =
        Math.max(
            0,
            (
                carState.respawnCooldown
                ||
                0
            )
            -
            delta
        );

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
    const handbrake =
        !carState.airborne
        &&
        keys.has(" ");
    const nitroActive = (keys.has("shift")
        ||
            keys.has("shiftleft"))
        &&
            carState.nitro >
                0;
    const steeringInput =
        carState.airborne
            ?
            0
            :
            (
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
                )
            );
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
    let steerRate =
        carState.airborne
            ?
            0
            :
            activeCarSpec.steer
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
    // Gravity adds believable downhill acceleration and uphill resistance,
    // along the horizontal road direction. Existing car steering remains.
    if(activeTrackId==="neon" && !carState.airborne && roadInfo) {
        const t=roadInfo.tangent;
        const lengthXZ=Math.hypot(t.x,t.z);
        if(lengthXZ>.001 && Math.abs(t.y)>.0001) {
            carState.velocity.add(
                new THREE.Vector3(t.x/lengthXZ,0,t.z/lengthXZ)
                  .multiplyScalar(-9.81*t.y*delta)
            );
        }
    }

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
    if (
        throttle
        &&
        !carState.airborne
    ) {
        carState.velocity
            .addScaledVector(forward, acceleration *
            delta);
    }
    if (
        brake
        &&
        !carState.airborne
    ) {
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
    if (
        nitroActive
        &&
        !carState.airborne
        &&
        forwardSpeed >
        3
    ) {
        carState.nitro =
            Math.max(0, carState.nitro -
                24 *
                    delta);
        carState.velocity
            .addScaledVector(forward,
                (activeCarSpec.nitroAcceleration ?? 22) * delta);
    }
    else {
        carState.nitro =
            Math.min(100, carState.nitro +
                3.7 *
                    delta);
    }
    if (
        !carState.airborne
    ) {

        const grip = handbrake
            ?
                activeCarSpec.driftGrip
                    *
                        surface.gripMultiplier
            :
                activeCarSpec.grip
                    *
                        surface.gripMultiplier;


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


        const drag =
            activeCarSpec.drag
            *
            surface.drag;


        carState.velocity
            .multiplyScalar(
                Math.exp(
                    -drag *
                    delta
                )
            );


        const currentSpeed =
            carState.velocity
                .length();


        if (
            currentSpeed >
            (activeCarSpec.softLimiterStart ?? 42)
        ) {

            carState.velocity
                .multiplyScalar(
                    Math.exp(
                        -(
                            currentSpeed -
                            (activeCarSpec.softLimiterStart ?? 42)
                        )
                        *
                        0.016
                        *
                        delta
                    )
                );

        }

    }

    else {

        /*
          Tiny aerodynamic loss only. Ground grip/rough-surface drag
          must never act on a car that is in the air.
        */

        carState.velocity
            .multiplyScalar(
                Math.exp(
                    -0.018 *
                    delta
                )
            );

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
    if (
        !carState.airborne
        &&
        carState.velocity.length() >
        maxSpeed
    ) {
        carState.velocity
            .setLength(maxSpeed);
    }
    car.position
        .addScaledVector(
            carState.velocity,
            delta
        );

    if (activeTrackId === "neon" && !carState.airborne) {
        const surfaceY = neonSurfaceHeight(car.position);
        if (car.position.y > surfaceY + .95) {
            // A car driving off the bridge must fall under gravity.
            carState.airborne = true;
            carState.verticalVelocity = 0;
            carState.airTime = 0;
        } else {
            car.position.y = surfaceY;
        }
    }

    updateRamps(
        delta
    );


    updateAirborne(
        delta
    );

    if(activeTrackId==="neon" &&
        car.position.x>127 && car.position.x<213 &&
        Math.abs(car.position.z)<400 &&
        car.position.y<-.24 &&
        Math.abs(nearestTrackInfo(car.position)?.offset ?? 999)>SIDEWALK_OUTER+1
    ) {
        respawnAtLastCheckpoint(false);
        showRacePopup("FELL INTO THE CANAL — RESET",1100);
    }


    /*
      Trees, mountains, cave walls and buildings are real world objects.
      Unlike small road obstacles, they can also be hit while airborne.
    */

    collideWithEnvironment();


    /*
      Being airborne lets a racer actually clear barriers and ice
      instead of colliding with their flat X/Z hitboxes mid-jump.
    */

    if (
        !carState.airborne
    ) {

        collideWithBarriers();
        collideWithObstacles();

    }


    updateBoostPads(delta);
    updatePickups(delta, clock.elapsedTime);
    updateTransmission();
    updateCheckpoints();


    /*
      Universal stuck recovery for every map.
      Manual: press R.
      Automatic: if the car remains essentially motionless for 5 sec.
    */

    if (
        !carState.airborne
        &&
        carState.respawnCooldown <=
        0
        &&
        carState.velocity.length() <
        0.7
    ) {

        carState.stillTimer +=
            delta;


        if (
            carState.stillTimer >=
            5
        ) {

            respawnAtLastCheckpoint(
                true
            );

        }

    }

    else {

        carState.stillTimer =
            0;

    }


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
    const cameraForward =
        carState.airborne
            ?
            forward.clone()
            :
            forward
                .clone()
                .lerp(
                    velocityDirection,
                    0.20
                )
                .normalize();
    const cameraBase =
        car.position
            .clone();


    const targetAirCameraY =
        carState.airborne
            ?
            Math.min(
                car.position.y *
                0.24,
                1.15
            )
            :
            0;


    carState.cameraAirY =
        THREE.MathUtils.lerp(
            Number(
                carState.cameraAirY
            )
            ||
            0,
            targetAirCameraY,
            carState.airborne
                ?
                0.08
                :
                0.16
        );


    cameraBase.y =
        (activeTrackId === "neon" ? car.position.y : 0)
        + carState.cameraAirY;


    const desired = cameraBase
        .add(new THREE.Vector3(0, 2.9
        +
            speed01 *
                0.45, 0))
        .addScaledVector(cameraForward, -(7.1
        +
            speed01 *
                1.8));
    desired.addScaledVector(
        right,
        -(
            carState.airborne
                ?
                carState.airSteer
                ||
                0
                :
                carState.steer
        )
        *
        speed01
        *
        0.22
    );
    const shake =
        carState.airborne
            ?
            0
            :
            carState.cameraShake;
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
    const lookAt =
        car.position
            .clone();


    lookAt.y =
        (activeTrackId === "neon" ? car.position.y : 0)
        + (carState.airborne ? carState.cameraAirY : 0)
        + 0.72;


    lookAt
        .addScaledVector(cameraForward, 6
        +
            speed01 *
                5);
    lookAt.addScaledVector(
        right,
        (
            carState.airborne
                ?
                carState.airSteer
                ||
                0
                :
                carState.steer
        )
        *
        speed01
        *
        0.28
    );
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

    const requestedTrack =
        window.REDLINE_MP
            ?.room
            ?.map
        ||
        trackSelect
            ?.value
        ||
        "neon";


    const trackConfig =
        applyTrackConfig(
            requestedTrack
        );
    // Arctic is deliberately unchanged by the Neon weather rollout.
    weatherStatusEl?.classList.toggle("hidden",activeTrackId !== "neon");


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
    // Cosmetic body/paint choices remain freely editable; they never
    // affect the verified paid upgrade tiers or the physics formulas.
    const chosenAppearance = window.REDLINE_GARAGE?.build?.appearance;
    const bodyModels = {coupe:"gt",supercar:"vortex",
        muscle:"muscle",track:"apex"};
    const validHex = value => typeof value==="string" &&
        /^#[0-9a-f]{6}$/i.test(value);
    const visualSpec = chosenAppearance && bodyModels[chosenAppearance.body]
        ? {
            ...baseCarSpec,
            model:bodyModels[chosenAppearance.body],
            body:validHex(chosenAppearance.color)
                ? parseInt(chosenAppearance.color.slice(1),16)
                : baseCarSpec.body,
            accent:validHex(chosenAppearance.accent)
                ? parseInt(chosenAppearance.accent.slice(1),16)
                : baseCarSpec.accent,
            garageAppearance:{...chosenAppearance}
        } : baseCarSpec;
    // Trust ONLY the loadout the Worker attached to the ready player.
    // Browser-local point allocations NEVER modify engine or handling.
    activeCarSpec = REDLINE_PARTS.applyCarUpgrades(
        visualSpec,
        window.REDLINE_MP?.myPlayer?.upgrades
    );
    updateGarageUI();
    worldGroup =
        new THREE.Group();
    scene.add(worldGroup);
    surfaceZones =
        [];

    sampleTrack();


    if (
        activeTrackId ===
        "arctic"
    ) {

        buildArcticEnvironment();

    }

    else {

        buildCity();

    }


    buildRoad();
    buildBarriers();

    if (activeTrackId === "neon") {
        NEON_INFRA.buildRaisedRoads({
            THREE,
            worldGroup,
            trackSamples,
            sampleCount: TRACK_SAMPLE_COUNT,
            roadHalf: ROAD_HALF,
            sidewalkOuter: SIDEWALK_OUTER,
            addRail: (a,b,y) => barriers.push({a,b,y}),
            addPierCollider: (position,halfWidth,halfDepth,maxY) => {
                addEnvironmentBoxCollider(position,halfWidth,halfDepth,0,{
                    minY:-1,maxY,tag:"BRIDGE SUPPORT"
                });
            }
        });
    }

    buildCheckpointGates();
    buildBoostPads();
    buildPickups();
    buildObstacles();
    buildRamps();


    if (
        activeTrackId ===
        "neon"
    ) {

        buildParkingLot();

    }


    buildEffects();
    car =
        makeCarModel(activeCarSpec);
    worldGroup.add(car);

    if (activeTrackId === "neon") {
        weatherSystem = NEON_WEATHER.createNeonWeather({
            THREE, worldGroup, scene, renderer, camera,
            roadMaterial: weatherRoadMaterial,
            trackSamples,
            getPlayer: () => ({car, carState, raceActive}),
            startingOverride: weatherOverride
        });
        weatherSystem.update(0);
    }
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


    lastCheckpointTransform = {
        position:
            start.position
                .clone(),

        rotationY:
            start.rotationY
    };


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
        skidTimer: 0,
        stillTimer: 0,
        respawnCooldown: 0,
        airborne: false,
        verticalVelocity: 0,
        airTime: 0,
        airSteer: 0,
        takeoffTrackT: null,
        takeoffSpeed: 0,
        cameraAirY: 0,
        rampCooldown: 0,
        shortcutActive: false,
        shortcutTakeoffT: null,
        shortcutLandingT: null,
        shortcutFlightTime: null,
        shortcutLandingPoint: null
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
        pitch: car.rotation.x,
        roll: car.rotation.z,
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
function multiplayerServerTime() {
    const corrected=window.REDLINE_MP?.serverNow;
    return Number.isFinite(corrected)?corrected:Date.now();
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
        formatRaceTime(Math.max(0, multiplayerServerTime() -
            serverRaceStartAt));
}
function updateServerCountdown() {
    if(!raceStarted||!serverRaceStartAt)return;
    const now=multiplayerServerTime();
    const remaining=serverRaceStartAt-now;
    if(remaining>0) {
        raceActive=false;
        countdown.classList.remove("hidden");
        // Four seconds from the Worker: READY, then three true
        // one-second beats. No 1.33-second uneven countdown.
        const label=remaining>3000?"READY":
            String(THREE.MathUtils.clamp(Math.ceil(remaining/1000),1,3));
        if(countdown.textContent!==label){
            countdown.textContent=label;
            countdown.classList.remove("redline-countdown-pulse","redline-countdown-go");
            void countdown.offsetWidth;
            countdown.classList.add("redline-countdown-pulse");
        }
        return;
    }
    if(!raceActive&&!localFinished) {
        raceActive=true;
        countdown.textContent="GO!";
        countdown.classList.remove("hidden","redline-countdown-pulse");
        countdown.classList.add("redline-countdown-go");
        goHideAt=now+850;
    }
    if(goHideAt&&now>=goHideAt) {
        countdown.classList.add("hidden");
        countdown.classList.remove("redline-countdown-go");
        goHideAt=0;
    }
}
function startRace() {
    buildWorld();
    trackNameEl.textContent =
        (
            TRACKS[
                activeTrackId
            ]
            ||
            TRACKS.neon
        ).name;
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
        Math.max(0, multiplayerServerTime() -
            (serverRaceStartAt || multiplayerServerTime()));
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
        selectedCar = card.dataset.car;
        updateGarageUI();
        // Stat previews use the actual selected car's base driving values.
        window.dispatchEvent(new CustomEvent("redline:garage-car-changed"));
    });
});
window.REDLINE_GARAGE_PREVIEW={
    get baseSpec() {return cars[selectedCar];},
    get selectedCar(){return selectedCar;}
};
window.dispatchEvent(new CustomEvent("redline:garage-car-changed"));
updateGarageUI();


for (
    const option
    of trackSelect.options
) {

    if (
        option.value ===
        "canyon"
    ) {

        option.disabled =
            true;

    }

    else {

        option.disabled =
            false;

    }

}


function updateTrackDescription(
    trackId
) {

    const config =
        TRACKS[
            trackId
        ]
        ||
        TRACKS.neon;


    trackDescription.textContent =
        config.description;

}


trackSelect.addEventListener(
    "change",
    () => {

        updateTrackDescription(
            trackSelect.value
        );

    }
);


window.addEventListener(
    "redline:room-state",
    event => {

        const map =
            event.detail
                ?.map;


        if (
            map
            &&
            TRACKS[
                map
            ]
        ) {

            updateTrackDescription(
                map
            );

        }

    }
);


updateTrackDescription(
    trackSelect.value
    ||
    "neon"
);


startBtn.addEventListener("click", startRace);
window.addEventListener("keydown", event => {
    const key = event.key
        .toLowerCase();

    // T toggles local ambient scenery. It never writes shared room state
    // and ignores keystrokes while typing into account/room fields.
    const typing = event.target?.closest?.(
        "input,textarea,select,[contenteditable]"
    );
    if (key === "t" && trafficSystem && !typing &&
        !event.repeat && !event.ctrlKey && !event.altKey &&
        !event.metaKey && menu.classList.contains("hidden")) {
        event.preventDefault();
        trafficSystem.setEnabled(!trafficSystem.enabled);
        showRacePopup(trafficSystem.enabled ?
            "CITY TRAFFIC ON" : "CITY TRAFFIC OFF", 800);
        return;
    }
    // Y, not W: W is already the throttle in REDLINE.
    // Weather presets remain local, so other multiplayer racers
    // can keep the automatic cycle if they prefer.
    if (key === "y" && weatherSystem && !typing &&
        !event.repeat && !event.ctrlKey && !event.altKey &&
        !event.metaKey && menu.classList.contains("hidden")) {
        event.preventDefault();
        weatherOverride = weatherSystem.cycleOverride();
        showRacePopup(
            "WEATHER: " + weatherOverride.toUpperCase(), 900
        );
        lastWeatherHudLabel = "";
        return;
    }

    if (
        key ===
        "r"
        &&
        raceActive
        &&
        !event.repeat
        &&
        !event.ctrlKey
        &&
        !event.metaKey
        &&
        !event.altKey
    ) {

        event.preventDefault();


        respawnAtLastCheckpoint(
            false
        );


        return;

    }


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
    trafficSystem?.update(delta);
    updateNetwork(now);
    updateRemoteRacers(delta);
    updateEffects(delta);
    updateCamera(delta);
    weatherSystem?.update(delta);
    if (weatherStatusEl && weatherSystem &&
        (now-lastWeatherHudTime > 450 || !lastWeatherHudLabel)) {
        const state = weatherSystem.mode.toUpperCase();
        const suffix = weatherSystem.override === "auto" ? " · AUTO" : "";
        const label = "WEATHER: " + state + suffix + "  ·  Y TO CHANGE";
        if(label !== lastWeatherHudLabel) {
            weatherStatusEl.textContent = label;
            lastWeatherHudLabel = label;
        }
        lastWeatherHudTime = now;
    }
    updateHUD();
    drawMinimap();
    updateFPS(now);
    renderer.render(scene, camera);
}
buildWorld();
requestAnimationFrame(gameLoop);
