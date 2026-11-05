import {validateBalanceChanges} from '../../../games/rpg-prototype/balance-schema.mjs';

// Server-side stable ID + username pair verification. Never trust a display name alone.
const ADMIN_ACCOUNTS = Object.freeze({
  '51cb59ec-7c65-43ad-9431-236d9c7fcc17': 'dynamitedev7392',
  '71a8cd8f-ef72-4770-83bf-e4da5085f316': 'dynamitekid2000'
});
const MAX_BODY_BYTES = 65000;
const headers = {'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8'};
const reply = (body, status = 200) => new Response(JSON.stringify(body), {status, headers});

function cookieValue(request, key) {
  const cookies = (request.headers.get('Cookie') || '').split(';');
  for (const entry of cookies) {
    const index = entry.indexOf('=');
    if (index >= 0 && entry.slice(0, index).trim() === key)
      return entry.slice(index + 1);
  }
  return null;
}
async function sha256Hex(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function developerIdentity(context) {
  const session = cookieValue(context.request, 'gh_session');
  if (!session || !context.env.DB) return null;
  const user = await context.env.DB.prepare(
    'SELECT u.id, u.username FROM sessions s JOIN users u ON u.id = s.user_id ' +
    'WHERE s.id = ? AND s.expires_at > ? LIMIT 1'
  ).bind(await sha256Hex(session), Date.now()).first();
  if (!user) return null;
  const expectedUsername = ADMIN_ACCOUNTS[String(user.id)];
  return expectedUsername && String(user.username || '').toLowerCase() === expectedUsername
    ? user : null;
}
async function ensureStore(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS developer_game_settings (' +
    'id INTEGER PRIMARY KEY CHECK (id = 1), version INTEGER NOT NULL, ' +
    'overrides TEXT NOT NULL, updated_at INTEGER NOT NULL, updated_by TEXT)').run();
  await db.prepare('INSERT OR IGNORE INTO developer_game_settings ' +
    '(id, version, overrides, updated_at, updated_by) VALUES (1, 0, ?, 0, NULL)')
    .bind('{}').run();
}
async function settingsRow(db) {
  return db.prepare('SELECT version, overrides FROM developer_game_settings WHERE id = 1').first();
}
export async function onRequestGet(context) {
  if (!context.env.DB) return reply({ok: false, error: 'Game settings storage is unavailable.'}, 503);
  try {
    await ensureStore(context.env.DB);
    const [row, developer] = await Promise.all([
      settingsRow(context.env.DB), developerIdentity(context)
    ]);
    return reply({ok: true, version: row.version, changes: JSON.parse(row.overrides),
      admin: !!developer});
  } catch (error) {
    console.error('Developer settings read failed', error);
    return reply({ok: false, error: 'Could not load game settings.'}, 503);
  }
}
export async function onRequestPut(context) {
  const origin = context.request.headers.get('Origin');
  if (origin && origin !== new URL(context.request.url).origin)
    return reply({ok: false, error: 'Invalid request origin.'}, 403);
  if (!context.env.DB) return reply({ok: false, error: 'Game settings storage is unavailable.'}, 503);
  let developer;
  try { developer = await developerIdentity(context); }
  catch { return reply({ok: false, error: 'Account verification failed.'}, 503); }
  if (!developer) return reply({ok: false, error: 'Developer account required.'}, 403);
  if (!/^application\/json(?:;|$)/i.test(context.request.headers.get('Content-Type') || ''))
    return reply({ok: false, error: 'Expected JSON.'}, 415);
  const raw = await context.request.text();
  if (raw.length > MAX_BODY_BYTES) return reply({ok: false, error: 'Settings payload is too large.'}, 413);
  let body, changes;
  try {
    body = JSON.parse(raw);
    changes = validateBalanceChanges(body.changes);
    if (!Number.isSafeInteger(body.version) || body.version < 0)
      throw Error('Invalid settings version.');
  } catch (error) {
    return reply({ok: false, error: String(error.message || 'Invalid settings.')}, 400);
  }
  try {
    await ensureStore(context.env.DB);
    const result = await context.env.DB.prepare(
      'UPDATE developer_game_settings SET version = version + 1, overrides = ?, ' +
      'updated_at = ?, updated_by = ? WHERE id = 1 AND version = ?'
    ).bind(JSON.stringify(changes), Date.now(), String(developer.id), body.version).run();
    if (result.meta?.changes !== 1) {
      const latest = await settingsRow(context.env.DB);
      return reply({ok: false, error: 'Settings changed elsewhere. Reload and try again.',
        version: latest.version}, 409);
    }
    return reply({ok: true, version: body.version + 1});
  } catch (error) {
    console.error('Developer settings write failed', error);
    return reply({ok: false, error: 'Could not save settings.'}, 503);
  }
}
