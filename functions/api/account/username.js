function json(
  data,
  status = 200
) {
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


function cleanUsername(
  value
) {
  return String(
    value
    ??
    ""
  )
    .trim();
}


function validateUsername(
  username
) {
  if (
    username.length < 3
    ||
    username.length > 18
  ) {
    return {
      valid: false,
      error:
        "Username must be 3–18 characters."
    };
  }


  if (
    !/^[A-Za-z0-9_]+$/.test(
      username
    )
  ) {
    return {
      valid: false,
      error:
        "Use only letters, numbers, and underscores."
    };
  }


  return {
    valid: true,
    error: null
  };
}


async function getCurrentUser(
  context
) {
  const token =
    getCookie(
      context.request,
      "gh_session"
    );

  if (!token) {
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


/* =========================================================
   CHECK AVAILABILITY
========================================================= */

export async function onRequestGet(
  context
) {
  try {
    const url =
      new URL(
        context.request.url
      );


    const username =
      cleanUsername(
        url.searchParams.get(
          "username"
        )
      );


    const validation =
      validateUsername(
        username
      );


    if (
      !validation.valid
    ) {
      return json({
        ok: true,
        valid: false,
        available: false,
        error:
          validation.error
      });
    }


    const usernameKey =
      username.toLowerCase();


    const existing =
      await context.env.DB
        .prepare(`
          SELECT id
          FROM users
          WHERE username_key = ?
          LIMIT 1
        `)
        .bind(
          usernameKey
        )
        .first();


    return json({
      ok: true,
      valid: true,
      available:
        !existing
    });
  }

  catch (error) {
    console.error(
      "Username check failed:",
      error
    );

    return json(
      {
        ok: false,
        error:
          "Could not check username."
      },
      500
    );
  }
}


/* =========================================================
   SET / CHANGE USERNAME
========================================================= */

export async function onRequestPost(
  context
) {
  try {
    const user =
      await getCurrentUser(
        context
      );


    if (!user) {
      return json(
        {
          ok: false,
          error:
            "You are not signed in."
        },
        401
      );
    }


    const body =
      await context.request
        .json()
        .catch(
          () => null
        );


    const username =
      cleanUsername(
        body?.username
      );


    const validation =
      validateUsername(
        username
      );


    if (
      !validation.valid
    ) {
      return json(
        {
          ok: false,
          error:
            validation.error
        },
        400
      );
    }


    const usernameKey =
      username.toLowerCase();


    const existing =
      await context.env.DB
        .prepare(`
          SELECT id
          FROM users
          WHERE username_key = ?
            AND id != ?
          LIMIT 1
        `)
        .bind(
          usernameKey,
          user.id
        )
        .first();


    if (existing) {
      return json(
        {
          ok: false,
          error:
            "That username is already taken."
        },
        409
      );
    }


    const now =
      Date.now();


    try {
      await context.env.DB
        .prepare(`
          UPDATE users
          SET
            username = ?,
            username_key = ?,
            updated_at = ?,
            username_changed_at = ?
          WHERE id = ?
        `)
        .bind(
          username,
          usernameKey,
          now,
          now,
          user.id
        )
        .run();
    }

    catch (error) {
      /*
        Handles two people trying to claim
        the same username simultaneously.
      */

      if (
        String(error)
          .toLowerCase()
          .includes("unique")
      ) {
        return json(
          {
            ok: false,
            error:
              "That username is already taken."
          },
          409
        );
      }

      throw error;
    }


    return json({
      ok: true,

      user: {
        id:
          user.id,

        username
      }
    });
  }

  catch (error) {
    console.error(
      "Username save failed:",
      error
    );

    return json(
      {
        ok: false,
        error:
          "Could not save username."
      },
      500
    );
  }
}
