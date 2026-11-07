// W20.99: Data-only vendor category and comparison helpers.
import {inventorySection} from './inventory.mjs';
import {getWeaponSpec} from './weapons.mjs';
import {getArmorPiece,ARMOR_SLOT_LABELS} from './combat.mjs';
import {effectiveWeaponSpec} from './weapon-mods.mjs';
import {junkYieldText} from './junk.mjs';

export const TRADE_CATEGORIES=Object.freeze([
  {id:'all',label:'ALL CATEGORIES'},
  {id:'weapon',label:'WEAPONS'},
  {id:'ammo',label:'AMMO'},
  {id:'armor',label:'ARMOR'},
  {id:'power',label:'POWER ARMOR'},
  {id:'clothing',label:'CLOTHING'},
  {id:'aid',label:'AID'},
  {id:'materials',label:'MATERIALS'},
  {id:'junk',label:'JUNK'}
]);
export function vendorItemCategory(item){
  return item.category==='ammo'?'ammo':inventorySection(item);
}
export function matchesVendorFilter(item,category='all',query=''){
  if(category!=='all'&&vendorItemCategory(item)!==category)return false;
  const needle=String(query).trim().toLocaleLowerCase();
  return !needle||[item.name,item.id,item.rarity,vendorItemCategory(item)]
    .some(value=>String(value||'').toLocaleLowerCase().includes(needle));
}
export function vendorComparisonFacts(item,pack){
  const facts=[['CATEGORY',vendorItemCategory(item).toUpperCase()],
    ['WEIGHT',item.weight.toFixed(1)+' LB'],
    ['BASE VALUE',item.value+' CAPS']];
  if(item.category==='weapon'){
    const candidate=effectiveWeaponSpec(getWeaponSpec(item.key),pack);
    const damage=Number(candidate.damage||0);
    facts.push(['DAMAGE',damage.toFixed(1)],
      ['MAGAZINE',String(candidate.magazineSize||'N/A')],
      ['RELOAD',Number(candidate.reloadSeconds||0).toFixed(2)+' SEC']);
    let equipped=null;
    try{equipped=effectiveWeaponSpec(getWeaponSpec(pack?.equipment?.weapon),pack);}catch{}
    if(equipped){
      const difference=damage-Number(equipped.damage||0);
      facts.push(['VS EQUIPPED',
        (difference>0?'+':'')+difference.toFixed(1)+' DAMAGE']);
    }else facts.push(['VS EQUIPPED','NO WEAPON EQUIPPED']);
  }
  if(item.category==='armor'){
    const points=getArmorPiece(item.slot,item.key).points;
    const current=getArmorPiece(item.slot,pack?.equipment?.armor?.[item.slot]||'none').points;
    const difference=points-current;
    facts.push(['BODY PART',ARMOR_SLOT_LABELS[item.slot].toUpperCase()],
      ['ARMOR POINTS',String(points)],
      ['VS EQUIPPED',(difference>0?'+':'')+difference+' AP']);
  }
  if(item.category==='power-plate'){
    if(Number.isFinite(item.maxDurability))
      facts.push(['MAX CONDITION',item.maxDurability+' DUR']);
    if(item.slot)facts.push(['FRAME SLOT',ARMOR_SLOT_LABELS[item.slot].toUpperCase()]);
  }
  if(item.heal)facts.push(['HEALTH','+'+item.heal+' HP']);
  if(item.radDose)facts.push(['RADIATION','+'+item.radDose+' RADS']);
  if(item.radCure)facts.push(['RAD TREATMENT','-'+item.radCure+' RADS']);
  if(item.carryBonus)facts.push(['CARRY BONUS','+'+item.carryBonus+' LB']);
  if(item.effectSummary)facts.push(['EFFECT',item.effectSummary]);
  if(item.category==='junk')facts.push(['SCRAP YIELD',junkYieldText(item.id)]);
  return facts;
}
