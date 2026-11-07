// W21.01 — Read-only power armor service comparison. Inventory transfer,
// plate durability, protection, and repair authority remain in power-armor.mjs.
import {getPowerPlate} from './power-armor.mjs';

function safeDurability(value,max){
  return Math.max(0,Math.min(max,Number.isFinite(value)?value:0));
}

export function powerServiceComparison(slot,installed,selection='installed'){
  const oldTier=installed?.tier||'none';
  const oldSpec=getPowerPlate(slot,oldTier);
  const oldCondition=safeDurability(installed?.current,oldSpec.maxDurability);
  const newTier=selection==='installed'?oldTier:
    selection==='remove'?'none':selection?.tier||'none';
  const newSpec=getPowerPlate(slot,newTier);
  const newCondition=selection==='installed'?oldCondition:
    selection==='remove'?0:safeDurability(selection?.condition,newSpec.maxDurability);
  const before=oldCondition>0?oldSpec.points:0;
  const after=newCondition>0?newSpec.points:0;
  const newPercent=newSpec.maxDurability>0?
    Math.round(100*newCondition/newSpec.maxDurability):0;
  const oldPercent=oldSpec.maxDurability>0?
    Math.round(100*oldCondition/oldSpec.maxDurability):0;
  return {before,after,delta:after-before,oldTier,newTier,
    oldCondition,newCondition,oldMax:oldSpec.maxDurability,
    newMax:newSpec.maxDurability,oldPercent,newPercent,
    broken:newTier!=='none'&&newCondition<=0};
}
