import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { galleryPhotos, sponsors, tournaments } from "../src/lib/db/schema";
import { seedGallery, seedSponsors, seedTournaments } from "../src/lib/seed";

async function seed() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const db = drizzle(neon(url));

  console.log("Seeding tournaments...");
  for (const t of seedTournaments) {
    await db.insert(tournaments).values({
      name: t.name,
      date: t.date,
      location: t.location,
      format: t.format,
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
