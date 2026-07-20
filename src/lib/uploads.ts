import { upload } from "@vercel/blob/client";

export function nameFromFilename(filename: string) {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function safeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function compressImageIfNeeded(file: File, maxEdge = 2400): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") {
    return file;
  }

  if (file.size <= 2 * 1024 * 1024) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, outputType, outputType === "image/jpeg" ? 0.85 : undefined);
  });

  if (!blob || blob.size >= file.size) {
    return file;
  }

  return new File([blob], file.name, { type: outputType });
}

export async function uploadFiles(
  files: File[],
  folder: "sponsors" | "gallery" | "players",
  onProgress?: (completed: number, total: number) => void,
): Promise<{ name: string; url: string }[]> {
  const uploaded: { name: string; url: string }[] = [];
  const maxEdge = folder === "players" ? 600 : 2400;

  for (let index = 0; index < files.length; index++) {
    const original = files[index];
    const file = await compressImageIfNeeded(original, maxEdge);

    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error(`File too large (max 10MB): ${original.name}`);
    }

    const pathname = `${folder}/${Date.now()}-${safeFilename(file.name)}`;

    const blob = await upload(pathname, file, {
      access: "public",
      handleUploadUrl: "/api/upload",
      clientPayload: folder,
      multipart: file.size > 4 * 1024 * 1024,
    });

    uploaded.push({ name: original.name, url: blob.url });
    onProgress?.(index + 1, files.length);
  }

  return uploaded;
}
