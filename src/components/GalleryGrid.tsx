"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { GalleryLightbox } from "@/components/GalleryLightbox";
import { getMediaSrc } from "@/lib/media";
import { SectionHeading } from "@/components/SectionHeading";
import type { GalleryPhoto } from "@/lib/types";

export function GalleryGrid({ photos }: { photos: GalleryPhoto[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  function openLightbox(index: number) {
    setLightboxIndex(index);
  }

  function handleKeyDown(event: React.KeyboardEvent, index: number) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openLightbox(index);
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {photos.map((photo, index) => (
          <figure
            key={photo.id}
            role="button"
            tabIndex={0}
            className="group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-2xl bg-gray-100 shadow-sm ring-1 ring-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            onClick={() => openLightbox(index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            aria-label={`View photo: ${photo.caption || "Gallery image"}`}
          >
            <Image
              src={getMediaSrc(photo.imageUrl)}
              alt={photo.caption}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-contain"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3 text-xs font-medium text-white sm:translate-y-full sm:transition sm:duration-300 sm:group-hover:translate-y-0">
              {photo.caption}
            </figcaption>
          </figure>
        ))}
      </div>

      {lightboxIndex !== null ? (
        <GalleryLightbox
          photos={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </>
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
