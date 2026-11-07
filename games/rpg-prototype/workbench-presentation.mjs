// W21.00 — Presentation-only workbench summaries. Crafting authority remains
// with workshop-junk.mjs and weapon-mods.mjs; no UI preview spends resources.
export const BENCH_PART_FILTERS=Object.freeze(['all','ready','owned','missing']);

export function benchPartStatus({owned=false,installed=false,recipeOk=false}={}){
  if(installed)return 'installed';
  if(owned)return 'owned';
  return recipeOk?'craftable':'missing';
}

export function benchPartMatches(status,filter='all'){
  if(filter==='all')return true;
  if(filter==='ready')return status==='craftable';
  if(filter==='owned')return status==='owned'||status==='installed';
  if(filter==='missing')return status==='missing';
  return false;
}

function safeCount(value){
  return Number.isSafeInteger(value)&&value>0?value:0;
}

export function benchMaterialRows(recipe={},carried={},stored={},recovered={}){
  return Object.entries(recipe).filter(([,required])=>safeCount(required)>0)
    .map(([id,required])=>{
      const pouch=safeCount(carried[id]),workshop=safeCount(stored[id]);
      const fromJunk=safeCount(recovered[id]);
      const available=pouch+workshop+fromJunk;
      return {id,required,carried:pouch,stored:workshop,recovered:fromJunk,
        available,missing:Math.max(0,required-available),
        filled:Math.min(100,Math.round(100*available/required))};
    });
}

// Some stats are better when they decrease (recoil, reload time, spread).
export function benchStatChange(before,after,higherIsBetter=true){
  if(!Number.isFinite(before)||!Number.isFinite(after))return 'same';
  if(Math.abs(before-after)<.0005)return 'same';
  return (after>before)===higherIsBetter?'better':'worse';
}
