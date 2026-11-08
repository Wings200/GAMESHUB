// Stable import surface for NEW GAMESHUB games. Existing games can migrate
// scene-by-scene without replacing their renderer in place.
export {GameEngine, AssetManager, ENGINE_VERSION, THREE, clampDelta} from './core.js';
export {FirstPersonControls, moveVector} from './controls.js';
export {PLAYER_RADIUS, intersectsFootprint, resolveXZ} from './collision.js';
export {QUALITY_PRESETS, qualitySettings, clampScale} from './quality.js';
export {approach, hingedOpen, stepPhase} from './motion.js';
export {luminairePositions, ceilingLightingProfile} from './lighting.js';
export {doorCollisionAt,doorDistance,lightAperture} from './portal.js';
export {FootstepSequencer} from './footsteps.js';
export {createSurfaceLibrary} from './surfaces.js';
export {EngineAudio} from './audio.js';
export {EngineIntro, INTRO_ANIMATION_MS, INTRO_HOLD_MS} from './intro.js';

export {MATERIAL_CATEGORIES,MATERIAL_PRESETS,getMaterialPreset,normalizeMaterialSettings} from './material-catalog.mjs';
export {MaterialPool} from './material-pool.js';
export {GameWorld,createGameWorld} from './world.js';
export {WORLD_FORMAT,normalizeWorldEntity,normalizeWorldDocument} from './world-schema.mjs';

export {BODY_HEIGHT,EYE_HEIGHT,resolveCapsule3D} from './collision-3d.js';

export {normalizeAudioPosition,segmentIntersectsAABB,estimateOcclusion} from './audio-spatial.js';

export {LIGHTING_PROFILES,shadowBudget,normalizeLightEffect,lightEffectFactor} from './light-effects.mjs';

export {GameSession,createGameSession} from './session.js';

export {AnimationController} from './animation.js';
export {chooseLocomotionClip} from './animation-state.mjs';
export {DEFAULT_CHARACTER_CLIPS,resolveCharacterClips,
  createCharacterAsset,loadCharacterAsset} from './character-assets.js';
