const GUEST_LIFETIME_SECONDS =
  60 * 60 * 24 * 365;

const GUEST_CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";


function json(
  data,
  status = 200,
  headers = {}
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
          "no-store",

        ...headers
      }
    }
  );
}


function base64UrlFromBytes(
  bytes
) {
  let binary =
    "";


  for (
    const byte
    of bytes
  ) {
    binary +=
      String.fromCharCode(
        byte
      );
  }


  return btoa(
    binary
  )
    .replaceAll(
      "+",
      "-"
    )
    .replaceAll(
      "/",
      "_"
    )
    .replaceAll(
      "=",
      ""
    );
}


function base64UrlFromText(
  value
) {
  return base64UrlFromBytes(
    new TextEncoder()
      .encode(
        value
      )
  );
}


async function sign(
  value,
  secret
) {
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
        "sign"
      ]
    );


  const signature =
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder()
        .encode(
          value
        )
    );


  return base64UrlFromBytes(
    new Uint8Array(
      signature
    )
  );
}


function randomGuestCode() {
  const bytes =
    new Uint8Array(
      6
    );


  crypto.getRandomValues(
    bytes
  );


  let value =
    "";


  for (
    const byte
    of bytes
  ) {
    value +=
      GUEST_CHARS[
        byte %
        GUEST_CHARS.length
      ];
  }


  return value;
}


export async function onRequestPost(
  context
) {
  try {
    const secret =
      context.env
        .SESSION_SECRET;


    if (
      !secret
    ) {
      throw new Error(
        "Guest signing secret is unavailable."
      );
    }


    const now =
      Date.now();


    const guest = {
      id:
        crypto.randomUUID(),

      username:
        `GUEST-${randomGuestCode()}`,

      createdAt:
        now,

      exp:
        now
        +
        GUEST_LIFETIME_SECONDS
        *
        1000
    };


    const payload =
      base64UrlFromText(
        JSON.stringify(
          guest
        )
      );


    const value =
      `v1.${payload}`;


    const signature =
      await sign(
        value,
        secret
      );


    const token =
      `${value}.${signature}`;


    const cookie =
      [
        `gh_guest=${token}`,
        "Path=/",
        "HttpOnly",
        "Secure",
        "SameSite=Lax",
        `Max-Age=${GUEST_LIFETIME_SECONDS}`
      ]
        .join(
          "; "
        );


    return json(
      {
        ok:
          true,

        guest:
          true,

        user: {
          id:
            `guest:${guest.id}`,

          username:
            guest.username
        }
      },
      200,
      {
        "Set-Cookie":
          cookie
      }
    );
  }

  catch (
    error
  ) {
    console.error(
      "Could not create GAMESHUB guest:",
      error
    );


    return json(
      {
        ok:
          false,

        error:
          "Could not create guest account."
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
