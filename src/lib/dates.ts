export function formatTournamentDate(date: string | null | undefined) {
  if (!date) return null;

  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
