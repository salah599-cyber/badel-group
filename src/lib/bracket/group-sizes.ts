export function computeGroupSizes(teamCount: number, teamsPerGroup = 4): number[] {
  if (teamCount <= 0) return [];
  if (teamCount <= teamsPerGroup) return [teamCount];

  const remainder = teamCount % teamsPerGroup;
  if (remainder === 0) {
    const numGroups = teamCount / teamsPerGroup;
    return Array(numGroups).fill(teamsPerGroup);
  }

  if (remainder === 1 || remainder === 2) {
  // e.g. 6-7 teams: single round-robin group
    return [teamCount];
  }

  // remainder 3: mix of 4 and 5
  const numGroupsOf4 = teamsPerGroup - remainder;
  const numGroupsOf5 = remainder;
  const sizes: number[] = [];
  for (let i = 0; i < numGroupsOf4; i++) sizes.push(teamsPerGroup);
  for (let i = 0; i < numGroupsOf5; i++) sizes.push(teamsPerGroup + 1);
  return sizes;
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
