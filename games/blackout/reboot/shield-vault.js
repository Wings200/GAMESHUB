// BLACKOUT V0.24.0 · dedicated safe Space traversal over deployable
// cover. Uses the same AABB player collision checks as normal movement.
import {canOccupy,CROUCH_HEIGHT,STAND_HEIGHT,PLAYER_RADIUS}
 from "./physics.js?v=reboot-028";
import {DEPLOYABLE_SHIELD,shieldCollider,liveShields}
 from "./deployable-shield.js?v=reboot-052";
export const SHIELD_VAULT=Object.freeze({
 duration:.88,lift:1.40,approachRange:1.55,landingOffset:1.10
});
const clamp=n=>Math.max(0,Math.min(1,n));
const mix=(a,b,t)=>a+(b-a)*t;
export function beginShieldVault(player,state,obstacles=[]){
 if(!player?.grounded||player.prone||Math.abs(player.y)>.01||
  ![player.x,player.z,player.yaw].every(Number.isFinite))
  return {vault:null,reason:"STAND OR CROUCH ON GROUND TO VAULT"};
 for(const d of liveShields(state)){
  const nx=-Math.sin(d.yaw),nz=-Math.cos(d.yaw);
  const tx=Math.cos(d.yaw),tz=-Math.sin(d.yaw);
  const dx=player.x-d.x,dz=player.z-d.z;
  const dist=dx*nx+dz*nz;
  const side=Math.sign(dist);
  const lateral=dx*tx+dz*tz;
  if(!side||Math.abs(dist)<DEPLOYABLE_SHIELD.depth/2+PLAYER_RADIUS+.07||
     Math.abs(dist)>SHIELD_VAULT.approachRange||
     Math.abs(lateral)>DEPLOYABLE_SHIELD.width/2-PLAYER_RADIUS*.58)
   continue;
  const viewX=-Math.sin(player.yaw),viewZ=-Math.cos(player.yaw);
  if((viewX*nx+viewZ*nz)*side>-.5)continue;
  const start={x:player.x,z:player.z};
  const landing={x:d.x+tx*lateral-side*nx*SHIELD_VAULT.landingOffset,
   z:d.z+tz*lateral-side*nz*SHIELD_VAULT.landingOffset};
  // Requires clearance above the actual shield AND on both sides.
  const over={x:d.x+tx*lateral,z:d.z+tz*lateral};
  if(!canOccupy(over.x,SHIELD_VAULT.lift,over.z,CROUCH_HEIGHT,obstacles)||
     !canOccupy(landing.x,0,landing.z,STAND_HEIGHT,obstacles))continue;
  return {vault:{id:d.id,start,landing,elapsed:0,duration:SHIELD_VAULT.duration},
   reason:"VAULTING BULLETPROOF SHIELD"};
 }
 return {vault:null,reason:"FACE SHIELD CLOSELY · PRESS SPACE TO VAULT"};
}
export function stepShieldVault(player,vault,dt,obstacles=[]){
 if(!vault)return {player,vault:null,event:"none"};
 const delta=Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0));
 const time=Math.min(vault.duration,vault.elapsed+delta);
 const t=clamp(time/vault.duration);
 let y,x,z;
 if(t<.25){y=mix(0,SHIELD_VAULT.lift,t/.25);x=vault.start.x;z=vault.start.z;}
 else if(t<.78){y=SHIELD_VAULT.lift;
  const u=(t-.25)/.53;
  x=mix(vault.start.x,vault.landing.x,u);
  z=mix(vault.start.z,vault.landing.z,u);
 }else{y=mix(SHIELD_VAULT.lift,0,(t-.78)/.22);
  x=vault.landing.x;z=vault.landing.z;
 }
 const blocked=!canOccupy(x,y,z,t>=1?STAND_HEIGHT:CROUCH_HEIGHT,obstacles);
 if(blocked){
  return {player:{...player,x:vault.start.x,z:vault.start.z,y:0,vy:0,
   grounded:true,crouched:false,vaulting:false,moving:false,speed:0},
   vault:null,event:"blocked"};
 }
 if(t>=1)return {player:{...player,x:vault.landing.x,z:vault.landing.z,
  y:0,vy:0,grounded:true,crouched:false,prone:false,vaulting:false,
  moving:false,sprinting:false,speed:0},vault:null,event:"landed"};
 return {player:{...player,x,y,z,vy:0,grounded:false,crouched:true,
  prone:false,vaulting:true,moving:true,sprinting:false,speed:0},
  vault:{...vault,elapsed:time},event:"vaulting"};
}
