// BLACKOUT V0.1 — deterministic single-player character controller.
// Collision checks use the exact AABBs created by the world mesh helpers.
export const PLAYER_DIMENSIONS = Object.freeze({
  radius:.34, stand:1.73, crouch:1.10, prone:.62, stepHeight:.23
});
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
function intersects(a,x,z,y,height,radius) {
  // The floor is resolved by the shared floorAt() height field.
  if(a.tag==="floor-base")return false;
  if(y>=a.maxY-.025 || y+height<=a.minY+.025)return false;
  const nearX=clamp(x,a.minX,a.maxX),nearZ=clamp(z,a.minZ,a.maxZ);
  return (x-nearX)**2+(z-nearZ)**2 < radius**2;
}
export function collides(world,x,z,y,height,radius=PLAYER_DIMENSIONS.radius){
  return world.colliders.some(a=>intersects(a,x,z,y,height,radius));
}
export class FirstPersonController{
  constructor(THREE,world,camera){
    this.world=world;
    this.camera=camera;
    this.x=world.spawn.x;this.y=world.spawn.y;this.z=world.spawn.z;
    this.yaw=world.spawn.yaw;this.pitch=0;
    this.velX=0;this.velZ=0;this.velY=0;
    this.radius=PLAYER_DIMENSIONS.radius;
    this.standingHeight=PLAYER_DIMENSIONS.stand;
    this.height=this.standingHeight;this.eyeHeight=this.standingHeight;
    this.isCrouched=false;this.isProne=false;this.proneWanted=false;
    this.speeds={walk:3.35,sprint:5.5,crouch:1.74,prone:.79};
    this.operatorName="KESTREL";this.speedRating=2;this.armorRating=2;this.maxHealth=110;this.health=110;
    this.lean=0;this.leanTarget=0;
    this.stepClock=0;this.moving=false;this.sprinting=false;
    this.camera.rotation.order="YXZ";
    this.applyCamera();
  }
  setOperator(spec){
    this.operatorName=spec.name;this.speedRating=spec.speed;this.armorRating=spec.armor;
    this.maxHealth=spec.health;this.health=this.maxHealth;
    this.speeds={walk:spec.walk,sprint:spec.sprint,crouch:spec.walk*.52,prone:spec.walk*.235};
  }
  takeDamage(amount){this.health=Math.max(0,this.health-Math.max(0,amount));return this.health<=0;}
  reset(){
    Object.assign(this,{x:this.world.spawn.x,y:this.world.spawn.y,z:this.world.spawn.z,
      yaw:this.world.spawn.yaw,pitch:0,velX:0,velY:0,velZ:0,
      height:PLAYER_DIMENSIONS.stand,eyeHeight:PLAYER_DIMENSIONS.stand,isCrouched:false,isProne:false,proneWanted:false,lean:0,leanTarget:0,stepClock:0});
    this.health=this.maxHealth;this.moving=false;this.sprinting=false;
    this.applyCamera();
  }
  toggleProne(){this.proneWanted=!this.proneWanted;}
  look(dx,dy,sensitivity=0.0022){
    // Three.js camera looks toward -Z. Positive yaw rotates view LEFT,
    // so a mouse move RIGHT must DECREASE yaw.
    this.yaw -= clamp(dx,-250,250)*sensitivity;
    this.pitch=clamp(this.pitch-clamp(dy,-250,250)*sensitivity,-1.37,1.37);
    this.applyCamera();
  }
  blocked(x,z,y=this.y,height=this.height,radius=this.radius){
    return collides(this.world,x,z,y,height,radius);
  }
  // Vertical overlap accounts for a standing player wanting to leave a
  // crouch tunnel without popping their head through the physical duct.
  canStand(){return !this.blocked(this.x,this.z,this.y,PLAYER_DIMENSIONS.stand);}
  moveAxis(dx,dz){
    if(dx===0 && dz===0)return;
    const nx=this.x+dx,nz=this.z+dz;
    const floor=this.world.floorAt(nx,nz);
    if(floor > this.y+PLAYER_DIMENSIONS.stepHeight)return;
    if(this.blocked(nx,nz,Math.max(this.y,floor),this.height))return;
    this.x=nx;this.z=nz;
    if(floor>this.y && floor-this.y<=PLAYER_DIMENSIONS.stepHeight){
      this.y=floor;this.velY=0;
    }
  }
  update(dt,keys){
    const d=clamp(dt,0,0.043);
    const wantsCrouch=keys.has("ControlLeft")||keys.has("ControlRight")||keys.has("KeyC");
    this.isProne=this.proneWanted&&!wantsCrouch;
    this.isCrouched=!this.isProne&&(wantsCrouch||!this.canStand());
    this.height=this.isProne?PLAYER_DIMENSIONS.prone:
      this.isCrouched?PLAYER_DIMENSIONS.crouch:PLAYER_DIMENSIONS.stand;
    let front=Number(keys.has("KeyW"))-Number(keys.has("KeyS"));
    let side=Number(keys.has("KeyD"))-Number(keys.has("KeyA"));
    const magnitude=Math.hypot(front,side);
    if(magnitude>1){front/=magnitude;side/=magnitude;}
    this.moving=magnitude>.1;
    this.isWalkingSlow=keys.has("AltLeft")||keys.has("AltRight");
    this.sprinting=this.moving && !this.isCrouched && !this.isProne &&
      (keys.has("ShiftLeft")||keys.has("ShiftRight"))&&front>0;
    const speed=this.isProne?this.speeds.prone:
      this.isCrouched?this.speeds.crouch:this.sprinting?this.speeds.sprint:this.speeds.walk*(this.isWalkingSlow?.48:1);
    // Match the actual camera vectors: forward = (-sin(yaw),-cos(yaw)),
    // right = (cos(yaw),-sin(yaw)). Both were previously mirrored,
    // making W move opposite to the direction the player was looking.
    const targetX=(-Math.sin(this.yaw)*front+Math.cos(this.yaw)*side)*speed;
    const targetZ=(-Math.cos(this.yaw)*front-Math.sin(this.yaw)*side)*speed;
    // Controlled inertia: immediate direction response, soft stop on release.
    const friction=1-Math.exp(-(this.moving?12.5:17)*d);
    this.velX+=(targetX-this.velX)*friction;
    this.velZ+=(targetZ-this.velZ)*friction;
    if(!this.moving&&Math.hypot(this.velX,this.velZ)<.015){this.velX=0;this.velZ=0;}
    const dx=this.velX*d,dz=this.velZ*d;
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.11));
    for(let i=0;i<steps;i++){
      // Independent axis resolution naturally slides along walls.
      this.moveAxis(dx/steps,0);
      this.moveAxis(0,dz/steps);
    }
    const floor=this.world.floorAt(this.x,this.z);
    this.velY=Math.max(-19,this.velY-23*d);
    this.y+=this.velY*d;
    if(this.y<=floor+.008){this.y=floor;this.velY=0;}
    this.stepClock+=this.moving?d*(this.sprinting?12:this.isCrouched?5.5:this.isWalkingSlow?4.3:8):0;
    // Stance switches change physical collision height immediately, but the
    // eye eases to its target to avoid a camera teleport at each keypress.
    this.eyeHeight+=(this.height-this.eyeHeight)*(1-Math.exp(-d*13));
    this.leanTarget=Number(keys.has("KeyE"))-Number(keys.has("KeyQ"));
    this.lean+=(this.leanTarget-this.lean)*Math.min(1,d*12);
    this.applyCamera();
    return {room:this.world.zoneAt(this.x,this.z),crouched:this.isCrouched,prone:this.isProne,
      sprinting:this.sprinting,slow:this.isWalkingSlow,lean:this.lean,speed:Math.hypot(this.velX,this.velZ),groundY:floor,position:[this.x,this.y,this.z]};
  }
  applyCamera(){
    const bob=this.moving ? Math.sin(this.stepClock)*(this.sprinting?.016:this.isCrouched?.007:.009) : 0;
    const eye=this.y+this.eyeHeight-.12+bob;
    // This is not a decorative through-wall camera offset: each leaning
    // increment is tested against every solid collider at eye height.
    const leanX=Math.cos(this.yaw),leanZ=-Math.sin(this.yaw);
    let shift=0;
    // Greater camera translation, but retain collision-checked eye clearance.
    const wanted=this.lean*.50;
    for(let k=1;k<=6;k++){
      const candidate=wanted*k/6;
      const nx=this.x+leanX*candidate,nz=this.z+leanZ*candidate;
      if(this.blocked(nx,nz,eye-.12,.24,.21))break;
      shift=candidate;
    }
    this.camera.position.set(this.x+leanX*shift,eye,this.z+leanZ*shift);
    // ~17 degrees at full lean: visible tactical shoulder peek.
    this.camera.rotation.set(this.pitch,this.yaw,-shift*.61,"YXZ");
  }
}
