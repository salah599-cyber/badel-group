import type { PlayingSide } from "@/lib/types";

export const playingSideLabels: Record<PlayingSide, string> = {
  right: "Right side",
  left: "Left side",
  any: "Either side",
};

export function parsePlayingSide(value: unknown): PlayingSide {
  if (value === "right" || value === "left" || value === "any") return value;
  return "any";
}
