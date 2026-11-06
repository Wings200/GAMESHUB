// W20.61 — Developer-only family/component balance editor.
// Single authoritative item+part catalog; server validates every published ID.
import {DEFAULT_GAME_VARIABLES} from '../game-balance.mjs';
import {VARIABLE_CATEGORIES,VARIABLE_FIELDS} from '../balance-schema.mjs';
import {MOD_SLOTS,MOD_SLOT_LABELS} from '../weapon-mods.mjs';
import {ARMOR_SLOTS,ARMOR_SLOT_LABELS} from '../combat.mjs';
import {DEV_ITEM_CATALOG} from '../dev-grants.mjs';
const api='/api/dev/settings';
const clone=value=>JSON.parse(JSON.stringify(value));
const categoryNames=Object.fromEntries(VARIABLE_CATEGORIES);
const get=(root,id)=>root.querySelector('#'+id);
const human=s=>s.replace(/([A-Z])/g,' $1').replaceAll('_',' ');
const byCategory=Object.freeze(Object.fromEntries(Object.entries(DEFAULT_GAME_VARIABLES)
  .map(([cat,list])=>[cat,Object.freeze(Object.fromEntries(list.map(i=>[i.id,i])))])));
const SLOT_ORDER=Object.freeze({weapons:['base',...MOD_SLOTS],
  armor:['base',...ARMOR_SLOTS]});
const slotName=(cat,slot)=>slot==='base'?
  cat==='weapons'?'BASE WEAPON':'BASE MODEL':
  cat==='weapons'?(MOD_SLOT_LABELS[slot]||human(slot)):
    (ARMOR_SLOT_LABELS[slot]||human(slot)).toUpperCase();
function families(cat){
  const groups=new Map();
  for(const entry of DEFAULT_GAME_VARIABLES[cat]){
    const id=entry.parentId||entry.id;
    if(!groups.has(id))groups.set(id,{id,
      name:entry.parentName||entry.name,group:entry.group,
      children:[],search:''});
    const family=groups.get(id);
    family.children.push(entry);
    family.search+=(entry.name+' '+entry.id+' '+entry.description+' ').toLowerCase();
  }
  return [...groups.values()].sort((a,b)=>
    a.group.localeCompare(b.group)||a.name.localeCompare(b.name));
}
const catalogFamilies=Object.freeze(Object.fromEntries(
  VARIABLE_CATEGORIES.map(([id])=>[id,families(id)])));

export function startGameSettingsUI(initial){
  let version=initial?.ok?initial.version:null;
  let changes=clone(initial?.changes||{});
  let defaults=clone(initial?.defaults||{});
  let draft=clone(changes);
  let category='weapons',selectedFamily=catalogFamilies.weapons[0]?.id||null;
  let selectedSlot='base',selectedId=null,search='';
  let open=false,publishing=false,reloading=false,root=null;
  let grantMode=false,grantSearch='',grantItemId=DEV_ITEM_CATALOG[0]?.id||null,
    granting=false;
  const dirty=()=>JSON.stringify(draft)!==JSON.stringify(changes);
  const count=cat=>Object.keys(draft[cat]||{}).length;
  const entry=()=>byCategory[category]?.[selectedId]||null;
  const currentFamily=()=>catalogFamilies[category]?.find(f=>f.id===selectedFamily)||null;
  const baseline=(cat,id,field,factory)=>defaults[cat]?.[id]?.[field]??factory;
  const value=(cat,id,field,factory)=>draft[cat]?.[id]?.[field]??factory;
  function status(message){get(root,'gh-dev-status').textContent=message;}
  function setItemPatch(cat,id,patch){
    const group=draft[cat]||={};
    if(patch&&Object.keys(patch).length)group[id]=patch;
    else delete group[id];
    if(!Object.keys(group).length)delete draft[cat];
  }
  function updateNumber(field,input){
    const item=entry(),bound=VARIABLE_FIELDS[category]?.[field];
    const text=input.trim(),n=Number(text);
    if(!item||!bound||text===''||!Number.isFinite(n)||
      n<bound[0]||n>bound[1]||(bound[2]===1&&!Number.isInteger(n))){
      status('INVALID VALUE · CHECK THE ALLOWED RANGE.');return false;
    }
    const patch={...(draft[category]?.[item.id]||{})};
    if(n===item.fields[field])delete patch[field];
    else patch[field]=n;
    setItemPatch(category,item.id,patch);
    status(dirty()?'UNSAVED CHANGES · SAVE & PUBLISH WHEN READY.':
      'NO PENDING CHANGES.');
    get(root,'gh-dev-save').disabled=!dirty()||publishing;
    renderCategories();renderFamilies();
    return true;
  }
  function showReloadNotice(){
    if(reloading)return;
    reloading=true;
    window.dispatchEvent(new Event('gameshub-before-balance-reload'));
    const notice=document.createElement('div');
    notice.id='gh-game-updating';notice.setAttribute('role','status');
    notice.innerHTML='<div class="gh-update-spinner"></div><div><strong>UPDATING GAME</strong>'+
      '<p>New developer settings are available. Saving progress and refreshing...</p></div>';
    document.body.append(notice);
    setTimeout(()=>location.reload(),2400);
  }
  async function checkVersion(){
    if(reloading||publishing)return;
    try{
      const response=await fetch(api,{cache:'no-store',credentials:'same-origin'});
      if(!response.ok)return;
      const result=await response.json();
      if(result.ok&&version!==null&&result.version!==version)showReloadNotice();
    }catch{ /* Offline users remain able to play. */ }
  }
  setInterval(checkVersion,15000);
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')checkVersion();
  });
  // The server is authoritative; a forged username must never show the editor.
  if(!initial?.admin)return;
  const style=document.createElement('style');
  style.textContent=[
    '#gh-dev-launch{position:fixed;right:18px;top:18px;z-index:9000;background:#d9ae69;color:#12211e;border:1px solid #ffdc9b;padding:11px 16px;border-radius:9px;font:900 12px system-ui;letter-spacing:.1em;cursor:pointer}',
    '#gh-dev-root{position:fixed;inset:0;z-index:99990;display:none;color:#e5eee6;font:14px/1.5 system-ui;background:rgba(4,12,14,.94);backdrop-filter:blur(11px)}',
    '#gh-dev-root.gh-open{display:flex;align-items:center;justify-content:center;padding:clamp(6px,2vw,25px)}',
    '#gh-dev-root *{box-sizing:border-box}',
    '#gh-dev-shell{width:min(1480px,100%);height:min(940px,97vh);display:flex;flex-direction:column;background:#10211f;border:1px solid #4e755f;border-radius:13px;box-shadow:0 30px 95px #000d;overflow:hidden}',
    '.gh-dev-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 25px;border-bottom:1px solid #305246;background:#172e29}',
    '.gh-dev-eyebrow{font-size:10px;font-weight:900;letter-spacing:.17em;color:#d9b67f}',
    '.gh-dev-head h2{font-size:23px;margin:4px 0 0;letter-spacing:.03em;color:#f1f4e9}',
    '.gh-dev-grid{display:grid;grid-template-columns:192px 286px minmax(0,1fr);min-height:0;flex:1}',
    '.gh-dev-side,.gh-dev-items{overflow:auto;border-right:1px solid #305246;padding:16px 12px;background:#142a25}',
    '.gh-dev-side{background:#0e211f}',
    '.gh-dev-navtitle{display:block;padding:10px;color:#b9d3bd;font-size:11px;font-weight:900;letter-spacing:.14em}',
    '.gh-dev-cat{width:100%;text-align:left;display:flex;justify-content:space-between;gap:8px;background:none;border:1px solid transparent;color:#b2c9bd;padding:12px 11px;margin:3px 0;border-radius:7px;cursor:pointer;font-weight:800;font-size:12px}',
    '.gh-dev-cat:hover{background:#243c35}.gh-dev-cat.active{background:#2b5141;border-color:#4e8168;color:#f1d4a2}',
    '.gh-dev-cat b{font-size:10px;background:#18362d;padding:2px 6px;border-radius:8px}',
    '.gh-dev-breadcrumb{font-size:11px;font-weight:900;letter-spacing:.1em;color:#d8b57d;padding:4px 8px 12px}',
    '.gh-dev-search{width:100%;padding:12px;background:#071b1b;color:#fff;border:1px solid #517666;border-radius:7px;outline:none}',
    '.gh-dev-itemgroup{margin:17px 4px 8px;font-size:10px;font-weight:900;letter-spacing:.12em;color:#8eaca0}',
    '.gh-dev-item{display:block;width:100%;text-align:left;background:#1d352e;border:1px solid #2b5144;border-radius:7px;margin:6px 0;padding:10px 12px;color:#d8e9d8;cursor:pointer}',
    '.gh-dev-item.selected{border-color:#debd83;background:#2e4638}',
    '.gh-dev-item strong{display:block;font-size:12px}.gh-dev-item small{display:block;color:#9cbba9;margin-top:2px;font-size:10px}',
    '.gh-dev-editor{overflow:auto;padding:clamp(14px,2.2vw,26px);background:linear-gradient(130deg,#152d28,#101f22)}',
    '.gh-dev-editor h3{font-size:30px;line-height:1.2;letter-spacing:-.025em;margin:4px 0 8px;color:#f1ead9}',
    '.gh-dev-caption{color:#a6bcaf;font-size:12px;line-height:1.6;margin:0 0 16px}',
    '.gh-dev-slotbar{display:flex;flex-wrap:wrap;gap:6px;margin:17px 0 13px}',
    '.gh-dev-slot{background:#213c32;color:#bad0c0;border:1px solid #416b54;padding:10px 12px;font-size:10px;font-weight:900;letter-spacing:.03em;border-radius:5px;cursor:pointer}',
    '.gh-dev-slot.active{background:#42674b;border-color:#eccb8e;color:#ffe5ae}',
    '.gh-dev-variant-row{background:#162b27;border:1px solid #486b59;padding:14px;border-radius:7px;margin-bottom:14px}',
    '.gh-dev-variant-row label{display:block;color:#e6c58d;font-size:11px;font-weight:900;letter-spacing:.11em;margin-bottom:8px}',
    '.gh-dev-variant{width:100%;background:#081d1f;color:#f3dfb5;border:1px solid #658775;padding:11px;border-radius:5px;font:800 13px system-ui}',
    '.gh-dev-variant-info{color:#9fbbad;font-size:11px;line-height:1.55;margin:10px 0 0}',
    '.gh-dev-section-heading{font-size:11px;letter-spacing:.13em;color:#dfc48e;font-weight:900;margin:18px 0 8px}',
    '.gh-dev-stat{display:grid;grid-template-columns:minmax(0,1fr) 144px;align-items:center;gap:14px;margin:8px 0;padding:13px;background:#142924;border:1px solid #305247;border-radius:8px}',
    '.gh-dev-stat label{font-weight:850;font-size:12px}.gh-dev-stat span{display:block;color:#9bb7a7;font-size:10px;margin-top:4px}',
    '.gh-dev-stat input{width:100%;padding:11px;background:#081c1d;border:1px solid #567463;color:#f4d9a3;border-radius:6px;font:800 14px system-ui;font-variant-numeric:tabular-nums}',
    '.gh-dev-stat input:focus{outline:2px solid #cfae72}.gh-dev-stat.edited{border-left:3px solid #ebc48d}',
    '.gh-dev-recipes{border:1px solid #48634c;border-radius:8px;margin:17px 0;background:#142821}',
    '.gh-dev-recipes summary{padding:14px;color:#f0d8a6;cursor:pointer;font-weight:900;font-size:12px}',
    '.gh-dev-recipe-grid{padding:10px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}',
    '.gh-dev-recipe-grid .gh-dev-stat{margin:0;grid-template-columns:1fr;padding:10px}',
    '.gh-dev-empty{color:#a5bfae;padding:20px;background:#1b302b;border:1px dashed #527761;border-radius:7px;margin-top:20px}',
    '.gh-dev-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 20px;background:#132923;border-top:1px solid #365848}',
    '.gh-dev-footer p{margin:0;font-size:11px;color:#adc8b5;max-width:450px}',
    '.gh-dev-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}',
    '.gh-dev-button{border:1px solid #638575;background:#294738;color:#e4f2df;border-radius:7px;padding:10px 12px;font:850 10px system-ui;letter-spacing:.04em;cursor:pointer}',
    '.gh-dev-button.primary{background:#d3b176;color:#172820;border-color:#f4d59d}',
    '.gh-dev-button:disabled{opacity:.45;cursor:default}',
    '#gh-dev-grants{flex:1;min-height:0;overflow:auto;padding:clamp(15px,3vw,36px);background:#102620}',
    '#gh-dev-grants[hidden],#gh-dev-root .gh-dev-grid[hidden],#gh-dev-root .gh-dev-footer[hidden]{display:none!important}',
    '.gh-grant-layout{display:grid;grid-template-columns:minmax(220px,1fr) minmax(260px,1fr);gap:20px;max-width:1040px;margin:auto}',
    '.gh-grant-card{background:#19322b;border:1px solid #416955;border-radius:10px;padding:20px}',
    '.gh-grant-results{max-height:340px;overflow:auto;margin:10px 0;display:grid;gap:6px}',
    '.gh-grant-item{padding:11px;text-align:left;background:#122822;color:#d9ece0;border:1px solid #365c4c;border-radius:6px;cursor:pointer}',
    '.gh-grant-item.active{background:#345542;border-color:#e4c78b}',
    '.gh-grant-item small{display:block;color:#9db8a9;font-size:10px;margin-top:3px}',
    '.gh-grant-input{width:100%;margin:7px 0 14px;padding:12px;background:#0b1e1e;color:#f8e6b9;border:1px solid #597761;border-radius:6px;font:700 14px system-ui}',
    '.gh-grant-label{display:block;font-size:11px;font-weight:900;color:#e7c992;letter-spacing:.08em}',
    '#gh-grant-feedback{margin-top:17px;color:#e8d19d;min-height:32px;font-size:12px}',
    '@media(max-width:680px){.gh-grant-layout{grid-template-columns:1fr}.gh-grant-results{max-height:160px}}',
    '#gh-game-updating{position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;gap:22px;background:#071511f2;color:#f5e6c5;font:14px/1.6 system-ui;padding:30px}',
    '#gh-game-updating strong{font-size:27px;letter-spacing:.10em}#gh-game-updating p{color:#b5d0bd}',
    '.gh-update-spinner{width:48px;height:48px;border:5px solid #4d6f5c;border-top-color:#dfb778;border-radius:50%;animation:gh-spin .9s linear infinite}',
    '@keyframes gh-spin{to{transform:rotate(360deg)}}',
    '@media(max-width:900px){.gh-dev-grid{grid-template-columns:155px 210px minmax(0,1fr)}.gh-dev-stat{grid-template-columns:1fr}.gh-dev-recipe-grid{grid-template-columns:1fr}}',
    '@media(max-width:650px){.gh-dev-grid{grid-template-columns:1fr;grid-template-rows:auto 155px minmax(0,1fr)}.gh-dev-side{overflow-x:auto;overflow-y:hidden;white-space:nowrap;border-right:0;border-bottom:1px solid #305246;padding:6px}.gh-dev-cat{display:inline-flex;width:auto;padding:7px}.gh-dev-items{border-right:0;border-bottom:1px solid #305246;padding:9px}.gh-dev-editor h3{font-size:22px}.gh-dev-head{padding:10px}.gh-dev-footer{padding:10px;align-items:stretch;flex-direction:column}.gh-dev-actions{justify-content:flex-start}}'
  ].join('');
  document.head.appendChild(style);
  const launcher=document.createElement('button');
  launcher.id='gh-dev-launch';launcher.type='button';
  launcher.textContent='DEV PANEL';document.body.append(launcher);
  root=document.createElement('section');root.id='gh-dev-root';
  root.setAttribute('aria-label','Developer settings');
  root.innerHTML='<div id="gh-dev-shell" role="dialog" aria-modal="true" aria-labelledby="gh-dev-title">'+
    '<header class="gh-dev-head"><div><div class="gh-dev-eyebrow">GAMESHUB / DEVELOPMENT CONTROL / W20.62</div>'+
    '<h2 id="gh-dev-title">Developer Panel <span style="color:#d9b67f">/ Variables</span></h2></div>'+
    '<div class="gh-dev-actions"><button type="button" class="gh-dev-button primary" id="gh-dev-mode">ITEMS & CAPS</button>'+
    '<button type="button" class="gh-dev-button" id="gh-dev-close">CLOSE / ESC</button></div></header>'+
    '<div class="gh-dev-grid"><nav class="gh-dev-side"><span class="gh-dev-navtitle">VARIABLES</span>'+
    '<div id="gh-dev-categories"></div></nav>'+
    '<aside class="gh-dev-items"><div class="gh-dev-breadcrumb" id="gh-dev-breadcrumb"></div>'+
    '<input id="gh-dev-search" class="gh-dev-search" placeholder="Search families..." aria-label="Search item families">'+
    '<div id="gh-dev-item-list"></div></aside>'+
    '<main class="gh-dev-editor" id="gh-dev-editor"></main></div>'+
    '<section id="gh-dev-grants" hidden><div class="gh-grant-layout">'+
    '<div class="gh-grant-card"><h3>Find an existing item</h3><p class="gh-dev-caption">Search the live item catalog. Only implemented, usable weapons are listed.</p>'+
    '<label class="gh-grant-label" for="gh-grant-search">ITEM NAME OR ID</label>'+
    '<input class="gh-grant-input" id="gh-grant-search" placeholder="Search weapons, ammo, armor, resources..." autocomplete="off">'+
    '<div class="gh-grant-results" id="gh-grant-results"></div></div>'+
    '<div class="gh-grant-card"><h3>Give yourself items</h3><p id="gh-grant-selected" class="gh-dev-caption">Choose an item to add to your backpack.</p>'+
    '<label class="gh-grant-label" for="gh-grant-quantity">QUANTITY (1–999)</label>'+
    '<input id="gh-grant-quantity" class="gh-grant-input" type="number" min="1" max="999" step="1" value="1">'+
    '<button id="gh-grant-item-submit" class="gh-dev-button primary" type="button">GIVE ITEM</button>'+
    '<h3 style="margin-top:34px">Add caps</h3><p class="gh-dev-caption">Adds to your saved wallet, up to 100,000,000 caps.</p>'+
    '<label class="gh-grant-label" for="gh-grant-caps">AMOUNT</label>'+
    '<input id="gh-grant-caps" class="gh-grant-input" type="number" min="1" max="100000000" step="1" value="1000">'+
    '<button id="gh-grant-caps-submit" class="gh-dev-button primary" type="button">GIVE CAPS</button>'+
    '<p id="gh-grant-feedback" role="status" aria-live="polite"></p></div></div></section>'+
    '<footer class="gh-dev-footer"><p id="gh-dev-status" role="status">Draft changes are not live until published.</p>'+
    '<div class="gh-dev-actions">'+
    '<button id="gh-dev-reset-all" type="button" class="gh-dev-button">REVERT ALL TO DEFAULTS</button>'+
    '<button id="gh-dev-reset" type="button" class="gh-dev-button">REVERT TO DEFAULT</button>'+
    '<button id="gh-dev-set-default" type="button" class="gh-dev-button">SET AS DEFAULT</button>'+
    '<button id="gh-dev-save" type="button" class="gh-dev-button primary">SAVE & PUBLISH</button>'+
    '</div></footer></div>';
  document.body.append(root);
  function renderGrantList(){
    const results=get(root,'gh-grant-results');results.replaceChildren();
    const matches=DEV_ITEM_CATALOG.filter(item=>
      (item.name+' '+item.id+' '+item.category).toLowerCase().includes(grantSearch));
    const chosen=DEV_ITEM_CATALOG.find(item=>item.id===grantItemId);
    get(root,'gh-grant-selected').textContent=chosen?
      chosen.name+' · '+chosen.category.toUpperCase()+' · '+chosen.id:
      'Select an existing item.';
    if(!matches.length){
      const empty=document.createElement('p');empty.className='gh-dev-empty';
      empty.textContent='NO IMPLEMENTED ITEMS MATCH THAT SEARCH';
      results.append(empty);return;
    }
    for(const item of matches.slice(0,45)){
      const button=document.createElement('button');button.type='button';
      button.className='gh-grant-item'+(item.id===grantItemId?' active':'');
      const title=document.createElement('strong');title.textContent=item.name;
      const details=document.createElement('small');
      details.textContent=item.category.toUpperCase()+' · '+item.id;
      button.append(title,details);
      button.addEventListener('click',()=>{grantItemId=item.id;renderGrantList();});
      results.append(button);
    }
    if(matches.length>45){
      const note=document.createElement('p');note.className='gh-dev-caption';
      note.textContent='Showing 45 of '+matches.length+' matches. Narrow your search.';
      results.append(note);
    }
  }
  function setGrantMode(next){
    grantMode=!!next;
    root.querySelector('.gh-dev-grid').hidden=grantMode;
    root.querySelector('.gh-dev-footer').hidden=grantMode;
    get(root,'gh-dev-grants').hidden=!grantMode;
    get(root,'gh-dev-mode').textContent=grantMode?'BACK TO VARIABLES':'ITEMS & CAPS';
    get(root,'gh-dev-title').textContent=grantMode?
      'Developer Panel / Items & Caps':'Developer Panel / Variables';
    if(grantMode){renderGrantList();get(root,'gh-grant-search').focus();}
    else{render();get(root,'gh-dev-search').focus();}
  }
  async function sendGrant(grant){
    if(granting)return;
    granting=true;
    get(root,'gh-grant-item-submit').disabled=true;
    get(root,'gh-grant-caps-submit').disabled=true;
    const feedback=get(root,'gh-grant-feedback');
    feedback.textContent='VALIDATING DEVELOPER GRANT...';
    try{
      const response=await fetch('/api/dev/grant',{method:'POST',
        credentials:'same-origin',headers:{'Content-Type':'application/json'},
        body:JSON.stringify(grant)});
      const result=await response.json();
      if(!response.ok||!result.ok)throw Error(result.error||'Request rejected.');
      let applied=null;
      window.dispatchEvent(new CustomEvent('gameshub-admin-grant',{
        detail:{grant:result.grant,complete:outcome=>{applied=outcome;}}
      }));
      if(!applied)throw Error('Game inventory is not ready.');
      if(!applied.ok)throw Error(applied.reason||'Inventory or wallet is full.');
      feedback.textContent=grant.action==='caps'?
        'ADDED '+applied.added.toLocaleString()+' CAPS · WALLET SAVED':
        'ADDED '+applied.added+' × '+
          (DEV_ITEM_CATALOG.find(item=>item.id===grant.itemId)?.name||'ITEM')+
          (applied.leftover?' · '+applied.leftover+' DID NOT FIT':'')+
          ' · BACKPACK SAVED';
    }catch(error){feedback.textContent='NOT GRANTED · '+String(error.message||error);}
    finally{
      granting=false;
      get(root,'gh-grant-item-submit').disabled=false;
      get(root,'gh-grant-caps-submit').disabled=false;
    }
  }
  get(root,'gh-dev-mode').addEventListener('click',()=>setGrantMode(!grantMode));
  get(root,'gh-grant-search').addEventListener('input',event=>{
    grantSearch=event.target.value.trim().toLowerCase();renderGrantList();
  });
  get(root,'gh-grant-item-submit').addEventListener('click',()=>
    sendGrant({action:'item',itemId:grantItemId,
      quantity:Number(get(root,'gh-grant-quantity').value)}));
  get(root,'gh-grant-caps-submit').addEventListener('click',()=>
    sendGrant({action:'caps',amount:Number(get(root,'gh-grant-caps').value)}));
  function renderCategories(){
    const container=get(root,'gh-dev-categories');container.replaceChildren();
    for(const [id,label] of VARIABLE_CATEGORIES){
      const button=document.createElement('button');button.type='button';
      button.className='gh-dev-cat'+(id===category?' active':'');
      const text=document.createElement('span');text.textContent=label;
      const number=document.createElement('b');number.textContent=String(count(id));
      button.append(text,number);
      button.addEventListener('click',()=>{
        category=id;selectedFamily=catalogFamilies[id][0]?.id||null;
        selectedSlot='base';selectedId=null;
        search='';get(root,'gh-dev-search').value='';render();
      });
      container.append(button);
    }
  }
  function renderFamilies(){
    const list=get(root,'gh-dev-item-list');list.replaceChildren();
    get(root,'gh-dev-breadcrumb').textContent=
      'VARIABLES / '+categoryNames[category].toUpperCase();
    const all=catalogFamilies[category];
    if(!all.length){
      const empty=document.createElement('p');empty.className='gh-dev-empty';
      empty.textContent=category==='junk'?
        'NO JUNK OBJECTS IMPLEMENTED YET. This category will populate when real scrappable junk is added to the game. Resources like steel and gears belong under Resources.':
        'NO ITEMS IMPLEMENTED IN THIS CATEGORY YET.';
      list.append(empty);return;
    }
    const found=all.filter(f=>!search||
      (f.name+' '+f.id+' '+f.group+' '+f.search).toLowerCase().includes(search));
    let group='';
    for(const family of found){
      if(family.group!==group){
        group=family.group;
        const heading=document.createElement('div');heading.className='gh-dev-itemgroup';
        heading.textContent=group.toUpperCase();list.append(heading);
      }
      const button=document.createElement('button');button.type='button';
      button.className='gh-dev-item'+(family.id===selectedFamily?' selected':'');
      const text=document.createElement('strong');text.textContent=family.name;
      const small=document.createElement('small');
      const changed=family.children.filter(item=>draft[category]?.[item.id]).length;
      small.textContent=(category==='weapons'||category==='armor'?
        family.children.length+' COMPONENTS / PIECES':'VARIABLES')+
        (changed?' · '+changed+' MODIFIED':'');
      button.append(text,small);
      button.addEventListener('click',()=>{
        selectedFamily=family.id;selectedSlot='base';selectedId=null;
        renderFamilies();renderEditor();
      });
      list.append(button);
    }
    if(!found.length){
      const no=document.createElement('p');no.className='gh-dev-empty';
      no.textContent='NO MATCHING FAMILIES.';list.append(no);
    }
  }
  function statRow(item,field,factory){
    const r=VARIABLE_FIELDS[category]?.[field];
    if(!r)return null;
    const row=document.createElement('div');
    const override=draft[category]?.[item.id]?.[field]!==undefined;
    row.className='gh-dev-stat'+(override?' edited':'');
    const label=document.createElement('label');
    const heading=document.createElement('strong');heading.textContent=r[3];
    const hint=document.createElement('span');
    const saved=baseline(category,item.id,field,factory);
    hint.textContent='Saved default: '+saved+
      (saved!==factory?' · Factory: '+factory:'')+
      ' · Range '+r[0]+'–'+r[1];
    label.append(heading,hint);
    const input=document.createElement('input');input.type='number';
    input.min=String(r[0]);input.max=String(r[1]);input.step=String(r[2]);
    input.value=String(value(category,item.id,field,factory));
    input.setAttribute('aria-label',item.name+' '+r[3]);
    input.addEventListener('change',()=>{
      if(updateNumber(field,input.value)){
        row.classList.toggle('edited',draft[category]?.[item.id]?.[field]!==undefined);
      }else input.value=String(value(category,item.id,field,factory));
    });
    row.append(label,input);
    return row;
  }
  function renderEditor(){
    const editor=get(root,'gh-dev-editor');editor.replaceChildren();
    const family=currentFamily();
    if(!family){
      editor.textContent=category==='junk'?
        'Junk is not implemented yet. No fictitious objects or variables are being shown.':
        'SELECT A FAMILY TO EDIT.';renderActions();return;
    }
    const heading=document.createElement('div');heading.className='gh-dev-eyebrow';
    heading.textContent=categoryNames[category].toUpperCase()+' / '+family.group.toUpperCase();
    const title=document.createElement('h3');title.textContent=family.name;
    const instructions=document.createElement('p');instructions.className='gh-dev-caption';
    instructions.textContent=category==='weapons'?
      'Choose Base Weapon or an installed-part category. Every implemented modification appears under its own slot. Sights do not create stat variants.':
      category==='armor'?
      'Choose a real armor piece or power-armor model and slot. Every authored armor style and power-plate tier is available; no imaginary armor upgrades are listed.':
      category==='resources'?
      'Buy cost and sell price are separate live vendor prices. Crafting components are NOT junk.':
      'Edit the variables actually implemented for this item.';
    editor.append(heading,title,instructions);
    let chosen=family.children.find(x=>x.id===selectedId);
    if(category==='weapons'||category==='armor'){
      const slots=SLOT_ORDER[category].filter(slot=>family.children.some(c=>c.slot===slot));
      if(!slots.includes(selectedSlot))selectedSlot=slots[0];
      const tabs=document.createElement('nav');tabs.className='gh-dev-slotbar';
      tabs.setAttribute('aria-label','Component categories');
      for(const slot of slots){
        const button=document.createElement('button');button.type='button';
        button.className='gh-dev-slot'+(selectedSlot===slot?' active':'');
        button.textContent=slotName(category,slot);
        button.dataset.slot=slot;
        button.addEventListener('click',()=>{
          selectedSlot=slot;selectedId=null;renderEditor();
        });
        tabs.append(button);
      }
      editor.append(tabs);
      const variants=family.children.filter(c=>c.slot===selectedSlot);
      if(!variants.some(v=>v.id===selectedId))selectedId=variants[0]?.id||null;
      chosen=variants.find(v=>v.id===selectedId)||null;
      if(variants.length>1){
        const row=document.createElement('div');row.className='gh-dev-variant-row';
        const label=document.createElement('label');label.textContent='SELECT ACTUAL MODIFICATION';
        label.htmlFor='gh-dev-variant';
        const select=document.createElement('select');select.id='gh-dev-variant';
        select.className='gh-dev-variant';
        for(const mod of variants){
          const option=document.createElement('option');
          option.value=mod.id;option.textContent=mod.name;select.append(option);
        }
        select.value=selectedId;
        select.addEventListener('change',()=>{
          selectedId=select.value;renderEditor();
        });
        row.append(label,select);editor.append(row);
      }
    }else{
      selectedId=family.children[0].id;
      chosen=family.children[0];
    }
    if(!chosen){renderActions();return;}
    const selectedHeading=document.createElement('div');selectedHeading.className='gh-dev-section-heading';
    selectedHeading.textContent='EDITING / '+chosen.name.toUpperCase();
    editor.append(selectedHeading);
    const desc=document.createElement('p');desc.className='gh-dev-caption';
    desc.textContent=chosen.description||
      'Edits affect this exact base item or component everywhere it is used in-game.';
    editor.append(desc);
    const fields=Object.entries(chosen.fields);
    for(const [field,factory] of fields.filter(([name])=>!name.startsWith('cost_'))){
      const row=statRow(chosen,field,factory);if(row)editor.append(row);
    }
    const ingredients=fields.filter(([field])=>field.startsWith('cost_'));
    if(ingredients.length){
      const details=document.createElement('details');details.className='gh-dev-recipes';
      const summary=document.createElement('summary');
      summary.textContent='CRAFTING RECIPE / '+ingredients.length+
        ' RESOURCE TYPES · EXPAND TO CHANGE ANY COST';
      details.append(summary);
      const grid=document.createElement('div');grid.className='gh-dev-recipe-grid';
      for(const [field,factory] of ingredients){
        const row=statRow(chosen,field,factory);if(row)grid.append(row);
      }
      details.append(grid);editor.append(details);
    }
    const note=document.createElement('p');note.className='gh-dev-caption';
    note.textContent='SET AS DEFAULT permanently saves this component’s current values as the new baseline and publishes them. REVERT TO DEFAULT restores only this component in your draft; SAVE & PUBLISH sends that reset to players.';
    editor.append(note);
    renderActions();
  }
  function renderActions(){
    get(root,'gh-dev-save').disabled=!dirty()||publishing;
    get(root,'gh-dev-reset').disabled=!entry()||publishing;
    get(root,'gh-dev-set-default').disabled=!entry()||publishing;
    get(root,'gh-dev-reset-all').disabled=publishing||
      JSON.stringify(draft)===JSON.stringify(defaults);
  }
  function render(){renderCategories();renderFamilies();renderEditor();}
  function setOpen(next){
    open=next;root.classList.toggle('gh-open',open);launcher.hidden=open;
    if(open){document.exitPointerLock?.();render();
      get(root,grantMode?'gh-grant-search':'gh-dev-search').focus();}
  }
  launcher.addEventListener('click',()=>setOpen(true));
  get(root,'gh-dev-close').addEventListener('click',()=>setOpen(false));
  window.addEventListener('keydown',event=>{
    if(event.code==='F10'&&!event.repeat){
      event.preventDefault();event.stopImmediatePropagation();setOpen(!open);return;
    }
    if(!open)return;
    event.stopImmediatePropagation();
    if(event.code==='Escape'){event.preventDefault();setOpen(false);}
  },true);
  window.addEventListener('keyup',event=>{if(open)event.stopImmediatePropagation();},true);
  get(root,'gh-dev-search').addEventListener('input',event=>{
    search=event.target.value.trim().toLowerCase();renderFamilies();
  });
  get(root,'gh-dev-reset').addEventListener('click',()=>{
    const item=entry();if(!item)return;
    setItemPatch(category,item.id,clone(defaults[category]?.[item.id]||{}));
    render();status('REVERTED '+item.name.toUpperCase()+
      ' TO ITS SAVED DEFAULT · SAVE & PUBLISH TO APPLY.');
  });
  get(root,'gh-dev-reset-all').addEventListener('click',()=>{
    if(!window.confirm('Restore EVERY item and modification to its saved defaults? All unsaved experiments will be discarded. You must still Save & Publish.'))return;
    draft=clone(defaults);render();
    status('ALL ITEMS RESTORED TO SAVED DEFAULTS · SAVE & PUBLISH TO APPLY.');
  });
  async function publish(action='publish'){
    if(publishing||action==='publish'&&!dirty())return;
    const item=entry();
    if(action==='set-default'&&(!item||!window.confirm(
      'Set '+item.name+' to the CURRENT values as its new PERMANENT default and publish to everyone?')))return;
    publishing=true;renderActions();status('SAVING SETTINGS TO THE SERVER...');
    try{
      const response=await fetch(api,{method:'PUT',credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({version,changes:draft,action,
          ...(action==='set-default'?{category,id:item.id}:{})})});
      const result=await response.json();
      if(!response.ok||!result.ok)throw Error(result.error||'Save failed.');
      version=result.version;
      defaults=clone(result.defaults||defaults);changes=clone(draft);
      status(action==='set-default'?'NEW DEFAULT SAVED & PUBLISHED.':
        'VARIABLE CHANGES PUBLISHED.');
      showReloadNotice();
    }catch(error){
      status('NOT SAVED · '+String(error.message||error));
    }finally{publishing=false;renderActions();}
  }
  get(root,'gh-dev-set-default').addEventListener('click',()=>publish('set-default'));
  get(root,'gh-dev-save').addEventListener('click',()=>publish('publish'));
  render();
}

