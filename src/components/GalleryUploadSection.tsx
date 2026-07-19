"use client";

import { useState, useTransition } from "react";
import { FileDropzone } from "@/components/FileDropzone";
import { createGalleryPhotosBulkAction } from "@/lib/actions";
import { nameFromFilename, uploadFiles } from "@/lib/uploads";
import type { Tournament } from "@/lib/types";

export function GalleryUploadSection({
  tournaments,
  onComplete,
}: {
  tournaments: Tournament[];
  onComplete?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [tournamentName, setTournamentName] = useState(tournaments[0]?.name ?? "");

  async function handleUpload(files: File[]) {
    if (!tournamentName.trim()) {
      setStatus("Please enter a tournament name first.");
      return;
    }

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
            imageUrl: file.url,
            caption: nameFromFilename(file.name),
          })),
        );

        setStatus(`Added ${uploaded.length} photo${uploaded.length > 1 ? "s" : ""} to gallery.`);
        onComplete?.();
      } catch (err) {
        setStatus(err instanceof Error ? err.message : "Upload failed");
      }
    });
  }

  return (
    <section id="gallery">
      <h2 className="mb-4 text-xl font-bold text-gray-900">Gallery Uploads</h2>

      <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-600">
          Drag and drop photos or select a folder. Captions are generated from filenames.
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
        </div>

        <FileDropzone
          label="Drop gallery photos or folder here"
          hint="Upload multiple images at once"
          disabled={isPending}
          onFilesSelected={handleUpload}
        />

        {status && <p className="text-sm font-medium text-primary-dark">{status}</p>}
      </div>
    </section>
  );
}
