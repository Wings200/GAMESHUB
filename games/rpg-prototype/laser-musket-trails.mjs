// W20.26: pooled world-space red laser streaks, visible then dissolving.
// The geometry freezes at its firing path. It never follows the camera.
import {LASER_MUSKET_TUNING} from './laser-musket-mechanics.mjs';
export function laserTrailOpacity(age,duration=LASER_MUSKET_TUNING.beamSeconds,
    hold=LASER_MUSKET_TUNING.beamHoldSeconds){
  if(age<0||age>=duration)return 0;
  if(age<=hold)return 1;
  const t=Math.max(0,Math.min(1,(age-hold)/(duration-hold)));
  return (1-t)*(1-t)*(1-.25*t);
}
export function createLaserTrails(scene,THREE,{capacity=8}={}){
  const count=Math.max(2,Math.min(20,Math.floor(capacity)));
  const unit=new THREE.Vector3(0,1,0),start=new THREE.Vector3(),
    end=new THREE.Vector3(),direction=new THREE.Vector3(),center=new THREE.Vector3();
  const coreGeometry=new THREE.CylinderGeometry(.013,.013,1,8,1,true);
  const hazeGeometry=new THREE.CylinderGeometry(.050,.050,1,8,1,true);
  const sparkGeometry=new THREE.SphereGeometry(.055,8,8);
  const beams=Array.from({length:count},(_,index)=>{
    const coreMat=new THREE.MeshBasicMaterial({color:0xff3338,transparent:true,
      opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
    const haloMat=new THREE.MeshBasicMaterial({color:0xff492d,transparent:true,
      opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
    const sparkMat=new THREE.MeshBasicMaterial({color:0xffa9a3,transparent:true,
      opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
    const root=new THREE.Group();
    root.name='LaserMusketTrail'+index;
    const core=new THREE.Mesh(coreGeometry,coreMat);
    const haze=new THREE.Mesh(hazeGeometry,haloMat);
    const spark=new THREE.Mesh(sparkGeometry,sparkMat);
    core.renderOrder=haze.renderOrder=6;
    spark.renderOrder=7;
    root.add(haze,core,spark);
    root.visible=false;scene.add(root);
    return {root,core,haze,spark,coreMat,haloMat,sparkMat,age:0,
      duration:LASER_MUSKET_TUNING.beamSeconds,level:1,active:false};
  });
  let cursor=0,shots=0;
  function spawn(from,to,level=1){
    if(!from||!to)return false;
    start.copy(from);end.copy(to);direction.copy(end).sub(start);
    const length=direction.length();
    if(!Number.isFinite(length)||length<.05)return false;
    const b=beams[cursor++%count],strength=Math.max(1,Math.min(6,level));
    direction.multiplyScalar(1/length);
    center.copy(start).add(end).multiplyScalar(.5);
    b.root.position.copy(center);
    b.root.quaternion.setFromUnitVectors(unit,direction);
    b.core.scale.set(1,length,1);
    b.haze.scale.set(1,length,1);
    // Endpoint sparks sit on the hit point in local +Y.
    b.spark.position.set(0,length/2,0);
    b.spark.scale.setScalar(.8+strength*.08);
    b.age=0;b.level=strength;b.active=true;b.root.visible=true;
    b.coreMat.opacity=.92;
    b.haloMat.opacity=.18+strength*.026;
    b.sparkMat.opacity=.76;
    shots++;return true;
  }
  function update(dt){
    const step=Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0));
    for(const b of beams){
      if(!b.active)continue;
      b.age+=step;
      const alpha=laserTrailOpacity(b.age,b.duration);
      if(alpha<=0){
        b.active=false;b.root.visible=false;
        continue;
      }
      b.coreMat.opacity=.92*alpha;
      b.haloMat.opacity=(.18+b.level*.026)*alpha;
      b.sparkMat.opacity=.76*Math.pow(alpha,1.8);
      const shrink=.7+.3*alpha;
      b.haze.scale.x=b.haze.scale.z=shrink;
    }
  }
  function dispose(){
    for(const b of beams){
      b.root.removeFromParent();
      b.coreMat.dispose();b.haloMat.dispose();b.sparkMat.dispose();
    }
    coreGeometry.dispose();hazeGeometry.dispose();sparkGeometry.dispose();
  }
  return {spawn,update,dispose,get metrics(){return {
    poolSize:count,shots,active:beams.filter(b=>b.active).length,
    longestTrailSeconds:LASER_MUSKET_TUNING.beamSeconds};}};
}
