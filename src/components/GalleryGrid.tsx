import Image from "next/image";
import Link from "next/link";
import { getMediaSrc } from "@/lib/media";
import { SectionHeading } from "@/components/SectionHeading";
import type { GalleryPhoto } from "@/lib/types";

export function GalleryGrid({ photos }: { photos: GalleryPhoto[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {photos.map((photo) => (
        <figure
          key={photo.id}
          className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100 shadow-sm ring-1 ring-black/5"
        >
          <Image
            src={getMediaSrc(photo.imageUrl)}
            alt={photo.caption}
            fill
            className="object-cover transition duration-500 group-hover:scale-110"
          />
          <figcaption className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/80 to-transparent p-4 text-xs font-medium text-white transition duration-300 group-hover:translate-y-0">
            {photo.caption}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

export function GalleryPreview({ photos }: { photos: GalleryPhoto[] }) {
  const preview = photos.slice(0, 4);

  return (
    <section className="section-shell">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          title="Gallery"
          subtitle="Moments from our tournaments and community events"
          className="mb-0"
        />
        <Link
          href="/gallery"
          className="shrink-0 self-start rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white sm:self-auto"
        >
          View all
        </Link>
      </div>
      <GalleryGrid photos={preview} />
    </section>
  );
}
