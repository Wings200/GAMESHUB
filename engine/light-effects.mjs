// Scene-independent lighting curves and shadow budgets for GAMESHUB.
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
export const LIGHTING_PROFILES=Object.freeze({
  performance:Object.freeze({maxShadowLights:0,shadowSize:0}),
  balanced:Object.freeze({maxShadowLights:2,shadowSize:512}),
  quality:Object.freeze({maxShadowLights:4,shadowSize:1024})
});
export function normalizeLightEffect(effect){
  if(effect===undefined||effect===null)return {type:'steady',frequency:1,amount:0,seed:0};
  if(typeof effect!=='object'||Array.isArray(effect))throw new TypeError('Light effect must be an object');
  const type=effect.type??'steady';
  if(!['steady','pulse','flicker'].includes(type))throw new TypeError('Unknown light effect: '+type);
  const frequency=effect.frequency??1,amount=effect.amount??.3,seed=effect.seed??0;
  if(!finite(frequency)||frequency<.05||frequency>12)
    throw new TypeError('Light effect frequency must be .05–12 Hz');
  if(!finite(amount)||amount<0||amount>1)
    throw new TypeError('Light effect amount must be 0–1');
  if(!Number.isSafeInteger(seed)||seed<0||seed>1000000)
    throw new TypeError('Light effect seed must be an integer 0–1000000');
  return {type,frequency,amount: type==='steady'?0:amount,seed};
}
function hash(number,seed){
  let n=Math.imul(number+seed*13+17,374761393);
  n=Math.imul(n^(n>>>13),1274126177);
  return ((n^(n>>>16))>>>0)/4294967295;
}
export function lightEffectFactor(input,timeSeconds){
  const {type,frequency,amount,seed}=normalizeLightEffect(input);
  if(!finite(timeSeconds))throw new TypeError('Light effect time must be finite');
  if(type==='steady')return 1;
  const time=Math.max(0,timeSeconds),phase=time*frequency;
  if(type==='pulse')
    return clamp(1-amount*.5+Math.sin(phase*Math.PI*2)*amount*.5,0,1);
  const index=Math.floor(phase);
  const t=phase-index,smooth=t*t*(3-2*t);
  const random=hash(index,seed)*(1-smooth)+hash(index+1,seed)*smooth;
  return clamp(1-amount*random,0,1);
}
export function shadowBudget(profile='balanced'){
  const config=LIGHTING_PROFILES[profile];
  if(!config)throw new TypeError('Unknown lighting profile: '+String(profile));
  return config;
}
