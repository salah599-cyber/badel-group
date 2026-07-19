import Image from "next/image";
import { tierLabels, type Sponsor, type SponsorTier } from "@/lib/types";

const tierSizes: Record<SponsorTier, string> = {
  platinum: "h-20 w-40",
  gold: "h-16 w-32",
  silver: "h-14 w-28",
  bronze: "h-12 w-24",
};

export function SponsorLogo({ sponsor }: { sponsor: Sponsor }) {
  return (
    <a
      href={sponsor.website ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 bg-white p-4 transition hover:border-secondary hover:shadow-md"
    >
      <div className={`relative ${tierSizes[sponsor.tier]}`}>
        <Image
          src={sponsor.logoUrl}
          alt={sponsor.name}
          fill
          className="object-contain"
        />
      </div>
      <span className="text-xs font-medium text-gray-600">{sponsor.name}</span>
    </a>
  );
}

export function SponsorTierSection({
  tier,
  sponsors,
}: {
  tier: SponsorTier;
  sponsors: Sponsor[];
}) {
  if (sponsors.length === 0) return null;

  return (
    <div>
      <h3 className="mb-4 text-center text-sm font-bold tracking-widest text-primary uppercase">
        {tierLabels[tier]} Sponsors
      </h3>
      <div className="flex flex-wrap items-center justify-center gap-4">
        {sponsors.map((sponsor) => (
          <SponsorLogo key={sponsor.id} sponsor={sponsor} />
        ))}
      </div>
    </div>
  );
}
