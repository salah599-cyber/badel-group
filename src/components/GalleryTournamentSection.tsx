"use client";

import { useState, useTransition } from "react";
import { GalleryGrid } from "@/components/GalleryGrid";
import { updateGalleryTournamentNameAction } from "@/lib/actions";
import { formatTournamentDate } from "@/lib/dates";
import type { GalleryPhoto } from "@/lib/types";

type GalleryTournamentSectionProps = {
  name: string;
  date?: string | null;
  tournamentId: string | null;
  photos: GalleryPhoto[];
  canManage: boolean;
};

export function GalleryTournamentSection({
  name,
  date,
  tournamentId,
  photos,
  canManage,
}: GalleryTournamentSectionProps) {
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [error, setError] = useState<string | null>(null);

  const formattedDate = formatTournamentDate(date);

  function handleSave() {
    const trimmed = draftName.trim();
    if (!trimmed) {
      setError("Tournament name is required.");
      return;
    }
    if (trimmed === name) {
      setIsEditing(false);
      setError(null);
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await updateGalleryTournamentNameAction(name, trimmed, tournamentId);
        setIsEditing(false);
        window.location.reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update name");
      }
    });
  }

  return (
    <section className="section-shell">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {isEditing ? (
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className="input max-w-md"
              disabled={isPending}
              aria-label="Tournament name"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="rounded-lg bg-brand-green px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraftName(name);
                  setIsEditing(false);
                  setError(null);
                }}
                disabled={isPending}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-bold text-primary-dark">{name}</h2>
              {canManage ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-sm font-semibold text-primary hover:text-primary-dark"
                >
                  Edit name
                </button>
              ) : null}
            </div>
            {formattedDate ? (
              <time className="mt-1 block text-sm font-medium text-gray-500">{formattedDate}</time>
            ) : null}
          </div>
        )}
      </div>

      {error ? <p className="mb-4 text-sm text-brand-red">{error}</p> : null}

      <GalleryGrid photos={photos} />
    </section>
  );
}
