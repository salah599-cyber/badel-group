"use client";

import { useTransition } from "react";
import { approveUserAction, deleteUserAction, rejectUserAction } from "@/lib/actions";
import type { PendingUser } from "@/lib/clerk-users";

export function UserApprovalsSection({
  pendingUsers,
  onComplete,
}: {
  pendingUsers: PendingUser[];
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
    <section id="user-approvals">
      <h2 className="mb-4 text-xl font-bold text-gray-900">
        User Sign-up Approvals ({pendingUsers.length})
      </h2>
      <p className="mb-4 text-sm text-gray-600">
        New accounts must be approved before they can access the site.
      </p>

      {pendingUsers.length > 0 ? (
        <div className="space-y-3">
          {pendingUsers.map((user) => (
            <div
              key={user.id}
              className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{user.name}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
                <p className="text-xs text-gray-400">
                  Signed up {new Date(user.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => run(() => approveUserAction(user.id))}
                  className="rounded-lg bg-brand-green px-3 py-1.5 text-sm font-semibold text-white"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => run(() => rejectUserAction(user.id))}
                  className="rounded-lg border border-brand-red px-3 py-1.5 text-sm font-semibold text-brand-red"
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    run(async () => {
                      if (
                        confirm(
                          `Permanently delete ${user.email}? This cannot be undone.`,
                        )
                      ) {
                        await deleteUserAction(user.id);
                      }
                    })
                  }
                  className="rounded-lg bg-brand-red px-3 py-1.5 text-sm font-semibold text-white"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-500">
          No pending user sign-ups.
        </p>
      )}
    </section>
  );
}
