export function formatTournamentDate(date: string | null | undefined) {
  if (!date) return null;

  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTournamentStartTime(time: string | null | undefined) {
  if (!time) return null;

  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTournamentDateTime(
  date: string | null | undefined,
  startTime?: string | null,
) {
  const formattedDate = formatTournamentDate(date);
  if (!formattedDate) return null;

  const formattedTime = formatTournamentStartTime(startTime);
  if (!formattedTime) return formattedDate;

  return `${formattedDate} · ${formattedTime}`;
}

export function formatTournamentDateShort(date: string | null | undefined) {
  if (!date) return null;

  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTournamentDateTimeShort(
  date: string | null | undefined,
  startTime?: string | null,
) {
  const formattedDate = formatTournamentDateShort(date);
  if (!formattedDate) return null;

  const formattedTime = formatTournamentStartTime(startTime);
  if (!formattedTime) return formattedDate;

  return `${formattedDate} · ${formattedTime}`;
}

export function parseTournamentStartTime(value: FormDataEntryValue | null): string | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;

  const match = raw.match(/^(\d{2}):(\d{2})$/);
  if (!match) throw new Error("Invalid start time");

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) throw new Error("Invalid start time");

  return raw;
}
