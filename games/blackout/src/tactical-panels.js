// BLACKOUT V5.3 — integrated, damageable SWITCHYARD wall modules.
// Original bullet-hole, reinforcement and charge interactions share the
// same interface as the mechanics-lab panels; visible holes and collider
// removals are not decorative fake walls.
import {materialStats,accumulatedBreach} from "./material-ballistics.js?v=blackout-v330-advanced-ordnance";
export function createTacticalPanel(T,root,world,config){
  const {x,z,y=0,axis="z",width=3.1,height=2.92,materialType="drywall",id}=config;
  const materialProfile=materialStats(materialType);
  const frameMat=new T.MeshStandardMaterial({color:0x30404d,metalness:.42,roughness:.69});
  const armored=new T.MeshStandardMaterial({color:0x516b7e,metalness:.78,roughness:.4,side:T.DoubleSide});
  const paint=document.createElement("canvas");paint.width=512;paint.height=512;
  const brush=paint.getContext("2d"),texture=new T.CanvasTexture(paint);
  texture.colorSpace=T.SRGBColorSpace;
  const soft=new T.MeshStandardMaterial({map:texture,side:T.DoubleSide,transparent:true,
    alphaTest:.42,metalness:.03,roughness:.94});
  const group=new T.Group();group.position.set(x,y,z);
  group.rotation.y=axis==="x"?Math.PI/2:0;
  root.add(group);
  const center=new T.Mesh(new T.PlaneGeometry(width,height),soft);
  center.position.y=height/2;center.userData.kind="panel";group.add(center);
  function beam(dx,dy,dz,w,h,d,mat=frameMat){
    const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);
    m.position.set(dx,dy,dz);group.add(m);return m;
  }
  const rails=[
    beam(-width/2-.10,height/2,0,.18,height+.14,.34),
    beam(width/2+.10,height/2,0,.18,height+.14,.34),
    beam(0,height+.035,0,width+.34,.13,.34)
  ];
  const overlay=new T.Group();group.add(overlay);overlay.visible=false;
  const plates=Array.from({length:3},(_,i)=>{
    const m=new T.Mesh(new T.BoxGeometry(width-.11,height/3-.04,.13),armored);
    m.position.set(0,(i+.5)*height/3,.11);overlay.add(m);return m;
  });
  const half=width/2;
  function bounds(left,right,bottom,top){
    const minY=y+bottom,maxY=y+top;
    return axis==="z"?{minX:x+left,maxX:x+right,minZ:z-.22,maxZ:z+.22,minY,maxY,tag:"soft-wall"}:
      {minX:x-.22,maxX:x+.22,minZ:z-left,maxZ:z-right,minY,maxY,tag:"soft-wall"};
  }
  const collider=bounds(-half-.05,half+.05,0,height+.08);
  const holes=[],partitionColliders=[];
  let breach=null,cluster=null,reinforced=false,destroyed=false;
  world.colliders.push(collider);
  function local(p){
    return {x:axis==="z"?p.x-x:z-p.z,y:p.y-y};
  }
  function removeSections(){
    for(const c of partitionColliders){
      const at=world.colliders.indexOf(c);if(at>=0)world.colliders.splice(at,1);
    }
    partitionColliders.length=0;
  }
  function syncCollider(){
    removeSections();
    const at=world.colliders.indexOf(collider);
    if(at>=0)world.colliders.splice(at,1);
    if(!destroyed){
      if(!breach?.traversable||reinforced)world.colliders.push(collider);
      else {
        const left=breach.centerX-breach.halfWidth,right=breach.centerX+breach.halfWidth;
        for(const [a,b,low,top] of [
          [-half-.05,left,0,height+.08],[right,half+.05,0,height+.08],
          [left,right,breach.top,height+.08]
        ]){
          if(b-a>.02&&top-low>.02){
            const part=bounds(a,b,low,top);
            world.colliders.push(part);partitionColliders.push(part);
          }
        }
      }
    }
    world.collisionRevision++;
  }
  function redraw(){
    brush.clearRect(0,0,512,512);
    brush.fillStyle=materialType==="plywood"?"#a3815e":"#aab6b9";
    brush.fillRect(0,0,512,512);
    for(let k=0;k<30;k++){
      brush.fillStyle=k%3===0?"#273b4722":"#f4f8fa17";
      brush.fillRect(0,(k*53)%512,512,k%4+1);
    }
    brush.strokeStyle="#45545e70";brush.lineWidth=2;
    for(const xx of [128,256,384]){brush.beginPath();brush.moveTo(xx,0);brush.lineTo(xx,512);brush.stroke();}
    for(const hole of holes){
      const xx=(hole.x/width+.5)*512,yy=(1-hole.y/height)*512,r=hole.r/width*512;
      brush.fillStyle="#463d36";brush.beginPath();brush.arc(xx,yy,r+2,0,Math.PI*2);brush.fill();
      brush.globalCompositeOperation="destination-out";
      brush.beginPath();brush.arc(xx,yy,r,0,Math.PI*2);brush.fill();
      brush.globalCompositeOperation="source-over";
    }
    if(breach){
      const left=(breach.centerX-breach.halfWidth)/width*512+256;
      const right=(breach.centerX+breach.halfWidth)/width*512+256;
      const top=(1-breach.top/height)*512,bottom=(1-breach.bottom/height)*512;
      brush.globalCompositeOperation="destination-out";
      brush.fillRect(left,top,right-left,bottom-top);
      brush.globalCompositeOperation="source-over";
    }
    texture.needsUpdate=true;
  }
  redraw();
  const panel={
    id,x,y,z,axis,width,height,group,mesh:center,rails,collider,holes,
    materialType,materialProfile,
    get reinforced(){return reinforced},get destroyed(){return destroyed},
    get breach(){return breach},get impacts(){return cluster?.wear||0},
    get openingWidth(){return breach?.traversable?breach.halfWidth*2:0},
    holeAt(point){
      const p=local(point);
      return Boolean(breach?.traversable&&Math.abs(p.x-breach.centerX)<breach.halfWidth&&
        p.y>=breach.bottom&&p.y<=breach.top)||
        holes.some(h=>Math.hypot(p.x-h.x,p.y-h.y)<h.r*.82);
    },
    bulletHole(point){
      if(reinforced||destroyed)return false;
      const p=local(point);
      if(Math.abs(p.x)>half-.07||p.y<.06||p.y>height-.05)return false;
      if(holes.length<130)holes.push({x:p.x,y:p.y,r:materialProfile.hole});
      if(!cluster||Math.abs(p.x-cluster.x)>.72)cluster={x:p.x,wear:0};
      cluster.x=Math.max(-.7,Math.min(.7,cluster.x*.94+p.x*.06));
      cluster.wear+=materialProfile.wear;
      // The same wear profile as the test range; practical through-holes
      // and sufficiently eroded walkable opening, not a destroyed wall.
      breach=accumulatedBreach(cluster,materialType);
      if(breach?.traversable)syncCollider();
      redraw();return true;
    },
    hitBullet(point){
      if(destroyed)return {passed:true,attenuation:1,material:materialType};
      if(reinforced)return {passed:false,attenuation:0,material:"steel"};
      const passed=this.holeAt(point);
      if(!this.bulletHole(point))return {passed:false,attenuation:0,material:materialType};
      return {passed:true,attenuation:passed?.95:materialProfile.through,
        material:materialType,opened:Boolean(breach?.traversable)};
    },
    previewReinforcement(progress){
      overlay.visible=progress>0&&progress<1&&!reinforced&&!destroyed;
      for(const [i,plate] of plates.entries()){
        const fill=Math.min(1,Math.max(.001,progress*3-i));
        plate.visible=progress*3>i;plate.scale.y=fill;
        plate.position.y=(i+fill*.5)*height/3;
      }
    },
    cancelReinforcement(){overlay.visible=false},
    reinforce(){
      if(reinforced||destroyed)return false;
      reinforced=true;holes.length=0;breach=null;cluster=null;
      center.material=armored;overlay.visible=false;
      for(const r of rails)r.material=armored;
      redraw();syncCollider();return true;
    },
    damage(amount,hardBreach=false){
      if(destroyed||reinforced||!hardBreach)return false;
      destroyed=true;group.visible=false;overlay.visible=false;
      syncCollider();return true;
    },
    reset(){
      reinforced=false;destroyed=false;holes.length=0;cluster=null;breach=null;
      group.visible=true;center.material=soft;overlay.visible=false;
      for(const r of rails)r.material=frameMat;
      redraw();syncCollider();
    }
  };
  for(const m of [center,...rails])m.userData={kind:"panel",panel,perforated:m===center};
  world.shootables.push(center,...rails);
  return panel;
}
