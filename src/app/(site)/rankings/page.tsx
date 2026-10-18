import { Suspense } from "react";
import { LegacySeasonRedirect } from "@/components/LegacySeasonRedirect";
import { RankingsScreen } from "@/components/RankingsScreen";

export const metadata = {
  title: "Rankings | Badel Group",
};

export const revalidate = 300;

export default function RankingsPage() {
  return (
    <>
      <Suspense fallback={null}>
        <LegacySeasonRedirect />
      </Suspense>
      <RankingsScreen />
    </>
  );
}
