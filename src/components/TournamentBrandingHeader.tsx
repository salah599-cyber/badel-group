import Image from "next/image";
import { Logo } from "@/components/Logo";
import { getMediaSrc } from "@/lib/media";
import type { TournamentPartner } from "@/lib/types";

export function TournamentBrandingHeader({
  partners,
}: {
  partners: TournamentPartner[];
}) {
  if (partners.length === 0) {
    return (
      <div className="mb-6">
        <Logo size="md" />
      </div>
    );
  }

  return (
    <div className="mb-6 flex flex-wrap items-center justify-center gap-6 sm:justify-start">
      <Logo size="md" />
      <span className="text-sm font-semibold uppercase tracking-wide text-gray-400">×</span>
      {partners.map((partner) => (
        <a
          key={partner.id}
          href={partner.website || undefined}
          target={partner.website ? "_blank" : undefined}
          rel={partner.website ? "noopener noreferrer" : undefined}
          className="flex items-center gap-2"
        >
          <Image
            src={getMediaSrc(partner.logoUrl)}
            alt={partner.name}
            width={120}
            height={48}
            className="h-12 w-auto max-w-[8rem] object-contain"
            unoptimized
          />
          <span className="sr-only">{partner.name}</span>
        </a>
      ))}
    </div>
  );
}
