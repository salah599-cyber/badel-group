"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { FileDropzone } from "@/components/FileDropzone";
import { deletePlayerPhotoAction, upsertPlayerPhotoAction } from "@/lib/actions";
import { getMediaSrc } from "@/lib/media";
import { uploadFiles } from "@/lib/uploads";
import type { PlayerProfile, PlayerRanking } from "@/lib/types";

export function PlayerPhotosSection({
  profiles,
  rankedPlayers,
  onComplete,
}: {
  profiles: PlayerProfile[];
  rankedPlayers: PlayerRanking[];
  onComplete?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function clearPhotoPreview() {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    setPhotoFile(null);
  }

  function handlePhotoSelect(files: File[]) {
    const file = files[0];
    if (!file) return;
    clearPhotoPreview();
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError(null);
    setStatus("Photo selected. Enter player name and click Save.");
  }

  function handleRankedPlayerSelect(name: string) {
    setDisplayName(name);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!photoFile) {
      setError("Please select a player photo.");
      return;
    }
    if (!displayName.trim()) {
      setError("Please enter a player name.");
      return;
    }

    setError(null);
    setStatus("Uploading photo...");
    startTransition(async () => {
      try {
        const [uploaded] = await uploadFiles([photoFile], "players");
        await upsertPlayerPhotoAction({
          displayName: displayName.trim(),
          photoUrl: uploaded.url,
        });
        setStatus(`Saved photo for ${displayName.trim()}.`);
        clearPhotoPreview();
        setDisplayName("");
        formRef.current?.reset();
        onComplete?.();
      } catch (err) {
        setStatus(null);
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    });
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete photo for ${name}?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deletePlayerPhotoAction(id);
        setStatus(`Deleted photo for ${name}.`);
        onComplete?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
      }
    });
  }

  return (
    <section id="player-photos">
      <h2 className="mb-4 text-xl font-bold text-gray-900">Player Photos ({profiles.length})</h2>

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

      <ul className="mb-6 space-y-2">
        {profiles.map((profile) => (
          <li
            key={profile.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gray-100">
                <Image
                  src={getMediaSrc(profile.photoUrl)}
                  alt={profile.displayName}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              </div>
              <span className="truncate font-medium text-gray-900">{profile.displayName}</span>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(profile.id, profile.displayName)}
              disabled={isPending}
              className="shrink-0 text-sm font-semibold text-brand-red hover:underline disabled:opacity-60"
            >
              Delete
            </button>
          </li>
        ))}
        {profiles.length === 0 && (
          <li className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
            No player photos yet.
          </li>
        )}
      </ul>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-2"
      >
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">Player name</label>
          <input
            name="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter player name"
            required
            className="input"
          />
        </div>

        {rankedPlayers.length > 0 && (
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Or pick from ranked players
            </label>
            <select
              className="input"
              value=""
              onChange={(e) => {
                if (e.target.value) handleRankedPlayerSelect(e.target.value);
              }}
            >
              <option value="">Select a ranked player...</option>
              {rankedPlayers.map((player) => (
                <option key={player.name} value={player.name}>
                  #{player.rank} {player.name} ({player.points} pts)
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">Player photo</label>
          <FileDropzone
            onFilesSelected={handlePhotoSelect}
            multiple={false}
            allowFolder={false}
            label="Drop player photo here or click to browse"
            hint="JPG, PNG, or WebP"
          />
          {photoPreview && (
            <div className="mt-3 flex items-center gap-3">
              <div className="relative h-16 w-16 overflow-hidden rounded-full">
                <Image src={photoPreview} alt="Preview" fill className="object-cover" sizes="64px" />
              </div>
              <button
                type="button"
                onClick={clearPhotoPreview}
                className="text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        <button type="submit" disabled={isPending} className="btn-primary sm:col-span-2">
          {isPending ? "Saving..." : "Save Player Photo"}
        </button>
      </form>
    </section>
  );
}
