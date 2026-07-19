"use client";

import { useTransition } from "react";
import { approvePartnershipAction, rejectPartnershipAction } from "@/lib/actions";

type PartnershipRequest = {
  id: string;
  name: string;
  email: string;
  tournamentName: string;
  createdAt?: Date;
};

export function PartnershipRequests({ requests }: { requests: PartnershipRequest[] }) {
  const [isPending, startTransition] = useTransition();

  if (requests.length === 0) return null;

  function run(action: () => Promise<void>) {
    startTransition(async () => {
      try {
        await action();
        window.location.reload();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Action failed");
      }
    });
  }

  return (
    <section className="mb-8 section-shell border-secondary/30 bg-secondary/5">
      <h2 className="mb-2 text-lg font-bold text-gray-900">Partnership Requests</h2>
      <p className="mb-4 text-sm text-gray-600">
        Other players have invited you to be their tournament partner. Approve or decline below.
      </p>

      <div className="space-y-3">
        {requests.map((request) => (
          <div
            key={request.id}
            className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium text-gray-900">{request.name}</p>
              <p className="text-sm text-gray-500">
                Wants you as their partner for {request.tournamentName}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(() => approvePartnershipAction(request.id))}
                className="rounded-lg bg-brand-green px-3 py-1.5 text-sm font-semibold text-white"
              >
                Accept
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(() => rejectPartnershipAction(request.id))}
                className="rounded-lg bg-brand-red px-3 py-1.5 text-sm font-semibold text-white"
              >
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
