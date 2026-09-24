export function computeGroupSizes(teamCount: number, teamsPerGroup = 4): number[] {
  if (teamCount <= 0) return [];
  if (teamCount <= teamsPerGroup) return [teamCount];

  const remainder = teamCount % teamsPerGroup;
  if (remainder === 0) {
    const numGroups = teamCount / teamsPerGroup;
    return Array(numGroups).fill(teamsPerGroup);
  }

  if (remainder === 1 || remainder === 2) {
    // e.g. 6 teams: single round-robin group
    return [teamCount];
  }

  // Enlarge `remainder` groups by one (4 and 5 when the target is 4)
  // so the sizes add up to every team. 7 and 11 cannot be split that way.
  const largerSize = teamsPerGroup + 1;
  const numGroupsOfTarget = (teamCount - remainder * largerSize) / teamsPerGroup;
  if (numGroupsOfTarget >= 0) {
    const sizes: number[] = [];
    for (let i = 0; i < numGroupsOfTarget; i++) sizes.push(teamsPerGroup);
    for (let i = 0; i < remainder; i++) sizes.push(largerSize);
    return sizes;
  }

  return [teamCount];
}

export function groupLabel(index: number): string {
  let label = "";
  let n = index;
  while (n >= 0) {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
}
