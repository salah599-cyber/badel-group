import { RankingsScreen } from "@/components/RankingsScreen";
import { getRankingSeasons } from "@/lib/db/queries";

export const revalidate = 300;

export async function generateStaticParams() {
  const seasons = await getRankingSeasons();
  return seasons.map((season) => ({ seasonId: season.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = await params;
  return {
    title: "Rankings | Badel Group",
    alternates: { canonical: `/rankings/${seasonId}` },
  };
}

export default async function SeasonRankingsPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = await params;
  return <RankingsScreen seasonId={seasonId} />;
}
