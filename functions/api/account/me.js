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


export async function onRequestGet(
  context
) {
  try {
    const token =
      getCookie(
        context.request,
        "gh_session"
      );

    if (!token) {
      return json({
        ok: true,
        signedIn: false,
        user: null
      });
    }


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


    if (!user) {
      return json({
        ok: true,
        signedIn: false,
        user: null
      });
    }


    return json({
      ok: true,

      signedIn: true,

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
