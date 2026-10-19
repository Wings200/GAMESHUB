import {materialStats,accumulatedBreach} from "./material-ballistics.js?v=blackout-v330-advanced-ordnance";
import {buildFacility} from "./facility.js?v=blackout-v330-advanced-ordnance";
// BLACKOUT V0.7 — compact 2-site training facility inside the offline range.
// Targets and breach-test panels are the only obstacles. All collidable
// panel meshes share transforms with their real collision records.
export function buildRange(THREE,scene){
  scene.background=new THREE.Color(0x9db7c6);
  scene.fog=new THREE.FogExp2(0x9db7c6,.004);
  scene.add(new THREE.HemisphereLight(0xd7f0ff,0x3e4e61,2));
  const sun=new THREE.DirectionalLight(0xffe8c5,2.4);
  sun.position.set(-38,85,-54);scene.add(sun);
  const root=new THREE.Group();scene.add(root);
  const colliders=[],shootables=[],targets=[],panels=[],placed=[];
  const state={collisionRevision:0};
  const surface=new THREE.MeshStandardMaterial({color:0x525c67,roughness:.96,metalness:.05});
  const dark=new THREE.MeshStandardMaterial({color:0x273341,metalness:.4,roughness:.67});
  const bright=new THREE.MeshStandardMaterial({color:0xe4eef5,roughness:.55});
  const line=new THREE.MeshBasicMaterial({color:0x97aeb8});
  const warning=new THREE.MeshStandardMaterial({color:0xf3aa4f,metalness:.2,roughness:.55});
  const cyan=new THREE.MeshBasicMaterial({color:0x6ef3ef});
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(240,240),surface);
  floor.rotation.x=-Math.PI/2;root.add(floor);shootables.push(floor);
  const grid=new THREE.GridHelper(240,48,0x728a99,0x617281);grid.position.y=.012;root.add(grid);
  function mesh(geo,mat,x,y,z,parent=root){
    const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);parent.add(m);return m;
  }
  function box(x,y,z,w,h,d,mat,parent=root){
    return mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z,parent);
  }
  function label(text,x,z,scale=3){
    const cv=document.createElement("canvas");cv.width=512;cv.height=128;
    const c=cv.getContext("2d");c.fillStyle="#10202e";c.fillRect(0,0,512,128);
    c.fillStyle="#6defee";c.fillRect(0,0,512,8);
    c.font="bold 39px Arial";c.textAlign="center";c.textBaseline="middle";
    c.fillStyle="#e4f9ff";c.fillText(text,256,69,492);
    const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;
    const p=mesh(new THREE.PlaneGeometry(scale,scale/4),new THREE.MeshBasicMaterial({map:t,transparent:true,side:THREE.DoubleSide}),x,.025,z);
    p.rotation.x=-Math.PI/2;
  }
  // Fixed-range distance markers on the ground, not building geometry.
  for(const z of [10,0,-10,-20,-30,-40,-50,-60]){
    box(0,.019,z,62,.025,.08,z===10?cyan:line);
    label(z===10?"START":`${Math.abs(z-10)} METERS`,-23,z+1.2,4.5);
  }
  for(const x of [-32,32]){
    box(x,.014,-24,.10,.026,85,warning);
  }
  // Low silhouette target geometry: head and center mass have independent
  // raycast regions, no physical wall collider, bounded scene assets.
  let targetId=0;
  function makeTarget(x,z,distanceLabel){
    const group=new THREE.Group();root.add(group);group.position.set(x,0,z);
    const pole=box(0,1.1,0,.12,2.2,.14,dark,group);
    const base=box(0,.09,0,.75,.18,.66,dark,group);
    const torso=box(0,1.46,.05,.86,1.08,.25,bright,group);
    const chest=box(0,1.48,.203,.35,.36,.018,warning,group);
    const head=mesh(new THREE.SphereGeometry(.255,12,10),bright,0,2.21,.04,group);
    const id=++targetId;
    const target={id,group,torso,head,chest,x,z,distanceLabel,health:100,alive:true,hits:0,
      reset(){this.health=100;this.alive=true;this.hits=0;torso.material=bright;head.material=bright;chest.visible=true;group.visible=true;},
      damage(amount){if(!this.alive)return false;this.health=Math.max(0,this.health-amount);this.hits++;
        if(!this.health){this.alive=false;torso.material=dark;head.material=dark;chest.visible=false;}
        return !this.health; }};
    torso.userData={kind:"target",target,hitZone:"body"};
    head.userData={kind:"target",target,hitZone:"head"};
    chest.userData={kind:"target",target,hitZone:"body"};
    targets.push(target);shootables.push(torso,head,chest);
    return target;
  }
  // Keep Site A center lane clear of non-hostile range dummies so
  // defenders can actually engage approaching orange attack bots.
  // Preserve 12 practice dummies and targets behind the two side panels.
  for(const z of [-10,-22,-36]){
    for(const x of [-18,-11,11,18])makeTarget(x,z,`${Math.abs(z-10)}m`);
  }
  // Standalone panels for weapon penetration and attacker/defender tests.
  // They are NOT a level, so remove/rebuild them without changing the arena.
  let panelId=0;
  function makePanel(x,z,materialType="drywall"){
    const id=++panelId,g=new THREE.Group();root.add(g);
    const materialProfile=materialStats(materialType);
    g.position.set(x,0,z);
    const frameMat=new THREE.MeshStandardMaterial({color:0x38444e,roughness:.82,metalness:.3});
    const reinforced=new THREE.MeshStandardMaterial({color:0x4b667a,roughness:.55,metalness:.75,side:THREE.DoubleSide});
    // Flat double-sided wall skin: transparent texture pixels are literal
    // visible apertures. Bullet tracing independently respects those holes.
    // A full box would keep opaque geometry behind its front-face cutouts.
    const paint=document.createElement("canvas");paint.width=1024;paint.height=1024;
    const brush=paint.getContext("2d");
    const texture=new THREE.CanvasTexture(paint);
    texture.colorSpace=THREE.SRGBColorSpace;
    const soft=new THREE.MeshStandardMaterial({map:texture,side:THREE.DoubleSide,
      transparent:true,alphaTest:.40,roughness:materialType==="glass"?.3:.93,
      metalness:0,opacity:materialType==="glass"?.74:1});
    const center=mesh(new THREE.PlaneGeometry(3,2.88),soft,0,1.5,0,g);
    box(-1.56,1.48,0,.13,2.97,.4,frameMat,g);
    box(1.56,1.48,0,.13,2.97,.4,frameMat,g);
    box(0,2.985,0,3.2,.13,.4,frameMat,g);
    const rails=[.33,2.73].map(h=>box(0,h,.12,2.94,.075,.09,frameMat,g));
    const overlay=new THREE.Group();g.add(overlay);overlay.visible=false;
    const plateMat=new THREE.MeshStandardMaterial({color:0x526f82,metalness:.83,roughness:.39});
    const plates=[0,1,2].map(i=>{
      const plate=box(0,.51+i*.99,.145,2.94,.96,.095,plateMat,overlay);
      plate.userData.previewPlate=i;
      return plate;
    });
    const holes=[],partitionColliders=[];
    let cluster=null,breach=null;
    function removePartition(){
      for(const section of partitionColliders){
        const k=colliders.indexOf(section);
        if(k>=0)colliders.splice(k,1);
      }
      partitionColliders.length=0;
    }
    function syncPartition(){
      removePartition();
      const ci=colliders.indexOf(c);
      rails[0].visible=!breach?.traversable;
      if(breach?.traversable){
        if(ci>=0)colliders.splice(ci,1);
        const min=x-1.56,max=x+1.56,
          left=x+breach.centerX-breach.halfWidth,
          right=x+breach.centerX+breach.halfWidth;
        const makeSection=(a,b,low,high)=>{
          if(b-a<.015||high-low<.015)return;
          const section={minX:a,maxX:b,minZ:z-.22,maxZ:z+.22,
            minY:low,maxY:high,tag:"test-panel"};
          colliders.push(section);partitionColliders.push(section);
        };
        makeSection(min,left,0,2.99);
        makeSection(right,max,0,2.99);
        makeSection(left,right,breach.top,2.99);
      }else if(!colliders.includes(c))colliders.push(c);
      state.collisionRevision++;
    }
    function repaint(){
      brush.clearRect(0,0,1024,1024);
      brush.fillStyle=materialType==="glass"?"#a6d4d9":
        materialType==="plywood"?"#ae855c":"#bba087";
      brush.fillRect(0,0,1024,1024);
      brush.fillStyle=materialType==="glass"?"#daf8ff":
        materialType==="plywood"?"#795132":"#937b65";
      for(let k=0;k<23;k++){
        const yy=(k*142+36)%1024;
        brush.globalAlpha=.13+(k%5)*.025;
        brush.fillRect(0,yy,1024,4+(k%3));
      }
      brush.globalAlpha=1;
      brush.strokeStyle="rgba(52,40,31,.40)";brush.lineWidth=3;
      for(let k=1;k<5;k++){const xx=k*205;brush.beginPath();brush.moveTo(xx,0);brush.lineTo(xx,1024);brush.stroke();}
      for(const hole of holes){
        const u=(hole.x+1.5)/3*1024,v=(2.94-hole.y)/2.88*1024;
        const r=hole.r/3*1024;
        brush.beginPath();brush.arc(u,v,r+2.1,0,Math.PI*2);
        brush.fillStyle="#44392f";brush.fill();
        brush.globalCompositeOperation="destination-out";
        brush.beginPath();brush.arc(u,v,r,0,Math.PI*2);brush.fill();
        brush.globalCompositeOperation="source-over";
      }
      if(breach){
        // The visible aperture and the real floor-level collision opening
        // use the *same* coordinates. No magic full-panel deletion.
        const l=(breach.centerX-breach.halfWidth+1.5)/3*1024;
        const w=breach.halfWidth*2/3*1024;
        const top=(2.94-breach.top)/2.88*1024;
        const bottom=Math.min(1024,(2.94-breach.bottom)/2.88*1024);
        brush.fillStyle="#362b25";
        brush.fillRect(l-5,top-5,w+10,bottom-top+10);
        brush.globalCompositeOperation="destination-out";
        brush.fillRect(l,top,w,bottom-top);
        brush.globalCompositeOperation="source-over";
      }
      texture.needsUpdate=true;
    }
    repaint();
    const c={minX:x-1.56,maxX:x+1.56,minZ:z-.22,maxZ:z+.22,minY:0,maxY:2.99,tag:"test-panel"};
    colliders.push(c);
    const panel={id,x,z,group:g,mesh:center,rails,collider:c,holes,
      materialType,materialProfile,reinforced:false,destroyed:false,
      get breach(){return breach},get impacts(){return cluster?.wear||0},
      get openingWidth(){return breach?.traversable?breach.halfWidth*2:0},
      holeAt(point){
        const localX=point.x-x,localY=point.y;
        return Boolean(breach&&Math.abs(localX-breach.centerX)<breach.halfWidth&&
          localY>=breach.bottom&&localY<=breach.top)||
          holes.some(h=>Math.hypot(localX-h.x,localY-h.y)<h.r*.85);
      },
      bulletHole(point){
        if(this.destroyed||this.reinforced)return false;
        const localX=point.x-x,localY=point.y;
        if(Math.abs(localX)>1.49||localY<.065||localY>2.93)return false;
        if(holes.length<160){
          const existing=holes.find(h=>Math.hypot(localX-h.x,localY-h.y)<.11);
          if(existing)existing.r=Math.min(.12,existing.r+.006*materialProfile.wear);
          else holes.push({x:localX,y:localY,r:materialProfile.hole});
        }
        // Sustained impacts in a local cluster gradually eat material.
        // A large opening requires repeated shots, not just one.
        if(!cluster||Math.abs(localX-cluster.x)>.78){
          cluster={x:localX,wear:0};
        }
        cluster.x=Math.max(-.78,Math.min(.78,cluster.x*.93+localX*.07));
        cluster.wear+=materialProfile.wear;
        const next=accumulatedBreach(cluster,materialType);
        const wasOpen=Boolean(breach?.traversable);
        breach=next;
        if(Boolean(breach?.traversable)!==wasOpen)syncPartition();
        repaint();return true;
      },
      hitBullet(point){
        if(this.destroyed)return {passed:true,attenuation:1,material:materialType};
        if(this.reinforced)return {passed:false,attenuation:0,material:"steel"};
        const previouslyOpen=this.holeAt(point);
        if(!this.bulletHole(point))return {passed:false,attenuation:0,material:materialType};
        return {passed:true,attenuation:previouslyOpen?.94:materialProfile.through,
          material:materialType,opened:Boolean(breach?.traversable)};
      },
      previewReinforcement(progress){
        overlay.visible=progress>0&&progress<1&&!this.reinforced&&!this.destroyed;
        const p=Math.max(0,Math.min(1,progress));
        plates.forEach((plate,i)=>{
          const part=Math.max(.001,Math.min(1,p*3-i));
          plate.visible=p*3>i;
          plate.scale.y=part;
          plate.position.y=(.03+i*.99)+part*.48;
        });
      },
      cancelReinforcement(){overlay.visible=false;},
      reset(){
        this.reinforced=false;this.destroyed=false;g.visible=true;
        state.collisionRevision++;
        overlay.visible=false;holes.length=0;cluster=null;breach=null;
        removePartition();repaint();
        center.material=soft;rails.forEach(r=>{r.material=frameMat;r.visible=true});
        if(!colliders.includes(c))colliders.push(c);
      },
      reinforce(){
        if(this.destroyed||this.reinforced)return false;
        this.reinforced=true;overlay.visible=false;center.material=reinforced;
        cluster=null;breach=null;removePartition();holes.length=0;repaint();
        if(!colliders.includes(c))colliders.push(c);
        state.collisionRevision++;
        rails.forEach(r=>{r.material=reinforced;r.visible=true});return true;
      },
      // Ordinary bullets only punch through soft material. The panel itself
      // NEVER disappears from a bullet hit. Only an explicit breach charge
      // can fully remove a non-reinforced test wall.
      damage(amount,breach=false){
        if(this.destroyed||this.reinforced||!breach)return false;
        this.destroyed=true;g.visible=false;overlay.visible=false;
        state.collisionRevision++;
        const i=colliders.indexOf(c);if(i!==-1)colliders.splice(i,1);
        removePartition();return true;
      }};
    for(const part of [center,...rails])part.userData={kind:"panel",panel,perforated:part===center};
    panels.push(panel);shootables.push(center,...rails);
    return panel;
  }
  // Aligned with target lanes behind them so through-holes are testable.
  // Five standalone wall rigs: soft material, reinforcement and
  // Thermite tests remain collision-aware without constructing a building.
  makePanel(-12,-29,"drywall");
  const preReinforcedTestPanel=makePanel(12,-29,"steel");
  makePanel(-12,-44,"plywood");makePanel(12,-44,"glass");
  label("DRYWALL",-12,-31.5,2.8);
  label("STEEL / HARD BREACH",12,-31.5,3.8);
  label("PLYWOOD",-12,-46.6,2.7);
  label("GLASS",12,-46.6,2.3);
  // The central wall is used by AI reinforcement and penetration tests.
  makePanel(0,-37,"drywall");
  const facility=buildFacility(THREE,scene,{root,colliders,shootables});
  // One permanent hard-breach SAMPLE station, never a one-time building wall.
  preReinforcedTestPanel.reinforce();
  function addShield(x,z,yaw){
    const forward={x:-Math.sin(yaw),z:-Math.cos(yaw)};
    const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=yaw;root.add(g);
    const mat=new THREE.MeshStandardMaterial({color:0x3d566b,metalness:.75,roughness:.44});
    const center=box(0,.68,0,1.65,1.35,.21,mat,g);
    box(-.76,.67,.07,.13,1.3,.31,dark,g);box(.76,.67,.07,.13,1.3,.31,dark,g);
    box(0,1.30,.02,1.48,.10,.23,cyan,g);
    // Convert rotated 1.65m panel to its actual axis-aligned world AABB.
    const halfX=Math.abs(Math.cos(yaw))*.9+Math.abs(Math.sin(yaw))*.14;
    const halfZ=Math.abs(Math.sin(yaw))*.9+Math.abs(Math.cos(yaw))*.14;
    const c={minX:x-halfX,maxX:x+halfX,minZ:z-halfZ,maxZ:z+halfZ,minY:0,maxY:1.42,tag:"shield"};
    colliders.push(c);
    state.collisionRevision++;
    const shield={group:g,collider:c,mesh:center,remove(){
      const i=colliders.indexOf(c);
      if(i>=0){colliders.splice(i,1);state.collisionRevision++;}
      g.visible=false;root.remove(g);
      const shotIndex=shootables.indexOf(center);
      if(shotIndex>=0)shootables.splice(shotIndex,1);
      g.traverse?.(node=>{if(node.isMesh){
        node.geometry?.dispose?.();
        // The dark/cyan materials are shared; only the unique shield
        // face material is owned by this instance.
        if(node===center)node.material?.dispose?.();
      }});
      const j=placed.indexOf(shield);if(j>=0)placed.splice(j,1);
    }};
    center.userData={kind:"shield",shield};shootables.push(center);
    placed.push(shield);return shield;
  }
  function reset(){
    for(const t of targets)t.reset();
    for(const p of panels)p.reset();
    if(facility.mode==="mechanics-sandbox")preReinforcedTestPanel.reinforce();
    for(const s of [...placed])s.remove();
  }
  return {root,colliders,shootables,targets,panels,placed,
    floor,reset,addShield,facility,
    floorAt:()=>0,zoneAt:(x,z)=>facility.zoneAt(x,z),
    spawn:{x:0,y:0,z:16,yaw:0},
    state,
    get collisionRevision(){return state.collisionRevision;},
    set collisionRevision(v){state.collisionRevision=v;},
    specifications:{flat:true,size:240,targetCount:targets.length,panelCount:panels.length,sites:2,
      facility:false,mode:"mechanics-sandbox",doorFrames:10,wallStations:panels.length,
      hardBreachSamples:1,materialTypes:["drywall","plywood","glass","steel"],coverProps:8}};
}
