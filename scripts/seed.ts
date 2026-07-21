import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { galleryPhotos, sponsors, tournamentTypes, tournaments } from "../src/lib/db/schema";
import {
  defaultTournamentTypes,
  seedGallery,
  seedSponsors,
  seedTournaments,
} from "../src/lib/seed";

async function seed() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const db = drizzle(neon(url));

  console.log("Seeding tournament types...");
  const typeIdBySlug = new Map<string, string>();

  for (const type of defaultTournamentTypes) {
    const existing = await db
      .select()
      .from(tournamentTypes)
      .where(eq(tournamentTypes.slug, type.slug))
      .limit(1);

    if (existing[0]) {
      typeIdBySlug.set(type.slug, existing[0].id);
      continue;
    }

    const [created] = await db
      .insert(tournamentTypes)
      .values({
        name: type.name,
        slug: type.slug,
        description: type.description,
        requiresPartner: type.requiresPartner,
        pairingMode: type.pairingMode,
        sortOrder: type.sortOrder,
      })
      .returning();

    typeIdBySlug.set(type.slug, created.id);
  }

  console.log("Seeding tournaments...");
  for (const t of seedTournaments) {
    const tournamentTypeId = typeIdBySlug.get(t.typeSlug);
    if (!tournamentTypeId) {
      console.warn(`Skipping ${t.name}: unknown type slug ${t.typeSlug}`);
      continue;
    }

    await db.insert(tournaments).values({
      name: t.name,
      date: t.date,
      location: t.location,
      tournamentTypeId,
      status: t.status,
      description: t.description,
      maxPlayers: t.maxPlayers,
    });
  }

  console.log("Seeding sponsors...");
  for (const s of seedSponsors) {
    await db.insert(sponsors).values({
      name: s.name,
      tier: s.tier,
      logoUrl: s.logoUrl,
      website: s.website,
      linkType: s.linkType ?? "website",
    });
  }

  console.log("Seeding gallery...");
  for (const g of seedGallery) {
    await db.insert(galleryPhotos).values({
      tournamentName: g.tournamentName,
      imageUrl: g.imageUrl,
      caption: g.caption,
    });
  }

  console.log("Seed complete!");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
