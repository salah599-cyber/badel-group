"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { entries, galleryPhotos, results, sponsors, tournaments } from "@/lib/db/schema";

async function assertAdmin() {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Unauthorized");
}

export async function createTournamentAction(formData: FormData) {
  await assertAdmin();
  if (!db) throw new Error("Database not configured");

  await db.insert(tournaments).values({
    name: formData.get("name") as string,
    date: formData.get("date") as string,
    location: formData.get("location") as string,
    format: formData.get("format") as "singles" | "doubles",
    description: formData.get("description") as string,
    maxPlayers: Number(formData.get("maxPlayers")),
    status: "upcoming",
  });

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function createEntryAction(formData: FormData) {
  if (!db) throw new Error("Database not configured");

  await db.insert(entries).values({
    tournamentId: formData.get("tournamentId") as string,
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    phone: formData.get("phone") as string,
    partnerName: (formData.get("partnerName") as string) || null,
    skillLevel: formData.get("skillLevel") as string,
    notes: (formData.get("notes") as string) || null,
    status: "pending",
  });

  revalidatePath("/admin");
}

export async function updateEntryStatusAction(entryId: string, status: "approved" | "rejected") {
  await assertAdmin();
  if (!db) throw new Error("Database not configured");

  await db.update(entries).set({ status }).where(eq(entries.id, entryId));
  revalidatePath("/admin");
}

export async function createSponsorAction(formData: FormData) {
  await assertAdmin();
  if (!db) throw new Error("Database not configured");

  await db.insert(sponsors).values({
    name: formData.get("name") as string,
    tier: formData.get("tier") as "platinum" | "gold" | "silver" | "bronze",
    logoUrl: formData.get("logoUrl") as string,
    website: (formData.get("website") as string) || null,
  });

  revalidatePath("/sponsors");
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function deleteSponsorAction(id: string) {
  await assertAdmin();
  if (!db) throw new Error("Database not configured");

  await db.delete(sponsors).where(eq(sponsors.id, id));
  revalidatePath("/sponsors");
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function createGalleryPhotoAction(formData: FormData) {
  await assertAdmin();
  if (!db) throw new Error("Database not configured");

  await db.insert(galleryPhotos).values({
    tournamentId: (formData.get("tournamentId") as string) || null,
    tournamentName: formData.get("tournamentName") as string,
    imageUrl: formData.get("imageUrl") as string,
    caption: formData.get("caption") as string,
  });

  revalidatePath("/gallery");
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function createResultAction(formData: FormData) {
  await assertAdmin();
  if (!db) throw new Error("Database not configured");

  const winners = JSON.parse(formData.get("winners") as string) as {
    place: string;
    names: string;
  }[];

  const tournamentId = formData.get("tournamentId") as string;
  const tournamentName = formData.get("tournamentName") as string;
  const date = formData.get("date") as string;

  await db.insert(results).values({ tournamentId, tournamentName, date, winners });
  await db
    .update(tournaments)
    .set({ status: "completed" })
    .where(eq(tournaments.id, tournamentId));

  revalidatePath("/results");
  revalidatePath("/");
  revalidatePath("/admin");
}
