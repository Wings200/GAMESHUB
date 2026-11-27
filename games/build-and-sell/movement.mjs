
export const LIMIT=24, STAND=1.68,CROUCH=1.12;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function playerState(x=0,z=0){return {x,y:0,z,levelY:0,yaw:0,pitch:0,vx:0,vz:0,vy:0,eye:STAND,crouch:false,grounded:true,speed:0,mode:"idle",jumpHeld:false}}
export function step(p,keys,dt){
 dt=clamp(dt,0,.05);
 const crouch=keys.has("ControlLeft")||keys.has("ControlRight")||keys.has("KeyC"),running=!crouch&&(keys.has("ShiftLeft")||keys.has("ShiftRight"));
 const forward=(keys.has("KeyW")?1:0)-(keys.has("KeyS")?1:0),right=(keys.has("KeyD")?1:0)-(keys.has("KeyA")?1:0),len=Math.hypot(forward,right)||1;
 const speed=crouch?1.65:running?5.8:3.25,blend=1-Math.exp(-14*dt);
 const vx=(right*Math.cos(p.yaw)-forward*Math.sin(p.yaw))/len*speed,vz=(-right*Math.sin(p.yaw)-forward*Math.cos(p.yaw))/len*speed;
 p.vx+=(vx-p.vx)*blend;p.vz+=(vz-p.vz)*blend;
 p.x=clamp(p.x+p.vx*dt,-LIMIT,LIMIT);p.z=clamp(p.z+p.vz*dt,-LIMIT,LIMIT);
 const jump=keys.has("Space");if(jump&&!p.jumpHeld&&p.grounded&&!crouch){p.vy=4.4;p.grounded=false;}p.jumpHeld=jump;
 if(!p.grounded){p.vy-=13.5*dt;p.y+=p.vy*dt;if(p.y<=0){p.y=0;p.vy=0;p.grounded=true}}
 p.eye+=((crouch?CROUCH:STAND)-p.eye)*(1-Math.exp(-14*dt));p.crouch=crouch;p.speed=Math.hypot(p.vx,p.vz);
 p.mode=!p.grounded?(p.vy>0?"jump":"fall"):crouch?(p.speed>.12?"crouchWalk":"crouch"):p.speed>.12?(running?"run":"walk"):"idle";
 return p;
}
export function snapshot(p){return {x:p.x,y:p.y,z:p.z,levelY:p.levelY||0,yaw:p.yaw,pitch:p.pitch,crouch:p.crouch,mode:p.mode,speed:p.speed}}
export function sanitizePose(p){
 if(!p||!["x","y","z","yaw","pitch","speed"].every(k=>typeof p[k]==="number"&&Number.isFinite(p[k])))return null;
 return {x:clamp(p.x,-LIMIT,LIMIT),y:clamp(p.y,0,2),levelY:Number.isFinite(p.levelY)?clamp(p.levelY,0,4.2):0,z:clamp(p.z,-LIMIT,LIMIT),yaw:Math.atan2(Math.sin(p.yaw),Math.cos(p.yaw)),pitch:clamp(p.pitch,-1.45,1.45),crouch:!!p.crouch,mode:["idle","walk","run","jump","fall","crouch","crouchWalk"].includes(p.mode)?p.mode:"idle",speed:clamp(p.speed,0,6)};
}
export function angleMix(a,b,t){return a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t}
