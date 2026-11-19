import {buildSculptMeshes} from "./sniper-sculpts.mjs?v=1";
// Illegal Chess · Bishop Sniper cinematic V4
// Original procedural 3D WebGL; no external JS, models, video, or textures.
// Only runs during server-committed sniper first-shot cinematic events.
export const SNIPER_3D_DURATION=4900;
export const SNIPER_3D_PHASES=Object.freeze([
 {name:"closeup",start:0,end:1300,subtitle:"TARGET ACQUIRED · BISHOP IN POSITION"},
 {name:"fire",start:1300,end:1580,subtitle:"SHOT FIRED · MUZZLE FLASH"},
 {name:"bullet",start:1580,end:3500,subtitle:"BULLET CAMERA · SLOW MOTION"},
 {name:"impact",start:3500,end:4400,subtitle:"DIRECT HIT · TARGET ELIMINATED"},
 {name:"return",start:4400,end:4900,subtitle:"KILL CONFIRMED · RETURNING TO BOARD"}
]);
export const shotPhase=ms=>SNIPER_3D_PHASES.find(p=>ms<p.end)||SNIPER_3D_PHASES.at(-1);
const clamp=(n,min=0,max=1)=>Math.max(min,Math.min(max,n));
const smooth=t=>{const x=clamp(t);return x*x*(3-2*x);};
// Deterministic animation rig: camera, weapon and impact effects all read
// the same timeline. No extra physics engine or hidden timers.
export function sniperMotion(ms){
 const after=Math.max(0,ms-1320)/1000;
 const recoil=ms>=1320&&ms<2120
  ?.48*Math.exp(-after*4)*Math.sin(after*12):0;
 const cameraJolt=ms>=1320&&ms<1620
  ?Math.sin((ms-1320)*.10)*.045*(1-(ms-1320)/300):0;
 const scopeZoom=smooth((ms-650)/540)*(1-smooth((ms-1260)/160));
 const impact=clamp((ms-3500)/900);
 const shockwave=ms>=3500&&ms<4150?smooth((ms-3500)/650):0;
 const bulletBoost=ms>=1580&&ms<3500
  ?Math.sin(Math.PI*clamp((ms-1580)/1920)):0;
 return {recoil,cameraJolt,scopeZoom,impact,shockwave,bulletBoost};
}
export function square3D(square){
 if(!/^[a-h][1-8]$/.test(square||""))return null;
 return [(square.charCodeAt(0)-97)-3.5,0,3.5-(Number(square[1])-1)];
}
export function sniperPath(event){
 const origin=square3D(event?.origin),target=square3D(event?.target);
 if(!origin||!target||origin[0]===target[0]&&origin[2]===target[2])return null;
 const len=Math.hypot(target[0]-origin[0],target[2]-origin[2]);
 const dir=[(target[0]-origin[0])/len,0,(target[2]-origin[2])/len];
 const perp=[dir[2],0,-dir[0]];
 const shooter=[origin[0]-dir[0]*1.38,0,origin[2]-dir[2]*1.38];
 const muzzle=[shooter[0]+dir[0]*1.95+perp[0]*.25,.43,
               shooter[2]+dir[2]*1.95+perp[2]*.25];
 const hit=[target[0],.76,target[2]];
 return {origin,target,dir,perp,shooter,muzzle,hit,yaw:Math.atan2(dir[0],dir[2])};
}
const lerp3=(a,b,t)=>a.map((n,i)=>n+(b[i]-n)*t);
export function cinematicCamera(event,ms){
 const p=sniperPath(event);if(!p)return null;
 const {shooter,muzzle,hit,dir,perp}=p,phase=shotPhase(ms).name;
 const at=(base,d=0,s=0,y=0)=>[base[0]+dir[0]*d+perp[0]*s,base[1]+y,base[2]+dir[2]*d+perp[2]*s];
 let eye,look,bullet=null;
 if(phase==="closeup"||phase==="fire"){
  const push=smooth(ms/1300);
  // Side-on portrait of the sculpted bishop, not a backwards shot into its
  // oversized base. This framing makes the mitre, rifle stock and scope clear.
  // The aiming camera travels from a side portrait into the scope line.
  // Camera proximity and FOV both change: this is a true 3D zoom.
  const motion=sniperMotion(ms);
  eye=at(shooter,.22+.32*push,2.65-.4*push-1.03*motion.scopeZoom,
   1.48-.15*push-.26*motion.scopeZoom);
  look=at(shooter,.66+.25*push+.3*motion.scopeZoom,.03,.43);
  if(phase==="fire")eye=at(eye,-motion.recoil*.16,0,motion.cameraJolt);

 }else if(phase==="bullet"){
  // Physical bullet chase: eye moves with the projectile in 3D world space.
  const u=clamp((ms-1580)/1920),track=1-Math.pow(1-u,1.45);
  bullet=lerp3(muzzle,hit,track);
  eye=at(bullet,-1.03,.72+.21*Math.sin(u*Math.PI),.47+.14*Math.sin(u*Math.PI));
  look=at(bullet,1.38,.05,-.06);
 }else{
  const ret=phase==="return"?smooth((ms-4400)/500):0;
  eye=at(hit,2.65+ret*1.8,1.3+ret*1.1,1.62+ret*2.25);
  look=at(hit,0,0,.25);
  if(ms<3710){
   const shake=1-clamp((ms-3500)/210);
   eye[0]+=Math.sin(ms*.22)*.08*shake;
   eye[1]+=Math.cos(ms*.19)*.06*shake;
  }
 }
 return {phase,eye,look,bullet,shooter,muzzle,hit,dir,perp,yaw:p.yaw};
}
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>{const len=Math.hypot(...a)||1;return a.map(n=>n/len);};
const I=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
function mm(a,b){
 const r=new Float32Array(16);
 for(let col=0;col<4;col++)for(let row=0;row<4;row++)
  for(let k=0;k<4;k++)r[col*4+row]+=a[k*4+row]*b[col*4+k];
 return r;
}
function translate(x=0,y=0,z=0){const a=I();a[12]=x;a[13]=y;a[14]=z;return a;}
function scale(x=1,y=1,z=1){const a=I();a[0]=x;a[5]=y;a[10]=z;return a;}
function rotX(a){const m=I(),c=Math.cos(a),s=Math.sin(a);m[5]=c;m[6]=s;m[9]=-s;m[10]=c;return m;}
function rotY(a){const m=I(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m;}
function rotZ(a){const m=I(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[1]=s;m[4]=-s;m[5]=c;return m;}
function model(pos=[0,0,0],sz=[1,1,1],r=[0,0,0]){
 return mm(translate(...pos),mm(rotY(r[1]),mm(rotX(r[0]),mm(rotZ(r[2]),scale(...sz)))));
}
function perspective(fov,aspect,near,far){
 const f=1/Math.tan(fov/2),a=new Float32Array(16);
 a[0]=f/aspect;a[5]=f;a[10]=(far+near)/(near-far);
 a[11]=-1;a[14]=2*far*near/(near-far);
 return a;
}
function lookAt(eye,target){
 const z=unit(sub(eye,target)),x=unit(cross([0,1,0],z)),y=cross(z,x);
 return new Float32Array([
  x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,
  -dot(x,eye),-dot(y,eye),-dot(z,eye),1
 ]);
}
const COLORS={
 white:[.95,.91,.84],dark:[.10,.13,.19],gold:[1,.73,.29],
 violet:[.62,.47,.9],steel:[.42,.55,.66],gun:[.12,.18,.25],
 black:[.1,.13,.2],lens:[.21,.76,.93],flash:[1,.7,.23],
 tileLight:[.36,.52,.62],tileDark:[.15,.24,.35],
 board:[.065,.09,.14],bullet:[1,.77,.34]
};
const vertexSource=[
 "attribute vec3 aPosition;","attribute vec3 aNormal;",
 "uniform mat4 uModel;","uniform mat4 uVP;",
 "varying vec3 vNormal;","varying vec3 vWorld;",
 "void main(){",
 " vec4 world=uModel*vec4(aPosition,1.0);",
 " vWorld=world.xyz;vNormal=mat3(uModel)*aNormal;",
 " gl_Position=uVP*world;","}"
].join("\n");
const fragmentSource=[
 "precision mediump float;",
 "varying vec3 vNormal;","varying vec3 vWorld;",
 "uniform vec3 uColor;","uniform float uGlow;","uniform vec3 uCamera;",
 "void main(){",
 " vec3 n=normalize(vNormal);",
 " vec3 key=normalize(vec3(-0.65,0.82,-0.25));",
 " float diff=max(dot(n,key),0.0);",
 " float fill=.35+.18*max(dot(n,normalize(vec3(.7,.3,.8))),0.0);",
 " vec3 view=normalize(uCamera-vWorld);",
 " float rim=pow(1.0-max(dot(n,view),0.0),2.5);",
 " float spec=pow(max(dot(n,normalize(key+view)),0.0),42.0);",
 " vec3 lit=uColor*(fill+diff*.74+rim*.22)+uColor*uGlow+vec3(.64,.75,.85)*spec*.35;",
 " float fog=clamp((length(uCamera-vWorld)-12.0)/21.0,0.0,.56);",
 " lit=mix(lit,vec3(.045,.065,.11),fog);",
 " gl_FragColor=vec4(lit,1.0);","}"
].join("\n");

function buildMeshes(){
 const vertices=[],meshes={};
 function tri(a,b,c){
  const n=unit(cross(sub(b,a),sub(c,a)));
  for(const p of [a,b,c])vertices.push(...p,...n);
 }
 function quad(a,b,c,d){tri(a,b,c);tri(a,c,d);}
 function box(cx=0,cy=0,cz=0,x=1,y=1,z=1){
  const a=x/2,b=y/2,c=z/2,p=(i,j,k)=>[cx+i*a,cy+j*b,cz+k*c];
  quad(p(-1,1,-1),p(1,1,-1),p(1,1,1),p(-1,1,1));
  quad(p(-1,-1,1),p(1,-1,1),p(1,-1,-1),p(-1,-1,-1));
  quad(p(-1,-1,1),p(-1,1,1),p(1,1,1),p(1,-1,1));
  quad(p(1,-1,-1),p(1,1,-1),p(-1,1,-1),p(-1,-1,-1));
  quad(p(1,-1,1),p(1,1,1),p(1,1,-1),p(1,-1,-1));
  quad(p(-1,-1,-1),p(-1,1,-1),p(-1,1,1),p(-1,-1,1));
 }
 function lathe(profile,segments=16){
  for(let j=0;j<profile.length-1;j++){
   const [r1,y1]=profile[j],[r2,y2]=profile[j+1];
   for(let i=0;i<segments;i++){
    const a=i*2*Math.PI/segments,b=(i+1)*2*Math.PI/segments;
    quad([r1*Math.cos(a),y1,r1*Math.sin(a)],
     [r1*Math.cos(b),y1,r1*Math.sin(b)],
     [r2*Math.cos(b),y2,r2*Math.sin(b)],
     [r2*Math.cos(a),y2,r2*Math.sin(a)]);
   }
  }
 }
 function sphere(rings=8,segments=14){
  for(let y=0;y<rings;y++){
   const t1=-Math.PI/2+y*Math.PI/rings,t2=-Math.PI/2+(y+1)*Math.PI/rings;
   for(let j=0;j<segments;j++){
    const p1=j*2*Math.PI/segments,p2=(j+1)*2*Math.PI/segments;
    const v=(t,p)=>[Math.cos(t)*Math.cos(p)*.5,Math.sin(t)*.5,Math.cos(t)*Math.sin(p)*.5];
    quad(v(t1,p1),v(t1,p2),v(t2,p2),v(t2,p1));
   }
  }
 }
 const add=(name,draw)=>{
  const first=vertices.length/6;draw();
  meshes[name]={first,count:vertices.length/6-first};
 };
 add("cube",()=>box());
 add("sphere",()=>sphere());
 add("cylinder",()=>lathe([[.5,-.5],[.5,.5]]));
 add("cone",()=>lathe([[.52,-.5],[0,.5]]));
 add("ring",()=>lathe([[.52,-.11],[.56,-.04],[.56,.04],[.52,.11]],18));
 add("bulletTip",()=>lathe([[.32,-.5],[.32,.06],[0,.5]],12));
 // V3 supplies genuinely shaped, smooth-normal Staunton silhouettes and
 // curved rifle meshes. Merge into the same single GPU vertex buffer.
 for(const [name,data] of Object.entries(buildSculptMeshes())){
  const first=vertices.length/6;
  for(let i=0;i<data.length;i++)vertices.push(data[i]);
  meshes[name]={first,count:data.length/6};
 }
 return {mesh:meshes,data:new Float32Array(vertices)};
}
function makeShader(gl,type,source){
 const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
 if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
  const error=gl.getShaderInfoLog(shader);
  gl.deleteShader(shader);throw Error(error||"WebGL shader compilation failed");
 }
 return shader;
}
function createGraphics(gl){
 const vertex=makeShader(gl,gl.VERTEX_SHADER,vertexSource);
 const fragment=makeShader(gl,gl.FRAGMENT_SHADER,fragmentSource);
 const program=gl.createProgram();
 gl.attachShader(program,vertex);gl.attachShader(program,fragment);
 gl.linkProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))
  throw Error(gl.getProgramInfoLog(program)||"WebGL program link failed");
 gl.useProgram(program);
 const {mesh,data}=buildMeshes(),buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
 gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
 const pos=gl.getAttribLocation(program,"aPosition"),normal=gl.getAttribLocation(program,"aNormal");
 gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,3,gl.FLOAT,false,24,0);
 gl.enableVertexAttribArray(normal);gl.vertexAttribPointer(normal,3,gl.FLOAT,false,24,12);
 gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);
 const uniforms={model:gl.getUniformLocation(program,"uModel"),vp:gl.getUniformLocation(program,"uVP"),
  color:gl.getUniformLocation(program,"uColor"),glow:gl.getUniformLocation(program,"uGlow"),
  camera:gl.getUniformLocation(program,"uCamera")};
 function draw(name,m,tint,glow=0){
  const part=mesh[name];if(!part)return;
  gl.uniformMatrix4fv(uniforms.model,false,m);
  gl.uniform3fv(uniforms.color,tint);gl.uniform1f(uniforms.glow,glow);
  gl.drawArrays(gl.TRIANGLES,part.first,part.count);
 }
 return {draw,uniforms,dispose(){gl.deleteBuffer(buffer);gl.deleteProgram(program);}};
}
function drawWorld(gl,g,event,ms,width,height){
 const {draw,uniforms}=g,cam=cinematicCamera(event,ms);
 if(!cam)return;
 const focus=sniperMotion(ms).scopeZoom;
 const fov=(Math.PI/3.1)*(1-.22*focus);
 const projection=perspective(fov,width/height,.04,64);
 gl.uniformMatrix4fv(uniforms.vp,false,mm(projection,lookAt(cam.eye,cam.look)));
 gl.uniform3fv(uniforms.camera,cam.eye);
 gl.clearColor(.028,.043,.08,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 const d=(mesh,pos,sz,col,rot=[0,0,0],glow=0,parent=null)=>{
  const m=model(pos,sz,rot);draw(mesh,parent?mm(parent,m):m,col,glow);
 };
 // Board and pieces have genuine 3D positions. Following the bullet creates
 // real perspective, lighting and parallax across every rank and file.
 d("cube",[0,-.14,0],[8.65,.25,8.65],COLORS.board);
 for(let row=0;row<8;row++)for(let col=0;col<8;col++)
  d("cube",[col-3.5,.005,row-3.5],[.99,.045,.99],
   (row+col)%2?COLORS.tileDark:COLORS.tileLight);
 for(const edge of [-4.33,4.33]){
  d("cube",[0,.005,edge],[8.67,.1,.065],COLORS.gold);
  d("cube",[edge,.005,0],[.065,.1,8.67],COLORS.gold);
 }
 // Sculpted bishop and rifle, both separate 3D meshes with curved profiles.
 // Rig points down the actual diagonal. The mitre is recognizable in close-up.
 const rig=mm(translate(...cam.shooter),rotY(cam.yaw));
 const isWhite=event.attacker==="w",armor=isWhite?COLORS.white:COLORS.dark;
 const robe=isWhite?COLORS.violet:[.18,.18,.32];
 const gold=isWhite?COLORS.gold:[.7,.59,.92];
 const motion=sniperMotion(ms);
 const recoil=motion.recoil;
 // Rifle assembly recoils into the bishop, rebounds, then settles.
 const br=mm(rig,mm(translate(0,0,-recoil),
  rotX(-recoil*.16)));
 // Body is horizontal on the ground: ornate base at the rear; real bishop
 // head, miter groove and finial point toward the scoped rifle.
 d("sculptBishop",[-.28,.23,-.9],[.91,.91,.91],armor,[Math.PI/2,0,0],0,br);
 d("sculptBishopGilding",[-.28,.23,-.9],[.91,.91,.91],gold,[Math.PI/2,0,0],.08,br);
 // Sculpted jacket/cape flows under the figure instead of a featureless box.
 d("sphere",[-.30,.11,-.70],[1.12,.14,1.73],robe,[0,0,0],0,rig);
 // Weapon model has a shaped stock, pistol grip, curved barrel, a scope with
 // objective bell, eyepiece/lens, recoil pad, trigger and two folding legs.
 d("sculptRifleStock",[.25,.35,-.13],[.79,.75,.92],COLORS.gun,[0,-Math.PI/2,0],0,br);
 d("sculptRifleGrip",[.26,.22,-.12],[.67,.7,.62],COLORS.steel,[0,-Math.PI/2,0],0,br);
 d("sculptBarrel",[.25,.43,.90],[.84,.85,.84],COLORS.steel,[Math.PI/2,0,0],0,br);
 d("sculptBarrel",[.25,.43,.76],[.72,.72,.65],COLORS.gun,[Math.PI/2,0,0],0,br);
 d("sculptMuzzleBrake",[.25,.43,1.93],[.74,.77,.74],COLORS.steel,[Math.PI/2,0,0],0,br);
 d("sculptScope",[.25,.64,.28],[.75,.77,.78],COLORS.gun,[Math.PI/2,0,0],0,br);
 d("sphere",[.25,.64,.6],[.14,.14,.11],COLORS.lens,[0,0,0],.32,br);
 d("sphere",[.25,.64,-.1],[.11,.11,.08],COLORS.lens,[0,0,0],.28,br);
 d("cylinder",[.25,.61,.3],[.14,.12,.14],COLORS.steel,[0,0,0],0,br);
 d("cylinder",[.25,.51,.3],[.08,.26,.08],COLORS.gun,[0,0,0],0,br);
 d("cylinder",[.25,.2,1.11],[.07,.49,.07],COLORS.steel,[0,0,-.36],0,br);
 d("cylinder",[.25,.2,1.11],[.07,.49,.07],COLORS.steel,[0,0,.36],0,br);
 d("sphere",[.25,.42,1.96],[.07,.07,.07],COLORS.black,[0,0,0],0,br);
 if(ms>=1300&&ms<=3510){
  const fire=(ms-1300)/280,bulletPos=cam.bullet||cam.muzzle;
  const bulletRig=mm(translate(...bulletPos),rotY(cam.yaw));
  const recoil=ms<1580?Math.max(0,Math.sin(fire*Math.PI))*.04:0;
  d("cylinder",[0,0,-recoil],[.115,.33,.115],COLORS.bullet,[Math.PI/2,0,0],.28,bulletRig);
  d("bulletTip",[0,0,.24-recoil],[.15,.3,.15],COLORS.gold,[Math.PI/2,0,0],.5,bulletRig);
  // Volumetric tracer + luminous speed lines, attached to the ACTUAL bullet
  // trajectory. Draw fewer details when the Chromebook quality cap is active.
  const particleCount=g.compact?4:8;
  for(let n=1;n<=particleCount;n++){
   const off=.22+n*.23,fade=(particleCount+1-n)/particleCount;
   d("sphere",[0,0,-off],[.12*fade,.115*fade,.25+motion.bulletBoost*.13],
    n%2?COLORS.flash:COLORS.lens,[0,0,0],.5*fade,bulletRig);
   if(n<4)d("cylinder",[0,0,-off-.15],[.045*fade,.43,.045*fade],
    COLORS.gold,[Math.PI/2,0,0],.2,bulletRig);
  }
 }
 if(ms>=1320&&ms<1510){
  const k=clamp((ms-1320)/190),pulse=Math.pow(1-k,1.7);
  d("sphere",cam.muzzle,[1.05*pulse,.97*pulse,1.05*pulse],
   COLORS.flash,[0,0,0],2.5*pulse);
  d("cone",cam.muzzle,[.60*pulse,1.45*pulse,.60*pulse],
   COLORS.gold,[Math.PI/2,0,0],2.4*pulse);
  const count=g.compact?5:11;
  for(let i=0;i<count;i++){
   const a=i*2.39996,travel=(.4+k*1.9),speed=1-(i%3)*.12;
   d("sphere",[cam.muzzle[0]+Math.cos(a)*travel*speed,
    cam.muzzle[1]+Math.sin(a)*travel*.6,
    cam.muzzle[2]+Math.cos(a*.7)*travel*.4],
    [.04*pulse,.04*pulse,.11*pulse],COLORS.flash,[0,0,0],1.3*pulse);
  }
 }
 // An actual recognizable sculpt for the specific victim piece type,
 // NOT one generic cylinder with cuboids glued to its head.
 const hit=cam.hit,t=event.victim.toLowerCase();
 const victimColor=event.victim===event.victim.toUpperCase()?COLORS.white:COLORS.dark;
 const rimColor=event.victim===event.victim.toUpperCase()?COLORS.gold:[.65,.55,.83];
 const impact=ms>=3500?clamp((ms-3500)/900):0,shrink=1-smooth(impact)*.75;
 const meshByPiece={p:"sculptPawn",r:"sculptRook",n:"sculptKnight",
  b:"sculptBishop",q:"sculptQueen",k:"sculptKing"};
 if(ms<4230){
  const warp=ms>=3500?Math.sin(impact*Math.PI*2)*.12:0;
  const targetModel=mm(translate(hit[0],-.01+warp,hit[2]),scale(.92*shrink,.92*shrink,.92*shrink));
  d(meshByPiece[t]||"sculptPawn",[0,0,0],[1,1,1],victimColor,[0,0,0],0,targetModel);
  d("ring",[0,.12,0],[.81,.16,.81],rimColor,[0,0,0],.04,targetModel);
  if(t==="b"){
   d("sculptBishopGilding",[0,0,0],[1,1,1],rimColor,[0,0,0],0.08,targetModel);
  }else if(t==="n"){
   d("sculptKnightMane",[0,0,0],[1,1,1],rimColor,[0,0,0],0,targetModel);
   d("sphere",[.31,1.29,.23],[.11,.11,.11],COLORS.black,[0,0,0],0,targetModel);
   d("sphere",[.31,1.29,-.23],[.11,.11,.11],COLORS.black,[0,0,0],0,targetModel);
  }else if(t==="q"){
   for(let n=0;n<8;n++){
    const a=n*Math.PI/4;
    d("sphere",[Math.cos(a)*.36,1.44,Math.sin(a)*.36],
     [.20,.20,.20],rimColor,[0,0,0],.06,targetModel);
   }
   d("sphere",[0,1.5,0],[.20,.20,.20],rimColor,[0,0,0],.06,targetModel);
  }else if(t==="k"){
   d("cube",[0,1.76,0],[.16,.54,.16],rimColor,[0,0,0],.07,targetModel);
   d("cube",[0,1.83,0],[.52,.15,.18],rimColor,[0,0,0],.07,targetModel);
  }
 }
 if(ms>=3500&&ms<4300){
  const age=clamp((ms-3500)/780);
  d("sphere",[hit[0],.8,hit[2]],[.58*(1-age),.58*(1-age),.58*(1-age)],
   COLORS.flash,[0,0,0],1.5*(1-age));
  // Two growing shockwave rings in physical 3D space, plus tumbling stone
  // fragments and glowing sparks. All trajectories deterministic by event time.
  const wave=motion.shockwave;
  if(ms<4130){
   d("ring",[hit[0],.21,hit[2]],[.7+wave*2.7,.06,.7+wave*2.7],
    COLORS.gold,[0,0,0],1.1*(1-wave));
   d("ring",[hit[0],.44,hit[2]],[.35+wave*1.95,.06,.35+wave*1.95],
    COLORS.lens,[0,0,0],.6*(1-wave));
  }
  const count=g.compact?18:38;
  for(let i=0;i<count;i++){
   const a=i*2.39996,b=((i*7)%count)/count,spread=.3+age*2.8;
   const speed=.7+(i%5)*.13;
   const pos=[hit[0]+Math.cos(a)*spread*speed,
    .73+Math.sin(b*Math.PI)*spread*.64-age*.46,
    hit[2]+Math.sin(a)*spread*speed];
   const size=(1-age)*(.055+(i%4)*.029);
   if(i%3===0){
    d("sphere",pos,[size*.8,size*.8,size*2],COLORS.flash,
     [age*3,age*4,age*5],.55*(1-age));
   }else{
    d("cube",pos,[size,size*2,size],
     i%2?rimColor:victimColor,[age*3,age*4,age*6],.13*(1-age));
   }
  }
 }
}

export function createSniper3D(canvas,{onPhase=()=>{},onFinish=()=>{}}={}){
 if(!canvas||typeof canvas.getContext!=="function")return null;
 const chromeOS=typeof navigator!=="undefined"&&/CrOS|Chrome OS|Chromebook/i.test(navigator.userAgent||"");
 let gl;
 try{
  gl=canvas.getContext("webgl",{alpha:false,antialias:!chromeOS,depth:true,
   powerPreference:chromeOS?"low-power":"default",preserveDrawingBuffer:false});
 }catch{return null;}
 if(!gl)return null;
 let graphics;
 try{graphics=createGraphics(gl);graphics.compact=chromeOS;}
 catch(error){console.warn("Bishop Sniper 3D GPU initialization failed",error);return null;}
 let frame=0,playing=false,started=0,lastFrame=0,phaseName="",event=null;
 const maxFps=chromeOS?25:45,frameInterval=1000/maxFps;
 function tick(timestamp){
  if(!playing)return;
  const elapsed=Math.max(0,timestamp-started),phase=shotPhase(elapsed);
  if(phaseName!==phase.name){phaseName=phase.name;onPhase(phase);}
  const pixelRatio=Math.min(chromeOS?.95:1.25,window.devicePixelRatio||1);
  const w=Math.max(1,Math.round(canvas.clientWidth*pixelRatio));
  const h=Math.max(1,Math.round(canvas.clientHeight*pixelRatio));
  if(canvas.width!==w||canvas.height!==h){
   canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);
  }
  if(timestamp-lastFrame>=frameInterval||!lastFrame){
   lastFrame=timestamp;
   try{drawWorld(gl,graphics,event,elapsed,w,h);}
   catch(error){
    console.warn("Bishop Sniper 3D render interrupted",error);
    stop();onFinish();return;
   }
  }
  if(elapsed>=SNIPER_3D_DURATION){
   stop();onFinish();return;
  }
  frame=requestAnimationFrame(tick);
 }
 function stop(){
  playing=false;
  if(frame){cancelAnimationFrame(frame);frame=0;}
 }
 function play(next){
  if(!sniperPath(next))return false;
  stop();event=next;phaseName="";started=performance.now();lastFrame=0;playing=true;
  frame=requestAnimationFrame(tick);
  return true;
 }
 function dispose(){stop();graphics.dispose();}
 canvas.addEventListener("webglcontextlost",e=>{
  e.preventDefault();stop();onFinish();
 },{once:true});
 return {play,stop,dispose,supported:true};
}


// Shared WebGL sculpt/lighting pipeline for confirmed captures, check,
// rescue and match endings. No chess state or countdown is changed here.
// The same sculpt mesh is used for both colors: only material tint changes.
const COMBAT_SCULPT={p:"sculptPawn",n:"sculptKnight",b:"sculptBishop",
 r:"sculptRook",q:"sculptQueen",k:"sculptKing"};
export const combatPosition=index=>
 Number.isInteger(index)&&index>=0&&index<128&&!(index&0x88)
 ?[(index&7)-3.5,0,(index>>4)-3.5]:null;
export const combatBlend=(ms,duration)=>{
 const t=clamp(ms/Math.max(1,duration));
 return {progress:t,charge:smooth((t-.12)/.37),
  impact:smooth((t-.44)/.11),
  dissolve:smooth((t-.59)/.27),
  exit:smooth((t-.75)/.25)};
};
function drawCombatWorld(gl,g,cue,ms,duration,w,h){
 const {draw,uniforms}=g;
 const kind=cue.kind,animation=combatBlend(ms,duration);
 const {progress:t,charge,impact,dissolve,exit}=animation;
 const origin=combatPosition(cue.from),target=combatPosition(cue.to);
 const king=combatPosition(cue.kingSquare);
 const focus=(kind==="capture"?target:king)||[0,0,0];
 const activeFocus=kind==="capture"&&origin?
  lerp3(origin,focus,smooth((t-.06)/.44)):focus;
 const orbit=-.68+t*.48;
 const distance=kind==="finish"?5.6-1.8*smooth(t):6.8-1.25*charge;
 const eye=[activeFocus[0]+Math.sin(orbit)*distance,
  kind==="finish"?4.1-1.2*smooth(t):4.3+.4*Math.sin(t*Math.PI),
  activeFocus[2]+Math.cos(orbit)*distance];
 const projection=perspective(Math.PI/3.3,w/h,.045,75);
 gl.uniformMatrix4fv(uniforms.vp,false,mm(projection,lookAt(eye,
  [activeFocus[0],.75,activeFocus[2]])));
 gl.uniform3fv(uniforms.camera,eye);
 gl.clearColor(.029,.041,.067,1);
 gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 const d=(mesh,pos,sz,col,rot=[0,0,0],glow=0,parent=null)=>{
  const m=model(pos,sz,rot);draw(mesh,parent?mm(parent,m):m,col,glow);
 };
 // Ground, raised chess tiles, and border are genuine depth-tested geometry.
 d("cube",[0,-.20,0],[8.7,.35,8.7],[.07,.10,.17]);
 for(let row=0;row<8;row++)for(let col=0;col<8;col++)
  d("cube",[col-3.5,0,row-3.5],[.99,.07,.99],
   (row+col)%2?[.17,.27,.36]:[.40,.56,.65]);
 for(const edge of [-4.34,4.34]){
  d("cube",[0,.025,edge],[8.73,.13,.055],[.7,.53,.29]);
  d("cube",[edge,.025,0],[.055,.13,8.73],[.7,.53,.29]);
 }
 const tint=p=>p===p?.toUpperCase()?[.96,.91,.82]:[.09,.12,.18];
 const trim=p=>p===p?.toUpperCase()?[1,.78,.40]:[.68,.57,.82];
 function piece(p,pos,{shrink=1,angle=0,drop=0,glow=0}={}){
  if(!COMBAT_SCULPT[p?.toLowerCase()]||!pos||shrink<=.015)return;
  const parent=mm(translate(pos[0],drop+.045,pos[2]),
   mm(rotZ(angle),scale(.94*shrink,.94*shrink,.94*shrink)));
  d(COMBAT_SCULPT[p.toLowerCase()],[0,0,0],[1,1,1],tint(p),[0,0,0],glow,parent);
  if(p.toLowerCase()==="b")d("sculptBishopGilding",[0,0,0],[1,1,1],trim(p),[0,0,0],glow,parent);
  if(p.toLowerCase()==="n")d("sculptKnightMane",[0,0,0],[1,1,1],trim(p),[0,0,0],glow,parent);
 }
 if(kind==="capture"&&origin&&target){
  // The attacking piece is driven through the source/destination squares.
  const travel=lerp3(origin,target,charge);
  piece(cue.attacker,travel,{drop:.16*Math.sin(charge*Math.PI),glow:.1+impact*.15});
  // The victim crumples and gradually sinks/fades behind the impact.
  piece(cue.victim,target,{shrink:1-.98*dissolve,angle:1.2*dissolve,
   drop:-.54*dissolve,glow:impact*(1-dissolve)*.55});
  const pulse=impact*(1-exit);
  if(pulse>.005){
   d("ring",[target[0],.14,target[2]],[.55+pulse*1.65,.055,.55+pulse*1.65],
    [1,.55,.30],[0,0,0],.65*pulse);
   d("sphere",[target[0],.9,target[2]],[.20*pulse,.20*pulse,.20*pulse],
    [1,.81,.58],[0,0,0],pulse);
  }
 }else{
  const endangered=cue.kingPiece||"k";
  if(king){
   const isFinal=kind==="finish";
   const fall=isFinal?smooth((t-.40)/.45):0;
   piece(endangered,king,{shrink:1-.1*fall,angle:fall*1.3,
    drop:-fall*.75,glow:kind==="escape"?.16:.20+Math.sin(t*18)*.08});
   const ringScale=1+Math.sin(t*12)*.14+(kind==="finish"?fall*.55:0);
   const ringColor=kind==="escape"?[.25,1,.68]:[1,.26,.33];
   d("ring",[king[0],.12,king[2]],[.78*ringScale,.12,.78*ringScale],
    ringColor,[0,0,0],.16+Math.sin(t*18)*.08);
   if(isFinal&&fall>.1){
    d("ring",[king[0],.08,king[2]],[.9+fall*1.15,.07,.9+fall*1.15],
     [.96,.71,.36],[0,0,0],fall*.4);
   }
  }
 }
}
// Same frame-throttling and GPU cleanup as Bishop Sniper. The canvas
// only renders while a confirmed cue is on-screen.
export function createCombat3D(canvas,onUnavailable=()=>{}){
 if(!canvas||typeof canvas.getContext!=="function")return null;
 const chromeOS=typeof navigator!=="undefined"&&/CrOS|Chrome OS|Chromebook/i.test(navigator.userAgent||"");
 let gl;
 try{gl=canvas.getContext("webgl",{alpha:false,antialias:!chromeOS,
  depth:true,powerPreference:chromeOS?"low-power":"default"});}catch{return null;}
 if(!gl)return null;
 let graphics;
 try{graphics=createGraphics(gl);}catch(error){
  console.warn("Combat 3D initialization failed",error);return null;
 }
 let request=0,active=false,started=0,lastDraw=-Infinity,event=null,duration=0;
 const interval=1000/(chromeOS?22:35);
 function stop(){
  active=false;canvas.style.opacity="0";
  if(request){cancelAnimationFrame(request);request=0;}
 }
 function tick(now){
  if(!active)return;
  const elapsed=Math.min(duration,Math.max(0,now-started));
  if(now-lastDraw>=interval||elapsed===duration){
   lastDraw=now;
   const ratio=Math.min(chromeOS?1:1.35,window.devicePixelRatio||1);
   const w=Math.max(1,Math.round(canvas.clientWidth*ratio));
   const h=Math.max(1,Math.round(canvas.clientHeight*ratio));
   if(canvas.width!==w||canvas.height!==h){
    canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);
   }
   try{drawCombatWorld(gl,graphics,event,elapsed,duration,w,h);canvas.style.opacity="1";}
   catch(error){console.warn("Combat 3D render interrupted",error);
    stop();onUnavailable();return;}
  }
  if(elapsed<duration)request=requestAnimationFrame(tick);
  else stop();
 }
 function play(cue,ms){
  if(!cue||!["capture","check","rescue","escape","finish"].includes(cue.kind)||
   (cue.kind==="capture"&&(!combatPosition(cue.from)||!combatPosition(cue.to)))||
   (cue.kind!=="capture"&&!combatPosition(cue.kingSquare)))return false;
  stop();event=cue;duration=Math.max(1,ms);lastDraw=-Infinity;
  started=performance.now();active=true;request=requestAnimationFrame(tick);
  return true;
 }
 canvas.addEventListener("webglcontextlost",e=>{
  e.preventDefault();stop();onUnavailable();
 },{once:true});
 return {play,stop,dispose(){stop();graphics.dispose();},supported:true};
}
