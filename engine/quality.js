// Rendering presets are engine-independent and safe to test without WebGL.
export const QUALITY_PRESETS = Object.freeze({
  performance: Object.freeze({label:'Performance', pixelRatio:1, renderScale:0.85, shadows:false, shadowMapSize:512, exposure:1.12}),
  balanced: Object.freeze({label:'Balanced', pixelRatio:1.5, renderScale:1, shadows:true, shadowMapSize:1024, exposure:1.12}),
  quality: Object.freeze({label:'Quality', pixelRatio:2, renderScale:1, shadows:true, shadowMapSize:2048, exposure:1.12})
});
export function qualitySettings(profile='balanced', devicePixelRatio=1) {
  const p = QUALITY_PRESETS[profile] || QUALITY_PRESETS.balanced;
  const dpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return {...p, profile: QUALITY_PRESETS[profile] ? profile : 'balanced', effectivePixelRatio: Math.min(dpr,p.pixelRatio)*p.renderScale};
}
export function clampScale(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0.5, Math.min(1,n)) : 1;
}