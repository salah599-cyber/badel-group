import { PartnershipRequests } from "@/components/PartnershipRequests";
import { SectionHeading } from "@/components/SectionHeading";
import { SignupForm } from "@/components/SignupForm";
import { fetchPartnershipRequests, fetchUpcomingTournaments } from "@/lib/data";
import { parsePlayingSide } from "@/lib/player-profile";
import type { AdminMetadata } from "@/lib/permissions";
import { getUserDisplayName } from "@/lib/user-display";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Tournament Sign Up | Badel Group",
};

export default async function SignupPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const email = user.emailAddresses[0]?.emailAddress ?? "";
  const name = getUserDisplayName(
    {
      firstName: user.firstName,
      lastName: user.lastName,
      emailAddresses: user.emailAddresses,
      publicMetadata: user.publicMetadata as AdminMetadata,
    },
    email,
  );
  const tournaments = await fetchUpcomingTournaments();
  const partnershipRequests = email ? await fetchPartnershipRequests(email) : [];
  const defaultPlayingSide = parsePlayingSide(
    (user.publicMetadata as AdminMetadata)?.playingSide,
  );

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6 sm:py-16">
      <SectionHeading
        title="Tournament Sign Up"
        subtitle="Sign up solo or with a partner. Registered partners must approve; unregistered partners need admin approval."
      />

      <PartnershipRequests requests={partnershipRequests} />

      {tournaments.length > 0 ? (
        <div className="section-shell">
          <SignupForm
            tournaments={tournaments}
            defaultName={name}
            defaultEmail={email}
            defaultPlayingSide={defaultPlayingSide}
          />
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-primary/20 bg-white/60 p-10 text-center text-gray-500">
          No open tournaments for registration right now.
        </p>
      )}
    </div>
  );
}
