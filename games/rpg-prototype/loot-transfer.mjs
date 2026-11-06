// W20.71: One inventory transfer is authoritative for both TAKE and TAKE ALL.
// The supplied insert function applies backpack capacity / stacking rules.
export function moveLootQuantity(bag,index,requested,insert){
  const entry=bag?.items?.[index];
  if(!entry)return {added:0,leftover:0,full:false,itemId:null};
  const amount=Math.min(entry.quantity,
    Math.max(0,Number.isFinite(requested)?Math.floor(requested):0));
  if(!amount)return {added:0,leftover:entry.quantity,full:false,itemId:entry.itemId};
  const result=insert(entry,amount);
  const added=Math.min(amount,Math.max(0,
    Number.isFinite(result?.added)?Math.floor(result.added):0));
  entry.quantity-=added;
  const leftover=entry.quantity;
  if(leftover===0)bag.items.splice(index,1);
  if(added>0)bag.opened=true;
  return {added,leftover,full:added<amount,itemId:entry.itemId};
}

export function moveAllLoot(bag,insert){
  if(!bag?.items)return {added:0,remaining:0};
  let added=0;
  for(let i=0;i<bag.items.length;){
    const result=moveLootQuantity(bag,i,bag.items[i].quantity,insert);
    added+=result.added;
    if(result.leftover)i++; // Later ammo/material stacks can still fit.
  }
  return {added,remaining:bag.items.reduce((n,entry)=>n+entry.quantity,0)};
}
