// W05.1 precise first-person optic anchors (camera-space).
// z is viewmodel distance from camera. x/y are real 3D sight coordinates,
// never separately guessed "weapon ADS" offsets.
export const SIGHT_MOUNTS=Object.freeze({
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
