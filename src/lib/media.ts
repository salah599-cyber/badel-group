export function isBlobUrl(url: string) {
  return url.includes("blob.vercel-storage.com");
}

export function isPublicBlobUrl(url: string) {
  return url.includes(".public.blob.vercel-storage.com");
}

export function isPublicMediaPath(url: string) {
  if (!isBlobUrl(url)) return true;
  if (isPublicBlobUrl(url)) return true;
  try {
    const pathname = new URL(url).pathname;
    return pathname.includes("/gallery/") || pathname.includes("/sponsors/") || pathname.includes("/players/");
  } catch {
    return false;
  }
}

export async function resolveMediaUrl(url: string) {
  if (!isBlobUrl(url) || isPublicBlobUrl(url)) return url;
  const { getDownloadUrl } = await import("@vercel/blob");
  return getDownloadUrl(url);
}

export function getMediaSrc(url: string) {
  if (isPublicBlobUrl(url)) return url;
  if (isBlobUrl(url)) {
    return `/api/media?url=${encodeURIComponent(url)}`;
  }
  return url;
}

export function resolveSponsorLogosForDisplay<T extends { logoUrl: string }>(items: T[]) {
  return items.map((item) => ({
    ...item,
    logoUrl: getMediaSrc(item.logoUrl),
  }));
}

/** @deprecated Prefer resolveSponsorLogosForDisplay to avoid server-side download URL resolution. */
export async function resolveSponsorLogos<T extends { logoUrl: string }>(items: T[]) {
  return resolveSponsorLogosForDisplay(items);
}
