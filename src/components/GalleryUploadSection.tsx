"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { FileDropzone } from "@/components/FileDropzone";
import { createGalleryPhotosBulkAction, deleteGalleryPhotoAction, updateGalleryTournamentNameAction } from "@/lib/actions";
import { getMediaSrc } from "@/lib/media";
import { formatTournamentDate } from "@/lib/dates";
import { getDisplayCaption, nameFromFilename, uploadFiles } from "@/lib/uploads";
import type { GalleryPhoto, Tournament } from "@/lib/types";

export function GalleryUploadSection({
  tournaments,
  photos,
  onComplete,
}: {
  tournaments: Tournament[];
  photos: GalleryPhoto[];
  onComplete?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tournamentName, setTournamentName] = useState(tournaments[0]?.name ?? "");
  const [caption, setCaption] = useState("");
  const [editingTournament, setEditingTournament] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const photosByTournament = useMemo(() => {
    return photos.reduce<Record<string, GalleryPhoto[]>>((acc, photo) => {
      if (!acc[photo.tournamentName]) acc[photo.tournamentName] = [];
      acc[photo.tournamentName].push(photo);
      return acc;
    }, {});
  }, [photos]);

  async function handleUpload(files: File[]) {
    if (!tournamentName.trim()) {
      setError("Please enter a tournament name first.");
      return;
    }

    const customCaption = caption.trim();

    setError(null);
    setStatus(`Uploading ${files.length} photo${files.length > 1 ? "s" : ""}...`);
    startTransition(async () => {
      try {
        const uploaded = await uploadFiles(files, "gallery", (completed, total) => {
          setStatus(`Uploading ${completed}/${total} photos...`);
        });
        const tournament = tournaments.find((t) => t.name === tournamentName);

        await createGalleryPhotosBulkAction(
          uploaded.map((file) => ({
            tournamentName,
            tournamentId: tournament?.id,
            tournamentDate: tournament?.date,
            imageUrl: file.url,
            caption: customCaption || nameFromFilename(file.name),
          })),
        );

        setStatus(`Added ${uploaded.length} photo${uploaded.length > 1 ? "s" : ""} to gallery.`);
        setCaption("");
        onComplete?.();
      } catch (err) {
        setStatus(null);
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    });
  }

  function handleRemove(photo: GalleryPhoto) {
    const label = getDisplayCaption(photo.caption) || photo.tournamentName;
    if (!window.confirm(`Remove this photo from ${photo.tournamentName}? (${label})`)) {
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await deleteGalleryPhotoAction(photo.id);
        setStatus("Photo removed.");
        onComplete?.();
      } catch (err) {
        setStatus(null);
        setError(err instanceof Error ? err.message : "Failed to remove photo");
      }
    });
  }

  function handleRename(currentName: string, tournamentId: string | null) {
    const trimmed = editingName.trim();
    if (!trimmed) {
      setError("Tournament name is required.");
      return;
    }
    if (trimmed === currentName) {
      setEditingTournament(null);
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await updateGalleryTournamentNameAction(currentName, trimmed, tournamentId);
        setEditingTournament(null);
        setStatus("Tournament name updated.");
        onComplete?.();
      } catch (err) {
        setStatus(null);
        setError(err instanceof Error ? err.message : "Failed to update tournament name");
      }
    });
  }

  return (
    <section id="gallery">
      <h2 className="mb-4 text-xl font-bold text-gray-900">Gallery ({photos.length})</h2>

      {(error || status) && (
        <div
          className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium ${
            error
              ? "border border-brand-red/30 bg-brand-red/10 text-brand-red"
              : "border border-primary/20 bg-primary/5 text-primary-dark"
          }`}
        >
          {error ?? status}
        </div>
      )}

      {photos.length > 0 ? (
        <div className="mb-6 space-y-4">
          {Object.entries(photosByTournament).map(([name, tournamentPhotos]) => (
            <div key={name} className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                {editingTournament === name ? (
                  <>
                    <input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="input max-w-xs"
                      disabled={isPending}
                    />
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        handleRename(name, tournamentPhotos[0]?.tournamentId ?? null)
                      }
                      className="rounded-lg bg-brand-green px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        setEditingTournament(null);
                        setEditingName("");
                      }}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <div>
                      <h3 className="font-semibold text-primary-dark">{name}</h3>
                      {formatTournamentDate(tournamentPhotos[0]?.tournamentDate) ? (
                        <p className="text-sm text-gray-500">
                          {formatTournamentDate(tournamentPhotos[0]?.tournamentDate)}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTournament(name);
                        setEditingName(name);
                      }}
                      className="text-sm font-semibold text-primary hover:text-primary-dark"
                    >
                      Edit name
                    </button>
                  </>
                )}
              </div>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {tournamentPhotos.map((photo) => {
                  const displayCaption = getDisplayCaption(photo.caption);

                  return (
                    <li
                      key={photo.id}
                      className="flex gap-3 rounded-xl border border-gray-100 bg-cream/30 p-3"
                    >
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        <Image
                          src={getMediaSrc(photo.imageUrl)}
                          alt={displayCaption ?? "Gallery photo"}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {displayCaption ?? "No caption"}
                        </p>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleRemove(photo)}
                          className="mt-2 text-xs font-semibold text-brand-red hover:underline disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-6 rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          No gallery photos yet.
        </p>
      )}

      <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4">
        <h3 className="font-semibold text-primary-dark">Upload photos</h3>
        <p className="text-sm text-gray-600">
          Drag and drop photos or select a folder. Add an optional caption, or leave it blank to use
          descriptive filenames. Auto-generated names like WhatsApp images are skipped.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="galleryTournament" className="mb-1 block text-sm font-medium text-gray-700">
              Tournament
            </label>
            <input
              id="galleryTournament"
              list="tournament-options"
              value={tournamentName}
              onChange={(e) => setTournamentName(e.target.value)}
              placeholder="Tournament name"
              className="input"
              disabled={isPending}
            />
            <datalist id="tournament-options">
              {tournaments.map((t) => (
                <option key={t.id} value={t.name} />
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor="galleryCaption" className="mb-1 block text-sm font-medium text-gray-700">
              Caption <span className="font-normal text-gray-500">(optional)</span>
            </label>
            <input
              id="galleryCaption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. Finals celebration"
              className="input"
              disabled={isPending}
            />
          </div>
        </div>

        <FileDropzone
          label="Drop gallery photos or folder here"
          hint="Upload multiple images at once"
          disabled={isPending}
          onFilesSelected={handleUpload}
        />
      </div>
    </section>
  );
}
