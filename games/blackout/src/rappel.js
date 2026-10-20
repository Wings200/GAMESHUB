// BLACKOUT V6.5 — usable exterior rappel with proximity guidance, safe
// approach, cable climb and actual floor-aware barricaded window entry.
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export class ClubhouseRappel {
  constructor(world,player,barricades){
    this.world=world;this.player=player;this.barricades=barricades;
    this.active=null;this.hangOffset=0;
    this.attachmentRange=2.85;
  }
  get attached(){return Boolean(this.active)}
  reset(){this.active=null;this.hangOffset=0}
  anchors(){return this.world.mapId==="clubhouse"?
    (this.world.facility.anchors||[]):[]}
  nearestAnchor(maxDistance=Infinity){
    const player=this.player;
    const anchors=this.anchors().filter(anchor=>
      player.y>=anchor.y-anchor.length-.55&&player.y<=anchor.y+.35);
    const nearest=anchors.sort((a,b)=>distance(player,a)-distance(player,b))[0];
    if(!nearest)return null;
    const d=distance(player,nearest);
    return d<=maxDistance?{anchor:nearest,distance:d}:null;
  }
  // Walk-in reach to ropes is allowed, but never through an intact wall.
  // Ground and upper elevations are checked independently.
  clearApproach(anchor){
    const p=this.player,d=distance(p,anchor);
    if(d<.08)return true;
    const samples=Math.max(2,Math.ceil(d/.18));
    for(let i=1;i<=samples;i++){
      const t=i/samples;
      const x=p.x+(anchor.x-p.x)*t,z=p.z+(anchor.z-p.z)*t;
      if(p.blocked?.(x,z,p.y,p.height||1.73,p.radius||.34))return false;
    }
    return true;
  }
  get hint(){
    if(this.active){
      const w=this.nearestWindow();
      if(w&&Math.abs(this.player.y-(w.y||0))<=.85)
        return this.barricades.hasBarricade(w)?
          "RAPPEL · WINDOW BARRICADED · BREAK BOARDS · W/S CLIMB · T RELEASE":
          "RAPPEL · SPACE ENTER WINDOW · W/S CLIMB · T RELEASE";
      return "RAPPEL · W CLIMB / S DESCEND · SPACE AT WINDOW · T RELEASE";
    }
    const candidate=this.nearestAnchor(8);
    if(!candidate)return "";
    if(candidate.distance<=this.attachmentRange){
      return this.clearApproach(candidate.anchor)?
        "T · ATTACH RAPPEL · W CLIMB / S DESCEND":
        "RAPPEL ROPE NEARBY · APPROACH FROM OUTSIDE";
    }
    return "RAPPEL ROPE "+candidate.distance.toFixed(1)+"M AWAY · PRESS T WHEN CLOSE";
  }
  toggle(){
    if(this.active){
      // Release resets tether, then the player uses normal gravity next frame.
      this.reset();return {ok:true,message:"RAPPEL RELEASED"}
    }
    if(this.world.mapId!=="clubhouse")
      return {ok:false,message:"RAPPEL ONLY ON CONSOLATE + CLUBHOUSE"};
    const candidate=this.nearestAnchor();
    if(!candidate)
      return {ok:false,message:"NO EXTERIOR RAPPEL ANCHORS ON THIS LEVEL"};
    if(candidate.distance>this.attachmentRange)
      return {ok:false,message:"RAPPEL ROPE "+candidate.distance.toFixed(1)+
        "M AWAY · GET CLOSER TO THE OUTSIDE WALL"};
    if(!this.clearApproach(candidate.anchor))
      return {ok:false,message:"RAPPEL BLOCKED BY WALL · APPROACH FROM OUTSIDE"};
    const anchor=candidate.anchor,{player}=this;
    this.active=anchor;this.hangOffset=0;
    player.x=anchor.x;player.z=anchor.z;
    player.y=clamp(player.y,anchor.y-anchor.length,anchor.y-.18);
    player.velX=0;player.velY=0;player.velZ=0;
    player.vault=null;player.vaultArc=0;
    player.moving=false;player.sprinting=false;
    player.applyCamera();
    return {ok:true,message:"RAPPEL ATTACHED · W UP / S DOWN · SPACE AT WINDOW · T RELEASE"};
  }
  update(dt,keys){
    if(!this.active)return false;
    const a=this.active;
    const delta=Number(keys.has("KeyW"))-Number(keys.has("KeyS"));
    const speed=keys.has("ShiftLeft")||keys.has("ShiftRight")?3.65:2.65;
    this.player.y=clamp(this.player.y+delta*speed*Math.min(.043,Math.max(0,dt)),
      a.y-a.length,a.y-.18);
    this.player.x=a.x;this.player.z=a.z;
    this.player.velX=0;this.player.velY=0;this.player.velZ=0;
    this.player.moving=false;this.player.sprinting=false;
    this.player.vaultArc=0;
    this.player.applyCamera();
    return true;
  }
  nearestWindow(){
    if(!this.active)return null;
    const a=this.active;
    return (this.barricades.openings||[]).filter(o=>
      o.kind==="window"&&Math.abs((o.y||0)-(a.y-3.75))<1.1&&
      distance(o,a)<2.4)
      .sort((u,v)=>distance(u,a)-distance(v,a))[0]||null;
  }
  // All authored upper-floor windows have a physical sill. Try multiple
  // horizontal positions across the aperture; refuse any obstructed landing.
  // This fixes the Archive hallway window whose centre hits a soft-wall edge.
  validLanding(window,anchor){
    const dx=window.x-anchor.x,dz=window.z-anchor.z;
    const d=Math.hypot(dx,dz);
    if(d<.05)return null;
    const forward={x:dx/d,z:dz/d};
    const side=window.axis==="z"?{x:1,z:0}:{x:0,z:1};
    const inset=Math.min(.42,Math.max(.08,window.width/2-.5));
    for(const shift of [0,-inset,inset,-inset*.45,inset*.45]){
      const x=window.x+forward.x*1.10+side.x*shift,
        z=window.z+forward.z*1.10+side.z*shift;
      const y=this.world.floorAt(x,z,(window.y||0)+.26);
      if(Math.abs(y-(window.y||0))>.24)continue;
      if(this.player.blocked?.(x,z,y,1.73,.34))continue;
      return {x,y,z};
    }
    return null;
  }
  enterWindow(now=0){
    if(!this.active)return {ok:false,message:"NOT ATTACHED TO RAPPEL"};
    const target=this.nearestWindow();
    if(!target)return {ok:false,message:"NO WINDOW NEAR THIS RAPPEL ROPE"};
    if(Math.abs(this.player.y-(target.y||0))>1)
      return {ok:false,message:"CLIMB TO "+(target.y||0).toFixed(1)+
        "M WINDOW HEIGHT · HOLD W / S"};
    if(this.barricades.hasBarricade(target))
      return {ok:false,message:"WINDOW BARRICADED · CLEAR THE BOARDS BEFORE ENTRY"};
    const landing=this.validLanding(target,this.active);
    if(!landing)
      return {ok:false,message:"WINDOW ENTRY BLOCKED BY WALL / NO SAFE FLOOR"};
    if(!this.player.startVault(landing.x,landing.z))
      return {ok:false,message:"WINDOW ENTRY BLOCKED · TRY ANOTHER POSITION"};
    if(target.glass)target.glass.visible=false;
    this.reset();
    return {ok:true,message:"RAPPEL WINDOW ENTRY · SAFE LANDING"};
  }
}
