
export const LOOK_KEYS=["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"];
export function actionButton(code){return code==="KeyZ"?0:code==="KeyX"?2:null;}
export function keyboardLook(p,keys,dt,sensitivity=1){
 const d=Math.max(0,Math.min(.05,dt))*sensitivity;
 p.yaw+=((keys.has("ArrowLeft")?1:0)-(keys.has("ArrowRight")?1:0))*1.85*d;
 p.pitch=Math.max(-1.44,Math.min(1.44,p.pitch+((keys.has("ArrowUp")?1:0)-(keys.has("ArrowDown")?1:0))*1.45*d));
}
export function controlText(s,keyboard){return !keyboard?s:String(s).replace(/\bLMB\b/g,"Z").replace(/\bRMB\b/g,"X").replace(/left[- ]click/gi,"Z").replace(/right[- ]click/gi,"X");}
