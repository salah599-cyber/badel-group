export type AdminApiResult = { ok: true } | { ok: false; error: string };

export async function postAdminJson(
  path: string,
  body: unknown,
  actionName: string,
): Promise<AdminApiResult & Record<string, unknown>> {
  // #region agent log
  fetch("http://127.0.0.1:7718/ingest/9a547b53-ac0a-44a6-b020-b4f4691082ad", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "a55fac" },
    body: JSON.stringify({
      sessionId: "a55fac",
      location: "admin-api.ts:start",
      message: "admin api start",
      data: { path, actionName },
      timestamp: Date.now(),
      hypothesisId: "A",
    }),
  }).catch(() => {});
  // #endregion

  try {
    const response = await fetch(path, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = (await response.json().catch(() => ({}))) as AdminApiResult &
      Record<string, unknown>;

    // #region agent log
    fetch("http://127.0.0.1:7718/ingest/9a547b53-ac0a-44a6-b020-b4f4691082ad", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "a55fac" },
      body: JSON.stringify({
        sessionId: "a55fac",
        location: "admin-api.ts:response",
        message: "admin api response",
        data: {
          path,
          actionName,
          status: response.status,
          ok: "ok" in result ? result.ok : null,
          error: "error" in result ? result.error : null,
          contentType: response.headers.get("content-type"),
        },
        timestamp: Date.now(),
        hypothesisId: "A",
      }),
    }).catch(() => {});
    // #endregion

    if (!response.ok || result.ok === false) {
      return {
        ok: false,
        error:
          (typeof result.error === "string" && result.error) ||
          `Request failed (${response.status})`,
      };
    }

    return { ...result, ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // #region agent log
    fetch("http://127.0.0.1:7718/ingest/9a547b53-ac0a-44a6-b020-b4f4691082ad", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "a55fac" },
      body: JSON.stringify({
        sessionId: "a55fac",
        location: "admin-api.ts:catch",
        message: "admin api threw",
        data: {
          path,
          actionName,
          name: error instanceof Error ? error.name : typeof error,
          errMessage: message.slice(0, 300),
          isRsc: message.includes("Server Components"),
        },
        timestamp: Date.now(),
        hypothesisId: "A",
      }),
    }).catch(() => {});
    // #endregion
    throw error;
  }
}
