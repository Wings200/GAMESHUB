// The lamp meshes and their real downlights must share one coordinate grid.
export const LUMINAIRE_COLUMNS = Object.freeze([-8.6,0,8.6]);
export const LUMINAIRE_ROWS = Object.freeze([-15,-11,-7,-3,1,5,9,13]);
export const LUMINAIRE_PANEL_Y = 6.66;
export const LUMINAIRE_EMITTER_Y = 6.59;
export function luminairePositions() {
  return LUMINAIRE_ROWS.flatMap(z =>
    LUMINAIRE_COLUMNS.map(x => ({x,z,panelY:LUMINAIRE_PANEL_Y,emitterY:LUMINAIRE_EMITTER_Y})));
}
export function ceilingLightingProfile(profile) {
  // A low ambient fill retains indirect light; warm spots come from visible fixtures.
  if (profile==='performance') return {intensity:23,shadowSamples:0,shadowMap:512};
  if (profile==='quality') return {intensity:38,shadowSamples:3,shadowMap:2048};
  return {intensity:32,shadowSamples:2,shadowMap:1024};
}
