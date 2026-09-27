export async function onRequestPost() {

  return Response.json(
    {
      success: true
    },
    {
      headers: {

        "Set-Cookie":
          "gh_session=; " +
          "Path=/; " +
          "HttpOnly; " +
          "Secure; " +
          "SameSite=Lax; " +
          "Max-Age=0"

      }
    }
  );

}
