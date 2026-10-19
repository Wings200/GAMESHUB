// BLACKOUT V6 — offline operator-controlled Clubhouse exterior rappel.
// Attachment is limited to the 9 authored anchor cables and their drop heights.
// W/S changes cable position, SPACE enters a clear upstairs window, T releases.
export class ClubhouseRappel {
  constructor(world,player,barricades){
    this.world=world;this.player=player;this.barricades=barricades;
    this.active=null;this.hangOffset=0;
  }
  get attached(){return Boolean(this.active)}
  reset(){this.active=null;this.hangOffset=0}
  toggle(){
    if(this.active){this.reset();return {ok:true,message:"RAPPEL RELEASED"}}
    if(this.world.mapId!=="clubhouse")
      return {ok:false,message:"RAPPEL ONLY ON CONSOLATE + CLUBHOUSE"};
    const {x,y,z}=this.player;
    const possible=(this.world.facility.anchors||[])
      .filter(a=>Math.hypot(a.x-x,a.z-z)<1.9&&
        y>=a.y-a.length-.35&&y<=a.y+.35)
      .sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z));
    const anchor=possible[0];
    if(!anchor)return {ok:false,message:"MOVE NEAR AN EXTERIOR RAPPEL ROPE · PRESS T"};
    this.active=anchor;this.hangOffset=0;
    this.player.x=anchor.x;this.player.z=anchor.z;
    this.player.y=Math.min(anchor.y-.25,Math.max(anchor.y-anchor.length,y));
    this.player.velX=0;this.player.velY=0;this.player.velZ=0;
    this.player.vault=null;
    this.player.applyCamera();
    return {ok:true,message:"RAPPEL ATTACHED · W UP / S DOWN · SPACE ENTER WINDOW · T RELEASE"};
  }
  update(dt,keys){
    if(!this.active)return false;
    const a=this.active,delta=Number(keys.has("KeyW"))-Number(keys.has("KeyS"));
    const speed=keys.has("ShiftLeft")?3.2:2.25;
    this.player.y=Math.max(a.y-a.length,
      Math.min(a.y-.1,this.player.y+delta*speed*Math.min(.043,dt)));
    this.player.x=a.x;this.player.z=a.z;
    this.player.velX=0;this.player.velY=0;this.player.velZ=0;
    this.player.moving=false;this.player.sprinting=false;
    this.player.applyCamera();
    return true;
  }
  enterWindow(now=0){
    if(!this.active)return {ok:false,message:"NOT ATTACHED TO RAPPEL"};
    const a=this.active;
    const openings=(this.barricades.openings||[]).filter(o=>o.kind==="window"&&
      Math.hypot(o.x-a.x,o.z-a.z)<2.1&&
      Math.abs(this.player.y-(o.y||0))<1.15);
    const target=openings.sort((u,v)=>
      Math.hypot(u.x-a.x,u.z-a.z)-Math.hypot(v.x-a.x,v.z-a.z))[0];
    if(!target)return {ok:false,message:"CLIMB TO THE HEIGHT OF A WINDOW, THEN PRESS SPACE"};
    if(this.barricades.hasBarricade(target))
      return {ok:false,message:"WINDOW BARRICADED · BREAK THE BOARDS BEFORE ENTRY"};
    const dx=target.x-a.x,dz=target.z-a.z,d=Math.hypot(dx,dz);
    if(d<.01)return {ok:false,message:"WINDOW ENTRY ALIGNMENT INVALID"};
    const nx=target.x+dx/d*1.08,nz=target.z+dz/d*1.08;
    const landing=this.world.floorAt(nx,nz,target.y||0);
    // Must actually land on the target level; don't vault into thin air.
    if(Math.abs(landing-(target.y||0))>.24)
      return {ok:false,message:"WINDOW HAS NO SAFE LANDING FLOOR"};
    if(!this.player.startVault(nx,nz))
      return {ok:false,message:"WINDOW LANDING BLOCKED · TRY ANOTHER WINDOW"};
    this.reset();
    return {ok:true,message:"RAPPEL ENTRY · SECOND FLOOR WINDOW"};
  }
}