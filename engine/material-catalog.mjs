// Building-material definitions are pure data: this catalog can be searched,
// tested, saved and used without constructing WebGL textures up front.
const groups = [
  ['concrete','Concrete','concrete',.88,.02,2,[
    ['Poured Gray','#989a97'],['Warm Formwork','#aca59a'],['Charcoal Cast','#555b5b'],
    ['White Architectural','#d9d8ce'],['Sand Aggregate','#b7ad9d'],['Old Foundation','#77756d'],
    ['Blue-Grey Precast','#858f92'],['Rough Bridge','#747b7c'],['Graphite Polished','#50555a'],
    ['Cream Terrazzo','#c9beae'],['Wet Pavement','#696c69'],['Weathered Wall','#b2b4aa']]],
  ['brick','Brick & Masonry','brick',.84,.02,2,[
    ['Red Clay','#a84e3e'],['Old Red','#823e34'],['Sandstone Brick','#c1a17d'],
    ['Whitewashed','#cfc7b9'],['Charcoal Brick','#484949'],['Warm Buff','#c5a77e'],
    ['Tuscan Rust','#ad6743'],['Industrial Brown','#655047'],['Cream Smooth','#e1d1b6'],
    ['Grey Reclaimed','#817e79'],['Terracotta','#bb7353'],['Deep Burgundy','#633a39']]],
  ['stone','Natural Stone','stone',.81,.01,2,[
    ['Granite Silver','#989c9b'],['Basalt Black','#43494a'],['Limestone Cream','#c8bea9'],
    ['Slate Blue','#687b83'],['Travertine','#b7a38a'],['Sandstone Gold','#c19d6d'],
    ['River Rock','#898e87'],['Quartz White','#d4d5cf'],['Soapstone','#6c7471'],
    ['Marble Pale','#dbd5c9'],['Dark Granite','#4c555c'],['Flagstone','#a19986']]],
  ['wood','Timber & Wood','wood',.64,0,2,[
    ['Light Oak','#b99266'],['Walnut','#67442e'],['Pine','#c9a977'],
    ['Weathered Cedar','#8e7765'],['Ebony','#3a2e29'],['Maple','#d0ad83'],
    ['Cherry','#8a4d37'],['Ash','#b2a58e'],['Mahogany','#713c30'],
    ['Reclaimed Plank','#7d6957'],['Birch','#dbbc8d'],['Smoked Oak','#514235']]],
  ['metal','Metals & Alloys','metal',.35,.88,3,[
    ['Brushed Steel','#929a9e'],['Polished Chrome','#ccd2d5'],['Oxidized Iron','#626565'],
    ['Copper Sheet','#b27b55'],['Aged Bronze','#826d49'],['Brass','#b69b5d'],
    ['Black Anodized','#353c42'],['Gunmetal','#555e68'],['Aluminum','#b7bcc0'],
    ['Galvanized Zinc','#aab0ae'],['Corten Steel','#96533c'],['Gold Finish','#c8a75e']]],
  ['paint','Painted Finishes','paint',.49,.04,1,[
    ['Warm White','#e7e1d6'],['Gallery White','#f1f1eb'],['Charcoal','#3b4146'],
    ['Sage Green','#93a48f'],['Navy Blue','#3c536d'],['Terracotta','#b27562'],
    ['Deep Forest','#334d45'],['Soft Clay','#c5aea1'],['Dusty Blue','#8ea6b4'],
    ['Cream','#e7d5ad'],['Brick Red','#a44944'],['Mustard','#c4a357']]],
  ['plaster','Plaster & Stucco','plaster',.92,0,2,[
    ['Smooth Ivory','#e3dacc'],['Limewash','#e2dfd4'],['Earth Clay','#af9077'],
    ['Sandy Stucco','#c7b49a'],['Aged Cream','#c8c2b5'],['Cement Render','#9b9c97'],
    ['Warm Taupe','#ac9d8d'],['Chalk White','#eeede6'],['Blush','#c9a8a0'],
    ['Sage Render','#a4ab9a'],['Ochre','#b69a67'],['Dusk Grey','#777d7b']]],
  ['tile','Tile & Porcelain','tile',.3,.02,3,[
    ['White Subway','#e8e7e0'],['Sage Ceramic','#91b6a3'],['Blue Glaze','#577e99'],
    ['Terracotta Floor','#b76b4e'],['Black Porcelain','#292f33'],['Ivory Polished','#ddd2bd'],
    ['Olive Stoneware','#777f65'],['Grey Mosaic','#949da1'],['Cobalt','#335a88'],
    ['Cream Handmade','#d6bd9b'],['Rose Ceramic','#c7978a'],['Dark Slate Tile','#4a575b']]],
  ['glass','Glass & Glazing','glass',.09,0,1,[
    ['Clear Window','#d6e5e7'],['Blue Tint','#99c5d6'],['Smoke','#687681'],
    ['Bronze Tint','#ae9a7d'],['Green Glass','#83af9c'],['Frosted','#d7e6e6'],
    ['Dark Reflective','#58676a'],['Amber','#d6b77a'],['Aquamarine','#88cece'],
    ['Rose Tint','#d0b1b2'],['Architectural Grey','#a1aeb1'],['Milky Glass','#dce1de']]],
  ['roof','Roofing & Cladding','roof',.8,.06,3,[
    ['Slate Roof','#505b61'],['Terracotta Roof','#a65b46'],['Asphalt Shingles','#484c4b'],
    ['Cedar Shakes','#8e7253'],['Charcoal Panels','#393f42'],['Red Clay Tiles','#985145'],
    ['Standing Seam','#7a858a'],['Copper Patina','#6b8d80'],['Sand Shingles','#a99d88'],
    ['Weathered Slate','#72797b'],['Clay Brown','#705342'],['Zinc Grey','#a5a8a5']]],
  ['fabric','Fabric & Upholstery','fabric',.96,0,4,[
    ['Natural Linen','#bdb4a4'],['Charcoal Weave','#4a4b50'],['Navy Canvas','#4a5e76'],
    ['Cream Wool','#ddd2bb'],['Forest Cloth','#526c5c'],['Denim','#5c7997'],
    ['Rust Linen','#ae7258'],['Burgundy Velvet','#73464e'],['Oat Cotton','#cfbd9c'],
    ['Graphite Felt','#555558'],['Sage Twill','#8d9c84'],['Blue Grey','#8a9da6']]],
  ['ground','Ground & Aggregate','ground',.98,0,4,[
    ['Fine Gravel','#8b8980'],['Dark Soil','#5a4939'],['Beach Sand','#d0bb91'],
    ['Pea Gravel','#a99d89'],['Crushed Granite','#929598'],['Red Earth','#9d7054'],
    ['Wet Mud','#4f493e'],['Concrete Rubble','#85847d'],['River Pebbles','#7b817b'],
    ['Dry Dirt','#ae926f'],['Dark Gravel','#555b5c'],['Desert Sand','#bca379']]],
  ['polymer','Plastics & Rubber','plastic',.68,0,2,[
    ['Industrial Black','#2a2c2f'],['White ABS','#dfe1df'],['Orange Safety','#d17f37'],
    ['Red Polymer','#a44444'],['Grey PVC','#989c9e'],['Matte Blue','#527a97'],
    ['Green Rubber','#4e6055'],['Carbon Black','#252a2c'],['Cream Resin','#d1c8b5'],
    ['Clear Blue Resin','#99b0c3'],['Yellow Polymer','#d9b657'],['Dark Elastomer','#424444']]],
  ['leather','Leather & Hide','leather',.74,0,2,[
    ['Saddle Brown','#85593e'],['Black Leather','#353333'],['Tan','#b17e59'],
    ['Chestnut','#704637'],['Oxblood','#643d3b'],['Distressed Gray','#77736e'],
    ['Honey','#bc8854'],['Dark Chocolate','#4c382e'],['Cognac','#a46641'],
    ['Stone Beige','#b3a18e'],['Olive','#716d53'],['Vintage Rust','#8b5645']]]
];

export const MATERIAL_CATEGORIES=Object.freeze(groups.map(([id,label])=>({id,label})));
export const MATERIAL_PRESETS=Object.freeze(groups.flatMap(([category,categoryName,pattern,roughness,metalness,repeat,variants],groupIndex)=>
  variants.map(([name,color],index)=>Object.freeze({
    id:category+'-'+name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-$/,''),
    category,categoryName,name,color,pattern,
    roughness:Math.max(.04,Math.min(1,roughness+((index%5)-2)*.035)),
    metalness,repeat,seed:groupIndex*101+index*37+17,
    transmission:category==='glass'?(index===5?.43:.84):0,
    opacity:1
  }))));
const byId=new Map(MATERIAL_PRESETS.map(preset=>[preset.id,preset]));
export function getMaterialPreset(id){return byId.get(id)||null;}
export function normalizeMaterialSettings(preset,overrides={}){
  const bounded=(value,fallback,min,max)=>Number.isFinite(Number(value))?Math.max(min,Math.min(max,Number(value))):fallback;
  const color=/^#[0-9a-f]{6}$/i.test(overrides.color||'')?overrides.color:preset.color;
  return {color,roughness:bounded(overrides.roughness,preset.roughness,.02,1),
    metalness:bounded(overrides.metalness,preset.metalness,0,1),
    repeat:bounded(overrides.repeat,preset.repeat,.25,12),
    detailStrength:bounded(overrides.detailStrength,1,0,2)};
}
