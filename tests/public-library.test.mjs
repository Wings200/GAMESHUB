import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import vm from 'node:vm';

const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('paused Weapon Lab RPG and GAMESHUB Engine stay unlisted', () => {
  assert.doesNotMatch(home, /href\s*=\s*["'][^"']*\/games\/(?:rpg-prototype|engine-test)(?:\/|["'?#])/i);
  for (const slug of ['rpg-prototype', 'engine-test']) {
    assert.ok(existsSync(new URL('../games/' + slug + '/index.html', import.meta.url)), slug + ' files must be retained');
  }
});

test('active GAMESHUB games remain accessible from the library', () => {
  assert.match(home, /href=["']\/games\/redline\/["']/);
  assert.match(home, /href=["']\/games\/illegal-chess\/["']/);
});

test('Vault Directive alpha is listed and its playable assets exist', () => {
  assert.match(home, /href=["']\/games\/vault-directive\/["']/);
  for (const path of ['index.html','style.css','game.js']) {
    assert.ok(existsSync(new URL('../games/vault-directive/' + path, import.meta.url)), path + ' must exist');
  }
});


test('IN DEV is an exclusive filter for Vault Directive, including search', () => {
  assert.match(home, /data-filter="in-dev"/);
  assert.match(home, /href="\/games\/vault-directive\/"[\s\S]*?data-categories="in-dev strategy simulation"[\s\S]*?style="display:none"/);
  const scripts = [...home.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .map(match => match[1]);
  const homepageScript = scripts.find(script => script.includes('function updateGames()'));
  assert.ok(homepageScript, 'Homepage filtering script must exist');

  const events = {};
  const searchInput = {value: '', addEventListener(event, cb) { events.search = cb; }};
  const emptyMessage = {style: {}};
  const buttons = ['all', 'multiplayer', 'racing', 'action', 'in-dev'].map(filter => ({
    dataset: {filter},
    classList: {toggle() {}},
    addEventListener(_event, cb) {this.click = cb;}
  }));
  const cards = [
    {dataset: {name: 'redline', categories: 'racing multiplayer action'}, style: {}},
    {dataset: {name: 'illegal chess', categories: 'multiplayer strategy'}, style: {}},
    {dataset: {name: 'vault directive below the surface', categories: 'in-dev strategy simulation'}, style: {display: 'none'}},
    {dataset: {name: 'coming soon', categories: 'action'}, style: {}}
  ];
  const document = {
    getElementById(id) {
      return id === 'gameSearch' ? searchInput : id === 'emptyMessage' ? emptyMessage : {addEventListener() {}};
    },
    querySelectorAll(query) {return query === '.game-card' ? cards : query === '.filter-button' ? buttons : [];}
  };
  vm.runInNewContext(homepageScript, {document, console, fetch: async () => ({}), window: {location: {}}});
  assert.equal(cards[2].style.display, 'none', 'development game must be hidden by default');
  searchInput.value = 'vault';
  events.search();
  assert.equal(cards[2].style.display, 'none', 'typing a game name must not reveal an IN DEV game under ALL');
  searchInput.value = '';
  buttons.find(button => button.dataset.filter === 'in-dev').click();
  assert.equal(cards[2].style.display, '', 'IN DEV should reveal Vault Directive');
  assert.ok([cards[0], cards[1], cards[3]].every(card => card.style.display === 'none'), 'IN DEV shows no public games');
  buttons.find(button => button.dataset.filter === 'racing').click();
  assert.equal(cards[2].style.display, 'none', 'other filters must hide Vault Directive again');
  buttons.find(button => button.dataset.filter === 'all').click();
  assert.equal(cards[2].style.display, 'none', 'ALL must not include development games');
});
