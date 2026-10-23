import {
  verifiedBlackoutAccount, blackoutIsAdmin, blackoutJson
} from "../_lib/blackout-access.js";

function adminError(message, status) {
  return blackoutJson({ok:false,error:message},status);
}

async function requireAdmin(context) {
  const user = await verifiedBlackoutAccount(context);
  return user && blackoutIsAdmin(user, context.env) ? user : null;
}

async function ensureTables(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS blackout_testers (
      user_id TEXT PRIMARY KEY,
      active INTEGER NOT NULL DEFAULT 1,
      added_by TEXT NOT NULL,
      added_at INTEGER NOT NULL
    )
  `).run();
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS blackout_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `).run();
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS blackout_admin_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_id TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `).run();
}

async function readDashboard(context, user) {
  const db=context.env.DB;
  const [testerResults, setting, auditResults] = await Promise.all([
    db.prepare(`
      SELECT u.username, t.user_id, t.added_at, a.username AS added_by
      FROM blackout_testers t
      INNER JOIN users u ON u.id = t.user_id
      LEFT JOIN users a ON a.id = t.added_by
      WHERE t.active = 1
      ORDER BY LOWER(u.username)
    `).all(),
    db.prepare("SELECT value FROM blackout_settings WHERE key = 'maintenance' LIMIT 1").first(),
    db.prepare(`
      SELECT actor_name, action, target, created_at
      FROM blackout_admin_audit ORDER BY id DESC LIMIT 20
    `).all()
  ]);
  return blackoutJson({
    ok:true, role:"admin", username:user.username,
    adminUsers:["DynamiteDEV7392","DynamiteKid2000"],
    maintenance:setting?.value==="true",
    testers:(testerResults.results||[]).map(t=>({
      username:t.username, id:t.user_id, addedAt:t.added_at, addedBy:t.added_by||"admin"
    })),
    history:(auditResults.results||[]).map(h=>({
      actor:h.actor_name, action:h.action, target:h.target, at:h.created_at
    }))
  });
}

async function audit(db,user,action,target) {
  await db.prepare(`
    INSERT INTO blackout_admin_audit (actor_id, actor_name, action, target, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(user.id,user.username,action,target,Date.now()).run();
}

export async function onRequestGet(context) {
  try {
    const user=await requireAdmin(context);
    if (!user) return adminError("BLACKOUT admins only.",403);
    await ensureTables(context.env.DB);
    return readDashboard(context,user);
  } catch (error) {
    console.error("BLACKOUT admin read failed",error);
    return adminError("Admin data unavailable.",503);
  }
}

export async function onRequestPost(context) {
  try {
    const user=await requireAdmin(context);
    if (!user) return adminError("BLACKOUT admins only.",403);
    const expectedOrigin=new URL(context.request.url).origin;
    if (context.request.headers.get("Origin")!==expectedOrigin) {
      return adminError("Request origin not allowed.",403);
    }
    if (!context.request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) {
      return adminError("JSON requests only.",415);
    }
    const body=await context.request.json().catch(()=>null);
    if (!body || typeof body.action!=="string") return adminError("Invalid request.",400);
    const db=context.env.DB;
    await ensureTables(db);
    if (body.action==="addTester") {
      const username=String(body.username||"").trim();
      if (!/^[A-Za-z0-9_]{3,18}$/.test(username)) {
        return adminError("Enter an existing 3–18 character GamesHub username.",400);
      }
      const target=await db.prepare(
        "SELECT id, username, username_key FROM users WHERE username_key = ? LIMIT 1"
      ).bind(username.toLowerCase()).first();
      if (!target) return adminError("No GamesHub account has that username. They must register first.",404);
      if (["dynamitedev7392","dynamitekid2000"].includes(target.username_key)) {
        return adminError("Admin accounts already have permanent access.",409);
      }
      const count=await db.prepare("SELECT COUNT(*) AS total FROM blackout_testers WHERE active = 1").first();
      if ((count?.total||0)>=50) return adminError("Maximum 50 private testers.",409);
      await db.prepare(`
        INSERT INTO blackout_testers (user_id, active, added_by, added_at)
        VALUES (?, 1, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET active = 1, added_by = excluded.added_by,
          added_at = excluded.added_at
      `).bind(target.id,user.id,Date.now()).run();
      await audit(db,user,"granted access",target.username);
    } else if (body.action==="removeTester") {
      const targetId=String(body.id||"");
      if (targetId.length<10 || targetId.length>100) return adminError("Invalid tester.",400);
      const target=await db.prepare(`
        SELECT u.username FROM blackout_testers t
        JOIN users u ON u.id=t.user_id
        WHERE t.user_id=? AND t.active=1 LIMIT 1
      `).bind(targetId).first();
      if (!target) return adminError("Tester not found.",404);
      await db.prepare("DELETE FROM blackout_testers WHERE user_id = ?").bind(targetId).run();
      await audit(db,user,"revoked access",target.username);
    } else if (body.action==="setMaintenance") {
      if (typeof body.maintenance!=="boolean") return adminError("Invalid maintenance setting.",400);
      await db.prepare(`
        INSERT INTO blackout_settings (key, value, updated_by, updated_at)
        VALUES ('maintenance', ?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value=excluded.value,
          updated_by=excluded.updated_by, updated_at=excluded.updated_at
      `).bind(String(body.maintenance),user.id,Date.now()).run();
      await audit(db,user,body.maintenance?"enabled maintenance":"disabled maintenance","tester access");
    } else {
      return adminError("Unknown admin action.",400);
    }
    return readDashboard(context,user);
  } catch (error) {
    console.error("BLACKOUT admin update failed",error);
    return adminError("Could not save admin changes.",503);
  }
}
