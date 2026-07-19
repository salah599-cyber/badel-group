import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SectionHeading } from "@/components/SectionHeading";
import { AdminPanel } from "@/components/AdminPanel";
import {
  fetchAdminMembers,
  fetchSiteMembers,
} from "@/lib/admin-members";
import {
  fetchPendingEntries,
  fetchSponsors,
  fetchUpcomingTournaments,
} from "@/lib/data";
import { fetchPendingUsers } from "@/lib/clerk-users";
import { getAdminContext } from "@/lib/auth";
import { hasDatabase } from "@/lib/db";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Admin | Badel Group",
};

export default async function AdminPage() {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/?error=unauthorized");

  const upcoming = await fetchUpcomingTournaments();
  const sponsors = await fetchSponsors();
  const pendingEntries = await fetchPendingEntries();
  const pendingUsers = ctx.permissions.includes("users:approve") || ctx.isSuperAdmin
    ? await fetchPendingUsers()
    : [];
  const adminMembers = ctx.isSuperAdmin ? await fetchAdminMembers() : [];
  const siteMembers = ctx.isSuperAdmin ? await fetchSiteMembers() : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <Logo size="md" className="shrink-0" />
        <SectionHeading
          title="Admin Panel"
          subtitle={
            ctx.isSuperAdmin
              ? "Super admin — full access to team, members, and content"
              : ctx.role === "tournament_admin"
                ? "Tournament admin — scoped to your assigned tournaments"
                : "Manage tournaments, players, sponsors, and media"
          }
          className="mb-0"
        />
      </div>

      {!hasDatabase() && (
        <div className="mb-8 rounded-xl border border-secondary/40 bg-secondary/10 px-4 py-3 text-sm text-primary-dark">
          Database not connected. Add <code className="font-mono">DATABASE_URL</code> in Vercel
          environment variables (Neon Postgres) and run migrations.
        </div>
      )}

      <AdminPanel
        tournaments={upcoming}
        sponsors={sponsors}
        pendingEntries={pendingEntries}
        pendingUsers={pendingUsers}
        adminMembers={adminMembers}
        siteMembers={siteMembers}
        permissions={ctx.permissions}
        isSuperAdmin={ctx.isSuperAdmin}
        scopedTournamentIds={ctx.tournamentIds}
        role={ctx.role}
      />

      <Link href="/" className="mt-8 inline-block text-sm font-semibold text-primary hover:text-primary-dark">
        ← Back to site
      </Link>
    </div>
  );
}
