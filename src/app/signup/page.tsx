import { SignupForm } from "@/components/SignupForm";
import { fetchUpcomingTournaments } from "@/lib/data";

export const metadata = {
  title: "Tournament Sign Up | Badel Group",
};

export default async function SignupPage() {
  const tournaments = await fetchUpcomingTournaments();

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Tournament Sign Up</h1>
        <p className="text-gray-600">
          Fill in your details below. All entries require admin approval.
        </p>
      </div>

      {tournaments.length > 0 ? (
        <SignupForm tournaments={tournaments} />
      ) : (
        <p className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
          No open tournaments for registration right now.
        </p>
      )}
    </div>
  );
}
