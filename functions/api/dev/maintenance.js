import {developerIdentity, ensureMaintenanceStore, readMaintenanceState} from '../../_lib/site-admin.js';

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff'
};
const reply = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: RESPONSE_HEADERS
});

async function authorized(context) {
  if (!context.env.DB) return {error: reply({ok: false, error: 'Storage unavailable.'}, 503)};
  try {
    const developer = await developerIdentity(context);
    if (!developer) return {error: reply({ok: false, error: 'Developer access required.'}, 403)};
    return {developer};
  } catch (error) {
    console.error('Maintenance authorization failed', error);
    return {error: reply({ok: false, error: 'Cannot verify developer identity.'}, 503)};
  }
}

export async function onRequestGet(context) {
  const result = await authorized(context);
  if (result.error) return result.error;
  try {
    const state = await readMaintenanceState(context.env.DB);
    return reply({ok: true, developer: true, ...state});
  } catch (error) {
    console.error('Maintenance state read failed', error);
    return reply({ok: false, error: 'Cannot read maintenance status.'}, 503);
  }
}

export async function onRequestPut(context) {
  const origin = context.request.headers.get('Origin');
  if (origin !== new URL(context.request.url).origin) {
    return reply({ok: false, error: 'Invalid request origin.'}, 403);
  }
  const contentType = context.request.headers.get('Content-Type') || '';
  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
    return reply({ok: false, error: 'JSON request required.'}, 415);
  }
  const result = await authorized(context);
  if (result.error) return result.error;
  const raw = await context.request.text();
  if (raw.length > 1024) return reply({ok: false, error: 'Request too large.'}, 413);
  let body;
  try { body = JSON.parse(raw); }
  catch { return reply({ok: false, error: 'Invalid JSON.'}, 400); }
  if (typeof body?.enabled !== 'boolean' ||
      !Number.isSafeInteger(body?.version) || body.version < 0) {
    return reply({ok: false, error: 'Expected enabled (boolean) and version (integer).'}, 400);
  }
  try {
    await ensureMaintenanceStore(context.env.DB);
    const now = Date.now();
    const update = await context.env.DB.prepare(
      'UPDATE site_maintenance SET enabled = ?, version = version + 1, ' +
      'updated_at = ?, updated_by = ? WHERE id = 1 AND version = ?'
    ).bind(body.enabled ? 1 : 0, now, result.developer.id, body.version).run();
    if (Number(update.meta?.changes || 0) !== 1) {
      return reply({ok: false, error: 'Status changed. Refresh and try again.'}, 409);
    }
    return reply({ok: true, developer: true, ...await readMaintenanceState(context.env.DB)});
  } catch (error) {
    console.error('Maintenance mode update failed', error);
    return reply({ok: false, error: 'Could not update maintenance mode.'}, 503);
  }
}
