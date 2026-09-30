const TOKEN_LIFETIME_MS =
  2 * 60 * 1000;


function json(
  data,
  status = 200
) {
  return new Response(
    JSON.stringify(
      data
    ),
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
    request.headers.get(
      "Cookie"
    )
    ||
    "";


  for (
    const cookie
    of cookieHeader.split(";")
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
      .encode(
        value
      );


  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      bytes
    );


  return Array
    .from(
      new Uint8Array(
        digest
      )
    )
    .map(
      byte =>
        byte
          .toString(16)
          .padStart(
            2,
            "0"
          )
    )
    .join("");
}


function makeToken() {
  return (
    crypto.randomUUID()
    +
    crypto.randomUUID()
    +
    crypto.randomUUID()
  )
    .replaceAll(
      "-",
      ""
    );
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
    bytes[i] =
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
      guest.id,

    username:
      guest.username
  };
}


async function ensureTokenTables(
  db
) {
  await db
    .prepare(`
      CREATE TABLE IF NOT EXISTS multiplayer_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        used_at INTEGER
      )
    `)
    .run();


  await db
    .prepare(`
      CREATE TABLE IF NOT EXISTS guest_multiplayer_tokens (
        id TEXT PRIMARY KEY,
        guest_id TEXT NOT NULL,
        username TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        used_at INTEGER
      )
    `)
    .run();
}


async function getCurrentUser(
  context
) {
  const token =
    getCookie(
      context.request,
      "gh_session"
    );


  if (
    !token
  ) {
    return null;
  }


  const sessionId =
    await sha256Hex(
      token
    );


  return await context.env.DB
    .prepare(`
      SELECT
        u.id,
        u.username
      FROM sessions s
      JOIN users u
        ON u.id = s.user_id
      WHERE s.id = ?
        AND s.expires_at > ?
      LIMIT 1
    `)
    .bind(
      sessionId,
      Date.now()
    )
    .first();
}


export async function onRequestPost(
  context
) {
  try {
    const user =
      await getCurrentUser(
        context
      );


    const guest =
      user
        ?
        null
        :
        await readGuest(
          context.request,
          context.env
            .SESSION_SECRET
        );


    if (
      !user
      &&
      !guest
    ) {
      return json(
        {
          ok:
            false,

          error:
            "You are not signed in."
        },
        401
      );
    }


    if (
      user
      &&
      !user.username
    ) {
      return json(
        {
          ok:
            false,

          error:
            "Choose a GAMESHUB username first."
        },
        409
      );
    }


    await ensureTokenTables(
      context.env.DB
    );


    const now =
      Date.now();


    await context.env.DB
      .prepare(`
        DELETE FROM multiplayer_tokens
        WHERE expires_at <= ?
           OR used_at IS NOT NULL
      `)
      .bind(
        now
      )
      .run();


    await context.env.DB
      .prepare(`
        DELETE FROM guest_multiplayer_tokens
        WHERE expires_at <= ?
           OR used_at IS NOT NULL
      `)
      .bind(
        now
      )
      .run();


    const rawToken =
      makeToken();


    const tokenHash =
      await sha256Hex(
        rawToken
      );


    const expiresAt =
      now
      +
      TOKEN_LIFETIME_MS;


    if (
      user
    ) {
      await context.env.DB
        .prepare(`
          INSERT INTO multiplayer_tokens (
            id,
            user_id,
            created_at,
            expires_at,
            used_at
          )
          VALUES (?, ?, ?, ?, NULL)
        `)
        .bind(
          tokenHash,
          user.id,
          now,
          expiresAt
        )
        .run();
    }

    else {
      await context.env.DB
        .prepare(`
          INSERT INTO guest_multiplayer_tokens (
            id,
            guest_id,
            username,
            created_at,
            expires_at,
            used_at
          )
          VALUES (?, ?, ?, ?, ?, NULL)
        `)
        .bind(
          tokenHash,
          guest.id,
          guest.username,
          now,
          expiresAt
        )
        .run();
    }


    return json({
      ok:
        true,

      guest:
        Boolean(
          guest
        ),

      token:
        rawToken,

      expiresAt
    });
  }

  catch (
    error
  ) {
    console.error(
      "Could not issue multiplayer identity token:",
      error
    );


    return json(
      {
        ok:
          false,

        error:
          "Could not authorize multiplayer."
      },
      500
    );
  }
}


export function onRequestGet() {
  return json(
    {
      ok:
        false,

      error:
        "Use POST."
    },
    405
  );
}
