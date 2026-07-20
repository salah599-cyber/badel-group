"use client";

import { useTransition } from "react";
import { deleteUserAction } from "@/lib/actions";
import type { SiteMember } from "@/lib/admin-members";

export function SiteMembersSection({
  siteMembers,
  onComplete,
}: {
  siteMembers: SiteMember[];
  onComplete?: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<void>) {
    startTransition(async () => {
      try {
        await action();
        onComplete?.();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Action failed");
      }
    });
  }

  return (
    <section id="members">
      <h2 className="mb-2 text-xl font-bold text-gray-900">
        Site Members ({siteMembers.length})
      </h2>
      <p className="mb-4 text-sm text-gray-600">
        Approved members with site access. Deleting a user permanently removes their account.
      </p>

      {siteMembers.length > 0 ? (
        <div className="space-y-3">
          {siteMembers.map((member) => (
            <div
              key={member.id}
              className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{member.name}</p>
                <p className="text-sm text-gray-500">{member.email}</p>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  run(async () => {
                    if (
                      confirm(
                        `Permanently delete ${member.email}? This cannot be undone.`,
                      )
                    ) {
                      await deleteUserAction(member.id);
                    }
                  })
                }
                className="rounded-lg bg-brand-red px-3 py-1.5 text-sm font-semibold text-white"
              >
                Delete user
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-500">
          No approved site members yet.
        </p>
      )}
    </section>
  );
}
