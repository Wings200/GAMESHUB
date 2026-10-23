import { blackoutGamePath, blackoutAdminPage, verifiedBlackoutAccount, blackoutRole } from "./_lib/blackout-access.js";

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
    url.pathname === "/api/account/multiplayer-verify" ||
    // The Worker must consume one-use BLACKOUT tickets without a browser cookie.
    url.pathname === "/api/blackout-multiplayer-verify"
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


  if (blackoutGamePath(url.pathname)) {
    try {
      const account = await verifiedBlackoutAccount(context);
      const role = await blackoutRole(context, account);
      if (
        (role !== "admin" && role !== "tester") ||
        (blackoutAdminPage(url.pathname) && role !== "admin")
      ) {
        return new Response(
          role === "paused"
            ? "BLACKOUT tester access is temporarily paused by an admin."
            : "BLACKOUT is private. Sign in with an approved GamesHub account.",
          {
            status: 403,
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "private, no-store",
              "X-Robots-Tag": "noindex, nofollow"
            }
          }
        );
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
