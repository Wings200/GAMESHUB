import {PLAYER_RADIUS,intersectsFootprint} from './collision.js';

// An upright capsule approximation: a circle in XZ with a finite vertical
// body. Handles elevated slabs, steps, walls, landings and ceilings without
// replacing the existing (legacy) two-dimensional movement resolver.
export const BODY_HEIGHT=1.85;
export const EYE_HEIGHT=1.72;
const EPS=1e-6;
const finite=v=>typeof v==='number'&&Number.isFinite(v);

function validateAABB(box){
  if(!box||!['minX','maxX','minY','maxY','minZ','maxZ'].every(k=>finite(box[k])))
    throw new TypeError('3D collision obstacles require finite min/max X, Y and Z');
  if(box.minX>box.maxX||box.minY>box.maxY||box.minZ>box.maxZ)
    throw new TypeError('3D collision obstacle bounds are inverted');
}
function horizontalOverlap(x,z,radius,box){
  return intersectsFootprint(x,z,radius,box);
}
function bodyIntersects(x,y,z,radius,eyeHeight,height,box){
  const feet=y-eyeHeight,head=feet+height;
  return feet<box.maxY-EPS && head>box.minY+EPS
    && horizontalOverlap(x,z,radius,box);
}
function supportHeight(x,feet,z,radius,groundY,boxes){
  let support=groundY;
  for(const box of boxes)if(box.maxY<=feet+EPS &&
      box.maxY>support && horizontalOverlap(x,z,radius,box))
    support=box.maxY;
  return support;
}
function standing(x,y,z,radius,eyeHeight,groundY,boxes){
  const feet=y-eyeHeight;
  return Math.abs(feet-supportHeight(x,feet,z,radius,groundY,boxes))<=EPS*2;
}
export function resolveCapsule3D(position,delta,boxes=[],{
  radius=PLAYER_RADIUS,height=BODY_HEIGHT,eyeHeight=EYE_HEIGHT,
  groundY=0,stepHeight=.35,maxStep=.12,bounds=null
}={}){
  if(!position||!delta||!['x','y','z'].every(k=>finite(position[k])&&finite(delta[k]))||
    ![radius,height,eyeHeight,groundY,stepHeight,maxStep].every(finite)||
    radius<=0||height<=0||eyeHeight<=0||eyeHeight>height||
    stepHeight<0||maxStep<=0)
    throw new TypeError('Invalid 3D capsule movement');
  if(!Array.isArray(boxes))throw new TypeError('3D colliders must be an array');
  boxes.forEach(validateAABB);
  let {x,y,z}=position;
  y=Math.max(groundY+eyeHeight,y);
  const previouslyGrounded=standing(x,y,z,radius,eyeHeight,groundY,boxes);
  let blockedX=false,blockedZ=false,hitCeiling=false,hitFloor=false;
  // On an upward jump, move vertically first so a player can clear a ledge.
  function vertical(dy){
    if(dy===0)return;
    let next=y+dy;
    const feet=y-eyeHeight,head=feet+height;
    if(dy>0){
      for(const box of boxes){
        if(!horizontalOverlap(x,z,radius,box))continue;
        if(head<=box.minY+EPS && head+dy>box.minY+EPS)
          next=Math.min(next,box.minY-height+eyeHeight);
      }
      if(next<y+dy-EPS)hitCeiling=true;
    }else{
      next=Math.max(next,groundY+eyeHeight);
      if(next>y+dy+EPS)hitFloor=true;
      for(const box of boxes){
        if(!horizontalOverlap(x,z,radius,box))continue;
        if(feet>=box.maxY-EPS && feet+dy<box.maxY-EPS){
          next=Math.max(next,box.maxY+eyeHeight);
          hitFloor=true;
        }
      }
    }
    y=next;
  }
  if(delta.y>0)vertical(delta.y);
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const steps=Math.max(1,Math.ceil(Math.hypot(delta.x,delta.z)/maxStep));
  const dx=delta.x/steps,dz=delta.z/steps;
  // These are finite AABBs, so walking below a high walkway is possible.
  const canStand=(px,py,pz)=>!boxes.some(box=>
    bodyIntersects(px,py,pz,radius,eyeHeight,height,box));
  for(let i=0;i<steps;i++){
    const tryAxis=(axis,shift)=>{
      if(shift===0)return true;
      const raw=(axis==='x'?x:z)+shift;
      const next=bounds?clamp(raw,
        bounds[axis==='x'?'minX':'minZ'],bounds[axis==='x'?'maxX':'maxZ']):raw;
      const px=axis==='x'?next:x,pz=axis==='z'?next:z;
      const axisBlocked=next!==raw;
      if(canStand(px,y,pz)){
        if(axis==='x')x=next;else z=next;
        return !axisBlocked;
      }
      // Automatic short step-up works only while supported, never while
      // airborne; long vertical walls still block movement.
      if(stepHeight>0 && previouslyGrounded){
        const feet=y-eyeHeight;
        const candidates=boxes.filter(box=>
          horizontalOverlap(px,pz,radius,box) &&
          box.maxY>feet+EPS && box.maxY<=feet+stepHeight+EPS &&
          box.minY<feet+height-EPS)
          .map(box=>box.maxY).sort((a,b)=>a-b);
        for(const top of candidates){
          const stepped=top+eyeHeight;
          if(canStand(px,stepped,pz)){
            y=stepped;
            if(axis==='x')x=next;else z=next;
            return !axisBlocked;
          }
        }
      }
      return false;
    };
    if(!tryAxis('x',dx))blockedX=true;
    if(!tryAxis('z',dz))blockedZ=true;
  }
  if(delta.y<=0)vertical(delta.y);
  const grounded=standing(x,y,z,radius,eyeHeight,groundY,boxes) && delta.y<=0;
  return {x,y,z,grounded,hitCeiling,hitFloor,blockedX,blockedZ};
}
