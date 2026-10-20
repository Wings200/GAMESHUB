// BLACKOUT V0.6.1: shared aiming rules for input, visible ADS and hit-scan.
// The early ADS animation must NEVER leak wide hipfire spread into a
// right-button-held shot. The optic dot remains hidden until physically centered.
export function aimState(holdingADS,blend){
 const held=Boolean(holdingADS);
 const t=Math.max(0,Math.min(1,Number.isFinite(blend)?blend:0));
 return {
  accurate:held,
  reticleVisible:held&&t>=.995,
  hipCrosshairVisible:!held||t<.995,
 };
}
export function firstHitType(intersections,activeTargets){
 const hit=intersections?.[0];
 if(!hit)return {kind:"miss",hit:null,target:null,obstacle:null};
 let node=hit.object;
 while(node&&!node.userData?.targetId)node=node.parent;
 const id=node?.userData?.targetId;
 const target=id?activeTargets.find(t=>t.id===id):null;
 if(target)return {kind:"target",hit,target,obstacle:null};
 let obstacle=hit.object;
 while(obstacle&&!obstacle.userData?.physicsObstacleId)obstacle=obstacle.parent;
 if(obstacle)return {kind:"blocked",hit,target:null,
  obstacle:obstacle.userData.physicsObstacleId};
 return {kind:"surface",hit,target:null,obstacle:null};
}
