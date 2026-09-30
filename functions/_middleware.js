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
    url.pathname === "/terms.html"
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


  return context.next();
}
