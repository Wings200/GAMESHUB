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


async function ensureTokenTable(
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


    if (
      !user
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


    await ensureTokenTable(
      context.env.DB
    );


    const now =
      Date.now();


    /*
      Keep this table tiny. Used tokens and old expired tokens have no
      reason to stick around.
    */

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


    return json({
      ok:
        true,

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
