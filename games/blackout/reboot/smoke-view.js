// BLACKOUT V0.18.0 · original throwable canister and expanding dense smoke.
// An opaque animated inner body ACTUALLY hides scenery behind the smoke.
// Softer outside puffs make the cloud look atmospheric rather than a flat sphere.
export function createSmokeView(THREE,scene,device){
 const root=new THREE.Group();root.name="BLACKOUT SMOKE CANISTER "+device.id;
 const body=new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,.28,10),
  new THREE.MeshStandardMaterial({color:0x49585a,metalness:.68,roughness:.46}));
 const band=new THREE.Mesh(new THREE.CylinderGeometry(.102,.102,.045,10),
  new THREE.MeshStandardMaterial({color:0xc8ced0,metalness:.52,roughness:.42}));
 band.position.y=.075;root.add(body,band);scene.add(root);
 let removed=false;
 function sync(d){
  if(removed)return;
  if(!d?.armed){
   removed=true;scene.remove(root);
   for(const m of [body,band]){m.geometry.dispose();m.material.dispose();}
   return;
  }
  root.position.set(d.x,d.y,d.z);
  if(!d.resting){root.rotation.x+=.1;root.rotation.z+=.09;}
 }
 sync(device);
 return {root,sync};
}
// Each smoke cloud shares a single generated texture between its own sprites
// to avoid extra textures/geometry per puff and repeated allocations per frame.
export function createSmokeCloudView(THREE,scene,cloud){
 const root=new THREE.Group();root.name="BLACKOUT DENSE SMOKE "+cloud.id;
 const coreMaterial=new THREE.ShaderMaterial({
  uniforms:{time:{value:0},density:{value:0}},
  vertexShader:`varying vec3 vP;
void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`precision mediump float;
varying vec3 vP;
uniform float time;
uniform float density;
void main(){
 float pattern=sin(vP.x*13.0+sin(vP.z*7.0+time*.32))
              *sin(vP.y*10.0+vP.x*5.0-time*.17);
 float waves=sin((vP.x+vP.y*1.9+vP.z)*7.4+time*.25);
 float grey=.44+pattern*.055+waves*.037;
 // Full density is fully solid and depth-writes behind scenery. During
 // dispersal, spatial blue-noise style stippling slowly reveals sightlines
 // rather than making the opaque core disappear all at once.
 float coverage=smoothstep(.06,.98,density);
 float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
 if(grain>coverage)discard;
 gl_FragColor=vec4(vec3(grey),1.0);
}`,
  depthWrite:true,depthTest:true,transparent:false,side:THREE.DoubleSide
 });
 const core=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),coreMaterial);
 core.renderOrder=3;root.add(core);
 const canvas=document.createElement("canvas");canvas.width=128;canvas.height=128;
 const ctx=canvas.getContext("2d");
 if(ctx){
  const grad=ctx.createRadialGradient(64,64,5,64,64,63);
  grad.addColorStop(0,"rgba(139,150,151,0.96)");
  grad.addColorStop(.43,"rgba(134,145,147,0.91)");
  grad.addColorStop(.77,"rgba(132,144,146,0.45)");
  grad.addColorStop(1,"rgba(132,144,146,0)");
  ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);
 }
 const texture=new THREE.CanvasTexture(canvas);
 texture.colorSpace=THREE.SRGBColorSpace;
 const puffs=[];
 for(let i=0;i<20;i++){
  const mat=new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,
   depthTest:true,opacity:0,color:0xffffff,fog:false});
  const sprite=new THREE.Sprite(mat);
  // deterministic stratified positions; the layer is billowy from any angle.
  const a=i*2.39996323,ring=.25+.67*Math.sqrt((i+.5)/20);
  const height=Math.sin(i*3.83)*.57;
  sprite.userData={x:Math.cos(a)*ring,z:Math.sin(a)*ring,y:height,
   size:1.1+(i%5)*.14,phase:i*.72};
  sprite.renderOrder=4;
  root.add(sprite);puffs.push(sprite);
 }
 scene.add(root);
 let removed=false;
 function sync(c,time=0){
  if(removed)return;
  if(!c||c.density<=0&&c.age>1){
   if(c&&c.age<=1)return;
   dispose();return;
  }
  root.position.set(c.x,c.y,c.z);
  const radius=Math.max(.08,c.radius),density=Math.max(0,Math.min(1,c.density));
  core.scale.set(radius*.75,radius*.49,radius*.75);
  coreMaterial.uniforms.time.value=time;
  core.visible=density>.06; // gradually dissolve the center as smoke fades
  coreMaterial.uniforms.density.value=density;
  for(const p of puffs){
   const v=p.userData;
   p.position.set(v.x*radius*.75, v.y*radius*.43+Math.sin(time*.36+v.phase)*.06,
    v.z*radius*.75);
   p.scale.setScalar(radius*v.size*.94);
   p.material.opacity=Math.min(.96,density*(.62+(puffs.indexOf(p)%4)*.08));
  }
 }
 function dispose(){
  if(removed)return;removed=true;scene.remove(root);
  core.geometry.dispose();coreMaterial.dispose();
  for(const p of puffs)p.material.dispose();
  texture.dispose();
 }
 sync(cloud);
 return {root,sync,dispose};
}
