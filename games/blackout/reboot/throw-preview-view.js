// BLACKOUT V0.18.1 · world-space trajectory line + terminal marker.
// All visible lines are predictions, never persistent physical projectiles.
const COLOURS=Object.freeze({frag:0xff6564,flash:0xf5f9ff,
 smoke:0x9bc2c1,impact:0xffb363,c4:0xf2dc65});
export function createThrowPreviewView(THREE,scene){
 const root=new THREE.Group();root.name="BLACKOUT THROW PREDICTION";
 const line=new THREE.Line(new THREE.BufferGeometry(),
  new THREE.LineDashedMaterial({color:0xffffff,dashSize:.23,gapSize:.13,depthTest:true,
   transparent:true,opacity:.94}));
 root.add(line);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.22,.022,6,24),
  new THREE.MeshBasicMaterial({color:0xffffff,depthTest:true,transparent:true,opacity:.96}));
 ring.rotation.x=-Math.PI/2;root.add(ring);
 const marker=new THREE.Mesh(new THREE.SphereGeometry(.071,12,8),
  new THREE.MeshBasicMaterial({color:0xffffff,depthTest:true}));
 root.add(marker);
 root.visible=false;scene.add(root);
 function hide(){root.visible=false;}
 function update(gadgetId,path){
  if(!path||!path.points.length){hide();return;}
  const color=COLOURS[gadgetId]??0xffffff;
  line.material.color.setHex(color);
  ring.material.color.setHex(color);
  marker.material.color.setHex(color);
  const vecs=path.points.map(p=>new THREE.Vector3(p.x,p.y+.018,p.z));
  const old=line.geometry;
  line.geometry=new THREE.BufferGeometry().setFromPoints(vecs);
  line.computeLineDistances();old.dispose();
  const end=path.end;
  ring.position.set(end.x,Math.max(.04,end.y)+.035,end.z);
  marker.position.set(end.x,Math.max(.04,end.y)+.035,end.z);
  root.visible=true;
 }
 function dispose(){
  scene.remove(root);line.geometry.dispose();line.material.dispose();
  ring.geometry.dispose();ring.material.dispose();marker.geometry.dispose();marker.material.dispose();
 }
 return {update,hide,dispose,root};
}
