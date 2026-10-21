// BLACKOUT V0.8 · HUD state is derived from actual solo-training systems.
// Not a separate game loop; no changes to weapon ballistics/collision.
export const DRILL_LENGTH_SECONDS=3600;
export function drillClock(secondsRemaining){
 const s=Math.max(0,Math.floor(Number.isFinite(secondsRemaining)?secondsRemaining:0));
 return String(Math.floor(s/60)).padStart(2,"0")+":"+
   String(s%60).padStart(2,"0");
}
export function compassHeading(yaw){
 if(!Number.isFinite(yaw))return 0;
 return ((Math.round(-yaw*180/Math.PI)%360)+360)%360;
}
export function areaName(x,z){
 if(!Number.isFinite(x)||!Number.isFinite(z))return "EXT TEST RANGE";
 if(Math.abs(x+7)<3&&Math.abs(z-3)<3)return "EXT BARRICADE STATION";
 if(x<=-9&&z<2)return "EXT WEST COVER";
 if(x>=9&&z<2)return "EXT EAST COVER";
 if(z< -13)return "EXT TARGET RANGE";
 if(z>=13)return "EXT SPAWN AREA";
 return "EXT TEST RANGE";
}
export function drawTrainingMap(ctx,player,obstacles,targets,barricade=null){
 if(!ctx)return;
 const w=ctx.canvas.width,h=ctx.canvas.height;
 ctx.clearRect(0,0,w,h);
 const x=v=>(v+30)/60*w, y=v=>(v+30)/60*h;
 ctx.fillStyle="rgba(29,45,56,.34)";ctx.fillRect(0,0,w,h);
 ctx.strokeStyle="rgba(197,219,229,.15)";ctx.lineWidth=1;
 for(let z=-20;z<=20;z+=10){
  ctx.beginPath();ctx.moveTo(0,y(z));ctx.lineTo(w,y(z));ctx.stroke();
 }
 for(let xp=-20;xp<=20;xp+=10){
  ctx.beginPath();ctx.moveTo(x(xp),0);ctx.lineTo(x(xp),h);ctx.stroke();
 }
 for(const box of obstacles){
  ctx.fillStyle=box.id.startsWith("wall")?"rgba(197,218,224,.48)":"rgba(201,217,227,.33)";
  const left=x(box.x-box.width/2),top=y(box.z-box.depth/2);
  ctx.fillRect(left,top,box.width/60*w,box.depth/60*h);
 }
 for(const target of targets){
  const p=target.group?.position;
  if(!p)continue;
  ctx.beginPath();
  ctx.arc(x(p.x),y(p.z),2.4,0,2*Math.PI);
  ctx.fillStyle=target.downTime>0?"rgba(191,226,218,.3)":"#e9c48e";
  ctx.fill();
 }
 if(barricade){
  // Barricade test station is an actual destructible obstacle.
  const bx=x(barricade.x),by=y(barricade.z);
  ctx.fillStyle="#f0ca7e";
  ctx.fillRect(bx-4,by-2,8,4);
 }
 const px=x(player.x),py=y(player.z),yaw=player.yaw||0;
 ctx.save();
 ctx.translate(px,py);
 // A yaw of zero faces the north/negative-Z screen direction.
 ctx.rotate(-yaw);
 ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(-6,7);ctx.lineTo(0,4);
 ctx.lineTo(6,7);ctx.closePath();
 ctx.fillStyle="#90e7eb";ctx.fill();
 ctx.strokeStyle="#101f2b";ctx.lineWidth=1.5;ctx.stroke();
 ctx.restore();
}
