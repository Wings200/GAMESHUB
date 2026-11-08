// Shared, server-side authorization for GAMESHUB site administration.
// A matching username alone is not sufficient: both the immutable user ID
// and the current username must match this allowlist.
const DEVELOPER_ACCOUNTS = Object.freeze({
  '51cb59ec-7c65-43ad-9431-236d9c7fcc17': 'dynamitedev7392',
  '71a8cd8f-ef72-4770-83bf-e4da5085f316': 'dynamitekid2000'
});

export function cookieValue(request, key) {
  const cookies = (request.headers.get('Cookie') || '').split(';');
  for (const entry of cookies) {
    const index = entry.indexOf('=');
    if (index !== -1 && entry.slice(0, index).trim() === key) {
      return entry.slice(index + 1);
    }
  }
  return null;
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest(
    'SHA-256', new TextEncoder().encode(value)
  );
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
}

export async function developerIdentity(context) {
  const rawToken = cookieValue(context.request, 'gh_session');
  if (!rawToken || !context.env.DB) return null;
  const sessionHash = await sha256Hex(rawToken);
  const user = await context.env.DB.prepare(
    'SELECT u.id, u.username FROM sessions s JOIN users u ON u.id = s.user_id ' +
    'WHERE s.id = ? AND s.expires_at > ? LIMIT 1'
  ).bind(sessionHash, Date.now()).first();
  if (!user) return null;
  const expectedUsername = DEVELOPER_ACCOUNTS[String(user.id)];
  return expectedUsername && String(user.username || '').toLowerCase() === expectedUsername
    ? user : null;
}

export async function readMaintenanceState(db) {
  if (!db) throw new Error('D1 maintenance storage is unavailable.');
  try {
    const row = await db.prepare(
      'SELECT enabled, version, updated_at, updated_by FROM site_maintenance WHERE id = 1'
    ).first();
    return {
      enabled: Number(row?.enabled || 0) === 1,
      version: Number(row?.version || 0),
      updatedAt: Number(row?.updated_at || 0),
      updatedBy: row?.updated_by || null
    };
  } catch (error) {
    // The first deployment must start OFF without requiring a manual migration.
    if (/no such table:\s*site_maintenance/i.test(String(error))) {
      return {enabled: false, version: 0, updatedAt: 0, updatedBy: null};
    }
    // Unexpected D1 errors must NOT silently disable an active maintenance gate.
    throw error;
  }
}

export async function ensureMaintenanceStore(db) {
  await db.prepare(
    'CREATE TABLE IF NOT EXISTS site_maintenance (' +
    'id INTEGER PRIMARY KEY CHECK (id = 1), ' +
    'enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)), ' +
    'version INTEGER NOT NULL DEFAULT 0, ' +
    'updated_at INTEGER NOT NULL DEFAULT 0, updated_by TEXT)'
  ).run();
  await db.prepare(
    'INSERT OR IGNORE INTO site_maintenance (id, enabled, version, updated_at, updated_by) ' +
    'VALUES (1, 0, 0, 0, NULL)'
  ).run();
}
