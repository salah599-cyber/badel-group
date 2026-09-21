const INGEST_URL = "http://127.0.0.1:7718/ingest/9a547b53-ac0a-44a6-b020-b4f4691082ad";

export function debugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
) {
  const payload = JSON.stringify({
    sessionId: "9848f0",
    location,
    message,
    data,
    timestamp: Date.now(),
    hypothesisId,
    runId: "post-fix",
  });
  // #region agent log
  fetch(INGEST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9848f0" },
    body: payload,
  }).catch(() => {});
  // #endregion
  if (typeof window !== "undefined") {
    fetch("/api/debug-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    }).catch(() => {});
  }
}
