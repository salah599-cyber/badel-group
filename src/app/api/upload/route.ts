import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import type { Permission } from "@/lib/permissions";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const UPLOAD_PERMISSIONS: Record<"sponsors" | "gallery", Permission> = {
  sponsors: "sponsors:manage",
  gallery: "gallery:manage",
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
        if (clientPayload !== "sponsors" && clientPayload !== "gallery") {
          throw new Error("Invalid upload type");
        }

        await requirePermission(UPLOAD_PERMISSIONS[clientPayload]);

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
    const status = message === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
