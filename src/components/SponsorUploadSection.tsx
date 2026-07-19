"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { FileDropzone } from "@/components/FileDropzone";
import { createSponsorAction, createSponsorsBulkAction, deleteSponsorAction } from "@/lib/actions";
import { getMediaSrc } from "@/lib/media";
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
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState("gold");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function clearLogoPreview() {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(null);
    setLogoFile(null);
  }

  async function handleBulkUpload(files: File[]) {
    setError(null);
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
        setStatus(null);
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    });
  }

  function handleSingleLogo(files: File[]) {
    const file = files[0];
    if (!file) return;
    clearLogoPreview();
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setError(null);
    setStatus("Logo selected. Fill in the details and click Add Sponsor.");
  }

  return (
    <section id="sponsors">
      <h2 className="mb-4 text-xl font-bold text-gray-900">Sponsors ({sponsors.length})</h2>

      {(error || status) && (
        <div
          className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium ${
            error ? "border border-brand-red/30 bg-brand-red/10 text-brand-red" : "border border-primary/20 bg-primary/5 text-primary-dark"
          }`}
        >
          {error ?? status}
        </div>
      )}

      <ul className="mb-6 space-y-2">
        {sponsors.map((s) => (
          <li
            key={s.id}
            className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white px-4 py-3"
          >
            <div className="relative h-10 w-16 shrink-0">
              <Image src={getMediaSrc(s.logoUrl)} alt={s.name} fill className="object-contain" />
            </div>
            <span className="flex-1 font-medium">{s.name}</span>
            <span className="text-xs font-semibold text-primary uppercase">{s.tier}</span>
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    setError(null);
                    await deleteSponsorAction(s.id);
                    setStatus("Sponsor removed.");
                    onComplete?.();
                  } catch (err) {
                    setStatus(null);
                    setError(err instanceof Error ? err.message : "Failed to remove sponsor");
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
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          setStatus(null);

          if (!logoFile) {
            setError("Please select a sponsor logo before saving.");
            return;
          }

          const form = formRef.current;
          if (!form) return;

          const name = (form.elements.namedItem("name") as HTMLInputElement).value;
          const tier = (form.elements.namedItem("tier") as HTMLSelectElement).value as
            | "platinum"
            | "gold"
            | "silver"
            | "bronze";
          const website = (form.elements.namedItem("website") as HTMLInputElement).value;

          startTransition(async () => {
            try {
              setStatus("Uploading logo...");
              const [uploaded] = await uploadFiles([logoFile], "sponsors");

              setStatus("Saving sponsor...");
              await createSponsorAction({
                name,
                tier,
                logoUrl: uploaded.url,
                website: website || undefined,
              });

              form.reset();
              clearLogoPreview();
              setStatus("Sponsor added successfully.");
              onComplete?.();
            } catch (err) {
              setStatus(null);
              setError(err instanceof Error ? err.message : "Failed to add sponsor");
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
            hint="Required — PNG, JPG, WEBP, or SVG"
            disabled={isPending}
            onFilesSelected={handleSingleLogo}
          />
          {logoPreview && (
            <div className="mt-3 flex items-center gap-3">
              <div className="relative h-16 w-32">
                <Image src={logoPreview} alt="Logo preview" fill className="object-contain" unoptimized />
              </div>
              <button
                type="button"
                onClick={() => {
                  clearLogoPreview();
                  setStatus(null);
                }}
                className="text-sm text-gray-500 hover:text-brand-red"
              >
                Remove logo
              </button>
            </div>
          )}
        </div>
        <input name="website" placeholder="Website URL (optional)" className="input sm:col-span-2" />
        <button type="submit" disabled={isPending} className="btn-primary sm:col-span-2">
          {isPending ? "Saving..." : "+ Add Sponsor"}
        </button>
      </form>
    </section>
  );
}
