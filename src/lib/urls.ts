import type { SponsorLinkType } from "@/lib/types";

const INSTAGRAM_HANDLE_PATTERN = /^[a-zA-Z0-9._]{1,30}$/;

export function normalizeWebsiteUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function extractInstagramHandle(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("@")) {
    const handle = trimmed.slice(1);
    return INSTAGRAM_HANDLE_PATTERN.test(handle) ? handle : null;
  }

  const withoutProtocol = trimmed.replace(/^https?:\/\//i, "");
  const instagramMatch = withoutProtocol.match(
    /^(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)/i,
  );
  if (instagramMatch) {
    const handle = instagramMatch[1];
    return INSTAGRAM_HANDLE_PATTERN.test(handle) ? handle : null;
  }

  return INSTAGRAM_HANDLE_PATTERN.test(trimmed) ? trimmed : null;
}

export function normalizeInstagramUrl(input: string | null | undefined): string | null {
  const handle = extractInstagramHandle(input ?? "");
  if (!handle) return null;
  return `https://instagram.com/${handle}`;
}

export function normalizeSponsorLink(
  linkType: SponsorLinkType,
  value: string | null | undefined,
): string | null {
  if (linkType === "instagram") {
    return normalizeInstagramUrl(value);
  }
  return normalizeWebsiteUrl(value);
}
