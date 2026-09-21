import { put } from "@vercel/blob/client";

const UUID_PATTERN =
  /^[0-9a-f]{8}-?[0-9a-f]{4}-?[1-5][0-9a-f]{3}-?[89ab][0-9a-f]{3}-?[0-9a-f]{12}$/i;

const CAMERA_NAME_PATTERN =
  /^(img|dsc|pict|photo|screenshot|image|snap)(\s*|[_-])\d+$/i;

const MESSAGING_APP_PATTERN =
  /^(whatsapp|telegram|signal|messenger|wechat)\s+(image|photo|video)/i;

const COPY_OF_PATTERN = /^copy\s+of(\s|$)/i;

export function isMeaninglessCaption(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;

  if (MESSAGING_APP_PATTERN.test(trimmed) || COPY_OF_PATTERN.test(trimmed)) {
    return true;
  }

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

async function processImageForUpload(
  file: File,
  maxEdge = 2400,
  options?: { squareCrop?: boolean },
): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") {
    return file;
  }

  const needsCompress = file.size > 2 * 1024 * 1024;
  const needsSquareCrop = Boolean(options?.squareCrop);
  if (!needsCompress && !needsSquareCrop) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const sourceSize = needsSquareCrop
    ? Math.min(bitmap.width, bitmap.height)
    : Math.max(bitmap.width, bitmap.height);
  const sx = needsSquareCrop ? Math.floor((bitmap.width - sourceSize) / 2) : 0;
  // Bias portrait crops toward the upper body/face instead of true center.
  const sy = needsSquareCrop ? Math.floor((bitmap.height - sourceSize) * 0.2) : 0;
  const scale = Math.min(1, maxEdge / sourceSize);
  const width = Math.max(1, Math.round((needsSquareCrop ? sourceSize : bitmap.width) * scale));
  const height = Math.max(
    1,
    Math.round((needsSquareCrop ? sourceSize : bitmap.height) * scale),
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }

  if (needsSquareCrop) {
    context.drawImage(bitmap, sx, sy, sourceSize, sourceSize, 0, 0, width, height);
  } else {
    context.drawImage(bitmap, 0, 0, width, height);
  }
  bitmap.close();

  const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, outputType, outputType === "image/jpeg" ? 0.85 : undefined);
  });

  if (!blob || (!needsSquareCrop && blob.size >= file.size)) {
    return file;
  }

  const extension = outputType === "image/png" ? ".png" : ".jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}${extension}`, { type: outputType });
}

export async function uploadFiles(
  files: File[],
  folder: "sponsors" | "gallery" | "players" | "tournament-partners" | "tournament-sponsors",
  onProgress?: (completed: number, total: number) => void,
): Promise<{ name: string; url: string }[]> {
  const uploaded: { name: string; url: string }[] = [];
  const maxEdge = folder === "players" ? 600 : 2400;

  for (let index = 0; index < files.length; index++) {
    const original = files[index];
    const file = await processImageForUpload(original, maxEdge, {
      squareCrop: folder === "players",
    });

    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error(`File too large (max 10MB): ${original.name}`);
    }

    const pathname = `${folder}/${Date.now()}-${safeFilename(file.name)}`;
    const multipart = file.size > 4 * 1024 * 1024;

    try {
      const tokenRes = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "blob.generate-client-token",
          payload: {
            pathname,
            clientPayload: folder,
            multipart,
          },
        }),
      });
      const tokenBody = (await tokenRes.json().catch(() => ({}))) as {
        clientToken?: string;
        error?: string;
      };
      if (!tokenRes.ok || !tokenBody.clientToken) {
        throw new Error(tokenBody.error || `Upload auth failed (${tokenRes.status})`);
      }

      const blob = await put(pathname, file, {
        access: "public",
        token: tokenBody.clientToken,
        multipart,
      });
      uploaded.push({ name: original.name, url: blob.url });
      onProgress?.(index + 1, files.length);
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7718/ingest/9a547b53-ac0a-44a6-b020-b4f4691082ad',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9848f0'},body:JSON.stringify({sessionId:'9848f0',location:'uploads.ts:uploadFiles',message:'blob upload failed',data:{folder,pathname,fileType:file.type,fileSize:file.size,originalType:original.type,errMessage:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
      fetch('/api/debug-log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'9848f0',location:'uploads.ts:uploadFiles',message:'blob upload failed',data:{folder,pathname,fileType:file.type,fileSize:file.size,originalType:original.type,errMessage:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),hypothesisId:'D',runId:'post-fix'})}).catch(()=>{});
      // #endregion
      throw error;
    }
  }

  return uploaded;
}
