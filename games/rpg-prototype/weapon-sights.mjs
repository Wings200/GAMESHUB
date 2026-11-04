// W05.1 precise first-person optic anchors (camera-space).
// z is viewmodel distance from camera. x/y are real 3D sight coordinates,
// never separately guessed "weapon ADS" offsets.
export const SIGHT_MOUNTS=Object.freeze({
  '10mm-pistol':Object.freeze({x:0,y:.274,z:-.14,adsZ:-.68,fov:63,optic:'iron'}),
  'pipe-pistol':Object.freeze({x:0,y:.247,z:-.12,adsZ:-.72,fov:65,optic:'iron'}),
  'pipe-rifle':Object.freeze({x:0,y:.258,z:-.12,adsZ:-1.12,fov:57,optic:'iron'}),
  'laser-musket':Object.freeze({x:0,y:.263,z:-.14,adsZ:-1.20,fov:56,optic:'iron'}),
  'scrap-pistol':Object.freeze({x:0,y:.207,z:-.16,adsZ:-.64,fov:64,optic:'iron'}),
  'iron-revolver':Object.freeze({x:0,y:.165,z:-.19,adsZ:-.65,fov:62,optic:'iron'}),
  'pipe-smg':Object.freeze({x:0,y:.225,z:-.15,adsZ:-.62,fov:61,optic:'reflex'}),
  'service-carbine':Object.freeze({x:0,y:.222,z:-.15,adsZ:-.66,fov:59,optic:'holo'}),
  'scrap-shotgun':Object.freeze({x:0,y:.17,z:-.22,adsZ:-.7,fov:64,optic:'iron'}),
  'hunting-rifle':Object.freeze({x:0,y:.226,z:-.16,adsZ:-.72,fov:49,optic:'scope'})
});
export function sightMount(weaponId){
  const mount=SIGHT_MOUNTS[weaponId];
  if(!mount)throw Error('Unknown weapon sight: '+weaponId);
  return mount;
}
export function adsWeaponPosition(weaponId){
  const sight=sightMount(weaponId);
  return {x:-sight.x,y:-sight.y,z:sight.adsZ};
}
export function alignedSightPosition(weaponId,root=adsWeaponPosition(weaponId)){
  const mount=sightMount(weaponId);
  return {x:root.x+mount.x,y:root.y+mount.y,z:root.z+mount.z};
}
export function isAlignedToBore(weaponId,root=adsWeaponPosition(weaponId),tolerance=.00001){
  const sight=alignedSightPosition(weaponId,root);
  return Math.abs(sight.x)<=tolerance&&Math.abs(sight.y)<=tolerance;
}

 // Optics are real sight geometry with distinct camera magnification, not HUD decals.
 export const OPTIC_MODS=Object.freeze({
   factory:Object.freeze({id:'factory',name:'Factory sight',kind:null,fov:null,cost:{salvage:0,glass:0}}),
   'holo-a':Object.freeze({id:'holo-a',name:'Holo A · NATO circle-dot',kind:'holo',fov:61,cost:{salvage:2,glass:1}}),
   'holo-b':Object.freeze({id:'holo-b',name:'Holo B · Russian open ring',kind:'holo',fov:61,cost:{salvage:3,glass:1}}),
   'scope-2x':Object.freeze({id:'scope-2x',name:'Scout scope · 2×',kind:'scope',fov:38,cost:{salvage:4,glass:2}}),
   'scope-4x':Object.freeze({id:'scope-4x',name:'Marksman scope · 4×',kind:'scope',fov:19,cost:{salvage:6,glass:3}}),
   'scope-6x':Object.freeze({id:'scope-6x',name:'Sniper scope · 6×',kind:'scope',fov:12,cost:{salvage:9,glass:4}})
 });
 const allowedOptics=Object.freeze({
   '10mm-pistol':['factory'], 'pipe-pistol':['factory'],
   'pipe-rifle':['factory'], 'laser-musket':['factory'],
   'scrap-pistol':['factory'], 'iron-revolver':['factory'],
   'pipe-smg':['factory','holo-a','holo-b','scope-2x'],
   'service-carbine':['factory','holo-a','holo-b','scope-2x','scope-4x'],
   'scrap-shotgun':['factory','holo-a','holo-b'],
   'hunting-rifle':['factory','holo-a','holo-b','scope-2x','scope-4x','scope-6x']
 });
 export function compatibleOptics(weaponId){
   if(!allowedOptics[weaponId])throw Error('Unknown weapon optics: '+weaponId);
   return allowedOptics[weaponId];
 }
 export function sightForOptic(weaponId,opticId='factory'){
   const factory=sightMount(weaponId);
   if(!compatibleOptics(weaponId).includes(opticId))return factory;
   const mod=OPTIC_MODS[opticId];
   if(!mod||opticId==='factory')return factory;
   return {...factory,optic:mod.kind,fov:mod.fov,variant:opticId};
 }
