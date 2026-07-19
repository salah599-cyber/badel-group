export const TOURNAMENT_LOCATIONS = [
  "Strike",
  "Spin",
  "Padel Addicts",
  "Ace",
  "Vibora",
] as const;

export type TournamentLocation = (typeof TOURNAMENT_LOCATIONS)[number];

export const LOCATION_OTHER_VALUE = "__other__";
