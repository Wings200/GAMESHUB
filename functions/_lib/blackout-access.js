// Shared BLACKOUT permissions. Always verify the opaque Google-backed session in D1.
export const BLACKOUT_ADMIN_KEYS = Object.freeze([
  "dynamitedev7392",
  "dynamitekid2000"
]);

export function cookieValue(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return null;
}

function normalizedPath(pathname) {
  let path = pathname;
  try {
    for (let i = 0; i < 3; i++) {
      const decoded = decodeURIComponent(path);
      if (decoded === path) break;
      path = decoded;
    }
  } catch {
    return "";
  }
  return path.replaceAll("\\", "/").replace(/\/+/g, "/").toLowerCase();
}

export function blackoutGamePath(pathname) {
  const path = normalizedPath(pathname);
  return path === "/games/blackout" || path.startsWith("/games/blackout/");
}

export function blackoutAdminPage(pathname) {
  const path = normalizedPath(pathname);
  return path === "/games/blackout/admin.html" || path === "/games/blackout/admin";
}

export async function verifiedBlackoutAccount(context) {
  if (!context.env.DB) return null;
  const sessionToken = cookieValue(context.request, "gh_session");
  if (!sessionToken) return null;
  const hash = await crypto.subtle.digest(
    "SHA-256", new TextEncoder().encode(sessionToken)
  );
  const sessionId = Array.from(new Uint8Array(hash), byte =>
    byte.toString(16).padStart(2, "0")).join("");
  return context.env.DB.prepare(`
    SELECT u.id, u.username, u.username_key
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.id = ? AND s.expires_at > ?
    LIMIT 1
  `).bind(sessionId, Date.now()).first();
}

export function blackoutIsAdmin(account, env) {
  if (!account || !BLACKOUT_ADMIN_KEYS.includes(account.username_key)) return false;
  // Pins to immutable D1 user IDs are optional, but take precedence when configured.
  const pin = account.username_key === "dynamitedev7392"
    ? env.BLACKOUT_OWNER_USER_ID : env.BLACKOUT_SECOND_ADMIN_USER_ID;
  return !pin || account.id === pin;
}

export async function blackoutRole(context, account) {
  if (!account) return "locked";
  if (blackoutIsAdmin(account, context.env)) return "admin";
  if (!context.env.DB) return "locked";
  const table = await context.env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'blackout_testers' LIMIT 1"
  ).first();
  if (!table) return "locked";
  const tester = await context.env.DB.prepare(
    "SELECT user_id FROM blackout_testers WHERE user_id = ? AND active = 1 LIMIT 1"
  ).bind(account.id).first();
  if (!tester) return "locked";
  const settingsTable = await context.env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'blackout_settings' LIMIT 1"
  ).first();
  if (!settingsTable) return "tester";
  const maintenance = await context.env.DB.prepare(
    "SELECT value FROM blackout_settings WHERE key = 'maintenance' LIMIT 1"
  ).first();
  return maintenance?.value === "true" ? "paused" : "tester";
}

export function blackoutJson(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Vary": "Cookie",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
