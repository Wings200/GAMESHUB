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


export async function onRequestPost(
  context
) {
  try {
    const body =
      await context.request
        .json()
        .catch(
          () => null
        );


    const token =
      typeof body?.token ===
      "string"
        ?
        body.token.trim()
        :
        "";


    /*
      Current multiplayer tokens are 96 lowercase hex characters.
      Reject obviously-invalid requests before touching D1.
    */

    if (
      !/^[a-f0-9]{96}$/i.test(
        token
      )
    ) {
      return json(
        {
          ok:
            false,

          error:
            "Invalid multiplayer token."
        },
        401
      );
    }


    await ensureTokenTable(
      context.env.DB
    );


    const tokenHash =
      await sha256Hex(
        token
      );


    const now =
      Date.now();


    /*
      Atomically claim the one-use token. Only the first verifier can
      change used_at from NULL, so replayed tokens fail.
    */

    const claimed =
      await context.env.DB
        .prepare(`
          UPDATE multiplayer_tokens
          SET used_at = ?
          WHERE id = ?
            AND used_at IS NULL
            AND expires_at > ?
        `)
        .bind(
          now,
          tokenHash,
          now
        )
        .run();


    if (
      Number(
        claimed.meta?.changes
        ??
        0
      )
      !==
      1
    ) {
      return json(
        {
          ok:
            false,

          error:
            "Multiplayer token expired or already used."
        },
        401
      );
    }


    const user =
      await context.env.DB
        .prepare(`
          SELECT
            u.id,
            u.username
          FROM multiplayer_tokens mt
          JOIN users u
            ON u.id = mt.user_id
          WHERE mt.id = ?
            AND mt.used_at = ?
          LIMIT 1
        `)
        .bind(
          tokenHash,
          now
        )
        .first();


    /*
      The token is one-use. Remove it after resolving the account.
    */

    await context.env.DB
      .prepare(`
        DELETE FROM multiplayer_tokens
        WHERE id = ?
      `)
      .bind(
        tokenHash
      )
      .run();


    if (
      !user?.id
      ||
      !user?.username
    ) {
      return json(
        {
          ok:
            false,

          error:
            "GAMESHUB account not found."
        },
        401
      );
    }


    return json({
      ok:
        true,

      user: {
        id:
          user.id,

        username:
          user.username
      }
    });
  }

  catch (
    error
  ) {
    console.error(
      "Multiplayer identity verification failed:",
      error
    );


    return json(
      {
        ok:
          false,

        error:
          "Could not verify multiplayer account."
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
