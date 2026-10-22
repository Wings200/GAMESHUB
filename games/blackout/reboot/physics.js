// BLACKOUT REBOOT V0.3 — standing, crouching and prone
// Deterministic movement simulation. No guns, operators, map files or network.
// All distances in metres, time in seconds; Y is foot height.
export const FOUNDATION_VERSION="0.3.0";
export const PLAYER_RADIUS=.34;
export const STAND_HEIGHT=1.78;
export const CROUCH_HEIGHT=1.16;
export const PRONE_HEIGHT=.62;
export const GRAVITY=18;
export const JUMP_SPEED=5.25;
export const SPEED={walk:4.2,sprint:6.3,crouch:2.4,prone:1.1};
export const WORLD_LIMIT=30;

export const TEST_OBSTACLES=Object.freeze([
  // Keep the center of the range clear for sight calibration. Collision
  // stations remain fully physical, accessible in the west/east wings.
  {id:"wall-one",x:-18,z:-8,width:8,depth:.4,height:3.2},
  {id:"wall-two",x:18,z:-9,width:.4,depth:8,height:3.2},
  {id:"box-one",x:-12,z:-6,width:2.3,depth:2.3,height:1.35},
  {id:"box-two",x:12,z:3,width:2.4,depth:2.4,height:1.75},
]);

export function initialPlayer(){
  return {x:0,y:0,z:8,vy:0,yaw:0,pitch:0,grounded:true,
    crouched:false,prone:false,moving:false,sprinting:false,speed:0};
}
export function isFinitePlayer(state){
  return ["x","y","z","vy","yaw","pitch"].every(key=>Number.isFinite(state[key]));
}
export function canOccupy(x,y,z,height,objects=TEST_OBSTACLES){
  if(!Number.isFinite(x+y+z+height)||Math.abs(x)>WORLD_LIMIT-.35||
      Math.abs(z)>WORLD_LIMIT-.35||y<-.001)return false;
  return !objects.some(o=>{
    const bottom=o.bottom??0;
    if(y>=o.height||y+height<=bottom)return false;
    const closeX=Math.max(o.x-o.width/2,Math.min(x,o.x+o.width/2));
    const closeZ=Math.max(o.z-o.depth/2,Math.min(z,o.z+o.depth/2));
    const dx=x-closeX,dz=z-closeZ;
    return dx*dx+dz*dz<PLAYER_RADIUS*PLAYER_RADIUS;
  });
}
function sweep(state,dx,dz,height,objects,groundAt){
  // Small swept steps stop skipping through thin walls at low FPS.
  const segments=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.09));
  const stepX=dx/segments,stepZ=dz/segments;
  const footAt=(x,z)=>state.grounded&&typeof groundAt==="function"?
    groundAt(x,z,state.y):state.y;
  const fits=(x,z)=>canOccupy(x,footAt(x,z),z,height,objects);
  for(let i=0;i<segments;i++){
    if(fits(state.x+stepX,state.z+stepZ)){
      state.x+=stepX;state.z+=stepZ;state.y=footAt(state.x,state.z);
    }else{
      // Slide along a wall rather than becoming stuck on its face.
      if(fits(state.x+stepX,state.z)){
       state.x+=stepX;state.y=footAt(state.x,state.z);
      }
      if(fits(state.x,state.z+stepZ)){
       state.z+=stepZ;state.y=footAt(state.x,state.z);
      }
    }
  }
}
// `groundAt` is optional so the original flat test range remains identical.
// The house supplies a stair-height field for its accessible second floor.
export function stepPlayer(current,input={},dt=1/60,objects=TEST_OBSTACLES,groundAt=null){
  if(!isFinitePlayer(current))throw new Error("Invalid player coordinates");
  const state={...current};
  const delta=Math.min(0.05,Math.max(0,Number.isFinite(dt)?dt:0));
  // Prone takes priority over crouch when both keys are held.
  // Occupancy is tested before rising so the player cannot stand into a ceiling.
  // Prone can begin only on the ground; it has a real, shorter collision height.
  const wantProne=Boolean(input.prone)&&state.grounded;
  const wantCrouch=Boolean(input.crouch);
  const fitsStand=canOccupy(state.x,state.y,state.z,STAND_HEIGHT,objects);
  const fitsCrouch=canOccupy(state.x,state.y,state.z,CROUCH_HEIGHT,objects);
  state.prone=wantProne||(!wantProne&&!fitsCrouch);
  state.crouched=!state.prone&&(wantCrouch||!fitsStand);
  const height=state.prone?PRONE_HEIGHT:state.crouched?CROUCH_HEIGHT:STAND_HEIGHT;
  const forward=Math.max(-1,Math.min(1,Number(input.forward)||0));
  const right=Math.max(-1,Math.min(1,Number(input.right)||0));
  const magnitude=Math.hypot(forward,right);
  const normalized=magnitude>1?1/magnitude:1;
  state.sprinting=!state.crouched&&!state.prone&&input.sprint&&forward>0&&magnitude>0;
  const operatorMultiplier=Number.isFinite(input.speedMultiplier)?
    Math.max(.87,Math.min(1.13,input.speedMultiplier)):1;
  // A physically placed floor hazard can impede movement without affecting
  // the operator's permanent speed class or legacy no-hazard behavior.
  const terrainMultiplier=Number.isFinite(input.terrainMultiplier)?
    Math.max(.35,Math.min(1,input.terrainMultiplier)):1;
  const baseSpeed=(state.prone?SPEED.prone:state.crouched?SPEED.crouch:
    state.sprinting?SPEED.sprint:SPEED.walk)*operatorMultiplier*terrainMultiplier;
  const f=forward*normalized,r=right*normalized;
  const vx=(-Math.sin(state.yaw)*f+Math.cos(state.yaw)*r)*baseSpeed;
  const vz=(-Math.cos(state.yaw)*f-Math.sin(state.yaw)*r)*baseSpeed;
  sweep(state,vx*delta,vz*delta,height,objects,groundAt);
  state.speed=magnitude?Math.hypot(vx,vz):0;
  state.moving=magnitude>0;
  const groundValue=typeof groundAt==="function"?
    groundAt(state.x,state.z,state.y):0;
  const groundY=Number.isFinite(groundValue)?Math.max(0,Math.min(9,groundValue)):0;
  if(input.jump&&state.grounded&&!state.crouched&&!state.prone){
    state.vy=JUMP_SPEED;state.grounded=false;
  }
  if(!state.grounded||state.vy>0){
    state.vy-=GRAVITY*delta;
    state.y+=state.vy*delta;
    if(state.y<=groundY){state.y=groundY;state.vy=0;state.grounded=true;}
  }else if(groundY<state.y-.28){
    // Leaving an upper balcony/landing initiates a fall, not teleportation.
    state.grounded=false;state.vy=0;
  }else{state.y=groundY;state.vy=0;state.grounded=true;}
  return state;
}
