import Image from "next/image";
import Link from "next/link";
import { AdminPanel } from "@/components/AdminPanel";
import {
  fetchPendingEntries,
  fetchSponsors,
  fetchUpcomingTournaments,
} from "@/lib/data";
import { hasDatabase } from "@/lib/db";

export const metadata = {
  title: "Admin | Badel Group",
};

export default async function AdminPage() {
  const upcoming = await fetchUpcomingTournaments();
  const sponsors = await fetchSponsors();
  const pendingEntries = await fetchPendingEntries();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center gap-4">
        <Image src="/logo.png" alt="Badel Group" width={48} height={48} className="h-12 w-12" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-600">Manage tournaments, players, sponsors, and media</p>
        </div>
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
      />

      <Link href="/" className="mt-8 inline-block text-sm font-semibold text-primary hover:text-primary-dark">
        ← Back to site
      </Link>
    </div>
  );
}
