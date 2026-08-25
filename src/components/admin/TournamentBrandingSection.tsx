"use client";

import { useState, useTransition } from "react";
import { uploadFiles } from "@/lib/uploads";
import {
  addTournamentPartnerAction,
  addTournamentSponsorAction,
  deleteTournamentPartnerAction,
  deleteTournamentSponsorAction,
} from "@/lib/squad-actions";
import { getMediaSrc } from "@/lib/media";
import type { TournamentPartner, TournamentSponsor } from "@/lib/types";
import { tierLabels } from "@/lib/types";

type TournamentBrandingSectionProps = {
  tournamentId: string;
  partners: TournamentPartner[];
  sponsors: TournamentSponsor[];
};

export function TournamentBrandingSection({
  tournamentId,
  partners,
  sponsors,
}: TournamentBrandingSectionProps) {
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<void>) {
    startTransition(async () => {
      try {
        await action();
        window.location.reload();
      } catch (error) {
        alert(error instanceof Error ? error.message : "Action failed");
      }
    });
  }

  return (
    <section className="space-y-6 rounded-2xl border border-gray-200 bg-white p-4">
      <div>
        <h2 className="text-lg font-bold">Event branding</h2>
        <p className="text-sm text-gray-600">
          Partner logos appear beside Badel Group on this tournament only. Event sponsors are separate from global sponsors.
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-semibold text-gray-800">Partner groups</h3>
        <div className="mb-3 space-y-2">
          {partners.map((partner) => (
            <div key={partner.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getMediaSrc(partner.logoUrl)}
                  alt={partner.name}
                  className="h-8 w-auto max-w-[6rem] object-contain"
                />
                <span className="text-sm font-medium">{partner.name}</span>
              </div>
              <button
                type="button"
                disabled={isPending}
                className="text-xs font-semibold text-brand-red"
                onClick={() => run(() => deleteTournamentPartnerAction(partner.id))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <PartnerUploadForm
          disabled={isPending}
          onUpload={(files) =>
            run(async () => {
              const uploaded = await uploadFiles(files, "tournament-partners");
              for (const file of uploaded) {
                await addTournamentPartnerAction({
                  tournamentId,
                  name: file.name.replace(/\.[^.]+$/, ""),
                  logoUrl: file.url,
                });
              }
            })
          }
        />
      </div>

      <div>
        <h3 className="mb-2 font-semibold text-gray-800">Event sponsors</h3>
        <div className="mb-3 space-y-2">
          {sponsors.map((sponsor) => (
            <div key={sponsor.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getMediaSrc(sponsor.logoUrl)}
                  alt={sponsor.name}
                  className="h-8 w-auto max-w-[6rem] object-contain"
                />
                <span className="text-sm font-medium">
                  {sponsor.name} · {tierLabels[sponsor.tier]}
                </span>
              </div>
              <button
                type="button"
                disabled={isPending}
                className="text-xs font-semibold text-brand-red"
                onClick={() => run(() => deleteTournamentSponsorAction(sponsor.id))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <SponsorUploadForm
          disabled={isPending}
          onUpload={(files, tier) =>
            run(async () => {
              const uploaded = await uploadFiles(files, "tournament-sponsors");
              for (const file of uploaded) {
                await addTournamentSponsorAction({
                  tournamentId,
                  name: file.name.replace(/\.[^.]+$/, ""),
                  tier,
                  logoUrl: file.url,
                });
              }
            })
          }
        />
      </div>
    </section>
  );
}

function PartnerUploadForm({
  disabled,
  onUpload,
}: {
  disabled?: boolean;
  onUpload: (files: File[]) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700">
      <input
        type="file"
        accept="image/*"
        multiple
        disabled={disabled}
        className="hidden"
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          if (files.length) onUpload(files);
        }}
      />
      Upload partner logo
    </label>
  );
}

function SponsorUploadForm({
  disabled,
  onUpload,
}: {
  disabled?: boolean;
  onUpload: (files: File[], tier: "platinum" | "gold" | "silver" | "bronze") => void;
}) {
  const [tier, setTier] = useState<"platinum" | "gold" | "silver" | "bronze">("gold");

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-sm">
        Tier
        <select
          className="input mt-1"
          value={tier}
          onChange={(e) => setTier(e.target.value as typeof tier)}
        >
          <option value="platinum">Platinum</option>
          <option value="gold">Gold</option>
          <option value="silver">Silver</option>
          <option value="bronze">Bronze</option>
        </select>
      </label>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700">
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={disabled}
          className="hidden"
          onChange={(e) => {
            const files = [...(e.target.files ?? [])];
            if (files.length) onUpload(files, tier);
          }}
        />
        Upload sponsor logo
      </label>
    </div>
  );
}
