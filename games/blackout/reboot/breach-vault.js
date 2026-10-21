// BLACKOUT V0.20.1 · actual Space-to-vault traversal through raised hard-breach
// openings. All intermediate samples use the same collision system as movement.
// A raised steel sill stays solid; walking/standing never treats it as a door.
import {canOccupy,PLAYER_RADIUS,CROUCH_HEIGHT,STAND_HEIGHT} from "./physics.js?v=reboot-028";
import {REINFORCEMENT} from "./reinforcement.js?v=reboot-047";
export const BREACH_VAULT=Object.freeze({duration:.76,lift:.74,startDistance:1.3,landingDistance:1.12});
const lerp=(a,b,t)=>a+(b-a)*t;
const clamp=n=>Math.max(0,Math.min(1,n));
export function beginBreachVault(player,opening,obstacles=[]){
 if(!player||!opening||![player.x,player.y,player.z,player.yaw,
  opening.left,opening.right,opening.bottom,opening.top].every(Number.isFinite))
  return {vault:null,reason:"NO VALID VAULT"};
 if(!player.grounded||player.prone||player.y>.01)
  return {vault:null,reason:"MUST BE STANDING OR CROUCHED ON THE FLOOR"};
 const dist=player.z-REINFORCEMENT.z,side=Math.sign(dist);
 if(!side||Math.abs(dist)>.0+BREACH_VAULT.startDistance||Math.abs(dist)<.35)
  return {vault:null,reason:"MOVE UP TO THE BREACH"};
 const forward=-Math.cos(player.yaw);
 if(forward*side>-.4)
  return {vault:null,reason:"FACE INTO THE BREACH"};
 const center=(opening.left+opening.right)/2;
 const safeHalf=(opening.right-opening.left)/2-PLAYER_RADIUS-.08;
 if(safeHalf<=0||Math.abs(player.x-center)>safeHalf)
  return {vault:null,reason:"CENTER ON THE OPENING"};
 if(opening.bottom>BREACH_VAULT.lift+.03||
   opening.top<BREACH_VAULT.lift+CROUCH_HEIGHT+.03)
  return {vault:null,reason:"OPENING IS TOO SMALL TO VAULT"};
 const exitZ=REINFORCEMENT.z-side*BREACH_VAULT.landingDistance;
 // Detect real gypsum, other steel, or a solid prop within the aperture.
 const x=player.x;
 if(!canOccupy(x,BREACH_VAULT.lift,REINFORCEMENT.z,CROUCH_HEIGHT,obstacles)||
    !canOccupy(x,0,exitZ,STAND_HEIGHT,obstacles))
  return {vault:null,reason:"VAULT OPENING OR LANDING IS BLOCKED"};
 return {vault:{
  start:{x:player.x,z:player.z},end:{x:player.x,z:exitZ},
  side,elapsed:0,duration:BREACH_VAULT.duration
 },reason:"VAULTING THROUGH HARD BREACH"};
}
export function stepBreachVault(player,vault,dt,obstacles=[]){
 if(!vault)return {player,vault:null,event:"none"};
 const step=Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0));
 const elapsed=Math.min(vault.duration,vault.elapsed+step);
 const t=clamp(elapsed/vault.duration);
 let footY,z;
 if(t<.25){footY=lerp(0,BREACH_VAULT.lift,t/.25);z=vault.start.z;}
 else if(t<.78){footY=BREACH_VAULT.lift;z=lerp(vault.start.z,vault.end.z,(t-.25)/.53);}
 else{footY=lerp(BREACH_VAULT.lift,0,(t-.78)/.22);z=vault.end.z;}
 if(t>=1){
  if(!canOccupy(vault.end.x,0,vault.end.z,STAND_HEIGHT,obstacles))
   return {player:{...player,x:vault.start.x,y:0,z:vault.start.z,vy:0,grounded:true,
    crouched:false,vaulting:false},vault:null,event:"blocked"};
  return {player:{...player,x:vault.end.x,y:0,z:vault.end.z,vy:0,grounded:true,
   crouched:false,prone:false,moving:false,sprinting:false,speed:0,vaulting:false},
   vault:null,event:"landed"};
 }
 if(!canOccupy(vault.start.x,footY,z,CROUCH_HEIGHT,obstacles)){
  return {player:{...player,x:vault.start.x,y:0,z:vault.start.z,vy:0,grounded:true,
   crouched:false,vaulting:false},vault:null,event:"blocked"};
 }
 return {player:{...player,x:vault.start.x,y:footY,z,vy:0,grounded:false,
  crouched:true,prone:false,moving:true,sprinting:false,speed:0,vaulting:true},
  vault:{...vault,elapsed},event:"vaulting"};
}
