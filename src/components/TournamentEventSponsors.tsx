import Image from "next/image";
import { getMediaSrc } from "@/lib/media";
import { normalizeSponsorLink } from "@/lib/urls";
import type { TournamentSponsor } from "@/lib/types";
import { tierOrder, tierLabels } from "@/lib/types";

export function TournamentEventSponsors({ sponsors }: { sponsors: TournamentSponsor[] }) {
  if (sponsors.length === 0) return null;

  const byTier = tierOrder
    .map((tier) => ({
      tier,
      items: sponsors.filter((sponsor) => sponsor.tier === tier),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-bold text-gray-900">Event sponsors</h2>
      <div className="space-y-6">
        {byTier.map(({ tier, items }) => (
          <div key={tier}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {tierLabels[tier]}
            </p>
            <div className="flex flex-wrap items-center gap-6">
              {items.map((sponsor) => {
                const href = normalizeSponsorLink(
                  sponsor.linkType ?? "website",
                  sponsor.website,
                );
                const image = (
                  <Image
                    src={getMediaSrc(sponsor.logoUrl)}
                    alt={sponsor.name}
                    width={140}
                    height={56}
                    className="h-14 w-auto max-w-[10rem] object-contain"
                    unoptimized
                  />
                );

                return href ? (
                  <a
                    key={sponsor.id}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border border-gray-100 bg-cream/40 p-3"
                  >
                    {image}
                  </a>
                ) : (
                  <div key={sponsor.id} className="rounded-xl border border-gray-100 bg-cream/40 p-3">
                    {image}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
