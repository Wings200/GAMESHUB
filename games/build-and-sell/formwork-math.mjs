
export const FORM_TOP=.02,FORM_BOTTOM=-.35,FORM_REACH=5.5;
export const SIDE_NAMES=["North","East","South","West"];
export function formEdges(r){if(!r)return [];return [
 {id:0,ax:r.x1,az:r.z1,bx:r.x2,bz:r.z1,nx:0,nz:-1},
 {id:1,ax:r.x2,az:r.z1,bx:r.x2,bz:r.z2,nx:1,nz:0},
 {id:2,ax:r.x2,az:r.z2,bx:r.x1,bz:r.z2,nx:0,nz:1},
 {id:3,ax:r.x1,az:r.z2,bx:r.x1,bz:r.z1,nx:-1,nz:0}
 ].map(e=>({...e,length:Math.hypot(e.bx-e.ax,e.bz-e.az)}));}
export function edgeDistance(e,p){if(!e||!p||!Number.isFinite(p.x)||!Number.isFinite(p.z))return Infinity;const dx=e.bx-e.ax,dz=e.bz-e.az,t=Math.max(0,Math.min(1,((p.x-e.ax)*dx+(p.z-e.az)*dz)/(dx*dx+dz*dz)));return Math.hypot(p.x-e.ax-t*dx,p.z-e.az-t*dz);}
export function pickFormEdge(r,point,player){if(!point||!r)return null;let best=null,dist=1.25;for(const e of formEdges(r)){const d=edgeDistance(e,point);if(d<=dist&&edgeDistance(e,player)<=FORM_REACH){best=e;dist=d;}}return best;}
export function formReady(r,compacted){return !!r&&compacted.size===Math.ceil(r.x2-r.x1-1e-8)*Math.ceil(r.z2-r.z1-1e-8);}
export function readForms(w,r){return {forms:r&&Array.isArray(w?.forms)?[...new Set(w.forms.filter(id=>Number.isInteger(id)&&id>=0&&id<4))].sort():[],formRevision:Number.isSafeInteger(w?.formRevision)&&w.formRevision>=0?w.formRevision:0,lastForm:w?.lastForm&&typeof w.lastForm.actor==="string"&&Number.isInteger(w.lastForm.side)&&w.lastForm.side>=0&&w.lastForm.side<4?{actor:w.lastForm.actor,side:w.lastForm.side,install:w.lastForm.install===true}:null};}
export function changeForm(r,forms,side,install,player,compacted){if(!Number.isInteger(side)||side<0||side>3||typeof install!=="boolean"||!r)return null;const e=formEdges(r)[side];if(edgeDistance(e,player)>FORM_REACH)return null;const set=new Set(forms);if(install){if(!formReady(r,compacted)||set.has(side))return null;set.add(side);}else{if(!set.has(side))return null;set.delete(side);}return [...set].sort();}
