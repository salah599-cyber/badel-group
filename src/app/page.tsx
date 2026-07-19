import { GalleryPreview } from "@/components/GalleryGrid";
import { Hero } from "@/components/Hero";
import { SponsorTierSection } from "@/components/SponsorSection";
import { TournamentCard } from "@/components/TournamentCard";
import {
  fetchGalleryPhotos,
  fetchSponsorsByTier,
  fetchUpcomingTournaments,
} from "@/lib/data";
import { tierOrder } from "@/lib/types";

export default async function HomePage() {
  const upcoming = await fetchUpcomingTournaments();
  const galleryPhotos = await fetchGalleryPhotos();

  return (
    <>
      <Hero />

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-12 sm:px-6">
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Upcoming Tournaments</h2>
            <p className="text-gray-600">Register now — admin approval required after signup</p>
          </div>
          {upcoming.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {upcoming.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
              No upcoming tournaments at the moment. Check back soon!
            </p>
          )}
        </section>

        <GalleryPreview photos={galleryPhotos} />

        <section>
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900">Our Sponsors</h2>
            <p className="text-gray-600">Thank you to our partners who make every event possible</p>
          </div>
          <div className="space-y-10">
            {await Promise.all(
              tierOrder.map(async (tier) => {
                const sponsors = await fetchSponsorsByTier(tier);
                return (
                  <SponsorTierSection key={tier} tier={tier} sponsors={sponsors} />
                );
              }),
            )}
          </div>
        </section>

        <section className="rounded-2xl bg-primary-dark px-6 py-10 text-center text-white sm:px-10">
          <h2 className="mb-2 text-2xl font-bold">Get in Touch</h2>
          <p className="mb-6 text-white/80">
            Questions about tournaments or sponsorship? We&apos;d love to hear from you.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="mailto:info@badelgroup.com"
              className="rounded-xl bg-white px-6 py-3 font-semibold text-primary-dark transition hover:bg-cream"
            >
              info@badelgroup.com
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-white/40 px-6 py-3 font-semibold transition hover:bg-white/10"
            >
              Follow on Instagram
            </a>
          </div>
        </section>
      </div>
    </>
  );
}
