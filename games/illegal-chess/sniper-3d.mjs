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
