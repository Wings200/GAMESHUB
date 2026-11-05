// W20.58 — Developer-only nested variables editor and game-version watcher.
import {DEFAULT_GAME_VARIABLES} from '../game-balance.mjs';
import {VARIABLE_CATEGORIES, VARIABLE_FIELDS} from '../balance-schema.mjs';

const api = '/api/dev/settings';
const copy = value => JSON.parse(JSON.stringify(value));
const groupNames = Object.fromEntries(VARIABLE_CATEGORIES);
const get = (root, id) => root.querySelector('#' + id);

export function startGameSettingsUI(initial) {
  let version = initial?.ok ? initial.version : null;
  let changes = copy(initial?.changes || {});
  let draft = copy(changes);
  let category = 'weapons';
  let selected = DEFAULT_GAME_VARIABLES.weapons[0]?.id || null;
  let search = '';
  let open = false;
  let publishing = false;
  let reloading = false;
  let root = null;

  const effective = (cat, id, field, value) =>
    draft[cat]?.[id]?.[field] ?? value;
  const dirty = () => JSON.stringify(draft) !== JSON.stringify(changes);
  const changedCount = cat => Object.keys(draft[cat] || {}).length;

  function showReloadNotice() {
    if (reloading) return;
    reloading = true;
    window.dispatchEvent(new Event('gameshub-before-balance-reload'));
    const overlayStyle = document.createElement('style');
    overlayStyle.textContent =
      '#gh-game-updating{position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;gap:22px;background:#071511f2;color:#f5e6c5;font:14px/1.6 system-ui;padding:30px}' +
      '#gh-game-updating strong{font-size:27px;letter-spacing:.10em}#gh-game-updating p{color:#b5d0bd}' +
      '.gh-update-spinner{width:48px;height:48px;border:5px solid #4d6f5c;border-top-color:#dfb778;border-radius:50%;animation:gh-spin .9s linear infinite}' +
      '@keyframes gh-spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(overlayStyle);
    const notice = document.createElement('div');
    notice.id = 'gh-game-updating';
    notice.setAttribute('role', 'status');
    notice.innerHTML =
      '<div class="gh-update-spinner"></div>' +
      '<div><strong>UPDATING GAME</strong><p>New developer settings are available. Saving progress and refreshing...</p></div>';
    document.body.appendChild(notice);
    setTimeout(() => location.reload(), 2400);
  }

  async function checkVersion() {
    if (reloading || publishing) return;
    try {
      const response = await fetch(api, {cache:'no-store', credentials:'same-origin'});
      if (!response.ok) return;
      const next = await response.json();
      if (!next.ok) return;
      if (version === null || next.version !== version) showReloadNotice();
    } catch { /* Keep gameplay available while connectivity recovers. */ }
  }
  setInterval(checkVersion, 15000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkVersion();
  });

  // The server must verify the signed-in account AND the bound stable user ID.
  if (!initial?.admin) return;

  const style = document.createElement('style');
  style.textContent = [
    '#gh-dev-launch{position:fixed;right:18px;top:18px;z-index:9000;background:#d9ae69;color:#12211e;border:1px solid #ffdc9b;padding:11px 16px;border-radius:9px;font:900 12px system-ui;letter-spacing:.10em;box-shadow:0 8px 35px #0008;cursor:pointer}',
    '#gh-dev-root{position:fixed;inset:0;z-index:99990;display:none;color:#e5eee6;font:14px/1.5 system-ui;background:rgba(4,12,14,.92);backdrop-filter:blur(11px)}',
    '#gh-dev-root.gh-open{display:flex;align-items:center;justify-content:center;padding:clamp(6px,2vw,25px);box-sizing:border-box}',
    '#gh-dev-root *{box-sizing:border-box}',
    '#gh-dev-shell{width:min(1460px,100%);height:min(900px,97vh);display:flex;flex-direction:column;background:#10211f;border:1px solid #3a6452;border-radius:15px;box-shadow:0 30px 90px #000c;overflow:hidden}',
    '.gh-dev-head{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:19px 25px;border-bottom:1px solid #305246;background:#172e29}',
    '.gh-dev-eyebrow{font-size:10px;font-weight:900;letter-spacing:.23em;color:#d9b67f}',
    '.gh-dev-head h2{font-size:22px;margin:4px 0 0;letter-spacing:.04em;color:#f1f4e9}',
    '.gh-dev-grid{display:grid;grid-template-columns:210px 320px minmax(0,1fr);min-height:0;flex:1}',
    '.gh-dev-side,.gh-dev-items{overflow:auto;border-right:1px solid #305246;padding:18px 13px;background:#132a26}',
    '.gh-dev-side{background:#0e211f}',
    '.gh-dev-navtitle{display:block;padding:10px;color:#b9d3bd;font-size:11px;font-weight:900;letter-spacing:.14em}',
    '.gh-dev-cat{width:100%;text-align:left;display:flex;justify-content:space-between;background:none;border:1px solid transparent;color:#b2c9bd;padding:12px 14px;margin:3px 0;border-radius:7px;cursor:pointer;font-weight:800;font-size:12px}',
    '.gh-dev-cat:hover{background:#243c35}.gh-dev-cat.active{background:#2b5141;border-color:#4e8168;color:#f1d4a2}',
    '.gh-dev-cat b{font-size:10px;background:#18362d;padding:2px 6px;border-radius:8px}',
    '.gh-dev-breadcrumb{font-size:11px;font-weight:900;letter-spacing:.13em;color:#d8b57d;padding:4px 8px 12px}',
    '.gh-dev-search{width:100%;padding:12px;background:#071b1b;color:#fff;border:1px solid #517666;border-radius:7px;outline:none}',
    '.gh-dev-itemgroup{margin:17px 4px 8px;font-size:10px;font-weight:900;letter-spacing:.14em;color:#8eaca0}',
    '.gh-dev-item{display:block;width:100%;text-align:left;background:#1d352e;border:1px solid #2b5144;border-radius:7px;margin:6px 0;padding:10px 12px;color:#d8e9d8;cursor:pointer}',
    '.gh-dev-item.selected{border-color:#debd83;background:#2e4638}',
    '.gh-dev-item strong{display:block;font-size:12px}.gh-dev-item small{display:block;color:#9cbba9;margin-top:2px;font-size:10px}',
    '.gh-dev-editor{overflow:auto;padding:clamp(14px,2.5vw,30px);background:linear-gradient(130deg,#152d28,#101f22)}',
    '.gh-dev-editor h3{font-size:29px;line-height:1.2;letter-spacing:-.025em;margin:4px 0 6px;color:#f1ead9}',
    '.gh-dev-caption{color:#9eb8ab;font-size:12px;margin:0 0 22px}',
    '.gh-dev-stat{display:grid;grid-template-columns:minmax(0,1fr) 150px;align-items:center;gap:15px;margin:9px 0;padding:14px;background:#142924;border:1px solid #305247;border-radius:8px}',
    '.gh-dev-stat label{font-weight:850;font-size:12px}.gh-dev-stat span{display:block;color:#8fac9f;font-size:10px;margin-top:3px}',
    '.gh-dev-stat input{width:100%;padding:12px;background:#081c1d;border:1px solid #567463;color:#f4d9a3;border-radius:6px;font:800 15px system-ui;font-variant-numeric:tabular-nums}',
    '.gh-dev-stat input:focus{outline:2px solid #cfae72}.gh-dev-stat.edited{border-left:3px solid #ebc48d}',
    '.gh-dev-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 24px;background:#132923;border-top:1px solid #365848}',
    '.gh-dev-footer p{margin:0;font-size:12px;color:#adc8b5}',
    '.gh-dev-actions{display:flex;gap:8px;flex-wrap:wrap}',
    '.gh-dev-button{border:1px solid #638575;background:#294738;color:#e4f2df;border-radius:7px;padding:10px 14px;font:900 11px system-ui;letter-spacing:.05em;cursor:pointer}',
    '.gh-dev-button.primary{background:#d3b176;color:#172820;border-color:#f4d59d}',
    '.gh-dev-button:disabled{opacity:.45;cursor:default}',
    '#gh-game-updating{position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;gap:22px;background:#071511f2;color:#f5e6c5;font:14px/1.6 system-ui;padding:30px}',
    '#gh-game-updating strong{font-size:27px;letter-spacing:.10em}',
    '#gh-game-updating p{color:#b5d0bd}',
    '.gh-update-spinner{width:48px;height:48px;border:5px solid #4d6f5c;border-top-color:#dfb778;border-radius:50%;animation:gh-spin .9s linear infinite}',
    '@keyframes gh-spin{to{transform:rotate(360deg)}}',
    '@media(max-width:900px){.gh-dev-grid{grid-template-columns:155px 240px minmax(0,1fr)}.gh-dev-stat{grid-template-columns:1fr}}',
    '@media(max-width:650px){.gh-dev-grid{grid-template-columns:1fr;grid-template-rows:auto 155px minmax(0,1fr)}.gh-dev-side{overflow-x:auto;overflow-y:hidden;white-space:nowrap;border-right:0;border-bottom:1px solid #305246;padding:7px}.gh-dev-cat{display:inline-flex;width:auto;margin:2px;padding:8px}.gh-dev-items{border-right:0;border-bottom:1px solid #305246;padding:9px}.gh-dev-editor h3{font-size:22px}.gh-dev-head{padding:11px}.gh-dev-footer{padding:10px;align-items:stretch;flex-direction:column}}'
  ].join('');
  document.head.appendChild(style);

  const launcher = document.createElement('button');
  launcher.id = 'gh-dev-launch';
  launcher.type = 'button';
  launcher.textContent = 'DEV PANEL';
  document.body.appendChild(launcher);

  root = document.createElement('section');
  root.id = 'gh-dev-root';
  root.setAttribute('aria-label', 'Developer settings');
  root.innerHTML =
    '<div id="gh-dev-shell" role="dialog" aria-modal="true" aria-labelledby="gh-dev-title">' +
    '<header class="gh-dev-head"><div><div class="gh-dev-eyebrow">GAMESHUB / DEVELOPMENT CONTROL</div>' +
    '<h2 id="gh-dev-title">Developer Panel <span style="color:#d9b67f">/ Variables</span></h2></div>' +
    '<button type="button" class="gh-dev-button" id="gh-dev-close">CLOSE / ESC</button></header>' +
    '<div class="gh-dev-grid"><nav class="gh-dev-side"><span class="gh-dev-navtitle">VARIABLES</span>' +
    '<div id="gh-dev-categories"></div></nav>' +
    '<aside class="gh-dev-items"><div class="gh-dev-breadcrumb" id="gh-dev-breadcrumb"></div>' +
    '<input id="gh-dev-search" class="gh-dev-search" placeholder="Search items..." aria-label="Search variables">' +
    '<div id="gh-dev-item-list"></div></aside>' +
    '<main class="gh-dev-editor" id="gh-dev-editor"></main></div>' +
    '<footer class="gh-dev-footer"><p id="gh-dev-status" role="status">Changes are saved for every player.</p>' +
    '<div class="gh-dev-actions"><button id="gh-dev-reset" type="button" class="gh-dev-button">RESTORE ITEM</button>' +
    '<button id="gh-dev-save" type="button" class="gh-dev-button primary">SAVE & PUBLISH</button></div></footer></div>';
  document.body.appendChild(root);

  function setStatus(message) { get(root,'gh-dev-status').textContent = message; }
  function selectedEntry() {
    return DEFAULT_GAME_VARIABLES[category].find(item => item.id === selected) || null;
  }
  function renderCategories() {
    const container = get(root,'gh-dev-categories');
    container.replaceChildren();
    for (const [id, label] of VARIABLE_CATEGORIES) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'gh-dev-cat' + (id === category?' active':'');
      const caption = document.createElement('span');
      caption.textContent = label;
      const count = document.createElement('b');
      count.textContent = changedCount(id);
      button.append(caption,count);
      button.addEventListener('click',() => {
        category=id; selected=DEFAULT_GAME_VARIABLES[id][0]?.id||null;
        search=''; get(root,'gh-dev-search').value=''; render();
      });
      container.appendChild(button);
    }
  }
  function renderItems() {
    get(root,'gh-dev-breadcrumb').textContent='VARIABLES / '+groupNames[category].toUpperCase();
    const list = get(root,'gh-dev-item-list');
    list.replaceChildren();
    let lastGroup='';
    const entries=DEFAULT_GAME_VARIABLES[category].filter(item =>
      (item.name+' '+item.id+' '+item.group).toLowerCase().includes(search));
    for (const item of entries) {
      if (item.group!==lastGroup) {
        lastGroup=item.group;
        const title=document.createElement('div');
        title.className='gh-dev-itemgroup';title.textContent=item.group.toUpperCase();
        list.appendChild(title);
      }
      const button=document.createElement('button');
      button.type='button';
      button.className='gh-dev-item'+(item.id===selected?' selected':'');
      const label=document.createElement('strong');
      label.textContent=item.name;
      const small=document.createElement('small');
      const number=Object.keys(draft[category]?.[item.id]||{}).length;
      small.textContent=item.id+(number?' · '+number+' modified':'');
      button.append(label,small);
      button.addEventListener('click',()=>{selected=item.id;renderItems();renderEditor();});
      list.appendChild(button);
    }
    if (!entries.length) list.textContent='No matching items.';
  }
  function updateField(field, textValue) {
    const item=selectedEntry();
    const range=VARIABLE_FIELDS[category]?.[field];
    const number=Number(textValue);
    if (!item || !range || textValue.trim()==='' ||
        !Number.isFinite(number) || number<range[0] || number>range[1] ||
        (range[2]===1 && !Number.isInteger(number))) {
      setStatus('INVALID VALUE · Check the allowed range before saving.');
      return false;
    }
    (draft[category] ||= {});
    (draft[category][item.id] ||= {});
    if (number===item.fields[field]) delete draft[category][item.id][field];
    else draft[category][item.id][field]=number;
    if (!Object.keys(draft[category][item.id]).length) delete draft[category][item.id];
    if (!Object.keys(draft[category]).length) delete draft[category];
    setStatus(dirty()?'UNSAVED CHANGES · Save to update every player.':'No pending changes.');
    get(root,'gh-dev-save').disabled=!dirty()||publishing;
    return true;
  }
  function renderEditor() {
    const editor=get(root,'gh-dev-editor');
    editor.replaceChildren();
    const item=selectedEntry();
    if (!item) { editor.textContent='Choose an item to edit its variables.';return; }
    const sub=document.createElement('div');
    sub.className='gh-dev-eyebrow';
    sub.textContent=groupNames[category].toUpperCase()+' / '+item.group.toUpperCase();
    const title=document.createElement('h3');title.textContent=item.name;
    const hint=document.createElement('p');hint.className='gh-dev-caption';
    hint.textContent='Edit values below. Default values appear under each setting. Nothing goes live until you save.';
    editor.append(sub,title,hint);
    for (const [field, defaultValue] of Object.entries(item.fields)) {
      const range=VARIABLE_FIELDS[category]?.[field];
      if (!range) continue;
      const section=document.createElement('div');
      section.className='gh-dev-stat'+(draft[category]?.[item.id]?.[field]!==undefined?' edited':'');
      const label=document.createElement('label');
      const heading=document.createElement('strong');heading.textContent=range[3];
      const info=document.createElement('span');
      info.textContent='Default: '+defaultValue+' · Range: '+range[0]+'–'+range[1];
      label.append(heading,info);
      const input=document.createElement('input');
      input.type='number';input.min=range[0];input.max=range[1];input.step=range[2];
      input.value=effective(category,item.id,field,defaultValue);
      input.setAttribute('aria-label',item.name+' '+range[3]);
      input.addEventListener('change',()=>{
        if (updateField(field,input.value)) {
          section.classList.toggle('edited',draft[category]?.[item.id]?.[field]!==undefined);
          renderCategories();renderItems();
        } else input.value=effective(category,item.id,field,defaultValue);
      });
      section.append(label,input);editor.appendChild(section);
    }
  }
  function render() {
    renderCategories();renderItems();renderEditor();
    get(root,'gh-dev-save').disabled=!dirty()||publishing;
    get(root,'gh-dev-reset').disabled=!selectedEntry()||publishing;
  }
  function setOpen(next) {
    open=next;root.classList.toggle('gh-open',open);
    launcher.hidden=open;
    if (open) { document.exitPointerLock?.();render();get(root,'gh-dev-search').focus(); }
  }
  launcher.addEventListener('click',()=>setOpen(true));
  get(root,'gh-dev-close').addEventListener('click',()=>setOpen(false));
  window.addEventListener('keydown',event=>{
    if (event.code==='F10'&&!event.repeat) { event.preventDefault();event.stopImmediatePropagation();setOpen(!open);return; }
    if (!open) return;
    event.stopImmediatePropagation();
    if (event.code==='Escape') {event.preventDefault();setOpen(false);}
  },true);
  window.addEventListener('keyup',event=>{if(open)event.stopImmediatePropagation();},true);
  get(root,'gh-dev-search').addEventListener('input',event=>{
    search=event.target.value.trim().toLowerCase();renderItems();
  });
  get(root,'gh-dev-reset').addEventListener('click',()=>{
    if (!selected) return;
    if (draft[category]) {
      delete draft[category][selected];
      if (!Object.keys(draft[category]).length) delete draft[category];
    }
    render();setStatus('ITEM RESTORED · Save to publish the defaults.');
  });
  get(root,'gh-dev-save').addEventListener('click',async()=>{
    if (!dirty()||publishing) return;
    publishing=true;render();setStatus('SAVING GAME SETTINGS...');
    try {
      const response=await fetch(api,{method:'PUT',credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({version,changes:draft})});
      const result=await response.json();
      if (!response.ok || !result.ok) throw Error(result.error||'Save failed.');
      version=result.version; changes=copy(draft);
      setStatus('SAVED · Publishing version '+version+'. Players will refresh shortly.');
      showReloadNotice();
    } catch(error) {
      setStatus('NOT SAVED · '+String(error.message||error));
    } finally {
      publishing=false;render();
    }
  });
  render();
}
