export interface InstagramPost {
  id: string;
  caption: string | null;
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  imageUrl: string;
  permalink: string;
  timestamp: string;
}

const INSTAGRAM_API = "https://graph.instagram.com";
const DEFAULT_INSTAGRAM_HANDLE = "badelgroup.om";

export function getInstagramHandle(): string {
  return process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE?.trim() || DEFAULT_INSTAGRAM_HANDLE;
}

export function getInstagramProfileUrl(): string {
  return `https://instagram.com/${getInstagramHandle()}`;
}

export function getInstagramProfileLabel(): string {
  return `@${getInstagramHandle()}`;
}

export async function fetchInstagramPosts(limit = 6): Promise<InstagramPost[]> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
  if (!token) return [];

  try {
    const params = new URLSearchParams({
      fields:
        "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp",
      limit: String(limit),
      access_token: token,
    });

    const response = await fetch(`${INSTAGRAM_API}/me/media?${params}`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) return [];

    const data = (await response.json()) as {
      data?: Array<{
        id: string;
        caption?: string;
        media_type: InstagramPost["mediaType"];
        media_url?: string;
        thumbnail_url?: string;
        permalink: string;
        timestamp: string;
      }>;
    };

    return (data.data ?? [])
      .map((item) => {
        const imageUrl =
          item.media_type === "VIDEO"
            ? item.thumbnail_url
            : item.media_url;

        if (!imageUrl) return null;

        return {
          id: item.id,
          caption: item.caption ?? null,
          mediaType: item.media_type,
          imageUrl,
          permalink: item.permalink,
          timestamp: item.timestamp,
        };
      })
      .filter((post): post is InstagramPost => post !== null);
  } catch {
    return [];
  }
}
