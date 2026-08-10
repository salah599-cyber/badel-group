import { GalleryTournamentSection } from "@/components/GalleryTournamentSection";
import { SectionHeading } from "@/components/SectionHeading";
import { fetchGalleryPhotos } from "@/lib/data";

export const metadata = {
  title: "Gallery | Badel Group",
};

export default async function GalleryPage() {
  const galleryPhotos = await fetchGalleryPhotos();

  const byTournament = galleryPhotos.reduce<
    Record<string, typeof galleryPhotos>
  >((acc, photo) => {
    if (!acc[photo.tournamentName]) acc[photo.tournamentName] = [];
    acc[photo.tournamentName].push(photo);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <SectionHeading
        title="Gallery"
        subtitle="Photos from Badel Group tournaments and events"
      />

      {Object.keys(byTournament).length > 0 ? (
        <div className="space-y-12">
          {Object.entries(byTournament).map(([name, photos]) => (
            <GalleryTournamentSection
              key={photos[0]?.tournamentId ?? name}
              name={name}
              date={photos[0]?.tournamentDate}
              photos={photos}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-primary/20 bg-white/60 p-10 text-center text-gray-500">
          No photos yet. Check back after our next tournament!
        </p>
      )}
    </div>
  );
}
