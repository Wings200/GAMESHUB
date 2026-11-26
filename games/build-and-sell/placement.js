
export const studLayouts={
 frame:[[-.95,.10],[-.47,.085],[0,.085],[.47,.085],[.95,.10]],
 door:[[-.95,.10],[-.48,.10],[.48,.10],[.95,.10]],
 window:[[-.95,.10],[-.64,.09],[.64,.09],[.95,.10]]
};
export function studMount(type,fixture,u,hitSide=0,face=1){
 const studs=studLayouts[type]||studLayouts.frame;
 if(fixture==="breaker"){
 const candidates=[];for(let i=0;i<studs.length-1;i++){const [x,w]=studs[i],[y,v]=studs[i+1];const l=x+w/2,r=y-v/2;if(r-l>=.43*.82+.004)candidates.push({u:(l+r)/2,stud:x,edge:1,scaleX:.82});}
 if(type==="door"||type==="window")return null;
 return candidates.sort((a,b)=>Math.abs(a.u-u)-Math.abs(b.u-u))[0]||null;
 }
 if(type==="door"||type==="window")return null;
 const c=[];for(const [x,w] of studs){
 if(fixture==="three"){
 const left=x-w/2-.095/2,right=x+w/2+.095/2;
 if(left-.059>=-1&&right+.059<=1&&studs.every(([sx,sw])=>sx===x||Math.abs(left-sx)>=.095/2+sw/2&&Math.abs(right-sx)>=.095/2+sw/2))c.push({u:x,stud:x,edge:0,scaleX:1});continue;
 }
 for(const edge of [-1,1]){const at=x+edge*(w/2+.095/2+.002);if(at-.059<-1||at+.059>1)continue;if(studs.some(([sx,sw])=>sx!==x&&Math.abs(at-sx)<.095/2+sw/2+.002))continue;c.push({u:at,stud:x,edge,scaleX:1});}
 }
 if(!c.length)return null;
 const nearest=studs.reduce((a,b)=>Math.abs(b[0]-u)<Math.abs(a[0]-u)?b:a);
 const desired=hitSide||Math.sign(u-nearest[0])||face;
 const same=c.filter(v=>v.stud===nearest[0]&&(v.edge===desired||v.edge===0));
 return (same.length?same:c).sort((a,b)=>Math.abs(a.u-u)-Math.abs(b.u-u))[0];
}
export function floorOffset(dx,dz,bounds,snap){
 const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
 if(bounds.maxX-bounds.minX>2||bounds.maxZ-bounds.minZ>2)return null;
 return {x:clamp(snap?0:dx,-1-bounds.minX,1-bounds.maxX),z:clamp(snap?0:dz,-1-bounds.minZ,1-bounds.maxZ)};
}
export function faceSide(axis,center,hit,camera,normal){
 const axisValue=axis==="z"?"x":"z";
 if(normal&&Math.abs(normal[axisValue])>.75)return Math.sign(normal[axisValue])||1;
 const delta=hit?hit[axisValue]-center[axisValue]:0;
 return Math.abs(delta)>.025?Math.sign(delta):Math.sign(camera[axisValue]-center[axisValue])||1;
}
