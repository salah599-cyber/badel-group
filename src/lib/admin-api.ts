export type AdminApiResult = { ok: true; [key: string]: unknown } | { ok: false; error: string };

export async function postAdminJson(path: string, body: unknown): Promise<AdminApiResult> {
  const response = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = (await response.json().catch(() => ({}))) as AdminApiResult &
    Record<string, unknown>;

  if (!response.ok || result.ok === false) {
    return {
      ok: false,
      error:
        (typeof result.error === "string" && result.error) ||
        `Request failed (${response.status})`,
    };
  }

  return { ...result, ok: true };
}
