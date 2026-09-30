function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",

        "Cache-Control":
          "no-store"
      }
    }
  );
}


function getCookie(
  request,
  name
) {
  const cookieHeader =
    request.headers.get("Cookie")
    ||
    "";

  const cookies =
    cookieHeader.split(";");

  for (
    const cookie
    of cookies
  ) {
    const [
      key,
      ...rest
    ] =
      cookie
        .trim()
        .split("=");

    if (
      key === name
    ) {
      return decodeURIComponent(
        rest.join("=")
      );
    }
  }

  return null;
}


async function sha256Hex(
  value
) {
  const bytes =
    new TextEncoder()
      .encode(value);

  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      bytes
    );

  return Array
    .from(
      new Uint8Array(digest)
    )
    .map(
      byte =>
        byte
          .toString(16)
          .padStart(2, "0")
    )
    .join("");
}


function base64UrlToBytes(
  value
) {
  let base64 =
    value
      .replaceAll(
        "-",
        "+"
      )
      .replaceAll(
        "_",
        "/"
      );


  while (
    base64.length %
    4
  ) {
    base64 +=
      "=";
  }


  const binary =
    atob(
      base64
    );


  const bytes =
    new Uint8Array(
      binary.length
    );


  for (
    let i = 0;
    i < binary.length;
    i++
  ) {
    bytes[
      i
    ] =
      binary.charCodeAt(
        i
      );
  }


  return bytes;
}


async function readGuest(
  request,
  secret
) {
  const token =
    getCookie(
      request,
      "gh_guest"
    );


  if (
    !token
    ||
    !secret
  ) {
    return null;
  }


  const parts =
    token.split(
      "."
    );


  if (
    parts.length !==
    3
    ||
    parts[0] !==
    "v1"
  ) {
    return null;
  }


  const signedValue =
    `${parts[0]}.${parts[1]}`;


  const key =
    await crypto.subtle.importKey(
      "raw",
      new TextEncoder()
        .encode(
          secret
        ),
      {
        name:
          "HMAC",

        hash:
          "SHA-256"
      },
      false,
      [
        "verify"
      ]
    );


  let valid =
    false;


  try {
    valid =
      await crypto.subtle.verify(
        "HMAC",
        key,
        base64UrlToBytes(
          parts[2]
        ),
        new TextEncoder()
          .encode(
            signedValue
          )
      );
  }

  catch {
    return null;
  }


  if (
    !valid
  ) {
    return null;
  }


  let guest;


  try {
    guest =
      JSON.parse(
        new TextDecoder()
          .decode(
            base64UrlToBytes(
              parts[1]
            )
          )
      );
  }

  catch {
    return null;
  }


  if (
    typeof guest?.id !==
    "string"
    ||
    !/^GUEST-[A-Z0-9]{6}$/.test(
      String(
        guest?.username
        ||
        ""
      )
    )
    ||
    !Number.isFinite(
      Number(
        guest?.exp
      )
    )
    ||
    Date.now() >=
    Number(
      guest.exp
    )
  ) {
    return null;
  }


  return {
    id:
      `guest:${guest.id}`,

    guestId:
      guest.id,

    username:
      guest.username
  };
}


export async function onRequestGet(
  context
) {
  try {
    const token =
      getCookie(
        context.request,
        "gh_session"
      );


    if (
      token
    ) {
      const sessionId =
        await sha256Hex(
          token
        );


      const now =
        Date.now();


      const user =
        await context.env.DB
          .prepare(`
            SELECT
              u.id,
              u.username,
              u.created_at,
              u.updated_at
            FROM sessions s
            JOIN users u
              ON u.id = s.user_id
            WHERE s.id = ?
              AND s.expires_at > ?
            LIMIT 1
          `)
          .bind(
            sessionId,
            now
          )
          .first();


      if (
        user
      ) {
        return json({
          ok:
            true,

          signedIn:
            true,

          guest:
            false,

          needsUsername:
            !user.username,

          user: {
            id:
              user.id,

            username:
              user.username
              ??
              null
          }
        });
      }
    }


    const guest =
      await readGuest(
        context.request,
        context.env
          .SESSION_SECRET
      );


    if (
      guest
    ) {
      return json({
        ok:
          true,

        signedIn:
          true,

        guest:
          true,

        needsUsername:
          false,

        user: {
          id:
            guest.id,

          username:
            guest.username
        }
      });
    }


    return json({
      ok:
        true,

      signedIn:
        false,

      guest:
        false,

      user:
        null
    });
  }

  catch (error) {
    console.error(
      "GAMESHUB account lookup failed:",
      error
    );

    return json(
      {
        ok: false,
        error:
          "Could not load account."
      },
      500
    );
  }
}
