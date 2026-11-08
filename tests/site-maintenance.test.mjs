import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac, createHash} from 'node:crypto';
import {onRequest as middleware} from '../functions/_middleware.js';
import {onRequestGet, onRequestPut} from '../functions/api/dev/maintenance.js';
import {readMaintenanceState} from '../functions/_lib/site-admin.js';

const ADMIN_ID = '51cb59ec-7c65-43ad-9431-236d9c7fcc17';
const SESSION_TOKEN = 'testing-google-session';
const SESSION_HASH = createHash('sha256').update(SESSION_TOKEN).digest('hex');
const SECRET = 'local-test-only-secret';
const EXPIRY = Date.now() + 900000;
const SIGNED_ACCESS = EXPIRY + '.' + createHmac('sha256', SECRET).update(String(EXPIRY)).digest('base64url');

class FakeDB {
  constructor({enabled = false, stored = true, user = null, unavailable = false} = {}) {
    Object.assign(this, {enabled, stored, user, unavailable});
    this.version = 0;
    this.updatedAt = 0;
    this.updatedBy = null;
  }
  prepare(statement) {
    if (this.unavailable) throw new Error('D1 offline');
    let args = [];
    const db = this;
    return {
      bind(...items) { args = items; return this; },
      async first() {
        if (statement.includes('FROM sessions s JOIN users u')) {
          if (args[0] === SESSION_HASH && db.user) return db.user;
          return null;
        }
        if (statement.includes('FROM site_maintenance')) {
          if (!db.stored) throw new Error('D1_ERROR: no such table: site_maintenance');
          return {enabled: db.enabled ? 1 : 0, version: db.version, updated_at: db.updatedAt, updated_by: db.updatedBy};
        }
        throw new Error('Unexpected SELECT: ' + statement);
      },
      async run() {
        if (statement.startsWith('CREATE TABLE IF NOT EXISTS site_maintenance')) {
          db.stored = true; return {meta: {changes: 0}};
        }
        if (statement.startsWith('INSERT OR IGNORE INTO site_maintenance')) return {meta: {changes: 0}};
        if (statement.startsWith('UPDATE site_maintenance')) {
          if (db.version !== args[3]) return {meta: {changes: 0}};
          db.enabled = args[0] === 1;
          db.version++;
          db.updatedAt = args[1];
          db.updatedBy = args[2];
          return {meta: {changes: 1}};
        }
        throw new Error('Unexpected statement: ' + statement);
      }
    };
  }
}

function context(path, db, {googleSession = false, method = 'GET', accept = 'text/html', origin, body, access = true} = {}) {
  const headers = {'Accept': accept};
  const cookies = [];
  if (access) cookies.push('gh_access=' + SIGNED_ACCESS);
  if (googleSession) cookies.push('gh_session=' + SESSION_TOKEN);
  if (cookies.length) headers.Cookie = cookies.join('; ');
  if (origin) headers.Origin = origin;
  if (body) headers['Content-Type'] = 'application/json';
  const request = new Request('https://gameshub.example' + path, {method, headers, body: body ? JSON.stringify(body) : undefined});
  return {request, env: {DB: db, SESSION_SECRET: SECRET}, next: async () => new Response('GAME CONTENT', {headers: {'Content-Type': 'text/html'}})};
}

const developer = {id: ADMIN_ID, username: 'DynamiteDev7392'};

test('fresh deployment is OFF before D1 table creation', async () => {
  assert.equal((await readMaintenanceState(new FakeDB({stored: false}))).enabled, false);
});

test('developer endpoint rejects nondeveloper and impersonated display names', async () => {
  const db = new FakeDB({user: {id: 'fake-id', username: 'DynamiteDev7392'}});
  assert.equal((await onRequestGet(context('/api/dev/maintenance', db, {googleSession: true}))).status, 403);
  assert.equal((await onRequestGet(context('/api/dev/maintenance', db))).status, 403);
});

test('developer can activate and deactivate; uses version checks and same-origin protection', async () => {
  const db = new FakeDB({user: developer, stored: false});
  assert.equal((await onRequestGet(context('/api/dev/maintenance', db, {googleSession: true}))).status, 200);
  const request = {googleSession: true, method: 'PUT', origin: 'https://gameshub.example', body: {enabled: true, version: 0}};
  assert.equal((await onRequestPut(context('/api/dev/maintenance', db, {...request, origin: 'https://attacker.example'}))).status, 403);
  const enable = await onRequestPut(context('/api/dev/maintenance', db, request));
  assert.equal(enable.status, 200);
  assert.equal((await enable.json()).enabled, true);
  assert.equal(db.updatedBy, ADMIN_ID);
  assert.equal((await onRequestPut(context('/api/dev/maintenance', db, request))).status, 409);
  const disable = await onRequestPut(context('/api/dev/maintenance', db, {...request, body: {enabled: false, version: 1}}));
  assert.equal((await disable.json()).enabled, false);
});

test('public access allowed when maintenance is OFF; dev panel is server protected', async () => {
  const db = new FakeDB({user: developer});
  assert.equal((await middleware(context('/', db))).status, 200);
  assert.equal((await middleware(context('/developer.html', db))).status, 404);
  assert.equal((await middleware(context('/developer.html', db, {googleSession: true}))).status, 200);
  assert.equal((await middleware(context('/games/engine-test/index.html', db))).status, 404);
  assert.equal((await middleware(context('/games/engine-test/index.html', db, {googleSession: true}))).status, 200);
  assert.equal((await middleware(context('/maintenance.html', db))).headers.get('Location'), '/');
});

test('maintenance blocks nondevelopers across HTML, API, and JS; lets developers through', async () => {
  const db = new FakeDB({enabled: true, user: developer});
  const home = await middleware(context('/', db));
  assert.equal(home.status, 302);
  assert.equal(home.headers.get('Location'), '/maintenance.html');
  assert.equal((await middleware(context('/games/redline/game.js', db, {accept: '*/*'}))).status, 503);
  const api = await middleware(context('/api/account/username', db, {accept: 'application/json'}));
  assert.equal(api.status, 503);
  assert.equal((await api.json()).ok, false);
  assert.equal((await middleware(context('/maintenance.html', db))).status, 200);
  assert.equal((await middleware(context('/api/account/google', db, {accept: 'application/json'}))).status, 200);
  assert.equal((await middleware(context('/api/dev/maintenance', db))).status, 200);
  assert.equal((await middleware(context('/', db, {googleSession: true}))).status, 200);
  assert.equal((await middleware(context('/developer.html', db, {googleSession: true}))).status, 200);
  assert.equal((await middleware(context('/games/engine-test/', db))).headers.get('Location'), '/maintenance.html');
  assert.equal((await middleware(context('/games/engine-test/main.js', db, {accept: '*/*'}))).status, 404);
  assert.equal((await middleware(context('/games/engine-test/', db, {googleSession: true}))).status, 200);
  assert.equal((await middleware(context('/maintenance.html?preview=1', db, {googleSession: true}))).status, 200);
});

test('invalid account name, expired login code and storage faults cannot bypass maintenance', async () => {
  const db = new FakeDB({enabled: true, user: {id: ADMIN_ID, username: 'impostor'}});
  assert.equal((await middleware(context('/', db, {googleSession: true}))).status, 302);
  assert.equal((await middleware(context('/', db, {access: false}))).headers.get('Location'), '/login');
  const offline = new FakeDB({unavailable: true});
  assert.equal((await middleware(context('/', offline))).status, 503);
});
