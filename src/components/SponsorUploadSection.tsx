"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { FileDropzone } from "@/components/FileDropzone";
import { createSponsorAction, createSponsorsBulkAction, deleteSponsorAction } from "@/lib/actions";
import { nameFromFilename, uploadFiles } from "@/lib/uploads";
import type { Sponsor } from "@/lib/types";

export function SponsorUploadSection({
  sponsors,
  onComplete,
}: {
  sponsors: Sponsor[];
  onComplete?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [tier, setTier] = useState("gold");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState("");

  async function handleBulkUpload(files: File[]) {
    setStatus(`Uploading ${files.length} logo${files.length > 1 ? "s" : ""}...`);
    startTransition(async () => {
      try {
        const uploaded = await uploadFiles(files, "sponsors");
        await createSponsorsBulkAction(
          uploaded.map((file) => ({
            name: nameFromFilename(file.name),
            tier,
            logoUrl: file.url,
          })),
        );
        setStatus(`Added ${uploaded.length} sponsor${uploaded.length > 1 ? "s" : ""}.`);
        onComplete?.();
      } catch (err) {
        setStatus(err instanceof Error ? err.message : "Upload failed");
      }
    });
  }

  async function handleSingleLogo(files: File[]) {
    const file = files[0];
    if (!file) return;
    setLogoPreview(URL.createObjectURL(file));
    setStatus("Uploading logo...");
    startTransition(async () => {
      try {
        const [uploaded] = await uploadFiles([file], "sponsors");
        setLogoUrl(uploaded.url);
        setStatus("Logo ready. Fill in details and save.");
      } catch (err) {
        setStatus(err instanceof Error ? err.message : "Upload failed");
      }
    });
  }

  return (
    <section id="sponsors">
      <h2 className="mb-4 text-xl font-bold text-gray-900">Sponsors ({sponsors.length})</h2>

      <ul className="mb-6 space-y-2">
        {sponsors.map((s) => (
          <li
            key={s.id}
            className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white px-4 py-3"
          >
            <div className="relative h-10 w-16 shrink-0">
              <Image src={s.logoUrl} alt={s.name} fill className="object-contain" />
            </div>
            <span className="flex-1 font-medium">{s.name}</span>
            <span className="text-xs font-semibold text-primary uppercase">{s.tier}</span>
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await deleteSponsorAction(s.id);
                    setStatus("Sponsor removed.");
                    onComplete?.();
                  } catch (err) {
                    setStatus(err instanceof Error ? err.message : "Failed to remove sponsor");
                  }
                })
              }
              className="text-xs text-brand-red hover:underline"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <div className="mb-6 space-y-4 rounded-2xl border border-gray-200 bg-white p-4">
        <h3 className="font-semibold text-primary-dark">Bulk upload sponsor logos</h3>
        <p className="text-sm text-gray-600">
          Drag a folder of logo images or select multiple files. Names are taken from filenames.
        </p>
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value)}
          className="input max-w-xs"
          disabled={isPending}
        >
          <option value="platinum">Platinum</option>
          <option value="gold">Gold</option>
          <option value="silver">Silver</option>
          <option value="bronze">Bronze</option>
        </select>
        <FileDropzone
          label="Drop sponsor logo files or folder here"
          hint="PNG, JPG, WEBP, SVG up to 10MB each"
          disabled={isPending}
          onFilesSelected={handleBulkUpload}
        />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          if (!logoUrl) {
            setStatus("Please upload a logo first.");
            return;
          }
          fd.set("logoUrl", logoUrl);
          startTransition(async () => {
            try {
              await createSponsorAction(fd);
              setLogoUrl("");
              setLogoPreview(null);
              setStatus("Sponsor added.");
              e.currentTarget.reset();
              onComplete?.();
            } catch (err) {
              setStatus(err instanceof Error ? err.message : "Failed to add sponsor");
            }
          });
        }}
        className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-2"
      >
        <h3 className="sm:col-span-2 font-semibold text-primary-dark">Add single sponsor</h3>
        <input name="name" placeholder="Sponsor name" required className="input" />
        <select name="tier" defaultValue="gold" className="input">
          <option value="platinum">Platinum</option>
          <option value="gold">Gold</option>
          <option value="silver">Silver</option>
          <option value="bronze">Bronze</option>
        </select>
        <div className="sm:col-span-2">
          <FileDropzone
            multiple={false}
            allowFolder={false}
            label="Drop sponsor logo here"
            hint="Single logo for manual entry"
            disabled={isPending}
            onFilesSelected={handleSingleLogo}
          />
          {logoPreview && (
            <div className="relative mt-3 h-16 w-32">
              <Image src={logoPreview} alt="Logo preview" fill className="object-contain" unoptimized />
            </div>
          )}
        </div>
        <input name="website" placeholder="Website URL (optional)" className="input sm:col-span-2" />
        <button type="submit" disabled={isPending || !logoUrl} className="btn-primary sm:col-span-2">
          + Add Sponsor
        </button>
      </form>

      {status && <p className="mt-3 text-sm font-medium text-primary-dark">{status}</p>}
    </section>
  );
}
