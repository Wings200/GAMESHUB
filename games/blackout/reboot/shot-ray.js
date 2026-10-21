// BLACKOUT V0.7 · make the actual rendered holographic dot authoritative.
// The old firing code aimed at NDC(0,0), regardless of whether the animated
// gun-mounted dot projected onto that exact pixel at the instant of a shot.
export function shotScreenPoint({aiming=false,reticleVisible=false,reticleProjection=null}={}){
 if(aiming&&reticleVisible&&reticleProjection&&
    Number.isFinite(reticleProjection.x)&&Number.isFinite(reticleProjection.y)&&
    Math.abs(reticleProjection.x)<=1&&Math.abs(reticleProjection.y)<=1){
  return {x:reticleProjection.x,y:reticleProjection.y,origin:"reticle"};
 }
 return {x:0,y:0,origin:"camera"};
}
export function labelShot(outcome,hitZone=""){
 if(outcome.kind==="target")return hitZone==="head"?"HEADSHOT":"TARGET HIT";
 if(outcome.kind==="blocked")return "SHOT BLOCKED · "+String(outcome.obstacle).toUpperCase();
 if(outcome.kind==="surface")return "SHOT HIT SURFACE";
 return "SHOT MISSED";
}

// Labels are derived from the same nearest raycast hit as shooting, not from
// the drawn debug line (which was previously misleading while turning).
export function describeAim(outcome,zone=""){
 if(outcome.kind==="target")return "TARGET "+outcome.target.id.toUpperCase()+
  (zone==="head"?" · HEAD":zone==="body"?" · BODY":"");
 if(outcome.kind==="blocked")return "BLOCKED BY "+String(outcome.obstacle).toUpperCase();
 if(outcome.kind==="surface")return "FLOOR / SOLID SURFACE";
 return "CLEAR · NO TARGET";
}
export function describeShot(outcome,screen,range,zone=""){
 const title=labelShot(outcome,zone);
 return title+" · "+screen.origin.toUpperCase()+" · "+
  (Number.isFinite(range)?range.toFixed(1):"—")+"M";
}
