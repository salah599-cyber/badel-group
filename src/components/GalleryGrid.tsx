import Image from "next/image";
import Link from "next/link";
import type { GalleryPhoto } from "@/lib/types";

export function GalleryGrid({ photos }: { photos: GalleryPhoto[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {photos.map((photo) => (
        <figure
          key={photo.id}
          className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-100"
        >
          <Image
            src={photo.imageUrl}
            alt={photo.caption}
            fill
            className="object-cover transition group-hover:scale-105"
          />
          <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-xs text-white opacity-0 transition group-hover:opacity-100">
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
    <section>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gallery</h2>
          <p className="text-gray-600">Moments from our tournaments</p>
        </div>
        <Link
          href="/gallery"
          className="text-sm font-semibold text-primary hover:text-primary-dark"
        >
          View all →
        </Link>
      </div>
      <GalleryGrid photos={preview} />
    </section>
  );
}
