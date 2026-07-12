// Age is never stored — always computed from birthdate at display time.
// See BUILD_SPEC.md "Age calculation".
export function formatAge(birthdate: string | undefined, asOf = new Date()): string | null {
  if (!birthdate) return null;
  const bd = new Date(birthdate);
  let years = asOf.getFullYear() - bd.getFullYear();
  let months = asOf.getMonth() - bd.getMonth();
  if (asOf.getDate() < bd.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return `${years} years, ${months} months`;
}

// A raw comparable number for sorting by age (larger = older). Not for
// display — use formatAge for that.
export function ageInDays(birthdate: string | undefined, asOf = new Date()): number | null {
  if (!birthdate) return null;
  const bd = new Date(birthdate);
  return Math.floor((asOf.getTime() - bd.getTime()) / (1000 * 60 * 60 * 24));
}
