// W20.35: Right-shoulder third-person handholds and a measurable two-bone arm reach.
// The points are inside actual stock/grip/fore-end parts of the rebuilt guns.
// They are visual attachment targets, never hitboxes or firing origins.
export const WORLD_WEAPON_GRIPS=Object.freeze({
  '10mm-pistol':Object.freeze({right:[.055,-.235,.187],left:[-.075,-.160,.108],scale:.66,holdOffsetZ:-.20}),
  'pipe-pistol':Object.freeze({right:[.065,-.247,.246],left:[-.082,-.197,.193],scale:.70,holdOffsetZ:-.20}),
  'pipe-rifle':Object.freeze({right:[.065,-.285,.222],left:[-.095,-.048,-.470],scale:.68}),
  'laser-musket':Object.freeze({right:[.070,-.292,.215],left:[-.092,-.060,-.480],scale:.68}),
  'double-barrel-shotgun':Object.freeze({right:[.075,-.286,.215],left:[-.094,-.100,-.500],scale:.68}),
  'pump-action-shotgun':Object.freeze({right:[.080,-.275,.207],left:[-.105,-.110,-.540],scale:.68}),
  'bolt-hunting-rifle':Object.freeze({right:[.078,-.253,.197],left:[-.105,-.070,-.500],scale:.68}),
  'iron-revolver':Object.freeze({right:[.105,-.246,.226],left:[-.092,-.245,.221],scale:.76,holdOffsetZ:-.18}),
  'pipe-smg':Object.freeze({right:[.088,-.185,.239],left:[-.098,-.046,-.470],scale:.70}),
  'heavy-sniper':Object.freeze({right:[.082,-.262,.239],left:[-.105,-.083,-.500],scale:.68})
});
export const GRIP_ARM_LENGTHS=Object.freeze({upper:.40,lower:.36});
// Returns joint locations relative to an avatar shoulder in the torso frame.
// The bend vector is kept to the outside of the torso, with elbows lower.
export function solveWeaponArmReach(target,side,{upper=.40,lower=.36}={}){
  const x=Number(target[0])||0,y=Number(target[1])||0,z=Number(target[2])||0;
  const distance=Math.hypot(x,y,z);
  const direction=distance>1e-8?[x/distance,y/distance,z/distance]:[0,-1,0];
  const maxReach=upper+lower-.004,minReach=Math.abs(upper-lower)+.005;
  const reach=Math.max(minReach,Math.min(maxReach,distance));
  const point=direction.map(n=>n*reach);
  const along=(upper*upper-lower*lower+reach*reach)/(2*reach);
  const across=Math.sqrt(Math.max(0,upper*upper-along*along));
  const bendBase=[side<0?-1:1,-.62,.14];
  const projection=bendBase.reduce((sum,v,i)=>sum+v*direction[i],0);
  let bend=bendBase.map((v,i)=>v-projection*direction[i]);
  let bendSize=Math.hypot(...bend);
  if(bendSize<1e-8){
    bend=[direction[1],-direction[0],0];
    bendSize=Math.hypot(...bend);
    if(bendSize<1e-8){bend=[0,0,1];bendSize=1;}
  }
  bend=bend.map(n=>n/bendSize);
  const elbow=direction.map((v,i)=>v*along+bend[i]*across);
  return {elbow,target:point,reach,distance,
    upperError:Math.abs(Math.hypot(...elbow)-upper),
    lowerError:Math.abs(Math.hypot(...point.map((v,i)=>v-elbow[i]))-lower),
    excessReach:Math.max(0,distance-maxReach)};
}
