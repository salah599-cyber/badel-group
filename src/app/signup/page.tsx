import { SectionHeading } from "@/components/SectionHeading";
import { SignupForm } from "@/components/SignupForm";
import { fetchUpcomingTournaments } from "@/lib/data";

export const metadata = {
  title: "Tournament Sign Up | Badel Group",
};

export default async function SignupPage() {
  const tournaments = await fetchUpcomingTournaments();

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6 sm:py-16">
      <SectionHeading
        title="Tournament Sign Up"
        subtitle="Fill in your details below. All entries require admin approval."
      />

      {tournaments.length > 0 ? (
        <div className="section-shell">
          <SignupForm tournaments={tournaments} />
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-primary/20 bg-white/60 p-10 text-center text-gray-500">
          No open tournaments for registration right now.
        </p>
      )}
    </div>
  );
}
