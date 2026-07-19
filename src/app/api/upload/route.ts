import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { requireAdminContext } from "@/lib/auth";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    await requireAdminContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Blob storage is not configured (missing BLOB_READ_WRITE_TOKEN)" },
      { status: 500 },
    );
  }

  try {
    const formData = await request.formData();
    const folder = (formData.get("folder") as string) || "uploads";
    const files = formData.getAll("files").filter((item): item is File => item instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const uploaded: { name: string; url: string }[] = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json(
          { error: `Unsupported file type: ${file.name}` },
          { status: 400 },
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File too large (max 10MB): ${file.name}` },
          { status: 400 },
        );
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const pathname = `${folder}/${Date.now()}-${safeName}`;

      // Store is configured as public — private access throws on this store.
      const blob = await put(pathname, file, {
        access: "public",
        addRandomSuffix: true,
        token,
      });

      uploaded.push({ name: file.name, url: blob.url });
    }

    return NextResponse.json({ files: uploaded });
  } catch (error) {
    console.error("Upload failed:", error);
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
