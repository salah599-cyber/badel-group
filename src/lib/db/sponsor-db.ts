import type { SQL } from "drizzle-orm";
import { db } from "./index";
import { sponsors } from "./schema";
import type { SponsorLinkType, SponsorTier } from "@/lib/types";

const sponsorBaseColumns = {
  id: sponsors.id,
  name: sponsors.name,
  tier: sponsors.tier,
  logoUrl: sponsors.logoUrl,
  website: sponsors.website,
};

export type SponsorRow = {
  id: string;
  name: string;
  tier: SponsorTier;
  logoUrl: string;
  website: string | null;
  linkType: SponsorLinkType;
};

function isMissingLinkTypeColumn(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("link_type");
}

export async function querySponsors(where?: SQL): Promise<SponsorRow[]> {
  if (!db) return [];

  try {
    const query = db
      .select({ ...sponsorBaseColumns, linkType: sponsors.linkType })
      .from(sponsors);
    const rows = where ? await query.where(where).orderBy(sponsors.tier) : await query.orderBy(sponsors.tier);
    return rows;
  } catch (error) {
    if (!isMissingLinkTypeColumn(error)) throw error;

    const query = db.select(sponsorBaseColumns).from(sponsors);
    const rows = where ? await query.where(where).orderBy(sponsors.tier) : await query.orderBy(sponsors.tier);
    return rows.map((row) => ({ ...row, linkType: "website" as const }));
  }
}

export async function insertSponsorRow(values: {
  name: string;
  tier: "platinum" | "gold" | "silver" | "bronze";
  logoUrl: string;
  website: string | null;
  linkType: SponsorLinkType;
}) {
  if (!db) throw new Error("Database not configured");

  try {
    await db.insert(sponsors).values(values);
  } catch (error) {
    if (!isMissingLinkTypeColumn(error)) throw error;
    await db.insert(sponsors).values({
      name: values.name,
      tier: values.tier,
      logoUrl: values.logoUrl,
      website: values.website,
    });
  }
}
