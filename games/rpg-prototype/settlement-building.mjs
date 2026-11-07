// W20.82: Store whole objects for re-placement; scrap pre-existing and built props.
// the browser is responsible for rendering, input and world collision lists.
import {addItem,countItem,spendMaterial} from './inventory.mjs';

export const HAVEN_BUILD_AREA=Object.freeze({minX:-55,maxX:-20,minZ:-35,maxZ:-7});
export const BUILD_LIMIT=120;
const component=key=>'material:'+key;
const part=(x,y,z,w,h,d,material,solid=false,shape='box',tiltZ=0,tiltX=0)=>
  Object.freeze({x,y,z,w,h,d,material,solid,shape,tiltZ,tiltX});
const yieldStats=values=>Object.freeze(values);

export const SETTLEMENT_CATEGORIES=Object.freeze([
  Object.freeze({id:'STRUCTURE',name:'STRUCTURES',hint:'Floors · walls · roofs'}),
  Object.freeze({id:'DEFENSE',name:'DEFENSE',hint:'Barricades · turrets · guard posts'}),
  Object.freeze({id:'WATER',name:'WATER',hint:'Pumps · purifiers'}),
  Object.freeze({id:'FOOD',name:'FOOD',hint:'Planters · growing crops'}),
  Object.freeze({id:'BEDS',name:'BEDS',hint:'Rest places for settlers'}),
  Object.freeze({id:'POWER',name:'POWER',hint:'Generators · solar panels'}),
  Object.freeze({id:'UTILITY',name:'UTILITY',hint:'Recruitment · light · storage'}),
  Object.freeze({id:'WORKSHOP',name:'WORKSHOPS',hint:'Weapon mods · power armor service'})
]);

export const SETTLEMENT_BLUEPRINTS=Object.freeze([
  Object.freeze({id:'foundation',name:'Timber Foundation',category:'STRUCTURE',
    width:3,depth:3,cost:Object.freeze({[component('wood')]:5,[component('concrete')]:1}),
    parts:Object.freeze([
      part(0,.11,0,3,.22,3,'wood'),
      ...[-1.05,-.52,0,.52,1.05].map(x=>part(x,.24,0,.045,.025,3,'trim'))
    ])}),
  Object.freeze({id:'wall',name:'Scrap Wall',category:'STRUCTURE',
    width:3,depth:.28,cost:Object.freeze({[component('wood')]:4,[component('steel')]:2}),
    parts:Object.freeze([
      part(0,1.35,0,3,2.7,.2,'wood',true),
      part(-1.34,1.37,-.14,.14,2.74,.13,'steel'),
      part(1.34,1.37,-.14,.14,2.74,.13,'steel'),
      part(0,2.54,-.16,3.1,.14,.15,'trim')
    ])}),
  Object.freeze({id:'doorway',name:'Open Doorframe',category:'STRUCTURE',
    width:3,depth:.3,cost:Object.freeze({[component('wood')]:5,[component('steel')]:3}),
    parts:Object.freeze([
      part(-1.34,1.30,0,.3,2.6,.26,'wood',true),
      part(1.34,1.30,0,.3,2.6,.26,'wood',true),
      part(0,2.48,0,3,.38,.26,'steel',true),
      part(0,2.72,-.18,3.12,.12,.12,'trim')
    ])}),
  Object.freeze({id:'roof',name:'Corrugated Roof',category:'STRUCTURE',
    width:3.1,depth:3.1,cost:Object.freeze({[component('wood')]:4,[component('steel')]:2}),
    needsSupport:true,parts:Object.freeze([
      part(0,2.81,0,3.15,.22,3.15,'steel',true),
      ...[-1.1,-.55,0,.55,1.1].map(x=>part(x,2.95,0,.08,.08,3.18,'trim'))
    ])}),
  Object.freeze({id:'bed',name:'Settler Bed',category:'BEDS',
    width:1.3,depth:2.1,cost:Object.freeze({[component('steel')]:2,[component('cloth')]:4}),
    stats:yieldStats({beds:1}),
    parts:Object.freeze([
      part(0,.28,0,1.28,.42,2.05,'steel',true),
      part(0,.52,.05,1.16,.15,1.65,'cloth'),
      part(0,.66,-.71,1.03,.14,.37,'pillow'),
      part(0,.75,-1,.09,.74,.12,'trim')
    ])}),
  Object.freeze({id:'barricade',name:'Defense Barricade',category:'DEFENSE',
    width:2.6,depth:.48,cost:Object.freeze({[component('steel')]:4,[component('wood')]:2}),
    stats:yieldStats({defense:1}),
    parts:Object.freeze([
      part(0,.6,0,2.6,1.2,.42,'steel',true),
      part(0,.95,-.23,2.65,.16,.1,'trim'),
      part(0,.34,-.23,2.65,.15,.1,'trim')
    ])}),
  Object.freeze({id:'lantern',name:'Standing Lantern',category:'UTILITY',
    width:.7,depth:.7,cost:Object.freeze({[component('steel')]:2,[component('copper')]:1,[component('glass')]:1}),
    parts:Object.freeze([
      part(0,.16,0,.60,.3,.60,'steel',true),
      part(0,1.15,0,.10,1.9,.10,'steel',true),
      part(0,2.13,0,.36,.46,.36,'glass'),
      part(0,2.42,0,.48,.16,.48,'trim')
    ])}),
  Object.freeze({id:'guardpost',name:'Lookout Guard Post',category:'DEFENSE',
    width:2,depth:2,cost:Object.freeze({[component('wood')]:7,[component('steel')]:5}),
    stats:yieldStats({defense:3}),parts:Object.freeze([
      part(0,.16,0,1.94,.32,1.94,'wood',true),
      ...[-.78,.78].flatMap(x=>[-.78,.78].map(z=>part(x,1.18,z,.14,2.05,.14,'rust',true))),
      part(0,2.25,0,2.12,.15,2.12,'roof',true),
      part(0,1.28,-.95,1.8,.47,.13,'steel',true),
      part(0,1.28,.95,1.8,.47,.13,'steel',true),
      part(0,1.28,-1.02,1.85,.05,.08,'trim')
    ])}),
  Object.freeze({id:'turret',name:'Automated Sentry Turret',category:'DEFENSE',
    width:1.45,depth:1.45,cost:Object.freeze({[component('steel')]:10,[component('gears')]:3,
      [component('circuitry')]:2,[component('copper')]:2}),
    stats:yieldStats({defense:8,powerDraw:2}),parts:Object.freeze([
      part(0,.18,0,1.25,.35,1.25,'steel',true),
      part(0,.83,0,.37,1.12,.37,'rust',true,'cylinder'),
      part(0,1.47,0,1.11,.48,.88,'steel',true),
      part(0,1.58,-.39,.78,.24,.31,'trim'),
      ...[-.23,.23].map(x=>part(x,1.46,-.87,.13,.13,1.26,'charcoal',false,'cylinder')),
      part(0,1.49,.49,.48,.29,.12,'glass')
    ])}),
  Object.freeze({id:'razorwire',name:'Scrap Wire Fence',category:'DEFENSE',
    width:2.9,depth:.40,cost:Object.freeze({[component('steel')]:5,[component('rubber')]:1}),
    stats:yieldStats({defense:1}),parts:Object.freeze([
      ...[-1.36,1.36].map(x=>part(x,.80,0,.1,1.6,.1,'rust',true)),
      ...[.31,.72,1.11,1.44].map(y=>part(0,y,0,2.9,.045,.08,'wire',false)),
      ...[-1,-.5,0,.5,1].map(x=>part(x,.84,0,.07,1.35,.07,'steel'))
    ])}),
  Object.freeze({id:'waterpump',name:'Hand Water Pump',category:'WATER',
    width:1.45,depth:1.45,cost:Object.freeze({[component('steel')]:6,
      [component('gears')]:2,[component('rubber')]:2}),
    stats:yieldStats({water:3}),parts:Object.freeze([
      part(0,.14,0,1.35,.27,1.35,'concrete',true),
      part(0,.88,0,.38,1.32,.38,'pipe',true,'cylinder'),
      part(0,1.53,0,.65,.35,.65,'steel',false,'cylinder'),
      part(.36,1.45,0,.75,.11,.11,'copper'),
      part(.66,1.23,0,.14,.55,.14,'rust'),
      part(-.24,.85,-.40,.13,.12,.8,'pipe',false,'cylinder')
    ])}),
  Object.freeze({id:'purifier',name:'Powered Water Purifier',category:'WATER',
    width:2.35,depth:1.75,cost:Object.freeze({[component('steel')]:12,
      [component('copper')]:4,[component('rubber')]:4,[component('circuitry')]:2}),
    stats:yieldStats({water:8,powerDraw:3}),parts:Object.freeze([
      part(0,.17,0,2.3,.34,1.72,'concrete',true),
      ...[-.68,.68].map(x=>part(x,.94,0,.62,1.34,.62,'pipe',true,'cylinder')),
      part(0,.91,-.45,1.86,.19,.38,'rust'),
      part(0,1.60,0,2.15,.12,1.55,'steel'),
      part(0,1.32,.70,.72,.52,.20,'charcoal'),
      ...[-.20,.20].map(x=>part(x,1.41,.82,.17,.16,.07,'signal'))
    ])}),
  Object.freeze({id:'watertank',name:'Rain Collection Tank',category:'WATER',
    width:1.9,depth:1.9,cost:Object.freeze({[component('steel')]:6,
      [component('plastic')]:3,[component('rubber')]:2}),
    stats:yieldStats({water:1}),parts:Object.freeze([
      part(0,.12,0,1.85,.24,1.85,'concrete',true),
      part(0,1.05,0,1.34,1.74,1.34,'tank',true,'cylinder'),
      part(0,1.96,0,1.52,.15,1.52,'steel',false,'cylinder'),
      ...[.43,1.36].map(y=>part(0,y,0,1.43,.10,1.43,'rust',false,'cylinder')),
      part(.91,1.17,.17,.65,.12,.12,'copper')
    ])}),
  Object.freeze({id:'garden',name:'Vegetable Garden',category:'FOOD',
    width:2.7,depth:2.7,cost:Object.freeze({[component('wood')]:5,
      [component('fertilizer')]:3}),
    stats:yieldStats({food:3}),parts:Object.freeze([
      part(0,.11,0,2.58,.20,2.58,'soil',true),
      ...[-1.24,1.24].flatMap(x=>[
        part(x,.22,0,.11,.32,2.65,'wood')]),
      ...[-1.24,1.24].map(z=>part(0,.22,z,2.6,.32,.10,'wood')),
      ...[-.79,0,.79].flatMap(x=>[-.72,0,.72].flatMap(z=>[
        part(x,.39,z,.19,.41,.19,'leaf',false,'cone'),
        part(x,.57,z,.28,.22,.28,'produce',false,'sphere')]))
    ])}),
  Object.freeze({id:'corn',name:'Corn Rows',category:'FOOD',
    width:2.8,depth:2.4,cost:Object.freeze({[component('wood')]:3,
      [component('fertilizer')]:4}),
    stats:yieldStats({food:4}),parts:Object.freeze([
      part(0,.09,0,2.76,.18,2.36,'soil',true),
      ...[-.9,0,.9].flatMap(x=>[-.67,.67].flatMap(z=>[
        part(x,.85,z,.12,1.5,.12,'stem',false,'cylinder'),
        part(x,1.19,z,.57,.91,.57,'leaf',false,'cone'),
        part(x,.92,z+.12,.21,.37,.21,'produce',false,'cylinder')]))
    ])}),
  Object.freeze({id:'planter',name:'Raised Food Planter',category:'FOOD',
    width:2.35,depth:1.32,cost:Object.freeze({[component('wood')]:6,
      [component('fertilizer')]:2,[component('steel')]:2}),
    stats:yieldStats({food:2}),parts:Object.freeze([
      part(0,.41,0,2.28,.72,1.27,'wood',true),
      part(0,.79,0,2.15,.08,1.12,'soil'),
      ...[-.66,0,.66].flatMap(x=>[-.33,.33].flatMap(z=>[
        part(x,1.04,z,.43,.52,.43,'leaf',false,'cone'),
        part(x,1.19,z,.18,.18,.18,'produce',false,'sphere')]))
    ])}),
  Object.freeze({id:'cot',name:'Canvas Field Cot',category:'BEDS',
    width:1.2,depth:2.15,cost:Object.freeze({[component('steel')]:2,
      [component('cloth')]:3}),
    stats:yieldStats({beds:1}),parts:Object.freeze([
      part(0,.29,0,1.12,.13,2.12,'cloth',true),
      ...[-.46,.46].flatMap(x=>[-.91,.91].map(z=>part(x,.18,z,.09,.36,.12,'steel',true))),
      part(0,.40,-.76,.91,.19,.39,'pillow')
    ])}),
  Object.freeze({id:'bunk',name:'Double Bunk Frame',category:'BEDS',
    width:1.4,depth:2.2,cost:Object.freeze({[component('steel')]:7,
      [component('cloth')]:6,[component('wood')]:2}),
    stats:yieldStats({beds:2}),parts:Object.freeze([
      ...[-.59,.59].flatMap(x=>[-.98,.98].map(z=>part(x,.94,z,.10,1.87,.1,'steel',true))),
      ...[.49,1.51].flatMap(y=>[
        part(0,y,0,1.37,.16,2.16,'wood',true),
        part(0,y+.12,.05,1.22,.10,1.87,'cloth'),
        part(0,y+.21,-.78,.98,.15,.37,'pillow')]),
      part(-.7,.97,0,.10,1.8,.10,'steel')
    ])}),
  Object.freeze({id:'generator',name:'Salvaged Generator',category:'POWER',
    width:2.2,depth:1.5,cost:Object.freeze({[component('steel')]:10,
      [component('copper')]:5,[component('gears')]:4,[component('oil')]:2}),
    stats:yieldStats({power:8}),parts:Object.freeze([
      part(0,.17,0,2.18,.33,1.47,'rust',true),
      part(0,.86,0,1.78,1.10,1.15,'charcoal',true),
      ...[-.65,-.35,-.05,.25,.55].map(x=>part(x,1.20,-.59,.09,.34,.10,'steel')),
      part(-.42,1.49,.28,.56,.19,.59,'copper'),
      part(.53,1.54,0,.32,.23,.30,'steel',false,'cylinder'),
      part(.58,.79,-.65,.35,.36,.10,'signal')
    ])}),
  Object.freeze({id:'solar',name:'Scrap Solar Array',category:'POWER',
    width:2.65,depth:2.15,cost:Object.freeze({[component('aluminum')]:7,
      [component('copper')]:4,[component('glass')]:4,[component('circuitry')]:1}),
    stats:yieldStats({power:4}),parts:Object.freeze([
      ...[-.98,.98].map(x=>part(x,.78,0,.13,1.48,.13,'steel',true)),
      part(0,1.57,0,2.58,.13,2.08,'solar',false),
      ...[-.77,-.25,.27,.79].map(z=>part(0,1.66,z,2.51,.035,.035,'trim')),
      ...[-.96,-.32,.32,.96].map(x=>part(x,1.67,0,.035,.035,2.06,'trim'))
    ])}),
  Object.freeze({id:'beacon',name:'Recruitment Radio Beacon',category:'UTILITY',
    width:1.32,depth:1.32,cost:Object.freeze({[component('steel')]:7,
      [component('copper')]:4,[component('circuitry')]:2,[component('glass')]:1}),
    stats:yieldStats({beacon:1,powerDraw:2}),parts:Object.freeze([
      part(0,.29,0,1.28,.58,1.28,'rust',true),
      part(0,1.47,0,.12,2.18,.12,'steel',true),
      part(0,2.44,0,.95,.14,.95,'steel',false,'cylinder'),
      part(0,2.65,0,.57,.26,.57,'signal',false,'sphere'),
      part(0,.84,-.64,.72,.65,.13,'charcoal'),
      part(0,1.04,-.72,.22,.16,.1,'glass'),
      ...[-.2,0,.2].map(x=>part(x,.63,-.73,.09,.10,.06,'copper'))
    ])}),
  Object.freeze({id:'storage',name:'Weathered Supply Locker',category:'UTILITY',
    width:1.12,depth:.87,cost:Object.freeze({[component('steel')]:6,
      [component('wood')]:1}),
    parts:Object.freeze([
      part(0,1.06,0,1.1,2.1,.85,'rust',true),
      part(0,1.07,-.44,.96,1.91,.07,'steel'),
      part(.31,1.10,-.5,.06,.29,.07,'trim'),
      ...[.45,.78,1.42,1.74].map(y=>part(0,y,-.49,.7,.035,.08,'charcoal'))
    ])}),
  Object.freeze({id:'floodlight',name:'Workshop Floodlight',category:'UTILITY',
    width:.85,depth:.85,cost:Object.freeze({[component('steel')]:4,
      [component('copper')]:2,[component('glass')]:2}),
    stats:yieldStats({powerDraw:1}),parts:Object.freeze([
      part(0,.11,0,.82,.20,.82,'concrete',true),
      part(0,1.58,0,.11,2.85,.11,'steel',true),
      part(0,2.87,-.12,.88,.57,.36,'charcoal'),
      part(0,2.88,-.33,.73,.42,.045,'glass'),
      part(0,3.19,-.12,1.05,.10,.50,'rust')
    ])}),
  Object.freeze({id:'weaponbench',name:'Weapon Mod Workbench',category:'WORKSHOP',
    width:2.5,depth:1.45,cost:Object.freeze({[component('wood')]:6,
      [component('steel')]:7,[component('gears')]:2,[component('screw')]:3}),
    parts:Object.freeze([
      ...[-1.03,1.03].flatMap(x=>[-.49,.49].map(z=>part(x,.53,z,.14,1.04,.14,'steel',true))),
      part(0,1.04,0,2.45,.18,1.40,'wood',true),
      part(0,.76,.6,2.4,.38,.15,'rust',true),
      part(-.75,1.22,-.22,.57,.17,.42,'steel'),
      part(-.98,1.38,-.19,.12,.29,.42,'rust'),
      part(-.53,1.36,-.19,.13,.28,.41,'steel'),
      part(.55,1.22,-.15,.88,.19,.34,'charcoal'),
      ...[-.55,-.30,-.05,.20].map(z=>part(.52,1.35,z,.06,.12,.035,'copper')),
      part(.83,1.29,-.33,.13,.30,.13,'steel',false,'cylinder')
    ])}),
  Object.freeze({id:'powerstation',name:'Power Armor Service Rack',category:'WORKSHOP',
    width:3.4,depth:3.0,cost:Object.freeze({[component('steel')]:14,
      [component('gears')]:5,[component('copper')]:4,[component('concrete')]:4}),
    parts:Object.freeze([
      // Yellow industrial A-frame, suspended hoist and articulated side arms.
      // The open middle is intentionally large enough to frame a parked suit.
      ...[-1.44,1.44].map(x=>part(x,.16,.92,.54,.30,.62,'concrete',true)),
      ...[-1.44,1.44].map(x=>part(x,.18,-1.13,.57,.34,.68,'rust',true)),
      ...[-1.43,1.43].map(x=>part(x,1.80,.94,.25,3.52,.31,'gantry',true,'box',x>0?-.08:.08)),
      ...[-1.43,1.43].map(x=>part(x,1.87,-.75,.19,3.35,.21,'gantry',false,'box',0,.43)),
      part(0,3.57,.92,3.30,.34,.46,'gantry',true),
      part(0,3.36,.64,2.97,.13,.17,'hazard'),
      ...[-1.23,-.74,-.25,.24,.73,1.22].map(x=>
        part(x,3.37,.53,.12,.14,.035,'charcoal',false,'box',-.50)),
      ...[-1.44,1.44].map(x=>part(x,2.80,.94,.64,.20,.41,'rust')),
      ...[-1.33,1.33].map(x=>part(x,1.38,.85,.27,1.20,.22,'steel')),
      part(0,3.21,.95,.94,.45,.66,'charcoal'),
      part(0,2.87,.95,.46,.37,.45,'steel',false,'cylinder'),
      part(0,2.42,.95,.075,.69,.075,'chain',false,'cylinder'),
      part(0,2.05,.95,.19,.24,.19,'chrome',false,'cylinder'),
      part(0,1.83,.95,.31,.35,.12,'chrome',false,'torus'),
      ...[-1,1].flatMap(side=>[
        part(side*1.13,2.21,.21,.16,1.26,.18,'gantry',false,'box',side*.47),
        part(side*.91,1.92,.10,.58,.20,.23,'steel',false),
        part(side*.69,1.88,.07,.39,.13,.16,'chrome',false,'cylinderX'),
        part(side*1.21,1.20,.62,.17,1.24,.16,'rust',false,'box',-side*.40),
        part(side*1.25,.66,-.85,.30,.18,.34,'hazard',true),
        part(side*1.40,.44,-.85,.20,.11,.26,'gantry')
      ]),
      part(0,.16,.88,2.89,.12,.46,'rust',true),
      ...[-.95,.95].map(x=>part(x,.26,1.00,.22,.14,.51,'hazard')),
      part(0,3.62,.58,.94,.08,.16,'chrome'),
      part(0,3.57,.47,.17,.10,.17,'signal')
    ])}),
  Object.freeze({id:'scrapbench',name:'Salvage Sorting Table',category:'WORKSHOP',
    legacy:true,
    width:2.25,depth:1.58,cost:Object.freeze({[component('wood')]:5,
      [component('steel')]:5,[component('screw')]:2}),
    parts:Object.freeze([
      ...[-.95,.95].flatMap(x=>[-.58,.58].map(z=>part(x,.49,z,.14,.96,.14,'rust',true))),
      part(0,.97,0,2.22,.17,1.55,'steel',true),
      part(-.62,1.16,-.25,.70,.25,.63,'wood'),
      part(.53,1.19,.19,.64,.34,.49,'charcoal'),
      ...[-.38,.01,.40].map(x=>part(x,1.15,-.68,.19,.30,.23,'rust')),
      part(.87,1.16,-.19,.13,.33,.48,'copper'),
      part(0,.36,.63,1.87,.52,.11,'wood')
    ])})
]);
const junk=(id,name,x,z,materials,parts)=>Object.freeze({id,name,x,z,
  materials:Object.freeze(materials),parts:Object.freeze(parts)});
// These are actual existing objects in Haven, not free resource crates.
// IDs are stable across game versions so each object can be scrapped once.
export const HAVEN_JUNK_SITES=Object.freeze([
  junk('depot-barrel','CRUSHED FUEL DRUM',-46,-29,
    {[component('steel')]:3,[component('oil')]:1},[
      part(0,.44,0,.76,.87,.76,'rust',true,'cylinder'),
      part(0,.77,0,.82,.1,.82,'steel',false,'cylinder'),
      part(0,.17,0,.82,.10,.82,'steel',false,'cylinder')]),
  junk('depot-pallet','ROTTEN WOOD PALLET',-35,-32,
    {[component('wood')]:5,[component('screw')]:1},[
      ...[-.77,0,.77].map(x=>part(x,.16,0,.43,.15,1.63,'wood',true)),
      ...[-.60,.60].map(z=>part(0,.06,z,2.15,.12,.16,'trim'))]),
  junk('broken-pipe','SEVERED PIPE SECTION',-51,-13,
    {[component('steel')]:3,[component('copper')]:2},[
      part(0,.34,0,1.89,.48,.48,'pipe',true,'cylinderX'),
      part(-.77,.35,0,.17,.61,.62,'rust'),
      part(.70,.35,0,.17,.61,.62,'rust')]),
  junk('old-tires','PILE OF WORN TIRES',-53,-22,
    {[component('rubber')]:5,[component('steel')]:1},[
      ...[.20,.55,.90].map(y=>part(0,y,0,1.1,.27,1.1,'charcoal',true,'torus')),
      part(0,.93,0,.72,.08,.72,'rust',false,'cylinder')]),
  junk('failed-fan','BROKEN VENTILATION FAN',-26,-30,
    {[component('steel')]:4,[component('gears')]:2,[component('copper')]:1},[
      part(0,.25,0,1.48,.49,1.24,'rust',true),
      part(0,.53,0,.95,.17,.95,'steel',false,'cylinder'),
      ...[-.34,.34].map(x=>part(x,.59,0,.25,.05,1.02,'charcoal')),
      ...[-.35,.35].map(z=>part(0,.60,z,.85,.06,.16,'trim'))]),
  junk('radio-husk','SHATTERED RADIO CONSOLE',-29,-11,
    {[component('circuitry')]:1,[component('copper')]:2,[component('steel')]:2},[
      part(0,.34,0,1.06,.64,.79,'charcoal',true),
      part(-.19,.65,-.39,.54,.26,.07,'glass'),
      ...[.17,.40].map(x=>part(x,.41,-.42,.1,.11,.09,'copper'))]),
  junk('scrap-crate','SPLINTERED CARGO CRATE',-31,-28,
    {[component('wood')]:4,[component('steel')]:2},[
      part(0,.38,0,1.26,.71,1.26,'wood',true),
      ...[-.56,.56].map(x=>part(x,.40,-.65,.10,.69,.11,'rust')),
      part(0,.61,.57,1.2,.12,.17,'trim')]),
  junk('burnt-motor','BURNT ELECTRIC MOTOR',-44,-33,
    {[component('steel')]:4,[component('copper')]:3,[component('gears')]:2},[
      part(0,.24,0,1.35,.45,1.06,'rust',true),
      part(0,.61,0,.82,.56,.82,'steel',true,'cylinder'),
      ...[-.32,-.16,0,.16,.32].map(x=>part(x,.69,-.46,.09,.38,.1,'copper'))]),
  // Unlike quest contacts or vendors, these old settlement fixtures are
  // intentionally scrappable. Future prefab fixtures must register here.
  junk('original-weapon-bench','OLD HAVEN WEAPON WORKBENCH',-33,-21,
    {[component('wood')]:4,[component('steel')]:5,[component('screw')]:2},[
      part(0,.47,0,2,.94,.82,'charcoal',true),
      part(0,.99,0,2.2,.12,1.04,'wood',true),
      part(-.52,1.12,0,.4,.15,.35,'steel'),
      part(-.59,1.23,0,.09,.30,.32,'hazard'),
      part(-.34,1.20,0,.075,.26,.32,'rust'),
      part(.30,1.12,0,.55,.07,.28,'steel'),
      part(.60,1.26,-.23,.08,.38,.12,'rust'),
      part(.43,1.37,-.23,.23,.07,.16,'steel'),
      part(.16,1.11,.29,.31,.065,.18,'rust')]),
  junk('shack-floor','ROTTEN SHACK FLOOR',-51,-32,
    {[component('wood')]:5,[component('screw')]:1},[
      part(0,.18,0,3.22,.33,2.35,'wood',true),
      ...[-1,0,1].map(x=>part(x,.37,0,.13,.045,2.3,'trim'))]),
  junk('shack-walls','RUINED SHACK WALLS',-51,-32,
    {[component('wood')]:7,[component('steel')]:2},[
      ...[-1.49,1.49].map(x=>part(x,1.29,0,.16,2.22,2.34,'wood',true)),
      part(0,1.26,1.05,3.06,2.18,.15,'wood',true),
      ...[-1.50,1.50].map(x=>part(x,1.24,-1.09,.18,2.18,.15,'rust',true)),
      part(0,2.24,-1.09,3.16,.16,.15,'rust',true),
      part(.88,1.36,1.16,.66,.55,.09,'charcoal')]),
  junk('shack-roof','CORRODED SHACK ROOF',-51,-32,
    {[component('steel')]:5,[component('wood')]:2},[
      part(0,2.48,0,3.43,.19,2.56,'roof',true),
      ...[-1.28,-.64,0,.64,1.28].map(x=>
        part(x,2.61,0,.065,.08,2.57,'trim'))])
]);
export const HAVEN_JUNK_BY_ID=Object.freeze(Object.fromEntries(
  HAVEN_JUNK_SITES.map(site=>[site.id,site])));
export const SETTLEMENT_BY_ID=Object.freeze(Object.fromEntries(
  SETTLEMENT_BLUEPRINTS.map(plan=>[plan.id,plan])));
const finite=Number.isFinite;
const rotateQuarter=(x,z,rotation)=>{
  switch(((rotation%4)+4)%4){
    case 1:return {x:z,z:-x};
    case 2:return {x:-x,z:-z};
    case 3:return {x:-z,z:x};
    default:return {x,z};
  }
};
export function snappedBuildPosition(x,z,snap=true){
  return {x:snap?Math.round(x*2)/2:x,z:snap?Math.round(z*2)/2:z};
}
export function buildWorldBoxes(placement,{onlySolid=false}={}){
  const plan=SETTLEMENT_BY_ID[placement?.type];
  if(!plan)return [];
  const rotated=placement.rotation%2!==0;
  return plan.parts.filter(piece=>!onlySolid||piece.solid).map(piece=>{
    const p=rotateQuarter(piece.x,piece.z,placement.rotation);
    const w=rotated?piece.d:piece.w,d=rotated?piece.w:piece.d;
    return {minX:placement.x+p.x-w/2,maxX:placement.x+p.x+w/2,
      minZ:placement.z+p.z-d/2,maxZ:placement.z+p.z+d/2,
      bottom:piece.y-piece.h/2,top:piece.y+piece.h/2};
  });
}
function overlaps(a,b){
  const bottom=finite(b.bottom)?b.bottom:0;
  const top=finite(b.top)?b.top:finite(b.height)?bottom+b.height:Infinity;
  return a.minX<b.maxX-.025&&a.maxX>b.minX+.025&&
    a.minZ<b.maxZ-.025&&a.maxZ>b.minZ+.025&&
    a.bottom<top-.025&&a.top>bottom+.025;
}
export const RECRUITMENT_INTERVAL=55;
export function initialSettlementBuildState(){
  return {version:4,nextId:1,snap:true,structures:[],storedStructures:{},population:0,
    happiness:50,recruitProgress:0,scrappedJunk:[]};
}
export function safeSettlementBuildSnapshot(raw){
  const state=initialSettlementBuildState();
  if(!raw||typeof raw!=='object')return state;
  state.snap=raw.snap!==false;
  if(Number.isInteger(raw.population))
    state.population=Math.min(12,Math.max(0,raw.population));
  if(finite(raw.happiness))
    state.happiness=Math.min(100,Math.max(0,raw.happiness));
  if(finite(raw.recruitProgress))
    state.recruitProgress=Math.min(RECRUITMENT_INTERVAL,Math.max(0,raw.recruitProgress));
  if(Array.isArray(raw.scrappedJunk))
    state.scrappedJunk=[...new Set(raw.scrappedJunk.filter(id=>
      typeof id==='string'&&HAVEN_JUNK_BY_ID[id]))].slice(0,HAVEN_JUNK_SITES.length);
  if(raw.storedStructures&&typeof raw.storedStructures==='object'&&
      !Array.isArray(raw.storedStructures)){
    let remaining=BUILD_LIMIT;
    for(const plan of SETTLEMENT_BLUEPRINTS){
      const quantity=raw.storedStructures[plan.id];
      if(!Number.isSafeInteger(quantity)||quantity<1)continue;
      const valid=Math.min(quantity,remaining);
      if(valid>0)state.storedStructures[plan.id]=valid;
      remaining-=valid;
      if(!remaining)break;
    }
  }
  if(!Array.isArray(raw.structures))return state;
  const seen=new Set();
  for(const item of raw.structures.slice(0,BUILD_LIMIT)){
    if(!item||!SETTLEMENT_BY_ID[item.type]||!finite(item.x)||!finite(item.z)||
      !Number.isInteger(item.rotation)||!Number.isInteger(item.id)||item.id<1||
      seen.has(item.id))continue;
    const placement={id:item.id,type:item.type,x:item.x,z:item.z,
      rotation:((item.rotation%4)+4)%4};
    if(!isWithinHavenBuildArea(placement)||
      validateBuildPlacement(state,placement).ok===false)continue;
    state.structures.push(placement);seen.add(placement.id);
  }
  state.nextId=Math.max(1,...state.structures.map(s=>s.id+1));
  return state;
}
export function settlementCategoryBlueprints(category,state=null){
  return SETTLEMENT_BLUEPRINTS.filter(plan=>plan.category===category&&
    (!plan.legacy||storedStructureCount(state,plan.id)>0));
}
export function storedStructureCount(state,type){
  if(!SETTLEMENT_BY_ID[type])return 0;
  const count=state?.storedStructures?.[type];
  return Number.isSafeInteger(count)&&count>0?Math.min(BUILD_LIMIT,count):0;
}
export function scrapHavenJunk(state,backpack,id){
  const site=HAVEN_JUNK_BY_ID[id];
  if(!site)return {ok:false,reason:'THIS OBJECT CANNOT BE SCRAPPED'};
  state.scrappedJunk??=[];
  if(state.scrappedJunk.includes(id))
    return {ok:false,reason:'THIS JUNK WAS ALREADY SALVAGED'};
  // Materials are inventory components, not spawned resources or caps.
  // Reject a full material stack rather than silently destroy its yield.
  for(const [itemId,count] of Object.entries(site.materials))
    if(countItem(backpack,itemId)>999999-count)
      return {ok:false,reason:'MATERIAL STORAGE FULL'};
  for(const [itemId,count] of Object.entries(site.materials))
    addItem(backpack,itemId,count);
  state.scrappedJunk.push(id);
  return {ok:true,site,materials:site.materials};
}
export function calculateSettlementStats(state){
  let beds=0,food=0,water=0,defense=0,power=0,powerDraw=0,beacons=0;
  const structures=Array.isArray(state?.structures)?state.structures:[];
  for(const structure of structures){
    const stats=SETTLEMENT_BY_ID[structure.type]?.stats||{};
    beds+=stats.beds||0;power+=stats.power||0;
    powerDraw+=stats.powerDraw||0;
  }
  const powered=power>=powerDraw;
  for(const structure of structures){
    const stats=SETTLEMENT_BY_ID[structure.type]?.stats||{};
    beacons+=stats.beacon||0;
    if(!stats.powerDraw||powered){
      food+=stats.food||0;water+=stats.water||0;
      defense+=stats.defense||0;
    }
  }
  const population=Math.max(0,Math.floor(state?.population||0));
  const hasRoom=beds>population&&food>population&&water>population;
  const recruiting=beacons>0&&powered&&hasRoom;
  const sufficient=population===0||beds>=population&&
    food>=population&&water>=population;
  const targetHappiness=population===0?50:Math.max(5,Math.min(95,
    45+(beds>=population?9:-16)+(food>=population?12:-22)+
    (water>=population?12:-22)+(defense>=population*2?10:-7)+
    (powered?7:-10)));
  return {population,beds,food,water,defense,power,powerDraw,
    powerBalance:power-powerDraw,powered,beacons,recruiting,
    hasRoom,sufficient,targetHappiness,happiness:Math.round(state?.happiness??50),
    recruitProgress:Math.max(0,state?.recruitProgress||0)};
}
export function advanceSettlement(state,deltaSeconds){
  if(!Number.isFinite(deltaSeconds)||deltaSeconds<=0)
    return {recruited:0,stats:calculateSettlementStats(state)};
  const dt=Math.min(4,deltaSeconds);
  let stats=calculateSettlementStats(state),recruited=0;
  state.happiness+=Math.max(-dt*.42,Math.min(dt*.42,
    stats.targetHappiness-state.happiness));
  if(stats.recruiting){
    state.recruitProgress+=dt;
    if(state.recruitProgress>=RECRUITMENT_INTERVAL){
      state.recruitProgress-=RECRUITMENT_INTERVAL;
      state.population++;recruited=1;
      stats=calculateSettlementStats(state);
    }
  }else state.recruitProgress=0;
  return {recruited,stats:calculateSettlementStats(state)};
}
export function isWithinHavenBuildArea(placement){
  const plan=SETTLEMENT_BY_ID[placement?.type];
  if(!plan)return false;
  const swap=placement.rotation%2!==0;
  const w=swap?plan.depth:plan.width,d=swap?plan.width:plan.depth;
  return placement.x-w/2>=HAVEN_BUILD_AREA.minX&&
    placement.x+w/2<=HAVEN_BUILD_AREA.maxX&&
    placement.z-d/2>=HAVEN_BUILD_AREA.minZ&&
    placement.z+d/2<=HAVEN_BUILD_AREA.maxZ;
}
export function validateBuildPlacement(state,placement,staticObstacles=[],player=null){
  const plan=SETTLEMENT_BY_ID[placement?.type];
  if(!plan||!finite(placement.x)||!finite(placement.z)||
    !Number.isInteger(placement.rotation))return {ok:false,reason:'UNKNOWN BLUEPRINT'};
  if(!isWithinHavenBuildArea(placement))return {ok:false,reason:'OUTSIDE HAVEN BUILD AREA'};
  if(state.structures.length>=BUILD_LIMIT)return {ok:false,reason:'SETTLEMENT BUILD LIMIT REACHED'};
  if(placement.type==='foundation'){
    const floor=buildWorldBoxes(placement)[0];
    if(state.structures.some(s=>s.type==='foundation'&&
      overlaps(floor,buildWorldBoxes(s)[0])))
      return {ok:false,reason:'FOUNDATION ALREADY OCCUPIES THIS SPACE'};
  }
  if(plan.needsSupport&&!state.structures.some(s=>
    (s.type==='wall'||s.type==='doorway')&&
    Math.hypot(s.x-placement.x,s.z-placement.z)<2.6))
    return {ok:false,reason:'ROOF NEEDS A NEARBY WALL OR DOORFRAME'};
  const solids=buildWorldBoxes(placement,{onlySolid:true});
  const occupied=[...staticObstacles,...state.structures.flatMap(s=>
    buildWorldBoxes(s,{onlySolid:true}))];
  if(solids.some(a=>occupied.some(b=>overlaps(a,b))))
    return {ok:false,reason:'STRUCTURE WOULD OVERLAP AN OBSTACLE'};
  if(player&&solids.some(b=>b.bottom<1.9&&b.top>.3&&
    player.x>b.minX-.4&&player.x<b.maxX+.4&&
    player.z>b.minZ-.4&&player.z<b.maxZ+.4))
    return {ok:false,reason:'MOVE OUT OF THE PLACEMENT AREA'};
  return {ok:true};
}
export function missingBuildingMaterials(backpack,type){
  const plan=SETTLEMENT_BY_ID[type];
  return plan?Object.entries(plan.cost).filter(([id,amount])=>
    countItem(backpack,id)<amount).map(([id,amount])=>({
    id,needed:amount,owned:countItem(backpack,id)})):[];
}
export function placeSettlementStructure(state,backpack,placement,staticObstacles=[],player=null){
  if(SETTLEMENT_BY_ID[placement?.type]?.legacy&&
      !storedStructureCount(state,placement.type))
    return {ok:false,reason:'THIS WORKSTATION IS NO LONGER PLACEABLE'};
  const result=validateBuildPlacement(state,placement,staticObstacles,player);
  if(!result.ok)return result;
  const stored=storedStructureCount(state,placement.type)>0;
  const missing=stored?[]:missingBuildingMaterials(backpack,placement.type);
  if(missing.length)return {ok:false,reason:'NOT ENOUGH SALVAGED MATERIALS',missing};
  const plan=SETTLEMENT_BY_ID[placement.type];
  if(stored){
    state.storedStructures[placement.type]--;
    if(!state.storedStructures[placement.type])delete state.storedStructures[placement.type];
  }else for(const [id,amount] of Object.entries(plan.cost))
    spendMaterial(backpack,id,amount);
  const saved={id:state.nextId++,type:placement.type,x:placement.x,
    z:placement.z,rotation:placement.rotation};
  state.structures.push(saved);
  return {ok:true,structure:saved,fromStorage:stored};
}
function removableSettlementStructure(state,id,action){
  const index=state.structures.findIndex(s=>s.id===id);
  if(index<0)return {ok:false,reason:'NO SETTLEMENT STRUCTURE SELECTED'};
  const structure=state.structures[index];
  const remaining=state.structures.filter(s=>s.id!==id);
  if((structure.type==='wall'||structure.type==='doorway')&&remaining.some(roof=>
    roof.type==='roof'&&!remaining.some(s=>
      (s.type==='wall'||s.type==='doorway')&&
      Math.hypot(s.x-roof.x,s.z-roof.z)<2.6)))
    return {ok:false,reason:action+' THE UNSUPPORTED ROOF FIRST'};
  return {ok:true,index,structure};
}
export function storeSettlementStructure(state,backpack,id){
  const target=removableSettlementStructure(state,id,'STORE');
  if(!target.ok)return target;
  const {index,structure}=target;
  state.storedStructures??={};
  const inStorage=Object.values(state.storedStructures).reduce((sum,n)=>
    sum+(Number.isInteger(n)&&n>0?n:0),0);
  if(inStorage>=BUILD_LIMIT)return {ok:false,reason:'SETTLEMENT STORAGE IS FULL'};
  state.structures.splice(index,1);
  state.storedStructures[structure.type]=storedStructureCount(state,structure.type)+1;
  // No component refund: the actual object is intact in workshop storage.
  return {ok:true,structure,storedCount:state.storedStructures[structure.type]};
}
export function scrapSettlementStructure(state,backpack,id){
  const target=removableSettlementStructure(state,id,'SCRAP');
  if(!target.ok)return target;
  const {index,structure}=target;
  // Breaking a built object into usable parts recovers roughly half of its
  // original materials. F/STORE instead returns the full construction cost.
  const materials=Object.fromEntries(Object.entries(SETTLEMENT_BY_ID[structure.type].cost)
    .map(([itemId,amount])=>[itemId,Math.max(1,Math.floor(amount*.5))]));
  if(Object.entries(materials).some(([itemId,amount])=>
      countItem(backpack,itemId)>999999-amount))
    return {ok:false,reason:'MATERIAL STORAGE FULL'};
  state.structures.splice(index,1);
  for(const [itemId,amount] of Object.entries(materials))
    addItem(backpack,itemId,amount);
  return {ok:true,structure,materials};
}
export function undoLastSettlementStructure(state,backpack){
  if(!state.structures.length)return {ok:false,
    reason:'NO SETTLEMENT STRUCTURES TO UNDO'};
  return storeSettlementStructure(state,backpack,
    state.structures[state.structures.length-1].id);
}
