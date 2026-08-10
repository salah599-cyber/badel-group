import { GalleryGrid } from "@/components/GalleryGrid";
import { formatTournamentDate } from "@/lib/dates";
import type { GalleryPhoto } from "@/lib/types";

type GalleryTournamentSectionProps = {
  name: string;
  date?: string | null;
  photos: GalleryPhoto[];
};

export function GalleryTournamentSection({ name, date, photos }: GalleryTournamentSectionProps) {
  const formattedDate = formatTournamentDate(date);

  return (
    <section className="section-shell">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-primary-dark">{name}</h2>
        {formattedDate ? (
          <time className="mt-1 block text-sm font-medium text-gray-500">{formattedDate}</time>
        ) : null}
      </div>

      <GalleryGrid photos={photos} />
    </section>
  );
}
