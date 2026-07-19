import { GalleryPreview } from "@/components/GalleryGrid";
import { Hero } from "@/components/Hero";
import { InstagramFeed } from "@/components/InstagramFeed";
import { SectionHeading } from "@/components/SectionHeading";
import { getInstagramProfileUrl } from "@/lib/instagram";
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

      <div className="mx-auto max-w-6xl space-y-20 px-4 py-16 sm:px-6 sm:py-20">
        <section>
          <SectionHeading
            title="Upcoming Tournaments"
            subtitle="Register now — admin approval required after signup"
          />
          {upcoming.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {upcoming.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-primary/20 bg-white/60 p-10 text-center text-gray-500">
              No upcoming tournaments at the moment. Check back soon!
            </p>
          )}
        </section>

        <GalleryPreview photos={galleryPhotos} />

        <InstagramFeed />

        <section className="section-shell">
          <SectionHeading
            title="Our Sponsors"
            subtitle="Thank you to our partners who make every event possible"
            align="center"
          />
          <div className="space-y-12">
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

        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-dark via-primary to-secondary px-6 py-12 text-center text-white shadow-xl sm:px-12">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <h2 className="mb-3 text-3xl font-bold">Get in Touch</h2>
            <p className="mx-auto mb-8 max-w-lg text-white/90">
              Questions about tournaments or sponsorship? We&apos;d love to hear from you.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="mailto:info@badelgroup.com"
                className="rounded-xl bg-white px-7 py-3.5 font-semibold text-primary-dark shadow-lg transition hover:bg-cream"
              >
                info@badelgroup.com
              </a>
              <a
                href={getInstagramProfileUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-white/40 bg-white/10 px-7 py-3.5 font-semibold backdrop-blur-sm transition hover:bg-white/20"
              >
                Follow on Instagram
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
