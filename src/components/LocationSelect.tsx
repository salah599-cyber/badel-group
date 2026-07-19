"use client";

import { useState } from "react";
import { LOCATION_OTHER_VALUE, TOURNAMENT_LOCATIONS } from "@/lib/locations";

type LocationSelectProps = {
  className?: string;
};

export function LocationSelect({ className }: LocationSelectProps) {
  const [preset, setPreset] = useState<string>(TOURNAMENT_LOCATIONS[0]);
  const [customLocation, setCustomLocation] = useState("");
  const isOther = preset === LOCATION_OTHER_VALUE;

  return (
    <div className="space-y-2">
      <select
        value={preset}
        onChange={(e) => setPreset(e.target.value)}
        className={`${className} cursor-pointer`}
        aria-label="Location"
      >
        {TOURNAMENT_LOCATIONS.map((location) => (
          <option key={location} value={location}>
            {location}
          </option>
        ))}
        <option value={LOCATION_OTHER_VALUE}>Other (add custom)...</option>
      </select>
      {isOther && (
        <input
          name="location"
          placeholder="Enter custom location"
          value={customLocation}
          onChange={(e) => setCustomLocation(e.target.value)}
          required
          className={className}
        />
      )}
      {!isOther && <input type="hidden" name="location" value={preset} />}
    </div>
  );
}
