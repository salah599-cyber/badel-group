import { getDownloadUrl } from "@vercel/blob";

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
  return getDownloadUrl(url);
}

export function getMediaSrc(url: string) {
  if (isPublicBlobUrl(url)) return url;
  if (isBlobUrl(url)) {
    return `/api/media?url=${encodeURIComponent(url)}`;
  }
  return url;
}

export async function resolveSponsorLogos<T extends { logoUrl: string }>(items: T[]) {
  return Promise.all(
    items.map(async (item) => ({
      ...item,
      logoUrl: isPublicBlobUrl(item.logoUrl)
        ? item.logoUrl
        : isBlobUrl(item.logoUrl)
          ? await getDownloadUrl(item.logoUrl)
          : item.logoUrl,
    })),
  );
}
