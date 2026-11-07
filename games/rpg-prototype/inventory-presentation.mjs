// W20.98 — Pure presentation rules. Never mutate the real backpack or map.
const normalized=value=>String(value??'').trim().toLocaleLowerCase();

export function filterAndSortInventory(entries,getItem,{category='all',slot=null,
  query='',sort='recent',section}={}){
  if(typeof getItem!=='function'||typeof section!=='function')
    throw new TypeError('Item and section lookups are required');
  const needle=normalized(query);
  const filtered=(entries||[]).filter(entry=>{
    const item=getItem(entry.itemId);
    if(category!=='all'&&section(item)!==category)return false;
    if(category==='armor'&&slot&&item.slot!==slot)return false;
    return !needle||[item.name,item.id,item.category,item.rarity,section(item)]
      .some(value=>normalized(value).includes(needle));
  });
  if(sort==='recent')return filtered;
  return filtered.slice().sort((a,b)=>{
    const ia=getItem(a.itemId),ib=getItem(b.itemId);
    if(sort==='name')return ia.name.localeCompare(ib.name)||String(a.uid).localeCompare(String(b.uid));
    if(sort==='value')return ib.value-ia.value||ia.name.localeCompare(ib.name);
    if(sort==='weight')return ib.weight-ia.weight||ia.name.localeCompare(ib.name);
    return 0;
  });
}

export function discoveredMapPoints(points,isDiscovered,playerX,playerZ){
  if(typeof isDiscovered!=='function')throw new TypeError('Discovery lookup is required');
  return (points||[]).filter(point=>Number.isFinite(point.x)&&Number.isFinite(point.z)&&
    isDiscovered(point.x,point.z)).map(point=>({
      ...point,distance:Math.round(Math.hypot(point.x-playerX,point.z-playerZ))
    })).sort((a,b)=>a.distance-b.distance||a.label.localeCompare(b.label));
}

export function itemInspectionFacts(item,entry){
  const facts=[['CATEGORY',item.category.replaceAll('-',' ').toUpperCase()],
    ['QUANTITY',String(entry.quantity)],['WEIGHT',item.weight.toFixed(1)+' LB EACH'],
    ['TOTAL WEIGHT',(item.weight*entry.quantity).toFixed(1)+' LB'],
    ['VALUE',item.value+' CAPS EACH'],['TOTAL VALUE',item.value*entry.quantity+' CAPS']];
  if(item.slot)facts.push(['EQUIP SLOT',item.slot.replace(/([A-Z])/g,' $1').toUpperCase()]);
  if(Number.isFinite(entry.condition))facts.push(['CONDITION',Math.ceil(entry.condition)+' DUR']);
  if(Number.isFinite(entry.charge))facts.push(['FUSION CHARGE',Math.ceil(entry.charge)+'%']);
  if(item.heal)facts.push(['HEALTH RESTORED','+'+item.heal+' HP']);
  if(item.radDose)facts.push(['RADIATION DOSE','+'+item.radDose+' RADS']);
  if(item.radCure)facts.push(['RADIATION TREATMENT','-'+item.radCure+' RADS MAX']);
  if(item.carryBonus)facts.push(['CARRY BONUS','+'+item.carryBonus+' LB WHEN EQUIPPED']);
  if(item.effectSummary)facts.push(['ACTIVE EFFECT',item.effectSummary]);
  return facts;
}
