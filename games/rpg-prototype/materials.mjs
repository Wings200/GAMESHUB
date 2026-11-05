// W20.57 — The 31 base crafting components found in Fallout 4, with original
// balancing for GAMESHUB. These are generic resource names, not Bethesda art.
const definitions=[
  ['acid','Acid','uncommon',8],
  ['adhesive','Adhesive','uncommon',14],
  ['aluminum','Aluminum','uncommon',10],
  ['antiseptic','Antiseptic','uncommon',10],
  ['asbestos','Asbestos','uncommon',7],
  ['ballistic-fiber','Ballistic Fiber','rare',28],
  ['bone','Bone','common',3],
  ['ceramic','Ceramic','common',6],
  ['circuitry','Circuitry','rare',20],
  ['cloth','Cloth','common',3],
  ['concrete','Concrete','common',3],
  ['copper','Copper','uncommon',11],
  ['cork','Cork','common',3],
  ['crystal','Crystal','rare',19],
  ['fertilizer','Fertilizer','common',5],
  ['fiber-optics','Fiber Optics','rare',25],
  ['fiberglass','Fiberglass','uncommon',9],
  ['gears','Gears','uncommon',11],
  ['glass','Glass','common',4],
  ['gold','Gold','rare',31],
  ['lead','Lead','uncommon',8],
  ['leather','Leather','common',5],
  ['nuclear-material','Nuclear Material','epic',40],
  ['oil','Oil','uncommon',12],
  ['plastic','Plastic','common',4],
  ['rubber','Rubber','common',4],
  ['screw','Screw','uncommon',11],
  ['silver','Silver','rare',23],
  ['spring','Spring','uncommon',10],
  ['steel','Steel','common',4],
  ['wood','Wood','common',3]
];

export const CRAFTING_COMPONENTS=Object.freeze(definitions.map(([key,name,rarity,value])=>
  Object.freeze({id:'material:'+key,key,name,rarity,value,category:'material',maxStack:9999})));
export const COMPONENT_BY_ID=Object.freeze(Object.fromEntries(CRAFTING_COMPONENTS.map(c=>[c.id,c])));

// Alternative component recipes for the existing optics bench. Legacy
// Salvaged Parts/Optic Glass recipes remain valid during save migration.
export const OPTIC_COMPONENT_RECIPES=Object.freeze({
  'holo-a':Object.freeze({'material:steel':2,'material:adhesive':1,'material:circuitry':1}),
  'holo-b':Object.freeze({'material:aluminum':2,'material:circuitry':1,'material:crystal':1}),
  'scope-2x':Object.freeze({'material:steel':2,'material:screw':2,'material:glass':2}),
  'scope-4x':Object.freeze({'material:aluminum':3,'material:screw':2,'material:crystal':2,'material:glass':2}),
  'scope-6x':Object.freeze({'material:aluminum':4,'material:screw':3,'material:fiber-optics':2,'material:crystal':2})
});

export const POWER_COMPONENT_RECIPES=Object.freeze({
  t45:Object.freeze({'material:steel':6,'material:aluminum':3,
    'material:gears':2,'material:adhesive':2}),
  t60:Object.freeze({'material:aluminum':10,'material:steel':5,
    'material:circuitry':4,'material:screw':3,'material:oil':3}),
  t01:Object.freeze({'material:aluminum':12,'material:nuclear-material':4,
    'material:fiber-optics':4,'material:ballistic-fiber':5,'material:adhesive':4})
});

const salvagePools=Object.freeze({
  scout:Object.freeze(['cloth','leather','plastic','wood','bone','rubber','steel','cork']),
  raider:Object.freeze(['steel','screw','spring','gears','oil','copper','adhesive','lead','glass','ceramic','aluminum']),
  enforcer:Object.freeze(['circuitry','aluminum','ballistic-fiber','fiber-optics','crystal','nuclear-material','gold','silver','fiberglass','asbestos','antiseptic','acid','fertilizer'])
});
export function generateComponentDrop(enemyId,random=Math.random){
  const pool=salvagePools[enemyId];
  if(!pool)return null;
  const raw=Number(random());
  const unit=Number.isFinite(raw)?Math.min(.999999,Math.max(0,raw)):0;
  const key=pool[Math.floor(unit*pool.length)];
  return {itemId:'material:'+key,quantity:enemyId==='enforcer'?2:enemyId==='raider'?3:2};
}
