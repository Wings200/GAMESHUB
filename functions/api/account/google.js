const GOOGLE_CLIENT_ID =
  "683249112077-m8qs13n230mmp6qpk71ok5mbmi1s10v0.apps.googleusercontent.com";

const GOOGLE_JWKS_URL =
  "https://www.googleapis.com/oauth2/v3/certs";

const SESSION_LENGTH_SECONDS =
  60 * 60 * 24 * 30;


/* =========================================================
   RESPONSE
========================================================= */

function json(data, status = 200, headers = {}) {
  return new Response(
    JSON.stringify(data),
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


/* =========================================================
   BASE64 URL
========================================================= */

function base64UrlToBytes(value) {
  let base64 =
    value
      .replace(/-/g, "+")
      .replace(/_/g, "/");

  while (
    base64.length % 4
  ) {
    base64 += "=";
  }

  const binary =
    atob(base64);

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
      binary.charCodeAt(i);
  }

  return bytes;
}


function decodeJwtJson(value) {
  const bytes =
    base64UrlToBytes(value);

  const text =
    new TextDecoder()
      .decode(bytes);

  return JSON.parse(text);
}


/* =========================================================
   SESSION TOKEN
========================================================= */

function makeSessionToken() {
  return (
    crypto.randomUUID()
    +
    crypto.randomUUID()
    +
    crypto.randomUUID()
  )
    .replace(/-/g, "");
}


async function sha256Hex(value) {
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


/* =========================================================
   VERIFY GOOGLE TOKEN
========================================================= */

async function verifyGoogleIdToken(
  token
) {
  if (
    typeof token !== "string"
    ||
    token.length < 20
  ) {
    throw new Error(
      "Missing Google credential."
    );
  }

  const parts =
    token.split(".");

  if (
    parts.length !== 3
  ) {
    throw new Error(
      "Invalid Google token."
    );
  }

  const [
    encodedHeader,
    encodedPayload,
    encodedSignature
  ] = parts;

  const header =
    decodeJwtJson(
      encodedHeader
    );

  const payload =
    decodeJwtJson(
      encodedPayload
    );

  if (
    header.alg !== "RS256"
    ||
    !header.kid
  ) {
    throw new Error(
      "Unsupported Google token."
    );
  }


  /* -------------------------------------------------------
     LOAD GOOGLE PUBLIC KEYS
  ------------------------------------------------------- */

  const keyResponse =
    await fetch(
      GOOGLE_JWKS_URL,
      {
        cf: {
          cacheTtl: 3600,
          cacheEverything: true
        }
      }
    );

  if (
    !keyResponse.ok
  ) {
    throw new Error(
      "Could not load Google signing keys."
    );
  }

  const keySet =
    await keyResponse.json();

  const jwk =
    keySet.keys?.find(
      key =>
        key.kid ===
        header.kid
    );

  if (
    !jwk
  ) {
    throw new Error(
      "Google signing key was not found."
    );
  }


  /* -------------------------------------------------------
     VERIFY SIGNATURE
  ------------------------------------------------------- */

  const cryptoKey =
    await crypto.subtle.importKey(
      "jwk",
      jwk,
      {
        name:
          "RSASSA-PKCS1-v1_5",

        hash:
          "SHA-256"
      },
      false,
      [
        "verify"
      ]
    );

  const signedData =
    new TextEncoder()
      .encode(
        `${encodedHeader}.${encodedPayload}`
      );

  const signature =
    base64UrlToBytes(
      encodedSignature
    );

  const validSignature =
    await crypto.subtle.verify(
      {
        name:
          "RSASSA-PKCS1-v1_5"
      },
      cryptoKey,
      signature,
      signedData
    );

  if (
    !validSignature
  ) {
    throw new Error(
      "Invalid Google token signature."
    );
  }


  /* -------------------------------------------------------
     VERIFY CLAIMS
  ------------------------------------------------------- */

  const now =
    Math.floor(
      Date.now() / 1000
    );

  if (
    payload.aud !==
    GOOGLE_CLIENT_ID
  ) {
    throw new Error(
      "Google token was issued for a different app."
    );
  }

  if (
    payload.iss !==
    "https://accounts.google.com"
    &&
    payload.iss !==
    "accounts.google.com"
  ) {
    throw new Error(
      "Invalid Google token issuer."
    );
  }

  if (
    !payload.exp
    ||
    Number(payload.exp) <= now
  ) {
    throw new Error(
      "Google token has expired."
    );
  }

  if (
    payload.nbf
    &&
    Number(payload.nbf) >
    now + 60
  ) {
    throw new Error(
      "Google token is not valid yet."
    );
  }

  if (
    !payload.sub
    ||
    typeof payload.sub !==
    "string"
  ) {
    throw new Error(
      "Google account ID is missing."
    );
  }

  return {
    sub:
      payload.sub
  };
}


/* =========================================================
   GOOGLE LOGIN
========================================================= */

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

    const credential =
      body?.credential;

    const google =
      await verifyGoogleIdToken(
        credential
      );


    /* -----------------------------------------------------
       FIND EXISTING USER
    ----------------------------------------------------- */

    let user =
      await context.env.DB
        .prepare(`
          SELECT
            id,
            username,
            created_at,
            updated_at
          FROM users
          WHERE google_sub = ?
          LIMIT 1
        `)
        .bind(
          google.sub
        )
        .first();


    let newUser =
      false;


    /* -----------------------------------------------------
       CREATE FIRST-TIME USER
    ----------------------------------------------------- */

    if (
      !user
    ) {
      const userId =
        crypto.randomUUID();

      const now =
        Date.now();

      const insert =
        await context.env.DB
          .prepare(`
            INSERT OR IGNORE INTO users (
              id,
              google_sub,
              username,
              username_key,
              created_at,
              updated_at,
              username_changed_at
            )
            VALUES (?, ?, NULL, NULL, ?, ?, NULL)
          `)
          .bind(
            userId,
            google.sub,
            now,
            now
          )
          .run();

      newUser =
        Number(
          insert.meta?.changes ??
          0
        ) >
        0;

      user =
        await context.env.DB
          .prepare(`
            SELECT
              id,
              username,
              created_at,
              updated_at
            FROM users
            WHERE google_sub = ?
            LIMIT 1
          `)
          .bind(
            google.sub
          )
          .first();
    }


    if (
      !user
    ) {
      throw new Error(
        "Could not create GAMESHUB account."
      );
    }


    /* -----------------------------------------------------
       DELETE EXPIRED SESSIONS
    ----------------------------------------------------- */

    const now =
      Date.now();

    await context.env.DB
      .prepare(`
        DELETE FROM sessions
        WHERE expires_at <= ?
      `)
      .bind(
        now
      )
      .run();


    /* -----------------------------------------------------
       CREATE GAMESHUB SESSION
    ----------------------------------------------------- */

    const rawSessionToken =
      makeSessionToken();

    const sessionHash =
      await sha256Hex(
        rawSessionToken
      );

    const expiresAt =
      now
      +
      SESSION_LENGTH_SECONDS
      *
      1000;

    await context.env.DB
      .prepare(`
        INSERT INTO sessions (
          id,
          user_id,
          created_at,
          expires_at
        )
        VALUES (?, ?, ?, ?)
      `)
      .bind(
        sessionHash,
        user.id,
        now,
        expiresAt
      )
      .run();


    /* -----------------------------------------------------
       SECURE COOKIE
    ----------------------------------------------------- */

    const cookie =
      [
        `gh_session=${rawSessionToken}`,
        "Path=/",
        "HttpOnly",
        "Secure",
        "SameSite=Lax",
        `Max-Age=${SESSION_LENGTH_SECONDS}`
      ]
        .join("; ");


    return json(
      {
        ok:
          true,

        newUser,

        needsUsername:
          !user.username,

        user: {
          id:
            user.id,

          username:
            user.username ??
            null
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
      "GAMESHUB Google login error:",
      error
    );

    return json(
      {
        ok:
          false,

        error:
          error instanceof Error
            ?
            error.message
            :
            "Google sign-in failed."
      },
      401
    );
  }
}


/* =========================================================
   BLOCK OTHER METHODS
========================================================= */

export function onRequestGet() {
  return json(
    {
      error:
        "Use POST."
    },
    405
  );
}
