// BLACKOUT mechanics stage 2 — reusable deterministic throwable collision/physics.
// Geometry is visual only; collision reads the same authoritative AABB world
// colliders used by bullets, AI and movement. No THREE dependency.
export const THROW_RADIUS=.13;
export function stepThrowable(projectile,colliders,dt){
  if(projectile.resting)return projectile;
  const total=Math.min(Math.max(dt,0),.09);
  const steps=Math.max(1,Math.ceil(total/.0125)),h=total/steps;
  for(let step=0;step<steps;step++){
    projectile.vy-=12.6*h;
    let nx=projectile.x+projectile.vx*h;
    let ny=projectile.y+projectile.vy*h;
    let nz=projectile.z+projectile.vz*h;
    let bounced=false;
    // Floor, with friction and bounce. Keep devices slightly off the floor.
    if(ny<THROW_RADIUS){
      ny=THROW_RADIUS;
      if(projectile.vy<0){
        projectile.vy=-projectile.vy*.29;bounced=true;
      }
      projectile.vx*=.82;projectile.vz*=.82;
    }
    const r=THROW_RADIUS;
    for(const c of colliders){
      if(c.tag==="floor-base"||c.maxY<=.07||
         ny+r<=c.minY||ny-r>=c.maxY)continue;
      if(nx+r<=c.minX||nx-r>=c.maxX||
         nz+r<=c.minZ||nz-r>=c.maxZ)continue;
      // Resolve the first axis crossed, never teleport through walls.
      const crossX=projectile.x+r<=c.minX||projectile.x-r>=c.maxX;
      const crossZ=projectile.z+r<=c.minZ||projectile.z-r>=c.maxZ;
      const crossY=projectile.y+r<=c.minY||projectile.y-r>=c.maxY;
      if(crossY){
        ny=projectile.y;projectile.vy=-projectile.vy*.24;
      }else if(crossX||!crossZ){
        nx=projectile.x;projectile.vx=-projectile.vx*.36;
        projectile.vz*=.79;
      }else{
        nz=projectile.z;projectile.vz=-projectile.vz*.36;
        projectile.vx*=.79;
      }
      bounced=true;
    }
    projectile.x=nx;projectile.y=ny;projectile.z=nz;
    if(bounced)projectile.bounces=(projectile.bounces||0)+1;
    if(projectile.y<=r+.002&&Math.abs(projectile.vy)<.75&&
       Math.hypot(projectile.vx,projectile.vz)<.72){
      projectile.y=r;
      projectile.vx=projectile.vy=projectile.vz=0;
      projectile.resting=true;
      break;
    }
  }
  return projectile;
}
