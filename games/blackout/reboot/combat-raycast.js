// BLACKOUT V0.7.4 — raycast only actual solid faces + tactical targets.
// Decorative EdgesGeometry LineSegments (used for crisp blue cube outlines)
// must NEVER be considered bullet blockers. Three's default raycaster has a
// generous Line.threshold of 1 world unit, enough to swallow nearly every
// hit on a 2.3m box while providing NO triangle face for decals.
export function combatIntersections(raycaster,solids,targetGroups=[]){
 const solidHits=raycaster.intersectObjects(solids,false);
 const targetHits=targetGroups.length?
  raycaster.intersectObjects(targetGroups,true):[];
 return [...solidHits,...targetHits]
  .filter(hit=>hit?.face?.normal&&hit.object)
  .sort((a,b)=>a.distance-b.distance);
}
