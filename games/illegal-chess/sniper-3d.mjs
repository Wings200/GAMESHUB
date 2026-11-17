// Illegal Chess · Bishop Sniper cinematic V2
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
  eye=at(shooter,-1.95+.48*push,1.24-.16*push,1.02);
  look=at(shooter,.47+.2*push,.12,.43);
  if(phase==="fire"){
   const k=(ms-1300)/280;
   eye=at(eye,-.08*Math.sin(k*Math.PI),0,.016*Math.sin(k*40));
  }
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
 white:[.95,.91,.84],dark:[.22,.31,.42],gold:[1,.73,.29],
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
 " float fill=.26+.17*max(dot(n,normalize(vec3(.7,.3,.8))),0.0);",
 " float rim=pow(1.0-max(dot(n,normalize(uCamera-vWorld)),0.0),2.5);",
 " vec3 lit=uColor*(fill+diff*.74+rim*.25)+uColor*uGlow;",
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
 add("bishop",()=>lathe([[.33,-.7],[.39,-.58],[.32,-.49],[.24,-.43],
  [.16,-.2],[.2,.18],[.22,.37],[.32,.62],[.23,.73],[.06,.84],[0,.88]],18));
 add("chess",()=>lathe([[.4,0],[.43,.1],[.28,.18],[.25,.26],
  [.19,.42],[.25,.82],[.21,1.12],[.13,1.25],[0,1.3]],18));
 add("ring",()=>lathe([[.52,-.11],[.56,-.04],[.56,.04],[.52,.11]],18));
 add("bulletTip",()=>lathe([[.32,-.5],[.32,.06],[0,.5]],12));
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
 const projection=perspective(Math.PI/3.1,width/height,.04,64);
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
 // Low-poly chess bishop lying prone with a long scoped 3D rifle.
 const rig=mm(translate(...cam.shooter),rotY(cam.yaw));
 const isWhite=event.attacker==="w",armor=isWhite?COLORS.white:COLORS.dark;
 const robe=isWhite?COLORS.violet:[.18,.18,.32];
 d("bishop",[-.25,.3,-.16],[.88,.95,.92],armor,[Math.PI/2,0,0],0,rig);
 d("ring",[-.25,.31,-.64],[.82,.7,.72],COLORS.gold,[Math.PI/2,0,0],0,rig);
 d("sphere",[-.25,.35,.59],[.48,.46,.5],armor,[0,0,0],0,rig);
 d("cone",[-.25,.46,.62],[.25,.54,.25],COLORS.gold,[Math.PI/2,0,0],0,rig);
 d("sphere",[-.08,.47,.74],[.1,.1,.13],COLORS.lens,[0,0,0],.25,rig);
 d("cube",[-.2,.12,-.32],[.68,.12,1.35],robe,[0,0,0],0,rig);
 d("cube",[.25,.27,-.15],[.38,.25,.82],COLORS.gun,[0,0,0],0,rig);
 d("cube",[.25,.33,.34],[.18,.25,.65],COLORS.steel,[0,0,0],0,rig);
 d("cylinder",[.25,.41,.99],[.115,2.3,.115],COLORS.gun,[Math.PI/2,0,0],0,rig);
 d("cylinder",[.25,.41,1.93],[.065,.46,.065],COLORS.steel,[Math.PI/2,0,0],0,rig);
 d("cylinder",[.25,.57,.29],[.15,.61,.15],COLORS.gun,[Math.PI/2,0,0],0,rig);
 d("cylinder",[.25,.57,.58],[.13,.06,.13],COLORS.lens,[Math.PI/2,0,0],.2,rig);
 d("cube",[.25,.47,.3],[.1,.22,.11],COLORS.steel,[0,0,0],0,rig);
 d("cube",[.25,.14,.7],[.085,.34,.075],COLORS.steel,[.25,0,.4],0,rig);
 d("cube",[.25,.14,1.22],[.085,.35,.075],COLORS.steel,[.32,0,-.35],0,rig);
 if(ms>=1300&&ms<=3510){
  const fire=(ms-1300)/280,bulletPos=cam.bullet||cam.muzzle;
  const bulletRig=mm(translate(...bulletPos),rotY(cam.yaw));
  const recoil=ms<1580?Math.max(0,Math.sin(fire*Math.PI))*.04:0;
  d("cylinder",[0,0,-recoil],[.115,.33,.115],COLORS.bullet,[Math.PI/2,0,0],.28,bulletRig);
  d("bulletTip",[0,0,.24-recoil],[.15,.3,.15],COLORS.gold,[Math.PI/2,0,0],.5,bulletRig);
  for(let n=1;n<=4;n++){
   const off=.24+n*.21;
   d("sphere",[0,0,-off],[.14/n,.12/n,.23],COLORS.flash,[0,0,0],.8/n,bulletRig);
  }
 }
 if(ms>=1310&&ms<1470){
  const pulse=Math.sin(((ms-1310)/160)*Math.PI);
  d("sphere",cam.muzzle,[.72*pulse,.72*pulse,.72*pulse],COLORS.flash,[0,0,0],2);
  d("cone",cam.muzzle,[.45*pulse,.98*pulse,.45*pulse],COLORS.gold,[Math.PI/2,0,0],2);
 }
 // Actual captured chess piece TYPE rendered as a 3D body at its square.
 const hit=cam.hit,t=event.victim.toLowerCase();
 const victimColor=event.victim===event.victim.toUpperCase()?COLORS.white:COLORS.dark;
 const impact=ms>=3500?clamp((ms-3500)/900):0,shrink=1-smooth(impact)*.75;
 if(ms<4230){
  const warp=ms>=3500?Math.sin(impact*Math.PI*2)*.12:0;
  d("chess",[hit[0],-.01+warp,hit[2]],[.85*shrink,1.03*shrink,.85*shrink],victimColor);
  if(t==="p"||t==="q"||t==="k"){
   d("sphere",[hit[0],1.34*shrink,hit[2]],[.44*shrink,.44*shrink,.44*shrink],victimColor);
  }else if(t==="n"){
   d("cube",[hit[0],1.36*shrink,hit[2]+.13],[.43*shrink,.46*shrink,.64*shrink],victimColor,[.25,0,-.24]);
  }else if(t==="b"){
   d("cone",[hit[0],1.4*shrink,hit[2]],[.52*shrink,.73*shrink,.52*shrink],victimColor);
  }else if(t==="r"){
   d("cube",[hit[0],1.48*shrink,hit[2]],[.62*shrink,.35*shrink,.62*shrink],victimColor);
  }
  if(t==="q"||t==="k"){
   for(let n=0;n<5;n++){const a=n*Math.PI*2/5;
    d("cone",[hit[0]+Math.cos(a)*.22*shrink,1.55*shrink,hit[2]+Math.sin(a)*.22*shrink],
     [.17*shrink,.39*shrink,.17*shrink],COLORS.gold);
   }
  }
 }
 if(ms>=3500&&ms<4300){
  const age=clamp((ms-3500)/780);
  d("sphere",[hit[0],.8,hit[2]],[.58*(1-age),.58*(1-age),.58*(1-age)],
   COLORS.flash,[0,0,0],1.5*(1-age));
  for(let i=0;i<24;i++){
   const a=i*2.39996,b=((i*7)%24)/24,spread=.35+age*2.4;
   const pos=[hit[0]+Math.cos(a)*spread,.73+Math.sin(b*Math.PI)*spread*.6-age*.5,
    hit[2]+Math.sin(a)*spread],size=(1-age)*(.08+(i%4)*.025);
   d("cube",pos,[size,size*2,size],i%3?COLORS.gold:COLORS.violet,
    [age*2,age*3,age*4],.2);
  }
 }
}
