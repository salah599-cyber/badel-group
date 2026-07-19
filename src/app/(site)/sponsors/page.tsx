import { SectionHeading } from "@/components/SectionHeading";
import { SponsorTierSection } from "@/components/SponsorSection";
import { fetchSponsorsByTier } from "@/lib/data";
import { tierOrder } from "@/lib/types";

export const metadata = {
  title: "Sponsors | Badel Group",
};

export const dynamic = "force-dynamic";

export default async function SponsorsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <SectionHeading
        title="Our Sponsors"
        subtitle="Badel Group is proud to partner with organizations that support padel and our community."
        align="center"
      />

      <div className="section-shell space-y-12">
        {await Promise.all(
          tierOrder.map(async (tier) => {
            const sponsors = await fetchSponsorsByTier(tier);
            return <SponsorTierSection key={tier} tier={tier} sponsors={sponsors} />;
          }),
        )}
      </div>

      <div className="mt-12 overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-secondary p-8 text-center text-white shadow-xl sm:rounded-3xl sm:p-10">
        <h2 className="mb-2 text-xl font-bold sm:text-2xl">Become a Sponsor</h2>
        <p className="mb-6 text-white/90">
          Partner with Badel Group and reach our growing padel community.
        </p>
        <a
          href="mailto:sponsors@badelgroup.com"
          className="inline-block rounded-xl bg-white px-7 py-3.5 font-semibold text-primary shadow-lg transition hover:bg-cream"
        >
          sponsors@badelgroup.com
        </a>
      </div>
    </div>
  );
}
