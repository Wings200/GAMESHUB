// W20.75: power armor enters the economy only through visibly equipped foes,
// faction reputation suppliers, or persistent abandoned chassis discoveries.
import {POWER_ARMOR_PLATES,POWER_ARMOR_SLOTS,
  createPowerArmorState,setPowerPlate} from './power-armor.mjs';

export const FACTION_POWER_ARMOR_REPUTATION=35;
export const ADVANCED_POWER_ARMOR_REPUTATION=65;

// These encounters are deliberately uncommon in the sandbox. The combatant's
// actual suit model and mitigation use the same declaration as its drops.
export function enemyPowerArmorForRound(enemyId,round=0){
  const wave=Math.max(0,Math.floor(Number.isFinite(round)?round:0));
  if(enemyId==='enforcer'&&wave>=3&&wave%4===3){
    const tier=wave>=19?'t01':wave>=11?'t60':'t45';
    return {tier,plates:[...POWER_ARMOR_SLOTS],coreCharge:64};
  }
  if(enemyId==='raider'&&wave>=5&&wave%6===5)
    return {tier:'t45',plates:['head','chest','leftArm','rightLeg'],coreCharge:39};
  return null;
}
export function salvageWornPowerArmor(suit,random=Math.random){
  if(!suit||!['t45','t60','t01'].includes(suit.tier)||
      !Array.isArray(suit.plates))return [];
  const roll=()=>{
    const value=Number(random());
    return Number.isFinite(value)?Math.min(.999999,Math.max(0,value)):0;
  };
  const spec=POWER_ARMOR_PLATES[suit.tier],chance={t45:.48,t60:.30,t01:.18}[suit.tier];
  const recovered=[];
  // Never conjure parts absent from the visible suit; a destroyed plate is
  // not guaranteed to survive. Cap each enemy at two recoverable plates.
  for(const slot of [...new Set(suit.plates)].filter(s=>POWER_ARMOR_SLOTS.includes(s))){
    if(recovered.length>=2)break;
    if(roll()<chance)recovered.push({itemId:'power-plate:'+suit.tier+'-'+slot,
      quantity:1,condition:Math.max(1,Math.floor(spec.maxDurability*(.16+.48*roll())))});
  }
  if(Number.isFinite(suit.coreCharge)&&suit.coreCharge>0&&roll()<.55)
    recovered.push({itemId:'supply:fusion-core',quantity:1,
      charge:Math.min(100,Math.max(1,Math.floor(suit.coreCharge*(.35+.65*roll()))))});
  return recovered;
}

// Coordinates are testing-sandbox discovery fixtures, not an open-world map.
// Their IDs and exact starting configurations are stable across saves.
export const ABANDONED_POWER_FRAMES=Object.freeze([
  Object.freeze({id:'wreck-north',x:-57,z:17,coreCharge:72,
    plates:Object.freeze({head:.34,chest:.58,leftArm:.41,leftLeg:.25})}),
  Object.freeze({id:'wreck-west',x:-54,z:-32,coreCharge:49,
    plates:Object.freeze({chest:.36,rightArm:.62,rightLeg:.22})}),
  Object.freeze({id:'wreck-south',x:13,z:-44,coreCharge:83,
    plates:Object.freeze({head:.53,chest:.65,leftArm:.42,rightArm:.38,rightLeg:.59})})
]);
export function createAbandonedPowerFrame(definition){
  const state=createPowerArmorState();
  for(const [slot,percentage] of Object.entries(definition?.plates||{})){
    if(!POWER_ARMOR_SLOTS.includes(slot))continue;
    const max=POWER_ARMOR_PLATES.t45.maxDurability;
    setPowerPlate(state,slot,'t45',Math.max(1,Math.floor(max*Math.min(1,
      Math.max(0,Number(percentage)||0)))));
  }
  state.coreCharge=Math.max(0,Math.min(100,Number(definition?.coreCharge)||0));
  return state;
}
