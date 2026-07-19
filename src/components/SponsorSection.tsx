import Image from "next/image";
import { getMediaSrc } from "@/lib/media";
import { tierLabels, type Sponsor, type SponsorTier } from "@/lib/types";

const tierSizes: Record<SponsorTier, string> = {
  platinum: "h-20 w-40",
  gold: "h-16 w-32",
  silver: "h-14 w-28",
  bronze: "h-12 w-24",
};

const tierAccent: Record<SponsorTier, string> = {
  platinum: "from-gray-400 to-gray-600",
  gold: "from-amber-400 to-amber-600",
  silver: "from-slate-300 to-slate-500",
  bronze: "from-orange-700 to-orange-900",
};

export function SponsorLogo({ sponsor }: { sponsor: Sponsor }) {
  return (
    <a
      href={sponsor.website ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="card-hover flex flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
    >
      <div className={`relative ${tierSizes[sponsor.tier]}`}>
        <Image
          src={getMediaSrc(sponsor.logoUrl)}
          alt={sponsor.name}
          fill
          className="object-contain"
        />
      </div>
      <span className="text-xs font-semibold text-gray-700">{sponsor.name}</span>
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
      <div className="mb-5 flex items-center justify-center gap-3">
        <span className={`h-1 w-10 rounded-full bg-gradient-to-r ${tierAccent[tier]}`} />
        <h3 className="text-sm font-bold tracking-[0.18em] text-primary uppercase">
          {tierLabels[tier]} Sponsors
        </h3>
        <span className={`h-1 w-10 rounded-full bg-gradient-to-r ${tierAccent[tier]}`} />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4">
        {sponsors.map((sponsor) => (
          <SponsorLogo key={sponsor.id} sponsor={sponsor} />
        ))}
      </div>
    </div>
  );
}
