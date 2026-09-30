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


    await ensureTokenTables(
      context.env.DB
    );


    const tokenHash =
      await sha256Hex(
        token
      );


    const now =
      Date.now();


    /*
      First try a normal GAMESHUB account token.
    */

    const claimedUser =
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
        claimedUser.meta?.changes
        ??
        0
      )
      ===
      1
    ) {
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
        user?.id
        &&
        user?.username
      ) {
        return json({
          ok:
            true,

          guest:
            false,

          user: {
            id:
              user.id,

            username:
              user.username
          }
        });
      }


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


    /*
      If it was not a normal account token, try the one-use
      guest-token table.
    */

    const claimedGuest =
      await context.env.DB
        .prepare(`
          UPDATE guest_multiplayer_tokens
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
        claimedGuest.meta?.changes
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


    const guest =
      await context.env.DB
        .prepare(`
          SELECT
            guest_id,
            username
          FROM guest_multiplayer_tokens
          WHERE id = ?
            AND used_at = ?
          LIMIT 1
        `)
        .bind(
          tokenHash,
          now
        )
        .first();


    await context.env.DB
      .prepare(`
        DELETE FROM guest_multiplayer_tokens
        WHERE id = ?
      `)
      .bind(
        tokenHash
      )
      .run();


    if (
      !guest?.guest_id
      ||
      !guest?.username
    ) {
      return json(
        {
          ok:
            false,

          error:
            "Guest identity not found."
        },
        401
      );
    }


    return json({
      ok:
        true,

      guest:
        true,

      user: {
        id:
          `guest:${guest.guest_id}`,

        username:
          guest.username
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
