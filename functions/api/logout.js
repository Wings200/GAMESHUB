export async function onRequestPost() {

  const headers =
    new Headers({
      "Content-Type":
        "application/json; charset=utf-8",

      "Cache-Control":
        "no-store"
    });


  headers.append(
    "Set-Cookie",
    "gh_session=; " +
    "Path=/; " +
    "HttpOnly; " +
    "Secure; " +
    "SameSite=Lax; " +
    "Max-Age=0"
  );


  headers.append(
    "Set-Cookie",
    "gh_guest=; " +
    "Path=/; " +
    "HttpOnly; " +
    "Secure; " +
    "SameSite=Lax; " +
    "Max-Age=0"
  );


  return new Response(
    JSON.stringify({
      success:
        true
    }),
    {
      headers
    }
  );

}
