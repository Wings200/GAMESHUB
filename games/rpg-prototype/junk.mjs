// W20.97: Physical salvage with exact component yields, never abstract scrap points.
const definitions=[
  ['desk-fan','Worn Desk Fan',3.5,26,{steel:2,gears:2,screw:2}],
  ['alarm-clock','Mechanical Alarm Clock',1.5,20,{aluminum:2,spring:2,gears:1}],
  ['tin-can','Crushed Tin Can',.2,3,{steel:2}],
  ['typewriter','Heavy Typewriter',9,42,{steel:3,spring:2,screw:2,gears:1}],
  ['table-lamp','Broken Table Lamp',3,28,{glass:2,copper:2,circuitry:1}],
  ['duct-tape','Industrial Duct Tape',.5,25,{adhesive:3,cloth:1}],
  ['coffee-mug','Chipped Coffee Mug',.7,8,{ceramic:2}],
  ['toy-car','Bent Toy Car',1,12,{steel:2,plastic:1,screw:1}]
];
export const JUNK_ITEMS=Object.freeze(definitions.map(([key,name,weight,value,parts])=>
  Object.freeze({id:'junk:'+key,key,category:'junk',name,rarity:'common',
    weight,value,maxStack:20,
    breakdown:Object.freeze(Object.fromEntries(Object.entries(parts).map(
      ([part,amount])=>['material:'+part,amount])))})));
export const JUNK_BY_ID=Object.freeze(Object.fromEntries(JUNK_ITEMS.map(i=>[i.id,i])));
export function junkYield(itemId,quantity=1){
  const item=JUNK_BY_ID[itemId];
  if(!item||!Number.isSafeInteger(quantity)||quantity<1||quantity>10000)return null;
  return Object.fromEntries(Object.entries(item.breakdown).map(([id,amount])=>
    [id,amount*quantity]));
}
export function junkYieldText(itemId,quantity=1){
  const recipe=junkYield(itemId,quantity);
  return recipe?Object.entries(recipe).map(([id,amount])=>
    amount+' '+id.slice('material:'.length).replace(/-/g,' ').toUpperCase()).join(' · '):'';
}
