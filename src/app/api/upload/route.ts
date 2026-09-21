import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getAdminContext, requirePermission } from "@/lib/auth";
import type { Permission } from "@/lib/permissions";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const UPLOAD_PERMISSIONS: Record<
  "sponsors" | "gallery" | "players" | "tournament-partners" | "tournament-sponsors",
  Permission
> = {
  sponsors: "sponsors:manage",
  gallery: "gallery:manage",
  players: "results:manage",
  "tournament-partners": "tournaments:manage",
  "tournament-sponsors": "tournaments:manage",
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Blob storage is not configured (missing BLOB_READ_WRITE_TOKEN)" },
      { status: 500 },
    );
  }

  try {
    const body = (await request.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request,
      token,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (
          clientPayload !== "sponsors" &&
          clientPayload !== "gallery" &&
          clientPayload !== "players" &&
          clientPayload !== "tournament-partners" &&
          clientPayload !== "tournament-sponsors"
        ) {
          throw new Error("Invalid upload type");
        }

        if (
          clientPayload === "tournament-partners" ||
          clientPayload === "tournament-sponsors"
        ) {
          const ctx = await getAdminContext();
          if (!ctx) throw new Error("Unauthorized");
        } else {
          await requirePermission(UPLOAD_PERMISSIONS[clientPayload]);
        }

        const folder = clientPayload;

        if (!pathname.startsWith(`${folder}/`)) {
          throw new Error("Invalid upload path");
        }

        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_FILE_SIZE,
          addRandomSuffix: true,
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("Upload failed:", error);
    const message = error instanceof Error ? error.message : "Upload failed";
    // #region agent log
    fetch('http://127.0.0.1:7718/ingest/9a547b53-ac0a-44a6-b020-b4f4691082ad',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9848f0'},body:JSON.stringify({sessionId:'9848f0',location:'api/upload/route.ts:catch',message:'upload route failed',data:{errorMessage:message},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    const status = message === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
