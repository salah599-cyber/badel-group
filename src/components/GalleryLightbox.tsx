"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getMediaSrc } from "@/lib/media";
import type { GalleryPhoto } from "@/lib/types";

type GalleryLightboxProps = {
  photos: GalleryPhoto[];
  initialIndex: number;
  onClose: () => void;
};

export function GalleryLightbox({ photos, initialIndex, onClose }: GalleryLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const dialogRef = useRef<HTMLDivElement>(null);
  const photo = photos[index];
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  const goPrev = useCallback(() => {
    setIndex((current) => (current > 0 ? current - 1 : current));
  }, []);

  const goNext = useCallback(() => {
    setIndex((current) => (current < photos.length - 1 ? current + 1 : current));
  }, [photos.length]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowLeft") {
        goPrev();
      } else if (event.key === "ArrowRight") {
        goNext();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, goPrev, goNext]);

  if (!photo) {
    return null;
  }

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      tabIndex={-1}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
        aria-label="Close"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {hasPrev && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            goPrev();
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 sm:left-4"
          aria-label="Previous photo"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      <div
        className="flex max-h-full max-w-full flex-col items-center gap-3"
        onClick={(event) => event.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getMediaSrc(photo.imageUrl)}
          alt={photo.caption}
          className="max-h-[85vh] max-w-[90vw] object-contain"
        />
        {photo.caption ? (
          <p className="max-w-lg text-center text-sm text-white/90">{photo.caption}</p>
        ) : null}
        {photos.length > 1 ? (
          <p className="text-xs text-white/60">
            {index + 1} / {photos.length}
          </p>
        ) : null}
      </div>

      {hasNext && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            goNext();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 sm:right-4"
          aria-label="Next photo"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}
