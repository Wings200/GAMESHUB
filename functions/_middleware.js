function getCookie(request, name) {
  const cookieHeader =
    request.headers.get("Cookie") || "";

  const cookies =
    cookieHeader.split(";");

  for (const cookie of cookies) {
    const parts =
      cookie.trim().split("=");

    const key =
      parts.shift();

    if (key === name) {
      return parts.join("=");
    }
  }

  return null;
}


async function sign(value, secret) {
  const encoder =
    new TextEncoder();

  const key =
    await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      {
        name: "HMAC",
        hash: "SHA-256"
      },
      false,
      ["sign"]
    );

  const signature =
    await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(value)
    );

  return btoa(
    String.fromCharCode(
      ...new Uint8Array(signature)
    )
  )
  .replaceAll("+", "-")
  .replaceAll("/", "_")
  .replaceAll("=", "");
}


async function validSession(request, secret) {
  if (!secret) {
    return false;
  }

  const token =
    getCookie(
      request,
      "gh_access"
    );

  if (!token) {
    return false;
  }

  const separator =
    token.indexOf(".");

  if (separator === -1) {
    return false;
  }

  const expires =
    token.slice(
      0,
      separator
    );

  const signature =
    token.slice(
      separator + 1
    );

  const expiryNumber =
    Number(expires);

  if (
    !Number.isFinite(expiryNumber) ||
    Date.now() > expiryNumber
  ) {
    return false;
  }

  const expected =
    await sign(
      expires,
      secret
    );

  return signature === expected;
}


/*
  BLACKOUT PRIVATE DEVELOPMENT ACCESS

  GAMESHUB's general gh_access invite code is NOT a personal identity.
  BLACKOUT must also require the independent, Google-backed gh_session,
  which is looked up server-side in D1 rather than trusting a browser-supplied
  username. This runs for index.html AND all JS/CSS/assets, including direct
  URL requests. Guests and signed-out visitors cannot access the game.
*/
const BLACKOUT_USERNAME_KEY = "dynamitedev7392";

function isBlackoutPath(pathname) {
  let path = pathname;
  try {
    // Encoded slashes should not bypass access control.
    for (let i = 0; i < 3; i++) {
      const decoded = decodeURIComponent(path);
      if (decoded === path) break;
      path = decoded;
    }
  } catch {
    // Malformed encoding is not granted a special bypass.
  }
  path = path.replaceAll("\\", "/").replace(/\/+/g, "/").toLowerCase();
  return path === "/games/blackout" || path.startsWith("/games/blackout/");
}

async function verifiedBlackoutOwner(context) {
  const rawSession = getCookie(context.request, "gh_session");
  if (!rawSession || !context.env.DB) return false;

  // gh_session is an opaque server-issued token: only its SHA-256 hash is
  // present in the database, and its expiry must still be in the future.
  const digest = await crypto.subtle.digest(
    "SHA-256", new TextEncoder().encode(rawSession)
  );
  const sessionId = Array.from(new Uint8Array(digest),
    byte => byte.toString(16).padStart(2, "0")).join("");

  const account = await context.env.DB.prepare(`
    SELECT u.id, u.username_key
    FROM sessions AS s
    INNER JOIN users AS u ON u.id = s.user_id
    WHERE s.id = ? AND s.expires_at > ?
    LIMIT 1
  `).bind(sessionId, Date.now()).first();

  if (!account || account.username_key !== BLACKOUT_USERNAME_KEY) return false;

  // Optional extra protection if the site owner pins their immutable D1 user
  // ID in the Cloudflare environment. Never accept an ID from the client.
  const pinnedOwnerId = context.env.BLACKOUT_OWNER_USER_ID;
  return !pinnedOwnerId || account.id === pinnedOwnerId;
}

function privateBlackoutResponse(response) {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("Vary", "Cookie");
  headers.set("X-Robots-Tag", "noindex, nofollow");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}


export async function onRequest(context) {
  const url =
    new URL(
      context.request.url
    );


  /*
    PUBLIC FILES

    These must load before someone
    has logged in.
  */

  if (
    url.pathname === "/logo.png" ||
    url.pathname === "/favicon.ico" ||
    url.pathname === "/oauth-home" ||
    url.pathname === "/oauth-home.html" ||
    url.pathname === "/privacy" ||
    url.pathname === "/privacy.html" ||
    url.pathname === "/terms" ||
    url.pathname === "/terms.html" ||
    url.pathname === "/api/account/multiplayer-verify"
  ) {
    return context.next();
  }


  /*
    Login API must be public.
  */

  if (
    url.pathname === "/api/login"
  ) {
    return context.next();
  }


  const authenticated =
    await validSession(
      context.request,
      context.env.SESSION_SECRET
    );


  /*
    Login page must be accessible
    before authentication.
  */

  if (
    url.pathname === "/login" ||
    url.pathname === "/login.html"
  ) {
    if (authenticated) {
      return Response.redirect(
        new URL("/", url),
        302
      );
    }

    return context.next();
  }


  /*
    Everything else is private.
  */

  if (!authenticated) {
    return new Response(
      null,
      {
        status: 302,

        headers: {
          "Location": "/login",
          "Cache-Control": "no-store"
        }
      }
    );
  }


  if (isBlackoutPath(url.pathname)) {
    try {
      if (!await verifiedBlackoutOwner(context)) {
        return new Response("BLACKOUT is private to its developer account.", {
          status: 403,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "private, no-store",
            "X-Robots-Tag": "noindex, nofollow"
          }
        });
      }
      return privateBlackoutResponse(await context.next());
    } catch (error) {
      console.error("BLACKOUT authorization failed", error);
      return new Response("BLACKOUT access verification unavailable.", {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "private, no-store"
        }
      });
    }
  }

  return context.next();
}
