import { upload } from "@vercel/blob/client";

const UUID_PATTERN =
  /^[0-9a-f]{8}-?[0-9a-f]{4}-?[1-5][0-9a-f]{3}-?[89ab][0-9a-f]{3}-?[0-9a-f]{12}$/i;

const CAMERA_NAME_PATTERN =
  /^(img|dsc|pict|photo|screenshot|image|snap)(\s*|[_-])\d+$/i;

export function isMeaninglessCaption(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;

  const compact = trimmed.replace(/[\s_-]+/g, "").toLowerCase();
  if (UUID_PATTERN.test(compact) || /^[0-9a-f]{32}$/i.test(compact)) {
    return true;
  }

  const tokens = trimmed.split(/\s+/);
  if (tokens.length >= 3) {
    const hexLike = tokens.filter((token) => /^[0-9a-f]{4,8}$/i.test(token));
    if (hexLike.length >= 3 && hexLike.length / tokens.length >= 0.75) {
      return true;
    }
  }

  const base = trimmed.replace(/\.[^.]+$/, "");
  if (CAMERA_NAME_PATTERN.test(base)) return true;

  if (
    compact.length >= 16 &&
    /^[a-z0-9]+$/i.test(compact) &&
    !/[aeiou]{2}/i.test(compact)
  ) {
    return true;
  }

  return false;
}

export function getDisplayCaption(caption: string): string | null {
  const trimmed = caption.trim();
  if (!trimmed || isMeaninglessCaption(trimmed)) return null;
  return trimmed;
}

export function nameFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "").trim();
  if (isMeaninglessCaption(base)) return "";

  return base
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
