// RPG modular armor W03.1. Independent, permanent armor ratings per body slot.
export const ARMOR_SLOTS=Object.freeze(['head','chest','leftArm','rightArm','leftLeg','rightLeg']);
export const HIT_ZONES=Object.freeze({head:2.5,chest:1,leftArm:.7,rightArm:.7,leftLeg:.7,rightLeg:.7});
export const DUMMY_HEALTH=100;
// Shared, adjustable armor-resistance curve. Item AP determines the percentage;
// weapons change raw damage, never how armor converts AP to protection.
export const ARMOR_RESISTANCE=Object.freeze({ratingDivisor:25,maxReduction:.85});
export const ARMOR_STYLES=Object.freeze([
  {id:'cloth',name:'Field Wrap',points:5,color:0x777361,style:'wrap'},
  {id:'canvas',name:'Canvas Patrol',points:9,color:0x8b8870,style:'wrap'},
  {id:'hide',name:'Wasteland Hide',points:13,color:0x795842,style:'wrap'},
  {id:'patchwork',name:'Patchwork Leather',points:17,color:0x74513f,style:'vest'},
  {id:'mesh',name:'Rusted Mesh',points:21,color:0x8b7967,style:'mesh'},
  {id:'scrap',name:'Scrap Iron',points:27,color:0x817c70,style:'plate'},
  {id:'ranger',name:'Ranger Guard',points:33,color:0x647363,style:'vest'},
  {id:'road',name:'Roadwarden Shell',points:39,color:0x5b6766,style:'plate'},
  {id:'militia',name:'Militia Steel',points:45,color:0x667780,style:'plate'},
  {id:'composite',name:'Composite Weave',points:52,color:0x57676c,style:'mesh'},
  {id:'ceramic',name:'Ceramic Barrier',points:59,color:0xc0c3b7,style:'plate'},
  {id:'industrial',name:'Industrial Laminates',points:66,color:0x8c7e67,style:'plate'},
  {id:'tactical',name:'Tactical Alloy',points:74,color:0x354e55,style:'plate'},
  {id:'citadel',name:'Citadel Bulwark',points:83,color:0x414c65,style:'plate'},
  {id:'carbon',name:'Carbon Carapace',points:91,color:0x303b3e,style:'shell'},
  {id:'aegis',name:'Aegis Prototype',points:105,color:0x526982,style:'shell'}
]);
export const ARMOR_SLOT_LABELS=Object.freeze({
  head:'Head',chest:'Chest',leftArm:'Left Arm',rightArm:'Right Arm',
  leftLeg:'Left Leg',rightLeg:'Right Leg'
});
const slotMultiplier=Object.freeze({
  head:.9,chest:1.15,leftArm:.88,rightArm:.88,leftLeg:.99,rightLeg:.99
});
const generated=Object.fromEntries(ARMOR_SLOTS.map(slot=>[
  slot,Object.freeze([
    ({id:'none',slot,name:'No Armor',points:0,color:0,style:'none'}),
    ...ARMOR_STYLES.map(style=>({
      id:style.id+'-'+slot,slot,name:style.name+' · '+ARMOR_SLOT_LABELS[slot],
      points:Math.round(style.points*slotMultiplier[slot]),
      color:style.color,style:style.style
    }))
  ])
]));
export const ARMOR_ITEMS=Object.freeze(generated);
export const ARMOR_PRESETS=Object.freeze({
  none:Object.freeze(Object.fromEntries(ARMOR_SLOTS.map(slot=>[slot,'none']))),
  light:Object.freeze(Object.fromEntries(ARMOR_SLOTS.map(slot=>
    [slot,slot==='head'?'none':'ranger-'+slot]))),
  heavy:Object.freeze(Object.fromEntries(ARMOR_SLOTS.map(slot=>
    [slot,'citadel-'+slot])))
});
// The test dummies deliberately retain their original bare/light/heavy presets.
// Actual Station 9 combatants need helmets: leaving Scout/Raider heads at
// zero armor made them disproportionately easy two-shot kills.
export const ENEMY_ARMOR_PRESETS=Object.freeze({
  scout:Object.freeze({...ARMOR_PRESETS.none,head:'scrap-head'}),
  raider:Object.freeze({...ARMOR_PRESETS.light,head:'ranger-head'}),
  enforcer:ARMOR_PRESETS.heavy
});
// Variant outfits rotate when the player resets the Mechanics Lab arena.
// Missing slots are intentionally bare: NPCs can wear one piece or six.
export const ENEMY_ARMOR_VARIANTS=Object.freeze({
  scout:Object.freeze([
    {head:'scrap-head',leftLeg:'ranger-leftLeg'},
    {head:'ranger-head',leftLeg:'ranger-leftLeg'},
    {head:'scrap-head',rightArm:'scrap-rightArm',rightLeg:'ranger-rightLeg'},
    {head:'ranger-head',chest:'ranger-chest'}
  ]),
  raider:Object.freeze([
    {head:'ranger-head',chest:'ranger-chest',leftArm:'ranger-leftArm',rightLeg:'ranger-rightLeg'},
    {head:'ranger-head',chest:'ranger-chest',leftLeg:'ranger-leftLeg'},
    {head:'militia-head',leftArm:'ranger-leftArm',rightArm:'ranger-rightArm',rightLeg:'militia-rightLeg'},
    {head:'ranger-head',rightArm:'ranger-rightArm'}
  ]),
  enforcer:Object.freeze([
    {head:'citadel-head',chest:'citadel-chest',leftArm:'citadel-leftArm',
      rightArm:'citadel-rightArm',leftLeg:'citadel-leftLeg',rightLeg:'citadel-rightLeg'},
    {head:'citadel-head',chest:'citadel-chest',rightArm:'militia-rightArm',
      leftLeg:'citadel-leftLeg',rightLeg:'citadel-rightLeg'},
    {head:'citadel-head',chest:'citadel-chest',leftArm:'militia-leftArm',
      rightArm:'citadel-rightArm'}
  ])
});
export function enemyArmorForRound(enemyId,round=0){
  const variants=ENEMY_ARMOR_VARIANTS[enemyId];
  if(!variants)throw Error('Unknown enemy: '+enemyId);
  const index=Math.max(0,Math.floor(Number.isFinite(round)?round:0))%variants.length;
  return createLoadout(variants[index]);
}
export function getArmorPiece(slot,id='none'){
  if(!ARMOR_SLOTS.includes(slot))throw Error('Invalid armor slot: '+slot);
  const piece=ARMOR_ITEMS[slot].find(v=>v.id===id);
  if(!piece)throw Error('Invalid armor piece for '+slot+': '+id);
  return piece;
}
export function createLoadout(source='none'){
  const proposed=typeof source==='string'?ARMOR_PRESETS[source]:source;
  if(!proposed||typeof proposed!=='object')throw Error('Unknown armor preset');
  const loadout={};
  for(const slot of ARMOR_SLOTS){
    const id=proposed[slot]??'none';
    loadout[slot]=getArmorPiece(slot,id).id;
  }
  return loadout;
}
export function armorPointsForSlot(dummy,slot){
  return getArmorPiece(slot,dummy.loadout[slot]).points;
}
export function damageReductionForPoints(points){
  const p=Math.max(0,Number.isFinite(points)?points:0);
  // Default: 25 AP blocks 50%, 75 AP blocks 75%, never full immunity.
  return Math.min(ARMOR_RESISTANCE.maxReduction,
    p/(p+ARMOR_RESISTANCE.ratingDivisor));
}
export function createDummy(armor='none',maximumHealth=DUMMY_HEALTH){
  const maxHealth=Number.isFinite(maximumHealth)&&maximumHealth>0?maximumHealth:DUMMY_HEALTH;
  return {loadout:createLoadout(armor),health:maxHealth,maxHealth,alive:true,hits:0};
}
export function equipArmor(dummy,slot,id){
  const piece=getArmorPiece(slot,id);
  dummy.loadout[slot]=piece.id; // HP and other armor slots are unchanged.
  return piece;
}
export function resetDummy(dummy){
  Object.assign(dummy,createDummy(dummy.loadout,dummy.maxHealth));
  return dummy;
}
export function applyDamage(dummy,baseDamage,zone='chest'){
  if(!ARMOR_SLOTS.includes(zone))throw Error('Invalid hit zone: '+zone);
  const points=armorPointsForSlot(dummy,zone);
  const reduction=damageReductionForPoints(points);
  if(!dummy.alive)return {
    applied:false,zone,damage:0,blocked:0,points,reduction,
    health:dummy.health,killed:false
  };
  const raw=Math.max(0,Number.isFinite(baseDamage)?baseDamage:0)*HIT_ZONES[zone];
  const blocked=raw*reduction;
  const damage=Math.min(dummy.health,raw-blocked);
  dummy.health=Math.max(0,dummy.health-damage);
  dummy.hits++;
  dummy.alive=dummy.health>0;
  return {
    applied:true,zone,critical:zone==='head',raw,damage,blocked,points,
    reduction,health:dummy.health,killed:!dummy.alive,hitCount:dummy.hits
  };
}
