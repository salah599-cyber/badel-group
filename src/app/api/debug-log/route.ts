import { appendFile, mkdir } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

const INGEST_URL = "http://127.0.0.1:7718/ingest/9a547b53-ac0a-44a6-b020-b4f4691082ad";

export async function POST(request: Request) {
  const body = await request.text();
  const cursorDir = path.join(process.cwd(), ".cursor");
  await mkdir(cursorDir, { recursive: true });
  await appendFile(path.join(cursorDir, "debug-9848f0.log"), `${body}\n`).catch(() => {});
  await fetch(INGEST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9848f0" },
    body,
  }).catch(() => {});
  return new NextResponse(null, { status: 204 });
}
