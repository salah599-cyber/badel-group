import { SponsorTierSection } from "@/components/SponsorSection";
import { fetchSponsorsByTier } from "@/lib/data";
import { tierOrder } from "@/lib/types";

export const metadata = {
  title: "Sponsors | Badel Group",
};

export default async function SponsorsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Our Sponsors</h1>
        <p className="mx-auto mt-2 max-w-xl text-gray-600">
          Badel Group is proud to partner with organizations that support padel and our
          community. Sponsors are displayed by tier.
        </p>
      </div>

      <div className="space-y-12">
        {await Promise.all(
          tierOrder.map(async (tier) => {
            const sponsors = await fetchSponsorsByTier(tier);
            return <SponsorTierSection key={tier} tier={tier} sponsors={sponsors} />;
          }),
        )}
      </div>

      <div className="mt-12 rounded-2xl bg-gradient-to-r from-primary to-secondary p-8 text-center text-white">
        <h2 className="mb-2 text-xl font-bold">Become a Sponsor</h2>
        <p className="mb-4 text-white/90">
          Partner with Badel Group and reach our growing padel community.
        </p>
        <a
          href="mailto:sponsors@badelgroup.com"
          className="inline-block rounded-xl bg-white px-6 py-3 font-semibold text-primary transition hover:bg-cream"
        >
          sponsors@badelgroup.com
        </a>
      </div>
    </div>
  );
}
