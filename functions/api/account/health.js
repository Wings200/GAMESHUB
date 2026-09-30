export async function onRequestGet(context) {
  try {
    const result = await context.env.DB
      .prepare(
        "SELECT COUNT(*) AS user_count FROM users"
      )
      .first();

    return Response.json({
      ok: true,
      database: "connected",
      users: Number(result?.user_count ?? 0)
    });
  }

  catch (error) {
    return Response.json(
      {
        ok: false,
        database: "failed",
        error:
          error instanceof Error
            ? error.message
            : String(error)
      },
      {
        status: 500
      }
    );
  }
}
