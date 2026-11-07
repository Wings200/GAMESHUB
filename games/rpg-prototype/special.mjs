// W14.0: persistent seven-attribute SPECIAL progression and earned perk ranks.
// Pure rules: no DOM, rendering or localStorage, so games and tests share them.
export const SPECIAL_ATTRIBUTES=Object.freeze([
  {id:'strength',letter:'S',name:'STRENGTH',color:'#d78c68',description:'Weapon control and additional backpack slots.'},
  {id:'perception',letter:'P',name:'PERCEPTION',color:'#86c2db',description:'Weapon precision and vital weak spots.'},
  {id:'endurance',letter:'E',name:'ENDURANCE',color:'#add18c',description:'Sprinting, survival and resilience.'},
  {id:'charisma',letter:'C',name:'CHARISMA',color:'#e4b9a2',description:'Barter prices, encounters and scavenging.'},
  {id:'intelligence',letter:'I',name:'INTELLIGENCE',color:'#d4c4f5',description:'Learning, crafting and machinery.'},
  {id:'agility',letter:'A',name:'AGILITY',color:'#f0d18e',description:'Movement, reloads and V.A.T.S. AP efficiency.'},
  {id:'luck',letter:'L',name:'LUCK',color:'#d1addb',description:'Critical shots, V.A.T.S. charge and lucky salvage.'}
].map(Object.freeze));
const perk=(id,stat,required,name,description,effects,maxRank=2)=>
  Object.freeze({id,stat,required,name,description,maxRank,effects:Object.freeze(effects)});
export const SPECIAL_PERKS=Object.freeze([
  perk('steady-grip','strength',3,'Steady Grip','Recoil decreases 8% per rank.',{recoilMultiplier:-.08}),
  perk('hard-hitter','strength',5,'Hard Hitter','Gun damage increases 7% per rank.',{gunDamageMultiplier:.07}),
  perk('breaker','strength',8,'Armor Breaker','Gun damage +15%, recoil -8%.',
    {gunDamageMultiplier:.15,recoilMultiplier:-.08},1),
  perk('focused-sights','perception',3,'Focused Sights','Shot spread decreases 8% per rank.',{aimSpreadMultiplier:-.08}),
  perk('weak-point','perception',5,'Weak Point','Headshot damage increases 12% per rank.',{headshotMultiplier:.12}),
  perk('deadeye','perception',8,'Deadeye','Shot spread -12%, headshot damage +18%.',
    {aimSpreadMultiplier:-.12,headshotMultiplier:.18},1),
  perk('long-haul','endurance',3,'Long Haul','Sprinting drains 9% less stamina per rank.',{staminaDrainMultiplier:-.09}),
  perk('thick-skin','endurance',5,'Thick Skin','Take 6% less HP damage per rank.',{damageTakenMultiplier:-.06}),
  perk('last-stand','endurance',8,'Last Stand','Take another 14% less HP damage.',
    {damageTakenMultiplier:-.14},1),
  perk('people-person','charisma',3,'People Person','Find 12% more scavenging XP per rank.',{lootXpMultiplier:.12}),
  perk('scrounger-network','charisma',5,'Scrounger Network','Improves bonus-salvage chance 10% per rank.',
    {salvageChance:.10}),
  perk('silver-tongue','charisma',8,'Silver Tongue','Gain 18% more XP, buy 8% cheaper and sell 8% higher.',
    {xpMultiplier:.18,barterBuyMultiplier:-.08,barterSellMultiplier:.08},1),
  perk('quick-study','intelligence',3,'Quick Study','Gain 10% more XP per rank.',{xpMultiplier:.10}),
  perk('resourceful','intelligence',5,'Resourceful','Crafting materials cost 12% less per rank.',
    {craftDiscount:.12}),
  perk('master-mechanic','intelligence',8,'Master Mechanic','Power-armor repairs cost 30% less.',
    {repairDiscount:.30},1),
  perk('quick-step','agility',3,'Quick Step','Move 5% faster per rank.',{speedMultiplier:.05}),
  perk('fast-hands','agility',5,'Fast Hands','Reload 12% faster per rank.',{reloadSpeedMultiplier:.12}),
  perk('ghost-runner','agility',8,'Ghost Runner','Move 10% faster, use 10% less sprint energy and V.A.T.S. AP.',
    {speedMultiplier:.10,staminaDrainMultiplier:-.10,vatsApMultiplier:-.10},1),
  perk('lucky-shot','luck',3,'Lucky Shot','Critical-hit chance increases 4% per rank.',
    {critChance:.04}),
  perk('treasure-sense','luck',5,'Treasure Sense','Improves bonus-salvage chance 12% per rank.',
    {salvageChance:.12}),
  perk('miracle-hit','luck',8,'Miracle Hit','Critical hits deal 35% more damage.',
    {critDamageMultiplier:.35},1)
]);
export const SPECIAL_MAX_LEVEL=50;
const num=(n,def=0)=>Number.isFinite(Number(n))?Number(n):def;
const limit=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
export const xpForNextLevel=level=>Math.round(100+limit(Math.floor(num(level,1)),1,50)*70);
export function createSpecialState(){
  return {level:1,xp:0,statPoints:5,perkPoints:2,
    attributes:Object.fromEntries(SPECIAL_ATTRIBUTES.map(a=>[a.id,3])),
    perks:{}};
}
export function safeSpecialSnapshot(raw){
  const state=createSpecialState();
  if(!raw||typeof raw!=='object')return state;
  state.level=limit(Math.floor(num(raw.level,1)),1,SPECIAL_MAX_LEVEL);
  state.xp=limit(Math.floor(num(raw.xp)),0,xpForNextLevel(state.level)-1);
  state.statPoints=limit(Math.floor(num(raw.statPoints,5)),0,99);
  state.perkPoints=limit(Math.floor(num(raw.perkPoints,2)),0,99);
  for(const attr of SPECIAL_ATTRIBUTES)
    state.attributes[attr.id]=limit(Math.floor(num(raw.attributes?.[attr.id],3)),1,10);
  for(const p of SPECIAL_PERKS){
    const rank=limit(Math.floor(num(raw.perks?.[p.id])),0,p.maxRank);
    if(rank)state.perks[p.id]=rank;
  }
  return state;
}
export function allocateSpecialPoint(state,id){
  if(!SPECIAL_ATTRIBUTES.some(a=>a.id===id))return {ok:false,reason:'unknown-stat'};
  if(state.statPoints<=0)return {ok:false,reason:'no-stat-points'};
  if(state.attributes[id]>=10)return {ok:false,reason:'max-stat'};
  state.attributes[id]++;state.statPoints--;
  return {ok:true,id,value:state.attributes[id],remaining:state.statPoints};
}
export function purchaseSpecialPerk(state,id){
  const p=SPECIAL_PERKS.find(v=>v.id===id);
  if(!p)return {ok:false,reason:'unknown-perk'};
  if(state.perkPoints<=0)return {ok:false,reason:'no-perk-points'};
  if(state.attributes[p.stat]<p.required)
    return {ok:false,reason:'stat-locked',required:p.required,stat:p.stat};
  const rank=state.perks[id]||0;
  if(rank>=p.maxRank)return {ok:false,reason:'max-rank'};
  state.perks[id]=rank+1;state.perkPoints--;
  return {ok:true,id,rank:rank+1,remaining:state.perkPoints};
}
export function specialBonuses(state){
  const a=state.attributes;
  const b={
    recoilMultiplier:1-.025*(a.strength-3),
    backpackBonusSlots:Math.max(0,Math.floor((a.strength-3)/2)),
    gunDamageMultiplier:1,
    aimSpreadMultiplier:1-.024*(a.perception-3),
    headshotMultiplier:1,
    staminaDrainMultiplier:1-.018*(a.endurance-3),
    damageTakenMultiplier:1-.012*(a.endurance-3),
    lootXpMultiplier:1+.04*(a.charisma-3),
    barterBuyMultiplier:1-.025*(a.charisma-3),
    barterSellMultiplier:1+.035*(a.charisma-3),
    salvageChance:0,
    xpMultiplier:1+.03*(a.intelligence-3),
    craftDiscount:0,
    repairDiscount:0,
    speedMultiplier:1+.018*(a.agility-3),
    reloadSpeedMultiplier:1+.03*(a.agility-3),
    vatsApMultiplier:1-.025*(a.agility-3),
    critChance:.015+.014*(a.luck-3),
    critDamageMultiplier:1.5+.06*(a.luck-3),
    vatsCritGainMultiplier:1+.05*(a.luck-3)
  };
  for(const p of SPECIAL_PERKS){
    const rank=state.perks[p.id]||0;
    if(!rank)continue;
    for(const [key,amount] of Object.entries(p.effects))b[key]+=amount*rank;
  }
  b.recoilMultiplier=limit(b.recoilMultiplier,.48,1.2);
  b.backpackBonusSlots=limit(Math.floor(b.backpackBonusSlots),0,4);
  b.gunDamageMultiplier=limit(b.gunDamageMultiplier,.8,2);
  b.aimSpreadMultiplier=limit(b.aimSpreadMultiplier,.48,1.2);
  b.headshotMultiplier=limit(b.headshotMultiplier,1,2.3);
  b.staminaDrainMultiplier=limit(b.staminaDrainMultiplier,.45,1.2);
  b.damageTakenMultiplier=limit(b.damageTakenMultiplier,.46,1.2);
  b.lootXpMultiplier=limit(b.lootXpMultiplier,.8,2);
  b.barterBuyMultiplier=limit(b.barterBuyMultiplier,.65,1.2);
  b.barterSellMultiplier=limit(b.barterSellMultiplier,.8,1.5);
  b.salvageChance=limit(b.salvageChance,0,.6);
  b.xpMultiplier=limit(b.xpMultiplier,.8,2);
  b.craftDiscount=limit(b.craftDiscount,0,.5);
  b.repairDiscount=limit(b.repairDiscount,0,.5);
  b.speedMultiplier=limit(b.speedMultiplier,.85,1.40);
  b.reloadSpeedMultiplier=limit(b.reloadSpeedMultiplier,.85,1.6);
  b.vatsApMultiplier=limit(b.vatsApMultiplier,.65,1.15);
  b.critChance=limit(b.critChance,0,.35);
  b.critDamageMultiplier=limit(b.critDamageMultiplier,1,2.5);
  b.vatsCritGainMultiplier=limit(b.vatsCritGainMultiplier,.85,1.4);
  return b;
}
export function discountedMaterials(cost,discount=0){
  const scale=1-limit(num(discount),0,.5);
  return {salvage:Math.max(0,Math.ceil(num(cost.salvage)*scale)),
    glass:Math.max(0,Math.ceil(num(cost.glass)*scale))};
}
// Components are integer units: round the per-material discount once and use
// this same recipe for display, affordability checks and atomic crafting.
export function discountedComponentRecipe(recipe,discount=0){
  const scale=1-limit(num(discount),0,.5);
  return Object.fromEntries(Object.entries(recipe||{}).map(([id,amount])=>{
    const quantity=Math.max(0,Math.floor(num(amount)));
    return [id,quantity?Math.max(1,Math.round(quantity*scale)):0];
  }));
}
export function gainSpecialXP(state,base,source='combat'){
  const amount=Math.max(0,Math.floor(num(base)));
  const bonuses=specialBonuses(state);
  const gained=Math.round(amount*bonuses.xpMultiplier*
    (source==='loot'?bonuses.lootXpMultiplier:1));
  state.xp+=gained;
  let levels=0;
  while(state.level<SPECIAL_MAX_LEVEL&&state.xp>=xpForNextLevel(state.level)){
    state.xp-=xpForNextLevel(state.level);
    state.level++;state.perkPoints++;levels++;
    if(state.level%4===0)state.statPoints++;
  }
  if(state.level===SPECIAL_MAX_LEVEL)state.xp=0;
  return {gained,levels,level:state.level,xp:state.xp,
    statPoints:state.statPoints,perkPoints:state.perkPoints};
}

