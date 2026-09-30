const SESSION_LENGTH =
  7 * 24 * 60 * 60;


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


export async function onRequestPost(context) {

  if (
    !context.env.ACCESS_CODE ||
    !context.env.SESSION_SECRET
  ) {

    return new Response(
      "Server configuration missing.",
      {
        status: 500
      }
    );

  }


  let body;

  try {

    body =
      await context.request.json();

  }
  catch {

    return new Response(
      "Invalid request.",
      {
        status: 400
      }
    );

  }


  const submitted =
    String(body.code ?? "");


  if (
    submitted !==
    context.env.ACCESS_CODE
  ) {

    return Response.json(
      {
        success: false
      },
      {
        status: 401
      }
    );

  }


  const expires =
    Date.now() +
    SESSION_LENGTH * 1000;


  const signature =
    await sign(
      String(expires),
      context.env.SESSION_SECRET
    );


  const token =
    `${expires}.${signature}`;


  return Response.json(
    {
      success: true
    },
    {
      headers: {

        "Set-Cookie":
          `gh_access=${token}; ` +
          `Path=/; ` +
          `HttpOnly; ` +
          `Secure; ` +
          `SameSite=Lax; ` +
          `Max-Age=${SESSION_LENGTH}`

      }
    }
  );

}
