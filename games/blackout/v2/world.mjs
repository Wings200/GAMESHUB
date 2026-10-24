import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const mat = (hex, metalness = 0, roughness = 0.76) => new THREE.MeshStandardMaterial({ color: hex, metalness, roughness });
const steel = mat(0x344c5e, .65, .42);
const black = mat(0x101a24, .38, .58);
const visor = mat(0x315d74, .67, .21);
const fabric = mat(0x3f5058, .08, .95);
const accent = mat(0x2a89b5, .45, .42);

function box(group, w, h, d, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z); group.add(mesh); return mesh;
}
function cylinder(group, rt, rb, h, material, x, y, z, sides = 12) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, sides), material);
  mesh.position.set(x, y, z); group.add(mesh); return mesh;
}

// Shared original 3D asset: the home-screen operator and in-game opponents
// are constructed by this exact function, never separate unrelated artwork.
export function createOperator(id = 'specter') {
  const group = new THREE.Group();
  const isWarden = id === 'warden';
  const armor = isWarden ? mat(0x333d48,.23,.78) : mat(0x4d5b63,.21,.8);
  box(group, .79, .91, .43, fabric, 0, 1.28, 0);
  box(group, .91, .55, .51, armor, 0, 1.42, -.02);
  box(group, .7, .29, .53, black, 0, 1.05, -.01);
  box(group, .57, .26, .45, fabric, 0, .91, 0);
  for (const side of [-1, 1]) {
    box(group, .27, .8, .28, armor, side*.58, 1.23, -.01);
    box(group, .31, .27, .35, black, side*.58, .85, -.01);
    box(group, .3, .88, .32, fabric, side*.21, .43, 0);
    box(group, .35, .17, .49, black, side*.21, .13, -.09);
    box(group, .14, .31, .46, black, side*.38, 1.48, -.24);
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(.32, 12, 10), black);
  head.position.set(0, 1.96, 0); group.add(head);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(.36, 14, 10, 0, Math.PI*2, 0, Math.PI*.6), armor);
  helmet.position.set(0, 2.04, 0); group.add(helmet);
  box(group, .57, .15, .34, black, 0, 1.91, -.18);
  box(group, .53, .15, .085, visor, 0, 2.0, -.294);
  if (isWarden) {
    cylinder(group, .18, .2, .23, black, 0, 1.78, -.32);
    box(group,.16,.22,.15,steel,.27,1.79,-.24);
    box(group,.16,.22,.15,steel,-.27,1.79,-.24);
  } else {
    box(group,.12,.12,.2,accent,.27,1.65,-.21);
    box(group,.48,.11,.2,steel,0,1.36,-.33);
  }
  box(group, .37, .62, .2, black, 0, 1.38, .33);
  box(group, .15, .27, .24, isWarden?steel:accent, .46, 1.44, .25);
  box(group, .21, .32, .22, black, -.46, 1.46, .25);
  group.userData.role = id;
  return group;
}

export class TacticalWorld {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    this.menuScene = new THREE.Scene();
    this.menuScene.background = new THREE.Color(0x0b1622);
    this.menuScene.fog = new THREE.FogExp2(0x0a1622,.018);
    this.menuCamera = new THREE.PerspectiveCamera(38, 1, .1, 120);
    this.menuCamera.position.set(1.4, 2.7, 9.2);this.menuCamera.lookAt(0, 1.3, 0);
    this.gameScene = new THREE.Scene();
    this.gameScene.background = new THREE.Color(0x14202b);
    this.gameScene.fog = new THREE.FogExp2(0x14202b,.022);
    this.camera = new THREE.PerspectiveCamera(75, 1, .06, 130);
    this.gameScene.add(this.camera);
    this.player={x:-12,z:11,yaw:0,pitch:0,health:100,ammo:30,reserve:120,crouch:false};
    this.drone={x:-12,z:11,yaw:0,pitch:0,jump:0,alive:true};
    this.side='attack';this.botHealth=100;this.botAlive=true;this.botPlantProgress=0;this.botDefuseProgress=0;
    this.walls=[];this.wallMeshes=[];this.siteMarkers=[];this.reinforced=0;
    this.botShootDelay=1.8;this.shotDelay=0;this.reloadDelay=0;this.flash=0;
    this.sight='holo';this.barrel='standard';this.ads=false;
    this._buildMenu();this._buildLevel();this._buildWeapon();this.resize();
    window.addEventListener('resize',()=>this.resize());
  }
  resize() {
    const w=window.innerWidth,h=window.innerHeight;
    this.renderer.setSize(w,h,false);
    this.menuCamera.aspect=w/h;this.menuCamera.updateProjectionMatrix();
    this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
  }
  _lights(scene, isMenu=false) {
    scene.add(new THREE.AmbientLight(0x9bb7c9, isMenu?1.22:1.35));
    const key=new THREE.DirectionalLight(0x96cfff,isMenu?3.2:1.55);
    key.position.set(-7,12,4);scene.add(key);
    const fill=new THREE.PointLight(0x2b7ebf,isMenu?95:32,22);
    fill.position.set(4,3,-4);scene.add(fill);
  }
  _buildMenu() {
    this._lights(this.menuScene,true);
    const stage=new THREE.Mesh(new THREE.CylinderGeometry(3.5,4,0.34,48),mat(0x16283a,.4,.55));
    stage.position.set(1,-.22,0);this.menuScene.add(stage);
    for (let i=-4;i<=4;i++) {
      const rail=box(this.menuScene,.035,3.5,.035,mat(0x355776,.5,.45),i*1.5,1.4,-5);
      rail.material=mat(0x233d50,.52,.4);
    }
    this.hero=createOperator('specter');this.hero.position.set(1,0,0);this.hero.scale.setScalar(1.35);
    this.hero.rotation.y=-.28;this.menuScene.add(this.hero);
    const platformLight=new THREE.PointLight(0x6bc2fa,55,12);
    platformLight.position.set(2,2,3);this.menuScene.add(platformLight);
  }
  setHero(id) {
    if(this.hero.userData.role===id)return;
    this.menuScene.remove(this.hero);this.hero=createOperator(id);
    this.hero.position.set(1,0,0);this.hero.scale.setScalar(1.35);this.hero.rotation.y=-.28;
    this.menuScene.add(this.hero);
  }
  _addWall(x,z,w,d, h=3.5, material=mat(0x596a75,.12,.93), kind='wall') {
    const wall=box(this.gameScene,w,h,d,material,x,h/2,z);
    const cap=box(this.gameScene,w+.05,.09,d+.05,black,x,h+.045,z);
    this.walls.push({x,z,w,d,kind,mesh:wall});this.wallMeshes.push(wall,cap);
    return wall;
  }
  _addCrate(x,z,w=1.2,d=1.2) {
    const crate=box(this.gameScene,w,1.35,d,mat(0x6b675a,.1,.9),x,.675,z);
    box(this.gameScene,w+.08,.07,d+.08,black,x,1.34,z);
    this.walls.push({x,z,w,d,kind:'crate',mesh:crate});this.wallMeshes.push(crate);
  }
  _buildLevel() {
    this._lights(this.gameScene);
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(34,28),mat(0x34414b,.06,.95));
    ground.rotation.x=-Math.PI/2;this.gameScene.add(ground);
    const grid=new THREE.GridHelper(34,34,0x4a6978,0x3b4f5b);
    grid.position.y=.006;this.gameScene.add(grid);
    const wallMat=mat(0x52616a,.08,.97), darkMat=mat(0x394d5a,.16,.86);
    this._addWall(0,-14,34,.5,4,wallMat);this._addWall(0,14,34,.5,4,wallMat);
    this._addWall(-17,0,.5,28,4,wallMat);this._addWall(17,0,.5,28,4,wallMat);
    // Split into believable connected rooms, with open doorways through every divider.
    this._addWall(0,-11,.36,6,3.5,darkMat);
    this._addWall(0,-1,.36,10,3.5,darkMat);
    this._addWall(0,11,.36,6,3.5,darkMat);
    // Doorway openings near x=-9 and x=9 connect both bomb rooms to the approaches.
    this._addWall(-14,0,5,.35,3.3,darkMat);
    this._addWall(-3.5,0,4,.35,3.3,darkMat);
    this._addWall(3.5,0,4,.35,3.3,darkMat);
    this._addWall(14,0,5,.35,3.3,darkMat);
    for (const x of [-9,9]) box(this.gameScene,4,.22,.48,steel,x,3.25,0);
    for(let i=0;i<7;i++) {
      box(this.gameScene,.1,2,.1,steel,-15+i*4,1,-13.65);
      box(this.gameScene,.12,2,.12,steel,-15+i*4,1,13.65);
    }
    this._addCrate(-13,-8);this._addCrate(-4,-10,.95,1.9);
    this._addCrate(11,-2,2.2,1.1);this._addCrate(6,4,1.3,1.3);
    this._addCrate(13,8,1.1,1.1);
    for(const site of [{id:'A',x:-8,z:-6},{id:'B',x:8,z:-6}]) {
      const marker=new THREE.Mesh(new THREE.RingGeometry(2.95,3.07,48),new THREE.MeshBasicMaterial({color:0x62caff,side:THREE.DoubleSide}));
      marker.rotation.x=-Math.PI/2;marker.position.set(site.x,.025,site.z);this.gameScene.add(marker);this.siteMarkers.push(marker);
      const pad=new THREE.Mesh(new THREE.CylinderGeometry(.56,.62,.25,14),mat(0x1b4053,.5,.5));
      pad.position.set(site.x,.13,site.z);this.gameScene.add(pad);
      box(this.gameScene,.66,.24,.55,steel,site.x,.43,site.z);
      const sign=document.createElement('canvas');sign.width=128;sign.height=128;
      const ctx=sign.getContext('2d');ctx.fillStyle='#e1f7ff';ctx.font='bold 88px Arial';ctx.textAlign='center';ctx.fillText(site.id,64,94);
      const texture=new THREE.CanvasTexture(sign);
      const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false}));
      sprite.position.set(site.x,3.9,site.z);sprite.scale.set(1.4,1.4,1);this.gameScene.add(sprite);
    }
    // Deliberate tactical lighting; no expensive real-time shadows for Chromebooks.
    for(const [x,z] of [[-8,-7],[8,-7],[-9,8],[9,8]]) {
      const light=new THREE.PointLight(0x81bfea,18,12);light.position.set(x,3.25,z);this.gameScene.add(light);
      box(this.gameScene,1.5,.1,.35,mat(0xaac5d5,.35,.5),x,3.41,z);
    }
    this.enemy=createOperator('warden');this.enemy.position.set(-8,0,-7);this.gameScene.add(this.enemy);
    this.enemyHitbox=box(this.enemy,1.1,2.25,.9,new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}),0,1.12,0);
    this.defuser=box(this.gameScene,.75,.28,.44,mat(0x274d5e,.56,.45),-8,.2,-6);
    this.defuser.visible=false;
    this.droneModel=new THREE.Group();
    box(this.droneModel,.45,.19,.55,black,0,.14,0);
    for(const x of [-.24,.24])for(const z of [-.2,.2]) {
      const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,.09,10),black);
      wheel.rotation.z=Math.PI/2;wheel.position.set(x,.12,z);this.droneModel.add(wheel);
    }
    box(this.droneModel,.15,.1,.12,accent,0,.27,-.15);
    this.gameScene.add(this.droneModel);
  }
  _buildWeapon() {
    this.weapon=new THREE.Group();this.camera.add(this.weapon);
    box(this.weapon,.17,.2,.78,black,0,-.02,-.4);
    box(this.weapon,.19,.15,.32,steel,0,.05,-.08);
    box(this.weapon,.12,.12,.47,mat(0x222e36,.58,.44),0,.015,-.94);
    box(this.weapon,.14,.18,.23,steel,0,-.2,-.18);
    this.optic=box(this.weapon,.13,.14,.23,black,0,.19,-.42);
    box(this.weapon,.12,.03,.03,accent,0,.27,-.42);
    this.suppressor=box(this.weapon,.17,.17,.33,black,0,.015,-1.22);
    this.weapon.position.set(.35,-.3,-.6);
  }
  setLoadout(sight,barrel) {
    this.sight=sight;this.barrel=barrel;
    this.optic.visible=sight!=='iron';this.suppressor.visible=barrel==='suppressor';
  }
  _blocked(x,z,r=.31) {
    if(x<-16.45+r||x>16.45-r||z<-13.45+r||z>13.45-r)return true;
    return this.walls.some(w=>Math.abs(x-w.x)<w.w/2+r && Math.abs(z-w.z)<w.d/2+r);
  }
  _move(x,z,dx,dz,r) {
    const nx=x+dx,nz=z+dz;
    if(!this._blocked(nx,z,r))x=nx;
    if(!this._blocked(x,nz,r))z=nz;
    return {x,z};
  }
  start(side='attack',spawn='west',operator='specter') {
    this.side=side;this.player={x:side==='attack'?(spawn==='west'?-12:12):-9,z:side==='attack'?11:-9,yaw:side==='attack'?0:Math.PI,pitch:0,health:100,ammo:30,reserve:120,crouch:false};
    const enemyRole=side==='attack'?'warden':'specter';
    if(this.enemy.userData.role!==enemyRole){
      this.gameScene.remove(this.enemy);
      this.enemy=createOperator(enemyRole);this.gameScene.add(this.enemy);
      this.enemyHitbox=box(this.enemy,1.1,2.25,.9,new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}),0,1.12,0);
    }
    this.drone={x:side==='attack'?(spawn==='west'?-12:12):-9,z:side==='attack'?10:-9,yaw:0,pitch:0,jump:0,alive:true};
    this.botAlive=true;this.botHealth=100;this.botPlantProgress=0;this.botDefuseProgress=0;this.botShootDelay=2;
    this.enemy.visible=true;this.enemy.position.set(side==='attack'?-8:-8,0,side==='attack'?-7:10);
    this.enemy.rotation.y=side==='attack'?0:Math.PI;
    this.defuser.visible=false;this.reinforced=0;
    this.wallMeshes.forEach(w=>{if(w.userData.reinforced){w.material=mat(0x394d5a,.16,.86);w.userData.reinforced=false}});
    this.droneModel.position.set(this.drone.x,0,this.drone.z);
    this.camera.fov=75;this.camera.updateProjectionMatrix();
    this.setView('player');
  }
  setView(view) {this.view=view;this.weapon.visible=view==='player';this.droneModel.visible=view==='player'&&this.side==='attack'&&this.drone.alive}
  look(dx,dy) {
    const target=this.view==='drone'?this.drone:this.player;
    target.yaw-=dx*.0021;target.pitch=clamp(target.pitch-dy*.002,-1.3,1.3);
  }
  _cameraUpdate(input) {
    const p=this.view==='drone'?this.drone:this.player;
    this.camera.position.set(p.x,this.view==='drone'?.4+Math.max(0,p.jump):p.crouch?1.17:1.65,p.z);
    this.camera.rotation.order='YXZ';this.camera.rotation.set(p.pitch,p.yaw,this.view==='drone'?0:(input.leanRight?-.075:input.leanLeft?.075:0));
    this.camera.fov=this.ads&&this.view==='player'?53:75;this.camera.updateProjectionMatrix();
    this.weapon.position.lerp(new THREE.Vector3(this.ads?0:.35,this.ads?-.21:-.3,this.ads?-.45:-.6),.18);
  }
  _seeBot() {
    if(!this.botAlive)return false;
    const origin=this.camera.position.clone();
    const target=new THREE.Vector3(this.enemy.position.x,1.3,this.enemy.position.z);
    const direction=target.sub(origin);const range=direction.length();
    if(range>25)return false;direction.normalize();
    const facing=new THREE.Vector3();this.camera.getWorldDirection(facing);
    if(facing.dot(direction)<.9)return false;
    const ray=new THREE.Raycaster(origin,direction,.1,range);
    const hit=ray.intersectObjects(this.wallMeshes,false)[0];
    return !hit;
  }
  enemyInSight(){return this._seeBot()}
  _botCanSeePlayer() {
    if(!this.botAlive)return false;
    const origin=new THREE.Vector3(this.enemy.position.x,1.45,this.enemy.position.z);
    const target=new THREE.Vector3(this.player.x,1.45,this.player.z);
    const displacement=target.sub(origin);const range=displacement.length();
    if(range>19)return false;
    const ray=new THREE.Raycaster(origin,displacement.normalize(),.15,range);
    return !ray.intersectObjects(this.wallMeshes,false)[0];
  }
  shoot() {
    if(this.view!=='player'||this.shotDelay>0||this.reloadDelay>0||this.player.ammo<=0)return {fired:false};
    this.shotDelay=.105;this.player.ammo--;
    const offset=this.ads?.013:.055;
    const direction=new THREE.Vector3((Math.random()-.5)*offset,(Math.random()-.5)*offset,-1).normalize().applyEuler(this.camera.rotation);
    const ray=new THREE.Raycaster(this.camera.position,direction,.1,65);
    const blockers=ray.intersectObjects(this.wallMeshes,false);
    const enemyHit=ray.intersectObject(this.enemyHitbox,false)[0];
    const hitBot=this.botAlive&&enemyHit&&(!blockers.length||enemyHit.distance<blockers[0].distance);
    if(hitBot){this.botHealth-=this.ads?49:35;if(this.botHealth<=0){this.botHealth=0;this.botAlive=false;this.enemy.visible=false;}}
    this.flash=.13;
    return {fired:true,hitBot:!!hitBot,enemyDead:!this.botAlive,ammo:this.player.ammo};
  }
  reload() {
    if(this.reloadDelay>0||this.player.ammo>=30||this.player.reserve<=0)return false;
    this.reloadDelay=1.6;return true;
  }
  placeDefuser(site) {
    const spot={A:{x:-8,z:-6},B:{x:8,z:-6}}[site];if(!spot)return;
    this.defuser.visible=true;this.defuser.position.set(spot.x,.36,spot.z);
  }
  reinforceClosest() {
    const p=this.player;
    const candidate=this.walls.filter(w=>w.kind==='wall'&&w.mesh.position.y<2&&Math.hypot(p.x-w.x,p.z-w.z)<4).sort((a,b)=>Math.hypot(p.x-a.x,p.z-a.z)-Math.hypot(p.x-b.x,p.z-b.z))[0];
    if(!candidate||candidate.mesh.userData.reinforced)return false;
    candidate.mesh.material=mat(0x6d8293,.85,.3);candidate.mesh.userData.reinforced=true;this.reinforced++;
    return true;
  }
  nearWall() {return this.walls.some(w=>w.kind==='wall'&&!w.mesh.userData.reinforced&&Math.hypot(this.player.x-w.x,this.player.z-w.z)<3.8)}
  update(dt,input,phase,difficulty='recruit') {
    dt=Math.min(dt,.06);this.shotDelay=Math.max(0,this.shotDelay-dt);
    if(this.reloadDelay>0){this.reloadDelay-=dt;if(this.reloadDelay<=0){const n=Math.min(30-this.player.ammo,this.player.reserve);this.player.ammo+=n;this.player.reserve-=n;}}
    this.flash=Math.max(0,this.flash-dt);
    if(phase==='preparation'&&this.view==='drone'&&this.drone.alive) {
      const d=this.drone;const speed=input.shift?7:4.8;
      const f=(input.w?1:0)-(input.s?1:0),s=(input.d?1:0)-(input.a?1:0);
      const length=Math.hypot(f,s)||1;
      const delta=this._move(d.x,d.z,(-Math.sin(d.yaw)*f+Math.cos(d.yaw)*s)*speed*dt/length,(-Math.cos(d.yaw)*f-Math.sin(d.yaw)*s)*speed*dt/length,.19);
      d.x=delta.x;d.z=delta.z;
      d.jump=Math.max(0,d.jump-dt*2.4);
      this.droneModel.position.set(d.x,Math.max(0,d.jump),d.z);
    } else if(this.view==='player'&&this.player.health>0) {
      const p=this.player;p.crouch=!!input.c;
      const speed=p.crouch?2.1:input.shift?6.1:3.7;
      const f=(input.w?1:0)-(input.s?1:0),s=(input.d?1:0)-(input.a?1:0);
      const length=Math.hypot(f,s)||1;
      const delta=this._move(p.x,p.z,(-Math.sin(p.yaw)*f+Math.cos(p.yaw)*s)*speed*dt/length,(-Math.cos(p.yaw)*f-Math.sin(p.yaw)*s)*speed*dt/length,.33);
      p.x=delta.x;p.z=delta.z;
    }
    this._cameraUpdate(input);
    const events={};
    if(phase==='action'||phase==='postplant') {
      if(this.side==='attack'&&phase==='postplant'&&this.botAlive&&this.defuser.visible){
        const target=this.defuser.position;
        const vector=new THREE.Vector2(target.x-this.enemy.position.x,target.z-this.enemy.position.z);
        const dist=vector.length();
        if(dist>1.35){
          const movement=this._move(this.enemy.position.x,this.enemy.position.z,vector.x/dist*dt*2.25,vector.y/dist*dt*2.25,.37);
          this.enemy.position.x=movement.x;this.enemy.position.z=movement.z;this.botDefuseProgress=0;
        } else {
          this.botDefuseProgress+=dt;
          if(this.botDefuseProgress>=7){this.botDefuseProgress=0;events.botDefused=true;}
        }
      }
      if(this.botAlive&&this.player.health>0) {
        const p=this.player;const distance=Math.hypot(this.enemy.position.x-p.x,this.enemy.position.z-p.z);
        if(this.side==='defense'&&phase==='action'&&distance>2.1) {
          const dir=new THREE.Vector2(-8-this.enemy.position.x,-6-this.enemy.position.z);
          const length=Math.max(.001,dir.length());
          if(length>1.6){this.enemy.position.x+=dir.x/length*dt*1.9;this.enemy.position.z+=dir.y/length*dt*1.9;}
        }
        this.botShootDelay-=dt;
        if(this.botShootDelay<=0&&this._botCanSeePlayer()&&distance<17) {
          this.botShootDelay=difficulty==='veteran'?1.15:2.15;
          if(Math.random()<(difficulty==='veteran'?.83:.52)) {
            p.health=Math.max(0,p.health-(difficulty==='veteran'?20:12));events.playerHit=true;
            if(p.health===0)events.playerDead=true;
          }
        }
        if(this.side==='defense'&&phase==='action'&&Math.hypot(this.enemy.position.x+8,this.enemy.position.z+6)<2.5) {
          this.botPlantProgress+=dt;
          if(this.botPlantProgress>=7){this.botPlantProgress=0;events.botPlanted='A';}
        }
      }
    }
    return events;
  }
  render(isGame,timestamp=0) {
    if(isGame){this.renderer.render(this.gameScene,this.camera);return;}
    const time=timestamp*.001;
    this.hero.rotation.y=-.28+Math.sin(time*.3)*.12;
    this.hero.position.y=Math.sin(time*.95)*.018;
    this.renderer.render(this.menuScene,this.menuCamera);
  }
  captureModeArtwork() {
    // Mode-card images come from these actual game scenes and character models,
    // avoiding separate cinematic art that misrepresents gameplay.
    const width=600,height=200;
    const target=new THREE.WebGLRenderTarget(width,height);
    const old=this.renderer.getRenderTarget();
    const preview=new THREE.PerspectiveCamera(55,width/height,.1,100);
    const views=[
      {scene:this.gameScene,pos:[-11,5,10],look:[-8,1,-6]},
      {scene:this.gameScene,pos:[-5,3,-1],look:[-8,1.2,-7]},
      {scene:this.menuScene,pos:[2,2.9,7],look:[1,1.4,0]},
      {scene:this.gameScene,pos:[1,23,6],look:[0,0,0]}
    ];
    const pictures=[];
    const paper=document.createElement('canvas');paper.width=width;paper.height=height;
    const context=paper.getContext('2d');
    try {
      for(const view of views) {
        preview.position.set(...view.pos);preview.lookAt(...view.look);preview.updateProjectionMatrix();
        this.renderer.setRenderTarget(target);this.renderer.render(view.scene,preview);
        const pixels=new Uint8Array(width*height*4);
        this.renderer.readRenderTargetPixels(target,0,0,width,height,pixels);
        const image=context.createImageData(width,height);
        for(let row=0;row<height;row++) {
          const from=(height-1-row)*width*4,to=row*width*4;
          image.data.set(pixels.subarray(from,from+width*4),to);
        }
        context.putImageData(image,0,0);
        pictures.push(paper.toDataURL('image/jpeg',.75));
      }
    } finally {this.renderer.setRenderTarget(old);target.dispose();}
    return pictures;
  }
  getPosition(){return {...this.player}}
  getDronePosition(){return {...this.drone}}
  getRadar(){return {walls:this.walls,enemy:this.botAlive?{x:this.enemy.position.x,z:this.enemy.position.z}:null,player:this.view==='drone'?this.drone:this.player,side:this.side}}
}
