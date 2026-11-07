// W20.97: Settlement workshop stash and transactional automatic junk breakdown.
// The stash is never counted as carried mass and cannot be spent by remote trades.
import {JUNK_ITEMS,JUNK_BY_ID,junkYield} from './junk.mjs';
import {CRAFTING_COMPONENTS,COMPONENT_BY_ID} from './materials.mjs';
import {getItem,addItem,removeItem,countItem} from './inventory.mjs';

const MAX_JUNK=10000,MAX_MATERIAL=999999;
const copy=x=>JSON.parse(JSON.stringify(x));
const count=x=>Number.isSafeInteger(x)&&x>=0?x:0;
export function safeWorkshopJunk(raw){
  const safe={};let room=MAX_JUNK;
  for(const item of JUNK_ITEMS){
    const n=count(raw?.[item.id]);
    if(n&&room){safe[item.id]=Math.min(room,n);room-=safe[item.id];}
  }
  return safe;
}
export function safeWorkshopMaterials(raw){
  const safe={};
  for(const item of CRAFTING_COMPONENTS){
    const n=count(raw?.[item.id]);
    if(n)safe[item.id]=Math.min(MAX_MATERIAL,n);
  }
  return safe;
}
export function workshopJunkTotal(state){
  return Object.values(safeWorkshopJunk(state?.workshopJunk))
    .reduce((sum,n)=>sum+n,0);
}
export function storeWorkshopJunk(pack,state,uid,quantity=1){
  const source=pack?.items?.find(entry=>entry.uid===uid);
  if(!source||!JUNK_BY_ID[source.itemId])return {ok:false,reason:'not-junk'};
  if(!Number.isSafeInteger(quantity)||quantity<1||quantity>source.quantity)
    return {ok:false,reason:'quantity'};
  if(workshopJunkTotal(state)+quantity>MAX_JUNK)return {ok:false,reason:'storage-full'};
  const removed=removeItem(pack,uid,quantity);
  if(removed.removed!==quantity)return {ok:false,reason:'transfer-failed'};
  state.workshopJunk??={};
  state.workshopJunk[source.itemId]=(state.workshopJunk[source.itemId]||0)+quantity;
  return {ok:true,itemId:source.itemId,quantity};
}
export function takeWorkshopJunk(pack,state,itemId,quantity=1){
  if(!JUNK_BY_ID[itemId])return {ok:false,reason:'not-junk'};
  if(!Number.isSafeInteger(quantity)||quantity<1||quantity>count(state?.workshopJunk?.[itemId]))
    return {ok:false,reason:'quantity'};
  const preview=copy(pack),added=addItem(preview,itemId,quantity);
  if(added.added!==quantity)return {ok:false,reason:'inventory-full'};
  Object.assign(pack,preview);
  state.workshopJunk[itemId]-=quantity;
  if(!state.workshopJunk[itemId])delete state.workshopJunk[itemId];
  return {ok:true,itemId,quantity};
}
export function scrapWorkshopJunk(state,itemId,quantity=1){
  if(!JUNK_BY_ID[itemId])return {ok:false,reason:'not-junk'};
  if(!Number.isSafeInteger(quantity)||quantity<1||quantity>count(state?.workshopJunk?.[itemId]))
    return {ok:false,reason:'quantity'};
  const yields=junkYield(itemId,quantity);
  if(Object.entries(yields).some(([id,n])=>
    count(state?.workshopMaterials?.[id])+n>MAX_MATERIAL))
    return {ok:false,reason:'storage-full'};
  state.workshopJunk[itemId]-=quantity;
  if(!state.workshopJunk[itemId])delete state.workshopJunk[itemId];
  state.workshopMaterials??={};
  for(const [id,n] of Object.entries(yields))
    state.workshopMaterials[id]=(state.workshopMaterials[id]||0)+n;
  return {ok:true,itemId,quantity,materials:yields};
}
export function takeWorkshopMaterial(pack,state,itemId,quantity=1){
  if(!COMPONENT_BY_ID[itemId])return {ok:false,reason:'not-component'};
  if(!Number.isSafeInteger(quantity)||quantity<1||
      quantity>count(state?.workshopMaterials?.[itemId]))
    return {ok:false,reason:'quantity'};
  if(countItem(pack,itemId)+quantity>MAX_MATERIAL)
    return {ok:false,reason:'inventory-full'};
  const result=addItem(pack,itemId,quantity);
  if(result.added!==quantity)return {ok:false,reason:'inventory-full'};
  state.workshopMaterials[itemId]-=quantity;
  if(!state.workshopMaterials[itemId])delete state.workshopMaterials[itemId];
  return {ok:true,itemId,quantity};
}

// Pick the smallest useful set of stored objects for a recipe. Each item is
// evaluated by what it actually adds toward missing components, not by value.
export function previewWorkshopRecipe(pack,state,recipe={}){
  const need={};
  for(const [id,amount] of Object.entries(recipe||{})){
    if(!COMPONENT_BY_ID[id]||!Number.isSafeInteger(amount)||amount<0||amount>MAX_MATERIAL)
      return {ok:false,reason:'invalid-recipe',missing:[]};
    if(amount)need[id]=amount;
  }
  const available={};
  for(const id of Object.keys(need))
    available[id]=countItem(pack,id)+count(state?.workshopMaterials?.[id]);
  const remaining={...safeWorkshopJunk(state?.workshopJunk)},selected={};
  const recovered={};
  const deficit=()=>Object.fromEntries(Object.entries(need).filter(([id,n])=>
    available[id]+(recovered[id]||0)<n).map(([id,n])=>
    [id,n-available[id]-(recovered[id]||0)]));
  for(let turns=0;turns<MAX_JUNK;turns++){
    const gaps=deficit();if(!Object.keys(gaps).length)break;
    let chosen=null,best=0;
    for(const item of JUNK_ITEMS){
      if(!remaining[item.id])continue;
      const benefit=Object.entries(item.breakdown).reduce((sum,[id,n])=>
        sum+Math.min(n,gaps[id]||0),0);
      if(benefit>best){chosen=item;best=benefit;}
    }
    if(!chosen)break;
    remaining[chosen.id]--;selected[chosen.id]=(selected[chosen.id]||0)+1;
    for(const [id,n] of Object.entries(chosen.breakdown))
      recovered[id]=(recovered[id]||0)+n;
  }
  const missing=Object.entries(deficit()).map(([id,n])=>({
    id,itemId:id,needed:need[id],required:need[id],owned:need[id]-n,short:n}));
  return {ok:!missing.length,missing,selected,recovered,recipe:need};
}

// Callback operates on CLONES. Failed crafting, out-of-range placement, or
// invalid recipes leave both backpack and workshop untouched.
export function craftWithWorkshop(pack,state,recipe,attempt){
  const plan=previewWorkshopRecipe(pack,state,recipe);
  if(!plan.ok)return {ok:false,reason:plan.reason||'materials',missing:plan.missing};
  const sandboxPack=copy(pack),sandboxState=copy(state),combined={};
  for(const component of CRAFTING_COMPONENTS){
    const id=component.id;
    const playerCount=countItem(pack,id);
    const workshopCount=count(state.workshopMaterials?.[id]);
    const recovered=plan.recovered[id]||0;
    const sum=playerCount+workshopCount+recovered;
    if(sum>MAX_MATERIAL)return {ok:false,reason:'storage-full'};
    combined[id]=sum;
    if(sum)sandboxPack.materials[id]=sum;
    else delete sandboxPack.materials[id];
  }
  let result;
  try{result=attempt(sandboxPack,sandboxState);}catch(error){
    return {ok:false,reason:'craft-error',error:String(error?.message||error)};
  }
  if(!result?.ok)return result||{ok:false,reason:'craft-failed'};
  for(const component of CRAFTING_COMPONENTS){
    const id=component.id;
    const after=countItem(sandboxPack,id),spent=combined[id]-after;
    if(spent<0)return {ok:false,reason:'invalid-craft-yield'};
    const originallyCarried=countItem(pack,id);
    const playerAfter=Math.max(0,originallyCarried-spent);
    const storedAfter=(count(state.workshopMaterials?.[id])+
      (plan.recovered[id]||0))-Math.max(0,spent-originallyCarried);
    if(storedAfter<0)return {ok:false,reason:'material-reconciliation'};
    if(playerAfter)sandboxPack.materials[id]=playerAfter;
    else delete sandboxPack.materials[id];
    sandboxState.workshopMaterials??={};
    if(storedAfter)sandboxState.workshopMaterials[id]=storedAfter;
    else delete sandboxState.workshopMaterials[id];
  }
  sandboxState.workshopJunk??={};
  for(const [id,n] of Object.entries(plan.selected)){
    sandboxState.workshopJunk[id]-=n;
    if(!sandboxState.workshopJunk[id])delete sandboxState.workshopJunk[id];
  }
  Object.assign(pack,sandboxPack);Object.assign(state,sandboxState);
  return {...result,scrappedJunk:plan.selected,recovered:plan.recovered};
}
